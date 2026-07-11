/* ==========================================
   SHAKTICOP WEB APPLICATION CLIENT ENGINE (app.js)
   ========================================== */

// 1. SUPABASE CLIENT & FALLBACK CONFIGURATION
let supabase = null;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Clean up trailing spaces or characters in VITE_SUPABASE_URL
const cleanUrl = supabaseUrl ? supabaseUrl.trim().replace(/\s+yeh\s+rkhu/i, '') : '';
const cleanKey = supabaseKey ? supabaseKey.trim() : '';

const isSupabaseConfigured = cleanUrl && cleanUrl !== 'https://your-project-id.supabase.co' && cleanKey && cleanKey !== 'your-anon-public-key';

if (isSupabaseConfigured) {
  supabase = window.supabase.createClient(cleanUrl, cleanKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  });
  console.log('✅ Supabase Client initialized. Project:', cleanUrl);
  // Verify connectivity on load
  (async () => {
    try {
      const { error } = await supabase.from('categories').select('id').limit(1);
      if (error) {
        console.error('⚠️ Supabase DB connectivity issue:', error.message);
        console.warn('⚠️ Falling back to LocalStorage for this session. Run schema v2 if tables are missing.');
      } else {
        console.log('✅ Supabase DB connectivity confirmed.');
      }
    } catch(e) {
      console.error('❌ Supabase network error:', e.message);
    }
  })();
} else {
  console.warn('⚠️ Supabase keys not configured. Running in Local Mock Storage Simulator mode.');
  console.info('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env to enable Supabase backend.');
}

// 2. STATE VARIABLES
let currentSessionUser = null; // Holds { id, email, role, full_name }

// Helper to map status string to CSS class name dynamically
function getStatusClass(status) {
  if (!status) return 'status-pending';
  const s = status.toLowerCase();
  if (s.includes('pending') || s.includes('received') || s.includes('submitted')) return 'status-pending';
  if (s.includes('investigation') || s.includes('review') || s.includes('progress') || s.includes('under') || s.includes('dispatch')) return 'status-investigation';
  if (s.includes('assigned') || s.includes('scheduled')) return 'status-assigned';
  if (s.includes('resolved') || s.includes('completed')) return 'status-resolved';
  if (s.includes('closed') || s.includes('exported')) return 'status-closed';
  if (s.includes('rejected') || s.includes('cancelled')) return 'status-rejected';
  return 'status-pending';
}

let currentAdminTab = 'dash';
let currentUserDashTab = 'complaints';
let currentLang = localStorage.getItem('shaktiLang') || 'en';
let activePublicTab = 'shakti';
let mediaRecorder = null;
let audioChunks = [];
let recTimer = null;
let recSecs = 0;
let isRecording = false;
let hasRecording = false;
let activeRecordingBlob = null;

// Mock LocalStorage keys for Fallback Simulator
const MOCK_PROFILES = 'mock_profiles';
const MOCK_COMPLAINTS = 'mock_complaints';
const MOCK_ARS_REPORTS = 'mock_ars_reports';
const MOCK_MHD_REQUESTS = 'mock_mhd_requests';
const MOCK_COUNSELLING_BOOKINGS = 'mock_counselling_bookings';
const MOCK_EMPOWERMENT_APPLICATIONS = 'mock_empowerment_applications';
const MOCK_CALLBACK_REQUESTS = 'mock_callback_requests';
const MOCK_EMERGENCY_REQUESTS = 'mock_emergency_requests';
const MOCK_MODULE_HISTORY = 'mock_module_history';
const MOCK_OFFICERS = 'mock_officers';
const MOCK_CONTACTS = 'mock_contacts';
const MOCK_SCHEMES = 'mock_schemes';
const MOCK_ANNOUNCEMENTS = 'mock_announcements';
const MOCK_NOTIFICATIONS = 'mock_notifications';
const MOCK_CATEGORIES = 'mock_categories';
const MOCK_LOGS = 'mock_logs';

// Pagination variables
let adminPageSize = 10;
let adminCurrentPages = {
  complaints: 1,
  ars: 1,
  mhd: 1,
  cns: 1,
  emp: 1,
  logs: 1,
  reports: 1
};

// 3. SEED SIMULATOR DATA (If running in local simulator mode)
function seedSimulatorIfNeeded() {
  if (isSupabaseConfigured) return;
  
  if (!localStorage.getItem(MOCK_CATEGORIES)) {
    localStorage.setItem(MOCK_CATEGORIES, JSON.stringify([
      { id: '1', name: 'Harassment / Eve Teasing' },
      { id: '2', name: 'Domestic Violence' },
      { id: '3', name: 'Stalking' },
      { id: '4', name: 'Cyber Crime' },
      { id: '5', name: 'Dowry Harassment' },
      { id: '6', name: 'Workplace Harassment' },
      { id: '7', name: 'Other' }
    ]));
  }
  
  if (!localStorage.getItem(MOCK_CONTACTS)) {
    localStorage.setItem(MOCK_CONTACTS, JSON.stringify([
      { id: '1', department: 'Mahila Helpdesk', officer_name: 'Nodal Official CUG', designation: 'Nodal Officer', phone_number: '9454406780', photo_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200', availability: true, priority: 10 },
      { id: '2', department: 'Emergency Support', officer_name: 'UP Police', designation: 'Control Room', phone_number: '112', photo_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=200', availability: true, priority: 9 },
      { id: '3', department: 'Anti Romeo Squad', officer_name: 'SI Neha Singh', designation: 'Squad Lead', phone_number: '9454402121', photo_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200', availability: true, priority: 8 },
      { id: '4', department: 'Counselling Center', officer_name: 'Dr. Priya Sharma', designation: 'Chief Counsellor', phone_number: '9454408989', photo_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200', availability: true, priority: 7 }
    ]));
  }

  if (!localStorage.getItem(MOCK_OFFICERS)) {
    localStorage.setItem(MOCK_OFFICERS, JSON.stringify([
      { id: '1', name: 'SI Neha Singh', designation: 'Sub-Inspector', station: 'Civil Lines PS', district: 'Etawah', mobile: '9454402121', email: 'neha.singh@uppolice.gov.in', availability: true, type: 'police', photo_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200' },
      { id: '2', name: 'ASI Pushpa Devi', designation: 'Assistant Sub-Inspector', station: 'Civil Lines PS', district: 'Etawah', mobile: '9454402122', email: 'pushpa.devi@uppolice.gov.in', availability: true, type: 'police', photo_url: 'https://images.unsplash.com/photo-1594744803329-e58b31de215f?auto=format&fit=crop&q=80&w=200' },
      { id: '3', name: 'SI Sarita Yadav', designation: 'Sub-Inspector', station: 'Jaswantnagar PS', district: 'Etawah', mobile: '9454402123', email: 'sarita.yadav@uppolice.gov.in', availability: true, type: 'police', photo_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200' },
      { id: '4', name: 'ASI Poonam Shakya', designation: 'Assistant Sub-Inspector', station: 'Chakarnagar PS', district: 'Etawah', mobile: '9454402124', email: 'poonam.shakya@uppolice.gov.in', availability: true, type: 'police', photo_url: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=200' },
      { id: '5', name: 'Dr. Priya Sharma', designation: 'Chief Counsellor', station: 'District Hospital', district: 'Etawah', mobile: '9454408989', email: 'priya.sharma@uppolice.gov.in', availability: true, type: 'counsellor', photo_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200' },
      { id: '6', name: 'Dr. Rekha Singh', designation: 'Family Counsellor', station: 'One Stop Centre', district: 'Etawah', mobile: '9454408990', email: 'rekha.singh@uppolice.gov.in', availability: true, type: 'counsellor', photo_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200' },
      { id: '7', name: 'Ms. Anita Verma', designation: 'Legal Counsellor', station: 'Family Court', district: 'Etawah', mobile: '9454408991', email: 'anita.verma@uppolice.gov.in', availability: true, type: 'counsellor', photo_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200' }
    ]));
  }

  if (!localStorage.getItem(MOCK_SCHEMES)) {
    localStorage.setItem(MOCK_SCHEMES, JSON.stringify([
      { id: '1', title: 'Mission Shakti', description: 'Women safety and empowerment protection drive across Uttar Pradesh.', eligibility: 'All women residing in UP', benefits: 'Immediate police response, safety patrols, self-defense camps.', website_link: 'https://uppolice.gov.in/', contact: '1090', image_url: 'https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?auto=format&fit=crop&q=80&w=400' },
      { id: '2', title: 'Self Defence Training', description: 'Police organized martial arts and practical self-defence workshops.', eligibility: 'Female residents aged 12-45', benefits: 'Free certification, physical conditioning, safety tactics.', website_link: 'https://uppolice.gov.in/', contact: '0522-2206100', image_url: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&q=80&w=400' },
      { id: '3', title: 'Jan Shikshan Sansthan', description: 'Empowering women through vocational skills and digital literacy courses.', eligibility: 'Literates and non-literates, priority to women', benefits: 'Free skill courses, MSDE certification, self-employment support.', website_link: 'https://jss.gov.in/', contact: '9454408780', image_url: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=400' },
      { id: '4', title: 'Kanya Sumangala Yojana', description: 'Financial assistance scheme offered in six stages from birth to graduation.', eligibility: 'Daughters of UP domicile families with income under 3 Lakhs', benefits: 'DBT transfer of up to Rs 25,000.', website_link: 'https://mksy.up.gov.in/', contact: '1800-180-5302', image_url: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&q=80&w=400' }
    ]));
  }

  if (!localStorage.getItem(MOCK_ANNOUNCEMENTS)) {
    localStorage.setItem(MOCK_ANNOUNCEMENTS, JSON.stringify([
      { id: '1', type: 'Emergency Broadcast', title: 'Anti-Romeo Patrol Intensified', content: 'Patrol squads active near all transit corridors in Etawah.', active: true },
      { id: '2', type: 'Notice', title: 'Self Defence Camps Registration Open', content: 'Apply through your student dashboard.', active: true }
    ]));
  }
}

// 4. GENERAL UI UTILITIES (TOASTS, DIALOGS, LOADER)
window.showToast = function(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) {
    const freshContainer = document.createElement('div');
    freshContainer.id = 'toastContainer';
    freshContainer.style.position = 'fixed';
    freshContainer.style.top = '20px';
    freshContainer.style.right = '20px';
    freshContainer.style.zIndex = '9999';
    document.body.appendChild(freshContainer);
  }
  
  const box = document.createElement('div');
  box.className = `toast-box ${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'warning') icon = '⚠️';
  if (type === 'error') icon = '🚨';
  
  box.innerHTML = `<div>${icon}</div><div>${message}</div><button class="toast-close" onclick="this.parentElement.remove()">✕</button>`;
  document.getElementById('toastContainer').appendChild(box);
  
  setTimeout(() => {
    box.classList.add('toast-fade-out');
    setTimeout(() => box.remove(), 400);
  }, 4000);
};

window.handleLogoError = function(img) {
  const fallback = img?.parentElement?.querySelector('.logo-fallback');
  img.style.display = 'none';
  if (fallback) fallback.hidden = false;
};

function setLoginLoading(isLoading) {
  const btn = document.getElementById('loginSubmitBtn');
  if (!btn) return;
  btn.disabled = isLoading;
  btn.classList.toggle('is-loading', isLoading);
  const label = btn.querySelector('span');
  if (label) label.textContent = isLoading ? 'Signing in...' : 'Login / Sign Up';
}

window.openModal = function(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('open');
    if (id === 'modalLogin') {
      setLoginLoading(false);
      setTimeout(() => document.getElementById('loginEmail')?.focus(), 80);
    }
    if (id === 'modalRegisterComplaint') checkActiveRequest('complaints', 'modalRegisterComplaint', 'complaintForm');
    if (id === 'modalHelpDesk') checkActiveRequest('mhd_requests', 'modalHelpDesk', 'helpDeskForm');
    if (id === 'modalRomeo') checkActiveRequest('ars_reports', 'modalRomeo', 'romeoForm');
    if (id === 'modalDV') checkActiveRequest('emergency_requests', 'modalDV', 'dvForm');
    if (id === 'modalCounsel') checkActiveRequest('counselling_bookings', 'modalCounsel', 'counselForm');
    if (id === 'modalLegalAid') checkActiveRequest('callback_requests', 'modalLegalAid', 'legalAidForm');
    if (id === 'modalAudio') checkActiveRequest('complaints', 'modalAudio', 'audioForm');
    if (id === 'modalTravel') checkActiveRequest('emergency_requests', 'modalTravel', 'travelForm');
  }
};

window.closeModal = function(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('open');
    if (id === 'modalLogin') setLoginLoading(false);
  }
};

// Auto-bind close events on backdrop click
document.querySelectorAll('.modal-overlay').forEach(ov => {
  ov.addEventListener('click', function(e) {
    if (e.target === ov) closeModal(ov.id);
  });
});


// ==========================================
// 5. TRANSLATION MODULE (BILINGUAL SUPPORT)
// ==========================================
const TRANSLATIONS = {
  en: {
    'topbar.women_helpline':'Women Helpline:','topbar.cyber_fraud':'Cyber Fraud:','topbar.emergency':'Emergency:',
    'header.tab_shakti':'Mission Shakti','header.tab_police':'Police Services','header.portal':'Portal','header.sos_btn':'SOS: 112',
    'hero.gov_up':'🌸 Mission Shakti 5.0 — Government of Uttar Pradesh',
    'hero.title':'Your Safety. Your Rights. Your Shakti.','hero.title_span':'Your Shakti.',
    'hero.desc':'Mission Shakti services, women helplines, counselling, shelter homes and police assistance — all in one place.',
    'hero.search_placeholder':'Search Mission Shakti services...',
    'stats.shakti_services':'Shakti Services','stats.districts':'Districts Covered','stats.stations':'Police Stations','stats.availability':'Availability',
    'emergency.title':'Emergency Helplines','sidebar.title':'Quick Navigation',
    'tab.shakti':'Mission Shakti','tab.police':'Police Services','logo.t2':'WOMEN SAFETY & EMPOWERMENT HUB'
  },
  hi: {
    'topbar.women_helpline':'महिला हेल्पलाइन:','topbar.cyber_fraud':'साइबर धोखाधड़ी:','topbar.emergency':'आपातकाल:',
    'header.tab_shakti':'मिशन शक्ति','header.tab_police':'पुलिस सेवाएं','header.portal':'पोर्टल','header.sos_btn':'SOS: 112',
    'hero.gov_up':'🌸 मिशन शक्ति 5.0 — उत्तर प्रदेश सरकार',
    'hero.title':'आपकी सुरक्षा। आपके अधिकार। आपकी शक्ति।','hero.title_span':'आपकी शक्ति।',
    'hero.desc':'मिशन शक्ति सेवाएं, महिला हेल्पलाइन, परामर्श, आश्रय गृह और पुलिस सहायता — सब एक ही स्थान पर।',
    'hero.search_placeholder':'मिशन शक्ति सेवाएं खोजें...',
    'stats.shakti_services':'शक्ति सेवाएं','stats.districts':'जिले कवर किए','stats.stations':'पुलिस थाने','stats.availability':'उपलब्धता',
    'emergency.title':'आपातकालीन हेल्पलाइन','sidebar.title':'त्वरित नेविगेशन',
    'tab.shakti':'मिशन शक्ति','tab.police':'पुलिस सेवाएं','logo.t2':'महिला सुरक्षा एवं सशक्तिकरण केंद्र'
  }
};

window.toggleLanguage = function() {
  currentLang = (currentLang === 'en') ? 'hi' : 'en';
  localStorage.setItem('shaktiLang', currentLang);
  applyLanguage();
};

function applyLanguage() {
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
  
  const logoT2 = document.getElementById('logo-t2');
  const hs = document.getElementById('heroSearch');
  
  if (logoT2) logoT2.textContent = t['logo.t2'];
  if (hs) hs.placeholder = t['hero.search_placeholder'];
  
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.getAttribute('data-i18n');
    if (t[k]) el.textContent = t[k];
  });
  
  const langToggleBtn = document.getElementById('langToggleBtn');
  if (langToggleBtn) {
    langToggleBtn.textContent = currentLang === 'hi' ? '🌐 English' : '🌐 हिन्दी';
  }
  
  fetchEmergencyContacts();
  buildSidebar();
}


// ==========================================
// 6. DYNAMIC CARDS & PUBLIC VIEWS
// ==========================================
function buildSidebar() {
  const sidebarLinks = document.getElementById('sidebarLinks');
  if (!sidebarLinks) return;
  
  const list = activePublicTab === 'shakti' ? [
    { id: 'safety', label: 'Safety & Emergency', icon: '🌸' },
    { id: 'support', label: 'Support & Legal', icon: '💬' },
    { id: 'empower', label: 'Empowerment & Skills', icon: '🎓' }
  ] : [
    { id: 'fir', label: 'FIR & Complaints', icon: '📄' }
  ];
  
  sidebarLinks.innerHTML = list.map(item => `
    <a href="#section-${item.id}" class="sidebar-link" onclick="scrollToSection('section-${item.id}');return false;">
      <span>${item.icon}</span> ${item.label}
    </a>
  `).join('');
}

window.switchTab = function(tab) {
  activePublicTab = tab;
  document.getElementById('nav-shakti').classList.toggle('active', tab === 'shakti');
  document.getElementById('nav-police').classList.toggle('active', tab === 'police');
  
  const navDash = document.getElementById('nav-dashboard');
  if (navDash) navDash.classList.toggle('active', tab === 'dashboard');

  const tShakti = document.getElementById('tab-shakti');
  const tPolice = document.getElementById('tab-police');
  if (tShakti) tShakti.classList.toggle('active', tab === 'shakti');
  if (tPolice) tPolice.classList.toggle('active', tab === 'police');

  const mainWrap = document.getElementById('publicMainWrap');
  const userDash = document.getElementById('userDashboard');
  const hero = document.getElementById('publicHero');
  const emerBar = document.getElementById('publicEmergencyBar');
  const announcementBar = document.getElementById('announcementBar');
  
  if (tab === 'dashboard') {
    if (mainWrap) mainWrap.style.display = 'none';
    if (hero) hero.style.display = 'none';
    if (emerBar) emerBar.style.display = 'none';
    if (userDash) {
      userDash.style.display = 'flex';
      fetchUserDashboardData();
    }
  } else {
    if (userDash) userDash.style.display = 'none';
    if (mainWrap) mainWrap.style.display = 'flex';
    if (hero) hero.style.display = 'block';
    if (emerBar) emerBar.style.display = 'block';
    
    buildSidebar();
    buildContent();
  }
  updateMobileNavState(tab);
};


window.scrollToSection = function(id) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
  }
};

function buildContent() {
  const container = document.getElementById('mainContent');
  if (!container) return;
  
  const categoriesList = activePublicTab === 'shakti' ? [
    {
      id: 'safety', label: 'Safety & Emergency Response', icon: '🌸', accent: '#a61e4d', iconBg: '#fff0f6',
      items: [
        { name: 'Women Powerline 1090', tag: '24x7 Helpline', desc: 'Dedicated women helpline. Immediate call callback assistance.', url: 'tel:1090', icon: '📞' },
        { name: 'Mahila Help Desk', tag: 'Nearest Police Station', desc: 'Direct access to designated female officers. Request callback.', action: "openModal('modalHelpDesk')", icon: '👮‍♀️' },
        { name: 'Anti-Romeo Squad', tag: 'Deploy Squad', desc: 'Report stalking or harassment. Rapid dispatch unit.', action: "openModal('modalRomeo')", icon: '🚔' },
        { name: 'Domestic Violence SOS', tag: 'Emergency Support', desc: 'Immediate dispatch and shelter support for abuse protection.', action: "openModal('modalDV')", icon: '🆘' },
        { name: 'Safe Travel Mode', tag: 'Live Tracking', desc: 'Share your route details. Automated police alert check.', action: "openModal('modalTravel')", icon: '🛡' },
        { name: 'Audio Complaint', tag: 'Voice FIR', desc: 'Register a complaint in your own voice natively.', action: "openModal('modalAudio')", icon: '🎙️' }
      ]
    },
    {
      id: 'support', label: 'Support & Legal Services', icon: '💬', accent: '#5f3dc4', iconBg: '#f3f0ff',
      items: [
        { name: 'Counselling Support', tag: 'Confidential', desc: 'Free counselling with licensed psychological experts.', action: "openModal('modalCounsel')", icon: '💬' },
        { name: 'Legal Aid Referral', tag: 'Free Assistance', desc: 'Referral for free lawyers on domestic acts and safety rules.', action: "openModal('modalLegalAid')", icon: '⚖️' }
      ]
    },
    {
      id: 'empower', label: 'Empowerment & Skills', icon: '🎓', accent: '#0ea5e9', iconBg: '#e0f2fe',
      items: [
        { name: 'Jan Shikshan Sansthan', tag: 'Vocational training', desc: 'Free skills training and certifications for women.', action: "openEmpowerApplyModal('Jan Shikshan Sansthan')", icon: '🏫' },
        { name: 'Self Defence Training', tag: 'Workshops', desc: 'Free safety workshops and certification from police.', action: "openEmpowerApplyModal('Self Defence Training')", icon: '🥋' }
      ]
    }
  ] : [
    {
      id: 'police_services', label: 'Police Services Portal', icon: '👮', accent: '#3b5bdb', iconBg: '#eef2ff',
      items: [
        { name: 'Register Safety Complaint', tag: 'Online Submission', desc: 'File your official complaint to database directly.', action: "openModal('modalRegisterComplaint')", icon: '📝' },
        { name: 'Track Complaint ID', tag: 'Realtime Tracker', desc: 'Track your complaint status and officer timeline.', action: "switchTab('dashboard')", icon: '🔍' },
        { name: 'Register Online FIR', tag: 'Online FIR', desc: 'Access the UP Police official FIR lodging portal.', url: "https://uppolice.gov.in/", icon: '📄' },
        { name: 'File E-FIR', tag: 'E-FIR Cell', desc: 'File an official e-FIR for lost articles or complaints instantly.', action: "openModal('modalRegisterComplaint')", icon: '📝' },
        { name: 'CEIR Mobile Block', tag: 'CEIR Portal', desc: 'Block or track your lost/stolen mobile device nationally.', url: "https://ceir.sancharsaathi.gov.in", icon: '📱' },
        { name: 'Report Cyber Crime', tag: 'Cyber Cell', desc: 'Report cyber financial fraud, hacking, or online harassment.', url: "https://cybercrime.gov.in", icon: '💻' },
        { name: 'Character Certificate', tag: 'Verification', desc: 'Apply online for character certificate and police verification.', url: "https://uppolice.gov.in/", icon: '🎖️' },
        { name: 'File Lost Report', tag: 'UPCOP Lost', desc: 'Report lost documents, mobile phones, or keys instantly.', url: "https://uppolice.gov.in/", icon: '🔍' },
        { name: 'Tenant Verification', tag: 'Verification', desc: 'File police verification for your tenant or domestic helper.', url: "https://uppolice.gov.in/", icon: '🏠' },
        { name: 'Passport Status', tag: 'Verification', desc: 'Track your passport application verification status online.', url: "https://uppolice.gov.in/", icon: '✈️' }
      ]
    }
  ];
  
  container.innerHTML = categoriesList.map(cat => `
    <section id="section-${cat.id}" class="cat-section" style="margin-bottom:40px;">
      <div class="cat-header">
        <div style="background:${cat.iconBg}; color:${cat.accent};" class="cat-icon">${cat.icon}</div>
        <h3>${cat.label}</h3>
        <div class="cat-count">${cat.items.length} Services</div>
      </div>
      <div class="card-grid">
        ${cat.items.map(item => `
          <div class="svc-card" onclick="${item.url ? `window.location.href='${item.url}'` : item.action}" style="--card-accent: ${cat.accent}; --card-icon-bg: ${cat.iconBg}; --card-tag-bg: ${cat.iconBg}; --card-tag-color: ${cat.accent};">
            <div class="svc-card-top">
              <div class="svc-card-icon">${item.icon}</div>
              <span class="svc-tag">${item.tag}</span>
            </div>
            <div class="svc-name">${item.name}</div>
            <div class="svc-desc">${item.desc}</div>
            <div class="svc-link">
              Proceed <span style="margin-left:auto;">➔</span>
            </div>
          </div>
        `).join('')}
      </div>
    </section>
  `).join('');
}

window.openEmpowerApplyModal = function(schemeName) {
  const modal = document.getElementById('modalEmpowerApply');
  if (modal) {
    document.getElementById('emp-scheme-title').value = schemeName;
    document.getElementById('emp-program-display').value = schemeName;
    modal.classList.add('open');
    checkActiveRequest('empowerment_applications', 'modalEmpowerApply', 'empowerForm');
  }
};

// Fetch Helpline Contacts
async function fetchEmergencyContacts() {
  const container = document.getElementById('emerChips');
  if (!container) return;
  
  let list = [];
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('contacts').select('*').order('priority', { ascending: false });
    list = data || [];
  } else {
    list = JSON.parse(localStorage.getItem(MOCK_CONTACTS) || '[]');
  }
  
  container.innerHTML = list.map(c => `
    <a href="tel:${c.phone_number}" class="emer-chip" aria-label="Call ${c.department} at ${c.phone_number}">
      <span class="emer-icon">🚨</span>
      <span class="emer-title">${c.department}</span>
      <strong class="num">${c.phone_number}</strong>
    </a>
  `).join('');
}

// Search utility
window.handleSearch = function(query) {
  const container = document.getElementById('searchResults');
  const mainContent = document.getElementById('mainContent');
  if (!container || !mainContent) return;
  
  if (!query.trim()) {
    container.style.display = 'none';
    mainContent.style.display = 'block';
    return;
  }
  
  mainContent.style.display = 'none';
  container.style.display = 'block';
  
  // Flatten items
  const allItems = [
    { name: 'Women Powerline 1090', tag: 'Helpline', url: 'tel:1090', desc: 'Dedicated women powerline.', icon: '📞' },
    { name: 'Mahila Help Desk', tag: 'Station Desk', action: "openModal('modalHelpDesk')", desc: 'Female officer assistance.', icon: '👮‍♀️' },
    { name: 'Anti-Romeo Squad', tag: 'Patrol', action: "openModal('modalRomeo')", desc: 'Anti Romeo deployment dispatch.', icon: '🚔' },
    { name: 'Domestic Violence SOS', tag: 'SOS', action: "openModal('modalDV')", desc: 'Distress rescue shelter support.', icon: '🆘' },
    { name: 'Safe Travel Monitor', tag: 'Travel', action: "openModal('modalTravel')", desc: 'Live travel monitor route share.', icon: '🛡' },
    { name: 'Audio Complaint Record', tag: 'Voice FIR', action: "openModal('modalAudio')", desc: 'Voice complaint recorder.', icon: '🎙️' },
    { name: 'Counselling Support', tag: 'Counselling', action: "openModal('modalCounsel')", desc: 'Confidential psychiatric support.', icon: '💬' },
    { name: 'Legal Aid Referral', tag: 'Legal', action: "openModal('modalLegalAid')", desc: 'Free panels lawyers.', icon: '⚖️' },
    { name: 'Jan Shikshan Sansthan JSS', tag: 'Vocational', action: "openEmpowerApplyModal('Jan Shikshan Sansthan')", desc: 'Vocational courses training JSS.', icon: '🏫' },
    { name: 'Self Defence Workshops', tag: 'Workshops', action: "openEmpowerApplyModal('Self Defence Training')", desc: 'Self defence training workshops.', icon: '🥋' }
  ];
  
  const matches = allItems.filter(item => 
    item.name.toLowerCase().includes(query.toLowerCase()) || 
    item.desc.toLowerCase().includes(query.toLowerCase()) ||
    item.tag.toLowerCase().includes(query.toLowerCase())
  );
  
  if (matches.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--muted)">No matching services found for "${query}"</div>`;
  } else {
    container.innerHTML = `
      <h3 style="margin-bottom:20px;">Search Results for "${query}"</h3>
      <div class="card-grid">
        ${matches.map(item => `
          <div class="svc-card" onclick="${item.url ? `window.location.href='${item.url}'` : item.action}" style="--card-accent: #3b5bdb; --card-icon-bg: #eef2ff; --card-tag-bg: #eef2ff; --card-tag-color: #3b5bdb;">
            <div class="svc-card-top">
              <div class="svc-card-icon">${item.icon}</div>
              <span class="svc-tag">${item.tag}</span>
            </div>
            <div class="svc-name">${item.name}</div>
            <div class="svc-desc">${item.desc}</div>
            <div class="svc-link">
              Proceed <span style="margin-left:auto;">➔</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
};


// ==========================================
// 7. SECURITY & ACCESS CONTROL
// ==========================================
window.handleLoginSubmit = async function() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  
  if (!email || !password) return;
  setLoginLoading(true);
  
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.warn('Login failed, attempting auto-register:', error.message);
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: undefined }
        });
        
        if (signUpError) {
          if (signUpError.message.includes('already') || signUpError.message.includes('exists') || signUpError.status === 400) {
            const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({ email, password });
            if (retryError) {
              showToast(`Authentication failed: ${retryError.message}`, 'error');
              console.error('Retry login error:', retryError);
            } else {
              let { data: profile } = await supabase.from('profiles').select('role').eq('id', retryData.user.id).single();
              if (!profile) {
                const roleVal = 'user';
                await supabase.from('profiles').upsert({ id: retryData.user.id, email, role: roleVal }, { onConflict: 'id' });
                profile = { role: roleVal };
              }
              currentSessionUser = { id: retryData.user.id, email, role: profile.role };
              showToast('Logged in successfully.', 'success');
              postLoginAction();
            }
          } else {
            showToast(`Authentication failed: ${signUpError.message}`, 'error');
          }
          setLoginLoading(false);
          return;
        }
        
        if (!signUpData.user) {
          showToast('Registration failed. Please check your credentials.', 'error');
          setLoginLoading(false);
          return;
        }
        
        const roleVal = 'user';
        await supabase.from('profiles').upsert({ id: signUpData.user.id, email, role: roleVal }, { onConflict: 'id' });
        showToast('Account created and logged in successfully.', 'success');
        currentSessionUser = { id: signUpData.user.id, email, role: roleVal };
      } else {
        let { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
        if (!profile) {
          const roleVal = 'user';
          await supabase.from('profiles').upsert({ id: data.user.id, email, role: roleVal }, { onConflict: 'id' });
          profile = { role: roleVal };
        }
        currentSessionUser = { id: data.user.id, email, role: profile.role };
        showToast('Logged in successfully.', 'success');
      }
      postLoginAction();
    } catch (err) {
      showToast(`Login failed: ${err.message}`, 'error');
      console.error('Login error:', err);
      setLoginLoading(false);
    }
  } else {
    // Simulator Login
    if (password === 'user@123') {
      currentSessionUser = { id: 'user-id-' + Math.floor(Math.random()*1000), email, role: 'user' };
      showToast("Logged in as Citizen (Local Mock Simulator).", "success");
      postLoginAction();
    } else {
      showToast("Invalid credentials. For citizen use password: user@123", "error");
      setLoginLoading(false);
    }
  }
};

function postLoginAction() {
  closeModal('modalLogin');
  document.getElementById('loginBtn').style.display = 'none';
  
  const userBadge = document.getElementById('userBadge');
  const userBadgeText = document.getElementById('userBadgeText');
  
  if (userBadge && userBadgeText) {
    userBadge.style.display = 'flex';
    userBadgeText.textContent = currentSessionUser.email;
  }
  updateMobileUserChrome();
  
  const navDash = document.getElementById('nav-dashboard');
  if (navDash) navDash.style.display = 'inline-block';
  
  if (currentSessionUser.role === 'admin') {
    // Switch to admin workspace
    document.getElementById('publicSiteWrapper').style.display = 'none';
    document.getElementById('adminWorkspace').style.display = 'flex';
    // Set dynamic admin profile
    const adminName = document.getElementById('adminProfileName');
    const adminRole = document.getElementById('adminProfileRole');
    if (adminName) adminName.textContent = currentSessionUser.email.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase());
    if (adminRole) adminRole.textContent = 'System Administrator — Etawah';
    // Set backend mode badge
    const badge = document.getElementById('backendModeBadge');
    if (badge) {
      badge.textContent = isSupabaseConfigured ? '✅ Supabase Connected' : '⚠️ LocalStorage Mode';
      badge.style.background = isSupabaseConfigured ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)';
      badge.style.color = isSupabaseConfigured ? '#10b981' : '#ef4444';
      badge.style.border = isSupabaseConfigured ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)';
    }
    switchAdminTab('dash');
    subscribeRealtimeEventsAdmin();
  } else {
    switchTab('dashboard');
    subscribeRealtimeEventsUser();
    // Refresh notifications for logged-in citizen
    setTimeout(fetchUserNotifications, 500);
  }
  
  // Load announcements bar for all users
  loadAnnouncementBar();
}

window.doLogout = function() {
  currentSessionUser = null;
  document.getElementById('loginBtn').style.display = 'inline-block';
  
  const userBadge = document.getElementById('userBadge');
  if (userBadge) userBadge.style.display = 'none';
  updateMobileUserChrome();
  
  const navDash = document.getElementById('nav-dashboard');
  if (navDash) navDash.style.display = 'none';
  
  // Clear screens
  document.getElementById('adminWorkspace').style.display = 'none';
  document.getElementById('publicSiteWrapper').style.display = 'block';
  
  switchTab('shakti');
  closeMobileDrawer();
  showToast("Logged out successfully.", "info");
};


// ==========================================
// 8. ISOLATED MODULES SUBMISSION WRAPPERS
// ==========================================

// Helper to write audit/module history log
async function insertHistoryLog(trackingId, status, officerName = null, remarks = 'Record submitted successfully.', email = null) {
  const actor = email || (currentSessionUser ? currentSessionUser.email : 'anonymous@shakticop.gov.in');
  
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('module_history').insert({
      tracking_id: trackingId,
      status: status,
      officer_name: officerName,
      remarks: remarks,
      updated_by_email: actor
    });
    if (error) console.error('History log insert error:', error.message);
  } else {
    const list = JSON.parse(localStorage.getItem(MOCK_MODULE_HISTORY) || '[]');
    list.push({
      id: 'hist-' + Math.floor(Math.random()*100000),
      tracking_id: trackingId,
      status: status,
      officer_name: officerName,
      remarks: remarks,
      updated_by_email: actor,
      created_at: new Date().toISOString()
    });
    localStorage.setItem(MOCK_MODULE_HISTORY, JSON.stringify(list));
  }
}

// Helper to check if active unresolved request exists for a user in a module
window.checkActiveRequest = async function(tableName, modalId, formId) {
  const wrapperId = `${modalId}-active-wrapper`;
  const formEl = document.getElementById(formId);
  const wrapperEl = document.getElementById(wrapperId);
  
  if (!formEl || !wrapperEl) return;
  
  if (!currentSessionUser) {
    formEl.style.display = 'block';
    wrapperEl.style.display = 'none';
    return;
  }
  
  let activeRecord = null;
  const email = currentSessionUser.email;
  
  if (isSupabaseConfigured) {
    const { data } = await supabase.from(tableName)
      .select('*')
      .eq('email', email)
      .not('status', 'in', '("Resolved","Closed","Session Completed")')
      .order('created_at', { ascending: false });
    if (data && data.length > 0) activeRecord = data[0];
  } else {
    let storageKey = '';
    if (tableName === 'complaints') storageKey = MOCK_COMPLAINTS;
    if (tableName === 'ars_reports') storageKey = MOCK_ARS_REPORTS;
    if (tableName === 'mhd_requests') storageKey = MOCK_MHD_REQUESTS;
    if (tableName === 'counselling_bookings') storageKey = MOCK_COUNSELLING_BOOKINGS;
    if (tableName === 'empowerment_applications') storageKey = MOCK_EMPOWERMENT_APPLICATIONS;
    if (tableName === 'callback_requests') storageKey = MOCK_CALLBACK_REQUESTS;
    if (tableName === 'emergency_requests') storageKey = MOCK_EMERGENCY_REQUESTS;
    
    const list = JSON.parse(localStorage.getItem(storageKey) || '[]');
    activeRecord = list.find(r => r.email === email && r.status !== 'Resolved' && r.status !== 'Closed' && r.status !== 'Session Completed');
  }
  
  if (activeRecord) {
    // Show active ticket screen
    formEl.style.display = 'none';
    wrapperEl.style.display = 'block';
    
    wrapperEl.innerHTML = `
      <div class="active-ticket-card">
        <div class="active-ticket-header">
          <span style="font-weight:700; color:var(--navy);">ℹ️ Active Case: ${activeRecord.id}</span>
          <span class="admin-badge ${getStatusClass(activeRecord.status)}">${activeRecord.status}</span>
        </div>
        <div class="active-ticket-detail-row">
          <strong>Filing Date:</strong>
          <span>${new Date(activeRecord.created_at || new Date()).toLocaleDateString()}</span>
        </div>
        <div class="active-ticket-detail-row">
          <strong>Assigned Node:</strong>
          <span>${activeRecord.police_station || activeRecord.assigned_officer_id || 'Pending Allocation'}</span>
        </div>
        <div style="display:flex; gap:10px; margin-top:16px;">
          <button class="admin-btn primary" onclick="trackActiveTicket('${activeRecord.id}', '${modalId}')">🔍 Track Timeline</button>
          <button class="admin-btn" onclick="toggleAddNoteContainer('${modalId}')">💬 Add Additional Note</button>
        </div>
        <div id="${modalId}-add-note-container" style="display:none; margin-top:12px;">
          <textarea id="${modalId}-additional-note" class="admin-textarea" placeholder="Input further remarks or critical updates..." style="min-height:60px; margin-bottom:8px; background:#fff; color:#000; border:1px solid #cbd5e1;"></textarea>
          <button class="admin-btn primary" onclick="submitAdditionalNote('${activeRecord.id}', '${tableName}', '${modalId}')">📤 Submit Note</button>
        </div>
      </div>
    `;
  } else {
    // Clear and show form
    formEl.style.display = 'block';
    wrapperEl.style.display = 'none';
  }
};

window.trackActiveTicket = function(id, modalId) {
  closeModal(modalId);
  switchTab('dashboard');
  document.getElementById('trackInputId').value = id;
  trackRequestById();
};

window.toggleAddNoteContainer = function(modalId) {
  const container = document.getElementById(`${modalId}-add-note-container`);
  if (container) {
    container.style.display = container.style.display === 'none' ? 'block' : 'none';
  }
};

window.submitAdditionalNote = async function(id, tableName, modalId) {
  const noteText = document.getElementById(`${modalId}-additional-note`).value.trim();
  if (!noteText) {
    showToast("Please input some details to submit.", "warning");
    return;
  }
  
  await insertHistoryLog(id, 'Additional Note Submitted', null, `User remark: ${noteText}`);
  showToast("Additional information logged successfully.", "success");
  
  document.getElementById(`${modalId}-additional-note`).value = '';
  document.getElementById(`${modalId}-add-note-container`).style.display = 'none';
};

// Form submit: Standard Complaint
window.submitComplaintForm = async function() {
  const name = document.getElementById('c-name').value.trim();
  const mobile = document.getElementById('c-mobile').value.trim();
  const email = document.getElementById('c-email').value.trim() || (currentSessionUser ? currentSessionUser.email : null);
  const district = document.getElementById('c-district').value;
  const station = document.getElementById('c-station').value;
  const category = document.getElementById('c-category').value;
  const date = document.getElementById('c-date').value;
  const time = document.getElementById('c-time').value;
  const location = document.getElementById('c-location').value.trim();
  const desc = document.getElementById('c-desc').value.trim();
  const anon = document.getElementById('c-anonymous').value === 'true';
  
  if (!name || !mobile || !district || !station || !category || !date || !time || !location || !desc) {
    showToast("Please complete all required fields.", "warning");
    return;
  }
  
  let recordId = '';
  if (isSupabaseConfigured) {
    // Pass empty id so DB trigger generates the proper SC prefixed ID
    const { data, error } = await supabase.from('complaints').insert({
      id: '',
      name: anon ? 'Anonymous Citizen' : name,
      mobile,
      email,
      district,
      police_station: station,
      category,
      incident_date: date,
      incident_time: time,
      location,
      description: desc,
      anonymous: anon
    }).select('id').single();
    
    if (error) {
      showToast(`Complaint filing failed: ${error.message}`, "error");
      console.error('Complaint insert error:', error);
      return;
    }
    recordId = data.id;
  } else {
    // Simulator id
    recordId = 'SC2026' + Math.floor(1000 + Math.random()*9000);
    const complaints = JSON.parse(localStorage.getItem(MOCK_COMPLAINTS) || '[]');
    complaints.push({
      id: recordId,
      name: anon ? 'Anonymous Citizen' : name,
      mobile,
      email,
      district,
      police_station: station,
      category,
      incident_date: date,
      incident_time: time,
      location,
      description: desc,
      anonymous: anon,
      status: 'Pending',
      created_at: new Date().toISOString()
    });
    localStorage.setItem(MOCK_COMPLAINTS, JSON.stringify(complaints));
  }
  
  await insertHistoryLog(recordId, 'Pending', null, 'Complaint registered in database. Awaiting police verification.', email);
  showToast(`Complaint submitted successfully. Reference ID: ${recordId}`, "success");
  closeModal('modalRegisterComplaint');
  document.getElementById('complaintForm').reset();
  
  if (currentSessionUser) {
    fetchUserDashboardData();
  }
};

// Form submit: Mahila Help Desk Call assistance
window.submitHelpDeskForm = async function() {
  const name = document.getElementById('hd-name').value.trim();
  const mobile = document.getElementById('hd-phone').value.trim();
  const email = currentSessionUser ? currentSessionUser.email : 'guest@shakticop.gov.in';
  const district = document.getElementById('hd-district').value;
  const station = document.getElementById('hd-station').value;
  const desc = document.getElementById('hd-desc').value.trim();
  const callback = document.getElementById('hd-callback').checked;
  
  if (!name || !mobile || !district || !station || !desc) {
    showToast("Please fill all required fields.", "warning");
    return;
  }
  
  let recordId = '';
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('mhd_requests').insert({
      id: '', name, mobile, email, district, police_station: station, description: desc, callback_requested: callback
    }).select('id').single();
    if (error) {
      showToast(`Help desk submission failed: ${error.message}`, 'error');
      console.error('MHD insert error:', error);
      return;
    }
    recordId = data.id;
  } else {
    recordId = 'MHD-2026-' + lpad(Math.floor(101 + Math.random()*900).toString(), 6, '0');
    const list = JSON.parse(localStorage.getItem(MOCK_MHD_REQUESTS) || '[]');
    list.push({
      id: recordId, name, mobile, email, district, police_station: station, description: desc, callback_requested: callback, status: 'Submitted', created_at: new Date().toISOString()
    });
    localStorage.setItem(MOCK_MHD_REQUESTS, JSON.stringify(list));
  }
  
  await insertHistoryLog(recordId, 'Submitted', null, 'Mahila Help Desk callback requested.', email);
  showToast(`Request submitted successfully. Tracking ID: ${recordId}`, 'success');
  closeModal('modalHelpDesk');
  document.getElementById('helpDeskForm').reset();
  if (currentSessionUser) fetchUserDashboardData();
};

// Form submit: Anti Romeo dispatch patrol
window.submitRomeoForm = async function() {
  const name = document.getElementById('ar-name').value.trim() || 'Anonymous';
  const mobile = document.getElementById('ar-phone').value.trim();
  const email = currentSessionUser ? currentSessionUser.email : 'guest@shakticop.gov.in';
  const location = document.getElementById('ar-location').value.trim();
  const district = document.getElementById('ar-district').value;
  const desc = document.getElementById('ar-desc').value.trim();
  
  if (!mobile || !location || !district || !desc) {
    showToast("Please complete required details.", "warning");
    return;
  }
  
  let recordId = '';
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('ars_reports').insert({
      id: '', name, mobile, email, location, district, description: desc
    }).select('id').single();
    if (error) {
      showToast(`Anti-Romeo dispatch request failed: ${error.message}`, 'error');
      console.error('ARS insert error:', error);
      return;
    }
    recordId = data.id;
  } else {
    recordId = 'ARS-2026-' + lpad(Math.floor(101 + Math.random()*900).toString(), 6, '0');
    const list = JSON.parse(localStorage.getItem(MOCK_ARS_REPORTS) || '[]');
    list.push({
      id: recordId, name, mobile, email, location, district, description: desc, status: 'Submitted', created_at: new Date().toISOString()
    });
    localStorage.setItem(MOCK_ARS_REPORTS, JSON.stringify(list));
  }
  
  await insertHistoryLog(recordId, 'Submitted', null, 'Distress patrol report logged. Dispatch pending review.', email);
  showToast(`Anti-Romeo Squad notified. Tracking ID: ${recordId}`, 'success');
  closeModal('modalRomeo');
  document.getElementById('romeoForm').reset();
  if (currentSessionUser) fetchUserDashboardData();
};

// Form submit: Domestic Violence SOS
window.submitDVForm = async function() {
  const name = document.getElementById('dv-name').value.trim();
  const mobile = document.getElementById('dv-phone').value.trim();
  const email = currentSessionUser ? currentSessionUser.email : 'guest@shakticop.gov.in';
  const district = document.getElementById('dv-district').value;
  const location = document.getElementById('dv-location').value.trim();
  const helpType = document.getElementById('dv-help-type').value;
  
  if (!name || !mobile || !district || !location) {
    showToast("Please fill all details to proceed.", "warning");
    return;
  }
  
  let recordId = '';
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('emergency_requests').insert({
      id: '', name, mobile, email, district, location, type: helpType
    }).select('id').single();
    if (error) {
      showToast(`SOS distress trigger failed: ${error.message}`, 'error');
      console.error('SOS insert error:', error);
      return;
    }
    recordId = data.id;
  } else {
    recordId = 'SOS-2026-' + lpad(Math.floor(101 + Math.random()*900).toString(), 6, '0');
    const list = JSON.parse(localStorage.getItem(MOCK_EMERGENCY_REQUESTS) || '[]');
    list.push({
      id: recordId, name, mobile, email, district, location, type: helpType, status: 'Submitted', created_at: new Date().toISOString()
    });
    localStorage.setItem(MOCK_EMERGENCY_REQUESTS, JSON.stringify(list));
  }
  
  await insertHistoryLog(recordId, 'Submitted', null, 'Emergency SOS alarm triggered at control center.', email);
  showToast(`DISTRESS SIGNAL DELIVERED. Patrol dispatch initiated. Tracking ID: ${recordId}`, 'success');
  closeModal('modalDV');
  document.getElementById('dvForm').reset();
  if (currentSessionUser) fetchUserDashboardData();
};

// Form submit: Counselling Booking
window.submitCounsellorBooking = async function() {
  const name = document.getElementById('cn-name').value.trim();
  const mobile = document.getElementById('cn-phone').value.trim();
  const email = currentSessionUser ? currentSessionUser.email : 'guest@shakticop.gov.in';
  const district = document.getElementById('cn-district').value;
  const prefDate = document.getElementById('cn-pref-date').value;
  const prefTime = document.getElementById('cn-pref-time').value;
  const reason = document.getElementById('cn-reason').value.trim();
  
  if (!name || !mobile || !district || !prefDate || !prefTime || !reason) {
    showToast("Please fill all fields.", "warning");
    return;
  }
  
  let recordId = '';
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('counselling_bookings').insert({
      id: '', name, mobile, email, district, preferred_date: prefDate, preferred_time: prefTime, reason: reason
    }).select('id').single();
    if (error) {
      showToast(`Counselling session booking failed: ${error.message}`, 'error');
      console.error('CNS insert error:', error);
      return;
    }
    recordId = data.id;
  } else {
    recordId = 'CNS-2026-' + lpad(Math.floor(101 + Math.random()*900).toString(), 6, '0');
    const list = JSON.parse(localStorage.getItem(MOCK_COUNSELLING_BOOKINGS) || '[]');
    list.push({
      id: recordId, name, mobile, email, district, preferred_date: prefDate, preferred_time: prefTime, reason: reason, status: 'Application Received', created_at: new Date().toISOString()
    });
    localStorage.setItem(MOCK_COUNSELLING_BOOKINGS, JSON.stringify(list));
  }
  
  await insertHistoryLog(recordId, 'Application Received', null, 'Counselling booking received by center specialists.', email);
  showToast(`Counselling request booked successfully. Booking ID: ${recordId}`, 'success');
  closeModal('modalCounsel');
  document.getElementById('counselForm').reset();
  if (currentSessionUser) fetchUserDashboardData();
};

// Form submit: Welfare empowerment application (JSS / Self Defence)
window.submitProgramEnrollment = async function() {
  const schemeTitle = document.getElementById('emp-scheme-title').value;
  const name = document.getElementById('emp-name').value.trim();
  const mobile = document.getElementById('emp-phone').value.trim();
  const age = document.getElementById('emp-age').value.trim();
  const gender = document.getElementById('emp-gender').value;
  const district = document.getElementById('emp-district').value;
  const email = currentSessionUser ? currentSessionUser.email : 'guest@shakticop.gov.in';
  
  if (!name || !mobile || !age || !gender || !district) {
    showToast("Please fill all fields.", "warning");
    return;
  }
  
  let recordId = '';
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('empowerment_applications').insert({
      id: '', scheme_title: schemeTitle, name, mobile, age: parseInt(age), gender, district, email
    }).select('id').single();
    if (error) {
      showToast(`Program enrollment failed: ${error.message}`, 'error');
      console.error('EMP insert error:', error);
      return;
    }
    recordId = data.id;
  } else {
    recordId = 'SCH-2026-' + lpad(Math.floor(101 + Math.random()*900).toString(), 6, '0');
    const list = JSON.parse(localStorage.getItem(MOCK_EMPOWERMENT_APPLICATIONS) || '[]');
    list.push({
      id: recordId, scheme_title: schemeTitle, name, mobile, age: parseInt(age), gender, district, email, status: 'Application Received', created_at: new Date().toISOString()
    });
    localStorage.setItem(MOCK_EMPOWERMENT_APPLICATIONS, JSON.stringify(list));
  }
  
  await insertHistoryLog(recordId, 'Application Received', null, `Applied for ${schemeTitle} program catalog.`, email);
  showToast(`Scheme Application registered. ID: ${recordId}`, 'success');
  closeModal('modalEmpowerApply');
  document.getElementById('empowerForm').reset();
  if (currentSessionUser) fetchUserDashboardData();
};

// Form submit: Legal Aid Referral / Callback Request
window.submitLegalForm = async function() {
  const name = document.getElementById('la-name').value.trim();
  const mobile = document.getElementById('la-phone').value.trim();
  const district = document.getElementById('la-district').value;
  const desc = document.getElementById('la-desc').value.trim();
  const email = currentSessionUser ? currentSessionUser.email : 'guest@shakticop.gov.in';
  
  if (!name || !mobile || !district || !desc) {
    showToast("Please fill all fields.", "warning");
    return;
  }
  
  let recordId = '';
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('callback_requests').insert({
      name, mobile, district, reason: desc, email, police_station: 'Legal Aid Cell'
    }).select('id').single();
    if (error) {
      showToast(`Legal Aid referral filing failed: ${error.message}`, 'error');
      return;
    }
    recordId = data.id;
  } else {
    recordId = 'FOB-2026-' + lpad(Math.floor(101 + Math.random()*900).toString(), 6, '0');
    const list = JSON.parse(localStorage.getItem(MOCK_CALLBACK_REQUESTS) || '[]');
    list.push({
      id: recordId, name, mobile, district, reason: desc, email, police_station: 'Legal Aid Cell', status: 'Submitted', created_at: new Date().toISOString()
    });
    localStorage.setItem(MOCK_CALLBACK_REQUESTS, JSON.stringify(list));
  }
  
  await insertHistoryLog(recordId, 'Submitted', null, 'Legal Aid Referral filed successfully.', email);
  showToast(`Legal Consultation registered. Referral ID: ${recordId}`, 'success');
  closeModal('modalLegalAid');
  document.getElementById('legalAidForm').reset();
  if (currentSessionUser) fetchUserDashboardData();
};

// Form submit: Safe Travel Monitor
window.submitTravelForm = async function() {
  const name = document.getElementById('tr-name').value.trim();
  const mobile = document.getElementById('tr-phone').value.trim();
  const district = document.getElementById('tr-district').value;
  const transport = document.getElementById('tr-transport').value;
  const plate = document.getElementById('tr-vehicle-num').value.trim();
  const start = document.getElementById('tr-start').value.trim();
  const end = document.getElementById('tr-end').value.trim();
  const email = currentSessionUser ? currentSessionUser.email : 'guest@shakticop.gov.in';
  
  if (!name || !mobile || !district || !plate || !start || !end) {
    showToast("Please fill all fields.", "warning");
    return;
  }
  
  let recordId = '';
  const desc = `Safe Travel monitored: Route ${start} to ${end} in ${transport} (${plate}).`;
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('emergency_requests').insert({
      name, mobile, email, district, location: start, type: 'Safe Travel Mode', remarks: desc
    }).select('id').single();
    if (error) {
      showToast(`Safe Travel mode start failed: ${error.message}`, 'error');
      return;
    }
    recordId = data.id;
  } else {
    recordId = 'SOS-2026-' + lpad(Math.floor(101 + Math.random()*900).toString(), 6, '0');
    const list = JSON.parse(localStorage.getItem(MOCK_EMERGENCY_REQUESTS) || '[]');
    list.push({
      id: recordId, name, mobile, email, district, location: start, type: 'Safe Travel Mode', remarks: desc, status: 'Submitted', created_at: new Date().toISOString()
    });
    localStorage.setItem(MOCK_EMERGENCY_REQUESTS, JSON.stringify(list));
  }
  
  await insertHistoryLog(recordId, 'Submitted', null, 'Safe Travel GPS monitoring activated.', email);
  showToast(`SAFE JOURNEY TRACKER RUNNING. Reference ID: ${recordId}`, 'success');
  closeModal('modalTravel');
  document.getElementById('travelForm').reset();
  if (currentSessionUser) fetchUserDashboardData();
};


// ==========================================
// 9. REALTIME TIMELINE TRACKING SYSTEM
// ==========================================
window.trackRequestById = async function() {
  const queryId = document.getElementById('trackInputId').value.trim();
  const resultArea = document.getElementById('trackResultArea');
  
  if (!queryId) {
    showToast("Please input a tracking reference ID.", "warning");
    return;
  }
  
  resultArea.style.display = 'block';
  resultArea.innerHTML = '<div class="skeleton" style="height:120px; width:100%;"></div>';
  
  // Find record
  let record = null;
  let historyLogs = [];
  
  // Try querying table based on prefix ID
  const prefix = queryId.split('-')[0].toUpperCase();
  
  if (isSupabaseConfigured) {
    // 1. Query table
    let table = '';
    if (queryId.startsWith('SC')) table = 'complaints';
    else if (prefix === 'ARS') table = 'ars_reports';
    else if (prefix === 'MHD') table = 'mhd_requests';
    else if (prefix === 'CNS') table = 'counselling_bookings';
    else if (prefix === 'SCH') table = 'empowerment_applications';
    else if (prefix === 'FOB') table = 'callback_requests';
    else if (prefix === 'SOS') table = 'emergency_requests';
    
    if (table) {
      const { data } = await supabase.from(table).select('*').eq('id', queryId).single();
      record = data;
    }
    
    // 2. Fetch history logs
    const { data: logs } = await supabase.from('module_history').select('*').eq('tracking_id', queryId).order('created_at', { ascending: false });
    historyLogs = logs || [];
  } else {
    // Local storage simulator logic
    let list = [];
    if (queryId.startsWith('SC')) list = JSON.parse(localStorage.getItem(MOCK_COMPLAINTS) || '[]');
    else if (prefix === 'ARS') list = JSON.parse(localStorage.getItem(MOCK_ARS_REPORTS) || '[]');
    else if (prefix === 'MHD') list = JSON.parse(localStorage.getItem(MOCK_MHD_REQUESTS) || '[]');
    else if (prefix === 'CNS') list = JSON.parse(localStorage.getItem(MOCK_COUNSELLING_BOOKINGS) || '[]');
    else if (prefix === 'SCH') list = JSON.parse(localStorage.getItem(MOCK_EMPOWERMENT_APPLICATIONS) || '[]');
    else if (prefix === 'FOB') list = JSON.parse(localStorage.getItem(MOCK_CALLBACK_REQUESTS) || '[]');
    else if (prefix === 'SOS') list = JSON.parse(localStorage.getItem(MOCK_EMERGENCY_REQUESTS) || '[]');
    
    record = list.find(r => r.id === queryId);
    historyLogs = JSON.parse(localStorage.getItem(MOCK_MODULE_HISTORY) || '[]').filter(h => h.tracking_id === queryId);
    historyLogs.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  }
  
  if (!record) {
    resultArea.innerHTML = `<div style="color:var(--red); font-size:12px; font-weight:600;">⚠️ Reference ID "${queryId}" not found in registries.</div>`;
    return;
  }
  
  // Render details & timeline
  let timelineHTML = '';
  if (historyLogs.length === 0) {
    timelineHTML = `<div class="timeline-event">
      <div class="timeline-event-time">${new Date(record.created_at || new Date()).toLocaleString()}</div>
      <div><strong>Record Submitted</strong></div>
      <div style="color:var(--muted); font-size:11px;">Case added to dispatcher pipeline.</div>
    </div>`;
  } else {
    timelineHTML = historyLogs.map(log => `
      <div class="timeline-event">
        <div class="timeline-event-time">${new Date(log.created_at).toLocaleString()}</div>
        <div><strong>Status Update: <span class="admin-badge ${getStatusClass(log.status)}" style="font-size:10px; padding:1px 4px;">${log.status}</span></strong></div>
        ${log.officer_name ? `<div style="font-size:11px; color:var(--navy);">Assigned Officer: ${log.officer_name}</div>` : ''}
        <div style="color:var(--muted); font-size:11px;">Remarks: ${log.remarks}</div>
      </div>
    `).join('');
  }
  
  resultArea.innerHTML = `
    <div style="background:#fff; border:1px solid var(--border); border-radius:10px; padding:14px; box-shadow: 0 4px 6px rgba(0,0,0,0.02)">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <span style="font-size:12px; font-weight:700; color:var(--navy);">${record.id} [${prefix || 'COMPLAINT'}]</span>
        <span class="admin-badge ${getStatusClass(record.status || 'Submitted')}">${record.status || 'Submitted'}</span>
      </div>
      <div style="font-size:11px; color:var(--muted); margin-bottom:12px; border-bottom:1px solid var(--border); padding-bottom:8px;">
        <strong>Details:</strong> ${record.description || record.remarks || 'No details entered.'}
      </div>
      <div class="active-ticket-timeline">
        ${timelineHTML}
      </div>
    </div>
  `;
};


// ==========================================
// 10. CITIZEN DASHBOARD LAYOUT CONTROLLERS
// ==========================================
window.switchUserDashboardTab = function(tabName) {
  currentUserDashTab = tabName;
  document.querySelectorAll('.user-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.toLowerCase().includes(tabName.substring(0, 3)));
  });
  
  // Set filters
  document.getElementById('uSearchQuery').value = '';
  
  const statusFilter = document.getElementById('uFilterStatus');
  statusFilter.innerHTML = '<option value="">All Status</option>';
  
  const title = document.getElementById('userDashboardTabTitle');
  if (tabName === 'complaints') {
    title.textContent = '📋 My Standard & Voice Complaints';
    statusFilter.innerHTML += `
      <option value="Pending">Pending</option>
      <option value="Under Investigation">Under Investigation</option>
      <option value="Assigned">Assigned</option>
      <option value="Resolved">Resolved</option>
    `;
  } else if (tabName === 'ars') {
    title.textContent = '🚔 My Anti-Romeo Incidents';
    statusFilter.innerHTML += `
      <option value="Submitted">Submitted</option>
      <option value="Pending Review">Pending Review</option>
      <option value="Officer Assigned">Officer Assigned</option>
      <option value="In Progress">In Progress</option>
      <option value="Resolved">Resolved</option>
    `;
  } else if (tabName === 'mhd') {
    title.textContent = '👮 My Mahila Help Desk Callbacks';
    statusFilter.innerHTML += `
      <option value="Submitted">Submitted</option>
      <option value="Call Back Requested">Call Back Requested</option>
      <option value="Officer Assigned">Officer Assigned</option>
      <option value="Issue Under Review">Issue Under Review</option>
      <option value="Resolved">Resolved</option>
    `;
  } else if (tabName === 'cns') {
    title.textContent = '💬 My Counselling Sessions';
    statusFilter.innerHTML += `
      <option value="Application Received">Application Received</option>
      <option value="Session Pending">Session Pending</option>
      <option value="Session Scheduled">Session Scheduled</option>
      <option value="Session Completed">Session Completed</option>
    `;
  } else if (tabName === 'emp') {
    title.textContent = '🎓 My Welfare & JSS Enrollments';
    statusFilter.innerHTML += `
      <option value="Application Received">Application Received</option>
      <option value="Exported">Exported</option>
      <option value="Closed">Closed</option>
    `;
  } else if (tabName === 'sos') {
    title.textContent = '🆘 My SOS distress Signals';
    statusFilter.innerHTML += `
      <option value="Submitted">Submitted</option>
      <option value="Dispatched">Dispatched</option>
      <option value="Resolved">Resolved</option>
    `;
  }
  
  fetchUserDashboardData();
  updateMobileNavState('dashboard');
};

window.fetchUserDashboardData = async function() {
  const tbody = document.getElementById('userDashboardTableBody');
  const thead = document.getElementById('userDashboardTableHeader');
  if (!tbody || !thead || !currentSessionUser) return;
  
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;"><div class="skeleton" style="height:30px; width:100%;"></div></td></tr>';
  
  const query = document.getElementById('uSearchQuery').value.trim();
  const status = document.getElementById('uFilterStatus').value;
  const email = currentSessionUser.email;
  
  let list = [];
  
  // Set specific table headers & fetch data
  if (currentUserDashTab === 'complaints') {
    thead.innerHTML = `
      <th>ID</th>
      <th>Category</th>
      <th>District</th>
      <th>Incident Date</th>
      <th>Status</th>
      <th>Actions</th>
    `;
    
    if (isSupabaseConfigured) {
      let q = supabase.from('complaints').select('*').eq('email', email);
      if (status) q = q.eq('status', status);
      const { data } = await q.order('created_at', { ascending: false });
      list = data || [];
    } else {
      list = JSON.parse(localStorage.getItem(MOCK_COMPLAINTS) || '[]').filter(r => r.email === email);
    }
    
  } else if (currentUserDashTab === 'ars') {
    thead.innerHTML = `
      <th>ID</th>
      <th>Location</th>
      <th>District</th>
      <th>Report Date</th>
      <th>Status</th>
      <th>Actions</th>
    `;
    
    if (isSupabaseConfigured) {
      let q = supabase.from('ars_reports').select('*').eq('email', email);
      if (status) q = q.eq('status', status);
      const { data } = await q.order('created_at', { ascending: false });
      list = data || [];
    } else {
      list = JSON.parse(localStorage.getItem(MOCK_ARS_REPORTS) || '[]').filter(r => r.email === email);
    }
    
  } else if (currentUserDashTab === 'mhd') {
    thead.innerHTML = `
      <th>ID</th>
      <th>Station</th>
      <th>Callback Req</th>
      <th>Submission Date</th>
      <th>Status</th>
      <th>Actions</th>
    `;
    
    if (isSupabaseConfigured) {
      let q = supabase.from('mhd_requests').select('*').eq('email', email);
      if (status) q = q.eq('status', status);
      const { data } = await q.order('created_at', { ascending: false });
      list = data || [];
    } else {
      list = JSON.parse(localStorage.getItem(MOCK_MHD_REQUESTS) || '[]').filter(r => r.email === email);
    }
    
  } else if (currentUserDashTab === 'cns') {
    thead.innerHTML = `
      <th>ID</th>
      <th>Pref Date</th>
      <th>Allotted Counselor</th>
      <th>Session Schedule</th>
      <th>Status</th>
      <th>Actions</th>
    `;
    
    if (isSupabaseConfigured) {
      let q = supabase.from('counselling_bookings').select('*, assigned_counsellor_id(name)').eq('email', email);
      if (status) q = q.eq('status', status);
      const { data } = await q.order('created_at', { ascending: false });
      list = data || [];
    } else {
      list = JSON.parse(localStorage.getItem(MOCK_COUNSELLING_BOOKINGS) || '[]').filter(r => r.email === email);
    }
    
  } else if (currentUserDashTab === 'emp') {
    thead.innerHTML = `
      <th>ID</th>
      <th>Program</th>
      <th>Applicant Name</th>
      <th>Age / Gender</th>
      <th>Status</th>
      <th>Actions</th>
    `;
    
    if (isSupabaseConfigured) {
      let q = supabase.from('empowerment_applications').select('*').eq('email', email);
      if (status) q = q.eq('status', status);
      const { data } = await q.order('created_at', { ascending: false });
      list = data || [];
    } else {
      list = JSON.parse(localStorage.getItem(MOCK_EMPOWERMENT_APPLICATIONS) || '[]').filter(r => r.email === email);
    }
    
  } else if (currentUserDashTab === 'sos') {
    thead.innerHTML = `
      <th>ID</th>
      <th>Location</th>
      <th>SOS Alert Type</th>
      <th>Distress Date</th>
      <th>Status</th>
      <th>Actions</th>
    `;
    
    if (isSupabaseConfigured) {
      let q = supabase.from('emergency_requests').select('*').eq('email', email);
      if (status) q = q.eq('status', status);
      const { data } = await q.order('created_at', { ascending: false });
      list = data || [];
    } else {
      list = JSON.parse(localStorage.getItem(MOCK_EMERGENCY_REQUESTS) || '[]').filter(r => r.email === email);
    }
  }

  // Filter local listings if search query is entered
  if (query) {
    list = list.filter(r => 
      r.id.toLowerCase().includes(query.toLowerCase()) || 
      (r.description && r.description.toLowerCase().includes(query.toLowerCase())) ||
      (r.location && r.location.toLowerCase().includes(query.toLowerCase())) ||
      (r.scheme_title && r.scheme_title.toLowerCase().includes(query.toLowerCase()))
    );
  }
  
  // Render rows
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:24px; color:#64748b;">No request records found matching active filters.</td></tr>`;
    updateCitizenStats(0, 0, 0);
    return;
  }
  
  let total = list.length;
  let active = list.filter(r => r.status !== 'Resolved' && r.status !== 'Closed' && r.status !== 'Session Completed').length;
  let resolved = total - active;
  updateCitizenStats(total, active, resolved);

  tbody.innerHTML = list.map(r => {
    let trackingCol = `<button class="admin-btn" style="padding:4px 8px; font-size:10.5px;" onclick="trackActiveTicket('${r.id}', '')">🔍 Track</button>`;
    let receiptCol = `<button class="admin-btn primary" style="padding:4px 8px; font-size:10.5px;" onclick="downloadReceiptPDF('${r.id}')">📥 Receipt</button>`;
    
    let desc = r.category || r.location || r.scheme_title || r.type || 'Desk Help';
    let detail2 = r.incident_date || r.preferred_date || r.created_at || 'N/A';
    
    if (currentUserDashTab === 'cns') {
      const cname = r.assigned_counsellor_id ? (typeof r.assigned_counsellor_id === 'object' ? r.assigned_counsellor_id.name : 'Allotted Specialist') : 'Pending assignment';
      const slot = r.session_date ? `${r.session_date} at ${r.session_time}` : 'Unscheduled slot';
      return `
        <tr>
          <td><strong>${r.id}</strong></td>
          <td>${r.preferred_date} (${r.preferred_time})</td>
          <td>${cname}</td>
          <td>${slot}</td>
          <td><span class="admin-badge ${getStatusClass(r.status)}">${r.status}</span></td>
          <td>
            <div style="display:flex; gap:6px;">
              ${trackingCol}
              ${receiptCol}
            </div>
          </td>
        </tr>
      `;
    }
    
    if (currentUserDashTab === 'emp') {
      return `
        <tr>
          <td><strong>${r.id}</strong></td>
          <td>${r.scheme_title}</td>
          <td>${r.name}</td>
          <td>Age: ${r.age} (${r.gender})</td>
          <td><span class="admin-badge ${getStatusClass(r.status)}">${r.status}</span></td>
          <td>
            <div style="display:flex; gap:6px;">
              ${receiptCol}
            </div>
          </td>
        </tr>
      `;
    }

    return `
      <tr>
        <td><strong>${r.id}</strong></td>
        <td>${desc}</td>
        <td>${r.district}</td>
        <td>${new Date(detail2).toLocaleDateString()}</td>
        <td><span class="admin-badge ${getStatusClass(r.status || 'Submitted')}">${r.status || 'Submitted'}</span></td>
        <td>
          <div style="display:flex; gap:6px;">
            ${trackingCol}
            ${receiptCol}
          </div>
        </td>
      </tr>
    `;
  }).join('');
};

function updateCitizenStats(total, active, resolved) {
  // Update profile card stats
  const totalEl = document.getElementById('u-total-num');
  const pendingEl = document.getElementById('u-pending-num');
  const resolvedEl = document.getElementById('u-resolved-num');
  if (totalEl) totalEl.textContent = total;
  if (pendingEl) pendingEl.textContent = active;
  if (resolvedEl) resolvedEl.textContent = resolved;
  
  // Show profile card if user is logged in
  const profileCard = document.getElementById('citizenProfileCard');
  const profileEmail = document.getElementById('citizenProfileEmail');
  if (profileCard && currentSessionUser) {
    profileCard.style.display = 'flex';
    if (profileEmail) profileEmail.textContent = currentSessionUser.email;
  }
}

// Global Receipt compiler
window.downloadReceiptPDF = async function(id) {
  try {
    let record = null;
    const prefix = id.split('-')[0].toUpperCase();
    
    if (isSupabaseConfigured) {
      let table = '';
      if (id.startsWith('SC')) table = 'complaints';
      else if (prefix === 'ARS') table = 'ars_reports';
      else if (prefix === 'MHD') table = 'mhd_requests';
      else if (prefix === 'CNS') table = 'counselling_bookings';
      else if (prefix === 'SCH') table = 'empowerment_applications';
      else if (prefix === 'FOB') table = 'callback_requests';
      else if (prefix === 'SOS') table = 'emergency_requests';
      
      const { data } = await supabase.from(table).select('*').eq('id', id).single();
      record = data;
    } else {
      let list = [];
      if (id.startsWith('SC')) list = JSON.parse(localStorage.getItem(MOCK_COMPLAINTS) || '[]');
      else if (prefix === 'ARS') list = JSON.parse(localStorage.getItem(MOCK_ARS_REPORTS) || '[]');
      else if (prefix === 'MHD') list = JSON.parse(localStorage.getItem(MOCK_MHD_REQUESTS) || '[]');
      else if (prefix === 'CNS') list = JSON.parse(localStorage.getItem(MOCK_COUNSELLING_BOOKINGS) || '[]');
      else if (prefix === 'SCH') list = JSON.parse(localStorage.getItem(MOCK_EMPOWERMENT_APPLICATIONS) || '[]');
      else if (prefix === 'FOB') list = JSON.parse(localStorage.getItem(MOCK_CALLBACK_REQUESTS) || '[]');
      else if (prefix === 'SOS') list = JSON.parse(localStorage.getItem(MOCK_EMERGENCY_REQUESTS) || '[]');
      record = list.find(r => r.id === id);
    }
    
    if (!record) {
      showToast("Record not found for PDF download.", "error");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Styled PDF Border
    doc.setDrawColor(166, 30, 77); // Pink border
    doc.setLineWidth(1.5);
    doc.rect(10, 10, 190, 277);

    // Document header
    doc.setFillColor(11, 20, 55); // Navy banner
    doc.rect(12, 12, 186, 30, 'F');

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text("SHAKTICOP — REGISTRY RECEIPT", 20, 28);

    doc.setFontSize(10);
    doc.setFont("Helvetica", "normal");
    doc.text("UTTAR PRADESH POLICE WOMEN PORTAL", 20, 37);

    // Reference ID & Status
    doc.setTextColor(17, 28, 74);
    doc.setFontSize(14);
    doc.setFont("Helvetica", "bold");
    doc.text(`TRACKING REFERENCE ID: ${record.id}`, 20, 60);

    doc.setFillColor(230, 73, 128);
    doc.rect(20, 65, 170, 0.5, 'F');

    // Details Grid layout
    doc.setFontSize(11);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(50, 50, 50);

    let y = 80;
    const details = [
      ["Citizen Name:", record.name],
      ["Contact Mobile:", record.mobile],
      ["Email Registered:", record.email || 'N/A'],
      ["District:", record.district],
      ["Reference Module:", prefix || 'Complaint Registry'],
      ["Submitting Date:", new Date(record.created_at || new Date()).toLocaleDateString()],
      ["Investigation Status:", record.status || 'Submitted']
    ];

    details.forEach(item => {
      doc.setFont("Helvetica", "bold");
      doc.text(item[0], 20, y);
      doc.setFont("Helvetica", "normal");
      doc.text(String(item[1]), 70, y);
      y += 10;
    });

    if (record.description || record.reason || record.remarks) {
      doc.setFont("Helvetica", "bold");
      doc.text("Case Information Details:", 20, y + 5);
      doc.setFont("Helvetica", "normal");
      const splitDesc = doc.splitTextToSize(record.description || record.reason || record.remarks || '', 160);
      doc.text(splitDesc, 20, y + 15);
    }

    // Footer Disclaimer
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text("This receipt is automatically generated by the ShaktiCop system and serves as verification of filing.", 20, 260);
    doc.text("For updates, please log in with your credentials or contact helpline 1090.", 20, 265);

    doc.save(`ShaktiCop_Receipt_${record.id}.pdf`);
    showToast("PDF Receipt downloaded successfully.", "success");
  } catch (err) {
    showToast(`PDF generation failed: ${err.message}`, "error");
  }
};


// ==========================================
// 11. REALTIME USER NOTIFICATION CENTER
// ==========================================
async function fetchUserNotifications() {
  const container = document.getElementById('userNotificationsList');
  if (!container || !currentSessionUser) return;
  
  let list = [];
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('notifications')
      .select('*')
      .eq('user_email', currentSessionUser.email)
      .order('created_at', { ascending: false })
      .limit(10);
    list = data || [];
  } else {
    list = JSON.parse(localStorage.getItem(MOCK_NOTIFICATIONS) || '[]').filter(n => n.user_email === currentSessionUser.email);
    list.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  }
  
  if (list.length === 0) {
    container.innerHTML = `<div style="font-size:11px; color:#94a3b8; text-align:center; padding:12px;">No notification alerts received.</div>`;
    updateMobileNotificationBadges(0);
    return;
  }
  updateMobileNotificationBadges(list.length);
  
  container.innerHTML = list.map(n => `
    <div style="background:#f8fafc; border-left:3px solid var(--pink); border-radius:4px; padding:10px; font-size:12px;">
      <div style="font-weight:700; color:var(--navy); margin-bottom:2px;">${n.title}</div>
      <div style="color:#475569;">${n.message}</div>
      <div style="font-size:9px; color:#94a3b8; margin-top:4px;">${new Date(n.created_at).toLocaleString()}</div>
    </div>
  `).join('');
}


// ==========================================
// 12. ADMIN TAB ROUTING SYSTEMS
// ==========================================
window.switchAdminTab = function(tabName) {
  currentAdminTab = tabName;
  document.querySelectorAll('.admin-menu-item').forEach(li => {
    li.classList.toggle('active', li.id === `menu-${tabName}`);
  });
  
  document.querySelectorAll('.admin-subview').forEach(view => {
    view.style.display = 'none';
  });
  
  const activeView = document.getElementById(`admin-view-${tabName}`);
  if (activeView) activeView.style.display = 'block';
  
  // Set topbar title
  const titles = {
    dash: '📊 Dashboard Overview',
    ars: '🚔 Anti-Romeo Squad Patrol Queue',
    mhd: '👮 Mahila Help Desk Callbacks',
    counsel: '💬 Counselling bookings & calendar',
    empower: '💪 Empowerment JSS Applications',
    officers: '👮 Female Officers Database',
    emergency: '🚨 Emergency SOS Distress Alerts',
    contacts: '📞 Public Helplines Cards',
    logs: '📜 System Audit Trail',
    analytics: '📈 Chart.js Statistics Graphs',
    reports: '📄 Master Reports Registry & Exports'
  };
  document.getElementById('adminActiveTabTitle').textContent = titles[tabName] || 'Admin Panel';
  
  // Trigger specific tab fetches (Lazy Loading)
  if (tabName === 'dash') renderGeneralDashboardOverview();
  if (tabName === 'ars') fetchARSAdmin();
  if (tabName === 'mhd') fetchMHDAdmin();
  if (tabName === 'counsel') fetchCNSAdmin();
  if (tabName === 'empower') fetchEmpowerAdmin();
  if (tabName === 'officers') fetchOfficersAdmin();
  if (tabName === 'emergency') fetchEmergencySOSAdmin();
  if (tabName === 'contacts') fetchContactsAdmin();
  if (tabName === 'logs') fetchLogsAdmin();
  if (tabName === 'analytics') initAnalyticsCharts();
  if (tabName === 'reports') runReportsQuery();
};

function reloadAdminView() {
  switchAdminTab(currentAdminTab);
}


// ==========================================
// 13. ADMIN WORKFLOW COMPONENT LOGIC
// ==========================================

// Dashboard Overview
async function renderGeneralDashboardOverview() {
  let counts = { total: 0, pending: 0, sos: 0 };
  
  if (isSupabaseConfigured) {
    const { count: arsCount } = await supabase.from('ars_reports').select('*', { count: 'exact', head: true });
    const { count: mhdCount } = await supabase.from('mhd_requests').select('*', { count: 'exact', head: true });
    const { count: cnsCount } = await supabase.from('counselling_bookings').select('*', { count: 'exact', head: true });
    const { count: empCount } = await supabase.from('empowerment_applications').select('*', { count: 'exact', head: true });
    const { count: sosCount } = await supabase.from('emergency_requests').select('*', { count: 'exact', head: true });
    const { count: compCount } = await supabase.from('complaints').select('*', { count: 'exact', head: true });
    
    // Active states query
    const { count: arsP } = await supabase.from('ars_reports').select('*', { count: 'exact', head: true }).not('status', 'eq', 'Resolved');
    const { count: mhdP } = await supabase.from('mhd_requests').select('*', { count: 'exact', head: true }).not('status', 'eq', 'Resolved');
    const { count: cnsP } = await supabase.from('counselling_bookings').select('*', { count: 'exact', head: true }).not('status', 'eq', 'Session Completed');
    const { count: sosP } = await supabase.from('emergency_requests').select('*', { count: 'exact', head: true }).not('status', 'eq', 'Resolved');
    
    counts.total = (arsCount || 0) + (mhdCount || 0) + (cnsCount || 0) + (empCount || 0) + (sosCount || 0) + (compCount || 0);
    counts.pending = (arsP || 0) + (mhdP || 0) + (cnsP || 0) + (sosP || 0);
    counts.sos = sosP || 0;
  } else {
    const a = JSON.parse(localStorage.getItem(MOCK_ARS_REPORTS) || '[]');
    const b = JSON.parse(localStorage.getItem(MOCK_MHD_REQUESTS) || '[]');
    const c = JSON.parse(localStorage.getItem(MOCK_COUNSELLING_BOOKINGS) || '[]');
    const d = JSON.parse(localStorage.getItem(MOCK_EMPOWERMENT_APPLICATIONS) || '[]');
    const e = JSON.parse(localStorage.getItem(MOCK_EMERGENCY_REQUESTS) || '[]');
    const f = JSON.parse(localStorage.getItem(MOCK_COMPLAINTS) || '[]');
    
    counts.total = a.length + b.length + c.length + d.length + e.length + f.length;
    counts.pending = a.filter(x => x.status !== 'Resolved').length + 
                     b.filter(x => x.status !== 'Resolved').length + 
                     c.filter(x => x.status !== 'Session Completed').length + 
                     e.filter(x => x.status !== 'Resolved').length;
    counts.sos = e.filter(x => x.status !== 'Resolved').length;
  }
  
  document.getElementById('a-stat-total').textContent = counts.total;
  document.getElementById('a-stat-pending').textContent = counts.pending;
  document.getElementById('a-stat-sos').textContent = counts.sos;
  
  let rate = counts.total > 0 ? Math.round(((counts.total - counts.pending) / counts.total)*100) : 100;
  document.getElementById('a-stat-rate').textContent = rate + '%';
  
  // Render critical alerts & dispatch list
  renderCriticalDashboardWidgets();
}

async function renderCriticalDashboardWidgets() {
  const table = document.getElementById('adminRecentIncidentsList');
  const patrolList = document.getElementById('adminPatrolStatusList');
  if (!table || !patrolList) return;
  
  let recent = [];
  let officers = [];
  
  if (isSupabaseConfigured) {
    const { data: ars } = await supabase.from('ars_reports').select('id, location, status, created_at').order('created_at', { ascending: false }).limit(3);
    const { data: sos } = await supabase.from('emergency_requests').select('id, location, status, created_at').order('created_at', { ascending: false }).limit(3);
    recent = [...(ars || []), ...(sos || [])].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
    
    const { data: off } = await supabase.from('officers').select('*').eq('type', 'police').limit(4);
    officers = off || [];
  } else {
    const a = JSON.parse(localStorage.getItem(MOCK_ARS_REPORTS) || '[]');
    const b = JSON.parse(localStorage.getItem(MOCK_EMERGENCY_REQUESTS) || '[]');
    recent = [...a, ...b].sort((x,y) => new Date(y.created_at) - new Date(x.created_at)).slice(0, 5);
    
    officers = JSON.parse(localStorage.getItem(MOCK_OFFICERS) || '[]').filter(o => o.type === 'police').slice(0, 4);
  }
  
  table.innerHTML = recent.map(r => `
    <tr>
      <td><strong>${r.id}</strong></td>
      <td>${r.id.startsWith('ARS') ? 'Anti-Romeo' : 'SOS Emergency'}</td>
      <td>${r.location}</td>
      <td><span class="admin-badge ${getStatusClass(r.status)}">${r.status}</span></td>
      <td>${new Date(r.created_at || new Date()).toLocaleTimeString()}</td>
    </tr>
  `).join('');
  
  patrolList.innerHTML = officers.map(o => `
    <div style="background:#111c44; border:1px solid rgba(255,255,255,0.05); border-radius:8px; padding:10px; display:flex; justify-content:space-between; align-items:center;">
      <div style="display:flex; gap:10px; align-items:center;">
        <div style="width:34px; height:34px; border-radius:50%; background:#1e293b; overflow:hidden;">
          <img src="${o.photo_url || 'https://via.placeholder.com/50'}" style="width:100%; height:100%; object-fit:cover;"/>
        </div>
        <div>
          <div style="color:#fff; font-weight:600; font-size:12px;">${o.name}</div>
          <div style="color:#a3b1cc; font-size:10px;">${o.station} (${o.district})</div>
        </div>
      </div>
      <span class="admin-badge status-pending" style="background:${o.availability ? '#10b981' : '#ef4444'}1A; color:${o.availability ? '#10b981' : '#ef4444'};">
        ${o.availability ? 'Available' : 'On Dispatch'}
      </span>
    </div>
  `).join('');
}

// Anti Romeo Squad Manager
window.fetchARSAdmin = async function() {
  const tbody = document.getElementById('arsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;"><div class="skeleton" style="height:35px; width:100%;"></div></td></tr>';
  
  const query = document.getElementById('arsSearchQuery').value.trim();
  const status = document.getElementById('arsFilterStatus').value;
  
  let list = [];
  if (isSupabaseConfigured) {
    let q = supabase.from('ars_reports').select('*, assigned_officer_id(name)');
    if (status) q = q.eq('status', status);
    const { data } = await q.order('created_at', { ascending: false });
    list = data || [];
  } else {
    list = JSON.parse(localStorage.getItem(MOCK_ARS_REPORTS) || '[]');
    if (status) list = list.filter(r => r.status === status);
  }
  
  if (query) {
    list = list.filter(r => 
      r.id.toLowerCase().includes(query.toLowerCase()) ||
      r.name.toLowerCase().includes(query.toLowerCase()) ||
      r.location.toLowerCase().includes(query.toLowerCase())
    );
  }
  
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px; color:#a3b1cc;">No Anti-Romeo cases in active queue.</td></tr>';
    return;
  }
  
  tbody.innerHTML = list.map(r => {
    const offName = r.assigned_officer_id ? (typeof r.assigned_officer_id === 'object' ? r.assigned_officer_id.name : 'Allocated Officer') : 'Not Assigned';
    return `
      <tr>
        <td><strong>${r.id}</strong></td>
        <td>${r.name}</td>
        <td>${r.mobile}</td>
        <td>${r.location}</td>
        <td>${offName}</td>
        <td><span class="admin-badge ${getStatusClass(r.status)}">${r.status}</span></td>
        <td>${new Date(r.created_at).toLocaleDateString()}</td>
        <td>
          <button class="admin-btn" style="padding:4px 8px; font-size:11px;" onclick="openAdminActionModal('ars_reports', '${r.id}')">⚙️ Update Case</button>
        </td>
      </tr>
    `;
  }).join('');
};

// Mahila Help Desk Manager
window.fetchMHDAdmin = async function() {
  const tbody = document.getElementById('mhdTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;"><div class="skeleton" style="height:35px; width:100%;"></div></td></tr>';
  
  const query = document.getElementById('mhdSearchQuery').value.trim();
  const status = document.getElementById('mhdFilterStatus').value;
  
  let list = [];
  if (isSupabaseConfigured) {
    let q = supabase.from('mhd_requests').select('*, assigned_officer_id(name)');
    if (status) q = q.eq('status', status);
    const { data } = await q.order('created_at', { ascending: false });
    list = data || [];
  } else {
    list = JSON.parse(localStorage.getItem(MOCK_MHD_REQUESTS) || '[]');
    if (status) list = list.filter(r => r.status === status);
  }
  
  if (query) {
    list = list.filter(r => 
      r.id.toLowerCase().includes(query.toLowerCase()) ||
      r.name.toLowerCase().includes(query.toLowerCase()) ||
      r.police_station.toLowerCase().includes(query.toLowerCase())
    );
  }
  
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px; color:#a3b1cc;">No help desk callbacks pending.</td></tr>';
    return;
  }
  
  tbody.innerHTML = list.map(r => {
    const offName = r.assigned_officer_id ? (typeof r.assigned_officer_id === 'object' ? r.assigned_officer_id.name : 'Allocated Officer') : 'Not Assigned';
    return `
      <tr>
        <td><strong>${r.id}</strong></td>
        <td>${r.name}</td>
        <td>${r.mobile}</td>
        <td>${r.police_station}</td>
        <td>${r.callback_requested ? '⚠️ Yes (Urgent)' : 'No (Routine)'}</td>
        <td>${offName}</td>
        <td><span class="admin-badge ${getStatusClass(r.status)}">${r.status}</span></td>
        <td>
          <button class="admin-btn" style="padding:4px 8px; font-size:11px;" onclick="openAdminActionModal('mhd_requests', '${r.id}')">⚙️ Update Case</button>
        </td>
      </tr>
    `;
  }).join('');
};

// Counselling Booking Manager
window.fetchCNSAdmin = async function() {
  const tbody = document.getElementById('cnsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;"><div class="skeleton" style="height:35px; width:100%;"></div></td></tr>';
  
  const query = document.getElementById('cnsSearchQuery').value.trim();
  const status = document.getElementById('cnsFilterStatus').value;
  
  let list = [];
  if (isSupabaseConfigured) {
    let q = supabase.from('counselling_bookings').select('*, assigned_counsellor_id(name)');
    if (status) q = q.eq('status', status);
    const { data } = await q.order('created_at', { ascending: false });
    list = data || [];
  } else {
    list = JSON.parse(localStorage.getItem(MOCK_COUNSELLING_BOOKINGS) || '[]');
    if (status) list = list.filter(r => r.status === status);
  }
  
  if (query) {
    list = list.filter(r => 
      r.id.toLowerCase().includes(query.toLowerCase()) ||
      r.name.toLowerCase().includes(query.toLowerCase())
    );
  }
  
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px; color:#a3b1cc;">No counselling booking requests.</td></tr>';
    return;
  }
  
  tbody.innerHTML = list.map(r => {
    const cname = r.assigned_counsellor_id ? (typeof r.assigned_counsellor_id === 'object' ? r.assigned_counsellor_id.name : 'Specialist Counsellor') : 'Not Assigned';
    const schedule = r.session_date ? `${r.session_date} at ${r.session_time}` : 'Pending Slot Allocation';
    return `
      <tr>
        <td><strong>${r.id}</strong></td>
        <td>${r.name}</td>
        <td>${r.mobile}</td>
        <td>${r.preferred_date} (${r.preferred_time})</td>
        <td>${cname}</td>
        <td>${schedule}</td>
        <td><span class="admin-badge ${getStatusClass(r.status)}">${r.status}</span></td>
        <td>
          <button class="admin-btn" style="padding:4px 8px; font-size:11px;" onclick="openCounselActionModal('${r.id}')">📅 Schedule Slot</button>
        </td>
      </tr>
    `;
  }).join('');
};

// Women Empowerment applications List
window.fetchEmpowerAdmin = async function() {
  const tbody = document.getElementById('empTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;"><div class="skeleton" style="height:35px; width:100%;"></div></td></tr>';
  
  const query = document.getElementById('empSearchQuery').value.trim();
  const status = document.getElementById('empFilterStatus').value;
  
  let list = [];
  if (isSupabaseConfigured) {
    let q = supabase.from('empowerment_applications').select('*');
    if (status) q = q.eq('status', status);
    const { data } = await q.order('created_at', { ascending: false });
    list = data || [];
  } else {
    list = JSON.parse(localStorage.getItem(MOCK_EMPOWERMENT_APPLICATIONS) || '[]');
    if (status) list = list.filter(r => r.status === status);
  }
  
  if (query) {
    list = list.filter(r => 
      r.id.toLowerCase().includes(query.toLowerCase()) ||
      r.name.toLowerCase().includes(query.toLowerCase()) ||
      r.scheme_title.toLowerCase().includes(query.toLowerCase())
    );
  }
  
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px; color:#a3b1cc;">No empowerment scheme enrollments found.</td></tr>';
    return;
  }
  
  tbody.innerHTML = list.map(r => `
    <tr>
      <td><input type="checkbox" class="emp-row-check" value="${r.id}"/></td>
      <td><strong>${r.id}</strong></td>
      <td>${r.scheme_title}</td>
      <td>${r.name}</td>
      <td>${r.mobile}</td>
      <td>Age: ${r.age} (${r.gender})</td>
      <td><span class="admin-badge ${getStatusClass(r.status)}">${r.status}</span></td>
      <td>${new Date(r.created_at).toLocaleDateString()}</td>
    </tr>
  `).join('');
};

// Toggle JSS applications checkbox
window.toggleEmpSelectAll = function(chk) {
  document.querySelectorAll('.emp-row-check').forEach(box => box.checked = chk.checked);
};

// Bulk Actions for JSS / Self Defence scheme applicants
window.bulkExportSelected = async function(format) {
  const ids = Array.from(document.querySelectorAll('.emp-row-check:checked')).map(c => c.value);
  if (ids.length === 0) {
    showToast("Please select at least one application row.", "warning");
    return;
  }
  
  // Fetch details of selected
  let records = [];
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('empowerment_applications').select('*').in('id', ids);
    records = data || [];
    
    // Auto-update status to Exported
    await supabase.from('empowerment_applications').update({ status: 'Exported' }).in('id', ids);
  } else {
    const list = JSON.parse(localStorage.getItem(MOCK_EMPOWERMENT_APPLICATIONS) || '[]');
    records = list.filter(r => ids.includes(r.id));
    list.forEach(r => {
      if (ids.includes(r.id)) r.status = 'Exported';
    });
    localStorage.setItem(MOCK_EMPOWERMENT_APPLICATIONS, JSON.stringify(list));
  }
  
  // Write history log
  for (const r of records) {
    await insertHistoryLog(r.id, 'Exported', null, 'Application registry exported to e-Governance sheet.');
  }
  
  // Export CSV
  let csv = "Application ID,Scheme Title,Applicant Name,Mobile,Age,Gender,District,Status\n";
  records.forEach(r => {
    csv += `"${r.id}","${r.scheme_title}","${r.name}","${r.mobile}",${r.age},"${r.gender}","${r.district}","Exported"\n`;
  });
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `empowerment_export_${Date.now()}.csv`;
  a.click();
  
  showToast(`Bulk exported ${ids.length} applications and updated status to "Exported"`, 'success');
  fetchEmpowerAdmin();
};

window.bulkCloseSelected = async function() {
  const ids = Array.from(document.querySelectorAll('.emp-row-check:checked')).map(c => c.value);
  if (ids.length === 0) {
    showToast("Please select rows to close.", "warning");
    return;
  }
  
  if (isSupabaseConfigured) {
    await supabase.from('empowerment_applications').update({ status: 'Closed' }).in('id', ids);
  } else {
    const list = JSON.parse(localStorage.getItem(MOCK_EMPOWERMENT_APPLICATIONS) || '[]');
    list.forEach(r => {
      if (ids.includes(r.id)) r.status = 'Closed';
    });
    localStorage.setItem(MOCK_EMPOWERMENT_APPLICATIONS, JSON.stringify(list));
  }
  
  for (const id of ids) {
    await insertHistoryLog(id, 'Closed', null, 'Welfare Application marked closed.');
  }
  
  showToast(`Closed ${ids.length} applications successfully.`, 'success');
  fetchEmpowerAdmin();
};


// ==========================================
// 14. ADMIN WORKFLOW ACTION OVERLAYS
// ==========================================

// Action modal trigger (General workflow update)
window.openAdminActionModal = async function(moduleTable, id) {
  const modal = document.getElementById('modalAdminAction');
  if (!modal) return;
  
  document.getElementById('actionModuleTable').value = moduleTable;
  document.getElementById('actionRecordId').value = id;
  document.getElementById('actionRecordIdDisplay').value = id;
  
  // Setup specific workflow status items
  const statusSel = document.getElementById('actionStatus');
  statusSel.innerHTML = '';
  
  if (moduleTable === 'ars_reports') {
    statusSel.innerHTML = `
      <option value="Submitted">Submitted</option>
      <option value="Pending Review">Pending Review</option>
      <option value="Officer Assigned">Officer Assigned</option>
      <option value="In Progress">In Progress</option>
      <option value="Resolved">Resolved</option>
    `;
  } else if (moduleTable === 'mhd_requests') {
    statusSel.innerHTML = `
      <option value="Submitted">Submitted</option>
      <option value="Call Back Requested">Call Back Requested</option>
      <option value="Officer Assigned">Officer Assigned</option>
      <option value="Issue Under Review">Issue Under Review</option>
      <option value="Resolved">Resolved</option>
    `;
  } else if (moduleTable === 'emergency_requests') {
    statusSel.innerHTML = `
      <option value="Submitted">Submitted</option>
      <option value="Dispatched">Dispatched</option>
      <option value="Resolved">Resolved</option>
    `;
  }
  
  // Populate officer list (Etawah list seed filter)
  const offSel = document.getElementById('actionOfficerId');
  offSel.innerHTML = '<option value="">-- No Officer Assigned --</option>';
  
  let officersList = [];
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('officers').select('*').eq('type', 'police');
    officersList = data || [];
  } else {
    officersList = JSON.parse(localStorage.getItem(MOCK_OFFICERS) || '[]').filter(o => o.type === 'police');
  }
  
  officersList.forEach(o => {
    offSel.innerHTML += `<option value="${o.id}">${o.name} (${o.designation} - ${o.station})</option>`;
  });
  
  // Set current record values
  let record = null;
  if (isSupabaseConfigured) {
    const { data } = await supabase.from(moduleTable).select('*').eq('id', id).single();
    record = data;
  } else {
    let key = '';
    if (moduleTable === 'ars_reports') key = MOCK_ARS_REPORTS;
    if (moduleTable === 'mhd_requests') key = MOCK_MHD_REQUESTS;
    if (moduleTable === 'emergency_requests') key = MOCK_EMERGENCY_REQUESTS;
    record = JSON.parse(localStorage.getItem(key) || '[]').find(r => r.id === id);
  }
  
  if (record) {
    statusSel.value = record.status;
    offSel.value = record.assigned_officer_id || '';
    document.getElementById('actionRemarks').value = record.remarks || '';
  }
  
  modal.classList.add('open');
};

window.toggleDelayReason = function(statusVal) {
  const container = document.getElementById('actionDelayReasonContainer');
  if (!container) return;
  
  // Show delay reason if case status updates to "In Progress" or "Resolved" and has taken time, or if admin marks escalation
  if (statusVal === 'In Progress' || statusVal === 'Resolved') {
    container.style.display = 'block';
  } else {
    container.style.display = 'none';
  }
};

window.submitAdminActionForm = async function() {
  const table = document.getElementById('actionModuleTable').value;
  const id = document.getElementById('actionRecordId').value;
  const status = document.getElementById('actionStatus').value;
  const officerId = document.getElementById('actionOfficerId').value;
  const remarks = document.getElementById('actionRemarks').value.trim();
  const delayReason = document.getElementById('actionDelayReason') ? document.getElementById('actionDelayReason').value.trim() : '';
  
  if (!remarks) {
    showToast("Please write updating remarks for audit.", "warning");
    return;
  }
  
  let officerName = null;
  if (officerId) {
    let list = [];
    if (isSupabaseConfigured) {
      const { data } = await supabase.from('officers').select('name').eq('id', officerId).single();
      if (data) officerName = data.name;
    } else {
      list = JSON.parse(localStorage.getItem(MOCK_OFFICERS) || '[]');
      const o = list.find(x => x.id === officerId);
      if (o) officerName = o.name;
    }
  }
  
  // Build final logging remarks
  let logText = remarks;
  if (delayReason) {
    logText += ` [Delay Reason: ${delayReason}]`;
  }
  
  if (isSupabaseConfigured) {
    const updatePayload = {
      status: status,
      assigned_officer_id: officerId || null,
      remarks: remarks
    };
    await supabase.from(table).update(updatePayload).eq('id', id);
  } else {
    let key = '';
    if (table === 'ars_reports') key = MOCK_ARS_REPORTS;
    if (table === 'mhd_requests') key = MOCK_MHD_REQUESTS;
    if (table === 'emergency_requests') key = MOCK_EMERGENCY_REQUESTS;
    
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    const r = list.find(x => x.id === id);
    if (r) {
      r.status = status;
      r.assigned_officer_id = officerId || null;
      r.remarks = remarks;
    }
    localStorage.setItem(key, JSON.stringify(list));
  }
  
  // Write timeline audit
  await insertHistoryLog(id, status, officerName, logText);
  
  // Trigger notification message to citizen user
  let userEmail = '';
  if (isSupabaseConfigured) {
    const { data } = await supabase.from(table).select('email').eq('id', id).single();
    userEmail = data ? data.email : null;
  } else {
    let key = '';
    if (table === 'ars_reports') key = MOCK_ARS_REPORTS;
    if (table === 'mhd_requests') key = MOCK_MHD_REQUESTS;
    if (table === 'emergency_requests') key = MOCK_EMERGENCY_REQUESTS;
    const r = JSON.parse(localStorage.getItem(key) || '[]').find(x => x.id === id);
    userEmail = r ? r.email : null;
  }
  
  if (userEmail) {
    const notiMsg = `Your request ID: ${id} status updated to "${status}". Assigned node: ${officerName || 'Patrol Unit'}. Remarks: ${remarks}`;
    if (isSupabaseConfigured) {
      await supabase.from('notifications').insert({ user_email: userEmail, title: 'Case Registry Update', message: notiMsg });
    } else {
      const notifications = JSON.parse(localStorage.getItem(MOCK_NOTIFICATIONS) || '[]');
      notifications.push({
        id: 'noti-' + Math.floor(Math.random()*10000),
        user_email: userEmail,
        title: 'Case Registry Update',
        message: notiMsg,
        created_at: new Date().toISOString()
      });
      localStorage.setItem(MOCK_NOTIFICATIONS, JSON.stringify(notifications));
    }
  }
  
  showToast("Case details updated successfully.", "success");
  closeModal('modalAdminAction');
  reloadAdminView();
};

// Counselling Scheduler Actions
window.openCounselActionModal = async function(id) {
  const modal = document.getElementById('modalCounselAction');
  if (!modal) return;
  
  document.getElementById('counselActionId').value = id;
  document.getElementById('counselActionIdDisplay').value = id;
  
  // Load counselors
  const cSel = document.getElementById('counselAssignee');
  cSel.innerHTML = '<option value="">-- Select Specialist Counselor --</option>';
  
  let list = [];
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('officers').select('*').eq('type', 'counsellor');
    list = data || [];
  } else {
    list = JSON.parse(localStorage.getItem(MOCK_OFFICERS) || '[]').filter(o => o.type === 'counsellor');
  }
  
  list.forEach(c => {
    cSel.innerHTML += `<option value="${c.id}">${c.name} (${c.designation} - ${c.station})</option>`;
  });
  
  // Set current slot
  let record = null;
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('counselling_bookings').select('*').eq('id', id).single();
    record = data;
  } else {
    record = JSON.parse(localStorage.getItem(MOCK_COUNSELLING_BOOKINGS) || '[]').find(x => x.id === id);
  }
  
  if (record) {
    cSel.value = record.assigned_counsellor_id || '';
    document.getElementById('counselSessionDate').value = record.session_date || '';
    document.getElementById('counselSessionTime').value = record.session_time || '';
    document.getElementById('counselStatus').value = record.status;
    document.getElementById('counselRemarks').value = record.remarks || '';
  }
  
  modal.classList.add('open');
};

window.submitCounselActionForm = async function() {
  const id = document.getElementById('counselActionId').value;
  const cId = document.getElementById('counselAssignee').value;
  const date = document.getElementById('counselSessionDate').value;
  const time = document.getElementById('counselSessionTime').value;
  const status = document.getElementById('counselStatus').value;
  const remarks = document.getElementById('counselRemarks').value.trim();
  
  if (!cId || !date || !time || !remarks) {
    showToast("Please complete scheduling slots and remarks.", "warning");
    return;
  }
  
  let cname = '';
  let list = [];
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('officers').select('name').eq('id', cId).single();
    if (data) cname = data.name;
  } else {
    list = JSON.parse(localStorage.getItem(MOCK_OFFICERS) || '[]');
    const c = list.find(x => x.id === cId);
    if (c) cname = c.name;
  }
  
  if (isSupabaseConfigured) {
    await supabase.from('counselling_bookings').update({
      assigned_counsellor_id: cId,
      session_date: date,
      session_time: time,
      status: status,
      remarks: remarks
    }).eq('id', id);
  } else {
    const bookings = JSON.parse(localStorage.getItem(MOCK_COUNSELLING_BOOKINGS) || '[]');
    const b = bookings.find(x => x.id === id);
    if (b) {
      b.assigned_counsellor_id = cId;
      b.session_date = date;
      b.session_time = time;
      b.status = status;
      b.remarks = remarks;
    }
    localStorage.setItem(MOCK_COUNSELLING_BOOKINGS, JSON.stringify(bookings));
  }
  
  // Write timeline
  await insertHistoryLog(id, status, cname, `Counselling session scheduled on ${date} at ${time}. Remarks: ${remarks}`);
  
  // Trigger notification
  let userEmail = '';
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('counselling_bookings').select('email').eq('id', id).single();
    userEmail = data ? data.email : null;
  } else {
    const b = JSON.parse(localStorage.getItem(MOCK_COUNSELLING_BOOKINGS) || '[]').find(x => x.id === id);
    userEmail = b ? b.email : null;
  }
  
  if (userEmail) {
    const notiMsg = `Counselling booking ${id} scheduled: ${date} at ${time} with ${cname}. Notes: ${remarks}`;
    if (isSupabaseConfigured) {
      await supabase.from('notifications').insert({ user_email: userEmail, title: 'Session Scheduled', message: notiMsg });
    } else {
      const notifications = JSON.parse(localStorage.getItem(MOCK_NOTIFICATIONS) || '[]');
      notifications.push({
        id: 'noti-' + Math.floor(Math.random()*10000),
        user_email: userEmail,
        title: 'Session Scheduled',
        message: notiMsg,
        created_at: new Date().toISOString()
      });
      localStorage.setItem(MOCK_NOTIFICATIONS, JSON.stringify(notifications));
    }
  }
  
  showToast("Counselling session scheduled.", "success");
  closeModal('modalCounselAction');
  reloadAdminView();
};


// ==========================================
// 15. DIRECTORY & helplines (Etawah editable)
// ==========================================

// Officers CRUD
window.fetchOfficersAdmin = async function() {
  const tbody = document.getElementById('adminOfficersTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;"><div class="skeleton" style="height:35px; width:100%;"></div></td></tr>';
  
  let list = [];
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('officers').select('*').order('created_at', { ascending: false });
    list = data || [];
  } else {
    list = JSON.parse(localStorage.getItem(MOCK_OFFICERS) || '[]');
  }
  
  tbody.innerHTML = list.map(o => `
    <tr>
      <td>
        <div style="width:36px; height:36px; border-radius:50%; overflow:hidden; background:#1e293b;">
          <img src="${o.photo_url || 'https://via.placeholder.com/50'}" style="width:100%; height:100%; object-fit:cover;"/>
        </div>
      </td>
      <td><strong>${o.name}</strong></td>
      <td><span class="admin-badge">${o.type.toUpperCase()}</span></td>
      <td>${o.designation}</td>
      <td>${o.mobile}</td>
      <td>${o.station} (${o.district})</td>
      <td>
        <span class="admin-badge status-pending" style="background:${o.availability ? '#10b981' : '#ef4444'}1A; color:${o.availability ? '#10b981' : '#ef4444'};">
          ${o.availability ? 'Available' : 'Unavailable'}
        </span>
      </td>
      <td>
        <div style="display:flex; gap:6px;">
          <button class="admin-btn" style="padding:4px 8px; font-size:11px;" onclick="openOfficerModalEdit('${o.id}')">✏️ Edit</button>
          <button class="admin-btn danger" style="padding:4px 8px; font-size:11px;" onclick="deleteOfficer('${o.id}')">🗑️ Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
};

window.openOfficerModalAdd = function() {
  const modal = document.getElementById('modalOfficerEdit');
  if (!modal) return;
  
  document.getElementById('officerModalTitle').textContent = '👮 Add New Profile';
  document.getElementById('editOfficerId').value = '';
  document.getElementById('officerEditForm').reset();
  modal.classList.add('open');
};

window.openOfficerModalEdit = async function(id) {
  const modal = document.getElementById('modalOfficerEdit');
  if (!modal) return;
  
  document.getElementById('officerModalTitle').textContent = '👮 Edit Profile';
  document.getElementById('editOfficerId').value = id;
  
  let o = null;
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('officers').select('*').eq('id', id).single();
    o = data;
  } else {
    o = JSON.parse(localStorage.getItem(MOCK_OFFICERS) || '[]').find(x => x.id === id);
  }
  
  if (o) {
    document.getElementById('eo-name').value = o.name;
    document.getElementById('eo-type').value = o.type;
    document.getElementById('eo-designation').value = o.designation;
    document.getElementById('eo-mobile').value = o.mobile;
    document.getElementById('eo-email').value = o.email || '';
    document.getElementById('eo-district').value = o.district;
    document.getElementById('eo-station').value = o.station;
    document.getElementById('eo-availability').value = o.availability ? 'true' : 'false';
    document.getElementById('eo-photo').value = o.photo_url || '';
  }
  
  modal.classList.add('open');
};

window.submitOfficerForm = async function() {
  const id = document.getElementById('editOfficerId').value;
  const name = document.getElementById('eo-name').value.trim();
  const type = document.getElementById('eo-type').value;
  const designation = document.getElementById('eo-designation').value.trim();
  const mobile = document.getElementById('eo-mobile').value.trim();
  const email = document.getElementById('eo-email').value.trim();
  const district = document.getElementById('eo-district').value;
  const station = document.getElementById('eo-station').value.trim();
  const availability = document.getElementById('eo-availability').value === 'true';
  const photo = document.getElementById('eo-photo').value.trim();
  
  if (!name || !designation || !mobile || !station) {
    showToast("Please fill out required fields.", "warning");
    return;
  }
  
  const payload = {
    name, type, designation, mobile, email, district, station, availability, photo_url: photo
  };
  
  if (isSupabaseConfigured) {
    if (id) {
      await supabase.from('officers').update(payload).eq('id', id);
      showToast("Profile updated successfully.", "success");
    } else {
      await supabase.from('officers').insert(payload);
      showToast("New profile added to directory.", "success");
    }
  } else {
    const list = JSON.parse(localStorage.getItem(MOCK_OFFICERS) || '[]');
    if (id) {
      const idx = list.findIndex(x => x.id === id);
      if (idx !== -1) {
        list[idx] = { id, ...payload };
        showToast("Profile updated successfully.", "success");
      }
    } else {
      list.push({ id: 'off-' + Math.floor(Math.random()*1000), ...payload });
      showToast("New profile added to directory.", "success");
    }
    localStorage.setItem(MOCK_OFFICERS, JSON.stringify(list));
  }
  
  closeModal('modalOfficerEdit');
  fetchOfficersAdmin();
};

window.deleteOfficer = async function(id) {
  if (!confirm("Are you sure you want to remove this officer?")) return;
  
  if (isSupabaseConfigured) {
    await supabase.from('officers').delete().eq('id', id);
  } else {
    const list = JSON.parse(localStorage.getItem(MOCK_OFFICERS) || '[]');
    localStorage.setItem(MOCK_OFFICERS, JSON.stringify(list.filter(x => x.id !== id)));
  }
  
  showToast("Profile deleted successfully.", "success");
  fetchOfficersAdmin();
};

// Helpline Contacts CRUD
window.fetchContactsAdmin = async function() {
  const tbody = document.getElementById('adminContactsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;"><div class="skeleton" style="height:35px; width:100%;"></div></td></tr>';
  
  let list = [];
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('contacts').select('*').order('priority', { ascending: false });
    list = data || [];
  } else {
    list = JSON.parse(localStorage.getItem(MOCK_CONTACTS) || '[]');
  }
  
  tbody.innerHTML = list.map(c => `
    <tr>
      <td>
        <div style="width:36px; height:36px; border-radius:50%; overflow:hidden; background:#1e293b;">
          <img src="${c.photo_url || 'https://via.placeholder.com/50'}" style="width:100%; height:100%; object-fit:cover;"/>
        </div>
      </td>
      <td><strong>${c.department}</strong></td>
      <td>${c.designation || 'N/A'}</td>
      <td>${c.officer_name || 'N/A'}</td>
      <td>${c.phone_number}</td>
      <td>${c.priority}</td>
      <td>
        <div style="display:flex; gap:6px;">
          <button class="admin-btn" style="padding:4px 8px; font-size:11px;" onclick="openContactModalEdit('${c.id}')">✏️ Edit</button>
          <button class="admin-btn danger" style="padding:4px 8px; font-size:11px;" onclick="deleteContact('${c.id}')">🗑️ Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
};

window.openContactModalAdd = function() {
  const modal = document.getElementById('modalContactEdit');
  if (!modal) return;
  
  document.getElementById('contactModalTitle').textContent = '📞 Add Helpline Card';
  document.getElementById('editContactId').value = '';
  document.getElementById('contactEditForm').reset();
  modal.classList.add('open');
};

window.openContactModalEdit = async function(id) {
  const modal = document.getElementById('modalContactEdit');
  if (!modal) return;
  
  document.getElementById('contactModalTitle').textContent = '📞 Edit Helpline Card';
  document.getElementById('editContactId').value = id;
  
  let c = null;
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('contacts').select('*').eq('id', id).single();
    c = data;
  } else {
    c = JSON.parse(localStorage.getItem(MOCK_CONTACTS) || '[]').find(x => x.id === id);
  }
  
  if (c) {
    document.getElementById('ec-department').value = c.department;
    document.getElementById('ec-officer').value = c.officer_name || '';
    document.getElementById('ec-designation').value = c.designation || '';
    document.getElementById('ec-phone').value = c.phone_number;
    document.getElementById('ec-priority').value = c.priority || 0;
    document.getElementById('ec-photo').value = c.photo_url || '';
  }
  
  modal.classList.add('open');
};

window.submitContactForm = async function() {
  const id = document.getElementById('editContactId').value;
  const dept = document.getElementById('ec-department').value.trim();
  const off = document.getElementById('ec-officer').value.trim();
  const desig = document.getElementById('ec-designation').value.trim();
  const phone = document.getElementById('ec-phone').value.trim();
  const priority = document.getElementById('ec-priority').value;
  const photo = document.getElementById('ec-photo').value.trim();
  
  if (!dept || !phone) {
    showToast("Department and phone number are required.", "warning");
    return;
  }
  
  const payload = {
    department: dept, officer_name: off || null, designation: desig || null, phone_number: phone, priority: parseInt(priority) || 0, photo_url: photo || null
  };
  
  if (isSupabaseConfigured) {
    if (id) {
      await supabase.from('contacts').update(payload).eq('id', id);
      showToast("Helpline updated.", "success");
    } else {
      await supabase.from('contacts').insert(payload);
      showToast("Helpline card added.", "success");
    }
  } else {
    const list = JSON.parse(localStorage.getItem(MOCK_CONTACTS) || '[]');
    if (id) {
      const idx = list.findIndex(x => x.id === id);
      if (idx !== -1) {
        list[idx] = { id, ...payload };
        showToast("Helpline updated.", "success");
      }
    } else {
      list.push({ id: 'c-' + Math.floor(Math.random()*1000), ...payload });
      showToast("Helpline card added.", "success");
    }
    localStorage.setItem(MOCK_CONTACTS, JSON.stringify(list));
  }
  
  closeModal('modalContactEdit');
  fetchContactsAdmin();
  fetchEmergencyContacts();
};

window.deleteContact = async function(id) {
  if (!confirm("Remove this helpline card?")) return;
  
  if (isSupabaseConfigured) {
    await supabase.from('contacts').delete().eq('id', id);
  } else {
    const list = JSON.parse(localStorage.getItem(MOCK_CONTACTS) || '[]');
    localStorage.setItem(MOCK_CONTACTS, JSON.stringify(list.filter(x => x.id !== id)));
  }
  
  showToast("Helpline deleted.", "success");
  fetchContactsAdmin();
  fetchEmergencyContacts();
};


// ==========================================
// 16. EMERGENCY SOS DISTRESS LIVE QUEUE
// ==========================================
window.fetchEmergencySOSAdmin = async function() {
  const tbody = document.getElementById('emergencyTableBody');
  if (!tbody) return;
  
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;"><div class="skeleton" style="height:35px; width:100%;"></div></td></tr>';
  
  let list = [];
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('emergency_requests').select('*').order('created_at', { ascending: false });
    list = data || [];
  } else {
    list = JSON.parse(localStorage.getItem(MOCK_EMERGENCY_REQUESTS) || '[]');
  }
  
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px; color:#a3b1cc;">No emergency alerts active.</td></tr>';
    return;
  }
  
  tbody.innerHTML = list.map(r => `
    <tr style="${r.status === 'Submitted' ? 'background:rgba(239, 68, 68, 0.05); border-left:3px solid #ef4444;' : ''}">
      <td><strong>${r.id}</strong></td>
      <td>${r.name}</td>
      <td>${r.mobile}</td>
      <td><span class="admin-badge status-pending" style="background:#ef44441A; color:#ef4444;">${r.type}</span></td>
      <td><a href="https://maps.google.com/?q=${r.location}" target="_blank" style="color:#0ea5e9; text-decoration:underline;">📍 ${r.location}</a></td>
      <td><span class="admin-badge ${getStatusClass(r.status)}">${r.status}</span></td>
      <td>${new Date(r.created_at).toLocaleTimeString()}</td>
      <td>
        <button class="admin-btn" style="padding:4px 8px; font-size:11px;" onclick="openAdminActionModal('emergency_requests', '${r.id}')">🚨 Dispatch</button>
      </td>
    </tr>
  `).join('');
};


// ==========================================
// 17. SYSTEM LOGS & AUDIT TRAILS
// ==========================================
window.fetchLogsAdmin = async function() {
  const tbody = document.getElementById('adminLogsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;"><div class="skeleton" style="height:30px; width:100%;"></div></td></tr>';
  
  let list = [];
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('module_history').select('*').order('created_at', { ascending: false }).limit(50);
    if (error) console.error('Logs fetch error:', error.message);
    list = data || [];
  } else {
    list = JSON.parse(localStorage.getItem(MOCK_MODULE_HISTORY) || '[]');
    list.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  }
  
  tbody.innerHTML = list.map(l => {
    let actClass = 'log-action-update';
    if (l.status === 'Pending' || l.status === 'Submitted' || l.status === 'Application Received') actClass = 'log-action-create';
    if (l.status === 'Resolved' || l.status === 'Closed' || l.status === 'Session Completed') actClass = 'log-action-delete';
    
    return `
      <tr>
        <td>${new Date(l.created_at).toLocaleString()}</td>
        <td>${l.updated_by_email || 'anonymous@shakticop.gov.in'}</td>
        <td><span class="log-action ${actClass}">${l.status}</span></td>
        <td>ID: ${l.tracking_id} - ${l.remarks}</td>
      </tr>
    `;
  }).join('');
};

window.clearActivityLogs = async function() {
  if (!confirm("Are you sure you want to wipe local history logs?")) return;
  localStorage.removeItem(MOCK_MODULE_HISTORY);
  showToast("History logs cleared.", "success");
  fetchLogsAdmin();
};


// ==========================================
// 18. CHART.JS ANALYTICS DASHBOARD INITS
// ==========================================
let chartTrend = null;
let chartCategory = null;
let chartDistrict = null;

window.initAnalyticsCharts = async function() {
  const trendCtx = document.getElementById('chartMonthlyTrend');
  const catCtx = document.getElementById('chartCategoryBreakdown');
  const distCtx = document.getElementById('chartDistrictDistribution');
  
  if (!trendCtx || !catCtx || !distCtx) return;
  
  if (chartTrend) chartTrend.destroy();
  if (chartCategory) chartCategory.destroy();
  if (chartDistrict) chartDistrict.destroy();

  // Fetch real data for charts
  let arsData = [], mhdData = [], cnsData = [], sosData = [], compData = [], empData = [];
  
  if (isSupabaseConfigured) {
    const [a, b, c, d, e, f] = await Promise.all([
      supabase.from('ars_reports').select('status, district, created_at'),
      supabase.from('mhd_requests').select('status, district, created_at'),
      supabase.from('counselling_bookings').select('status, district, created_at'),
      supabase.from('emergency_requests').select('status, district, created_at'),
      supabase.from('complaints').select('status, category, district, created_at'),
      supabase.from('empowerment_applications').select('status, district, created_at')
    ]);
    arsData = a.data || []; mhdData = b.data || []; cnsData = c.data || [];
    sosData = d.data || []; compData = e.data || []; empData = f.data || [];
  } else {
    arsData = JSON.parse(localStorage.getItem(MOCK_ARS_REPORTS) || '[]');
    mhdData = JSON.parse(localStorage.getItem(MOCK_MHD_REQUESTS) || '[]');
    cnsData = JSON.parse(localStorage.getItem(MOCK_COUNSELLING_BOOKINGS) || '[]');
    sosData = JSON.parse(localStorage.getItem(MOCK_EMERGENCY_REQUESTS) || '[]');
    compData = JSON.parse(localStorage.getItem(MOCK_COMPLAINTS) || '[]');
    empData = JSON.parse(localStorage.getItem(MOCK_EMPOWERMENT_APPLICATIONS) || '[]');
  }

  const allRecords = [...arsData, ...mhdData, ...cnsData, ...sosData, ...compData, ...empData];

  // Monthly trend (last 6 months)
  const now = new Date();
  const monthLabels = [];
  const monthCounts = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    monthLabels.push(label);
    const count = allRecords.filter(r => {
      if (!r.created_at) return false;
      const rd = new Date(r.created_at);
      return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear();
    }).length;
    monthCounts.push(count);
  }

  const hasMonthlyData = monthCounts.some(c => c > 0);
  chartTrend = new Chart(trendCtx, {
    type: 'line',
    data: {
      labels: monthLabels,
      datasets: [{
        label: 'Total Reports',
        data: hasMonthlyData ? monthCounts : [],
        borderColor: '#e64980',
        backgroundColor: 'rgba(230,73,128,0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#e64980'
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: { display: !hasMonthlyData, text: 'No data available yet', color: '#a3b1cc', font: { size: 13 } }
      },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a3b1cc' } },
        x: { ticks: { color: '#a3b1cc' } }
      }
    }
  });

  // Category breakdown (complaints only)
  const catMap = {};
  compData.forEach(r => { if (r.category) catMap[r.category] = (catMap[r.category] || 0) + 1; });
  const catLabels = Object.keys(catMap);
  const catValues = Object.values(catMap);

  chartCategory = new Chart(catCtx, {
    type: 'doughnut',
    data: {
      labels: catLabels.length ? catLabels : ['No Data'],
      datasets: [{
        data: catValues.length ? catValues : [1],
        backgroundColor: catValues.length
          ? ['#e64980', '#5f3dc4', '#0ea5e9', '#f59e0b', '#10b981', '#f43f5e', '#8b5cf6']
          : ['#334155']
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: '#a3b1cc', font: { size: 11 } } } }
    }
  });

  // District distribution
  const distMap = {};
  allRecords.forEach(r => { if (r.district) distMap[r.district] = (distMap[r.district] || 0) + 1; });
  const distLabels = Object.keys(distMap).sort((a,b) => distMap[b]-distMap[a]).slice(0, 6);
  const distValues = distLabels.map(d => distMap[d]);

  chartDistrict = new Chart(distCtx, {
    type: 'bar',
    data: {
      labels: distLabels.length ? distLabels : ['No Data'],
      datasets: [{
        label: 'Total Reports',
        data: distValues.length ? distValues : [0],
        backgroundColor: '#0ea5e9',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#a3b1cc' }, grid: { color: 'rgba(255,255,255,0.03)' } },
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a3b1cc' } }
      }
    }
  });
};


// ==========================================
// 19. MASTER REPORTS EXPORTS REGISTRY
// ==========================================
window.runReportsQuery = async function() {
  const tableHead = document.getElementById('reportsTableHeader');
  const tableBody = document.getElementById('reportsTableBody');
  if (!tableHead || !tableBody) return;
  
  const moduleTable = document.getElementById('repModule').value;
  const district = document.getElementById('repDistrict').value;
  const status = document.getElementById('repStatus').value;
  const query = document.getElementById('repSearch').value.trim();
  
  tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;"><div class="skeleton" style="height:35px; width:100%;"></div></td></tr>';
  
  // Set headers dynamically
  if (moduleTable === 'complaints') {
    tableHead.innerHTML = `
      <tr>
        <th>ID</th>
        <th>Category</th>
        <th>District</th>
        <th>Officer</th>
        <th>Status</th>
        <th>Filing Date</th>
      </tr>
    `;
  } else if (moduleTable === 'ars_reports') {
    tableHead.innerHTML = `
      <tr>
        <th>ID</th>
        <th>Citizen Name</th>
        <th>Location</th>
        <th>Officer</th>
        <th>Status</th>
        <th>Report Date</th>
      </tr>
    `;
  } else if (moduleTable === 'mhd_requests') {
    tableHead.innerHTML = `
      <tr>
        <th>ID</th>
        <th>Name</th>
        <th>Mobile</th>
        <th>Station</th>
        <th>Status</th>
        <th>Date</th>
      </tr>
    `;
  } else if (moduleTable === 'counselling_bookings') {
    tableHead.innerHTML = `
      <tr>
        <th>ID</th>
        <th>Name</th>
        <th>Specialist</th>
        <th>Scheduled Time</th>
        <th>Status</th>
        <th>Preferred Date</th>
      </tr>
    `;
  } else if (moduleTable === 'empowerment_applications') {
    tableHead.innerHTML = `
      <tr>
        <th>ID</th>
        <th>Welfare Program</th>
        <th>Applicant</th>
        <th>Age/Gender</th>
        <th>Status</th>
        <th>Date</th>
      </tr>
    `;
  } else if (moduleTable === 'emergency_requests') {
    tableHead.innerHTML = `
      <tr>
        <th>ID</th>
        <th>Distress Type</th>
        <th>Location</th>
        <th>Mobile</th>
        <th>Status</th>
        <th>Time</th>
      </tr>
    `;
  }

  let list = [];
  if (isSupabaseConfigured) {
    let q = supabase.from(moduleTable).select('*');
    if (district) q = q.eq('district', district);
    if (status) q = q.eq('status', status);
    const { data } = await q.order('created_at', { ascending: false });
    list = data || [];
  } else {
    let key = '';
    if (moduleTable === 'complaints') key = MOCK_COMPLAINTS;
    if (moduleTable === 'ars_reports') key = MOCK_ARS_REPORTS;
    if (moduleTable === 'mhd_requests') key = MOCK_MHD_REQUESTS;
    if (moduleTable === 'counselling_bookings') key = MOCK_COUNSELLING_BOOKINGS;
    if (moduleTable === 'empowerment_applications') key = MOCK_EMPOWERMENT_APPLICATIONS;
    if (moduleTable === 'emergency_requests') key = MOCK_EMERGENCY_REQUESTS;
    
    list = JSON.parse(localStorage.getItem(key) || '[]');
    if (district) list = list.filter(r => r.district === district);
    if (status) list = list.filter(r => r.status === status);
  }
  
  if (query) {
    list = list.filter(r => 
      r.id.toLowerCase().includes(query.toLowerCase()) ||
      (r.name && r.name.toLowerCase().includes(query.toLowerCase())) ||
      (r.location && r.location.toLowerCase().includes(query.toLowerCase()))
    );
  }
  
  if (list.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:#a3b1cc;">No registry records found.</td></tr>`;
    return;
  }
  
  tableBody.innerHTML = list.map(r => {
    let col1 = r.id;
    let col2 = r.category || r.scheme_title || r.type || 'Standard';
    let col3 = r.district || r.location || 'N/A';
    let col4 = r.assigned_officer_id || r.station || 'Unassigned';
    let col5 = r.status;
    let col6 = new Date(r.created_at || new Date()).toLocaleDateString();
    
    if (moduleTable === 'ars_reports') {
      col2 = r.name;
      col3 = r.location;
    } else if (moduleTable === 'mhd_requests') {
      col2 = r.name;
      col3 = r.mobile;
      col4 = r.police_station;
    } else if (moduleTable === 'counselling_bookings') {
      col2 = r.name;
      col3 = r.assigned_counsellor_id || 'Pending assignment';
      col4 = r.session_date ? `${r.session_date} ${r.session_time}` : 'Pending Scheduling';
      col6 = r.preferred_date;
    } else if (moduleTable === 'empowerment_applications') {
      col2 = r.scheme_title;
      col3 = r.name;
      col4 = `Age: ${r.age} (${r.gender})`;
    } else if (moduleTable === 'emergency_requests') {
      col2 = r.type;
      col3 = r.location;
      col4 = r.mobile;
      col6 = new Date(r.created_at || new Date()).toLocaleTimeString();
    }
    
    return `
      <tr>
        <td><strong>${col1}</strong></td>
        <td>${col2}</td>
        <td>${col3}</td>
        <td>${col4}</td>
        <td><span class="admin-badge ${getStatusClass(col5)}">${col5}</span></td>
        <td>${col6}</td>
      </tr>
    `;
  }).join('');
};

window.exportMasterReportCSV = async function() {
  const table = document.getElementById('repModule').value;
  let list = [];
  
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false });
    if (error) { showToast('Export failed: ' + error.message, 'error'); return; }
    list = data || [];
  } else {
    let key = '';
    if (table === 'complaints') key = MOCK_COMPLAINTS;
    if (table === 'ars_reports') key = MOCK_ARS_REPORTS;
    if (table === 'mhd_requests') key = MOCK_MHD_REQUESTS;
    if (table === 'counselling_bookings') key = MOCK_COUNSELLING_BOOKINGS;
    if (table === 'empowerment_applications') key = MOCK_EMPOWERMENT_APPLICATIONS;
    if (table === 'emergency_requests') key = MOCK_EMERGENCY_REQUESTS;
    list = JSON.parse(localStorage.getItem(key) || '[]');
  }
  
  if (list.length === 0) {
    showToast("No data to export.", "warning");
    return;
  }
  
  let csv = "ID,Name,Mobile,District,Status,Created At\n";
  list.forEach(r => {
    csv += `"${r.id}","${(r.name || 'Anonymous').replace(/"/g,'""')}","${r.mobile || ''}","${r.district || ''}","${r.status || ''}","${r.created_at || ''}"\n`;
  });
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `shakticop_${table}_${Date.now()}.csv`;
  a.click();
  showToast(`CSV export downloaded: ${list.length} records.`, "success");
};


// ==========================================
// 20. REALTIME POSTGRES REPLICATION HOOKS
// ==========================================
function subscribeRealtimeEventsAdmin() {
  if (!isSupabaseConfigured) return;
  
  // Realtime updates for admin dashboard queues
  supabase.channel('admin-db-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public' }, payload => {
      showToast(`New incoming ${payload.table} report received!`, 'warning');
      reloadAdminView();
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public' }, payload => {
      reloadAdminView();
    })
    .subscribe();
}

function subscribeRealtimeEventsUser() {
  if (!isSupabaseConfigured || !currentSessionUser) return;
  
  // Realtime updates for user timeline & notifications
  supabase.channel('user-db-changes')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public' }, payload => {
      if (payload.new && payload.new.email === currentSessionUser.email) {
        showToast(`Case reference ${payload.new.id} status updated to: ${payload.new.status}`, 'success');
        fetchUserDashboardData();
        fetchUserNotifications();
      }
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
      if (payload.new && payload.new.user_email === currentSessionUser.email) {
        showToast(`Alert Notification: ${payload.new.title}`, 'info');
        fetchUserNotifications();
      }
    })
    .subscribe();
}


// ==========================================
// AUDIO COMPLAINT RECORDER MODULE
// ==========================================
window.startAudioRecording = async function() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = () => {
      activeRecordingBlob = new Blob(audioChunks, { type: 'audio/webm' });
      document.getElementById('audioPlayback').src = URL.createObjectURL(activeRecordingBlob);
      document.getElementById('audioPlayPreview').style.display = 'block';
      document.getElementById('audioSubmitBtn').removeAttribute('disabled');
    };
    
    mediaRecorder.start();
    isRecording = true;
    recSecs = 0;
    document.getElementById('recStartBtn').setAttribute('disabled', 'true');
    document.getElementById('recStopBtn').removeAttribute('disabled');
    
    recTimer = setInterval(() => {
      recSecs++;
      const m = String(Math.floor(recSecs / 60)).padStart(2, '0');
      const s = String(recSecs % 60).padStart(2, '0');
      document.getElementById('audioTimer').textContent = `${m}:${s}`;
      
      // Animate wave lines
      document.querySelectorAll('.wave-bar').forEach(b => {
        b.style.height = (Math.floor(Math.random() * 32) + 8) + 'px';
      });
    }, 1000);
    
  } catch (err) {
    showToast(`Mic access denied: ${err.message}`, 'error');
  }
};

window.stopAudioRecording = function() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    clearInterval(recTimer);
    isRecording = false;
    document.getElementById('recStopBtn').setAttribute('disabled', 'true');
    document.getElementById('recStartBtn').removeAttribute('disabled');
    document.querySelectorAll('.wave-bar').forEach(b => b.style.height = '8px');
  }
};

window.submitAudioComplaint = async function() {
  const name = document.getElementById('aud-name').value.trim();
  const mobile = document.getElementById('aud-phone').value.trim();
  const district = document.getElementById('aud-district').value;
  const email = currentSessionUser ? currentSessionUser.email : 'guest@shakticop.gov.in';
  
  if (!name || !mobile || !district || !activeRecordingBlob) return;
  
  let recordId = '';
  if (isSupabaseConfigured) {
    const filename = `voice_${Date.now()}.webm`;
    const { error: uploadErr } = await supabase.storage.from('documents').upload(filename, activeRecordingBlob);
    if (uploadErr) {
      showToast(`Audio upload failed: ${uploadErr.message}`, 'error');
      return;
    }
    
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filename);
    const audioUrl = urlData.publicUrl;
    
    const { data, error } = await supabase.from('complaints').insert({
      name, mobile, email, district, police_station: 'Voice Registry Cell', category: 'Voice Complaint', incident_date: new Date().toISOString().split('T')[0], incident_time: '12:00', location: 'Recorded Voice Input', description: 'Voice memo complaint submitted.', video_url: audioUrl
    }).select('id').single();
    
    if (error) {
      showToast(`Filing audio complaint failed: ${error.message}`, 'error');
      return;
    }
    recordId = data.id;
  } else {
    recordId = 'SC2026' + Math.floor(1000 + Math.random()*9000);
    const list = JSON.parse(localStorage.getItem(MOCK_COMPLAINTS) || '[]');
    list.push({
      id: recordId, name, mobile, email, district, police_station: 'Voice Registry Cell', category: 'Voice Complaint', incident_date: new Date().toISOString().split('T')[0], incident_time: '12:00', location: 'Recorded Voice Input', description: 'Voice memo complaint submitted.', status: 'Pending', created_at: new Date().toISOString()
    });
    localStorage.setItem(MOCK_COMPLAINTS, JSON.stringify(list));
  }
  
  await insertHistoryLog(recordId, 'Pending', null, 'Voice FIR audio complaint registered.', email);
  showToast(`Voice FIR complaint recorded. Reference ID: ${recordId}`, 'success');
  closeModal('modalAudio');
  document.getElementById('audioForm').reset();
  document.getElementById('audioPlayPreview').style.display = 'none';
  document.getElementById('audioTimer').textContent = '00:00';
  if (currentSessionUser) fetchUserDashboardData();
};


// ==========================================
// 21. STATIC DICTIONARY POPULATION
// ==========================================
window.populateComplaintStations = function(district) {
  const stationSel = document.getElementById('c-station');
  if (!stationSel) return;
  
  stationSel.innerHTML = '<option value="">Select Station</option>';
  if (!district) return;
  
  if (district === 'Etawah') {
    stationSel.innerHTML += `
      <option value="Civil Lines PS">Civil Lines PS</option>
      <option value="Jaswantnagar PS">Jaswantnagar PS</option>
      <option value="Chakarnagar PS">Chakarnagar PS</option>
    `;
  } else {
    stationSel.innerHTML += `
      <option value="Hazratganj PS">Hazratganj PS</option>
      <option value="Gomti Nagar PS">Gomti Nagar PS</option>
      <option value="Kalyanpur PS">Kalyanpur PS</option>
    `;
  }
};

window.populateHelpDeskStations = function(district) {
  const stationSel = document.getElementById('hd-station');
  if (!stationSel) return;
  stationSel.innerHTML = '<option value="">Select Station</option>';
  if (!district) return;
  
  if (district === 'Etawah') {
    stationSel.innerHTML += `
      <option value="Civil Lines PS">Civil Lines PS</option>
      <option value="Jaswantnagar PS">Jaswantnagar PS</option>
      <option value="Chakarnagar PS">Chakarnagar PS</option>
    `;
  } else {
    stationSel.innerHTML += `
      <option value="Hazratganj PS">Hazratganj PS</option>
      <option value="Gomti Nagar PS">Gomti Nagar PS</option>
      <option value="Kalyanpur PS">Kalyanpur PS</option>
    `;
  }
};


// ==========================================
// 22. SUPABASE DIAGNOSTIC TOOL (Admin Only)
// ==========================================
window.runSupabaseDiagnostic = async function() {
  const resultEl = document.getElementById('supabaseDiagnosticResults');
  if (!resultEl) {
    alert('Diagnostic panel not found. Open Admin → System tab or run from console.');
    return;
  }
  
  resultEl.innerHTML = '<p style="color:#a3b1cc; font-size:12px;">🔍 Running diagnostic...</p>';
  const results = [];
  
  // 1. Check env variables
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  results.push({ label: 'VITE_SUPABASE_URL', pass: !!(envUrl && envUrl !== 'https://your-project-id.supabase.co'), detail: envUrl ? `${envUrl.substring(0,30)}...` : 'NOT SET' });
  results.push({ label: 'VITE_SUPABASE_ANON_KEY', pass: !!(envKey && envKey.length > 20), detail: envKey ? `${envKey.substring(0,10)}...` : 'NOT SET' });
  results.push({ label: 'isSupabaseConfigured', pass: isSupabaseConfigured, detail: String(isSupabaseConfigured) });

  if (!isSupabaseConfigured) {
    results.push({ label: 'DB Connection', pass: false, detail: 'Supabase not configured — LocalStorage mode active' });
  } else {
    // 2. Test DB connectivity
    try {
      const { data, error } = await supabase.from('categories').select('id').limit(1);
      results.push({ label: 'DB Connection', pass: !error, detail: error ? error.message : `OK (${data?.length || 0} categories)` });
    } catch(e) { results.push({ label: 'DB Connection', pass: false, detail: e.message }); }
    
    // 3. Test each table
    const tables = ['complaints', 'ars_reports', 'mhd_requests', 'counselling_bookings', 'empowerment_applications', 'emergency_requests', 'officers', 'contacts', 'module_history', 'notifications'];
    for (const t of tables) {
      try {
        const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
        results.push({ label: `Table: ${t}`, pass: !error, detail: error ? error.message : `${count || 0} rows` });
      } catch(e) { results.push({ label: `Table: ${t}`, pass: false, detail: e.message }); }
    }
    
    // 4. Test Auth
    try {
      const { data: { session } } = await supabase.auth.getSession();
      results.push({ label: 'Auth Session', pass: true, detail: session ? `Logged in as ${session.user.email}` : 'No active session (expected if not logged in)' });
    } catch(e) { results.push({ label: 'Auth Session', pass: false, detail: e.message }); }
    
    // 5. Test Realtime
    try {
      const channel = supabase.channel('diag-test');
      results.push({ label: 'Realtime Channel', pass: true, detail: `Channel created (${channel.state})` });
    } catch(e) { results.push({ label: 'Realtime Channel', pass: false, detail: e.message }); }
  }
  
  // Render results
  const pass = results.filter(r => r.pass).length;
  const fail = results.filter(r => !r.pass).length;
  
  resultEl.innerHTML = `
    <div style="margin-bottom:12px; font-weight:700; font-size:13px; color:${fail === 0 ? '#10b981' : '#f59e0b'};">
      ✅ Passed: ${pass} &nbsp;|&nbsp; ❌ Failed: ${fail} &nbsp;of&nbsp; ${results.length} checks
    </div>
    ${results.map(r => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.04); font-size:11px;">
        <div style="color:${r.pass ? '#10b981' : '#ef4444'}; font-weight:600;">${r.pass ? '✅' : '❌'} ${r.label}</div>
        <div style="color:#a3b1cc; font-family:monospace; font-size:10px; max-width:200px; text-align:right; word-break:break-all;">${r.detail}</div>
      </div>
    `).join('')}
    <div style="margin-top:12px; font-size:10px; color:#64748b;">Diagnostic completed at ${new Date().toLocaleString()}</div>
  `;
  
  console.log('Supabase Diagnostic Results:', results);
  return results;
};

// Console shortcut for quick diagnostic
window.diag = window.runSupabaseDiagnostic;


// ==========================================
// 23. MOBILE UX CONTROLS
// ==========================================
function getCompactEmail(email) {
  if (!email) return 'Guest';
  const [name, domain = ''] = String(email).split('@');
  if (name.length <= 8) return domain ? `${name}@${domain}` : name;
  return `${name.slice(0, 8)}...`;
}

function updateMobileUserChrome() {
  const emailEl = document.getElementById('mobileDrawerEmail');
  if (emailEl) emailEl.textContent = currentSessionUser ? currentSessionUser.email : 'Guest user';

  const badgeText = document.getElementById('userBadgeText');
  if (badgeText && currentSessionUser) badgeText.textContent = currentSessionUser.email;
}

function updateMobileNotificationBadges(count = 0) {
  ['mobileNotificationsBadge', 'mobileDashboardBadge'].forEach(id => {
    const badge = document.getElementById(id);
    if (!badge) return;
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.hidden = count <= 0;
  });
}

function updateMobileNavState(tab = activePublicTab) {
  document.querySelectorAll('.mobile-bottom-nav button, .mobile-drawer-nav button').forEach(btn => {
    const action = btn.dataset.mobileAction;
    const dash = btn.dataset.mobileDashboard;
    const isActive =
      (tab === 'shakti' && (action === 'home' || action === 'shakti')) ||
      (tab === 'police' && action === 'police') ||
      (tab === 'dashboard' && (action === 'dashboard' || dash === currentUserDashTab));
    btn.classList.toggle('active', Boolean(isActive));
  });
}

function openMobileDrawer() {
  const drawer = document.getElementById('mobileDrawer');
  const toggle = document.getElementById('mobileMenuToggle');
  if (!drawer || !toggle) return;
  document.body.classList.add('mobile-drawer-open');
  drawer.setAttribute('aria-hidden', 'false');
  toggle.setAttribute('aria-expanded', 'true');
  const first = drawer.querySelector('button');
  if (first) first.focus({ preventScroll: true });
}

function closeMobileDrawer() {
  const drawer = document.getElementById('mobileDrawer');
  const toggle = document.getElementById('mobileMenuToggle');
  if (!drawer || !toggle) return;
  document.body.classList.remove('mobile-drawer-open');
  drawer.setAttribute('aria-hidden', 'true');
  toggle.setAttribute('aria-expanded', 'false');
}

window.closeMobileDrawer = closeMobileDrawer;

function goToDashboardSubtab(tabName) {
  if (!currentSessionUser) {
    openModal('modalLogin');
    return;
  }
  switchTab('dashboard');
  if (typeof window.switchUserDashboardTab === 'function') {
    window.switchUserDashboardTab(tabName);
  }
  updateMobileNavState('dashboard');
}

function handleMobileNavigation(action) {
  if (action === 'more') {
    openMobileDrawer();
    return;
  }
  if (action === 'home') {
    switchTab('shakti');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (action === 'shakti') {
    switchTab('shakti');
    document.getElementById('publicMainWrap')?.scrollIntoView({ behavior: 'smooth' });
  } else if (action === 'police') {
    switchTab('police');
    document.getElementById('publicMainWrap')?.scrollIntoView({ behavior: 'smooth' });
  } else if (action === 'dashboard') {
    if (!currentSessionUser) openModal('modalLogin');
    else switchTab('dashboard');
  } else if (action === 'notifications') {
    goToDashboardSubtab(currentUserDashTab || 'complaints');
    setTimeout(() => document.getElementById('userNotificationsList')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
  } else if (action === 'profile') {
    goToDashboardSubtab(currentUserDashTab || 'complaints');
    setTimeout(() => document.getElementById('citizenProfileCard')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
  } else if (action === 'emergency') {
    switchTab('shakti');
    setTimeout(() => document.getElementById('publicEmergencyBar')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  } else if (action === 'settings') {
    showToast('Settings panel is coming soon.', 'info');
  } else if (action === 'logout') {
    if (currentSessionUser) doLogout();
    else openModal('modalLogin');
  }
  closeMobileDrawer();
  updateMobileNavState();
}

function initMobileUx() {
  const toggle = document.getElementById('mobileMenuToggle');
  const close = document.getElementById('mobileDrawerClose');
  const overlay = document.getElementById('mobileDrawerOverlay');
  const dashboardToggle = document.getElementById('mobileDashboardToggle');
  const dashboardMenu = document.getElementById('mobileDashboardMenu');
  const backToTop = document.getElementById('backToTopBtn');

  toggle?.addEventListener('click', openMobileDrawer);
  close?.addEventListener('click', closeMobileDrawer);
  overlay?.addEventListener('click', closeMobileDrawer);
  dashboardToggle?.addEventListener('click', () => {
    const isOpen = !dashboardMenu?.classList.contains('open');
    dashboardMenu?.classList.toggle('open', isOpen);
    dashboardToggle.setAttribute('aria-expanded', String(isOpen));
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMobileDrawer();
  });

  document.querySelectorAll('[data-mobile-action]').forEach(btn => {
    btn.addEventListener('click', () => handleMobileNavigation(btn.dataset.mobileAction));
  });

  document.querySelectorAll('[data-mobile-dashboard]').forEach(btn => {
    btn.addEventListener('click', () => {
      goToDashboardSubtab(btn.dataset.mobileDashboard);
      closeMobileDrawer();
      updateMobileNavState('dashboard');
    });
  });

  backToTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  window.addEventListener('scroll', () => {
    backToTop?.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });

  updateMobileUserChrome();
  updateMobileNavState();
}


// ==========================================
// 24. ANNOUNCEMENT BAR LOADER
// ==========================================
async function loadAnnouncementBar() {
  const bar = document.getElementById('announcementBar');
  const text = document.getElementById('announcementText');
  if (!bar || !text) return;
  
  let announcements = [];
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('announcements').select('*').eq('active', true).order('created_at', { ascending: false }).limit(5);
    announcements = data || [];
  } else {
    announcements = JSON.parse(localStorage.getItem(MOCK_ANNOUNCEMENTS) || '[]').filter(a => a.active);
  }
  
  if (announcements.length === 0) return;
  
  bar.style.display = 'block';
  
  // Rotate through announcements every 4 seconds
  let idx = 0;
  const updateText = () => {
    const a = announcements[idx];
    text.textContent = `[${a.type || 'Notice'}] ${a.title}: ${a.content}`;
    idx = (idx + 1) % announcements.length;
  };
  updateText();
  if (announcements.length > 1) {
    setInterval(updateText, 4000);
  }
}

// Call on initial load for non-logged in users too
document.addEventListener('DOMContentLoaded', () => {
  loadAnnouncementBar();
});


document.addEventListener('DOMContentLoaded', () => {
  seedSimulatorIfNeeded();
  initMobileUx();
  applyLanguage();
  switchTab('shakti');
});

// Helper lpad
function lpad(str, len, char) {
  str = String(str);
  while(str.length < len) str = char + str;
  return str;
}

