import { addJob, updateJob, deleteJob } from "../features/job-crud.js";

let debounceTimer;

export function renderJobRow(
  job = {},
  isNew = false,
  userId = null,
  rowNumber = 1
) {
  const row = document.createElement("tr");
  row.classList.add(
    "transition-colors",
    "duration-200",
    "hover:bg-indigo-100",
    "even:bg-gray-50"
  );

  let cellRefs = {};
  let lastSavedData = {};

  if (job.id) {
    row.dataset.id = job.id;
  }
  const numberTd = document.createElement("td");
  numberTd.className =
    "px-3 py-2 text-sm font-semibold text-gray-700 row-number";
  numberTd.textContent = rowNumber || "";
  row.appendChild(numberTd);

  const columnWidths = {
    companyName: "w-[160px]",
    title: "w-[140px]",
    numberOfApplicants: "w-[60px]",
    jobLink: "w-[180px]",
    hiringManager: "w-[160px]",
    status: "w-[100px]",
    applicationDate: "w-[100px]",
    responseDate: "w-[100px]",
    whenToFollowUp: "w-[100px]",
    followUpStatus: "w-[150px]",
    referral: "w-[90px]",
    action: "w-[80px]",
  };

  const fields = [
    "companyName",
    "title",
    "numberOfApplicants",
    "jobLink",
    "hiringManager",
    "status",
    "applicationDate",
    "responseDate",
    "followUpDate",
    "followUpStatus",
    "referral",
  ];

  const statusOptions = [
    "Pending",
    "Applied",
    "Interviewing",
    "Offered",
    "Rejected",
    "Ghosted",
  ];
  const followUpOptions = [
    "Pending",
    "1st Follow Up Sent",
    "2nd Follow Up Sent",
    "Ghosted",
  ];
  const referralOptions = ["Searching", "Referred", "No"];

  async function autoSaveIfChanged() {
    const data = {};
    let hasChanges = false;

    for (const field in cellRefs) {
      const el = cellRefs[field];
      if (!el) continue;
      const newValue = el.value?.trim() || "";
      data[field] = newValue;

      if (lastSavedData[field] !== newValue) {
        hasChanges = true;
      }
    }

    if (!hasChanges) {
      console.log("⏸ No changes detected.");
      return;
    }

    if (row.dataset.id) {
      try {
        console.log("🔄 Updating existing job:", row.dataset.id, data);
        await updateJob(row.dataset.id, data);
        lastSavedData = { ...data };
        updateAnalytics(getAllJobsFromDOM());
        renderMonthlyApplications(getAllJobsFromDOM());
        showNotification("Data updated successfully", "success");
        highlightDuplicateJobs();
        console.log("Auto-saved (existing row).");
      } catch (err) {
        console.error("Auto-save (update) failed:", err);
        showNotification("Failed to update data", "error");
      }
    } else if (userId) {
      try {
        console.log("🆕 Creating new job with data:", data);
        const docRef = await addJob(data, userId);
        row.dataset.id = docRef.id;
        lastSavedData = { ...data };
        updateRowNumbers();
        handleEmptyState();
        updateAnalytics(getAllJobsFromDOM());
        renderMonthlyApplications(getAllJobsFromDOM());
        showNotification("New job added", "info");
        highlightDuplicateJobs();

        console.log("Auto-saved (new row).");
      } catch (err) {
        console.error("Auto-save (new row) failed:", err);
        showNotification("Failed to add new job", "error");
      }
    } else {
      console.warn("⚠️ No userId or row.dataset.id — unable to save.");
    }
  }

  fields.forEach((field) => {
    const td = document.createElement("td");
    td.className = "px-3 py-2 text-sm align-top whitespace-normal break-words";
    if (isNew || job.id) {
      if (["status", "followUpStatus", "referral"].includes(field)) {
        const select = document.createElement("select");
        select.className =
          "w-full text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400";

        select.style.width = columnWidths[field] || "auto";
        select.className += " " + (columnWidths[field] || "");
        select.dataset.field = field;
        select.value = job[field] || "";
        if (columnWidths[field]) {
          select.classList.add(columnWidths[field]);
        } else {
          select.classList.add("w-full");
        }

        const options =
          field === "status"
            ? statusOptions
            : field === "followUpStatus"
            ? followUpOptions
            : referralOptions;

        options.forEach((opt) => {
          const option = document.createElement("option");
          option.value = opt;
          option.textContent = opt;
          if (job[field] === opt) option.selected = true;
          select.appendChild(option);
        });

        cellRefs[field] = select;
        td.appendChild(select);
        select.addEventListener("input", () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(autoSaveIfChanged, 3000);
        });

        select.addEventListener("change", () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(autoSaveIfChanged, 3000);
        });
        select.addEventListener("focus", () => {
          row.classList.add("active-row");
        });
        select.addEventListener("blur", () => {
          setTimeout(() => {
            const stillFocused = row.querySelector(":focus");
            if (!stillFocused) {
              row.classList.remove("active-row");
            }
          }, 50);
        });

        if (field === "status") {
          select.addEventListener("change", () => {
            const today = new Date();
            if (select.value === "Applied") {
              if (cellRefs.applicationDate) {
                cellRefs.applicationDate.value = today
                  .toISOString()
                  .split("T")[0];
              }
              if (cellRefs.followUpDate) {
                const fup = new Date();
                fup.setDate(today.getDate() + 3);
                cellRefs.followUpDate.value = fup.toISOString().split("T")[0];
                highlightFollowUpDateInput(cellRefs.followUpDate);
              }
            }
          });
        }

        if (field === "followUpStatus") {
          select.addEventListener("change", () => {
            const today = new Date();
            if (select.value === "1st Follow Up Sent") {
              const fup = new Date();
              fup.setDate(today.getDate() + 5);
              if (cellRefs.followUpDate) {
                cellRefs.followUpDate.value = fup.toISOString().split("T")[0];
                highlightFollowUpDateInput(cellRefs.followUpDate);
              }
            } else if (select.value === "2nd Follow Up Sent") {
              if (cellRefs.followUpDate) {
                cellRefs.followUpDate.classList.remove(
                  "border-red-500",
                  "text-red-600",
                  "font-bold"
                );
              }
            }
          });
        }
      } else if (
        ["applicationDate", "followUpDate", "responseDate"].includes(field)
      ) {
        const input = document.createElement("input");
        input.type = "date";
        input.value =
          job[field] && job[field] !== "—"
            ? new Date(job[field]).toISOString().split("T")[0]
            : "";
        input.dataset.field = field;

        input.className =
          "w-full px-1 py-1 bg-transparent text-sm focus:outline-none text-gray-800";

        if (field === "followUpDate" && input.value) {
          highlightFollowUpDateInput(input);
        }

        cellRefs[field] = input;
        td.appendChild(input);

        input.addEventListener("input", () => {
          if (field === "followUpDate") {
            highlightFollowUpDateInput(input);
          }
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(autoSaveIfChanged, 3000);
        });

        input.addEventListener("change", () => {
          if (field === "followUpDate") {
            highlightFollowUpDateInput(input);
          }
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(autoSaveIfChanged, 3000);
        });

        input.addEventListener("focus", () => {
          row.classList.add("active-row");
        });

        input.addEventListener("blur", () => {
          setTimeout(() => {
            const stillFocused = row.querySelector(":focus");
            if (!stillFocused) {
              row.classList.remove("active-row");
            }
          }, 50);
        });
      } else if (field === "jobLink") {
        const wrapper = document.createElement("div");
        wrapper.className = "flex items-center gap-2";

        const input = document.createElement("input");
        input.type = "text";
        input.value = job[field] || "";
        input.className =
          "w-full px-2 py-1 bg-white border border-gray-300 rounded text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500";
        input.dataset.field = field;
        cellRefs[field] = input;
        if (columnWidths[field]) {
          input.classList.add(columnWidths[field]);
        } else {
          input.classList.add("w-full");
        }

        const link = document.createElement("a");
        link.href = input.value.trim();
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.className = "text-indigo-500 text-sm hover:underline";
        link.textContent = "↗";
        link.style.display = input.value.trim().startsWith("http")
          ? "inline"
          : "none";

        input.addEventListener("input", () => {
          const val = input.value.trim();
          link.href = val;
          link.style.display = val.startsWith("http") ? "inline" : "none";
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(autoSaveIfChanged, 3000);
        });

        input.addEventListener("change", () => {
          const val = input.value.trim();
          link.href = val;
          link.style.display = val.startsWith("http") ? "inline" : "none";
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(autoSaveIfChanged, 3000);
        });

        input.addEventListener("focus", () => {
          row.classList.add("active-row");
        });
        input.addEventListener("blur", () => {
          setTimeout(() => {
            const stillFocused = row.querySelector(":focus");
            if (!stillFocused) {
              row.classList.remove("active-row");
            }
          }, 50);
        });

        wrapper.appendChild(input);
        wrapper.appendChild(link);
        td.appendChild(wrapper);
      } else if (field === "numberOfApplicants") {
        const input = document.createElement("input");
        input.type = "number";
        input.min = "0";
        input.value = job[field] || "";
        input.className =
          "w-full px-2 py-1 bg-white border border-gray-300 rounded text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500";
        input.dataset.field = field;

        if (columnWidths[field]) {
          input.classList.add(columnWidths[field]);
        } else {
          input.classList.add("w-full");
        }

        highlightApplicantsInput(input);

        input.addEventListener("input", () => {
          highlightApplicantsInput(input);
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(autoSaveIfChanged, 3000);
        });

        input.addEventListener("change", () => {
          highlightApplicantsInput(input);
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(autoSaveIfChanged, 3000);
        });

        cellRefs[field] = input;
        td.appendChild(input);
      } else {
        const input = document.createElement("input");
        input.type = "text";
        input.value = job[field] || "";
        input.className =
          "w-full px-2 py-1 bg-white border border-gray-300 rounded text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500";
        cellRefs[field] = input;

        if (columnWidths[field]) {
          input.classList.add(columnWidths[field]);
        } else {
          input.classList.add("w-full");
        }

        td.appendChild(input);

        if (["companyName", "title"].includes(field)) {
          input.addEventListener("input", () => {
            highlightDuplicateJobs();
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(autoSaveIfChanged, 3000);
          });

          input.addEventListener("change", () => {
            highlightDuplicateJobs();
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(autoSaveIfChanged, 3000);
          });
        } else {
          input.addEventListener("input", () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(autoSaveIfChanged, 3000);
          });

          input.addEventListener("change", () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(autoSaveIfChanged, 3000);
          });
        }
      }
    }

    row.appendChild(td);
    function highlightFollowUpDateInput(input) {
      const todayStr = new Date().toISOString().split("T")[0];
      if (input.value && input.value <= todayStr) {
        input.classList.add("border-red-500", "text-red-600", "font-bold");
      } else {
        input.classList.remove("border-red-500", "text-red-600", "font-bold");
      }
    }
    function highlightApplicantsInput(input) {
      const value = parseInt(input.value?.trim?.(), 10);

      input.classList.remove(
        "border-red-500",
        "border-green-500",
        "border-gray-300"
      );
      input.removeAttribute("title");

      if (!isNaN(value)) {
        if (value <= 25) {
          input.classList.add("border", "border-green-500");
          input.title = "🟢 Less competition — good opportunity";
        } else {
          input.classList.add("border", "border-red-500");
          input.title = "🟡 Too many applicants — low chance";
        }
      }
    }
  });

  const actionTd = document.createElement("td");
  actionTd.className = "px-5 py-3 text-center";

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "🗑️";
  deleteBtn.className = "text-red-600 hover:text-red-800 mx-1";

  const originalData = {};

  Object.keys(cellRefs).forEach((field) => {
    const el = cellRefs[field];
    if (el.tagName === "INPUT" || el.tagName === "SELECT") {
      originalData[field] = el.value;
      lastSavedData[field] = el.value;
    }
  });

  deleteBtn.addEventListener("click", () => {
    const modal = document.getElementById("delete-modal");
    if (!modal) return alert("❌ Delete modal not found.");

    modal.classList.remove("hidden");
    modal.classList.add("flex");
    modal.dataset.targetRowId = row.dataset.id;
    modal.dataset.targetRowIndex = [...row.parentNode.children].indexOf(row);

    if (!modal.dataset.listenerAttached) {
      const confirmDelete = document.getElementById("confirm-delete");
      const cancelDelete = document.getElementById("cancel-delete");

      confirmDelete.addEventListener("click", async () => {
        const rowId = modal.dataset.targetRowId;
        const rowIndex = modal.dataset.targetRowIndex;

        if (rowId) {
          try {
            await deleteJob(rowId);
            const table = document.getElementById("job-table-body");
            table.children[rowIndex]?.remove();
            if (row) row.remove();
            updateRowNumbers();
            handleEmptyState();
            updateAnalytics(getAllJobsFromDOM());
            renderMonthlyApplications(getAllJobsFromDOM());
          } catch (error) {
            console.error("❌ Delete error:", error);
            alert("❌ Failed to delete this job.");
          }
        }

        modal.classList.add("hidden");
        modal.classList.remove("flex");
      });

      cancelDelete.addEventListener("click", () => {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
      });

      modal.dataset.listenerAttached = "true";
    }
  });

  actionTd.appendChild(deleteBtn);
  row.appendChild(actionTd);
  highlightDuplicateJobs();

  return row;
}

export function handleEmptyState() {
  const tableBody = document.getElementById("job-table-body");

  const hasActualRows = Array.from(tableBody.children).some(
    (row) => row.id !== "empty-row"
  );

  const existingEmptyRow = document.getElementById("empty-row");

  if (!hasActualRows && !existingEmptyRow) {
    const row = document.createElement("tr");
    row.id = "empty-row";

    const td = document.createElement("td");
    td.colSpan = 10;
    td.className = "text-center py-6 text-gray-500 italic bg-white";
    td.textContent =
      "You have not added any job application. Press the + button to add a job application record.";

    row.appendChild(td);
    tableBody.appendChild(row);
  }

  if (hasActualRows && existingEmptyRow) {
    existingEmptyRow.remove();
  }
}

export function updateRowNumbers() {
  const rows = document.querySelectorAll("#job-table-body tr:not(#empty-row)");
  rows.forEach((tr, index) => {
    const numCell = tr.querySelector(".row-number");
    if (numCell) numCell.textContent = index + 1;
  });
}

export function exportJobsToCSV() {
  const rows = document.querySelectorAll("#job-table-body tr");
  if (!rows.length) return alert("⚠️ No jobs to export.");

  const headers = [
    "No.",
    "Company Name",
    "Title",
    "Job Link",
    "Hiring Manager",
    "Status",
    "Application Date",
    "Response Date",
    "Follow Up Date",
    "Follow Up Status",
    "Referral",
  ];

  const csvRows = [headers.join(",")];

  rows.forEach((tr, i) => {
    const cols = tr.querySelectorAll("td");
    const rowData = [];
    for (let j = 1; j <= 10; j++) {
      const input = cols[j]?.querySelector("input, select");
      rowData.push(`"${input?.value?.replace(/"/g, '""') || ""}"`);
    }
    csvRows.push(`${i + 1},${rowData.join(",")}`);
  });

  const csvContent = csvRows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `job_applications_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();

  URL.revokeObjectURL(url);
}

export function countFollowUpsDue(jobs) {
  const today = new Date().toISOString().split("T")[0];
  return jobs.filter(
    (job) =>
      job.followUpDate &&
      job.followUpDate !== "No Response" &&
      job.followUpDate < today
  ).length;
}

export function getRejectedGhostedStats(jobs) {
  return {
    rejected: jobs.filter((j) => j.status === "Rejected").length,
    ghosted: jobs.filter((j) => j.status === "Ghosted").length,
  };
}

export function getMonthlyApplications(jobs) {
  const monthlyCount = {};
  jobs.forEach((job) => {
    const rawDate = job.applicationDate;
    if (!rawDate || rawDate === "—") return;

    const date = new Date(rawDate);
    if (isNaN(date)) return;

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
    monthlyCount[key] = (monthlyCount[key] || 0) + 1;
  });

  return monthlyCount;
}

export function renderMonthlyApplications(jobs) {
  const data = getMonthlyApplications(jobs);
  const container = document.getElementById("monthly-applications");
  container.innerHTML = "";

  const sorted = Object.entries(data).sort((a, b) => b[0].localeCompare(a[0]));

  sorted.forEach(([month, count], index) => {
    const span = document.createElement("span");
    span.textContent = `${month}: ${count}`;
    span.className = "text-sm text-gray-700";

    container.appendChild(span);

    if (index < sorted.length - 1) {
      const separator = document.createElement("span");
      separator.textContent = "|";
      separator.className = "text-gray-400 px-1";
      container.appendChild(separator);
    }
  });
  console.log("📊 Monthly Analytics Sorted:", sorted);
  console.log("🧾 Jobs received:", jobs);
  console.log("📆 Raw Monthly Data:", data);
}

export function updateAnalytics(jobs) {
  const todayStr = new Date().toISOString().split("T")[0];

  let total = jobs.length;
  let applied = 0,
    interviewing = 0,
    offered = 0,
    rejected = 0,
    ghosted = 0,
    offers = 0,
    followUpsDue = 0;

  jobs.forEach((job) => {
    const status = job.status || "";
    const followUpDate = job.followUpDate;

    if (status === "Applied") applied++;
    if (status === "Interviewing") interviewing++;
    if (status === "Offered") {
      offered++;
      offers++;
    }
    if (status === "Rejected") rejected++;
    if (status === "Ghosted") ghosted++;

    if (followUpDate && /^\d{4}-\d{2}-\d{2}/.test(followUpDate)) {
      if (followUpDate <= todayStr) followUpsDue++;
    }
  });

  document.getElementById("total-jobs").textContent = total;
  document.getElementById("applied-count").textContent = applied;
  document.getElementById("interviewing-count").textContent = interviewing;
  document.getElementById("offered-count").textContent = offered;
  document.getElementById("followup-due").textContent = followUpsDue;
  document.getElementById("rejected-count").textContent = rejected;
  document.getElementById("ghosted-count").textContent = ghosted;
}

export function getAllJobsFromDOM() {
  const rows = document.querySelectorAll("#job-table-body tr");
  const jobs = [];

  rows.forEach((tr) => {
    const id = tr.dataset.id;
    if (!id) return;

    const job = { id };
    const inputs = tr.querySelectorAll("input, select");

    inputs.forEach((el) => {
      const key = el.dataset.field || el.name || "";
      if (key) {
        job[key] = el.value?.trim() || "";
      }
    });

    jobs.push(job);
  });

  console.log("📦 getAllJobsFromDOM():", jobs);
  return jobs;
}

function showNotification(message, type = "success") {
  const container = document.getElementById("notification-container");

  const colors = {
    success: {
      bg: "bg-[#d4f7f4] border-[#004E50]",
      text: "text-[#004E50]",
      icon: "✅",
    },
    error: {
      bg: "bg-[#ffecec] border-[#d9534f]",
      text: "text-[#a94442]",
      icon: "❌",
    },
    info: {
      bg: "bg-[#e8f0f0] border-[#337173]",
      text: "text-[#337173]",
      icon: "ℹ️",
    },
  };

  const { bg, text, icon } = colors[type] || colors.info;

  const toast = document.createElement("div");
  toast.className = `
  flex items-center gap-3 px-4 py-3 rounded-lg border shadow-xl
  ${bg} ${text}
  transform transition-all duration-300 translate-x-8 opacity-0
  font-medium text-sm backdrop-blur-md
`;

  toast.innerHTML = `
  <span class="text-lg">${icon}</span>
  <span>${message}</span>
`;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove("translate-x-8", "opacity-0");
    toast.classList.add("translate-x-0", "opacity-100");
  });

  setTimeout(() => {
    toast.classList.remove("translate-x-0", "opacity-100");
    toast.classList.add("translate-x-8", "opacity-0");
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}
function highlightDuplicateJobs() {
  console.log("🔍 Running duplicate check...");
  const rows = Array.from(document.querySelectorAll("#job-table-body tr"));

  rows.forEach((row) => {
    row.querySelectorAll("td").forEach((td) => {
      td.classList.remove("bg-purple-100", "ring-1", "ring-purple-300");
    });
  });

  for (let i = 0; i < rows.length; i++) {
    const rowA = rows[i];
    const companyA =
      rowA.querySelector('[data-field="companyName"]')?.value?.toLowerCase() ||
      "";
    const titleA =
      rowA.querySelector('[data-field="title"]')?.value?.toLowerCase() || "";

    for (let j = i + 1; j < rows.length; j++) {
      const rowB = rows[j];
      const companyB =
        rowB
          .querySelector('[data-field="companyName"]')
          ?.value?.toLowerCase() || "";
      const titleB =
        rowB.querySelector('[data-field="title"]')?.value?.toLowerCase() || "";

      const isCompanySimilar = getSimilarity(companyA, companyB) >= 0.75;
      const isTitleSimilar = getSimilarity(titleA, titleB) >= 0.75;

      if (isCompanySimilar && isTitleSimilar) {
        [rowA, rowB].forEach((row) => {
          row.querySelectorAll("td").forEach((td) => {
            td.classList.add("bg-purple-100", "ring-1", "ring-purple-300");
          });
        });
      }
    }
  }
}

function getSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  const longerLength = longer.length;

  if (longerLength === 0) return 1.0;

  return (
    (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength)
  );
}

function editDistance(s1, s2) {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();

  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}
