import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  BookOpen,
  GraduationCap,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  PenTool,
} from 'lucide-react';
import { kurikulumApi } from '@/api/kurikulum.api';
import { HubCard } from '@/components/ui/hub';
import { safeArr } from '@/components/kurikulum/dashboard/DashboardComponents';

interface TeacherCoreWorkspaceBentoProps {
  guruId?: string;
  guruNama?: string;
  timelineItems?: any[];
  unfilledJournalsCount?: number;
  totalJpToday?: number;
  onOpenJournal?: (sesi?: any) => void;
  onNavigateTab?: (tabId: string) => void;
  className?: string;
}

export const TeacherCoreWorkspaceBento: React.FC<TeacherCoreWorkspaceBentoProps> = React.memo(({
  guruId,
  guruNama,
  timelineItems = [],
  unfilledJournalsCount = 0,
  totalJpToday = 0,
  onOpenJournal,
  onNavigateTab,
  className,
}) => {
  const navigate = useNavigate();

  // 1. Query Dokumen Perangkat Ajar Guru Sendiri
  const { data: myPerangkatRes, isLoading: loadingPerangkat } = useQuery({
    queryKey: ['my-perangkat-workspace', guruId],
    queryFn: () => kurikulumApi.getPerangkatAjar({ guru_id: guruId }).catch(() => ({ success: true, data: [] })),
    enabled: Boolean(guruId),
    staleTime: 60 * 1000,
  });

  const perangkatList = safeArr<any>(myPerangkatRes?.data || myPerangkatRes);
  const totalPerangkat = perangkatList.length;
  const approvedPerangkat = perangkatList.filter((p: any) => p.status?.toUpperCase() === 'APPROVED').length;
  const rejectedPerangkat = perangkatList.filter((p: any) => p.status?.toUpperCase() === 'REJECTED').length;
  const pendingPerangkat = perangkatList.filter((p: any) => !p.status || p.status?.toUpperCase() === 'PENDING').length;

  // 2. Query Supervisi Akademik Guru Sendiri
  const { data: supervisiRes, isLoading: loadingSupervisi } = useQuery({
    queryKey: ['my-supervisi-workspace', guruId],
    queryFn: () => kurikulumApi.getSupervisi({ guru_id: guruId }).catch(() => ({ success: true, data: [] })),
    enabled: Boolean(guruId),
    staleTime: 2 * 60 * 1000,
  });

  const supervisiList = safeArr<any>(supervisiRes?.data || supervisiRes);
  const latestSupervisi = supervisiList[0] || null;

  // Handler Aksi Cepat Jurnal
  const handleJurnalClick = () => {
    const targetSession = timelineItems.find((i: any) => !i.isFinished || !i.session?.jurnal_kbm) || timelineItems[0];
    if (onOpenJournal && targetSession) {
      onOpenJournal(targetSession);
    } else {
      navigate('/attendance/ops?tab=sesi');
    }
  };

  return (
    <div className={className}>
      <HubCard
        title="Meja Kerja Pendidik"
        badge="Tugas Pokok"
        badgeVariant="emerald"
        action={
          <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline font-medium">
            Ruang Operasional Guru Pengajar
          </span>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* ─── KARTU 1: PERANGKAT AJAR (PLANNING) ─── */}
          <div
            onClick={() => navigate('/kurikulum/perangkat')}
            className="group relative flex flex-col justify-between p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-950/60 bg-gradient-to-br from-emerald-50/50 via-white to-white dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-bold">
                  <FileText size={17} />
                </div>
                {rejectedPerangkat > 0 ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 animate-pulse">
                    <AlertCircle size={11} /> {rejectedPerangkat} Perlu Revisi
                  </span>
                ) : totalPerangkat > 0 ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
                    <CheckCircle2 size={11} /> {approvedPerangkat}/{totalPerangkat} Disetujui
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    Belum Unggah
                  </span>
                )}
              </div>

              <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                Perangkat & Modul Ajar
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                {rejectedPerangkat > 0
                  ? 'Ada berkas yang memerlukan revisi dari tim Kurikulum.'
                  : totalPerangkat > 0
                  ? `${totalPerangkat} Berkas tersimpan (Modul Ajar, ATP, Promes).`
                  : 'Kelola ATP, Modul Ajar, Silabus, dan Template Generator AI.'}
              </p>
            </div>

            <div className="pt-3 mt-2 border-t border-emerald-50 dark:border-emerald-950/40 flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs font-bold">
              <span>Buka Meja Perangkat</span>
              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* ─── KARTU 2: JURNAL & AGENDA KBM (EXECUTION) ─── */}
          <div
            onClick={handleJurnalClick}
            className="group relative flex flex-col justify-between p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-950/60 bg-gradient-to-br from-indigo-50/50 via-white to-white dark:from-indigo-950/20 dark:via-slate-900 dark:to-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold">
                  <PenTool size={16} />
                </div>
                {unfilledJournalsCount > 0 ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300">
                    <Clock size={11} /> {unfilledJournalsCount} Belum Diisi
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                    <CheckCircle2 size={11} /> Jurnal Tuntas
                  </span>
                )}
              </div>

              <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">
                Jurnal & Agenda KBM
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                {totalJpToday > 0
                  ? `Hari ini: ${totalJpToday} JP mengajar. Dokumentasikan materi dan presensi.`
                  : 'Catatan materi mengajar, pencapaian TP, dan riwayat presensi harian.'}
              </p>
            </div>

            <div className="pt-3 mt-2 border-t border-indigo-50 dark:border-indigo-950/40 flex items-center justify-between text-indigo-700 dark:text-indigo-400 text-xs font-bold">
              <span>Isi Jurnal Hari Ini</span>
              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* ─── KARTU 3: BUKU NILAI & ASESMEN (EVALUATION) ─── */}
          <div
            onClick={() => navigate('/rapor/input-nilai')}
            className="group relative flex flex-col justify-between p-3.5 rounded-xl border border-purple-100 dark:border-purple-950/60 bg-gradient-to-br from-purple-50/50 via-white to-white dark:from-purple-950/20 dark:via-slate-900 dark:to-slate-900 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/60 flex items-center justify-center text-purple-700 dark:text-purple-300 font-bold">
                  <GraduationCap size={17} />
                </div>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300">
                  Formatif & Sumatif
                </span>
              </div>

              <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">
                Buku Nilai & Asesmen
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                Input capaian Tujuan Pembelajaran (TP), nilai harian siswa, dan nilai rapor semester.
              </p>
            </div>

            <div className="pt-3 mt-2 border-t border-purple-50 dark:border-purple-950/40 flex items-center justify-between text-purple-700 dark:text-purple-400 text-xs font-bold">
              <span>Buka Input Nilai</span>
              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* ─── KARTU 4: SUPERVISI AKADEMIK SAYA (REFLECTION) ─── */}
          <div
            onClick={() => {
              if (onNavigateTab) {
                onNavigateTab('rekap_mapel');
              } else {
                navigate('/dashboard?tab=rekap_mapel');
              }
            }}
            className="group relative flex flex-col justify-between p-3.5 rounded-xl border border-amber-100 dark:border-amber-950/60 bg-gradient-to-br from-amber-50/50 via-white to-white dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900 hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-700 dark:text-amber-300 font-bold">
                  <ShieldCheck size={17} />
                </div>
                {latestSupervisi?.skor_akhir ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300">
                    Skor: {latestSupervisi.skor_akhir}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    Aktif
                  </span>
                )}
              </div>

              <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                Supervisi & Rekap Mapel
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                {latestSupervisi?.catatan_saran
                  ? `Catatan: "${latestSupervisi.catatan_saran.slice(0, 45)}..."`
                  : 'Pantau rekapitulasi presensi per rombel mapel dan jadwal supervisi berkala.'}
              </p>
            </div>

            <div className="pt-3 mt-2 border-t border-amber-50 dark:border-amber-950/40 flex items-center justify-between text-amber-700 dark:text-amber-400 text-xs font-bold">
              <span>Lihat Rekapitulasi</span>
              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </HubCard>
    </div>
  );
});

TeacherCoreWorkspaceBento.displayName = 'TeacherCoreWorkspaceBento';
