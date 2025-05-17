const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

dotenv.config();

const app = express();

// ✅ CORS – ДО маршрутов!
app.use(cors({
  origin: 'http://localhost:5050', // обязательно точный порт и протокол
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

app.use(bodyParser.json());
app.use(express.json());

// ✅ Статические файлы
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Роуты
const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

// ✅ MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// ✅ Запуск сервера
app.listen(5050, () => {
  console.log('🚀 Server running on port 5050');
});
