import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Ensure the local uploads directories exist
const rootDir = path.resolve();
const UPLOAD_PATHS = {
  properties: path.join(rootDir, 'public', 'uploads', 'properties'),
  blogs: path.join(rootDir, 'public', 'uploads', 'blogs'),
  brochures: path.join(rootDir, 'public', 'uploads', 'brochures'),
  resumes: path.join(rootDir, 'public', 'uploads', 'resumes'),
};

// Create dirs synchronously on module load
Object.values(UPLOAD_PATHS).forEach((dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Configure dynamic storage target based on folder type
const createStorage = (folderType) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, UPLOAD_PATHS[folderType]);
    },
    filename: (req, file, cb) => {
      let ext = path.extname(file.originalname || '').toLowerCase();
      if (!ext) {
        if (file.mimetype === 'application/pdf') ext = '.pdf';
        else if (file.mimetype === 'image/png') ext = '.png';
        else if (file.mimetype === 'image/webp') ext = '.webp';
        else ext = '.jpg';
      }
      cb(null, `${uuidv4()}${ext}`);
    },
  });
};

// Flexible media filter for properties & blogs (images + PDFs).
// SVG is intentionally excluded — it can carry inline <script>/event-handler
// payloads and this server serves /uploads statically, which would make an
// uploaded SVG a stored-XSS vector. A missing extension or a generic
// "application/octet-stream" MIME is no longer waved through automatically;
// the file must match a real allowed extension AND a plausible MIME type.
const ALLOWED_IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.heic'];
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/heic', 'image/heif'];

const mediaFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();

  const isAllowedImage = ALLOWED_IMAGE_EXTS.includes(ext) && ALLOWED_IMAGE_MIMES.includes(mime);
  const isAllowedPdf = ext === '.pdf' && mime === 'application/pdf';

  if (isAllowedImage || isAllowedPdf) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file format for ${file.originalname}. Allowed: Images (JPG, PNG, WEBP, GIF, AVIF, HEIC) and PDFs.`));
  }
};

const pdfFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();

  if (ext === '.pdf' && mime === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Invalid document format. Only PDF files are allowed.'));
  }
};

// Multer middleware configurations
export const uploadProperties = multer({
  storage: createStorage('properties'),
  fileFilter: mediaFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

export const uploadBlogs = multer({
  storage: createStorage('blogs'),
  fileFilter: mediaFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

export const uploadBrochures = multer({
  storage: createStorage('brochures'),
  fileFilter: pdfFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

export const uploadResumes = multer({
  storage: createStorage('resumes'),
  fileFilter: pdfFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});
