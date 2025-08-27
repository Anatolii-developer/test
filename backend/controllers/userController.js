const jwt = require('jsonwebtoken');
const User = require('../models/User');
const bcrypt = require("bcryptjs");
const path = require("path");
const sendRegistrationEmail = require("../mailer");



function signUser(user){
  return jwt.sign(
    {
      id: user._id,
      // важно: передаём МАССИВ ролей, а не user.role
      roles: Array.isArray(user.roles) ? user.roles : [],
      email: user.email,
      username: user.username,
    },
    process.env.JWT_SECRET || 'dev_secret',
    { expiresIn: '7d' }
  );
}

exports.loginUser = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.status !== "APPROVED") return res.status(403).json({ message: "Account not approved" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = signUser(user);

    res.cookie('token', token, {
      httpOnly: true, sameSite: 'lax', secure: false, path: '/', maxAge: 7*24*60*60*1000
    });

    return res.status(200).json({ ok: true, message: "Login successful", user });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// отдельный логин для админки (проверяем роль)
exports.adminLogin = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.status !== "APPROVED") return res.status(403).json({ message: "Account not approved" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const roles = Array.isArray(user.roles) ? user.roles.map(r=>String(r).toLowerCase()) : [];
    if (!roles.includes('admin')) {
      return res.status(403).json({ message: "Admin role required" });
    }

    const token = signUser(user);
    res.cookie('token', token, {
      httpOnly: true, sameSite: 'lax', secure: false, path: '/', maxAge: 7*24*60*60*1000
    });

    return res.status(200).json({ ok: true, message: "Admin login successful", user });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// профиль для проверки авторизации (будем вызывать с админ-страниц)
exports.profile = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ ok:false, message: 'Unauthorized' });
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ ok:false, message: 'User not found' });
    res.json({ ok:true, user });
  } catch (e) {
    res.status(500).json({ ok:false, message: e.message });
  }
};

exports.registerUser = async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();

    // 1) Ответ клиенту сразу
    res.status(201).json({ message: "User registered successfully.", user, emailEnqueued: true });

    // 2) Письмо — fire-and-forget
    Promise.resolve()
      .then(() => {
        console.log("▶️ Triggering sendRegistrationEmail for:", user.email);
        return sendRegistrationEmail(user.email, user.firstName, user.lastName);
      })
      .then((r) => console.log("📬 sendRegistrationEmail result:", r))
      .catch((e) => console.error("⚠️ sendRegistrationEmail failed:", e?.message || e));
  } catch (error) {
    console.error("❌ Registration error:", error);
    res.status(500).json({ error: error.message });
  }
};



exports.getAllUsers = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const users = await User.find(filter).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error("Ошибка при получении пользователей:", error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { status, roles } = req.body;
    const update = { status };

    if (Array.isArray(roles)) {
      update.roles = roles;
    }

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });

    if (!user) return res.status(404).json({ message: "User not found" });

    // 📨 Email сповіщення (опціонально)
    // if (status === "APPROVED") {
    //   await sendMail(
    //     user.email,
    //     "Ваш доступ до особистого кабінету IPS активовано",
    //     `...`
    //   );
    // }

    res.json(user);
  } catch (error) {
    console.error("❌ updateUserStatus error:", error);
    res.status(500).json({ error: error.message });
  }
};


exports.loginUser = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.status !== "APPROVED") return res.status(403).json({ message: "Account not approved" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    // 🎫 Сгенерить токен
    const token = jwt.sign(
      { id: user._id, role: user.role || '' },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: '7d' }
    );

    // 🍪 DEV-кука (HTTP): secure:false, sameSite:'lax'
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(200).json({ ok: true, message: "Login successful", user });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.sendRecoveryCode = async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.recoveryCode = code;
    await user.save();



    const mailOptions = {
      from: process.env.BREVO_USER || process.env.EMAIL_FROM,
      replyTo: "profsupervision@gmail.com",
      to: email,
      subject: "Код для відновлення паролю",
      text: `Ваш код для відновлення паролю: ${code}`
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: "Код надіслано на пошту" });
  } catch (error) {
    console.error("sendRecoveryCode error:", error);
    res.status(500).json({ message: "Не вдалося надіслати лист" });
  }
};

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

module.exports = {
  ...exports,
  uploadUserPhoto,
};
