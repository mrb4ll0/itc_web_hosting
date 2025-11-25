// In your firebaseInit.js file
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
  Timestamp
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-storage.js";

const firebaseConfig = {
      apiKey: "AIzaSyBW2DIp-3tlsOZIHtBhKKdxDRtwI6zLvvo",
      authDomain: "it-connect-77048.firebaseapp.com",
      databaseURL: "https://it-connect-77048-default-rtdb.firebaseio.com",
      projectId: "it-connect-77048",
      storageBucket: "it-connect-77048.firebasestorage.app",
      messagingSenderId: "469455600641",
      appId: "1:469455600641:web:bcd8b67ebde5b475b79400",
      measurementId: "G-DK5EYRLFNS",
    };

// Initialize only if no app exists
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

// Export all auth functions
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
  arrayRemove
};
