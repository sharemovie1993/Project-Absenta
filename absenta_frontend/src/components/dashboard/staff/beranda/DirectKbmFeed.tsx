import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { 
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw 
} from 'lucide-react';

import { HubCard } from '@/components/ui/hub';
import { cn } from '@/lib/utils';
import type { TimelineItem } from '../tabs/StaffKbmAbsenTab';

import { 
  createSesiAbsensi, 
  getPresensiTerpaduSesi 
} from '@/api/attendanceGerbang.api';
import { toLocalDate, formatLocalDateTime, getVirtualDate } from '@/utils/attendance/time';
import { SesiAttendanceList, type SesiAttendanceRecord } from '@/components/attendance/sesi/SesiAttendanceList';
import { UniversalKbmCard } from '@/components/dashboard/shared/kbm/UniversalKbmCard';
import { BukaSesiFotoModal } from '../modals/BukaSesiFotoModal';
import { PhotoPreviewModal } from '@/components/dashboard/shared/kbm/PhotoPreviewModal';
import { BahanAjarReaderModal } from '@/components/kurikulum/bahan-ajar/BahanAjarReaderModal';
import { JurnalKbmModal } from '@/components/kurikulum/JurnalKbmModal';
import { TeacherKbmLiveWorkspaceModal } from '../modals/TeacherKbmLiveWorkspaceModal';

export interface DirectKbmFeedProps {
  timelineItems: TimelineItem[];
  guruNama?: string;
  guruId?: string;
  onOpenAttendance?: (item: TimelineItem) => void;
  onOpenJournal?: (item: TimelineItem) => void;
  onOpenPhoto?: (item: TimelineItem) => void;
  onRefreshTimeline?: () => void;
  className?: string;
}

export const DirectKbmFeed: React.FC<DirectKbmFeedProps> = React.memo(({
  timelineItems = [],
  guruNama,
  guruId,
  onOpenAttendance,
  onOpenJournal,
  onOpenPhoto,
  onRefreshTimeline,
  className,
}) => {
  const queryClient = useQueryClient();
  const today = toLocalDate(getVirtualDate());

  // ── 1. EXPANDED SESSION STATE & AUTO-EXPAND ──
  const [expandedScheduleId, setExpandedScheduleId] = useState<string | null>(null);
  const hasAutoExpandedRef = useRef<boolean>(false);

  useEffect(() => {
    if (timelineItems.length > 0 && !hasAutoExpandedRef.current) {
      hasAutoExpandedRef.current = true;
      const liveItem = timelineItems.find(item => item.isLive && !item.is_overdue);
      const activeItem = !liveItem && timelineItems.find(item => {
        if (item.is_overdue) return false;
        return item.session && item.session.status !== 'SELESAI';
      });
      const upcomingItem = !liveItem && !activeItem && timelineItems.find(item =>
        !item.is_overdue && !item.isFinished
      );
      const target = liveItem || activeItem || upcomingItem;
      if (target) {
        setExpandedScheduleId(target.id);
      }
    }
  }, [timelineItems]);

  // ── 2. ACTIVE SESSION PRESENSI TERPADU QUERY (STUDENT LIST) ──
  const activeTimelineItem = timelineItems.find(item => item.id === expandedScheduleId);
  const activeSesiId = activeTimelineItem?.session?.id;

  const { data: presensiRes, isLoading: loadingPresensi } = useQuery({
    queryKey: ['sesi-detail-attendance', activeSesiId],
    queryFn: () => getPresensiTerpaduSesi(activeSesiId!),
    enabled: Boolean(activeSesiId),
    refetchInterval: 15000,
  });

  const studentRecords: SesiAttendanceRecord[] = presensiRes?.data || [];

  // ── 3. MUTATION: BUKA SESI KBM DENGAN FOTO SELFIE ──
  const [targetJadwal, setTargetJadwal] = useState<TimelineItem | null>(null);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [workspaceItem, setWorkspaceItem] = useState<TimelineItem | null>(null);

  const openSessionMutation = useMutation({
    mutationFn: async (payload: { jadwal: TimelineItem; fotoDataUrl: string }) => {
      const nowISO = formatLocalDateTime(getVirtualDate());
      const foto = payload.fotoDataUrl;
      const rawJadwalId = (payload.jadwal as any).jadwal_kbm_id || payload.jadwal.id;
      const cleanJadwalId = rawJadwalId ? String(rawJadwalId).replace(/^sched_/, '') : undefined;
      const jamSelesai = (payload.jadwal as any).jam_selesai || null;
      const waktuSelesaiISO = jamSelesai ? `${today}T${jamSelesai}:00${formatLocalDateTime(getVirtualDate()).slice(19)}` : undefined;
      return createSesiAbsensi({
        jadwal_kbm_id: cleanJadwalId,
        kelas_id: payload.jadwal.kelas_id,
        mapel_id: payload.jadwal.mapel_id,
        guru_id: guruId,
        jenis_kegiatan: 'KBM',
        tanggal: today,
        waktu_mulai: nowISO,
        waktu_selesai: waktuSelesaiISO,
        foto_kegiatan: foto,
      } as any);
    },
    onSuccess: (res: any, variables) => {
      const namaKegiatan = variables.jadwal.mapel_nama || (variables.jadwal as any).mapel || variables.jadwal.kegiatan || (variables.jadwal as any).Mapel?.nama_mapel || 'Mata Pelajaran';
      toast.success(`Sesi KBM ${namaKegiatan} berhasil dibuka!`);
      setPhotoModalOpen(false);
      setTargetJadwal(null);
      queryClient.invalidateQueries({ queryKey: ['staff-timeline-unified'] });
      queryClient.invalidateQueries({ queryKey: ['sesi-absensi'] });
      queryClient.invalidateQueries({ queryKey: ['guru-monitoring-unified'] });
      queryClient.invalidateQueries({ queryKey: ['sesi-detail-attendance'] });
      if (onRefreshTimeline) onRefreshTimeline();

      // 🎯 Auto-launch Meja Kerja Kelas saat sesi berhasil dibuka
      if (res?.data) {
        setWorkspaceItem({
          ...variables.jadwal,
          session: res.data,
          isLive: true
        });
      }
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Terjadi kesalahan';
      toast.error('Gagal membuka sesi KBM: ' + msg);
    },
  });

  const handleOpenPhotoModal = useCallback((jadwal: TimelineItem) => {
    if (onOpenPhoto) onOpenPhoto(jadwal);
    setTargetJadwal(jadwal);
    setPhotoModalOpen(true);
  }, [onOpenPhoto]);

  const handleConfirmBukaSesi = useCallback((capturedPhotoUrl: string) => {
    if (!targetJadwal) return;
    openSessionMutation.mutate({ jadwal: targetJadwal, fotoDataUrl: capturedPhotoUrl });
  }, [targetJadwal, openSessionMutation]);

  // ── 4. MODAL PREVIEW FOTO KELAS (LIGHTBOX) ──
  const [previewPhotoData, setPreviewPhotoData] = useState<{
    photoUrl: string;
    guruNama?: string;
    kelasNama?: string;
    mapelNama?: string;
    timestamp?: string;
  } | null>(null);

  // ── 5. MODAL BAHAN AJAR DIGITAL READER ──
  const [readerModalOpen, setReaderModalOpen] = useState(false);
  const [readerContext, setReaderContext] = useState<{
    perangkatId?: string;
    mapelId?: string;
    mapelNama?: string;
    kelasNama?: string;
    tingkat?: string | number;
    fase?: string;
    sourceItem?: any;
  }>({});

  const handleOpenBahanAjar = useCallback((item: any) => {
    setReaderContext({
      perangkatId: item.perangkat_ajar_id || item.mapel_id || item.Mapel?.id,
      mapelId: item.mapel_id || item.Mapel?.id || item.session?.mapel_id,
      mapelNama: item.kegiatan || item.mapel_nama || item.Mapel?.nama_mapel,
      kelasNama: item.kelas_nama,
      tingkat: item.tingkat,
      fase: item.fase,
      sourceItem: item,
    });
    setReaderModalOpen(true);
  }, []);

  // ── 6. MODAL JURNAL KBM FALLBACK ──
  const [targetJournalSesi, setTargetJournalSesi] = useState<{ id: string; progres?: any } | null>(null);
  const [journalModalOpen, setJournalModalOpen] = useState(false);

  const handleOpenJournalModal = useCallback((item: any) => {
    if (onOpenJournal) {
      onOpenJournal(item);
    } else {
      setTargetJournalSesi({
        id: item.session?.id || item.id,
        progres: item.session?.progres || item.progres_materi || item.progres,
      });
      setJournalModalOpen(true);
    }
  }, [onOpenJournal]);

  if (timelineItems.length === 0) {
    return (
      <HubCard className={className} bodyClassName="text-center py-7 px-4 space-y-1.5">
        <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-1">
          <BookOpen size={16} />
        </div>
        <h4 className="text-xs sm:text-[13px] font-bold text-slate-800 dark:text-slate-200">
          Tidak Ada Jadwal KBM Hari Ini
        </h4>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Jadwal Anda bersih atau hari ini merupakan hari libur/kegiatan khusus.
        </p>
      </HubCard>
    );
  }

  const finishedSessions = timelineItems.filter(i => i.isFinished);
  const isAllDone = finishedSessions.length === timelineItems.length;

  return (
    <div className={cn("space-y-3 w-full", className)}>
      {/* ── BANNER JIKA SELURUH KBM SUDAH TUNTAS ── */}
      {isAllDone && (
        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            <span className="font-semibold">Seluruh Sesi Mengajar Hari Ini Telah Tuntas</span>
          </div>
          <span className="text-[10px] font-black bg-emerald-500/10 dark:bg-emerald-500/20 px-2 py-0.5 rounded-md shrink-0">
            {finishedSessions.length} Selesai
          </span>
        </div>
      )}

      {/* ── HEADER FEED SESI KBM ── */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <BookOpen size={14} />
          </div>
          <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Agenda Mengajar Hari Ini
          </h3>
        </div>
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
          {timelineItems.length} Sesi
        </span>
      </div>

      {/* ── DAFTAR SESI MENGAJAR MENGGUNAKAN UNIVERSAL KBM CARD ── */}
      <div className="space-y-3">
        {timelineItems.map((item) => {
          const isExpanded = expandedScheduleId === item.id;
          const hasSession = Boolean(item.session);
          const sesi = item.session;
          const isFinished = item.isFinished ?? item.status?.isFinished ?? (sesi?.status === 'SELESAI');
          const isOverdue = item.is_overdue ?? item.status?.isOverdue ?? false;
          const isStartedByTeacher = Boolean(
            sesi?.foto_kegiatan || 
            (item.guru_status && item.guru_status !== 'BELUM_TAP' && item.guru_status !== 'BELUM_HADIR' && item.guru_status !== 'ALPA')
          );

          const canExpand = Boolean(isStartedByTeacher || isFinished || isOverdue);

          return (
            <UniversalKbmCard
              key={item.id}
              mode="GURU"
              item={item}
              isExpanded={canExpand && isExpanded}
              onToggleExpand={canExpand ? () => setExpandedScheduleId(isExpanded ? null : item.id) : undefined}
              onOpenWorkspace={(it) => setWorkspaceItem(it)}
              onOpenPhotoModal={handleOpenPhotoModal}
              onOpenBahanAjar={handleOpenBahanAjar}
              onViewPhoto={(it) => {
                const pUrl = it.session?.foto_kegiatan || it.foto_kegiatan || it.session?.foto_bukti_url || (it as any).AbsenGuru?.[0]?.foto_masuk;
                if (pUrl) {
                  setPreviewPhotoData({
                    photoUrl: pUrl,
                    guruNama: guruNama || it.guru_nama,
                    kelasNama: it.kelas_nama,
                    mapelNama: it.kegiatan || it.mapel_nama,
                    timestamp: `${it.jam_mulai} - ${it.jam_selesai} WIB`,
                  });
                }
              }}
              onOpenJournalModal={() => handleOpenJournalModal(item)}
              expandedContent={canExpand ? (
                <div className="space-y-4">
                  {/* CASE 0: JADWAL KBM TELAH TERLEWAT (OVERDUE LOCK) */}
                  {isOverdue && !isFinished && (
                    <div className="p-4 sm:p-5 rounded-2xl border border-dashed border-rose-300 dark:border-rose-800/80 bg-rose-50/80 dark:bg-rose-950/25 text-center space-y-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400">
                        <AlertCircle size={20} />
                      </div>
                      <div className="space-y-1 max-w-sm mx-auto">
                        <h5 className="text-xs sm:text-sm font-black text-rose-950 dark:text-rose-100">
                          Sesi KBM Telah Terlewat &amp; Terkunci
                        </h5>
                        <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80 font-medium">
                          Sesi terjadwal pukul {item.jam_mulai} - {item.jam_selesai} WIB dan batas waktu telah berakhir. Hubungi Piket/Kurikulum jika memerlukan koreksi kehadiran.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* CASE 1: SESI TELAH DIMULAI GURU ATAU SELESAI (DAFTAR PRESENSI SISWA) */}
                  {(isStartedByTeacher || isFinished || (isOverdue && hasSession)) && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-mono font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            ID Sesi: {sesi?.id}
                          </span>
                          <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Presensi Siswa ({studentRecords.length || sesi?._summary?.total || 0} Siswa)
                          </h5>
                        </div>
                      </div>

                      {loadingPresensi ? (
                        <div className="py-6 text-center space-y-2">
                          <RefreshCw className="animate-spin text-emerald-400 mx-auto" size={18} />
                          <p className="text-xs font-semibold text-slate-400">Memuat Presensi Siswa...</p>
                        </div>
                      ) : (
                        <SesiAttendanceList
                          records={studentRecords}
                          isReportMode={Boolean(isOverdue || isFinished)}
                          sesi={{
                            id: sesi!.id,
                            status: isFinished ? 'SELESAI' : isOverdue ? 'SELESAI' : 'BERLANGSUNG',
                            guru_id: guruId,
                            nama_guru: guruNama,
                            waktu_mulai: (sesi as any)?.waktu_mulai || (item as any)?.jam_mulai_iso || (item as any)?.waktu_mulai,
                            jam_mulai: item.jam_mulai,
                            jam_selesai: item.jam_selesai,
                            JamPelajaran: {
                              jam_mulai: item.jam_mulai,
                              nama_guru: guruNama,
                              guru_id: guruId
                            }
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              ) : undefined}
            />
          );
        })}
      </div>

      {/* ── MODAL 1: BUKA SESI FOTO (SELFIE GURU) ── */}
      {targetJadwal && (
        <BukaSesiFotoModal
          isOpen={photoModalOpen}
          onClose={() => { setPhotoModalOpen(false); setTargetJadwal(null); }}
          onConfirm={handleConfirmBukaSesi}
          kelasNama={targetJadwal.kelas_nama}
          mapelNama={targetJadwal.kegiatan}
          guruNama={guruNama}
          jenisKegiatan={targetJadwal.jenis_kegiatan}
          activityName={targetJadwal.kegiatan}
          isLoading={openSessionMutation.isPending}
        />
      )}

      {/* ── MODAL 2: JURNAL KBM FALLBACK ── */}
      {targetJournalSesi && (
        <JurnalKbmModal
          isOpen={journalModalOpen}
          onClose={() => { setJournalModalOpen(false); setTargetJournalSesi(null); }}
          sesiId={targetJournalSesi.id}
          initialData={targetJournalSesi.progres}
        />
      )}

      {/* ── MODAL 3: PHOTO PREVIEW MODAL (LIGHTBOX) ── */}
      {previewPhotoData && (
        <PhotoPreviewModal
          isOpen={Boolean(previewPhotoData)}
          onClose={() => setPreviewPhotoData(null)}
          photoUrl={previewPhotoData.photoUrl}
          guruNama={previewPhotoData.guruNama}
          kelasNama={previewPhotoData.kelasNama}
          mapelNama={previewPhotoData.mapelNama}
          timestamp={previewPhotoData.timestamp}
        />
      )}

      {/* ── MODAL 4: BAHAN AJAR DIGITAL READER ── */}
      {readerModalOpen && (
        <BahanAjarReaderModal
          isOpen={readerModalOpen}
          onClose={() => setReaderModalOpen(false)}
          perangkatId={readerContext.perangkatId}
          mapelId={readerContext.mapelId}
          mapelNama={readerContext.mapelNama}
          kelasNama={readerContext.kelasNama}
          tingkat={typeof readerContext.tingkat === 'string' ? Number(readerContext.tingkat) || undefined : readerContext.tingkat}
          fase={readerContext.fase}
          onOpenJurnal={(jurnalData) => {
            setReaderModalOpen(false);
            const targetItem = readerContext.sourceItem || activeTimelineItem;
            if (!targetItem) return;
            const resolvedSesiId = targetItem.session?.id || (targetItem as any).sesi_id;
            if (!resolvedSesiId) {
              toast.error('Silakan buka sesi mengajar terlebih dahulu sebelum mengisi Jurnal KBM.');
              return;
            }
            handleOpenJournalModal({
              ...targetItem,
              progres_materi: {
                ...(targetItem.session?.progres || targetItem.progres_materi || {}),
                judul_materi: jurnalData.judul_materi,
                materi: jurnalData.judul_materi,
                deskripsi: jurnalData.deskripsi,
              },
            });
          }}
        />
      )}
      {/* ── MODAL 5: MEJA KERJA KELAS (ZEN LIVE WORKSPACE) ── */}
      {workspaceItem && (
        <TeacherKbmLiveWorkspaceModal
          isOpen={Boolean(workspaceItem)}
          onClose={() => setWorkspaceItem(null)}
          timelineItem={workspaceItem}
          guruId={guruId}
          guruNama={guruNama}
          onOpenPhotoModal={handleOpenPhotoModal}
          onOpenJournalModal={(it) => {
            handleOpenJournalModal(it);
          }}
          onOpenBahanAjar={(it) => {
            handleOpenBahanAjar(it);
          }}
          onSessionFinished={() => {
            setWorkspaceItem(null);
            if (onRefreshTimeline) onRefreshTimeline();
          }}
        />
      )}
    </div>
  );
});

DirectKbmFeed.displayName = 'DirectKbmFeed';
