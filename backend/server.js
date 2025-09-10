require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

// ---- Mongo ----
const uri = process.env.MONGO_URI;
if (!uri) {
  console.error('❌ MONGO_URI is not set');
  process.exit(1);
}
console.log('MONGO_URI =', uri.replace(/\/\/.*?:.*?@/, '//***:***@'));

mongoose.connect(uri, {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 20000,
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => {
  console.error('❌ MongoDB connect error:', err);
  process.exit(1);
});

// ---- App ----
const app = express();
app.set('trust proxy', 1);

// Разрешённые источники 
const ALLOWED_ORIGINS = [
  'http://157.230.121.24:5050',
  // 'http://localhost:3000',
  // 'http://localhost:5500',
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(cookieParser());
app.use(express.json());

// Статика
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/forum', express.static(path.join(__dirname, 'forum')));

// API маршруты
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/roles', require('./routes/roleRoutes'));
app.use('/api/library', require('./routes/library'));
app.use('/api/career-applications', require('./routes/careerRoutes'));
app.use('/api/career-faq', require('./routes/careerFaqRoutes'));


// ⬇️ Форум
const forumRoutes = require('./forum/forum.routes'); 
app.use('/api/forum', forumRoutes); 

// Healthcheck
app.get('/health', (_, res) => res.json({ ok: true }));

// Ошибки
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads'), {
  maxAge: '7d',
  setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
}));

app.listen(5050, '0.0.0.0', () => {
  console.log('🚀 Server listening on http://0.0.0.0:5050');
});

