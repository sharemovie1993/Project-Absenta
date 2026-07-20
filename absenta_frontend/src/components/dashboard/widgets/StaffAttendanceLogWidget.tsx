import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRekapBulananGuruMe } from '../../../api/attendanceGerbang.api';
import { useAuthStore } from '../../../store/authStore';
import { 
  CalendarDays, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ArrowRight,
  Fingerprint,
  TrendingUp
} from 'lucide-react';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { cn } from '../../../lib/utils';
import { useNavigate } from 'react-router-dom';

interface StaffAttendanceLogWidgetProps {
  className?: string;
}

const STATUS_LABELS: Record<string, string> = {
  HADIR: 'Hadir Tepat Waktu',
  TERLAMBAT: 'Terlambat',
  ALPA: 'Alpa',
  SAKIT: 'Sakit',
  IZIN: 'Izin',
  DISPEN: 'Dispensasi',
  BELUM: 'Belum Presensi'
};

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  HADIR: { bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-950/30' },
  TERLAMBAT: { bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-100 dark:border-amber-950/30' },
  ALPA: { bg: 'bg-rose-50 dark:bg-rose-950/20', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-100 dark:border-rose-950/30' },
  SAKIT: { bg: 'bg-blue-50 dark:bg-blue-950/20', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-100 dark:border-blue-950/30' },
  IZIN: { bg: 'bg-indigo-50 dark:bg-indigo-950/20', text: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-100 dark:border-indigo-950/30' },
  DISPEN: { bg: 'bg-purple-50 dark:bg-purple-950/20', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-100 dark:border-purple-950/30' },
  BELUM: { bg: 'bg-slate-50 dark:bg-slate-800/50', text: 'text-slate-500 dark:text-slate-400', border: 'border-slate-100 dark:border-slate-800/30' }
};

export const StaffAttendanceLogWidget: React.FC<StaffAttendanceLogWidgetProps> = ({ className }) => {
  const { tenantId, user } = useAuthStore();
  const navigate = useNavigate();

  const bulanKey = useMemo(() => {
    // Return YYYY-MM in local timezone
    return new Date().toLocaleDateString('en-CA').substring(0, 7);
  }, []);

  const todayStr = useMemo(() => {
    // Return YYYY-MM-DD in local timezone
    return new Date().toLocaleDateString('en-CA');
  }, []);

  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date());
  }, []);

  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ['my-attendance-rekap-widget', bulanKey, tenantId, user?.id],
    queryFn: () => getRekapBulananGuruMe({ bulan: bulanKey }),
    enabled: !!tenantId && !!user?.id
  });

  const rekap = attendanceData?.data;

  const todayLog = useMemo(() => {
    return rekap?.detail?.find((d: any) => d.tanggal === todayStr) || null;
  }, [rekap, todayStr]);

  const statsSummary = useMemo(() => {
    if (!rekap?.detail) return { hadir: 0, terlambat: 0, izin: 0, alpa: 0 };
    let hadir = 0;
    let terlambat = 0;
    let izin = 0;
    let alpa = 0;

    rekap.detail.forEach((d: any) => {
      if (d.status === 'HADIR') hadir++;
      else if (d.status === 'TERLAMBAT') terlambat++;
      else if (d.status === 'IZIN' || d.status === 'SAKIT' || d.status === 'DISPEN') izin++;
      else if (d.status === 'ALPA') alpa++;
    });

    return { hadir, terlambat, izin, alpa };
  }, [rekap]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-4 animate-pulse h-[200px] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-6 h-6 text-indigo-500 mx-auto mb-2 animate-spin" />
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Sinkronisasi Kehadiran...</p>
        </div>
      </div>
    );
  }

  const status = todayLog?.status || 'BELUM';
  const colors = STATUS_COLORS[status] || STATUS_COLORS.BELUM;
  const label = STATUS_LABELS[status] || STATUS_LABELS.BELUM;

  return (
    <div className={cn(
      "bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/50 shadow-sm p-4 space-y-4",
      className
    )}>
      {/* Header Widget */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-50 dark:border-slate-700/50 px-1">
        <div className="flex items-center gap-2">
          <Fingerprint size={14} className="text-indigo-600 dark:text-indigo-400" />
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">Log Kehadiran Kerja Harian</h3>
            <span className="hidden sm:inline-block text-[10px] font-bold text-gray-400 dark:text-gray-500 border-l border-gray-200 dark:border-slate-700 pl-2">
              {formattedDate}
            </span>
          </div>
        </div>
        {rekap?.persentase_kehadiran !== undefined && (
          <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20 px-2.5 py-0.5 rounded-full border border-emerald-100/50 dark:border-emerald-950/20 uppercase tracking-tight">
            Kehadiran: {Math.round(rekap.persentase_kehadiran)}%
          </span>
        )}
      </div>

      {/* Main Grid: Left = Today's Punch, Right = Monthly Summary */}
      <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-4">
        {/* Today's Punch Punch Card */}
        <div className={cn("p-4 rounded-xl border flex flex-col justify-between", colors.border, colors.bg)}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Kehadiran Hari Ini</span>
              <Badge variant={status === 'HADIR' ? 'success' : status === 'BELUM' ? 'secondary' : 'warning'} className="text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                {label}
              </Badge>
            </div>
            <h4 className={cn("text-base font-black leading-tight", colors.text)}>
              {status === 'BELUM' ? 'Belum Ada Log Presensi' : `Status: ${label}`}
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4 pt-3 border-t border-slate-200/40 dark:border-slate-700/40">
            <div>
              <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <Clock size={10} className="text-emerald-500" /> Jam Masuk
              </p>
              <p className="text-sm font-black text-slate-700 dark:text-slate-200 mt-1">
                {todayLog?.jam_masuk || '--:--'}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <Clock size={10} className="text-blue-500" /> Jam Pulang
              </p>
              <p className="text-sm font-black text-slate-700 dark:text-slate-200 mt-1">
                {todayLog?.jam_pulang || '--:--'}
              </p>
            </div>
          </div>
        </div>

        {/* Monthly Summary Statistics */}
        <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/30 flex flex-col justify-between">
          <div>
            <h4 className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-3">
              <TrendingUp size={10} className="text-indigo-500" /> Rekap Bulan Ini
            </h4>
            
            <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block flex-shrink-0" />
                <span>Hadir: <strong className="text-slate-800 dark:text-slate-200">{statsSummary.hadir}</strong></span>
              </div>
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block flex-shrink-0" />
                <span>Late: <strong className="text-slate-800 dark:text-slate-200">{statsSummary.terlambat}</strong></span>
              </div>
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block flex-shrink-0" />
                <span>Izin: <strong className="text-slate-800 dark:text-slate-200">{statsSummary.izin}</strong></span>
              </div>
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block flex-shrink-0" />
                <span>Alpa: <strong className="text-slate-800 dark:text-slate-200">{statsSummary.alpa}</strong></span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/attendance/my-attendance')}
              className="w-full text-[9px] font-black uppercase rounded-lg border-slate-200 dark:border-slate-750 flex items-center justify-center gap-1.5 h-8"
            >
              Kalender Lengkap <ArrowRight size={10} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Export Loader2 spinner
export const Loader2: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={cn("animate-spin text-indigo-500", className)}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);
