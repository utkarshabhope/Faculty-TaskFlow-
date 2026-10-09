// ============================================================
// 1. FIREBASE SDK IMPORTS
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  arrayUnion,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  doc
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

// ============================================================
// 2. FIREBASE CONFIGURATION
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyDb9EcoTd_-QJTjOYi43HBuqC1MsTn5wD8",
  authDomain: "bvcoew-faculty-taskflow.firebaseapp.com",
  projectId: "bvcoew-faculty-taskflow",
  storageBucket: "bvcoew-faculty-taskflow.firebasestorage.app",
  messagingSenderId: "726145242275",
  appId: "1:726145242275:web:1065136703ec314e2adb16",
  measurementId: "G-GSL2W7GWL5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const EMAIL_DOMAIN = "@bvcoew.edu";

const userDirectory = {
  hod: { name: "Dr. Nilofar Mulla", role: "Head of Department (HOD)", initials: "NM", isHOD: true },
  priyanka: { name: "Prof. Priyanka Raikar", role: "Assistant Professor", initials: "PR", isHOD: false },
  pallavi: { name: "Prof. Pallavi Narkhede", role: "Assistant Professor", initials: "PN", isHOD: false },
  ashwini: { name: "Prof. Ashwini Kanade", role: "Assistant Professor", initials: "AK", isHOD: false },
  kamlesh: { name: "Prof. Kamlesh Patil", role: "Assistant Professor", initials: "KP", isHOD: false },
  seema: { name: "Prof. Seema Hadke", role: "Assistant Professor", initials: "SH", isHOD: false },
  neha: { name: "Prof. Neha Bhosale", role: "Assistant Professor", initials: "NB", isHOD: false }
};

const departmentalEvents = [
  { date: "2026-09-24", title: "Mid-Semester Paper Moderation", type: "event" },
  { date: "2026-09-30", title: "Faculty Council Meeting", type: "event" },
  { date: "2026-10-15", title: "Internal Academic Audit (NBA)", type: "audit" },
  { date: "2026-10-20", title: "NAAC Documentation Review", type: "audit" },
  { date: "2026-10-25", title: "Semester Academic Review", type: "event" }
];

let currentUser = null; 
let allTasks = [];
let allMessages = [];
let unsubscribeTasks = null;
let unsubscribeMessages = null;
let calendarDate = new Date();

// ============================================================
// 3. UI HELPERS & POPULATION
// ============================================================
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}

function renderMilestones() {
  const list = document.getElementById("milestoneList");
  if (!list) return;
  list.innerHTML = departmentalEvents.map(m => `
    <div class="message-item">
      <div class="message-meta">${m.date} • ${m.type.toUpperCase()}</div>
      <strong>${escapeHtml(m.title)}</strong>
    </div>
  `).join("");
}

function populateRecipients() {
  const select = document.getElementById("messageRecipient");
  if (!select) return;
  select.innerHTML = `<option value="all">Entire Department (All)</option>` +
    Object.keys(userDirectory)
      .map(k => `<option value="${k}">${userDirectory[k].name} (${userDirectory[k].role})</option>`)
      .join("");
}

function populateFacultySelect() {
  const select = document.getElementById("taskFacultySelect");
  if (!select) return;
  select.innerHTML = Object.keys(userDirectory)
    .map(k => `<option value="${k}">${userDirectory[k].name}</option>`)
    .join("");
}

// ============================================================
// 4. NAVIGATION & PERMISSIONS
// ============================================================
function switchPage(pageKey) {
  if (!currentUser) return;
  const user = userDirectory[currentUser];
  if (!user) return;

  if (pageKey === "reports" && !user.isHOD) {
    alert("Access Denied. Workload reports are available only to the HOD.");
    return;
  }

  document.querySelectorAll(".nav-item[data-page]").forEach(b => {
    b.classList.toggle("active", b.dataset.page === pageKey);
  });
  document.querySelectorAll(".page").forEach(p => {
    p.classList.toggle("active-page", p.id === pageKey);
  });

  if (pageKey === "calendar") {
    renderCalendar();
  } else if (pageKey === "reports") {
    renderReports();
  } else if (pageKey === "dashboard") {
    renderDashboardStats();
    renderFocusCard();
    renderDashboardTasks();
  }

  const pageTitle = document.getElementById("pageTitle");
  if (pageTitle) {
    const titles = {
      dashboard: user.isHOD ? "Welcome, Dr. Nilofar Mulla (HOD) 👋" : `Welcome, ${user.name} 👋`,
      tasks: user.isHOD ? "Faculty Task Assignment & Monitoring" : "Task Board & Personal Deliverables",
      calendar: "Department Academic & Deadline Calendar",
      reports: "Faculty Workload & Performance Reports",
      messages: "Department Messaging",
      about: "About Faculty TaskFlow"
    };
    pageTitle.textContent = titles[pageKey] || "Faculty TaskFlow";
  }
}

function applyUserPermissions() {
  if (!currentUser) return;
  const user = userDirectory[currentUser];
  if (!user) return;

  const nameEl = document.getElementById("sidebarUserName");
  const roleEl = document.getElementById("sidebarUserRole");
  const avatarEl = document.getElementById("sidebarAvatar");

  if (nameEl) nameEl.textContent = user.name;
  if (roleEl) roleEl.textContent = user.role;
  if (avatarEl) avatarEl.textContent = user.initials;

  document.querySelectorAll(".hod-only").forEach(el => {
    el.style.display = user.isHOD ? "inline-flex" : "none";
  });

  const head = document.querySelector("#tasks .section-head");
  if (head && !document.getElementById("primaryTaskBtn")) {
    const btn = document.createElement("button");
    btn.id = "primaryTaskBtn";
    btn.className = "primary";
    head.appendChild(btn);
  }

  const primaryBtn = document.getElementById("primaryTaskBtn");
  if (primaryBtn) {
    primaryBtn.textContent = user.isHOD ? "+ Assign New Task" : "+ Add Private Task";
    primaryBtn.onclick = () => openTaskModal();
  }
}

function openTaskModal() {
  const modal = document.getElementById("taskModal");
  if (!modal) return;

  const form = document.getElementById("taskForm");
  if (form) form.reset();

  const isHod = userDirectory[currentUser]?.isHOD;
  const facultyContainer = document.getElementById("facultyFieldContainer");

  let staffNotice = document.getElementById("staffLockedNotice");
  if (!staffNotice && facultyContainer) {
    staffNotice = document.createElement("div");
    staffNotice.id = "staffLockedNotice";
    staffNotice.style.padding = "8px 12px";
    staffNotice.style.background = "#eff6ff";
    staffNotice.style.border = "1px solid #bfdbfe";
    staffNotice.style.borderRadius = "6px";
    staffNotice.style.color = "#1d4ed8";
    staffNotice.style.fontSize = "13px";
    staffNotice.style.fontWeight = "600";
    facultyContainer.parentNode.insertBefore(staffNotice, facultyContainer);
  }

  if (isHod) {
    if (facultyContainer) facultyContainer.style.display = "block";
    if (staffNotice) staffNotice.style.display = "none";
  } else {
    if (facultyContainer) facultyContainer.style.display = "none";
    if (staffNotice) {
      staffNotice.style.display = "block";
      staffNotice.innerHTML = `🔒 <strong>Assignee:</strong> ${escapeHtml(userDirectory[currentUser].name)} (Private Task)`;
    }
  }

  const titleEl = document.getElementById("modalHeading");
  if (titleEl) titleEl.textContent = isHod ? "Assign Department Task" : "Add Private Task";

  modal.style.display = "flex";
}

// ============================================================
// 5. FIRESTORE REAL-TIME SYNCHRONIZATION
// ============================================================
function subscribeToData() {
  if (unsubscribeTasks) unsubscribeTasks();
  if (unsubscribeMessages) unsubscribeMessages();

  try {
    const tasksQuery = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
    unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      allTasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      renderAllTaskViews();
      renderCalendar();
      renderReports();
    }, (err) => console.error("Tasks sync error:", err));

    const messagesQuery = query(collection(db, "messages"), orderBy("createdAt", "desc"));
    unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
      allMessages = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      renderMessages();
    }, (err) => console.error("Messages sync error:", err));
  } catch (e) {
    console.error("Subscription setup error:", e);
  }
}

function getScopedTasks() {
  if (!currentUser) return [];
  const isHod = userDirectory[currentUser]?.isHOD;

  return allTasks.filter(t => {
    if (t.isPrivate) return t.assignedTo === currentUser;
    return isHod || t.assignedTo === currentUser;
  });
}

// ============================================================
// 6. RENDER LOGIC
// ============================================================
function renderAllTaskViews() {
  renderDashboardStats();
  renderFocusCard();
  renderDashboardTasks();
  renderTaskTable();
  renderReports();
}

function renderDashboardStats() {
  const scoped = getScopedTasks();
  const total = scoped.length;
  const inProg = scoped.filter(t => t.status === "In Progress" || t.status === "Assigned").length;
  const completed = scoped.filter(t => t.status === "Completed").length;
  const today = new Date().toISOString().split("T")[0];
  const overdue = scoped.filter(t => t.deadline < today && t.status !== "Completed").length;

  const totalEl = document.getElementById("statTotal");
  const inProgEl = document.getElementById("statInProgress");
  const completedEl = document.getElementById("statCompleted");
  const overdueEl = document.getElementById("statOverdue");

  if (totalEl) totalEl.textContent = total;
  if (inProgEl) inProgEl.textContent = inProg;
  if (completedEl) completedEl.textContent = completed;
  if (overdueEl) overdueEl.textContent = overdue;
}

function renderDashboardTasks() {
  const container = document.getElementById("dashboardTaskList");
  if (!container) return;

  const scoped = getScopedTasks().slice(0, 5);

  if (scoped.length === 0) {
    container.innerHTML = `<p style="padding:15px;color:#64748b;font-size:13px;text-align:center;">No recent deliverables found.</p>`;
    return;
  }

  container.innerHTML = scoped.map(t => `
    <div class="message-item" style="display:flex; justify-content:space-between; align-items:center;">
      <div>
        <div class="message-meta">${escapeHtml(t.category)} • Due: ${t.deadline || "No date"}</div>
        <strong>${t.isPrivate ? "🔒 " : ""}${escapeHtml(t.title)}</strong>
        <small style="display:block;color:#64748b;">${escapeHtml(userDirectory[t.assignedTo]?.name || t.assignedTo)}</small>
      </div>
      <div style="text-align:right;">
        <span class="priority-tag ${t.priority ? t.priority.toLowerCase() + '-tag' : ''}" style="font-size:11px;">${t.priority}</span>
        <div style="font-size:12px; color:#64748b; margin-top:4px;">${t.progress || 0}% (${t.status})</div>
      </div>
    </div>
  `).join("");
}

function renderFocusCard() {
  const scoped = getScopedTasks();
  const active = scoped.find(t => t.status !== "Completed");

  const title = document.getElementById("focusTitle");
  const desc = document.getElementById("focusDesc");
  const cat = document.getElementById("focusCategory");
  const assignee = document.getElementById("focusAssignee");
  const due = document.getElementById("focusDueDate");
  const prog = document.getElementById("focusProgressText");
  const btn = document.getElementById("completeFocusTaskBtn");

  if (!active) {
    if (title) title.textContent = "No active tasks";
    if (desc) desc.textContent = "All deliverables are completed.";
    if (prog) prog.textContent = "100%";
    if (btn) btn.style.display = "none";
    return;
  }

  if (title) title.textContent = (active.isPrivate ? "🔒 " : "") + active.title;
  if (desc) desc.textContent = active.description || "No specific instructions provided.";
  if (cat) cat.textContent = active.category;
  if (assignee) assignee.textContent = userDirectory[active.assignedTo]?.name || active.assignedTo;
  if (due) due.textContent = active.deadline;
  if (prog) prog.textContent = `${active.progress || 0}%`;

  if (btn) {
    btn.style.display = "inline-block";
    btn.onclick = () => updateTaskProgress(active.id, 100, "Completed");
  }
}

function renderTaskTable() {
  const tbody = document.getElementById("taskTable");
  if (!tbody) return;

  const scoped = getScopedTasks();
  const statusFilter = document.getElementById("statusFilter")?.value || "All";
  const priorityFilter = document.getElementById("priorityFilter")?.value || "All";
  const search = document.getElementById("searchInput")?.value.toLowerCase() || "";

  const filtered = scoped.filter(t => {
    const matchesStatus = (statusFilter === "All") || (t.status === statusFilter);
    const matchesPriority = (priorityFilter === "All") || (t.priority === priorityFilter);
    const matchesSearch = (t.title || "").toLowerCase().includes(search) || 
                          (t.description || "").toLowerCase().includes(search);
    return matchesStatus && matchesPriority && matchesSearch;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:20px;color:#64748b;">No matching tasks found.</td></tr>`;
    return;
  }

  const isHod = userDirectory[currentUser]?.isHOD;

  tbody.innerHTML = filtered.map(t => {
    const canDelete = isHod || t.isPrivate;
    return `
      <tr>
        <td>
          <strong>${t.isPrivate ? "🔒 " : ""}${escapeHtml(t.title)}</strong>
          <small style="display:block;color:#64748b;">${escapeHtml(t.description || "")}</small>
        </td>
        <td>${escapeHtml(userDirectory[t.assignedTo]?.name || t.assignedTo)}</td>
        <td><span class="category-tag">${t.category}</span></td>
        <td><span class="priority-tag">${t.priority}</span></td>
        <td>${t.deadline || "—"}</td>
        <td>
          <input type="range" min="0" max="100" value="${t.progress || 0}" 
            onchange="window._updateProgress('${t.id}', this.value)" 
            style="width: 80px;">
          <span>${t.progress || 0}%</span>
        </td>
        <td><strong>${t.status}</strong></td>
        <td>
          ${canDelete 
            ? `<button class="secondary" onclick="window._deleteTask('${t.id}')">Delete</button>` 
            : `<span style="color:#94a3b8;font-size:12px;">Assigned</span>`
          }
        </td>
      </tr>
    `;
  }).join("");
}

// ============================================================
// 7. CALENDAR VIEW
// ============================================================
function renderCalendar() {
  const daysContainer = document.getElementById("calendarDays");
  const monthTitle = document.getElementById("currentMonthYear");
  if (!daysContainer) return;

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  if (monthTitle) {
    monthTitle.textContent = `${monthNames[month]} ${year}`;
  }

  const activeTasks = getScopedTasks();
  const dateMap = {};

  departmentalEvents.forEach(e => {
    if (!dateMap[e.date]) dateMap[e.date] = [];
    dateMap[e.date].push({ label: e.title, isEvent: true });
  });

  activeTasks.forEach(t => {
    if (!t.deadline) return;
    if (!dateMap[t.deadline]) dateMap[t.deadline] = [];
    dateMap[t.deadline].push({
      label: `${t.isPrivate ? "🔒 " : ""}${t.title}`,
      isEvent: false,
      isDone: t.status === "Completed"
    });
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  let daysHtml = "";

  for (let i = firstDay - 1; i >= 0; i--) {
    const prevDate = daysInPrevMonth - i;
    daysHtml += `
      <div style="background: #fafafa; padding: 6px; display: flex; flex-direction: column; opacity: 0.45;">
        <span style="font-size: 11px; font-weight: 600; color: #64748b;">${prevDate}</span>
      </div>
    `;
  }

  const todayStr = new Date().toISOString().split("T")[0];

  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const dStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const items = dateMap[dStr] || [];
    const isToday = todayStr === dStr;

    daysHtml += `
      <div style="background: #ffffff; padding: 6px; display: flex; flex-direction: column; gap: 3px; position: relative;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
          <span style="font-size: 12px; font-weight: ${isToday ? "700" : "500"}; ${isToday ? "background: #2563eb; color: #fff; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center;" : "color: #1e293b;"}">
            ${d}
          </span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 2px; overflow-y: auto; max-height: 75px;">
          ${items.map(item => {
            const bg = item.isEvent ? "#fef2f2" : (item.isDone ? "#f0fdf4" : "#eff6ff");
            const color = item.isEvent ? "#b91c1c" : (item.isDone ? "#15803d" : "#1d4ed8");
            const border = item.isEvent ? "#ef4444" : (item.isDone ? "#22c55e" : "#3b82f6");
            return `
              <div style="font-size: 10px; font-weight: 500; padding: 2px 5px; border-radius: 3px; background: ${bg}; color:${color}; border-left: 2px solid ${border}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(item.label)}">
                ${escapeHtml(item.label)}
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  const totalCells = firstDay + daysInCurrentMonth;
  const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);

  for (let nextD = 1; nextD <= remainingCells; nextD++) {
    daysHtml += `
      <div style="background: #fafafa; padding: 6px; display: flex; flex-direction: column; opacity: 0.45;">
        <span style="font-size: 11px; font-weight: 600; color: #64748b;">${nextD}</span>
      </div>
    `;
  }

  daysContainer.innerHTML = daysHtml;
}

document.getElementById("prevMonthBtn")?.addEventListener("click", () => {
  calendarDate.setMonth(calendarDate.getMonth() - 1);
  renderCalendar();
});

document.getElementById("nextMonthBtn")?.addEventListener("click", () => {
  calendarDate.setMonth(calendarDate.getMonth() + 1);
  renderCalendar();
});

document.getElementById("calTodayBtn")?.addEventListener("click", () => {
  calendarDate = new Date();
  renderCalendar();
});

// ============================================================
// 8. CRUD LOGIC (TASKS & MESSAGES)
// ============================================================
window._updateProgress = async (taskId, progress) => {
  const p = parseInt(progress, 10);
  const status = p === 100 ? "Completed" : (p > 0 ? "In Progress" : "Assigned");
  await updateTaskProgress(taskId, p, status);
};

window._deleteTask = async (taskId) => {
  if (!confirm("Are you sure you want to permanently delete this task?")) return;
  try {
    await deleteDoc(doc(db, "tasks", taskId));
    showToast("Task deleted.");
  } catch (err) {
    alert("Delete failed: " + err.message);
  }
};

async function updateTaskProgress(taskId, progress, status) {
  try {
    await updateDoc(doc(db, "tasks", taskId), { progress, status });
    showToast("Task updated.");
  } catch (err) {
    console.error("Update failed:", err);
  }
}

document.getElementById("closeModal")?.addEventListener("click", () => {
  const modal = document.getElementById("taskModal");
  if (modal) modal.style.display = "none";
});

// TASK CREATION HANDLER
document.getElementById("taskForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const submitBtn = document.getElementById("submitTaskBtn");
  const originalText = submitBtn ? submitBtn.textContent : "Save Task";
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving...";
  }

  const isHod = userDirectory[currentUser]?.isHOD;
  const title = document.getElementById("taskTitleInput")?.value.trim() || "";
  const desc = document.getElementById("taskDescInput")?.value.trim() || "";
  const priority = document.getElementById("taskPrioritySelect")?.value || "Medium";
  const deadline = document.getElementById("taskDeadlineInput")?.value || "";
  const category = document.getElementById("taskCategorySelect")?.value || "Academic";

  const assignedTo = isHod ? (document.getElementById("taskFacultySelect")?.value || currentUser) : currentUser;
  const isPrivate = !isHod;

  try {
    await addDoc(collection(db, "tasks"), {
      title,
      description: desc,
      assignedTo,
      isPrivate,
      priority,
      deadline,
      category,
      status: "Assigned",
      progress: 0,
      createdAt: serverTimestamp()
    });

    showToast(isPrivate ? "Personal task recorded." : "Task successfully assigned.");
    document.getElementById("taskForm").reset();
    const modal = document.getElementById("taskModal");
    if (modal) modal.style.display = "none";
  } catch (err) {
    alert("Failed to save task: " + err.message);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }
});

// MESSAGING SUBMIT HANDLER
document.getElementById("messageForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const sendBtn = document.getElementById("sendMessageBtn");
  const originalText = sendBtn ? sendBtn.textContent : "Send Message";

  const recipient = document.getElementById("messageRecipient")?.value;
  const textInput = document.getElementById("messageText");
  const text = textInput ? textInput.value.trim() : "";

  if (!text) return;

  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.textContent = "Sending...";
  }

  try {
    await addDoc(collection(db, "messages"), {
      senderId: currentUser,
      senderName: userDirectory[currentUser].name,
      recipient,
      text,
      deletedBy: [], // Array to track individual deletions per user
      createdAt: serverTimestamp()
    });

    if (textInput) textInput.value = "";
    showToast("Message transmitted.");
  } catch (err) {
    console.error("Messaging failure:", err);
    alert("Could not send message: " + err.message);
  } finally {
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.textContent = originalText;
    }
  }
});

// SINGLE MESSAGE SOFT-DELETE (Deletes only for the current user)
window._deleteMessage = async (messageId) => {
  if (!confirm("Delete this message for your account? (Other faculty members will still see it)")) return;
  try {
    await updateDoc(doc(db, "messages", messageId), {
      deletedBy: arrayUnion(currentUser)
    });
    showToast("Message removed from your view.");
  } catch (err) {
    alert("Delete failed: " + err.message);
  }
};

// MESSAGING INBOX RENDERER (Filters out messages deleted by currentUser)
function renderMessages() {
  const container = document.getElementById("messageList");
  if (!container) return;

  const visible = allMessages.filter(m => {
    // 1. Hide if the current user has deleted it from their inbox
    if (Array.isArray(m.deletedBy) && m.deletedBy.includes(currentUser)) {
      return false;
    }
    // 2. Visible if addressed to all, currentUser, or sent by currentUser
    return m.recipient === "all" || m.recipient === currentUser || m.senderId === currentUser;
  });

  const selectAll = document.getElementById("selectAllMessages");
  if (selectAll) selectAll.checked = false;

  if (visible.length === 0) {
    container.innerHTML = `<p style="padding:15px;color:#64748b;">No messages in your inbox.</p>`;
    return;
  }

  container.innerHTML = visible.map(m => `
    <div class="message-item" style="display: flex; align-items: flex-start; gap: 10px;">
      <input type="checkbox" class="msg-select-check" value="${m.id}" style="margin-top: 4px; cursor: pointer;">
      <div style="flex: 1;">
        <div class="message-meta" style="display: flex; justify-content: space-between; align-items: center;">
          <span>
            <strong>${escapeHtml(m.senderName)}</strong> → 
            ${m.recipient === "all" ? "All Faculty" : escapeHtml(userDirectory[m.recipient]?.name || m.recipient)}
          </span>
          <button onclick="window._deleteMessage('${m.id}')" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:12px; padding:0;">
            Delete
          </button>
        </div>
        <div style="font-size: 13px; color: #1e293b; line-height: 1.4;">${escapeHtml(m.text)}</div>
      </div>
    </div>
  `).join("");
}

document.getElementById("selectAllMessages")?.addEventListener("change", (e) => {
  const checkboxes = document.querySelectorAll(".msg-select-check");
  checkboxes.forEach(cb => cb.checked = e.target.checked);
});

// BATCH SOFT-DELETE (Deletes only for the current user)
document.getElementById("deleteSelectedMessagesBtn")?.addEventListener("click", async () => {
  const selectedBoxes = Array.from(document.querySelectorAll(".msg-select-check:checked"));
  if (selectedBoxes.length === 0) {
    alert("Please select at least one message to delete.");
    return;
  }

  if (!confirm(`Delete ${selectedBoxes.length} selected message(s) from your view?`)) return;

  try {
    const updatePromises = selectedBoxes.map(cb => 
      updateDoc(doc(db, "messages", cb.value), {
        deletedBy: arrayUnion(currentUser)
      })
    );
    await Promise.all(updatePromises);
    showToast(`${selectedBoxes.length} message(s) removed.`);
  } catch (err) {
    alert("Batch delete failed: " + err.message);
  }
});

// ============================================================
// WORKLOAD & REPORTS RENDERER (STRICTLY ASSIGNED TASKS ONLY)
// ============================================================
function renderReports() {
  if (!userDirectory[currentUser]?.isHOD) return;

  // Filter ONLY official assigned department tasks (strictly exclude private tasks)
  const assignedTasks = allTasks.filter(t => !t.isPrivate);
  const total = assignedTasks.length;
  const completed = assignedTasks.filter(t => t.status === "Completed" || (t.progress || 0) === 100).length;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const rateEl = document.getElementById("reportCompletionRate");
  const barEl = document.getElementById("reportProgressBar");
  const totalEl = document.getElementById("reportTotalTasks");

  if (rateEl) rateEl.textContent = `${rate}%`;
  if (barEl) barEl.style.width = `${rate}%`;
  if (totalEl) totalEl.textContent = total;

  const barContainer = document.getElementById("facultyWorkloadBars");
  if (!barContainer) return;

  barContainer.innerHTML = Object.keys(userDirectory).map(key => {
    const faculty = userDirectory[key];
    const facultyNameLower = faculty.name.toLowerCase();

    // Match assigned tasks for this specific faculty member
    const facultyTasks = assignedTasks.filter(t => {
      if (!t.assignedTo) return false;
      const assigned = String(t.assignedTo).toLowerCase().trim();
      return assigned === key.toLowerCase() || assigned === facultyNameLower || facultyNameLower.includes(assigned);
    });

    const count = facultyTasks.length;
    const completedCount = facultyTasks.filter(t => t.status === "Completed" || (t.progress || 0) === 100).length;
    const percentage = count > 0 ? Math.round((completedCount / count) * 100) : 0;

    return `
      <div class="workload-item">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <div>
            <strong style="font-size: 14px; color: #1e293b;">${faculty.name}</strong>
            <span style="font-size: 12px; color: #64748b; margin-left: 6px;">(${faculty.role})</span>
          </div>
          <span style="font-size: 13px; font-weight: 600; color: ${count > 0 ? '#1d4ed8' : '#94a3b8'};">
            ${completedCount} / ${count} Completed (${percentage}%)
          </span>
        </div>
        <div style="background: #e2e8f0; height: 10px; border-radius: 5px; overflow: hidden;">
          <div style="background: ${percentage === 100 ? '#16a34a' : '#4f46e5'}; height: 100%; width: ${count === 0 ? 0 : Math.max(percentage, 4)}%; transition: width 0.3s ease;"></div>
        </div>
      </div>
    `;
  }).join("");
}

document.getElementById("refreshWorkloadBtn")?.addEventListener("click", () => {
  renderReports();
  showToast("Workload data refreshed.");
});

// Global Filter & Navigation Listeners
document.getElementById("statusFilter")?.addEventListener("change", renderTaskTable);
document.getElementById("priorityFilter")?.addEventListener("change", renderTaskTable);
document.getElementById("searchInput")?.addEventListener("input", renderTaskTable);

document.addEventListener("click", (e) => {
  const btn = e.target.closest(".nav-item[data-page]");
  if (btn) switchPage(btn.dataset.page);

  const link = e.target.closest("[data-page-link]");
  if (link) switchPage(link.dataset.pageLink);
});

// ============================================================
// 9. AUTHENTICATION
// ============================================================
const loginForm = document.getElementById("loginForm");
const loginScreen = document.getElementById("loginScreen");
const appWorkspace = document.getElementById("appWorkspace");
const loginError = document.getElementById("loginError");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (loginError) loginError.textContent = "";

    const usernameInput = document.getElementById("loginUsername");
    const passwordInput = document.getElementById("loginPassword");
    const username = usernameInput ? usernameInput.value.trim().toLowerCase() : "";
    const password = passwordInput ? passwordInput.value.trim() : "";

    if (!userDirectory[username]) {
      const msg = `Unrecognized username "${username}". Please check spelling.`;
      if (loginError) loginError.textContent = msg;
      return;
    }

    const email = `${username}${EMAIL_DOMAIN}`;
    const submitBtn = loginForm.querySelector("button[type='submit']") || loginForm.querySelector("button");
    const originalText = submitBtn ? submitBtn.textContent : "Sign In";

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Verifying...";
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error("Auth sign-in error:", err);
      let msg = "Invalid password or credentials.";
      if (err.code === "auth/user-not-found") {
        msg = `User account ${email} is not registered in Firebase Auth.`;
      }
      if (loginError) loginError.textContent = msg;
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  });
}

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (err) {
    console.error("Sign-out error:", err);
  }
});

onAuthStateChanged(auth, (user) => {
  if (user && user.email) {
    const username = user.email.split("@")[0].toLowerCase();
    if (userDirectory[username]) {
      currentUser = username;

      if (loginScreen) loginScreen.style.display = "none";
      if (appWorkspace) appWorkspace.style.display = "flex";

      try { applyUserPermissions(); } catch (e) { console.error("Error in permissions:", e); }
      try { populateFacultySelect(); } catch (e) { console.error("Error in faculty select:", e); }
      try { populateRecipients(); } catch (e) { console.error("Error in recipients:", e); }
      try { renderMilestones(); } catch (e) { console.error("Error in milestones:", e); }
      try { subscribeToData(); } catch (e) { console.error("Error in data subscribe:", e); }
      try { switchPage("dashboard"); } catch (e) { console.error("Error in switchPage:", e); }
      return;
    }
  }

  currentUser = null;
  if (unsubscribeTasks) unsubscribeTasks();
  if (unsubscribeMessages) unsubscribeMessages();

  if (loginScreen) loginScreen.style.display = "flex";
  if (appWorkspace) appWorkspace.style.display = "none";
});
