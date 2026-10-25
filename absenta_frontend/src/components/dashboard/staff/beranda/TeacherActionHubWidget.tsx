import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckSquare, 
  AlertCircle, 
  Clock, 
  Calendar, 
  BookOpen, 
  GraduationCap, 
  Briefcase, 
  Building, 
  ClipboardList, 
  ShieldCheck, 
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { HubCard } from '@/components/ui/hub';
import { Badge, Button } from '@/components/ui';
import type { UnifiedActionItem, ActionHubSummary } from '@/api/dashboard.api';

interface TeacherActionHubWidgetProps {
  actions: UnifiedActionItem[];
  summary: ActionHubSummary;
  isLoading?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onOpenJournal?: (payload: any) => void;
  onNavigateTab?: (tabId: string) => void;
  className?: string;
  title?: string;
}

type FilterCategory = 'ALL' | 'CRITICAL' | 'TODAY' | 'UPCOMING';

const DIVISION_ICON: Record<string, any> = {
  KURIKULUM: BookOpen,
  RAPOR: GraduationCap,
  PIKET: ClipboardList,
  KESISWAAN: ShieldCheck,
  HUBIN: Briefcase,
  SARPRAS: Building,
};

export const TeacherActionHubWidget: React.FC<TeacherActionHubWidgetProps> = React.memo(({
  actions = [],
  summary,
  isLoading = false,
  isRefreshing = false,
  onRefresh,
  onOpenJournal,
  onNavigateTab,
  className,
  title = 'Tugas Saya',
}) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterCategory>('ALL');

  const filteredActions = useMemo(() => {
    if (filter === 'CRITICAL') return actions.filter(a => a.urgency === 'CRITICAL');
    if (filter === 'TODAY') return actions.filter(a => a.urgency === 'TODAY');
    if (filter === 'UPCOMING') return actions.filter(a => a.urgency === 'UPCOMING' || a.urgency === 'INFO');
    return actions;
  }, [actions, filter]);

  const handleActionClick = (item: UnifiedActionItem) => {
    if (item.action.type === 'MODAL' && item.action.target === 'JURNAL_KBM_MODAL') {
      if (onOpenJournal) {
        onOpenJournal(item.action.payload || { id: item.sourceModule.entityId });
      } else {
        navigate('/kurikulum/jurnal');
      }
      return;
    }

    if (item.action.type === 'NAVIGATE') {
      if (item.action.target.includes('tab=piket') && onNavigateTab) {
        onNavigateTab('kelola');
        return;
      }
      if (item.action.target.includes('tab=pembimbing_pkl') && onNavigateTab) {
        onNavigateTab('pembimbing_pkl');
        return;
      }
      navigate(item.action.target);
    }
  };

  if (isLoading) {
    return (
      <HubCard className={className} noPadding>
        <div className="p-3.5 space-y-2">
          <div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          <div className="h-12 bg-slate-50 dark:bg-slate-800/60 rounded-xl animate-pulse" />
        </div>
      </HubCard>
    );
  }

  // Header Component ala Shopee
  const headerNode = (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
          <CheckSquare size={14} />
        </div>
        <h3 className="text-xs sm:text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-tight truncate">
          {title}
        </h3>
        {summary?.critical > 0 ? (
          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-400 px-1.5 py-0.5 rounded-full shrink-0">
            {summary.critical} Mendesak
          </span>
        ) : actions.length > 0 ? (
          <span className="text-[10.5px] font-medium text-slate-400 shrink-0">
            ({actions.length})
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Segarkan data tugas"
            className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-indigo-600' : ''} />
          </button>
        )}
      </div>
    </div>
  );

  if (!actions.length) {
    return (
      <HubCard title={headerNode} className={className} noPadding>
        <div className="p-3 sm:p-3.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Sparkles size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
              Semua Tugas Tuntas
            </div>
            <div className="text-[10.5px] text-slate-400 dark:text-slate-500 font-normal truncate mt-0.5">
              Tidak ada kewajiban tertunda saat ini. Kerja luar biasa! 🎉
            </div>
          </div>
          <Badge variant="outline" className="text-[9.5px] font-bold text-emerald-600 border-emerald-300 dark:border-emerald-800 shrink-0">
            Tertib
          </Badge>
        </div>
      </HubCard>
    );
  }

  return (
    <HubCard title={headerNode} className={className} noPadding>
      {/* ─── Filter Pills Ramping Ala Shopee (Hairline Flat) ─── */}
      <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto no-scrollbar border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
        <button
          type="button"
          onClick={() => setFilter('ALL')}
          className={`px-2.5 py-1 rounded-full text-[10.5px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
            filter === 'ALL'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100'
          }`}
        >
          Semua ({actions.length})
        </button>

        {summary?.critical > 0 && (
          <button
            type="button"
            onClick={() => setFilter('CRITICAL')}
            className={`px-2.5 py-1 rounded-full text-[10.5px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
              filter === 'CRITICAL'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/60 hover:bg-rose-50'
            }`}
          >
            Mendesak ({summary.critical})
          </button>
        )}

        {summary?.today > 0 && (
          <button
            type="button"
            onClick={() => setFilter('TODAY')}
            className={`px-2.5 py-1 rounded-full text-[10.5px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
              filter === 'TODAY'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-900/60 hover:bg-amber-50'
            }`}
          >
            Hari Ini ({summary.today})
          </button>
        )}

        {summary?.upcoming > 0 && (
          <button
            type="button"
            onClick={() => setFilter('UPCOMING')}
            className={`px-2.5 py-1 rounded-full text-[10.5px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
              filter === 'UPCOMING'
                ? 'bg-sky-600 text-white shadow-2xs'
                : 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 border border-sky-200/80 dark:border-sky-900/60 hover:bg-sky-50'
            }`}
          >
            Mendatang ({summary.upcoming})
          </button>
        )}
      </div>

      {/* ─── Daftar Tugas Hairline (Shopee Flat List) ─── */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
        {filteredActions.map((item) => {
          const IconComp = DIVISION_ICON[item.division] || AlertCircle;
          const isCritical = item.urgency === 'CRITICAL';
          const isToday = item.urgency === 'TODAY';

          return (
            <div
              key={item.id}
              className={`p-2.5 sm:p-3 flex items-center justify-between gap-2.5 transition-colors ${
                isCritical 
                  ? 'bg-rose-50/25 dark:bg-rose-950/10' 
                  : isToday 
                  ? 'bg-amber-50/20 dark:bg-amber-950/10' 
                  : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {/* Squircle Icon 34px Ramping */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  isCritical 
                    ? 'bg-rose-100/80 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                    : isToday 
                    ? 'bg-amber-100/80 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                    : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400'
                }`}>
                  <IconComp size={16} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                      {item.title}
                    </span>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded ${
                      isCritical
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        : isToday
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {item.badgeText}
                    </span>
                  </div>

                  <p className="text-[10.5px] text-slate-400 dark:text-slate-500 font-normal truncate mt-0.5">
                    {item.subtitle}
                  </p>

                  {/* Micro Progress Bar jika ada */}
                  {item.progress && (
                    <div className="pt-1 flex items-center gap-2 max-w-[180px]">
                      <div className="h-1 flex-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-600 rounded-full transition-all"
                          style={{ width: `${item.progress.percent}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-mono text-slate-400">
                        {item.progress.label}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tombol Eksekusi Cepat Ala Shopee (Ramping & Ringan) */}
              <div className="shrink-0">
                <Button
                  size="sm"
                  variant={isCritical ? 'destructive' : 'outline'}
                  onClick={() => handleActionClick(item)}
                  className={`h-6 sm:h-7 px-2.5 rounded-full text-[10px] font-bold shadow-none cursor-pointer ${
                    !isCritical ? 'border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50' : ''
                  }`}
                >
                  <span>{item.action.label}</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </HubCard>
  );
});

TeacherActionHubWidget.displayName = 'TeacherActionHubWidget';
