(function(){
  const API_BASE = ''; // той самий домен

  function isAdmin(user){
    if (!user) return false;
    // 1) roles: ['admin', ...] або [{name:'admin'}, ...]
    if (Array.isArray(user.roles)) {
      const normalized = user.roles.map(r => {
        if (typeof r === 'string') return r.toLowerCase();
        if (r && typeof r === 'object') {
          return String(r.name || r.title || r.role || '').toLowerCase();
        }
        return '';
      });
      if (normalized.some(x => x.includes('admin') || x.includes('адмін'))) return true;
    }
    // 2) role: 'admin' або { name:'admin' }
    const one = typeof user.role === 'string'
      ? user.role.toLowerCase()
      : (user.role && (user.role.name || user.role.title || user.role.role || '')).toLowerCase();
    return one && (one.includes('admin') || one.includes('адмін'));
  }

  function redirectToLogin(){
    // вернемося сюди після логіну
    const back = encodeURIComponent(location.pathname + location.search);
    location.href = `/admin/admin-login.html?returnUrl=${back}`;
  }

  async function fetchProfile(){
    const res = await fetch(`${API_BASE}/api/users/profile`, { credentials:'include' });
    if (!res.ok) return null;
    try { return await res.json(); } catch { return null; }
  }

  // викликати на сторінках адмінки
  window.requireAdminPage = async function requireAdminPage() {
    try {
      // пропускаємо саму сторінку логіну
      if (/\/admin\/admin-login\.html(?:$|\?)/i.test(location.pathname)) return;

      // 1) швидка локальна перевірка
      const stored = JSON.parse(localStorage.getItem('user') || 'null');
      if (isAdmin(stored)) return;

      // 2) підтвердження на сервері (за кукою)
      const data = await fetchProfile();
      const user = data?.user;
      if (!isAdmin(user)) throw new Error('not admin');

      // оновимо локальне сховище
      localStorage.setItem('user', JSON.stringify(user));
    } catch (_) {
      redirectToLogin();
    }
  };

  // обгортка для fetch — якщо 401/403 → логін з поверненням
  window.adminFetch = async function(url, opts = {}) {
    const res = await fetch(url, Object.assign({ credentials:'include' }, opts));
    if (res.status === 401 || res.status === 403) {
      redirectToLogin();
      throw new Error('Unauthorized/Forbidden');
    }
    return res;
  };

  // корисний хелпер для кнопки «Вийти»
  window.adminLogout = function(){
    try { localStorage.removeItem('user'); localStorage.removeItem('token'); } catch(_){}
    // (опційно) await fetch('/api/users/logout', {method:'POST', credentials:'include'}).catch(()=>{});
    redirectToLogin();
  };
})();

// Вызывай на каждой админ-странице: renderAdminSidebar('имя_файла.html')
window.renderAdminSidebar = function renderAdminSidebar(current) {
  const host = document.getElementById('sidebar');
  if (!host) return;

  const here = current || location.pathname.split('/').pop();

  host.innerHTML = `
    <div class="sidebar__top">
      <img class="logo" src="../assets/sidebar/IPS Logo (2).svg" alt="IPS Logo" />
      <button class="sb-toggle" id="sbToggle" aria-label="Згорнути/розгорнути меню" title="Згорнути/розгорнути">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M15 6l-6 6 6 6" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>

    <p style="margin: 6px 8px 10px; font-weight: 600;">Admin</p>

    <div class="sidebar__scroll">
      <nav role="navigation" aria-label="Admin navigation">
        <a href="admin-requests.html" ${here==='admin-requests.html'?'class="active"':''}>
          <img src="../assets/sidebar/profile.svg" alt="" /><span>Профайли</span>
        </a>
        <a href="admin-certificate.html" ${here==='admin-certificate.html'?'class="active"':''}>
          <img src="../assets/sidebar/news.svg" alt="" /><span>Сертифікати</span>
        </a>
        <a href="admin-career-faq.html" ${here==='admin-career-faq.html'?'class="active"':''}>
          <img src="../assets/sidebar/3.svg" alt="" /><span>Планування<br>кар'єри</span>
        </a>
        <a href="admin-library.html" ${here==='admin-library.html'?'class="active"':''}>
          <img src="../assets/sidebar/4.svg" alt="" /><span>Бібліотека</span>
        </a>
        <a href="admin-all-courses.html" ${here==='admin-all-courses.html'?'class="active"':''}>
          <img src="../assets/sidebar/5.svg" alt="" /><span>Курси</span>
        </a>
         <a href="admin-forum.html" ${here==='admin-forum.html'?'class="active"':''}>
           <img src="../assets/sidebar/10.svg" alt="" /><span>Форум</span>
         </a>
        <a href="#" >
          <img src="../assets/sidebar/6.svg" alt="" /><span>Облік практики</span>
        </a>
        <a href="#">
          <img src="../assets/sidebar/7.svg" alt="" /><span>Здоров’я</span>
        </a>
        <a href="#">
          <img src="../assets/sidebar/8.svg" alt="" /><span>Фінанси</span>
        </a>
        <a href="#">
          <img src="../assets/sidebar/9.svg" alt="" /><span>Нерухомість</span>
        </a>
      </nav>
    </div>

    <div class="sidebar-actions">
      <a class="action-btn settings" href="admin-roles.html">
        <img src="./images/settings.svg" alt="" width="18" height="18" />
        <span>Налаштування</span>
      </a>
      <button class="action-btn logout" id="btnLogout">
        <img src="../assets/sidebar/log-out.svg" alt="" width="18" height="18" />
        <span>Вийти</span>
      </button>
    </div>
  `;

  // bind: logout
  const btn = host.querySelector('#btnLogout');
if (btn) btn.addEventListener('click', logoutUser);

// всегда открытый сайдбар, без localStorage и переключателя
const root = document.body;
root.classList.add('with-sidebar');
root.classList.remove('sidebar-collapsed'); // на всякий случай, если где-то остался


  const tgl = host.querySelector('#sbToggle');
  if (tgl) tgl.addEventListener('click', () => {
    const now = !root.classList.contains('sidebar-collapsed');
    root.classList.toggle('sidebar-collapsed', now);
    localStorage.setItem('adm.sidebarCollapsed', now ? '1' : '0');
  });
};