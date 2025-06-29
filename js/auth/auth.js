import { auth, provider, db } from "../config/config.js";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

export function setupAuthHandlers() {
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");

  if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
      try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        let role = "user";

        if (!userDocSnap.exists()) {
          await setDoc(userDocRef, {
            email: user.email,
            name: user.displayName,
            role: role,
            createdAt: new Date().toISOString(),
          });
        } else {
          const data = userDocSnap.data();
          role = data.role || "user";
        }

        localStorage.setItem("userRole", role);
        localStorage.setItem("userId", user.uid);

        window.location.href = "dashboard.html";
      } catch (error) {
        console.error("❌ Login Error:", error);
        alert("Login failed. Please try again.");
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      signOut(auth)
        .then(() => {
          localStorage.clear();
          window.location.href = "index.html";
        })
        .catch((error) => {
          console.error("Logout Error:", error);
          alert("Logout failed. Try again.");
        });
    });
  }
}

export function onUserLoggedIn(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      let role = "user";
      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        role = data.role || "user";
      }

      localStorage.setItem("userRole", role);
      localStorage.setItem("userId", user.uid);

      callback(user, role);
    } catch (error) {
      console.error("Error fetching user role:", error);
      callback(user, "user");
    }
  });
}
