const User = require('../models/User');

exports.registerUser = async (req, res) => {
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
};


// controllers/userController.js
const bcrypt = require("bcryptjs");

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

const nodemailer = require("nodemailer");

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
exports.sendRecoveryCode = async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.recoveryCode = code;
    await user.save();

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


const path = require("path");

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

// Экспортируй
module.exports = {
  ...exports,
  uploadUserPhoto,
};
