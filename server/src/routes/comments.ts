import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { companyScope } from '../middleware/companyScope';
import { emailService } from '../services/emailService';

const router = Router();

const createCommentSchema = z.object({
  body: z.object({
    content: z.string().min(1),
    is_internal: z.boolean().default(false),
  }),
});

router.use(requireAuth);
router.use(companyScope);

// GET /api/tickets/:ticketId/comments
router.get('/tickets/:ticketId/comments', async (req, res): Promise<void> => {
  try {
    const { ticketId } = req.params;

    // Check if ticket exists and verify company access
    const { data: ticket, error: ticketErr } = await supabaseAdmin
      .from('tickets')
      .select('created_by, company_id')
      .eq('id', ticketId)
      .single();

    if (ticketErr || !ticket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    // Security: Only users in the same company or admins can fetch comments
    if (req.userRole !== 'admin' && ticket.company_id !== req.companyId) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    // Build comment query
    let query = supabaseAdmin
      .from('ticket_comments')
      .select('*, profiles:author_id (full_name, email, role, avatar_url)')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    // Client can't see internal notes
    if (req.userRole !== 'admin') {
      query = query.eq('is_internal', false);
    }

    const { data: comments, error } = await query;
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/tickets/:ticketId/comments
router.post('/tickets/:ticketId/comments', validate(createCommentSchema), async (req, res): Promise<void> => {
  try {
    const { ticketId } = req.params;
    const { content, is_internal } = req.body;

    const { data: ticket, error: ticketErr } = await supabaseAdmin
      .from('tickets')
      .select('*, profiles:created_by (email, full_name)')
      .eq('id', ticketId)
      .single();

    if (ticketErr || !ticket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    // Verify access
    if (req.userRole !== 'admin' && ticket.company_id !== req.companyId) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    // Insert comment
    const { data: comment, error } = await supabaseAdmin
      .from('ticket_comments')
      .insert({
        ticket_id: ticketId,
        company_id: ticket.company_id,
        author_id: req.user!.id,
        content,
        is_internal: req.userRole === 'admin' ? is_internal : false,
      })
      .select('*, profiles:author_id (full_name, email, role)')
      .single();

    if (error || !comment) {
      res.status(500).json({ error: error?.message || 'Failed to create comment' });
      return;
    }

    // Notify other party (if not internal note)
    if (!comment.is_internal) {
      const authorName = comment.profiles?.full_name || 'Support Staff';
      if (req.userRole === 'admin') {
        // Notify client
        await emailService.notifyNewComment(ticket.profiles?.email as string, ticketId as string, ticket.title, authorName, content, false);
      } else {
        // Notify admin
        await emailService.notifyNewComment('admin@example.com', ticketId as string, ticket.title, authorName, content, true);
      }
    }

    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/comments/:id
router.delete('/comments/:id', async (req, res): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: comment, error: fetchErr } = await supabaseAdmin
      .from('ticket_comments')
      .select('author_id')
      .eq('id', id)
      .single();

    if (fetchErr || !comment) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }

    // Security check: Only author or admin can delete comment
    if (req.userRole !== 'admin' && comment.author_id !== req.user!.id) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    const { error } = await supabaseAdmin.from('ticket_comments').delete().eq('id', id);
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
