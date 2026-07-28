import {
  auth,
  db,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from "../config/firebaseInit.js";

const ROLE_CONFIG = {
  student: {
    path: (uid) => ["users", "students", "students", uid],
    dashboard: "/dashboard/itc_dashboard.html",
    storageKey: "student",
  },
  company: {
    path: (uid) => ["users", "companies", "companies", uid],
    dashboard: "/company/company_dashboard.html",
    storageKey: "currentCompany",
  },
};

const PRIVILEGED_ROLES = new Set(["admin", "authority"]);

export class AccountRoleError extends Error {
  constructor(message, code = "account/role-not-found") {
    super(message);
    this.name = "AccountRoleError";
    this.code = code;
  }
}

async function getDirectRole(uid) {
  const checks = await Promise.all(
    Object.entries(ROLE_CONFIG).map(async ([role, config]) => {
      const snapshot = await getDoc(doc(db, ...config.path(uid)));
      return snapshot.exists()
        ? { role, data: { id: snapshot.id, ...snapshot.data() } }
        : null;
    })
  );

  const matches = checks.filter(Boolean);
  if (matches.length > 1) {
    throw new AccountRoleError(
      "This account has conflicting roles. Please contact support.",
      "account/role-conflict"
    );
  }
  return matches[0] || null;
}

async function getSupervisorRole(uid) {
  const supervisorQuery = query(
    collectionGroup(db, "supervisors"),
    where("uid", "==", uid),
    limit(2)
  );
  const snapshot = await getDocs(supervisorQuery);
  if (snapshot.empty) return null;
  if (snapshot.size > 1) {
    throw new AccountRoleError(
      "This supervisor account is linked more than once. Please contact support.",
      "account/role-conflict"
    );
  }
  const record = snapshot.docs[0];
  return { role: "supervisor", data: { id: record.id, ...record.data() } };
}

export async function resolveAccountRole(user = auth.currentUser) {
  if (!user || user.isAnonymous) {
    throw new AccountRoleError("Please sign in to continue.", "account/signed-out");
  }

  const token = await user.getIdTokenResult();
  const claimedRole = token.claims.role;
  if (PRIVILEGED_ROLES.has(claimedRole)) {
    return { role: claimedRole, data: { uid: user.uid, email: user.email } };
  }

  const directRole = await getDirectRole(user.uid);
  if (directRole) return directRole;

  const supervisorRole = await getSupervisorRole(user.uid);
  if (supervisorRole) return supervisorRole;

  throw new AccountRoleError(
    "Your sign-in succeeded, but no IT Connect profile is linked to this account.",
    "account/role-not-found"
  );
}

export function dashboardForRole(role) {
  if (ROLE_CONFIG[role]) return ROLE_CONFIG[role].dashboard;
  if (role === "supervisor") return "/supervisor/supervisor_dashboard.html";
  return null;
}

export function persistAccountRole(account, user = auth.currentUser) {
  localStorage.setItem("userRole", account.role);
  const config = ROLE_CONFIG[account.role];
  if (config) {
    localStorage.setItem(
      config.storageKey,
      JSON.stringify({
        ...account.data,
        uid: user?.uid || account.data.uid,
        email: user?.email || account.data.email,
      })
    );
  }
}

export function redirectForRole(account) {
  const destination = dashboardForRole(account.role);
  if (!destination) {
    throw new AccountRoleError(
      "This account must use its dedicated administration portal.",
      "account/external-dashboard"
    );
  }
  window.location.assign(destination);
}
