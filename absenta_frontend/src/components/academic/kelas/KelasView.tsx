import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { School, Users, FileText, LayoutGrid, Layers, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

import { Modal } from '@/components/ui/Modal';
import { SectionCard, Button } from '@/components/ui';
import { MethodPickerModal } from '@/components/common/MethodPickerModal';
import KelasList from './KelasList';
import { BulkClassModal } from './BulkClassModal';
import { useCapabilities } from '@/hooks/useCapabilities';
import { useJenjang } from '@/hooks/useJenjang';
import type { Kelas } from '@/types/academic';
import { getAcademicStats } from '@/api/academic-stats.api';
import { 
  importKelasFromExcel, 
  getKelasList 
} from '@/api/academic/kelas.api';
import { exportDataToExcel } from '@/utils/export.utils';
import { generateAdvancedTemplate } from '@/utils/excel-advanced.utils';
import { jurusanApi, guruApi } from '@/api/academic.api';
import { cn } from '@/lib/utils';

const KelasForm = lazy(() => import('./KelasForm').then(m => ({ default: m.KelasForm })));
const ExcelImportModal = lazy(() => import('../shared/ExcelImportModal').then(m => ({ default: m.ExcelImportModal })));

export interface UniversalKelasViewProps {
  jurusanId?: string;
  jurusanNama?: string;
  kelasId?: string;
  guruId?: string;
  tahunPelajaranId?: string;
  semesterId?: string;
  isModal?: boolean;
  readOnly?: boolean;
  hideHeaderStats?: boolean;
  hideScopeBanner?: boolean;
  onClose?: () => void;
  className?: string;
}

type ModalMode = 'create' | 'edit' | 'view' | null;

interface ModalState {
  mode: ModalMode;
  kelasId?: string;
  isOpen: boolean;
  initialTingkat?: number;
}

const toRoman = (num: number): string => {
  const lookup: Array<[string, number]> = [
    ['M', 1000], ['CM', 900], ['D', 500], ['CD', 400],
    ['C', 100], ['XC', 90], ['L', 50], ['XL', 40],
    ['X', 10], ['IX', 9], ['VIII', 8], ['VII', 7],
    ['VI', 6], ['V', 5], ['IV', 4], ['III', 3],
    ['II', 2], ['I', 1]
  ];
  let res = '';
  let val = num;
  for (const [roman, limit] of lookup) {
    while (val >= limit) {
      res += roman;
      val -= limit;
    }
  }
  return res || String(num);
};

export const KelasView: React.FC<UniversalKelasViewProps> = React.memo(({
  jurusanId: propJurusanId,
  jurusanNama: propJurusanNama,
  kelasId: propKelasId,
  guruId: propGuruId = '',
  tahunPelajaranId,
  semesterId,
  isModal = false,
  readOnly = false,
  hideHeaderStats = false,
  hideScopeBanner = false,
  onClose,
  className
}) => {
  const navigate = useNavigate();
  const { tingkatList: hookTingkatList } = useJenjang();
  const { isKurikulum, isHomeroomTeacher, isTeacher, isAdmin, isKaprog, kaprogJurusan, can } = useCapabilities();

  // Priority to explicit props
  const effectiveJurusanId = propJurusanId || (isKaprog && kaprogJurusan?.id ? kaprogJurusan.id : undefined);
  const effectiveJurusanNama = propJurusanNama || kaprogJurusan?.nama || 'Kejuruan';
  const isJurusanScoped = Boolean(effectiveJurusanId);

  // Permissions Guard
  const canCreate = !readOnly && (isAdmin || isKurikulum || isKaprog || can('academic.structures.create'));
  const canEdit = !readOnly && (isAdmin || isKurikulum || isKaprog || can('academic.structures.update'));
  const canView = isAdmin || isKurikulum || isHomeroomTeacher || isTeacher || isKaprog || can('academic.structures.view.list');

  // Stats Query
  const { data: statsRes, isLoading: isLoadingStats } = useQuery({
    queryKey: ['academic-stats', effectiveJurusanId],
    queryFn: getAcademicStats,
    enabled: canView,
    staleTime: 5 * 60 * 1000,
  });

  const stats = statsRes?.data || null;

  // Local UI state
  const [modalState, setModalState] = useState<ModalState>({ mode: null, isOpen: false });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [subMode, setSubMode] = useState<'manual' | null>(null);

  const sortedTingkatStats = useMemo(() => {
    const statsMap = new Map((stats?.active_kelas_by_tingkat || [])?.map(item => [item.tingkat, item.count]));
    return (hookTingkatList || [])?.map(t => ({
      tingkat: t,
      count: statsMap.get(t) || 0
    }));
  }, [stats, hookTingkatList]);

  const totalActiveKelasFiltered = useMemo(() => {
    return sortedTingkatStats.reduce((sum, item) => sum + item.count, 0);
  }, [sortedTingkatStats]);

  const handleCreateKelas = useCallback((tingkat?: number) => {
    setModalState({ mode: 'create', isOpen: true, initialTingkat: tingkat });
    setSubMode(null);
  }, []);

  const handleEditKelas = useCallback((k: Kelas) => setModalState({ mode: 'edit', kelasId: k.id, isOpen: true }), []);
  const handleViewKelas = useCallback((k: Kelas) => setModalState({ mode: 'view', kelasId: k.id, isOpen: true }), []);
  const handleCloseModal = useCallback(() => {
    setModalState({ mode: null, isOpen: false });
    setSubMode(null);
  }, []);

  const handleFormSuccess = useCallback(() => {
    handleCloseModal();
    setRefreshTrigger(prev => prev + 1);
  }, [handleCloseModal]);

  const handleExport = useCallback(async () => {
    try {
      setIsExporting(true);
      const response = await getKelasList(1, 1000, '', '', effectiveJurusanId, propGuruId);
      if (response.success && response.data.length > 0) {
        const titleLabel = isJurusanScoped 
          ? `DATA KELAS - ${effectiveJurusanNama.toUpperCase()}` 
          : 'DATA MASTER KELAS & WALI KELAS';
        const filename = isJurusanScoped 
          ? `Laporan_Kelas_${effectiveJurusanNama.replace(/[^a-zA-Z0-9]/g, '_')}` 
          : 'Laporan_Kelas';

        exportDataToExcel<Kelas>(response.data, [
          { header: 'Nama Kelas', accessor: (row: Kelas) => row.nama_kelas, width: 20 },
          { header: 'Tingkat', accessor: (row: Kelas) => `Kelas ${row.tingkat}`, width: 15 },
          { header: 'Jurusan', accessor: (row: Kelas) => row.Jurusan?.nama || 'Umum', width: 25 },
          { header: 'Wali Kelas', accessor: (row: Kelas) => row.WaliKelas?.[0]?.Guru?.nama_guru || '-', width: 25 },
          { header: 'Siswa', accessor: (row: Kelas) => row._count?.Siswa || 0, width: 10 }
        ], filename, titleLabel);
        toast.success('Data kelas berhasil diekspor.');
      } else {
        toast('Tidak ada data untuk diekspor.', { icon: '⚠️' });
      }
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Gagal mengekspor data.';
      toast.error(errorMsg);
    } finally {
      setIsExporting(false);
    }
  }, [effectiveJurusanId, effectiveJurusanNama, isJurusanScoped, propGuruId]);

  const handleTemplateDownload = useCallback(async () => {
    try {
      toast('Menyiapkan referensi data...', { icon: 'ℹ️' });
      const [jurusanRes, guruRes] = await Promise.all([
        jurusanApi.getAll({ limit: 200 }),
        guruApi.getAll({ limit: 1000, jenis_ptk: 'PENDIDIK' })
      ]);

      const jurusanNames = (jurusanRes.data || [])?.map(j => j?.nama).filter(Boolean);
      const guruNames = (guruRes.data || [])?.map(g => g?.nama_guru).filter(Boolean);
      const tingkatList = hookTingkatList?.map(String) || [];

      await generateAdvancedTemplate(
        [
          { header: 'Nama Kelas', key: 'nama_kelas', width: 25, required: true },
          { header: 'Tingkat', key: 'tingkat', width: 12, required: true, dropdown: { refKey: 'tingkat' } },
          { header: 'Nama Jurusan', key: 'nama_jurusan', width: 30, required: true, dropdown: { refKey: 'jurusan' } },
          { header: 'Nama Wali Kelas', key: 'nama_wali_kelas', width: 35, dropdown: { refKey: 'guru' } }
        ],
        {
          fileName: 'template_impor_kelas',
          instructions: [
            'Pilih Tingkat, Jurusan, dan Wali Kelas dari dropdown yang tersedia.',
            'Nama Kelas diisi bebas (contoh: X RPL 1).',
            'Kolom Kuning Emas wajib diisi.'
          ],
          referenceData: {
            tingkat: tingkatList,
            jurusan: jurusanNames,
            guru: guruNames
          }
        }
      );
      toast.success('Template cerdas berhasil diunduh.');
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Gagal mengunduh template.';
      toast.error(errorMsg);
    }
  }, [hookTingkatList]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* 1. Header KPI Stats Cards (Optional) */}
      {!hideHeaderStats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl border border-sky-200/80 dark:border-sky-900/40 bg-sky-50/70 dark:bg-sky-950/30 flex items-center justify-between shadow-2xs">
            <div>
              <div className="text-[11px] font-medium text-sky-700 dark:text-sky-300">
                {isJurusanScoped ? `Total Kelas ${effectiveJurusanNama}` : 'Total Kelas'}
              </div>
              <div className="text-xl font-bold font-mono text-sky-900 dark:text-sky-100 mt-0.5">
                {totalActiveKelasFiltered}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/60 text-sky-600 shadow-2xs">
              <School className="w-5 h-5" />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/40 bg-indigo-50/70 dark:bg-indigo-950/30 flex items-center justify-between shadow-2xs">
            <div>
              <div className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
                Rombel Per Tingkat
              </div>
              <div className="flex items-center gap-2 mt-1">
                {(sortedTingkatStats || []).map((t, idx) => (
                  <span key={idx} className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white/80 dark:bg-slate-900/60 text-indigo-700 dark:text-indigo-300 font-mono">
                    {toRoman(t.tingkat)}: {t.count}
                  </span>
                ))}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/60 text-indigo-600 shadow-2xs">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/70 dark:bg-emerald-950/30 flex items-center justify-between shadow-2xs">
            <div>
              <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                Total Siswa Aktif
              </div>
              <div className="text-xl font-bold font-mono text-emerald-900 dark:text-emerald-100 mt-0.5">
                {stats?.total_siswa || 0}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/60 text-emerald-600 shadow-2xs">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Banner Khusus Kaprog: Hanya muncul jika bukan modal dan tidak di-hide */}
      {isJurusanScoped && !isModal && !hideScopeBanner && (
        <div className="flex items-center gap-2.5 p-3 bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50 rounded-2xl text-xs text-indigo-900 dark:text-indigo-200">
          <ShieldCheck size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
          <div>
            <span className="font-bold">Mode Ketua Program Keahlian (Kaprog):</span>{' '}
            <span>
              Data kelas dan rombel dibatasi otomatis untuk Jurusan{' '}
              <strong>{effectiveJurusanNama}</strong>.
            </span>
          </div>
        </div>
      )}

      {/* 2. Main Section Card Konten KelasList */}
      <SectionCard 
        fullWidth 
        noPadding 
        className={cn(isModal && "!border-0 !shadow-none !bg-transparent")}
      >
        <KelasList
          onAdd={canCreate ? handleCreateKelas : undefined}
          onEdit={canEdit ? handleEditKelas : undefined}
          onView={handleViewKelas}
          onImport={canCreate ? () => setImportOpen(true) : undefined}
          onExport={handleExport}
          isExporting={isExporting}
          refreshTrigger={refreshTrigger}
          guruId={propGuruId}
          jurusanId={effectiveJurusanId}
          isJurusanDisabled={isJurusanScoped}
          readOnly={readOnly}
          activeTahunPelajaran={stats?.tahun_pelajaran?.tahun || undefined}
        />
      </SectionCard>

      {/* Subsystem Modals */}
      <Suspense fallback={<div className="p-8 text-center text-gray-500">Memuat modul import...</div>}>
        <ExcelImportModal
          isOpen={importOpen}
          onClose={() => setImportOpen(false)}
          title="Import Data Kelas"
          onImport={importKelasFromExcel}
          onDownloadTemplate={handleTemplateDownload}
          onSuccess={() => setRefreshTrigger(prev => prev + 1)}
          sampleDataHint="Pastikan nama kelas dan jurusan sudah sesuai dengan standar sekolah."
          successHint={{
            title: "Langkah Selanjutnya: Kelola Status Kelas",
            message: "Setelah import selesai, nonaktifkan kelas-kelas lama yang tidak digunakan di Tahun Pelajaran ini agar tidak mengganggu data absensi dan akademik.",
            actionLabel: "Tutup",
            onAction: () => { setImportOpen(false); },
          }}
        />
      </Suspense>

      <MethodPickerModal
        isOpen={modalState.isOpen && modalState.mode === 'create' && !subMode}
        onClose={handleCloseModal}
        title="Pilih Metode Tambah Kelas"
        options={[
          {
            id: 'manual',
            title: 'Tambah Manual',
            description: 'Isi data kelas secara manual satu per satu. Cocok untuk menambahkan satu kelas khusus atau kustom.',
            icon: FileText,
            actionLabel: 'Mulai Mengisi',
            colorScheme: 'indigo',
            onClick: () => setSubMode('manual')
          },
          {
            id: 'bulk',
            title: 'Buat Kelas Massal (Wizard)',
            description: 'Buat rombel paralel secara massal (wizard) untuk semua tingkat kelas sekaligus. Cepat & otomatis.',
            icon: LayoutGrid,
            actionLabel: 'Buka Wizard',
            colorScheme: 'violet',
            onClick: () => {
              handleCloseModal();
              setBulkOpen(true);
            }
          }
        ]}
      />

      <Modal
        isOpen={modalState.isOpen && (modalState.mode !== 'create' || !!subMode)}
        onClose={handleCloseModal}
        title={modalState.mode === 'create' ? 'Tambah Kelas' : 'Data Kelas'}
        size="xl"
      >
        <Suspense fallback={<div className="p-8 text-center text-gray-500">Memuat form...</div>}>
          {modalState.mode && (
            <KelasForm
              kelasId={modalState.kelasId}
              mode={modalState.mode}
              initialTingkat={modalState.initialTingkat}
              onSuccess={handleFormSuccess}
              onCancel={handleCloseModal}
            />
          )}
        </Suspense>
      </Modal>

      <BulkClassModal
        isOpen={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onSuccess={() => setRefreshTrigger(prev => prev + 1)}
      />
    </div>
  );
});

KelasView.displayName = 'KelasView';
export default KelasView;
