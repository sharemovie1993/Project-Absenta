import React, { useEffect, useMemo, useState, useCallback, lazy, Suspense } from 'react';
import { 
  SectionCard
} from '../../components/ui';
import { 
  ListChecks 
} from 'lucide-react';
import { jenisKegiatanMasterApi, type JenisKegiatanMaster } from '../../api/academic/jenisKegiatanMaster.api';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useDebounce } from '../../hooks/useDebounce';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { JenisKegiatanList } from '../../components/academic/jenis-kegiatan/JenisKegiatanList';
import useConfirm from '../../hooks/useConfirm';
import { exportDataToExcel } from '../../utils/export.utils';
import { Loader } from '../../components/ui/Loader';

const Modal = lazy(() => import('../../components/ui/Modal').then(module => ({ default: module.Modal })));
const JenisKegiatanForm = lazy(() => import('../../components/academic/jenis-kegiatan/JenisKegiatanForm').then(module => ({ default: module.JenisKegiatanForm })));

type ModalMode = 'create' | 'edit' | 'view' | null;

export default function JenisKegiatanMasterPage() {
  const { can, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const showConfirm = useConfirm();
  
  const canManage = can('academic.activities.types.manage');
  const [items, setItems] = useState<JenisKegiatanMaster[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await jenisKegiatanMasterApi.getAll({ limit: 100, search: debouncedSearch });
      setItems(res.data || []);
    } catch (error: unknown) {
      console.error(error);
      showToast('Gagal memuat data kategori kegiatan', 'error');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, showToast]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const openCreate = () => { setSelectedId(undefined); setModalMode('create'); };
  const openEdit = (item: JenisKegiatanMaster) => { setSelectedId(item.id); setModalMode('edit'); };
  const openView = (item: JenisKegiatanMaster) => { setSelectedId(item.id); setModalMode('view'); };
  const closeModal = () => { setModalMode(null); setSelectedId(undefined); };

  const onFormSuccess = () => {
    closeModal();
    fetchList();
  };

  const deleteItem = async (id: string) => { 
    const ok = await showConfirm({
      title: 'Hapus Kategori Kegiatan?',
      description: 'Menghapus kategori ini dapat berdampak pada data sesi yang sudah ada. Lanjutkan?',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });

    if (!ok) return;

    try {
      const res = await jenisKegiatanMasterApi.delete(id); 
      if (res.success) {
        showToast('Kategori berhasil dihapus', 'success');
        fetchList(); 
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showToast(err.response?.data?.message || 'Gagal menghapus data', 'error');
    }
  };

  const handleExport = useCallback(() => {
    try {
      exportDataToExcel(items, [
        { header: 'Nama Kegiatan', accessor: (row) => row.nama || '', width: 25 },
        { header: 'Tipe', accessor: (row) => row.tipe || '', width: 15 },
        { header: 'Urutan', accessor: (row) => row.urutan || '', width: 10 },
        { header: 'Status', accessor: (row) => row.aktif ? 'Aktif' : 'Nonaktif', width: 15 }
      ], 'Laporan_Jenis_Kegiatan', 'DATA MASTER KATEGORI KEGIATAN');
      showToast('Data berhasil diekspor', 'success');
    } catch (error: unknown) {
      const err = error as { message?: string };
      showToast(err.message || 'Gagal mengekspor data', 'warning');
    }
  }, [items, showToast]);

  const academicStats = useMemo(() => [
    {
      title: "Total Kategori",
      value: items.length,
      icon: <ListChecks size={14} />,
      gradient: "from-blue-500 to-indigo-600"
    },
    {
      title: "Kategori Aktif",
      value: items.filter(i => i.aktif).length,
      icon: <ListChecks size={14} />,
      gradient: "from-emerald-500 to-teal-600"
    }
  ], [items]);

  const breadcrumbs = useMemo(() => [
    { label: 'Akademik' },
    { label: 'Jenis Kegiatan' },
  ], []);

  return (
    <AcademicPageLayout
      title="Jenis Kegiatan"
      description="Kelola klasifikasi aktivitas pembelajaran, pembiasaan, dan ekstrakurikuler."
      stats={academicStats}
      isLoadingStats={loading}
      breadcrumbs={breadcrumbs}
      instruction={{
        title: "Tentang Kategori Kegiatan",
        description: "Gunakan master ini untuk menentukan jenis aktivitas yang dapat didaftarkan pada sistem absensi.",
        items: [
          { text: "Tipe KBM & ESKUL akan mewajibkan input guru pengampu dan mata pelajaran." },
          { text: "Urutan menentukan posisi prioritas saat pemilihan jenis di form pendaftaran." }
        ]
      }}
      canView={true}
      isLoading={authLoading}
      hardeningModuleKey="jeniskegiatanmasterpage"
    >
      <SectionCard
        title="Master Kategori Kegiatan"
        icon={ListChecks}
        fullWidth
        noPadding
      >
        <JenisKegiatanList 
          items={items}
          loading={loading}
          search={search}
          onSearchChange={setSearch}
          onRefresh={fetchList}
          onExport={handleExport}
          onAdd={openCreate}
          onEdit={openEdit}
          onDelete={deleteItem}
          onView={openView}
          canManage={canManage}
        />
      </SectionCard>

      <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader size="lg" /></div>}>
        <Modal 
          isOpen={modalMode !== null} 
          onClose={closeModal} 
          title={
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <ListChecks size={20} />
               </div>
               <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Form Kategori</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    {modalMode === 'create' ? 'Input Data Baru' : modalMode === 'edit' ? 'Update Data' : 'Informasi Detail'}
                  </p>
               </div>
            </div>
          }
          size="lg"
        >
          {modalMode && (
            <JenisKegiatanForm
              itemId={selectedId}
              mode={modalMode}
              onCancel={closeModal}
              onSuccess={onFormSuccess}
            />
          )}
        </Modal>
      </Suspense>
    </AcademicPageLayout>
  );
}
