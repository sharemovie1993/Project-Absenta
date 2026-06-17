import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  hoverable?: boolean;
  gradient?: boolean;
  noPadding?: boolean;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ 
  children, 
  className = '', 
  title, 
  hoverable = false,
  gradient = false,
  noPadding = false,
  onClick
}: CardProps) {
  const baseClasses = cn(
    "bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 transition-all duration-500 relative overflow-hidden",
    (hoverable || !!onClick) && "hover:shadow-2xl hover:scale-[1.01] cursor-pointer",
    gradient && "bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950",
    className
  );

  return (
    <div className={baseClasses} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      {title && (
        <div className="card-header px-4 py-3 sm:px-8 sm:py-6 border-b border-gray-50 dark:border-gray-800/50 flex items-center gap-3">
          <div className="w-1.5 h-6 rounded-full bg-indigo-500" />
          <h3 className="text-base font-black text-gray-900 dark:text-gray-100 uppercase tracking-tight leading-none">{title}</h3>
        </div>
      )}
      <div className={cn(!noPadding && "p-4 sm:p-8")}>
        {children}
      </div>
    </div>
  );
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={cn("card-header px-8 py-6 border-b border-gray-50 dark:border-gray-800/50 flex items-center justify-between", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }: CardTitleProps) {
  return (
    <h3 className={cn("text-lg font-semibold text-gray-900 dark:text-gray-100 tracking-tight", className)}>
      {children}
    </h3>
  );
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return (
    <div className={cn("card-body p-6 text-gray-900 dark:text-gray-100", className)}>
      {children}
    </div>
  );
}

export function CardDescription({ children, className = '' }: CardDescriptionProps) {
  return (
    <p className={cn("text-sm text-gray-700 dark:text-gray-400 leading-relaxed", className)}>
      {children}
    </p>
  );
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={cn("card-footer px-8 py-5 border-t border-gray-50 dark:border-gray-800/50 bg-gray-50/50 dark:bg-slate-900/50 rounded-b-[2rem]", className)}>
      {children}
    </div>
  );
}

export default Card;
