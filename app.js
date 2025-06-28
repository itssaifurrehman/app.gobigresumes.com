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

const path = window.location.pathname;
let jobs = null;

if (path.endsWith("index.html")) {
  setupAuthHandlers();
}

if (path.endsWith("dashboard.html")) {
  onUserLoggedIn(async (user, role) => {
    if (role === "gbrsuperadmin") {
      window.location.href = "admin-dashboard.html";
      return;
    }

    document.getElementById(
      "welcome-message"
    ).textContent = `Welcome, ${user.displayName}`;

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

    addRowBtn.addEventListener("click", () => {
      const newRow = renderJobRow({}, true, user.uid);
      tableBody.appendChild(newRow);
      const firstInput = newRow.querySelector("input, select");
      if (firstInput) firstInput.focus();
      updateRowNumbers();
      handleEmptyState();
      renderMonthlyApplications(jobs);
      updateAnalytics(jobs);
    });
  });

  setupAuthHandlers();
}

const exportBtn = document.getElementById("export-csv");
if (exportBtn) {
  exportBtn.addEventListener("click", () => {
    exportJobsToCSV();
  });
}
