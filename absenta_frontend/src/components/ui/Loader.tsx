import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const loaderVariants = cva('', {
  variants: {
    size: {
      sm: 'w-4 h-4',
      default: 'w-6 h-6',
      lg: 'w-8 h-8',
      xl: 'w-12 h-12',
    },
    color: {
      primary: 'text-primary',
      secondary: 'text-secondary-foreground',
      white: 'text-white',
      muted: 'text-muted-foreground',
    },
  },
  defaultVariants: {
    size: 'default',
    color: 'primary',
  },
});

export interface LoaderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'>,
    VariantProps<typeof loaderVariants> {
  type?: 'spinner' | 'dots' | 'pulse' | 'bars';
  text?: string;
}

// Spinner Loader (Pure GPU-accelerated CSS spin)
function SpinnerLoader({ size, color, className }: { 
  size?: VariantProps<typeof loaderVariants>['size'];
  color?: VariantProps<typeof loaderVariants>['color'];
  className?: string;
}) {
  return (
    <div
      className={cn(
        loaderVariants({ size, color }),
        'border-2 border-current border-t-transparent rounded-full animate-spin',
        className
      )}
    />
  );
}

// Dots Loader (Pure CSS pulse)
function DotsLoader({ size, color, className }: { 
  size?: VariantProps<typeof loaderVariants>['size'];
  color?: VariantProps<typeof loaderVariants>['color'];
  className?: string;
}) {
  const dotSize = {
    sm: 'w-1 h-1',
    default: 'w-1.5 h-1.5',
    lg: 'w-2 h-2',
    xl: 'w-3 h-3',
  };

  return (
    <div className={cn('flex space-x-1 items-center', className)}>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={cn(
            dotSize[size || 'default'],
            'bg-current rounded-full animate-pulse',
            loaderVariants({ color })
          )}
          style={{ animationDelay: `${index * 150}ms` }}
        />
      ))}
    </div>
  );
}

// Pulse Loader
function PulseLoader({ size, color, className }: { 
  size?: VariantProps<typeof loaderVariants>['size'];
  color?: VariantProps<typeof loaderVariants>['color'];
  className?: string;
}) {
  return (
    <div
      className={cn(loaderVariants({ size, color }), 'bg-current rounded-full animate-ping', className)}
    />
  );
}

// Bars Loader
function BarsLoader({ size, color, className }: { 
  size?: VariantProps<typeof loaderVariants>['size'];
  color?: VariantProps<typeof loaderVariants>['color'];
  className?: string;
}) {
  const barHeight = {
    sm: 'h-3',
    default: 'h-4',
    lg: 'h-6',
    xl: 'h-8',
  };

  const barWidth = {
    sm: 'w-0.5',
    default: 'w-1',
    lg: 'w-1.5',
    xl: 'w-2',
  };

  return (
    <div className={cn('flex items-end space-x-1', className)}>
      {[0, 1, 2, 3].map((index) => (
        <div
          key={index}
          className={cn(
            barWidth[size || 'default'],
            barHeight[size || 'default'],
            'bg-current animate-pulse',
            loaderVariants({ color })
          )}
          style={{ animationDelay: `${index * 120}ms` }}
        />
      ))}
    </div>
  );
}

function Loader({ 
  type = 'spinner', 
  size, 
  color, 
  text, 
  className, 
  ...props 
}: LoaderProps) {
  const renderLoader = () => {
    const defaultColor = (color || 'primary') as VariantProps<typeof loaderVariants>['color'];
    switch (type) {
      case 'dots':
        return <DotsLoader size={size} color={defaultColor} />;
      case 'pulse':
        return <PulseLoader size={size} color={defaultColor} />;
      case 'bars':
        return <BarsLoader size={size} color={defaultColor} />;
      default:
        return <SpinnerLoader size={size} color={defaultColor} />;
    }
  };

  return (
    <div 
      role="status"
      aria-label={text || "Loading"}
      className={cn('flex items-center justify-center', className)} 
      {...props}
    >
      <div className="flex flex-col items-center space-y-2">
        {renderLoader()}
        {text && (
          <p className={cn('text-sm', loaderVariants({ color: (color || 'primary') as VariantProps<typeof loaderVariants>['color'] }))}>
            {text}
          </p>
        )}
      </div>
    </div>
  );
}

// Full Page Loader
export function PageLoader({ 
  text = 'Loading...', 
  type = 'spinner',
  size = 'lg',
  className 
}: {
  text?: string;
  type?: LoaderProps['type'];
  size?: LoaderProps['size'];
  className?: string;
}) {
  return (
    <div className={cn(
      'fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm',
      className
    )}>
      <Loader type={type} size={size} text={text} />
    </div>
  );
}

// Inline Loader for buttons
export function ButtonLoader({ 
  size = 'sm',
  className 
}: {
  size?: LoaderProps['size'];
  className?: string;
}) {
  return (
    <SpinnerLoader 
      size={size} 
      color="white" 
      className={cn('mr-2', className)} 
    />
  );
}

// Card Loader for loading states in cards
export function CardLoader({ 
  text = 'Loading...',
  type = 'spinner',
  className 
}: {
  text?: string;
  type?: LoaderProps['type'];
  className?: string;
}) {
  return (
    <div className={cn(
      'flex items-center justify-center p-8 bg-card rounded-lg border',
      className
    )}>
      <Loader type={type} text={text} />
    </div>
  );
}

export { Loader, loaderVariants };
export default Loader;
