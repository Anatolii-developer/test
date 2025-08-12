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

  list: async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ ok: false, message: 'Unauthorized' });
      }

    const role = (req.user.role || '').toLowerCase();
    const isAdmin = role === 'admin' || role === 'адмін';
    const mine = ['1', 'true', 'yes'].includes(String(req.query.mine || '').toLowerCase());

    let filter = {};
    if (!(isAdmin && !mine)) {
      // для звичайного користувача або admin з ?mine=1 показуємо його заявки
      filter = {
    $or: [
      { user: req.user._id },
      { email: req.user.email }   // ← підхопить старі заявки без user
    ]
  };
}

const apps = await CareerApplication.find(filter)
  .populate('user', 'firstName lastName email')
  .sort({ createdAt: -1 });

res.json({ ok: true, rows: apps });
  } catch (err) {
    console.error('career applications list failed:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
}
};