import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

// ─── INFRA CARD ───────────────────────────────────────────────────────────────

interface InfraCardProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  headerRight?: React.ReactNode;
  headerGradientFrom?: string;
  headerGradientTo?: string;
  children: React.ReactNode;
  className?: string;
}

export const InfraCard: React.FC<InfraCardProps> = ({
  title,
  subtitle,
  icon,
  headerRight,
  headerGradientFrom = 'from-slate-50/50',
  headerGradientTo = 'to-indigo-50/10 dark:to-slate-900/10',
  children,
  className = ''
}) => {
  return (
    <Card className={`rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-950 ${className}`}>
      <CardHeader className={`bg-gradient-to-r ${headerGradientFrom} ${headerGradientTo} dark:from-slate-900/60 border-b border-slate-100 dark:border-slate-800/80 pb-4`}>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {icon}
              {title}
            </CardTitle>
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {subtitle}
              </p>
            )}
          </div>
          {headerRight && <div className="shrink-0">{headerRight}</div>}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {children}
      </CardContent>
    </Card>
  );
};
