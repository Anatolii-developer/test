// controllers/careerController.js
const CareerApplication = require('../models/CareerApplication');
const User = require('../models/User');

module.exports = {
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
        username: (req.user?.username || userDoc?.username || req.body.username || '').trim() || undefined,
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

  list: async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ ok:false, message:'Unauthorized' });

      const me = await User.findById(req.user._id).select('roles username').lean();
      const iAmMentor = Array.isArray(me?.roles) &&
        me.roles.some(r => String(r).toLowerCase().includes('ментор') || String(r).toLowerCase().includes('mentor'));
      const isAdmin = ['admin','адмін'].includes(String(req.user.role||'').toLowerCase());

      const wantAll = ['1','true','yes'].includes(String(req.query.all||'').toLowerCase());

      let filter = {};
      if (isAdmin && wantAll) {
        filter = {}; // админ видит все
      } else if (iAmMentor) {
        filter = { assignedMentor: req.user._id }; // ментор видит только назначенные заявки
      } else {
        filter = { user: req.user._id }; // обычный пользователь — только свои
      }

      const apps = await CareerApplication.find(filter)
        .populate('user', 'firstName lastName middleName email username photoUrl')
        .populate('assignedMentor', 'firstName lastName email username')
        .sort({ createdAt: -1 });

      res.json({ ok:true, rows: apps });
    } catch (err) {
      console.error('career applications list failed:', err);
      res.status(500).json({ ok:false, message:'Server error' });
    }
  },

  assignMentor: async (req, res) => {
    try {
      const { id } = req.params;
      const { mentorId } = req.body;

      if (!mentorId) {
        return res.status(400).json({ ok: false, message: 'mentorId required' });
      }

      const app = await CareerApplication.findByIdAndUpdate(
        id,
        { assignedMentor: mentorId },
        { new: true }
      ).populate('assignedMentor', 'firstName lastName email username');

      if (!app) {
        return res.status(404).json({ ok: false, message: 'Application not found' });
      }

      res.json({ ok: true, application: app });
    } catch (err) {
      console.error('assignMentor failed:', err);
      res.status(500).json({ ok: false, message: 'Server error' });
    }
  }
};