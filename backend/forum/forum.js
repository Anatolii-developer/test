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
    async addPost(threadId, { content }) {
      return fetchJSON(`/api/forum/threads/${threadId}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
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

  (posts || []).forEach(p => {
    const canDel = Forum.can('moderate:posts') || (Forum.currentUser && Forum.currentUser._id === p.author?._id);

    // начальное состояние
    const liked = !!(p.liked ?? (Array.isArray(p.likedBy) && p.likedBy.some(id => String(id) === String(Forum.currentUser?._id))));
    const likes = Number.isFinite(p.likes) ? p.likes : 0;

    const el = document.createElement('div');
    el.className = 'post';
    el.innerHTML = `
      <div class="post-head">
        <div class="meta"><strong>${escapeHtml(p.author?.username || p.author?.email || '-')}</strong> • ${fmtDate(p.createdAt)}</div>
        <div class="actions">
          <button class="btn btn-ghost js-like" data-id="${p._id}" data-liked="${liked ? '1' : '0'}">
            👍 <span class="js-like-count">${likes}</span>
          </button>
          ${canDel ? `<button class="btn btn-danger js-del" data-id="${p._id}">Видалити</button>` : ''}
        </div>
      </div>
      <div style="margin-top:8px; white-space:pre-wrap;">${escapeHtml(p.content || '')}</div>
    `;
    $root.appendChild(el);
  });

  // toggle like/unlike без перезагрузки темы
  $root.querySelectorAll('.js-like').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const countEl = btn.querySelector('.js-like-count');
      const likedNow = btn.dataset.liked === '1';

      // блокируем кнопку только на время запроса, а не навсегда
      btn.disabled = true;
      try {
        let r;
        if (likedNow) {
          // снять лайк
          r = await Forum.api.unlikePost(id); // DELETE /posts/:id/like
        } else {
          // поставить лайк
          r = await Forum.api.likePost(id);   // POST /posts/:id/like
        }

        // Синхронизируем UI строго по ответу сервера
        if (r && typeof r.likes === 'number') {
          countEl.textContent = String(r.likes);
        } else {
          // fallback — осторожный клиентский пересчёт
          const cur = parseInt(countEl.textContent || '0', 10);
          countEl.textContent = String(likedNow ? Math.max(0, cur - 1) : cur + 1);
        }
        btn.dataset.liked = r?.liked ? '1' : '0';
      } catch (e) {
        console.warn('like toggle error', e);
        // опционально можно показать alert с e.message
      } finally {
        btn.disabled = false;
      }
    });
  });

  // удаление поста
  $root.querySelectorAll('.js-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Видалити повідомлення?')) return;
      await Forum.api.deletePost(btn.dataset.id);
      btn.closest('.post')?.remove();
    });
  });
}
  function renderRoleHint(sel) {
    const el = document.querySelector(sel);
    if (!el) return;
    const roles = Array.from(roleSet);
    el.textContent = currentUser
      ? `Ви увійшли як ${currentUser.username || currentUser.email || 'user'} (${roles.join(', ') || 'без ролі'})`
      : 'Ви не авторизовані';
  }

  function renderThreadList(sel, items, emptySel) {
    const $list = document.querySelector(sel);
    const $empty = document.querySelector(emptySel);
    if (!$list) return;
    $list.innerHTML = '';
    if (!items || !items.length) {
      if ($empty) $empty.style.display = 'block';
      return;
    }
    if ($empty) $empty.style.display = 'none';

    items.forEach(t => {
      const a = document.createElement('a');
      a.href = `./thread.html?id=${t._id}`;
      a.className = 'thread-item';
      a.innerHTML = `
        <div>
          <div style="font-weight:600">${escapeHtml(t.title)}
            ${t.pinned ? '<span class="tag">📌 Закріплено</span>' : ''}
            ${t.locked ? '<span class="tag">🔒 Закрито</span>' : ''}
          </div>
          <div class="thread-meta">Створив: ${escapeHtml(t.author?.username || t.author?.email || '-')}, ${fmtDate(t.createdAt)} • Відповідей: ${t.postsCount || 0}</div>
        </div>
        <div class="thread-meta">${short(escapeHtml(t.preview || t.lastPostPreview || ''), 64)}</div>
      `;
      $list.appendChild(a);
    });
  }

  function renderThreadHead(thread, selTitle, selMeta, selActions) {
    const $t = document.querySelector(selTitle);
    const $m = document.querySelector(selMeta);
    if ($t) $t.textContent = thread.title;
    if ($m) $m.textContent = `Створив: ${thread.author?.username || thread.author?.email || '-'} • ${fmtDate(thread.createdAt)} ${thread.pinned ? '• 📌 Закріплено' : ''} ${thread.locked ? '• 🔒 Закрито' : ''}`;
    if (selActions && can('moderate:threads')) {
      const $a = document.querySelector(selActions);
      if ($a) $a.style.display = 'flex';
    }
  }



  return { init, api, can, renderRoleHint, renderThreadList, renderThreadHead, renderPosts };
})();