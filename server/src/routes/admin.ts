import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';
import { companyScope, requireAdmin } from '../middleware/companyScope';

const router = Router();

router.use(requireAuth);
router.use(companyScope);
router.use(requireAdmin);

// GET /api/admin/stats - Global platform stats (all companies, filterable by company_id)
router.get('/stats', async (req, res): Promise<void> => {
  try {
    const { company_id } = req.query;

    // Fetch tickets
    let ticketsQuery = supabaseAdmin
      .from('tickets')
      .select('status, priority, company_id');

    if (company_id && company_id !== 'all') {
      ticketsQuery = ticketsQuery.eq('company_id', company_id as string);
    }
    const { data: tickets, error: ticketErr } = await ticketsQuery;
    if (ticketErr) throw ticketErr;

    // Fetch total companies count
    const { count: companiesCount, error: compErr } = await supabaseAdmin
      .from('companies')
      .select('*', { count: 'exact', head: true });
    if (compErr) throw compErr;

    // Fetch total users count
    let usersQuery = supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    if (company_id && company_id !== 'all') {
      usersQuery = usersQuery.eq('company_id', company_id as string);
    }
    const { count: usersCount, error: userErr } = await usersQuery;
    if (userErr) throw userErr;

    const stats = {
      total: tickets ? tickets.length : 0,
      open: tickets ? tickets.filter((t: any) => t.status === 'open').length : 0,
      in_progress: tickets ? tickets.filter((t: any) => t.status === 'in_progress').length : 0,
      resolved: tickets ? tickets.filter((t: any) => t.status === 'resolved').length : 0,
      closed: tickets ? tickets.filter((t: any) => t.status === 'closed').length : 0,
      urgent: tickets ? tickets.filter((t: any) => t.priority === 'urgent').length : 0,
      companies_count: companiesCount || 0,
      users_count: usersCount || 0,
    };

    res.json(stats);
  } catch (error: any) {
    console.error('Stats Error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
