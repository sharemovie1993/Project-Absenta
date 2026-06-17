import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';
import { 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  X,
  type LucideIcon 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground border-border',
        destructive: 'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive bg-destructive/10',
        success: 'border-green-500/50 text-green-700 dark:text-green-300 dark:border-green-500 [&>svg]:text-green-600 bg-green-50 dark:bg-green-900/20',
        warning: 'border-yellow-500/50 text-yellow-700 dark:text-yellow-300 dark:border-yellow-500 [&>svg]:text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20',
        info: 'border-blue-500/50 text-blue-700 dark:text-blue-300 dark:border-blue-500 [&>svg]:text-blue-600 bg-blue-50 dark:bg-blue-900/20',
      },
      size: {
        default: 'p-4',
        sm: 'p-3 text-sm',
        lg: 'p-6 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, size, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant, size }), className)}
    {...props}
  />
));
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-medium leading-none tracking-tight', className)}
    {...props}
  />
));
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm [&_p]:leading-relaxed', className)}
    {...props}
  />
));
AlertDescription.displayName = 'AlertDescription';

// Enhanced Alert with icon and dismiss functionality
export interface EnhancedAlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  dismissible?: boolean;
  onDismiss?: () => void;
  children?: React.ReactNode;
}

function EnhancedAlert({
  variant = 'default',
  size = 'default',
  title,
  description,
  icon: Icon,
  dismissible = false,
  onDismiss,
  children,
  className,
  ...props
}: EnhancedAlertProps) {
  const [isVisible, setIsVisible] = React.useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  const getDefaultIcon = (): LucideIcon => {
    switch (variant) {
      case 'success':
        return CheckCircle;
      case 'destructive':
        return AlertCircle;
      case 'warning':
        return AlertTriangle;
      case 'info':
        return Info;
      default:
        return Info;
    }
  };

  const IconComponent = Icon || getDefaultIcon();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <Alert variant={variant} size={size} className={className} {...props}>
            <IconComponent className="h-4 w-4" />
            {dismissible && (
              <button
                onClick={handleDismiss}
                className="absolute right-2 top-2 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            )}
            <div className={dismissible ? 'pr-6' : ''}>
              {title && <AlertTitle>{title}</AlertTitle>}
              {description && <AlertDescription>{description}</AlertDescription>}
              {children}
            </div>
          </Alert>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Predefined Alert Components
export function SuccessAlert({ 
  title = 'Success!', 
  description, 
  dismissible = true,
  onDismiss,
  className,
  ...props 
}: Omit<EnhancedAlertProps, 'variant'>) {
  return (
    <EnhancedAlert
      variant="success"
      title={title}
      description={description}
      dismissible={dismissible}
      onDismiss={onDismiss}
      className={className}
      {...props}
    />
  );
}

export function ErrorAlert({ 
  title = 'Error!', 
  description, 
  dismissible = true,
  onDismiss,
  className,
  ...props 
}: Omit<EnhancedAlertProps, 'variant'>) {
  return (
    <EnhancedAlert
      variant="destructive"
      title={title}
      description={description}
      dismissible={dismissible}
      onDismiss={onDismiss}
      className={className}
      {...props}
    />
  );
}

export function WarningAlert({ 
  title = 'Warning!', 
  description, 
  dismissible = true,
  onDismiss,
  className,
  ...props 
}: Omit<EnhancedAlertProps, 'variant'>) {
  return (
    <EnhancedAlert
      variant="warning"
      title={title}
      description={description}
      dismissible={dismissible}
      onDismiss={onDismiss}
      className={className}
      {...props}
    />
  );
}

export function InfoAlert({ 
  title = 'Info', 
  description, 
  dismissible = true,
  onDismiss,
  className,
  ...props 
}: Omit<EnhancedAlertProps, 'variant'>) {
  return (
    <EnhancedAlert
      variant="info"
      title={title}
      description={description}
      dismissible={dismissible}
      onDismiss={onDismiss}
      className={className}
      {...props}
    />
  );
}

// Alert Container for managing multiple alerts
export function AlertContainer({ 
  alerts, 
  className 
}: { 
  alerts: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title?: string;
    description?: string;
    dismissible?: boolean;
  }>;
  className?: string;
}) {
  const [visibleAlerts, setVisibleAlerts] = React.useState(alerts);

  React.useEffect(() => {
    setVisibleAlerts(alerts);
  }, [alerts]);

  const handleDismiss = (id: string) => {
    setVisibleAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const AlertComponent = {
    success: SuccessAlert,
    error: ErrorAlert,
    warning: WarningAlert,
    info: InfoAlert,
  };

  return (
    <div className={cn('space-y-4', className)}>
      {visibleAlerts.map((alert) => {
        const Component = AlertComponent[alert.type];
        return (
          <Component
            key={alert.id}
            title={alert.title}
            description={alert.description}
            dismissible={alert.dismissible}
            onDismiss={() => handleDismiss(alert.id)}
          />
        );
      })}
    </div>
  );
}

export { Alert, AlertTitle, AlertDescription, EnhancedAlert, alertVariants };
export default Alert;
