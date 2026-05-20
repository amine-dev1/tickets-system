import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { companyScope, requireAdmin } from '../middleware/companyScope';

const router = Router();

router.use(requireAuth);
router.use(companyScope);
router.use(requireAdmin);

const createCompanySchema = z.object({
  body: z.object({
    name: z.string().min(2),
    contact_email: z.string().email().optional().or(z.literal('')),
    contact_phone: z.string().optional().or(z.literal('')),
    address: z.string().optional().or(z.literal('')),
  }),
});

const updateCompanySchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    contact_email: z.string().email().optional().or(z.literal('')),
    contact_phone: z.string().optional().or(z.literal('')),
    address: z.string().optional().or(z.literal('')),
    is_active: z.boolean().optional(),
  }),
});

const createUserSchema = z.object({
  body: z.object({
    email: z.string().email(),
    full_name: z.string().min(2),
  }),
});

// GET /api/companies
router.get('/', async (req, res): Promise<void> => {
  try {
    const { search, is_active } = req.query;
    let query = supabaseAdmin
      .from('companies')
      .select('*, profiles(count), tickets(count), prestataires(count)')
      .order('created_at', { ascending: false });

    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
    }

    const { data: companies, error } = await query;

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    
    // Map counts
    const mapped = companies.map((c: any) => ({
      ...c,
      user_count: c.profiles?.[0]?.count || 0,
      ticket_count: c.tickets?.[0]?.count || 0,
      prestataire_count: c.prestataires?.[0]?.count || 0,
      profiles: undefined,
      tickets: undefined,
      prestataires: undefined
    }));
    
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/companies/:id
router.get('/:id', async (req, res): Promise<void> => {
  try {
    const { data: company, error } = await supabaseAdmin
      .from('companies')
      .select('*, profiles(count), tickets(count), prestataires(count)')
      .eq('id', req.params.id)
      .single();

    if (error || !company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }
    
    const mapped = {
      ...company,
      user_count: company.profiles?.[0]?.count || 0,
      ticket_count: company.tickets?.[0]?.count || 0,
      prestataire_count: company.prestataires?.[0]?.count || 0,
      profiles: undefined,
      tickets: undefined,
      prestataires: undefined
    };

    res.json(mapped);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/companies
router.post('/', validate(createCompanySchema), async (req, res): Promise<void> => {
  try {
    const { name, contact_email, contact_phone, address } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now().toString().slice(-4);

    const { data: company, error } = await supabaseAdmin
      .from('companies')
      .insert({ name, slug, contact_email, contact_phone, address })
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.status(201).json(company);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/companies/:id
router.patch('/:id', validate(updateCompanySchema), async (req, res): Promise<void> => {
  try {
    const { data: company, error } = await supabaseAdmin
      .from('companies')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json(company);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/companies/:id
router.delete('/:id', async (req, res): Promise<void> => {
  try {
    const { error } = await supabaseAdmin
      .from('companies')
      .update({ is_active: false })
      .eq('id', req.params.id);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/companies/:id/users
router.get('/:id/users', async (req, res): Promise<void> => {
  try {
    const { data: users, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('company_id', req.params.id);
      
    if (error) throw error;
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/companies/:id/users
router.post('/:id/users', validate(createUserSchema), async (req, res): Promise<void> => {
  try {
    const { email, full_name } = req.body;
    
    // Check if company exists
    const { data: company, error: cErr } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('id', req.params.id)
      .single();
      
    if (cErr || !company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    // Since this is mock/demo, we just create the profile in profiles table.
    // In real supabase, we would use supabaseAdmin.auth.admin.createUser
    const id = 'u_' + Date.now();
    const { data: user, error } = await supabaseAdmin
      .from('profiles')
      .insert({
        id,
        email,
        full_name,
        role: 'client',
        company_id: req.params.id
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// DELETE /api/companies/:id/users/:userId
router.delete('/:id/users/:userId', async (req, res): Promise<void> => {
  try {
    const { error } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('company_id', req.params.id)
      .eq('id', req.params.userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
