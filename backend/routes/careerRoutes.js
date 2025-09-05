// routes/careerApplications.js
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const careerCtrl = require("../controllers/careerController");

// auth — как у тебя
async function auth(req, res, next) {
  const token = req.cookies?.token ||
    (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ ok:false, message:'Unauthorized' });
  try {
    const p = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    req.user = {
      _id: p.id || p._id,
      id:  p.id || p._id,
      roles: Array.isArray(p.roles) ? p.roles : (p.role ? [p.role] : []),
      email: p.email,
      username: p.username,
    };
    // добираем роли из БД
    const me = await require('../models/User').findById(req.user._id).select('roles').lean();
    if (me?.roles) req.user.roles = me.roles;
    next();
  } catch (e) {
    return res.status(401).json({ ok:false, message:'Invalid token' });
  }
}

// только админ
function adminOnly(req, res, next) {
  const roles = (req.user?.roles || []).map((r) => String(r).toLowerCase());
  if (roles.some((r) => r.includes("admin") || r.includes("адмін"))) return next();
  return res.status(403).json({ ok: false, message: "Forbidden: admin only" });
}

// GET /api/career-applications?all=1 — админский список, иначе — свой/назначенные
router.get("/", auth, (req, res) => {
  if (String(req.query.all) === "1") return careerCtrl.listAdmin(req, res);
  return careerCtrl.list(req, res);
});

// POST — создать заявку
router.post("/", auth, careerCtrl.create);

// PUT — единое назначение (mentorId ИЛИ supervisorId)
router.put("/:id/assign", auth, adminOnly, careerCtrl.assign);

// GET — одна заявка (доступ: админ, назначенный, заявитель)
router.get("/:id", auth, careerCtrl.getOne);

module.exports = router;