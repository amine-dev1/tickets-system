import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/axios';
import { Header } from '../components/layout/Header';
import { GoogleCalendarConnect } from '../components/calendar/GoogleCalendarConnect';
import {
  ChevronLeft, ChevronRight, Plus, X, Loader2, Trash2, Save,
  Ticket as TicketIcon, Calendar as CalendarIcon, ExternalLink, AlertCircle,
} from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────────── */

interface CalendarEvent {
  id: string;
  user_id: string;
  company_id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  color: string;
  related_ticket_id: string | null;
  ticket?: { id: string; title: string; status: string; priority: string } | null;
  created_at: string;
}

interface TicketLite {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  resolved_at: string | null;
}

interface FeedData {
  events: CalendarEvent[];
  tickets: TicketLite[];
}

/* ── Date helpers (no external deps) ───────────────────────────── */

const MONTH_NAMES = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function isoDate(d: Date) {
  // YYYY-MM-DD in local time
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date)   { return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999); }

/** Returns 42 days (6 weeks) starting from the Monday on/before the 1st */
function buildMonthGrid(d: Date): Date[] {
  const first = startOfMonth(d);
  // 0=Sun, 1=Mon, ..., 6=Sat. We want Monday as first day → shift.
  const dayOfWeek = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - dayOfWeek);
  return Array.from({ length: 42 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return day;
  });
}

/* ── Priority/status colors ────────────────────────────────────── */

const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-red-500', high: 'bg-orange-500', medium: 'bg-amber-400', low: 'bg-emerald-500',
};
const STATUS_LABEL: Record<string, string> = {
  open: 'Ouvert', in_progress: 'En cours', resolved: 'Résolu', closed: 'Fermé',
};

/* ── Component ─────────────────────────────────────────────────── */

export default function Calendar() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [cursor, setCursor] = useState(new Date());
  const [createFor, setCreateFor] = useState<string | null>(null); // date string YYYY-MM-DD
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const grid = buildMonthGrid(cursor);

  // Fetch slightly outside the month to cover the leading/trailing days in the grid
  const fetchFrom = grid[0].toISOString();
  const fetchTo   = new Date(grid[grid.length - 1].setHours(23, 59, 59, 999)).toISOString();

  const { data, isLoading } = useQuery<FeedData>({
    queryKey: ['calendar-feed', fetchFrom, fetchTo],
    queryFn: () => api.get(`/calendar/feed?from=${encodeURIComponent(fetchFrom)}&to=${encodeURIComponent(fetchTo)}`).then(r => r.data),
  });

  /* Group events + tickets by ISO day */
  const byDay = useMemo(() => {
    const map: Record<string, { events: CalendarEvent[]; tickets: TicketLite[] }> = {};
    grid.forEach(d => { map[isoDate(d)] = { events: [], tickets: [] }; });
    (data?.events ?? []).forEach(e => {
      const k = isoDate(new Date(e.start_at));
      if (map[k]) map[k].events.push(e);
    });
    (data?.tickets ?? []).forEach(t => {
      const k = isoDate(new Date(t.created_at));
      if (map[k]) map[k].tickets.push(t);
    });
    return map;
  }, [data, grid]);

  const todayIso = isoDate(new Date());

  const goToday = () => setCursor(new Date());
  const goPrev  = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
  const goNext  = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));

  return (
    <div className="space-y-4">
      <Header title="Calendrier" subtitle="Gérez votre planning et visualisez les tickets" />

      <div className="px-6 space-y-4">
        {/* Google Calendar / account connection */}
        <GoogleCalendarConnect />

        {/* Toolbar */}
        <div className="glass-card px-4 py-3 flex flex-wrap items-center gap-3">
          <button onClick={goPrev} className="btn-ghost p-2" title="Mois précédent"><ChevronLeft className="w-4 h-4" /></button>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 min-w-[180px]">
            {MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}
          </h2>
          <button onClick={goNext} className="btn-ghost p-2" title="Mois suivant"><ChevronRight className="w-4 h-4" /></button>
          <button onClick={goToday} className="btn-secondary text-xs px-3 py-1.5">Aujourd'hui</button>

          <div className="ml-auto flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-brand-500" /> Événements</div>
            <div className="flex items-center gap-1.5"><TicketIcon className="w-3 h-3 text-blue-500" /> Tickets</div>
          </div>

          <button
            onClick={() => setCreateFor(isoDate(new Date()))}
            className="btn-primary text-sm py-1.5"
          >
            <Plus className="w-4 h-4" /> Nouvel événement
          </button>
        </div>

        {/* Calendar grid */}
        <div className="glass-card overflow-hidden">
          {/* Day-name header */}
          <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800/60">
            {DAY_NAMES.map(d => (
              <div key={d} className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
          ) : (
            <div className="grid grid-cols-7 grid-rows-6">
              {grid.map((d, idx) => {
                const iso = isoDate(d);
                const inMonth = d.getMonth() === cursor.getMonth() && d.getFullYear() === cursor.getFullYear();
                const isToday = iso === todayIso;
                const cellData = byDay[iso] ?? { events: [], tickets: [] };
                const items = [
                  ...cellData.events.map(e => ({ type: 'event' as const, item: e })),
                  ...cellData.tickets.map(t => ({ type: 'ticket' as const, item: t })),
                ];
                const visible = items.slice(0, 3);
                const extra = items.length - visible.length;

                return (
                  <div
                    key={idx}
                    onClick={() => setCreateFor(iso)}
                    className={`min-h-[110px] p-1.5 border-r border-b border-gray-100 dark:border-gray-800/40 cursor-pointer transition-colors
                      ${inMonth ? 'bg-white dark:bg-gray-900/20' : 'bg-gray-50/60 dark:bg-gray-900/40'}
                      ${idx % 7 === 6 ? 'border-r-0' : ''}
                      ${idx >= 35 ? 'border-b-0' : ''}
                      hover:bg-brand-50/40 dark:hover:bg-brand-500/5`}
                  >
                    <div className="flex items-center justify-between mb-1 px-1">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold
                        ${isToday ? 'bg-brand-500 text-white' : inMonth ? 'text-gray-700 dark:text-gray-200' : 'text-gray-300 dark:text-gray-600'}`}
                      >
                        {d.getDate()}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {visible.map((entry, i) =>
                        entry.type === 'event' ? (
                          <button
                            key={'e' + i}
                            onClick={(e) => { e.stopPropagation(); setEditEvent(entry.item); }}
                            className="w-full text-left truncate text-[11px] px-1.5 py-0.5 rounded font-medium text-white hover:opacity-90 transition-opacity"
                            style={{ backgroundColor: entry.item.color }}
                            title={entry.item.title}
                          >
                            {entry.item.title}
                          </button>
                        ) : (
                          <button
                            key={'t' + i}
                            onClick={(e) => { e.stopPropagation(); navigate(`/admin/tickets/${entry.item.id}`); }}
                            className="w-full text-left truncate text-[11px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-500/15 border border-blue-100 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-500/25 transition-colors flex items-center gap-1"
                            title={`${entry.item.title} · ${STATUS_LABEL[entry.item.status] ?? entry.item.status}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[entry.item.priority] ?? 'bg-gray-400'}`} />
                            <span className="truncate flex-1">{entry.item.title}</span>
                          </button>
                        ),
                      )}
                      {extra > 0 && (
                        <p className="text-[10px] text-gray-400 px-1.5">+ {extra} autre{extra > 1 ? 's' : ''}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create modal */}
      {createFor && (
        <EventModal
          dateIso={createFor}
          onClose={() => setCreateFor(null)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['calendar-feed'] });
            setCreateFor(null);
          }}
        />
      )}

      {/* Edit modal */}
      {editEvent && (
        <EventModal
          editing={editEvent}
          onClose={() => setEditEvent(null)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['calendar-feed'] });
            setEditEvent(null);
          }}
        />
      )}
    </div>
  );
}

/* ── Event modal (create + edit) ───────────────────────────────── */

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6'];

function EventModal({
  dateIso,
  editing,
  onClose,
  onSaved,
}: {
  dateIso?: string;
  editing?: CalendarEvent;
  onClose: () => void;
  onSaved: () => void;
}) {
  const navigate = useNavigate();
  const isEdit = !!editing;

  const [title, setTitle]       = useState(editing?.title ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [allDay, setAllDay]     = useState(editing?.all_day ?? true);
  const [color, setColor]       = useState(editing?.color ?? '#6366f1');
  const [error, setError]       = useState('');

  // Datetime-local default values
  const initStart = editing
    ? toLocalInput(new Date(editing.start_at))
    : `${dateIso}T09:00`;
  const initEnd = editing?.end_at
    ? toLocalInput(new Date(editing.end_at))
    : `${dateIso ?? isoDate(new Date())}T10:00`;
  const [startAt, setStartAt] = useState(initStart);
  const [endAt, setEndAt]     = useState(initEnd);

  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      isEdit
        ? api.put(`/calendar/events/${editing!.id}`, payload).then(r => r.data)
        : api.post('/calendar/events', payload).then(r => r.data),
    onSuccess: onSaved,
    onError: (err: any) => setError(err.message ?? 'Erreur lors de l\'enregistrement.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/calendar/events/${editing!.id}`),
    onSuccess: onSaved,
    onError: (err: any) => setError(err.message ?? 'Erreur lors de la suppression.'),
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) { setError('Le titre est requis.'); return; }
    const payload: any = {
      title: title.trim(),
      description: description.trim() || null,
      all_day: allDay,
      color,
      start_at: allDay
        ? new Date(`${startAt.slice(0, 10)}T00:00:00`).toISOString()
        : new Date(startAt).toISOString(),
      end_at: allDay
        ? new Date(`${startAt.slice(0, 10)}T23:59:59`).toISOString()
        : (endAt ? new Date(endAt).toISOString() : null),
    };
    saveMutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card w-full max-w-md flex flex-col overflow-hidden shadow-2xl max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '20' }}>
              <CalendarIcon className="w-4 h-4" style={{ color }} />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-gray-100">
                {isEdit ? 'Modifier l\'événement' : 'Nouvel événement'}
              </h2>
              {dateIso && !isEdit && <p className="text-xs text-gray-400 mt-0.5">{new Date(dateIso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Linked ticket info (read-only) */}
          {editing?.ticket && (
            <button
              type="button"
              onClick={() => navigate(`/admin/tickets/${editing.ticket!.id}`)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 text-blue-700 dark:text-blue-300 text-sm hover:bg-blue-100 dark:hover:bg-blue-500/15 transition-colors"
            >
              <TicketIcon className="w-3.5 h-3.5" />
              <span className="flex-1 truncate text-left font-medium">{editing.ticket.title}</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </button>
          )}

          {/* Title */}
          <div>
            <label className="label block mb-1.5">Titre <span className="text-red-400">*</span></label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="input w-full"
              placeholder="Ex : Réunion équipe support"
              autoFocus
            />
          </div>

          {/* All-day toggle */}
          <div
            onClick={() => setAllDay(!allDay)}
            className={`flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer transition-all
              ${allDay ? 'bg-brand-50 dark:bg-brand-500/10 border-brand-200 dark:border-brand-500/30' : 'bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700'}`}
          >
            <span className={`text-sm font-medium ${allDay ? 'text-brand-700 dark:text-brand-300' : 'text-gray-500 dark:text-gray-400'}`}>
              Toute la journée
            </span>
            <div className={`relative inline-flex w-9 h-5 rounded-full transition-colors ${allDay ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
              <span className={`inline-block w-3.5 h-3.5 bg-white rounded-full shadow transform transition-transform mt-[3px] ${allDay ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
          </div>

          {/* Date/time inputs */}
          <div className={`grid ${allDay ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
            <div>
              <label className="label block mb-1.5">{allDay ? 'Date' : 'Début'}</label>
              <input
                type={allDay ? 'date' : 'datetime-local'}
                value={allDay ? startAt.slice(0, 10) : startAt}
                onChange={e => setStartAt(allDay ? `${e.target.value}T00:00` : e.target.value)}
                className="input w-full"
              />
            </div>
            {!allDay && (
              <div>
                <label className="label block mb-1.5">Fin</label>
                <input
                  type="datetime-local"
                  value={endAt}
                  onChange={e => setEndAt(e.target.value)}
                  className="input w-full"
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="label block mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="input w-full min-h-[70px] resize-none"
              placeholder="Notes optionnelles..."
              maxLength={2000}
            />
          </div>

          {/* Color picker */}
          <div>
            <label className="label block mb-1.5">Couleur</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px ${c}` : undefined }}
                  aria-label={`Couleur ${c}`}
                />
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-xs">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800/60 flex items-center gap-2">
          {isEdit && (
            <button
              type="button"
              onClick={() => {
                if (confirm('Supprimer cet événement ?')) deleteMutation.mutate();
              }}
              disabled={deleteMutation.isPending}
              className="btn-ghost text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 text-sm disabled:opacity-50"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Supprimer
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={onClose} className="btn-secondary text-sm">Annuler</button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saveMutation.isPending || !title.trim()}
              className="btn-primary text-sm disabled:opacity-40"
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEdit ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
