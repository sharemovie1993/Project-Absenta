import React from 'react';
import { cn } from '@/lib/utils';

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  className?: string;
  children: React.ReactNode;
}

export function Label({ className, children, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        'text-[11px] font-bold text-slate-700 dark:text-slate-300 block leading-tight peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-1',
        className
      )}
      {...props}
    >
      {children}
    </label>
  );
}

export default Label;
