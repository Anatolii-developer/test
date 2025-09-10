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

module.exports = r;