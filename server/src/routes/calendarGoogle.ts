/**
 * Google Calendar connection & sync endpoints (mounted at /api/calendar/google).
 *
 * Most routes require an authenticated staff user. The OAuth callback is
 * public because Google calls it directly (no Authorization header); it is
 * instead protected by a signed `state` that carries the user id.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { companyScope, requireStaff } from '../middleware/companyScope';
import {
  isGoogleConfigured,
  getAuthUrl,
  verifyState,
  handleCallback,
  syncUser,
  getStatus,
  setPushTickets,
  setSyncEnabled,
  disconnectUser,
} from '../lib/googleCalendar';

const router = Router();

const staffOnly = [requireAuth, companyScope, requireStaff];

/* ── Connection status ────────────────────────────────────────────── */

router.get('/status', ...staffOnly, async (req, res): Promise<void> => {
  try {
    res.json(await getStatus(req.user!.id));
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Erreur interne.' });
  }
});

/* ── Begin OAuth: return the Google consent URL ───────────────────── */

router.get('/auth-url', ...staffOnly, async (req, res): Promise<void> => {
  try {
    if (!isGoogleConfigured()) {
      res.status(503).json({ error: 'La synchronisation Google n\'est pas configurée sur le serveur.' });
      return;
    }
    res.json({ url: getAuthUrl(req.user!.id) });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Erreur interne.' });
  }
});

/* ── OAuth callback (PUBLIC, validated by signed state) ───────────── */

router.get('/callback', async (req, res): Promise<void> => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const redirect = (status: string) => res.redirect(`${clientUrl}/calendar?google=${status}`);
  try {
    const code = String(req.query.code ?? '');
    const state = String(req.query.state ?? '');
    if (req.query.error) { redirect('denied'); return; }
    if (!code || !state) { redirect('error'); return; }

    const userId = verifyState(state);
    if (!userId) { redirect('invalid_state'); return; }

    await handleCallback(code, userId);
    redirect('connected');
  } catch (err) {
    console.error('Google callback error:', err);
    redirect('error');
  }
});

/* ── Trigger a full two-way sync ──────────────────────────────────── */

router.post('/sync', ...staffOnly, async (req, res): Promise<void> => {
  try {
    const result = await syncUser(req.user!.id, req.companyId ?? null, req.userRole);
    res.json(result);
  } catch (err: any) {
    if (err?.message === 'NOT_CONNECTED') {
      res.status(400).json({ error: 'Compte Google non connecté.' });
      return;
    }
    if (err?.message === 'SYNC_DISABLED') {
      res.status(400).json({ error: 'La synchronisation est désactivée. Activez-la pour synchroniser.' });
      return;
    }
    if (err?.message === 'GOOGLE_NOT_CONFIGURED') {
      res.status(503).json({ error: 'La synchronisation Google n\'est pas configurée sur le serveur.' });
      return;
    }
    console.error('Google sync error:', err);
    res.status(500).json({ error: 'Échec de la synchronisation Google. Reconnectez votre compte si le problème persiste.' });
  }
});

/* ── Settings (toggle ticket push) ────────────────────────────────── */

router.patch('/settings', ...staffOnly, async (req, res): Promise<void> => {
  try {
    if (typeof req.body?.push_tickets === 'boolean') {
      await setPushTickets(req.user!.id, req.body.push_tickets);
    }
    if (typeof req.body?.sync_enabled === 'boolean') {
      await setSyncEnabled(req.user!.id, req.body.sync_enabled);
    }
    res.json(await getStatus(req.user!.id));
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Erreur interne.' });
  }
});

/* ── Disconnect ───────────────────────────────────────────────────── */

router.delete('/disconnect', ...staffOnly, async (req, res): Promise<void> => {
  try {
    await disconnectUser(req.user!.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Erreur interne.' });
  }
});

export default router;
