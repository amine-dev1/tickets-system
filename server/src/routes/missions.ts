import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { companyScope } from '../middleware/companyScope';

const router = Router();

const createMission = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional().or(z.literal('')),
    prestataire_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Invalid UUID'),
    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).default('pending'),
    start_date: z.string().optional().or(z.literal('')),
    end_date: z.string().optional().or(z.literal('')),
    budget: z.number().nonnegative().nullable().optional(),
    company_id: z.string().optional(),
  }),
});

const updateMission = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional().or(z.literal('')),
    prestataire_id: z.string().uuid().optional(),
    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
    start_date: z.string().optional().or(z.literal('')),
    end_date: z.string().optional().or(z.literal('')),
    budget: z.number().nonnegative().nullable().optional(),
  }),
});

router.use(requireAuth);
router.use(companyScope);

// GET /api/missions
router.get('/', async (req, res): Promise<void> => {
  try {
    const { search, status, prestataire_id, company_id } = req.query;

    let query = supabaseAdmin
      .from('missions')
      .select('*')
      .order('created_at', { ascending: false });

    if (req.userRole === 'admin') {
      if (company_id && company_id !== 'all') {
        query = query.eq('company_id', company_id as string);
      }
    } else {
      query = query.eq('company_id', req.companyId);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status as string);
    }

    if (prestataire_id && prestataire_id !== 'all') {
      query = query.eq('prestataire_id', prestataire_id as string);
    }

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data: missions, error } = await query;

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json(missions);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/missions/:id
router.get('/:id', async (req, res): Promise<void> => {
  try {
    const { id } = req.params;

    let query = supabaseAdmin
      .from('missions')
      .select('*')
      .eq('id', id);

    if (req.userRole !== 'admin') {
      query = query.eq('company_id', req.companyId);
    }

    const { data: mission, error } = await query.single();

    if (error || !mission) {
      res.status(404).json({ error: 'Mission not found' });
      return;
    }

    res.json(mission);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/missions
router.post('/', validate(createMission), async (req, res): Promise<void> => {
  try {
    const company_id = req.userRole === 'admin' ? req.body.company_id : req.companyId;

    if (!company_id) {
      res.status(400).json({ error: 'Company ID required' });
      return;
    }

    // Verify prestataire belongs to same company (for non-admin)
    const { data: prest } = await supabaseAdmin
      .from('prestataires')
      .select('*')
      .eq('id', req.body.prestataire_id)
      .single();

    if (!prest) {
      res.status(400).json({ error: 'Prestataire not found' });
      return;
    }

    if (req.userRole !== 'admin' && prest.company_id !== company_id) {
      res.status(403).json({ error: 'Prestataire does not belong to your company' });
      return;
    }

    const payload = { ...req.body, company_id };
    if (payload.start_date === '') payload.start_date = null;
    if (payload.end_date === '') payload.end_date = null;
    if (payload.description === '') payload.description = null;

    const { data: mission, error } = await supabaseAdmin
      .from('missions')
      .insert(payload)
      .select()
      .single();

    if (error || !mission) {
      res.status(500).json({ error: error?.message || 'Failed to create mission' });
      return;
    }

    res.status(201).json(mission);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/missions/:id
router.patch('/:id', validate(updateMission), async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    if (updates.start_date === '') updates.start_date = null;
    if (updates.end_date === '') updates.end_date = null;
    if (updates.description === '') updates.description = null;

    let query = supabaseAdmin
      .from('missions')
      .update(updates)
      .eq('id', id);

    if (req.userRole !== 'admin') {
      query = query.eq('company_id', req.companyId);
    }

    const { data: mission, error } = await query.select().single();

    if (error || !mission) {
      res.status(404).json({ error: 'Mission not found or update failed' });
      return;
    }

    res.json(mission);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/missions/:id
router.delete('/:id', async (req, res): Promise<void> => {
  try {
    const { id } = req.params;

    let query = supabaseAdmin
      .from('missions')
      .delete()
      .eq('id', id);

    if (req.userRole !== 'admin') {
      query = query.eq('company_id', req.companyId);
    }

    const { error } = await query;

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ message: 'Mission deleted successfully' });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
