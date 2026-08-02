import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Label } from '../../components/ui/Label';
import toast from 'react-hot-toast';
import useConfirm from '../../hooks/useConfirm';
import { useDebounce } from '../../hooks/useDebounce';
import { kesiswaanApi } from '../../api/kesiswaan.api';
import type { Pelanggaran, JenisPelanggaran } from '../../api/kesiswaan.api';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  User,
  Calendar,
  Trash2,
  Edit2,
  BookOpen,
  TrendingDown,
  Search,
  X,
  Plus
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Loader } from '../../components/ui/Loader';
import { z } from 'zod';

import { useAuthStore } from '../../store/authStore';
import { useNavStore } from '../../store/navStore';
import { useJenisPelanggaranOptions } from '../../hooks/useJenisPelanggaranOptions';
import { useWaliKelasOptions } from '../../hooks/useWaliKelasOptions';

// Lazy load heavy components
const Modal = lazy(() => import('../../components/ui/Modal').then(m => ({ default: m.Modal })));
const SmartStudentPicker = lazy(() => import('../../components/common/SmartStudentPicker').then(m => ({ default: m.SmartStudentPicker })));

// Tipe badge variant eksplisit – pengganti tipe longgar
type BadgeVariant = 'error' | 'warning' | 'success' | 'outline' | 'default';

interface StatusConfig {
  variant: BadgeVariant;
  label: string;
  icon: React.ReactNode;
  colorClass: string;
}

interface Student {
  id: string;
  nama_siswa?: string;
  nis?: string;
  Kelas?: {
    nama_kelas: string;
  };
  foto_profile_url?: string;
  no_rfid?: string;
}

// Skema validasi Zod untuk form data (Pilar 25)
const pelanggaranSchema = z.object({
  siswa_id: z.string().min(1, 'Siswa wajib dipilih'),
  jenis_pelanggaran: z.string().min(1, 'Kategori perilaku wajib dipilih'),
  poin: z.number().min(0, 'Bobot poin minimal 0'),
  keterangan: z.string().optional(),
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
  status: z.string().min(1, 'Status wajib dipilih')
});

export default function PelanggaranPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [data, setData] = useState<Pelanggaran[]>([]);
  const [loading, setLoading] = useState(true); // Skeleton loading guard
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);

  const { activeWorkspaceId } = useNavStore();
  const { rawList: waliKelasAssignments } = useWaliKelasOptions();

  // Resolusi nama & ID rombel binaan Wali Kelas menggunakan profile & useWaliKelasOptions hook
  const effectiveWaliKelasId = useMemo(() => {
    const directObj = (user as any)?.guru_profile?.wali_kelas_di;
    const directId = typeof directObj === 'object' ? directObj?.id : directObj || (user as any)?.guru_profile?.kelas_id;
    if (directId) return directId;

    if (waliKelasAssignments && waliKelasAssignments.length > 0 && user?.id) {
      const found = waliKelasAssignments.find(
        (item) => item.user_id === user.id || item.Guru?.user_id === user.id || item.Guru?.id === (user as any)?.guru_profile?.id
      );
      if (found?.kelas_id) return found.kelas_id;
      if (found?.Kelas?.id) return found.Kelas.id;
    }
    return null;
  }, [user, waliKelasAssignments]);

  const waliKelasNama = useMemo(() => {
    const directObj = (user as any)?.guru_profile?.wali_kelas_di;
    if (typeof directObj === 'object' && directObj?.nama_kelas) return directObj.nama_kelas;

    if (waliKelasAssignments && waliKelasAssignments.length > 0 && user?.id) {
      const found = waliKelasAssignments.find(
        (item) => item.user_id === user.id || item.Guru?.user_id === user.id || item.Guru?.id === (user as any)?.guru_profile?.id
      );
      if (found?.Kelas?.nama_kelas) return found.Kelas.nama_kelas;
    }
    return '';
  }, [user, waliKelasAssignments]);

  const isWaliKelasRole = useMemo(() => {
    const pos = user?.position_codes || [];
    return !!effectiveWaliKelasId || pos.includes('WALIKELAS');
  }, [user, effectiveWaliKelasId]);

  // Penentuan mode tampilan: Jika user punya rombel binaan DAN (aktif di WALIKELAS_WORKSPACE ATAU bukan Staf Kesiswaan/Admin murni)
  const isWaliKelas = useMemo(() => {
    if (!effectiveWaliKelasId) return false;
    const roleName = String(user?.role?.name || '').toUpperCase();
    const isPureAdminOrKesiswaan = roleName === 'ADMIN' || roleName === 'SUPERADMIN' || roleName === 'KESISWAAN';

    if (activeWorkspaceId === 'WALIKELAS_WORKSPACE') return true;
    if (!isPureAdminOrKesiswaan && isWaliKelasRole) return true;
    return false;
  }, [effectiveWaliKelasId, activeWorkspaceId, user, isWaliKelasRole]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [formData, setFormData] = useState({
    siswa_id: '',
    jenis_pelanggaran: '',
    poin: 0,
    keterangan: '',
    tanggal: new Date().toISOString().split('T')[0],
    status: 'BARU'
  });
  const [selectedSiswa, setSelectedSiswa] = useState<Student | null>(null);

  const confirm = useConfirm();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit: itemsPerPage,
        search: debouncedSearch,
        elevated_context: 'true'
      };

      // Konteks Wali Kelas: Otomatis memfilter kasus khusus siswa rombel bimbingan
      if (isWaliKelas && effectiveWaliKelasId) {
        params.kelas_id = effectiveWaliKelasId;
      }

      const result = await kesiswaanApi.getPelanggaran(params);
      const list = result.data?.list || result.list || [];
      setData(list);
      
      // Update pagination info
      if (result.pagination) {
        setTotalPages(result.pagination.totalPages || 1);
        setTotalItems(result.pagination.total || list.length);
        setCurrentPage(result.pagination.page || page);
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error('Gagal mengambil data catatan');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, itemsPerPage, isWaliKelas, effectiveWaliKelasId]);

  // Hook Kanonikal Jenis Pelanggaran (Query Caching & Auto-sync)
  const { rawList: jenisPelanggaranList, options: jenisPelanggaranSelectOptions } = useJenisPelanggaranOptions();

  useEffect(() => {
    fetchData(1);
    setCurrentPage(1);
  }, [fetchData]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    fetchData(page);
  }, [fetchData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = pelanggaranSchema.safeParse(formData);
    if (!validation.success) {
      const errMsg = validation.error.issues[0]?.message || 'Data form tidak valid';
      toast.error(errMsg);
      return;
    }
    try {
      if (selectedId) {
        await kesiswaanApi.updatePelanggaran(selectedId, formData);
        toast.success('Catatan perkembangan berhasil diperbarui');
      } else {
        await kesiswaanApi.createPelanggaran(formData);
        toast.success('Catatan perkembangan berhasil disimpan');
      }
      queryClient.invalidateQueries({ queryKey: ['kesiswaan-monitoring-violations'] });
      setModalOpen(false);
      fetchData();
      resetForm();
    } catch (err: unknown) {
      console.error(err);
      toast.error('Gagal menyimpan catatan');
    }
  }, [selectedId, formData, fetchData, queryClient]);

  const resetForm = useCallback(() => {
    setFormData({
      siswa_id: '',
      jenis_pelanggaran: '',
      poin: 0,
      keterangan: '',
      tanggal: new Date().toISOString().split('T')[0],
      status: 'BARU'
    });
    setSelectedSiswa(null);
    setSelectedId(null);
  }, []);

  const handleEdit = useCallback((item: Pelanggaran) => {
    setFormData({
      siswa_id: item.siswa_id,
      jenis_pelanggaran: item.jenis_pelanggaran,
      poin: item.poin,
      keterangan: item.keterangan || '',
      tanggal: new Date(item.tanggal).toISOString().split('T')[0],
      status: item.status
    });
    setSelectedSiswa(item.Siswa ? { ...item.Siswa, id: item.siswa_id } : null);
    setSelectedId(item.id);
    setModalOpen(true);
  }, []);

  const statusConfig: Record<string, StatusConfig> = useMemo(() => ({
    'BARU': {
      variant: 'error',
      label: 'Menunggu Pembinaan',
      icon: <AlertCircle className="w-3 h-3 mr-1" />,
      colorClass: 'text-rose-600 bg-rose-50 border-rose-100'
    },
    'PERLU_PEMBINAAN': {
      variant: 'error',
      label: 'Menunggu Pembinaan',
      icon: <AlertCircle className="w-3 h-3 mr-1" />,
      colorClass: 'text-rose-600 bg-rose-50 border-rose-100'
    },
    'PROSES': {
      variant: 'warning',
      label: 'Pendampingan',
      icon: <Clock className="w-3 h-3 mr-1" />,
      colorClass: 'text-amber-600 bg-amber-50 border-amber-100'
    },
    'SELESAI': {
      variant: 'success',
      label: 'Selesai Pembinaan',
      icon: <CheckCircle2 className="w-3 h-3 mr-1" />,
      colorClass: 'text-emerald-600 bg-emerald-50 border-emerald-100'
    },
    'SELESAI_PEMBINAAN': {
      variant: 'success',
      label: 'Selesai Pembinaan',
      icon: <CheckCircle2 className="w-3 h-3 mr-1" />,
      colorClass: 'text-emerald-600 bg-emerald-50 border-emerald-100'
    }
  }), []);

  const getStatusDisplay = useCallback((status: string) => {
    const defaultConfig: StatusConfig = { variant: 'outline', label: status, icon: null, colorClass: '' };
    const config: StatusConfig = statusConfig[status] || defaultConfig;
    return (
      <Badge variant={config.variant} className="flex items-center w-fit px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
        {config.icon}
        {config.label}
      </Badge>
    );
  }, [statusConfig]);

  const columns: Column[] = useMemo(() => [
    {
      key: 'tanggal',
      label: 'Tanggal',
      sortable: true,
      render: (value: string) => (
        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
           {new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      )
    },
    {
      key: 'siswa',
      label: 'Profil Siswa',
      render: (_: unknown, item: Pelanggaran) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center font-black text-xs text-gray-400 border border-gray-100">
             {item.Siswa?.nama_siswa?.charAt(0)}
          </div>
          <div>
            <div className="font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">{item.Siswa?.nama_siswa}</div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.Siswa?.Kelas?.nama_kelas}</div>
          </div>
        </div>
      )
    },
    {
      key: 'jenis_pelanggaran',
      label: 'Kategori Perilaku',
      sortable: true,
      render: (value: string) => (
        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{value}</span>
      )
    },
    {
      key: 'poin',
      label: 'Bobot',
      sortable: true,
      render: (value: number) => (
        <span className={cn(
          "font-black text-sm",
          value >= 50 ? "text-rose-600" : "text-amber-600"
        )}>+{value}</span>
      )
    },
    {
      key: 'status',
      label: 'Tahapan',
      render: (value: string) => getStatusDisplay(value)
    },
    {
      key: 'actions',
      label: 'Tindakan',
      render: (_: unknown, item: Pelanggaran) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEdit(item)}
            className="w-8 h-8 rounded-lg text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
            aria-label="Edit catatan"
          >
            <Edit2 size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={async () => {
              const ok = await confirm({
                title: 'Hapus Catatan',
                description: 'Apakah Anda yakin ingin menghapus catatan perkembangan ini? Tindakan ini tidak dapat dibatalkan.',
                confirmText: 'Ya, Hapus',
                cancelText: 'Batal',
                style: 'danger'
              });
              if (ok) {
                kesiswaanApi.deletePelanggaran(item.id).then(() => {
                  toast.success('Catatan perkembangan berhasil dihapus');
                  queryClient.invalidateQueries({ queryKey: ['kesiswaan-monitoring-violations'] });
                  fetchData();
                }).catch(() => toast.error('Gagal menghapus catatan perkembangan'));
              }
            }}
            className="w-8 h-8 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            aria-label="Hapus catatan"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      )
    }
  ], [getStatusDisplay, handleEdit, fetchData, queryClient]);

  const pageStats = useMemo(() => {
    const total = data?.length || 0;
    const today = data?.filter(d => {
      const dDate = new Date(d.tanggal).toDateString();
      return dDate === new Date().toDateString();
    }).length || 0;
    const totalPoints = data?.reduce((acc, curr) => acc + (Number(curr.poin) || 0), 0) || 0;
    const pending = data?.filter(d => d.status !== 'SELESAI').length || 0;

    return [
      {
        title: 'Total Jejak',
        value: total,
        icon: <BookOpen size={14} />,
        gradient: 'from-indigo-500 to-violet-600',
        subtitle: 'Seluruh catatan perilaku'
      },
      {
        title: 'Catatan Hari Ini',
        value: today,
        icon: <Calendar size={14} />,
        gradient: 'from-amber-500 to-orange-600',
        subtitle: 'Dibuat pada hari ini'
      },
      {
        title: 'Poin Akumulasi',
        value: totalPoints,
        icon: <TrendingDown size={14} />,
        gradient: 'from-rose-500 to-pink-600',
        subtitle: 'Total bobot poin tercatat'
      },
      {
        title: 'Menunggu Solusi',
        value: pending,
        icon: <Clock size={14} />,
        gradient: 'from-blue-500 to-cyan-600',
        subtitle: 'Belum selesai ditangani'
      },
    ];
  }, [data]);

  const toolbar = useMemo(() => (
    <div className="flex items-center gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
        <Input
          placeholder="Cari Siswa / Kategori..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Cari Siswa atau Kategori"
          className="w-56 h-9 pl-9 text-[11px] font-medium rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm"
        />
      </div>
      <Button
        variant="toolbarPrimary"
        size="toolbar"
        onClick={() => { resetForm(); setModalOpen(true); }}
      >
        <Plus className="w-3.5 h-3.5 mr-1.5" />
        Tambah Catatan
      </Button>
    </div>
  ), [searchTerm, resetForm]);

  return (
    <AcademicPageLayout
      title={isWaliKelas ? `Kasus Pelanggaran Siswa ${waliKelasNama ? `(${waliKelasNama})` : ''}` : "Manajemen Kasus Pelanggaran Siswa"}
      description={isWaliKelas 
        ? `Pantauan khusus catatan kedisiplinan dan pembinaan karakter siswa kelas ${waliKelasNama || 'bimbingan Anda'}.`
        : "Pusat pemantauan & penanganan kedisiplinan siswa seluruh sekolah."}
      breadcrumbs={[
        { label: 'Dashboard', path: '/dashboard' },
        { label: isWaliKelas ? 'Wali Kelas' : 'Kesiswaan', path: isWaliKelas ? '/academic/siswa' : '/kesiswaan' },
        { label: 'Kasus Pelanggaran', path: '/kesiswaan/pelanggaran' }
      ]}
      stats={pageStats}
      hardeningModuleKey="kesiswaan_pelanggaran"
      instruction={{
        title: "Panduan Catatan",
        description: "Kelola riwayat perkembangan dan kedisiplinan siswa.",
        items: [
          { text: "Gunakan 'Tambah Catatan' untuk merekam kejadian baru." },
          { text: "Pilih siswa menggunakan scanner RFID atau pencarian nama." },
          { text: "Update tahapan penyelesaian melalui tombol Edit." }
        ]
      }}
    >
      <Card className="rounded-2xl border-none shadow-sm overflow-hidden mb-6">
        <Table
          columns={columns}
          data={data}
          loading={loading}
          emptyMessage="Belum ada data perkembangan tercatat"
          toolbarLeft={toolbar}
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
        />
      </Card>

      <Suspense fallback={<div className="flex justify-center p-8"><Loader /></div>}>
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedId ? "Edit Catatan" : "Catatan Perkembangan Baru"} size="md">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Identitas Siswa</Label>
              {!selectedSiswa ? (
                <Suspense fallback={<div className="h-10 animate-pulse bg-slate-100 rounded-xl" />}>
                  <SmartStudentPicker
                    scope="piket"
                    onSelect={(s) => {
                      setSelectedSiswa(s);
                      setFormData(prev => ({ ...prev, siswa_id: s.id }));
                    }}
                    placeholder="Scan kartu atau ketik nama siswa..."
                    className="w-full"
                    autoFocus
                    aria-label="Pilih siswa"
                  />
                </Suspense>
              ) : (
                <div className="flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-xl animate-in zoom-in-95 duration-300">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center border-2 border-indigo-200 dark:border-indigo-700 overflow-hidden">
                      {selectedSiswa.foto_profile_url ? (
                        <img src={selectedSiswa.foto_profile_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-6 w-6 text-indigo-500" />
                      )}
                    </div>
                    <div>
                      <div className="font-black text-indigo-900 dark:text-indigo-100 uppercase tracking-tight leading-none">
                        {selectedSiswa.nama_siswa}
                      </div>
                      <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-1">
                        {selectedSiswa.Kelas?.nama_kelas || 'Tanpa Kelas'} • {selectedSiswa.nis || selectedSiswa.no_rfid || 'ID Aktif'}
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedSiswa(null);
                      setFormData(prev => ({ ...prev, siswa_id: '' }));
                    }}
                    className="h-8 w-8 p-0 rounded-full hover:bg-rose-50 text-rose-500"
                    aria-label="Batalkan pilihan siswa"
                  >
                    <X size={16} />
                  </Button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="jenis-pelanggaran-select" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Kategori Perilaku</Label>
              <SearchableSelect
                id="jenis-pelanggaran-select"
                value={formData.jenis_pelanggaran}
                onValueChange={(val) => {
                  const selectedItem = jenisPelanggaranList.find(i => i.id === val || i.nama_pelanggaran === val);
                  setFormData(prev => ({
                    ...prev,
                    jenis_pelanggaran: selectedItem ? selectedItem.nama_pelanggaran : val,
                    poin: selectedItem ? selectedItem.poin : prev.poin
                  }));
                }}
                options={jenisPelanggaranSelectOptions}
                placeholder="Pilih kategori perilaku..."
                searchPlaceholder="Cari kategori..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="poin-input" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Bobot Poin</Label>
                <Input
                  id="poin-input"
                  type="number"
                  min="0"
                  value={formData.poin}
                  onChange={(e) => setFormData(prev => ({...prev, poin: Number(e.target.value)}))}
                  required
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tanggal-input" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Waktu Kejadian</Label>
                <Input
                  id="tanggal-input"
                  type="date"
                  value={formData.tanggal}
                  onChange={(e) => setFormData(prev => ({...prev, tanggal: e.target.value}))}
                  required
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="keterangan-input" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Catatan/Keterangan</Label>
              <Input
                id="keterangan-input"
                value={formData.keterangan}
                onChange={(e) => setFormData(prev => ({...prev, keterangan: e.target.value}))}
                placeholder="Tambahkan konteks kejadian..."
                className="h-11 rounded-xl"
              />
            </div>
            {selectedId && (
              <div className="space-y-2">
                <Label htmlFor="status-select" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Tahapan Pendampingan</Label>
                <SearchableSelect
                  id="status-select"
                  value={formData.status}
                  onValueChange={(val) => setFormData(prev => ({...prev, status: val}))}
                  options={[
                    { label: 'MENUNGGU PEMBINAAN', value: 'BARU' },
                    { label: 'PENDAMPINGAN / PROSES', value: 'PROSES' },
                    { label: 'SELESAI PEMBINAAN', value: 'SELESAI' }
                  ]}
                  placeholder="Pilih tahapan..."
                />
              </div>
            )}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-50">
              <Button type="button" variant="outline" className="rounded-xl h-12 px-6 font-bold" onClick={() => setModalOpen(false)}>Batal</Button>
              <Button type="submit" className="rounded-xl h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white hover:text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-600/20 border-none">Simpan Catatan</Button>
            </div>
          </form>
        </Modal>
      </Suspense>
    </AcademicPageLayout>
  );
}
