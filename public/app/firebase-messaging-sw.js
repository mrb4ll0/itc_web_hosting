importScripts("https://www.gstatic.com/firebasejs/12.4.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.4.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBO_RrqRNm-Oq72X4Sz24MonqzLokMxKK0",
  authDomain: "itconnectweb-eea87.firebaseapp.com",
  projectId: "itconnectweb-eea87",
  storageBucket: "itconnectweb-eea87.firebasestorage.app",
  messagingSenderId: "635582656637",
  appId: "1:635582656637:web:7d7ca55fbd1f35fa828114"
});

firebase.messaging().onBackgroundMessage(payload => {
  const title = payload.notification?.title || "IT Connect";
  const options = { body: payload.notification?.body || payload.data?.message || "You have a new update.", icon: "/app/images/appstore.png", badge: "/app/images/appstore.png", data: payload.data || {} };
  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(windows => { const open = windows.find(client => client.url.includes("/app/")); return open ? open.focus() : clients.openWindow("/app/#notifications"); }));
});
