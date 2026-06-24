import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { bpbkApi, type AsesmenSiswa } from '../../../api/bpbk.api';
import { Card } from '../../../components/ui/Card';
import { Table } from '../../../components/ui/Table';
import type { Column } from '../../../components/ui/Table';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Loader } from '../../../components/ui/Loader';
import { Label } from '../../../components/ui/Label';
import { useToast } from '../../../hooks/useToast';
import useConfirm from '../../../hooks/useConfirm';
import { Plus, Edit2, Trash2, Paperclip } from 'lucide-react';
import { uploadSiswaDocument } from '../../../api/academic/siswa.api';

const Modal = lazy(() => import('../../../components/ui/Modal').then(m => ({ default: m.Modal })));
const SmartStudentPicker = lazy(() => import('../../../components/common/SmartStudentPicker').then(m => ({ default: m.SmartStudentPicker })));

interface Student {
  id: string;
  nama_siswa?: string;
  nis?: string;
  Kelas?: {
    nama_kelas: string;
  };
}

export const AsesmenSection: React.FC = () => {
  const [data, setData] = useState<AsesmenSiswa[]>([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit, setLimit] = useState(10);

  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const { success, error } = useToast();
  const confirm = useConfirm();

  // Form states
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSiswa, setSelectedSiswa] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    siswa_id: '',
    tanggal: new Date().toISOString().split('T')[0],
    nama_asesmen: '',
    hasil_skor: '',
    keterangan: '',
    file: null as File | null
  });

  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await bpbkApi.getAsesmen({
        page,
        limit
      });
      setData(res.data?.list || []);
      setTotalPages(res.data?.pagination?.totalPages || 1);
      setTotalItems(res.data?.pagination?.totalItems || res.data?.pagination?.total || 0);
    } catch (err) {
      console.error('Error fetching assessments:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = useCallback(() => {
    setFormData({
      siswa_id: '',
      tanggal: new Date().toISOString().split('T')[0],
      nama_asesmen: '',
      hasil_skor: '',
      keterangan: '',
      file: null
    });
    setSelectedSiswa(null);
    setSelectedId(null);
  }, []);

  const handleEdit = useCallback((item: AsesmenSiswa) => {
    setSelectedId(item.id);
    setSelectedSiswa(item.Siswa || null);
    setFormData({
      siswa_id: item.siswa_id,
      tanggal: new Date(item.tanggal).toISOString().split('T')[0],
      nama_asesmen: item.nama_asesmen,
      hasil_skor: item.hasil_skor || '',
      keterangan: item.keterangan || '',
      file: null
    });
    setModalOpen(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const ok = await confirm({
      title: 'Hapus Hasil Asesmen',
      description: 'Apakah Anda yakin ingin menghapus catatan hasil asesmen ini?',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });
    if (!ok) return;

    try {
      const res = await bpbkApi.deleteAsesmen(id);
      if (res.success) {
        success('Hasil asesmen berhasil dihapus');
        fetchData();
      } else {
        error(res.message || 'Gagal menghapus');
      }
    } catch (err: any) {
      error(err.message || 'Koneksi bermasalah');
    }
  }, [confirm, success, error, fetchData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.siswa_id) {
      error('Harap pilih siswa terlebih dahulu');
      return;
    }
    if (!formData.nama_asesmen.trim()) {
      error('Harap isi nama/tipe asesmen');
      return;
    }

    try {
      setSaving(true);
      let docId = undefined;

      if (formData.file) {
        const uploadRes = (await uploadSiswaDocument(
          formData.siswa_id,
          formData.file,
          `Hasil Asesmen: ${formData.nama_asesmen} - ${selectedSiswa?.nama_siswa || 'Siswa'}`,
          'LAPORAN_BK'
        )) as any;
        docId = uploadRes.data?.id;
      }

      const payload = {
        siswa_id: formData.siswa_id,
        tanggal: new Date(formData.tanggal),
        nama_asesmen: formData.nama_asesmen,
        hasil_skor: formData.hasil_skor || undefined,
        keterangan: formData.keterangan || undefined,
        dokumen_id: docId
      };

      if (selectedId) {
        await bpbkApi.updateAsesmen(selectedId, payload);
        success('Catatan asesmen berhasil diperbarui');
      } else {
        await bpbkApi.createAsesmen(payload);
        success('Hasil asesmen baru berhasil disimpan');
      }

      setModalOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      error(err.message || 'Gagal menyimpan hasil asesmen');
    } finally {
      setSaving(false);
    }
  }, [selectedId, formData, selectedSiswa, error, success, fetchData, resetForm]);

  const handleSort = useCallback((key: string, order: 'asc' | 'desc') => {
    setSortBy(key);
    setSortOrder(order);
  }, []);

  const handleCloseModal = useCallback(() => {
    resetForm();
    setModalOpen(false);
  }, [resetForm]);

  const columns: Column[] = useMemo(() => [
    {
      key: 'tanggal',
      label: 'Tanggal Tes',
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
      render: (_, item: AsesmenSiswa) => (
        <div>
          <div className="font-bold text-slate-800 dark:text-white text-xs">{item.Siswa?.nama_siswa}</div>
          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{item.Siswa?.Kelas?.nama_kelas || '-'}</div>
        </div>
      )
    },
    {
      key: 'nama_asesmen',
      label: 'Nama / Tipe Asesmen',
      render: (value: string) => (
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{value}</span>
      )
    },
    {
      key: 'hasil_skor',
      label: 'Hasil / Skor',
      sortable: true,
      render: (value: string) => (
        <span className="text-xs font-black text-indigo-600">{value || '-'}</span>
      )
    },
    {
      key: 'attachments',
      label: 'File Lampiran',
      render: (_, item: AsesmenSiswa) => {
        if (!item.Dokumen) return <span className="text-slate-400 text-[10px] font-bold uppercase">-</span>;
        return (
          <span className="flex items-center text-[10px] font-bold text-blue-600">
            <Paperclip className="w-3 h-3 mr-1" />
            {item.Dokumen.file_original_name}
          </span>
        );
      }
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_, item: AsesmenSiswa) => (
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
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Layanan Asesmen Psikologis & Angket BK</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Penyimpanan hasil tes sosiometri, kuesioner gaya belajar, dan hasil tes kepribadian siswa</p>
        </div>
        <Button
          variant="toolbarPrimary"
          size="toolbar"
          onClick={() => { resetForm(); setModalOpen(true); }}
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Catat Asesmen
        </Button>
      </div>

      {loading && data.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader className="mb-4" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Menghubungkan Database Asesmen...</p>
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
            totalItems: totalItems,
            totalPages,
            onPageChange: setPage,
            onLimitChange: (limitVal) => {
              setLimit(limitVal);
              setPage(1);
            }
          }}
        />
      )}

      <Suspense fallback={null}>
        <Modal isOpen={modalOpen} onClose={handleCloseModal} title={selectedId ? 'Perbarui Hasil Asesmen' : 'Catat Asesmen BK Baru'} size="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Pilih Siswa</Label>
              {selectedId ? (
                <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200/50 rounded-xl">
                  <div className="font-bold text-xs">{selectedSiswa?.nama_siswa}</div>
                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{selectedSiswa?.nis}</div>
                </div>
              ) : (
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
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Tanggal Tes</Label>
                <Input
                  type="date"
                  value={formData.tanggal}
                  onChange={(e) => setFormData(prev => ({ ...prev, tanggal: e.target.value }))}
                  className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Hasil / Kategori Skor</Label>
                <Input
                  placeholder="Contoh: Sangat Kritis, Gaya Visual, dll"
                  value={formData.hasil_skor}
                  onChange={(e) => setFormData(prev => ({ ...prev, hasil_skor: e.target.value }))}
                  className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Nama / Tipe Asesmen</Label>
              <Input
                placeholder="Contoh: Angket Sosiometri Hubungan Sosial Kelas X-1"
                value={formData.nama_asesmen}
                onChange={(e) => setFormData(prev => ({ ...prev, nama_asesmen: e.target.value }))}
                className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deskripsi-asesmen" className="text-xs font-bold uppercase tracking-wider text-slate-500">Deskripsi / Analisis Konselor</Label>
              <textarea
                id="deskripsi-asesmen"
                aria-label="Deskripsi / Analisis Konselor"
                value={formData.keterangan}
                onChange={(e) => setFormData(prev => ({ ...prev, keterangan: e.target.value }))}
                placeholder="Tulis analisis singkat hasil kuesioner..."
                className="w-full min-h-[100px] p-3 text-xs bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Unggah Berkas Laporan Hasil Tes (Opsional)</Label>
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setFormData(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                className="text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="toolbarOutline" size="toolbar" onClick={handleCloseModal}>
                Batal
              </Button>
              <Button type="submit" variant="toolbarPrimary" size="toolbar" className="px-6" disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan Asesmen'}
              </Button>
            </div>
          </form>
        </Modal>
      </Suspense>
    </Card>
  );
};


