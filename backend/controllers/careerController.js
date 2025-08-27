const CareerApplication = require('../models/CareerApplication');
const User = require('../models/User');

// ===== helper =====
async function isAdminUser(req) {
  const rolesFromToken = Array.isArray(req.user?.roles) ? req.user.roles : [];
  const isAdminFromToken = rolesFromToken
    .map(r => String(r).toLowerCase())
    .some(r => r.includes('admin') || r.includes('адмін'));
  if (isAdminFromToken) return true;

  const uid = req.user?._id || req.user?.id;
  if (!uid) return false;
  const me = await User.findById(uid).select('roles').lean();
  return Array.isArray(me?.roles) &&
    me.roles.map(r => String(r).toLowerCase())
      .some(r => r.includes('admin') || r.includes('адмін'));
}

// ===== handlers =====
async function getOneAdmin(req, res) {
  try {
    if (!(await isAdminUser(req))) {
      return res.status(403).json({ ok:false, message:'Forbidden: admin only' });
    }

    const app = await CareerApplication.findById(req.params.id)
      .populate('user', 'firstName lastName middleName email username photoUrl')
      .populate('assignedMentor', 'firstName lastName email username');

    if (!app) return res.status(404).json({ ok:false, message:'Not found' });
    res.json({ ok:true, application: app });
  } catch (e) {
    console.error('getOneAdmin failed:', e);
    res.status(500).json({ ok:false, message:'Server error' });
  }
}

async function list(req, res) {
  try {
    if (!req.user) return res.status(401).json({ ok:false, message:'Unauthorized' });

    const me = await User.findById(req.user._id).select('roles').lean();
    const isMentor = Array.isArray(me?.roles) &&
      me.roles.some(r => String(r).toLowerCase().includes('mentor') || String(r).toLowerCase().includes('ментор'));

    const filter = isMentor ? { assignedMentor: req.user._id } : { user: req.user._id };

    const apps = await CareerApplication.find(filter)
      .populate('user', 'firstName lastName email username')
      .populate('assignedMentor', 'firstName lastName email username')
      .sort({ createdAt: -1 });

    res.json({ ok:true, rows: apps });
  } catch (err) {
    console.error('career list failed:', err);
    res.status(500).json({ ok:false, message:'Server error' });
  }
}

async function listAdmin(req, res) {
  try {
    if (!(await isAdminUser(req))) {
      return res.status(403).json({ ok:false, message:'Forbidden: admin only' });
    }

    const apps = await CareerApplication.find({})
      .populate('user', 'firstName lastName email username')
      .populate('assignedMentor', 'firstName lastName email username')
      .sort({ createdAt: -1 });

    res.json({ ok:true, rows: apps });
  } catch (err) {
    console.error('career listAdmin failed:', err);
    res.status(500).json({ ok:false, message:'Server error' });
  }
}

async function create(req, res) {
  try {
    let userId = req.user?._id;
    let userDoc = null;

    if (userId) userDoc = await User.findById(userId).lean();
    else if (req.body.username) {
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
}

async function assignMentor(req, res) {
  try {
    if (!(await isAdminUser(req))) {
      return res.status(403).json({ ok:false, message:'Forbidden: admin only' });
    }

    const { id } = req.params;
    const { mentorId } = req.body;
    if (!mentorId) return res.status(400).json({ ok:false, message:'mentorId required' });

    const app = await CareerApplication.findByIdAndUpdate(
      id,
      { assignedMentor: mentorId },
      { new: true }
    ).populate('assignedMentor', 'firstName lastName email username');

    if (!app) return res.status(404).json({ ok:false, message:'Application not found' });
    res.json({ ok:true, application: app });
  } catch (err) {
    console.error('assignMentor failed:', err);
    res.status(500).json({ ok:false, message:'Server error' });
  }
}

// ==== единый export ====
module.exports = {
  list,
  listAdmin,
  create,
  assignMentor,
  getOneAdmin,
  // isAdminUser // если нужно использовать в других модулях
};