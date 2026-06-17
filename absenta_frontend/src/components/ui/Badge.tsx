import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'badge inline-flex items-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/80',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        success: 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/30',
        warning: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:hover:bg-yellow-900/30',
        error: 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30',
        info: 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30',
      },
      size: {
        default: 'px-2.5 py-0.5 text-xs rounded-lg',
        sm: 'px-2 py-0.5 text-xs rounded-md',
        lg: 'px-3 py-1 text-sm rounded-lg',
        xl: 'px-4 py-1.5 text-base rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  children: React.ReactNode;
}

function Badge({ className, variant, size, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {children}
    </div>
  );
}

// Status Badge component for common status indicators
export function StatusBadge({ 
  status, 
  size = 'default',
  className,
  ...props 
}: {
  status: 'active' | 'inactive' | 'pending' | 'completed' | 'cancelled' | 'draft';
  size?: VariantProps<typeof badgeVariants>['size'];
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  const statusVariants = {
    active: 'success',
    inactive: 'secondary',
    pending: 'warning',
    completed: 'success',
    cancelled: 'error',
    draft: 'outline',
  } as const;

  const statusLabels = {
    active: 'Active',
    inactive: 'Inactive',
    pending: 'Pending',
    completed: 'Completed',
    cancelled: 'Cancelled',
    draft: 'Draft',
  };

  return (
    <Badge 
      variant={statusVariants[status]} 
      size={size}
      className={className}
      {...props}
    >
      {statusLabels[status]}
    </Badge>
  );
}

// Payment Status Badge for payment-specific statuses
export function PaymentStatusBadge({ 
  status, 
  size = 'default',
  className,
  ...props 
}: {
  status: 'paid' | 'unpaid' | 'overdue' | 'partial' | 'refunded' | 'cancelled';
  size?: VariantProps<typeof badgeVariants>['size'];
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  const statusVariants = {
    paid: 'success',
    unpaid: 'warning',
    overdue: 'error',
    partial: 'info',
    refunded: 'secondary',
    cancelled: 'error',
  } as const;

  const statusLabels = {
    paid: 'Paid',
    unpaid: 'Unpaid',
    overdue: 'Overdue',
    partial: 'Partial',
    refunded: 'Refunded',
    cancelled: 'Cancelled',
  };

  return (
    <Badge 
      variant={statusVariants[status]} 
      size={size}
      className={className}
      {...props}
    >
      {statusLabels[status]}
    </Badge>
  );
}

export { Badge, badgeVariants };
export default Badge;
