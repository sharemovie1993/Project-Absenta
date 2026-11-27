import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { bpbkApi, bpbkQueryKeys } from '../../../api/bpbk.api';
import { Loader } from '../../../components/ui/Loader';
import { Badge } from '../../../components/ui/Badge';
import { formatDate } from '../../../utils/layoutUtils';
import {
  AlertTriangle,
  Award,
  MessageSquare,
  Home,
  MailOpen,
  FolderOpen,
  CheckCircle2,
  ShieldAlert,
  Calendar,
  History,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

interface TimelineEvent {
  date: string;
  type: 'VIOLATION' | 'ACHIEVEMENT' | 'COUNSELING' | 'HOMEVISIT' | 'SUMMONS' | 'CASE_OPEN' | 'CASE_CLOSE' | string;
  title: string;
  description: string;
}

interface BpbkSiswaHistoryViewProps {
  siswaId: string;
}

type HistoryFilter = 'ALL' | 'VIOLATION' | 'COUNSELING' | 'CASE' | 'SUMMONS_VISIT' | 'ACHIEVEMENT';

const EVENT_STYLE_MAP: Record<
  string,
  { label: string; badgeClass: string; iconBgClass: string; Icon: React.ComponentType<{ size?: number; className?: string }> }
> = {
  VIOLATION: {
    label: 'Pelanggaran',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    iconBgClass: 'bg-rose-100 text-rose-600',
    Icon: AlertTriangle,
  },
  ACHIEVEMENT: {
    label: 'Prestasi',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconBgClass: 'bg-emerald-100 text-emerald-600',
    Icon: Award,
  },
  COUNSELING: {
    label: 'Konseling',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    iconBgClass: 'bg-indigo-100 text-indigo-600',
    Icon: MessageSquare,
  },
  HOMEVISIT: {
    label: 'Home Visit',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
    iconBgClass: 'bg-teal-100 text-teal-600',
    Icon: Home,
  },
  SUMMONS: {
    label: 'Panggilan Ortu',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    iconBgClass: 'bg-amber-100 text-amber-600',
    Icon: MailOpen,
  },
  CASE_OPEN: {
    label: 'Kasus Dibuka',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    iconBgClass: 'bg-orange-100 text-orange-600',
    Icon: FolderOpen,
  },
  CASE_CLOSE: {
    label: 'Kasus Selesai',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconBgClass: 'bg-emerald-100 text-emerald-600',
    Icon: CheckCircle2,
  },
};

export const BpbkSiswaHistoryView: React.FC<BpbkSiswaHistoryViewProps> = ({ siswaId }) => {
  const [filter, setFilter] = useState<HistoryFilter>('ALL');

  const { data: res, isLoading, isError } = useQuery({
    queryKey: bpbkQueryKeys.studentRiskTrend(siswaId),
    queryFn: () => bpbkApi.getStudentRiskTrend(siswaId),
    enabled: Boolean(siswaId),
  });

  const snapshots = res?.data?.snapshots || [];
  const rawEvents: TimelineEvent[] = res?.data?.events || [];

  const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

  const sortedEvents = useMemo(() => {
    return [...rawEvents].sort((a, b) => b.date.localeCompare(a.date));
  }, [rawEvents]);

  const counts = useMemo(() => {
    return {
      all: sortedEvents.length,
      violation: sortedEvents.filter((e) => e.type === 'VIOLATION').length,
      counseling: sortedEvents.filter((e) => e.type === 'COUNSELING').length,
      caseCount: sortedEvents.filter((e) => e.type === 'CASE_OPEN' || e.type === 'CASE_CLOSE').length,
      summonsVisit: sortedEvents.filter((e) => e.type === 'SUMMONS' || e.type === 'HOMEVISIT').length,
      achievement: sortedEvents.filter((e) => e.type === 'ACHIEVEMENT').length,
    };
  }, [sortedEvents]);

  const filteredEvents = useMemo(() => {
    if (filter === 'ALL') return sortedEvents;
    if (filter === 'VIOLATION') return sortedEvents.filter((e) => e.type === 'VIOLATION');
    if (filter === 'COUNSELING') return sortedEvents.filter((e) => e.type === 'COUNSELING');
    if (filter === 'CASE') return sortedEvents.filter((e) => e.type === 'CASE_OPEN' || e.type === 'CASE_CLOSE');
    if (filter === 'SUMMONS_VISIT') return sortedEvents.filter((e) => e.type === 'SUMMONS' || e.type === 'HOMEVISIT');
    if (filter === 'ACHIEVEMENT') return sortedEvents.filter((e) => e.type === 'ACHIEVEMENT');
    return sortedEvents;
  }, [sortedEvents, filter]);

  if (isLoading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
        <Loader />
        <span className="text-xs font-medium">Memuat rekam jejak BP/BK siswa...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 text-center rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
        Gagal memuat riwayat BP/BK siswa. Silakan coba lagi.
      </div>
    );
  }

  const riskLevel = String(latestSnapshot?.risk_level || 'LOW').toUpperCase();
  const riskBadgeClass =
    riskLevel === 'CRITICAL' || riskLevel === 'HIGH'
      ? 'bg-rose-100 text-rose-700 border-rose-200'
      : riskLevel === 'MEDIUM'
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : 'bg-emerald-100 text-emerald-700 border-emerald-200';

  return (
    <div className="space-y-4">
      {/* Ringkasan Risiko & Statistik Rekam Jejak */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Skor Risiko EWS
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-lg font-black text-slate-800 font-mono">
                {latestSnapshot?.risk_score ?? 0}
              </span>
              <Badge variant="outline" className={cn('text-[9px] font-bold px-1.5 py-0', riskBadgeClass)}>
                {riskLevel}
              </Badge>
            </div>
          </div>
          <ShieldAlert size={18} className="text-slate-400 shrink-0" />
        </div>

        <div className="p-3 rounded-xl bg-rose-50/50 border border-rose-200/70">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block">
            Pelanggaran
          </span>
          <span className="text-lg font-black text-rose-700 font-mono mt-0.5 block">
            {counts.violation}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-200/70">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 block">
            Sesi Konseling
          </span>
          <span className="text-lg font-black text-indigo-700 font-mono mt-0.5 block">
            {counts.counseling}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/70">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">
            Panggilan & Visit
          </span>
          <span className="text-lg font-black text-amber-700 font-mono mt-0.5 block">
            {counts.summonsVisit}
          </span>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5 pb-1 border-b border-slate-100">
        {(
          [
            { key: 'ALL', label: `Semua (${counts.all})` },
            { key: 'VIOLATION', label: `Pelanggaran (${counts.violation})` },
            { key: 'COUNSELING', label: `Konseling (${counts.counseling})` },
            { key: 'CASE', label: `Kasus (${counts.caseCount})` },
            { key: 'SUMMONS_VISIT', label: `Panggilan & Visit (${counts.summonsVisit})` },
            { key: 'ACHIEVEMENT', label: `Prestasi (${counts.achievement})` },
          ] as Array<{ key: HistoryFilter; label: string }>
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={cn(
              'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer',
              filter === tab.key
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Timeline Rekam Jejak */}
      {filteredEvents.length === 0 ? (
        <div className="py-10 text-center space-y-1.5 text-slate-400">
          <History size={24} className="mx-auto text-slate-300" />
          <p className="text-xs font-semibold text-slate-600">Belum ada catatan riwayat pada kategori ini</p>
        </div>
      ) : (
        <div className="max-h-[420px] overflow-y-auto pr-1 space-y-2.5">
          {filteredEvents.map((ev, idx) => {
            const style = EVENT_STYLE_MAP[ev.type] || {
              label: ev.type,
              badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
              iconBgClass: 'bg-slate-100 text-slate-600',
              Icon: History,
            };
            const IconComp = style.Icon;
            return (
              <div
                key={`${ev.type}-${ev.date}-${idx}`}
                className="p-3 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition-colors flex items-start gap-3"
              >
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5', style.iconBgClass)}>
                  <IconComp size={15} />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className={cn('text-[10px] font-bold px-1.5 py-0', style.badgeClass)}>
                        {style.label}
                      </Badge>
                      <span className="text-xs font-bold text-slate-800 truncate">{ev.title}</span>
                    </div>
                    <span className="text-[11px] font-mono font-semibold text-slate-500 flex items-center gap-1 shrink-0">
                      <Calendar size={11} />
                      {formatDate(ev.date)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{ev.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
