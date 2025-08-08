// backend/controllers/careerController.js
const CareerApplication = require("../models/CareerApplication");

exports.createApplication = async (req, res) => {
  try {
    const payload = {
      userId: req.user?._id, // если есть мидлварь аутентификации
      fullName: req.body.fullName,
      email: req.body.email,
      experience: req.body.experience,
      ageGroup: req.body.ageGroup,
      requestText: req.body.requestText,
      aboutText: req.body.aboutText,
    };
    const doc = await CareerApplication.create(payload);
    res.status(201).json({ ok: true, application: doc });
  } catch (e) {
    console.error("createApplication error:", e);
    res.status(500).json({ ok: false, message: "Server error" });
  }
};

exports.listMyApplications = async (req, res) => {
  try {
    const filter = req.user?._id
      ? { userId: req.user._id }
      : { email: req.query.email }; // fallback без авторизации
    const rows = await CareerApplication.find(filter).sort({ createdAt: -1 });
    res.json({ ok: true, rows });
  } catch (e) {
    console.error("listMyApplications error:", e);
    res.status(500).json({ ok: false, message: "Server error" });
  }
};

exports.getApplication = async (req, res) => {
  try {
    const row = await CareerApplication.findById(req.params.id);
    if (!row) return res.status(404).json({ ok: false, message: "Not found" });
    res.json({ ok: true, row });
  } catch (e) {
    res.status(500).json({ ok: false, message: "Server error" });
  }
};