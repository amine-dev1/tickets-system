import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format } from 'date-fns';
import type { TicketStatus, TicketPriority } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string) {
  return format(new Date(dateStr), 'MMM d, yyyy');
}

export function formatRelative(dateStr: string) {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}

export function formatDateTime(dateStr: string) {
  return format(new Date(dateStr), 'MMM d, yyyy · h:mm a');
}

export const STATUS_STYLES: Record<TicketStatus, string> = {
  open:        'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30',
  in_progress: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30',
  resolved:    'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30',
  closed:      'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-500/15 dark:text-gray-400 dark:border-gray-500/30',
};

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const PRIORITY_STYLES: Record<TicketPriority, string> = {
  low:    'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-gray-500/15 dark:text-gray-400 dark:border-gray-500/30',
  medium: 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/30',
  high:   'bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-500/15 dark:text-orange-400 dark:border-orange-500/30',
  urgent: 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30',
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const CATEGORY_LABELS: Record<string, string> = {
  bug: '🐛 Bug',
  feature_request: '✨ Feature Request',
  billing: '💳 Billing',
  support: '🛟 Support',
  other: '📌 Other',
};

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}
