import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { bpbkApi, type HomeVisit, bpbkQueryKeys } from '../../../api/bpbk.api';
import { uploadSiswaDocument } from '../../../api/academic/siswa.api';
import { Card } from '../../../components/ui/Card';
import { Table } from '../../../components/ui/Table';
import type { Column } from '../../../components/ui/Table';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Loader } from '../../../components/ui/Loader';
import { Label } from '../../../components/ui/Label';
import toast from 'react-hot-toast';
import useConfirm from '../../../hooks/useConfirm';
import { formatDate } from '../../../utils/layoutUtils';
import { Plus, Edit2, Trash2, Home, Paperclip } from 'lucide-react';

const Modal = lazy(() => import('../../../components/ui/Modal').then(m => ({ default: m.Modal })));
const SmartStudentPicker = lazy(() => import('../../../components/common/SmartStudentPicker').then(m => ({ default: m.SmartStudentPicker })));

const homeVisitSchema = z.object({
  siswa_id: z.string().min(1, 'Harap pilih siswa terlebih dahulu'),
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
  alasan: z.string().min(1, 'Harap isi alasan kunjungan'),
  hasil: z.string().optional()
});

export const HomeVisitSection: React.FC = React.memo(() => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = useCallback((key: string, order: 'asc' | 'desc') => {
    setSortBy(key);
    setSortOrder(order);
  }, []);

  const confirm = useConfirm();

  // Form states
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSiswa, setSelectedSiswa] = useState<{ id: string; nama_siswa?: string; nis?: string; Kelas?: { nama_kelas?: string } } | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    siswa_id: '',
    tanggal: new Date().toISOString().split('T')[0],
    alasan: '',
    hasil: '',
    file: null as File | null
  });

  const queryClient = useQueryClient();

  // ── useQuery: Home Visit List ─────────────────────────────────────────────
  const { data: homeVisitRes, isLoading: loading, refetch } = useQuery({
    queryKey: bpbkQueryKeys.homeVisitList({ page, limit }),
    queryFn: () => bpbkApi.getHomeVisits({ page, limit }),
    staleTime: 5 * 60 * 1000,
  });

  const data = useMemo(() => homeVisitRes?.data?.list || [], [homeVisitRes]);
  const totalPages = homeVisitRes?.data?.pagination?.totalPages || 1;

  const resetForm = useCallback(() => {
    setFormData({
      siswa_id: '',
      tanggal: new Date().toISOString().split('T')[0],
      alasan: '',
      hasil: '',
      file: null
    });
    setSelectedSiswa(null);
    setSelectedId(null);
  }, []);

  const handleEdit = useCallback((item: HomeVisit) => {
    setSelectedId(item.id);
    setSelectedSiswa(item.Siswa || null);
    setFormData({
      siswa_id: item.siswa_id,
      tanggal: new Date(item.tanggal).toISOString().split('T')[0],
      alasan: item.alasan,
      hasil: item.hasil || '',
      file: null
    });
    setModalOpen(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const ok = await confirm({
      title: 'Hapus Log Home Visit',
      description: 'Apakah Anda yakin ingin menghapus catatan kunjungan rumah ini?',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });
    if (!ok) return;

    try {
      const res = await bpbkApi.deleteHomeVisit(id);
      if (res.success) {
        toast.success('Log kunjungan rumah berhasil dihapus');
        queryClient.invalidateQueries({ queryKey: bpbkQueryKeys.all });
        refetch();
      } else {
        toast.error(res.message || 'Gagal menghapus');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Koneksi bermasalah';
      toast.error(errorMsg);
    }
  }, [confirm, queryClient, refetch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parseResult = homeVisitSchema.safeParse(formData);
    if (!parseResult.success) {
      toast.error(parseResult.error.errors[0]?.message || 'Data tidak valid');
      return;
    }

    try {
      setSaving(true);
      let docId = undefined;

      // 1. Upload scan file if chosen
      if (formData.file) {
        const uploadRes = await uploadSiswaDocument(
          formData.siswa_id,
          formData.file,
          `Foto/Laporan Home Visit - ${selectedSiswa?.nama_siswa || 'Siswa'}`,
          'LAPORAN_BK'
        );
        docId = (uploadRes as { data?: { id?: string } })?.data?.id;
      }

      const payload = {
        siswa_id: formData.siswa_id,
        tanggal: new Date(formData.tanggal),
        alasan: formData.alasan,
        hasil: formData.hasil || undefined,
        foto_dokumen_id: docId
      };

      if (selectedId) {
        await bpbkApi.updateHomeVisit(selectedId, payload);
        toast.success('Log kunjungan rumah berhasil diperbarui');
      } else {
        await bpbkApi.createHomeVisit(payload);
        toast.success('Kunjungan rumah baru berhasil dicatat');
      }

      setModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: bpbkQueryKeys.all });
      refetch();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Gagal menyimpan kunjungan rumah';
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const columns: Column[] = useMemo(() => [
    {
      key: 'tanggal',
      label: 'Tanggal Kunjungan',
      sortable: true,
      render: (value: unknown) => (
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          {value ? formatDate(String(value), { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
        </span>
      )
    },
    {
      key: 'siswa',
      label: 'Profil Siswa',
      render: (_: unknown, item: unknown) => {
        const row = item as HomeVisit;
        return (
          <div>
            <div className="font-bold text-slate-800 dark:text-white text-xs">{row.Siswa?.nama_siswa}</div>
            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{row.Siswa?.Kelas?.nama_kelas || '-'}</div>
          </div>
        );
      }
    },
    {
      key: 'alasan',
      label: 'Alasan Kunjungan',
      render: (value: unknown) => (
        <p className="text-xs font-medium text-slate-600 line-clamp-1 max-w-xs">{String(value || '-')}</p>
      )
    },
    {
      key: 'hasil',
      label: 'Hasil / Kesepakatan',
      render: (value: unknown) => (
        <p className="text-xs font-medium text-slate-500 line-clamp-1 max-w-xs">{String(value || '-')}</p>
      )
    },
    {
      key: 'attachments',
      label: 'Lampiran',
      render: (_: unknown, item: unknown) => {
        const row = item as HomeVisit & { Dokumen?: { file_original_name?: string } };
        if (!row.Dokumen) return <span className="text-slate-400 text-[10px] font-bold uppercase">-</span>;
        return (
          <span className="flex items-center text-[10px] font-bold text-blue-600">
            <Paperclip className="w-3 h-3 mr-1" />
            {row.Dokumen.file_original_name}
          </span>
        );
      }
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_: unknown, item: unknown) => {
        const row = item as HomeVisit;
        return (
          <div className="flex gap-1 justify-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEdit(row)}
              className="w-8 h-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
            >
              <Edit2 size={13} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(row.id)}
              className="w-8 h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            >
              <Trash2 size={13} />
            </Button>
          </div>
        );
      }
    }
  ], [handleEdit, handleDelete]);

  return (
    <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 p-6 rounded-2xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Dokumentasi Kunjungan Rumah (Home Visit)</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Catatan kunjungan rumah langsung ke kediaman wali murid untuk observasi lingkungan belajar</p>
        </div>
        <Button
          variant="toolbarPrimary"
          size="toolbar"
          onClick={() => { resetForm(); setModalOpen(true); }}
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Catat Home Visit
        </Button>
      </div>

      {/* Table */}
      {loading && data.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader className="mb-4" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Menghubungkan Database Kunjungan...</p>
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

      {/* Form Modal */}
      <Suspense fallback={null}>
        <Modal 
          isOpen={modalOpen} 
          onClose={() => { setModalOpen(false); resetForm(); }} 
          title={selectedId ? 'Perbarui Log Home Visit' : 'Catat Home Visit Baru'} 
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Pilih Siswa</Label>
              {selectedSiswa ? (
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200/50 rounded-xl">
                  <div>
                    <div className="font-bold text-xs text-slate-800 dark:text-slate-200">{selectedSiswa.nama_siswa}</div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                      {selectedSiswa.Kelas?.nama_kelas || selectedSiswa.kelas_name || '-'} • NIS: {selectedSiswa.nis || '-'}
                    </div>
                  </div>
                  {!selectedId && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => {
                        setSelectedSiswa(null);
                        setFormData(prev => ({ ...prev, siswa_id: '' }));
                      }}
                      className="text-xs font-black text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 px-3 py-1.5 rounded-lg"
                    >
                      UBAH SISWA
                    </Button>
                  )}
                </div>
              ) : (
                <Suspense fallback={<div className="h-10 bg-slate-100 animate-pulse rounded-xl" />}>
                  <SmartStudentPicker
                    scope="global"
                    onSelect={(s) => {
                      setSelectedSiswa(s);
                      setFormData(prev => ({ ...prev, siswa_id: s.id }));
                    }}
                    mode="siswa"
                    placeholder="Cari nama atau NIS siswa..."
                  />
                </Suspense>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tanggal-kunjungan" className="text-xs font-bold uppercase tracking-wider text-slate-500">Tanggal Kunjungan</Label>
              <Input
                id="tanggal-kunjungan"
                type="date"
                value={formData.tanggal}
                onChange={(e) => setFormData(prev => ({ ...prev, tanggal: e.target.value }))}
                className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alasan-kunjungan" className="text-xs font-bold uppercase tracking-wider text-slate-500">Alasan / Latar Belakang Kunjungan</Label>
              <textarea
                id="alasan-kunjungan"
                aria-label="Alasan / Latar Belakang Kunjungan"
                value={formData.alasan}
                onChange={(e) => setFormData(prev => ({ ...prev, alasan: e.target.value }))}
                placeholder="Tulis latar belakang dilaksanakannya home visit (contoh: Siswa sering terlambat, bermasalah di kelas, dll)..."
                className="w-full min-h-[80px] p-3 text-xs bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hasil-kunjungan" className="text-xs font-bold uppercase tracking-wider text-slate-500">Hasil Kunjungan & Kesepakatan Bersama</Label>
              <textarea
                id="hasil-kunjungan"
                aria-label="Hasil Kunjungan & Kesepakatan Bersama"
                value={formData.hasil}
                onChange={(e) => setFormData(prev => ({ ...prev, hasil: e.target.value }))}
                placeholder="Tulis kondisi lingkungan rumah, tanggapan orang tua, serta komitmen kesepakatan bersama..."
                className="w-full min-h-[100px] p-3 text-xs bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scan-dokumen" className="text-xs font-bold uppercase tracking-wider text-slate-500">Unggah Foto Kunjungan / Laporan Scan Home Visit (Opsional)</Label>
              <Input
                id="scan-dokumen"
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setFormData(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                className="text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="toolbarOutline" size="toolbar" onClick={() => { setModalOpen(false); resetForm(); }}>
                Batal
              </Button>
              <Button type="submit" variant="toolbarPrimary" size="toolbar" className="px-6" disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan Catatan'}
              </Button>
            </div>
          </form>
        </Modal>
      </Suspense>
    </Card>
  );
});


