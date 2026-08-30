import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { cn } from '@/lib/utils';
import { ChevronDown, Search, X, Check, Loader2 } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

export interface SearchableSelectOption {
  label: string;
  value: string;
  [key: string]: any;
}

interface SearchableSelectProps {
  id?: string;
  value?: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  isLoading?: boolean;
  clearable?: boolean;
  onSearch?: (query: string) => void;
  searchDelay?: number;
}

export function SearchableSelect({
  id,
  value,
  onValueChange,
  options,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No options found.',
  disabled = false,
  className,
  triggerClassName,
  isLoading = false,
  clearable = false,
  onSearch,
  searchDelay = 300,
}: SearchableSelectProps & { triggerClassName?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const getSafeLabel = (opt: any): string => {
    if (!opt) return '';
    if (typeof opt.label === 'string') return opt.label;
    if (typeof opt.label === 'number') return String(opt.label);
    if (opt.label && typeof opt.label === 'object' && opt.label.name) return String(opt.label.name);
    if (typeof opt.value === 'string') return opt.value;
    return String(opt.label ?? opt.value ?? '');
  };

  // Debounce search query for external search
  const debouncedSearch = useDebounce(searchQuery, searchDelay);

  // Handle external search
  useEffect(() => {
    if (onSearch && isOpen) {
      onSearch(debouncedSearch);
    }
  }, [debouncedSearch, onSearch, isOpen]);

  // Derived selected option
  const selectedOption = useMemo(() => {
    if (!value) return null;
    const targetVal = String(value).toLowerCase();
    const found = options.find((opt) => String(opt.value).toLowerCase() === targetVal || getSafeLabel(opt).toLowerCase() === targetVal);
    if (found) return found;
    return null;
  }, [options, value]);

  const selectedLabel = selectedOption ? getSafeLabel(selectedOption) : '';

  // Reset searchQuery when options change or value is cleared
  useEffect(() => {
    const targetVal = String(value || '').toLowerCase();
    if (!value || (options.length > 0 && !options.some(opt => String(opt.value).toLowerCase() === targetVal || getSafeLabel(opt).toLowerCase() === targetVal))) {
      setSearchQuery('');
    } else if (!isOpen) {
      setSearchQuery(selectedLabel);
    }
  }, [options, value, selectedLabel, isOpen]);

  // Sync searchQuery with selection when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery(selectedLabel);
    }
  }, [selectedLabel, isOpen]);

  // Filter options internally
  const filteredOptions = useMemo(() => {
    if (onSearch) return options;
    if (!searchQuery) return options;
    
    const isExactMatch = selectedOption && searchQuery === selectedLabel;
    if (isOpen && isExactMatch) return options;

    const query = searchQuery.toLowerCase();
    return options.filter((opt) =>
      getSafeLabel(opt).toLowerCase().includes(query)
    );
  }, [options, searchQuery, onSearch, isOpen, selectedOption, selectedLabel]);

  // Click outside & Escape key to auto-close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (!target) return;

      const isInsideTrigger = containerRef.current?.contains(target);
      const isInsideDropdown = dropdownRef.current?.contains(target);

      if (!isInsideTrigger && !isInsideDropdown) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Recalculate portal dropdown position whenever it opens or viewport scrolls
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const updatePos = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropHeight = Math.min(300, filteredOptions.length * 38 + 50);
      const openUpward = spaceBelow < dropHeight && spaceAbove > spaceBelow;
      setDropdownStyle({
        position: 'fixed',
        left: rect.left,
        minWidth: Math.max(rect.width, 320),
        width: 'max-content',
        maxWidth: Math.min(window.innerWidth - rect.left - 16, 520),
        zIndex: 99999,
        ...(openUpward
          ? { bottom: window.innerHeight - rect.top + 4 }
          : { top: rect.bottom + 4 }),
      });
    };
    updatePos();
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [isOpen, filteredOptions.length]);


  const handleSelect = (val: string, label: string) => {
    onValueChange(val);
    setSearchQuery(label);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange('');
    setSearchQuery('');
    inputRef.current?.focus();
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full',
        className
      )}
    >
      <div
        className={cn(
          'flex h-10 w-full items-center rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-[13px] font-semibold ring-offset-white focus-within:ring-1 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 focus-within:bg-white dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:ring-offset-gray-950 dark:focus-within:ring-emerald-500/20 dark:focus-within:border-emerald-500 dark:focus-within:bg-slate-900 relative transition-all duration-200',
          disabled && 'cursor-not-allowed opacity-50',
          triggerClassName
        )}
        onClick={() => {
          if (!disabled) {
            inputRef.current?.focus();
            setIsOpen(true);
          }
        }}
      >
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400 dark:text-slate-500" />
        </div>
        <input
          id={id}
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          aria-label={placeholder || searchPlaceholder || "Pilih opsi"}
          disabled={disabled}
          className="flex-1 h-full bg-transparent outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-800 dark:text-slate-100 min-w-0 text-xs sm:text-[13px] font-semibold pl-10 pr-10 truncate"
          style={{ color: (selectedOption as any)?.warna || undefined, fontWeight: (selectedOption as any)?.warna ? 'bold' : 'normal' }}
          autoComplete="off"
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1 shrink-0">
          {value && !disabled && clearable && (
            <div 
                role="button"
                onClick={handleClear}
                aria-label="Bersihkan pilihan"
                className="rounded-full p-0.5 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer pointer-events-auto text-slate-400 hover:text-slate-600"
            >
                <X className="h-3 w-3" />
            </div>
          )}
          <ChevronDown className={cn("h-4 w-4 text-slate-400 dark:text-slate-500 transition-transform pointer-events-none", isOpen && "transform rotate-180")} />
        </div>
      </div>

      {isOpen && ReactDOM.createPortal(
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="rounded-2xl border border-slate-200/80 bg-white text-slate-900 shadow-2xl outline-none animate-in fade-in-0 zoom-in-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 max-h-[300px] overflow-y-auto p-1.5"
        >
          {isLoading && (
             <div className="p-2 flex items-center justify-center text-sm text-gray-500">
               <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
             </div>
          )}
          {!isLoading && filteredOptions.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              {emptyMessage}
            </div>
          ) : (
              !isLoading && filteredOptions.map((option, idx) => (
              <div
                key={option.value || idx}
                onClick={(e) => {
                   e.stopPropagation(); 
                   if (!option.disabled) handleSelect(option.value, option.label);
                }}
                data-disabled={option.disabled}
                className={cn(
                  'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-100 dark:hover:bg-gray-700 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full overflow-hidden pr-4',
                  value === option.value && 'bg-gray-100 dark:bg-gray-700 font-medium',
                  option.disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4 shrink-0',
                    (value && option.value && value === option.value) ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <div className="flex items-center justify-between w-full min-w-0 gap-2">
                  <div className="flex items-center gap-2 min-w-0 truncate">
                    {option.statusDotClass && (
                      <span className={cn("w-2 h-2 rounded-full shrink-0", option.statusDotClass)} />
                    )}
                    <span className="truncate whitespace-nowrap text-slate-800 dark:text-slate-100 font-medium">
                      {option.label}
                    </span>
                  </div>
                  {option.rightBadge && (
                    <span className={cn("text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-md shrink-0", option.rightBadgeClass)}>
                      {option.rightBadge}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

