// --- Mock Data & LocalStorage ---
const DB_KEY = 'student_behavior_db';
const LOGS_KEY = 'system_login_logs';
const SESSIONS_KEY = 'active_sessions_mock';

let casesData = JSON.parse(localStorage.getItem(DB_KEY)) || [];
let systemLogs = JSON.parse(localStorage.getItem(LOGS_KEY)) || [];
let activeSessions = JSON.parse(localStorage.getItem(SESSIONS_KEY)) || {};

// --- State Management ---
let currentUser = null;
let originalCaseState = null; 
let isSidebarOpen = true;
let adminUpdateInterval = null; // Declare interval variable

// --- Config Data ---
const prefixes = ['เด็กชาย', 'เด็กหญิง', 'นาย', 'นางสาว'];
const grades = ['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'];

// --- Utils ---
const showToast = (msg) => {
    const toast = document.getElementById('toast');
    document.getElementById('toast-msg').textContent = msg;
    toast.classList.remove('translate-y-20', 'opacity-0');
    setTimeout(() => toast.classList.add('translate-y-20', 'opacity-0'), 3000);
}

const formatDate = (dateStr) => {
    if(!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

const formatDateTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('th-TH', { hour12: false });
}

// --- Helper Functions for Time Picker (Select Based) ---
function populateTimeSelects() {
    const hours = Array.from({length: 24}, (_, i) => String(i).padStart(2, '0'));
    const minutes = Array.from({length: 60}, (_, i) => String(i).padStart(2, '0'));

    const createOptions = (arr) => arr.map(val => `<option value="${val}">${val}</option>`).join('');

    ['input', 'edit'].forEach(prefix => {
        const hSelect = document.getElementById(`${prefix}-time-hour`);
        const mSelect = document.getElementById(`${prefix}-time-minute`);
        if (hSelect && mSelect) {
            hSelect.innerHTML = createOptions(hours);
            mSelect.innerHTML = createOptions(minutes);
        }
    });
}

function setTimeSelects(prefix, timeStr) {
    if (!timeStr) return;
    const [h, m] = timeStr.split(':');
    const hSelect = document.getElementById(`${prefix}-time-hour`);
    const mSelect = document.getElementById(`${prefix}-time-minute`);
    if (hSelect) hSelect.value = h;
    if (mSelect) mSelect.value = m;
}

function getTimeFromSelects(prefix) {
    const h = document.getElementById(`${prefix}-time-hour`).value;
    const m = document.getElementById(`${prefix}-time-minute`).value;
    return `${h}:${m}`;
}

// Helper for Thai Time (HH:mm)
function getCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

const behaviorLabels = {
    'fight': { label: 'ทะเลาะวิวาท', color: 'text-rose-600 bg-rose-50' },
    'skip': { label: 'หนีเรียน', color: 'text-amber-600 bg-amber-50' },
    'vice': { label: 'อบายมุข', color: 'text-slate-600 bg-slate-100' },
    'relationship': { label: 'ชู้สาว', color: 'text-pink-600 bg-pink-50' }
};

// --- Sidebar Logic (Updated: Smooth Animation & PC Support) ---
function toggleSidebar() {
    // เช็คสถานะปัจจุบันจาก class แทนตัวแปร เพื่อความแม่นยำ
    const sidebar = document.getElementById('main-sidebar');
    const backdrop = document.getElementById('mobile-backdrop');
    
    // ตรวจสอบขนาดหน้าจอ
    if (window.innerWidth >= 1024) { 
        // === Logic สำหรับ PC (ซ่อน/แสดง แบบดันเนื้อหา หรือ หดหายไป) ===
        // ถ้ามี class w-64 แสดงว่าเปิดอยู่ -> ให้ลบออกแล้วใส่ w-0 เพื่อซ่อน
        if (sidebar.classList.contains('w-64') || sidebar.classList.contains('lg:w-64')) {
            sidebar.classList.remove('lg:w-64', 'w-64', 'p-4'); // ลบความกว้างและ padding
            sidebar.classList.add('w-0', 'overflow-hidden'); // ยุบเหลือ 0
            // ซ่อนเนื้อหาภายใน sidebar เพื่อความเนียน
            sidebar.querySelectorAll('.sidebar-text, #user-profile-container, #sidebar-header, nav, .border-t').forEach(el => el.classList.add('hidden'));
        } else {
            // เปิดกลับมา
            sidebar.classList.remove('w-0', 'overflow-hidden');
            sidebar.classList.add('w-64');
            // แสดงเนื้อหากลับมา
            setTimeout(() => { // หน่วงเวลานิดนึงให้ width เริ่มขยายก่อน
                sidebar.querySelectorAll('.sidebar-text, #user-profile-container, #sidebar-header, nav, .border-t').forEach(el => el.classList.remove('hidden'));
            }, 50);
        }
    } else {
        // === Logic สำหรับ Mobile/Tablet (Slide Over) ===
        if (sidebar.classList.contains('-translate-x-full')) {
            // เปิด: ลบ class ที่ดันออกไปซ้าย
            sidebar.classList.remove('-translate-x-full');
            backdrop.classList.remove('hidden');
        } else {
            // ปิด: ดันกลับไปทางซ้าย
            sidebar.classList.add('-translate-x-full');
            backdrop.classList.add('hidden');
        }
    }
}

// Event Listener สำหรับปิดเมนูเมื่อกดเลือกเมนู (เฉพาะมือถือ)
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        if (window.innerWidth < 1024) { 
            document.getElementById('main-sidebar').classList.add('-translate-x-full');
            document.getElementById('mobile-backdrop').classList.add('hidden');
        }
    });
});

// เพิ่ม Event Listener ให้ปิดเมนูอัตโนมัติเมื่อกดเมนูย่อยในมือถือ
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        if (window.innerWidth < 1024) { // ถ้าเป็นมือถือ
            isSidebarOpen = false;
            document.getElementById('main-sidebar').classList.add('-translate-x-full');
            document.getElementById('mobile-backdrop').classList.add('hidden');
        }
    });
});

// --- Realtime Clock ---
function updateRealTime() {
    const now = new Date();
    const datePart = now.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const timePart = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    
    document.getElementById('realtime-clock').textContent = `${datePart} เวลา ${timePart} น.`;

    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    let term = 1;
    let academicYear = year + 543;

    if (month >= 5 && month <= 10) {
        term = 1;
    } else {
        term = 2;
        if (month >= 1 && month <= 4) {
            academicYear = (year - 1) + 543;
        }
    }
    
    const academicInfo = document.getElementById('academic-info');
    if(academicInfo) {
        academicInfo.textContent = `ภาคเรียนที่ ${term} ปีการศึกษา ${academicYear}`;
    }
}
setInterval(updateRealTime, 1000);
updateRealTime();

// --- Logger ---
function logAction(user, action) {
    const entry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        user: user,
        action: action,
        device: navigator.platform
    };
    systemLogs.unshift(entry); 
    if(systemLogs.length > 100) systemLogs.pop();
    localStorage.setItem(LOGS_KEY, JSON.stringify(systemLogs));
}

function updateSession(user, isActive) {
    if(isActive) {
        activeSessions[user] = new Date().toISOString();
    } else {
        delete activeSessions[user];
    }
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(activeSessions));
}

// --- Auto Logout System ---
const AUTO_LOGOUT_TIME = 30 * 60 * 1000; // 30 minutes
let inactivityTimer;

function startAutoLogoutTimer() {
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(event => {
        document.addEventListener(event, resetAutoLogoutTimer);
    });
    resetAutoLogoutTimer();
}

function stopAutoLogoutTimer() {
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(event => {
        document.removeEventListener(event, resetAutoLogoutTimer);
    });
    clearTimeout(inactivityTimer);
}

function resetAutoLogoutTimer() {
    clearTimeout(inactivityTimer);
    if (currentUser) {
        inactivityTimer = setTimeout(() => {
            handleAutoLogout();
        }, AUTO_LOGOUT_TIME);
    }
}

function handleAutoLogout() {
    if (currentUser) {
        logAction(currentUser, 'หมดเวลาเชื่อมต่อ (Auto Logout)');
        updateSession(currentUser, false);
        
        currentUser = null;
        stopAutoLogoutTimer();
        
        document.getElementById('dashboard-layout').classList.add('hidden');
        document.getElementById('login-page').classList.remove('hidden');
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        document.getElementById('login-error').classList.add('hidden');

        if(adminUpdateInterval) clearInterval(adminUpdateInterval);
        
        alert('ระบบทำการออกจากระบบอัตโนมัติ เนื่องจากไม่มีการใช้งานเกิน 30 นาที');
    }
}

// --- Dynamic Student Rows Logic ---
function createStudentRowHTML(index) {
    const prefixOptions = prefixes.map(p => `<option value="${p}">${p}</option>`).join('');
    const gradeOptions = grades.map(g => `<option value="${g}">${g}</option>`).join('');

    return `
    <div class="student-row grid grid-cols-1 md:grid-cols-12 gap-3 p-3 border border-slate-200 rounded-lg bg-white relative animate-[fadeInUp_0.2s_ease-out]">
        ${index > 0 ? `<button type="button" onclick="this.parentElement.remove()" class="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow hover:bg-rose-600">×</button>` : ''}
        
        <div class="md:col-span-2">
            <label class="block text-[10px] text-slate-500 uppercase font-bold mb-1">คำนำหน้า</label>
            <select class="input-prefix form-input w-full px-2 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                ${prefixOptions}
            </select>
        </div>
        <div class="md:col-span-5">
            <label class="block text-[10px] text-slate-500 uppercase font-bold mb-1">ชื่อ-สกุล</label>
            <input type="text" class="input-name form-input w-full px-2 py-2 border border-slate-200 rounded-lg text-sm" placeholder="ชื่อ นามสกุล">
        </div>
        <div class="md:col-span-3">
            <label class="block text-[10px] text-slate-500 uppercase font-bold mb-1">ระดับชั้น</label>
            <select class="input-grade form-input w-full px-2 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                ${gradeOptions}
            </select>
        </div>
        <div class="md:col-span-2">
            <label class="block text-[10px] text-slate-500 uppercase font-bold mb-1">ห้อง</label>
            <input type="text" class="input-room form-input w-full px-2 py-2 border border-slate-200 rounded-lg text-sm text-center" placeholder="1">
        </div>
    </div>`;
}

function addStudentRow(containerId = 'student-container') {
    const container = document.getElementById(containerId);
    const index = container.children.length;
    container.insertAdjacentHTML('beforeend', createStudentRowHTML(index));
}

// --- Behavior Sub-category Logic ---
function toggleViceOptions() {
    const viceRadio = document.querySelector('input[name="behavior"][value="vice"]');
    const container = document.getElementById('vice-sub-options');
    const select = document.getElementById('input-vice-type');
    
    if (viceRadio.checked) {
        container.classList.remove('hidden');
        select.setAttribute('required', 'true');
    } else {
        container.classList.add('hidden');
        select.removeAttribute('required');
        select.value = ""; 
    }
}

function toggleViceOptionsEdit() {
    const behavior = document.getElementById('edit-behavior').value;
    const container = document.getElementById('edit-vice-sub-options');
    
    if (behavior === 'vice') {
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
        document.getElementById('edit-vice-type').value = "";
    }
}

// --- Login Logic ---
function handleLogin(e) {
    e.preventDefault();
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;

    if(pass === '1234' && user.trim() !== '') {
        currentUser = user;
        logAction(user, 'เข้าสู่ระบบ (Login)');
        updateSession(user, true);

        document.getElementById('login-page').classList.add('hidden');
        document.getElementById('dashboard-layout').classList.remove('hidden');
        document.getElementById('display-name').textContent = user === 'admin' ? 'Admin Teacher' : user;
        document.getElementById('display-role').textContent = user === 'admin' ? 'ผู้ดูแลระบบสูงสุด' : 'ครูที่ปรึกษา';
        document.getElementById('user-avatar').textContent = user.substring(0,2).toUpperCase();

        if(user === 'admin') {
            document.getElementById('admin-menu-section').classList.remove('hidden');
        } else {
            document.getElementById('admin-menu-section').classList.add('hidden');
        }

        initDashboard();
        startAutoLogoutTimer();
    } else {
        document.getElementById('login-error').classList.remove('hidden');
    }
}

function handleLogout() {
    if(confirm('ยืนยันการออกจากระบบ?')) {
        if(currentUser) {
            logAction(currentUser, 'ออกจากระบบ (Logout)');
            updateSession(currentUser, false);
        }
        currentUser = null;
        stopAutoLogoutTimer();
        document.getElementById('dashboard-layout').classList.add('hidden');
        document.getElementById('login-page').classList.remove('hidden');
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        document.getElementById('login-error').classList.add('hidden');
    }
}

// --- Navigation ---
function switchPage(pageId) {
    ['view-dashboard', 'view-record', 'view-cases', 'view-admin'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.add('hidden');
    });
    
    ['nav-dashboard', 'nav-record', 'nav-cases', 'nav-admin'].forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.classList.remove('active', 'bg-white/10', 'border-l-4');
            el.classList.add('hover:bg-slate-800/50');
        }
    });

    if(adminUpdateInterval) clearInterval(adminUpdateInterval);

    document.getElementById(`view-${pageId}`).classList.remove('hidden');
    
    const activeNav = document.getElementById(`nav-${pageId}`);
    if(activeNav) {
        activeNav.classList.add('active');
        activeNav.classList.remove('hover:bg-slate-800/50');
    }

    const titles = {
        'dashboard': 'แดชบอร์ด',
        'record': 'บันทึกข้อมูลใหม่',
        'cases': 'รายการประวัติ',
        'admin': 'ระบบตรวจสอบ (Admin Monitor)'
    };
    document.getElementById('page-title').textContent = titles[pageId];

    casesData = JSON.parse(localStorage.getItem(DB_KEY)) || [];
    systemLogs = JSON.parse(localStorage.getItem(LOGS_KEY)) || [];
    activeSessions = JSON.parse(localStorage.getItem(SESSIONS_KEY)) || {};

    if(pageId === 'dashboard') updateStats();
    if(pageId === 'cases') renderTable();
    if(pageId === 'admin') {
        renderAdminPanel();
        adminUpdateInterval = setInterval(renderAdminPanel, 3000); 
    }
}

function renderAdminPanel() {
    activeSessions = JSON.parse(localStorage.getItem(SESSIONS_KEY)) || {};
    systemLogs = JSON.parse(localStorage.getItem(LOGS_KEY)) || [];

    const sessionContainer = document.getElementById('active-sessions-list');
    const users = Object.keys(activeSessions);
    
    if(users.length === 0) {
        sessionContainer.innerHTML = '<div class="col-span-4 text-center text-slate-400 py-4">ไม่มีผู้ใช้งานออนไลน์</div>';
    } else {
        sessionContainer.innerHTML = users.map(u => `
            <div class="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div class="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                    ${u.substring(0,2).toUpperCase()}
                </div>
                <div>
                    <p class="font-bold text-slate-700">${u}</p>
                    <p class="text-xs text-emerald-600 flex items-center gap-1">
                        <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> ออนไลน์
                    </p>
                </div>
            </div>
        `).join('');
    }

    const logTbody = document.getElementById('logs-tbody');
    logTbody.innerHTML = systemLogs.map(log => {
        const isLogin = log.action.includes('Login');
        return `
            <tr class="border-b border-slate-100 hover:bg-slate-50">
                <td class="px-6 py-3 text-slate-500 font-mono text-xs">${formatDateTime(log.timestamp)}</td>
                <td class="px-6 py-3 font-medium text-slate-700">${log.user}</td>
                <td class="px-6 py-3">
                    <span class="px-2 py-1 rounded text-xs font-bold ${isLogin ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}">
                        ${log.action}
                    </span>
                </td>
                <td class="px-6 py-3 text-slate-400 text-xs">${log.device}</td>
            </tr>
        `;
    }).join('');
}

// --- Form Handling (Create) ---
function handleRecordSubmit(e) {
    e.preventDefault();
    
    const behaviors = document.getElementsByName('behavior');
    let selectedBehavior = '';
    for(let b of behaviors) if(b.checked) selectedBehavior = b.value;
    
    let viceDetail = '';
    if(selectedBehavior === 'vice') {
        viceDetail = document.getElementById('input-vice-type').value;
    }

    const studentRows = document.querySelectorAll('#student-container .student-row');
    const studentsList = [];
    
    studentRows.forEach(row => {
        const prefix = row.querySelector('.input-prefix').value;
        const name = row.querySelector('.input-name').value.trim();
        const grade = row.querySelector('.input-grade').value;
        const room = row.querySelector('.input-room').value.trim();
        
        if(name) { 
            studentsList.push({
                prefix: prefix,
                name: name,
                grade: grade,
                room: room
            });
        }
    });

    if(studentsList.length === 0) {
        alert('กรุณากรอกข้อมูลนักเรียนอย่างน้อย 1 คน');
        return;
    }

    const newCase = {
        id: Date.now(),
        date: document.getElementById('input-date').value,
        time: getTimeFromSelects('input'), 
        students: studentsList, 
        behavior: selectedBehavior,
        viceDetail: viceDetail,
        detail: document.getElementById('input-detail').value,
        status: 'pending', 
        timestamp: new Date().toISOString()
    };

    casesData.unshift(newCase);
    localStorage.setItem(DB_KEY, JSON.stringify(casesData));
    
    showToast('บันทึกข้อมูลเรียบร้อยแล้ว');
    resetForm();
}

function resetForm() {
    document.getElementById('record-form').reset();
    document.getElementById('input-date').valueAsDate = new Date();
    setTimeSelects('input', getCurrentTime()); 
    document.getElementById('student-container').innerHTML = '';
    addStudentRow(); 
    toggleViceOptions();
}

// --- Dashboard Stats ---
function updateStats() {
    const total = casesData.length;
    const pending = casesData.filter(c => c.status === 'pending').length;
    const resolved = casesData.filter(c => c.status === 'resolved').length;

    document.getElementById('stat-total').innerText = total;
    document.getElementById('stat-pending').innerText = pending;
    document.getElementById('stat-resolved').innerText = resolved;

    const behaviorCounts = {};
    Object.keys(behaviorLabels).forEach(k => behaviorCounts[k] = 0);
    casesData.forEach(c => {
        if(behaviorCounts[c.behavior] !== undefined) behaviorCounts[c.behavior]++;
        else behaviorCounts[c.behavior] = 1; 
    });

    const allGrades = ['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'];
    const gradeCounts = {};
    allGrades.forEach(g => gradeCounts[g] = 0);
    
    casesData.forEach(c => {
        if (c.students && Array.isArray(c.students)) {
            c.students.forEach(s => {
                if(gradeCounts[s.grade] !== undefined) gradeCounts[s.grade]++;
            });
        } else if (c.grade) {
            if(gradeCounts[c.grade] !== undefined) gradeCounts[c.grade]++;
        }
    });

    renderSimpleChart('chart-behavior', behaviorCounts, behaviorLabels);
    renderSimpleChart('chart-grade', gradeCounts);
}

function renderSimpleChart(containerId, data, labelsMap = null) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    const total = Object.values(data).reduce((a,b)=>a+b, 0);

    Object.entries(data).forEach(([key, value]) => {
        const percentage = total === 0 ? 0 : (value / total) * 100;
        let label = key;
        let colorClass = 'bg-indigo-500';

        if(labelsMap && labelsMap[key]) {
            label = labelsMap[key].label;
            if(key === 'fight') colorClass = 'bg-rose-500';
            if(key === 'skip') colorClass = 'bg-amber-500';
            if(key === 'relationship') colorClass = 'bg-pink-500';
            if(key === 'vice') colorClass = 'bg-slate-500';
        } else {
            if(key.includes('1')) colorClass = 'bg-blue-400';
            if(key.includes('2')) colorClass = 'bg-blue-500';
            if(key.includes('3')) colorClass = 'bg-blue-600';
            if(key.includes('4')) colorClass = 'bg-purple-400';
            if(key.includes('5')) colorClass = 'bg-purple-500';
            if(key.includes('6')) colorClass = 'bg-purple-600';
        }

        container.innerHTML += `
            <div class="flex items-center gap-3 text-sm">
                <div class="w-20 font-medium text-slate-600 truncate">${label}</div>
                <div class="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full ${colorClass} rounded-full" style="width: ${percentage}%"></div>
                </div>
                <div class="w-8 text-right text-slate-500">${value}</div>
            </div>
        `;
    });
}

// --- Table Rendering ---
function renderTable() {
    const tbody = document.getElementById('cases-tbody');
    const statusFilter = document.getElementById('filter-status').value;
    const gradeFilter = document.getElementById('filter-grade').value;
    
    let filteredData = casesData;
    
    if(statusFilter !== 'all') {
        filteredData = filteredData.filter(c => c.status === statusFilter);
    }
    if(gradeFilter !== 'all') {
        filteredData = filteredData.filter(c => {
            if (c.students && Array.isArray(c.students)) {
                return c.students.some(s => s.grade === gradeFilter);
            }
            return c.grade === gradeFilter; 
        });
    }

    if(filteredData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-8 text-center text-slate-400">ไม่พบข้อมูลตามเงื่อนไข</td></tr>';
        return;
    }

    tbody.innerHTML = filteredData.map(c => {
        let bInfo = behaviorLabels[c.behavior] || { label: c.behavior, color: 'text-gray-600 bg-gray-100' };
        
        let behaviorText = bInfo.label;
        if (c.behavior === 'vice' && c.viceDetail) {
            behaviorText += ` (${c.viceDetail})`;
        }

        const statusBadge = c.status === 'resolved' 
            ? '<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">แก้ไขแล้ว</span>'
            : '<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">รอการแก้ไข</span>';

        let studentsDisplay = '';
        let gradesDisplay = '';
        
        if (c.students && Array.isArray(c.students)) {
            if (c.students.length === 1) {
                const s = c.students[0];
                studentsDisplay = `${s.prefix}${s.name}`;
                gradesDisplay = `${s.grade}/${s.room}`;
            } else {
                studentsDisplay = `${c.students[0].prefix}${c.students[0].name} และอีก ${c.students.length - 1} คน`;
                gradesDisplay = `คละระดับชั้น`; 
            }
        } else {
            studentsDisplay = c.name;
            gradesDisplay = `${c.grade}/${c.room}`;
        }

        return `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                <td class="px-6 py-4 whitespace-nowrap text-slate-500">${formatDate(c.date)}</td>
                <td class="px-6 py-4 font-medium text-slate-800" title="${getStudentListTooltip(c)}">${studentsDisplay}</td>
                <td class="px-6 py-4 text-slate-600">${gradesDisplay}</td>
                <td class="px-6 py-4">
                    <span class="px-2.5 py-1 rounded-md text-xs font-bold ${bInfo.color}">${behaviorText}</span>
                </td>
                <td class="px-6 py-4">${statusBadge}</td>
                <td class="px-6 py-4 text-right">
                    <button onclick="openCaseModal(${c.id})" class="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
                        รายละเอียด
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function getStudentListTooltip(c) {
    if (c.students && Array.isArray(c.students)) {
        return c.students.map(s => `${s.prefix}${s.name} (${s.grade}/${s.room})`).join('\n');
    }
    return c.name;
}

// --- MODAL & EDIT ACTIONS ---
function openCaseModal(id) {
    const c = casesData.find(x => x.id === id);
    if(!c) return;

    document.getElementById('edit-id').value = c.id;
    document.getElementById('edit-date').value = c.date;
    setTimeSelects('edit', c.time); 
    document.getElementById('edit-behavior').value = c.behavior;
    document.getElementById('edit-detail').value = c.detail;
    
    toggleViceOptionsEdit();
    if(c.behavior === 'vice' && c.viceDetail) {
        document.getElementById('edit-vice-type').value = c.viceDetail;
    }

    const container = document.getElementById('edit-student-container');
    container.innerHTML = ''; 
    
    if (c.students && Array.isArray(c.students)) {
        c.students.forEach(s => {
            const rowHTML = createStudentRowHTML(container.children.length);
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = rowHTML;
            const row = tempDiv.firstElementChild;
            
            row.querySelector('.input-prefix').value = s.prefix;
            row.querySelector('.input-name').value = s.name;
            row.querySelector('.input-grade').value = s.grade;
            row.querySelector('.input-room').value = s.room;
            
            container.appendChild(row);
        });
    } else {
        const rowHTML = createStudentRowHTML(0);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = rowHTML;
        const row = tempDiv.firstElementChild;
        row.querySelector('.input-name').value = c.name;
        row.querySelector('.input-grade').value = c.grade;
        row.querySelector('.input-room').value = c.room;
        container.appendChild(row);
    }

    originalCaseState = JSON.stringify(getCurrentModalData()); 

    const backdrop = document.getElementById('modal-backdrop');
    const content = document.getElementById('modal-content');
    backdrop.classList.remove('hidden');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function closeModal() {
    const backdrop = document.getElementById('modal-backdrop');
    const content = document.getElementById('modal-content');
    
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    
    setTimeout(() => {
        backdrop.classList.add('hidden');
        originalCaseState = null;
    }, 200);
}

function getCurrentModalData() {
    const id = Number(document.getElementById('edit-id').value);
    const currentDB = casesData.find(x => x.id === id);
    
    const studentRows = document.querySelectorAll('#edit-student-container .student-row');
    const studentsList = [];
    studentRows.forEach(row => {
        studentsList.push({
            prefix: row.querySelector('.input-prefix').value,
            name: row.querySelector('.input-name').value.trim(),
            grade: row.querySelector('.input-grade').value,
            room: row.querySelector('.input-room').value.trim()
        });
    });

    const behavior = document.getElementById('edit-behavior').value;
    const viceDetail = (behavior === 'vice') ? document.getElementById('edit-vice-type').value : '';

    return {
        id: id,
        date: document.getElementById('edit-date').value,
        time: getTimeFromSelects('edit'), 
        students: studentsList,
        behavior: behavior,
        viceDetail: viceDetail,
        detail: document.getElementById('edit-detail').value,
        status: currentDB ? currentDB.status : 'pending',
        timestamp: currentDB ? currentDB.timestamp : new Date().toISOString()
    };
}

function closeModalWithCheck() {
    if(!originalCaseState) { closeModal(); return; }

    const currentData = getCurrentModalData();
    const originalData = JSON.parse(originalCaseState);

    if(JSON.stringify(currentData) !== JSON.stringify(originalData)) {
        if(confirm('มีการแก้ไขข้อมูลที่ยังไม่ได้บันทึก ต้องการบันทึกก่อนปิดหรือไม่?')) {
            saveCaseChanges();
        } else {
            closeModal();
        }
    } else {
        closeModal();
    }
}

function saveCaseChanges() {
    const newData = getCurrentModalData();
    const index = casesData.findIndex(x => x.id === newData.id);
    
    if(index !== -1) {
        casesData[index] = newData;
        localStorage.setItem(DB_KEY, JSON.stringify(casesData));
        showToast('บันทึกการแก้ไขสำเร็จ');
        renderTable(); 
        originalCaseState = JSON.stringify(newData); 
    }
}

function deleteCaseFromModal() {
    if(confirm('ยืนยันการลบเคสนี้ถาวร?')) {
        const id = Number(document.getElementById('edit-id').value);
        casesData = casesData.filter(x => x.id !== id);
        localStorage.setItem(DB_KEY, JSON.stringify(casesData));
        showToast('ลบข้อมูลเรียบร้อย');
        renderTable();
        originalCaseState = null; 
        closeModal();
    }
}

function toggleStatusFromModal() {
    const id = Number(document.getElementById('edit-id').value);
    const index = casesData.findIndex(x => x.id === id);
    
    if(index !== -1) {
        const newStatus = casesData[index].status === 'resolved' ? 'pending' : 'resolved';
        casesData[index].status = newStatus;
        
        localStorage.setItem(DB_KEY, JSON.stringify(casesData));
        
        const btnToggle = document.getElementById('btn-toggle-status');
        if(newStatus === 'resolved') {
            btnToggle.textContent = 'เปลี่ยนเป็น: รอดำเนินการ';
            btnToggle.className = 'px-4 py-2 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg text-sm font-semibold transition-colors';
        } else {
            btnToggle.textContent = 'เปลี่ยนเป็น: ดำเนินการเสร็จสิ้น';
            btnToggle.className = 'px-4 py-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg text-sm font-semibold transition-colors';
        }

        const currentModalData = getCurrentModalData();
        currentModalData.status = newStatus;
        
        showToast(`เปลี่ยนสถานะเป็น ${newStatus === 'resolved' ? 'เสร็จสิ้น' : 'รอดำเนินการ'}`);
        renderTable();
    }
}

function initDashboard() {
    populateTimeSelects(); 
    document.getElementById('input-date').valueAsDate = new Date();
    setTimeSelects('input', getCurrentTime()); 
    
    if(document.getElementById('student-container').children.length === 0) {
        addStudentRow();
    }
    updateStats();
}
// --- ฟังก์ชันเสริม: จัดการ Log (Export & Clear) ---

function exportLogsToTxt() {
    if (systemLogs.length === 0) {
        alert('ไม่มีประวัติให้ดาวน์โหลด');
        return;
    }

    // 1. จัดเตรียมข้อความที่จะใส่ในไฟล์ TXT
    let txtContent = "=== ประวัติการเข้าใช้งานระบบ (วังน้ำเย็นวิทยาคม) ===\n\n";
    systemLogs.forEach(log => {
        txtContent += `เวลา: ${formatDateTime(log.timestamp)}\n`;
        txtContent += `ผู้ใช้งาน: ${log.user}\n`;
        txtContent += `กิจกรรม: ${log.action}\n`;
        txtContent += `อุปกรณ์: ${log.device}\n`;
        txtContent += `---------------------------------------\n`;
    });

    // 2. สร้างไฟล์ Blob (จำลองไฟล์ใน Browser) และสั่งดาวน์โหลด
    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    // ตั้งชื่อไฟล์ตามเวลาปัจจุบัน
    link.download = `system_logs_${new Date().getTime()}.txt`; 
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // คืนหน่วยความจำ
    
    showToast('ดาวน์โหลดไฟล์ TXT สำเร็จ');
}

function clearAdminLogs() {
    if (systemLogs.length === 0) {
        alert('ประวัติว่างเปล่าอยู่แล้ว');
        return;
    }

    // 1. ขั้นตอนที่ 1: บังคับใส่รหัสผ่าน
    const inputPassword = prompt("ความปลอดภัย: กรุณาใส่รหัสผ่าน Admin เพื่อยืนยันการล้างประวัติ");
    
    // เช็คว่ารหัสผ่านตรงกับ '1234' (รหัสเดียวกับตอน Login) หรือไม่
    if (inputPassword === '1234') {
        
        // 2. ขั้นตอนที่ 2: ให้กดยืนยันอีกครั้ง
        if (confirm("⚠️ คุณแน่ใจหรือไม่? การล้างประวัติจะไม่สามารถกู้ข้อมูลคืนได้")) {
            
            // ล้างข้อมูลใน Array
            systemLogs = [];
            localStorage.setItem(LOGS_KEY, JSON.stringify(systemLogs));
            
            showToast('ล้างประวัติระบบเรียบร้อยแล้ว');
            
            // บันทึก Log ใหม่ 1 บรรทัดว่ามีการกดล้างระบบโดยใคร (Best Practice)
            logAction(currentUser, 'ล้างประวัติระบบทั้งหมด (Clear Logs)');
            
            // รีเฟรชตารางให้แสดงผลทันที
            renderAdminPanel(); 
        }
    } else if (inputPassword !== null) {
        // กรณีพิมพ์รหัสผิด (ถ้ากด Cancel จะได้ค่า null ซึ่งเราจะปล่อยผ่าน)
        alert("❌ รหัสผ่านไม่ถูกต้อง! ยกเลิกการล้างข้อมูล");
    }
}
