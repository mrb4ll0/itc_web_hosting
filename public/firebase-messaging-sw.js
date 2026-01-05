importScripts(
  "https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js"
);

// Initialize Firebase
firebase.initializeApp({
  apiKey: "AIzaSyBO_RrqRNm-Oq72X4Sz24MonqzLokMxKK0",
  authDomain: "itconnectweb-eea87.firebaseapp.com",
  databaseURL: "https://itconnectweb-eea87-default-rtdb.firebaseio.com",
  projectId: "itconnectweb-eea87",
  storageBucket: "itconnectweb-eea87.firebasestorage.app",
  messagingSenderId: "635582656637",
  appId: "1:635582656637:web:7d7ca55fbd1f35fa828114",
  measurementId: "G-72RCYC8P7S",
});

// Retrieve Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function (payload) {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/icons/icon-192.png",
  });
});
