import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-analytics.js";
import {
  getAuth,
  GoogleAuthProvider,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCTYfjQ0bebPRqNu5Z3AL-OvZQQdJZmiyo",
  authDomain: "job-tracker-db9d8.firebaseapp.com",
  projectId: "job-tracker-db9d8",
  storageBucket: "job-tracker-db9d8.firebasestorage.app",
  messagingSenderId: "1085222047438",
  appId: "1:1085222047438:web:d23f7f96f60f65617e0a9f",
  measurementId: "G-G9WNEW2P2N",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

const analytics = getAnalytics(app);

export { auth, provider, db, analytics };
