import { arrayUnion, doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "./firebase";

export type StudentProfileData = Record<string, unknown> & {
  uid: string; fullName?: string; email?: string; phoneNumber?: string; bio?: string; imageUrl?: string;
  institution?: string; courseOfStudy?: string; department?: string; level?: string; registrationNumber?: string; matricNumber?: string;
  currentAddress?: string; permanentAddress?: string; stateOfOrigin?: string; state?: string; localGovernmentArea?: string;
  linkedinUrl?: string; githubUrl?: string; portfolioUrl?: string; skills?: string[];
  emergencyContactName?: string; emergencyContactPhone?: string; emergencyContactRelationship?: string; emergencyContactEmail?: string;
  resumeUrl?: string; idCards?: string[]; itLetters?: string[];
};

const profileRef = (uid: string) => doc(db, "users", "students", "students", uid);

export async function getStudentProfile(uid: string): Promise<StudentProfileData> {
  const snapshot = await getDoc(profileRef(uid));
  if (!snapshot.exists()) throw new Error("Student profile not found.");
  return { uid, ...snapshot.data() } as StudentProfileData;
}

export async function updateStudentProfile(uid: string, values: Record<string, string | string[]>): Promise<void> {
  const clean = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Array.isArray(value) ? value.map(item => item.trim()).filter(Boolean) : value.trim()]));
  const current = await getDoc(profileRef(uid));
  const merged = { ...(current.exists() ? current.data() : {}), ...clean };
  await updateDoc(profileRef(uid), { ...clean, updatedAt: serverTimestamp(), profileCompletion: calculateCompletion(merged) });
}

export function calculateCompletion(profile: Record<string, unknown>): number {
  const required = ["fullName","email","phoneNumber","bio","imageUrl","institution","courseOfStudy","level","currentAddress","stateOfOrigin","localGovernmentArea","skills","resumeUrl","emergencyContactName","emergencyContactPhone"];
  const completed = required.filter(key => Array.isArray(profile[key]) ? (profile[key] as unknown[]).length > 0 : Boolean(profile[key])).length;
  return Math.round((completed / required.length) * 100);
}

export async function uploadProfileAsset(uid: string, kind: "photo" | "resume" | "idCard" | "itLetter", file: File): Promise<string> {
  const image = kind === "photo";
  const allowed = image ? ["image/jpeg","image/png","image/webp"] : ["application/pdf","image/jpeg","image/png"];
  const max = image ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
  if (!allowed.includes(file.type)) throw new Error(image ? "Photo must be JPG, PNG, or WebP." : "Document must be PDF, JPG, or PNG.");
  if (file.size > max) throw new Error(`${file.name} is too large.`);
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `uploads/${uid}/profile/${kind}/${Date.now()}_${safe}`;
  const uploaded = await uploadBytes(ref(storage, storagePath), file, { contentType: file.type });
  const url = await getDownloadURL(uploaded.ref);
  const field = kind === "photo" ? "imageUrl" : kind === "resume" ? "resumeUrl" : kind === "idCard" ? "idCards" : "itLetters";
  await updateDoc(profileRef(uid), { [field]: ["idCards","itLetters"].includes(field) ? arrayUnion(url) : url, updatedAt: serverTimestamp() });
  return url;
}
