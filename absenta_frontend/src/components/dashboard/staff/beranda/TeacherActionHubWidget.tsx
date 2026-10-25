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
  ArrowRight,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge, Button } from '@/components/ui';
import type { UnifiedActionItem, ActionHubSummary } from '@/api/dashboard.api';

interface TeacherActionHubWidgetProps {
  actions: UnifiedActionItem[];
  summary: ActionHubSummary;
  isLoading?: boolean;
  onOpenJournal?: (payload: any) => void;
  onNavigateTab?: (tabId: string) => void;
  className?: string;
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
  onOpenJournal,
  onNavigateTab,
  className,
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
      // Periksa apakah target mengarah ke tab internal dashboard
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
      <Card className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
        <div className="h-5 w-40 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
        <div className="h-16 bg-slate-50 dark:bg-slate-800/60 rounded-xl animate-pulse" />
      </Card>
    );
  }

  if (!actions.length) {
    return (
      <Card className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Sparkles size={16} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
              Pusat Tugas & Peringatan Tuntas
            </h4>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
              Tidak ada kewajiban mendesak atau tugas tambahan saat ini. Kerja bagus! 🎉
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-[9.5px] font-bold text-emerald-600 border-emerald-300 dark:border-emerald-800 shrink-0">
          Tertib
        </Badge>
      </Card>
    );
  }

  return (
    <Card className={`p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2.5 ${className || ''}`}>
      {/* ─── Header Strip ─── */}
      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <CheckSquare size={16} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white">
              Tugas & Peringatan Saya
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-none mt-0.5">
              Kewajiban lintas divisi yang memerlukan tindakan Anda
            </p>
          </div>
        </div>

        {summary?.critical > 0 ? (
          <Badge variant="destructive" className="text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 animate-pulse">
            🔴 {summary.critical} Mendesak
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[9.5px] font-bold text-slate-500 border-slate-200 dark:border-slate-700 shrink-0">
            {actions.length} Tugas Aktif
          </Badge>
        )}
      </div>

      {/* ─── Filter Pills ─── */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <button
          type="button"
          onClick={() => setFilter('ALL')}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all cursor-pointer whitespace-nowrap ${
            filter === 'ALL'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
          }`}
        >
          Semua ({actions.length})
        </button>

        {summary?.critical > 0 && (
          <button
            type="button"
            onClick={() => setFilter('CRITICAL')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all cursor-pointer whitespace-nowrap ${
              filter === 'CRITICAL'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60'
            }`}
          >
            Mendesak ({summary.critical})
          </button>
        )}

        {summary?.today > 0 && (
          <button
            type="button"
            onClick={() => setFilter('TODAY')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all cursor-pointer whitespace-nowrap ${
              filter === 'TODAY'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60'
            }`}
          >
            Hari Ini ({summary.today})
          </button>
        )}

        {summary?.upcoming > 0 && (
          <button
            type="button"
            onClick={() => setFilter('UPCOMING')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all cursor-pointer whitespace-nowrap ${
              filter === 'UPCOMING'
                ? 'bg-sky-600 text-white shadow-2xs'
                : 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200/60'
            }`}
          >
            Mendatang ({summary.upcoming})
          </button>
        )}
      </div>

      {/* ─── Daftar Kartu Tugas Shopee-Style ─── */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
        {filteredActions.map((item) => {
          const IconComp = DIVISION_ICON[item.division] || AlertCircle;
          const isCritical = item.urgency === 'CRITICAL';
          const isToday = item.urgency === 'TODAY';

          return (
            <div
              key={item.id}
              className={`py-2 px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl transition-all ${
                isCritical 
                  ? 'bg-rose-50/30 dark:bg-rose-950/15 border-l-2 border-rose-500 pl-2' 
                  : isToday 
                  ? 'bg-amber-50/20 dark:bg-amber-950/10 border-l-2 border-amber-500 pl-2'
                  : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  isCritical 
                    ? 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
                    : isToday 
                    ? 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400'
                    : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400'
                }`}>
                  <IconComp size={16} />
                </div>

                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                      {item.title}
                    </span>
                    <Badge 
                      variant={isCritical ? 'destructive' : isToday ? 'warning' : 'outline'}
                      className="text-[8.5px] uppercase font-bold py-0 px-1.5 h-4"
                    >
                      {item.badgeText}
                    </Badge>
                  </div>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-full">
                    {item.subtitle}
                  </p>

                  {/* Micro Progress Bar (jika tersedia) */}
                  {item.progress && (
                    <div className="pt-1 flex items-center gap-2 max-w-[200px]">
                      <div className="h-1.5 flex-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-600 rounded-full transition-all"
                          style={{ width: `${item.progress.percent}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-mono font-bold text-slate-400">
                        {item.progress.label}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tombol Eksekusi Cepat (1-Klik Langsung Buka) */}
              <div className="self-end sm:self-center shrink-0">
                <Button
                  size="sm"
                  variant={isCritical ? 'destructive' : 'outline'}
                  onClick={() => handleActionClick(item)}
                  className={`h-7 px-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-2xs cursor-pointer ${
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
    </Card>
  );
});

TeacherActionHubWidget.displayName = 'TeacherActionHubWidget';
