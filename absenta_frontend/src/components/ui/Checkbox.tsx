import React from 'react';
import { cn } from '@/lib/utils';
import { CheckIcon, MinusIcon } from '@heroicons/react/24/outline';

interface CheckboxProps {
  id?: string;
  checked: boolean | 'indeterminate';
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}

export function Checkbox({ 
  id, 
  checked, 
  onCheckedChange, 
  disabled = false, 
  className,
  label,
  ...props
}: CheckboxProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const isChecked = checked === true;
  const isIndeterminate = checked === 'indeterminate';

  return (
    <div className="flex items-center space-x-2">
      <button
        id={id}
        type="button"
        role="checkbox"
        aria-checked={checked === 'indeterminate' ? 'mixed' : checked}
        disabled={disabled}
        {...props}
        onClick={() => {
            // Logic: if indeterminate or unchecked -> make it checked. If checked -> make it unchecked.
            // Or usually: Indeterminate -> Checked -> Unchecked
            // But simpler: Indeterminate/Unchecked -> Checked. Checked -> Unchecked.
            if (isIndeterminate) {
                onCheckedChange(true);
            } else {
                onCheckedChange(!isChecked);
            }
        }}
        className={cn(
          'relative inline-flex h-4 w-4 items-center justify-center rounded border transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 dark:focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed',
          (isChecked || isIndeterminate)
            ? 'bg-blue-600 border-blue-600 dark:bg-blue-600 dark:border-blue-600' 
            : 'bg-white border-gray-400 hover:bg-gray-50 dark:bg-gray-950 dark:border-gray-400 dark:hover:bg-gray-900',
          className
        )}
      >
        {isChecked && (
          <CheckIcon className="h-3 w-3 text-white" />
        )}
        {isIndeterminate && (
            <MinusIcon className="h-3 w-3 text-white" />
        )}
      </button>
      {label && (
        <label 
          htmlFor={id}
          className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
        >
          {label}
        </label>
      )}
    </div>
  );
}

export default Checkbox;
