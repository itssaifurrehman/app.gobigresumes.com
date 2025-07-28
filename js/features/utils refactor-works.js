// ================================
// ✅ IMPORTS
// ================================
import { addJob, updateJob, deleteJob } from "../features/job-crud.js";

// ================================
// ✅ GLOBAL CONSTANTS
// ================================
const DEBOUNCE_DELAY = 1000;
let debounceTimer;

// Notification Colors
const notificationColors = {
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

// ================================
// ✅ RENDERING JOB ROW
// ================================
export const renderJobRow = (
  job = {},
  isNew = false,
  userId = null,
  rowNumber = 1
) => {
  const row = document.createElement("tr");
  row.classList.add(
    "transition-colors",
    "duration-200",
    "hover:bg-indigo-100",
    "even:bg-gray-50"
  );

  if (job.id) row.dataset.id = job.id;

  let cellRefs = {};
  let lastSavedData = {};

  // Row number
  const numberTd = document.createElement("td");
  numberTd.className =
    "px-3 py-2 text-sm font-semibold text-gray-700 row-number";
  numberTd.textContent = rowNumber;
  row.appendChild(numberTd);

  // Column Widths
  const columnWidths = {
    companyName: "w-[160px]",
    title: "w-[140px]",
    numberOfApplicants: "w-[60px]",
    jobLink: "w-[150px]",
    hiringManager: "w-[120px]",
    status: "w-[120px]",
    applicationDate: "w-[130px]",
    responseDate: "w-[140px]",
    whenToFollowUp: "w-[160px]",
    followUpStatus: "w-[100px]",
    referral: "w-[90px]",
    action: "w-[80px]",
  };

  // Fields
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

  // Options
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

  /**
   * Auto-save function with change detection
   */
  const autoSaveIfChanged = async () => {
    const data = {};
    let hasChanges = false;

    for (const field in cellRefs) {
      const el = cellRefs[field];
      if (!el) continue;
      const newValue = el.value.trim();
      data[field] = newValue;

      if (lastSavedData[field] !== newValue) hasChanges = true;
    }

    if (!hasChanges) return;

    try {
      if (row.dataset.id) {
        await updateJob(row.dataset.id, data);
        showNotification("Data updated successfully", "success");
      } else if (userId) {
        const docRef = await addJob(data, userId);
        row.dataset.id = docRef.id;
        updateRowNumbers();
        handleEmptyState();
        showNotification("New job added", "info");
      }
      lastSavedData = { ...data };
      updateAnalytics(getAllJobsFromDOM());
      renderMonthlyApplications(getAllJobsFromDOM());
      highlightDuplicateJobs();
    } catch (err) {
      console.error("Auto-save failed:", err);
      showNotification("Failed to save changes", "error");
    }
  };

  /**
   * Highlight Follow-Up Date Input
   */
  const highlightFollowUpDateInput = (input) => {
    const todayStr = new Date().toISOString().split("T")[0];
    if (input.value && input.value <= todayStr) {
      input.classList.add("border-red-500", "text-red-600", "font-bold");
    } else {
      input.classList.remove("border-red-500", "text-red-600", "font-bold");
    }
  };

  /**
   * Highlight Applicants Input
   */
  const highlightApplicantsInput = (input) => {
    const value = parseInt(input.value.trim(), 10);
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
  };

  // Generate Fields
  fields.forEach((field) => {
    const td = document.createElement("td");
    td.className = "px-3 py-2 text-sm align-top whitespace-normal break-words";

    const createInput = (type = "text", value = "", classes = "") => {
      const input = document.createElement("input");
      input.type = type;
      input.value = value;
      input.dataset.field = field;
      input.className = `
    px-2 py-1 bg-white border border-gray-300 rounded text-sm text-gray-800
    focus:outline-none focus:ring-2 focus:ring-indigo-500
    ${columnWidths[field] || "w-full"} ${classes}
  `;
      return input;
    };

    // Dropdown Fields
    if (["status", "followUpStatus", "referral"].includes(field)) {
      const select = document.createElement("select");
      select.className = [
        "text-sm px-2 py-1 rounded border border-gray-300 bg-white",
        "focus:outline-none focus:ring-2 focus:ring-indigo-400",
        columnWidths[field] || "w-full",
      ].join(" ");
      select.dataset.field = field;
      select.value = job[field] || "";

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
      ["input", "change"].forEach((ev) =>
        select.addEventListener(ev, () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(autoSaveIfChanged, DEBOUNCE_DELAY);
        })
      );

      select.addEventListener("focus", () => row.classList.add("active-row"));
      select.addEventListener("blur", () => {
        setTimeout(
          () =>
            !row.querySelector(":focus") && row.classList.remove("active-row"),
          50
        );
      });

      // Auto-Set Dates
      if (field === "status") {
        select.addEventListener("change", () => {
          const today = new Date();
          if (select.value === "Applied") {
            if (cellRefs.applicationDate)
              cellRefs.applicationDate.value = today
                .toISOString()
                .split("T")[0];
            if (cellRefs.followUpDate) {
              const fup = new Date(today);
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
          } else if (
            select.value === "2nd Follow Up Sent" &&
            cellRefs.followUpDate
          ) {
            cellRefs.followUpDate.classList.remove(
              "border-red-500",
              "text-red-600",
              "font-bold"
            );
          }
        });
      }
    }

    // Date Fields
    else if (
      ["applicationDate", "followUpDate", "responseDate"].includes(field)
    ) {
      const input = createInput(
        "date",
        job[field] && job[field] !== "—"
          ? new Date(job[field]).toISOString().split("T")[0]
          : ""
      );
      if (field === "followUpDate" && input.value)
        highlightFollowUpDateInput(input);

      cellRefs[field] = input;
      td.appendChild(input);
      ["input", "change"].forEach((ev) =>
        input.addEventListener(ev, () => {
          if (field === "followUpDate") highlightFollowUpDateInput(input);
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(autoSaveIfChanged, 3000);
        })
      );
      input.addEventListener("focus", () => row.classList.add("active-row"));
      input.addEventListener("blur", () =>
        setTimeout(
          () =>
            !row.querySelector(":focus") && row.classList.remove("active-row"),
          50
        )
      );
    }

    // Job Link
    else if (field === "jobLink") {
      const wrapper = document.createElement("div");
      wrapper.className = "flex items-center gap-2";
      const input = createInput("text", job[field] || "");
      const link = document.createElement("a");
      link.href = input.value.trim();
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "text-indigo-500 text-sm hover:underline";
      link.textContent = "↗";
      link.style.display = input.value.trim().startsWith("http")
        ? "inline"
        : "none";

      ["input", "change"].forEach((ev) =>
        input.addEventListener(ev, () => {
          const val = input.value.trim();
          link.href = val;
          link.style.display = val.startsWith("http") ? "inline" : "none";
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(autoSaveIfChanged, 3000);
        })
      );

      input.addEventListener("focus", () => row.classList.add("active-row"));
      input.addEventListener("blur", () =>
        setTimeout(
          () =>
            !row.querySelector(":focus") && row.classList.remove("active-row"),
          50
        )
      );

      wrapper.append(input, link);
      td.appendChild(wrapper);
      cellRefs[field] = input;
    }

    // Number of Applicants
    else if (field === "numberOfApplicants") {
      const input = createInput("number", job[field] || "");
      input.min = "0";
      highlightApplicantsInput(input);

      ["input", "change"].forEach((ev) =>
        input.addEventListener(ev, () => {
          highlightApplicantsInput(input);
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(autoSaveIfChanged, 3000);
        })
      );

      cellRefs[field] = input;
      td.appendChild(input);
    }

    // Regular Text Fields
    else {
      const input = createInput("text", job[field] || "");
      if (["companyName", "title"].includes(field)) {
        ["input", "change"].forEach((ev) =>
          input.addEventListener(ev, () => {
            highlightDuplicateJobs();
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(autoSaveIfChanged, 3000);
          })
        );
      } else {
        ["input", "change"].forEach((ev) =>
          input.addEventListener(ev, () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(autoSaveIfChanged, 3000);
          })
        );
      }
      cellRefs[field] = input;
      td.appendChild(input);
    }

    row.appendChild(td);
  });

  // ================================
  // ✅ ACTION COLUMN (Delete Button)
  // ================================
  const actionTd = document.createElement("td");
  actionTd.className = "px-5 py-3 text-center";
  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "🗑️";
  deleteBtn.className = "text-red-600 hover:text-red-800 mx-1";
  deleteBtn.addEventListener("click", () => openDeleteModal(row));
  actionTd.appendChild(deleteBtn);
  row.appendChild(actionTd);

  highlightDuplicateJobs();
  return row;
};

// ================================
// ✅ HANDLE EMPTY STATE
// ================================
export const handleEmptyState = () => {
  const tableBody = document.getElementById("job-table-body");
  const hasRows = Array.from(tableBody.children).some(
    (row) => row.id !== "empty-row"
  );
  const emptyRow = document.getElementById("empty-row");

  if (!hasRows && !emptyRow) {
    const row = document.createElement("tr");
    row.id = "empty-row";
    const td = document.createElement("td");
    td.colSpan = 10;
    td.className = "text-center py-6 text-gray-500 italic bg-white";
    td.textContent =
      "You have not added any job application. Press the + button to add a job application record.";
    row.appendChild(td);
    tableBody.appendChild(row);
  } else if (hasRows && emptyRow) {
    emptyRow.remove();
  }
};

// ================================
// ✅ UPDATE ROW NUMBERS
// ================================
export const updateRowNumbers = () => {
  document
    .querySelectorAll("#job-table-body tr:not(#empty-row)")
    .forEach((tr, index) => {
      const numCell = tr.querySelector(".row-number");
      if (numCell) numCell.textContent = index + 1;
    });
};

// ================================
// ✅ EXPORT CSV
// ================================
export const exportJobsToCSV = () => {
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
      rowData.push(`"${input?.value.replace(/"/g, '""') || ""}"`);
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
};

// ================================
// ✅ ANALYTICS & STATS
// ================================
export const countFollowUpsDue = (jobs) =>
  jobs.filter(
    (job) =>
      job.followUpDate &&
      job.followUpDate !== "No Response" &&
      job.followUpDate < new Date().toISOString().split("T")[0]
  ).length;

export const getRejectedGhostedStats = (jobs) => ({
  rejected: jobs.filter((j) => j.status === "Rejected").length,
  ghosted: jobs.filter((j) => j.status === "Ghosted").length,
});

export const getMonthlyApplications = (jobs) => {
  const monthlyCount = {};
  jobs.forEach((job) => {
    const date = new Date(job.applicationDate);
    if (!isNaN(date)) {
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      monthlyCount[key] = (monthlyCount[key] || 0) + 1;
    }
  });
  return monthlyCount;
};

export const renderMonthlyApplications = (jobs) => {
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
};

export const updateAnalytics = (jobs) => {
  const todayStr = new Date().toISOString().split("T")[0];
  let applied = 0,
    interviewing = 0,
    offered = 0,
    rejected = 0,
    ghosted = 0,
    followUpsDue = 0;

  jobs.forEach((job) => {
    const { status, followUpDate } = job;
    if (status === "Applied") applied++;
    if (status === "Interviewing") interviewing++;
    if (status === "Offered") offered++;
    if (status === "Rejected") rejected++;
    if (status === "Ghosted") ghosted++;
    if (
      followUpDate &&
      /^\d{4}-\d{2}-\d{2}/.test(followUpDate) &&
      followUpDate <= todayStr
    )
      followUpsDue++;
  });

  document.getElementById("total-jobs").textContent = jobs.length;
  document.getElementById("applied-count").textContent = applied;
  document.getElementById("interviewing-count").textContent = interviewing;
  document.getElementById("offered-count").textContent = offered;
  document.getElementById("followup-due").textContent = followUpsDue;
  document.getElementById("rejected-count").textContent = rejected;
  document.getElementById("ghosted-count").textContent = ghosted;
};

// ================================
// ✅ GET ALL JOBS FROM DOM
// ================================
export const getAllJobsFromDOM = () =>
  Array.from(document.querySelectorAll("#job-table-body tr"))
    .filter((tr) => tr.dataset.id)
    .map((tr) => {
      const job = { id: tr.dataset.id };
      tr.querySelectorAll("input, select").forEach((el) => {
        const key = el.dataset.field || el.name;
        if (key) job[key] = el.value.trim();
      });
      return job;
    });

// ================================
// ✅ NOTIFICATIONS
// ================================
export const showNotification = (message, type = "success") => {
  const container = document.getElementById("notification-container");
  if (!container) return;

  const { bg, text, icon } =
    notificationColors[type] || notificationColors.info;
  const toast = document.createElement("div");
  toast.className = `
    flex items-center gap-3 px-4 py-3 rounded-lg border shadow-xl
    ${bg} ${text}
    transform transition-all duration-300 translate-x-8 opacity-0
    font-medium text-sm backdrop-blur-md
  `;
  toast.innerHTML = `<span class="text-lg">${icon}</span><span>${message}</span>`;

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.replace("translate-x-8", "translate-x-0");
    toast.classList.replace("opacity-0", "opacity-100");
  });

  setTimeout(() => {
    toast.classList.replace("translate-x-0", "translate-x-8");
    toast.classList.replace("opacity-100", "opacity-0");
    setTimeout(() => toast.remove(), 400);
  }, 3000);
};

// ================================
// ✅ DUPLICATE HIGHLIGHTING
// ================================
export const highlightDuplicateJobs = () => {
  const rows = Array.from(document.querySelectorAll("#job-table-body tr"));
  rows.forEach((row) =>
    row
      .querySelectorAll("td")
      .forEach((td) =>
        td.classList.remove("bg-purple-100", "ring-1", "ring-purple-300")
      )
  );

  rows.forEach((rowA, i) => {
    const companyA =
      rowA.querySelector('[data-field="companyName"]')?.value?.toLowerCase() ||
      "";
    const titleA =
      rowA.querySelector('[data-field="title"]')?.value?.toLowerCase() || "";

    rows.slice(i + 1).forEach((rowB) => {
      const companyB =
        rowB
          .querySelector('[data-field="companyName"]')
          ?.value?.toLowerCase() || "";
      const titleB =
        rowB.querySelector('[data-field="title"]')?.value?.toLowerCase() || "";

      const isCompanySimilar = getSimilarity(companyA, companyB) >= 0.75;
      const isTitleSimilar = getSimilarity(titleA, titleB) >= 0.75;

      if (isCompanySimilar && isTitleSimilar) {
        [rowA, rowB].forEach((row) =>
          row
            .querySelectorAll("td")
            .forEach((td) =>
              td.classList.add("bg-purple-100", "ring-1", "ring-purple-300")
            )
        );
      }
    });
  });
};

const getSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  const longerLength = longer.length;
  if (longerLength === 0) return 1.0;
  return (
    (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength)
  );
};

const editDistance = (s1, s2) => {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();
  const costs = new Array(s2.length + 1).fill(0);

  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) costs[j] = j;
      else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
};

// ================================
// ✅ DELETE MODAL HANDLER
// ================================
const openDeleteModal = (row) => {
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
      const { targetRowId: rowId, targetRowIndex: rowIndex } = modal.dataset;

      if (rowId) {
        try {
          await deleteJob(rowId);
          document
            .getElementById("job-table-body")
            .children[rowIndex]?.remove();
          row.remove();
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
};
