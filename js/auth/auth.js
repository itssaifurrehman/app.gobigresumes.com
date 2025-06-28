import { auth, provider } from "../config/config.js";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

export function setupAuthHandlers() {
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");

  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      signInWithPopup(auth, provider)
        .then(() => (window.location.href = "dashboard.html"))
        .catch(error => console.error("Login Error:", error));
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      signOut(auth).then(() => (window.location.href = "index.html"));
    });
  }
}

export function onUserLoggedIn(callback) {
  onAuthStateChanged(auth, user => {
    if (user) {
      callback(user);
    } else {
      window.location.href = "index.html";
    }
  });
}
