// Универсальный фронтовый модуль форума
// Предполагает, что бэк смонтирован как app.use('/api/forum', forumRoutes)

window.Forum = (function(){
  const API_BASE = ''; // тот же домен
  let currentUser = null;
  let roleSet = new Set();

  function readUser(){
    try {
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      return u || null;
    } catch(_) { return null; }
  }

  function normalizeRoles(user){
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

  async function init(){
    // рендерим общий сайдбар (если есть глобал)
    currentUser = readUser();
    roleSet = normalizeRoles(currentUser);
    // на всякий случай потянем /api/users/profile для валидации куки
    try { await fetch(`${API_BASE}/api/users/profile`, {credentials:'include'}); } catch(_){}
  }

  // простые проверки прав (можно расширять)
  function can(action){
    // базовые:
    if (roleSet.has('admin')) return true;

    if (action === 'moderate:threads' || action === 'moderate:posts') {
      return roleSet.has('moderator') || roleSet.has('модератор');
    }
    if (action === 'post:create') {
      return !!currentUser; // любой залогиненый
    }
    return false;
  }

  // API
  const api = {
    async listThreads({ q } = {}){
      const url = new URL('/api/forum/threads', location.origin);
      if (q) url.searchParams.set('q', q);
      const r = await fetch(url, { credentials:'include' });
      if (!r.ok) return [];
      return r.json();
    },
    async createThread({ title, content }){
      const r = await fetch('/api/forum/threads', {
        method:'POST', credentials:'include',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ title, content })
      });
      return r.json();
    },
    async getThread(id){
      const r = await fetch(`/api/forum/threads/${id}`, { credentials:'include' });
      if (!r.ok) throw new Error('Not found');
      return r.json(); // { thread, posts }
    },
    async addPost(threadId, { content }){
      const r = await fetch(`/api/forum/threads/${threadId}/posts`, {
        method:'POST', credentials:'include',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ content })
      });
      return r.json();
    },
    async likePost(postId){
      const r = await fetch(`/api/forum/posts/${postId}/like`, {
        method:'POST', credentials:'include'
      });
      return r.json();
    },
    async deletePost(postId){
      const r = await fetch(`/api/forum/posts/${postId}`, {
        method:'DELETE', credentials:'include'
      });
      return r.json();
    },
    async togglePin(threadId){
      const r = await fetch(`/api/forum/threads/${threadId}/pin`, {
        method:'POST', credentials:'include'
      });
      return r.json();
    },
    async toggleLock(threadId){
      const r = await fetch(`/api/forum/threads/${threadId}/lock`, {
        method:'POST', credentials:'include'
      });
      return r.json();
    },
    async deleteThread(threadId){
      const r = await fetch(`/api/forum/threads/${threadId}`, {
        method:'DELETE', credentials:'include'
      });
      return r.json();
    },
  };

  // Рендеры
  function escapeHtml(s=''){ return s.replace(/[&<>\"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }
  function short(s, n){ s = String(s||''); return s.length<=n ? s : s.slice(0,n-1)+'…'; }
  function fmtDate(d){ try{ return new Date(d).toLocaleString('uk-UA'); } catch(_){ return ''; } }

  function renderRoleHint(sel){
    const el = document.querySelector(sel);
    if (!el) return;
    const roles = Array.from(roleSet);
    el.textContent = currentUser ? `Ви увійшли як ${currentUser.username || currentUser.email || 'user'} (${roles.join(', ') || 'без ролі'})` : 'Ви не авторизовані';
  }

  function renderThreadList(sel, items, emptySel){
    const $list = document.querySelector(sel);
    const $empty = document.querySelector(emptySel);
    if (!$list) return;
    $list.innerHTML = '';
    if (!items || !items.length){
      if ($empty) $empty.style.display = 'block';
      return;
    }
    if ($empty) $empty.style.display = 'none';

    items.forEach(t=>{
      const a = document.createElement('a');
      a.href = `./thread.html?id=${t._id}`;
      a.className = 'thread-item';
      a.innerHTML = `
        <div>
          <div style="font-weight:600">${escapeHtml(t.title)}
            ${t.pinned ? '<span class="tag">📌 Закріплено</span>' : ''}
            ${t.locked ? '<span class="tag">🔒 Закрито</span>' : ''}
          </div>
          <div class="thread-meta">Створив: ${escapeHtml(t.author?.username || t.author?.email || '-')}, ${fmtDate(t.createdAt)} • Відповідей: ${t.postsCount||0}</div>
        </div>
        <div class="thread-meta">${short(escapeHtml(t.preview || t.lastPostPreview || ''), 64)}</div>
      `;
      $list.appendChild(a);
    });
  }

  function renderThreadHead(thread, selTitle, selMeta, selActions){
    const $t = document.querySelector(selTitle);
    const $m = document.querySelector(selMeta);
    if ($t) $t.textContent = thread.title;
    if ($m) $m.textContent = `Створив: ${thread.author?.username || thread.author?.email || '-'} • ${fmtDate(thread.createdAt)} ${thread.pinned?'• 📌 Закріплено':''} ${thread.locked?'• 🔒 Закрито':''}`;
    if (selActions && can('moderate:threads')){
      const $a = document.querySelector(selActions);
      if ($a) $a.style.display = 'flex';
    }
  }

  function renderPosts(sel, posts, { thread } = {}){
    const $root = document.querySelector(sel);
    if (!$root) return;
    $root.innerHTML = '';
    (posts||[]).forEach(p=>{
      const canDel = can('moderate:posts') || (currentUser && currentUser._id === p.author?._id);
      const el = document.createElement('div');
      el.className = 'post';
      el.innerHTML = `
        <div class="post-head">
          <div class="meta"><strong>${escapeHtml(p.author?.username || p.author?.email || '-')}</strong> • ${fmtDate(p.createdAt)}</div>
          <div class="actions">
            <button class="btn btn-ghost js-like" data-id="${p._id}">👍 ${p.likes||0}</button>
            ${canDel ? `<button class="btn btn-danger js-del" data-id="${p._id}">Видалити</button>` : ''}
          </div>
        </div>
        <div style="margin-top:8px; white-space:pre-wrap;">${escapeHtml(p.content||'')}</div>
      `;
      $root.appendChild(el);
    });

    $root.querySelectorAll('.js-like').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        await api.likePost(btn.dataset.id);
        // обновим счётчик без полной перезагрузки
        const id = new URLSearchParams(location.search).get('id');
        const data = await api.getThread(id);
        renderPosts(sel, data.posts, { thread: data.thread });
      });
    });
    $root.querySelectorAll('.js-del').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        if (!confirm('Видалити повідомлення?')) return;
        await api.deletePost(btn.dataset.id);
        const id = new URLSearchParams(location.search).get('id');
        const data = await api.getThread(id);
        renderPosts(sel, data.posts, { thread: data.thread });
      });
    });
  }

  return { init, api, can, renderRoleHint, renderThreadList, renderThreadHead, renderPosts };
})();