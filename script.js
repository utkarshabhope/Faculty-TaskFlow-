document.addEventListener('DOMContentLoaded', () => {
  // --- 1. USER DIRECTORY & BVCOEW CREDENTIALS ---
  const userDirectory = {
    hod: {
      password: "hod123",
      name: "Dr. Nilofar Mulla",
      role: "Head of Department (HOD)",
      initials: "NM",
      isHOD: true
    },
    priyanka: {
      password: "staff123",
      name: "Prof. Priyanka Raikar",
      role: "Assistant Professor",
      initials: "PR",
      isHOD: false
    },
    pallavi: {
      password: "staff123",
      name: "Prof. Pallavi Narkhede",
      role: "Assistant Professor",
      initials: "PN",
      isHOD: false
    },
    ashwini: {
      password: "staff123",
      name: "Prof. Ashwini Kanade",
      role: "Assistant Professor",
      initials: "AK",
      isHOD: false
    },
    kamlesh: {
      password: "staff123",
      name: "Prof. Kamlesh Patil",
      role: "Assistant Professor",
      initials: "KP",
      isHOD: false
    },
    seema: {
      password: "staff123",
      name: "Prof. Seema Hadke",
      role: "Assistant Professor",
      initials: "SH",
      isHOD: false
    }
  };

  let currentUser = null;

  // --- 2. LOCALSTORAGE PERSISTENCE (STARTS CLEAN) ---
  const STORAGE_KEY = 'bvcoew_faculty_taskflow_data';
  function loadSavedTasks() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  }

  function saveTasksToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  let tasks = loadSavedTasks();

  // Calendar State for full navigation
  const today = new Date();
  let calendarCurrentDate = new Date(today.getFullYear(), today.getMonth(), 1);

  // Institutional Milestone Events for BVCOEW Pune
  const departmentalEvents = [
    { date: "2026-09-24", title: "Mid-Semester Question Paper Moderation", type: "event" },
    { date: "2026-09-30", title: "Department Faculty Council (HOD)", type: "event" },
    { date: "2026-10-15", title: "Internal Academic Audit (NBA)", type: "event" }
  ];

  // --- 3. LOGIN & AUTHENTICATION ---
  const loginScreen = document.getElementById('loginScreen');
  const appWorkspace = document.getElementById('appWorkspace');
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value.trim();

    if (userDirectory[username] && userDirectory[username].password === password) {
      currentUser = username;
      loginError.textContent = "";
      loginForm.reset();

      loginScreen.style.display = "none";
      appWorkspace.style.display = "flex";

      applyUserPermissions();
      renderAllViews();
      switchPage('dashboard');
      showToast(`Welcome, ${userDirectory[currentUser].name}`);
    } else {
      loginError.textContent = "Invalid username or password.";
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    currentUser = null;
    appWorkspace.style.display = "none";
    loginScreen.style.display = "flex";
  });

  // --- 4. ACCESS CONTROL & ROLE PERMISSIONS ---
  function applyUserPermissions() {
    const user = userDirectory[currentUser];
    document.getElementById('sidebarUserName').textContent = user.name;
    document.getElementById('sidebarUserRole').textContent = user.role;
    document.getElementById('sidebarAvatar').textContent = user.initials;

    const hodOnlyElements = document.querySelectorAll('.hod-only');
    const openTaskBtns = [document.getElementById('openTaskModal'), document.getElementById('openTaskModal2')];

    if (user.isHOD) {
      // HOD sees reports tab and assign buttons
      hodOnlyElements.forEach(el => el.style.display = "inline-flex");
      openTaskBtns.forEach(btn => { if (btn) btn.textContent = "+ Assign New Task"; });
      document.getElementById('taskSectionSubtitle').textContent = "Assign, track, update progress, or delete faculty tasks.";
    } else {
      // Staff can create their OWN tasks, but reports are strictly hidden
      hodOnlyElements.forEach(el => el.style.display = "none");
      openTaskBtns.forEach(btn => { if (btn) btn.textContent = "+ Create My Task"; });
      document.getElementById('taskSectionSubtitle').textContent = "Your assigned deliverables. Add your own task or update completion status here.";

      const currentActive = document.querySelector('.page.active-page');
      if (currentActive && currentActive.id === 'reports') {
        switchPage('dashboard');
      }
    }
  }

  function getFilteredTasks() {
    if (!currentUser) return [];
    if (userDirectory[currentUser].isHOD) return tasks;
    return tasks.filter(t => t.assignedTo === currentUser);
  }

  // --- 5. NAVIGATION ---
  const navButtons = document.querySelectorAll('.nav-item[data-page]');
  const pages = document.querySelectorAll('.page');
  const pageTitle = document.getElementById('pageTitle');

  function switchPage(pageKey) {
    if (pageKey === 'reports' && !userDirectory[currentUser].isHOD) {
      alert("Access Denied: Faculty workload and performance reports are confidential to Dr. Nilofar Mulla (HOD).");
      return;
    }

    navButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.page === pageKey));
    pages.forEach(pg => pg.classList.toggle('active-page', pg.id === pageKey));

    const user = userDirectory[currentUser];
    const titles = {
      dashboard: user.isHOD ? `Welcome, Dr. Nilofar Mulla (HOD) 👋` : `Welcome, ${user.name} 👋`,
      tasks: user.isHOD ? 'Faculty Task Assignment & Monitoring' : 'My Assigned Deliverables',
      calendar: 'Department Academic Calendar (Set by HOD)',
      reports: 'Faculty Workload & Performance Reports (HOD)',
      research: 'Academic Workload Model (WAM) Framework'
    };
    if (pageTitle) pageTitle.textContent = titles[pageKey] || 'Faculty TaskFlow';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navButtons.forEach(btn => btn.addEventListener('click', () => switchPage(btn.dataset.page)));
  document.querySelectorAll('[data-page-link]').forEach(btn => btn.addEventListener('click', () => switchPage(btn.dataset.pageLink)));

  // --- 6. RENDER HERO TASK CARD (BIG BOX) ---
  function renderFocusCard() {
    const list = getFilteredTasks();
    const activeTasks = list.filter(t => t.status !== "Completed");
    const focusTask = activeTasks.find(t => t.priority === "High") || activeTasks[0] || list[0];

    const heroCard = document.getElementById('heroTaskCard');
    if (!focusTask) {
      document.getElementById('focusTitle').textContent = "No active tasks";
      document.getElementById('focusDesc').textContent = userDirectory[currentUser].isHOD 
        ? "You currently have no tasks assigned. Click '+ Assign New Task' above."
        : "You currently have no active deliverables. Click '+ Create My Task' to add one.";
      document.getElementById('focusCategory').textContent = "Clear";
      document.getElementById('focusAssignee').textContent = "—";
      document.getElementById('focusDueDate').textContent = "—";
      document.getElementById('focusProgressText').textContent = "0%";
      document.getElementById('completeFocusTaskBtn').style.display = "none";
      return;
    }

    document.getElementById('completeFocusTaskBtn').style.display = "block";
    document.getElementById('focusTitle').textContent = focusTask.title;
    document.getElementById('focusDesc').textContent = focusTask.desc;
    document.getElementById('focusCategory').textContent = focusTask.category;
    document.getElementById('focusAssignee').textContent = userDirectory[focusTask.assignedTo]?.name || focusTask.assignedTo;
    document.getElementById('focusDueDate').textContent = focusTask.deadline;
    document.getElementById('focusProgressText').textContent = `${focusTask.progress}%`;

    const prioBadge = document.getElementById('focusPriority');
    prioBadge.textContent = focusTask.priority;
    prioBadge.className = `priority-tag ${focusTask.priority.toLowerCase()}-tag`;

    const completeBtn = document.getElementById('completeFocusTaskBtn');
    completeBtn.onclick = () => {
      focusTask.status = "Completed";
      focusTask.progress = 100;
      saveTasksToStorage();
      renderAllViews();
      showToast("Task marked as completed!");
    };
  }

  function renderDashboardList() {
    const listContainer = document.getElementById('dashboardTaskList');
    if (!listContainer) return;

    const visibleTasks = getFilteredTasks().slice(0, 5);
    if (visibleTasks.length === 0) {
      listContainer.innerHTML = `<p style="padding: 15px; color: #64748b; font-size:13px;">No tasks available.</p>`;
      return;
    }

    listContainer.innerHTML = visibleTasks.map(t => `
      <div class="task-row">
        <div>
          <strong>${t.title}</strong>
          <p style="font-size:12px; color:#64748b;">${userDirectory[t.assignedTo]?.name || t.assignedTo} • Due ${t.deadline}</p>
        </div>
        <span class="status ${t.status.toLowerCase().replace(' ', '-')}">${t.status}</span>
      </div>
    `).join('');
  }

  // --- 7. RENDER TASK TABLE WITH DELETION ---
  function renderTaskTable() {
    const tableBody = document.getElementById('taskTable');
    if (!tableBody) return;

    const search = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const statusFilt = document.getElementById('statusFilter')?.value || 'All';
    const prioFilt = document.getElementById('priorityFilter')?.value || 'All';

    let list = getFilteredTasks().filter(t => {
      const matchSearch = t.title.toLowerCase().includes(search) || t.desc.toLowerCase().includes(search);
      const matchStatus = statusFilt === 'All' || t.status === statusFilt;
      const matchPrio = prioFilt === 'All' || t.priority === prioFilt;
      return matchSearch && matchStatus && matchPrio;
    });

    if (list.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#64748b; padding: 24px;">No tasks found. Use the "+ Create Task" button above to add one.</td></tr>`;
      return;
    }

    tableBody.innerHTML = list.map(t => {
      const canDelete = userDirectory[currentUser].isHOD || currentUser === t.assignedTo;
      return `
        <tr>
          <td>
            <strong>${t.title}</strong><br>
            <small style="color:#64748b">${t.desc}</small>
          </td>
          <td>${userDirectory[t.assignedTo]?.name || t.assignedTo}</td>
          <td><span style="font-size:11px; font-weight:600; color:#475569;">${t.category}</span></td>
          <td><span class="priority-tag ${t.priority.toLowerCase()}-tag">${t.priority}</span></td>
          <td><strong>${t.deadline}</strong></td>
          <td>${t.progress}%</td>
          <td><span class="status ${t.status.toLowerCase().replace(' ', '-')}">${t.status}</span></td>
          <td>
            <div class="table-actions">
              <button class="secondary" onclick="toggleTaskStatus(${t.id})" style="padding: 4px 8px; font-size:11px;">
                ${t.status === 'Completed' ? 'Reopen' : 'Complete'}
              </button>
              ${canDelete ? `<button class="danger-btn" onclick="deleteTask(${t.id})">Delete</button>` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  window.toggleTaskStatus = function(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      task.status = task.status === 'Completed' ? 'In Progress' : 'Completed';
      task.progress = task.status === 'Completed' ? 100 : 50;
      saveTasksToStorage();
      renderAllViews();
      showToast("Task status updated");
    }
  };

  window.deleteTask = function(taskId) {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const task = tasks[taskIndex];
    if (!userDirectory[currentUser].isHOD && currentUser !== task.assignedTo) {
      alert("Permission denied. Only Dr. Nilofar Mulla (HOD) or the assigned faculty can delete this task.");
      return;
    }

    if (confirm(`Are you sure you want to delete task: "${task.title}"?`)) {
      tasks.splice(taskIndex, 1);
      saveTasksToStorage();
      renderAllViews();
      showToast("Task deleted successfully");
    }
  };

  // --- 8. DYNAMIC MONTH/YEAR EVENT CALENDAR ---
  function renderDepartmentCalendar() {
    const daysContainer = document.getElementById('calendarDays');
    const monthTitle = document.getElementById('currentMonthYear');
    if (!daysContainer || !monthTitle) return;

    const year = calendarCurrentDate.getFullYear();
    const month = calendarCurrentDate.getMonth();

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    monthTitle.textContent = `${monthNames[month]} ${year}`;

    daysContainer.innerHTML = '';

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDayIndex; i++) {
      daysContainer.innerHTML += `<div class="day-cell" style="background:#f8fafc; opacity:0.3; border:none; cursor:default;"></div>`;
    }

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const monthStr = (month + 1) < 10 ? `0${month + 1}` : `${month + 1}`;
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      const dateStr = `${year}-${monthStr}-${dayStr}`;

      const dayEvents = departmentalEvents.filter(e => e.date === dateStr);
      const dayTasks = tasks.filter(t => {
        if (t.deadline !== dateStr) return false;
        if (userDirectory[currentUser].isHOD) return true;
        return t.isPublic || t.assignedTo === currentUser;
      });

      let pillsHtml = '';
      dayEvents.forEach(evt => {
        pillsHtml += `<div class="calendar-pill pill-event" title="Event: ${evt.title}">★ ${evt.title}</div>`;
      });

      dayTasks.forEach(task => {
        const catClass = `pill-${task.category.toLowerCase().replace(/[^a-z]/g, '')}`;
        const visibilityTag = task.isPublic ? " (Public)" : "";
        pillsHtml += `<div class="calendar-pill ${catClass}" title="${task.title} - ${userDirectory[task.assignedTo]?.name || task.assignedTo}${visibilityTag}">
          ${task.title}
        </div>`;
      });

      daysContainer.innerHTML += `
        <div class="day-cell" data-date="${dateStr}">
          <span class="date-num">${day}</span>
          ${pillsHtml}
        </div>
      `;
    }

    document.querySelectorAll('.day-cell[data-date]').forEach(cell => {
      cell.addEventListener('click', () => {
        document.querySelectorAll('.day-cell').forEach(c => c.classList.remove('selected-day'));
        cell.classList.add('selected-day');
        showDayDetails(cell.getAttribute('data-date'));
      });
    });
  }

  document.getElementById('prevMonthBtn').addEventListener('click', () => {
    calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() - 1);
    renderDepartmentCalendar();
  });

  document.getElementById('nextMonthBtn').addEventListener('click', () => {
    calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + 1);
    renderDepartmentCalendar();
  });

  function showDayDetails(dateStr) {
    const detailsContainer = document.getElementById('calendarDayDetails');
    const matchedEvents = departmentalEvents.filter(e => e.date === dateStr);
    const matchedTasks = tasks.filter(t => {
      if (t.deadline !== dateStr) return false;
      if (userDirectory[currentUser].isHOD) return true;
      return t.isPublic || t.assignedTo === currentUser;
    });

    if (matchedEvents.length === 0 && matchedTasks.length === 0) {
      detailsContainer.innerHTML = `<h4>Schedule for ${dateStr}</h4><p style="color:#64748b; font-size:13px; margin-top:4px;">No departmental meetings or deliverables due on this day.</p>`;
      return;
    }

    let html = `<h4>Schedule for ${dateStr}</h4><ul style="margin-top:8px; padding-left:18px; font-size:13px; line-height:1.6;">`;
    matchedEvents.forEach(e => {
      html += `<li style="color:#15803d; font-weight:bold;">BVCOEW Milestone: ${e.title}</li>`;
    });
    matchedTasks.forEach(t => {
      const isMine = t.assignedTo === currentUser ? " [Assigned to You]" : "";
      html += `<li><strong>${t.title}</strong> — Assigned: <em>${userDirectory[t.assignedTo]?.name || t.assignedTo}</em> (${t.category} | ${t.status})${isMine}</li>`;
    });
    html += '</ul>';

    detailsContainer.innerHTML = html;
  }

  // --- 9. STATS & WORKLOAD MONITORING ---
  function updateStatsAndWorkload() {
    const list = getFilteredTasks();
    const total = list.length;
    const completed = list.filter(t => t.status === "Completed").length;
    const inProgress = list.filter(t => t.status === "In Progress").length;

    const todayIso = new Date().toISOString().slice(0, 10);
    const overdue = list.filter(t => t.deadline < todayIso && t.status !== "Completed").length;

    document.getElementById('statTotal').textContent = total;
    document.getElementById('statInProgress').textContent = inProgress;
    document.getElementById('statCompleted').textContent = completed;
    document.getElementById('statOverdue').textContent = overdue;

    const rate = total === 0 ? 0 : Math.round((completed / total) * 100);
    const reportRate = document.getElementById('reportCompletionRate');
    const reportBar = document.getElementById('reportProgressBar');
    if (reportRate) reportRate.textContent = `${rate}%`;
    if (reportBar) reportBar.style.width = `${rate}%`;

    const workloadContainer = document.getElementById('facultyWorkloadBars');
    if (workloadContainer && userDirectory[currentUser].isHOD) {
      const allFacultyKeys = ['hod', 'priyanka', 'pallavi', 'ashwini', 'kamlesh', 'seema'];
      workloadContainer.innerHTML = allFacultyKeys.map(k => {
        const count = tasks.filter(t => t.assignedTo === k).length;
        const width = Math.min(count * 20, 100);
        return `
          <div class="faculty-bar-row">
            <div class="faculty-bar-label">
              <span><strong>${userDirectory[k].name}</strong></span>
              <span>${count} Active Deliverables</span>
            </div>
            <div class="big-progress"><i style="width: ${width}%;"></i></div>
          </div>
        `;
      }).join('');
    }
  }

  // --- 10. MODAL & SMART TASK CREATION (HOD & STAFF SUPPORT) ---
  const modal = document.getElementById('taskModal');
  const openBtns = [document.getElementById('openTaskModal'), document.getElementById('openTaskModal2')];
  const closeBtn = document.getElementById('closeModal');
  const taskForm = document.getElementById('taskForm');
  const facultySelect = document.getElementById('taskFacultySelect');
  const publicCheckboxContainer = document.getElementById('publicCheckboxContainer');

  openBtns.forEach(btn => {
    if (btn) {
      btn.onclick = () => {
        const isHOD = userDirectory[currentUser].isHOD;
        
        if (isHOD) {
          document.getElementById('modalHeading').textContent = "Assign New Faculty Task";
          document.getElementById('modalSubheading').textContent = "Assign work to any faculty member or to yourself.";
          document.getElementById('submitTaskBtn').textContent = "Assign Task";
          publicCheckboxContainer.style.display = "block";
          
          // Populate all options for HOD
          facultySelect.innerHTML = `
            <option value="hod">Dr. Nilofar Mulla (HOD / Self)</option>
            <option value="priyanka">Prof. Priyanka Raikar</option>
            <option value="pallavi">Prof. Pallavi Narkhede</option>
            <option value="ashwini">Prof. Ashwini Kanade</option>
            <option value="kamlesh">Prof. Kamlesh Patil</option>
            <option value="seema">Prof. Seema Hadke</option>
          `;
          facultySelect.disabled = false;
        } else {
          // Staff member: locked to themselves
          document.getElementById('modalHeading').textContent = "Create My Task";
          document.getElementById('modalSubheading').textContent = "Add a personal deliverable or academic responsibility.";
          document.getElementById('submitTaskBtn').textContent = "Create My Task";
          publicCheckboxContainer.style.display = "none";
          
          facultySelect.innerHTML = `<option value="${currentUser}">${userDirectory[currentUser].name} (Self)</option>`;
          facultySelect.disabled = true;
        }

        modal.style.display = 'flex';
      };
    }
  });

  if (closeBtn) closeBtn.onclick = () => modal.style.display = 'none';
  window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

  if (taskForm) {
    taskForm.onsubmit = (e) => {
      e.preventDefault();
      const isHOD = userDirectory[currentUser].isHOD;
      const assignedTarget = isHOD ? facultySelect.value : currentUser;

      const newTask = {
        id: Date.now(),
        title: document.getElementById('taskTitleInput').value.trim(),
        desc: document.getElementById('taskDescInput').value.trim() || "No detailed notes provided.",
        assignedTo: assignedTarget,
        priority: document.getElementById('taskPrioritySelect').value,
        deadline: document.getElementById('taskDeadlineInput').value,
        category: document.getElementById('taskCategorySelect').value,
        progress: 0,
        status: "Assigned",
        isPublic: isHOD ? document.getElementById('taskIsPublicCheckbox').checked : false
      };

      tasks.unshift(newTask);
      saveTasksToStorage();
      modal.style.display = 'none';
      taskForm.reset();
      renderAllViews();
      showToast(isHOD ? "Task assigned successfully ✓" : "Personal task created ✓");
    };
  }

  // --- 11. EXCEL / CSV EXPORT ---
  const exportBtn = document.getElementById('exportReportBtn');
  if (exportBtn) {
    exportBtn.onclick = () => {
      if (!userDirectory[currentUser].isHOD) {
        alert("Access Denied.");
        return;
      }

      let csvContent = "\uFEFF";
      csvContent += "Task ID,Task Title,Assigned Faculty,Category,Priority,Deadline,Progress %,Status\n";

      tasks.forEach(t => {
        const cleanTitle = t.title.replace(/"/g, '""');
        const facultyName = (userDirectory[t.assignedTo]?.name || t.assignedTo).replace(/"/g, '""');
        csvContent += `"${t.id}","${cleanTitle}","${facultyName}","${t.category}","${t.priority}","${t.deadline}","${t.progress}%","${t.status}"\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `BVCOEW_Faculty_Task_Report_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("CSV Report downloaded ✓");
    };
  }

  // Filter Listeners
  ['searchInput', 'statusFilter', 'priorityFilter'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', renderTaskTable);
  });

  function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

  function renderAllViews() {
    renderFocusCard();
    renderDashboardList();
    renderTaskTable();
    updateStatsAndWorkload();
    renderDepartmentCalendar();
  }
});
