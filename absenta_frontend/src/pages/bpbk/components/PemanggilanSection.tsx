import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { bpbkApi, type PemanggilanOrangTua } from '../../../api/bpbk.api';
import { uploadSiswaDocument } from '../../../api/academic/siswa.api';
import { Card } from '../../../components/ui/Card';
import { Table } from '../../../components/ui/Table';
import type { Column } from '../../../components/ui/Table';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { Loader } from '../../../components/ui/Loader';
import { Badge } from '../../../components/ui/Badge';
import { Label } from '../../../components/ui/Label';
import { useToast } from '../../../hooks/useToast';
import useConfirm from '../../../hooks/useConfirm';
import { Search, Plus, Edit2, Trash2, MailOpen, Calendar, Paperclip } from 'lucide-react';
import { useDebounce } from '../../../hooks/useDebounce';

const Modal = lazy(() => import('../../../components/ui/Modal').then(m => ({ default: m.Modal })));
const SmartStudentPicker = lazy(() => import('../../../components/common/SmartStudentPicker').then(m => ({ default: m.SmartStudentPicker })));

export const PemanggilanSection: React.FC = () => {
  const [data, setData] = useState<PemanggilanOrangTua[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);

  const [selectedStatus, setSelectedStatus] = useState('');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(10);

  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = useCallback((key: string, order: 'asc' | 'desc') => {
    setSortBy(key);
    setSortOrder(order);
  }, []);

  const { success, error } = useToast();
  const confirm = useConfirm();

  // Form states
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSiswa, setSelectedSiswa] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    siswa_id: '',
    tanggal_pemanggilan: new Date().toISOString().split('T')[0],
    alasan: ''
  });

  const [editFormData, setEditFormData] = useState({
    tanggal_pertemuan: new Date().toISOString().split('T')[0],
    keterangan_pertemuan: '',
    status: 'HADIR' as any,
    file: null as File | null
  });

  const [uploadingDoc, setUploadingDoc] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await bpbkApi.getPemanggilan({
        page,
        limit,
        status: selectedStatus
      });
      setData(res.data?.list || []);
      setTotalPages(res.data?.pagination?.totalPages || 1);
    } catch (err: unknown) {
      console.error('Error fetching summons:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, selectedStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = useCallback(() => {
    setFormData({
      siswa_id: '',
      tanggal_pemanggilan: new Date().toISOString().split('T')[0],
      alasan: ''
    });
    setSelectedSiswa(null);
    setSelectedId(null);
  }, []);

  const handleEdit = useCallback((item: PemanggilanOrangTua) => {
    setSelectedId(item.id);
    setSelectedSiswa(item.Siswa || null);
    setEditFormData({
      tanggal_pertemuan: item.tanggal_pertemuan ? new Date(item.tanggal_pertemuan).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      keterangan_pertemuan: item.keterangan_pertemuan || '',
      status: item.status === 'BARU' || item.status === 'DIKIRIM' ? 'HADIR' : item.status,
      file: null
    });
    setEditModalOpen(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const ok = await confirm({
      title: 'Hapus Surat Pemanggilan',
      description: 'Apakah Anda yakin ingin menghapus surat pemanggilan ini?',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });
    if (!ok) return;

    try {
      const res = await bpbkApi.deletePemanggilan(id);
      if (res.success) {
        success('Surat pemanggilan berhasil dihapus');
        fetchData();
      } else {
        error(res.message || 'Gagal menghapus');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Koneksi bermasalah';
      error(errorMsg);
    }
  }, [confirm, success, error, fetchData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.siswa_id) {
      error('Harap pilih siswa terlebih dahulu');
      return;
    }
    if (!formData.alasan.trim()) {
      error('Harap isi alasan pemanggilan');
      return;
    }

    try {
      await bpbkApi.createPemanggilan(formData);
      success('Surat pemanggilan orang tua berhasil dibuat');
      setModalOpen(false);
      resetForm();
      fetchData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Gagal menyimpan pemanggilan';
      error(errorMsg);
    }
  }, [formData, success, error, resetForm, fetchData]);

  const handleEditSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;

    try {
      setUploadingDoc(true);
      let docId = undefined;

      // 1. Upload scan file if chosen
      if (editFormData.file) {
        const uploadRes = (await uploadSiswaDocument(
          selectedSiswa.id,
          editFormData.file,
          `Bukti Pertemuan Wali - ${selectedSiswa.nama_siswa}`,
          'LAPORAN_BK'
        )) as any;
        docId = uploadRes.data?.id;
      }

      // 2. Update Pemanggilan record
      await bpbkApi.updatePemanggilan(selectedId, {
        tanggal_pertemuan: editFormData.status === 'HADIR' ? new Date(editFormData.tanggal_pertemuan) : undefined,
        keterangan_pertemuan: editFormData.keterangan_pertemuan,
        status: editFormData.status,
        surat_dokumen_id: docId
      });

      success('Hasil pemanggilan berhasil diperbarui');
      setEditModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Gagal memperbarui pemanggilan';
      error(errorMsg);
    } finally {
      setUploadingDoc(false);
    }
  }, [selectedId, selectedSiswa, editFormData, success, error, fetchData]);

  const columns: Column[] = useMemo(() => [
    {
      key: 'tanggal_pemanggilan',
      label: 'Tanggal Panggilan',
      sortable: true,
      render: (value: string) => (
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          {new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      )
    },
    {
      key: 'siswa',
      label: 'Profil Siswa',
      render: (_, item: any) => (
        <div>
          <div className="font-bold text-slate-800 dark:text-white text-xs">{item.Siswa?.nama_siswa}</div>
          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{item.Siswa?.Kelas?.nama_kelas || '-'}</div>
        </div>
      )
    },
    {
      key: 'alasan',
      label: 'Alasan Pemanggilan',
      render: (value: string) => (
        <p className="text-xs font-medium text-slate-600 line-clamp-1 max-w-xs">{value}</p>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => {
        const variant = value === 'HADIR' ? 'success' : value === 'TIDAK_HADIR' ? 'error' : 'warning';
        return (
          <Badge variant={variant} className="text-[9px] font-black uppercase">
            {value === 'BARU' ? 'Menunggu' : value === 'DIKIRIM' ? 'Terkirim' : value}
          </Badge>
        );
      }
    },
    {
      key: 'realisasi',
      label: 'Tanggal Hadir',
      render: (_, item: any) => (
        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
          {item.tanggal_pertemuan 
            ? new Date(item.tanggal_pertemuan).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
            : '-'
          }
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_, item: any) => (
        <div className="flex gap-1 justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEdit(item)}
            className="w-8 h-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
          >
            <Edit2 size={13} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(item.id)}
            className="w-8 h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
          >
            <Trash2 size={13} />
          </Button>
        </div>
      )
    }
  ], [handleEdit, handleDelete]);

  return (
    <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 p-6 rounded-2xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Pemanggilan Orang Tua / Wali Siswa</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Manajemen surat resmi pemanggilan orang tua untuk kasus kedisiplinan dan koordinasi khusus</p>
        </div>
        <Button
          variant="toolbarPrimary"
          size="toolbar"
          onClick={() => { resetForm(); setModalOpen(true); }}
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Buat Panggilan
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <SearchableSelect
            options={[
              { value: '', label: 'Semua Status Panggilan' },
              { value: 'BARU', label: 'Menunggu' },
              { value: 'DIKIRIM', label: 'Terkirim' },
              { value: 'HADIR', label: 'Orang Tua Hadir' },
              { value: 'TIDAK_HADIR', label: 'Mangkir / Tidak Hadir' }
            ]}
            value={selectedStatus}
             onValueChange={setSelectedStatus}
            placeholder="Status"
            className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
          />
        </div>
      </div>

      {/* Table */}
      {loading && data.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader className="mb-4" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Menghubungkan Database Pemanggilan...</p>
        </div>
      ) : (
        <Table
          columns={columns}
          data={data}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          pagination={{
            currentPage: page,
            itemsPerPage: limit,
            totalItems: totalPages * limit,
            totalPages,
            onPageChange: setPage,
            onLimitChange: (limitVal) => {
              setLimit(limitVal);
              setPage(1);
            }
          }}
        />
      )}

      {/* Create Modal */}
      <Suspense fallback={null}>
        <Modal 
          isOpen={modalOpen} 
          onClose={() => { setModalOpen(false); resetForm(); }} 
          title="Buat Pemanggilan Orang Tua Baru" 
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Pilih Siswa</Label>
              <Suspense fallback={<div className="h-10 bg-slate-100 animate-pulse rounded-xl" />}>
                <SmartStudentPicker
                  onSelect={(s) => {
                    setSelectedSiswa(s);
                    setFormData(prev => ({ ...prev, siswa_id: s.id }));
                  }}
                  mode="siswa"
                  placeholder="Cari siswa..."
                />
              </Suspense>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tanggal-pemanggilan" className="text-xs font-bold uppercase tracking-wider text-slate-500">Tanggal Rencana Pemanggilan</Label>
              <Input
                id="tanggal-pemanggilan"
                type="date"
                value={formData.tanggal_pemanggilan}
                onChange={(e) => setFormData(prev => ({ ...prev, tanggal_pemanggilan: e.target.value }))}
                className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alasan-pemanggilan" className="text-xs font-bold uppercase tracking-wider text-slate-500">Alasan Pemanggilan</Label>
              <textarea
                id="alasan-pemanggilan"
                aria-label="Alasan Pemanggilan"
                value={formData.alasan}
                onChange={(e) => setFormData(prev => ({ ...prev, alasan: e.target.value }))}
                placeholder="Tulis alasan resmi (contoh: Poin pelanggaran mencapai 75, ketidakhadiran berturut-turut)..."
                className="w-full min-h-[100px] p-3 text-xs bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="toolbarOutline" size="toolbar" onClick={() => { setModalOpen(false); resetForm(); }}>
                Batal
              </Button>
              <Button type="submit" variant="toolbarPrimary" size="toolbar" className="px-6">
                Buat & Terbitkan Surat
              </Button>
            </div>
          </form>
        </Modal>
      </Suspense>

      {/* Edit Result Modal */}
      <Suspense fallback={null}>
        <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Perbarui Hasil Pertemuan Wali Murid" size="lg">
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200/50 rounded-xl">
              <div className="font-bold text-xs">{selectedSiswa?.nama_siswa}</div>
              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{selectedSiswa?.nis}</div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-kehadiran" className="text-xs font-bold uppercase tracking-wider text-slate-500">Status Kehadiran Orang Tua</Label>
              <SearchableSelect
                id="status-kehadiran"
                options={[
                  { value: 'DIKIRIM', label: 'Surat Terkirim (Belum Menghadap)' },
                  { value: 'HADIR', label: 'Orang Tua Hadir' },
                  { value: 'TIDAK_HADIR', label: 'Mangkir / Tidak Hadir' }
                ]}
                value={editFormData.status}
                 onValueChange={(val) => setEditFormData(prev => ({ ...prev, status: val }))}
                className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
              />
            </div>

            {editFormData.status === 'HADIR' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="tanggal-pertemuan" className="text-xs font-bold uppercase tracking-wider text-slate-500">Tanggal Pertemuan</Label>
                  <Input
                    id="tanggal-pertemuan"
                    type="date"
                    value={editFormData.tanggal_pertemuan}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, tanggal_pertemuan: e.target.value }))}
                    className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hasil-pertemuan" className="text-xs font-bold uppercase tracking-wider text-slate-500">Hasil Pertemuan / Berita Acara</Label>
                  <textarea
                    id="hasil-pertemuan"
                    aria-label="Hasil Pertemuan / Berita Acara"
                    value={editFormData.keterangan_pertemuan}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, keterangan_pertemuan: e.target.value }))}
                    placeholder="Tulis komitmen hasil pertemuan dengan wali murid..."
                    className="w-full min-h-[100px] p-3 text-xs bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scan-bukti-pertemuan" className="text-xs font-bold uppercase tracking-wider text-slate-500">Unggah Bukti Hasil Scan Berita Acara / Surat Perjanjian (Opsional)</Label>
                  <Input
                    id="scan-bukti-pertemuan"
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setEditFormData(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                    className="text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
                  />
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="toolbarOutline" size="toolbar" onClick={() => setEditModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="toolbarPrimary" size="toolbar" className="px-6" disabled={uploadingDoc}>
                {uploadingDoc ? 'Menyimpan & Mengunggah...' : 'Perbarui Hasil'}
              </Button>
            </div>
          </form>
        </Modal>
      </Suspense>
    </Card>
  );
};


