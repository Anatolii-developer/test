const CareerFaq = require('../models/CareerFaq');


exports.listPublic = async (req, res) => {
  try {
    const rows = await CareerFaq.find({ isActive: true })
      .sort({ order: 1, updatedAt: -1 })
      .lean();
    res.json(rows);
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
};

// Админский список (всё)
exports.listAdmin = async (req, res) => {
  try {
    const rows = await CareerFaq.find({}).sort({ order: 1, updatedAt: -1 }).lean();
    res.json(rows);
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
};

exports.create = async (req, res) => {
  try {
    const { question, answer, order = 0, isActive = true } = req.body;
    const doc = await CareerFaq.create({ question, answer, order, isActive });
    res.status(201).json(doc);
  } catch (e) { res.status(400).json({ message: 'Bad request' }); }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = (({ question, answer, order, isActive }) =>
      ({ question, answer, order, isActive }))(req.body);
    const doc = await CareerFaq.findByIdAndUpdate(id, payload, { new: true });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (e) { res.status(400).json({ message: 'Bad request' }); }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const r = await CareerFaq.findByIdAndDelete(id);
    if (!r) return res.status(404).json({ message: 'Not found' });
    res.json({ ok: true });
  } catch (e) { res.status(400).json({ message: 'Bad request' }); }
};