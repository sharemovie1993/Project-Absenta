import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { bpbkApi, type AsesmenSiswa, bpbkQueryKeys } from '../../../api/bpbk.api';
import { Card } from '../../../components/ui/Card';
import { Table } from '../../../components/ui/Table';
import type { Column } from '../../../components/ui/Table';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Loader } from '../../../components/ui/Loader';
import { Label } from '../../../components/ui/Label';
import toast from 'react-hot-toast';
import useConfirm from '../../../hooks/useConfirm';
import { Plus, Edit2, Trash2, Paperclip, Search, Printer, Users, BarChart2, ShieldAlert, FileText } from 'lucide-react';
import { getKelasList } from '../../../api/academic/kelas.api';
import { sekolahApi, type Sekolah } from '../../../api/academic/sekolah.api';
import { getMyTenant, type Tenant } from '../../../api/tenants.api';
import { getBase64ImageFromUrl } from '../../../utils/cooperative/coopDocUtils';
import { useAuthStore } from '../../../store/authStore';
import { useDebounce } from '../../../hooks/useDebounce';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { AnalyticsCard } from '../../../components/ui/AnalyticsCard';
import { ASESMEN_PRESETS } from '../data/asesmenConstants';
import { printAsesmenBlankSheet, printAsesmenResult } from '../utils/asesmenPrinter';
import { AsesmenFormModal } from './AsesmenFormModal';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { MobileAcademicList } from '../../../components/academic/shared/MobileAcademicList';

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

interface KelasItem {
  id: string;
  nama_kelas: string;
}

export const AsesmenSection: React.FC = React.memo(() => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [search, setSearch] = useState('');
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedTipe, setSelectedTipe] = useState('');
  const debouncedSearch = useDebounce(search, 500);

  const { user } = useAuthStore();
  const [logoDaerahBase64, setLogoDaerahBase64] = useState<string | null>(null);
  const [logoSekolahBase64, setLogoSekolahBase64] = useState<string | null>(null);

  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printPreset, setPrintPreset] = useState('');
  const [printKelas, setPrintKelas] = useState('');
  const [printSiswa, setPrintSiswa] = useState<Student | null>(null);

  // Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<AsesmenSiswa | null>(null);

  // ── useQuery for Print Modal Dropdowns & School Profile ──────────────────
  const { data: classListRes } = useQuery({
    queryKey: ['kelas-list-options'],
    queryFn: () => getKelasList(1, 100).catch(() => ({ success: false, message: '', data: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 1 } })),
    staleTime: 10 * 60 * 1000,
  });
  const classes = useMemo(() => (classListRes?.data || []) as KelasItem[], [classListRes]);

  const { data: sekolahRes } = useQuery({
    queryKey: ['sekolah-profile'],
    queryFn: () => sekolahApi.getProfile().catch(() => null),
    staleTime: 10 * 60 * 1000,
  });
  const sekolah = sekolahRes?.success ? sekolahRes.data : null;

  const { data: tenantRes } = useQuery({
    queryKey: ['my-tenant'],
    queryFn: () => getMyTenant().catch(() => null),
    staleTime: 10 * 60 * 1000,
  });
  const tenantInfo = tenantRes?.success ? tenantRes.data : null;

  const schoolName = useMemo(() => {
    return sekolah?.nama || tenantInfo?.name || 'SMA NEGERI NUSANTARA';
  }, [sekolah, tenantInfo]);

  useEffect(() => {
    const leftLogo = tenantInfo?.logo_daerah_url || (sekolah as any)?.logo_daerah_url;
    if (leftLogo) {
      getBase64ImageFromUrl(leftLogo).then(res => setLogoDaerahBase64(res)).catch(() => setLogoDaerahBase64(null));
    }
  }, [tenantInfo?.logo_daerah_url, (sekolah as any)?.logo_daerah_url, sekolah]);

  useEffect(() => {
    const rightLogo = tenantInfo?.logo_url || sekolah?.logo_url;
    if (rightLogo) {
      getBase64ImageFromUrl(rightLogo).then(res => setLogoSekolahBase64(res)).catch(() => setLogoSekolahBase64(null));
    }
  }, [tenantInfo?.logo_url, sekolah?.logo_url, sekolah]);

  const handlePrint = useCallback(() => {
    if (!printPreset) {
      toast.error('Harap pilih instrumen asesmen yang ingin dicetak');
      return;
    }
    printAsesmenBlankSheet(
      tenantInfo,
      sekolah,
      logoDaerahBase64,
      logoSekolahBase64,
      printPreset,
      printKelas,
      printSiswa
    );
    setPrintModalOpen(false);
  }, [tenantInfo, sekolah, logoDaerahBase64, logoSekolahBase64, printPreset, printKelas, printSiswa]);

  const handlePrintResultClick = useCallback((item: AsesmenSiswa) => {
    printAsesmenResult(
      tenantInfo,
      sekolah,
      logoDaerahBase64,
      logoSekolahBase64,
      item,
      user?.full_name || user?.name || ''
    );
  }, [tenantInfo, sekolah, logoDaerahBase64, logoSekolahBase64, user]);

  const confirm = useConfirm();
  const queryClient = useQueryClient();

  // ── useQuery: Asesmen List ────────────────────────────────────────────────
  const { data: asesmenRes, isLoading: loading, refetch } = useQuery({
    queryKey: bpbkQueryKeys.asesmenList({
      page,
      limit,
      search: debouncedSearch || undefined,
      kelas_name: selectedKelas || undefined,
      nama_asesmen: selectedTipe || undefined
    }),
    queryFn: () => bpbkApi.getAsesmen({
      page,
      limit,
      search: debouncedSearch || undefined,
      kelas_name: selectedKelas || undefined,
      nama_asesmen: selectedTipe || undefined
    }),
    staleTime: 5 * 60 * 1000,
  });

  const data = useMemo(() => (asesmenRes?.data?.list || []) as AsesmenSiswa[], [asesmenRes]);
  const totalPages = asesmenRes?.data?.pagination?.totalPages || 1;
  const totalItems = asesmenRes?.data?.pagination?.totalItems || asesmenRes?.data?.pagination?.total || 0;

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedKelas, selectedTipe]);

  const handleEdit = useCallback((item: AsesmenSiswa) => {
    setSelectedId(item.id);
    setEditingItem(item);
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
        toast.success('Hasil asesmen berhasil dihapus');
        queryClient.invalidateQueries({ queryKey: bpbkQueryKeys.all });
        refetch();
      } else {
        toast.error(res.message || 'Gagal menghapus');
      }
    } catch (err: any) {
      toast.error(err.message || 'Koneksi bermasalah');
    }
  }, [confirm, queryClient, refetch]);

  const handleSort = useCallback((key: string, order: 'asc' | 'desc') => {
    setSortBy(key);
    setSortOrder(order);
  }, []);

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
      render: (value: string) => {
        const isKhusus = value.includes('DCM') || value.includes('Sosiometri');
        return (
          <div className="flex flex-col gap-1 items-start">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{value}</span>
            <span className={`px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-md border ${
              isKhusus 
                ? 'bg-amber-50 text-amber-600 border-amber-200/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30'
                : 'bg-emerald-50 text-emerald-600 border-emerald-200/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30'
            }`}>
              {isKhusus ? 'Asesmen Khusus' : 'Asesmen Massal'}
            </span>
          </div>
        );
      }
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
            onClick={() => handlePrintResultClick(item)}
            className="w-8 h-8 text-sky-600 hover:text-sky-700 hover:bg-sky-50"
            title="Cetak Hasil Laporan Asesmen"
          >
            <Printer size={13} />
          </Button>
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
  ], [handleEdit, handleDelete, handlePrintResultClick]);

  const isMobile = useIsMobile();

  const renderMobileCard = (item: AsesmenSiswa) => {
    return (
      <div
        key={item.id}
        className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {formatDate(item.tanggal)}
            </span>
            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-tight">
              {item.Siswa?.nama_siswa}
            </h4>
            <p className="text-[10px] font-bold text-slate-500 font-mono">
              Kelas: {item.Siswa?.Kelas?.nama_kelas || '-'} • NIS: {item.Siswa?.nis || '-'}
            </p>
          </div>
          <Badge variant="outline" className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 border-indigo-200">
            {item.nama_asesmen}
          </Badge>
        </div>

        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Ringkasan Hasil:</span>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {item.hasil || '-'}
          </p>
          {item.tindak_lanjut && (
            <p className="text-[11px] text-slate-500 italic mt-1">
              Tindak Lanjut: {item.tindak_lanjut}
            </p>
          )}
        </div>

        {item.Dokumen && (
          <div className="flex items-center text-[10px] font-bold text-blue-600">
            <Paperclip className="w-3 h-3 mr-1" />
            <span>{item.Dokumen.file_original_name}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-1 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePrintResultClick(item)}
            className="h-8 px-2.5 text-sky-600 hover:text-sky-700 hover:bg-sky-50 text-[11px] font-bold"
          >
            <Printer size={13} className="mr-1" /> Cetak
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(item)}
            className="h-8 px-2.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 text-[11px] font-bold"
          >
            <Edit2 size={13} className="mr-1" /> Edit
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(item.id)}
            className="w-8 h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            title="Hapus Asesmen"
          >
            <Trash2 size={13} />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 p-6 rounded-2xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Layanan Asesmen Psikologis & Angket BK</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Penyimpanan hasil tes sosiometri, kuesioner gaya belajar, dan hasil tes kepribadian siswa</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="toolbarOutline"
            size="toolbar"
            onClick={() => {
              setPrintPreset('');
              setPrintKelas('');
              setPrintSiswa(null);
              setPrintModalOpen(true);
            }}
            className="flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak Lembar Fisik
          </Button>
          <Button
            variant="toolbarPrimary"
            size="toolbar"
            onClick={() => {
              setSelectedId(null);
              setEditingItem(null);
              setModalOpen(true);
            }}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Catat Asesmen
          </Button>
        </div>
      </div>

      {/* Analytics Summary Cards (Standard Premium Components) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <AnalyticsCard
          variant="premium"
          title="Total Dokumen Asesmen"
          value={totalItems || data?.length || 0}
          subtitle="Berkas Tersimpan"
          icon={<FileText className="text-white" size={20} />}
          gradient="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white border-indigo-400/30"
          isLoading={loading}
        />
        <AnalyticsCard
          variant="premium"
          title="Siswa Terasesmen"
          value={useMemo(() => new Set((data || [])?.map(item => item.siswa_id)).size, [data])}
          subtitle="Profil Individu"
          icon={<Users className="text-white" size={20} />}
          gradient="bg-gradient-to-br from-violet-500 to-violet-700 text-white border-violet-400/30"
          isLoading={loading}
        />
        <AnalyticsCard
          variant="premium"
          title="Asesmen Massal"
          value={useMemo(() => (data || [])?.filter(item => !(item.nama_asesmen?.includes('DCM') || item.nama_asesmen?.includes('Sosiometri'))).length, [data])}
          subtitle="Kelas / Klasikal"
          icon={<BarChart2 className="text-white" size={20} />}
          gradient="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white border-emerald-400/30"
          isLoading={loading}
        />
        <AnalyticsCard
          variant="premium"
          title="Asesmen Khusus"
          value={useMemo(() => (data || [])?.filter(item => item.nama_asesmen?.includes('DCM') || item.nama_asesmen?.includes('Sosiometri')).length, [data])}
          subtitle="Kasus / Fokus Masalah"
          icon={<ShieldAlert className="text-white" size={20} />}
          gradient="bg-gradient-to-br from-amber-500 to-amber-700 text-white border-amber-400/30"
          isLoading={loading}
        />
      </div>

      {/* Panel Pencarian & Penyaringan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Cari nama siswa atau NIS..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
          />
        </div>
        <div>
          <SearchableSelect
            options={[
              { value: '', label: 'Semua Kelas' },
              ...(classes || [])?.map(cls => ({ value: cls.nama_kelas, label: cls.nama_kelas }))
            ]}
            value={selectedKelas}
            onValueChange={setSelectedKelas}
            placeholder="Pilih Kelas"
          />
        </div>
        <div>
          <SearchableSelect
            options={[
              { value: '', label: 'Semua Tipe Asesmen' },
              ...(ASESMEN_PRESETS || [])?.map(preset => ({ value: preset.nama, label: preset.singkatan }))
            ]}
            value={selectedTipe}
            onValueChange={setSelectedTipe}
            placeholder="Pilih Tipe Asesmen"
          />
        </div>
      </div>

      {/* Table / Mobile Cards */}
      {loading && data.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader className="mb-4" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Menghubungkan Database Asesmen...</p>
        </div>
      ) : isMobile ? (
        <div className="space-y-4">
          <MobileAcademicList
            title="Daftar Dokumen Asesmen"
            data={data}
            loading={loading}
            totalItems={totalItems}
            emptyMessage="Belum ada data asesmen siswa."
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
            renderCard={renderMobileCard}
          />
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

      {/* Dynamic modals rendered with lazy/Suspense wrapper */}
      <Suspense fallback={null}>
        {modalOpen && (
          <AsesmenFormModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: bpbkQueryKeys.all });
              refetch();
            }}
            selectedId={selectedId}
            editingItem={editingItem}
          />
        )}

        <Modal isOpen={printModalOpen} onClose={() => setPrintModalOpen(false)} title="Cetak Lembar Fisik Asesmen BK" size="md">
          <div className="space-y-4">
            <p className="text-xs text-slate-500 leading-relaxed">
              Pilih jenis instrumen asesmen BK yang ingin dicetak sebagai lembar fisik siswa. Sistem akan otomatis menyusun tata letak soal/angket siap cetak dengan Kop Surat BK.
            </p>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Pilih Siswa (Opsional - Untuk Cetak Profil Otomatis)</Label>
              {printSiswa ? (
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200/50 rounded-xl">
                  <div>
                    <div className="font-bold text-xs text-slate-800 dark:text-slate-200">{printSiswa.nama_siswa}</div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                      {printSiswa.Kelas?.nama_kelas || '-'} • NIS: {printSiswa.nis || '-'}
                    </div>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => {
                      setPrintSiswa(null);
                      setPrintKelas('');
                    }}
                    className="text-xs font-black text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 px-3 py-1.5 rounded-lg"
                  >
                    HAPUS
                  </Button>
                </div>
              ) : (
                <Suspense fallback={<div className="h-10 bg-slate-100 animate-pulse rounded-xl" />}>
                  <SmartStudentPicker
                    scope="global"
                    onSelect={(s) => {
                      setPrintSiswa(s);
                      if (s?.Kelas?.nama_kelas) {
                        setPrintKelas(s.Kelas.nama_kelas);
                      }
                    }}
                    mode="siswa"
                    placeholder="Ketik nama atau NIS siswa untuk isi profil..."
                  />
                </Suspense>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Nama Lembaga (Kop Surat Terintegrasi)</Label>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300">
                {schoolName || 'Memuat profil lembaga...'}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Pilih Kelas / Rombel Target</Label>
              <SearchableSelect
                options={[
                  { value: '', label: 'Pilih Kelas' },
                  ...(classes || [])?.map(cls => ({ value: cls.nama_kelas, label: cls.nama_kelas }))
                ]}
                value={printKelas}
                onValueChange={setPrintKelas}
                placeholder="Pilih Kelas Target"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Pilih Instrumen Asesmen</Label>
              <SearchableSelect
                options={[
                  { value: 'AKPD (Angket Kebutuhan Peserta Didik)', label: 'AKPD (Angket Kebutuhan)' },
                  { value: 'AUM Umum (Alat Ungkap Masalah)', label: 'AUM Umum' },
                  { value: 'AUM PTSDL (Masalah Belajar)', label: 'AUM PTSDL (Belajar)' },
                  { value: 'DCM (Daftar Cek Masalah)', label: 'DCM (Daftar Cek Masalah)' },
                  { value: 'Sosiometri Hubungan Sosial', label: 'Sosiometri Hubungan Sosial' },
                  { value: 'Angket Gaya Belajar (V-A-K)', label: 'Angket Gaya Belajar (V-A-K)' },
                  { value: 'Inventori Tugas Perkembangan (ITP)', label: 'ITP (Tugas Perkembangan)' },
                  { value: 'Kuesioner Minat Karir (RIASEC)', label: 'Kuesioner Minat Karir (RIASEC)' }
                ]}
                value={printPreset}
                onValueChange={setPrintPreset}
                placeholder="Pilih Instrumen"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="toolbarOutline" size="toolbar" onClick={() => setPrintModalOpen(false)}>
                Batal
              </Button>
              <Button type="button" variant="toolbarPrimary" size="toolbar" className="px-6 flex items-center gap-1.5" onClick={handlePrint}>
                <Printer className="w-3.5 h-3.5" />
                Buka Pratinjau Cetak
              </Button>
            </div>
          </div>
        </Modal>
      </Suspense>
    </Card>
  );
});
