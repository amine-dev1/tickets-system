import { cn, STATUS_STYLES, STATUS_LABELS, PRIORITY_STYLES, PRIORITY_LABELS } from '../../lib/utils';
import type { TicketStatus, TicketPriority } from '../../types';

interface StatusBadgeProps {
  status: TicketStatus;
  className?: string;
}

interface PriorityBadgeProps {
  priority: TicketPriority;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn('badge', STATUS_STYLES[status], className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const dots: Record<TicketPriority, string> = {
    low: '▲',
    medium: '▲▲',
    high: '▲▲▲',
    urgent: '🔥',
  };
  return (
    <span className={cn('badge', PRIORITY_STYLES[priority], className)}>
      <span className="text-[10px]">{dots[priority]}</span>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
