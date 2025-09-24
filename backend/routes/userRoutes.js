const express = require("express");
const path = require("path");
const multer = require("multer");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const router = express.Router();

// ✅ единый корректный импорт контроллера
const userCtrl = require("../controllers/userController");
const User = require("../models/User");

// ===== Multer =====
const profilePhotoUpload = multer({ dest: "uploads/" });

const certStorage = multer.diskStorage({
  destination: (req, file, cb) =>
    cb(null, path.join(__dirname, "../public/uploads/certificates")),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const certUpload = multer({ storage: certStorage });

// ===== Auth middlewares =====
function auth(req, res, next) {
  const headerToken =
    (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim() || null;
  const cookieToken = req.cookies?.token || null;

  // сначала пробуем httpOnly cookie, затем header
  let token = cookieToken || headerToken;
  if (!token)
    return res.status(401).json({ ok: false, message: "Unauthorized" });

  const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (_) {
    // если ломается header, пробуем cookie
    if (token === headerToken && cookieToken) {
      try {
        req.user = jwt.verify(cookieToken, JWT_SECRET);
        return next();
      } catch {}
    }
    return res.status(401).json({ ok: false, message: "Invalid token" });
  }
}

function adminOnly(req, res, next) {
  const roles = Array.isArray(req.user?.roles)
    ? req.user.roles.map((r) => String(r).toLowerCase())
    : [];
  if (roles.includes("admin")) return next();
  return res.status(403).json({ ok: false, message: "Forbidden: admin only" });
}

// ===== Auth =====
router.post("/register", userCtrl.registerUser); // письмо уходит внутри контроллера
router.post("/login", userCtrl.loginUser);
router.post("/admin/login", userCtrl.adminLogin);
router.get("/profile", auth, userCtrl.profile);
router.get("/admin/profile", auth, adminOnly, userCtrl.profile);

// ===== Lists / helpers =====
router.get("/approved", async (_req, res) => {
  try {
    const users = await User.find({ status: "APPROVED" });
    res.json(users);
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/users-with-roles", async (_req, res) => {
  try {
    const users = await User.find({}, "firstName lastName email roles status");
    res.json(users);
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/roles-with-users", async (_req, res) => {
  try {
    const users = await User.find(
      { roles: { $exists: true, $ne: [] } },
      "firstName lastName roles status"
    );
    const grouped = {};
    for (const u of users) {
      for (const r of u.roles || []) {
        if (!grouped[r]) grouped[r] = [];
        grouped[r].push({
          name: `${u.firstName || ""} ${u.lastName || ""}`.trim(),
          status: u.status,
        });
      }
    }
    res.json(grouped);
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});

// ===== Восстановление пароля (email) =====
router.post("/recovery/send", userCtrl.sendRecoveryCode);
router.post("/recovery/verify", userCtrl.verifyRecoveryCode); // можно не использовать, если проверяешь в reset
router.post("/recovery/reset", userCtrl.resetPassword);
router.post("/forgot-password", userCtrl.sendRecoveryCode);

// ===== спец-роуты ДО /:id =====
router.post(
  "/:id/photo",
  profilePhotoUpload.single("photo"),
  userCtrl.uploadUserPhoto
);

router.post(
  "/:id/certificate",
  certUpload.single("certificate"),
  async (req, res) => {
    try {
      const userId = req.params.id;
      const { lang, courseId } = req.query;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid userId" });
      }
      if (!["ua", "eng"].includes(lang) || !courseId) {
        return res
          .status(400)
          .json({ success: false, message: "Missing or invalid query params" });
      }
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "No file uploaded" });
      }

      const user = await User.findById(userId);
      if (!user)
        return res
          .status(404)
          .json({ success: false, message: "User not found" });

      const fileUrl = `/uploads/certificates/${req.file.filename}`;
      if (!user.certificates) user.certificates = {};
      if (!user.certificates[courseId]) user.certificates[courseId] = {};
      user.certificates[courseId][lang] = {
        filename: req.file.originalname,
        url: fileUrl,
        uploadedAt: new Date(),
      };
      user.markModified("certificates");
      await user.save();

      res.json({ success: true, url: fileUrl });
    } catch (e) {
      res
        .status(500)
        .json({ success: false, message: "Server error", error: e.message });
    }
  }
);

// ===== Generic CRUD (в самом конце) =====
router.get("/", userCtrl.getAllUsers);
router.get("/:id", userCtrl.getUserById);
router.put("/:id/status", userCtrl.updateUserStatus);
router.put("/:id", userCtrl.updateUser);
router.post("/forgot-password", userCtrl.sendRecoveryCode);
module.exports = router;
