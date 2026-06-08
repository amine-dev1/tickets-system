/**
 * Google Calendar two-way synchronisation.
 *
 * Each staff user connects their own Google account (server-side OAuth2,
 * offline access → refresh token stored per user). We then reconcile:
 *   - PUSH: app calendar events + tickets assigned to the user → Google.
 *   - PULL: Google events → mirrored as local calendar_events (source='google').
 *
 * A mapping table (google_calendar_event_map) links each app object to the
 * Google event it produced so updates/deletes propagate without duplicates.
 * Events that the app pushed are skipped on pull to avoid echo loops.
 */

import { google } from 'googleapis';
import crypto from 'crypto';

// Derive the OAuth2 client type from googleapis itself so it matches the
// google-auth-library copy that googleapis-common actually returns/expects
// (avoids the "two separate declarations of private property" type clash
// when a second google-auth-library version is hoisted at the top level).
type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;
import { supabaseAdmin } from './supabase';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
];

const DAY_MS = 24 * 60 * 60 * 1000;

function env() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
    `http://localhost:${process.env.PORT || 4000}/api/calendar/google/callback`;
  return { clientId, clientSecret, redirectUri };
}

/** Whether the server has the Google OAuth credentials configured. */
export function isGoogleConfigured(): boolean {
  const { clientId, clientSecret } = env();
  return !!(clientId && clientSecret);
}

function oauthClient(): OAuth2Client {
  const { clientId, clientSecret, redirectUri } = env();
  if (!clientId || !clientSecret) throw new Error('GOOGLE_NOT_CONFIGURED');
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/* ── Signed OAuth state (carries the user id through the redirect) ── */

const STATE_SECRET =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.GOOGLE_CLIENT_SECRET || 'dev-state-secret';

function signState(userId: string): string {
  const payload = `${userId}.${Date.now()}`;
  const sig = crypto.createHmac('sha256', STATE_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}

export function verifyState(state: string): string | null {
  try {
    const decoded = Buffer.from(state, 'base64url').toString('utf8');
    const [userId, ts, sig] = decoded.split('.');
    if (!userId || !ts || !sig) return null;
    const expected = crypto.createHmac('sha256', STATE_SECRET).update(`${userId}.${ts}`).digest('hex');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    if (Date.now() - Number(ts) > 15 * 60 * 1000) return null; // 15 min validity
    return userId;
  } catch {
    return null;
  }
}

/** Build the Google consent URL for a given user. */
export function getAuthUrl(userId: string): string {
  const client = oauthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // force a refresh_token every time
    scope: SCOPES,
    state: signState(userId),
    include_granted_scopes: true,
  });
}

/** Exchange the authorization code and persist the user's tokens. */
export async function handleCallback(code: string, userId: string): Promise<void> {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  let email: string | null = null;
  try {
    const oauth2 = google.oauth2({ version: 'v2', auth: client });
    const me = await oauth2.userinfo.get();
    email = me.data.email ?? null;
  } catch {
    /* email is best-effort */
  }

  // Keep the existing refresh_token if Google didn't return a new one.
  const { data: existing } = await supabaseAdmin
    .from('google_calendar_connections')
    .select('refresh_token')
    .eq('user_id', userId)
    .maybeSingle();

  await supabaseAdmin.from('google_calendar_connections').upsert(
    {
      user_id: userId,
      google_email: email,
      access_token: tokens.access_token ?? null,
      refresh_token: tokens.refresh_token ?? existing?.refresh_token ?? null,
      token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
}

/* ── Authorized client with token-refresh persistence ─────────────── */

async function authorizedClient(conn: any): Promise<OAuth2Client> {
  const client = oauthClient();
  client.setCredentials({
    access_token: conn.access_token ?? undefined,
    refresh_token: conn.refresh_token ?? undefined,
    expiry_date: conn.token_expiry ? new Date(conn.token_expiry).getTime() : undefined,
  });
  client.on('tokens', (tokens) => {
    const patch: any = { updated_at: new Date().toISOString() };
    if (tokens.access_token) patch.access_token = tokens.access_token;
    if (tokens.refresh_token) patch.refresh_token = tokens.refresh_token;
    if (tokens.expiry_date) patch.token_expiry = new Date(tokens.expiry_date).toISOString();
    supabaseAdmin
      .from('google_calendar_connections')
      .update(patch)
      .eq('user_id', conn.user_id)
      .then(
        () => {},
        () => {},
      );
  });
  return client;
}

async function getConnection(userId: string): Promise<any | null> {
  const { data } = await supabaseAdmin
    .from('google_calendar_connections')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return data ?? null;
}

/* ── App object → Google event resource ───────────────────────────── */

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function eventToGoogle(ev: any): any {
  if (ev.all_day) {
    const startDate = String(ev.start_at).slice(0, 10);
    const endBase = ev.end_at ? String(ev.end_at).slice(0, 10) : startDate;
    const endExclusive = new Date(`${endBase}T00:00:00Z`);
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1); // Google all-day end is exclusive
    return {
      summary: ev.title,
      description: ev.description ?? undefined,
      start: { date: startDate },
      end: { date: ymd(endExclusive) },
    };
  }
  return {
    summary: ev.title,
    description: ev.description ?? undefined,
    start: { dateTime: new Date(ev.start_at).toISOString() },
    end: { dateTime: new Date(ev.end_at ?? ev.start_at).toISOString() },
  };
}

function ticketToGoogle(t: any): any {
  const date = String(t.created_at).slice(0, 10);
  const endExclusive = new Date(`${date}T00:00:00Z`);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  return {
    summary: `🎫 ${t.title}`,
    description: `Ticket · statut ${t.status} · priorité ${t.priority}`,
    start: { date },
    end: { date: ymd(endExclusive) },
  };
}

/* ── Upsert an app object to Google via the mapping table ─────────── */

async function upsertMapped(
  calendar: any,
  calendarId: string,
  userId: string,
  sourceType: 'event' | 'ticket',
  sourceId: string,
  resource: any,
): Promise<void> {
  const { data: m } = await supabaseAdmin
    .from('google_calendar_event_map')
    .select('google_event_id')
    .eq('user_id', userId)
    .eq('source_type', sourceType)
    .eq('source_id', sourceId)
    .maybeSingle();

  if (m?.google_event_id) {
    try {
      await calendar.events.update({ calendarId, eventId: m.google_event_id, requestBody: resource });
      return;
    } catch (e: any) {
      const code = e?.code ?? e?.response?.status;
      if (code !== 404 && code !== 410) throw e;
      // The Google event vanished → recreate it below.
    }
  }

  const ins = await calendar.events.insert({ calendarId, requestBody: resource });
  await supabaseAdmin.from('google_calendar_event_map').upsert(
    {
      user_id: userId,
      source_type: sourceType,
      source_id: sourceId,
      google_event_id: ins.data.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,source_type,source_id' },
  );
}

/* ── Pull: mirror a Google event into calendar_events ─────────────── */

async function applyGoogleEvent(
  userId: string,
  companyId: string | null,
  gEv: any,
): Promise<'created' | 'updated' | 'deleted' | 'skip'> {
  if (!gEv.id) return 'skip';

  if (gEv.status === 'cancelled') {
    await supabaseAdmin
      .from('calendar_events')
      .delete()
      .eq('user_id', userId)
      .eq('google_event_id', gEv.id);
    return 'deleted';
  }

  // Don't mirror events the app itself pushed (avoid echo / duplicates).
  const { data: mapped } = await supabaseAdmin
    .from('google_calendar_event_map')
    .select('id')
    .eq('user_id', userId)
    .eq('google_event_id', gEv.id)
    .maybeSingle();
  if (mapped) return 'skip';

  const startRaw = gEv.start?.dateTime || gEv.start?.date;
  if (!startRaw) return 'skip';
  const allDay = !!gEv.start?.date && !gEv.start?.dateTime;
  const endRaw = gEv.end?.dateTime || gEv.end?.date || null;

  const row: any = {
    user_id: userId,
    company_id: companyId,
    title: gEv.summary || '(Sans titre)',
    description: gEv.description ?? null,
    start_at: new Date(startRaw).toISOString(),
    end_at: endRaw ? new Date(endRaw).toISOString() : null,
    all_day: allDay,
    color: '#4285f4',
    source: 'google',
    google_event_id: gEv.id,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabaseAdmin
    .from('calendar_events')
    .select('id')
    .eq('user_id', userId)
    .eq('google_event_id', gEv.id)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin.from('calendar_events').update(row).eq('id', existing.id);
    return 'updated';
  }
  await supabaseAdmin.from('calendar_events').insert(row);
  return 'created';
}

/* ── Full reconcile for one user ──────────────────────────────────── */

export interface SyncResult {
  pushed: number;
  pulled: number;
  deleted: number;
}

export async function syncUser(
  userId: string,
  companyId: string | null,
  userRole: string | undefined,
): Promise<SyncResult> {
  const conn = await getConnection(userId);
  if (!conn) throw new Error('NOT_CONNECTED');
  if (conn.sync_enabled === false) throw new Error('SYNC_DISABLED');

  const client = await authorizedClient(conn);
  const calendar = google.calendar({ version: 'v3', auth: client });
  const calendarId = conn.calendar_id || 'primary';

  let pushed = 0;
  let pulled = 0;
  let deleted = 0;

  /* ---- PULL: Google → app ---- */
  let pageToken: string | undefined;
  let newSyncToken: string | undefined;
  const baseParams: any = { calendarId, singleEvents: true, showDeleted: true, maxResults: 250 };
  if (conn.sync_token) {
    baseParams.syncToken = conn.sync_token;
  } else {
    baseParams.timeMin = new Date(Date.now() - 90 * DAY_MS).toISOString();
    baseParams.timeMax = new Date(Date.now() + 365 * DAY_MS).toISOString();
  }

  do {
    const params = { ...baseParams };
    if (pageToken) params.pageToken = pageToken;
    let resp: any;
    try {
      resp = await calendar.events.list(params);
    } catch (e: any) {
      const code = e?.code ?? e?.response?.status;
      if (code === 410) {
        // syncToken expired → restart a windowed full sync.
        await supabaseAdmin
          .from('google_calendar_connections')
          .update({ sync_token: null })
          .eq('user_id', userId);
        delete baseParams.syncToken;
        baseParams.timeMin = new Date(Date.now() - 90 * DAY_MS).toISOString();
        baseParams.timeMax = new Date(Date.now() + 365 * DAY_MS).toISOString();
        pageToken = undefined;
        resp = await calendar.events.list({ ...baseParams });
      } else {
        throw e;
      }
    }
    for (const gEv of resp.data.items ?? []) {
      const r = await applyGoogleEvent(userId, companyId, gEv);
      if (r === 'deleted') deleted++;
      else if (r === 'created' || r === 'updated') pulled++;
    }
    pageToken = resp.data.nextPageToken ?? undefined;
    newSyncToken = resp.data.nextSyncToken ?? newSyncToken;
  } while (pageToken);

  if (newSyncToken) {
    await supabaseAdmin
      .from('google_calendar_connections')
      .update({ sync_token: newSyncToken })
      .eq('user_id', userId);
  }

  /* ---- PUSH events (locally-authored only) ---- */
  const { data: events } = await supabaseAdmin
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .eq('source', 'local');

  for (const ev of events ?? []) {
    await upsertMapped(calendar, calendarId, userId, 'event', ev.id, eventToGoogle(ev));
    pushed++;
  }

  // Delete Google events whose local source event no longer exists.
  const localIds = new Set((events ?? []).map((e: any) => e.id));
  const { data: eventMaps } = await supabaseAdmin
    .from('google_calendar_event_map')
    .select('*')
    .eq('user_id', userId)
    .eq('source_type', 'event');
  for (const m of eventMaps ?? []) {
    if (!localIds.has(m.source_id)) {
      try {
        await calendar.events.delete({ calendarId, eventId: m.google_event_id });
      } catch {
        /* already gone */
      }
      await supabaseAdmin.from('google_calendar_event_map').delete().eq('id', m.id);
      deleted++;
    }
  }

  /* ---- PUSH tickets assigned to the user ---- */
  if (conn.push_tickets) {
    let tq = supabaseAdmin
      .from('tickets')
      .select('id, title, status, priority, created_at, company_id, assigned_to')
      .eq('assigned_to', userId)
      .gte('created_at', new Date(Date.now() - 90 * DAY_MS).toISOString());
    if (userRole !== 'superadmin' && companyId) tq = tq.eq('company_id', companyId);
    const { data: tickets } = await tq;

    const ticketIds = new Set((tickets ?? []).map((t: any) => t.id));
    for (const t of tickets ?? []) {
      await upsertMapped(calendar, calendarId, userId, 'ticket', t.id, ticketToGoogle(t));
      pushed++;
    }

    // Remove ticket events that are no longer assigned / in range.
    const { data: ticketMaps } = await supabaseAdmin
      .from('google_calendar_event_map')
      .select('*')
      .eq('user_id', userId)
      .eq('source_type', 'ticket');
    for (const m of ticketMaps ?? []) {
      if (!ticketIds.has(m.source_id)) {
        try {
          await calendar.events.delete({ calendarId, eventId: m.google_event_id });
        } catch {
          /* already gone */
        }
        await supabaseAdmin.from('google_calendar_event_map').delete().eq('id', m.id);
        deleted++;
      }
    }
  }

  await supabaseAdmin
    .from('google_calendar_connections')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('user_id', userId);

  return { pushed, pulled, deleted };
}

/* ── Immediate mirror helpers (best-effort, called from event CRUD) ─ */

export async function mirrorEventUpsert(userId: string, ev: any): Promise<void> {
  if (!ev || ev.source === 'google') return;
  const conn = await getConnection(userId);
  if (!conn || conn.sync_enabled === false) return;
  const client = await authorizedClient(conn);
  const calendar = google.calendar({ version: 'v3', auth: client });
  await upsertMapped(calendar, conn.calendar_id || 'primary', userId, 'event', ev.id, eventToGoogle(ev));
}

export async function mirrorEventDelete(userId: string, eventId: string): Promise<void> {
  const conn = await getConnection(userId);
  if (!conn || conn.sync_enabled === false) return;
  const { data: m } = await supabaseAdmin
    .from('google_calendar_event_map')
    .select('*')
    .eq('user_id', userId)
    .eq('source_type', 'event')
    .eq('source_id', eventId)
    .maybeSingle();
  if (!m) return;
  const client = await authorizedClient(conn);
  const calendar = google.calendar({ version: 'v3', auth: client });
  try {
    await calendar.events.delete({ calendarId: conn.calendar_id || 'primary', eventId: m.google_event_id });
  } catch {
    /* already gone */
  }
  await supabaseAdmin.from('google_calendar_event_map').delete().eq('id', m.id);
}

/* ── Status / settings / disconnect ───────────────────────────────── */

export async function getStatus(userId: string): Promise<{
  configured: boolean;
  connected: boolean;
  email: string | null;
  push_tickets: boolean;
  sync_enabled: boolean;
  last_synced_at: string | null;
}> {
  const configured = isGoogleConfigured();
  const conn = await getConnection(userId);
  return {
    configured,
    connected: !!conn,
    email: conn?.google_email ?? null,
    push_tickets: conn?.push_tickets ?? true,
    sync_enabled: conn?.sync_enabled ?? true,
    last_synced_at: conn?.last_synced_at ?? null,
  };
}

export async function setPushTickets(userId: string, value: boolean): Promise<void> {
  await supabaseAdmin
    .from('google_calendar_connections')
    .update({ push_tickets: value, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
}

export async function setSyncEnabled(userId: string, value: boolean): Promise<void> {
  await supabaseAdmin
    .from('google_calendar_connections')
    .update({ sync_enabled: value, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
}

export async function disconnectUser(userId: string): Promise<void> {
  const conn = await getConnection(userId);
  if (conn) {
    try {
      const client = await authorizedClient(conn);
      await client.revokeCredentials();
    } catch {
      /* token may already be invalid */
    }
  }
  await supabaseAdmin.from('google_calendar_event_map').delete().eq('user_id', userId);
  await supabaseAdmin
    .from('calendar_events')
    .delete()
    .eq('user_id', userId)
    .eq('source', 'google');
  await supabaseAdmin.from('google_calendar_connections').delete().eq('user_id', userId);
}
