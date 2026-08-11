import React from 'react';
import { cn } from '@/lib/utils';

export interface UnconnectedBadgeProps {
  text?: string;
  className?: string;
}

/**
 * Universal Red Badge for displaying unconnected API fields across the application.
 */
export const UnconnectedBadge: React.FC<UnconnectedBadgeProps> = ({
  text = 'Belum Terhubung ke API',
  className,
}) => {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-mono shrink-0 select-none",
        className
      )}
    >
      {text}
    </span>
  );
};

/**
 * Universal helper function to evaluate any field value:
 * - If API failed to connect (isApiConnected === false): renders Red Badge <UnconnectedBadge />
 * - If API connected but value is null/undefined/empty: renders clean dash "-"
 * - If value is present: renders value (or customConnectedText)
 */
export const renderApiValue = (
  val: any,
  customConnectedText?: React.ReactNode,
  isApiConnected: boolean = true,
  fallbackText: string = 'Belum Terhubung ke API'
): React.ReactNode => {
  if (!isApiConnected) {
    return <UnconnectedBadge text={fallbackText} />;
  }
  if (
    val === undefined ||
    val === null ||
    val === '' ||
    val === '-' ||
    val === 'Belum Terhubung ke API'
  ) {
    return <span className="text-slate-400 font-normal">-</span>;
  }
  return customConnectedText !== undefined ? customConnectedText : val;
};

export default UnconnectedBadge;
