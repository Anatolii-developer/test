// backend/forum/forum.routes.js
const express = require('express');
const r = express.Router();

const { ForumCategory, ForumTopic, ForumPost } = require('./forum.models');
const { ensureAuth } = require('./authz.middleware.js');
const { optionalAuth } = require('./authz.optional.js');
const { upload: forumUpload } = require('./upload.middleware');
const ensureAdmin = require('./ensureAdmin');
const User = require('../models/User');

const {
  canRead, canCreateTopic, canReply, canModerate,
  canEditPost, canDeletePost, canSeeCategory, isAdmin,
  canSeeTopic, canReplyInTopic,
} = require('./forum.policy');

const path = require('path');

// --- guard: модели подключены
if (!ForumCategory || !ForumTopic || !ForumPost) {
  throw new Error('Forum models are not available. Check require("./forum.models") and mongoose connection/registration.');
}

// =================== Категории ===================
r.get('/categories', ensureAuth, async (req, res) => {
  const cats = await ForumCategory.find({}).sort({ order: 1, title: 1 }).lean();
  const visible = [];
  for (const c of cats) if (await canSeeCategory(req.user, c)) visible.push(c);
  res.json(visible);
});

r.post('/categories', ensureAuth, async (req, res) => {
  if (!await canModerate(req.user)) return res.status(403).json({ message: 'Forbidden' });
  const cat = await ForumCategory.create(req.body);
  res.json(cat);
});

// =================== Uploads ===================
r.post('/uploads', ensureAuth, forumUpload.array('files', 10), async (req, res) => {
  const atts = (req.files || []).map(f => {
    const kind = f.mimetype.startsWith('image/')
      ? 'image'
      : (f.mimetype.startsWith('video/') ? 'video' : 'file');
    return {
      kind,
      url: `/uploads/${f.filename}`,
      name: f.originalname,
      mime: f.mimetype,
      size: f.size,
    };
  });
  res.json({ ok: true, attachments: atts });
});

// пост с файлами (parentId поддерживается)
r.post('/threads/:id/posts-with-files', ensureAuth, (req, res) => {
  forumUpload.array('files', 10)(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message || 'Upload error' });
    try {
      const topic = await ForumTopic.findById(req.params.id);
      if (!topic) return res.status(404).json({ message: 'Thread not found' });

      // приватность/замок
      if (!(await canReplyInTopic(req.user, topic))) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const content = String(req.body.content || '').trim();
      const hasFiles = Array.isArray(req.files) && req.files.length > 0;
      const parentId = req.body.parentId ? String(req.body.parentId).trim() : null;

      let parent = null;
      if (parentId) {
        parent = await ForumPost.findById(parentId).select('topicId');
        if (!parent) return res.status(404).json({ message: 'Parent post not found' });
        if (String(parent.topicId) !== String(topic._id)) {
          return res.status(400).json({ message: 'Parent belongs to another thread' });
        }
      }

      if (!content && !hasFiles) {
        return res.status(400).json({ message: 'Content or files required' });
      }

      const atts = (req.files || []).map(f => ({
        kind: f.mimetype.startsWith('image/') ? 'image'
             : (f.mimetype.startsWith('video/') ? 'video' : 'file'),
        url: `/uploads/${f.filename}`,
        name: f.originalname,
        mime: f.mimetype,
        size: f.size
      }));

      const post = await ForumPost.create({
        topicId: topic._id,
        authorId: req.user._id,
        parentId: parent ? parent._id : null,
        content,
        attachments: atts,
      });

      await ForumTopic.findByIdAndUpdate(topic._id, {
        $inc: { postsCount: 1 },
        lastPostAt: new Date()
      });

      return res.json(post);
    } catch (e) {
      console.error('posts-with-files failed:', e?.message || e);
      if (e?.stack) console.error(e.stack);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
});

// =================== Ответ на пост (JSON) ===================
r.post('/posts/:id/replies', ensureAuth, async (req, res) => {
  const parent = await ForumPost.findById(req.params.id);
  if (!parent) return res.status(404).json({ message: 'Parent post not found' });

  const topic = await ForumTopic.findById(parent.topicId);
  if (!topic) return res.status(404).json({ message: 'Thread not found' });

  if (!(await canReplyInTopic(req.user, topic))) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const content = String(req.body.content || '').trim();
  if (!content) return res.status(400).json({ message: 'Content is required' });

  const post = await ForumPost.create({
    topicId: topic._id,
    authorId: req.user._id,
    content,
    parentId: parent._id
  });

  await ForumTopic.findByIdAndUpdate(
    topic._id,
    { $inc: { postsCount: 1 }, lastPostAt: new Date() }
  );

  return res.json(post);
});

// =================== Темы категории ===================
r.get('/categories/:id/topics', ensureAuth, async (req, res) => {
  const cat = await ForumCategory.findById(req.params.id).lean();
  if (!cat || !await canSeeCategory(req.user, cat)) return res.json([]);
  const topics = await ForumTopic.find({ categoryId: cat._id })
    .sort({ pinned: -1, lastPostAt: -1 }).lean();
  res.json(topics);
});

r.post('/categories/:id/topics', ensureAuth, async (req, res) => {
  if (!await canCreateTopic(req.user)) return res.status(403).json({ message: 'Forbidden' });
  const cat = await ForumCategory.findById(req.params.id);
  if (!cat || !await canSeeCategory(req.user, cat)) return res.status(404).json({ message: 'Category not found' });

  const topic = await ForumTopic.create({
    categoryId: cat._id,
    title: (req.body.title || '').trim(),
    authorId: req.user._id,
  });
  res.json(topic);
});

// Модерация темы
r.patch('/topics/:id', ensureAuth, async (req, res) => {
  if (!await canModerate(req.user)) return res.status(403).json({ message: 'Forbidden' });
  const t = await ForumTopic.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(t);
});

// Список постов темы (не-админ не видит hidden)
r.get('/topics/:id/posts', ensureAuth, async (req, res) => {
  const topic = await ForumTopic.findById(req.params.id).lean();
  if (!topic) return res.status(404).json({ message: 'Thread not found' });
  if (!(await canSeeTopic(req.user, topic))) return res.status(403).json({ message: 'Forbidden' });

  const filter = { topicId: req.params.id, deleted: { $ne: true } };
  if (!isAdmin(req.user)) filter.hidden = { $ne: true };

  const posts = await ForumPost.find(filter)
    .sort({ createdAt: 1 })
    .select('content authorId createdAt likes likedBy attachments parentId hidden hiddenReason')
    .lean();
  res.json(posts);
});

// Ответ в теме (JSON, без файлов)
r.post('/topics/:id/posts', ensureAuth, async (req, res) => {
  const topic = await ForumTopic.findById(req.params.id);
  if (!topic) return res.status(404).json({ message: 'Topic not found' });

  if (!(await canReplyInTopic(req.user, topic))) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const content = String(req.body.content || '').trim();
  const parentId = req.body.parentId ? String(req.body.parentId).trim() : null;

  let parent = null;
  if (parentId) {
    parent = await ForumPost.findById(parentId).select('topicId');
    if (!parent) return res.status(404).json({ message: 'Parent post not found' });
    if (String(parent.topicId) !== String(topic._id)) {
      return res.status(400).json({ message: 'Parent belongs to another thread' });
    }
  }

  if (!content) return res.status(400).json({ message: 'Content is required' });

  const post = await ForumPost.create({
    topicId: topic._id,
    authorId: req.user._id,
    parentId: parent ? parent._id : null,
    content,
  });

  await ForumTopic.findByIdAndUpdate(topic._id, {
    $inc: { postsCount: 1 },
    lastPostAt: new Date()
  });

  res.json(post);
});

// Редактировать / удалить пост
r.patch('/posts/:id', ensureAuth, async (req, res) => {
  const post = await ForumPost.findById(req.params.id);
  if (!post) return res.status(404).json({ message: 'Post not found' });
  if (!await canEditPost(req.user, post)) return res.status(403).json({ message: 'Forbidden' });

  post.content = (req.body.content || '').trim();
  post.editedAt = new Date();
  post.editedBy = req.user._id;
  await post.save();
  res.json(post);
});

r.delete('/posts/:id', ensureAuth, async (req, res) => {
  const post = await ForumPost.findById(req.params.id);
  if (!post) return res.status(404).json({ message: 'Post not found' });
  if (!await canDeletePost(req.user, post)) return res.status(403).json({ message: 'Forbidden' });

  post.deleted = true;
  post.editedAt = new Date();
  post.editedBy = req.user._id;
  await post.save();
  res.json({ ok: true });
});

// =================== Совместимость: Threads ===================
async function getOrCreateDefaultCategory() {
  let cat = await ForumCategory.findOne({ slug: 'general' });
  if (!cat) {
    cat = await ForumCategory.create({
      title: 'General',
      slug: 'general',
      order: 0,
      description: 'Default discussion category',
    });
  }
  return cat;
}

r.get('/threads', optionalAuth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim().toLowerCase();

    let cats = [];
    try {
      cats = await ForumCategory.find({}).sort({ order: 1, title: 1 }).lean();
    } catch (e) {
      console.error('Categories query failed:', e);
      return res.status(500).json({ message: 'Internal server error (cats)', detail: e.message });
    }

    const allowedCats = [];
    for (const c of cats) {
      try {
        if (!c?.allowedRoles?.length && !req.user) { // гости в публичные категории
          allowedCats.push(c._id);
          continue;
        }
        const ok = await canSeeCategory(req.user, c);
        if (ok) allowedCats.push(c._id);
      } catch (e) {
        console.error('canSeeCategory failed for', c?._id, e);
      }
    }

    if (!allowedCats.length) return res.json([]);

    const filter = { categoryId: { $in: allowedCats.filter(Boolean) } };
    if (q) filter.title = { $regex: q, $options: 'i' };

    let topics = [];
    try {
      topics = await ForumTopic.find(filter)
        .sort({ pinned: -1, lastPostAt: -1, createdAt: -1 })
        .limit(200)
        .populate('authorId', 'username email firstName lastName')
        .lean();
    } catch (e) {
      console.error('Threads query failed:', e, 'filter=', filter);
      return res.status(500).json({ message: 'Internal server error (threads)', detail: e.message });
    }

    // приватность на уровне темы
    const visible = [];
    for (const t of topics) {
      try {
        if (await canSeeTopic(req.user, t)) visible.push(t);
      } catch (e) {
        console.error('canSeeTopic failed for', t?._id, e);
      }
    }

    return res.json(visible.map(t => ({
      _id: t._id,
      title: t.title,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      lastPostAt: t.lastPostAt,
      postsCount: t.postsCount || 0,
      pinned: !!t.pinned,
      locked: !!t.locked,
      isPrivate: !!t.isPrivate,
      author: t.authorId ? {
        _id: t.authorId._id,
        username: t.authorId.username,
        email: t.authorId.email,
        firstName: t.authorId.firstName,
        lastName: t.authorId.lastName,
      } : null,
      preview: t.preview || '',
    })));
  } catch (e) {
    console.error('GET /api/forum/threads failed (outer):', e);
    return res.status(500).json({ message: 'Internal server error (outer)', detail: e.message });
  }
});

// Детали треда + дерево → плоский список
r.get('/threads/:id', optionalAuth, async (req, res) => {
  try {
    const t = await ForumTopic.findById(req.params.id)
      .populate('authorId', 'username email firstName lastName')
      .lean();
    if (!t) return res.status(404).json({ message: 'Thread not found' });

    // приватность темы
    if (!(await canSeeTopic(req.user, t))) return res.status(403).json({ message: 'Forbidden' });

    const filter = { topicId: t._id, deleted: { $ne: true } };
    if (!isAdmin(req.user)) filter.hidden = { $ne: true };

    const rawPosts = await ForumPost.find(filter)
      .sort({ createdAt: 1 })
      .populate('authorId', 'username email firstName lastName')
      .select('content authorId createdAt likes likedBy attachments parentId hidden hiddenReason')
      .lean();

    const uid = req.user ? String(req.user._id) : '';

    // строим дерево -> плоский со степенью
    const byId = new Map();
    rawPosts.forEach(p => byId.set(String(p._id), { ...p, _id: String(p._id), children: [] }));

    const roots = [];
    for (const p of byId.values()) {
      const pid = p.parentId ? String(p.parentId) : null;
      if (pid && byId.has(pid)) byId.get(pid).children.push(p);
      else roots.push(p);
    }

    const flat = [];
    (function dfs(nodes, depth) {
      for (const p of nodes) {
        flat.push({
          ...p,
          depth,
          author: p.authorId ? {
            _id: p.authorId._id,
            username: p.authorId.username,
            email: p.authorId.email,
            firstName: p.authorId.firstName,
            lastName: p.authorId.lastName,
          } : null,
          liked: Array.isArray(p.likedBy) && p.likedBy.some(id => String(id) === uid),
        });
        if (p.children?.length) dfs(p.children, depth + 1);
      }
    })(roots, 0);

    const thread = t.authorId ? {
      ...t,
      author: {
        _id: t.authorId._id,
        username: t.authorId.username,
        email: t.authorId.email,
        firstName: t.authorId.firstName,
        lastName: t.authorId.lastName,
      }
    } : t;

    return res.json({ thread, posts: flat });
  } catch (e) {
    console.error('GET /api/forum/threads/:id failed:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Создать тред (поддержка приватного)
r.post('/threads', ensureAuth, async (req, res) => {
  if (!await canCreateTopic(req.user)) return res.status(403).json({ message: 'Forbidden' });

  const cat = await getOrCreateDefaultCategory();
  if (!await canSeeCategory(req.user, cat)) return res.status(403).json({ message: 'Forbidden' });

  const title = String(req.body.title || '').trim();
  const content = String(req.body.content || '').trim();
  const isPrivate = !!req.body.isPrivate;
  const participants = Array.isArray(req.body.participants) ? req.body.participants.filter(Boolean) : [];

  if (!title) return res.status(400).json({ message: 'Title is required' });

  const topic = await ForumTopic.create({
    categoryId: cat._id,
    title,
    authorId: req.user._id,
    isPrivate,
    participants: isPrivate ? [req.user._id, ...participants] : [],
    postsCount: 0,
    lastPostAt: new Date(),
  });

  if (content) {
    await ForumPost.create({ topicId: topic._id, authorId: req.user._id, content });
    await ForumTopic.findByIdAndUpdate(topic._id, { $inc: { postsCount: 1 }, lastPostAt: new Date() });
  }

  res.json(topic);
});

// Ответ в треде (совместимость, JSON, parentId поддержка)
r.post('/threads/:id/posts', ensureAuth, async (req, res) => {
  const topic = await ForumTopic.findById(req.params.id);
  if (!topic) return res.status(404).json({ message: 'Thread not found' });

  if (!(await canReplyInTopic(req.user, topic))) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const content = String(req.body.content || '').trim();
  const parentId = req.body.parentId ? String(req.body.parentId).trim() : null;

  let parent = null;
  if (parentId) {
    parent = await ForumPost.findById(parentId).select('topicId');
    if (!parent) return res.status(404).json({ message: 'Parent post not found' });
    if (String(parent.topicId) !== String(topic._id)) {
      return res.status(400).json({ message: 'Parent belongs to another thread' });
    }
  }

  if (!content) return res.status(400).json({ message: 'Content is required' });

  const post = await ForumPost.create({
    topicId: topic._id,
    authorId: req.user._id,
    parentId: parent ? parent._id : null,
    content,
  });

  await ForumTopic.findByIdAndUpdate(topic._id, {
    $inc: { postsCount: 1 },
    lastPostAt: new Date()
  });

  res.json(post);
});

// =================== Лайки ===================
r.post('/posts/:id/like', ensureAuth, async (req, res) => {
  const userId = req.user._id;

  const upd = await ForumPost.updateOne(
    { _id: req.params.id, deleted: { $ne: true } },
    { $addToSet: { likedBy: userId } }
  );

  if (upd.matchedCount === 0) {
    return res.status(404).json({ message: 'Post not found' });
  }
  if (upd.modifiedCount === 0) {
    const cur = await ForumPost.findById(req.params.id).select('likes likedBy').lean();
    return res.json({ ok: true, likes: cur?.likes ?? (cur?.likedBy?.length || 0), liked: true });
  }

  const post = await ForumPost.findByIdAndUpdate(
    req.params.id,
    { $inc: { likes: 1 } },
    { new: true, select: 'likes likedBy' }
  );

  res.json({ ok: true, likes: post.likes, liked: true });
});

r.delete('/posts/:id/like', ensureAuth, async (req, res) => {
  const userId = req.user._id;

  const upd = await ForumPost.updateOne(
    { _id: req.params.id, deleted: { $ne: true } },
    { $pull: { likedBy: userId } }
  );

  if (upd.matchedCount === 0) return res.status(404).json({ message: 'Post not found' });
  if (upd.modifiedCount === 0) return res.status(409).json({ ok: false, message: 'Not liked' });

  const post = await ForumPost.findByIdAndUpdate(
    req.params.id,
    { $inc: { likes: -1 } },
    { new: true, select: 'likes likedBy' }
  );

  res.json({ ok: true, likes: post.likes, liked: false });
});

// =================== Пин/Лок/Удаление темы ===================
r.post('/threads/:id/pin', ensureAuth, async (req, res) => {
  if (!await canModerate(req.user)) return res.status(403).json({ message: 'Forbidden' });
  const t = await ForumTopic.findById(req.params.id);
  if (!t) return res.status(404).json({ message: 'Thread not found' });
  t.pinned = !t.pinned;
  await t.save();
  res.json({ ok: true, pinned: t.pinned });
});

r.post('/threads/:id/lock', ensureAuth, async (req, res) => {
  if (!await canModerate(req.user)) return res.status(403).json({ message: 'Forbidden' });
  const t = await ForumTopic.findById(req.params.id);
  if (!t) return res.status(404).json({ message: 'Thread not found' });
  t.locked = !t.locked;
  await t.save();
  res.json({ ok: true, locked: t.locked });
});

r.delete('/threads/:id', ensureAuth, async (req, res) => {
  if (!await canModerate(req.user)) return res.status(403).json({ message: 'Forbidden' });
  const t = await ForumTopic.findById(req.params.id);
  if (!t) return res.status(404).json({ message: 'Thread not found' });
  await ForumPost.updateMany({ topicId: t._id }, { $set: { deleted: true } });
  await t.deleteOne();
  res.json({ ok: true });
});

// =================== Приватные темы: управление участниками ===================
// добавить участника (только автор темы, модератор, админ)
r.post('/topics/:id/participants', ensureAuth, async (req, res) => {
  const topic = await ForumTopic.findById(req.params.id);
  if (!topic) return res.status(404).json({ message: 'Thread not found' });

  const owner = String(topic.authorId) === String(req.user._id);
  if (!(owner || await canModerate(req.user))) return res.status(403).json({ message: 'Forbidden' });
  if (!topic.isPrivate) return res.status(400).json({ message: 'Topic is not private' });

  const userId = String(req.body.userId || '').trim();
  if (!userId) return res.status(400).json({ message: 'userId required' });

  await ForumTopic.updateOne({ _id: topic._id }, { $addToSet: { participants: userId } });
  res.json({ ok: true });
});

// удалить участника
r.delete('/topics/:id/participants/:userId', ensureAuth, async (req, res) => {
  const topic = await ForumTopic.findById(req.params.id);
  if (!topic) return res.status(404).json({ message: 'Thread not found' });

  const owner = String(topic.authorId) === String(req.user._id);
  if (!(owner || await canModerate(req.user))) return res.status(403).json({ message: 'Forbidden' });

  await ForumTopic.updateOne({ _id: topic._id }, { $pull: { participants: req.params.userId } });
  res.json({ ok: true });
});

// =================== Админ-инструменты ===================
r.get('/admin/overview', ensureAuth, ensureAdmin, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);

  const [topics, posts, users] = await Promise.all([
    ForumTopic.find({}).sort({ lastPostAt: -1 }).limit(limit).lean(),
    ForumPost.find({}).sort({ createdAt: -1 }).limit(limit).lean(),
    User.find({}, 'username email roles status forumBlocked forumMutedUntil').limit(limit).lean(),
  ]);

  res.json({ topics, posts, users });
});

// скрыть/показать пост
r.patch('/admin/posts/:id/hide', ensureAuth, ensureAdmin, async (req, res) => {
  const reason = String(req.body.reason || '').slice(0, 500);
  const p = await ForumPost.findByIdAndUpdate(
    req.params.id,
    { $set: { hidden: true, hiddenReason: reason, hiddenBy: req.user._id } },
    { new: true }
  ).lean();
  if (!p) return res.status(404).json({ message: 'Post not found' });
  res.json({ ok: true, post: p });
});

r.patch('/admin/posts/:id/unhide', ensureAuth, ensureAdmin, async (req, res) => {
  const p = await ForumPost.findByIdAndUpdate(
    req.params.id,
    { $set: { hidden: false, hiddenReason: '', hiddenBy: null } },
    { new: true }
  ).lean();
  if (!p) return res.status(404).json({ message: 'Post not found' });
  res.json({ ok: true, post: p });
});

// блок/мьют пользователей (форум)
r.post('/admin/users/:id/block', ensureAuth, ensureAdmin, async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $set: { forumBlocked: !!req.body.blocked } },
    { new: true, select: 'username email forumBlocked forumMutedUntil roles' }
  ).lean();
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ ok: true, user });
});

r.post('/admin/users/:id/mute', ensureAuth, ensureAdmin, async (req, res) => {
  let until = null;
  if (req.body.until) {
    const d = new Date(req.body.until);
    if (!isNaN(d.valueOf())) until = d;
  } else if (typeof req.body.minutes === 'number' && req.body.minutes > 0) {
    until = new Date(Date.now() + req.body.minutes * 60 * 1000);
  }
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $set: { forumMutedUntil: until } },
    { new: true, select: 'username email forumBlocked forumMutedUntil roles' }
  ).lean();
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ ok: true, user });
});

module.exports = r;