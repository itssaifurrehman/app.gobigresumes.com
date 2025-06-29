import { getUserJobs } from "./js/features/job-crud.js";
import {
  renderJobRow,
  handleEmptyState,
  updateRowNumbers,
  exportJobsToCSV,
  updateAnalytics,
  renderMonthlyApplications,
} from "./js/features/utils.js";

import { onUserLoggedIn, setupAuthHandlers } from "./js/auth/auth.js";

const path = window.location.pathname.replace(/\/$/, ""); // normalize path
let jobs = null;

// ✅ Always initialize login handler if login button exists (safer than checking URL)
if (document.getElementById("login-btn")) {
  setupAuthHandlers();
}

// ✅ Dashboard logic
if (document.getElementById("job-table-body")) {
  onUserLoggedIn(async (user, role) => {
    // Redirect to admin dashboard if role is gbrsuperadmin
    if (role === "gbrsuperadmin") {
      window.location.href = "admin-dashboard.html";
      return;
    }

    // User Dashboard
    const welcome = document.getElementById("welcome-message");
    if (welcome) {
      welcome.textContent = `Welcome, ${user.displayName}`;
    }

    const tableBody = document.getElementById("job-table-body");
    const addRowBtn = document.getElementById("add-row");

    jobs = await getUserJobs(user.uid);
    tableBody.innerHTML = "";

    if (jobs.length > 0) {
      jobs.forEach((job, index) => {
        const row = renderJobRow(job, false, user.uid, index + 1);
        tableBody.appendChild(row);
      });

      updateAnalytics(jobs);
      renderMonthlyApplications(jobs);
    }

    handleEmptyState();

    if (addRowBtn) {
      addRowBtn.addEventListener("click", () => {
        const newRow = renderJobRow({}, true, user.uid);
        tableBody.appendChild(newRow);

        const firstInput = newRow.querySelector("input, select");
        if (firstInput) firstInput.focus();

        updateRowNumbers();
        handleEmptyState();
        updateAnalytics(jobs);
        renderMonthlyApplications(jobs);
      });
    }
  });

  // Set up logout button if present
  setupAuthHandlers();
}

// ✅ CSV Export (safe check)
const exportBtn = document.getElementById("export-csv");
if (exportBtn) {
  exportBtn.addEventListener("click", exportJobsToCSV);
}
