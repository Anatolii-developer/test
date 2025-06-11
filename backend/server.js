const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();


app.use(bodyParser.json());
app.use(express.json());

// ✅ Статические файлы
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Роуты
const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

const uploadRoutes = require('./routes/uploadRoutes'); // 👈
app.use('/api/upload', uploadRoutes); // 👈

// ✅ MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// ✅ Запуск сервера
app.listen(5050, () => {
  console.log('🚀 Server running on port 5050');
});
