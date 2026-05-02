import multer from 'multer';
import { UploadService } from '../../../application/UploadService.js';
import { sendCreated } from '../../../shared/response.js';
import { asyncHandler } from '../../../shared/asyncHandler.js';
import { ValidationError } from '../../../domain/errors/AppError.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new ValidationError('Only image files allowed'));
    cb(null, true);
  },
});

const uploadService = new UploadService();

export const UploadController = {
  uploadMiddleware: upload.single('image'),

  uploadImage: asyncHandler(async (req, res) => {
    if (!req.file) throw new ValidationError('No image provided');
    const result = await uploadService.uploadImage(req.file.buffer);
    sendCreated(res, result);
  }),
};
