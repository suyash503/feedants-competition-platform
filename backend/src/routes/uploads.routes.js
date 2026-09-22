import crypto from 'node:crypto';
import fs from 'node:fs';
import { Router } from 'express';
import multer from 'multer';
import { env } from '../config/env.js';
import { AppError, badRequest } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimit.js';

/**
 * Development video storage: files land on local disk and are served from /uploads.
 * In production this endpoint would instead hand out a pre-signed S3/GCS upload URL so
 * video bytes never pass through the API servers. The app only needs a URL back either way.
 */
export const UPLOAD_DIR = env.uploadDir;
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_VIDEO_TYPES = {
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
  'video/3gpp': '.3gp',
  'video/x-matroska': '.mkv',
};

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    // Random names: never trust (or expose) the client's file name.
    filename: (req, file, cb) =>
      cb(null, `${req.user.id}-${crypto.randomBytes(8).toString('hex')}${ALLOWED_VIDEO_TYPES[file.mimetype]}`),
  }),
  limits: { fileSize: env.maxUploadMb * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    ALLOWED_VIDEO_TYPES[file.mimetype]
      ? cb(null, true)
      : cb(badRequest('UNSUPPORTED_FILE_TYPE', 'Please upload an MP4, MOV or WebM video')),
});

function receiveVideo(req, res, next) {
  upload.single('video')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError(413, 'FILE_TOO_LARGE', `Video must be ${env.maxUploadMb} MB or smaller`));
      }
      return next(badRequest('UPLOAD_FAILED', err.message));
    }
    return next(err);
  });
}

const publicBase = (req) => env.publicBaseUrl ?? `${req.protocol}://${req.get('host')}`;

export const uploadsRouter = Router();

uploadsRouter.post('/videos', requireAuth, writeLimiter, receiveVideo, (req, res) => {
  if (!req.file) throw badRequest('FILE_REQUIRED', 'Attach a video in the "video" field');
  res.status(201).json({
    url: `${publicBase(req)}/uploads/${req.file.filename}`,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
  });
});
