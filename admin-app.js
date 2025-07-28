// Admin App Refactor - Modularized, Documented, Performance Optimized & Safe

import { auth, db } from "./js/config/config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  limit,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import {
  renderJobRow,
  handleEmptyState,
  updateRowNumbers,
  updateAnalytics,
  renderMonthlyApplications,
} from "./js/features/utils.js";
import { setupAuthHandlers } from "./js/auth/auth.js";

// Cached DOM elements with safety checks
const dropdown = document.getElementById("user-select") || null;
const tableBody = document.getElementById("job-table-body") || null;
const activityDiv = document.getElementById("user-activity") || null;
const welcomeEl = document.getElementById("welcome-message") || null;

// ========== AUTH CHECK & INITIAL LOAD ==========
function initAuth() {
  onAuthStateChanged(auth, async (user) => {
    try {
      if (!user) {
        redirectToLogin();
        return;
      }

      const isAdmin = await checkAdminAccess(user.uid);
      if (!isAdmin) {
        alert("Access denied. Not an admin.");
        redirectToLogin();
        return;
      }

      if (welcomeEl) welcomeEl.textContent = "Admin Dashboard";
      await populateUserDropdown(user.uid);
    } catch (error) {
      console.error("Error during authentication initialization:", error);
      redirectToLogin();
    }
  });
}

function redirectToLogin() {
  window.location.href = "index.html";
}

async function checkAdminAccess(uid) {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    return userDoc.exists() && userDoc.data().role === "gbrsuperadmin";
  } catch (error) {
    console.error("Error checking admin access:", error);
    return false;
  }
}

// ========== POPULATE USER DROPDOWN ==========
async function populateUserDropdown(adminUid) {
  if (!dropdown) return;

  try {
    const snapshot = await getDocs(collection(db, "users"));

    const fragment = document.createDocumentFragment();
    snapshot.forEach((docSnap) => {
      const option = createUserOption(docSnap, adminUid);
      fragment.appendChild(option);
    });

    dropdown.innerHTML = "";
    dropdown.appendChild(fragment);

    if (adminUid) {
      await loadJobsForUser(adminUid);
      await showUserActivity(adminUid);
    }

    dropdown.removeEventListener("change", handleUserChange);
    dropdown.addEventListener("change", handleUserChange);
  } catch (error) {
    console.error("Error populating user dropdown:", error);
  }
}

function createUserOption(docSnap, adminUid) {
  const data = docSnap.data();
  const name = data.name ? `${data.name} (${data.email})` : data.email;

  const option = document.createElement("option");
  option.value = docSnap.id;
  option.textContent = name;
  if (docSnap.id === adminUid) option.selected = true;

  return option;
}

function handleUserChange() {
  const selectedId = dropdown?.value;
  if (selectedId) {
    loadJobsForUser(selectedId);
    showUserActivity(selectedId);
  }
}

// ========== LOAD JOBS ==========
async function loadJobsForUser(userId) {
  if (!tableBody) return;

  try {
    const jobs = await getJobsByUser(userId);

    const fragment = document.createDocumentFragment();
    jobs.forEach((job, index) => {
      const row = renderJobRow(job, false, userId, index + 1);
      fragment.appendChild(row);
    });

    tableBody.innerHTML = "";
    tableBody.appendChild(fragment);

    updateAnalytics(jobs);
    renderMonthlyApplications(jobs);
    handleEmptyState();
    updateRowNumbers();
  } catch (error) {
    console.error("Error loading jobs for user:", error);
  }
}

// ========== GET JOBS QUERY ==========
async function getJobsByUser(userId) {
  try {
    const jobSnapshot = await getDocs(
      query(collection(db, "jobs"), where("userId", "==", userId), limit(500))
    );
    return jobSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return [];
  }
}

// ========== SHOW USER ACTIVITY ==========
async function showUserActivity(userId) {
  if (!activityDiv) return;

  try {
    const userDocSnap = await getDoc(doc(db, "users", userId));
    if (!userDocSnap.exists()) return;

    const data = userDocSnap.data();
    const lastLogin = formatDate(data.lastLogin);
    const lastActivity = formatDate(data.lastActivity);

    activityDiv.innerHTML = `
      <div class="text-sm text-gray-700">
        <p><strong>🕒 Last Login:</strong> ${lastLogin}</p>
        <p><strong>📌 Last Activity:</strong> ${lastActivity}</p>
      </div>
    `;
  } catch (error) {
    console.error("Error showing user activity:", error);
  }
}

function formatDate(timestamp) {
  return timestamp ? new Date(timestamp).toLocaleString() : "N/A";
}

// ========== INIT ==========
setupAuthHandlers();
initAuth();
