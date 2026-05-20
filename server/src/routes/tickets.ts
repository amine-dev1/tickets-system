import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { companyScope, requireAdmin } from '../middleware/companyScope';
import { emailService } from '../services/emailService';

const router = Router();

const createTicketSchema = z.object({
  body: z.object({
    title: z.string().min(5).max(120),
    description: z.string().min(20),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    category: z.enum(['bug', 'feature_request', 'billing', 'support', 'other']).default('support'),
    prestataire_id: z.string().uuid(),
    assigned_to: z.string().uuid().optional(),
    company_id: z.string().uuid().optional(), // For admin override
  }),
});

const updateTicketSchema = z.object({
  body: z.object({
    status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    category: z.enum(['bug', 'feature_request', 'billing', 'support', 'other']).optional(),
    assigned_to: z.string().uuid().optional().nullable(),
  }),
});

router.use(requireAuth);
router.use(companyScope);

// GET /api/tickets
router.get('/', async (req, res): Promise<void> => {
  try {
    const { status, priority, search, prestataire_id, assigned_to, unassigned, company_id } = req.query;
    
    let query = supabaseAdmin
      .from('tickets')
      .select('*, created_by_profile:created_by (full_name, email, avatar_url), prestataire:prestataire_id (id, name, contact_email), assigned_to_profile:assigned_to (id, full_name, email, avatar_url)')
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
    if (priority && priority !== 'all') {
      query = query.eq('priority', priority as string);
    }
    if (prestataire_id && prestataire_id !== 'all') {
      query = query.eq('prestataire_id', prestataire_id as string);
    }
    if (unassigned === 'true') {
      query = query.is('assigned_to', null);
    } else if (assigned_to && assigned_to !== 'all') {
      query = query.eq('assigned_to', assigned_to as string);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: tickets, error } = await query;
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/tickets/:id
router.get('/:id', async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    let query = supabaseAdmin
      .from('tickets')
      .select('*, created_by_profile:created_by (full_name, email, avatar_url), prestataire:prestataire_id (*), assigned_to_profile:assigned_to (id, full_name, email, avatar_url)')
      .eq('id', id);

    if (req.userRole !== 'admin') {
       query = query.eq('company_id', req.companyId);
    }

    const { data: ticket, error } = await query.single();

    if (error || !ticket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/tickets
router.post('/', validate(createTicketSchema), async (req, res): Promise<void> => {
  try {
    const { title, description, priority, category, prestataire_id, assigned_to } = req.body;
    
    let targetCompanyId = req.companyId;
    if (req.userRole === 'admin') {
       targetCompanyId = req.body.company_id;
       if (!targetCompanyId) {
         res.status(400).json({ error: 'Company ID required for admin creating tickets' });
         return;
       }
    }

    // Insert ticket
    const { data: ticket, error } = await supabaseAdmin
      .from('tickets')
      .insert({
        title,
        description,
        priority,
        category,
        prestataire_id,
        assigned_to,
        created_by: req.user!.id,
        company_id: targetCompanyId,
        status: 'open',
      })
      .select('*, created_by_profile:created_by (full_name, email), prestataire:prestataire_id (name)')
      .single();

    if (error || !ticket) {
      res.status(500).json({ error: error?.message || 'Failed to create ticket' });
      return;
    }

    // Email notification
    const creatorName = ticket.created_by_profile?.full_name || 'User';
    await emailService.notifyNewTicket(creatorName, ticket.id, ticket.title);

    res.status(201).json(ticket);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/tickets/:id
router.patch('/:id', validate(updateTicketSchema), async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, priority, category, assigned_to } = req.body;

    // Retrieve current ticket
    let fetchQuery = supabaseAdmin
      .from('tickets')
      .select('*, prestataire:prestataire_id (contact_email, name)')
      .eq('id', id);

    if (req.userRole !== 'admin') {
      fetchQuery = fetchQuery.eq('company_id', req.companyId);
    }

    const { data: currentTicket, error: fetchErr } = await fetchQuery.single();

    if (fetchErr || !currentTicket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    const updateData: any = { updated_at: new Date().toISOString() };
    if (status) {
      updateData.status = status;
      if (status === 'resolved' || status === 'closed') {
        updateData.resolved_at = new Date().toISOString();
      } else {
        updateData.resolved_at = null;
      }
    }
    if (priority) updateData.priority = priority;
    if (category) updateData.category = category;
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to;

    const { data: ticket, error } = await supabaseAdmin
      .from('tickets')
      .update(updateData)
      .eq('id', id)
      .select('*, prestataire:prestataire_id (contact_email, name)')
      .single();

    if (error || !ticket) {
      res.status(500).json({ error: error?.message || 'Failed to update ticket' });
      return;
    }

    // History Log
    const auditLogs = [];
    if (status && status !== currentTicket.status) {
      auditLogs.push({ ticket_id: id, company_id: currentTicket.company_id, changed_by: req.user!.id, field: 'status', old_value: currentTicket.status, new_value: status });
      // Notify status change
      if (currentTicket.prestataire?.contact_email) {
          await emailService.notifyStatusChanged(currentTicket.prestataire.contact_email, id as string, ticket.title, status as string);
      }
    }
    if (priority && priority !== currentTicket.priority) {
      auditLogs.push({ ticket_id: id, company_id: currentTicket.company_id, changed_by: req.user!.id, field: 'priority', old_value: currentTicket.priority, new_value: priority });
    }
    if (category && category !== currentTicket.category) {
      auditLogs.push({ ticket_id: id, company_id: currentTicket.company_id, changed_by: req.user!.id, field: 'category', old_value: currentTicket.category, new_value: category });
    }
    if (assigned_to !== undefined && assigned_to !== currentTicket.assigned_to) {
      auditLogs.push({ ticket_id: id, company_id: currentTicket.company_id, changed_by: req.user!.id, field: 'assigned_to', old_value: currentTicket.assigned_to, new_value: assigned_to });
    }

    if (auditLogs.length > 0) {
      await supabaseAdmin.from('ticket_history').insert(auditLogs);
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/tickets/:id - Admin deletes ticket
router.delete('/:id', requireAdmin, async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    let query = supabaseAdmin.from('tickets').delete().eq('id', id);

    const { error } = await query;
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
