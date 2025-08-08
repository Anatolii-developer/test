// controllers/careerApplicationsController.js
const CareerApplication = require('../models/CareerApplication');
const User = require('../models/User');

module.exports = {
  create: async (req, res) => {
    try {
      let userId = req.user?._id;
      let userDoc = null;

      if (!userId && req.body.email) {
        userDoc = await User.findOne({ email: req.body.email }).lean();
        if (userDoc) userId = userDoc._id;
      } else if (userId) {
        userDoc = await User.findById(userId).lean();
      }

      const userFullName =
        userDoc ? `${userDoc.firstName || ''} ${userDoc.lastName || ''}`.trim()
                : (req.body.fullName || '').trim();

      const app = await CareerApplication.create({
        user: userId || undefined,
        fullName: userFullName || undefined,
        email: userDoc?.email || req.body.email,
        experience: req.body.experience,
        ageGroup: req.body.ageGroup,
        requestText: req.body.requestText,
        aboutText: req.body.aboutText,
      });

      res.json({ ok: true, id: app._id });
    } catch (e) {
      console.error('create career application failed:', e);
      res.status(500).json({ ok: false, message: 'Server error' });
    }
  },

  list: async (_req, res) => {
    try {
      const apps = await CareerApplication.find()
        .populate('user', 'firstName lastName email')
        .sort({ createdAt: -1 });

      res.json({ ok: true, rows: apps });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  }
};