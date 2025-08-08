require('dotenv').config(); // ← оставить сверху

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

console.log("📡 MONGO_URI:", process.env.MONGO_URI);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

const app = express();

app.use(cors());
app.use(express.json()); // bodyParser.json не нужен, уже есть

// статические
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// роуты
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/roles', require('./routes/roleRoutes'));
app.use('/api/library', require('./routes/library'));

// 👇 подключаем РОУТЫ ДЛЯ ЗАЯВОК
app.use('/api/career-applications', require('./routes/careerRoutes'));

app.listen(5050, '0.0.0.0', () => {
  console.log('🚀 Server running on port 5050 and accessible externally');
});