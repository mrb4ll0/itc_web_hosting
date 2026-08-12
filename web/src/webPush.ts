import { arrayUnion, doc, setDoc } from "firebase/firestore";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { db, firebaseApp } from "./firebase";
import type { AccountProfile } from "./types";

const vapidKey = "BC4W77ZQEwWH43DCbHiqZMu81velppSZCvYj2orCAL3RB1hz7WPX3rFpKy4Qwuuz4bnxf1_WY3DyRIV3f2bqbkA";
let foregroundListenerReady = false;
const profilePath = (profile: AccountProfile) => profile.role === "student" ? ["users", "students", "students", profile.id] : profile.role === "company" ? ["users", "companies", "companies", profile.id] : ["users", "authorities", "authorities", profile.id];

export async function enableWebPush(profile: AccountProfile): Promise<"enabled" | "denied" | "unsupported"> {
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !await isSupported()) return "unsupported";
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return "denied";
  const registration = await navigator.serviceWorker.register("/app/firebase-messaging-sw.js", { scope: "/app/" });
  const messaging = getMessaging(firebaseApp); const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
  if (!token) throw new Error("This browser did not return a notification token.");
  await setDoc(doc(db, profilePath(profile).join("/")), { fcmToken: token, fmcToken: token, notificationTokens: arrayUnion(token) }, { merge: true });
  if (!foregroundListenerReady) { foregroundListenerReady = true; onMessage(messaging, payload => { const title = payload.notification?.title || "IT Connect"; const body = payload.notification?.body || String(payload.data?.message || "You have a new update."); if (Notification.permission === "granted") new Notification(title, { body, icon: "/app/images/appstore.png", data: payload.data }); }); }
  return "enabled";
}

export async function canOfferWebPush(): Promise<boolean> {
  return "Notification" in window && "serviceWorker" in navigator && Notification.permission === "default" && await isSupported();
}
