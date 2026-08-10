import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import useConfirm from '../../../hooks/useConfirm';
import { Search, RefreshCw, User, School, Plus, Edit, Power, CheckCircle2, Download, FileText, Network, ChevronRight, Printer } from 'lucide-react';
import { Table, Button, Modal, Switch, Input, Badge, SectionCard } from '../../ui';
import { MethodPickerModal } from '../../common/MethodPickerModal';
import { getWaliKelasStrukturList, assignWaliKelasStruktur, nonaktifWaliKelasStruktur } from '../../../api/kurikulum/waliKelas.api';
import type { WaliKelasStrukturAssignment } from '../../../types/academic';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../../store/authStore';
import { useDebounce } from '../../../hooks/useDebounce';
import { exportDataToExcel } from '../../../utils/export.utils';
import WaliKelasForm from './WaliKelasForm';
import SKWaliKelasWordEditorModal, { SKWaliKelasData } from '../guru/SKWaliKelasWordEditorModal';
import SKWaliKelasTemplateMasterModal from '../guru/SKWaliKelasTemplateMasterModal';
import SKWaliKelasArsipModal from '../guru/SKWaliKelasArsipModal';
import SKWaliKelasBulkGenerateModal from '../guru/SKWaliKelasBulkGenerateModal';
import { FileCode, FolderArchive, Archive as Zip } from 'lucide-react';

interface Props {
  refreshTrigger?: number;
}

const WaliKelasList = React.memo<Props>(({ refreshTrigger = 0 }) => {
  const queryClient = useQueryClient();
  const invalidateWaliKelasCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['wali-kelas-options-list'] });
    queryClient.invalidateQueries({ queryKey: ['kurikulum-struktur'] });
    queryClient.invalidateQueries({ queryKey: ['academic-stats'] });
    queryClient.invalidateQueries({ queryKey: ['guru-options-list'] });
  }, [queryClient]);
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [items, setItems] = useState<WaliKelasStrukturAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [includeInactive, setIncludeInactive] = useState(false);

  const [selectionOpen, setSelectionOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [presetData, setPresetData] = useState<{ guru_id?: string; kelas_id?: string } | undefined>(undefined);

  const { can, isAdmin } = useAuthStore();

  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [skWaliKelasOpen, setSkWaliKelasOpen] = useState(false);
  const [skWaliKelasData, setSkWaliKelasData] = useState<SKWaliKelasData | null>(null);

  // New states for Template Master, Arsip, & Bulk Generate SK
  const [templateMasterOpen, setTemplateMasterOpen] = useState(false);
  const [arsipOpen, setArsipOpen] = useState(false);
  const [bulkGenerateOpen, setBulkGenerateOpen] = useState(false);

  const canManage = useMemo(() => isAdmin() || can('academic.homeroom.manage'), [isAdmin, can]);

  const fetchData = useCallback(async (page = 1, search = '', include_inactive = false) => {
    try {
      setLoading(true);
      const response = await getWaliKelasStrukturList(page, itemsPerPage, search, { include_inactive });
      if (response.success) {
        setItems(response.data);
        setTotalPages(response.pagination.totalPages);
        setTotalItems(response.pagination.total);
        setCurrentPage(response.pagination.page);
      } else {
        toast.error('Gagal memuat data wali kelas');
      }
    } catch (error) {
      console.error('Error loading wali kelas:', error);
      toast.error('Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  }, [itemsPerPage]);

  useEffect(() => {
    fetchData(1, debouncedSearchTerm, includeInactive);
  }, [debouncedSearchTerm, includeInactive, fetchData]);

  useEffect(() => {
    fetchData(currentPage, debouncedSearchTerm, includeInactive);
  }, [refreshTrigger, currentPage, fetchData]);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const handleToggleIncludeInactive = useCallback((checked: boolean) => {
    setIncludeInactive(checked);
  }, []);

  const handleBulkNonaktif = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const ok = await confirm({
      title: 'Nonaktifkan Wali Kelas Terpilih',
      description: `Nonaktifkan ${selectedIds.size} penugasan wali kelas terpilih?`,
      confirmText: 'Nonaktifkan',
      cancelText: 'Batal',
      style: 'warning',
      withProgress: true,
      progressLabel: `Menonaktifkan ${selectedIds.size} wali kelas...`,
    });
    if (!ok) return;

    try {
      setBulkProcessing(true);
      const ids = Array.from(selectedIds);
      const total = ids.length;
      let succeeded = 0;
      let failed = 0;
      for (let i = 0; i < ids.length; i++) {
        try {
          const res = await nonaktifWaliKelasStruktur(ids[i]);
          if (res.success) succeeded++; else failed++;
        } catch { failed++; }
        confirm.setLoading(true, Math.round(((i + 1) / total) * 100));
      }

      if (failed > 0) {
        toast(`Berhasil: ${succeeded}, Gagal: ${failed}`, { icon: '⚠️' });
      } else {
        toast.success(`Berhasil menonaktifkan ${succeeded} penugasan`);
      }
      
      setSelectedIds(new Set());
      fetchData(currentPage, debouncedSearchTerm, includeInactive);
    } catch (e) {
      toast.error('Terjadi kesalahan saat bulk nonaktif');
    } finally {
      setBulkProcessing(false);
      confirm.setLoading(false);
    }
  }, [selectedIds, confirm, fetchData, currentPage, debouncedSearchTerm, includeInactive]);

  const openAssignModal = useCallback((preset?: { guru_id?: string; kelas_id?: string }) => {
    setPresetData(preset);
    setAssignOpen(true);
  }, []);

  const closeAssignModal = useCallback(() => {
    setAssignOpen(false);
    setPresetData(undefined);
  }, []);

  const handleNonaktif = useCallback(async (item: WaliKelasStrukturAssignment) => {
    const kelasName = item.StrukturOrganisasi?.Kelas?.nama_kelas || '';
    const guruName = item.Guru?.nama_guru || '';
    const ok = await confirm({
      title: 'Nonaktifkan Wali Kelas',
      description: (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl flex items-start gap-3">
            <div className="bg-amber-100 dark:bg-amber-900/50 p-2 rounded-xl text-amber-600 dark:text-amber-400">
              <Power size={20} />
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-black text-amber-900 dark:text-amber-300 uppercase tracking-tight">Konfirmasi Penonaktifan</p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                Anda akan menonaktifkan <strong>{guruName}</strong> sebagai wali kelas <strong>{kelasName}</strong>. Guru ini tidak akan lagi memiliki akses khusus wali kelas untuk kelas ini.
              </p>
            </div>
          </div>
        </div>
      ),
      confirmText: 'Ya, Nonaktifkan',
      cancelText: 'Batal',
      style: 'warning',
      withProgress: true,
      progressLabel: 'Menonaktifkan wali kelas...',
    });
    if (!ok) return;
    try {
      const res = await nonaktifWaliKelasStruktur(item.id);
      if (!res.success) {
        toast.error(res.message || 'Gagal menonaktifkan');
        return;
      }
      toast.success(res.message || 'Berhasil menonaktifkan penugasan');
      invalidateWaliKelasCache();
      fetchData(currentPage, debouncedSearchTerm, includeInactive);
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message || 'Gagal menonaktifkan';
      toast.error(msg);
    } finally {
      confirm.setLoading(false);
    }
  }, [confirm, fetchData, currentPage, debouncedSearchTerm, includeInactive]);

  const handleAktifkan = useCallback(async (item: WaliKelasStrukturAssignment) => {
    const kelasId = item.StrukturOrganisasi?.Kelas?.id;
    const guruId = item.Guru?.id;
    if (!kelasId || !guruId) {
      toast.error('Data kelas/guru tidak valid');
      return;
    }
    try {
      setAssigning(true);
      const res = await assignWaliKelasStruktur({ kelas_id: kelasId, guru_id: guruId });
      if (!res.success) {
        toast.error(res.message || 'Gagal mengaktifkan');
        return;
      }
      toast.success('Berhasil mengaktifkan penugasan');
      invalidateWaliKelasCache();
      fetchData(currentPage, debouncedSearchTerm, includeInactive);
    } catch (e: any) {
      toast.error(e?.message || 'Gagal mengaktifkan');
    } finally {
      setAssigning(false);
    }
  }, [fetchData, currentPage, debouncedSearchTerm, includeInactive]);

  // Handle export to Excel
  const handleExport = useCallback(() => {
    try {
      exportDataToExcel(items, [
        { header: 'Kelas', accessor: (row) => row.StrukturOrganisasi?.Kelas?.nama_kelas || '', width: 15 },
        { header: 'Wali Kelas', accessor: (row) => row.Guru?.nama_guru || '', width: 25 },
        { header: 'NIP', accessor: (row) => row.Guru?.nip || '', width: 20 },
        { header: 'Mulai', accessor: (row) => row.start_date ? new Date(row.start_date).toLocaleDateString('id-ID') : '', width: 15 },
        { header: 'Selesai', accessor: (row) => row.end_date ? new Date(row.end_date).toLocaleDateString('id-ID') : '', width: 15 },
        { header: 'Status', accessor: (row) => row.is_active ? 'AKTIF' : 'NONAKTIF', width: 15 }
      ], 'Laporan_Wali_Kelas', 'DATA PENUGASAN WALI KELAS');
    } catch (error: any) {
      toast(error.message || 'Gagal mengekspor data', { icon: '⚠️' });
    }
  }, [items]);

  const columns = useMemo(() => {
    const base = [
      {
        key: 'Kelas',
        label: 'Kelas',
        sortable: true,
        render: (_: any, item: WaliKelasStrukturAssignment) => (
          <div className="flex items-center gap-2">
            <School className="w-4 h-4 text-gray-400" />
            <span>{item.StrukturOrganisasi?.Kelas?.nama_kelas || '-'}</span>
          </div>
        )
      },
      {
        key: 'Guru',
        label: 'Guru',
        sortable: true,
        render: (_: any, item: WaliKelasStrukturAssignment) => (
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            <span>{item.Guru?.nama_guru || '-'}</span>
          </div>
        )
      },
      {
        key: 'Periode',
        label: 'Periode',
        render: (_: any, item: WaliKelasStrukturAssignment) => {
          const start = item.start_date ? new Date(item.start_date).toLocaleDateString('id-ID') : '-';
          const end = item.end_date ? new Date(item.end_date).toLocaleDateString('id-ID') : '-';
          return <span>{start} - {end}</span>;
        }
      },
      {
        key: 'Status',
        label: 'Status',
        render: (_: any, item: WaliKelasStrukturAssignment) => (
          <Badge variant={item.is_active ? 'success' : 'secondary'}>
            {item.is_active ? 'Aktif' : 'Nonaktif'}
          </Badge>
        )
      },
    ];

    if (canManage) {
      base.push({
        key: 'actions',
        label: 'Aksi',
        render: (_: any, item: WaliKelasStrukturAssignment) => (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-slate-600 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 border-amber-200 dark:border-amber-800"
              onClick={() => {
                setSkWaliKelasData({
                  guruId: item.Guru?.id,
                  namaGuru: item.Guru?.nama_guru || '',
                  nipGuru: item.Guru?.nip || '',
                  namaKelas: item.StrukturOrganisasi?.Kelas?.nama_kelas,
                  jabatan: `WALI KELAS ${item.StrukturOrganisasi?.Kelas?.nama_kelas || ''}`,
                  tmt: item.start_date ? new Date(item.start_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '',
                });
                setSkWaliKelasOpen(true);
              }}
              title="Cetak SK Wali Kelas"
              aria-label="Cetak SK Wali Kelas"
            >
              <Printer className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-slate-600 hover:text-blue-600"
              onClick={() => openAssignModal({ guru_id: item.Guru?.id, kelas_id: item.StrukturOrganisasi?.Kelas?.id })}
              disabled={assigning}
              aria-label="Ubah penugasan wali kelas"
            >
              <Edit className="w-4 h-4" />
            </Button>
            {item.is_active ? (
              <Button
                size="sm"
                variant="ghost"
                className="text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                onClick={() => handleNonaktif(item)}
                disabled={assigning}
                aria-label="Nonaktifkan Wali Kelas"
              >
                <Power className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                size="sm"
                variant="success"
                onClick={() => handleAktifkan(item)}
                disabled={assigning}
                aria-label="Aktifkan Wali Kelas"
              >
                <CheckCircle2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        )
      });
    }

    return base;
  }, [assigning, canManage, handleAktifkan, handleNonaktif, openAssignModal]);

  return (
    <div className="flex flex-col">
      {/* Toolbar Baris Kedua - Filter & Search */}
      <div className="flex flex-col md:flex-row gap-4 p-4 border-b border-gray-100 dark:border-gray-800 bg-slate-50/20 dark:bg-slate-900/10 items-center">
        <div className="flex-1 relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Cari guru atau kelas..."
            aria-label="Cari Guru atau Kelas"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 text-[13px] rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm pl-9"
          />
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-slate-950 px-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-10">
          <span className="text-[10px] font-black uppercase text-slate-400 select-none tracking-wider">Tampilkan Nonaktif</span>
          <Switch checked={includeInactive} onCheckedChange={handleToggleIncludeInactive} className="scale-[0.8]" />
        </div>
      </div>

      <div className="bg-transparent overflow-hidden">
        <Table 
          columns={columns} 
          data={items} 
          loading={loading}
          emptyMessage="Tidak ada data wali kelas"
          compact={true}
          pagination={{
            currentPage,
            totalPages,
            totalItems,
            itemsPerPage,
            onPageChange: handlePageChange,
            onLimitChange: (limit) => {
              setItemsPerPage(limit);
              setCurrentPage(1);
            }
          }}
          selectedRowKeys={selectedIds}
          onSelectedRowKeysChange={setSelectedIds}
          toolbarLeft={
            <div className="flex flex-wrap items-center gap-2">
               {canManage && (
                  <Button 
                    onClick={() => setSelectionOpen(true)}
                    variant="toolbarPrimary"
                    size="toolbar"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Tambah Penugasan
                  </Button>
               )}

               {canManage && (
                 <Button
                   variant="toolbarOutline"
                   size="toolbar"
                   onClick={() => setBulkGenerateOpen(true)}
                   className="rounded-xl border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 hover:bg-amber-100 font-extrabold"
                   title="Generate & Ekspor PDF SK Wali Kelas secara Massal (ZIP)"
                 >
                   <Zip className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                   Cetak SK Massal (ZIP)
                 </Button>
               )}

               {canManage && (
                 <Button
                   variant="toolbarOutline"
                   size="toolbar"
                   onClick={() => setTemplateMasterOpen(true)}
                   className="rounded-xl border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50"
                   title="Pengaturan Template Master SK Wali Kelas"
                 >
                   <FileCode className="w-3.5 h-3.5 mr-1.5" />
                   Template SK
                 </Button>
               )}

               <Button
                 variant="toolbarOutline"
                 size="toolbar"
                 onClick={() => setArsipOpen(true)}
                 className="rounded-xl border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50"
                 title="Daftar Arsip SK yang Pernah Dicetak"
               >
                 <FolderArchive className="w-3.5 h-3.5 mr-1.5" />
                 Arsip SK
               </Button>
               
               <Button
                 variant="toolbarOutline"
                 size="toolbar"
                 onClick={handleExport}
                 className="rounded-xl"
               >
                 <Download className="w-3.5 h-3.5 mr-1.5" />
                 Export
               </Button>
   
               <Button
                 variant="toolbarOutline"
                 size="toolbarIcon"
                 onClick={() => fetchData(currentPage, searchTerm, includeInactive)}
                 aria-label="Refresh Data"
                 className="rounded-xl"
                 disabled={loading}
               >
                 <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
               </Button>
            </div>
          }
          toolbarRight={
            selectedIds.size > 0 && canManage && (
               <Button
                 variant="toolbarDanger"
                 size="toolbar"
                 onClick={handleBulkNonaktif}
                 disabled={bulkProcessing}
               >
                 <Power className="w-3.5 h-3.5 mr-1.5" />
                 Nonaktifkan ({selectedIds.size})
               </Button>
            )
          }
        />
      </div>

      <MethodPickerModal
        isOpen={selectionOpen}
        onClose={() => setSelectionOpen(false)}
        title="Pilih Metode Penugasan Wali Kelas"
        options={[
          {
            id: 'manual',
            title: 'Tambah Manual',
            description: 'Tentukan wali kelas untuk kelas tertentu secara manual satu per satu.',
            icon: FileText,
            actionLabel: 'Mulai Mengisi',
            colorScheme: 'blue',
            onClick: () => {
              setSelectionOpen(false);
              openAssignModal();
            }
          },
          {
            id: 'diagram',
            title: 'Gunakan Diagram Struktur',
            description: 'Petakan wali kelas secara visual menggunakan diagram struktur organisasi.',
            icon: Network,
            actionLabel: 'Buka Diagram',
            colorScheme: 'violet',
            onClick: () => {
              setSelectionOpen(false);
              navigate('/academic/struktur-organisasi?tab=WALI_KELAS');
            }
          }
        ]}
      />

      <Modal
        isOpen={assignOpen}
        onClose={closeAssignModal}
        title="Penugasan Wali Kelas"
        description="Hubungkan guru dengan kelas untuk periode aktif."
        size="lg"
      >
        <WaliKelasForm 
          onCancel={closeAssignModal}
          onSuccess={() => {
            closeAssignModal();
            fetchData(currentPage, debouncedSearchTerm, includeInactive);
          }}
          preset={presetData}
        />
      </Modal>

      {/* Modal SK Wali Kelas Word Editor */}
      <SKWaliKelasWordEditorModal
        isOpen={skWaliKelasOpen}
        onClose={() => setSkWaliKelasOpen(false)}
        skData={skWaliKelasData}
      />

      {/* Modal Template Master SK */}
      <SKWaliKelasTemplateMasterModal
        isOpen={templateMasterOpen}
        onClose={() => setTemplateMasterOpen(false)}
        onSaved={() => fetchData(currentPage, debouncedSearchTerm, includeInactive)}
      />

      {/* Modal Arsip SK */}
      <SKWaliKelasArsipModal
        isOpen={arsipOpen}
        onClose={() => setArsipOpen(false)}
      />

      {/* Modal Generate SK Massal (ZIP) */}
      <SKWaliKelasBulkGenerateModal
        isOpen={bulkGenerateOpen}
        onClose={() => setBulkGenerateOpen(false)}
      />
    </div>
  );
});

WaliKelasList.displayName = 'WaliKelasList';

export default WaliKelasList;

