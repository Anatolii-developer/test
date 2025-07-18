const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

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


// ✅ MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

app.listen(5050, '0.0.0.0', () => {
  console.log('🚀 Server running on port 5050 and accessible externally');
});
