import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';

const UPLOADS_DIR = path.resolve(import.meta.dirname, '../../uploads');

/**
 * Escapes regex metacharacters and bounds query length to prevent ReDoS/500 errors.
 */
export function escapeRegex(value, maxLength = 100) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validates MongoDB ObjectId strings.
 */
export function isValidObjectId(id) {
  return typeof id === 'string' && mongoose.isValidObjectId(id);
}

/**
 * Validates user avatar URLs (empty, http(s)://, or /uploads/ path).
 */
export function isValidAvatarUrl(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed === '') return true;
  if (trimmed.length > 500) return false;
  return /^(https?:\/\/|\/uploads\/)/i.test(trimmed);
}

/**
 * Masks bidder display names consistently across REST and WebSocket feeds.
 */
export function maskDisplayName(displayName) {
  const name = typeof displayName === 'string' && displayName.trim() ? displayName.trim() : 'Bidder';
  return name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : `${name[0] || 'B'}*`;
}

/**
 * Checks JPEG, PNG, or WebP magic bytes on an uploaded file.
 */
export function hasValidImageMagicBytes(filePath) {
  let fd;
  try {
    fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(12);
    const bytesRead = fs.readSync(fd, buf, 0, 12, 0);
    if (bytesRead < 4) return false;

    const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    const isPng =
      bytesRead >= 8 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47 &&
      buf[4] === 0x0d &&
      buf[5] === 0x0a &&
      buf[6] === 0x1a &&
      buf[7] === 0x0a;
    const isWebp =
      bytesRead >= 12 &&
      buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buf.subarray(8, 12).toString('ascii') === 'WEBP';

    return isJpeg || isPng || isWebp;
  } catch {
    return false;
  } finally {
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch {
        // Ignore close error
      }
    }
  }
}

/**
 * Removes uploaded multer temporary files from disk safely.
 */
export function cleanupUploadedFiles(files) {
  if (!Array.isArray(files)) return;
  for (const file of files) {
    if (file?.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch {
        // Ignore cleanup failure
      }
    }
  }
}

/**
 * Removes persisted /uploads/* image paths from server/uploads safely.
 */
export function cleanupStoredImages(images) {
  if (!Array.isArray(images)) return;
  for (const imgUrl of images) {
    if (typeof imgUrl !== 'string' || !imgUrl.startsWith('/uploads/')) continue;
    try {
      const filename = path.basename(imgUrl);
      const filepath = path.join(UPLOADS_DIR, filename);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
    } catch {
      // Ignore cleanup failure
    }
  }
}
