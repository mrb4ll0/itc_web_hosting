import { onDisconnect, onValue, ref, serverTimestamp, set, type Unsubscribe } from "firebase/database";
import { realtimeDb } from "./firebase";

export interface PresenceState {
  online: boolean;
  lastSeen: number;
}

const presenceRef = (uid: string) => ref(realtimeDb, `status/${uid}`);

export function startPresence(uid: string): () => Promise<void> {
  const status = presenceRef(uid);
  const connected = ref(realtimeDb, ".info/connected");
  let stopped = false;
  const safely = (operation: Promise<unknown>) => void operation.catch(() => undefined);

  const markOffline = () => set(status, { state: "offline", online: false, lastSeen: serverTimestamp() });
  const markOnline = async () => {
    if (stopped) return;
    await onDisconnect(status).set({ state: "offline", online: false, lastSeen: serverTimestamp() });
    await set(status, { state: "online", online: true, lastSeen: serverTimestamp() });
  };
  const syncVisibility = () => document.visibilityState === "hidden" ? safely(markOffline()) : safely(markOnline());
  const stopConnected = onValue(connected, snapshot => { if (snapshot.val() === true) syncVisibility(); });
  document.addEventListener("visibilitychange", syncVisibility);

  return async () => {
    if (stopped) return;
    stopped = true;
    stopConnected();
    document.removeEventListener("visibilitychange", syncVisibility);
    await onDisconnect(status).cancel().catch(() => undefined);
    await markOffline().catch(() => undefined);
  };
}

export function watchPresence(uid: string, listener: (presence: PresenceState) => void): Unsubscribe {
  return onValue(presenceRef(uid), snapshot => {
    const value = snapshot.val() as { state?: unknown; online?: unknown; lastSeen?: unknown } | null;
    listener({
      online: value?.online === true || value?.state === "online",
      lastSeen: typeof value?.lastSeen === "number" ? value.lastSeen : 0,
    });
  });
}
