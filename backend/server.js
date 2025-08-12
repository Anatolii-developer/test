require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser'); // 👈
const path = require('path');

mongoose.connect(process.env.MONGO_URI);

const app = express();
app.set('trust proxy', 1);

app.use(cors({
  origin: 'http://157.230.121.24:5050', // тот же хост/порт, откуда грузится фронт
  credentials: true
}));
app.use(cookieParser());                 // 👈
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/roles', require('./routes/roleRoutes'));
app.use('/api/library', require('./routes/library'));
app.use('/api/career-applications', require('./routes/careerRoutes'));

app.listen(5050, '0.0.0.0');