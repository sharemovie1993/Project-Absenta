import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  placement?: TooltipPlacement;
  className?: string;
  style?: React.CSSProperties;
}

export default function Tooltip({
  content,
  children,
  placement = 'top',
  className,
  style,
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    actualPlacement: TooltipPlacement;
  }>({
    top: 0,
    left: 0,
    actualPlacement: placement,
  });

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    let currentPlacement = placement;

    // Auto-flip jika dekat batas atas atau bawah viewport
    if (placement === 'top' && rect.top < 140) {
      currentPlacement = 'bottom';
    } else if (placement === 'bottom' && window.innerHeight - rect.bottom < 140) {
      currentPlacement = 'top';
    }

    let top = 0;
    let left = 0;

    if (currentPlacement === 'top') {
      top = rect.top - 8;
      left = rect.left + rect.width / 2;
    } else if (currentPlacement === 'bottom') {
      top = rect.bottom + 8;
      left = rect.left + rect.width / 2;
    } else if (currentPlacement === 'left') {
      top = rect.top + rect.height / 2;
      left = rect.left - 8;
    } else {
      top = rect.top + rect.height / 2;
      left = rect.right + 8;
    }

    // Hindari terpotong batas kiri/kanan layar
    const safeLeft = Math.max(160, Math.min(window.innerWidth - 160, left));

    setCoords({ top, left: safeLeft, actualPlacement: currentPlacement });
  }, [placement]);

  useEffect(() => {
    if (open) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [open, updatePosition]);

  return (
    <>
      <div
        ref={triggerRef}
        style={style}
        className={`inline-flex items-center ${className || ''}`}
        onMouseEnter={() => {
          updatePosition();
          setOpen(true);
        }}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => {
          updatePosition();
          setOpen(true);
        }}
        onBlur={() => setOpen(false)}
      >
        {children}
      </div>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="tooltip"
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              transform:
                coords.actualPlacement === 'top'
                  ? 'translate(-50%, -100%)'
                  : coords.actualPlacement === 'bottom'
                  ? 'translate(-50%, 0)'
                  : coords.actualPlacement === 'left'
                  ? 'translate(-100%, -50%)'
                  : 'translate(0, -50%)',
              zIndex: 99999,
              maxWidth: '320px',
              width: 'max-content',
            }}
            className="pointer-events-none rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 text-xs text-slate-700 dark:text-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          >
            {content}
          </div>,
          document.body
        )}
    </>
  );
}
