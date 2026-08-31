import React from 'react';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import { cn } from '@/lib/utils';

export interface CleanDeckCardProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  avatar?: React.ReactNode;
  avatarColor?: string;
  onDetail?: (e: React.MouseEvent) => void;
  detailLabel?: string;
  onClick?: (e: React.MouseEvent) => void;
  selected?: boolean;
  onSelect?: (checked: boolean) => void;
  className?: string;
  children?: React.ReactNode;
  showDetailButton?: boolean;
}

export const CleanDeckCard = React.memo<CleanDeckCardProps>(function CleanDeckCard({
  title,
  subtitle,
  badge,
  avatar,
  detailLabel = 'Detail',
  onDetail,
  onClick,
  selected = false,
  onSelect,
  className,
  children,
  showDetailButton = true,
}) {
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick(e);
    } else if (onDetail) {
      onDetail(e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (onClick) {
        onClick(e as any);
      } else if (onDetail) {
        onDetail(e as any);
      }
    }
  };

  const isInteractive = Boolean(onClick || onDetail);

  return (
    <div
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={isInteractive ? handleClick : undefined}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
      className={cn(
        "p-3.5 bg-white dark:bg-slate-900 rounded-2xl border transition-all shadow-xs flex items-center justify-between gap-3 select-none",
        selected
          ? "border-blue-500/50 bg-blue-50/20 dark:bg-blue-950/20 ring-1 ring-blue-500/30"
          : "border-slate-200/70 dark:border-slate-800",
        isInteractive && "hover:border-slate-300 dark:hover:border-slate-700 active:scale-[0.99] cursor-pointer",
        className
      )}
    >
      {/* Checkbox if bulk select enabled */}
      {onSelect && (
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onSelect(!!checked)}
            aria-label="Pilih item"
          />
        </div>
      )}

      {/* Optional Avatar (only if provided) */}
      {avatar && (
        <div className="shrink-0">
          {avatar}
        </div>
      )}

      {/* Main Content Area (Wide, unconstrained, full width) */}
      <div className="min-w-0 flex-1 flex flex-col justify-center gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-snug">
            {title}
          </span>
          {badge && (
            <div className="shrink-0">
              {badge}
            </div>
          )}
        </div>
        {subtitle && (
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-normal">
            {subtitle}
          </div>
        )}
      </div>

      {/* Right Side: Detail Button only */}
      {(showDetailButton && (onDetail || onClick)) || children ? (
        <div className="flex items-center gap-2 shrink-0 ml-1">
          {children}
          {showDetailButton && (onDetail || onClick) && (
            <Button
              size="xs"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                if (onDetail) onDetail(e);
                else if (onClick) onClick(e);
              }}
              aria-label={typeof title === 'string' ? `Detail ${title}` : 'Detail'}
              className="rounded-xl px-3.5 py-1.5 font-bold text-xs border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            >
              {detailLabel}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
});

export default CleanDeckCard;
