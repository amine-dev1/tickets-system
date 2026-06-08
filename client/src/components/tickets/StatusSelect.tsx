import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Loader2 } from 'lucide-react';
import { cn, STATUS_STYLES, STATUS_LABELS } from '../../lib/utils';
import type { TicketStatus } from '../../types';

const STATUSES: TicketStatus[] = ['open', 'in_progress', 'resolved', 'closed'];

const DOT_COLORS: Record<TicketStatus, string> = {
  open: 'bg-blue-500',
  in_progress: 'bg-amber-500',
  resolved: 'bg-emerald-500',
  closed: 'bg-gray-400',
};

interface StatusSelectProps {
  value: TicketStatus;
  onChange: (value: TicketStatus) => void;
  disabled?: boolean;
  loading?: boolean;
  readOnly?: boolean;
  placement?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
}

export function StatusSelect({ value, onChange, disabled, loading, readOnly, placement = 'bottom-left' }: StatusSelectProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [open]);

  // Read-only — just render the badge
  if (readOnly) {
    return (
      <span className={cn('badge', STATUS_STYLES[value])}>
        <span className={cn('w-1.5 h-1.5 rounded-full', DOT_COLORS[value])} />
        {STATUS_LABELS[value]}
      </span>
    );
  }

  return (
    <div ref={wrapperRef} className="relative inline-block">
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'badge cursor-pointer transition-all hover:shadow-sm hover:brightness-105',
          STATUS_STYLES[value],
          (disabled || loading) && 'opacity-60 cursor-not-allowed',
          open && 'ring-2 ring-brand-500/30'
        )}
      >
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <span className={cn('w-1.5 h-1.5 rounded-full', DOT_COLORS[value])} />
        )}
        {STATUS_LABELS[value]}
        <ChevronDown className={cn('w-3 h-3 ml-0.5 transition-transform opacity-70', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          className={cn(
            'absolute min-w-[180px] z-30',
            'rounded-xl shadow-xl ring-1 ring-black/5 overflow-hidden',
            'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/80',
            'animate-fade-in',
            placement === 'bottom-left' && 'left-0 top-full mt-1.5',
            placement === 'bottom-right' && 'right-0 top-full mt-1.5',
            placement === 'top-left' && 'left-0 bottom-full mb-1.5',
            placement === 'top-right' && 'right-0 bottom-full mb-1.5'
          )}
        >
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800/60">
            <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
              Change Status
            </span>
          </div>
          <ul role="listbox" className="py-1">
            {STATUSES.map((s) => {
              const isSelected = s === value;
              return (
                <li
                  key={s}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(s);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer transition-colors',
                    'hover:bg-gray-50 dark:hover:bg-gray-800/60',
                    isSelected && 'bg-brand-50/50 dark:bg-brand-500/5'
                  )}
                >
                  <span className={cn('w-2 h-2 rounded-full flex-shrink-0', DOT_COLORS[s])} />
                  <span
                    className={cn(
                      'flex-1 capitalize',
                      isSelected
                        ? 'text-gray-900 dark:text-gray-100 font-medium'
                        : 'text-gray-700 dark:text-gray-300'
                    )}
                  >
                    {STATUS_LABELS[s]}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400" />}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
