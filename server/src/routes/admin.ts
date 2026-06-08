import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';
import { companyScope, requireEnterpriseAdmin } from '../middleware/companyScope';
import { emailService } from '../services/emailService';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import fs from 'fs';

const LOGO_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const logoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, os.tmpdir()),
    filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (_req, file, cb) => {
    if (LOGO_MIME.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Format invalide. PNG, JPG, WEBP ou SVG uniquement.'));
  },
});

const router = Router();

router.use(requireAuth);
router.use(companyScope);
router.use(requireEnterpriseAdmin);

// GET /api/admin/stats
// Superadmin: global stats (or filtered by company_id query)
// Enterprise admin: scoped to their company
router.get('/stats', async (req, res): Promise<void> => {
  try {
    const { company_id } = req.query;
    const isSuper = req.userRole === 'superadmin';

    // Effective company filter: superadmin uses query param; admin is forced to their own company
    const filterCompanyId = isSuper
      ? company_id && company_id !== 'all'
        ? (company_id as string)
        : null
      : req.companyId;

    // Tickets
    let ticketsQuery = supabaseAdmin
      .from('tickets')
      .select('status, priority, company_id');
    if (filterCompanyId) {
      ticketsQuery = ticketsQuery.eq('company_id', filterCompanyId);
    }
    const { data: tickets, error: ticketErr } = await ticketsQuery;
    if (ticketErr) throw ticketErr;

    // Companies count — only meaningful for superadmin
    let companiesCount = 1;
    if (isSuper) {
      const { count, error } = await supabaseAdmin
        .from('companies')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      companiesCount = count || 0;
    }

    // Users count
    let usersQuery = supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    if (filterCompanyId) {
      usersQuery = usersQuery.eq('company_id', filterCompanyId);
    }
    const { count: usersCount, error: userErr } = await usersQuery;
    if (userErr) throw userErr;

    res.json({
      total: tickets ? tickets.length : 0,
      open: tickets ? tickets.filter((t: any) => t.status === 'open').length : 0,
      in_progress: tickets ? tickets.filter((t: any) => t.status === 'in_progress').length : 0,
      resolved: tickets ? tickets.filter((t: any) => t.status === 'resolved').length : 0,
      closed: tickets ? tickets.filter((t: any) => t.status === 'closed').length : 0,
      urgent: tickets ? tickets.filter((t: any) => t.priority === 'urgent').length : 0,
      companies_count: companiesCount,
      users_count: usersCount || 0,
    });
  } catch (error: any) {
    console.error('Stats Error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// GET /api/admin/tickets — paginated ticket list (scoped)
router.get('/tickets', async (req, res): Promise<void> => {
  try {
    const { search, status, priority, page = '1', limit = '20' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const isSuper = req.userRole === 'superadmin';

    // Count query
    let countQuery = supabaseAdmin
      .from('tickets')
      .select('*', { count: 'exact', head: true });
    if (!isSuper) countQuery = countQuery.eq('company_id', req.companyId);
    if (status && status !== 'all') countQuery = countQuery.eq('status', status as string);
    if (priority && priority !== 'all') countQuery = countQuery.eq('priority', priority as string);
    if (search) countQuery = countQuery.ilike('title', `%${search}%`);

    const { count } = await countQuery;

    // Data query
    let query = supabaseAdmin
      .from('tickets')
      .select('*, created_by_profile:created_by (full_name, email)')
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (!isSuper) query = query.eq('company_id', req.companyId);
    if (status && status !== 'all') query = query.eq('status', status as string);
    if (priority && priority !== 'all') query = query.eq('priority', priority as string);
    if (search) query = query.ilike('title', `%${search}%`);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ tickets: data, total: count ?? 0 });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// GET /api/admin/users — paginated user list (scoped)
router.get('/users', async (req, res): Promise<void> => {
  try {
    const { search, page = '1', limit = '20' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const isSuper = req.userRole === 'superadmin';

    // Count
    let countQuery = supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    if (!isSuper) countQuery = countQuery.eq('company_id', req.companyId);
    if (search) countQuery = countQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    const { count } = await countQuery;

    // Data — join company name
    let query = supabaseAdmin
      .from('profiles')
      .select('*, company:company_id (id, name)')
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (!isSuper) query = query.eq('company_id', req.companyId);
    if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ users: data, total: count ?? 0 });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// POST /api/admin/users — create a new user (enterprise admin: admin/agent in own company)
router.post('/users', async (req, res): Promise<void> => {
  try {
    const { full_name, email, password, role, company_id, sendWelcomeEmail = true } = req.body;
    const isSuper = req.userRole === 'superadmin';

    if (!email || !password || !role) {
      res.status(400).json({ error: 'email, password et role sont requis' });
      return;
    }

    // Enterprise admin can only create admin/agent in their own company
    if (!isSuper) {
      if (!['admin', 'agent'].includes(role)) {
        res.status(403).json({ error: 'Rôle non autorisé' });
        return;
      }
    }

    const effectiveCompanyId = isSuper ? (company_id || null) : req.companyId;

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (authError) throw authError;

    // Upsert profile with role and company
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ full_name, role, company_id: effectiveCompanyId })
      .eq('id', authData.user.id)
      .select('*, company:company_id (id, name)')
      .single();
    if (profileError) throw profileError;

    if (sendWelcomeEmail) {
      emailService.sendWelcomeWithCredentials(email, full_name || email, password, role).catch(console.error);
    }

    res.status(201).json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// PUT /api/admin/users/:id — update role / company
router.put('/users/:id', async (req, res): Promise<void> => {
  try {
    const { role, company_id } = req.body;
    const isSuper = req.userRole === 'superadmin';

    // Enterprise admin restrictions
    if (!isSuper) {
      // Can only assign admin or agent roles within their company
      if (!['admin', 'agent'].includes(role)) {
        res.status(403).json({ error: 'Cannot assign this role' });
        return;
      }
      // Can only modify users in their own company
      const { data: target } = await supabaseAdmin
        .from('profiles')
        .select('company_id')
        .eq('id', req.params.id)
        .single();
      if (target?.company_id !== req.companyId) {
        res.status(403).json({ error: 'Cannot modify users from other companies' });
        return;
      }
    }

    const updateData: any = {};
    if (role) updateData.role = role;
    if (company_id !== undefined) updateData.company_id = company_id || null;

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', req.params.id)
      .select('*, company:company_id (id, name)')
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// POST /api/admin/users/:id/reset-password — generate & set a new password
router.post('/users/:id/reset-password', async (req, res): Promise<void> => {
  try {
    const isSuper = req.userRole === 'superadmin';

    const { data: target } = await supabaseAdmin
      .from('profiles')
      .select('company_id, email, full_name')
      .eq('id', req.params.id)
      .single();

    if (!isSuper && target?.company_id !== req.companyId) {
      res.status(403).json({ error: 'Cannot reset password for users from other companies' });
      return;
    }

    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghjkmnpqrstuvwxyz';
    const digits = '23456789';
    const special = '!@#$%&*';
    const all = upper + lower + digits + special;
    const rand = (str: string) => str[Math.floor(Math.random() * str.length)];
    const pwd = [rand(upper), rand(lower), rand(digits), rand(special),
      ...Array.from({ length: 8 }, () => rand(all))
    ].sort(() => Math.random() - 0.5).join('');

    const { error } = await supabaseAdmin.auth.admin.updateUserById(req.params.id, { password: pwd });
    if (error) throw error;

    // Notify user by email (fire-and-forget)
    if (target?.email) {
      emailService.sendPasswordReset(target.email, target.full_name || target.email, pwd).catch(console.error);
    }

    res.json({ password: pwd });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res): Promise<void> => {
  try {
    const isSuper = req.userRole === 'superadmin';

    if (!isSuper) {
      // Enterprise admin can only delete within their company
      const { data: target } = await supabaseAdmin
        .from('profiles')
        .select('company_id')
        .eq('id', req.params.id)
        .single();
      if (target?.company_id !== req.companyId) {
        res.status(403).json({ error: 'Cannot delete users from other companies' });
        return;
      }
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// GET /api/admin/company — enterprise admin: view their own company
router.get('/company', async (req, res): Promise<void> => {
  try {
    const companyId = req.userRole === 'superadmin' ? req.query.id as string : req.companyId;
    if (!companyId) { res.status(400).json({ error: 'Aucune entreprise associée à ce compte.' }); return; }

    const { data, error } = await supabaseAdmin
      .from('companies')
      .select('id, name, contact_email, contact_phone, address, logo_url, is_active, slug, created_at, updated_at')
      .eq('id', companyId)
      .single();

    if (error) throw error;
    if (!data) { res.status(404).json({ error: 'Entreprise introuvable.' }); return; }
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// PUT /api/admin/company — enterprise admin: update their own company (no is_active toggle)
router.put('/company', async (req, res): Promise<void> => {
  try {
    if (req.userRole === 'superadmin') { res.status(403).json({ error: 'Utilisez la gestion des entreprises pour les super-admins.' }); return; }
    if (!req.companyId) { res.status(400).json({ error: 'Aucune entreprise associée à ce compte.' }); return; }

    const { name, contact_email, contact_phone, address, logo_url } = req.body;
    if (!name || name.trim().length < 2) { res.status(400).json({ error: 'Le nom de l\'entreprise doit contenir au moins 2 caractères.' }); return; }

    const { data, error } = await supabaseAdmin
      .from('companies')
      .update({
        name: name.trim(),
        contact_email: contact_email || null,
        contact_phone: contact_phone || null,
        address: address || null,
        logo_url: logo_url || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.companyId)
      .select('id, name, contact_email, contact_phone, address, logo_url, is_active, slug, created_at, updated_at')
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// POST /api/admin/company/logo — upload company logo
router.post('/company/logo', logoUpload.single('logo'), async (req, res): Promise<void> => {
  try {
    if (req.userRole === 'superadmin') { res.status(403).json({ error: 'Endpoint réservé aux admins d\'entreprise.' }); return; }
    if (!req.companyId) { res.status(400).json({ error: 'Aucune entreprise associée à ce compte.' }); return; }
    if (!req.file) { res.status(400).json({ error: 'Aucun fichier fourni.' }); return; }

    const ext = path.extname(req.file.originalname).toLowerCase() || '.png';
    const storagePath = `company-logos/${req.companyId}${ext}`;
    const fileBuffer = fs.readFileSync(req.file.path);

    const { error: uploadErr } = await supabaseAdmin.storage
      .from('attachments')
      .upload(storagePath, fileBuffer, { contentType: req.file.mimetype, upsert: true });

    try { fs.unlinkSync(req.file.path); } catch {}

    if (uploadErr) throw uploadErr;

    const { data: urlData } = supabaseAdmin.storage.from('attachments').getPublicUrl(storagePath);
    // Cache buster so the browser picks up the new image after re-upload
    const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

    const { data, error } = await supabaseAdmin
      .from('companies')
      .update({ logo_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', req.companyId)
      .select('id, name, slug, logo_url')
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    if (err.message?.includes('Format invalide')) { res.status(400).json({ error: err.message }); return; }
    if (err.code === 'LIMIT_FILE_SIZE') { res.status(400).json({ error: 'Le fichier dépasse 2 Mo.' }); return; }
    res.status(500).json({ error: err.message || 'Échec du téléversement du logo.' });
  }
});

// DELETE /api/admin/company/logo — remove company logo
router.delete('/company/logo', async (req, res): Promise<void> => {
  try {
    if (req.userRole === 'superadmin') { res.status(403).json({ error: 'Endpoint réservé aux admins d\'entreprise.' }); return; }
    if (!req.companyId) { res.status(400).json({ error: 'Aucune entreprise associée à ce compte.' }); return; }

    // Best-effort: remove all stored variants
    const prefix = `company-logos/${req.companyId}`;
    const variants = ['.png', '.jpg', '.jpeg', '.webp', '.svg'].map(ext => `${prefix}${ext}`);
    await supabaseAdmin.storage.from('attachments').remove(variants);

    const { data, error } = await supabaseAdmin
      .from('companies')
      .update({ logo_url: null, updated_at: new Date().toISOString() })
      .eq('id', req.companyId)
      .select('id, name, slug, logo_url')
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Échec de la suppression du logo.' });
  }
});

export default router;
