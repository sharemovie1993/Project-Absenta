import React, { Suspense, lazy } from 'react';
import { CalendarCheck } from 'lucide-react';

// Code-splitting universal monthly daily-matrix attendance view (Pilar 21B & TBT Optimization)
const RekapAbsensiPklView = lazy(() =>
  import('@/components/hubin/absensi/RekapAbsensiPklView').then((m) => ({ default: m.RekapAbsensiPklView }))
);

export interface KaprogRekapPresensiPklTabProps {
  jurusanId?: string;
  jurusanNama?: string;
  tahunPelajaranId?: string;
  semesterId?: string;
}

export const KaprogRekapPresensiPklTab: React.FC<KaprogRekapPresensiPklTabProps> = React.memo(({
  jurusanId,
  jurusanNama = 'Kejuruan',
  tahunPelajaranId,
  semesterId,
}) => {
  return (
    <div className="space-y-4">
      {/* ── Action Header ala Kaprog ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shadow-xs shrink-0">
            <CalendarCheck size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Rekap Presensi Siswa PKL Jurusan {jurusanNama}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Matriks pemantauan kehadiran harian siswa PKL di mitra industri (versi matriks tanggal per hari).
            </p>
          </div>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="p-12 text-center text-xs text-slate-400">
            <div className="animate-spin w-8 h-8 mx-auto text-emerald-600 mb-2 border-2 border-current border-t-transparent rounded-full" />
            Memuat rekapitulasi presensi siswa PKL...
          </div>
        }
      >
        <RekapAbsensiPklView
          jurusanId={jurusanId}
          jurusanNama={jurusanNama}
          tahunPelajaranId={tahunPelajaranId}
          semesterId={semesterId}
          hideLayout={true}
          className="w-full"
        />
      </Suspense>
    </div>
  );
});

KaprogRekapPresensiPklTab.displayName = 'KaprogRekapPresensiPklTab';
export default KaprogRekapPresensiPklTab;
