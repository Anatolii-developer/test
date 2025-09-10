// server/forum/forum.routes.js
const express = require('express');
const r = express.Router();

const { ForumCategory, ForumTopic, ForumPost } = require('./forum.models');
const { ensureAuth } = require('./authz.middleware.js');
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

// GET /api/forum/threads  — list threads across visible categories
r.get('/threads', ensureAuth, async (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();

  // собрать все категории, которые пользователь видит
  const cats = await ForumCategory.find({}).sort({ order: 1, title: 1 }).lean();
  const allowed = [];
  for (const c of cats) {
    if (await canSeeCategory(req.user, c)) allowed.push(c._id);
  }
  if (!allowed.length) return res.json([]);

  const filter = { categoryId: { $in: allowed } };
  if (q) filter.title = { $regex: q, $options: 'i' };

  const threads = await ForumTopic.find(filter)
    .sort({ pinned: -1, lastPostAt: -1, createdAt: -1 })
    .limit(200)
    .lean();

  res.json(threads.map(t => ({
    _id: t._id,
    title: t.title,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    lastPostAt: t.lastPostAt,
    postsCount: t.postsCount || 0,
    pinned: !!t.pinned,
    locked: !!t.locked,
    author: t.authorId ? { _id: t.authorId } : null,
    preview: t.preview || '',
  })));
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

// GET /api/forum/threads/:id — thread + posts
r.get('/threads/:id', ensureAuth, async (req, res) => {
  const thread = await ForumTopic.findById(req.params.id).lean();
  if (!thread) return res.status(404).json({ message: 'Thread not found' });

  const cat = await ForumCategory.findById(thread.categoryId).lean();
  if (!cat || !await canSeeCategory(req.user, cat)) return res.status(403).json({ message: 'Forbidden' });

  const posts = await ForumPost.find({ topicId: thread._id, deleted: { $ne: true } })
    .sort({ createdAt: 1 }).lean();

  res.json({ thread, posts });
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

// POST /api/forum/posts/:id/like — like post
r.post('/posts/:id/like', ensureAuth, async (req, res) => {
  const post = await ForumPost.findById(req.params.id);
  if (!post) return res.status(404).json({ message: 'Post not found' });
  post.likes = (post.likes || 0) + 1;
  await post.save();
  res.json({ ok: true, likes: post.likes });
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