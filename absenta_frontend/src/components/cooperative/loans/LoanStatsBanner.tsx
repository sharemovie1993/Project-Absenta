import React, { useState } from 'react';
import { Clock, DollarSign, CheckCircle, ChevronDown, ChevronUp, BarChart2 } from 'lucide-react';
import { SectionCard, Button } from '../../ui';
import { cn } from '../../../lib/utils';
import type { StudentMetrics, OperatorMetrics } from './types';
import { useIsMobile } from '../../../hooks/useIsMobile';

interface LoanStatsBannerProps {
  isStudent: boolean;
  studentMetrics: StudentMetrics | null;
  operatorMetrics: OperatorMetrics | null;
  onPaymentInstructionsOpen?: () => void;
  variant?: 'default' | 'compact-premium';
  mobileCompact?: boolean;
}

export const LoanStatsBanner = React.memo<LoanStatsBannerProps>(({
  isStudent,
  studentMetrics,
  operatorMetrics,
  onPaymentInstructionsOpen,
  variant = 'compact-premium',
  mobileCompact = true,
}) => {
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isCompact = variant === 'compact-premium' || (isMobile && mobileCompact);

  return (
    <div className="w-full max-w-full min-w-0 space-y-2">
      {/* Mobile Collapsible Header Bar */}
      <div className="flex sm:hidden items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800/80 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
          <BarChart2 size={13} className="text-indigo-600 dark:text-indigo-400" />
          <span>Statistik Pinjaman</span>
        </div>
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
          aria-label={isCollapsed ? 'Tampilkan statistik' : 'Sembunyikan statistik'}
        >
          {isCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
        </button>
      </div>

      {!isCollapsed && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6 w-full max-w-full min-w-0 animate-in fade-in duration-200">
          {/* Card 1 */}
          <SectionCard className={cn(
            "border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl relative overflow-hidden flex items-center justify-between transition-transform hover:scale-[1.01] w-full max-w-full min-w-0 shadow-xs",
            isCompact ? "p-3 sm:p-5" : "p-5"
          )}>
            <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">
                {isStudent ? studentMetrics?.card1Title : operatorMetrics?.card1Title}
              </p>
              <h3 className={cn("font-extrabold text-slate-850 dark:text-slate-100 leading-tight truncate", isCompact ? "text-base sm:text-xl" : "text-xl")}>
                {isStudent ? studentMetrics?.card1Val : operatorMetrics?.card1Val}
              </h3>
              {isStudent && studentMetrics?.card1Sub && (
                <p className="text-[9px] text-slate-400 font-bold truncate">{studentMetrics.card1Sub}</p>
              )}
            </div>
            <div className={cn("bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-xl shrink-0 ml-2", isCompact ? "p-2 sm:p-3" : "p-3")}>
              <Clock size={isCompact ? 16 : 20} />
            </div>
          </SectionCard>

          {/* Card 2 */}
          <SectionCard className={cn(
            "border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl relative overflow-hidden flex items-center justify-between transition-transform hover:scale-[1.01] w-full max-w-full min-w-0 shadow-xs",
            isCompact ? "p-3 sm:p-5" : "p-5"
          )}>
            <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">
                {isStudent ? studentMetrics?.card2Title : operatorMetrics?.card2Title}
              </p>
              <h3 className={cn("font-extrabold text-indigo-650 dark:text-indigo-400 leading-tight truncate", isCompact ? "text-base sm:text-xl" : "text-xl")}>
                {isStudent ? studentMetrics?.card2Val : operatorMetrics?.card2Val}
              </h3>
              {isStudent && studentMetrics?.card2Sub && (
                <p className="text-[9px] text-slate-400 font-bold truncate">{studentMetrics.card2Sub}</p>
              )}
            </div>
            <div className={cn("bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 rounded-xl shrink-0 ml-2", isCompact ? "p-2 sm:p-3" : "p-3")}>
              <DollarSign size={isCompact ? 16 : 20} />
            </div>
          </SectionCard>

          {/* Card 3 */}
          <SectionCard className={cn(
            "border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl relative overflow-hidden flex items-center justify-between transition-transform hover:scale-[1.01] w-full max-w-full min-w-0 shadow-xs",
            isCompact ? "p-3 sm:p-5" : "p-5"
          )}>
            <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">
                {isStudent ? studentMetrics?.card3Title : operatorMetrics?.card3Title}
              </p>
              <h3 className={cn("font-extrabold text-emerald-600 dark:text-emerald-400 leading-tight truncate", isCompact ? "text-base sm:text-xl" : "text-xl")}>
                {isStudent ? studentMetrics?.card3Val : operatorMetrics?.card3Val}
              </h3>
              {isStudent && studentMetrics?.card3Sub && (
                <div className="mt-0.5 sm:mt-1">
                  <span className={cn(
                    "text-[9px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-lg border inline-block truncate max-w-full",
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
            <div className="flex flex-col items-end gap-1.5 sm:gap-2.5 shrink-0 ml-2">
              <div className={cn("bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-xl", isCompact ? "p-2 sm:p-3" : "p-3")}>
                <CheckCircle size={isCompact ? 16 : 20} />
              </div>
              {isStudent && studentMetrics?.hasApprovedLoans && onPaymentInstructionsOpen && (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={onPaymentInstructionsOpen}
                  className="text-[9px] font-black uppercase tracking-wider border-slate-200 dark:border-slate-800 hover:bg-slate-55 rounded-lg px-2 py-0.5 sm:py-1 flex items-center gap-1 shadow-xs shrink-0 animate-pulse"
                >
                  Cara Bayar
                </Button>
              )}
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
});

LoanStatsBanner.displayName = 'LoanStatsBanner';

