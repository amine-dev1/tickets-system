/**
 * Internal messaging — secure channels between users of the same company.
 *
 * Two kinds of conversations share the `conversations` table:
 *  - Direct (1:1): is_group = false, scoped by participant_a / participant_b.
 *  - Group:        is_group = true, membership held in `conversation_participants`,
 *                  optionally linked to a ticket or a mission.
 *
 * Security model:
 *  - Every endpoint requires authentication + companyScope.
 *  - Conversations are scoped to a single company_id.
 *  - For any conversation operation the caller must be a participant/member.
 *  - Only staff (admin / agent / superadmin) can create groups and manage members.
 *  - Superadmins do not spy on conversations: they only see their own.
 */

import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { supabaseAdmin } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';
import { companyScope, isStaff } from '../middleware/companyScope';

const router = Router();

router.use(requireAuth);
router.use(companyScope);

/* ── Rate limit message sends ──────────────────────────────────── */

const sendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60, // 60 messages / minute / user
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => req.user?.id ?? ipKeyGenerator(req),
  message: { error: 'Trop de messages envoyés. Veuillez patienter.' },
});

const PROFILE_COLS = 'id, full_name, email, avatar_url, role';

/* ── Helpers ───────────────────────────────────────────────────── */

interface LoadedConversation {
  id: string;
  company_id: string;
  is_group: boolean;
  name: string | null;
  created_by: string | null;
  ticket_id: string | null;
  mission_id: string | null;
  participant_a: string | null;
  participant_b: string | null;
  last_message_at: string | null;
  created_at: string;
  /** Whether the caller owns the group (creator) — only meaningful for groups. */
  isOwner: boolean;
}

/** Returns the conversation if the caller may access it; otherwise null. */
async function loadConversationForUser(
  conversationId: string,
  userId: string,
): Promise<LoadedConversation | null> {
  const { data } = await supabaseAdmin
    .from('conversations')
    .select('id, company_id, is_group, name, created_by, ticket_id, mission_id, participant_a, participant_b, last_message_at, created_at')
    .eq('id', conversationId)
    .single();
  if (!data) return null;

  if (data.is_group) {
    const { data: membership } = await supabaseAdmin
      .from('conversation_participants')
      .select('user_id, is_owner')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .maybeSingle();
    if (!membership) return null;
    return { ...data, isOwner: !!membership.is_owner };
  }

  if (data.participant_a !== userId && data.participant_b !== userId) return null;
  return { ...data, isOwner: false };
}

/** Fetch a map of profileId → profile for the given ids. */
async function fetchProfiles(ids: string[]): Promise<Record<string, any>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return {};
  const { data } = await supabaseAdmin
    .from('profiles')
    .select(PROFILE_COLS)
    .in('id', unique);
  const map: Record<string, any> = {};
  for (const p of data ?? []) map[p.id] = p;
  return map;
}

/* ── Routes ────────────────────────────────────────────────────── */

// GET /api/messages/users — list users in the same company the caller can talk to
router.get('/users', async (req, res): Promise<void> => {
  try {
    if (!req.companyId) { res.json([]); return; }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, role, avatar_url')
      .eq('company_id', req.companyId)
      .neq('id', req.user!.id)
      .order('full_name', { ascending: true });

    if (error) throw error;
    res.json(data ?? []);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Erreur interne.' });
  }
});

// GET /api/messages/linkable — tickets & missions a group can be linked to (staff only)
router.get('/linkable', async (req, res): Promise<void> => {
  try {
    if (!isStaff(req.userRole) || !req.companyId) { res.json({ tickets: [], missions: [] }); return; }

    const [{ data: tickets }, { data: missions }] = await Promise.all([
      supabaseAdmin
        .from('tickets')
        .select('id, title, status')
        .eq('company_id', req.companyId)
        .order('created_at', { ascending: false })
        .limit(200),
      supabaseAdmin
        .from('missions')
        .select('id, name, status')
        .eq('company_id', req.companyId)
        .order('created_at', { ascending: false })
        .limit(200),
    ]);

    res.json({ tickets: tickets ?? [], missions: missions ?? [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Erreur interne.' });
  }
});

// GET /api/messages/unread-count — total unread messages for the caller (direct + groups)
router.get('/unread-count', async (req, res): Promise<void> => {
  try {
    const userId = req.user!.id;
    let total = 0;

    // Direct conversations — unread = messages with read_at null, not sent by me.
    const directIds = await directConversationIds(userId);
    if (directIds.length) {
      const { count } = await supabaseAdmin
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .is('read_at', null)
        .neq('sender_id', userId)
        .in('conversation_id', directIds);
      total += count ?? 0;
    }

    // Group conversations — unread = messages newer than my last_read_at, not mine.
    const { data: memberships } = await supabaseAdmin
      .from('conversation_participants')
      .select('conversation_id, last_read_at')
      .eq('user_id', userId);

    for (const m of memberships ?? []) {
      let q = supabaseAdmin
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', m.conversation_id)
        .neq('sender_id', userId);
      if (m.last_read_at) q = q.gt('created_at', m.last_read_at);
      const { count } = await q;
      total += count ?? 0;
    }

    res.json({ count: total });
  } catch {
    res.json({ count: 0 });
  }
});

async function directConversationIds(userId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('conversations')
    .select('id')
    .eq('is_group', false)
    .or(`participant_a.eq.${userId},participant_b.eq.${userId}`);
  return (data ?? []).map((c: any) => c.id);
}

// GET /api/messages/conversations — list the caller's conversations (direct + groups)
router.get('/conversations', async (req, res): Promise<void> => {
  try {
    const userId = req.user!.id;

    /* 1. Direct conversations */
    const { data: directConvos, error: dErr } = await supabaseAdmin
      .from('conversations')
      .select(`
        id, company_id, is_group, name, created_by, ticket_id, mission_id,
        participant_a, participant_b, last_message_at, created_at,
        a:participant_a (${PROFILE_COLS}),
        b:participant_b (${PROFILE_COLS})
      `)
      .eq('is_group', false)
      .or(`participant_a.eq.${userId},participant_b.eq.${userId}`);
    if (dErr) throw dErr;

    /* 2. Group conversations (via membership) */
    const { data: memberships } = await supabaseAdmin
      .from('conversation_participants')
      .select('conversation_id, last_read_at, is_owner')
      .eq('user_id', userId);

    const groupIds = (memberships ?? []).map((m: any) => m.conversation_id);
    const lastReadByConvo: Record<string, string | null> = {};
    const ownerByConvo: Record<string, boolean> = {};
    for (const m of memberships ?? []) {
      lastReadByConvo[m.conversation_id] = m.last_read_at;
      ownerByConvo[m.conversation_id] = !!m.is_owner;
    }

    let groupConvos: any[] = [];
    let membersByConvo: Record<string, any[]> = {};
    if (groupIds.length) {
      const { data: gConvos } = await supabaseAdmin
        .from('conversations')
        .select('id, company_id, is_group, name, created_by, ticket_id, mission_id, last_message_at, created_at')
        .in('id', groupIds)
        .eq('is_group', true);
      groupConvos = gConvos ?? [];

      // Members of every group
      const { data: allParts } = await supabaseAdmin
        .from('conversation_participants')
        .select('conversation_id, user_id, is_owner')
        .in('conversation_id', groupIds);
      const profileMap = await fetchProfiles((allParts ?? []).map((p: any) => p.user_id));
      for (const p of allParts ?? []) {
        const prof = profileMap[p.user_id];
        if (!prof) continue;
        (membersByConvo[p.conversation_id] ??= []).push({ ...prof, is_owner: p.is_owner });
      }
    }

    const allConvos = [...(directConvos ?? []), ...groupConvos];
    if (allConvos.length === 0) { res.json([]); return; }

    /* 3. Last message + unread per conversation */
    const ids = allConvos.map((c: any) => c.id);
    const { data: msgs } = await supabaseAdmin
      .from('messages')
      .select('id, conversation_id, sender_id, content, created_at, read_at')
      .in('conversation_id', ids)
      .order('created_at', { ascending: false });

    const lastByConvo: Record<string, any> = {};
    const unreadByConvo: Record<string, number> = {};
    for (const m of msgs ?? []) {
      if (!lastByConvo[m.conversation_id]) lastByConvo[m.conversation_id] = m;
      if (m.sender_id === userId) continue;
      const isGroup = groupIds.includes(m.conversation_id);
      const unread = isGroup
        ? (() => { const lr = lastReadByConvo[m.conversation_id]; return !lr || new Date(m.created_at) > new Date(lr); })()
        : m.read_at === null;
      if (unread) unreadByConvo[m.conversation_id] = (unreadByConvo[m.conversation_id] ?? 0) + 1;
    }

    /* 4. Resolve linked ticket / mission labels */
    const ticketIds = allConvos.map((c: any) => c.ticket_id).filter(Boolean);
    const missionIds = allConvos.map((c: any) => c.mission_id).filter(Boolean);
    const ticketMap: Record<string, string> = {};
    const missionMap: Record<string, string> = {};
    if (ticketIds.length) {
      const { data } = await supabaseAdmin.from('tickets').select('id, title').in('id', ticketIds);
      for (const t of data ?? []) ticketMap[t.id] = t.title;
    }
    if (missionIds.length) {
      const { data } = await supabaseAdmin.from('missions').select('id, name').in('id', missionIds);
      for (const m of data ?? []) missionMap[m.id] = m.name;
    }

    const result = allConvos.map((c: any) => {
      const base = {
        id: c.id,
        is_group: c.is_group,
        last_message_at: c.last_message_at,
        created_at: c.created_at,
        last_message: lastByConvo[c.id] ?? null,
        unread_count: unreadByConvo[c.id] ?? 0,
        link: c.ticket_id
          ? { type: 'ticket', id: c.ticket_id, label: ticketMap[c.ticket_id] ?? 'Ticket' }
          : c.mission_id
            ? { type: 'mission', id: c.mission_id, label: missionMap[c.mission_id] ?? 'Mission' }
            : null,
      };
      if (c.is_group) {
        return {
          ...base,
          name: c.name,
          created_by: c.created_by,
          is_owner: ownerByConvo[c.id] ?? false,
          members: membersByConvo[c.id] ?? [],
          other_user: null,
        };
      }
      const otherUser = c.participant_a === userId ? c.b : c.a;
      return { ...base, name: null, other_user: otherUser, members: [] };
    });

    // Newest activity first (fallback to created_at)
    result.sort((a, b) => {
      const ta = new Date(a.last_message_at ?? a.created_at).getTime();
      const tb = new Date(b.last_message_at ?? b.created_at).getTime();
      return tb - ta;
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Erreur interne.' });
  }
});

// POST /api/messages/conversations — open or get a 1:1 conversation with user_id
router.post('/conversations', async (req, res): Promise<void> => {
  try {
    const userId = req.user!.id;
    const otherId: string | undefined = req.body?.user_id;
    if (!otherId) { res.status(400).json({ error: 'user_id requis.' }); return; }
    if (otherId === userId) { res.status(400).json({ error: 'Impossible de démarrer une conversation avec vous-même.' }); return; }

    const { data: other } = await supabaseAdmin
      .from('profiles')
      .select('id, company_id, full_name, email, avatar_url, role')
      .eq('id', otherId)
      .single();
    if (!other) { res.status(404).json({ error: 'Utilisateur introuvable.' }); return; }
    if (!other.company_id || other.company_id !== req.companyId) {
      res.status(403).json({ error: 'Vous ne pouvez discuter qu\'avec les membres de votre entreprise.' });
      return;
    }

    const [a, b] = [userId, otherId].sort();

    const { data: existing } = await supabaseAdmin
      .from('conversations')
      .select('id, company_id, participant_a, participant_b, last_message_at, created_at')
      .eq('company_id', req.companyId)
      .eq('is_group', false)
      .eq('participant_a', a)
      .eq('participant_b', b)
      .maybeSingle();

    if (existing) { res.json({ ...existing, is_group: false, other_user: other }); return; }

    const { data: created, error } = await supabaseAdmin
      .from('conversations')
      .insert({ company_id: req.companyId, participant_a: a, participant_b: b, is_group: false })
      .select('id, company_id, participant_a, participant_b, last_message_at, created_at')
      .single();
    if (error) throw error;

    res.status(201).json({ ...created, is_group: false, other_user: other });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Erreur interne.' });
  }
});

/* ── Groups ────────────────────────────────────────────────────── */

// POST /api/messages/groups — create a group (staff only)
router.post('/groups', async (req, res): Promise<void> => {
  try {
    if (!isStaff(req.userRole)) {
      res.status(403).json({ error: 'Seuls les administrateurs et agents peuvent créer un groupe.' });
      return;
    }
    if (!req.companyId) { res.status(403).json({ error: 'Aucune entreprise associée.' }); return; }

    const name: string = String(req.body?.name ?? '').trim();
    const memberIds: string[] = Array.isArray(req.body?.member_ids) ? req.body.member_ids : [];
    const ticketId: string | null = req.body?.ticket_id || null;
    const missionId: string | null = req.body?.mission_id || null;

    if (!name) { res.status(400).json({ error: 'Le nom du groupe est requis.' }); return; }
    if (name.length > 120) { res.status(400).json({ error: 'Le nom du groupe est trop long.' }); return; }
    if (ticketId && missionId) { res.status(400).json({ error: 'Un groupe ne peut être lié qu\'à un ticket OU une mission.' }); return; }

    // Validate the optional link belongs to the company.
    if (ticketId) {
      const { data: t } = await supabaseAdmin.from('tickets').select('id').eq('id', ticketId).eq('company_id', req.companyId).maybeSingle();
      if (!t) { res.status(400).json({ error: 'Ticket introuvable.' }); return; }
    }
    if (missionId) {
      const { data: m } = await supabaseAdmin.from('missions').select('id').eq('id', missionId).eq('company_id', req.companyId).maybeSingle();
      if (!m) { res.status(400).json({ error: 'Mission introuvable.' }); return; }
    }

    // Validate members belong to the same company.
    const cleanMembers = [...new Set(memberIds.filter(id => id && id !== req.user!.id))];
    if (cleanMembers.length) {
      const { data: validProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('company_id', req.companyId)
        .in('id', cleanMembers);
      const validIds = new Set((validProfiles ?? []).map((p: any) => p.id));
      if (cleanMembers.some(id => !validIds.has(id))) {
        res.status(400).json({ error: 'Certains membres ne font pas partie de votre entreprise.' });
        return;
      }
    }

    const { data: convo, error } = await supabaseAdmin
      .from('conversations')
      .insert({
        company_id: req.companyId,
        is_group: true,
        name,
        created_by: req.user!.id,
        ticket_id: ticketId,
        mission_id: missionId,
        last_message_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (error) throw error;

    const now = new Date().toISOString();
    const rows = [
      { conversation_id: convo.id, user_id: req.user!.id, is_owner: true, last_read_at: now },
      ...cleanMembers.map(id => ({ conversation_id: convo.id, user_id: id, is_owner: false, last_read_at: null })),
    ];
    const { error: pErr } = await supabaseAdmin.from('conversation_participants').insert(rows);
    if (pErr) throw pErr;

    res.status(201).json({ id: convo.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Erreur interne.' });
  }
});

// GET /api/messages/groups/:id/members — list members of a group
router.get('/groups/:id/members', async (req, res): Promise<void> => {
  try {
    const convo = await loadConversationForUser(String(req.params.id), req.user!.id);
    if (!convo || !convo.is_group) { res.status(403).json({ error: 'Groupe introuvable ou accès refusé.' }); return; }

    const { data: parts } = await supabaseAdmin
      .from('conversation_participants')
      .select('user_id, is_owner, joined_at')
      .eq('conversation_id', convo.id);
    const profileMap = await fetchProfiles((parts ?? []).map((p: any) => p.user_id));
    const members = (parts ?? [])
      .map((p: any) => profileMap[p.user_id] ? { ...profileMap[p.user_id], is_owner: p.is_owner, joined_at: p.joined_at } : null)
      .filter(Boolean);

    res.json(members);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Erreur interne.' });
  }
});

// POST /api/messages/groups/:id/members — add a member (staff only)
router.post('/groups/:id/members', async (req, res): Promise<void> => {
  try {
    if (!isStaff(req.userRole)) { res.status(403).json({ error: 'Action réservée aux administrateurs et agents.' }); return; }
    const convo = await loadConversationForUser(String(req.params.id), req.user!.id);
    if (!convo || !convo.is_group) { res.status(403).json({ error: 'Groupe introuvable ou accès refusé.' }); return; }

    const newId: string | undefined = req.body?.user_id;
    if (!newId) { res.status(400).json({ error: 'user_id requis.' }); return; }

    const { data: prof } = await supabaseAdmin
      .from('profiles').select('id, company_id').eq('id', newId).maybeSingle();
    if (!prof || prof.company_id !== req.companyId) {
      res.status(400).json({ error: 'Utilisateur introuvable dans votre entreprise.' });
      return;
    }

    const { error } = await supabaseAdmin
      .from('conversation_participants')
      .upsert({ conversation_id: convo.id, user_id: newId, is_owner: false }, { onConflict: 'conversation_id,user_id', ignoreDuplicates: true });
    if (error) throw error;

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Erreur interne.' });
  }
});

// DELETE /api/messages/groups/:id/members/:userId — remove a member (staff only)
router.delete('/groups/:id/members/:userId', async (req, res): Promise<void> => {
  try {
    if (!isStaff(req.userRole)) { res.status(403).json({ error: 'Action réservée aux administrateurs et agents.' }); return; }
    const convo = await loadConversationForUser(String(req.params.id), req.user!.id);
    if (!convo || !convo.is_group) { res.status(403).json({ error: 'Groupe introuvable ou accès refusé.' }); return; }

    const target = String(req.params.userId);
    if (target === convo.created_by) { res.status(400).json({ error: 'Impossible de retirer le créateur du groupe.' }); return; }

    const { error } = await supabaseAdmin
      .from('conversation_participants')
      .delete()
      .eq('conversation_id', convo.id)
      .eq('user_id', target);
    if (error) throw error;

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Erreur interne.' });
  }
});

// PATCH /api/messages/groups/:id — rename / relink (creator or staff)
router.patch('/groups/:id', async (req, res): Promise<void> => {
  try {
    const convo = await loadConversationForUser(String(req.params.id), req.user!.id);
    if (!convo || !convo.is_group) { res.status(403).json({ error: 'Groupe introuvable ou accès refusé.' }); return; }
    if (!isStaff(req.userRole) && !convo.isOwner) {
      res.status(403).json({ error: 'Action réservée aux administrateurs et au créateur.' });
      return;
    }

    const patch: Record<string, any> = {};
    if (typeof req.body?.name === 'string') {
      const name = req.body.name.trim();
      if (!name) { res.status(400).json({ error: 'Le nom ne peut pas être vide.' }); return; }
      if (name.length > 120) { res.status(400).json({ error: 'Le nom du groupe est trop long.' }); return; }
      patch.name = name;
    }
    if ('ticket_id' in (req.body ?? {})) patch.ticket_id = req.body.ticket_id || null;
    if ('mission_id' in (req.body ?? {})) patch.mission_id = req.body.mission_id || null;
    if (patch.ticket_id && patch.mission_id) { res.status(400).json({ error: 'Lien ticket OU mission, pas les deux.' }); return; }

    if (Object.keys(patch).length === 0) { res.json({ success: true }); return; }

    const { error } = await supabaseAdmin.from('conversations').update(patch).eq('id', convo.id);
    if (error) throw error;

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Erreur interne.' });
  }
});

// DELETE /api/messages/groups/:id — delete the whole group (creator or staff)
router.delete('/groups/:id', async (req, res): Promise<void> => {
  try {
    const convo = await loadConversationForUser(String(req.params.id), req.user!.id);
    if (!convo || !convo.is_group) { res.status(403).json({ error: 'Groupe introuvable ou accès refusé.' }); return; }
    if (!isStaff(req.userRole) && !convo.isOwner) {
      res.status(403).json({ error: 'Action réservée aux administrateurs et au créateur.' });
      return;
    }

    // Messages + participants cascade via FK; remove messages explicitly in case
    // the messages table predates the cascade constraint.
    await supabaseAdmin.from('messages').delete().eq('conversation_id', convo.id);
    const { error } = await supabaseAdmin.from('conversations').delete().eq('id', convo.id);
    if (error) throw error;

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Erreur interne.' });
  }
});

// POST /api/messages/groups/:id/leave — caller leaves the group
router.post('/groups/:id/leave', async (req, res): Promise<void> => {
  try {
    const convo = await loadConversationForUser(String(req.params.id), req.user!.id);
    if (!convo || !convo.is_group) { res.status(403).json({ error: 'Groupe introuvable ou accès refusé.' }); return; }

    const { error } = await supabaseAdmin
      .from('conversation_participants')
      .delete()
      .eq('conversation_id', convo.id)
      .eq('user_id', req.user!.id);
    if (error) throw error;

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Erreur interne.' });
  }
});

/* ── Messages (direct + group) ─────────────────────────────────── */

// GET /api/messages/conversations/:id/messages?before=...&limit=50
router.get('/conversations/:id/messages', async (req, res): Promise<void> => {
  try {
    const convo = await loadConversationForUser(String(req.params.id), req.user!.id);
    if (!convo) { res.status(403).json({ error: 'Conversation introuvable ou accès refusé.' }); return; }

    const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10) || 50, 200);
    let query = supabaseAdmin
      .from('messages')
      .select('id, conversation_id, sender_id, content, read_at, created_at')
      .eq('conversation_id', convo.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    const before = req.query.before;
    if (before && typeof before === 'string') query = query.lt('created_at', before);

    const { data, error } = await query;
    if (error) throw error;

    res.json((data ?? []).slice().reverse());
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Erreur interne.' });
  }
});

// POST /api/messages/conversations/:id/messages — send a message
router.post('/conversations/:id/messages', sendLimiter, async (req, res): Promise<void> => {
  try {
    const convo = await loadConversationForUser(String(req.params.id), req.user!.id);
    if (!convo) { res.status(403).json({ error: 'Conversation introuvable ou accès refusé.' }); return; }

    const content: string = String(req.body?.content ?? '').trim();
    if (!content) { res.status(400).json({ error: 'Le message ne peut pas être vide.' }); return; }
    if (content.length > 5000) { res.status(400).json({ error: 'Le message dépasse 5000 caractères.' }); return; }

    const now = new Date().toISOString();

    const { data: msg, error } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: convo.id,
        company_id: convo.company_id,
        sender_id: req.user!.id,
        content,
      })
      .select('id, conversation_id, sender_id, content, read_at, created_at')
      .single();
    if (error) throw error;

    await supabaseAdmin.from('conversations').update({ last_message_at: now }).eq('id', convo.id);

    // For groups, sending also marks the sender caught up.
    if (convo.is_group) {
      await supabaseAdmin
        .from('conversation_participants')
        .update({ last_read_at: now })
        .eq('conversation_id', convo.id)
        .eq('user_id', req.user!.id);
    }

    res.status(201).json(msg);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Erreur interne.' });
  }
});

// PATCH /api/messages/conversations/:id/read — mark conversation as read
router.patch('/conversations/:id/read', async (req, res): Promise<void> => {
  try {
    const convo = await loadConversationForUser(String(req.params.id), req.user!.id);
    if (!convo) { res.status(403).json({ error: 'Conversation introuvable ou accès refusé.' }); return; }

    if (convo.is_group) {
      const { error } = await supabaseAdmin
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', convo.id)
        .eq('user_id', req.user!.id);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', convo.id)
        .neq('sender_id', req.user!.id)
        .is('read_at', null);
      if (error) throw error;
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Erreur interne.' });
  }
});

export default router;
