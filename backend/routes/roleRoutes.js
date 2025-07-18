const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema({
  name: String,
  active: { type: Boolean, default: true }
});

const Role = mongoose.model("Role", roleSchema);

// GET all roles
router.get("/", async (req, res) => {
  try {
    const roles = await Role.find();
    res.json(roles);
  } catch (err) {
    console.error("❌ Не вдалося отримати ролі:", err);
    res.status(500).json({ message: "Серверна помилка" });
  }
});

// POST new role
router.post("/", async (req, res) => {
  try {
    const newRole = new Role(req.body);
    await newRole.save();
    res.status(201).json(newRole);
  } catch (err) {
    console.error("❌ Помилка при створенні ролі:", err);
    res.status(500).json({ message: "Помилка сервера" });
  }
});

// PUT update role
router.put("/:id", async (req, res) => {
  try {
    await Role.findByIdAndUpdate(req.params.id, req.body);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Помилка при оновленні ролі:", err);
    res.status(500).json({ message: "Помилка сервера" });
  }
});

// DELETE role
router.delete("/:id", async (req, res) => {
  try {
    await Role.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Помилка при видаленні ролі:", err);
    res.status(500).json({ message: "Помилка сервера" });
  }
});

module.exports = router;
