// Standard Invoice Layout Component

import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

import { animationConfig, cssClasses } from './invoiceLayoutConfig';

interface StandardInvoiceLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  loading?: boolean;
  error?: string | null;
  success?: string | null;
  info?: string | null;
  warning?: string | null;
  onRetry?: () => void;
  className?: string;
  showHeader?: boolean;
  headerActions?: React.ReactNode;
}

const StandardInvoiceLayout: React.FC<StandardInvoiceLayoutProps> = ({
  children,
  title,
  subtitle,
  loading = false,
  error = null,
  success = null,
  info = null,
  warning = null,
  onRetry,
  className = '',
  showHeader = true,
  headerActions
}) => {
  
  // Render alert component
  const renderAlert = (type: 'error' | 'success' | 'info' | 'warning', message: string) => {
    const alertConfig = {
      error: {
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-800',
        iconColor: 'text-red-400',
        icon: <AlertCircle className="h-5 w-5" />,
        buttonBg: 'bg-red-100 hover:bg-red-200',
        buttonText: 'text-red-800'
      },
      success: {
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        textColor: 'text-green-800',
        iconColor: 'text-green-400',
        icon: <CheckCircle className="h-5 w-5" />,
        buttonBg: 'bg-green-100 hover:bg-green-200',
        buttonText: 'text-green-800'
      },
      info: {
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-800',
        iconColor: 'text-blue-400',
        icon: <Info className="h-5 w-5" />,
        buttonBg: 'bg-blue-100 hover:bg-blue-200',
        buttonText: 'text-blue-800'
      },
      warning: {
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        textColor: 'text-yellow-800',
        iconColor: 'text-yellow-400',
        icon: <AlertCircle className="h-5 w-5" />,
        buttonBg: 'bg-yellow-100 hover:bg-yellow-200',
        buttonText: 'text-yellow-800'
      }
    };

    const config = alertConfig[type];

    return (
      <motion.div
        className={`${config.bgColor} border ${config.borderColor} rounded-md p-4 mb-6`}
        {...animationConfig.modalTransition}
      >
        <div className="flex">
          <div className={`${config.iconColor} flex-shrink-0`}>
            {config.icon}
          </div>
          <div className="ml-3 flex-1">
            <div className={`text-sm ${config.textColor}`}>
              <p>{message}</p>
            </div>
            {type === 'error' && onRetry && (
              <div className="mt-4">
                <button
                  onClick={onRetry}
                  className={`${config.buttonBg} ${config.buttonText} font-medium py-2 px-3 rounded-md text-sm transition-colors`}
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                className={`inline-flex rounded-md p-1.5 ${config.iconColor} hover:${config.bgColor} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-${type}-50 focus:ring-${type}-600`}
                onClick={() => {
                  // Handle close alert if needed
                }}
              >
                <span className="sr-only">Dismiss</span>
                <XCircle className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  // Render loading skeleton
  const renderLoadingSkeleton = () => (
    <div className="animate-pulse space-y-4">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        <div className="h-4 bg-gray-200 rounded w-4/6"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-32 bg-gray-200 rounded"></div>
        ))}
      </div>
    </div>
  );

  return (
    <motion.div 
      className={`${className}`}
      {...animationConfig.pageTransition}
    >
      {/* Header */}
      {showHeader && (title || subtitle || headerActions) && (
        <motion.div 
          className="mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between">
            <div>
              {title && (
                <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
              )}
              {subtitle && (
                <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
              )}
            </div>
            {headerActions && (
              <div className="flex items-center space-x-3">
                {headerActions}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Alerts */}
      {error && renderAlert('error', error)}
      {success && renderAlert('success', success)}
      {info && renderAlert('info', info)}
      {warning && renderAlert('warning', warning)}

      {/* Content */}
      <motion.div
        className="relative"
        {...animationConfig.pageTransition}
      >
        {loading ? renderLoadingSkeleton() : children}
      </motion.div>
    </motion.div>
  );
};

// Standard CSS Classes untuk konsistensi
export const standardInvoiceClasses = {
  // Layout
  container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  section: 'mb-8',
  
  // Cards
  card: 'bg-white rounded-lg shadow-sm border border-gray-200',
  cardHeader: 'px-6 py-4 border-b border-gray-200',
  cardBody: 'px-6 py-4',
  cardFooter: 'px-6 py-4 border-t border-gray-200 bg-gray-50',
  
  // Buttons
  button: {
    primary: 'inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors',
    secondary: 'inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors',
    success: 'inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors',
    danger: 'inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors',
    warning: 'inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors'
  },
  
  // Forms
  formGroup: 'mb-4',
  label: 'block text-sm font-medium text-gray-700 mb-2',
  input: 'block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm',
  select: 'block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm',
  textarea: 'block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm',
  checkbox: 'h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded',
  radio: 'h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300',
  
  // Tables
  table: 'min-w-full divide-y divide-gray-200',
  tableHeader: 'bg-gray-50',
  tableHeaderCell: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
  tableBody: 'bg-white divide-y divide-gray-200',
  tableRow: 'hover:bg-gray-50 transition-colors',
  tableCell: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900',
  
  // Badges
  badge: {
    base: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
    gray: 'bg-gray-100 text-gray-800',
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
    purple: 'bg-purple-100 text-purple-800',
    orange: 'bg-orange-100 text-orange-800'
  },
  
  // Status indicators
  status: {
    draft: 'bg-gray-100 text-gray-800 border-gray-300',
    sent: 'bg-blue-100 text-blue-800 border-blue-300',
    paid: 'bg-green-100 text-green-800 border-green-300',
    overdue: 'bg-red-100 text-red-800 border-red-300',
    cancelled: 'bg-orange-100 text-orange-800 border-orange-300'
  },
  
  // Utilities
  loading: 'animate-pulse',
  hidden: 'hidden',
  visible: 'block',
  textTruncate: 'truncate',
  textCenter: 'text-center',
  textRight: 'text-right',
  textLeft: 'text-left',
  
  // Spacing
  spacing: {
    xs: 'space-y-2',
    sm: 'space-y-4',
    md: 'space-y-6',
    lg: 'space-y-8',
    xl: 'space-y-12'
  },
  
  // Grid
  grid: {
    cols1: 'grid grid-cols-1',
    cols2: 'grid grid-cols-1 md:grid-cols-2',
    cols3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    cols4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    cols6: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'
  },
  
  // Gaps
  gap: {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8'
  }
};

export default StandardInvoiceLayout;
export { StandardInvoiceLayout };
