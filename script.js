document.addEventListener('DOMContentLoaded', () => {
  // --- 1. STATE & USER DATA MANAGEMENT ---
  let currentUser = "admin"; // Options: 'admin', 'facultyA', 'facultyB', 'facultyC'

  // Isolated task lists for each role
  const facultyTasks = {
    admin: [
      { id: 1, title: "Submit NBA documentation", desc: "Accreditation work", faculty: "Faculty A", priority: "High", deadline: "15 Sep 2026", status: "In Progress" },
      { id: 2, title: "Prepare departmental report", desc: "Administrative", faculty: "Faculty B", priority: "High", deadline: "16 Sep 2026", status: "Assigned" },
      { id: 3, title: "Event documentation", desc: "Department event", faculty: "Faculty C", priority: "Medium", deadline: "18 Sep 2026", status: "In Progress" },
      { id: 4, title: "Update academic records", desc: "Academic records", faculty: "Faculty A", priority: "Low", deadline: "10 Sep 2026", status: "Completed" }
    ],
    facultyA: [
      { id: 101, title: "Submit NBA documentation", desc: "Accreditation work", faculty: "Faculty A", priority: "High", deadline: "15 Sep 2026", status: "In Progress" },
      { id: 102, title: "Update academic records", desc: "Academic records", faculty: "Faculty A", priority: "Low", deadline: "10 Sep 2026", status: "Completed" }
    ],
    facultyB: [
      { id: 201, title: "Prepare departmental report", desc: "Administrative", faculty: "Faculty B", priority: "High", deadline: "16 Sep 2026", status: "Assigned" }
    ],
    facultyC: [
      { id: 301, title: "Event documentation", desc: "Department event", faculty: "Faculty C", priority: "Medium", deadline: "18 Sep 2026", status: "In Progress" }
    ]
  };

  // --- 2. INJECT LOGIN UI & SETTINGS VIEW INTO HTML ---
  // Add a login switcher into the sidebar or top bar dynamically so you can test logins
  const sidebarNav = document.querySelector('.sidebar nav');
  if (sidebarNav) {
    const loginDiv = document.createElement('div');
    loginDiv.style.padding = "10px 15px";
    loginDiv.innerHTML = `
      <label style="font-size: 11px; color: var(--muted, #888); display: block; margin-bottom: 4px;">SWITCH ROLE / LOGIN:</label>
      <select id="roleSwitcher" style="width: 100%; padding: 6px; border-radius: 6px; background: var(--bg-card, #f9f9f9); color: inherit; border: 1px solid var(--border, #ddd);">
        <option value="admin">Admin (All Tasks)</option>
        <option value="facultyA">Faculty A</option>
        <option value="facultyB">Faculty B</option>
        <option value="facultyC">Faculty C</option>
      </select>
    `;
    sidebarNav.appendChild(loginDiv);
  }

  // Create a Settings page section dynamically if it doesn't exist
  const mainContainer = document.querySelector('.main');
  if (mainContainer && !document.getElementById('settings')) {
    const settingsSection = document.createElement('section');
    settingsSection.id = 'settings';
    settingsSection.className = 'page';
    settingsSection.innerHTML = `
      <div class="section-head"><div><h2>Settings</h2><p>Manage app preferences and appearance.</p></div></div>
      <div class="panel" style="padding: 20px;">
        <h3>Appearance</h3>
        <label style="display: flex; align-items: center; gap: 10px; margin-top: 15px; cursor: pointer;">
          <input type="checkbox" id="darkModeToggle" style="width: 18px; height: 18px;"> 
          <span>Enable Dark Mode Background</span>
        </label>
      </div>
    `;
    mainContainer.appendChild(settingsSection);

    // Add Settings button to sidebar
    const sidebarBottom = document.querySelector('.sidebar-bottom');
    if (sidebarBottom) {
      const settingsBtn = document.createElement('button');
      settingsBtn.className = 'nav-item';
      settingsBtn.setAttribute('data-page', 'settings');
      settingsBtn.innerHTML = '⚙ <span>Settings</span>';
      sidebarBottom.insertBefore(settingsBtn, sidebarBottom.children[1]);
    }
  }

  // --- 3. NAVIGATION & ROUTING ---
  const navItems = document.querySelectorAll('.nav-item[data-page]');
  const pages = document.querySelectorAll('.page');
  const pageTitle = document.getElementById('pageTitle');

  function switchPage(targetPage) {
    document.querySelectorAll('.nav-item').forEach(nav => {
      if(nav.getAttribute('data-page') === targetPage) nav.classList.add('active');
      else nav.classList.remove('active');
    });

    pages.forEach(page => {
      if (page.id === targetPage) page.classList.add('active-page');
      else page.classList.remove('active-page');
    });

    const titles = {
      dashboard: currentUser === 'admin' ? 'Good morning, Admin 👋' : `Good morning, ${currentUser.toUpperCase()} 👋`,
      tasks: 'Task Management',
      calendar: 'Deadline Calendar',
      reports: 'Reports & Monitoring',
      settings: 'Application Settings'
    };
    if (pageTitle) pageTitle.textContent = titles[targetPage] || 'Faculty TaskFlow';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => switchPage(item.getAttribute('data-page')));
  });

  document.querySelectorAll('[data-page-link]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchPage(link.getAttribute('data-page-link'));
    });
  });

  // --- 4. RENDER TASKS & CHECKBOX LOGIC ---
  function renderTable() {
    const taskTable = document.getElementById('taskTable');
    if (!taskTable) return;

    const tasks = facultyTasks[currentUser] || [];
    
    taskTable.innerHTML = tasks.map(t => {
      const isChecked = t.status === "Completed" ? "checked" : "";
      let priorityClass = "medium-tag";
      if (t.priority === "High") priorityClass = "high-tag";
      if (t.priority === "Low") priorityClass = "low-tag";

      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 10px;">
              <input type="checkbox" class="task-checkbox" data-id="${t.id}" ${isChecked} style="width: 16px; height: 16px; cursor: pointer;" title="Mark as complete">
              <div><strong>${t.title}</strong><small>${t.desc}</small></div>
            </div>
          </td>
          <td>${t.faculty}</td>
          <td><span class="priority-tag ${priorityClass}">${t.priority}</span></td>
          <td>${t.deadline}</td>
          <td>${t.status === "Completed" ? "100%" : "50%"}</td>
          <td><span class="status ${t.status.toLowerCase().replace(' ', '-')}">${t.status}</span></td>
        </tr>
      `;
    }).join('');

    attachCheckboxListeners();
  }

  function attachCheckboxListeners() {
    document.querySelectorAll('.task-checkbox').forEach(box => {
      box.addEventListener('change', (e) => {
        const taskId = Number(e.target.getAttribute('data-id'));
        const task = facultyTasks[currentUser].find(t => t.id === taskId);
        
        if (task) {
          task.status = e.target.checked ? "Completed" : "In Progress";
          renderTable(); // Re-render table instantly to reflect state update
        }
      });
    });
  }

  // Handle Role Switching
  const roleSwitcher = document.getElementById('roleSwitcher');
  if (roleSwitcher) {
    roleSwitcher.addEventListener('change', (e) => {
      currentUser = e.target.value;
      renderTable();
      switchPage('dashboard');
    });
  }

  // --- 5. MODAL CONTROLS ---
  const taskModal = document.getElementById('taskModal');
  const openModalBtns = [document.getElementById('openTaskModal'), document.getElementById('openTaskModal2')];
  const closeModalBtn = document.getElementById('closeModal');
  const taskForm = document.getElementById('taskForm');
  const toast = document.getElementById('toast');

  function openModal() { if (taskModal) taskModal.style.display = 'flex'; }
  function closeModal() { if (taskModal) taskModal.style.display = 'none'; }

  openModalBtns.forEach(btn => { if (btn) btn.addEventListener('click', openModal); });
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  window.addEventListener('click', (e) => { if (e.target === taskModal) closeModal(); });

  // Create Task Submission
  if (taskForm) {
    taskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const titleInput = taskForm.querySelector('input[required]');
      const descInput = taskForm.querySelector('textarea');
      const selects = taskForm.querySelectorAll('select');
      
      const newTask = {
        id: Date.now(),
        title: titleInput.value,
        desc: descInput.value || 'New task',
        faculty: selects[0].value,
        priority: selects[1].value,
        deadline: '20 Sep 2026',
        status: 'Assigned'
      };

      facultyTasks.admin.push(newTask);
      if (facultyTasks[newTask.faculty]) {
        facultyTasks[newTask.faculty].push(newTask);
      }

      renderTable();
      closeModal();
      taskForm.reset();

      if (toast) {
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
      }
    });
  }

  // --- 6. WORKING REPORTS & EXPORT ---
  const exportBtn = document.querySelector('#reports .section-head button') || document.querySelector('.secondary');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const tasks = facultyTasks[currentUser] || [];
      const completedCount = tasks.filter(t => t.status === "Completed").length;
      
      const reportText = `--- TaskFlow Report (${currentUser.toUpperCase()}) ---\nTotal Tasks: ${tasks.length}\nCompleted: ${completedCount}\nPending: ${tasks.length - completedCount}\nDate: ${new Date().toLocaleDateString()}`;
      
      const blob = new Blob([reportText], { type: 'text/plain' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${currentUser}_task_report.txt`;
      link.click();
    });
  }

  // --- 7. DARK MODE TOGGLE ---
  const darkModeToggle = document.getElementById('darkModeToggle');
  if (darkModeToggle) {
    darkModeToggle.addEventListener('change', (e) => {
      if (e.target.checked) {
        document.body.style.backgroundColor = '#121212';
        document.body.style.color = '#e0e0e0';
        localStorage.setItem('theme', 'dark');
      } else {
        document.body.style.backgroundColor = '';
        document.body.style.color = '';
        localStorage.setItem('theme', 'light');
      }
    });

    if (localStorage.getItem('theme') === 'dark') {
      darkModeToggle.checked = true;
      document.body.style.backgroundColor = '#121212';
      document.body.style.color = '#e0e0e0';
    }
  }

  // Initialize initial table view on startup
  renderTable();
});
