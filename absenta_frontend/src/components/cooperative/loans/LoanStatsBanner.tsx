import React from 'react';
import { Clock, DollarSign, CheckCircle } from 'lucide-react';
import { SectionCard, Button } from '../../ui';
import { cn } from '../../../lib/utils';
import type { StudentMetrics, OperatorMetrics } from './types';

interface LoanStatsBannerProps {
  isStudent: boolean;
  studentMetrics: StudentMetrics | null;
  operatorMetrics: OperatorMetrics | null;
  onPaymentInstructionsOpen: () => void;
}

export const LoanStatsBanner = React.memo<LoanStatsBannerProps>(({
  isStudent,
  studentMetrics,
  operatorMetrics,
  onPaymentInstructionsOpen,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Card 1 */}
      <SectionCard className="p-5 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl relative overflow-hidden flex items-center justify-between transition-transform hover:scale-[1.02]">
        <div className="space-y-1">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            {isStudent ? studentMetrics?.card1Title : operatorMetrics?.card1Title}
          </p>
          <h3 className="text-xl font-extrabold text-slate-850 dark:text-slate-100 leading-tight">
            {isStudent ? studentMetrics?.card1Val : operatorMetrics?.card1Val}
          </h3>
          {isStudent && studentMetrics?.card1Sub && (
            <p className="text-[9px] text-slate-400 font-bold">{studentMetrics.card1Sub}</p>
          )}
        </div>
        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-xl">
          <Clock size={20} />
        </div>
      </SectionCard>

      {/* Card 2 */}
      <SectionCard className="p-5 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl relative overflow-hidden flex items-center justify-between transition-transform hover:scale-[1.02]">
        <div className="space-y-1">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            {isStudent ? studentMetrics?.card2Title : operatorMetrics?.card2Title}
          </p>
          <h3 className="text-xl font-extrabold text-indigo-650 dark:text-indigo-400 leading-tight">
            {isStudent ? studentMetrics?.card2Val : operatorMetrics?.card2Val}
          </h3>
          {isStudent && studentMetrics?.card2Sub && (
            <p className="text-[9px] text-slate-400 font-bold">{studentMetrics.card2Sub}</p>
          )}
        </div>
        <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 rounded-xl">
          <DollarSign size={20} />
        </div>
      </SectionCard>

      {/* Card 3 */}
      <SectionCard className="p-5 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl relative overflow-hidden flex items-center justify-between transition-transform hover:scale-[1.02]">
        <div className="space-y-1 flex-1">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            {isStudent ? studentMetrics?.card3Title : operatorMetrics?.card3Title}
          </p>
          <h3 className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 leading-tight">
            {isStudent ? studentMetrics?.card3Val : operatorMetrics?.card3Val}
          </h3>
          {isStudent && studentMetrics?.card3Sub && (
            <div className="mt-1">
              <span className={cn(
                "text-[9px] font-extrabold px-2 py-0.5 rounded-lg border inline-block",
                studentMetrics.isOverdue 
                  ? "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/20 dark:text-rose-455" 
                  : studentMetrics.isApproaching
                  ? "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/20 dark:text-amber-455"
                  : "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-950/20 dark:text-slate-455"
              )}>
                {studentMetrics.isOverdue ? '⚠️ Terlambat! ' : ''}
                {studentMetrics.card3Sub}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2.5 shrink-0">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-xl">
            <CheckCircle size={20} />
          </div>
          {isStudent && studentMetrics?.hasApprovedLoans && (
            <Button
              size="xs"
              variant="outline"
              onClick={onPaymentInstructionsOpen}
              className="text-[9px] font-black uppercase tracking-wider border-slate-200 dark:border-slate-800 hover:bg-slate-55 rounded-lg px-2 py-1 flex items-center gap-1 shadow-sm shrink-0 animate-pulse"
            >
              Cara Bayar
            </Button>
          )}
        </div>
      </SectionCard>
    </div>
  );
});

LoanStatsBanner.displayName = 'LoanStatsBanner';
