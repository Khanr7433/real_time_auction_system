import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';

const uploadsDir = path.join(import.meta.dirname, '../../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    cb(null, `auction-${uniqueSuffix}${ext}`);
  },
});

const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    const err = new Error('Unsupported file type. Only JPEG, PNG, and WebP images are allowed.');
    err.status = 400;
    cb(err, false);
  }
};

export const uploadAuctionImages = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
    files: 5,
  },
}).array('images', 5);

export function handleUploadErrors(err, _req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Image file too large. Maximum size is 5 MB per image.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Maximum is 5 images per auction.' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err && err.status === 400) {
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(500).json({ error: 'File upload failed' });
  }
  next();
}

