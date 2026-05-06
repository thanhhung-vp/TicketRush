import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import cloudinary from '../config/cloudinary.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import pool from '../config/db.js';

const router = Router();

const EVENT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const AVATAR_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function imageFileFilter(req, file, cb) {
  const extension = path.extname(file.originalname || '').toLowerCase();
  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype) || !ALLOWED_IMAGE_EXTENSIONS.has(extension)) {
    return cb(new Error('Only JPEG, PNG, WebP, or GIF images are allowed'));
  }
  cb(null, true);
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: EVENT_IMAGE_MAX_BYTES },
  fileFilter: imageFileFilter,
});

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AVATAR_IMAGE_MAX_BYTES },
  fileFilter: imageFileFilter,
});

/**
 * POST /upload/image
 * Admin-only: upload event poster to Cloudinary.
 * Returns { url, public_id }
 */
router.post('/image', authenticate, requireAdmin, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image provided' });

  try {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'ticketrush/events', resource_type: 'image' },
        (err, result) => (err ? reject(err) : resolve(result))
      );
      stream.end(req.file.buffer);
    });
    res.json({ url: result.secure_url, public_id: result.public_id });
  } catch (err) {
    console.error('Cloudinary upload error:', err);
    res.status(500).json({ error: 'Image upload failed' });
  }
});

/**
 * POST /upload/avatar
 * Authenticated users can upload a profile avatar.
 * The client compresses large images before sending; Cloudinary also stores
 * a normalized square avatar to keep delivery lightweight.
 */
router.post('/avatar', authenticate, avatarUpload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image provided' });

  try {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'ticketrush/avatars',
          public_id: req.user.id,
          overwrite: true,
          resource_type: 'image',
          transformation: [
            {
              width: 512,
              height: 512,
              crop: 'fill',
              gravity: 'face',
              quality: 'auto:good',
              fetch_format: 'auto',
            },
          ],
        },
        (err, result) => (err ? reject(err) : resolve(result))
      );
      stream.end(req.file.buffer);
    });

    const { rows } = await pool.query(
      `UPDATE users SET avatar_url = $2
       WHERE id = $1
       RETURNING id, email, full_name, gender, birth_year, role, avatar_url, created_at`,
      [req.user.id, result.secure_url]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });

    res.json({ user: rows[0], avatar_url: result.secure_url, public_id: result.public_id });
  } catch (err) {
    console.error('Avatar upload error:', err);
    res.status(500).json({ error: 'Avatar upload failed' });
  }
});

// Multer error handler
router.use((err, req, res, next) => {
  const messageText = err.message || '';
  if (err instanceof multer.MulterError || messageText.includes('images are allowed')) {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'Image file is too large'
      : messageText;
    return res.status(400).json({ error: message });
  }
  next(err);
});

export default router;
