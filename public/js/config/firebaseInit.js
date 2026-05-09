import {
  initializeApp,
  getApp,
  getApps,
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInAnonymously,   // added so the landing page can sign visitors in silently
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  getDoc,
  where,
  writeBatch,
  serverTimestamp,
  deleteField,
  deleteDoc,
  collectionGroup,
  addDoc,
  arrayUnion,
  arrayRemove,
  limit,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata,
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-storage.js";
import {
  getMessaging,
  getToken,
  onMessage,
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging.js";


const firebaseConfig = {
  apiKey: "AIzaSyBO_RrqRNm-Oq72X4Sz24MonqzLokMxKK0",
  authDomain: "itconnectweb-eea87.firebaseapp.com",
  databaseURL: "https://itconnectweb-eea87-default-rtdb.firebaseio.com",
  projectId: "itconnectweb-eea87",
  storageBucket: "itconnectweb-eea87.firebasestorage.app",
  messagingSenderId: "635582656637",
  appId: "1:635582656637:web:7d7ca55fbd1f35fa828114",
  measurementId: "G-72RCYC8P7S"
};


// initialise once — if another module already called initializeApp,
// just reuse that instance rather than creating a second one
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const firebaseApp = app;
const messaging = getMessaging(app);

export {
  collection,
  orderBy,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  where,
  writeBatch,
  onSnapshot,
  serverTimestamp,
  deleteField,
  deleteDoc,
  collectionGroup,
  getAuth,
  createUserWithEmailAndPassword,
  signInAnonymously,   // exported so index.js can import it from here
  addDoc,
  arrayUnion,
  getStorage,
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  firebaseConfig,
  initializeApp,
  limit,
  getMetadata,
  Timestamp,
  arrayRemove,
  getToken,
  onMessage,
  messaging
};
