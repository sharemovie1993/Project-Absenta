import React from 'react';
import { Award, BookOpen, Loader2, Sparkles } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { LegerStudent, TranskripNilaiData } from '../../../types/cetakRapor.types';
import { useIsMobile } from '../../../hooks/useIsMobile';

interface TranskripModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStudent: LegerStudent | null;
  transkripData?: TranskripNilaiData | null;
  isLoading: boolean;
}

export const TranskripModal: React.FC<TranskripModalProps> = React.memo(({
  isOpen,
  onClose,
  selectedStudent,
  transkripData,
  isLoading,
}) => {
  const isMobile = useIsMobile();
  if (!isOpen || !selectedStudent) return null;

  const data = transkripData;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title-transkrip"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 bg-white dark:bg-slate-900 space-y-5 shadow-2xl rounded-2xl border-none">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3
              id="modal-title-transkrip"
              className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2"
            >
              <Award className="text-amber-500" size={18} />
              Transkrip Nilai Kumulatif & GPA
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Siswa: <strong className="text-slate-700 dark:text-slate-200">{selectedStudent.nama_siswa}</strong> ({selectedStudent.nis})
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-xl border-slate-200 text-xs font-bold"
          >
            TUTUP
          </Button>
        </div>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-2">
            <Loader2 className="animate-spin text-indigo-600" size={24} />
            <p className="text-xs font-semibold text-slate-400">Mengagregasi data transkrip nilai kumulatif...</p>
          </div>
        ) : data ? (
          <div className="space-y-4">
            {/* Header Ringkasan Ijazah & GPA */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 p-3 rounded-xl">
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 block uppercase">
                  Rata-Rata Ijazah Kumulatif
                </span>
                <span className="text-2xl font-black text-indigo-700 dark:text-indigo-300">
                  {data.ringkasan?.rata_rata_ijazah || 0}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">
                  Total Mata Pelajaran
                </span>
                <span className="text-2xl font-black text-slate-800 dark:text-white">
                  {data.ringkasan?.total_mapel || 0}
                </span>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 p-3 rounded-xl">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block uppercase">
                  Status Kelulusan
                </span>
                <Badge variant="outline" className="mt-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border-emerald-300 font-bold text-xs">
                  {data.ringkasan?.status_kelulusan || 'MEMENUHI KRITERIA'}
                </Badge>
              </div>
            </div>

            {/* Tabel / Kartu Transkrip Nilai */}
            {isMobile ? (
              <div className="space-y-2 max-h-[350px] overflow-y-auto scrollbar-thin">
                {(data.transkrip ?? []).map((t, idx) => (
                  <div
                    key={t.mapel_id || idx}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                        {t.mapel_name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-bold uppercase tracking-wider">
                        {t.kelompok_mapel || 'UMUM'}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Nilai</span>
                      <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm font-mono">
                        {t.rata_rata_mapel}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                      <th className="p-2.5 text-center">No</th>
                      <th className="p-2.5">Mata Pelajaran</th>
                      <th className="p-2.5 text-center">Kelompok</th>
                      <th className="p-2.5 text-center">Nilai Kumulatif</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(data.transkrip ?? []).map((t, idx) => (
                      <tr key={t.mapel_id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-2.5 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">{t.mapel_name}</td>
                        <td className="p-2.5 text-center">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold">
                            {t.kelompok_mapel || 'UMUM'}
                          </span>
                        </td>
                        <td className="p-2.5 text-center font-black text-indigo-600 dark:text-indigo-400 text-sm">
                          {t.rata_rata_mapel}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-6">Data transkrip nilai belum tersedia untuk siswa ini.</p>
        )}
      </Card>
    </div>
  );
});
