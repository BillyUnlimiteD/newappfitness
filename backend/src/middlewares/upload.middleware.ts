import multer from 'multer';
import path from 'path';
import fs from 'fs';

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Whitelist estricta: extensión Y mime type deben coincidir
const ALLOWED_EXTENSIONS = new Set(['.mp4', '.mov', '.avi', '.mkv', '.webm']);
const ALLOWED_MIMES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/webm',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, _file, cb) => {
    // Nombre aleatorio — nunca usar el nombre original del cliente
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}.video`);
  },
});

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const extOk = ALLOWED_EXTENSIONS.has(ext);
  const mimeOk = ALLOWED_MIMES.has(file.mimetype);

  // Ambas condiciones deben cumplirse (AND, no OR)
  if (extOk && mimeOk) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se aceptan videos: mp4, mov, avi, mkv, webm.'));
  }
};

export const uploadVideo = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB máx (reducido desde 200 MB)
    files: 1,                   // Un solo archivo por request
  },
});
