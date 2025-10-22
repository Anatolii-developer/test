require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
app.set('trust proxy', 1);

// ===== STATIC FIRST (до CORS) =====
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads'), {
  maxAge: '7d',
  setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
}));
app.use(express.static(path.join(__dirname, 'public')));   // /assets/...
app.use('/forum', express.static(path.join(__dirname, 'forum')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// ===== CORS =====
const ALLOWED_ORIGINS = [
  'https://cabinet.mamko-prof-supervision.com',
  'https://mamko-prof-supervision.com',
  'https://www.mamko-prof-supervision.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];
app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    const ok = ALLOWED_ORIGINS.includes(origin);
    if (!ok) console.warn('CORS blocked origin:', origin);
    cb(ok ? null : new Error('Not allowed by CORS'), ok);
  },
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json());

// ===== API =====
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/auth', require('./routes/userRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/roles', require('./routes/roleRoutes'));
app.use('/api/library', require('./routes/library'));
app.use('/api/career-applications', require('./routes/careerRoutes'));
app.use('/api/career-faq', require('./routes/careerFaqRoutes'));

// Форум
app.use('/api/forum', require('./forum/forum.routes'));

app.get('/health', (_, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

app.listen(5050, '0.0.0.0', () => {
  console.log('🚀 Server listening on http://0.0.0.0:5050');
});