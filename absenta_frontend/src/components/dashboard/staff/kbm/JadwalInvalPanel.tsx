import React, { useState } from 'react';
import { Clock, UserCheck, AlertCircle, FileText, CheckCircle2, ChevronRight, BookOpen, Loader2, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { guruIzinApi, type PermohonanIzinGuruItem } from '../../../../api/guruIzin.api';
import { useGuruMe } from '../../../../hooks/useGuruMe';
import { useAuthStore } from '../../../../store/authStore';

export const JadwalInvalPanel: React.FC = () => {
  const { user } = useAuthStore();
  const { guruProfile } = useGuruMe();
  const currentGuruId = guruProfile?.id || (user as any)?.guru_id || (user as any)?.Guru?.id;

  const [selectedTaskDetail, setSelectedTaskDetail] = useState<PermohonanIzinGuruItem | null>(null);

  // Fetch real Inval assignments assigned to this teacher
  const { data: invalRes, isLoading, refetch } = useQuery({
    queryKey: ['guru-inval-list-me', currentGuruId],
    queryFn: () => guruIzinApi.getAll({
      guru_inval_id: currentGuruId,
      status: 'DISETUJUI',
      limit: 50
    }),
    enabled: !!currentGuruId
  });

  const invalList: PermohonanIzinGuruItem[] = React.useMemo(() => {
    const raw = (invalRes as any)?.data;
    return Array.isArray(raw) ? raw : [];
  }, [invalRes]);

  const handleMasukKelas = (inval: PermohonanIzinGuruItem) => {
    toast.success(`Membuka pendampingan KBM untuk kelas ${inval.Guru?.nama_guru || 'Guru'}!`, { icon: '👥' });
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck size={16} className="text-purple-600 dark:text-purple-400" />
            <span>Penugasan Guru Inval / Pengganti KBM</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Daftar kelas yang didelegasikan oleh Guru Piket untuk Anda dampingi
          </p>
        </div>
        <span className="px-3 py-1 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-xs border border-purple-200 dark:border-purple-800">
          {invalList.length} Penugasan Aktif
        </span>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-2">
          <Loader2 size={24} className="animate-spin text-purple-600 dark:text-purple-400 mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Memuat daftar tugas inval...</p>
        </div>
      ) : invalList.length > 0 ? (
        <div className="space-y-3">
          {invalList.map((item) => {
            const isSingleDay = item.tanggal_mulai === item.tanggal_selesai;
            const dateDisplay = isSingleDay
              ? formatDate(item.tanggal_mulai)
              : `${formatDate(item.tanggal_mulai)} s/d ${formatDate(item.tanggal_selesai)}`;
            
            const timeDisplay = item.tipe_durasi === 'SEBAGIAN_SESI' && item.jam_mulai && item.jam_selesai
              ? `${item.jam_mulai} - ${item.jam_selesai} WIB`
              : item.tipe_durasi === 'MULTI_HARI' ? 'Multi Hari' : '1 Hari Penuh';

            return (
              <div
                key={item.id}
                className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-purple-200/80 dark:border-purple-900/60 shadow-xs space-y-3.5 transition-all hover:border-purple-400"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-black text-xs border border-purple-200 dark:border-purple-800">
                      TUGAS INVAL
                    </span>
                    <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1">
                      <Calendar size={13} className="text-slate-400" />
                      <span>{dateDisplay}</span>
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 font-mono font-bold flex items-center gap-1">
                      <Clock size={12} className="text-slate-400" />
                      <span>{timeDisplay}</span>
                    </span>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase self-start sm:self-auto border border-emerald-200 dark:border-emerald-800">
                    DISETUJUI PIKET
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Guru Pengampu Utama</label>
                    <p className="font-extrabold text-slate-900 dark:text-slate-100 mt-0.5 text-sm">
                      {item.Guru?.nama_guru || 'Guru Pengampu'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      Alasan: <strong className="text-purple-700 dark:text-purple-300">{item.tipe_izin}</strong> ({item.alasan})
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <BookOpen size={12} className="text-blue-500" />
                      <span>Instruksi Tugas Titipan:</span>
                    </label>
                    <div className="text-slate-800 dark:text-slate-200 bg-blue-50/50 dark:bg-blue-950/30 p-2.5 rounded-xl border border-blue-200/70 dark:border-blue-900/50 font-medium text-xs whitespace-pre-wrap">
                      {item.instruksi_tugas || 'Siswa ditugaskan belajar mandiri sesuai materi bab berjalan.'}
                    </div>

                    {item.tugas_per_kelas && Object.keys(item.tugas_per_kelas).length > 0 && (
                      <div className="pt-1 space-y-1">
                        <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">Rincian Per Kelas:</span>
                        {Object.entries(item.tugas_per_kelas).map(([kId, taskTxt]) => (
                          <div key={kId} className="p-2 rounded-lg bg-purple-50/30 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-800/40 text-[11px]">
                            <span className="font-bold text-purple-700 dark:text-purple-300">Kelas {kId}: </span>
                            <span className="text-slate-700 dark:text-slate-300">{String(taskTxt)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {item.file_tugas_url && (
                  <div className="pt-1">
                    <a
                      href={item.file_tugas_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold text-xs hover:underline"
                    >
                      <FileText size={13} />
                      <span>Unduh Lembar Kerja / Modul yang Dititipkan</span>
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-1.5">
          <CheckCircle2 size={24} className="text-emerald-500 mx-auto" />
          <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">Tidak Ada Tugas Inval</h4>
          <p className="text-[11px] text-slate-400">Anda tidak sedang ditugaskan menggantikan kelas kosong saat ini.</p>
        </div>
      )}
    </div>
  );
};
