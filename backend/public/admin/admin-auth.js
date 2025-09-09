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