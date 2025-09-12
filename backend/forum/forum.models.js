// backend/forum/forum.models.js
const mongoose = require('mongoose');
const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

const ForumCategorySchema = new Schema({
  title: { type: String, required: true },
  slug:  { type: String, unique: true, index: true },
  description: String,
  order: { type: Number, default: 0 },
  // если пусто — видят все авторизованные
  allowedRoles: [{ type: Schema.Types.ObjectId, ref: 'Role' }],
}, { timestamps: true });

const ForumTopicSchema = new Schema({
  categoryId: { type: Schema.Types.ObjectId, ref: 'ForumCategory', required: true, index: true },
  title:      { type: String, required: true, maxlength: 180 },
  authorId:   { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  pinned: { type: Boolean, default: false },
  locked: { type: Boolean, default: false },

  postsCount: { type: Number, default: 0 },
  lastPostAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

const AttachmentSchema = new Schema({
  kind: { type: String, enum: ['image','video','file'], required: true },
  url:  { type: String, required: true },
  name: String,
  mime: String,
  size: Number,
  width: Number,
  height: Number,
  duration: Number,
  createdAt: { type: Date, default: Date.now },
});

const ForumPostSchema = new Schema({
  topicId:  { type: Schema.Types.ObjectId, ref: 'ForumTopic', required: true, index: true },
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  // 🌳 дерево
  parentId:     { type: Schema.Types.ObjectId, ref: 'ForumPost', default: null, index: true },
  ancestors:    [{ type: Schema.Types.ObjectId, ref: 'ForumPost', index: true }],
  depth:        { type: Number, default: 0 },
  repliesCount: { type: Number, default: 0 },

  // контент не обязателен, если есть вложения
  content: {
    type: String,
    default: '',
    maxlength: 10000,
    validate: {
      validator: function (v) {
        const hasText  = typeof v === 'string' && v.trim().length > 0;
        const hasFiles = Array.isArray(this.attachments) && this.attachments.length > 0;
        return hasText || hasFiles;
      },
      message: 'Content or attachments required',
    }
  },

  attachments: { type: [AttachmentSchema], default: [] },

  likes:   { type: Number, default: 0 },
  likedBy: [{ type: ObjectId, ref: 'User', index: true }],

  editedAt: Date,
  editedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  deleted:  { type: Boolean, default: false },
}, { timestamps: true });

// Индексы
ForumTopicSchema.index({ categoryId: 1, pinned: -1, lastPostAt: -1, createdAt: -1 });
ForumPostSchema.index({ topicId: 1, parentId: 1, createdAt: 1 }); // для дерева и сортировки
ForumPostSchema.index({ topicId: 1, ancestors: 1 });              // выборка поддеревьев
ForumCategorySchema.index({ order: 1, title: 1 });

module.exports = {
  ForumCategory: mongoose.model('ForumCategory', ForumCategorySchema),
  ForumTopic:    mongoose.model('ForumTopic',    ForumTopicSchema),
  ForumPost:     mongoose.model('ForumPost',     ForumPostSchema),
};