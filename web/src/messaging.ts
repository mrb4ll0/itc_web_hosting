import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where, writeBatch, type Unsubscribe } from "firebase/firestore";
import { db } from "./firebase";

export interface ChatContact { uid: string; name: string; username: string; imageUrl: string; role: string; }
export interface ChatRoom { id: string; roomIds: string[]; contact: ChatContact; preview: string; updatedAt: number; unread: number; }
export interface ChatMessage { id: string; senderId: string; receiverId: string; content: string; timestamp: number; isRead: boolean; isDelivered: boolean; }

const millis = (value: unknown) => value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function" ? value.toMillis() : value && typeof value === "object" && "seconds" in value ? Number(value.seconds) * 1000 : new Date(String(value || "")).getTime() || 0;
export const directRoomId = (a: string, b: string) => [a, b].sort().join("_");

async function contact(uid: string): Promise<ChatContact> {
  const adminId = uid.replace(/^admin_/, "");
  const paths: Array<[string, string]> = [[`users/students/students/${uid}`, "student"], [`users/companies/companies/${uid}`, "company"], [`users/authorities/authorities/${uid}`, "authority"], [`admins/${adminId}`, "admin"]];
  for (const [path, role] of paths) { try { const value = await getDoc(doc(db, path)); if (value.exists()) { const data = value.data(); const name = String(data.fullName || data.name || data.displayName || data.companyName || (role === "admin" ? "IT Connect" : "IT Connect member")); const resolvedImage = String(data.imageUrl || data.logoURL || data.avatarUrl || data.profileImage || data.photoURL || ""); return { uid, name, username: String(data.username || ""), imageUrl: resolvedImage || (role === "admin" ? "/app/images/appstore.png" : ""), role: String(data.role || role) }; } } catch { /* Continue through role paths. */ } }
  return { uid, name: "Unknown contact", username: "", imageUrl: "", role: "member" };
}

export function watchChatRooms(uid: string, listener: (rooms: ChatRoom[]) => void, failure: (error: Error) => void): Unsubscribe {
  return onSnapshot(query(collection(db, "chat_rooms"), where("participants", "array-contains", uid)), async snapshot => {
    const rooms = await Promise.all(snapshot.docs.map(async entry => {
      const data = entry.data(); const participants = Array.isArray(data.participants) ? data.participants.map(String) : []; const otherId = participants.find(id => id !== uid) || uid;
      const latest = data.latest_message && typeof data.latest_message === "object" ? data.latest_message : {};
      const unread = String(latest.receiver_id || latest.receiverId || "") === uid && (latest.is_read ?? latest.isRead) !== true ? 1 : 0;
      const resolved = await contact(otherId); const profiles = data.participantProfiles && typeof data.participantProfiles === "object" ? data.participantProfiles as Record<string, Record<string, unknown>> : {}; const snapshotProfile = profiles[otherId] || {};
      if (resolved.name === "Unknown contact") { const latestSender = String(latest.sender_id || latest.senderId || "") === otherId; resolved.name = String(snapshotProfile.fullName || snapshotProfile.name || snapshotProfile.displayName || (latestSender ? latest.senderName || latest.sender_name : "") || "Unknown contact"); resolved.imageUrl = String(snapshotProfile.imageUrl || snapshotProfile.logoURL || snapshotProfile.avatarUrl || (latestSender ? latest.senderImage || latest.sender_image : "") || ""); resolved.role = String(snapshotProfile.role || data.participantRoles?.[otherId] || "member"); }
      return { id: entry.id, roomIds: [entry.id], contact: resolved, preview: String(latest.content || "Open conversation"), updatedAt: millis(data.lastUpdated || latest.timestamp), unread } satisfies ChatRoom;
    }));
    const consolidated = new Map<string, ChatRoom>();
    rooms.forEach(room => { const key = `${room.contact.role}:${room.contact.uid}`; const existing = consolidated.get(key); if (!existing) consolidated.set(key, room); else { existing.roomIds.push(...room.roomIds); existing.unread += room.unread; if (room.updatedAt > existing.updatedAt) { existing.id = room.id; existing.preview = room.preview; existing.updatedAt = room.updatedAt; } } });
    const mergedRooms = [...consolidated.values()]; mergedRooms.forEach(room => { room.roomIds.sort(); room.id = room.roomIds[0]; });
    listener(mergedRooms.sort((a, b) => b.updatedAt - a.updatedAt));
  }, error => failure(error));
}

export function watchMessages(roomIds: string | string[], uid: string, listener: (messages: ChatMessage[]) => void, failure: (error: Error) => void): Unsubscribe {
  const ids = Array.isArray(roomIds) ? [...new Set(roomIds)] : [roomIds]; const byRoom = new Map<string, ChatMessage[]>();
  const emit = () => listener([...byRoom.values()].flat().sort((a, b) => a.timestamp - b.timestamp));
  const stops = ids.map(roomId => onSnapshot(query(collection(db, "chat_rooms", roomId, "messages"), orderBy("timestamp", "asc")), async snapshot => {
    byRoom.set(roomId, snapshot.docs.map(entry => { const data = entry.data(); return { id: `${roomId}/${entry.id}`, senderId: String(data.sender_id || data.senderId || ""), receiverId: String(data.receiver_id || data.receiverId || ""), content: String(data.content || ""), timestamp: millis(data.timestamp), isRead: (data.is_read ?? data.isRead) === true, isDelivered: (data.is_delivered ?? data.isDelivered) === true } satisfies ChatMessage; }).filter(message => message.content)); emit();
    const unread = snapshot.docs.filter(entry => { const data = entry.data(); return String(data.receiver_id || data.receiverId || "") === uid && (data.is_read ?? data.isRead) !== true; });
    if (unread.length) { const batch = writeBatch(db); unread.forEach(entry => batch.update(entry.ref, { is_read: true, is_delivered: true, read_at: serverTimestamp(), delivered_at: serverTimestamp() })); await batch.commit(); await updateDoc(doc(db, "chat_rooms", roomId), { "latest_message.is_read": true, "latest_message.is_delivered": true, "latest_message.read_at": serverTimestamp(), lastUpdated: serverTimestamp() }).catch(() => undefined); }
  }, error => failure(error)));
  return () => stops.forEach(stop => stop());
}

export async function sendTextMessage(senderId: string, receiverId: string, content: string, existingRoomId?: string): Promise<void> {
  const roomId = existingRoomId || directRoomId(senderId, receiverId); const room = doc(db, "chat_rooms", roomId);
  await setDoc(room, { participants: [senderId, receiverId], createdAt: serverTimestamp(), lastUpdated: serverTimestamp() }, { merge: true });
  const message = { sender_id: senderId, receiver_id: receiverId, content: content.trim(), timestamp: serverTimestamp(), is_read: false, is_delivered: false, is_forwarded: false, reactions: {}, deletedFor: [] };
  await addDoc(collection(room, "messages"), message);
  await setDoc(room, { participants: [senderId, receiverId], latest_message: message, lastUpdated: serverTimestamp() }, { merge: true });
}

export async function setPresence(uid: string, online: boolean): Promise<void> {
  await setDoc(doc(db, "user_presence", uid), { online, lastSeen: serverTimestamp() }, { merge: true });
}
