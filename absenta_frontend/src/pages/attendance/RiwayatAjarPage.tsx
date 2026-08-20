import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { useCapabilities } from '../../hooks/useCapabilities';
import { guruApi, kelasApi } from '../../api/academic.api';
import { getSesiAbsensiList, getSesiAbsenSiswa } from '../../api/attendanceGerbang.api';
import { 
  History, 
  BookOpen, 
  Presentation,
  Target,
  Award
} from 'lucide-react';
import { 
  Loader,
  Modal,
  SectionCard
} from '../../components/ui';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { toLocalDate, formatLocalTimeFromISO } from '../../utils/attendance/time';

import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import PageLayout from '../../components/common/PageLayout';

// ── Pillar 5: Lazy Loading ──────────────────────────────────────────────────
const SesiAttendanceList = lazy(() => import('../../components/attendance/sesi/SesiAttendanceList').then(m => ({ default: m.SesiAttendanceList })));
const JurnalKbmModal = lazy(() => import('../../components/kurikulum/JurnalKbmModal').then(m => ({ default: m.JurnalKbmModal })));
const RiwayatAjarToolbar = lazy(() => import('../../components/attendance/sesi/RiwayatAjarToolbar').then(m => ({ default: m.RiwayatAjarToolbar })));
const SesiAjarCard = lazy(() => import('../../components/attendance/sesi/SesiAjarCard').then(m => ({ default: m.SesiAjarCard })));
const BukuJurnalTable = lazy(() => import('../../components/attendance/sesi/BukuJurnalTable').then(m => ({ default: m.BukuJurnalTable })));
const BahanAjarReaderModal = lazy(() => import('../../components/kurikulum/bahan-ajar/BahanAjarReaderModal').then(m => ({ default: m.BahanAjarReaderModal })));

// ── Pillar 4: Type Safety ───────────────────────────────────────────────────
interface SesiAjar {
  id: string;
  tanggal: string;
  waktu_mulai: string;
  waktu_selesai: string;
  jam_mulai?: string;
  jam_selesai?: string;
  jam_label?: string;
  slot_kbm?: number;
  total_jp?: number;
  jenis_kegiatan: string;
  status?: 'BERLANGSUNG' | 'SELESAI' | 'MENDATANG' | string;
  isLive?: boolean;
  Guru?: { nama_guru: string };
  Kelas?: { nama_kelas: string };
  Mapel?: { nama_mapel: string; kode_mapel?: string };
  ProgresMateri?: { 
    id?: string;
    judul_materi: string; 
    deskripsi?: string; 
    pencapaian_persen: number; 
    kendala?: string;
    kegiatan?: string;
  } | null;
  summary?: { 
    HADIR?: number; 
    TOTAL?: number; 
    SAKIT?: number; 
    IZIN?: number; 
    ALPA?: number; 
    TERLAMBAT?: number;
    total?: number;
  };
}

interface GroupedRiwayat {
  date: string;
  sessions: SesiAjar[];
}

export const RiwayatAjarPage: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const { user, tenantId, subscription } = useAuthStore();
  const { isAdmin, isKurikulum, isKepalaSekolah, isTuHead, isTuStaff } = useCapabilities();

  // Determine if current user is a Supervisor / Manager (Kurikulum, Kepsek, Admin, TU Kepegawaian)
  const isManager = useMemo(() => {
    return isAdmin || isKurikulum || isKepalaSekolah || isTuHead || isTuStaff;
  }, [isAdmin, isKurikulum, isKepalaSekolah, isTuHead, isTuStaff]);

  const features = user?.features || subscription?.Plan?.features_json || subscription?.plan?.features_json || [];
  const isLocked = !Array.isArray(features) || !features.includes('ABSENSI');

  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNFILLED' | 'FILLED'>('ALL');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const parts = toLocalDate().split('-').map(Number);
    return parts[1] - 1;
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    const parts = toLocalDate().split('-').map(Number);
    return parts[0];
  });
  
  // Filters
  const [selectedGuruId, setSelectedGuruId] = useState<string>('');
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');
  
  // Modal states
  const [selectedSesiForDetail, setSelectedSesiForDetail] = useState<SesiAjar | null>(null);
  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const [journalSesiId, setJournalSesiId] = useState('');
  const [journalInitialData, setJournalInitialData] = useState<SesiAjar['ProgresMateri'] | null>(null);
  const [readerModalOpen, setReaderModalOpen] = useState(false);
  const [readerPerangkatId, setReaderPerangkatId] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const handleOpenBahanAjar = useCallback((sesi: any) => {
    const targetId = sesi.Mapel?.id || sesi.mapel_id || 'preset-b-indo-fase-e-modul-1';
    setReaderPerangkatId(targetId);
    setReaderModalOpen(true);
  }, []);
  
  // 1. Fetch Teacher & Class Options for Filters
  const { data: guruOptionsData } = useQuery({
    queryKey: ['guru-list-options', tenantId],
    queryFn: () => guruApi.getAll({ limit: 500 }),
    enabled: isManager,
    staleTime: 600000,
  });
  const guruOptions = (guruOptionsData?.data || []).map(g => ({ id: g.id, nama_guru: g.nama_guru }));

  const { data: kelasOptionsData } = useQuery({
    queryKey: ['kelas-list-options', tenantId],
    queryFn: () => kelasApi.getAll({ limit: 200, is_active: true } as any),
    enabled: true,
    staleTime: 600000,
  });
  const kelasOptions = (kelasOptionsData?.data || []).map(k => ({ id: k.id, nama_kelas: k.nama_kelas }));

  // 2. Get Guru Profile if user is a Teacher
  const { data: guruData } = useQuery({
    queryKey: ['guru-profile', user?.id, tenantId],
    queryFn: () => guruApi.getMe(),
    staleTime: 600000,
    enabled: true,
  });
  const loggedInGuruId = guruData?.data?.id || user?.guru_profile?.id;

  const effectiveGuruId = isManager
    ? (selectedGuruId || undefined)
    : loggedInGuruId;

  // 3. Fetch History Sessions
  const { data: sesiData, isLoading, refetch } = useQuery({
    queryKey: ['guru-riwayat-ajar', effectiveGuruId, selectedKelasId, selectedMonth, selectedYear, tenantId, isManager],
    queryFn: () => getSesiAbsensiList({ 
      guru_id: effectiveGuruId,
      kelas_id: selectedKelasId || undefined,
      summary: true, 
      journals: true,
      limit: 300,
    }),
    enabled: isManager || !!loggedInGuruId,
  });

  // Helper to safely extract session array
  const rawList = useMemo((): SesiAjar[] => {
    const raw = (sesiData as any)?.data?.data || (sesiData as any)?.data || sesiData || [];
    if (Array.isArray(raw)) return raw as SesiAjar[];
    if (Array.isArray((raw as any)?.data)) return (raw as any).data as SesiAjar[];
    if (Array.isArray((raw as any)?.items)) return (raw as any).items as SesiAjar[];
    return [];
  }, [sesiData]);

  // Filtered flat list of sessions
  const filteredSessions = useMemo((): SesiAjar[] => {
    return rawList.filter((s) => {
      if (!s?.tanggal) return false;
      const d = new Date(s.tanggal);
      const isCorrectMonth = d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      if (!isCorrectMonth) return false;

      // Status filter
      const progres = s.ProgresMateri;
      const hasJournal = Boolean(progres && (progres.judul_materi || progres.deskripsi));
      if (statusFilter === 'FILLED' && !hasJournal) return false;
      if (statusFilter === 'UNFILLED' && hasJournal) return false;

      if (search) {
        const q = search.toLowerCase();
        return (
          (s.Kelas?.nama_kelas?.toLowerCase().includes(q) || false) || 
          (s.Mapel?.nama_mapel?.toLowerCase().includes(q) || false) ||
          (s.jenis_kegiatan?.toLowerCase().includes(q) || false) ||
          (s.Guru?.nama_guru?.toLowerCase().includes(q) || false) ||
          (s.ProgresMateri?.judul_materi?.toLowerCase().includes(q) || false)
        );
      }
      return true;
    });
  }, [rawList, search, selectedMonth, selectedYear, statusFilter]);

  // 4. Process & Group History for Card/Timeline View
  const riwayatGrouped = useMemo((): GroupedRiwayat[] => {
    const groups: Record<string, SesiAjar[]> = {};
    filteredSessions.forEach((s) => {
      const dateKey = format(new Date(s.tanggal), 'yyyy-MM-dd');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(s);
    });

    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      ?.map(date => ({
        date,
        sessions: (groups[date] || []).sort((a, b) => new Date(b.waktu_mulai).getTime() - new Date(a.waktu_mulai).getTime())
      })) || [];
  }, [filteredSessions]);

  const { data: detailAttendance, isLoading: detailLoading } = useQuery({
    queryKey: ['sesi-detail-attendance', selectedSesiForDetail?.id, tenantId],
    queryFn: () => getSesiAbsenSiswa(selectedSesiForDetail?.id || ''),
    enabled: !!selectedSesiForDetail?.id,
  });

  const statsCalculation = useMemo(() => {
    const allSesi = rawList.filter((s) => {
      if (!s?.tanggal) return false;
      const d = new Date(s.tanggal);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
    const totalSesi = allSesi.length;
    const totalHadir = allSesi.reduce((acc, curr) => acc + (curr.summary?.HADIR || 0), 0);
    const totalSiswa = allSesi.reduce((acc, curr) => acc + (curr.summary?.TOTAL || (curr.summary as any)?.total || 0), 0);
    const avgKehadiran = totalSiswa > 0 ? Math.round((totalHadir / totalSiswa) * 100) : 0;
    const jurnalTerisi = allSesi.filter(s => Boolean(s.ProgresMateri?.judul_materi || s.ProgresMateri?.deskripsi)).length;
    const kepatuhanJurnal = totalSesi > 0 ? Math.round((jurnalTerisi / totalSesi) * 100) : 0;

    return { totalSesi, avgKehadiran, jurnalTerisi, kepatuhanJurnal };
  }, [rawList, selectedMonth, selectedYear]);

  const stats = useMemo(() => [
    {
      title: isManager ? "Total Sesi Sekolah" : "Total Sesi Mengajar",
      value: statsCalculation.totalSesi.toString(),
      icon: <Presentation size={14} />,
      gradient: "from-blue-500 to-indigo-600",
      subtitle: isManager ? "Sesi KBM sekolah bulan ini" : "Pertemuan KBM bulan ini"
    },
    {
      title: isManager ? "Kepatuhan Jurnal" : "Jurnal Terisi",
      value: isManager ? `${statsCalculation.kepatuhanJurnal}%` : `${statsCalculation.jurnalTerisi} / ${statsCalculation.totalSesi}`,
      icon: isManager ? <Award size={14} /> : <BookOpen size={14} />,
      gradient: "from-amber-500 to-orange-600",
      subtitle: isManager ? `${statsCalculation.jurnalTerisi} dari ${statsCalculation.totalSesi} jurnal terisi` : `${statsCalculation.kepatuhanJurnal}% tuntas tercatat`
    },
    {
      title: "Rata-rata Hadir",
      value: `${statsCalculation.avgKehadiran}%`,
      icon: <Target size={14} />,
      gradient: "from-emerald-500 to-teal-600",
      subtitle: "Rasio kehadiran siswa"
    }
  ], [statsCalculation, isManager]);

  const handleExport = useCallback(async () => {
    if (isExporting) return;
    if (!filteredSessions.length) {
      toast.error('Tidak ada data jurnal untuk diekspor');
      return;
    }

    setIsExporting(true);
    try {
      const headers = isManager
        ? ['No', 'Hari/Tanggal', 'Waktu/Jam', 'Guru Pengajar', 'Kelas', 'Mata Pelajaran', 'Kehadiran Siswa', 'Materi Pokok & Capaian', 'Kendala/Catatan']
        : ['No', 'Hari/Tanggal', 'Waktu/Jam', 'Kelas', 'Mata Pelajaran', 'Kehadiran Siswa', 'Materi Pokok & Capaian', 'Kendala/Catatan'];

      const rows = filteredSessions.map((s, idx) => {
        const d = s.tanggal ? format(new Date(s.tanggal), 'dd/MM/yyyy') : '-';
        const jamMulai = s.jam_mulai || formatLocalTimeFromISO(s.waktu_mulai) || '--:--';
        const jamSelesai = s.jam_selesai || formatLocalTimeFromISO(s.waktu_selesai) || '--:--';
        const sum = s.summary || {};
        const hadirStr = `H:${sum.HADIR || 0} S:${sum.SAKIT || 0} I:${sum.IZIN || 0} A:${sum.ALPA || 0}`;
        const materiStr = s.ProgresMateri?.judul_materi ? `${s.ProgresMateri.judul_materi} (${s.ProgresMateri.pencapaian_persen || 0}%)` : 'Belum Diisi';

        const base = [
          idx + 1,
          d,
          `${jamMulai}-${jamSelesai}`,
        ];
        if (isManager) {
          base.push(s.Guru?.nama_guru || '-');
        }
        base.push(
          s.Kelas?.nama_kelas || '-',
          s.Mapel?.nama_mapel || s.jenis_kegiatan || '-',
          hadirStr,
          materiStr,
          s.ProgresMateri?.kendala || '-'
        );
        return base;
      });

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Buku_Jurnal_Mengajar_${selectedMonth + 1}_${selectedYear}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Buku Jurnal Mengajar berhasil diekspor!', { icon: '📄' });
    } catch (err: any) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengekspor data');
    } finally {
      setIsExporting(false);
    }
  }, [filteredSessions, selectedMonth, selectedYear, isExporting, isManager]);

  const pageContent = useMemo(() => (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <Suspense fallback={<div className="h-20 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-3xl" />}>
        {/* Search, View Mode & Filter Toolbar */}
        <RiwayatAjarToolbar
          search={search}
          setSearch={setSearch}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          onExport={handleExport}
          isExportDisabled={!filteredSessions.length || isExporting}
          isManager={isManager}
          selectedGuruId={selectedGuruId}
          setSelectedGuruId={setSelectedGuruId}
          selectedKelasId={selectedKelasId}
          setSelectedKelasId={setSelectedKelasId}
          guruOptions={guruOptions}
          kelasOptions={kelasOptions}
          viewMode={viewMode}
          setViewMode={setViewMode}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
        />
      </Suspense>

      {/* Main Content: Table Mode vs Grid Mode */}
      {viewMode === 'table' ? (
        <Suspense fallback={<div className="h-64 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl" />}>
          <BukuJurnalTable
            sessions={filteredSessions as any}
            isLoading={isLoading}
            isManager={isManager}
            onOpenJournal={(sesiId, initialData) => {
              setJournalSesiId(sesiId);
              setJournalInitialData(initialData);
              setJournalModalOpen(true);
            }}
            onViewDetail={(sesi) => setSelectedSesiForDetail(sesi)}
          />
        </Suspense>
      ) : (
        <SectionCard fullWidth>
          <div className="space-y-12">
            {isLoading ? (
              <div className="flex justify-center py-20"><Loader size="lg" /></div>
            ) : riwayatGrouped.length > 0 ? (
              riwayatGrouped.map((group) => (
                <div key={group.date} className="relative">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="px-4 py-1.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/80 rounded-xl">
                      <h2 className="text-xs font-black text-blue-900 dark:text-blue-200 flex items-center gap-2">
                        <span>{format(parseISO(group.date), 'dd MMMM yyyy', { locale: id })}</span>
                        <span className="text-slate-400">•</span>
                        <span className="uppercase text-[10px] text-blue-600 dark:text-blue-400">
                          {format(parseISO(group.date), 'EEEE', { locale: id })}
                        </span>
                      </h2>
                    </div>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-slate-200 to-transparent dark:from-slate-800"></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                    <Suspense fallback={<div className="h-40 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl" />}>
                      {group.sessions.map((sesi) => (
                        <SesiAjarCard
                          key={sesi.id}
                          sesi={sesi}
                          isManager={isManager}
                          isReadOnly={isManager}
                          onOpenBahanAjar={handleOpenBahanAjar}
                          onOpenJournal={(sesiId, initialData) => {
                            setJournalSesiId(sesiId);
                            setJournalInitialData(initialData);
                            setJournalModalOpen(true);
                          }}
                          onViewDetail={(sesi) => setSelectedSesiForDetail(sesi)}
                        />
                      ))}
                    </Suspense>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-20 text-center bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                <History className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Riwayat Kosong
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Tidak ada catatan sesi mengajar pada periode dan filter terpilih.
                </p>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* Modals */}
      <Modal
        isOpen={!!selectedSesiForDetail}
        onClose={() => setSelectedSesiForDetail(null)}
        title="Daftar Hadir Siswa"
        size="lg"
      >
        <div className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar pt-4">
           {detailLoading ? (
             <div className="py-20 text-center"><Loader /></div>
           ) : (
             <Suspense fallback={<div className="py-20 text-center"><Loader /></div>}>
               <SesiAttendanceList 
                 records={detailAttendance?.data || []} 
                 sesi={(selectedSesiForDetail || undefined) as any} 
               />
             </Suspense>
           )}
         </div>
      </Modal>

      <Suspense fallback={null}>
        <JurnalKbmModal
          isOpen={journalModalOpen}
          onClose={() => {
            setJournalModalOpen(false);
            setJournalSesiId('');
            setJournalInitialData(null);
            refetch();
            queryClient.invalidateQueries({ queryKey: ['guru-riwayat-ajar'] });
            queryClient.invalidateQueries({ queryKey: ['rekapJurnalSesiList'] });
          }}
          sesiId={journalSesiId}
          initialData={journalInitialData}
          readOnly={isManager}
        />

        {readerModalOpen && (
          <BahanAjarReaderModal
            isOpen={readerModalOpen}
            onClose={() => setReaderModalOpen(false)}
            perangkatId={readerPerangkatId}
          />
        )}
      </Suspense>
    </div>
  ), [
    search, 
    viewMode,
    statusFilter,
    selectedMonth, 
    selectedYear, 
    handleExport, 
    filteredSessions,
    isLoading, 
    riwayatGrouped, 
    selectedSesiForDetail, 
    detailLoading, 
    detailAttendance, 
    journalModalOpen, 
    journalSesiId, 
    journalInitialData, 
    readerModalOpen,
    readerPerangkatId,
    handleOpenBahanAjar,
    refetch,
    isExporting,
    isManager,
    selectedGuruId,
    selectedKelasId,
    guruOptions,
    kelasOptions,
    queryClient
  ]);

  return (
    <PageLayout
      title={isManager ? "Supervisi Buku Jurnal Sekolah" : "Buku Agenda & Jurnal Mengajar"}
      description={isManager ? "Monitoring kepatuhan KBM dan audit Jurnal Mengajar seluruh guru sekolah." : "Buku agenda mengajar resmi harian, progres materi, dan rekaman presensi kelas."}
      breadcrumbs={[
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Presensi & KBM', path: '/dashboard?tab=jadwal' },
        { label: 'Buku Jurnal Mengajar', path: '/attendance/riwayat-ajar' }
      ]}
      stats={stats}
      instruction={{
        title: isManager ? "Supervisi Buku Jurnal Sekolah" : "Buku Agenda & Jurnal Mengajar",
        description: isManager ? "Pantau kepatuhan KBM dan jurnal seluruh guru sekolah." : "Buku catatan mengajar harian guru sesuai standar kurikulum.",
        items: isManager ? [
          { text: "Gunakan filter 'Pilih Guru' atau 'Pilih Kelas' untuk menyaring riwayat KBM spesifik." },
          { text: "Gunakan tombol Mode Tabel untuk rekapitulasi cepat atau Mode Kartu untuk linimasa visual." },
          { text: "Klik 'Lihat Jurnal' pada baris tabel untuk memantau isi materi KBM guru (Mode Read-Only)." }
        ] : [
          { text: "Tabel menyajikan seluruh pertemuan mengajar Anda lengkap dengan materi pokok dan persentase ketercapaian." },
          { text: "Klik '+ Isi Jurnal' untuk melengkapi uraian materi pada sesi yang belum sempat dicatat." },
          { text: "Klik 'Cetak / Ekspor PDF' untuk mengunduh berkas rekapitulasi buku agenda mengajar Anda." }
        ]
      }}
      hardeningModuleKey="attendance_riwayat_ajar"
    >
      <PremiumFeatureGate
        isLocked={isLocked}
        moduleName="ABSENSI"
        featureName="Riwayat Mengajar & Jurnal"
        description="Pantau seluruh riwayat sesi mengajar Anda, kelola jurnal KBM, dan lihat statistik kehadiran siswa secara mendalam."
      >
        {pageContent}
      </PremiumFeatureGate>
    </PageLayout>
  );
});

export default RiwayatAjarPage;
