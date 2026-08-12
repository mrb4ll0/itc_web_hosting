import { addDoc, collection, doc, documentId, getDoc, getDocs, query, serverTimestamp, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { cloudFunctions, db, storage } from "./firebase";
import type { ApplicationRecord, Internship } from "./types";

export interface ApplicationDraft {
  description: string;
  startDate: string;
  endDate: string;
  selectedDuration: string;
  files: Array<{ kind: string; file: File }>;
}

const toMillis = (value: unknown) => value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function" ? value.toMillis() : value && typeof value === "object" && "seconds" in value ? Number(value.seconds) * 1000 : new Date(String(value || "")).getTime() || 0;

async function uploadDocuments(uid: string, internshipId: string, files: ApplicationDraft["files"]) {
  return Promise.all(files.map(async ({ kind, file }) => {
    if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name} is larger than 10 MB.`);
    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) throw new Error(`${file.name} must be a PDF, JPG, or PNG.`);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `uploads/${uid}/it_applications/${internshipId}/${Date.now()}_${kind}_${safeName}`;
    const upload = await uploadBytes(ref(storage, path), file, { contentType: file.type });
    return { kind, name: file.name, url: await getDownloadURL(upload.ref), storagePath: path };
  }));
}

export async function submitApplication(uid: string, internship: Internship, draft: ApplicationDraft): Promise<string> {
  if (!internship.companyId) throw new Error("This opportunity is missing its company reference.");
  const apps = collection(db, "users", "companies", "companies", internship.companyId, "IT", internship.id, "applications");
  const existingApplication = await getDocs(query(apps, where(documentId(), ">=", `${uid}_`), where(documentId(), "<=", `${uid}_\uf8ff`)));
  if (!existingApplication.empty) throw new Error("You have already applied for this opportunity.");
  const studentDoc = await getDoc(doc(db, "users", "students", "students", uid));
  if (!studentDoc.exists()) throw new Error("Your student profile could not be found.");
  const slotBalance = Number(studentDoc.data().slotBalance || 0);
  if (!Number.isFinite(slotBalance) || slotBalance < 500) throw new Error(`You need a ₦500 application slot before submitting. Your current balance is ₦${Math.max(0, slotBalance).toLocaleString()}. Purchase a slot before continuing.`);
  const documents = await uploadDocuments(uid, internship.id, draft.files);
  const durationInDays = draft.startDate && draft.endDate ? Math.max(0, Math.ceil((new Date(draft.endDate).getTime() - new Date(draft.startDate).getTime()) / 86400000)) : 0;
  const submitPaid = httpsCallable<{ companyId: string; internshipId: string; companyName: string; companyLogo: string; draft: Record<string, unknown>; documents: typeof documents }, { applicationId: string; paymentStatus: string; amount: number }>(cloudFunctions, "submitPaidApplication");
  const response = await submitPaid({ companyId: internship.companyId, internshipId: internship.id, companyName: internship.companyName, companyLogo: internship.companyLogo || "", draft: { description: draft.description, startDate: draft.startDate, endDate: draft.endDate, selectedDuration: draft.selectedDuration, durationInDays }, documents });
  const applicationId = response.data.applicationId;
  try {
    await addDoc(collection(db, "users", "students", "students", uid, "notifications"), { status: "Application submitted", message: `Your paid application for ${internship.title} was submitted to ${internship.companyName}. ₦${response.data.amount.toLocaleString()} was deducted from your slot balance.`, actionId: "open_applications", applicationId, timestamp: serverTimestamp(), read: false });
  } catch (error) {
    console.warn("Application submitted, but its confirmation notification could not be created.", error);
  }
  return applicationId;
}

const profileRef = (uid: string) => doc(db, "users", "students", "students", uid);

type ApplicationPair = { companyId: string; internshipId: string };

function applicationPairs(value: unknown): ApplicationPair[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const pairs: ApplicationPair[] = [];
  for (const [companyId, indexedValue] of Object.entries(value as Record<string, unknown>)) {
    if (typeof indexedValue === "string" && indexedValue) {
      pairs.push({ companyId, internshipId: indexedValue });
      continue;
    }
    if (Array.isArray(indexedValue)) {
      for (const item of indexedValue) {
        if (typeof item === "string" && item) pairs.push({ companyId, internshipId: item });
        else if (item && typeof item === "object") {
          const record = item as Record<string, unknown>;
          const internshipId = record.internshipId || record.itId || record.id;
          if (typeof internshipId === "string" && internshipId) pairs.push({ companyId, internshipId });
        }
      }
      continue;
    }
    if (indexedValue && typeof indexedValue === "object") {
      const record = indexedValue as Record<string, unknown>;
      const explicitId = record.internshipId || record.itId || record.id;
      if (typeof explicitId === "string" && explicitId) {
        pairs.push({ companyId, internshipId: explicitId });
      } else {
        // Older clients stored one or more internship IDs as nested map keys.
        for (const [internshipId, marker] of Object.entries(record)) {
          if (internshipId && marker !== false && marker != null) pairs.push({ companyId, internshipId });
        }
      }
    }
  }
  return [...new Map(pairs.map(pair => [`${pair.companyId}/${pair.internshipId}`, pair])).values()];
}

export async function listStudentApplications(uid: string): Promise<ApplicationRecord[]> {
  const student = await getDoc(profileRef(uid));
  if (!student.exists()) throw new Error("Student profile not found.");
  const applicationIndex = student.data().applications;
  if (!applicationIndex || typeof applicationIndex !== "object" || Array.isArray(applicationIndex)) return [];
  const pairs = applicationPairs(applicationIndex);
  if (Object.keys(applicationIndex as Record<string, unknown>).length && !pairs.length) {
    throw new Error("Your application index exists, but its company and internship references could not be read.");
  }
  const groups = await Promise.all(pairs.map(async ({ companyId, internshipId }) => {
    const apps = collection(db, "users", "companies", "companies", companyId, "IT", internshipId, "applications");
    const [snapshot, legacyApplication] = await Promise.all([
      getDocs(query(apps, where(documentId(), ">=", `${uid}_`), where(documentId(), "<=", `${uid}_\uf8ff`))),
      getDoc(doc(apps, uid)),
    ]);
    const documents = [...snapshot.docs];
    if (legacyApplication.exists() && !documents.some(entry => entry.id === legacyApplication.id)) documents.push(legacyApplication);
    return documents.map(entry => {
      const data = entry.data(); const internship = data.internship || {}; const company = internship.company || {};
      const duration = data.durationDetails || {};
      const listedDocuments = Array.isArray(data.documents) ? data.documents : [];
      const legacyDocuments = [
        ["Student ID card", "idCard", data.idCardUrl], ["IT letter", "itLetter", data.itLetterUrl],
        ["Resume", "resume", data.resumeURL], ["Cover letter", "coverLetter", data.coverLetter],
        ["Authority letter", "authorityLetter", data.authorityLetterUrl || data.authorityApproval?.letterUrl],
      ].filter(item => typeof item[2] === "string" && item[2]).map(item => ({ name: String(item[0]), kind: String(item[1]), url: String(item[2]) }));
      const formDocuments = Array.isArray(data.attachedFormUrls) ? data.attachedFormUrls.map((url: unknown, index: number) => ({ name: `Application form ${index + 1}`, kind: "form", url: String(url) })) : [];
      const rawHistory = Array.isArray(data.statusHistory) ? data.statusHistory : Array.isArray(data.history) ? data.history : [];
      const training = data.training && typeof data.training === "object" ? data.training : {};
      const rawUpdates = Array.isArray(training.updates) ? training.updates : Array.isArray(data.trainingUpdates) ? data.trainingUpdates : [];
      return {
        id: entry.id, internshipId, companyId,
        title: internship.title || internship.position || data.position || "Opportunity",
        companyName: company.name || internship.companyName || data.companyName || "Company",
        status: String(data.applicationStatus || data.status || "pending").toLowerCase(),
        description: duration.description || data.durationDescription || internship.description || "",
        submittedAt: toMillis(data.submittedAt || data.applicationDate || data.createdAt),
        documents: [...listedDocuments, ...legacyDocuments, ...formDocuments].filter((file, index, all) => file.url && all.findIndex(candidate => candidate.url === file.url) === index),
        location: internship.address || internship.location || [internship.state, internship.lga].filter(Boolean).join(", ") || "Not specified",
        startDate: String(duration.startDate || data.startDate || ""), endDate: String(duration.endDate || data.endDate || ""),
        selectedDuration: String(duration.selectedDuration || data.selectedDuration || internship.duration || "Not specified"),
        removed: data.removed === true || internship.removed === true || String(data.applicationStatus).toLowerCase() === "deleted",
        cancelled: data.cancelled === true || data.canceled === true || ["cancelled", "canceled", "withdrawn"].includes(String(data.applicationStatus).toLowerCase()),
        authorityStatus: String(data.authorityStatus || data.authorityApproval?.status || ""),
        authorityLetterUrl: String(data.authorityLetterUrl || data.authorityApproval?.letterUrl || ""),
        paymentStatus: String(data.paymentStatus || data.payment?.status || ""), refundStatus: String(data.refundStatus || data.refund?.status || ""),
        statusHistory: rawHistory.map((item: Record<string, unknown>) => ({ status: String(item.status || item.action || "Update"), date: toMillis(item.date || item.timestamp || item.createdAt), note: String(item.note || item.message || "") })),
        trainingStatus: String(training.status || data.trainingStatus || (String(data.applicationStatus).toLowerCase() === "accepted" ? "active" : "")),
        trainingProgress: Math.max(0, Math.min(100, Number(training.progress || data.trainingProgress || data.progress || 0))),
        certificateUrl: String(training.certificateUrl || data.certificateUrl || data.completionCertificateUrl || ""),
        trainingUpdates: rawUpdates.map((item: Record<string, unknown>) => ({ title: String(item.title || item.status || "Training update"), date: toMillis(item.date || item.timestamp || item.createdAt), note: String(item.note || item.message || item.description || "") })),
      } satisfies ApplicationRecord;
    });
  }));
  const records = groups.flat().sort((a, b) => b.submittedAt - a.submittedAt);
  if (pairs.length && !records.length) {
    throw new Error(`Your profile indexes ${pairs.length} application location${pairs.length === 1 ? "" : "s"}, but no submitted record matched this signed-in student account.`);
  }
  return records;
}
