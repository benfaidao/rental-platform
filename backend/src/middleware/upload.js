const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const sharp = require('sharp');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const agencyId = req.params.agencyId || 'general';
    const dir = path.join(uploadDir, agencyId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|pdf|webp/;
  const ok = allowed.test(path.extname(file.originalname).toLowerCase()) &&
    allowed.test(file.mimetype);
  cb(ok ? null : new Error('Type de fichier non autorisé'), ok);
};

const IMAGE_MIME_TYPES = /jpeg|jpg|png|webp|gif/;
const SIZE_LIMIT = 1 * 1024 * 1024; // 1 MB

async function compressIfNeeded(filePath, mimetype) {
  const stat = fs.statSync(filePath);
  if (stat.size <= SIZE_LIMIT || !IMAGE_MIME_TYPES.test(mimetype)) return;

  const ext = path.extname(filePath).toLowerCase();
  const tmpPath = filePath + '.tmp';

  let pipeline = sharp(filePath).resize({ width: 2000, withoutEnlargement: true });
  if (ext === '.png') {
    pipeline = pipeline.png({ compressionLevel: 9 });
  } else if (ext === '.webp') {
    pipeline = pipeline.webp({ quality: 80 });
  } else {
    pipeline = pipeline.jpeg({ quality: 80 });
  }

  await pipeline.toFile(tmpPath);
  fs.renameSync(tmpPath, filePath);
}

// Middleware to compress images > 1 MB after multer saves them
async function compressUploads(req, res, next) {
  const files = req.files
    ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat())
    : req.file
    ? [req.file]
    : [];

  try {
    await Promise.all(files.map((f) => compressIfNeeded(f.path, f.mimetype)));
    next();
  } catch (err) {
    next(err);
  }
}

const upload = multer({ storage, fileFilter, limits: { fileSize: 20 * 1024 * 1024 } });

module.exports = upload;
module.exports.compressUploads = compressUploads;
