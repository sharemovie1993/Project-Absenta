import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileClock, Plus, Trash2, Calendar, FileText, ExternalLink, RefreshCw } from 'lucide-react';
import { Modal, Button, Input, Textarea, Table, Label, SearchableSelect, ConfirmDialog } from '../ui';
import type { Column } from '../ui/Table';
import { SimpleFormField } from '../ui/SimpleFormField';
import { hubinApi } from '../../api/hubin.api';
import type { HubinMoUHistory } from '../../api/hubin.api';
import { toast } from 'react-hot-toast';

interface HubinMoUHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  mitraId: string | null;
  mitraNama: string | null;
}

const MOU_TYPES = [
  { value: 'PKL', label: 'Praktik Kerja Lapangan (PKL)' },
  { value: 'PENYALURAN_LULUSAN', label: 'Penyaluran Lulusan (BKK)' },
  { value: 'PELATIHAN_GURU', label: 'Pelatihan & Magang Guru' },
  { value: 'KELAS_INDUSTRI', label: 'Kelas Industri / Kurikulum Bersama' },
  { value: 'LAINNYA', label: 'Lain-lain / Kerja Sama Umum' },
];

export const HubinMoUHistoryModal: React.FC<HubinMoUHistoryModalProps> = React.memo(({
  isOpen,
  onClose,
  mitraId,
  mitraNama
}) => {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [mouToDelete, setMouToDelete] = useState<{ id: string; nomor: string } | null>(null);
  const [formData, setFormData] = useState({
    mou_nomor: '',
    mou_tipe: 'PKL',
    tanggal_mulai: '',
    tanggal_selesai: '',
    mou_url: '',
    keterangan: ''
  });

  // Queries
  const { data: mouData, isLoading, refetch } = useQuery({
    queryKey: ['hubin-mitra-mou', mitraId],
    queryFn: () => hubinApi.getMoUHistory(mitraId!),
    enabled: !!mitraId && isOpen
  });

  const mouList = useMemo(() => {
    const resObj = mouData as { data?: HubinMoUHistory[] } | undefined;
    return Array.isArray(mouData?.data) ? mouData.data : resObj?.data || [];
  }, [mouData]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: Partial<HubinMoUHistory>) => hubinApi.createMoUHistory(mitraId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubin-mitra-mou', mitraId] });
      queryClient.invalidateQueries({ queryKey: ['mitra-industri'] });
      toast.success('Riwayat MoU berhasil ditambahkan');
      setFormData({
        mou_nomor: '',
        mou_tipe: 'PKL',
        tanggal_mulai: '',
        tanggal_selesai: '',
        mou_url: '',
        keterangan: ''
      });
      setIsAdding(false);
    },
    onError: (err: unknown) => {
      let errMsg = 'Gagal menyimpan riwayat MoU';
      if (err && typeof err === 'object' && 'response' in err) {
        const resErr = err as { response?: { data?: { message?: string } } };
        if (resErr.response?.data?.message) {
          errMsg = resErr.response.data.message;
        }
      } else if (err instanceof Error) {
        errMsg = err.message;
      }
      toast.error(errMsg);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => hubinApi.deleteMoUHistory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubin-mitra-mou', mitraId] });
      queryClient.invalidateQueries({ queryKey: ['mitra-industri'] });
      toast.success('MoU berhasil dihapus dari riwayat');
      setMouToDelete(null);
    },
    onError: (err: unknown) => {
      let errMsg = 'Gagal menghapus MoU';
      if (err && typeof err === 'object' && 'response' in err) {
        const resErr = err as { response?: { data?: { message?: string } } };
        if (resErr.response?.data?.message) {
          errMsg = resErr.response.data.message;
        }
      } else if (err instanceof Error) {
        errMsg = err.message;
      }
      toast.error(errMsg);
    }
  });

  const [isGeneratingPdf, setIsGeneratingPdf] = useState<string | null>(null);

  const handleGeneratePdf = useCallback(async (row: HubinMoUHistory) => {
    setIsGeneratingPdf(row.id);
    try {
      const res = await hubinApi.generateMoUPdf({
        nomor: row.mou_nomor,
        tanggal: row.tanggal_mulai,
        pihak_kedua_nama: mitraNama || undefined,
        description: row.keterangan || undefined,
        title: `MoU ${row.mou_nomor} - ${mitraNama || ''}`
      });

      if (res.success && res.data?.id) {
        const { createDocumentSignedUrl } = await import('../../api/documents.api');
        const { download_url } = await createDocumentSignedUrl(res.data.id);
        window.open(download_url, '_blank');
        toast.success('MoU PDF berhasil dibuat dan diunduh!');
      } else {
        throw new Error(res.message || 'Gagal menghasilkan PDF');
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuat dokumen MoU PDF');
    } finally {
      setIsGeneratingPdf(null);
    }
  }, [mitraNama]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.mou_nomor.trim()) {
      toast.error('Nomor MoU wajib diisi');
      return;
    }
    createMutation.mutate({
      mou_nomor: formData.mou_nomor.trim(),
      mou_tipe: formData.mou_tipe,
      tanggal_mulai: formData.tanggal_mulai ? new Date(formData.tanggal_mulai).toISOString() : undefined,
      tanggal_selesai: formData.tanggal_selesai ? new Date(formData.tanggal_selesai).toISOString() : undefined,
      mou_url: formData.mou_url.trim() || undefined,
      keterangan: formData.keterangan.trim() || undefined
    });
  }, [formData, createMutation]);

  const handleDelete = useCallback((id: string, nomor: string) => {
    setMouToDelete({ id, nomor });
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (mouToDelete) {
      deleteMutation.mutate(mouToDelete.id);
    }
  }, [mouToDelete, deleteMutation]);

  const columns: Column[] = useMemo(() => [
    {
      key: 'mou_nomor',
      label: 'No. MoU / Tipe',
      render: (mou_nomor: string, row: HubinMoUHistory) => (
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-200">{mou_nomor}</p>
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 dark:text-indigo-400 px-2 py-0.5 rounded-md mt-1 inline-block">
            {MOU_TYPES.find(t => t.value === row.mou_tipe)?.label || row.mou_tipe}
          </span>
        </div>
      )
    },
    {
      key: 'tanggal_mulai',
      label: 'Masa Berlaku',
      render: (_, row: HubinMoUHistory) => {
        const start = row.tanggal_mulai ? new Date(row.tanggal_mulai).toLocaleDateString('id-ID') : '-';
        const end = row.tanggal_selesai ? new Date(row.tanggal_selesai).toLocaleDateString('id-ID') : '-';
        return (
          <div className="text-xs text-slate-650 dark:text-slate-350 space-y-0.5">
            <p><span className="font-medium">Mulai:</span> {start}</p>
            <p><span className="font-medium">Selesai:</span> {end}</p>
          </div>
        );
      }
    },
    {
      key: 'mou_url',
      label: 'Dokumen',
      render: (mou_url: string, row: HubinMoUHistory) => (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          {mou_url ? (
            <a
              href={mou_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
            >
              <FileText size={14} /> Link MoU <ExternalLink size={10} />
            </a>
          ) : (
            <span className="text-slate-400 text-xs">Belum diunggah</span>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[10px] gap-1 py-1 px-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-bold"
            onClick={() => handleGeneratePdf(row)}
            disabled={isGeneratingPdf === row.id}
          >
            {isGeneratingPdf === row.id ? 'Memproses...' : 'Cetak PDF'}
          </Button>
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_, row: HubinMoUHistory) => (
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-full"
          onClick={() => handleDelete(row.id, row.mou_nomor)}
          disabled={deleteMutation.isPending}
        >
          <Trash2 size={16} />
        </Button>
      )
    }
  ], [handleDelete, deleteMutation.isPending, handleGeneratePdf, isGeneratingPdf]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={
        <div className="flex items-center gap-2">
          <FileClock size={20} className="text-indigo-600 dark:text-indigo-400" />
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">Riwayat Kerja Sama MoU</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{mitraNama || 'Mitra Industri'}</p>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Toggle Form Tambah */}
        {!isAdding ? (
          <div className="flex justify-end print:hidden">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsAdding(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
            >
              <Plus size={16} className="mr-1.5" /> Catat MoU Baru
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-slate-50/50 dark:bg-slate-900/50 p-5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-4 animate-in slide-in-from-top-4 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Pencatatan MoU Baru</span>
              <Button type="button" variant="ghost" size="sm" className="h-6 text-slate-400 hover:text-slate-600 p-0" onClick={() => setIsAdding(false)}>Batal</Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="mou-history-nomor">Nomor MoU <span className="text-red-500">*</span></Label>
                <Input
                  id="mou-history-nomor"
                  required
                  placeholder="Contoh: 120/MOU/2026"
                  value={formData.mou_nomor}
                  onChange={e => setFormData({ ...formData, mou_nomor: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mou-history-tipe">Tipe Kerja Sama</Label>
                <SearchableSelect
                  id="mou-history-tipe"
                  options={MOU_TYPES}
                  value={formData.mou_tipe}
                  onValueChange={val => setFormData({ ...formData, mou_tipe: val })}
                  triggerClassName="w-full h-10 px-3 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mou-history-tgl-mulai">Tanggal Mulai Berlaku</Label>
                <Input
                  id="mou-history-tgl-mulai"
                  type="date"
                  value={formData.tanggal_mulai}
                  onChange={e => setFormData({ ...formData, tanggal_mulai: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mou-history-tgl-selesai">Tanggal Berakhir MoU</Label>
                <Input
                  id="mou-history-tgl-selesai"
                  type="date"
                  value={formData.tanggal_selesai}
                  onChange={e => setFormData({ ...formData, tanggal_selesai: e.target.value })}
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="mou-history-url">URL / Tautan Dokumen MoU</Label>
                <Input
                  id="mou-history-url"
                  type="url"
                  placeholder="Contoh: https://drive.google.com/..."
                  value={formData.mou_url}
                  onChange={e => setFormData({ ...formData, mou_url: e.target.value })}
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="mou-history-ket">Keterangan</Label>
                <Textarea
                  id="mou-history-ket"
                  placeholder="Catatan tambahan kerja sama..."
                  rows={2}
                  value={formData.keterangan}
                  onChange={e => setFormData({ ...formData, keterangan: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={createMutation.isPending}
                className="bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl px-5"
              >
                {createMutation.isPending ? <RefreshCw size={14} className="mr-1.5 animate-spin" /> : null}
                Simpan MoU
              </Button>
            </div>
          </form>
        )}

        {/* Tabel Riwayat */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
          <Table
            columns={columns}
            data={mouList}
            loading={isLoading}
            emptyMessage="Belum ada catatan riwayat kerja sama MoU sebelumnya untuk mitra ini."
            className="text-xs"
          />
        </div>
      </div>
      <ConfirmDialog
        isOpen={!!mouToDelete}
        title="Hapus Riwayat MoU"
        description={`Apakah Anda yakin ingin menghapus MoU No: ${mouToDelete?.nomor || ''} dari riwayat mitra ini? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        cancelText="Batal"
        onConfirm={handleConfirmDelete}
        onCancel={() => setMouToDelete(null)}
        style="danger"
        loading={deleteMutation.isPending}
      />
    </Modal>
  );
});
