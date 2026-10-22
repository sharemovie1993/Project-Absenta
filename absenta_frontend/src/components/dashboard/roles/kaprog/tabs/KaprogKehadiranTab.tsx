import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Activity, ArrowUpRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { KelasKehadiranItem, SiswaAtRiskItem } from '../types';
import { KaprogRekapKolektifModal } from '../modals/KaprogRekapKolektifModal';
import { TrackingSiswaModal } from '@/components/attendance/tracking/TrackingSiswaModal';

interface KaprogKehadiranTabProps {
  kelasKehadiranList: KelasKehadiranItem[];
  atRiskStudents: SiswaAtRiskItem[];
  jurusanId?: string;
  jurusanNama?: string;
  tahunPelajaranId?: string;
  semesterId?: string;
}

const renderTodayStatusBadge = (status?: string, isTodayAlfa?: boolean) => {
  const s = (status || '').toUpperCase();
  if (!s || s === 'BELUM_ADA' || s === 'BELUM_TAP' || s === '-') {
    return <span className="text-slate-400 dark:text-slate-500 font-mono text-xs">-</span>;
  }
  if (s === 'ALPA' || s === 'ALFA' || isTodayAlfa) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 tracking-wide">
        Alpa
      </span>
    );
  }
  if (s === 'HADIR') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 tracking-wide">
        Hadir
      </span>
    );
  }
  if (s === 'TERLAMBAT') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 tracking-wide">
        Terlambat
      </span>
    );
  }
  if (s === 'SAKIT') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 tracking-wide">
        Sakit
      </span>
    );
  }
  if (s === 'IZIN' || s === 'DISPEN') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 tracking-wide">
        Izin
      </span>
    );
  }
  if (s === 'PKL') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 tracking-wide">
        PKL
      </span>
    );
  }
  return <span className="text-slate-400 dark:text-slate-500 font-mono text-xs">{s}</span>;
};

export const KaprogKehadiranTab: React.FC<KaprogKehadiranTabProps> = React.memo(({
  kelasKehadiranList = [],
  atRiskStudents = [],
  jurusanId,
  jurusanNama,
  tahunPelajaranId,
  semesterId,
}) => {
  const navigate = useNavigate();
  const [isRekapModalOpen, setIsRekapModalOpen] = useState(false);
  const [trackingTarget, setTrackingTarget] = useState<{
    isOpen: boolean;
    siswaId?: string;
    siswaNama?: string;
  } | null>(null);

  return (
    <div className="space-y-6">
      {/* Ringkasan Kehadiran Rombel Jurusan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(kelasKehadiranList || [])?.map((kls) => {
          const total = kls.totalSiswa || 1;
          const pct = Math.round((kls.hadirCount / total) * 100);
          const isWarning = pct < 88;

          return (
            <Card
              noPadding
              key={kls.id}
              className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {kls.namaKelas}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Wali: {kls.waliKelas}
                  </p>
                </div>
                <span
                  className={cn(
                    'text-xs font-mono font-bold px-2 py-0.5 rounded-lg',
                    isWarning
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                  )}
                >
                  {pct}%
                </span>
              </div>

              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                <span>Hadir: {kls.hadirCount}/{kls.totalSiswa}</span>
                <div className="flex items-center gap-2">
                  {kls.isPkl && (
                    <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                      • {kls.pklCount} di DUDI
                    </span>
                  )}
                  {kls.izinCount > 0 && <span>I: {kls.izinCount}</span>}
                  {kls.sakitCount > 0 && <span>S: {kls.sakitCount}</span>}
                  {kls.alfaCount > 0 && (
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">
                      A: {kls.alfaCount}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Siswa Butuh Perhatian Khusus (< 85% atau Alfa > 3) */}
      <Card noPadding className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Flag Presensi</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Monitoring ketidakhadiran hari ini dan akumulasi semester berjalan (&lt; 85% atau Alfa &ge; 3 hari).
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRekapModalOpen(true)}
            className="text-xs font-semibold rounded-xl cursor-pointer"
          >
            Rekapitulasi Lengkap
          </Button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200/70 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200/70 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Siswa</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Kelas</th>
                <th className="py-2.5 px-4 text-center whitespace-nowrap">Kehadiran Semester</th>
                <th className="py-2.5 px-4 text-center whitespace-nowrap">Total Alfa</th>
                <th className="py-2.5 px-4 text-center whitespace-nowrap">Status Hari Ini</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Tindak Lanjut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {(atRiskStudents || [])?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400 text-xs">
                    Semua siswa memiliki kehadiran baik di atas 85%.
                  </td>
                </tr>
              ) : (
                (atRiskStudents || [])?.map((siswa) => (
                  <tr key={siswa.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                        {siswa.nama}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        {siswa.nis || '-'}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {siswa.kelas}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className={`font-mono font-bold text-sm ${siswa.persentase < 85 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {siswa.persentase}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
                        {siswa.alfaCount} Alpa
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {renderTodayStatusBadge(siswa.statusHariIni, siswa.isTodayAlfa)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setTrackingTarget({
                              isOpen: true,
                              siswaId: siswa.id,
                              siswaNama: siswa.nama,
                            })
                          }
                          className="h-7 px-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 border border-indigo-200/60 dark:border-indigo-800/60 rounded-lg inline-flex items-center gap-1.5 transition-all duration-150 shadow-2xs hover:shadow-xs group cursor-pointer"
                          title={`Lihat linimasa tracking presensi ${siswa.nama}`}
                        >
                          <Activity className="w-3.5 h-3.5 text-indigo-500 group-hover:scale-110 transition-transform" />
                          <span>Tracking</span>
                          <ArrowUpRight className="w-3 h-3 text-indigo-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Hasil Rekapitulasi Kolektif Terfilter Jurusan */}
      <KaprogRekapKolektifModal
        isOpen={isRekapModalOpen}
        onClose={() => setIsRekapModalOpen(false)}
        jurusanId={jurusanId}
        jurusanNama={jurusanNama}
        kelasKehadiranList={kelasKehadiranList}
        tahunPelajaranId={tahunPelajaranId}
        semesterId={semesterId}
      />

      {/* Modal Tracking Linimasa Siswa Terfilter Jurusan */}
      <TrackingSiswaModal
        isOpen={!!trackingTarget?.isOpen}
        onClose={() => setTrackingTarget(null)}
        siswaId={trackingTarget?.siswaId}
        siswaNama={trackingTarget?.siswaNama}
        jurusanId={jurusanId}
        jurusanNama={jurusanNama}
        tahunPelajaranId={tahunPelajaranId}
        semesterId={semesterId}
      />
    </div>
  );
});

KaprogKehadiranTab.displayName = 'KaprogKehadiranTab';
