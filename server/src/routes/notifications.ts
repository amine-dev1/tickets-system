import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// GET /api/notifications?unread=true&limit=20
router.get('/', async (req, res): Promise<void> => {
  try {
    const { unread, limit = '30' } = req.query;

    let query = supabaseAdmin
      .from('notifications')
      .select('*, actor:actor_id (id, full_name, avatar_url, role)')
      .eq('recipient_id', req.user!.id)
      .order('created_at', { ascending: false })
      .limit(Number(limit));

    if (unread === 'true') {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json(data ?? []);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Internal server error' });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', async (req, res): Promise<void> => {
  try {
    const { count, error } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', req.user!.id)
      .eq('is_read', false);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ count: count ?? 0 });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Internal server error' });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res): Promise<void> => {
  try {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', req.params.id)
      .eq('recipient_id', req.user!.id);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Internal server error' });
  }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', async (req, res): Promise<void> => {
  try {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', req.user!.id)
      .eq('is_read', false);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Internal server error' });
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', async (req, res): Promise<void> => {
  try {
    const { error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('id', req.params.id)
      .eq('recipient_id', req.user!.id);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Internal server error' });
  }
});

// DELETE /api/notifications — clear all
router.delete('/', async (req, res): Promise<void> => {
  try {
    const { error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('recipient_id', req.user!.id);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Internal server error' });
  }
});

export default router;
