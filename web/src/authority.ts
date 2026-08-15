import { arrayRemove, arrayUnion, collection, doc, getDoc, getDocs, query, serverTimestamp, where, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { listCompanyApplications, type CompanyApplication } from "./company";
import { httpsCallable } from "firebase/functions";
import { cloudFunctions } from "./firebase";

export interface AuthorityProfileData { name: string; email: string; logoUrl: string; state: string; platformRegistrationId: string; verified: boolean; approved: boolean; maxCompanies: number; }
export interface AuthorityCompany { id: string; name: string; industry: string; email: string; phone: string; state: string; address: string; logoUrl: string; linkStatus: string; linked: boolean; approved: boolean; verified: boolean; opportunityCount: number; applicationCount: number; traineeCount: number; companyCanAccept: boolean; companyCanReject: boolean; authorityFinalApprovalRequired: boolean; policyReason: string; }
export type AuthorityApplication = CompanyApplication & { companyId: string; companyName: string; };

const text = (value: unknown, fallback = "") => typeof value === "string" ? value.trim() : fallback;

export async function getAuthorityProfile(uid: string): Promise<AuthorityProfileData> {
  const snapshot = await getDoc(doc(db, "users", "authorities", "authorities", uid)); if (!snapshot.exists()) throw new Error("Authority profile not found."); const data = snapshot.data();
  return { name: text(data.name) || text(data.authorityName, "Authority"), email: text(data.email), logoUrl: text(data.logoURL), state: text(data.state), platformRegistrationId: text(data.platformRegistrationId), verified: data.isVerified === true, approved: data.isApproved === true, maxCompanies: Number(data.maxCompaniesAllowed || 50) };
}

export async function listAuthorityCompanies(uid: string): Promise<AuthorityCompany[]> {
  let policyMap = new Map<string, {companyCanAccept: boolean; companyCanReject: boolean; authorityFinalApprovalRequired: boolean; reason: string}>();
  try { const callable = httpsCallable<Record<string, never>, {policies: Array<{companyId: string; companyCanAccept: boolean; companyCanReject: boolean; authorityFinalApprovalRequired: boolean; reason: string}>}>(cloudFunctions, "getAuthorityCompanyPolicies"); const result = await callable({}); policyMap = new Map(result.data.policies.map(policy => [policy.companyId, policy])); } catch { /* Defaults remain secure because writes are still enforced server-side. */ }
  const snapshot = await getDocs(query(collection(db, "users", "companies", "companies"), where("authorityId", "==", uid)));
  return Promise.all(snapshot.docs.map(async entry => {
    const data = entry.data(); let opportunityCount = 0; let applicationCount = 0; let traineeCount = 0;
    if (data.isUnderAuthority === true) { try { const [opportunities, trainees] = await Promise.all([getDocs(collection(entry.ref, "IT")), getDocs(query(collection(db, "trainees"), where("companyId", "==", entry.id)))]); opportunityCount = opportunities.size; traineeCount = trainees.size; const applications = await Promise.all(opportunities.docs.map(item => getDocs(collection(item.ref, "applications")))); applicationCount = applications.reduce((sum, item) => sum + item.size, 0); } catch { /* Pending companies are intentionally not operationally visible. */ } }
    const policy = policyMap.get(entry.id) || {companyCanAccept: true, companyCanReject: true, authorityFinalApprovalRequired: true, reason: ""};
    return { id: entry.id, name: text(data.companyName) || text(data.name, "Company"), industry: text(data.industry), email: text(data.email), phone: text(data.phoneNumber), state: text(data.state), address: text(data.address), logoUrl: text(data.logoURL), linkStatus: text(data.authorityLinkStatus, "NONE").toUpperCase(), linked: data.isUnderAuthority === true, approved: data.isApproved === true, verified: data.isVerified === true, opportunityCount, applicationCount, traineeCount, companyCanAccept: policy.companyCanAccept !== false, companyCanReject: policy.companyCanReject !== false, authorityFinalApprovalRequired: policy.authorityFinalApprovalRequired !== false, policyReason: text(policy.reason) } satisfies AuthorityCompany;
  }));
}

export async function decideAuthorityCompanyLink(uid: string, authorityName: string, company: AuthorityCompany, approved: boolean): Promise<void> {
  if (company.linkStatus !== "PENDING") throw new Error("This company link request is no longer pending.");
  const companyRef = doc(db, "users", "companies", "companies", company.id); const batch = writeBatch(db);
  batch.update(companyRef, { isUnderAuthority: approved, authorityId: approved ? uid : null, authorityName: approved ? authorityName : null, authorityLinkStatus: approved ? "APPROVED" : "REJECTED", updatedAt: serverTimestamp() });
  batch.update(doc(db, "users", "authorities", "authorities", uid), { linkedCompanies: approved ? arrayUnion(company.id) : arrayRemove(company.id), updatedAt: serverTimestamp() });
  batch.set(doc(collection(db, "users", "authorities", "authorities", uid, "audit_logs")), { actorId: uid, type: "company_link_decision", companyId: company.id, companyName: company.name, outcome: approved ? "approved" : "rejected", createdAt: serverTimestamp() });
  await batch.commit();
}

export async function unlinkAuthorityCompany(uid: string, company: AuthorityCompany): Promise<void> {
  if (!company.linked) throw new Error("This company is not currently linked.");
  const batch = writeBatch(db); batch.update(doc(db, "users", "companies", "companies", company.id), { isUnderAuthority: false, authorityId: null, authorityName: null, authorityLinkStatus: "UNLINKED", updatedAt: serverTimestamp() }); batch.update(doc(db, "users", "authorities", "authorities", uid), { linkedCompanies: arrayRemove(company.id), updatedAt: serverTimestamp() }); batch.set(doc(collection(db, "users", "authorities", "authorities", uid, "audit_logs")), { actorId: uid, type: "company_unlinked", companyId: company.id, companyName: company.name, createdAt: serverTimestamp() }); await batch.commit();
}

export async function listAuthorityApplications(uid: string): Promise<AuthorityApplication[]> {
  const companies = (await listAuthorityCompanies(uid)).filter(item => item.linked);
  const groups = await Promise.all(companies.map(async company => (await listCompanyApplications(company.id)).map(application => ({ ...application, companyId: company.id, companyName: company.name }))));
  return groups.flat().sort((a, b) => b.submittedAt - a.submittedAt);
}

export async function reviewAuthorityApplication(uid: string, authorityName: string, application: AuthorityApplication, status: "accepted" | "rejected", note: string): Promise<void> {
  void uid; void authorityName;
  const review = httpsCallable<{companyId: string; internshipId: string; applicationId: string; status: "accepted" | "rejected"; note: string}, {status: string}>(cloudFunctions, "reviewAuthorityApplication");
  await review({companyId: application.companyId, internshipId: application.internshipId, applicationId: application.id, status, note});
}

export async function setCompanyApplicationPolicy(company: AuthorityCompany, values: {companyCanAccept: boolean; companyCanReject: boolean; authorityFinalApprovalRequired: boolean; reason: string}): Promise<void> {
  const setPolicy = httpsCallable<typeof values & {companyId: string}, {updated: boolean}>(cloudFunctions, "setCompanyApplicationPolicy");
  await setPolicy({companyId: company.id, ...values});
}
