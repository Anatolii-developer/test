// backend/controllers/libraryController.js
const path = require("path");
const fs = require("fs");
const Library = require("../models/Library");

// допоміжне
function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}
function arr(val) {
  if (val == null) return [];
  return Array.isArray(val) ? val : [val];
}
const ALLOWED_EXT = /\.(pdf|doc|docx|ppt|pptx)$/i;

// POST /api/library  (файл прийде в req.file, відео — в body.videoLink)
exports.create = async (req, res) => {
  try {
    const { type, title, description, destination, courseId, role } = req.body;


    const folder = (req.body.folder || "").trim();

    if (!type || !["video", "book"].includes(type)) {
      return res.status(400).json({ message: "type must be 'video' or 'book'" });
    }
    if (!destination || !["general", "addons", "courses"].includes(destination)) {
      return res.status(400).json({ message: "Invalid destination" });
    }
    if (destination === "courses" && !courseId) {
      return res.status(400).json({ message: "courseId is required for destination=courses" });
    }

    // зберемо базові поля
    const base = {
      type, title, description, destination,
  courseId: courseId || null,
  role: role || null,
  folder,        
    };

    const created = [];

    if (type === "video") {
      const videoLink = (req.body.videoLink || "").trim();
      if (!videoLink) return res.status(400).json({ message: "videoLink is required" });

      // addons може прийти з багатьма ролями
      const roleIds = arr(req.body["roleIds[]"]);
      const rolesArr = arr(req.body["roles[]"]); // імена ролей (якщо є)

      if (destination === "addons" && roleIds.length) {
        for (let i = 0; i < roleIds.length; i++) {
          const doc = new Library({ ...base, videoLink, role: rolesArr[i] || roleIds[i] });
          await doc.save();
          created.push(doc);
        }
      } else {
        const doc = new Library({ ...base, videoLink, role: role || null });
        await doc.save();
        created.push(doc);
      }

      return res.json({ ok: true, items: created });
    }

    // type === 'book'
    // файл поклав multer у req.file
    if (!req.file) return res.status(400).json({ message: "File is required" });

    const original = req.file.originalname || "";
    const mime = req.file.mimetype || "";
    if (!ALLOWED_EXT.test(original)) {
      return res.status(400).json({ message: "Allowed: PDF/DOC/DOCX/PPT/PPTX" });
    }

    // пересунемо файл у публічну папку /public/uploads/books
    const uploadsRoot = path.join(__dirname, "..", "public", "uploads", "books");
    ensureDir(uploadsRoot);
    const safeName = Date.now() + "-" + original.replace(/\s+/g, "_");
    const target = path.join(uploadsRoot, safeName);

    fs.renameSync(req.file.path, target);

    const filePath = `/uploads/books/${safeName}`;

    if (destination === "addons") {
      const roleIds = arr(req.body["roleIds[]"]);
      const rolesArr = arr(req.body["roles[]"]);

      if (roleIds.length) {
        for (let i = 0; i < roleIds.length; i++) {
          const doc = new Library({ ...base, filePath, mime, role: rolesArr[i] || roleIds[i] });
          await doc.save();
          created.push(doc);
        }
      } else {
        const doc = new Library({ ...base, filePath, mime, role: role || null });
        await doc.save();
        created.push(doc);
      }
    } else {
      const doc = new Library({ ...base, filePath, mime });
      await doc.save();
      created.push(doc);
    }

    res.json({ ok: true, items: created });
  } catch (e) {
    console.error("create library item error:", e);
    res.status(500).json({ message: "Server error", error: e.message });
  }
};


// GET /api/library/folders?destination=&courseId=&role=
exports.folders = async (req, res) => {
  try {
    const { destination, courseId, role } = req.query;
    const q = {};
    if (destination) q.destination = destination;
    if (courseId) q.courseId = courseId;
    if (role) q.role = role;

    const names = await Library.distinct("folder", q);
    const list = names.filter(Boolean).sort((a,b)=>a.localeCompare(b));
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: "Server error", error: e.message });
  }
};
// GET /api/library?destination=&courseId=&role=
exports.list = async (req, res) => {
  try {
    const { destination, courseId, role } = req.query;
    const q = {};
    if (destination) q.destination = destination;
    if (courseId) q.courseId = courseId;
    if (role) q.role = role;

    const items = await Library.find(q).sort({ createdAt: -1 });
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: "Server error", error: e.message });
  }
};

// DELETE /api/library/:id (опційно)
exports.remove = async (req, res) => {
  try {
    const doc = await Library.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    // можна видаляти файл з диску, якщо type==='book'
    if (doc.type === "book" && doc.filePath) {
      const p = path.join(__dirname, "..", "public", doc.filePath);
      fs.existsSync(p) && fs.unlinkSync(p);
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: "Server error", error: e.message });
  }
};