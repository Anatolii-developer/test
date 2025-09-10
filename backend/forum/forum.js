const express = require('express');
const r = express.Router();
const { ForumCategory, ForumTopic, ForumPost } = require('./forum.models');
const { ensureAuth } = require('../auth/middleware');
const { canSeeCategory, canCreateTopic, canReply, canModerate } = require('./forum.permissions');

async function getOrCreateDefaultCategory() {
  let cat = await ForumCategory.findOne({ slug: 'general' });
  if (!cat) {
    cat = await ForumCategory.create({
      title: 'General',
      slug: 'general',
      order: 0,
      description: 'Default discussion category'
    });
  }
  return cat;
}

// ===== Compatibility routes for "threads"-based frontend =====
// List all threads the user can see (across categories)
r.get('/api/forum/threads', ensureAuth, async (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();
  const cats = await ForumCategory.find({}).sort({ order: 1, title: 1 }).lean();
  const allowedCatIds = [];
  for (const c of cats) {
    if (await canSeeCategory(req.user, c)) allowedCatIds.push(c._id);
  }
  if (!allowedCatIds.length) return res.json([]);

  const filter = { categoryId: { $in: allowedCatIds } };
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
    preview: t.preview || ''
  })));
});

// Create a thread in default category
r.post('/api/forum/threads', ensureAuth, async (req, res) => {
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
    lastPostAt: new Date()
  });

  if (content) {
    await ForumPost.create({
      topicId: topic._id,
      authorId: req.user._id,
      content
    });
    await ForumTopic.findByIdAndUpdate(topic._id, { $inc: { postsCount: 1 }, lastPostAt: new Date() });
  }

  res.json(topic);
});

// Get single thread with posts
r.get('/api/forum/threads/:id', ensureAuth, async (req, res) => {
  const thread = await ForumTopic.findById(req.params.id).lean();
  if (!thread) return res.status(404).json({ message: 'Thread not found' });

  const cat = await ForumCategory.findById(thread.categoryId).lean();
  if (!cat || !await canSeeCategory(req.user, cat)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const posts = await ForumPost.find({ topicId: thread._id, deleted: { $ne: true } })
    .sort({ createdAt: 1 })
    .lean();

  res.json({ thread, posts });
});

// Add post to thread (alias)
r.post('/api/forum/threads/:id/posts', ensureAuth, async (req, res) => {
  if (!await canReply(req.user)) return res.status(403).json({ message: 'Forbidden' });
  const topic = await ForumTopic.findById(req.params.id);
  if (!topic) return res.status(404).json({ message: 'Thread not found' });
  if (topic.locked && !await canModerate(req.user)) {
    return res.status(403).json({ message: 'Thread is locked' });
  }

  const content = String(req.body.content || '').trim();
  if (!content) return res.status(400).json({ message: 'Content is required' });

  const post = await ForumPost.create({
    topicId: topic._id,
    authorId: req.user._id,
    content
  });
  await ForumTopic.findByIdAndUpdate(topic._id, { $inc: { postsCount: 1 }, lastPostAt: new Date() });
  res.json(post);
});

// Like post
r.post('/api/forum/posts/:id/like', ensureAuth, async (req, res) => {
  const post = await ForumPost.findById(req.params.id);
  if (!post) return res.status(404).json({ message: 'Post not found' });
  post.likes = (post.likes || 0) + 1;
  await post.save();
  res.json({ ok: true, likes: post.likes });
});

// Pin & Lock thread aliases
r.post('/api/forum/threads/:id/pin', ensureAuth, async (req, res) => {
  if (!await canModerate(req.user)) return res.status(403).json({ message: 'Forbidden' });
  const t = await ForumTopic.findById(req.params.id);
  if (!t) return res.status(404).json({ message: 'Thread not found' });
  t.pinned = !t.pinned;
  await t.save();
  res.json({ ok: true, pinned: t.pinned });
});

r.post('/api/forum/threads/:id/lock', ensureAuth, async (req, res) => {
  if (!await canModerate(req.user)) return res.status(403).json({ message: 'Forbidden' });
  const t = await ForumTopic.findById(req.params.id);
  if (!t) return res.status(404).json({ message: 'Thread not found' });
  t.locked = !t.locked;
  await t.save();
  res.json({ ok: true, locked: t.locked });
});

// Delete thread
r.delete('/api/forum/threads/:id', ensureAuth, async (req, res) => {
  if (!await canModerate(req.user)) return res.status(403).json({ message: 'Forbidden' });
  const t = await ForumTopic.findById(req.params.id);
  if (!t) return res.status(404).json({ message: 'Thread not found' });
  await ForumPost.updateMany({ topicId: t._id }, { $set: { deleted: true } });
  await t.deleteOne();
  res.json({ ok: true });
});

module.exports = r;