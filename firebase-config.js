/* ==========================================
   NDI'S NAIL BAR - FIREBASE INITIALIZATION
   ========================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCD4QhHszqIQSdKyNAbtcA2NUue9cd0ExI",
  authDomain: "nail-tech-83035.firebaseapp.com",
  projectId: "nail-tech-83035",
  storageBucket: "nail-tech-83035.firebasestorage.app",
  messagingSenderId: "623780277898",
  appId: "1:623780277898:web:5000470cf9d23bc38ac773",
  measurementId: "G-RD1VTFQ93Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

let analytics = null;
try {
  analytics = getAnalytics(app);
} catch (e) {
  console.warn("Analytics initialization failed: likely blocked by browser privacy features.");
}

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, analytics, auth, db, storage };
