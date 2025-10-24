const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const path = require("path");
const User = require("../models/User"); 
const sendRecoveryCodeEmail = require('../mailer/sendRecoveryCodeEmail');


const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

function buildSmtpTransportFromEnv() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[Mailer] SMTP_* env vars are missing; emails will be skipped.');
    return null;
  }
  const isSecure = String(process.env.SMTP_PORT || '') === '465';
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: isSecure,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function safeSendMail({ to, subject, html, text }) {
  const transporter = buildSmtpTransportFromEnv();
  if (!transporter) return; // do not throw if env is absent
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  try {
    await transporter.sendMail({ from, to, subject, html, text });
    console.log('[Mailer] Email sent to', to, '→', subject);
  } catch (e) {
    console.error('[Mailer] sendMail failed:', e.message);
    // do not rethrow to avoid 500 on business routes
  }
}

async function registerUser(req, res) {
  const payload = { ...req.body };
  if (payload.username) payload.username = String(payload.username).trim();

  try {
    const user = new User(payload);
    await user.save();

    await safeSendMail({
      to: user.email,
      subject: "Підтвердження отримання заявки на реєстрацію",
      html: `
        <p>Шановна/ий ${user.firstName || ""} ${user.lastName || ""},</p>
        <p>Дякуємо за вашу заявку на реєстрацію до особистого кабінету на нашому сайті Інституту Професійної Супервізії.</p>
        <p>Наразі ваша заявка перебуває на розгляді. Найближчим часом вона буде підтверджена та Ви отримаєте лист з усіма необхідними даними для входу та користування кабінетом.</p>
        <p>Якщо у вас виникнуть запитання, ви можете звертатися на нашу електронну пошту: profsupervision@gmail.com.</p>
        <p>З повагою,<br>Команда IPS</p>
        <p><a href="https://mamko-prof-supervision.com/">mamko-prof-supervision.com</a></p>
      `,
    });

    res.status(201).json({ message: "User registered successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}


async function adminLogin(req, res) {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.status !== "APPROVED") return res.status(403).json({ message: "Account not approved" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const roles = Array.isArray(user.roles) ? user.roles.map(String) : [];
    if (!roles.map(r => r.toLowerCase()).includes("admin")) {
      return res.status(403).json({ message: "Forbidden: admin only" });
    }

    const token = jwt.sign({ id: user._id, roles }, JWT_SECRET, { expiresIn: "7d" });
    setAuthCookie(res, token);
    // если используешь cookie-сессию — можно положить в httpOnly-cookie:
    // res.cookie("token", token, { httpOnly: true, sameSite: "lax", secure: true });
    return res.json({ message: "Admin login successful", token, user });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

// /api/users/profile и /api/users/admin/profile
async function profile(req, res) {
  try {
    const user = await User.findById(req.user?.id || req.user?._id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

// /api/users/recovery/verify
async function verifyRecoveryCode(req, res) {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ message: "Email and code are required" });
  try {
    const user = await User.findOne({ email });
    if (!user || user.recoveryCode !== String(code)) {
      return res.status(400).json({ message: "Invalid code" });
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

// /api/users/recovery/reset
async function resetPassword(req, res) {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ message: "Email, code and newPassword are required" });
  }
  try {
    const user = await User.findOne({ email });
    if (!user || user.recoveryCode !== String(code)) {
      return res.status(400).json({ message: "Invalid code" });
    }
    user.password = await bcrypt.hash(newPassword, 10);
    user.recoveryCode = undefined;
    await user.save();
    res.json({ message: "Password updated" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}



async function getAllUsers(req, res) {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};

    const users = await User.find(filter).select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error("Ошибка при получении пользователей:", error);
    res.status(500).json({ message: 'Server error' });
  }
}

async function getUserById(req, res) {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function updateUserStatus(req, res) {
  try {
    const { status, roles, role } = req.body; // roles (array) preferred

    const update = {};
    if (status) update.status = status;
    if (Array.isArray(roles)) update.roles = roles;
    if (role) update.role = role; // legacy single role if provided

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (status === "APPROVED") {
      await safeSendMail({
        to: user.email,
        subject: "Ваш доступ до особистого кабінету IPS активовано",
        html: `
          <p>Шановна/ий ${user.firstName || ""} ${user.lastName || ""},</p>
          <p>Ваша заявка на реєстрацію була успішно підтверджена.</p>
          <p>Ви можете увійти за посиланням:
            <a href="https://cabinet.mamko-prof-supervision.com/">Кабінет IPS</a>
          </p>
          <p>Ім’я користувача: <b>${user.username}</b></p>
          <p>З повагою,<br>Команда IPS</p>
        `,
      });
    }

    return res.json(user);
  } catch (error) {
    console.error('updateUserStatus error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}


async function loginUser(req, res) {
  const { username, password } = req.body;

  const uname = String(username || "").trim();
  const pwd = String(password || "");

  try {
    const user = await User.findOne({ username: uname });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.status !== "APPROVED") return res.status(403).json({ message: "Account not approved" });

    const isMatch = await bcrypt.compare(pwd, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const roles = Array.isArray(user.roles) ? user.roles.map(String) : [];
    const token = jwt.sign({ id: user._id, roles }, JWT_SECRET, { expiresIn: "7d" });

    // set httpOnly auth cookie
    setAuthCookie(res, token);

    return res.status(200).json({ message: "Login successful", user, token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}



async function updateUser(req, res) {
  try {
    const body = { ...req.body };
    if (Object.prototype.hasOwnProperty.call(body, "password") && body.password) {
      body.password = await bcrypt.hash(String(body.password), 10);
    }

    const user = await User.findByIdAndUpdate(req.params.id, body, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function sendRecoveryCode(req, res) {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.recoveryCode = code;
    await user.save();

    await sendRecoveryCodeEmail(email, code);
    res.json({ message: "Код надіслано на пошту" });
  } catch (error) {
    console.error("sendRecoveryCode error:", error);
    res.status(500).json({ message: "Не вдалося надіслати лист" });
  }
}


const uploadUserPhoto = async (req, res) => {
  try {
    const userId = req.params.id;
    const photoPath = req.file ? `/uploads/${req.file.filename}` : null;

    if (!photoPath) return res.status(400).json({ message: "Фото не надіслано." });

    const user = await User.findByIdAndUpdate(userId, { photoUrl: photoPath }, { new: true });
    res.json({ message: "Фото оновлено", photoUrl: photoPath });
  } catch (err) {
    console.error("Photo upload error:", err);
    res.status(500).json({ message: "Помилка сервера." });
  }
};

function setAuthCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',      // 'none' если фронт на другом домене/субдомене
    secure:  isProd ? true : false,         // для 'none' нужен HTTPS!
    domain:  isProd ? '.mamko-prof-supervision.com' : undefined, // общий для поддоменов
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

module.exports = {
  registerUser,
  getAllUsers,
  getUserById,
  updateUserStatus,
  loginUser,
  updateUser,
  sendRecoveryCode,
  uploadUserPhoto,
  adminLogin,
  profile,
  verifyRecoveryCode,
  resetPassword,
};