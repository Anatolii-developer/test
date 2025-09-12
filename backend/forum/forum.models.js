// server/forum/forum.models.js
const mongoose = require('mongoose');
const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

const ForumCategorySchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug:  { type: String, unique: true, index: true },
  description: String,
  order: { type: Number, default: 0 },

  // (опционально) доступ по ролям: если пусто — видят все авторизованные
  allowedRoles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
}, { timestamps: true });

const ForumTopicSchema = new mongoose.Schema({
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumCategory', required: true, index: true },
  title:      { type: String, required: true, maxlength: 180 },
  authorId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  pinned: { type: Boolean, default: false },
  locked: { type: Boolean, default: false },

  postsCount: { type: Number, default: 0 },
  lastPostAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true });


// server/forum/forum.models.js
const AttachmentSchema = new Schema({
  kind: { type: String, enum: ['image','video','file'], required: true },
  url: { type: String, required: true },
  name: String,
  mime: String,
  size: Number,
  width: Number,
  height: Number,
  duration: Number,
  createdAt: { type: Date, default: Date.now },
});

const ForumPostSchema = new mongoose.Schema({
  topicId:  { type: mongoose.Schema.Types.ObjectId, ref: 'ForumTopic', required: true, index: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  // content не обязателен, если есть attachments
  content: {
    type: String,
    default: '',
    maxlength: 10000,
    validate: {
      validator: function (v) {
        const hasText = typeof v === 'string' && v.trim().length > 0;
        const hasFiles = Array.isArray(this.attachments) && this.attachments.length > 0;
        return hasText || hasFiles;
      },
      message: 'Content or attachments required',
    }
  },

  // ВАЖНО: вот так
  attachments: { type: [AttachmentSchema], default: [] },

  likes:   { type: Number, default: 0 },
  likedBy: [{ type: ObjectId, ref: 'User', index: true }],

  editedAt: Date,
  editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deleted:  { type: Boolean, default: false },
}, { timestamps: true });

// Индексы
ForumTopicSchema.index({ categoryId: 1, pinned: -1, lastPostAt: -1, createdAt: -1 });
ForumPostSchema.index({ topicId: 1, createdAt: 1 });
ForumCategorySchema.index({ order: 1, title: 1 });


module.exports = {
  ForumCategory: mongoose.model('ForumCategory', ForumCategorySchema),
  ForumTopic:    mongoose.model('ForumTopic',    ForumTopicSchema),
  ForumPost:     mongoose.model('ForumPost',     ForumPostSchema),
};