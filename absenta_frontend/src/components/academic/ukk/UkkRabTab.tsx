import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign,
  PackageCheck,
  Wrench,
  Send,
  Plus,
  Trash2,
  Edit2,
  Printer,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Clock,
  Building2,
  Layers,
  Search,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Loader } from '@/components/ui/Loader';
import { raporApi } from '@/api/rapor.api';
import { sarprasApi } from '@/api/sarpras.api';
import { sekolahApi } from '@/api/academic/sekolah.api';
import { useConfirm } from '@/providers/ConfirmProvider';
import {
  generatePdfUkkRab,
  formatRupiah,
  type UkkRabItem,
  type UkkRabData,
  type UkkRabPrintData,
} from '@/utils/print/modules/pdfUkkRab';
import { UkkRabPrintModal } from './UkkRabPrintModal';
import { useUkkStrukturSigners } from './useUkkStrukturSigners';
import { cn } from '@/lib/utils';

export interface UkkRabTabProps {
  jurusanId?: string;
  jurusanNama?: string;
  tahunPelajaranId?: string;
  tahunAjaran?: string;
  jumlahPeserta?: number;
  readOnly?: boolean;
}

export const UkkRabTab: React.FC<UkkRabTabProps> = ({
  jurusanId,
  jurusanNama = 'Kejuruan',
  tahunPelajaranId: _tahunPelajaranId,
  tahunAjaran = '2025/2026',
  jumlahPeserta = 36,
  readOnly = false,
}) => {
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  const autoSigners = useUkkStrukturSigners(jurusanId, jurusanNama);

  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'ALL' | 'BAHAN' | 'ALAT'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Form State Item Kebutuhan
  const [itemForm, setItemForm] = useState<UkkRabItem>({
    id: '',
    nama_barang: '',
    kategori: 'BAHAN',
    spesifikasi: '',
    rasio_per_siswa: 1,
    jumlah_total: jumlahPeserta,
    satuan: 'Pcs',
    harga_satuan: 0,
    total_harga: 0,
    status_ketersediaan: 'PERLU_PENGADAAN',
    keterangan: '',
  });

  // Modal Pengajuan ke Sarpras
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [catatanPengantar, setCatatanPengantar] = useState(
    'Pengajuan Rencana Anggaran Biaya (RAB) dan Kebutuhan Alat/Bahan Uji Kompetensi Keahlian (UKK) Program Keahlian ' +
      jurusanNama +
      ' Tahun Pelajaran ' +
      tahunAjaran
  );

  // 1. Fetch RAB Data dari Backend
  const { data: rabRes, isLoading } = useQuery({
    queryKey: ['ukk-rab', jurusanId, tahunAjaran],
    queryFn: () => (jurusanId ? raporApi.getUkkRab(jurusanId, tahunAjaran) : Promise.resolve(null)),
    enabled: !!jurusanId,
    staleTime: 60 * 1000,
  });

  // 2. Fetch Katalog Sarpras (opsional untuk auto-complete)
  const { data: catalogRes } = useQuery({
    queryKey: ['sarpras-catalog-items'],
    queryFn: () => sarprasApi.getCatalog().catch(() => null),
    staleTime: 5 * 60 * 1000,
  });

  const catalogOptions = useMemo(() => {
    const list = (catalogRes as any)?.data || catalogRes || [];
    return Array.isArray(list) ? list : [];
  }, [catalogRes]);

  // Normalisasi Data RAB
  const rabData: UkkRabData = useMemo(() => {
    const raw = (rabRes as any)?.data || rabRes;
    if (raw && typeof raw === 'object') {
      return {
        id: raw.id || `rab_${Date.now()}`,
        jurusanId: jurusanId || '',
        jurusanNama: jurusanNama,
        tahunPelajaran: tahunAjaran,
        judulPenugasan: raw.judulPenugasan || `Praktik Kejuruan ${jurusanNama}`,
        jumlahPeserta: raw.jumlahPeserta || jumlahPeserta,
        statusPengajuan: raw.statusPengajuan || 'DRAFT',
        tanggalPengajuan: raw.tanggalPengajuan || new Date().toISOString().split('T')[0],
        catatanPengantar: raw.catatanPengantar || '',
        catatanSarpras: raw.catatanSarpras || '',
        items: Array.isArray(raw.items) ? raw.items : [],
      };
    }
    return {
      id: `rab_${Date.now()}`,
      jurusanId: jurusanId || '',
      jurusanNama: jurusanNama,
      tahunPelajaran: tahunAjaran,
      judulPenugasan: `Praktik Kejuruan ${jurusanNama}`,
      jumlahPeserta: jumlahPeserta,
      statusPengajuan: 'DRAFT',
      tanggalPengajuan: new Date().toISOString().split('T')[0],
      catatanPengantar: '',
      catatanSarpras: '',
      items: [],
    };
  }, [rabRes, jurusanId, jurusanNama, tahunAjaran, jumlahPeserta]);

  // Mutation Save RAB
  const saveMutation = useMutation({
    mutationFn: (updatedPayload: UkkRabData) => {
      if (!jurusanId) throw new Error('Jurusan belum dipilih');
      return raporApi.saveUkkRab(jurusanId, updatedPayload, tahunAjaran);
    },
    onSuccess: () => {
      toast.success('RAB Alat & Bahan UKK berhasil disimpan');
      queryClient.invalidateQueries({ queryKey: ['ukk-rab', jurusanId, tahunAjaran] });
      setModalOpen(false);
      setSubmitModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal menyimpan RAB UKK');
    },
  });

  // Perhitungan Ringkas
  const stats = useMemo(() => {
    const items = rabData.items || [];
    const alatItems = items.filter((i) => i.kategori === 'ALAT');
    const bahanItems = items.filter((i) => i.kategori === 'BAHAN');

    const totalAlatBiaya = alatItems.reduce((acc, curr) => acc + (curr.total_harga || 0), 0);
    const totalBahanBiaya = bahanItems.reduce((acc, curr) => acc + (curr.total_harga || 0), 0);
    const grandTotal = totalAlatBiaya + totalBahanBiaya;

    const alatTersediaCount = alatItems.filter((i) => i.status_ketersediaan === 'TERSEDIA').length;
    const alatPengadaanCount = alatItems.filter((i) => i.status_ketersediaan === 'PERLU_PENGADAAN').length;

    return {
      grandTotal,
      alatCount: alatItems.length,
      alatTersediaCount,
      alatPengadaanCount,
      bahanCount: bahanItems.length,
      status: rabData.statusPengajuan,
    };
  }, [rabData]);

  // Filter Tabel
  const filteredItems = useMemo(() => {
    return (rabData.items || []).filter((item) => {
      const matchCat =
        activeCategoryFilter === 'ALL' || item.kategori === activeCategoryFilter;
      const q = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm.trim() ||
        item.nama_barang.toLowerCase().includes(q) ||
        (item.spesifikasi && item.spesifikasi.toLowerCase().includes(q)) ||
        item.satuan.toLowerCase().includes(q);

      return matchCat && matchSearch;
    });
  }, [rabData.items, activeCategoryFilter, searchTerm]);

  // Modal Handlers
  const handleOpenAdd = () => {
    setEditingItemId(null);
    setItemForm({
      id: `item_${Date.now()}`,
      nama_barang: '',
      kategori: 'BAHAN',
      spesifikasi: '',
      rasio_per_siswa: 1,
      jumlah_total: rabData.jumlahPeserta || jumlahPeserta,
      satuan: 'Pcs',
      harga_satuan: 0,
      total_harga: 0,
      status_ketersediaan: 'PERLU_PENGADAAN',
      keterangan: '',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (item: UkkRabItem) => {
    setEditingItemId(item.id);
    setItemForm({ ...item });
    setModalOpen(true);
  };

  const handleDeleteItem = async (itemId: string) => {
    const isConfirmed = await confirm({
      title: 'Hapus Item Kebutuhan?',
      message: 'Apakah Anda yakin ingin menghapus item ini dari daftar RAB UKK?',
      confirmText: 'Hapus Item',
      cancelText: 'Batal',
      variant: 'danger',
    });

    if (!isConfirmed) return;

    const updatedItems = (rabData.items || []).filter((i) => i.id !== itemId);
    saveMutation.mutate({
      ...rabData,
      items: updatedItems,
    });
  };

  const handleSaveItem = () => {
    if (!itemForm.nama_barang.trim()) {
      toast.error('Nama alat / bahan wajib diisi');
      return;
    }

    const calculatedTotal = (itemForm.jumlah_total || 0) * (itemForm.harga_satuan || 0);
    const finalItem: UkkRabItem = {
      ...itemForm,
      total_harga: calculatedTotal,
    };

    let updatedList = [...(rabData.items || [])];
    if (editingItemId) {
      updatedList = updatedList.map((i) => (i.id === editingItemId ? finalItem : i));
    } else {
      updatedList.push(finalItem);
    }

    saveMutation.mutate({
      ...rabData,
      items: updatedList,
    });
  };

  // Kirim Pengajuan ke Sarpras
  const handleSubmitToSarpras = () => {
    saveMutation.mutate({
      ...rabData,
      statusPengajuan: 'DIAJUKAN_KE_SARPRAS',
      catatanPengantar,
      tanggalPengajuan: new Date().toISOString().split('T')[0],
    });
  };

  // Cetak Dokumen PDF
  const handlePrintPdf = async () => {
    try {
      const sekolahRes = await sekolahApi.getProfile().catch(() => null);
      const sekolahData = (sekolahRes as any)?.data || sekolahRes || {};

      const payload: UkkRabPrintData = {
        sekolah: {
          nama: sekolahData?.nama || 'SEKOLAH MENENGAH KEJURUAN',
          alamat: sekolahData?.alamat || '',
          kota: sekolahData?.kota || 'Purwakarta',
          kepala_sekolah: sekolahData?.kepala_sekolah || 'Kepala Sekolah',
          nip_kepala: sekolahData?.nip_kepala || '-',
        },
        kaprog: {
          nama: 'Ketua Program Keahlian',
          nip: '-',
        },
        wakasekSarpras: {
          nama: 'Wakasek Bidang Sarpras',
          nip: '-',
        },
        rab: rabData,
      };

      const { blobUrl } = generatePdfUkkRab(payload);
      window.open(blobUrl, '_blank');
    } catch {
      toast.error('Gagal membuat dokumen PDF RAB UKK');
    }
  };

  return (
    <div className="space-y-6">
      {/* 4 Kartu Metrik Ringkas Sesuai Standar Gambar 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5 transition-all hover:border-slate-300 dark:hover:border-slate-700">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shrink-0 shadow-sm shadow-emerald-500/20">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Estimasi RAB</div>
            <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5 tracking-tight truncate">
              {formatRupiah(stats.grandTotal)}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500">Alat & Bahan UKK</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5 transition-all hover:border-slate-300 dark:hover:border-slate-700">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm shadow-blue-500/20">
            <PackageCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Bahan Habis Pakai</div>
            <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5 tracking-tight truncate">
              {stats.bahanCount} Item
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500">Kuota {rabData.jumlahPeserta} Peserta</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5 transition-all hover:border-slate-300 dark:hover:border-slate-700">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shrink-0 shadow-sm shadow-amber-500/20">
            <Wrench className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Alat Praktik Lab</div>
            <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5 tracking-tight truncate">
              {stats.alatCount} Item
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500">
              {stats.alatTersediaCount} Siap • {stats.alatPengadaanCount} Pengadaan
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5 transition-all hover:border-slate-300 dark:hover:border-slate-700">
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm',
              stats.status === 'DISETUJUI_SARPRAS'
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20'
                : stats.status === 'DIAJUKAN_KE_SARPRAS'
                ? 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/20'
                : 'bg-gradient-to-br from-slate-500 to-slate-700 shadow-slate-500/20'
            )}
          >
            {stats.status === 'DISETUJUI_SARPRAS' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : stats.status === 'DIAJUKAN_KE_SARPRAS' ? (
              <Clock className="w-5 h-5" />
            ) : (
              <Building2 className="w-5 h-5" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Status Sarpras</div>
            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-0.5 truncate">
              {stats.status === 'DISETUJUI_SARPRAS'
                ? 'Disetujui Sarpras'
                : stats.status === 'DIAJUKAN_KE_SARPRAS'
                ? 'Sedang Diverifikasi'
                : 'Draf Kaprog'}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500">Integrasi Sarpras</div>
          </div>
        </div>
      </div>

      {/* Action Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Rencana Anggaran Biaya (RAB) Kebutuhan Alat & Bahan UKK
            </h3>
            <Badge variant="outline" className="text-xs font-semibold border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg">
              {jurusanNama}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Susun rincian kebutuhan peralatan dan bahan habis pakai (BHP) untuk diajukan ke Bagian Sarana & Prasarana.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!readOnly && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSubmitModalOpen(true)}
                disabled={(rabData.items || []).length === 0}
                className={cn(
                  'h-9 px-3 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer shadow-2xs transition-all',
                  stats.status === 'DIAJUKAN_KE_SARPRAS'
                    ? 'border-indigo-300 text-indigo-700 bg-indigo-50'
                    : 'border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                )}
                title="Kirim tiket pengajuan pengadaan bahan dan kesiapan alat ke Modul Sarpras"
              >
                <Send className="w-3.5 h-3.5 text-indigo-600" />
                {stats.status === 'DIAJUKAN_KE_SARPRAS' ? 'Update Pengajuan' : 'Ajukan ke Sarpras'}
              </Button>
              <Button
                size="sm"
                onClick={handleOpenAdd}
                className="h-9 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Alat / Bahan
              </Button>
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPrintModalOpen(true)}
            disabled={(rabData.items || []).length === 0}
            className="h-9 px-3 rounded-xl border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold gap-1.5 cursor-pointer shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-600" />
            Cetak RAB (PDF)
          </Button>
        </div>
      </div>

      {/* Banner Sinkronisasi Posisi Jabatan Struktur Organisasi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <span>Penandatangan Terhubung Struktur Organisasi</span>
              {autoSigners.kaprog.isAssigned && autoSigners.wakasekSarpras.isAssigned && (
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  Sinkron Otomatis
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-slate-600 dark:text-slate-400 text-[11px] mt-0.5">
              <span>
                <strong>Kaprog {jurusanNama}:</strong>{' '}
                <span className="text-slate-900 dark:text-white font-medium">{autoSigners.kaprog.nama}</span>
                {autoSigners.kaprog.nip !== '-' && ` (NIP. ${autoSigners.kaprog.nip})`}
              </span>
              <span>•</span>
              <span>
                <strong>Wakasek Sarpras:</strong>{' '}
                <span className="text-slate-900 dark:text-white font-medium">{autoSigners.wakasekSarpras.nama}</span>
                {autoSigners.wakasekSarpras.nip !== '-' && ` (NIP. ${autoSigners.wakasekSarpras.nip})`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        {/* Toolbar & Filter Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
          {/* Search Box */}
          <div className="relative sm:col-span-2 lg:col-span-5">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama alat, bahan, spesifikasi, satuan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-10 pr-4 text-xs font-medium rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
            />
          </div>

          {/* Kategori Filter Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700 overflow-x-auto no-scrollbar sm:col-span-2 lg:col-span-5">
            {[
              { id: 'ALL', label: `Semua Kebutuhan (${rabData.items?.length || 0})` },
              { id: 'BAHAN', label: `Bahan Habis Pakai (${stats.bahanCount})` },
              { id: 'ALAT', label: `Alat Praktik (${stats.alatCount})` },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setActiveCategoryFilter(st.id as any)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer',
                  activeCategoryFilter === st.id
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                )}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-950/60 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Nama Barang & Spesifikasi</th>
                <th className="py-3 px-4 whitespace-nowrap">Kategori</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Volume & Rasio</th>
                <th className="py-3 px-4 whitespace-nowrap">Ketersediaan</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Estimasi Harga</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Total Biaya</th>
                {!readOnly && <th className="py-3 px-4 text-right whitespace-nowrap">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader className="w-6 h-6 text-indigo-600 animate-spin" />
                      <p className="text-xs text-slate-500">Memuat data RAB Alat & Bahan...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 text-xs">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
                        <PackageCheck className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                        Belum ada item alat atau bahan ditambahkan.
                      </p>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Klik tombol "Tambah Alat / Bahan" di atas untuk menyusun kebutuhan bahan praktik dan kesiapan alat lab.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 text-center font-mono text-slate-400 text-xs">{idx + 1}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{item.nama_barang}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {item.spesifikasi || '-'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {item.kategori === 'ALAT' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <Wrench className="w-3 h-3" />
                          Alat Praktik
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          <PackageCheck className="w-3 h-3" />
                          Bahan Habis Pakai
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="font-bold font-mono text-slate-900 dark:text-white">
                        {item.jumlah_total} {item.satuan}
                      </div>
                      {item.rasio_per_siswa && item.rasio_per_siswa > 0 ? (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          ({item.rasio_per_siswa} {item.satuan} / siswa)
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {item.status_ketersediaan === 'TERSEDIA' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          Tersedia di Lab
                        </span>
                      ) : item.status_ketersediaan === 'PINJAM' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          Pinjam / DU-DI
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          Perlu Pengadaan
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {formatRupiah(item.harga_satuan)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {formatRupiah(item.total_harga)}
                    </td>
                    {!readOnly && (
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Edit Item"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form Tambah / Edit Item Alat & Bahan */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItemId ? 'Edit Item Alat / Bahan UKK' : 'Tambah Kebutuhan Alat / Bahan UKK'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Nama Alat / Bahan <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={itemForm.nama_barang}
                onChange={(e) => setItemForm({ ...itemForm, nama_barang: e.target.value })}
                placeholder="Contoh: Kabel UTP Cat6, Konektor RJ-45, Routerboard"
                className="mt-1 w-full px-3 py-2 text-xs bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Kategori Item <span className="text-rose-500">*</span>
              </label>
              <select
                value={itemForm.kategori}
                onChange={(e) => {
                  const newKat = e.target.value as 'ALAT' | 'BAHAN';
                  setItemForm({
                    ...itemForm,
                    kategori: newKat,
                    status_ketersediaan: newKat === 'ALAT' ? 'TERSEDIA' : 'PERLU_PENGADAAN',
                  });
                }}
                className="mt-1 w-full px-3 py-2 text-xs bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer shadow-xs font-medium"
              >
                <option value="BAHAN">Bahan Habis Pakai (BHP)</option>
                <option value="ALAT">Peralatan / Aset Lab Utama</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Spesifikasi / Merk / Tipe Teknis
            </label>
            <input
              type="text"
              value={itemForm.spesifikasi || ''}
              onChange={(e) => setItemForm({ ...itemForm, spesifikasi: e.target.value })}
              placeholder="Contoh: Belden Original / Mikrotik RB750Gr3 / Tembaga Murni"
              className="mt-1 w-full px-3 py-2 text-xs bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-xs"
            />
          </div>

          {/* Kuota & Volume Perhitungan */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                Rasio Per Siswa
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={itemForm.rasio_per_siswa || 0}
                onChange={(e) => {
                  const rasio = parseFloat(e.target.value) || 0;
                  const total = rasio > 0 ? Math.ceil(rasio * (rabData.jumlahPeserta || jumlahPeserta)) : itemForm.jumlah_total;
                  setItemForm({
                    ...itemForm,
                    rasio_per_siswa: rasio,
                    jumlah_total: total,
                  });
                }}
                className="mt-1 w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-xs"
              />
              <span className="text-[10px] text-slate-400">Untuk {rabData.jumlahPeserta} siswa</span>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                Total Volume Kebutuhan <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={itemForm.jumlah_total}
                onChange={(e) => setItemForm({ ...itemForm, jumlah_total: parseInt(e.target.value) || 0 })}
                className="mt-1 w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-xs font-bold"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                Satuan <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={itemForm.satuan}
                onChange={(e) => setItemForm({ ...itemForm, satuan: e.target.value })}
                placeholder="Meter, Roll, Pcs, Box"
                className="mt-1 w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Estimasi Harga Satuan (Rp)
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={itemForm.harga_satuan}
                onChange={(e) => setItemForm({ ...itemForm, harga_satuan: parseFloat(e.target.value) || 0 })}
                placeholder="Contoh: 15000"
                className="mt-1 w-full px-3 py-2 text-xs bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-xs font-mono"
              />
              <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                Total Biaya: {formatRupiah((itemForm.jumlah_total || 0) * (itemForm.harga_satuan || 0))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Status Ketersediaan Fisik
              </label>
              <select
                value={itemForm.status_ketersediaan}
                onChange={(e) =>
                  setItemForm({
                    ...itemForm,
                    status_ketersediaan: e.target.value as any,
                  })
                }
                className="mt-1 w-full px-3 py-2 text-xs bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer shadow-xs font-medium"
              >
                <option value="TERSEDIA">Tersedia di Lab (Stok Siap)</option>
                <option value="PERLU_PENGADAAN">Perlu Pengadaan / Belanja Baru</option>
                <option value="PINJAM">Pinjam dari Mitra Industri / DU-DI</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/60">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
              className="h-9 px-3.5 rounded-xl border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleSaveItem}
              disabled={saveMutation.isPending}
              className="gap-1.5 text-xs font-semibold h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
            >
              {editingItemId ? 'Simpan Perubahan' : 'Tambahkan ke RAB'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Konfirmasi Kirim Pengajuan ke Sarpras */}
      <Modal
        isOpen={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
        title="Kirim Pengajuan Kebutuhan Alat & Bahan ke Modul Sarpras"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 rounded-2xl p-3.5 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>Tiket Integrasi Modul Sarpras</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Daftar {rabData.items?.length || 0} item alat dan bahan dengan total estimasi anggaran{' '}
              <strong>{formatRupiah(stats.grandTotal)}</strong> akan diteruskan ke Tim Sarpras sekolah untuk
              diverifikasi ketersediaan stok inventaris dan persetujuan pengadaan.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Catatan Pengantar untuk Wakasek Sarpras
            </label>
            <textarea
              rows={3}
              value={catatanPengantar}
              onChange={(e) => setCatatanPengantar(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-xs bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none transition-all shadow-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/60">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSubmitModalOpen(false)}
              disabled={saveMutation.isPending}
              className="h-9 px-3.5 rounded-xl border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitToSarpras}
              disabled={saveMutation.isPending}
              className="gap-1.5 text-xs font-semibold h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              {saveMutation.isPending ? 'Mengirim...' : 'Kirim Pengajuan Sekarang'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Universal Document Cetak Dokumen RAB UKK */}
      <UkkRabPrintModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        rabData={rabData}
        jurusanNama={jurusanNama}
        tahunPelajaran={tahunAjaran}
        kaprogNama={autoSigners.kaprog.nama}
        kaprogNip={autoSigners.kaprog.nip}
        wakasekSarprasNama={autoSigners.wakasekSarpras.nama}
        wakasekSarprasNip={autoSigners.wakasekSarpras.nip}
      />
    </div>
  );
};
