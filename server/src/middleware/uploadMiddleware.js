import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Upload destination directory: configurable via UPLOAD_DIR (e.g. for persistent mount volumes)
export const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(__dirname, '../../uploads/resumes');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// 5MB file size limit in bytes
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5,242,880 bytes

// Allowed extensions and MIME types
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'application/octet-stream', // Some browsers send octet-stream for docx/pdf
];

// Secure disk storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Generate unguessable, secure stored filename
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.includes(ext) ? ext : '.pdf';
    const uniqueId = crypto.randomUUID();
    const storedFileName = `resume-${uniqueId}-${Date.now()}${safeExt}`;
    cb(null, storedFileName);
  },
});

// File filter validation
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    const err = new Error(
      `Unsupported file type '${ext || 'unknown'}'. Only PDF (.pdf), Word (.docx), and plain text (.txt) files are supported.`
    );
    err.code = 'UNSUPPORTED_FILE_TYPE';
    err.statusCode = 400;
    return cb(err, false);
  }

  if (file.mimetype && !ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
    const err = new Error(
      `Invalid MIME type '${file.mimetype}'. Only PDF and DOCX files are allowed.`
    );
    err.code = 'INVALID_MIME_TYPE';
    err.statusCode = 400;
    return cb(err, false);
  }

  cb(null, true);
};

// Base multer instance
const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter,
});

/**
 * Express middleware wrapper with normalized error handling
 */
export const handleResumeUpload = (req, res, next) => {
  const uploadSingle = upload.single('resume');

  uploadSingle(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File size exceeds 5MB limit. Please upload a smaller file.',
            code: 'FILE_TOO_LARGE',
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`,
          code: err.code || 'UPLOAD_ERROR',
        });
      }

      // Custom fileFilter or validation error
      return res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || 'File upload failed validation.',
        code: err.code || 'INVALID_FILE',
      });
    }

    // Check if file was provided
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please select a resume file to upload (PDF, DOCX, or TXT).',
        code: 'FILE_REQUIRED',
      });
    }

    next();
  });
};

export default handleResumeUpload;
