// controllers/careerController.js
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
 * - mentor: если назначен на заявку
 * - applicant: если сам подал (опционально — можно отключить этот пункт)
 */
async function canViewApplication(req, app) {
  if (await isAdminUser(req)) return true;

  const myId = String(req.user?._id || req.user?.id || "");
  const myRoles = req.user?.roles || [];
  const isMentor = hasMentorRole(myRoles);

  // ментор: только своя заявка
  if (isMentor) {
    const assignedId = String(
      app.assignedMentor?._id ||
        app.assignedMentor ||
        app.assignedMentorId ||
        ""
    );
    if (assignedId && assignedId === myId) return true;
  }

  // заявитель видит свою заявку (если нужно — оставь; если нет, удали этот блок)
  if (String(app.user?._id || app.user) === myId) return true;

  return false;
}

// ==== handlers

// был только админский — оставим как есть (для чисто админских роутов)
async function getOneAdmin(req, res) {
  try {
    if (!(await isAdminUser(req))) {
      return res
        .status(403)
        .json({ ok: false, message: "Forbidden: admin only" });
    }
    const app = await CareerApplication.findById(req.params.id)
      .populate("user", "firstName lastName middleName email username photoUrl")
      .populate("assignedMentor", "firstName lastName email username");
    if (!app) return res.status(404).json({ ok: false, message: "Not found" });
    res.json({ ok: true, application: app });
  } catch (e) {
    console.error("getOneAdmin failed:", e);
    res.status(500).json({ ok: false, message: "Server error" });
  }
}

// НОВЫЙ: для админа, ментора (своё), та/або заявника (своё)
async function getOne(req, res) {
  try {
    const app = await CareerApplication.findById(req.params.id)
      .populate("user", "firstName lastName middleName email username photoUrl")
      .populate("assignedMentor", "firstName lastName email username");

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

async function list(req, res) {
  try {
    if (!req.user)
      return res.status(401).json({ ok: false, message: "Unauthorized" });

    const me = await User.findById(req.user._id).select("roles").lean();
    const isMentor =
      Array.isArray(me?.roles) &&
      me.roles.some(
        (r) =>
          String(r).toLowerCase().includes("mentor") ||
          String(r).toLowerCase().includes("ментор")
      );

    // у заявки поле должно быть либо ObjectId в assignedMentor, либо assignedMentorId
    const myId = req.user._id;
    const filter = isMentor
      ? { $or: [{ assignedMentor: myId }, { assignedMentorId: myId }] }
      : { user: myId };

    const apps = await CareerApplication.find(filter)
      .populate("user", "firstName lastName email username")
      .populate("assignedMentor", "firstName lastName email username")
      .sort({ createdAt: -1 });

    res.json({ ok: true, rows: apps });
  } catch (err) {
    console.error("career list failed:", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
}

async function create(req, res) {
  /* без изменений */
}
async function assignMentor(req, res) {
  try {
    const appId = req.params.id;
    const { mentorId } = req.body || {};

    if (!mongoose.isValidObjectId(appId)) {
      return res.status(400).json({ ok: false, message: 'Invalid application id' });
    }
    if (!mongoose.isValidObjectId(mentorId)) {
      return res.status(400).json({ ok: false, message: 'Invalid mentor id' });
    }

    // проверим, что пользователь существует и он ментор
    const mentor = await User.findById(mentorId).select('roles firstName lastName email');
    if (!mentor) {
      return res.status(404).json({ ok: false, message: 'Mentor not found' });
    }
    const isMentor = Array.isArray(mentor.roles) &&
      mentor.roles.map(r => String(r).toLowerCase())
            .some(r => r.includes('mentor') || r.includes('ментор'));
    if (!isMentor) {
      return res.status(400).json({ ok: false, message: 'User is not a mentor' });
    }

    const app = await CareerApplication.findByIdAndUpdate(
      appId,
      { $set: { assignedMentor: mentor._id } }, // или assignedMentorId, если такое поле у тебя
      { new: true }
    )
      .populate('user', 'firstName lastName email username photoUrl')
      .populate('assignedMentor', 'firstName lastName email username');

    if (!app) {
      return res.status(404).json({ ok: false, message: 'Application not found' });
    }

    return res.json({ ok: true, application: app });
  } catch (e) {
    console.error('[assignMentor] failed:', e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
}

module.exports = {
  list,
  listAdmin,
  create,
  assignMentor,
  getOneAdmin,
  getOne, // <-- экспортируем новый
};
