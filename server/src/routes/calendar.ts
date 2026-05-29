/**
 * Personal calendar for staff (admin / agent / superadmin).
 *  - Each event belongs to a single user.
 *  - Users can only see / mutate their own events.
 *  - /feed merges events + tickets due in the requested window.
 */

import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';
import { companyScope, requireStaff } from '../middleware/companyScope';

const router = Router();

router.use(requireAuth);
router.use(companyScope);
router.use(requireStaff);

/* ── Helpers ───────────────────────────────────────────────────── */

async function loadOwnEvent(id: string, userId: string) {
  const { data } = await supabaseAdmin
    .from('calendar_events')
    .select('*')
    .eq('id', id)
    .single();
  if (!data) return null;
  if (data.user_id !== userId) return null;
  return data;
}

function validatePayload(body: any): { error?: string; data?: any } {
  const title = String(body?.title ?? '').trim();
  const start_at = body?.start_at;
  if (!title) return { error: 'Le titre est requis.' };
  if (title.length > 200) return { error: 'Le titre ne doit pas dépasser 200 caractères.' };
  if (!start_at || isNaN(Date.parse(start_at))) return { error: 'La date de début est invalide.' };
  if (body.end_at && isNaN(Date.parse(body.end_at))) return { error: 'La date de fin est invalide.' };
  if (body.end_at && Date.parse(body.end_at) < Date.parse(start_at)) {
    return { error: 'La date de fin doit être après la date de début.' };
  }
  return {
    data: {
      title,
      description: body.description ? String(body.description).slice(0, 2000) : null,
      start_at: new Date(start_at).toISOString(),
      end_at: body.end_at ? new Date(body.end_at).toISOString() : null,
      all_day: !!body.all_day,
      color: typeof body.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(body.color) ? body.color : '#6366f1',
      related_ticket_id: body.related_ticket_id || null,
    },
  };
}

/* ── Feed (events + tickets in range) ─────────────────────────── */

router.get('/feed', async (req, res): Promise<void> => {
  try {
    const from = String(req.query.from ?? '');
    const to   = String(req.query.to   ?? '');
    if (!from || !to || isNaN(Date.parse(from)) || isNaN(Date.parse(to))) {
      res.status(400).json({ error: 'Paramètres "from" et "to" requis (ISO 8601).' }); return;
    }

    // Own events in range
    const { data: events } = await supabaseAdmin
      .from('calendar_events')
      .select('*, ticket:related_ticket_id (id, title, status, priority)')
      .eq('user_id', req.user!.id)
      .gte('start_at', from)
      .lte('start_at', to)
      .order('start_at', { ascending: true });

    // Tickets created in range (scoped to company unless superadmin)
    let ticketQuery = supabaseAdmin
      .from('tickets')
      .select('id, title, status, priority, created_at, resolved_at, company_id, assigned_to')
      .gte('created_at', from)
      .lte('created_at', to)
      .order('created_at', { ascending: true });

    if (req.userRole !== 'superadmin') ticketQuery = ticketQuery.eq('company_id', req.companyId);
    const { data: tickets } = await ticketQuery;

    res.json({ events: events ?? [], tickets: tickets ?? [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Erreur interne.' });
  }
});

/* ── Events CRUD ──────────────────────────────────────────────── */

router.get('/events', async (req, res): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('calendar_events')
      .select('*, ticket:related_ticket_id (id, title, status, priority)')
      .eq('user_id', req.user!.id)
      .order('start_at', { ascending: true });
    if (error) throw error;
    res.json(data ?? []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/events', async (req, res): Promise<void> => {
  try {
    const v = validatePayload(req.body);
    if (v.error || !v.data) { res.status(400).json({ error: v.error }); return; }

    // If a ticket is linked, verify it's in the user's company
    if (v.data.related_ticket_id) {
      const { data: t } = await supabaseAdmin
        .from('tickets')
        .select('company_id')
        .eq('id', v.data.related_ticket_id)
        .single();
      if (!t) { res.status(404).json({ error: 'Ticket introuvable.' }); return; }
      if (req.userRole !== 'superadmin' && t.company_id !== req.companyId) {
        res.status(403).json({ error: 'Ticket inaccessible.' }); return;
      }
    }

    const { data, error } = await supabaseAdmin
      .from('calendar_events')
      .insert({
        ...v.data,
        user_id: req.user!.id,
        company_id: req.companyId,
      })
      .select('*, ticket:related_ticket_id (id, title, status, priority)')
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/events/:id', async (req, res): Promise<void> => {
  try {
    const existing = await loadOwnEvent(req.params.id, req.user!.id);
    if (!existing) { res.status(404).json({ error: 'Événement introuvable.' }); return; }

    const v = validatePayload(req.body);
    if (v.error || !v.data) { res.status(400).json({ error: v.error }); return; }

    const { data, error } = await supabaseAdmin
      .from('calendar_events')
      .update({ ...v.data, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select('*, ticket:related_ticket_id (id, title, status, priority)')
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/events/:id', async (req, res): Promise<void> => {
  try {
    const existing = await loadOwnEvent(req.params.id, req.user!.id);
    if (!existing) { res.status(404).json({ error: 'Événement introuvable.' }); return; }

    const { error } = await supabaseAdmin.from('calendar_events').delete().eq('id', existing.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
