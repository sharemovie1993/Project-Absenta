import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Trophy, 
  Award, 
  Medal, 
  Star, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  Sparkles,
  Users,
  Download,
  Printer,
  Eye,
  Building2,
  GraduationCap,
  SlidersHorizontal
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Table, type Column } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Loader } from '@/components/ui/Loader';
import { Label } from '@/components/ui/Label';
import toast from 'react-hot-toast';
import useConfirm from '@/hooks/useConfirm';
import { useDebounce } from '@/hooks/useDebounce';
import { useIsMobile } from '@/hooks/useIsMobile';
import { MobileAcademicList } from '@/components/academic/shared/MobileAcademicList';
import { SiswaIdentityCell } from '@/components/common/SiswaIdentityCell';
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';
import { HubStatusStrip, type HubStatusItem } from '@/components/ui/hub';
import { kesiswaanApi, type PrestasiSiswa, kesiswaanQueryKeys } from '@/api/kesiswaan.api';
import { exportDataToExcel } from '@/utils/export.utils';
import { cn } from '@/lib/utils';

const Modal = lazy(() => import('@/components/ui/Modal').then(m => ({ default: m.Modal })));
const SmartStudentPicker = lazy(() => import('@/components/common/SmartStudentPicker').then(m => ({ default: m.SmartStudentPicker })));

export interface UniversalPrestasiViewProps {
  // 1. Context & Scope Injections
  jurusanId?: string;
  jurusanNama?: string;
  kelasId?: string;
  kelasNama?: string;
  guruId?: string;
  tahunPelajaranId?: string;
  tahunAjaran?: string;
  semesterId?: string;

  // 2. Display Modifiers
  isModal?: boolean;
  hideLayout?: boolean;
  hideScopeBanner?: boolean;
  readOnly?: boolean;

  // 3. Event Callbacks
  onClose?: () => void;
}

interface StudentRef {
  id: string;
  nama_siswa?: string;
  nis?: string;
  foto?: string | null;
  Kelas?: {
    nama_kelas: string;
  };
}

const TINGKAT_OPTIONS = [
  { id: 'ALL', label: 'Semua Tingkat' },
  { id: 'SEKOLAH', label: 'Sekolah / Internal' },
  { id: 'KECAMATAN', label: 'Kecamatan' },
  { id: 'KOTA', label: 'Kota / Kab' },
  { id: 'PROVINSI', label: 'Provinsi' },
  { id: 'NASIONAL', label: 'Nasional' },
  { id: 'INTERNASIONAL', label: 'Internasional' }
];

const BIDANG_OPTIONS = [
  { id: 'ALL', label: 'Semua Bidang' },
  { id: 'AKADEMIK', label: 'Akademik' },
  { id: 'NON-AKADEMIK', label: 'Non-Akademik' },
  { id: 'KEJURUAN', label: 'Kejuruan / Vokasi' },
  { id: 'ORGANISASI', label: 'Keorganisasian' },
];

export const PrestasiView: React.FC<UniversalPrestasiViewProps> = React.memo(({
  jurusanId,
  jurusanNama,
  kelasId,
  kelasNama,
  tahunPelajaranId,
  semesterId,
  isModal = false,
  hideLayout = false,
  hideScopeBanner = false,
  readOnly = false,
  onClose,
}) => {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  // Internal Academic Filter fallback jika prop tidak dikunci dari parent
  const safeJurusanId = jurusanId && jurusanId !== 'jurusan-default' ? jurusanId : undefined;

  const internalAcademic = useAcademicFilter({
    enableTp: true,
    enableSemester: true,
    enableTingkat: !kelasId,
    enableKelas: !kelasId,
    allowAllKelas: true,
    jurusanId: safeJurusanId,
  });

  const effectiveTpId = tahunPelajaranId || internalAcademic.values.tahunPelajaranId;
  const effectiveSemesterId = semesterId || internalAcademic.values.semesterId;
  const effectiveKelasId = kelasId || (internalAcademic.values.kelasId || undefined);
  const effectiveJurusanId = safeJurusanId;

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);

  const [selectedBidang, setSelectedBidang] = useState<string>('ALL');
  const [selectedTingkat, setSelectedTingkat] = useState<string>('ALL');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Form states
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalItem, setDetailModalItem] = useState<PrestasiSiswa | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSiswa, setSelectedSiswa] = useState<StudentRef | null>(null);
  const [formData, setFormData] = useState({
    siswa_id: '',
    tanggal: new Date().toISOString().split('T')[0],
    jenis_prestasi_id: '',
    nama_prestasi: '',
    tingkat: 'KOTA',
    peringkat: 'Juara 1',
    poin: 15,
    keterangan: ''
  });

  // Query Categories Master
  const { data: catRes } = useQuery({
    queryKey: kesiswaanQueryKeys.jenisPrestasi(),
    queryFn: async () => {
      let res = await kesiswaanApi.getJenisPrestasi();
      if (!res.data || res.data.length === 0) {
        try {
          await kesiswaanApi.seedJenisPrestasi();
          res = await kesiswaanApi.getJenisPrestasi();
        } catch {
          // Ignore seed error
        }
      }
      return res.data || [];
    },
    staleTime: 10 * 60 * 1000,
  });
  const categories = catRes || [];

  // Query Prestasi List Scoped
  const { 
    data: listRes, 
    isLoading: loading, 
    refetch 
  } = useQuery({
    queryKey: [
      'kesiswaan-prestasi-scoped', 
      page, 
      limit, 
      debouncedSearch, 
      effectiveKelasId, 
      effectiveJurusanId,
      effectiveTpId,
      effectiveSemesterId
    ],
    queryFn: () => kesiswaanApi.getPrestasiSiswa({ 
      page, 
      limit, 
      search: debouncedSearch,
      kelas_id: effectiveKelasId || undefined,
      jurusan_id: effectiveJurusanId || undefined,
      tahun_pelajaran_id: effectiveTpId || undefined,
      semester_id: effectiveSemesterId || undefined,
    }),
    staleTime: 60 * 1000,
  });

  const rawList = useMemo(() => listRes?.data?.list || [], [listRes]);
  const totalPages = listRes?.data?.pagination?.totalPages || 1;
  const totalItems = listRes?.data?.pagination?.totalItems || listRes?.data?.pagination?.total || 0;

  // Filter Data Multi-Dimensi (Bidang & Tingkat)
  const filteredData = useMemo(() => {
    return rawList.filter(item => {
      // 1. Filter Bidang / Kategori
      if (selectedBidang !== 'ALL') {
        const itemCat = (item.Jenis?.kategori || '').toUpperCase();
        const itemNama = (item.nama_prestasi || '').toUpperCase();
        if (selectedBidang === 'AKADEMIK' && !itemCat.includes('AKADEMIK') && !itemNama.includes('AKADEMIK')) return false;
        if (selectedBidang === 'NON-AKADEMIK' && !itemCat.includes('NON') && !itemNama.includes('OLAHRAGA') && !itemNama.includes('SENI')) return false;
        if (selectedBidang === 'KEJURUAN' && !itemCat.includes('KEJURUAN') && !itemNama.includes('LKS') && !itemNama.includes('VOKASI')) return false;
        if (selectedBidang === 'ORGANISASI' && !itemCat.includes('ORGANISASI') && !itemNama.includes('OSIS') && !itemNama.includes('PASKIBRA')) return false;
      }

      // 2. Filter Tingkat
      if (selectedTingkat !== 'ALL') {
        const text = `${item.nama_prestasi} ${item.keterangan || ''} ${item.Jenis?.nama_prestasi || ''}`.toUpperCase();
        if (selectedTingkat === 'SEKOLAH' && !(text.includes('SEKOLAH') || text.includes('INTERNAL') || text.includes('KELAS'))) return false;
        if (selectedTingkat === 'KECAMATAN' && !text.includes('KECAMATAN')) return false;
        if (selectedTingkat === 'KOTA' && !(text.includes('KOTA') || text.includes('KABUPATEN') || text.includes('KAB.'))) return false;
        if (selectedTingkat === 'PROVINSI' && !text.includes('PROVINSI')) return false;
        if (selectedTingkat === 'NASIONAL' && !text.includes('NASIONAL')) return false;
        if (selectedTingkat === 'INTERNASIONAL' && !text.includes('INTERNASIONAL')) return false;
      }

      return true;
    });
  }, [rawList, selectedBidang, selectedTingkat]);

  // Statistik Ringkas (4 KPI Cards)
  const stats = useMemo(() => {
    const totalCount = rawList.length;
    const totalPoin = rawList.reduce((acc, curr) => acc + (curr.poin || 0), 0);
    const uniqueStudents = new Set(rawList.map(item => item.siswa_id)).size;
    const topPrestasi = rawList.filter(item => {
      const text = `${item.nama_prestasi} ${item.keterangan || ''}`.toUpperCase();
      return (item.poin || 0) >= 40 || text.includes('NASIONAL') || text.includes('PROVINSI') || text.includes('INTERNASIONAL');
    }).length;
    return { totalCount, totalPoin, uniqueStudents, topPrestasi };
  }, [rawList]);

  // Mini Status Items untuk Mobile 1-Baris Hairline Strip (< lg)
  const miniStatusItems: HubStatusItem[] = useMemo(() => [
    {
      id: 'total',
      title: `${stats.totalCount} Prestasi`,
      subtitle: 'Total Catatan',
    },
    {
      id: 'poin',
      title: `+${stats.totalPoin} Poin`,
      subtitle: 'Apresiasi',
      className: stats.totalPoin > 0 ? 'text-amber-600 dark:text-amber-400 font-bold' : undefined,
    },
    {
      id: 'siswa',
      title: `${stats.uniqueStudents} Siswa`,
      subtitle: 'Peraih',
      className: stats.uniqueStudents > 0 ? 'text-blue-600 dark:text-blue-400 font-bold' : undefined,
    },
    {
      id: 'top',
      title: `${stats.topPrestasi} Unggulan`,
      subtitle: 'Skala Tinggi',
      className: stats.topPrestasi > 0 ? 'text-purple-600 dark:text-purple-400 font-bold' : undefined,
    },
  ], [stats]);

  // Leaderboard Bintang Prestasi Siswa (Top 3)
  const leaderboard = useMemo(() => {
    const studentMap = new Map<string, {
      siswa_id: string;
      nama_siswa: string;
      nis: string;
      foto?: string | null;
      nama_kelas: string;
      totalPrestasi: number;
      totalPoin: number;
      prestasiTertinggi: string;
    }>();

    rawList.forEach((item) => {
      if (!item.siswa_id) return;
      const existing = studentMap.get(item.siswa_id) || {
        siswa_id: item.siswa_id,
        nama_siswa: item.Siswa?.nama_siswa || 'Siswa',
        nis: item.Siswa?.nis || '-',
        foto: item.Siswa?.foto,
        nama_kelas: item.Siswa?.Kelas?.nama_kelas || kelasNama || '-',
        totalPrestasi: 0,
        totalPoin: 0,
        prestasiTertinggi: item.nama_prestasi,
      };

      existing.totalPrestasi += 1;
      existing.totalPoin += (item.poin || 0);
      if (item.poin > 25) {
        existing.prestasiTertinggi = item.nama_prestasi;
      }
      studentMap.set(item.siswa_id, existing);
    });

    return Array.from(studentMap.values())
      .sort((a, b) => b.totalPoin - a.totalPoin || b.totalPrestasi - a.totalPrestasi)
      .slice(0, 3);
  }, [rawList, kelasNama]);

  const resetForm = useCallback(() => {
    setFormData({
      siswa_id: '',
      tanggal: new Date().toISOString().split('T')[0],
      jenis_prestasi_id: '',
      nama_prestasi: '',
      tingkat: 'KOTA',
      peringkat: 'Juara 1',
      poin: 15,
      keterangan: ''
    });
    setSelectedSiswa(null);
    setSelectedId(null);
  }, []);

  const handleEdit = useCallback((item: PrestasiSiswa) => {
    setSelectedId(item.id);
    setSelectedSiswa(item.Siswa ? {
      id: item.siswa_id,
      nama_siswa: item.Siswa.nama_siswa,
      nis: item.Siswa.nis,
      foto: item.Siswa.foto,
      Kelas: item.Siswa.Kelas,
    } : null);
    
    // Parse tingkat & peringkat if stored in keterangan
    setFormData({
      siswa_id: item.siswa_id,
      tanggal: new Date(item.tanggal).toISOString().split('T')[0],
      jenis_prestasi_id: item.jenis_prestasi_id || '',
      nama_prestasi: item.nama_prestasi,
      tingkat: 'KOTA',
      peringkat: 'Juara 1',
      poin: item.poin,
      keterangan: item.keterangan || ''
    });
    setModalOpen(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const ok = await confirm({
      title: 'Hapus Catatan Prestasi',
      description: 'Apakah Anda yakin ingin menghapus catatan prestasi ini? Poin penghargaan siswa akan disesuaikan.',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });
    if (!ok) return;

    try {
      const res = await kesiswaanApi.deletePrestasiSiswa(id);
      if (res.success) {
        toast.success('Catatan prestasi berhasil dihapus');
        queryClient.invalidateQueries({ queryKey: ['kesiswaan-prestasi-scoped'] });
        queryClient.invalidateQueries({ queryKey: kesiswaanQueryKeys.all });
        refetch();
      } else {
        toast.error(res.message || 'Gagal menghapus catatan');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Koneksi bermasalah');
    }
  }, [confirm, queryClient, refetch]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.siswa_id) {
      toast.error('Harap pilih siswa terlebih dahulu');
      return;
    }
    if (!formData.nama_prestasi.trim()) {
      toast.error('Harap isi nama prestasi atau kejuaraan');
      return;
    }
    if (formData.poin <= 0) {
      toast.error('Poin penghargaan harus lebih besar dari 0');
      return;
    }

    try {
      const payload = {
        siswa_id: formData.siswa_id,
        tanggal: formData.tanggal,
        jenis_prestasi_id: formData.jenis_prestasi_id || undefined,
        nama_prestasi: formData.nama_prestasi,
        poin: formData.poin,
        keterangan: `[Tingkat: ${formData.tingkat}] [${formData.peringkat}] ${formData.keterangan}`.trim()
      };

      if (selectedId) {
        await kesiswaanApi.updatePrestasiSiswa(selectedId, payload);
        toast.success('Catatan prestasi berhasil diperbarui');
      } else {
        await kesiswaanApi.createPrestasiSiswa(payload);
        toast.success('Catatan prestasi baru berhasil disimpan');
      }
      queryClient.invalidateQueries({ queryKey: ['kesiswaan-prestasi-scoped'] });
      queryClient.invalidateQueries({ queryKey: kesiswaanQueryKeys.all });
      setModalOpen(false);
      resetForm();
      refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menyimpan catatan prestasi');
    }
  }, [selectedId, formData, queryClient, refetch, resetForm]);

  const handleCategoryChange = useCallback((catId: string) => {
    const matched = categories.find(c => c.id === catId);
    setFormData(prev => ({
      ...prev,
      jenis_prestasi_id: catId,
      nama_prestasi: matched ? matched.nama_prestasi : prev.nama_prestasi,
      poin: matched ? matched.poin : prev.poin
    }));
  }, [categories]);

  const handleSort = useCallback((key: string, order: 'asc' | 'desc') => {
    setSortBy(key);
    setSortOrder(order);
  }, []);

  const handleCloseModal = useCallback(() => {
    resetForm();
    setModalOpen(false);
  }, [resetForm]);

  // Export Excel Handler
  const handleExportExcel = useCallback(() => {
    if (filteredData.length === 0) {
      toast.error('Tidak ada data prestasi untuk diekspor');
      return;
    }

    const titlePrefix = kelasNama ? `Kelas_${kelasNama}` : jurusanNama ? `Jurusan_${jurusanNama}` : 'Sekolah';
    const filename = `Laporan_Prestasi_Siswa_${titlePrefix}_${new Date().toISOString().split('T')[0]}`;
    const reportTitle = `REKAPITULASI PRESTASI & PENGHARGAAN SISWA ${kelasNama ? `KELAS ${kelasNama}` : jurusanNama ? `PROGRAM KEAHLIAN ${jurusanNama}` : 'TINGKAT SEKOLAH'}`;

    exportDataToExcel(
      filteredData,
      [
        { header: 'No', accessor: (_, idx) => (idx ?? 0) + 1, width: 6 },
        { header: 'Tanggal', accessor: (row) => row.tanggal ? new Date(row.tanggal).toLocaleDateString('id-ID') : '-', width: 14 },
        { header: 'NIS', accessor: (row) => row.Siswa?.nis || '-', width: 14 },
        { header: 'Nama Siswa', accessor: (row) => row.Siswa?.nama_siswa || '-', width: 28 },
        { header: 'Kelas', accessor: (row) => row.Siswa?.Kelas?.nama_kelas || kelasNama || '-', width: 14 },
        { header: 'Nama Prestasi / Kejuaraan', accessor: (row) => row.nama_prestasi, width: 35 },
        { header: 'Kategori / Bidang', accessor: (row) => row.Jenis?.kategori || 'Prestasi', width: 20 },
        { header: 'Poin Reward', accessor: (row) => row.poin, width: 12 },
        { header: 'Keterangan & Penyelenggara', accessor: (row) => row.keterangan || '-', width: 32 },
      ],
      filename,
      reportTitle
    );
    toast.success('Laporan Excel berhasil diunduh');
  }, [filteredData, kelasNama, jurusanNama]);

  // Print Handler
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Helper badge warna tingkat kejuaraan
  const getTingkatBadge = (nama: string, ket?: string) => {
    const text = `${nama} ${ket || ''}`.toUpperCase();
    if (text.includes('INTERNASIONAL')) {
      return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">INTERNASIONAL</span>;
    }
    if (text.includes('NASIONAL')) {
      return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">NASIONAL</span>;
    }
    if (text.includes('PROVINSI')) {
      return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">PROVINSI</span>;
    }
    if (text.includes('KOTA') || text.includes('KABUPATEN') || text.includes('KAB.')) {
      return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">KOTA / KAB</span>;
    }
    if (text.includes('KECAMATAN')) {
      return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">KECAMATAN</span>;
    }
    return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">SEKOLAH</span>;
  };

  const renderMobileCard = useCallback((item: PrestasiSiswa) => (
    <div
      key={item.id}
      className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <SiswaIdentityCell
            foto={item.Siswa?.foto}
            nama={item.Siswa?.nama_siswa}
            nis={item.Siswa?.nis}
            kelas={item.Siswa?.Kelas?.nama_kelas || kelasNama}
            size="md"
            nameClassName="font-extrabold text-xs uppercase tracking-tight line-clamp-1"
            showMeta={true}
          />
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-xs font-black rounded-xl border border-amber-500/20">
            +{item.poin} Poin
          </span>
          {getTingkatBadge(item.nama_prestasi, item.keterangan)}
        </div>
      </div>

      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1 text-xs">
        <span className="text-[10px] font-bold text-slate-400 uppercase">Nama Prestasi &amp; Penghargaan</span>
        <p className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">
          {item.nama_prestasi}
        </p>
        {item.Jenis?.kategori && (
          <span className="inline-block text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            Bidang: {item.Jenis.kategori}
          </span>
        )}
        {item.keterangan && (
          <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-200/40 dark:border-slate-700/40">
            "{item.keterangan}"
          </p>
        )}
      </div>

      <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
        <span className="font-bold">
          {item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDetailModalItem(item)}
            className="h-8 px-2 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Eye size={13} className="mr-1" />
            Detail
          </Button>
          {!readOnly && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(item)}
                className="h-8 px-2 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
              >
                <Edit2 size={13} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(item.id)}
                className="h-8 px-2 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                <Trash2 size={13} />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  ), [handleEdit, handleDelete, kelasNama, readOnly]);

  const columns: Column[] = useMemo(() => [
    {
      key: 'tanggal',
      label: 'Tanggal',
      sortable: true,
      render: (value: string) => (
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
          {new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      )
    },
    {
      key: 'siswa',
      label: 'Profil Siswa',
      render: (_, item: PrestasiSiswa) => (
        <SiswaIdentityCell
          foto={item.Siswa?.foto}
          nama={item.Siswa?.nama_siswa}
          nis={item.Siswa?.nis}
          kelas={item.Siswa?.Kelas?.nama_kelas || kelasNama}
          size="xs"
          nameClassName="font-bold text-xs"
          showMeta={!kelasId}
        />
      )
    },
    {
      key: 'nama_prestasi',
      label: 'Kategori / Kejuaraan',
      render: (_, item: PrestasiSiswa) => (
        <div className="max-w-[280px] space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {getTingkatBadge(item.nama_prestasi, item.keterangan)}
            {item.Jenis && (
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">
                {item.Jenis.kategori}
              </span>
            )}
          </div>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1 block">
            {item.nama_prestasi}
          </span>
        </div>
      )
    },
    {
      key: 'poin',
      label: 'Reward',
      sortable: true,
      render: (value: number) => (
        <span className="text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 px-2.5 py-1 rounded-lg inline-block whitespace-nowrap">
          +{value} Poin
        </span>
      )
    },
    {
      key: 'keterangan',
      label: 'Keterangan & Penyelenggara',
      render: (value: string) => (
        <p className="text-xs text-slate-500 line-clamp-2 max-w-xs">{value || '-'}</p>
      )
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_: unknown, item: PrestasiSiswa) => (
        <div className="flex gap-1 justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDetailModalItem(item)}
            className="w-7 h-7 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200"
            title="Lihat Detail Prestasi"
          >
            <Eye size={13} />
          </Button>
          {!readOnly && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEdit(item)}
                className="w-7 h-7 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400"
                title="Edit Prestasi"
              >
                <Edit2 size={13} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(item.id)}
                className="w-7 h-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400"
                title="Hapus Prestasi"
              >
                <Trash2 size={13} />
              </Button>
            </>
          )}
        </div>
      )
    }
  ], [handleEdit, handleDelete, kelasId, kelasNama, readOnly]);

  return (
    <div className={cn("space-y-3 sm:space-y-4 w-full max-w-full min-w-0", isModal && "p-2 sm:p-4")}>
      {/* 1. Header hanya ditampilkan jika BUKAN tab dashboard */}
      {!hideLayout && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-500" />
              <span>Prestasi &amp; Penghargaan Siswa</span>
              {(kelasNama || jurusanNama) && (
                <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  {kelasNama ? `Kelas ${kelasNama}` : `Jurusan ${jurusanNama}`}
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pusat pencatatan portofolio prestasi akademik, kompetensi kejuruan, olahraga, dan seni peserta didik berstandar multi-role.
            </p>
          </div>
          {isModal && onClose && (
            <Button variant="ghost" onClick={onClose} className="self-end sm:self-auto cursor-pointer">
              <X className="w-4 h-4 mr-1" />
              Tutup
            </Button>
          )}
        </div>
      )}

      {/* 2. Scope Indicator Banner (Desktop/Tablet Only & Hide when in Walas Tab) */}
      {!hideScopeBanner && (kelasNama || jurusanNama) && (
        <div className="hidden sm:flex p-3.5 bg-linear-to-r from-indigo-500/10 via-sky-500/5 to-transparent border border-indigo-200/80 dark:border-indigo-900/50 rounded-2xl flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              {kelasNama ? <GraduationCap className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">
                  {kelasNama ? 'Konteks Wali Kelas' : 'Konteks Ketua Program Keahlian (Kaprog)'}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  Terkunci
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                Menampilkan portofolio penghargaan khusus untuk: <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{kelasNama || jurusanNama}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Akumulasi:</span>
            <span className="font-extrabold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-800/40">
              +{stats.totalPoin} Poin
            </span>
            <span className="font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-800/40">
              {stats.uniqueStudents} Siswa
            </span>
          </div>
        </div>
      )}

      {/* 3. Academic Filter Toolbar (hanya aktif jika tidak dikunci oleh kelasId) */}
      {!kelasId && (
        <AcademicFilterToolbar
          {...internalAcademic.toolbarProps}
          hideKelas={Boolean(kelasId)}
          readOnly={readOnly}
        />
      )}

      {/* 4a. MINI ANALYTIC CARD (Mobile < lg: Shopee-Grade Hairline 1-Baris) */}
      <div className="lg:hidden">
        <HubStatusStrip items={miniStatusItems} />
      </div>

      {/* 4b. KPI Stat Cards (Desktop >= lg: 4 Kolom Penuh) */}
      <div className="hidden lg:grid grid-cols-4 gap-3.5">
        <Card noPadding className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Prestasi</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{stats.totalCount}</span>
            <span className="text-[11px] text-slate-400">penghargaan</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {kelasNama ? `Rombel ${kelasNama}` : jurusanNama ? `Jurusan ${jurusanNama}` : 'Tercatat di sistem'}
          </p>
        </Card>

        <Card noPadding className="p-4 rounded-2xl border border-amber-200/70 dark:border-amber-900/40 shadow-xs bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Total Poin Apresiasi</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-700 dark:text-amber-300">+{stats.totalPoin}</span>
            <span className="text-[11px] text-amber-500/80 font-medium">poin reward</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Akumulasi apresiasi siswa</p>
        </Card>

        <Card noPadding className="p-4 rounded-2xl border border-blue-200/70 dark:border-blue-900/40 shadow-xs bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Siswa Berprestasi</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-700 dark:text-blue-300">{stats.uniqueStudents}</span>
            <span className="text-[11px] text-blue-500/80 font-medium">siswa peraih</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Kontributor penghargaan</p>
        </Card>

        <Card noPadding className="p-4 rounded-2xl border border-purple-200/70 dark:border-purple-900/40 shadow-xs bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-purple-600 dark:text-purple-400">Prestasi Unggulan</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Star className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-700 dark:text-purple-300">{stats.topPrestasi}</span>
            <span className="text-[11px] text-purple-500/80 font-medium">skala tinggi</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Provinsi / Nasional / Poin ≥40</p>
        </Card>
      </div>

      {/* 5. Leaderboard Bintang Prestasi (Desktop >= lg Only) */}
      {leaderboard.length > 0 && (
        <Card noPadding className="hidden lg:block p-4 sm:p-5 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-linear-to-r from-amber-500/5 via-orange-500/5 to-transparent">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Bintang Prestasi {kelasNama ? `Rombel ${kelasNama}` : jurusanNama ? `Jurusan ${jurusanNama}` : 'Sekolah'}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Peringkat teratas siswa dengan kontribusi poin penghargaan tertinggi.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
              Top 3 Siswa
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {leaderboard.map((student, idx) => (
              <div 
                key={student.siswa_id}
                className={cn(
                  "p-3.5 rounded-xl border flex items-center gap-3 transition-all",
                  idx === 0 
                    ? "bg-amber-50/80 dark:bg-amber-950/30 border-amber-300/80 dark:border-amber-800/80 shadow-xs" 
                    : idx === 1 
                    ? "bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700" 
                    : "bg-orange-50/40 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/40"
                )}
              >
                <div className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs",
                  idx === 0 ? "bg-amber-500 text-white" :
                  idx === 1 ? "bg-slate-300 text-slate-800 dark:bg-slate-700 dark:text-slate-100" :
                  "bg-amber-700 text-white"
                )}>
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                    {student.nama_siswa}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {student.nama_kelas} • NIS: {student.nis}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[11px] font-black text-amber-600 dark:text-amber-400">
                      +{student.totalPoin} Poin
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ({student.totalPrestasi} kejuaraan)
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 6. Mobile vs Desktop Data Section */}
      {isMobile ? (
        <div className="space-y-3 w-full max-w-full min-w-0">
          {/* Mini Search & Filter Toolbar (Shopee-Grade: Sederhana seperti Sub Tab Data Siswa) */}
          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari prestasi, siswa..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Tombol Filter Mini dengan Badge Counter */}
              <button
                type="button"
                onClick={() => setShowMobileFilters((prev) => !prev)}
                className={cn(
                  'h-9 px-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer',
                  showMobileFilters || selectedBidang !== 'ALL' || selectedTingkat !== 'ALL'
                    ? 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950/50 dark:border-indigo-800 dark:text-indigo-400'
                    : 'bg-slate-50 text-slate-600 border-slate-200/80 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300'
                )}
                aria-label="Toggle Filter"
              >
                <SlidersHorizontal size={13} />
                <span className="text-[11px]">Filter</span>
                {(selectedBidang !== 'ALL' || selectedTingkat !== 'ALL') && (
                  <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[9.5px] font-bold flex items-center justify-center">
                    {(selectedBidang !== 'ALL' ? 1 : 0) + (selectedTingkat !== 'ALL' ? 1 : 0)}
                  </span>
                )}
              </button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="h-9 w-9 p-0 rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
                title="Unduh format spreadsheet Excel"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
              </Button>

              {!readOnly && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => { resetForm(); setModalOpen(true); }}
                  className="h-9 px-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Catat
                </Button>
              )}
            </div>

            {/* Collapsible Advanced Filters Drawer */}
            {showMobileFilters && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2 animate-in fade-in duration-150">
                {(selectedBidang !== 'ALL' || selectedTingkat !== 'ALL') && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => { setSelectedBidang('ALL'); setSelectedTingkat('ALL'); }}
                      className="text-[11px] font-medium text-rose-500 hover:text-rose-600 transition-colors"
                    >
                      Reset Filter
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
                  {BIDANG_OPTIONS.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedBidang(cat.id)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer',
                        selectedBidang === cat.id
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 text-xs">
                  {TINGKAT_OPTIONS.map((tingkat) => (
                    <button
                      key={tingkat.id}
                      type="button"
                      onClick={() => setSelectedTingkat(tingkat.id)}
                      className={cn(
                        'px-2 py-0.5 rounded-lg text-[10.5px] font-bold whitespace-nowrap transition-all cursor-pointer border',
                        selectedTingkat === tingkat.id
                          ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      )}
                    >
                      {tingkat.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* List Data Prestasi Langsung */}
          {loading && filteredData.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <Loader size="md" className="mb-4" />
              <p className="text-xs text-slate-400 font-medium">Memuat data portofolio prestasi...</p>
            </div>
          ) : (
            <MobileAcademicList
              title="Prestasi Siswa"
              data={filteredData}
              loading={loading}
              totalItems={totalItems}
              emptyMessage="Belum ada catatan prestasi pada kriteria yang dipilih"
              pagination={{
                currentPage: page,
                itemsPerPage: limit,
                totalItems: totalItems,
                totalPages,
                onPageChange: setPage,
                onLimitChange: (val) => { setLimit(val); setPage(1); }
              }}
              renderCard={renderMobileCard}
            />
          )}
        </div>
      ) : (
        <Card noPadding className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 truncate">
                <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Daftar Portofolio Prestasi Siswa</span>
                {(kelasNama || jurusanNama) && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40">
                    {kelasNama || jurusanNama}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Riwayat kejuaraan lomba, kompetisi kejuruan, olimpiade sains, dan apresiasi bakat minat.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                title="Unduh format spreadsheet Excel"
              >
                <Download className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                Ekspor Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer hidden sm:inline-flex"
                title="Cetak dokumen rekap"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5 text-slate-600 dark:text-slate-300" />
                Cetak
              </Button>
              {!readOnly && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => { resetForm(); setModalOpen(true); }}
                  className="text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Catat Prestasi
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="relative sm:col-span-12 lg:col-span-6">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari siswa, NIS, kejuaraan, atau penyelenggara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar sm:col-span-12 lg:col-span-6 justify-start lg:justify-end">
                {BIDANG_OPTIONS.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedBidang(cat.id)}
                    className={cn(
                      'px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer',
                      selectedBidang === cat.id
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                Tingkat:
              </span>
              {TINGKAT_OPTIONS.map((tingkat) => (
                <button
                  key={tingkat.id}
                  type="button"
                  onClick={() => setSelectedTingkat(tingkat.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer border',
                    selectedTingkat === tingkat.id
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                      : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                  )}
                >
                  {tingkat.label}
                </button>
              ))}
            </div>
          </div>

          <Table
            columns={columns}
            data={filteredData}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            loading={loading}
            pagination={{
              currentPage: page,
              itemsPerPage: limit,
              totalItems: totalItems,
              totalPages,
              onPageChange: setPage,
              onLimitChange: (val) => { setLimit(val); setPage(1); }
            }}
          />
        </Card>
      )}

      {/* Form Modal Catat / Edit Prestasi */}
      <Suspense fallback={null}>
        {modalOpen && (
          <Modal 
            isOpen={modalOpen} 
            onClose={handleCloseModal} 
            title={selectedId ? 'Edit Catatan Prestasi Siswa' : 'Catat Prestasi & Penghargaan Baru'} 
            size="lg"
          >
            <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Pilih Siswa</Label>
                {selectedSiswa ? (
                  <div className="flex items-center justify-between p-3.5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shrink-0 text-xs">
                        {selectedSiswa.nama_siswa?.substring(0, 2).toUpperCase() || 'SW'}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 dark:text-white text-xs">{selectedSiswa.nama_siswa}</div>
                        <div className="text-[10px] font-medium text-slate-500 mt-0.5">
                          {selectedSiswa.Kelas?.nama_kelas || kelasNama || 'Rombel'} • NIS: {selectedSiswa.nis || '-'}
                        </div>
                      </div>
                    </div>
                    {!selectedId && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setSelectedSiswa(null);
                          setFormData(prev => ({ ...prev, siswa_id: '' }));
                        }}
                        className="h-7 w-7 rounded-full p-0 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X size={14} />
                      </Button>
                    )}
                  </div>
                ) : (
                  <Suspense fallback={<div className="h-10 bg-slate-100 animate-pulse rounded-xl" />}>
                    <SmartStudentPicker
                      scope={kelasId ? "walas" : "piket"}
                      initialKelasId={kelasId}
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

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Kategori Penghargaan (Master)</Label>
                <SearchableSelect
                  options={[
                    { value: '', label: '-- Pilih Kategori Master Penghargaan --' },
                    ...categories.map(c => ({ value: c.id, label: `[+${c.poin} Poin] ${c.nama_prestasi} (${c.kategori})` }))
                  ]}
                  value={formData.jenis_prestasi_id}
                  onValueChange={handleCategoryChange}
                  className="w-full text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Tingkat Kejuaraan</Label>
                  <select
                    value={formData.tingkat}
                    onChange={(e) => setFormData(prev => ({ ...prev, tingkat: e.target.value }))}
                    className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="SEKOLAH">Sekolah / Internal</option>
                    <option value="KECAMATAN">Kecamatan</option>
                    <option value="KOTA">Kota / Kabupaten</option>
                    <option value="PROVINSI">Provinsi</option>
                    <option value="NASIONAL">Nasional</option>
                    <option value="INTERNASIONAL">Internasional</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Peringkat / Capaian</Label>
                  <select
                    value={formData.peringkat}
                    onChange={(e) => setFormData(prev => ({ ...prev, peringkat: e.target.value }))}
                    className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Juara 1">Juara 1 / Emas / Medali Utama</option>
                    <option value="Juara 2">Juara 2 / Perak</option>
                    <option value="Juara 3">Juara 3 / Perunggu</option>
                    <option value="Harapan 1">Juara Harapan 1</option>
                    <option value="Harapan 2">Juara Harapan 2</option>
                    <option value="Finalis">Finalis / Peserta Terbaik</option>
                    <option value="Partisipan">Partisipan / Kontingen</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Tanggal Perolehan</Label>
                  <Input
                    type="date"
                    value={formData.tanggal}
                    onChange={(e) => setFormData(prev => ({ ...prev, tanggal: e.target.value }))}
                    className="w-full text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Poin Apresiasi (Reward)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.poin || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, poin: parseInt(e.target.value) || 0 }))}
                    className="w-full text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Nama Prestasi / Kejuaraan</Label>
                <Input
                  placeholder="Contoh: Juara 1 Lomba LKS Cyber Security / KSN Informatika"
                  value={formData.nama_prestasi}
                  onChange={(e) => setFormData(prev => ({ ...prev, nama_prestasi: e.target.value }))}
                  className="w-full text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="keterangan-prestasi" className="text-xs font-bold uppercase tracking-wider text-slate-500">Keterangan / Penyelenggara</Label>
                <textarea
                  id="keterangan-prestasi"
                  aria-label="Keterangan / Penyelenggara"
                  value={formData.keterangan}
                  onChange={(e) => setFormData(prev => ({ ...prev, keterangan: e.target.value }))}
                  placeholder="Penyelenggara lomba, pembimbing, nomor piagam, link sertifikat..."
                  className="w-full min-h-[70px] p-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={handleCloseModal} className="cursor-pointer">
                  Batal
                </Button>
                <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 cursor-pointer">
                  Simpan Prestasi
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </Suspense>

      {/* Modal Detail Prestasi */}
      <Suspense fallback={null}>
        {detailModalItem && (
          <Modal
            isOpen={Boolean(detailModalItem)}
            onClose={() => setDetailModalItem(null)}
            title="Detail Informasi Prestasi & Portofolio Siswa"
            size="md"
          >
            <div className="p-4 sm:p-5 space-y-4 text-xs">
              {/* Profil Siswa */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <SiswaIdentityCell
                  foto={detailModalItem.Siswa?.foto}
                  nama={detailModalItem.Siswa?.nama_siswa}
                  nis={detailModalItem.Siswa?.nis}
                  kelas={detailModalItem.Siswa?.Kelas?.nama_kelas || kelasNama}
                  size="md"
                  nameClassName="font-extrabold text-xs uppercase"
                  showMeta={true}
                />
              </div>

              {/* Data Prestasi */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200/60 dark:border-amber-900/40">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">Poin Penghargaan</span>
                  <p className="text-xl font-black text-amber-700 dark:text-amber-300 mt-0.5">
                    +{detailModalItem.poin} Poin
                  </p>
                </div>
                <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-xl border border-indigo-200/60 dark:border-indigo-900/40">
                  <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase">Tanggal Diraih</span>
                  <p className="text-sm font-bold text-indigo-900 dark:text-indigo-200 mt-1">
                    {detailModalItem.tanggal ? new Date(detailModalItem.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                  </p>
                </div>
              </div>

              <div className="space-y-1 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-1">
                  {getTingkatBadge(detailModalItem.nama_prestasi, detailModalItem.keterangan)}
                  {detailModalItem.Jenis?.kategori && (
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                      Bidang: {detailModalItem.Jenis.kategori}
                    </span>
                  )}
                </div>
                <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                  {detailModalItem.nama_prestasi}
                </h4>
                {detailModalItem.keterangan && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    {detailModalItem.keterangan}
                  </p>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="outline" size="sm" onClick={() => setDetailModalItem(null)} className="cursor-pointer">
                  Tutup
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </Suspense>
    </div>
  );
});

PrestasiView.displayName = 'PrestasiView';
