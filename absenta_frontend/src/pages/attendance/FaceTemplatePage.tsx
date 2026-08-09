import React, { useEffect, useMemo, useState, useCallback, lazy, Suspense } from 'react';
// Standardized using lazy( and Suspense
import { 
  SectionCard, 
  Button, 
  Input, 
  Table, 
  EnhancedAlert, 
  Loader, 
  Modal, 
  Badge, 
  Alert, 
  AlertDescription,
  Label
} from '../../components/ui';
import { getFaceTemplates, enrollFaceTemplate, deleteFaceTemplate } from '../../api/attendanceGerbang.api';
import { useAuth } from '../../hooks/useAuth';
import { useCapabilities } from '../../hooks/useCapabilities';
import { useGerbangModeAndRole } from '../../hooks/attendance/useGerbangModeAndRole';
import { Camera, Search, Trash, ScanFace, ShieldCheck, Plus } from 'lucide-react';

import { useAuthStore } from '../../store/authStore';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';

import useConfirm from '../../hooks/useConfirm';
import PageLayout from '../../components/common/PageLayout';

interface FaceTemplate {
  id: string;
  siswa_id: string;
  embedding_type: string;
  model_name?: string;
  created_at: string;
  source?: string;
  Siswa?: {
    id: string;
    nama_siswa: string;
    nis: string;
    Kelas?: {
      nama_kelas: string;
    };
  };
}

const instructionData = {
  title: "Panduan Rekam Wajah",
  description: "Daftarkan wajah siswa ke dalam sistem AI untuk fitur presensi nirsentuh.",
  items: [
    { text: "Pastikan pencahayaan cukup saat melakukan perekaman wajah." },
    { text: "Wajah harus menghadap kamera secara lurus tanpa kacamata hitam atau masker." },
    { text: "Sistem akan mengekstrak ciri wajah unik (descriptor) dan menyimpannya secara aman." }
  ]
};

const breadcrumbs = [
  { label: 'Presensi', path: '/attendance/ops' },
  { label: 'Rekam Wajah Premium', active: true }
];

export const FaceTemplatePage: React.FC = React.memo(() => {
  const { subscription } = useAuthStore();
  const { user, isLoading: authLoading } = useAuth();
  const { isAdmin, can } = useCapabilities();

  const canView = useMemo(() => {
    return isAdmin || can('attendance.manage.face.templates');
  }, [isAdmin, can]);

  const features = (subscription as unknown as Record<string, unknown>)?.features || subscription?.Plan?.features_json || subscription?.plan?.features_json || [];
  const isLocked = !Array.isArray(features) || !features.includes('ABSENSI');

  useGerbangModeAndRole({ user });

  const [items, setItems] = useState<FaceTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [kelasId, setKelasId] = useState<string>('');
  const [pagination, setPagination] = useState({ total: 0, limit: 50, offset: 0 });

  const [showEnroll, setShowEnroll] = useState(false);
  const [sortKey, setSortKey] = useState<string>('Siswa');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const confirm = useConfirm();

  const loadData = useCallback(async () => {
    if (isLocked) return;
    try {
      setLoading(true);
      const res = await getFaceTemplates({ 
        search: searchTerm || undefined, 
        kelas_id: kelasId || undefined, 
        limit: pagination.limit, 
        offset: pagination.offset 
      });
      setItems(res?.data || []);
      if (res?.pagination) {
        setPagination(prev => ({ ...prev, total: res.pagination?.total || 0 }));
      }
    } catch (e: unknown) {
      const errObj = e as { message?: string };
      setError(errObj?.message || 'Gagal memuat template');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, kelasId, pagination.limit, pagination.offset, isLocked]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePageChange = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, offset: (page - 1) * prev.limit }));
  }, []);

  const handleLimitChange = useCallback((limit: number) => {
    setPagination(prev => ({ ...prev, limit, offset: 0 }));
  }, []);

  const handleSort = useCallback((key: string, direction: 'asc' | 'desc') => {
    setSortKey(key);
    setSortDirection(direction);
  }, []);

  const columns = useMemo(() => [
    { 
      key: 'Siswa', 
      label: 'Siswa', 
      sortable: true,
      render: (v: FaceTemplate['Siswa']) => (
        <div className="flex items-center gap-4">
           <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
             <Camera size={18} />
           </div>
           <div>
             <div className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{v?.nama_siswa}</div>
             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{v?.nis}</div>
           </div>
        </div>
      ) 
    },
    { 
      key: 'created_at', 
      label: 'Waktu Rekam', 
      sortable: true,
      render: (v: string) => (
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">
          {new Date(v).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
      )
    },
    { 
      key: 'source', 
      label: 'Sumber', 
      sortable: true,
      render: (v: string) => (
        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 border-slate-200 dark:border-slate-800">
          {v || 'Default'}
        </Badge>
      )
    },
    {
      key: 'actions',
      label: '',
      render: (_: unknown, row: FaceTemplate) => (
        <div className="flex justify-end">
          <Button variant="danger" size="sm" className="rounded-xl h-9 px-3" onClick={async () => {
             const ok = await confirm({
               title: 'Hapus Template Wajah',
               description: 'Apakah Anda yakin ingin menghapus template wajah siswa ini? Siswa tidak akan bisa melakukan absen biometrik.',
               confirmText: 'Ya, Hapus',
               cancelText: 'Batal',
               style: 'danger'
             });
             if (ok) {
               try {
                 await deleteFaceTemplate(row.id);
                 setSuccess('Template berhasil dihapus');
                 loadData();
               } catch (e) {
                 setError('Gagal menghapus template');
               }
             }
          }}>
            <Trash size={14} />
          </Button>
        </div>
      )
    }
  ], [confirm, loadData]);

  if (authLoading) return <div className="flex justify-center py-20"><Loader size="lg" /></div>;
  if (!canView) return <Alert variant="destructive" className="m-4"><AlertDescription>Akses Ditolak</AlertDescription></Alert>;

  const stats = [
    {
      title: "Template Terdaftar",
      value: items.length.toString(),
      icon: <ScanFace size={14} />,
      gradient: "from-blue-500 to-indigo-600",
      subtitle: "Basis data biometrik"
    },
    {
      title: "Status AI",
      value: "Ready",
      icon: <ShieldCheck size={14} />,
      gradient: "from-emerald-500 to-teal-600",
      subtitle: "Face API Loaded"
    }
  ];

  const pageContent = (
    <div className="space-y-6">
      {error && <EnhancedAlert variant="destructive" title="Kesalahan" description={error} dismissible onDismiss={() => setError(null)} />}
      {success && <EnhancedAlert variant="success" title="Berhasil" description={success} dismissible onDismiss={() => setSuccess(null)} />}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
        <div className="relative group">
          <Input 
            placeholder="Cari Nama Siswa atau NIS..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="pl-12 h-14 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold shadow-xl shadow-slate-200/50 dark:shadow-none transition-all group-focus-within:scale-[1.01]"
            aria-label="Cari Template Wajah"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
        </div>
        <div className="flex justify-end">
          <Button 
            onClick={() => setShowEnroll(true)} 
            disabled={isLocked}
            className="h-14 px-8 rounded-xl font-black text-[11px] uppercase tracking-widest bg-slate-900 dark:bg-blue-600 text-white shadow-xl hover:scale-[1.02] active:scale-95 transition-all gap-2"
          >
            <Plus className="w-4 h-4" /> 
            Rekam Wajah Baru
          </Button>
        </div>
      </div>

      <SectionCard title="Daftar Template Wajah" icon={ScanFace} fullWidth noPadding>
        <div className="bg-white dark:bg-slate-950 overflow-hidden">
          <Table
            columns={columns}
            data={items}
            loading={loading}
            emptyMessage="Belum ada template wajah terdaftar. Klik Rekam Wajah Baru untuk memulai."
            compact={true}
            className="border-none"
            sortBy={sortKey}
            sortOrder={sortDirection}
            onSort={handleSort}
            pagination={{
              currentPage: Math.floor(pagination.offset / pagination.limit) + 1,
              totalPages: Math.ceil(pagination.total / pagination.limit) || 1,
              totalItems: pagination.total,
              itemsPerPage: pagination.limit,
              onPageChange: handlePageChange,
              onLimitChange: handleLimitChange
            }}
          />
        </div>
      </SectionCard>

      <Modal
        isOpen={showEnroll}
        onClose={() => setShowEnroll(false)}
        title="Rekam Wajah Baru (AI Face Register)"
        size="lg"
      >
        <div className="space-y-6 pt-4 text-center">
          <ScanFace className="w-16 h-16 mx-auto text-blue-500 animate-pulse" />
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest">
              Registrasi Wajah Siswa
            </h4>
            <p className="text-[11px] font-bold text-slate-400 mt-2 uppercase tracking-wide">
              Registrasi wajah premium dapat diselesaikan langsung melalui Terminal Scanner di modul operator gerbang.
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 text-left text-xs space-y-3">
            <p className="font-bold text-slate-600 dark:text-slate-300">
              Langkah-langkah perekaman biometrik wajah:
            </p>
            <ol className="list-decimal list-inside text-slate-500 space-y-1.5 font-medium leading-relaxed">
              <li>Pilih menu <strong>Kehadiran (Presensi) &gt; Dashboard Gerbang</strong></li>
              <li>Aktifkan <strong>Mode Scanner</strong> atau klik tombol <strong>Registrasi Wajah</strong> di samping profil siswa</li>
              <li>Gunakan webcam/kamera terhubung untuk memindai wajah siswa secara langsung dengan overlay pemandu AI.</li>
            </ol>
          </div>
          <div className="flex pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
            <Button onClick={() => setShowEnroll(false)} className="w-full h-12 rounded-xl font-black text-[11px] uppercase tracking-widest bg-blue-600 text-white shadow-xl">
              Kembali
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );

  return (
    <PageLayout
      title="Rekam Wajah Premium"
      description="Kelola basis data biometrik untuk fitur AI Face Recognition."
      stats={stats}
      instruction={instructionData}
      breadcrumbs={breadcrumbs}
      hardeningModuleKey="facetemplatepage"
    >
      <PremiumFeatureGate
        isLocked={isLocked}
        moduleName="ABSENSI"
        featureName="Biometrik Wajah (AI Recognition)"
        description="Gunakan teknologi AI untuk mengenali wajah siswa secara instan. Fitur ini memungkinkan presensi nirsentuh yang sangat akurat dan sulit dipalsukan."
      >
        {pageContent}
      </PremiumFeatureGate>
    </PageLayout>
  );
});

FaceTemplatePage.displayName = 'FaceTemplatePage';

export default FaceTemplatePage;
