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
  ShieldAlert,
  Layers,
  Sparkles,
  RefreshCw,
  Filter
} from 'lucide-react';
import { HubCard, HubBentoGrid, type HubBentoCell } from '@/components/ui/hub';
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

  // ── 1. Bento Analytics Grid 2x2 Ala Keuangan Shopee (Hairline Flat) ──
  const bentoCells: HubBentoCell[] = useMemo(() => [
    {
      id: 'cell-total',
      title: 'Total Tugas',
      value: (
        <span className={filter === 'ALL' ? 'text-indigo-600 dark:text-indigo-400 font-black' : ''}>
          {summary?.total ?? actions.length}
        </span>
      ),
      icon: Layers,
      iconColorClass: filter === 'ALL'
        ? 'bg-indigo-600 text-white'
        : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400',
      badge: filter === 'ALL' ? (
        <span className="text-[8.5px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-1 py-0.2 rounded">
          Aktif
        </span>
      ) : undefined,
      onClick: () => setFilter('ALL'),
    },
    {
      id: 'cell-critical',
      title: 'Mendesak',
      value: (
        <span className={(summary?.critical ?? 0) > 0 ? 'text-rose-600 dark:text-rose-400 font-black' : 'text-slate-400'}>
          {summary?.critical ?? 0}
        </span>
      ),
      icon: ShieldAlert,
      iconColorClass: filter === 'CRITICAL'
        ? 'bg-rose-600 text-white'
        : (summary?.critical ?? 0) > 0
        ? 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
        : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500',
      badge: filter === 'CRITICAL' ? (
        <span className="text-[8.5px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950 px-1 py-0.2 rounded">
          Aktif
        </span>
      ) : (summary?.critical ?? 0) > 0 ? (
        <span className="text-[8.5px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950 px-1 py-0.2 rounded animate-pulse">
          Segera
        </span>
      ) : undefined,
      onClick: () => setFilter('CRITICAL'),
    },
    {
      id: 'cell-today',
      title: 'Hari Ini',
      value: (
        <span className={(summary?.today ?? 0) > 0 ? 'text-amber-600 dark:text-amber-400 font-black' : 'text-slate-400'}>
          {summary?.today ?? 0}
        </span>
      ),
      icon: Clock,
      iconColorClass: filter === 'TODAY'
        ? 'bg-amber-600 text-white'
        : (summary?.today ?? 0) > 0
        ? 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400'
        : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500',
      badge: filter === 'TODAY' ? (
        <span className="text-[8.5px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950 px-1 py-0.2 rounded">
          Aktif
        </span>
      ) : undefined,
      onClick: () => setFilter('TODAY'),
    },
    {
      id: 'cell-upcoming',
      title: 'Mendatang',
      value: (
        <span className={filter === 'UPCOMING' ? 'text-sky-600 dark:text-sky-400 font-black' : ''}>
          {summary?.upcoming ?? 0}
        </span>
      ),
      icon: Calendar,
      iconColorClass: filter === 'UPCOMING'
        ? 'bg-sky-600 text-white'
        : 'bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400',
      badge: filter === 'UPCOMING' ? (
        <span className="text-[8.5px] font-bold text-sky-600 bg-sky-50 dark:bg-sky-950 px-1 py-0.2 rounded">
          Aktif
        </span>
      ) : undefined,
      onClick: () => setFilter('UPCOMING'),
    },
  ], [summary, actions.length, filter]);

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
      if (item.action.target.includes('/rapor/penilaian')) {
        navigate('/rapor/input-nilai');
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
          <div className="h-16 bg-slate-50 dark:bg-slate-800/60 rounded-xl animate-pulse" />
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
        <h3 className="text-xs sm:text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-tight whitespace-nowrap">
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

  return (
    <HubCard title={headerNode} className={className} noPadding>
      {/* ─── 1. Bento Analytics Grid Ala Shopee (Hairline 2x2, Ramping & Bisa Diklik) ─── */}
      <div className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/40">
        <HubBentoGrid 
          cells={bentoCells} 
          columns={2} 
          cellClassName="py-2 px-2.5 sm:py-3 sm:px-3"
        />
      </div>

      {/* ─── 2. Filter Status Strip Ringkas ─── */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50/60 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800/80 text-[10.5px]">
        <div className="flex items-center gap-1.5 text-slate-500 font-medium">
          <Filter size={11} className="text-slate-400" />
          <span>
            Filter:{' '}
            <strong className="text-slate-800 dark:text-slate-200 font-semibold">
              {filter === 'ALL' ? 'Semua' : filter === 'CRITICAL' ? 'Mendesak' : filter === 'TODAY' ? 'Hari Ini' : 'Mendatang'}
            </strong>
          </span>
        </div>
        <span className="text-[10px] text-slate-400">
          {filteredActions.length} item
        </span>
      </div>

      {/* ─── 3. Daftar Tugas Hairline (Shopee Flat List) ─── */}
      {!filteredActions.length ? (
        <div className="p-3 sm:p-3.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Sparkles size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
              {filter === 'ALL' ? 'Semua Tugas Tuntas' : 'Tidak Ada Tugas di Kategori Ini'}
            </div>
            <div className="text-[10.5px] text-slate-400 dark:text-slate-500 font-normal truncate mt-0.5">
              {filter === 'ALL' 
                ? 'Tidak ada kewajiban tertunda saat ini. Kerja luar biasa! 🎉' 
                : 'Pilih kategori "Semua" untuk melihat daftar lengkap.'}
            </div>
          </div>
          {filter === 'ALL' && (
            <Badge variant="outline" className="text-[9.5px] font-bold text-emerald-600 border-emerald-300 dark:border-emerald-800 shrink-0">
              Tertib
            </Badge>
          )}
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {filteredActions.map((item) => {
            const IconComp = DIVISION_ICON[item.division] || AlertCircle;
            const isCritical = item.urgency === 'CRITICAL';
            const isToday = item.urgency === 'TODAY';

            return (
              <div
                key={item.id}
                className={`p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors ${
                  isCritical 
                    ? 'bg-rose-50/25 dark:bg-rose-950/10' 
                    : isToday 
                    ? 'bg-amber-50/20 dark:bg-amber-950/10' 
                    : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {/* Squircle Icon 36px Ramping */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    isCritical 
                      ? 'bg-rose-100/80 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                      : isToday 
                      ? 'bg-amber-100/80 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                      : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400'
                  }`}>
                    <IconComp size={17} />
                  </div>

                  {/* Area Konten: Bebas Pruning & Penuh Ruang */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs sm:text-[13px] font-bold text-slate-800 dark:text-slate-100 leading-snug break-words">
                        {item.title}
                      </h4>
                      <span className={`text-[9.5px] font-semibold px-2 py-0.5 rounded-md ${
                        isCritical
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : isToday
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {item.badgeText}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal leading-relaxed break-words">
                      {item.subtitle}
                    </p>

                    {/* Micro Progress Bar jika ada */}
                    {item.progress && (
                      <div className="pt-1 flex items-center gap-2 max-w-[220px]">
                        <div className="h-1.5 flex-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-600 rounded-full transition-all"
                            style={{ width: `${item.progress.percent}%` }}
                          />
                        </div>
                        <span className="text-[9.5px] font-mono text-slate-400">
                          {item.progress.label}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tombol Eksekusi Cepat Ala Shopee (Rata Kanan di Mobile, Sejajar di Desktop) */}
                <div className="flex justify-end sm:justify-start shrink-0 pl-12 sm:pl-0 pt-0.5 sm:pt-0">
                  <Button
                    size="sm"
                    variant={isCritical ? 'destructive' : 'outline'}
                    onClick={() => handleActionClick(item)}
                    className={`h-7 px-3.5 rounded-full text-[11px] font-bold shadow-none cursor-pointer whitespace-nowrap ${
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
      )}
    </HubCard>
  );
});

TeacherActionHubWidget.displayName = 'TeacherActionHubWidget';
