const mongoose = require('mongoose');
const CareerApplication = require("../models/CareerApplication");
const User = require("../models/User");

// ==== helpers
async function isAdminUser(req) {
  const rolesFromToken = Array.isArray(req.user?.roles) ? req.user.roles : [];
  const isAdminFromToken = rolesFromToken
    .map((r) => String(r).toLowerCase())
    .some((r) => r.includes("admin") || r.includes("адмін"));
  if (isAdminFromToken) return true;

  const uid = req.user?._id || req.user?.id;
  if (!uid) return false;
  const me = await User.findById(uid).select("roles").lean();
  return (
    Array.isArray(me?.roles) &&
    me.roles
      .map((r) => String(r).toLowerCase())
      .some((r) => r.includes("admin") || r.includes("адмін"))
  );
}

async function isMentorUser(req) {
  const rolesFromToken = Array.isArray(req.user?.roles) ? req.user.roles : [];
  const isMentorFromToken = rolesFromToken
    .map(r => String(r).toLowerCase())
    .some(r => r.includes('mentor') || r.includes('ментор'));
  if (isMentorFromToken) return true;

  const uid = req.user?._id || req.user?.id;
  if (!uid) return false;
  const me = await User.findById(uid).select('roles').lean();
  return Array.isArray(me?.roles) && me.roles
    .map(r => String(r).toLowerCase())
    .some(r => r.includes('mentor') || r.includes('ментор'));
}

function hasMentorRole(roles) {
  return (
    Array.isArray(roles) &&
    roles
      .map((r) => String(r).toLowerCase())
      .some((r) => r.includes("mentor") || r.includes("ментор"))
  );
}

/**
 * Разрешение на просмотр заявки:
 * - admin: да
 * - назначенный исполнитель (ментор или супервізор): да
 * - заявитель: да
 */
async function canViewApplication(req, app) {
  if (await isAdminUser(req)) return true;

  const myId = String(req.user?._id || req.user?.id || '');

  // Если заявка назначена на меня — разрешаем
  const assignedMentorId = String(app.assignedMentor?._id || app.assignedMentor || app.assignedMentorId || '');
  const assignedSupervisorId = String(app.assignedSupervisor?._id || app.assignedSupervisor || app.assignedSupervisorId || '');
  if ((assignedMentorId && assignedMentorId === myId) || (assignedSupervisorId && assignedSupervisorId === myId)) {
    return true;
  }

  // Заявитель видит свою заявку
  if (String(app.user?._id || app.user) === myId) return true;

  return false;
}

// ==== handlers

// Админский «один»
async function getOneAdmin(req, res) {
  try {
    if (!(await isAdminUser(req))) {
      return res.status(403).json({ ok: false, message: "Forbidden: admin only" });
    }
    const app = await CareerApplication.findById(req.params.id)
      .populate("user", "firstName lastName middleName email username photoUrl")
      .populate('assignedMentor', 'firstName lastName email username')
      .populate('assignedSupervisor', 'firstName lastName email username');

    if (!app) return res.status(404).json({ ok: false, message: "Not found" });
    res.json({ ok: true, application: app });
  } catch (e) {
    console.error("getOneAdmin failed:", e);
    res.status(500).json({ ok: false, message: "Server error" });
  }
}

// Общий «один» (доступен админу, назначенному, заявителю)
async function getOne(req, res) {
  try {
    const app = await CareerApplication.findById(req.params.id)
      .populate("user", "firstName lastName middleName email username photoUrl")
      .populate("assignedMentor", "firstName lastName email username")
      .populate("assignedSupervisor", "firstName lastName email username");

    if (!app) return res.status(404).json({ ok: false, message: "Not found" });

    if (!(await canViewApplication(req, app))) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }

    res.json({ ok: true, application: app });
  } catch (e) {
    console.error("getOne failed:", e);
    res.status(500).json({ ok: false, message: "Server error" });
  }
}

// Админский список
// ... сверху без изменений

async function listAdmin(req, res) {
  try {
    if (!(await isAdminUser(req))) {
      return res.status(403).json({ ok:false, message:'Forbidden: admin only' });
    }

    const target = String(req.query.target || '').toLowerCase().trim();
    const q = {};
    if (target === 'mentor')      q.target = 'mentor';
    else if (target === 'supervisor') q.target = 'supervisor';

    const apps = await CareerApplication.find(q)
      .populate('user', 'firstName lastName email username')
      .populate('assignedMentor', 'firstName lastName email username')
      .populate('assignedSupervisor', 'firstName lastName email username')
      .sort({ createdAt: -1 });

    res.json({ ok:true, rows: apps });
  } catch (err) {
    console.error('career listAdmin failed:', err);
    res.status(500).json({ ok:false, message:'Server error' });
  }
}

async function list(req, res) {
  try {
    if (!req.user)
      return res.status(401).json({ ok: false, message: "Unauthorized" });

    const myId = req.user._id;
    const target = String(req.query.target || '').toLowerCase().trim(); // ← НОВОЕ
    const wantMine     = String(req.query.mine || "") === "1";
    const wantAssigned = String(req.query.assigned || "") === "1";

    // Роли пользователя (на случай дефолтного поведения без query)
    const me = await User.findById(myId).select("roles").lean();
    const rolesLc = (me?.roles || []).map(r => String(r).toLowerCase());
    const iAmMentor     = rolesLc.some(r => r.includes('mentor') || r.includes('ментор'));
    const iAmSupervisor = rolesLc.some(r => r.includes('supervisor') || r.includes('супервізор') || r.includes('супервизор'));

    // Построим фильтр
    let filter;

    if (wantMine) {
      // мои поданные заявки
      filter = { user: myId };
    } else if (wantAssigned) {
      // заявки, назначенные на меня — учитываем целевой тип
      if (target === 'supervisor') {
        filter = { $or: [{ assignedSupervisor: myId }, { assignedSupervisorId: myId }] };
      } else if (target === 'mentor') {
        filter = { $or: [{ assignedMentor: myId }, { assignedMentorId: myId }] };
      } else {
        // если target не указан, покажем оба назначения, но только мои
        filter = {
          $or: [
            { assignedMentor: myId },     { assignedMentorId: myId },
            { assignedSupervisor: myId }, { assignedSupervisorId: myId }
          ]
        };
      }
    } else {
      // поведение по умолчанию, когда ?mine / ?assigned не заданы:
      if (target === 'supervisor') {
        filter = { $or: [{ assignedSupervisor: myId }, { assignedSupervisorId: myId }] };
      } else if (target === 'mentor') {
        filter = { $or: [{ assignedMentor: myId }, { assignedMentorId: myId }] };
      } else {
        // если target не задан:
        // - ментору показываем назначенные на него как ментора
        // - супервізору — как супервізора
        // - иначе — свои заявки
        if (iAmMentor || iAmSupervisor) {
          const or = [];
          if (iAmMentor)     or.push({ assignedMentor: myId },     { assignedMentorId: myId });
          if (iAmSupervisor) or.push({ assignedSupervisor: myId }, { assignedSupervisorId: myId });
          filter = or.length ? { $or: or } : { user: myId };
        } else {
          filter = { user: myId };
        }
      }
    }

    const apps = await CareerApplication.find(filter)
      .populate("user", "firstName lastName email username")
      .populate("assignedMentor", "firstName lastName email username")
      .populate("assignedSupervisor", "firstName lastName email username")
      .sort({ createdAt: -1 });

    res.json({ ok: true, rows: apps });
  } catch (err) {
    console.error("career list failed:", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
}

// POST /api/career-applications
async function create(req, res) {
  try {
    const b = req.body || {};

    // нормализуем адресата
    const rawTarget = String(b.target || '').toLowerCase().trim();
    const target = rawTarget.startsWith('sup') ? 'supervisor'
                 : rawTarget.startsWith('men') ? 'mentor'
                 : null;

    if (!target) {
      return res.status(400).json({ ok:false, message: 'Вкажіть адресата: mentor або supervisor' });
    }

    const userId = req.user?._id || req.user?.id || null;

    const app = await CareerApplication.create({
      user: userId,
      username: req.user?.username,
      fullName: b.fullName,
      email: b.email,
      target,
      experience: b.experience,
      ageGroup: b.ageGroup,
      requestText: b.requestText,
      aboutText: b.aboutText,
    });

    const populated = await CareerApplication.findById(app._id)
      .populate('user', 'firstName lastName email username')
      .lean();

    return res.status(201).json({ ok:true, application: populated });
  } catch (e) {
    console.error('[career create] failed:', e);
    return res.status(500).json({ ok:false, message:'Server error' });
  }
}

// PUT /api/career-applications/:id/assign
// Унифицированный assign: { mentorId } или { supervisorId }
async function assign(req, res) {
  try {
    const appId = req.params.id;
    const { mentorId, supervisorId } = req.body || {};

    if (!mongoose.isValidObjectId(appId)) {
      return res.status(400).json({ ok:false, message:'Invalid application id' });
    }
    if (!mentorId && !supervisorId) {
      return res.status(400).json({ ok:false, message:'Expected mentorId or supervisorId' });
    }

    const app = await CareerApplication.findById(appId);
    if (!app) return res.status(404).json({ ok:false, message:'Application not found' });

    if (mentorId) {
      if (!mongoose.isValidObjectId(mentorId)) return res.status(400).json({ ok:false, message:'Invalid mentor id' });
      const mentor = await User.findById(mentorId).select('roles');
      const ok = Array.isArray(mentor?.roles) &&
        mentor.roles.map(r=>String(r).toLowerCase()).some(r=>r.includes('mentor')||r.includes('ментор'));
      if (!ok) return res.status(400).json({ ok:false, message:'User is not a mentor' });
      app.assignedMentor = mentorId;
    }

    if (supervisorId) {
      if (!mongoose.isValidObjectId(supervisorId)) return res.status(400).json({ ok:false, message:'Invalid supervisor id' });
      const sup = await User.findById(supervisorId).select('roles');
      const ok = Array.isArray(sup?.roles) &&
        sup.roles.map(r=>String(r).toLowerCase()).some(r=>r.includes('supervisor')||r.includes('супервізор')||r.includes('супервизор'));
      if (!ok) return res.status(400).json({ ok:false, message:'User is not a supervisor' });
      app.assignedSupervisor = supervisorId;
    }

    await app.save();

    const populated = await CareerApplication.findById(appId)
      .populate('user','firstName lastName email username photoUrl')
      .populate('assignedMentor','firstName lastName email username')
      .populate('assignedSupervisor','firstName lastName email username');

    return res.json({ ok:true, application: populated });
  } catch (e) {
    console.error('[assign] failed:', e);
    return res.status(500).json({ ok:false, message: e?.message || 'Server error' });
  }
}

module.exports = {
  list,
  listAdmin,
  create,
  assign,        
  getOneAdmin,
  getOne,
};