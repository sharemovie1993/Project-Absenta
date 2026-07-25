import React, { useState } from 'react';

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  placement?: TooltipPlacement;
  className?: string;
  style?: React.CSSProperties;
}

export default function Tooltip({ content, children, placement = 'top', className, style }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const pos = (() => {
    if (placement === 'top') return 'bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2';
    if (placement === 'bottom') return 'top-[calc(100%+8px)] left-1/2 -translate-x-1/2';
    if (placement === 'left') return 'right-[calc(100%+8px)] top-1/2 -translate-y-1/2';
    return 'left-[calc(100%+8px)] top-1/2 -translate-y-1/2';
  })();
  return (
    <div
      style={style}
      className={`relative ${className || ''}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <div
          role="tooltip"
          className="absolute pos z-10 bg-white text-gray-700 text-xs px-2 py-1 rounded border border-gray-200 shadow dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700"
          style={{
            bottom: placement === 'top' ? 'calc(100% + 8px)' : undefined,
            top: placement === 'bottom' ? 'calc(100% + 8px)' : (placement !== 'top' ? '50%' : undefined),
            left: (placement === 'top' || placement === 'bottom') ? '50%' : (placement === 'right' ? 'calc(100% + 8px)' : undefined),
            right: placement === 'left' ? 'calc(100% + 8px)' : undefined,
            transform: (placement === 'top' || placement === 'bottom') ? 'translateX(-50%)' : 'translateY(-50%)',
            whiteSpace: 'normal',
            width: 'max-content',
            maxWidth: '280px',
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}
