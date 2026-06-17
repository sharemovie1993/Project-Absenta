import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { guruApi } from '../../api/academic.api';
import { getSesiAbsensiList, getSesiAbsenSiswa } from '../../api/attendanceGerbang.api';
import { 
  History, 
  BookOpen, 
  Presentation,
  Target
} from 'lucide-react';
import { 
  Loader,
  Modal,
  SectionCard
} from '../../components/ui';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { useToast } from '../../hooks/useToast';

import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import PageLayout from '../../components/common/PageLayout';

// ── Pillar 5: Lazy Loading ──────────────────────────────────────────────────
const SesiAttendanceList = lazy(() => import('../../components/attendance/sesi/SesiAttendanceList').then(m => ({ default: m.SesiAttendanceList })));
const JurnalKbmModal = lazy(() => import('../../components/kurikulum/JurnalKbmModal').then(m => ({ default: m.JurnalKbmModal })));
const RiwayatAjarToolbar = lazy(() => import('../../components/attendance/sesi/RiwayatAjarToolbar').then(m => ({ default: m.RiwayatAjarToolbar })));
const SesiAjarCard = lazy(() => import('../../components/attendance/sesi/SesiAjarCard').then(m => ({ default: m.SesiAjarCard })));

// ── Pillar 4: Type Safety ───────────────────────────────────────────────────
interface SesiAjar {
  id: string;
  tanggal: string;
  waktu_mulai: string;
  waktu_selesai: string;
  jenis_kegiatan: string;
  status?: 'BERLANGSUNG' | 'SELESAI';
  Kelas?: { nama_kelas: string };
  Mapel?: { nama_mapel: string };
  ProgresMateri?: { 
    judul_materi: string; 
    deskripsi?: string; 
    pencapaian_persen: number; 
    kendala?: string;
    kegiatan?: string;
  } | null;
  summary?: { HADIR: number; TOTAL: number };
}

interface GroupedRiwayat {
  date: string;
  sessions: SesiAjar[];
}

export const RiwayatAjarPage: React.FC = () => {
  const { user, tenantId, subscription } = useAuthStore();
  const { success, error } = useToast();
  
  const features = user?.features || subscription?.Plan?.features_json || subscription?.plan?.features_json || [];
  const isLocked = !Array.isArray(features) || !features.includes('ABSENSI');
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Modal states
  const [selectedSesiForDetail, setSelectedSesiForDetail] = useState<SesiAjar | null>(null);
  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const [journalSesiId, setJournalSesiId] = useState('');
  const [journalInitialData, setJournalInitialData] = useState<SesiAjar['ProgresMateri'] | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  // 1. Get Guru ID from current user context securely using getMe()
  const { data: guruData } = useQuery({
    queryKey: ['guru-profile', user?.id, tenantId],
    queryFn: () => guruApi.getMe(),
    staleTime: 600000,
  });
  const guruId = guruData?.data?.id;

  // 2. Fetch History
  const { data: sesiData, isLoading, refetch } = useQuery({
    queryKey: ['guru-riwayat-ajar', guruId, selectedMonth, selectedYear, tenantId],
    queryFn: () => getSesiAbsensiList({ 
      guru_id: guruId!,
      summary: true, 
      journals: true 
    }),
    enabled: !!guruId,
  });

  // 3. Process & Group History
  const riwayatGrouped = useMemo((): GroupedRiwayat[] => {
    const list = (sesiData?.data || []) as SesiAjar[];
    const filtered = list.filter((s) => {
      const d = new Date(s.tanggal);
      const isCorrectMonth = d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      if (!isCorrectMonth) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (s.Kelas?.nama_kelas?.toLowerCase().includes(q) || false) || 
          (s.Mapel?.nama_mapel?.toLowerCase().includes(q) || false) ||
          (s.jenis_kegiatan?.toLowerCase().includes(q) || false)
        );
      }
      return true;
    });

    const groups: Record<string, SesiAjar[]> = {};
    filtered.forEach((s) => {
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
  }, [sesiData, search, selectedMonth, selectedYear]);

  const { data: detailAttendance, isLoading: detailLoading } = useQuery({
    queryKey: ['sesi-detail-attendance', selectedSesiForDetail?.id, tenantId],
    queryFn: () => getSesiAbsenSiswa(selectedSesiForDetail?.id || ''),
    enabled: !!selectedSesiForDetail?.id,
  });

  const statsCalculation = useMemo(() => {
    const allSesi = (sesiData?.data || []) as SesiAjar[];
    const totalSesi = allSesi.length;
    const totalHadir = allSesi.reduce((acc, curr) => acc + (curr.summary?.HADIR || 0), 0);
    const totalSiswa = allSesi.reduce((acc, curr) => acc + (curr.summary?.TOTAL || 0), 0);
    const avgKehadiran = totalSiswa > 0 ? Math.round((totalHadir / totalSiswa) * 100) : 0;
    const jurnalTerisi = allSesi.filter(s => !!s.ProgresMateri).length;
    return { totalSesi, avgKehadiran, jurnalTerisi };
  }, [sesiData]);

  const stats = useMemo(() => [
    {
      title: "Total Sesi",
      value: statsCalculation.totalSesi.toString(),
      icon: <Presentation size={14} />,
      gradient: "from-blue-500 to-indigo-600",
      subtitle: "Sesi bulan ini"
    },
    {
      title: "Tuntas Jurnal",
      value: statsCalculation.jurnalTerisi.toString(),
      icon: <BookOpen size={14} />,
      gradient: "from-amber-500 to-orange-600",
      subtitle: "Materi terisi"
    },
    {
      title: "Rata Kehadiran",
      value: `${statsCalculation.avgKehadiran}%`,
      icon: <Target size={14} />,
      gradient: "from-emerald-500 to-teal-600",
      subtitle: "Rasio siswa hadir"
    }
  ], [statsCalculation]);

  const handleExport = useCallback(async () => {
    if (isExporting) return;
    if (!sesiData?.data?.length) {
      error('Tidak ada data untuk diekspor');
      return;
    }

    setIsExporting(true);
    try {
      // Catatan Hardening: Halaman ini hanya mengekspor CSV, jika butuh template impor Excel di masa depan gunakan 'generateImportTemplate' dari '@/utils/export.utils'
      const flatList = riwayatGrouped?.flatMap(g => g.sessions || []) || [];
      const headers = ['Tanggal', 'Waktu', 'Kelas', 'Mata Pelajaran', 'Kehadiran Siswa', 'Materi Jurnal'];
      const rows = flatList?.map(s => [
        format(new Date(s.tanggal), 'yyyy-MM-dd'),
        format(new Date(s.waktu_mulai), 'HH:mm'),
        s.Kelas?.nama_kelas || '-',
        s.Mapel?.nama_mapel || s.jenis_kegiatan || '-',
        `${s.summary?.HADIR || 0} / ${s.summary?.TOTAL || 0}`,
        s.ProgresMateri?.judul_materi || '-'
      ]) || [];
      const csvContent = [
        headers.join(','),
        ...rows?.map(row => row?.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `Riwayat_Ajar_${selectedYear}_${selectedMonth + 1}.csv`;
      link.href = url;
      link.click();
      success('Buku Jurnal Riwayat berhasil diunduh');
    } catch (err) {
      console.error(err);
      error(err instanceof Error ? err.message : 'Gagal mengekspor data');
    } finally {
      setIsExporting(false);
    }
  }, [riwayatGrouped, sesiData?.data?.length, selectedMonth, selectedYear, success, error, isExporting]);

  const pageContent = useMemo(() => (
    <div className="space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <Suspense fallback={<div className="h-20 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl" />}>
        {/* Search & Filter Toolbar */}
        <RiwayatAjarToolbar
          search={search}
          setSearch={setSearch}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          onExport={handleExport}
          isExportDisabled={!sesiData?.data?.length || isExporting}
        />
      </Suspense>

      <SectionCard fullWidth>
        {/* Timeline Section */}
        <div className="space-y-16">
          {isLoading ? (
            <div className="flex justify-center py-20"><Loader size="lg" /></div>
          ) : riwayatGrouped.length > 0 ? (
            riwayatGrouped?.map((group) => (
              <div key={group.date} className="relative">
                <div className="flex items-center gap-6 mb-8">
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20"></div>
                    <div className="relative px-6 py-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-lg">
                      <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-3">
                        <span className="text-blue-600">{format(parseISO(group.date), 'dd')}</span>
                        <span className="text-slate-400 uppercase tracking-tighter">{format(parseISO(group.date), 'MMMM yyyy', { locale: id })}</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest">
                          {format(parseISO(group.date), 'EEEE', { locale: id })}
                        </span>
                      </h2>
                    </div>
                  </div>
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-slate-100 to-transparent dark:from-slate-800"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                  <Suspense fallback={<div className="h-40 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl" />}>
                    {group.sessions?.map((sesi) => (
                      <SesiAjarCard
                        key={sesi.id}
                        sesi={sesi}
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
            <div className="py-24 text-center bg-slate-50 dark:bg-slate-900/50 rounded-[4rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
              <div className="w-20 h-20 rounded-3xl bg-white dark:bg-slate-800 flex items-center justify-center mx-auto mb-6 shadow-xl">
                <History className="w-10 h-10 text-slate-200" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Riwayat Kosong</h3>
              <p className="text-[11px] font-bold text-slate-400 mt-2 uppercase tracking-widest max-w-xs mx-auto">Anda belum memiliki catatan sesi mengajar pada periode terpilih.</p>
            </div>
          )}
        </div>
      </SectionCard>

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
          }}
          sesiId={journalSesiId}
          initialData={journalInitialData}
          readOnly={false}
        />
      </Suspense>
    </div>
  ), [
    search, 
    selectedMonth, 
    selectedYear, 
    handleExport, 
    sesiData, 
    isLoading, 
    riwayatGrouped, 
    selectedSesiForDetail, 
    detailLoading, 
    detailAttendance, 
    journalModalOpen, 
    journalSesiId, 
    journalInitialData, 
    refetch,
    isExporting
  ]);

  return (
    <PageLayout
      title="Riwayat Mengajar"
      description="Visualisasi jejak langkah pendidikan dan progres KBM Anda."
      breadcrumbs={[
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Presensi', path: '/attendance' },
        { label: 'Riwayat Mengajar', path: '/attendance/riwayat-ajar' }
      ]}
      stats={stats}
      instruction={{
        title: "Riwayat Mengajar",
        description: "Visualisasi jejak langkah pendidikan Anda dalam satu garis waktu.",
        items: [
          { text: "Warna HIJAU menunjukkan sesi dengan jurnal materi yang sudah tuntas." },
          { text: "Gunakan tombol Export untuk mengunduh buku jurnal mengajar Anda." },
          { text: "Klik pada kartu sesi untuk melihat detail absensi siswa di kelas tersebut." }
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
};

export default RiwayatAjarPage;
