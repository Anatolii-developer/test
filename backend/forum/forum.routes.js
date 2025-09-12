// server/forum/forum.routes.js
const express = require('express');
const r = express.Router();

const { ForumCategory, ForumTopic, ForumPost } = require('./forum.models');
const { ensureAuth } = require('./authz.middleware.js');
const { optionalAuth } = require('./authz.optional.js');
const {
  canRead, canCreateTopic, canReply, canModerate,
  canEditPost, canDeletePost, canSeeCategory
} = require('./forum.policy');

// список категорий (видимых для юзера)
r.get('/categories', ensureAuth, async (req, res) => {
  const cats = await ForumCategory.find({}).sort({ order: 1, title: 1 }).lean();
  const visible = [];
  for (const c of cats) {
    if (await canSeeCategory(req.user, c)) visible.push(c);
  }
  res.json(visible);
});

// создать категорию (только модераторы/админы)
r.post('/categories', ensureAuth, async (req, res) => {
  if (!await canModerate(req.user)) return res.status(403).json({ message: 'Forbidden' });
  const cat = await ForumCategory.create(req.body);
  res.json(cat);
});

// backend/forum/forum.routes.js
const path = require('path');
const { upload } = require('./upload.middleware');

// отдать статику уже настроено сервером (см. ниже)
r.post('/uploads', ensureAuth, upload.array('files', 10), async (req, res) => {
  const atts = req.files.map(f => {
    const ext = path.extname(f.filename).toLowerCase();
    const kind = f.mimetype.startsWith('image/')
      ? 'image'
      : (f.mimetype.startsWith('video/') ? 'video' : 'file');
    return {
      kind,
      url: `/uploads/${f.filename}`,
      name: f.originalname,
      mime: f.mimetype,
      size: f.size
    };
  });
  res.json({ ok: true, attachments: atts });
});

// добавить над существующим POST /api/forum/threads/:id/posts
r.post('/threads/:id/posts-with-files', ensureAuth, upload.array('files', 10), async (req, res) => {
  if (!await canReply(req.user)) return res.status(403).json({ message: 'Forbidden' });
  const topic = await ForumTopic.findById(req.params.id);
  if (!topic) return res.status(404).json({ message: 'Thread not found' });

  const content = String(req.body.content || '').trim();
  if (!content && (!req.files || !req.files.length))
    return res.status(400).json({ message: 'Content or files required' });

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
    content,
    attachments: atts
  });
  await ForumTopic.findByIdAndUpdate(topic._id, { $inc: { postsCount: 1 }, lastPostAt: new Date() });

  res.json(post);
});

// темы категории
r.get('/categories/:id/topics', ensureAuth, async (req, res) => {
  const cat = await ForumCategory.findById(req.params.id).lean();
  if (!cat || !await canSeeCategory(req.user, cat)) return res.json([]);
  const topics = await ForumTopic.find({ categoryId: cat._id })
    .sort({ pinned: -1, lastPostAt: -1 }).lean();
  res.json(topics);
});

// создать тему
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

// модерация темы (закрепить/разблокировать и т.п.)
r.patch('/topics/:id', ensureAuth, async (req, res) => {
  if (!await canModerate(req.user)) return res.status(403).json({ message: 'Forbidden' });
  const t = await ForumTopic.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(t);
});

// посты в теме
r.get('/topics/:id/posts', ensureAuth, async (req, res) => {
  const posts = await ForumPost.find({ topicId: req.params.id, deleted: { $ne: true } })
    .sort({ createdAt: 1 }).lean();
  res.json(posts);
});

// ответ в теме
r.post('/topics/:id/posts', ensureAuth, async (req, res) => {
  if (!await canReply(req.user)) return res.status(403).json({ message: 'Forbidden' });
  const topic = await ForumTopic.findById(req.params.id);
  if (!topic) return res.status(404).json({ message: 'Topic not found' });
  if (topic.locked && !await canModerate(req.user)) {
    return res.status(403).json({ message: 'Topic is locked' });
  }

  const post = await ForumPost.create({
    topicId: topic._id,
    authorId: req.user._id,
    content: (req.body.content || '').trim()
  });
  await ForumTopic.findByIdAndUpdate(topic._id, { $inc: { postsCount: 1 }, lastPostAt: new Date() });
  res.json(post);
});

// редактировать / удалить пост
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


// ====== compatibility: "threads" endpoints for simple frontend ======
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

// GET /api/forum/threads
r.get('/threads', optionalAuth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim().toLowerCase();

    const cats = await ForumCategory.find({}).sort({ order: 1, title: 1 }).lean();
    const allowed = [];
    for (const c of cats) {
      try {
        let ok = await canSeeCategory(req.user, c);
        // гость + публичная категория (нет ограничений) — пускаем
        if (!ok && !req.user && (!c.allowedRoles || c.allowedRoles.length === 0)) ok = true;
        if (ok) allowed.push(c._id);
      } catch (e) {
        // Логируем конкретную категорию, но не валим весь запрос
        console.error('canSeeCategory failed for category', c?._id, e);
      }
    }

    if (!allowed.length) return res.json([]);

    const filter = { categoryId: { $in: allowed } };
    if (q) filter.title = { $regex: q, $options: 'i' };

    const threads = await ForumTopic.find(filter)
      .sort({ pinned: -1, lastPostAt: -1, createdAt: -1 })
      .limit(200)
      .populate('authorId', 'username email firstName lastName')
      .lean();

    return res.json(threads.map(t => ({
      _id: t._id,
      title: t.title,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      lastPostAt: t.lastPostAt,
      postsCount: t.postsCount || 0,
      pinned: !!t.pinned,
      locked: !!t.locked,
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
    console.error('GET /api/forum/threads failed:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

r.get('/threads/:id', optionalAuth, async (req, res) => {
  try {
    const t = await ForumTopic.findById(req.params.id)
      .populate('authorId', 'username email firstName lastName')
      .lean();
    if (!t) return res.status(404).json({ message: 'Thread not found' });

    const cat = await ForumCategory.findById(t.categoryId).lean();
    if (!cat) return res.status(404).json({ message: 'Category not found' });

    let canSee = await canSeeCategory(req.user, cat);
    if (!canSee && !req.user && (!cat.allowedRoles || cat.allowedRoles.length === 0)) {
      canSee = true;
    }
    if (!canSee) return res.status(403).json({ message: 'Forbidden' });

    const posts = await ForumPost.find({ topicId: t._id, deleted: { $ne: true } })
      .sort({ createdAt: 1 })
      .populate('authorId', 'username email firstName lastName')
      .select('content authorId createdAt likes likedBy')
      .lean();

    const uid = req.user ? String(req.user._id) : '';

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

    const mappedPosts = posts.map(p => ({
      ...p,
      author: p.authorId ? {
        _id: p.authorId._id,
        username: p.authorId.username,
        email: p.authorId.email,
        firstName: p.authorId.firstName,
        lastName: p.authorId.lastName,
      } : null,
      liked: Array.isArray(p.likedBy) && p.likedBy.some(id => String(id) === uid),
    }));

    return res.json({ thread, posts: mappedPosts });
  } catch (e) {
    console.error('GET /api/forum/threads/:id failed:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/forum/threads  — create in default category (and first post)
r.post('/threads', ensureAuth, async (req, res) => {
  if (!await canCreateTopic(req.user)) return res.status(403).json({ message: 'Forbidden' });

  const cat = await getOrCreateDefaultCategory();
  if (!await canSeeCategory(req.user, cat)) return res.status(403).json({ message: 'Forbidden' });

  const title = String(req.body.title || '').trim();
  const content = String(req.body.content || '').trim();
  if (!title) return res.status(400).json({ message: 'Title is required' });

  const topic = await ForumTopic.create({
    categoryId: cat._id,
    title,
    authorId: req.user._id,
    postsCount: 0,
    lastPostAt: new Date(),
  });

  if (content) {
    await ForumPost.create({
      topicId: topic._id,
      authorId: req.user._id,
      content,
    });
    await ForumTopic.findByIdAndUpdate(topic._id, { $inc: { postsCount: 1 }, lastPostAt: new Date() });
  }

  res.json(topic);
});

// POST /api/forum/threads/:id/posts — add reply
r.post('/threads/:id/posts', ensureAuth, async (req, res) => {
  if (!await canReply(req.user)) return res.status(403).json({ message: 'Forbidden' });
  const topic = await ForumTopic.findById(req.params.id);
  if (!topic) return res.status(404).json({ message: 'Thread not found' });
  if (topic.locked && !await canModerate(req.user)) return res.status(403).json({ message: 'Thread is locked' });

  const content = String(req.body.content || '').trim();
  if (!content) return res.status(400).json({ message: 'Content is required' });

  const post = await ForumPost.create({
    topicId: topic._id,
    authorId: req.user._id,
    content,
  });
  await ForumTopic.findByIdAndUpdate(topic._id, { $inc: { postsCount: 1 }, lastPostAt: new Date() });

  res.json(post);
});

// POST /api/forum/posts/:id/like
r.post('/posts/:id/like', ensureAuth, async (req, res) => {
  const userId = req.user._id;

  // сначала пытаемся добавить userId в likedBy (без дублей)
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

  // если реально добавили — можно либо инкрементить поле likes,
  // либо посчитать по длине массива
  const post = await ForumPost.findByIdAndUpdate(
    req.params.id,
    { $inc: { likes: 1 } },          // поддерживаем числовой кэш
    { new: true, select: 'likes likedBy' }
  );

  res.json({ ok: true, likes: post.likes, liked: true });
});


// DELETE /api/forum/posts/:id/like
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

// POST /api/forum/threads/:id/pin — toggle pin
r.post('/threads/:id/pin', ensureAuth, async (req, res) => {
  if (!await canModerate(req.user)) return res.status(403).json({ message: 'Forbidden' });
  const t = await ForumTopic.findById(req.params.id);
  if (!t) return res.status(404).json({ message: 'Thread not found' });
  t.pinned = !t.pinned;
  await t.save();
  res.json({ ok: true, pinned: t.pinned });
});

// POST /api/forum/threads/:id/lock — toggle lock
r.post('/threads/:id/lock', ensureAuth, async (req, res) => {
  if (!await canModerate(req.user)) return res.status(403).json({ message: 'Forbidden' });
  const t = await ForumTopic.findById(req.params.id);
  if (!t) return res.status(404).json({ message: 'Thread not found' });
  t.locked = !t.locked;
  await t.save();
  res.json({ ok: true, locked: t.locked });
});

// DELETE /api/forum/threads/:id — delete whole thread (soft-delete posts)
r.delete('/threads/:id', ensureAuth, async (req, res) => {
  if (!await canModerate(req.user)) return res.status(403).json({ message: 'Forbidden' });
  const t = await ForumTopic.findById(req.params.id);
  if (!t) return res.status(404).json({ message: 'Thread not found' });
  await ForumPost.updateMany({ topicId: t._id }, { $set: { deleted: true } });
  await t.deleteOne();
  res.json({ ok: true });
});

module.exports = r;