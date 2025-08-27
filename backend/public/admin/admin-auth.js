// /public/admin/admin-auth.js
(function(){
  const API_BASE = ''; // якщо твій бекенд на цьому ж домені

  // викликати на кожній адмін-сторінці одразу після DOMContentLoaded
  window.requireAdminPage = async function requireAdminPage() {
    try {
      // 1) локально перевіримо роль (швидко)
      const stored = JSON.parse(localStorage.getItem('user') || 'null');
      if (!stored || !String(stored.role||'').toLowerCase().includes('admin')) {
        // 2) пробуємо підтвердити через серверний профіль (кукі)
        const res = await fetch(`${API_BASE}/api/users/profile`, { credentials:'include' });
        if (!res.ok) throw new Error('no profile');
        const data = await res.json();
        const role = (data?.user?.role || '').toString().toLowerCase();
        if (!role.includes('admin')) throw new Error('not admin');
        // зберігаємо актуального юзера
        localStorage.setItem('user', JSON.stringify(data.user));
      }
    } catch (_) {
      alert('Доступ лише для адміністратора');
      location.href = '/admin/admin-login.html';
    }
  };

  // обгортка для fetch — якщо 401/403, відправимо на логін
  window.adminFetch = async function(url, opts = {}) {
    const res = await fetch(url, Object.assign({ credentials:'include' }, opts));
    if (res.status === 401 || res.status === 403) {
      alert('Сесія завершилась або доступ заборонено. Увійдіть як адмін.');
      location.href = '/admin/admin-login.html';
      throw new Error('Unauthorized/Forbidden');
    }
    return res;
  };
})();