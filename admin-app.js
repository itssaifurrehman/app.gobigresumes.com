import { auth, db } from "./js/config/config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

import {
  renderJobRow,
  handleEmptyState,
  updateRowNumbers,
  updateAnalytics,
  renderMonthlyApplications,
} from "./js/features/utils.js";

import { setupAuthHandlers } from "./js/auth/auth.js";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const userDoc = await getDoc(doc(db, "users", user.uid));
  if (!userDoc.exists() || userDoc.data().role !== "gbrsuperadmin") {
    alert("Access denied. Not an admin.");
    window.location.href = "index.html";
    return;
  }

  // Set Admin Welcome Text
  const welcomeEl = document.getElementById("welcome-message");
  if (welcomeEl) welcomeEl.textContent = `Admin Dashboard`;

  // Load and Select Admin User by Default
  await populateUserDropdown(user.uid);
});

async function populateUserDropdown(adminUid) {
  const snapshot = await getDocs(collection(db, "users"));
  const dropdown = document.getElementById("user-select");

  if (!dropdown) return;

  dropdown.innerHTML = ""; // Clear options

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const name = data.name
      ? `${data.name} (${data.email})`
      : data.email;

    const option = document.createElement("option");
    option.value = docSnap.id;
    option.textContent = name;

    if (docSnap.id === adminUid) {
      option.selected = true;
    }

    dropdown.appendChild(option);
  });

  // Load jobs for default (admin) user
  if (adminUid) {
    await loadJobsForUser(adminUid);
  }

  // Enable switching to other users
  dropdown.addEventListener("change", () => {
    const selectedId = dropdown.value;
    if (selectedId) {
      loadJobsForUser(selectedId);
    }
  });
}

async function loadJobsForUser(userId) {
  const jobs = await getJobsByUser(userId);
  const tableBody = document.getElementById("job-table-body");

  if (!tableBody) return;

  tableBody.innerHTML = "";

  jobs.forEach((job, index) => {
    const row = renderJobRow(job, false, userId, index + 1);
    tableBody.appendChild(row);
  });

  updateAnalytics(jobs);
  renderMonthlyApplications(jobs);
  handleEmptyState();
  updateRowNumbers();
}

async function getJobsByUser(userId) {
  const jobSnapshot = await getDocs(
    query(collection(db, "jobs"), where("userId", "==", userId))
  );
  return jobSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// Initialize logout and auth handlers
setupAuthHandlers();
