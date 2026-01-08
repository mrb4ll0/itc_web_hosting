import {
  messaging,
  getToken,
  onMessage,
  setDoc,
  db,
  doc,
  auth,
} from "./js/config/firebaseInit.js";

async function requestWebPushPermission() {
  console.log("Requesting notification permission...");

  const permission = await Notification.requestPermission();
  console.log("after requesting notification");
  if (permission !== "granted") {
    alert("Notifications permission denied.");
    return;
  }

  const vapidKey = "BC4W77ZQEwWH43DCbHiqZMu81velppSZCvYj2orCAL3RB1hz7WPX3rFpKy4Qwuuz4bnxf1_WY3DyRIV3f2bqbkA";


  // Determine service worker path
  let swPath = "/firebase-messaging-sw.js"; // default for production
  if (
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost"
  ) {
    // Test environment
    swPath = "/public/firebase-messaging-sw.js";
  }

  // Register service worker
  const registration = await navigator.serviceWorker.register(swPath);
  console.log("Service Worker registered:", registration);

  try {
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
    console.log("Web Push Token:", token);

    // Save token to Firestore
    await setDoc(
      doc(db, "users", "students", "students", auth.currentUser.uid),
      {
        fmcToken: token,
      },
       { merge: true }
    );

    alert("Web Notifications enabled!");
  } catch (err) {
    console.error("Error getting token:", err);
  }
}

// Listen for foreground messages
onMessage(messaging, (payload) => {
  console.log("Message received in foreground:", payload);
  alert(payload.notification.title + "\n\n" + payload.notification.body);
});

async function sendWebNotification(token, title, body) {
  const url = "https://us-central1-itconnectweb-eea87.cloudfunctions.net/sendNotification";
  console.log("token is "+token);
  console.log("title is "+title);
  console.log("body is "+body);
  const payload = {
    token: token,
    title: title,
    body: body
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log("Notification Sent:", data);
  } catch (err) {
    console.error("Error sending notification:", err);
  }
}

export { requestWebPushPermission, sendWebNotification };
