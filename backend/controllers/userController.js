const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const path = require("path");
const User = require("../models/User"); 

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

async function registerUser(req, res) {
  try {
    const user = new User(req.body);
    await user.save();

    try {
      await sendMail(
        user.email,
        "Підтвердження отримання заявки на реєстрацію",
        `
        <p>Шановна/ий ${user.firstName || ""} ${user.lastName || ""},</p>
        <p>Дякуємо за вашу заявку на реєстрацію до особистого кабінету на нашому сайті Інституту Професійної Супервізії.</p>
        <p>Наразі ваша заявка перебуває на розгляді. Найближчим часом вона буде підтверджена та Ви отримаєте лист з усіма необхідними даними для входу та користування кабінетом.</p>
        <p>Якщо у вас виникнуть запитання, ви можете звертатися на нашу електронну пошту: profsupervision@gmail.com.</p>
        <p>З повагою,<br>Команда IPS</p>
        <p><a href="https://mamko-prof-supervision.com/">mamko-prof-supervision.com</a></p>
        `
      );
    } catch (emailErr) {
      console.error("❌ Send email failed:", emailErr.message);
      // Можно даже записать это в логи или в базу данных, но пользователю не показывать
    }

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

    const users = await User.find(filter).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error("Ошибка при получении пользователей:", error);
    res.status(500).json({ message: 'Server error' });
  }
}

async function getUserById(req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function updateUserStatus(req, res) {
  try {
    const { status, role } = req.body;
    const update = { status };
    if (role) update.role = role;

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });

    if (status === "APPROVED") {
      await sendMail(
        user.email,
        "Ваш доступ до особистого кабінету IPS активовано",
        `
        <p>Шановна/ий ${user.firstName || ""} ${user.lastName || ""},</p>
        <p>Ваша заявка на реєстрацію до особистого кабінету на нашому сайті Інституту Професійної Супервізії була успішно підтверджена.</p>
        <p>Відтепер ви маєте доступ до вашого персонального кабінету.</p>
        <p>🔐 <strong>Дані для входу:</strong><br>
        Посилання: <a href="http://mamko-prof-supervision.com/login">Вхід</a><br>
        Ім’я користувача: ${user.username}<br>
        Ваш пароль: [********]</p>
        <p>📌 Якщо ви маєте запитання — звертайтесь на profsupervision@gmail.com.</p>
        <p>З повагою,<br>Команда IPS</p>
        <p><a href="https://mamko-prof-supervision.com/">mamko-prof-supervision.com</a></p>
        `
      );
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}


async function loginUser(req, res) {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.status !== "APPROVED") return res.status(403).json({ message: "Account not approved" });

    const isMatch = await bcrypt.compare(password, user.password);
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
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendMail(to, subject, html) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });
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

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Код для відновлення паролю",
      text: `Ваш код для відновлення паролю: ${code}`
    });
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