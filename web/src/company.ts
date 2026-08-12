import { addDoc, arrayRemove, arrayUnion, collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { db } from "./firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "./firebase";

export interface CompanyProfileData { name: string; username: string; email: string; phone: string; industry: string; state: string; localGovernment: string; address: string; website: string; registrationNumber: string; platformRegistrationId: string; description: string; logoUrl: string; bannerUrl: string; approved: boolean; verified: boolean; authorityName: string; authorityLinkStatus: string; }
export interface CompanyOpportunity { id: string; title: string; industry: string; description: string; duration: string; location: string; requiredSkills: string; intake: number; stipend: number; stipendAvailable: boolean; status: string; applications: number; postedAt: number; }
export interface OpportunityInput { title: string; industry: string; description: string; duration: string; location: string; requiredSkills: string; intake: number; stipend: number; stipendAvailable: boolean; contactPerson: string; }
export interface CompanyApplication { id: string; internshipId: string; internshipTitle: string; studentId: string; studentName: string; email: string; phone: string; institution: string; course: string; level: string; imageUrl: string; status: string; submittedAt: number; description: string; startDate: string; endDate: string; selectedDuration: string; documents: Array<{ name: string; url: string }>; removed: boolean; rejectionReason: string; authorityApproved: boolean; authorityStatus: string; }
export interface CompanyTrainee { id: string; studentId: string; studentName: string; applicationId: string; role: string; department: string; status: string; progress: number; startDate: number; endDate: number; actualStartDate: number; supervisorIds: string[]; milestones: Array<{ title?: string; note?: string; date?: unknown }>; evaluations: Array<{ title?: string; note?: string; score?: number; date?: unknown }>; }
export interface CompanySupervisor { uid: string; name: string; email: string; role: string; imageUrl: string; assignedTrainees: number; }

const text = (value: unknown, fallback = "") => typeof value === "string" ? value.trim() : fallback;
const millis = (value: unknown) => value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function" ? value.toMillis() : value && typeof value === "object" && "seconds" in value ? Number(value.seconds) * 1000 : 0;

export async function getCompanyProfile(uid: string): Promise<CompanyProfileData> {
  const snapshot = await getDoc(doc(db, "users", "companies", "companies", uid));
  if (!snapshot.exists()) throw new Error("Company profile not found.");
  const data = snapshot.data();
  return { name: text(data.companyName) || text(data.name, "Company"), username: text(data.username), email: text(data.email), phone: text(data.phoneNumber), industry: text(data.industry), state: text(data.state), localGovernment: text(data.localGovernment), address: text(data.address), website: text(data.website), registrationNumber: text(data.registrationNumber), platformRegistrationId: text(data.platformRegistrationId), description: text(data.description), logoUrl: text(data.logoURL), bannerUrl: text(data.bannerURL), approved: data.isApproved !== false && data.allowed !== false, verified: data.isVerified === true, authorityName: text(data.authorityName), authorityLinkStatus: text(data.authorityLinkStatus, "NONE") };
}

export async function updateCompanyProfile(uid: string, values: Record<string, string>): Promise<void> {
  const allowed = ["name", "username", "industry", "email", "phoneNumber", "state", "localGovernment", "address", "website", "description"];
  const clean = Object.fromEntries(allowed.map(key => [key, text(values[key])])) as Record<string, string>;
  await updateDoc(doc(db, "users", "companies", "companies", uid), { ...clean, companyName: clean.name, updatedAt: serverTimestamp() });
}

export async function uploadCompanyLogo(uid: string, file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Logo must be a JPG, PNG, or WebP image.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Logo must be smaller than 5 MB.");
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_"); const uploaded = await uploadBytes(ref(storage, `uploads/${uid}/company-logos/${Date.now()}_${safe}`), file, { contentType: file.type }); const url = await getDownloadURL(uploaded.ref);
  await updateDoc(doc(db, "users", "companies", "companies", uid), { logoURL: url, updatedAt: serverTimestamp() }); return url;
}

export async function listCompanyOpportunities(uid: string): Promise<CompanyOpportunity[]> {
  const snapshot = await getDocs(collection(db, "users", "companies", "companies", uid, "IT"));
  return Promise.all(snapshot.docs.map(async entry => {
    const data = entry.data(); const duration = typeof data.duration === "object" && data.duration ? `${data.duration.value || ""} ${data.duration.unit || ""}`.trim() : text(data.duration, "Not specified");
    let applications = Number(data.applicationCount || data.applicationsCount || 0);
    try { applications = (await getDocs(collection(entry.ref, "applications"))).size; } catch { /* Retain stored count. */ }
    return { id: entry.id, title: text(data.title, "Untitled opportunity"), industry: text(data.industry) || text(data.department), description: text(data.description), duration, location: text(data.location) || text(data.address), requiredSkills: text(data.requiredSkills) || text(data.eligibilityCriteria), intake: Number(data.intake || data.intakeCapacity || 0), stipend: Number(data.stipend || 0), stipendAvailable: data.stipendAvailable === true || Number(data.stipend || 0) > 0, status: text(data.status, "open").toLowerCase(), applications, postedAt: millis(data.postedAt || data.createdAt) };
  })).then(items => items.sort((a, b) => b.postedAt - a.postedAt));
}

export async function createCompanyOpportunity(uid: string, profile: CompanyProfileData, input: OpportunityInput): Promise<void> {
  await addDoc(collection(db, "users", "companies", "companies", uid, "IT"), { ...input, duration: { value: input.duration, unit: "months" }, stipend: input.stipendAvailable ? String(input.stipend) : "", status: "open", isDeleted: false, isFeatured: false, aptitudeTestRequired: false, applicationsCount: 0, applicationCount: 0, applications: [], acceptedApplications: [], attachmentUrls: [], companyId: uid, companyName: profile.name, companyLogoUrl: profile.logoUrl || null, company: { id: uid, name: profile.name, email: profile.email, phoneNumber: profile.phone, industry: profile.industry, state: profile.state, address: profile.address, logoURL: profile.logoUrl }, postedBy: input.contactPerson, eligibilityCriteria: input.requiredSkills, postedAt: serverTimestamp(), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export async function setCompanyOpportunityStatus(uid: string, opportunityId: string, status: "open" | "closed"): Promise<void> {
  await updateDoc(doc(db, "users", "companies", "companies", uid, "IT", opportunityId), { status, updatedAt: serverTimestamp() });
}

export async function listCompanyApplications(uid: string): Promise<CompanyApplication[]> {
  const opportunities = await getDocs(collection(db, "users", "companies", "companies", uid, "IT"));
  const groups = await Promise.all(opportunities.docs.map(async opportunity => {
    const applications = await getDocs(collection(opportunity.ref, "applications")); const opportunityData = opportunity.data();
    return applications.docs.map(entry => {
      const data = entry.data(); const student = data.student && typeof data.student === "object" ? data.student as Record<string, unknown> : {}; const duration = data.durationDetails && typeof data.durationDetails === "object" ? data.durationDetails as Record<string, unknown> : {};
      const studentId = text(student.uid) || text(student.id) || text(data.studentId) || entry.id.split("_")[0];
      const listed = Array.isArray(data.documents) ? data.documents.map((item: Record<string, unknown>) => ({ name: text(item.name) || text(item.kind, "Document"), url: text(item.url) })) : [];
      const legacy = [["Resume", data.resumeURL], ["IT letter", data.itLetterUrl], ["Student ID", data.idCardUrl], ["Cover letter", data.coverLetter]].filter(item => text(item[1])).map(item => ({ name: String(item[0]), url: text(item[1]) }));
      return { id: entry.id, internshipId: opportunity.id, internshipTitle: text(opportunityData.title, "Opportunity"), studentId, studentName: text(student.fullName) || text(student.name, "Student"), email: text(student.email), phone: text(student.phoneNumber), institution: text(student.institution) || text(student.school), course: text(student.courseOfStudy) || text(student.course), level: text(student.level), imageUrl: text(student.imageUrl), status: text(data.applicationStatus, "pending").toLowerCase(), submittedAt: millis(data.applicationDate || data.submittedAt || data.createdAt), description: text(duration.description) || text(data.description), startDate: text(duration.startDate), endDate: text(duration.endDate), selectedDuration: text(duration.selectedDuration), documents: [...listed, ...legacy].filter((file, index, all) => file.url && all.findIndex(candidate => candidate.url === file.url) === index), removed: data.isDeleted === true || text(data.applicationStatus).toLowerCase() === "deleted", rejectionReason: text(data.rejectionReason), authorityApproved: Boolean(data.approvedByAuthorityId), authorityStatus: text(data.authorityStatus) } satisfies CompanyApplication;
    });
  }));
  return groups.flat().filter(item => !item.removed).sort((a, b) => b.submittedAt - a.submittedAt);
}

export async function reviewCompanyApplication(uid: string, application: CompanyApplication, status: "accepted" | "rejected", note: string): Promise<void> {
  const applicationRef = doc(db, "users", "companies", "companies", uid, "IT", application.internshipId, "applications", application.id);
  const snapshot = await getDoc(applicationRef);
  if (!snapshot.exists() || snapshot.data().isDeleted === true || text(snapshot.data().applicationStatus).toLowerCase() === "deleted") throw new Error("This application was removed and cannot be reviewed.");
  await updateDoc(applicationRef, { applicationStatus: status, reviewedAt: serverTimestamp(), reviewedBy: uid, reviewNote: note, ...(status === "rejected" ? { rejectionReason: note } : {}), statusHistory: arrayUnion({ status, note, timestamp: new Date().toISOString(), actor: "company" }) });
  if (status === "accepted") {
    const existing = await getDocs(query(collection(db, "trainees"), where("companyId", "==", uid)));
    if (!existing.docs.some(entry => entry.data().applicationId === application.id && entry.data().studentId === application.studentId)) {
      const profile = await getCompanyProfile(uid); const traineeId = `${application.studentId}_${uid}_${Date.now()}`; const startDate = application.startDate ? new Date(application.startDate) : null; const endDate = application.endDate ? new Date(application.endDate) : null;
      await setDoc(doc(db, "trainees", traineeId), { studentId: application.studentId, studentName: application.studentName, companyId: uid, companyName: profile.name, applicationId: application.id, internshipId: application.internshipId, status: "accepted", startDate: startDate && !Number.isNaN(startDate.getTime()) ? startDate : null, endDate: endDate && !Number.isNaN(endDate.getTime()) ? endDate : null, actualStartDate: null, actualEndDate: null, supervisorIds: [], department: application.course, role: application.internshipTitle, description: application.description, requirements: { selectedDuration: application.selectedDuration }, milestones: [], evaluations: [], studentLogbook: [], studentFeedback: [], completionReview: {}, progress: 0, metadata: { source: "web", createdFromApplication: true }, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    }
  }
  if (application.studentId) {
    try { await addDoc(collection(db, "users", "students", "students", application.studentId, "notifications"), { targetStudentId: application.studentId, status: `Application ${status}`, message: `${application.internshipTitle}: your application was ${status}.${note ? ` ${note}` : ""}`, actionId: "open_applications", applicationId: application.id, internshipId: application.internshipId, companyId: uid, timestamp: serverTimestamp(), read: false }); } catch { /* The decision remains authoritative even if notification delivery fails. */ }
  }
}

export async function listCompanyTrainees(uid: string): Promise<CompanyTrainee[]> {
  const snapshot = await getDocs(query(collection(db, "trainees"), where("companyId", "==", uid)));
  return snapshot.docs.map(entry => { const data = entry.data(); return { id: entry.id, studentId: text(data.studentId), studentName: text(data.studentName, "Student"), applicationId: text(data.applicationId), role: text(data.role, "Industrial trainee"), department: text(data.department), status: text(data.status, "accepted").toLowerCase(), progress: Math.max(0, Math.min(100, Number(data.progress || 0))), startDate: millis(data.startDate), endDate: millis(data.endDate), actualStartDate: millis(data.actualStartDate), supervisorIds: Array.isArray(data.supervisorIds) ? data.supervisorIds.map(String) : [], milestones: Array.isArray(data.milestones) ? data.milestones : [], evaluations: Array.isArray(data.evaluations) ? data.evaluations : [] } satisfies CompanyTrainee; }).sort((a, b) => (b.actualStartDate || b.startDate) - (a.actualStartDate || a.startDate));
}

export async function updateCompanyTrainee(uid: string, trainee: CompanyTrainee, values: { status?: "accepted" | "active" | "completed" | "terminated"; progress?: number; note?: string }): Promise<void> {
  const reference = doc(db, "trainees", trainee.id); const snapshot = await getDoc(reference);
  if (!snapshot.exists() || snapshot.data().companyId !== uid) throw new Error("This trainee record is not owned by your company.");
  const update: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (values.status) { update.status = values.status; if (values.status === "active") update.actualStartDate = serverTimestamp(); if (["completed", "terminated"].includes(values.status)) update.actualEndDate = serverTimestamp(); if (values.status === "completed") update.progress = 100; if (values.status === "terminated") update.terminationReason = values.note || "Training ended by company"; }
  if (values.progress != null) update.progress = Math.max(0, Math.min(100, values.progress));
  if (values.note) update.milestones = arrayUnion({ title: values.status ? `Training ${values.status}` : "Progress update", note: values.note, date: new Date().toISOString(), addedBy: uid });
  await updateDoc(reference, update);
}

async function resolveSupervisorAccount(uid: string): Promise<Omit<CompanySupervisor, "assignedTrainees"> | null> {
  const paths: Array<[string, string]> = [[`users/students/students/${uid}`, "student"], [`users/companies/companies/${uid}`, "company"], [`users/authorities/authorities/${uid}`, "authority"], [`admins/${uid}`, "admin"]];
  for (const [path, role] of paths) { try { const snapshot = await getDoc(doc(db, path)); if (snapshot.exists()) { const data = snapshot.data(); return { uid, name: text(data.fullName) || text(data.companyName) || text(data.authorityName) || text(data.name, "IT Connect member"), email: text(data.email), role, imageUrl: text(data.imageUrl) || text(data.logoURL) }; } } catch { /* Try the next canonical profile path. */ } }
  return null;
}

export async function findSupervisorAccount(uid: string): Promise<Omit<CompanySupervisor, "assignedTrainees">> {
  const account = await resolveSupervisorAccount(uid.trim()); if (!account) throw new Error("No IT Connect account was found for that account ID."); return account;
}

export async function listCompanySupervisors(uid: string, trainees?: CompanyTrainee[]): Promise<CompanySupervisor[]> {
  const company = await getDoc(doc(db, "users", "companies", "companies", uid)); if (!company.exists()) throw new Error("Company profile not found.");
  const ids = Array.isArray(company.data().supervisors) ? company.data().supervisors.map(String) : []; const records = trainees || await listCompanyTrainees(uid);
  const accounts = await Promise.all(ids.map(resolveSupervisorAccount));
  return accounts.filter((item): item is Omit<CompanySupervisor, "assignedTrainees"> => Boolean(item)).map(item => ({ ...item, assignedTrainees: records.filter(trainee => trainee.supervisorIds.includes(item.uid)).length }));
}

export async function setCompanySupervisor(uid: string, supervisorId: string, add: boolean): Promise<void> {
  if (add) await findSupervisorAccount(supervisorId);
  await updateDoc(doc(db, "users", "companies", "companies", uid), { supervisors: add ? arrayUnion(supervisorId) : arrayRemove(supervisorId), updatedAt: serverTimestamp() });
  if (!add) { const trainees = await listCompanyTrainees(uid); await Promise.all(trainees.filter(item => item.supervisorIds.includes(supervisorId)).map(item => updateDoc(doc(db, "trainees", item.id), { supervisorIds: arrayRemove(supervisorId), updatedAt: serverTimestamp() }))); }
}

export async function assignCompanySupervisor(uid: string, traineeId: string, supervisorId: string, assign: boolean): Promise<void> {
  const traineeRef = doc(db, "trainees", traineeId); const trainee = await getDoc(traineeRef); if (!trainee.exists() || trainee.data().companyId !== uid) throw new Error("This trainee is not owned by your company.");
  const company = await getDoc(doc(db, "users", "companies", "companies", uid)); const directory = company.exists() && Array.isArray(company.data().supervisors) ? company.data().supervisors.map(String) : [];
  if (assign && !directory.includes(supervisorId)) throw new Error("Add this account to the supervisor directory first.");
  await updateDoc(traineeRef, { supervisorIds: assign ? arrayUnion(supervisorId) : arrayRemove(supervisorId), updatedAt: serverTimestamp() });
}
