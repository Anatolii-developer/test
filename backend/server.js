require('dotenv').config(); // ← должно быть в самом верху

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

console.log("📡 MONGO_URI:", process.env.MONGO_URI); // проверка

// ✅ Подключение к MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

// ✅ Статические файлы
app.use(express.static(path.join(__dirname, 'public')));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));



// ✅ Роуты
const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

const courseRoutes = require('./routes/courseRoutes');
app.use('/api/courses', courseRoutes);

const roleRoutes = require("./routes/roleRoutes");
app.use("/api/roles", roleRoutes);

const libraryRoutes = require("./routes/library");
app.use("/api/library", libraryRoutes); 

app.use("/api/career-applications", require("./routes/careerRoutes"));


app.listen(5050, '0.0.0.0', () => {
  console.log('🚀 Server running on port 5050 and accessible externally');
});
