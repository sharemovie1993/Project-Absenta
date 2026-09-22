import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowRight, 
  BookOpen, 
  GraduationCap, 
  Printer 
} from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { getShortSubjectName } from '../../../utils/mapelAbbreviator';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { TeacherProgressInfo, TeacherTaskItem } from '../../../types/inputNilai.types';

interface PersonalTeacherProgressWidgetProps {
  progressInfo?: TeacherProgressInfo | null;
  isLoading?: boolean;
  isWaliKelas?: boolean;
  userKelasId?: string | null;
  tahunPelajaranId?: string;
  semesterId?: string;
}

export const PersonalTeacherProgressWidget: React.FC<PersonalTeacherProgressWidgetProps> = ({
  progressInfo,
  isLoading,
  isWaliKelas,
  tahunPelajaranId,
  semesterId,
}) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const buildNilaiUrl = (kelasId?: string, mapelId?: string) => {
    const params = new URLSearchParams({ tab: 'my_tasks' });
    if (kelasId) params.set('kelas_id', kelasId);
    if (mapelId) params.set('mapel_id', mapelId);
    if (tahunPelajaranId) params.set('tahun_pelajaran_id', tahunPelajaranId);
    if (semesterId) params.set('semester_id', semesterId);
    return `/rapor/nilai?${params.toString()}`;
  };

  const tasks = progressInfo?.tasks || [];
  const completed = progressInfo?.completed_tasks || 0;
  const total = progressInfo?.total_tasks || 0;

  // Akumulasi total siswa dan siswa yang sudah dinilai
  const totalSiswa = useMemo(() => {
    if (progressInfo?.total_siswa !== undefined && progressInfo.total_siswa > 0) {
      return progressInfo.total_siswa;
    }
    return tasks.reduce((sum, t) => sum + (t.total_siswa || 0), 0);
  }, [tasks, progressInfo?.total_siswa]);

  const terisiSiswa = useMemo(() => {
    if (progressInfo?.siswa_terisi !== undefined && progressInfo.siswa_terisi > 0) {
      return progressInfo.siswa_terisi;
    }
    return tasks.reduce((sum, t) => sum + (t.siswa_terisi || 0), 0);
  }, [tasks, progressInfo?.siswa_terisi]);

  // Persentase progres riil pengisian nilai siswa
  const percentage = useMemo(() => {
    if (totalSiswa > 0) {
      return Number(((terisiSiswa / totalSiswa) * 100).toFixed(1));
    }
    return progressInfo?.percentage || 0;
  }, [totalSiswa, terisiSiswa, progressInfo?.percentage]);

  if (isLoading) {
    return (
      <Card className="p-6 bg-white dark:bg-slate-900 border-none shadow-xs animate-pulse">
        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/3 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Personal Progress Overview Card */}
      <Card className="p-5 sm:p-6 bg-white dark:bg-slate-900 border-none shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-sm shrink-0">
              {percentage}%
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                <span>Progres Pengisian Rapor Saya</span>
                <Badge variant="outline" className="text-[10px] font-mono border-indigo-200 text-indigo-600 dark:border-indigo-800 dark:text-indigo-400">
                  {completed} / {total} Rombel Tuntas
                </Badge>
                {totalSiswa > 0 && (
                  <Badge variant="outline" className="text-[10px] font-mono border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300">
                    {terisiSiswa} / {totalSiswa} Siswa Dinilai ({percentage}%)
                  </Badge>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Penyelesaian input nilai sumatif pada seluruh rombongan belajar semester aktif ({terisiSiswa} dari total {totalSiswa} siswa telah dinilai)
              </p>
            </div>
          </div>

          <Button
            onClick={() => {
              const firstTarget = tasks.find(t => t.status !== 'completed') || tasks[0];
              const targetUrl = firstTarget 
                ? buildNilaiUrl(firstTarget.kelas_id, firstTarget.mapel_id) 
                : buildNilaiUrl();
              navigate(targetUrl);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer w-full sm:w-auto justify-center"
          >
            Buka Lembar Input Nilai
            <ArrowRight size={13} className="ml-1.5" />
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
          />
        </div>

        {/* Grid Tasks */}
        <div className="space-y-2 pt-2">
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
            Daftar Rombel &amp; Mata Pelajaran yang Anda Ampu:
          </p>
          {tasks.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs italic bg-slate-50 dark:bg-slate-800/40 rounded-xl">
              Tidak ada jadwal mengajar yang terdaftar untuk akun Anda pada semester ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {tasks.map((t, idx) => {
                const isComplete = t.status === 'completed';
                const isPartial = t.status === 'partial';

                return (
                  <div
                    key={idx}
                    onClick={() => navigate(buildNilaiUrl(t.kelas_id, t.mapel_id))}
                    title={`Klik untuk menginput nilai ${t.nama_mapel} kelas ${t.nama_kelas}`}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer hover:shadow-md hover:scale-[1.01] active:scale-[0.99] ${
                      isComplete
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50'
                        : isPartial
                        ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50'
                        : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-black text-xs">
                        {t.nama_kelas}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          isComplete
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                            : isPartial
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                        }`}
                      >
                        {isComplete ? 'Tuntas' : isPartial ? 'Sebagian' : 'Belum'}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100 text-xs truncate mt-2" title={t.nama_mapel}>
                      {getShortSubjectName(t.nama_mapel)}
                    </p>
                    <div className="space-y-1 mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold">
                        <span>Siswa Terisi:</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">
                          {t.siswa_terisi} / {t.total_siswa} {t.total_siswa > 0 ? `(${Math.round((t.siswa_terisi / t.total_siswa) * 100)}%)` : ''}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isComplete
                              ? 'bg-emerald-500'
                              : isPartial
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${t.total_siswa > 0 ? Math.min(100, Math.round((t.siswa_terisi / t.total_siswa) * 100)) : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Homeroom Teacher Quick Hub (if user is also a Wali Kelas) */}
      {isWaliKelas && (
        <Card className="p-5 bg-gradient-to-br from-indigo-50/70 to-blue-50/50 dark:from-indigo-950/30 dark:to-blue-950/20 border border-indigo-200 dark:border-indigo-900/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
              <GraduationCap size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Pusat Kendali Wali Kelas
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pantau kelengkapan nilai seluruh mapel di kelas binaan Anda, isi absensi/catatan rapor, dan cetak lembar e-Rapor.
              </p>
            </div>
          </div>
          <Button
            onClick={() => {
              const params = new URLSearchParams();
              if (userKelasId) params.set('kelas_id', userKelasId);
              if (tahunPelajaranId) params.set('tahun_pelajaran_id', tahunPelajaranId);
              if (semesterId) params.set('semester_id', semesterId);
              const q = params.toString();
              navigate(q ? `/rapor/cetak?${q}` : '/rapor/cetak');
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer w-full sm:w-auto justify-center shrink-0"
          >
            <Printer size={13} className="mr-1.5" />
            Buka Leger &amp; Cetak Rapor
          </Button>
        </Card>
      )}
    </div>
  );
};
