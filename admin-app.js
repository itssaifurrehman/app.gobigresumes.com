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

  const welcomeEl = document.getElementById("welcome-message");
  if (welcomeEl) welcomeEl.textContent = `Admin Dashboard`;

  await populateUserDropdown(user.uid);
});

async function populateUserDropdown(adminUid) {
  const snapshot = await getDocs(collection(db, "users"));
  const dropdown = document.getElementById("user-select");

  if (!dropdown) return;

  dropdown.innerHTML = "";

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const name = data.name ? `${data.name} (${data.email})` : data.email;

    const option = document.createElement("option");
    option.value = docSnap.id;
    option.textContent = name;

    if (docSnap.id === adminUid) {
      option.selected = true;
    }

    dropdown.appendChild(option);
  });

  if (adminUid) {
    await loadJobsForUser(adminUid);
    await showUserActivity(adminUid);
  }

  dropdown.addEventListener("change", () => {
    const selectedId = dropdown.value;
    if (selectedId) {
      loadJobsForUser(selectedId);
      showUserActivity(selectedId);
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

setupAuthHandlers();

async function showUserActivity(userId) {
  const userDocSnap = await getDoc(doc(db, "users", userId));
  if (userDocSnap.exists()) {
    const data = userDocSnap.data();
    const activityDiv = document.getElementById("user-activity");

    const lastLogin = data.lastLogin
      ? new Date(data.lastLogin).toLocaleString()
      : "N/A";
    const lastActivity = data.lastActivity
      ? new Date(data.lastActivity).toLocaleString()
      : "N/A";

    activityDiv.innerHTML = `
      <div class="text-sm text-gray-700">
        <p><strong>🕒 Last Login:</strong> ${lastLogin}</p>
        <p><strong>📌 Last Activity:</strong> ${lastActivity}</p>
      </div>
    `;
  }
}
