import { useRef, useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function Dropdown({
  id,
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  disabled = false,
  className,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setIsOpen(true);
        }
        return;
      }

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setHighlightedIndex(prev =>
            prev < options.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
          break;
        case 'Enter':
          event.preventDefault();
          if (highlightedIndex >= 0) {
            onChange(options[highlightedIndex].value);
            setIsOpen(false);
            setHighlightedIndex(-1);
          }
          break;
        case 'Escape':
          event.preventDefault();
          setIsOpen(false);
          setHighlightedIndex(-1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, highlightedIndex, options, onChange]);

  return (
    <div ref={dropdownRef} className="relative w-full">
      <button
        ref={buttonRef}
        id={id}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'input w-full flex items-center justify-between cursor-pointer transition-all',
          disabled && 'opacity-50 cursor-not-allowed',
          isOpen && 'ring-2 ring-brand-500 border-brand-500',
          className
        )}
      >
        <span className={selectedOption ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          className={cn(
            'w-4 h-4 transition-transform duration-200 flex-shrink-0',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <ul className="max-h-60 overflow-y-auto">
            {options.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                No options available
              </li>
            ) : (
              options.map((option, index) => (
                <li key={option.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                      setHighlightedIndex(-1);
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={cn(
                      'w-full text-left px-3 py-2.5 text-sm transition-colors duration-75',
                      highlightedIndex === index
                        ? 'bg-brand-500/10 text-brand-700 dark:text-brand-400'
                        : value === option.value
                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400'
                        : 'text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700'
                    )}
                  >
                    {option.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
