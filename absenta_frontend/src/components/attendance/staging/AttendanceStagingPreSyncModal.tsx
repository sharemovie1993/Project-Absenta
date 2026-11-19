import React, { useMemo } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Users,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Flag,
  Award,
  SunMedium,
  LogOut,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import type { AttendanceStagingItem } from '@/api/attendance-staging.api';

export interface AttendanceStagingPreSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: AttendanceStagingItem[];
  onConfirmSync: (ids: string[]) => Promise<void>;
  isSyncing: boolean;
}

export const AttendanceStagingPreSyncModal: React.FC<AttendanceStagingPreSyncModalProps> = React.memo(({
  isOpen,
  onClose,
  items,
  onConfirmSync,
  isSyncing,
}) => {
  // Aggregate stats from items
  const stats = useMemo(() => {
    let totalStudents = 0;
    let totalMatchedStudents = 0;
    let upacaraCount = 0;
    let ketarunaanCount = 0;
    let duhaCount = 0;
    let apelSoreCount = 0;

    items.forEach((item) => {
      totalStudents += item.total_siswa || 0;
      totalMatchedStudents += item.total_matched_siswa || 0;

      const sessions = item.raw_sheet_data?.sessions || [];
      sessions.forEach((s) => {
        if (s.defaultType === 'UPACARA') upacaraCount++;
        else if (s.defaultType === 'KETARUNAAN') ketarunaanCount++;
        else if (s.defaultType === 'DUHA') duhaCount++;
        else if (s.defaultType === 'APEL_SORE') apelSoreCount++;
      });
    });

    return {
      totalClasses: items.length,
      totalStudents,
      totalMatchedStudents,
      upacaraCount,
      ketarunaanCount,
      duhaCount,
      apelSoreCount,
    };
  }, [items]);

  if (!isOpen || items.length === 0) return null;

  const isBulk = items.length > 1;

  const handleConfirm = async () => {
    const ids = items.map((i) => i.id);
    await onConfirmSync(ids);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSyncing ? () => {} : onClose}
      size="2xl"
      title={
        <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold leading-tight">
              {isBulk
                ? `Konfirmasi Sinkronisasi Massal (${stats.totalClasses} Rombel)`
                : `Konfirmasi Sinkronisasi: ${items[0].nama_kelas}`}
            </h3>
            <p className="text-xs text-slate-500 font-normal">
              Periksa destinasi agenda presensi sebelum data didistribusikan ke database resmi.
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Rombel Chips Container */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 font-semibold text-xs">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              Target Rombel ({items.length} Kelas)
            </span>
            <span className="text-[11px] font-normal text-slate-400">
              {stats.totalMatchedStudents} dari {stats.totalStudents} Siswa Cocok
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap max-h-24 overflow-y-auto">
            {items.map((item) => (
              <span
                key={item.id}
                className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1 text-[11px]"
              >
                <span>{item.nama_kelas}</span>
                <span className="text-[10px] text-slate-400">({item.total_siswa} siswa)</span>
              </span>
            ))}
          </div>
        </div>

        {/* Smart Dispatcher Destination Breakdown */}
        <div className="space-y-2">
          <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
            <ArrowRight className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Destinasi Alur Data (Smart Dispatcher Agenda)
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Upacara */}
            <div className="p-3 rounded-xl border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 flex items-start gap-2.5">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                <Flag className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-blue-900 dark:text-blue-200 text-xs">Upacara Bendera</p>
                <p className="text-[11px] text-blue-700/80 dark:text-blue-300/80 mt-0.5">
                  Senin Pagi (UP) • {stats.upacaraCount} sesi
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Masuk ke Sesi Presensi Upacara &amp; Rekap Bulanan Kesiswaan.
                </p>
              </div>
            </div>

            {/* Ketarunaan */}
            <div className="p-3 rounded-xl border border-purple-200/80 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 flex items-start gap-2.5">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5">
                <Award className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-purple-900 dark:text-purple-200 text-xs">Latihan Ketarunaan</p>
                <p className="text-[11px] text-purple-700/80 dark:text-purple-300/80 mt-0.5">
                  Selasa, Rabu, Kamis, Sabtu Pagi • {stats.ketarunaanCount} sesi
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Masuk ke <strong>Dashboard Ketarunaan</strong> (/dashboard?tab=ketarunaan).
                </p>
              </div>
            </div>

            {/* Duha */}
            <div className="p-3 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 flex items-start gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                <SunMedium className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-emerald-900 dark:text-emerald-200 text-xs">Pembiasaan Sholat Dhuha</p>
                <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                  Jum'at Pagi (AP) • {stats.duhaCount} sesi
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Masuk ke <strong>Dashboard Pembiasaan Dhuha</strong> (/dashboard?tab=dhuha).
                </p>
              </div>
            </div>

            {/* Apel Pulang */}
            <div className="p-3 rounded-xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 flex items-start gap-2.5">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                <LogOut className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-amber-900 dark:text-amber-200 text-xs">Apel Pulang Siswa</p>
                <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80 mt-0.5">
                  Sore Setiap Hari (AS) • {stats.apelSoreCount} sesi
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Masuk ke Sesi Presensi Pulang &amp; Rekap Kehadiran Harian.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Safe Transaction Notice */}
        <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-emerald-800 dark:text-emerald-200 leading-relaxed">
            <strong className="font-bold">Transaksi Aman &amp; Idempotent:</strong> Sistem menggunakan transaksi atomik database. Jika lembar ini pernah disinkronkan sebelumnya, sistem akan memperbarui data tanpa membuat sesi duplikat.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSyncing}
            className="text-xs rounded-xl"
          >
            Batal
          </Button>

          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isSyncing}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Menyinkronkan ke Database...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                {isBulk
                  ? `Ya, Eksekusi Sinkronisasi (${stats.totalClasses} Rombel)`
                  : 'Ya, Eksekusi Sinkronisasi Sekarang'}
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
});
