import { auth, db } from "./js/config/config.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import {
  renderJobRow,
  handleEmptyState,
  updateRowNumbers,
  updateAnalytics,
  renderMonthlyApplications,
} from "./js/features/utils.js";
import { setupAuthHandlers } from "./js/auth/auth.js";


onAuthStateChanged(auth, async user => {
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

  document.getElementById("welcome-message").textContent = `Admin Dashboard`;

  await populateUserDropdown();
});

async function populateUserDropdown() {
  const snapshot = await getDocs(collection(db, "users"));
  const dropdown = document.getElementById("user-select");
  dropdown.innerHTML = `<option value="">Select a user</option>`;

  snapshot.forEach(doc => {
    const data = doc.data();
const name = data.name ? `${data.name} (${data.email})` : data.email;
    const option = document.createElement("option");
    option.value = doc.id;
    option.textContent = name;
    dropdown.appendChild(option);
  });

  dropdown.addEventListener("change", () => {
    if (dropdown.value) {
      loadJobsForUser(dropdown.value);
    }
  });
}

async function loadJobsForUser(userId) {
  const jobs = await getJobsByUser(userId);
  const tableBody = document.getElementById("job-table-body");
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

  return jobSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

setupAuthHandlers();