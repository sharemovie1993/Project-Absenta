import React, { memo } from 'react';
import { cn } from '@/lib/utils';

export interface SpreadsheetCellInputProps {
  id?: string;
  value: string | number | null | undefined;
  onChange: (val: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  rowIndex?: number;
  colIndex?: number;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  min?: number;
  max?: number;
  kkmThreshold?: number;
  className?: string;
  'aria-label'?: string;
}

export const SpreadsheetCellInput: React.FC<SpreadsheetCellInputProps> = memo(({
  id,
  value,
  onChange,
  onKeyDown,
  placeholder = '-',
  disabled = false,
  readOnly = false,
  min = 0,
  max = 100,
  kkmThreshold,
  className,
  'aria-label': ariaLabel,
}) => {
  const numVal = value !== null && value !== undefined && value !== '' ? Number(value) : null;
  const isOutOfRange = numVal !== null && !isNaN(numVal) && (numVal < min || numVal > max);
  const isBelowKkm = kkmThreshold !== undefined && numVal !== null && !isNaN(numVal) && numVal < kkmThreshold;

  const getVariantStyles = () => {
    if (disabled || readOnly) {
      return 'bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 cursor-default border-transparent';
    }
    if (isOutOfRange) {
      return 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-bold';
    }
    if (isBelowKkm) {
      return 'border-amber-400 bg-amber-50/40 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 font-bold';
    }
    if (numVal !== null && numVal >= (kkmThreshold ?? 75)) {
      return 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold';
    }
    return 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300';
  };

  return (
    <input
      id={id}
      aria-label={ariaLabel}
      type="text"
      inputMode="numeric"
      disabled={disabled}
      readOnly={readOnly}
      value={value ?? ''}
      onChange={(e) => {
        const raw = e.target.value;
        // Hanya izinkan angka atau kosong
        if (raw === '' || /^\d*$/.test(raw)) {
          onChange(raw);
        }
      }}
      onFocus={(e) => {
        if (!readOnly && !disabled) {
          e.target.select?.();
        }
      }}
      onClick={(e) => {
        if (!readOnly && !disabled) {
          (e.target as HTMLInputElement).select?.();
        }
      }}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className={cn(
        'w-full h-7 px-0.5 text-center font-mono text-xs font-bold rounded border transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
        'focus:outline-none focus:ring-1.5 focus:ring-indigo-500 focus:border-indigo-500',
        getVariantStyles(),
        className
      )}
    />
  );
});

SpreadsheetCellInput.displayName = 'SpreadsheetCellInput';
