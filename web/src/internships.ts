import { collection, collectionGroup, deleteDoc, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { Internship } from "./types";

const aliases: Record<string, string[]> = {
  technology: ["computer", "computing", "software", "web", "information technology", "it", "data", "cyber"],
  engineering: ["engineering", "electrical", "mechanical", "civil", "mechatronics"],
  health: ["health", "hospital", "medical", "pharmacy", "nursing"],
  hospitality: ["hospitality", "hotel", "tourism", "catering"],
};

const text = (value: unknown, fallback = "") => typeof value === "string" ? value.trim() : fallback;
const bool = (value: unknown) => value === true || String(value).toLowerCase() === "true";
const millis = (value: unknown): number => {
  if (value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") return value.toMillis();
  if (value && typeof value === "object" && "seconds" in value) return Number(value.seconds) * 1000;
  const parsed = new Date(String(value || "")).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

export async function listInternships(): Promise<Internship[]> {
  const snapshot = await getDocs(query(collectionGroup(db, "IT"), limit(100)));
  const companyCache = new Map<string, Record<string, unknown>>();
  const results = await Promise.all(snapshot.docs.map(async (entry) => {
    const raw = (entry.data().rawInternship || entry.data()) as Record<string, unknown>;
    const embedded = (raw.company || {}) as Record<string, unknown>;
    const companyId = text(embedded.id) || entry.ref.parent.parent?.id || "";
    let company = embedded;
    if (companyId && !text(company.name)) {
      if (!companyCache.has(companyId)) {
        const companyDoc = await getDoc(doc(db, "users", "companies", "companies", companyId));
        companyCache.set(companyId, companyDoc.exists() ? companyDoc.data() : {});
      }
      company = companyCache.get(companyId) || embedded;
    }
    const status = text(raw.status, "open").toLowerCase();
    const removed = bool(raw.isDeleted) || bool(raw.removed) || ["deleted", "removed"].includes(status);
    return {
      id: entry.id, companyId, companyName: text(company.name, "Company"), companyLogo: text(company.logoURL) || undefined,
      title: text(raw.title) || text(raw.name, "Industrial training opportunity"), description: text(raw.description),
      industry: text(raw.industry) || text(company.industry), course: text(raw.course) || text(raw.department),
      state: text(raw.state) || text(company.state), lga: text(raw.localGovernment) || text(company.localGovernment),
      address: text(raw.address) || text(raw.location) || text(company.address), duration: text(raw.duration, "Not specified"),
      stipend: raw.stipend == null ? undefined : Number(raw.stipend), paid: bool(raw.stipendAvailable) || Number(raw.stipend || 0) > 0,
      status, removed, postedAt: millis(raw.postedAt || raw.createdAt),
    } satisfies Internship;
  }));
  return results.sort((a, b) => b.postedAt - a.postedAt);
}

export function matchesInternship(item: Internship, search: string, category: string, state: string, paidOnly: boolean): boolean {
  const haystack = `${item.title} ${item.description} ${item.course} ${item.industry} ${item.companyName}`.toLowerCase();
  const searchTokens = search.toLowerCase().split(/\s+/).filter(Boolean);
  const expanded = searchTokens.flatMap(token => [token, ...Object.entries(aliases).filter(([key, values]) => key.includes(token) || values.some(value => value.includes(token))).flatMap(([key, values]) => [key, ...values])]);
  return (!expanded.length || expanded.some(token => haystack.includes(token))) && (!category || haystack.includes(category.toLowerCase())) && (!state || item.state.toLowerCase() === state.toLowerCase()) && (!paidOnly || item.paid);
}

export async function getSavedIds(uid: string): Promise<Set<string>> {
  const snapshot = await getDocs(collection(db, "users", "students", "students", uid, "saved_internships"));
  return new Set(snapshot.docs.map(item => item.id));
}

export async function toggleSaved(uid: string, internship: Internship, saved: boolean): Promise<void> {
  const ref = doc(db, "users", "students", "students", uid, "saved_internships", internship.id);
  if (saved) await deleteDoc(ref);
  else await setDoc(ref, { ...internship, savedAt: serverTimestamp() });
}

export async function listSavedInternships(uid: string, available: Internship[]): Promise<Internship[]> {
  const snapshot = await getDocs(collection(db, "users", "students", "students", uid, "saved_internships"));
  const live = new Map(available.map(item => [item.id, item]));
  return snapshot.docs.map(entry => {
    const current = live.get(entry.id);
    if (current) return current;
    const data = entry.data();
    return {
      id: entry.id, companyId: text(data.companyId), companyName: text(data.companyName, "Company"), companyLogo: text(data.companyLogo) || undefined,
      title: text(data.title, "Industrial training opportunity"), description: text(data.description), industry: text(data.industry), course: text(data.course),
      state: text(data.state), lga: text(data.lga), address: text(data.address), duration: text(data.duration, "Not specified"),
      stipend: data.stipend == null ? undefined : Number(data.stipend), paid: bool(data.paid), status: text(data.status, "removed"), removed: true,
      postedAt: millis(data.postedAt),
    } satisfies Internship;
  });
}

const recentKey = (uid: string) => `itc-recent-internships:${uid}`;

export function recordRecentInternship(uid: string, internshipId: string): void {
  const recent = getRecentInternshipIds(uid).filter(id => id !== internshipId);
  localStorage.setItem(recentKey(uid), JSON.stringify([internshipId, ...recent].slice(0, 20)));
}

export function getRecentInternshipIds(uid: string): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(recentKey(uid)) || "[]");
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch { return []; }
}
