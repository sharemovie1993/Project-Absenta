import React from 'react';
import { cn } from '../../lib/utils';
import { Button } from './Button';
import { CheckCircle2, SearchX, ArrowRight, type LucideIcon } from 'lucide-react';

interface FeedbackProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const SuccessState: React.FC<FeedbackProps> = ({
  title,
  description,
  action,
  secondaryAction,
  className
}) => {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center animate-in fade-in zoom-in duration-500", className)}>
      <div className="w-20 h-20 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 mb-6 shadow-sm border border-emerald-500/20">
        <CheckCircle2 size={40} className="stroke-[1.5]" />
      </div>
      
      <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight mb-2">{title}</h3>
      {description && (
        <p className="text-sm font-medium text-slate-500 max-w-sm mb-8 leading-relaxed">
          {description}
        </p>
      )}

      <div className="flex items-center gap-3">
        {secondaryAction && (
          <Button variant="ghost" onClick={secondaryAction.onClick} className="h-11 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest">
            {secondaryAction.label}
          </Button>
        )}
        {action && (
          <Button onClick={action.onClick} className="h-11 px-8 rounded-xl font-black text-[10px] uppercase tracking-widest gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20">
            {action.label}
            {action.icon ? <action.icon size={14} /> : <ArrowRight size={14} />}
          </Button>
        )}
      </div>
    </div>
  );
};

export const EmptyState: React.FC<FeedbackProps & { icon?: LucideIcon }> = ({
  title,
  description,
  action,
  secondaryAction,
  icon: Icon = SearchX,
  className
}) => {
  return (
    <div className={cn("flex flex-col items-center justify-center py-20 px-4 text-center", className)}>
      <div className="w-24 h-24 bg-slate-50 dark:bg-slate-900/50 rounded-3xl flex items-center justify-center text-slate-300 dark:text-slate-700 mb-8 border border-slate-100 dark:border-slate-800/50">
        <Icon size={48} className="stroke-[1]" />
      </div>
      
      <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight mb-2">{title}</h3>
      {description && (
        <p className="text-[11px] font-bold text-slate-400 max-w-xs mb-8 uppercase tracking-widest leading-loose">
          {description}
        </p>
      )}

      <div className="flex items-center gap-3">
        {secondaryAction && (
          <Button variant="outline" onClick={secondaryAction.onClick} className="h-10 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest border-slate-200 dark:border-slate-800">
            {secondaryAction.label}
          </Button>
        )}
        {action && (
          <Button onClick={action.onClick} className="h-10 px-8 rounded-xl font-black text-[10px] uppercase tracking-widest gap-2">
            {action.label}
            {action.icon ? <action.icon size={14} /> : <ArrowRight size={14} />}
          </Button>
        )}
      </div>
    </div>
  );
};
