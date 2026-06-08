import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
  disabled?: boolean;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  className?: string;
  size?: 'sm' | 'md';
  id?: string;
  fullWidth?: boolean;
  align?: 'left' | 'right';
}

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  disabled = false,
  searchable = false,
  className,
  size = 'md',
  id,
  fullWidth = false,
  align = 'left',
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    if (!searchable || !query) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, searchable]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [open]);

  // Focus search input when opening
  useEffect(() => {
    if (open && searchable) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
    if (open) {
      const idx = filtered.findIndex((o) => o.value === value);
      setHighlight(idx >= 0 ? idx : 0);
    }
  }, [open, searchable]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll highlighted into view
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[highlight] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open]);

  const handleSelect = useCallback(
    (val: string) => {
      onChange(val);
      setOpen(false);
      setQuery('');
    },
    [onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      if (!open && !searchable) {
        e.preventDefault();
        setOpen(true);
        return;
      }
      if (open) {
        e.preventDefault();
        const opt = filtered[highlight];
        if (opt && !opt.disabled) handleSelect(opt.value);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      else setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (open) setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  const triggerSizeClass = size === 'sm' ? 'h-8 text-xs px-2.5' : 'h-10 text-sm px-3';

  return (
    <div
      ref={wrapperRef}
      className={cn('relative', fullWidth ? 'w-full' : 'inline-block', className)}
    >
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'flex items-center justify-between gap-2 rounded-lg border transition-all w-full',
          'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40',
          'hover:border-gray-300 dark:hover:border-gray-600',
          'focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 dark:focus:border-brand-500',
          disabled && 'opacity-50 cursor-not-allowed',
          open && 'ring-2 ring-brand-500/30 border-brand-400 dark:border-brand-500',
          triggerSizeClass
        )}
      >
        <span className="flex items-center gap-2 min-w-0 flex-1">
          {selected?.icon && (
            <span className="flex-shrink-0 text-gray-500 dark:text-gray-400">{selected.icon}</span>
          )}
          <span
            className={cn(
              'truncate text-left',
              selected ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'
            )}
          >
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <ChevronDown
          className={cn(
            'flex-shrink-0 text-gray-400 transition-transform',
            size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div
          className={cn(
            'absolute z-50 mt-1.5 min-w-full rounded-xl shadow-xl ring-1 ring-black/5',
            'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/80',
            'animate-fade-in overflow-hidden',
            align === 'right' ? 'right-0' : 'left-0'
          )}
          style={{ minWidth: wrapperRef.current?.offsetWidth }}
        >
          {searchable && (
            <div className="p-2 border-b border-gray-100 dark:border-gray-800/60">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setHighlight(0); }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search…"
                  className="w-full h-8 pl-7 pr-2 text-xs rounded-md bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 dark:focus:border-brand-500 text-gray-700 dark:text-gray-200"
                />
              </div>
            </div>
          )}

          <ul
            ref={listRef}
            role="listbox"
            className="max-h-64 overflow-y-auto py-1 custom-scrollbar"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-gray-400 text-center">No results</li>
            ) : (
              filtered.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isHighlighted = idx === highlight;
                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => !opt.disabled && handleSelect(opt.value)}
                    onMouseEnter={() => setHighlight(idx)}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer transition-colors',
                      opt.disabled && 'opacity-40 cursor-not-allowed',
                      isHighlighted && !opt.disabled && 'bg-brand-50 dark:bg-brand-500/10',
                      isSelected && 'text-brand-700 dark:text-brand-300 font-medium',
                      !isSelected && 'text-gray-700 dark:text-gray-300'
                    )}
                  >
                    {opt.icon && (
                      <span className="flex-shrink-0 text-gray-500 dark:text-gray-400">{opt.icon}</span>
                    )}
                    <span className="flex-1 min-w-0">
                      <span className="block truncate">{opt.label}</span>
                      {opt.description && (
                        <span className="block text-[11px] text-gray-400 truncate">{opt.description}</span>
                      )}
                    </span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400 flex-shrink-0" />
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
