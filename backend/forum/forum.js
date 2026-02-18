// Универсальный фронтовый модуль форума
// Предполагает, что бэк смонтирован как app.use('/api/forum', forumRoutes)

window.Forum = (function () {
  const API_BASE = ''; // тот же домен
  let currentUser = null;
  let roleSet = new Set();

  // ---- auth helpers ----
  function getAuthToken() {
    // пробуем все популярные варианты хранения
    const direct =
      localStorage.getItem('token') ||
      localStorage.getItem('authToken') ||
      localStorage.getItem('jwt') ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem('bearer') ||
      null;

    if (direct) return direct;

    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return u.token || u.accessToken || null;
    } catch (_) {
      return null;
    }
  }





// === Sidebar hover-to-open + pin state ===
let sidebarPinned = false;
let drawerMenuBound = false;

// Try to restore pin state
try {
  sidebarPinned = JSON.parse(localStorage.getItem('sidebarPinned') || 'false');
} catch (_) {
  sidebarPinned = false;
}

function isTouchDevice(){
  return (('ontouchstart' in window) || (navigator.maxTouchPoints > 0));
}

function isMobile() {
  return window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
}

function getDrawerBackdrop() {
  return document.getElementById('drawerBackdrop') || document.getElementById('backdrop');
}

function setBurgerExpanded(isOpen) {
  const burger = document.getElementById('burgerBtn');
  if (burger) burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

function openMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  sidebar.classList.add('open');
  const backdrop = getDrawerBackdrop();
  if (backdrop) backdrop.classList.add('active');
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  setBurgerExpanded(true);
}

function closeMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  sidebar.classList.remove('open');
  const backdrop = getDrawerBackdrop();
  if (backdrop) backdrop.classList.remove('active');
  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';
  setBurgerExpanded(false);
}

function applySidebarState() {
  const sidebar = document.getElementById('sidebar');
  const arrow = document.getElementById('toggleArrow');
  if (!sidebar) return;

  if (sidebarPinned) {
    sidebar.classList.add('expanded');
    sidebar.classList.remove('collapsed');
    if (arrow) arrow.style.transform = 'rotate(180deg)';
  } else {
    sidebar.classList.remove('expanded');
    sidebar.classList.add('collapsed');
    if (arrow) arrow.style.transform = 'rotate(0deg)';
  }
}

function enableSidebarHover() {
  const sidebar = document.getElementById('sidebar');
  const arrow = document.getElementById('toggleArrow');
  if (!sidebar) return;

  // Apply initial state (respect saved pin)
  applySidebarState();

  // On non-touch devices we expand on hover when NOT pinned
  if (!isTouchDevice() && !isMobile()) {
    sidebar.addEventListener('mouseenter', () => {
      if (!sidebarPinned) {
        sidebar.classList.add('expanded');
        sidebar.classList.remove('collapsed');
        if (arrow) arrow.style.transform = 'rotate(180deg)';
      }
    });

    sidebar.addEventListener('mouseleave', () => {
      if (!sidebarPinned) {
        sidebar.classList.remove('expanded');
        sidebar.classList.add('collapsed');
        if (arrow) arrow.style.transform = 'rotate(0deg)';
      }
    });

    // Accessibility: keep open while focusing inside with keyboard
    sidebar.addEventListener('focusin', () => {
      if (!sidebarPinned) {
        sidebar.classList.add('expanded');
        sidebar.classList.remove('collapsed');
        if (arrow) arrow.style.transform = 'rotate(180deg)';
      }
    });
    sidebar.addEventListener('focusout', (e) => {
      // Collapse only if focus moved fully outside
      if (!sidebarPinned && !sidebar.contains(document.activeElement)) {
        sidebar.classList.remove('expanded');
        sidebar.classList.add('collapsed');
        if (arrow) arrow.style.transform = 'rotate(0deg)';
      }
    });
  }
}

function toggleSidebar() {
  if (isMobile()) {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    if (sidebar.classList.contains('open')) closeMobileSidebar(); else openMobileSidebar();
    return;
  }

  sidebarPinned = !sidebarPinned;
  localStorage.setItem('sidebarPinned', JSON.stringify(sidebarPinned));
  applySidebarState();
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', enableSidebarHover);
document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('sidebar');
  const burger = document.getElementById('burgerBtn');
  const backdrop = getDrawerBackdrop();
  if (!sidebar || !burger || !backdrop || drawerMenuBound) return;

  drawerMenuBound = true;
  window.toggleSidebar = toggleSidebar;

  burger.addEventListener('click', () => {
    if (sidebar.classList.contains('open')) closeMobileSidebar(); else openMobileSidebar();
  });

  backdrop.addEventListener('click', closeMobileSidebar);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMobileSidebar();
  });

  sidebar.querySelectorAll('nav a, .logout').forEach((el) => {
    el.addEventListener('click', closeMobileSidebar);
  });
});
window.addEventListener('resize', () => {
  applySidebarState();
  if (!isMobile()) closeMobileSidebar();
});
window.toggleSidebar = toggleSidebar;

// ===== Language switch (same behavior as public pages) =====
(() => {
  const LANG_KEY = 'uiLang';
  const LANG_ATTR = { ua: 'uk', ru: 'ru', en: 'en' };
  const MENU_ORDER = ['en', 'ua', 'ru'];
  const LANG_LABELS = {
    en: 'English',
    ua: 'Українська',
    ru: 'Русский',
  };
  const SIDEBAR_I18N = {
    ua: {
      about: 'Про Мене',
      certs: 'Мої Сертифікати',
      career: "Планування Кар'єри",
      library: 'Бібліотека',
      courses: 'Мої Курси',
      forum: 'Форум',
      logout: 'Вийти з акаунту',
    },
    ru: {
      about: 'Обо мне',
      certs: 'Мои сертификаты',
      career: 'Планирование карьеры',
      library: 'Библиотека',
      courses: 'Мои курсы',
      forum: 'Форум',
      logout: 'Выйти из аккаунта',
    },
    en: {
      about: 'About Me',
      certs: 'My Certificates',
      career: 'Career Planning',
      library: 'Library',
      courses: 'My Courses',
      forum: 'Forum',
      logout: 'Log Out',
    },
  };
  const FORUM_MAIN_I18N = {
    ua: {
      title: 'ФОРУМ',
      inputPlaceholder: 'Введіть текст',
      publish: 'Опублікувати',
      loggedAs: 'Ви увійшли як',
      loggedOut: 'Ви не авторизовані',
      noTopics: 'Поки що немає тем.',
      unknownUser: 'Користувач',
      replies: { one: 'відповідь', few: 'відповіді', many: 'відповідей' },
      days: { one: 'день тому', few: 'дні тому', many: 'днів тому' },
      today: 'сьогодні',
      yesterday: 'вчора',
      thread: {
        pin: 'Закріпити',
        directMessages: 'Особисті повідомлення',
        delete: 'Видалити',
        close: 'Закрити',
        invite: 'Запросити',
        reply: 'Відповісти',
        showMore: 'Показати більше',
        showLess: 'Згорнути',
        replyTo: 'Відповідь на:',
        typeMessage: 'Напишіть Ваше повідомлення...',
        attachFile: 'Прикріпити файл',
        send: 'Надіслати',
        lockHint: 'Тема закрита для нових відповідей',
        createdBy: 'Створив',
        pinnedState: 'Закріплено',
        lockedState: 'Закрито',
        privateState: 'Приватна',
        cancel: 'Скасувати',
        fileLabel: 'Файл',
        errorGeneric: 'Помилка',
        deleteThreadConfirm: 'Видалити тему?',
        invitePrompt: 'Введіть ID користувача, якого запросити:',
        inviteSuccess: 'Користувача додано до приватної теми',
        deletePostConfirm: 'Видалити повідомлення?',
      },
    },
    ru: {
      title: 'ФОРУМ',
      inputPlaceholder: 'Введите текст',
      publish: 'Опубликовать',
      loggedAs: 'Вы вошли как',
      loggedOut: 'Вы не авторизованы',
      noTopics: 'Пока нет тем.',
      unknownUser: 'Пользователь',
      replies: { one: 'ответ', few: 'ответа', many: 'ответов' },
      days: { one: 'день назад', few: 'дня назад', many: 'дней назад' },
      today: 'сегодня',
      yesterday: 'вчера',
      thread: {
        pin: 'Закрепить',
        directMessages: 'Личные сообщения',
        delete: 'Удалить',
        close: 'Закрыть',
        invite: 'Пригласить',
        reply: 'Ответить',
        showMore: 'Показать больше',
        showLess: 'Свернуть',
        replyTo: 'Ответ на:',
        typeMessage: 'Напишите Ваше сообщение...',
        attachFile: 'Прикрепить файл',
        send: 'Отправить',
        lockHint: 'Тема закрыта для новых ответов',
        createdBy: 'Создал',
        pinnedState: 'Закреплено',
        lockedState: 'Закрыто',
        privateState: 'Личная',
        cancel: 'Отменить',
        fileLabel: 'Файл',
        errorGeneric: 'Ошибка',
        deleteThreadConfirm: 'Удалить тему?',
        invitePrompt: 'Введите ID пользователя, которого пригласить:',
        inviteSuccess: 'Пользователь добавлен в личную тему',
        deletePostConfirm: 'Удалить сообщение?',
      },
    },
    en: {
      title: 'FORUM',
      inputPlaceholder: 'Enter text',
      publish: 'Post',
      loggedAs: 'You are logged in as',
      loggedOut: 'You are not logged in',
      noTopics: 'No topics yet.',
      unknownUser: 'User',
      replies: { one: 'reply', few: 'replies', many: 'replies' },
      days: { one: 'day ago', few: 'days ago', many: 'days ago' },
      today: 'today',
      yesterday: 'yesterday',
      thread: {
        pin: 'Pin',
        directMessages: 'Direct messages',
        delete: 'Delete',
        close: 'Close',
        invite: 'Invite',
        reply: 'Reply',
        showMore: 'Show more',
        showLess: 'Show less',
        replyTo: 'Reply to:',
        typeMessage: 'Type your message',
        attachFile: 'Attach file',
        send: 'Send',
        lockHint: 'Thread is closed for new replies',
        createdBy: 'Created by',
        pinnedState: 'Pinned',
        lockedState: 'Closed',
        privateState: 'Private',
        cancel: 'Cancel',
        fileLabel: 'File',
        errorGeneric: 'Error',
        deleteThreadConfirm: 'Delete thread?',
        invitePrompt: 'Enter user ID to invite:',
        inviteSuccess: 'User was added to the private thread',
        deletePostConfirm: 'Delete message?',
      },
    },
  };

  function slavicPlural(count, forms) {
    const n = Math.abs(Number(count) || 0);
    const n100 = n % 100;
    const n10 = n % 10;
    if (n100 >= 11 && n100 <= 14) return forms.many;
    if (n10 === 1) return forms.one;
    if (n10 >= 2 && n10 <= 4) return forms.few;
    return forms.many;
  }

  function forumMainCopy(langRaw) {
    const lang = normalizeLang(langRaw || getStoredLang());
    return FORUM_MAIN_I18N[lang] || FORUM_MAIN_I18N.ua;
  }

  function formatForumReplies(count, langRaw) {
    const lang = normalizeLang(langRaw || getStoredLang());
    const copy = forumMainCopy(lang);
    if (lang === 'en') {
      const noun = Number(count) === 1 ? copy.replies.one : copy.replies.many;
      return `${count} ${noun}`;
    }
    return `${count} ${slavicPlural(count, copy.replies)}`;
  }

  function formatForumRelativeDate(input, langRaw) {
    const lang = normalizeLang(langRaw || getStoredLang());
    const copy = forumMainCopy(lang);
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return '';

    const diffMs = Date.now() - d.getTime();
    const days = Math.floor(diffMs / 86400000);
    if (days <= 0) return copy.today;
    if (days === 1) return copy.yesterday;
    if (lang === 'en') return `${days} ${copy.days.many}`;
    return `${days} ${slavicPlural(days, copy.days)}`;
  }

  function updateForumMainText(langRaw) {
    const lang = normalizeLang(langRaw || getStoredLang());
    const copy = forumMainCopy(lang);

    const title = document.getElementById('forumPageTitle');
    const queryInput = document.getElementById('q');
    const publish = document.getElementById('publishBtnText');
    const loginPrefix = document.getElementById('loginHintPrefix');
    const empty = document.getElementById('empty');

    if (title) title.textContent = copy.title;
    if (queryInput) queryInput.placeholder = copy.inputPlaceholder;
    if (publish) publish.textContent = copy.publish;
    if (loginPrefix) loginPrefix.textContent = copy.loggedAs;
    if (empty) empty.textContent = copy.noTopics;
  }

  window.getForumLang = () => window.__forumLang || getStoredLang();
  window.getForumMainCopy = (langRaw) => forumMainCopy(langRaw || window.__forumLang || getStoredLang());
  window.formatForumReplies = (count, langRaw) => formatForumReplies(count, langRaw || window.__forumLang || getStoredLang());
  window.formatForumRelativeDate = (input, langRaw) => formatForumRelativeDate(input, langRaw || window.__forumLang || getStoredLang());

  function normalizeLang(value) {
    const v = String(value || '').toLowerCase().trim();
    if (v.startsWith('uk') || v === 'ua') return 'ua';
    if (v.startsWith('ru')) return 'ru';
    if (v.startsWith('en')) return 'en';
    return 'ua';
  }

  function getStoredLang() {
    try {
      const stored = localStorage.getItem(LANG_KEY);
      if (stored) return normalizeLang(stored);
    } catch (_) {}
    return normalizeLang(document.documentElement.lang);
  }

  function setHtmlLang(lang) {
    document.documentElement.setAttribute('lang', LANG_ATTR[lang] || 'uk');
  }

  function updateSidebarText(lang) {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    const t = SIDEBAR_I18N[lang] || SIDEBAR_I18N.ua;
    const setText = (selector, text) => {
      const el = sidebar.querySelector(selector);
      if (el) el.textContent = text;
    };

    setText('nav a[href="/profile.html"] span', t.about);
    setText('nav a[href="/mycertificates.html"] span', t.certs);
    setText('nav a[href="/career-faq.html"] span', t.career);
    setText('nav a[href="/library.html"] span', t.library);
    setText('nav a[href="/my-courses.html"] span', t.courses);
    setText('nav a[href="/forum/index.html"] span', t.forum);
    setText('.logout span', t.logout);
  }

  function updateLangButton(lang) {
    const btn = document.getElementById('langBtn');
    if (!btn) return;
    const label = lang.toUpperCase();
    btn.setAttribute('aria-label', `Language: ${label}`);
    btn.setAttribute('title', label);
    btn.dataset.lang = lang;
  }

  function applyLang(lang, persist = true) {
    const normalized = normalizeLang(lang);
    updateSidebarText(normalized);
    updateForumMainText(normalized);
    updateLangButton(normalized);
    setHtmlLang(normalized);
    window.__forumLang = normalized;
    try {
      window.dispatchEvent(new CustomEvent('uiLangChange', { detail: { lang: normalized } }));
    } catch (_) {}
    if (persist) {
      try { localStorage.setItem(LANG_KEY, normalized); } catch (_) {}
    }
  }

  function buildMenu(btn) {
    const menu = document.createElement('div');
    menu.className = 'lang-menu';
    menu.setAttribute('role', 'listbox');
    menu.setAttribute('aria-label', 'Language');
    menu.hidden = true;

    MENU_ORDER.forEach((code) => {
      const opt = document.createElement('button');
      opt.type = 'button';
      opt.className = 'lang-option';
      opt.dataset.lang = code;
      opt.setAttribute('role', 'option');
      opt.textContent = LANG_LABELS[code] || code.toUpperCase();
      menu.appendChild(opt);
    });

    btn.insertAdjacentElement('afterend', menu);
    return menu;
  }

  function positionMenu(btn, menu) {
    const gap = 8;
    const rect = btn.getBoundingClientRect();
    menu.style.display = 'block';
    menu.style.visibility = 'hidden';
    const menuRect = menu.getBoundingClientRect();
    let left = rect.left;
    if (left + menuRect.width > window.innerWidth - gap) left = window.innerWidth - menuRect.width - gap;
    if (left < gap) left = gap;
    let top = rect.bottom + gap;
    if (top + menuRect.height > window.innerHeight - gap) top = rect.top - menuRect.height - gap;
    menu.style.left = `${Math.round(left)}px`;
    menu.style.top = `${Math.round(top)}px`;
    menu.style.visibility = 'visible';
  }

  function openMenu(btn, menu) {
    const current = normalizeLang(btn.dataset.lang || getStoredLang());
    menu.hidden = false;
    menu.classList.add('open');
    positionMenu(btn, menu);
    btn.setAttribute('aria-expanded', 'true');
    menu.querySelectorAll('.lang-option').forEach((opt) => {
      opt.classList.toggle('active', opt.dataset.lang === current);
    });
  }

  function closeMenu(btn, menu) {
    menu.classList.remove('open');
    menu.hidden = true;
    menu.style.display = 'none';
    btn.setAttribute('aria-expanded', 'false');
  }

  document.addEventListener('DOMContentLoaded', () => {
    const initial = getStoredLang();
    applyLang(initial, false);

    const btn = document.getElementById('langBtn');
    if (!btn) return;
    const menu = buildMenu(btn);

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (menu.classList.contains('open')) closeMenu(btn, menu); else openMenu(btn, menu);
    });

    menu.addEventListener('click', (e) => {
      const opt = e.target.closest('.lang-option');
      if (!opt) return;
      applyLang(opt.dataset.lang, true);
      closeMenu(btn, menu);
    });

    document.addEventListener('click', (e) => {
      if (btn.contains(e.target) || menu.contains(e.target)) return;
      if (menu.classList.contains('open')) closeMenu(btn, menu);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('open')) closeMenu(btn, menu);
    });

    window.addEventListener('resize', () => {
      if (menu.classList.contains('open')) positionMenu(btn, menu);
    });
  });
})();

  

async function fetchJSON(input, { headers, ...opts } = {}) {
  const token = getAuthToken();
  const baseHeaders = { Accept: 'application/json', ...(headers || {}) };
  if (token) baseHeaders.Authorization = `Bearer ${token}`;

  const res = await fetch(input, {
    credentials: 'include',
    headers: baseHeaders,
    ...opts,
  });

  const ct = (res.headers.get('content-type') || '').toLowerCase();
  let data = null, text = null;

  if (ct.includes('application/json')) {
    try { data = await res.clone().json(); } catch (e) {}
  } else {
    try { text = await res.clone().text(); } catch (e) {}
  }

  if (!res.ok) {
    const snippet = text ? text.slice(0, 200) : '';
    console.warn('Forum API error:', res.status, res.url, data || snippet);
    throw new Error(data?.message || `HTTP ${res.status}`);
  }

  if (data != null) return data;

  // Ожидали JSON, но получили HTML/текст => подскажем где именно
  console.warn('Expected JSON but got non-JSON from', res.url, 'content-type=', ct, 'sample=', (text||'').slice(0,200));
  throw new Error('Server returned non-JSON');
}

  function readUser() {
    try {
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      return u || null;
    } catch (_) { return null; }
  }

  
  function normalizeRoles(user) {
    const bag = new Set();
    if (!user) return bag;
    if (Array.isArray(user.roles)) {
      for (const r of user.roles) {
        if (!r) continue;
        if (typeof r === 'string') bag.add(r.toLowerCase());
        else if (typeof r === 'object' && r.name) bag.add(String(r.name).toLowerCase());
      }
    }
    if (user.role) {
      if (typeof user.role === 'string') bag.add(user.role.toLowerCase());
      else if (user.role.name) bag.add(String(user.role.name).toLowerCase());
    }
    return bag;
  }

  async function init() {
    currentUser = readUser();
    roleSet = normalizeRoles(currentUser);
    // провалидируем сессию/куку
    try { await fetchJSON(`${API_BASE}/api/users/profile`); } catch (_) {}
  }

  // простые проверки прав (можно расширять)
function can(action){
  // Адмін — усе дозволено
  if (roleSet.has('admin')) return true;

  // Ролі, що модеру́ють
  const modRoles = new Set([
    'moderator','модератор',
    'mentor','ментор',
    'supervisor','супервізор'
  ]);

  if (action === 'moderate:threads' || action === 'moderate:posts') {
    // якщо є хоч одна з мод-ролей — можна
    for (const r of modRoles) if (roleSet.has(r)) return true;
    return false;
  }

  if (action === 'post:create') return !!currentUser; // будь-який залогінений

  return false;
}

// ---- Display helpers (name & roles for UI) ----
function getUser(){
  return currentUser;
}

function getDisplayName(){
  const u = currentUser || readUser();
  if (!u) return '';
  // prefer fullName if exists
  const fullName = u.fullName || u.name || '';
  if (fullName && String(fullName).trim()) return String(fullName).trim();
  // try first + last
  const first = u.firstName || '';
  const last  = u.lastName  || '';
  const combo = [first, last].filter(Boolean).join(' ').trim();
  if (combo) return combo;
  // fallback to username/email
  const fallback = typeof window.getForumMainCopy === 'function'
    ? window.getForumMainCopy().unknownUser
    : 'Користувач';
  return u.username || u.email || fallback;
}

function getDisplayRoles(){
  const u = currentUser || readUser();
  if (!u) return [];
  const raw = [];
  // roles can be array of strings or objects with name
  if (Array.isArray(u.roles)){
    for (const r of u.roles){
      if (!r) continue;
      if (typeof r === 'string') raw.push(r);
      else if (r && typeof r === 'object' && r.name) raw.push(String(r.name));
    }
  }
  // singular role may be string or object with name
  if (u.role){
    if (typeof u.role === 'string') raw.push(u.role);
    else if (u.role && typeof u.role === 'object' && u.role.name) raw.push(String(u.role.name));
  }
  // de-duplicate case-insensitively but keep first-seen casing
  const seen = new Set();
  const out = [];
  for (const r of raw){
    const key = String(r).trim().toLowerCase();
    if (!key) continue;
    if (!seen.has(key)){
      seen.add(key);
      out.push(String(r).trim());
    }
  }
  return out;
}

// ---- API ----
  const api = {
    async listThreads({ q } = {}) {
      const url = new URL('/api/forum/threads', location.origin);
      if (q) url.searchParams.set('q', q);
      return fetchJSON(url.toString());
    },
    async createThread({ title, content }) {
      return fetchJSON('/api/forum/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });
    },
    async getThread(id) {
      return fetchJSON(`/api/forum/threads/${id}`);
    },
    async addPost(threadId, { content, parentId } = {}) {
      const payload = parentId ? { content, parentId } : { content };
      return fetchJSON(`/api/forum/threads/${threadId}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    },
    async togglePrivate(threadId, nextIsPrivate) {
    return fetchJSON(`/api/forum/topics/${threadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPrivate: !!nextIsPrivate })
    });
  },
 async removeParticipant(threadId, userId) {
    return fetchJSON(`/api/forum/topics/${threadId}/participants/${encodeURIComponent(userId)}`, {
      method: 'DELETE'
    });
  },

    async addParticipant(threadId, userId) {
    return fetchJSON(`/api/forum/topics/${threadId}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
  },
    async likePost(postId) {
      return fetchJSON(`/api/forum/posts/${postId}/like`, { method: 'POST' });
    },
    async deletePost(postId) {
      return fetchJSON(`/api/forum/posts/${postId}`, { method: 'DELETE' });
    },
    async togglePin(threadId) {
      return fetchJSON(`/api/forum/threads/${threadId}/pin`, { method: 'POST' });
    },
    async toggleLock(threadId) {
      return fetchJSON(`/api/forum/threads/${threadId}/lock`, { method: 'POST' });
    },
    async deleteThread(threadId) {
      return fetchJSON(`/api/forum/threads/${threadId}`, { method: 'DELETE' });
    },
    async unlikePost(postId) {
  return fetchJSON(`/api/forum/posts/${postId}/like`, { method: 'DELETE' });
},
  };

  // ---- Рендеры ----
  function escapeHtml(s = '') { return s.replace(/[&<>\"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m])); }
  function short(s, n) { s = String(s || ''); return s.length <= n ? s : s.slice(0, n - 1) + '…'; }
  function fmtDate(d) { try { return new Date(d).toLocaleString('uk-UA'); } catch (_) { return ''; } }

  function renderPosts(sel, posts) {
  const $root = document.querySelector(sel);
  if (!$root) return;
  $root.innerHTML = '';
  const lang = typeof window.getForumLang === 'function' ? window.getForumLang() : getStoredLang();
  const copy = forumMainCopy(lang);
  const threadCopy = copy.thread || {};

  (posts || []).forEach(p => {
    const canDel = Forum.can('moderate:posts') || (currentUser && String(currentUser._id) === String(p.author?._id));
    const liked = !!(p.liked ?? (Array.isArray(p.likedBy) && p.likedBy.some(id => String(id) === String(currentUser?._id))));
    const likes  = Number.isFinite(p.likes) ? p.likes : 0;
    const authorName = escapeHtml(p.author?.fullName || p.author?.username || p.author?.email || '-');
const avatarUrl  = p.author?.photoUrl || '/assets/profile-photo.png';
const when       = fmtDate(p.createdAt);

    const el = document.createElement('div');
    el.className = 'post';
    el.style.marginLeft = `${(p.depth || 0) * 24}px`;

    // Текст
    const contentHTML = p.content ? `<div class="post-content" style="margin-top:8px; white-space:pre-wrap;">${escapeHtml(p.content)}</div>` : '';

    // Вложения
    let attsHTML = '';
    if (Array.isArray(p.attachments) && p.attachments.length) {
      const parts = p.attachments.map(a => {
        if (a.kind === 'image') {
          return `
            <a class="post-attachment" href="${a.url}" target="_blank" rel="noopener">
              <img class="post-img" src="${a.url}" alt="${escapeHtml(a.name||'image')}" />
            </a>`;
        }
        return `<div class="post-attachment"><a href="${a.url}" target="_blank" rel="noopener">${escapeHtml(a.name || threadCopy.fileLabel || 'File')}</a></div>`;
      });
      attsHTML = `<div class="post-attachments">${parts.join('')}</div>`;
    }

    const rawText   = (p.content || "").toString();
const snippet80 = rawText.replace(/\s+/g, " ").trim().slice(0, 120);

   // ...
// ...
el.innerHTML = `
  <div class="post-head">
    <div class="post-author">
      <img class="avatar" src="${avatarUrl}" alt="${authorName}" />
      <div class="post-author-col">
        <div class="post-author-name">${authorName}</div>
        <div class="post-author-meta">${when}</div>
      </div>
    </div>
    <div class="actions">
      <button
        class="btn btn-ghost js-reply"
        data-id="${p._id}"
        data-snippet="${escapeHtml(snippet80).replace(/"/g, '&quot;')}"
      >${escapeHtml(threadCopy.reply || 'Reply')}</button>
      <button class="btn btn-ghost js-like" data-id="${p._id}" data-liked="${liked ? '1' : '0'}">
        <span class="js-like-count">${likes}</span>
      </button>
    </div>
  </div>
  ${contentHTML}
  ${attsHTML}
`;
    $root.appendChild(el);
  });

  // like / unlike
  $root.querySelectorAll('.js-like').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const countEl = btn.querySelector('.js-like-count');
      const likedNow = btn.dataset.liked === '1';
      btn.disabled = true;
      try {
        const r = likedNow ? await Forum.api.unlikePost(id) : await Forum.api.likePost(id);
        if (r && typeof r.likes === 'number') countEl.textContent = String(r.likes);
        btn.dataset.liked = r?.liked ? '1' : '0';
      } catch (e) {
        console.warn('like toggle error', e);
      } finally { btn.disabled = false; }
    });
  });

  // delete
  $root.querySelectorAll('.js-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm(threadCopy.deletePostConfirm || 'Delete message?')) return;
      await Forum.api.deletePost(btn.dataset.id);
      btn.closest('.post')?.remove();
    });
  });
  // reply: delegate to global setter (thread.html defines setReplyParent), or fire a CustomEvent
$root.querySelectorAll('.js-reply').forEach(btn => {
  btn.addEventListener('click', () => {
    const id = btn.dataset.id;

    // берем сниппет из data-атрибута, либо из текста поста на случай,
    // если атрибут по какой-то причине пуст
    const fallback =
      btn.closest('.post')?.querySelector('.post-content')?.textContent?.trim().slice(0, 120) || '';
    const snippet = btn.dataset.snippet || fallback;

    if (typeof window.setReplyParent === 'function') {
      window.setReplyParent(id, { snippet });
    } else {
      document.dispatchEvent(new CustomEvent('forum:set-reply-parent', {
        detail: { postId: id, snippet }
      }));
    }

    // плавный скролл к композеру и фокус на поле
    document.getElementById('composer')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.getElementById('replyText')?.focus();
  });
});
}
  function renderRoleHint(sel) {
    const el = document.querySelector(sel);
    if (!el) return;
    const name  = getDisplayName();
    const roles = getDisplayRoles();
    const copy = typeof window.getForumMainCopy === 'function'
      ? window.getForumMainCopy()
      : forumMainCopy(getStoredLang());
    el.textContent = currentUser
      ? `${copy.loggedAs} ${name} (${roles.length ? roles.join(', ') : '—'})`
      : copy.loggedOut;
  }

  function renderThreadList(sel, items, emptySel) {
  const $list  = document.querySelector(sel);
  const $empty = document.querySelector(emptySel);
  if (!$list) return;
  $list.innerHTML = '';

  if (!items || !items.length) {
    if ($empty) $empty.style.display = 'block';
    return;
  }
  if ($empty) $empty.style.display = 'none';

  items.forEach(t => {
    const lang = typeof window.getForumLang === 'function' ? window.getForumLang() : 'ua';
    const title   = escapeHtml(t.title || '');
    const name    = escapeHtml(t.author?.fullName || t.author?.username || t.author?.email || '—');
    const avatar  = t.author?.photoUrl || '/assets/profile-photo.png';
    const when    = typeof window.formatForumRelativeDate === 'function'
      ? window.formatForumRelativeDate(t.createdAt, lang)
      : fmtDate(t.createdAt);
    const replies = Number(t.postsCount || 0);
    const repliesText = typeof window.formatForumReplies === 'function'
      ? window.formatForumReplies(replies, lang)
      : `${replies} відповідей`;

    const a = document.createElement('a');
    a.href = `./thread.html?id=${t._id}`;
    a.className = 'thread-item';
    a.innerHTML = `
      <div class="thread-left">
        <div class="thread-title">${title}</div>
        <div class="thread-author">
          <img class="thread-avatar" src="${avatar}" alt="${name}" />
          <div class="thread-author-col">
            <div class="thread-author-name">${name}</div>
            <div class="thread-author-meta">${when}</div>
          </div>
        </div>
      </div>
      <div class="thread-answers">${repliesText}</div>
    `;
    $list.appendChild(a);
  });
}

  function renderThreadHead(thread, selTitle, selMeta, selActions) {
    const $t = document.querySelector(selTitle);
    const $m = document.querySelector(selMeta);
    const lang = typeof window.getForumLang === 'function' ? window.getForumLang() : getStoredLang();
    const copy = forumMainCopy(lang);
    const threadCopy = copy.thread || {};
    if ($t) $t.textContent = thread.title;
    if ($m) {
      const parts = [
        `${threadCopy.createdBy || 'Created by'}: ${thread.author?.username || thread.author?.email || '-'}`,
        fmtDate(thread.createdAt),
      ];
      if (thread.pinned) parts.push(`📌 ${threadCopy.pinnedState || 'Pinned'}`);
      if (thread.locked) parts.push(`🔒 ${threadCopy.lockedState || 'Closed'}`);
      if (thread.isPrivate) parts.push(`🔐 ${threadCopy.privateState || 'Private'}`);
      $m.textContent = parts.filter(Boolean).join(' • ');
    }
    if (selActions && can('moderate:threads')) {
      const $a = document.querySelector(selActions);
      if ($a) $a.style.display = 'flex';
    }
  }


  // --- Forum avatar helpers ---

async function forumGetFreshUserSafe() {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  let me;
  try { me = JSON.parse(raw); } catch { return null; }
  if (!me || !me._id) return me;

  try {
    const r = await fetch(`${typeof API_BASE !== 'undefined' ? API_BASE : ''}/api/users/${me._id}`, { credentials: 'include' });
    if (r.ok) {
      const fresh = await r.json();
      localStorage.setItem('user', JSON.stringify(fresh));
      return fresh;
    }
  } catch {}
  return me;
}

function forumResolvePhotoUrl(url) {
  if (typeof resolvePhotoUrl === 'function') return resolvePhotoUrl(url); // использовать общий, если есть
  if (!url) return '';
  try {
    if (/^https?:\/\//i.test(url)) return url;
    if (/^\/\//.test(url)) return window.location.protocol + url;
    const base = (typeof API_BASE !== 'undefined' ? API_BASE : '').replace(/\/+$/, '');
    const path = url.startsWith('/') ? url : '/' + url;
    return base + path;
  } catch { return url; }
}

async function forumApplyAvatars() {
  const me = await forumGetFreshUserSafe();
  const finalSrc = me?.photoUrl
    ? forumResolvePhotoUrl(me.photoUrl) + `?v=${Date.now()}`
    : '/assets/profile-photo.png';

  // 1) Аватар в сайдбаре форума
  const sidebarImg = document.querySelector('.sidebar .profile');
  if (sidebarImg) {
    sidebarImg.src = finalSrc;
    sidebarImg.onerror = () => { sidebarImg.src = '/assets/profile-photo.png'; };
  }

  // 2) Аватар рядом с полем ввода новой темы/поиска
  const actionAvatar = document.querySelector('.action-bar .avatar');
  if (actionAvatar) {
    actionAvatar.src = finalSrc;
    actionAvatar.onerror = () => { actionAvatar.src = '/assets/profile-photo.png'; };
  }
}

const contactBtn = document.getElementById("btnContactAdmin");
const modal = document.getElementById("adminMsgModal");
const sendAdminMsgBtn = document.getElementById("sendAdminMsg");
const adminMsgText = document.getElementById("adminMsgText");

if (contactBtn) {
  contactBtn.addEventListener("click", () => {
    if (modal) modal.style.display = "flex";
  });
}

if (modal) {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });
}

if (sendAdminMsgBtn && adminMsgText) {
  sendAdminMsgBtn.addEventListener("click", async () => {
    const text = adminMsgText.value.trim();
    if (!text) return alert("Введіть текст повідомлення");

    try {
      const res = await fetch(`${API_BASE}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error("Помилка");

      alert("Повідомлення надіслано!");
      adminMsgText.value = "";
      if (modal) modal.style.display = "none";
    } catch (e) {
      alert("Не вдалося відправити повідомлення");
    }
  });
}


  return {
    init,
    api,
    can,
    renderRoleHint,
    renderThreadList,
    renderThreadHead,
    renderPosts,
    getUser,
    getDisplayName,
    getDisplayRoles,
    applyAvatars: forumApplyAvatars
  };
})();
