import React from 'react';
import { cn } from '../../lib/utils';
import { Label } from './Label';

interface SimpleFormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const SimpleFormField: React.FC<SimpleFormFieldProps> = ({
  label,
  error,
  required = false,
  description,
  children,
  className
}) => {
  return (
    <div className={cn('space-y-1', className)}>
      <Label className={cn('block text-sm font-medium text-gray-500 dark:text-gray-400')}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {description}
        </p>
      )}
      {children}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
          {error}
        </p>
      )}
    </div>
  );
};

export default SimpleFormField;
