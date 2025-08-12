// controllers/careerApplicationsController.js
const CareerApplication = require('../models/CareerApplication');
const User = require('../models/User');

module.exports = {
  // controllers/careerApplicationsController.js → create
create: async (req, res) => {
  try {
    let userId = req.user?._id;
    let userDoc = null;

    if (userId) {
      userDoc = await User.findById(userId).lean();
    } else if (req.body.username) {
      userDoc = await User.findOne({ username: req.body.username }).lean();
      if (userDoc) userId = userDoc._id;
    }

    const app = await CareerApplication.create({
      user: userId || undefined,
      username: (req.user?.username || userDoc?.username || req.body.username || '').trim() || undefined, // 👈
      fullName: userDoc ? `${userDoc.firstName||''} ${userDoc.lastName||''}`.trim() : (req.body.fullName||'').trim() || undefined,
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


 // controllers/careerApplicationsController.js → list
list: async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ ok:false, message:'Unauthorized' });

    const role = String(req.user.role || '').toLowerCase();
    const isAdmin = role === 'admin' || role === 'адмін';
    const mine = ['1','true','yes'].includes(String(req.query.mine||'').toLowerCase());

    let filter = {};
    if (!(isAdmin && !mine)) {
      const or = [{ user: req.user._id }];
      if (req.user.username) or.push({ username: req.user.username }); // 👈 основной фильтр
      filter = { $or: or };
    }

    const apps = await CareerApplication.find(filter)
      .populate('user', 'firstName lastName email username')
      .sort({ createdAt: -1 });

    res.json({ ok:true, rows: apps });
  } catch (err) {
    console.error('career applications list failed:', err);
    res.status(500).json({ ok:false, error: err.message });
  }
}

};