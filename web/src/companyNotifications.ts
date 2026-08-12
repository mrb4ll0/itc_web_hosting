import { collection, doc, onSnapshot, query, updateDoc, where, writeBatch, type DocumentData, type QuerySnapshot, type Unsubscribe } from "firebase/firestore";
import { db } from "./firebase";

export interface CompanyNotificationRecord { id: string; title: string; message: string; type: string; createdAt: number; read: boolean; important: boolean; senderName: string; actionUrl: string; data: Record<string, unknown>; }

const millis = (value: unknown) => value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function" ? value.toMillis() : value && typeof value === "object" && "seconds" in value ? Number(value.seconds) * 1000 : new Date(String(value || "")).getTime() || 0;

export function watchCompanyNotifications(uid: string, listener: (items: CompanyNotificationRecord[]) => void, failure: (error: Error) => void): Unsubscribe {
  const results = new Map<string, CompanyNotificationRecord>(); const sourceIds = [new Set<string>(), new Set<string>()];
  const emit = () => listener([...results.values()].sort((a, b) => b.createdAt - a.createdAt));
  const consume = (source: number, snapshot: QuerySnapshot<DocumentData>) => {
    sourceIds[source].forEach(id => { if (!sourceIds[1 - source].has(id)) results.delete(id); }); sourceIds[source].clear();
    snapshot.docs.forEach(entry => { const data = entry.data(); sourceIds[source].add(entry.id); results.set(entry.id, { id: entry.id, title: String(data.title || data.status || "IT Connect update"), message: String(data.message || data.body || data.description || ""), type: String(data.type || "update"), createdAt: millis(data.createdAt || data.timestamp || data.sentAt), read: (data.isRead ?? data.read) === true, important: data.isImportant === true, senderName: String(data.senderName || ""), actionUrl: String(data.actionUrl || ""), data: data.data && typeof data.data === "object" ? data.data : {} }); }); emit();
  };
  const reference = collection(db, "notifications");
  const stops = [onSnapshot(query(reference, where("companyId", "==", uid)), snapshot => consume(0, snapshot), failure), onSnapshot(query(reference, where("targetCompanyId", "==", uid)), snapshot => consume(1, snapshot), failure)];
  return () => stops.forEach(stop => stop());
}

export async function markCompanyNotificationRead(id: string): Promise<void> {
  await updateDoc(doc(db, "notifications", id), { read: true, isRead: true });
}

export async function markAllCompanyNotificationsRead(items: CompanyNotificationRecord[]): Promise<void> {
  const unread = items.filter(item => !item.read); if (!unread.length) return; const batch = writeBatch(db); unread.forEach(item => batch.update(doc(db, "notifications", item.id), { read: true, isRead: true })); await batch.commit();
}
