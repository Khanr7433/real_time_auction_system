import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  escapeRegex,
  isValidObjectId,
  isValidAvatarUrl,
  maskDisplayName,
  hasValidImageMagicBytes,
  cleanupUploadedFiles,
} from '../src/utils/validation.js';

describe('Validation & Upload Helpers', () => {
  test('escapeRegex escapes metacharacters and truncates length', () => {
    assert.equal(escapeRegex('  [test](a+b)*?  '), '\\[test\\]\\(a\\+b\\)\\*\\?');
    assert.equal(escapeRegex('a'.repeat(150)).length, 100);
    assert.equal(escapeRegex(12345), '');
  });

  test('isValidObjectId and isValidAvatarUrl validate inputs', () => {
    assert.equal(isValidObjectId('507f1f77bcf86cd799439011'), true);
    assert.equal(isValidObjectId('bad-id'), false);
    assert.equal(isValidAvatarUrl('https://example.com/a.png'), true);
    assert.equal(isValidAvatarUrl('/uploads/a.png'), true);
    assert.equal(isValidAvatarUrl('javascript:alert(1)'), false);
  });

  test('maskDisplayName masks multi-char and short names', () => {
    assert.equal(maskDisplayName('Alice'), 'A***e');
    assert.equal(maskDisplayName('Jo'), 'J*');
    assert.equal(maskDisplayName(''), 'B***r');
  });

  test('hasValidImageMagicBytes validates JPEG/PNG/WebP headers and cleanupUploadedFiles deletes files', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bidnow-val-'));
    const pngFile = path.join(tmpDir, 'valid.png');
    const badFile = path.join(tmpDir, 'fake.png');

    fs.writeFileSync(pngFile, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]));
    fs.writeFileSync(badFile, Buffer.from('not-an-image'));

    assert.equal(hasValidImageMagicBytes(pngFile), true);
    assert.equal(hasValidImageMagicBytes(badFile), false);

    cleanupUploadedFiles([{ path: pngFile }, { path: badFile }]);
    assert.equal(fs.existsSync(pngFile), false);
    assert.equal(fs.existsSync(badFile), false);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
