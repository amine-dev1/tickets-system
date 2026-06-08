import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';
import { companyScope, isEnterpriseAdmin } from '../middleware/companyScope';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import os from 'os';

const router = Router();

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'video/mp4', 'video/webm', 'video/quicktime',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv',
];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, os.tmpdir()),
  filename: (_req, file, cb) => {
    const uniqueName = `${crypto.randomUUID()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
  },
});

router.use(requireAuth);
router.use(companyScope);

// GET /api/tickets/:ticketId/attachments
router.get('/tickets/:ticketId/attachments', async (req, res): Promise<void> => {
  try {
    const { ticketId } = req.params;

    let query = supabaseAdmin
      .from('ticket_attachments')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (req.userRole !== 'superadmin') {
      query = query.eq('company_id', req.companyId);
    }

    const { data, error } = await query;
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/tickets/:ticketId/attachments
router.post(
  '/tickets/:ticketId/attachments',
  upload.array('files', 10),
  async (req, res): Promise<void> => {
    try {
      const { ticketId } = req.params;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        res.status(400).json({ error: 'No files provided' });
        return;
      }

      // Verify ticket exists and get company_id
      const { data: ticket, error: ticketErr } = await supabaseAdmin
        .from('tickets')
        .select('company_id')
        .eq('id', ticketId)
        .single();

      if (ticketErr || !ticket) {
        res.status(404).json({ error: 'Ticket not found' });
        return;
      }
      if (req.userRole !== 'superadmin' && ticket.company_id !== req.companyId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const newAttachments = [];
      for (const file of files) {
        const storagePath = `tickets/${ticketId}/${file.filename}`;
        const fileBuffer = fs.readFileSync(file.path);

        const { error: uploadErr } = await supabaseAdmin.storage
          .from('attachments')
          .upload(storagePath, fileBuffer, {
            contentType: file.mimetype,
          });

        fs.unlinkSync(file.path);

        if (uploadErr) {
          console.error('Storage upload error:', uploadErr);
          res.status(500).json({ error: `Failed to upload ${file.originalname}: ${uploadErr.message}` });
          return;
        }

        const { data: urlData } = supabaseAdmin.storage
          .from('attachments')
          .getPublicUrl(storagePath);

        const { data: attachment, error: insertErr } = await supabaseAdmin
          .from('ticket_attachments')
          .insert({
            ticket_id: ticketId,
            company_id: ticket.company_id,
            uploaded_by: req.user!.id,
            file_name: file.originalname,
            file_url: urlData.publicUrl,
            file_size: file.size,
            mime_type: file.mimetype,
          })
          .select('*')
          .single();

        if (insertErr) {
          console.error('DB insert error:', insertErr);
          res.status(500).json({ error: `Failed to save attachment record: ${insertErr.message}` });
          return;
        }

        newAttachments.push(attachment);
      }

      res.status(201).json(newAttachments);
    } catch (error: any) {
      if (error.message?.includes('File type')) {
        res.status(400).json({ error: error.message });
        return;
      }
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE /api/attachments/:id
router.delete('/attachments/:id', async (req, res): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: attachment, error: fetchErr } = await supabaseAdmin
      .from('ticket_attachments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !attachment) {
      res.status(404).json({ error: 'Attachment not found' });
      return;
    }

    // Superadmin can delete anything; enterprise admin can delete within their company; otherwise only uploader
    if (attachment.uploaded_by !== req.user!.id && !isEnterpriseAdmin(req.userRole)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Enterprise admin: verify attachment belongs to their company
    if (req.userRole === 'admin' && attachment.company_id !== req.companyId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const storagePath = `tickets/${attachment.ticket_id}/${attachment.file_url.split('/').pop()}`;
    await supabaseAdmin.storage.from('attachments').remove([storagePath]);

    const { error } = await supabaseAdmin
      .from('ticket_attachments')
      .delete()
      .eq('id', id);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
