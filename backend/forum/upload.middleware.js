// backend/forum/upload.middleware.js
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^\w.-]+/g,'_');
    cb(null, `${Date.now()}_${base}${ext}`);
  }
});

// простая фильтрация типов
const ALLOWED = [
  'image/jpeg','image/png','image/gif','image/webp',
  'video/mp4','video/webm','video/quicktime',
  'application/pdf','application/zip','text/plain',
];
function fileFilter(_req, file, cb) {
  if (ALLOWED.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Unsupported file type'), false);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024, files: 10 } // 25MB, до 10 файлов
});

module.exports = { upload, UPLOAD_DIR };