import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Modal } from '../../components/ui/Modal';
import KelasList from '../../components/academic/kelas/KelasList';
import { useAuth } from '../../hooks/useAuth';
import { useJenjang } from '../../hooks/useJenjang';
import toast from 'react-hot-toast';
import type { Kelas } from '../../types/academic';
import { getAcademicStats, type AcademicStats } from '../../api/academic-stats.api';
import { School, Users, Download } from 'lucide-react';
import { 
  importKelasFromExcel, 
  downloadKelasImportTemplate, 
  getKelasList 
} from '../../api/academic/kelas.api';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { SectionCard } from '../../components/ui';
import { downloadFileFromBlob, generateStandardFilename } from '../../utils/file-download.utils';
import { exportDataToExcel, generateImportTemplate } from '../../utils/export.utils';
import { generateAdvancedTemplate } from '../../utils/excel-advanced.utils';
import { jurusanApi, guruApi } from '../../api/academic.api';
import { cn } from '../../lib/utils';

const KelasForm = lazy(() => import('../../components/academic/kelas/KelasForm').then(m => ({ default: m.KelasForm })));
const ExcelImportModal = lazy(() => import('../../components/academic/shared/ExcelImportModal').then(m => ({ default: m.ExcelImportModal })));

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

export const KelasPage: React.FC = () => {
  const { can, isLoading: authLoading } = useAuth();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { tingkatList: hookTingkatList } = useJenjang();
  const guruIdFromUrl = searchParams.get('guru_id') || '';

  const [modalState, setModalState] = useState<ModalState>({ mode: null, isOpen: false });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [stats, setStats] = useState<AcademicStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Permissions
  const canCreate = can('academic.structures.create');
  const canEdit = can('academic.structures.update');
  const canView = can('academic.structures.view.list');

  // Load academic stats
  useEffect(() => {
    const loadStats = async () => {
      if (!canView) return;
      try {
        setIsLoadingStats(true);
        const response = await getAcademicStats();
        setStats(response.data);
      } catch (error) {
        console.error('Failed to load academic stats:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };
    loadStats();
  }, [canView, refreshTrigger]);

  const sortedTingkatStats = useMemo(() => {
    return (stats?.active_kelas_by_tingkat || [])
      .slice()
      .sort((a, b) => a.tingkat - b.tingkat);
  }, [stats]);

  const academicStats = useMemo(() => [
    {
      title: "Total Kelas",
      value: stats?.total_kelas || 0,
      icon: <School size={14} />,
      gradient: "from-blue-500 to-cyan-600",
      subtitle: "Total semua kelas terdaftar"
    },
    {
      title: "Jumlah Rombel Per Tingkat",
      variant: "sub-cards" as const,
      value: sortedTingkatStats.length === 0 ? "Tidak ada rombel aktif" : undefined,
      subCards: sortedTingkatStats.map((item, index) => {
        const themes = [
          {
            bg: "bg-sky-50/50 dark:bg-sky-950/20",
            border: "border-sky-100 dark:border-sky-900/40 hover:border-sky-300 dark:hover:border-sky-850",
            text: "text-sky-600 dark:text-sky-400"
          },
          {
            bg: "bg-violet-50/50 dark:bg-violet-950/20",
            border: "border-violet-100 dark:border-violet-900/40 hover:border-violet-300 dark:hover:border-violet-850",
            text: "text-violet-600 dark:text-violet-400"
          },
          {
            bg: "bg-rose-50/50 dark:bg-rose-950/20",
            border: "border-rose-100 dark:border-rose-900/40 hover:border-rose-300 dark:hover:border-rose-850",
            text: "text-rose-600 dark:text-rose-400"
          }
        ];
        const theme = themes[index % themes.length];
        return {
          label: toRoman(item.tingkat),
          value: item.count,
          bgClass: theme.bg,
          borderClass: theme.border,
          textClass: theme.text
        };
      }),
      icon: <School size={14} />,
      gradient: "from-indigo-500 to-purple-600"
    },
    {
      title: "Total Siswa",
      value: stats?.total_siswa || 0,
      icon: <Users size={14} />,
      gradient: "from-green-500 to-emerald-600",
      subtitle: "Siswa terdaftar aktif",
      onClick: () => navigate('/academic/siswa')
    }
  ], [stats, sortedTingkatStats, navigate]);

  const handleCreateKelas = useCallback((tingkat?: number) => setModalState({ mode: 'create', isOpen: true, initialTingkat: tingkat }), []);
  const handleEditKelas = useCallback((k: Kelas) => setModalState({ mode: 'edit', kelasId: k.id, isOpen: true }), []);
  const handleViewKelas = useCallback((k: Kelas) => setModalState({ mode: 'view', kelasId: k.id, isOpen: true }), []);
  const handleCloseModal = useCallback(() => setModalState({ mode: null, isOpen: false }), []);

  const handleFormSuccess = useCallback(() => {
    handleCloseModal();
    setRefreshTrigger(prev => prev + 1);
  }, [handleCloseModal]);

  const handleExport = useCallback(async () => {
    try {
      setIsExporting(true);
      // Fetch all data (limit 1000 to get all classes)
      const response = await getKelasList(1, 1000);
      if (response.success && response.data.length > 0) {
        exportDataToExcel<Kelas>(response.data, [
          { header: 'Nama Kelas', accessor: (row: Kelas) => row.nama_kelas, width: 20 },
          { header: 'Tingkat', accessor: (row: Kelas) => `Kelas ${row.tingkat}`, width: 15 },
          { header: 'Jurusan', accessor: (row: Kelas) => row.Jurusan?.nama || 'Umum', width: 25 },
          { header: 'Wali Kelas', accessor: (row: Kelas) => row.WaliKelas?.[0]?.Guru?.nama_guru || '-', width: 25 },
          { header: 'Siswa', accessor: (row: Kelas) => row._count?.Siswa || 0, width: 10 }
        ], 'Laporan_Kelas', 'DATA MASTER KELAS & WALI KELAS');
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
  }, []);

  const handleTemplateDownload = useCallback(async () => {
    try {
      toast('Menyiapkan referensi data...', { icon: 'ℹ️' });
      const [jurusanRes, guruRes] = await Promise.all([
        jurusanApi.getAll({ limit: 200 }),
        guruApi.getAll({ limit: 1000 })
      ]);

      const jurusanNames = (jurusanRes.data || [])?.map(j => j?.nama).filter(Boolean);
      const guruNames = (guruRes.data || [])?.map(g => g?.nama_guru).filter(Boolean);
      const tingkatList = hookTingkatList.map(String);

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
  }, []);

  return (
    <AcademicPageLayout
      title="Data Kelas"
      description="Kelola data kelas-kelas belajar siswa. Digunakan setiap akhir tahun ajaran saat bersiap membagi kelas baru."
      stats={academicStats}
      isLoadingStats={isLoadingStats}
      breadcrumbs={[
        { label: 'Akademik', path: '/academic' },
        { label: 'Kelas', path: '/academic/kelas' }
      ]}
      instruction={{
        title: "Panduan Kelas",
        description: (
          <div className="space-y-2">
            <p>Daftar kelas belajar siswa. Kelas ini nantinya akan dihubungkan dengan wali kelas dan siswa pada tahun ajaran yang aktif.</p>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-slate-500">
              <p><strong>Fungsi:</strong> Mengatur kelas belajar siswa.</p>
              <p><strong>Waktu Penggunaan:</strong> Setiap akhir tahun ajaran menjelang kenaikan kelas.</p>
            </div>
          </div>
        ),
        items: [
          { text: "Hubungkan kelas dengan Jurusan dan Wali Kelas." },
          { text: "Gunakan fitur Impor untuk migrasi data massal." },
          { text: "Satu kelas bisa memiliki banyak siswa yang terdaftar aktif." }
        ]
      }}
      canView={canView}
      isLoading={authLoading}
      permissionMessage="Anda tidak memiliki izin untuk mengakses data kelas."
      hardeningModuleKey="academic_kelas"
    >
      <div className="space-y-6">
        <SectionCard
          fullWidth
          noPadding
        >
          <KelasList
            onAdd={canCreate ? handleCreateKelas : undefined}
            onEdit={canEdit ? handleEditKelas : undefined}
            onView={handleViewKelas}
            onImport={canCreate ? () => setImportOpen(true) : undefined}
            onExport={handleExport}
            isExporting={isExporting}
            refreshTrigger={refreshTrigger}
            guruId={guruIdFromUrl}
            activeTahunPelajaran={stats?.tahun_pelajaran?.tahun || undefined}
          />
        </SectionCard>
      </div>

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
            message: "Setelah import selesai, nonaktifkan kelas-kelas lama yang tidak digunakan di Tahun Pelajaran ini agar tidak mengganggu data absensi dan akademik. Kelas yang tidak aktif tidak akan muncul di pilihan absensi dan pembagian siswa.",
            actionLabel: "Kelola Status Kelas Sekarang",
            onAction: () => { setImportOpen(false); },
          }}
        />
      </Suspense>

      <Modal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        title={modalState.mode === 'create' ? 'Tambah Kelas' : 'Data Kelas'}
        size="xl"
      >
        {modalState.mode && (
          <Suspense fallback={<div className="p-8 text-center text-gray-500">Memuat form...</div>}>
            <KelasForm
              kelasId={modalState.kelasId}
              mode={modalState.mode}
              initialTingkat={modalState.initialTingkat}
              onSuccess={handleFormSuccess}
              onCancel={handleCloseModal}
            />
          </Suspense>
        )}
      </Modal>
    </AcademicPageLayout>
  );
};

export default KelasPage;

