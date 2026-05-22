import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAuth } from '../middleware/auth';
import { supabaseAdmin, isMock } from '../lib/supabase';

const router = Router();

// ─── Mock mode: save files to local disk ─────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, '../../uploads');

const mockStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname).toLowerCase());
  },
});

const ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm',
];

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_MIME.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Type de fichier non supporté: ${file.mimetype}`));
  }
};

const upload = multer({
  storage: isMock ? mockStorage : multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter,
});

router.use(requireAuth);

/**
 * POST /api/upload
 * Upload a file (image / PDF / video).
 * Returns { url: string, type: 'image' | 'video' | 'pdf' }
 */
router.post('/', upload.single('file'), async (req, res): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Aucun fichier fourni.' });
      return;
    }

    const mime = req.file.mimetype;
    const fileType: 'image' | 'video' | 'pdf' =
      mime === 'application/pdf'
        ? 'pdf'
        : mime.startsWith('video/')
        ? 'video'
        : 'image';

    // ── Mock mode ─────────────────────────────────────────────────────────────
    if (isMock) {
      const filename = (req.file as any).filename as string;
      const baseUrl = process.env.BASE_URL || 'http://localhost:4000';
      const url = `${baseUrl}/uploads/${filename}`;
      res.json({ url, type: fileType });
      return;
    }

    // ── Real Supabase Storage ─────────────────────────────────────────────────
    const buffer = (req.file as any).buffer as Buffer;
    const ext = path.extname(req.file.originalname).toLowerCase();
    const storagePath = `tickets/${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

    const { error: uploadError } = await (supabaseAdmin as any).storage
      .from('ticket-attachments')
      .upload(storagePath, buffer, {
        contentType: mime,
        upsert: false,
      });

    if (uploadError) {
      res.status(500).json({ error: uploadError.message });
      return;
    }

    const { data } = (supabaseAdmin as any).storage
      .from('ticket-attachments')
      .getPublicUrl(storagePath);

    res.json({ url: data.publicUrl, type: fileType });
  } catch (err: any) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message || 'Erreur lors du téléchargement.' });
  }
});

export default router;
