const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const sendRegistrationEmail = require('../mailer'); // твоя функция-рассылка

function signUser(user) {
  return jwt.sign(
    {
      id: user._id,
      roles: Array.isArray(user.roles) ? user.roles : [],
      email: user.email,
      username: user.username,
    },
    process.env.JWT_SECRET || 'dev_secret',
    { expiresIn: '7d' }
  );
}

// ------- Auth
async function loginUser(req, res) {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.status !== 'APPROVED') return res.status(403).json({ message: 'Account not approved' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const token = signUser(user);
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax', secure: false, path: '/', maxAge: 7*24*60*60*1000 });
    // ⬇⬇⬇ ВОТ ЭТО ДОБАВИМ
    res.status(200).json({ ok: true, message: 'Login successful', user, token });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function adminLogin(req, res) {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.status !== 'APPROVED') return res.status(403).json({ message: 'Account not approved' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const roles = (user.roles || []).map(r => String(r).toLowerCase());
    if (!roles.includes('admin')) return res.status(403).json({ message: 'Admin role required' });

    const token = signUser(user);
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax', secure: false, path: '/', maxAge: 7*24*60*60*1000 });
    // ⬇⬇⬇ И ЗДЕСЬ ТОЖЕ
    res.status(200).json({ ok: true, message: 'Admin login successful', user, token });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function profile(req, res) {
  try {
    if (!req.user) return res.status(401).json({ ok: false, message: 'Unauthorized' });
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' });
    res.json({ ok: true, user });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
}

function toArray(val) {
  if (Array.isArray(val)) return val.map(String).map(s => s.trim()).filter(Boolean);
  if (typeof val === 'string') {
    const s = val.trim();
    return s ? [s] : [];
  }
  return [];
}

async function registerUser(req, res) {
  try {
    const body = req.body || {};
    const user = new User({
      username: body.username,
      password: body.password,
      firstName: body.firstName,
      lastName: body.lastName,
      middleName: body.middleName,
      dateOfBirth: body.dateOfBirth,
      email: body.email,
      phone: body.phone,
      gender: body.gender,
      experience: body.experience,
      education: body.education,

      // ⬇️ критично
      directions: toArray(body.directions),
      topics: toArray(body.topics),

      status: body.status || 'WAIT FOR REVIEW',
      createdAt: body.createdAt || new Date()
    });

    await user.save();
    res.status(201).json({ message: 'User registered successfully.', user, emailEnqueued: true });

    Promise.resolve()
      .then(() => sendRegistrationEmail(user.email, user.firstName, user.lastName))
      .catch(err => console.error('sendRegistrationEmail failed:', err?.message || err));
  } catch (e) {
    console.error('Registration error:', e);
    res.status(500).json({ error: e.message });
  }
}

async function getAllUsers(req, res) {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const users = await User.find(filter).sort({ createdAt: -1 });
    res.json(users);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
}

async function getUserById(req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function updateUserStatus(req, res) {
  try {
    const { status, roles } = req.body;
    const update = {};
    if (status) update.status = status;
    if (Array.isArray(roles)) update.roles = roles;

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function updateUser(req, res) {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// (оставь свою реализацию отправки письма восстановления; главное — чтобы тут не падало)
async function sendRecoveryCode(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.recoveryCode = code;
    await user.save();

    // TODO: отправка письма (не менял твою инфраструктуру)
    res.json({ message: 'Код згенеровано та збережено' });
  } catch (e) {
    res.status(500).json({ message: 'Не вдалося надіслати лист' });
  }
}

async function uploadUserPhoto(req, res) {
  try {
    const userId = req.params.id;
    const photoPath = req.file ? `/uploads/${req.file.filename}` : null;
    if (!photoPath) return res.status(400).json({ message: 'Фото не надіслано.' });

    await User.findByIdAndUpdate(userId, { photoUrl: photoPath }, { new: true });
    res.json({ message: 'Фото оновлено', photoUrl: photoPath });
  } catch (e) {
    res.status(500).json({ message: 'Помилка сервера.' });
  }
}

module.exports = {
  loginUser,
  adminLogin,
  profile,
  registerUser,
  getAllUsers,
  getUserById,
  updateUserStatus,
  updateUser,
  sendRecoveryCode,
  uploadUserPhoto,
};