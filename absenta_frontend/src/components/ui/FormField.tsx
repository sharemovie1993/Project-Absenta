import React from 'react';
// UseFormRegister tidak tersedia di react-hook-form v7
import { type Control, Controller } from 'react-hook-form';
import { cn } from '../../lib/utils';
import { SearchableSelect } from './SearchableSelect';
import { Switch } from './Switch';
import { Checkbox } from './Checkbox';

type RegisterFn<T extends Record<string, unknown>> = (name: keyof T | string, options?: Record<string, unknown>) => Record<string, unknown>;

interface FormFieldProps<T extends Record<string, unknown>> {
  name: keyof T;
  label: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'date' | 'textarea' | 'select' | 'switch';
  placeholder?: string;
  register: RegisterFn<T>;
  control?: Control<T>;
  error?: { message?: string };
  required?: boolean;
  disabled?: boolean;
  className?: string;
  options?: { value: string; label: string }[];
  rows?: number;
  min?: number;
  max?: number;
  step?: number;
}

export function FormField<T extends Record<string, unknown>>({
  name,
  label,
  type = 'text',
  placeholder,
  register,
  control,
  error,
  required = false,
  disabled = false,
  className,
  options,
  rows = 3,
  min,
  max,
  step
}: FormFieldProps<T>) {
  const baseInputClasses = cn(
    'w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm',
    'bg-white text-gray-900 placeholder-gray-500',
    'dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400',
    'focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 dark:focus:ring-blue-500 dark:focus:border-blue-500',
    'disabled:bg-gray-100 disabled:cursor-not-allowed dark:disabled:bg-gray-900',
    error && 'border-red-500 focus:ring-red-500 focus:border-red-500',
    className
  );

  const renderInput = () => {
    switch (type) {
      case 'textarea':
        return (
          <textarea
            {...register(name)}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            className={baseInputClasses}
          />
        );

      case 'select':
        if (control) {
          return (
            <Controller
              control={control}
              name={name as any}
              render={({ field }) => (
                <SearchableSelect
                  value={field.value?.toString() || ''}
                  onValueChange={field.onChange}
                  options={options || []}
                  placeholder={`Pilih ${label}`}
                  disabled={disabled}
                  className={className}
                  triggerClassName={error ? 'border-red-500' : ''}
                />
              )}
            />
          );
        }
        return (
          <div className="text-red-500 text-sm">
            Error: Control prop is required for select fields
          </div>
        );

      case 'number':
        return (
          <input
            {...register(name, { valueAsNumber: true })}
            type="number"
            placeholder={placeholder}
            disabled={disabled}
            min={min}
            max={max}
            step={step}
            className={baseInputClasses}
          />
        );

      case 'date':
        return (
          <input
            {...register(name, { valueAsDate: true })}
            type="date"
            disabled={disabled}
            className={baseInputClasses}
          />
        );

      case 'switch':
        if (control) {
          return (
            <Controller
              control={control}
              name={name as any}
              render={({ field }) => (
                <Switch
                  checked={!!field.value}
                  onCheckedChange={field.onChange}
                  disabled={disabled}
                  className={className}
                />
              )}
            />
          );
        }
        return (
          <div className="text-red-500 text-sm">
            Error: Control prop is required for switch fields
          </div>
        );

      default:
        return (
          <input
            {...register(name)}
            type={type}
            placeholder={placeholder}
            disabled={disabled}
            className={baseInputClasses}
          />
        );
    }
  };

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {renderInput()}
      {error && (
        <p className="text-sm text-red-600 mt-1">
          {error.message}
        </p>
      )}
    </div>
  );
}

// Checkbox component for boolean fields
interface FormCheckboxProps<T extends Record<string, unknown>> {
  name: keyof T;
  label: string;
  register: RegisterFn<T>;
  error?: { message?: string };
  disabled?: boolean;
  className?: string;
}

export function FormCheckbox<T extends Record<string, unknown>>({
  name,
  label,
  control,
  register,
  error,
  disabled = false,
  className
}: FormCheckboxProps<T> & { control?: Control<T> }) {
  if (control) {
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        <Controller
          control={control}
          name={name as any}
          render={({ field }) => (
            <Checkbox
              checked={!!field.value}
              onCheckedChange={field.onChange}
              disabled={disabled}
              label={label}
            />
          )}
        />
        {error && (
          <p className="text-sm text-red-600 ml-6">
            {error.message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <input
        {...register(name)}
        type="checkbox"
        disabled={disabled}
        className={cn(
          'h-4 w-4 text-blue-600 border-gray-300 rounded',
          'focus:ring-blue-500 focus:ring-2',
          'disabled:cursor-not-allowed',
          error && 'border-red-500'
        )}
      />
      <label className="text-sm font-medium text-gray-700">
        {label}
      </label>
      {error && (
        <p className="text-sm text-red-600 ml-2">
          {error.message}
        </p>
      )}
    </div>
  );
}

// Radio group component
interface FormRadioGroupProps<T extends Record<string, unknown>> {
  name: keyof T;
  label: string;
  options: { value: string; label: string }[];
  register: RegisterFn<T>;
  error?: { message?: string };
  disabled?: boolean;
  className?: string;
}

export function FormRadioGroup<T extends Record<string, unknown>>({
  name,
  label,
  options,
  register,
  error,
  disabled = false,
  className
}: FormRadioGroupProps<T>) {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="space-y-2">
        {options.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <input
              {...register(name)}
              type="radio"
              value={option.value}
              disabled={disabled}
              className={cn(
                'h-4 w-4 text-blue-600 border-gray-300',
                'focus:ring-blue-500 focus:ring-2',
                'disabled:cursor-not-allowed',
                error && 'border-red-500'
              )}
            />
            <label className="text-sm text-gray-700">
              {option.label}
            </label>
          </div>
        ))}
      </div>
      {error && (
        <p className="text-sm text-red-600 mt-1">
          {error.message}
        </p>
      )}
    </div>
  );
}
