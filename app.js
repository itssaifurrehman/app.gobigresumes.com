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

let jobs = null;

// ✅ Login always works — checks for login button, not URL
if (document.getElementById("login-btn")) {
  setupAuthHandlers();
}

// ✅ Dashboard logic
if (document.getElementById("job-table-body")) {
  onUserLoggedIn(async (user, role) => {
    if (role === "gbrsuperadmin") {
      window.location.href = "admin-dashboard.html";
      return;
    }

    document.getElementById("welcome-message").textContent = `Welcome, ${user.displayName}`;

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

  setupAuthHandlers(); // for logout button
}

// ✅ Export CSV
const exportBtn = document.getElementById("export-csv");
if (exportBtn) {
  exportBtn.addEventListener("click", exportJobsToCSV);
}
