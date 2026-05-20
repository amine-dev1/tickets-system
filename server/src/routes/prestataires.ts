import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { companyScope } from '../middleware/companyScope';

const router = Router();

// Zod schemas
const createPrestataire = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    contact_email: z.string().email().optional().or(z.literal('')),
    contact_phone: z.string().optional().or(z.literal('')),
    address: z.string().optional().or(z.literal('')),
    notes: z.string().optional().or(z.literal('')),
    is_active: z.boolean().default(true),
    company_id: z.string().uuid().optional(),
  }),
});

const updatePrestataire = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    contact_email: z.string().email().optional().or(z.literal('')),
    contact_phone: z.string().optional().or(z.literal('')),
    address: z.string().optional().or(z.literal('')),
    notes: z.string().optional().or(z.literal('')),
    is_active: z.boolean().optional(),
  }),
});

router.use(requireAuth);
router.use(companyScope);
// Accessible to both 'admin' and 'client'

// GET /api/prestataires - List all prestataires
router.get('/', async (req, res): Promise<void> => {
  try {
    const { search, is_active, company_id } = req.query;

    let query = supabaseAdmin
      .from('prestataires')
      .select('*')
      .order('name', { ascending: true });

    if (req.userRole === 'admin') {
      if (company_id && company_id !== 'all') {
        query = query.eq('company_id', company_id as string);
      }
    } else {
      query = query.eq('company_id', req.companyId);
    }

    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
    }

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data: prestataires, error } = await query;

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json(prestataires);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/prestataires/:id - Get a single prestataire
router.get('/:id', async (req, res): Promise<void> => {
  try {
    const { id } = req.params;

    let query = supabaseAdmin
      .from('prestataires')
      .select('*')
      .eq('id', id);

    if (req.userRole !== 'admin') {
      query = query.eq('company_id', req.companyId);
    }

    const { data: prestataire, error } = await query.single();

    if (error || !prestataire) {
      res.status(404).json({ error: 'Prestataire not found' });
      return;
    }

    // Also get ticket count
    const { data: tickets } = await supabaseAdmin
      .from('tickets')
      .select('id')
      .eq('prestataire_id', id);

    res.json({ ...prestataire, ticket_count: tickets ? tickets.length : 0 });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/prestataires - Create a prestataire
router.post('/', validate(createPrestataire), async (req, res): Promise<void> => {
  try {
    const company_id = req.userRole === 'admin' ? req.body.company_id : req.companyId;

    if (!company_id) {
       res.status(400).json({ error: 'Company ID required' });
       return;
    }

    const { data: prestataire, error } = await supabaseAdmin
      .from('prestataires')
      .insert({ ...req.body, company_id })
      .select()
      .single();

    if (error || !prestataire) {
      res.status(500).json({ error: error?.message || 'Failed to create prestataire' });
      return;
    }

    res.status(201).json(prestataire);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/prestataires/:id - Update a prestataire
router.patch('/:id', validate(updatePrestataire), async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    let query = supabaseAdmin
      .from('prestataires')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (req.userRole !== 'admin') {
      query = query.eq('company_id', req.companyId);
    }

    const { data: prestataire, error } = await query.select().single();

    if (error || !prestataire) {
      res.status(404).json({ error: 'Prestataire not found or update failed' });
      return;
    }

    res.json(prestataire);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/prestataires/:id - Soft delete (deactivate) a prestataire
router.delete('/:id', async (req, res): Promise<void> => {
  try {
    const { id } = req.params;

    // Check for existing tickets
    const { data: tickets } = await supabaseAdmin
      .from('tickets')
      .select('id')
      .eq('prestataire_id', id);

    if (tickets && tickets.length > 0) {
      res
        .status(400)
        .json({
          error:
            'Cannot delete a prestataire that has associated tickets. Please deactivate them instead.',
        });
      return;
    }

    let query = supabaseAdmin
      .from('prestataires')
      .update({ is_active: false })
      .eq('id', id);

    if (req.userRole !== 'admin') {
      query = query.eq('company_id', req.companyId);
    }

    const { error } = await query;

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ message: 'Prestataire deactivated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
