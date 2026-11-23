import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export interface DebouncedSearchInputProps {
  /** Nilai yang telah di-debounce (biasanya dari state induk) */
  value?: string;
  /** Callback saat nilai hasil debounce berubah */
  onChange: (value: string) => void;
  /** Callback opsional langsung setiap karakter diketik */
  onImmediateChange?: (value: string) => void;
  /** Waktu tunda debounce dalam milidetik (default: 400ms) */
  delay?: number;
  /** Teks placeholder */
  placeholder?: string;
  /** Ukuran input */
  size?: 'sm' | 'md' | 'lg';
  /** Tampilkan spinner saat sedang fetching data di latar belakang */
  isLoading?: boolean;
  /** ClassName untuk container pembungkus */
  className?: string;
  /** ClassName untuk elemen <input> */
  inputClassName?: string;
  /** Menonaktifkan input */
  disabled?: boolean;
  /** Autofocus pada saat komponen dimuat */
  autoFocus?: boolean;
  /** ID atribut input */
  id?: string;
  /** Label aksesibilitas */
  'aria-label'?: string;
}

export const DebouncedSearchInput: React.FC<DebouncedSearchInputProps> = React.memo(({
  value: externalValue = '',
  onChange,
  onImmediateChange,
  delay = 400,
  placeholder = 'Cari data...',
  size = 'md',
  isLoading = false,
  className = '',
  inputClassName = '',
  disabled = false,
  autoFocus = false,
  id = 'debounced-search-input',
  'aria-label': ariaLabel = 'Pencarian',
}) => {
  const [localValue, setLocalValue] = useState<string>(externalValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const isInitialMount = useRef(true);

  // Sinkronisasi saat external value direset dari luar (misal: tombol reset filter)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setLocalValue(externalValue);
  }, [externalValue]);

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== externalValue) {
        onChange(localValue);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [localValue, delay, onChange, externalValue]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalValue(val);
    onImmediateChange?.(val);
  }, [onImmediateChange]);

  const handleClear = useCallback(() => {
    setLocalValue('');
    onChange('');
    onImmediateChange?.('');
    inputRef.current?.focus();
  }, [onChange, onImmediateChange]);

  // Size styling classes
  const sizeClasses = {
    sm: 'h-8 text-xs pl-8 pr-7 rounded-lg',
    md: 'h-10 text-xs sm:text-[13px] pl-9 pr-8 rounded-xl',
    lg: 'h-12 text-sm pl-11 pr-10 rounded-xl',
  }[size];

  const iconSizes = {
    sm: 'w-3.5 h-3.5 left-2.5',
    md: 'w-4 h-4 left-3',
    lg: 'w-5 h-5 left-3.5',
  }[size];

  return (
    <div className={twMerge('relative flex-1 w-full min-w-0', className)}>
      {/* Search Icon */}
      <Search 
        className={twMerge(
          'absolute top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none transition-colors',
          iconSizes
        )} 
        aria-hidden="true"
      />

      {/* Input Field */}
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-label={ariaLabel}
        className={twMerge(
          'w-full bg-slate-50 dark:bg-slate-950/70 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500',
          'outline-none transition-all duration-200 border border-slate-200 dark:border-slate-800',
          'focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20',
          'disabled:opacity-50 disabled:cursor-not-allowed font-medium',
          sizeClasses,
          inputClassName
        )}
      />

      {/* Right Slot: Loading Spinner atau Clear Button */}
      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {isLoading && (
          <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" aria-hidden="true" />
        )}
        {localValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
            title="Hapus pencarian"
            aria-label="Hapus kata kunci pencarian"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
});

DebouncedSearchInput.displayName = 'DebouncedSearchInput';
export default DebouncedSearchInput;
