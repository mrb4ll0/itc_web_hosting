import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyBO_RrqRNm-Oq72X4Sz24MonqzLokMxKK0",
  authDomain: "itconnectweb-eea87.firebaseapp.com",
  databaseURL: "https://itconnectweb-eea87-default-rtdb.firebaseio.com",
  projectId: "itconnectweb-eea87",
  storageBucket: "itconnectweb-eea87.firebasestorage.app",
  messagingSenderId: "635582656637",
  appId: "1:635582656637:web:7d7ca55fbd1f35fa828114",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
export const cloudFunctions = getFunctions(firebaseApp);

export const configureDefaultPersistence = () =>
  setPersistence(auth, browserLocalPersistence);
