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

  // Debounce search query for external search
  const debouncedSearch = useDebounce(searchQuery, searchDelay);

  // Handle external search
  useEffect(() => {
    if (onSearch && isOpen) {
      onSearch(debouncedSearch);
    }
  }, [debouncedSearch, onSearch, isOpen]);

  // Derived selected option
  const selectedOption = useMemo(() => 
    options.find((opt) => opt.value === value) || 
    (value ? { label: value, value } : null),
    [options, value]
  );

  // Sync searchQuery with selection when closed or selection changes
  useEffect(() => {
    if (!isOpen && selectedOption) {
      setSearchQuery(selectedOption.label);
    } else if (!isOpen && !selectedOption) {
      setSearchQuery('');
    }
  }, [selectedOption, isOpen]);

  // Filter options internally
  const filteredOptions = useMemo(() => {
    if (onSearch) return options;
    if (!searchQuery) return options;
    
    const isExactMatch = selectedOption && searchQuery === selectedOption.label;
    if (isOpen && isExactMatch) return options;

    return options.filter((opt) =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [options, searchQuery, onSearch, isOpen, selectedOption]);

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
        width: Math.max(rect.width, 180),
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
          'flex h-9 w-full items-center rounded-md border border-gray-300 bg-white text-sm ring-offset-white focus-within:ring-2 focus-within:ring-slate-400 focus-within:border-slate-400 focus-within:ring-offset-2 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:ring-offset-gray-950 dark:focus-within:ring-blue-600 dark:focus-within:border-blue-600 relative transition-all duration-200',
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
          <Search className="h-4 w-4 text-slate-600 dark:text-slate-400" />
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
          className="flex-1 h-full bg-transparent outline-none placeholder:text-slate-500 dark:placeholder:text-slate-500 text-slate-900 dark:text-slate-100 min-w-0 text-sm pl-10 pr-10"
          style={{ color: (selectedOption as any)?.warna || undefined, fontWeight: (selectedOption as any)?.warna ? 'bold' : 'normal' }}
          autoComplete="off"
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1 shrink-0">
          {value && !disabled && clearable && (
            <div 
                role="button"
                onClick={handleClear}
                aria-label="Bersihkan pilihan"
                className="rounded-full p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer pointer-events-auto"
            >
                <X className="h-3 w-3 text-slate-600 dark:text-slate-400" />
            </div>
          )}
          <ChevronDown className={cn("h-4 w-4 text-slate-600 dark:text-slate-400 transition-transform pointer-events-none", isOpen && "transform rotate-180")} />
        </div>
      </div>

      {isOpen && ReactDOM.createPortal(
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="rounded-md border border-gray-200 bg-white text-gray-900 shadow-2xl outline-none animate-in fade-in-0 zoom-in-95 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 max-h-[300px] overflow-y-auto"
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
                <span className="truncate whitespace-nowrap" style={{ color: option.warna || undefined, fontWeight: option.warna ? 'bold' : 'normal' }}>{option.label}</span>
              </div>
            ))
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

