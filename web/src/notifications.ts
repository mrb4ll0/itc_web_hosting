import { collection, doc, getDocs, limit, orderBy, query, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import type { AppRole } from "./types";

export interface UserNotification { id: string; source: "private" | "general"; title: string; message: string; type: string; createdAt: number; read: boolean; actionId: string; }
const millis = (value: unknown) => value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function" ? value.toMillis() : value && typeof value === "object" && "seconds" in value ? Number(value.seconds) * 1000 : new Date(String(value || "")).getTime() || 0;
const roleSegment = (role: AppRole) => role === "authority" ? "authorities" : role === "company" ? "companies" : "students";
const readKey = (uid: string) => `itc-read-general-notifications:${uid}`;
const generalReadIds = (uid: string) => { try { const value = JSON.parse(localStorage.getItem(readKey(uid)) || "[]"); return new Set<string>(Array.isArray(value) ? value : []); } catch { return new Set<string>(); } };

export async function listUserNotifications(uid: string, role: AppRole): Promise<UserNotification[]> {
  const segment = roleSegment(role); const readGeneral = generalReadIds(uid);
  const [privateResult, generalResult] = await Promise.allSettled([
    getDocs(query(collection(db, "users", segment, segment, uid, "notifications"), orderBy("timestamp", "desc"), limit(100))),
    getDocs(query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(50))),
  ]);
  const privateItems = privateResult.status === "fulfilled" ? privateResult.value.docs.map(entry => { const data = entry.data(); return { id: entry.id, source: "private" as const, title: String(data.title || data.status || "IT Connect update"), message: String(data.message || data.body || ""), type: String(data.type || "update"), createdAt: millis(data.timestamp || data.createdAt), read: (data.read ?? data.isRead) === true, actionId: String(data.actionId || "") }; }) : [];
  const generalItems = generalResult.status === "fulfilled" ? generalResult.value.docs.flatMap(entry => { const data = entry.data(); const target = String(data.targetStudentId || data.studentId || data.targetCompanyId || data.companyId || data.targetAuthorityId || data.authorityId || ""); const audience = String(data.audience || data.targetRole || "").toLowerCase(); if (target && target !== uid || audience && !["all", "general", role].includes(audience)) return []; return [{ id: entry.id, source: "general" as const, title: String(data.title || "IT Connect announcement"), message: String(data.body || data.message || ""), type: String(data.type || "announcement"), createdAt: millis(data.createdAt || data.timestamp), read: readGeneral.has(entry.id), actionId: String(data.actionId || "") }]; }) : [];
  if (!privateItems.length && !generalItems.length && privateResult.status === "rejected" && generalResult.status === "rejected") throw privateResult.reason;
  return [...privateItems, ...generalItems].sort((a, b) => b.createdAt - a.createdAt);
}

export async function markUserNotificationRead(uid: string, role: AppRole, item: UserNotification): Promise<void> {
  if (item.source === "private") { const segment = roleSegment(role); await updateDoc(doc(db, "users", segment, segment, uid, "notifications", item.id), { read: true, isRead: true }); }
  else { const ids = generalReadIds(uid); ids.add(item.id); localStorage.setItem(readKey(uid), JSON.stringify([...ids])); }
}

export async function markAllUserNotificationsRead(uid: string, role: AppRole, items: UserNotification[]): Promise<void> {
  const segment = roleSegment(role); const batch = writeBatch(db); items.filter(item => item.source === "private" && !item.read).forEach(item => batch.update(doc(db, "users", segment, segment, uid, "notifications", item.id), { read: true, isRead: true })); await batch.commit();
  const ids = generalReadIds(uid); items.filter(item => item.source === "general").forEach(item => ids.add(item.id)); localStorage.setItem(readKey(uid), JSON.stringify([...ids]));
}
