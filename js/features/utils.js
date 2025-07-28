// ================================
// ✅ IMPORTS
// ================================
import { addJob, updateJob, deleteJob } from "../features/job-crud.js";

// ================================
// ✅ GLOBAL CONSTANTS
// ================================
const DEBOUNCE_DELAY = 1000;
const debounceTimers = new Map();

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
// ✅ GLOBAL HELPERS
// ================================
function attachAutoSaveListeners(el, row, field, autoSaveIfChanged) {
  ["input", "change"].forEach((ev) => {
    el.addEventListener(ev, () => {
      const key = `${row.dataset.id || "new"}-${field}`;
      clearTimeout(debounceTimers.get(key));
      const timer = setTimeout(() => autoSaveIfChanged(), DEBOUNCE_DELAY);
      debounceTimers.set(key, timer);
    });
  });

  // Immediate save when field loses focus
    el.addEventListener("blur", () => {
    const lastValue = el.dataset.lastSavedValue ?? "";
    const currentValue = el.value.trim();
    if (lastValue !== currentValue) {
      autoSaveIfChanged();
    }
  });
    el.dataset.lastSavedValue = el.value.trim();
}

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

  // Auto-save function
 const autoSaveIfChanged = async () => {
  const data = {};
  let hasChanges = false;

  // 🔹 Check if any field value changed
  for (const field in cellRefs) {
    const el = cellRefs[field];
    if (!el) continue;
    const newValue = el.value.trim();
    data[field] = newValue;

    if (lastSavedData[field] !== newValue) {
      hasChanges = true;
    }
  }

  // ✅ No changes → Don't save or show notification
  if (!hasChanges) return;

  try {
    if (row.dataset.id) {
      await updateJob(row.dataset.id, data);
      showNotification("Data updated successfully", "success", row);
    } else if (userId) {
      const docRef = await addJob(data, userId);
      row.dataset.id = docRef.id;
      updateRowNumbers();
      handleEmptyState();
      showNotification("New job added", "info", row);
    }

    // ✅ Update last saved data
    lastSavedData = { ...data };

    // ✅ Store latest value in dataset to prevent false triggers on blur
    for (const field in cellRefs) {
      const el = cellRefs[field];
      if (el) el.dataset.lastSavedValue = el.value.trim();
    }

    // ✅ Update UI analytics
    updateAnalytics(getAllJobsFromDOM());
    renderMonthlyApplications(getAllJobsFromDOM());
    highlightDuplicateJobs();
  } catch (err) {
    console.error("Auto-save failed:", err);
    showNotification("Failed to save changes", "error", row);
  }
};


  const highlightFollowUpDateInput = (input) => {
    const todayStr = new Date().toISOString().split("T")[0];
    if (input.value && input.value <= todayStr) {
      input.classList.add("border-red-500", "text-red-600", "font-bold");
    } else {
      input.classList.remove("border-red-500", "text-red-600", "font-bold");
    }
  };

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

  // Generate fields
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
      attachAutoSaveListeners(select, row, field, autoSaveIfChanged);

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
      attachAutoSaveListeners(input, row, field, autoSaveIfChanged);
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

      input.addEventListener("input", () => {
        const val = input.value.trim();
        link.href = val;
        link.style.display = val.startsWith("http") ? "inline" : "none";
      });

      wrapper.append(input, link);
      td.appendChild(wrapper);
      cellRefs[field] = input;
      attachAutoSaveListeners(input, row, field, autoSaveIfChanged);
    }

    // Number of Applicants
    else if (field === "numberOfApplicants") {
      const input = createInput("number", job[field] || "");
      input.min = "0";
      highlightApplicantsInput(input);

      input.addEventListener("input", () => highlightApplicantsInput(input));
      cellRefs[field] = input;
      td.appendChild(input);
      attachAutoSaveListeners(input, row, field, autoSaveIfChanged);
    }

    // Regular Text Fields
    else {
      const input = createInput("text", job[field] || "");
      if (["companyName", "title"].includes(field)) {
        input.addEventListener("input", () => highlightDuplicateJobs());
      }
      cellRefs[field] = input;
      td.appendChild(input);
      attachAutoSaveListeners(input, row, field, autoSaveIfChanged);
    }

    row.appendChild(td);
  });

  // Delete Button
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
  const rows = document.querySelectorAll("#job-table-body tr:not(#empty-row)");
  if (!rows.length) return alert("⚠️ No jobs to export.");

  const headers = [
    "No.",
    "Company Name",
    "Title",
    "Number of Applicants",
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

  const formatDate = (dateStr) => {
    if (!dateStr) return "NOT PRESENT";
    const d = new Date(dateStr);
    if (isNaN(d)) return "NOT PRESENT";
    return `${String(d.getDate()).padStart(2, "0")}-${String(
      d.getMonth() + 1
    ).padStart(2, "0")}-${d.getFullYear()}`;
  };

  rows.forEach((tr, i) => {
    const getValue = (field) => {
      const el = tr.querySelector(`[data-field="${field}"]`);
      const val = el ? el.value.trim().replace(/"/g, '""') : "";
      return val || "NOT PRESENT";
    };

    const rowData = [
      i + 1,
      getValue("companyName"),
      getValue("title"),
      getValue("numberOfApplicants"),
      getValue("jobLink"), // ✅ raw URL or value (no hyperlink formula)
      getValue("hiringManager"),
      getValue("status"),
      formatDate(getValue("applicationDate")),
      formatDate(getValue("responseDate")),
      formatDate(getValue("followUpDate")),
      getValue("followUpStatus"),
      getValue("referral"),
    ];

    csvRows.push(rowData.map((val) => `"${val}"`).join(","));
  });

  const csvContent = csvRows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `job_applications_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
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
        if (key) job[key] = el.value;
      });
      return job;
    });

// ================================
// ✅ DUPLICATE HIGHLIGHT
// ================================
export const highlightDuplicateJobs = () => {
  const rows = document.querySelectorAll("#job-table-body tr");
  const seen = new Map();

  // Collect rows by normalized company+title
  rows.forEach((row) => {
    const companyInput = row.querySelector('input[data-field="companyName"]');
    const titleInput = row.querySelector('input[data-field="title"]');

    if (!companyInput || !titleInput) return;

    const company = companyInput.value.trim().toLowerCase();
    const title = titleInput.value.trim().toLowerCase();

    if (company && title) {
      const key = `${company}|${title}`;
      if (!seen.has(key)) seen.set(key, []);
      seen.get(key).push(row);
    }
  });

  // Remove old highlights
  rows.forEach((row) => {
    row.querySelectorAll("td").forEach((td) =>
      td.classList.remove("bg-yellow-100")
    );
  });

  // Highlight duplicates
  for (const group of seen.values()) {
    if (group.length > 1) {
      group.forEach((row) => {
        const companyCell = row.querySelector('input[data-field="companyName"]')
          ?.closest("td");
        const titleCell = row.querySelector('input[data-field="title"]')
          ?.closest("td");

        if (companyCell) companyCell.classList.add("bg-yellow-100");
        if (titleCell) titleCell.classList.add("bg-yellow-100");
      });
    }
  }
};


// ================================
// ✅ NOTIFICATIONS
// ================================
const showNotification = (message, type = "info", row = null) => {
  const container = document.getElementById("notification-container");
  if (!container) return;

  const color = notificationColors[type] || notificationColors.info;

  let rowNumberText = "";
  if (row) {
    const numberCell = row.querySelector(".row-number");
    if (numberCell) {
      rowNumberText = ` (Row ${numberCell.textContent})`;
    }
  }

  const note = document.createElement("div");
  note.className = `
    fixed top-5 right-5 flex items-center gap-2
    px-4 py-2 rounded shadow-md border ${color.bg} ${color.text}
    animate-fade-in-up z-50
  `;
  note.innerHTML = `<span>${color.icon}</span> ${message}${rowNumberText}`;
  container.appendChild(note);

  setTimeout(() => {
    note.classList.add("animate-fade-out-down");
    setTimeout(() => note.remove(), 300);
  }, 3000);
};


// ================================
// ✅ DELETE MODAL
// ================================
const openDeleteModal = (row) => {
  const modal = document.getElementById("delete-modal");
  const confirmBtn = document.getElementById("confirm-delete");
  const cancelBtn = document.getElementById("cancel-delete");

  modal.classList.remove("hidden");
  modal.classList.add("flex");

  const closeModal = () => {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    confirmBtn.onclick = null;
    cancelBtn.onclick = null;
  };

  cancelBtn.onclick = closeModal;

  confirmBtn.onclick = async () => {
    try {
      await deleteJob(row.dataset.id);
      const rowNumber = row.querySelector(".row-number")?.textContent;
      row.remove();
      updateRowNumbers();
      handleEmptyState();
      updateAnalytics(getAllJobsFromDOM());
      renderMonthlyApplications(getAllJobsFromDOM());
      highlightDuplicateJobs();
      showNotification("Job deleted successfully", "success", row);
    } catch (err) {
      console.error("Failed to delete job:", err);
      showNotification("Failed to delete job", "error", row);
    }
    closeModal();
  };
};

