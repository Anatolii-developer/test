// models/Role.js
const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  active: { type: Boolean, default: true }
});

module.exports = mongoose.model("Role", roleSchema);
