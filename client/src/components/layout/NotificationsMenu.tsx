import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Check, CheckCheck, Trash2, X,
  Ticket as TicketIcon, MessageSquare, ArrowRightCircle, Inbox,
} from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { formatRelative } from '../../lib/utils';
import type { Notification } from '../../api/notifications';

const typeIcon = (type: string) => {
  if (type === 'comment_added') return <MessageSquare className="w-4 h-4" />;
  if (type === 'ticket_status_changed') return <ArrowRightCircle className="w-4 h-4" />;
  return <TicketIcon className="w-4 h-4" />;
};

const typeAccent = (type: string) => {
  if (type === 'comment_added') return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10';
  if (type === 'ticket_status_changed') return 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10';
  if (type === 'ticket_deleted') return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10';
  return 'text-brand-600 bg-brand-50 dark:text-brand-400 dark:bg-brand-500/10';
};

export function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markRead, markAllRead, remove } = useNotifications();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const handleClick = (n: Notification) => {
    if (!n.is_read) markRead(n.id);
    if (n.link) {
      navigate(n.link);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        id="notification-btn"
        onClick={() => setOpen(o => !o)}
        className="btn-ghost relative p-2 rounded-xl"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-950 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] glass-card shadow-soft-lg z-50 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800/60">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead()}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:text-brand-400 dark:hover:bg-brand-500/10 transition-colors"
                  title="Tout marquer comme lu"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800/60 flex items-center justify-center mb-3">
                  <Inbox className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Aucune notification</p>
                <p className="text-xs text-gray-400 mt-0.5">Vous serez prévenu ici</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800/40">
                {notifications.map(n => (
                  <li
                    key={n.id}
                    className={`group relative px-4 py-3 cursor-pointer transition-colors ${
                      n.is_read
                        ? 'hover:bg-gray-50 dark:hover:bg-gray-800/30'
                        : 'bg-brand-50/40 hover:bg-brand-50/70 dark:bg-brand-500/[0.06] dark:hover:bg-brand-500/[0.10]'
                    }`}
                    onClick={() => handleClick(n)}
                  >
                    <div className="flex gap-3">
                      <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${typeAccent(n.type)}`}>
                        {typeIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug ${n.is_read ? 'text-gray-700 dark:text-gray-300' : 'font-medium text-gray-900 dark:text-gray-100'}`}>
                          {n.title}
                        </p>
                        {n.message && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                        )}
                        <p className="text-[11px] text-gray-400 mt-1">{formatRelative(n.created_at)}</p>
                      </div>
                      {!n.is_read && (
                        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-brand-500 mt-2" />
                      )}
                    </div>

                    {/* Hover actions */}
                    <div className="absolute right-3 top-3 hidden group-hover:flex items-center gap-1">
                      {!n.is_read && (
                        <button
                          onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                          className="p-1 rounded-md bg-white dark:bg-gray-900 shadow-soft text-gray-400 hover:text-brand-600 dark:hover:text-brand-400"
                          title="Marquer comme lu"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); remove(n.id); }}
                        className="p-1 rounded-md bg-white dark:bg-gray-900 shadow-soft text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
