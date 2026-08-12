import { arrayRemove, arrayUnion, collection, doc, getDoc, getDocs, query, serverTimestamp, where, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { listCompanyApplications, type CompanyApplication } from "./company";

export interface AuthorityProfileData { name: string; email: string; logoUrl: string; state: string; platformRegistrationId: string; verified: boolean; approved: boolean; maxCompanies: number; }
export interface AuthorityCompany { id: string; name: string; industry: string; email: string; phone: string; state: string; address: string; logoUrl: string; linkStatus: string; linked: boolean; approved: boolean; verified: boolean; opportunityCount: number; applicationCount: number; traineeCount: number; }
export type AuthorityApplication = CompanyApplication & { companyId: string; companyName: string; };

const text = (value: unknown, fallback = "") => typeof value === "string" ? value.trim() : fallback;

export async function getAuthorityProfile(uid: string): Promise<AuthorityProfileData> {
  const snapshot = await getDoc(doc(db, "users", "authorities", "authorities", uid)); if (!snapshot.exists()) throw new Error("Authority profile not found."); const data = snapshot.data();
  return { name: text(data.name) || text(data.authorityName, "Authority"), email: text(data.email), logoUrl: text(data.logoURL), state: text(data.state), platformRegistrationId: text(data.platformRegistrationId), verified: data.isVerified === true, approved: data.isApproved === true, maxCompanies: Number(data.maxCompaniesAllowed || 50) };
}

export async function listAuthorityCompanies(uid: string): Promise<AuthorityCompany[]> {
  const snapshot = await getDocs(query(collection(db, "users", "companies", "companies"), where("authorityId", "==", uid)));
  return Promise.all(snapshot.docs.map(async entry => {
    const data = entry.data(); let opportunityCount = 0; let applicationCount = 0; let traineeCount = 0;
    if (data.isUnderAuthority === true) { try { const [opportunities, trainees] = await Promise.all([getDocs(collection(entry.ref, "IT")), getDocs(query(collection(db, "trainees"), where("companyId", "==", entry.id)))]); opportunityCount = opportunities.size; traineeCount = trainees.size; const applications = await Promise.all(opportunities.docs.map(item => getDocs(collection(item.ref, "applications")))); applicationCount = applications.reduce((sum, item) => sum + item.size, 0); } catch { /* Pending companies are intentionally not operationally visible. */ } }
    return { id: entry.id, name: text(data.companyName) || text(data.name, "Company"), industry: text(data.industry), email: text(data.email), phone: text(data.phoneNumber), state: text(data.state), address: text(data.address), logoUrl: text(data.logoURL), linkStatus: text(data.authorityLinkStatus, "NONE").toUpperCase(), linked: data.isUnderAuthority === true, approved: data.isApproved === true, verified: data.isVerified === true, opportunityCount, applicationCount, traineeCount } satisfies AuthorityCompany;
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
  const company = await getDoc(doc(db, "users", "companies", "companies", application.companyId)); if (!company.exists() || company.data().authorityId !== uid || company.data().isUnderAuthority !== true) throw new Error("This company is no longer linked to your authority.");
  const applicationRef = doc(db, "users", "companies", "companies", application.companyId, "IT", application.internshipId, "applications", application.id); const current = await getDoc(applicationRef); if (!current.exists() || current.data().isDeleted === true) throw new Error("This application is no longer available.");
  const batch = writeBatch(db); batch.update(applicationRef, { applicationStatus: status, authorityStatus: status, authorityReviewNote: note, reviewedAt: serverTimestamp(), ...(status === "accepted" ? { approvedByAuthorityId: uid, approvedByAuthorityName: authorityName, authorityApprovedAt: serverTimestamp() } : {}) });
  batch.set(doc(collection(db, "users", "authorities", "authorities", uid, "audit_logs")), { actorId: uid, type: "application_decision", applicationId: application.id, internshipId: application.internshipId, companyId: application.companyId, studentId: application.studentId, outcome: status, note, createdAt: serverTimestamp() });
  if (status === "accepted") {
    const trainees = await getDocs(query(collection(db, "trainees"), where("companyId", "==", application.companyId))); const existing = trainees.docs.find(item => item.data().applicationId === application.id && item.data().studentId === application.studentId);
    if (existing) batch.update(existing.ref, { status: "accepted", updatedAt: serverTimestamp() });
    else { const traineeRef = doc(collection(db, "trainees")); const start = application.startDate ? new Date(application.startDate) : null; const end = application.endDate ? new Date(application.endDate) : null; batch.set(traineeRef, { studentId: application.studentId, studentName: application.studentName, companyId: application.companyId, companyName: application.companyName, applicationId: application.id, internshipId: application.internshipId, status: "accepted", startDate: start && !Number.isNaN(start.getTime()) ? start : null, endDate: end && !Number.isNaN(end.getTime()) ? end : null, supervisorIds: [], department: application.course, role: application.internshipTitle, description: application.description, requirements: { selectedDuration: application.selectedDuration }, milestones: [], evaluations: [], studentLogbook: [], studentFeedback: [], completionReview: {}, progress: 0, metadata: { source: "authority_web", approvedByAuthorityId: uid }, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }); }
  }
  await batch.commit();
}
