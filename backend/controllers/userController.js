const User = require('../models/User');
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const path = require("path");
const sendRegistrationEmail = require("../mailer");


exports.registerUser = async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();

    // 1) Ответ клиенту сразу
    res.status(201).json({ message: "User registered successfully.", user });

    // 2) Письмо — fire-and-forget
    Promise.resolve()
      .then(() => sendRegistrationEmail(user.email, user.firstName, user.lastName))
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

    res.status(200).json({ message: "Login successful", user });
  } catch (error) {
    res.status(500).json({ message: error.message });
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

    // Email отправка остаётся активной, если хочешь — её тоже можно закомментировать
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_FROM,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM,
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
