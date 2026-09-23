import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hubinApi } from '../../api/hubin.api';
import type { MitraIndustri } from '../../api/hubin.api';
import { guruApi, jurusanApi } from '../../api/academic.api';
import { formatDate } from '../../utils/layoutUtils';
import { 
  Plus, 
  Search, 
  Building2, 
  RefreshCw, 
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Navigation
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useCapabilities } from '../../hooks/useCapabilities';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { SectionCard, Table, Button, Input } from '../../components/ui';
import useConfirm from '../../hooks/useConfirm';
import { useIsMobile } from '../../hooks/useIsMobile';
import { MobileAcademicList } from '../../components/academic/shared/MobileAcademicList';
import { generateImportTemplate } from '../../utils/export.utils';
import { 
  SubscriptionWithFeatures, 
  GuruItem, 
  PenempatanItem, 
  JurusanItem, 
  MitraListResponse, 
  MitraStats 
} from '../../components/hubin/mitra/types';
import { createMitraColumns } from '../../components/hubin/mitra/MitraIndustriTableColumns';
import { MitraIndustriCard } from '../../components/hubin/mitra/MitraIndustriCard';
import { MitraMouFilterBar } from '../../components/hubin/mitra/MitraMouFilterBar';

// Lazy load heavy modal components
const MitraFormModal = lazy(() => import('../../components/hubin/MitraFormModal').then(module => ({ default: module.MitraFormModal })));
const HubinMoUHistoryModal = lazy(() => import('../../components/hubin/HubinMoUHistoryModal').then(module => ({ default: module.HubinMoUHistoryModal })));
const MitraDetailModal = lazy(() => import('../../components/hubin/MitraDetailModal').then(module => ({ default: module.MitraDetailModal })));
const ExcelImportModal = lazy(() => import('../../components/academic/shared/ExcelImportModal').then(module => ({ default: module.ExcelImportModal })));

const mitraSearchSchema = z.object({
  searchTerm: z.string().max(100).optional(),
});

export const MitraIndustriSection: React.FC<{ hideLayout?: boolean }> = React.memo(({ hideLayout = false }) => {
  const { subscription, user } = useAuthStore();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const isMobile = useIsMobile();

  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMitra, setEditingMitra] = useState<MitraIndustri | null>(null);
  const [selectedMoUMitra, setSelectedMoUMitra] = useState<MitraIndustri | null>(null);
  const [selectedDetailMitra, setSelectedDetailMitra] = useState<MitraIndustri | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedMouFilter, setSelectedMouFilter] = useState<'ALL' | 'AKTIF' | 'EXPIRING_SOON' | 'EXPIRED'>('ALL');
  const [editingQuotaId, setEditingQuotaId] = useState<string | null>(null);
  const [tempQuotaValue, setTempQuotaValue] = useState<number>(0);
  const [isExporting, setIsExporting] = useState(false);

  // Gating Logic
  const sub = subscription as unknown as SubscriptionWithFeatures | null;
  const features = sub?.features || sub?.Plan?.features_json || sub?.plan?.features_json || [];
  const isLocked = !Array.isArray(features) || !features.includes('HUBIN');

  // Role & Capability Checks
  const { isHubin: isHubinRole, isAdmin, can } = useCapabilities();
  const isHubin = useMemo(() => {
    return isAdmin || isHubinRole || can('hubin.partners.manage') || can('hubin.mou.manage');
  }, [isAdmin, isHubinRole, can]);

  // Queries
  const { data: penempatanData } = useQuery({
    queryKey: ['penempatan-pkl', { limit: 100 }],
    queryFn: () => hubinApi.getPenempatan({ limit: 100 }),
    enabled: !!user?.isTeacher || isHubin
  });

  const { data: guruList } = useQuery({
    queryKey: ['guru', { limit: 100 }],
    queryFn: () => guruApi.getAll({ limit: 100 }),
    enabled: !!user?.isTeacher
  });

  const rawGuru = useMemo(() => {
    if (Array.isArray(guruList)) return guruList;
    if (guruList && typeof guruList === 'object' && 'data' in guruList) {
      return (guruList as { data: unknown[] }).data || [];
    }
    return [];
  }, [guruList]);

  const { data: jurusanListQuery } = useQuery({
    queryKey: ['jurusan', { limit: 100 }],
    queryFn: () => jurusanApi.getAll({ limit: 100 }),
  });

  const jurusanList = useMemo((): JurusanItem[] => {
    if (Array.isArray(jurusanListQuery)) return (jurusanListQuery as unknown as JurusanItem[]);
    if (jurusanListQuery && typeof jurusanListQuery === 'object' && 'data' in jurusanListQuery) {
      return ((jurusanListQuery as unknown as { data: JurusanItem[] }).data) || [];
    }
    return [];
  }, [jurusanListQuery]);

  const activeGuruId = useMemo(() => {
    if (user?.guru_profile?.id) return user.guru_profile.id;
    const matchedGuru = rawGuru.find((g: GuruItem) => g.user_id === user?.id);
    return matchedGuru?.id || null;
  }, [rawGuru, user]);

  const isPembimbing = useMemo(() => {
    if (!user || !user.isTeacher) return false;
    const guruId = activeGuruId;
    const dataObj = penempatanData as { data?: unknown[] } | undefined;
    const penempatanList = Array.isArray(penempatanData?.data) ? penempatanData.data : dataObj?.data || [];
    if (!guruId || !Array.isArray(penempatanList)) return false;
    return penempatanList.some((p: PenempatanItem) => p.pembimbing_id === guruId);
  }, [user, activeGuruId, penempatanData]);

  const { data: mitraData, isLoading, refetch } = useQuery({
    queryKey: ['mitra-industri', { search: searchTerm, page, limit, mou_status: selectedMouFilter }],
    queryFn: () => hubinApi.getMitra({ 
      search: searchTerm, 
      page, 
      limit, 
      mou_status: selectedMouFilter !== 'ALL' ? selectedMouFilter : undefined 
    }),
    enabled: subscription !== undefined
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: Partial<MitraIndustri>) => hubinApi.createMitra(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mitra-industri'] });
      toast.success('Mitra industri berhasil ditambahkan');
      setIsModalOpen(false);
    },
    onError: (error: Error) => toast.error(error.message || 'Gagal menambahkan mitra'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MitraIndustri> }) => hubinApi.updateMitra(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mitra-industri'] });
      toast.success('Perubahan berhasil disimpan');
      setIsModalOpen(false);
      setEditingMitra(null);
    },
    onError: (error: Error) => toast.error(error.message || 'Gagal mengedit mitra'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => hubinApi.deleteMitra(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mitra-industri'] });
      toast.success('Mitra berhasil dihapus');
    },
    onError: (error: Error) => toast.error(error.message || 'Gagal menghapus mitra'),
  });

  const quickQuotaMutation = useMutation({
    mutationFn: ({ id, kuota }: { id: string; kuota: number }) => hubinApi.updateMitra(id, { kuota_pkl: kuota }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mitra-industri'] });
      toast.success('Kuota PKL berhasil diperbarui');
      setEditingQuotaId(null);
    },
    onError: (error: Error) => toast.error(error.message || 'Gagal memperbarui kuota PKL'),
  });

  const handleSaveQuickQuota = useCallback((id: string) => {
    quickQuotaMutation.mutate({ id, kuota: Math.max(0, tempQuotaValue) });
  }, [quickQuotaMutation, tempQuotaValue]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const tMulai = formData.get('mou_tanggal_mulai') as string;
    const tSelesai = formData.get('mou_tanggal_berakhir') as string;

    const data = {
      nama: formData.get('nama') as string,
      logo_url: formData.get('logo_url') as string || null,
      bidang: formData.get('bidang') as string || null,
      alamat: formData.get('alamat') as string || null,
      kontak: formData.get('kontak') as string || null,
      mou_url: formData.get('mou_url') as string || null,
      latitude: parseFloat(formData.get('latitude') as string) || null,
      longitude: parseFloat(formData.get('longitude') as string) || null,
      radius: parseInt(formData.get('radius') as string) || 100,

      // PIC Details
      pic_nama: formData.get('pic_nama') as string || null,
      pic_jabatan: formData.get('pic_jabatan') as string || null,
      pic_telepon: formData.get('pic_telepon') as string || null,
      pic_email: formData.get('pic_email') as string || null,

      // MoU Details
      mou_nomor: formData.get('mou_nomor') as string || null,
      mou_status: formData.get('mou_status') as string || 'AKTIF',
      mou_tanggal_mulai: tMulai ? new Date(tMulai).toISOString() : null,
      mou_tanggal_berakhir: tSelesai ? new Date(tSelesai).toISOString() : null,

      // PKL Capacity
      kuota_pkl: parseInt(formData.get('kuota_pkl') as string) || 0,
      kompetensi_keahlian: (() => {
        const checkedKeahlian = (formData.getAll('kompetensi_keahlian') ?? [])
          ?.map(val => (val as string).split(','))
          .flat()
          ?.map(s => s.trim())
          .filter(Boolean);
        return checkedKeahlian && checkedKeahlian.length > 0 ? checkedKeahlian.join(', ') : null;
      })(),
    };

    if (editingMitra) {
      updateMutation.mutate({ id: editingMitra.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = useCallback(async (mitra: MitraIndustri) => {
    const ok = await confirm({
      title: 'Hapus Mitra Industri',
      description: `Apakah Anda yakin ingin menghapus mitra industri "${mitra.nama}"? Tindakan ini akan menghapus semua riwayat penempatan PKL terkait perusahaan ini.`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });

    if (ok) {
      deleteMutation.mutate(mitra.id);
    }
  }, [confirm, deleteMutation]);

  const handleDownloadTemplate = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      toast('Menyiapkan template...');
      const jurusanNames = jurusanList?.map(j => j.nama_jurusan)?.filter(Boolean) || [];

      await generateImportTemplate(
        [
          { header: 'Nama Mitra', accessor: (row) => row.nama, width: 30, required: true },
          { header: 'URL Logo Perusahaan', accessor: (row) => row.logo_url, width: 35 },
          { header: 'Bidang Industri', accessor: (row) => row.bidang, width: 25 },
          { header: 'Alamat Perusahaan', accessor: (row) => row.alamat, width: 40 },
          { header: 'Kontak Perusahaan', accessor: (row) => row.kontak, width: 20 },
          { header: 'Nama PIC', accessor: (row) => row.pic_nama, width: 25 },
          { header: 'Jabatan PIC', accessor: (row) => row.pic_jabatan, width: 20 },
          { header: 'No. HP PIC', accessor: (row) => row.pic_telepon, width: 20 },
          { header: 'Email PIC', accessor: (row) => row.pic_email, width: 25 },
          { header: 'Nomor MoU', accessor: (row) => row.mou_nomor, width: 25 },
          { header: 'Tanggal Mulai MoU', accessor: (row) => row.mou_tanggal_mulai, width: 22 },
          { header: 'Tanggal Berakhir MoU', accessor: (row) => row.mou_tanggal_berakhir, width: 22 },
          { header: 'Status MoU', accessor: (row) => row.mou_status, width: 16 },
          { header: 'Kuota PKL', accessor: (row) => row.kuota_pkl, width: 15 },
          { header: 'Kompetensi Keahlian', accessor: (row) => row.kompetensi_keahlian, width: 30 },
          { header: 'Latitude', accessor: (row) => row.latitude, width: 18 },
          { header: 'Longitude', accessor: (row) => row.longitude, width: 18 },
          { header: 'Radius Presensi (Meter)', accessor: (row) => row.radius, width: 22 }
        ],
        [
          {
            nama: 'PT Solusi Teknologi Nusantara',
            logo_url: '',
            bidang: 'Teknologi Informasi & Rekayasa Perangkat Lunak',
            alamat: 'Jl. Industri Kreatif No. 10, Jakarta Pusat',
            kontak: '0215551234',
            pic_nama: 'Budi Santoso',
            pic_jabatan: 'HR Manager',
            pic_telepon: '081234567890',
            pic_email: 'budi@solusitek.co.id',
            mou_nomor: 'MOU/2026/001',
            mou_tanggal_mulai: '2026-07-01',
            mou_tanggal_berakhir: '2027-06-30',
            mou_status: 'AKTIF',
            kuota_pkl: 10,
            kompetensi_keahlian: jurusanNames[0] || 'Rekayasa Perangkat Lunak',
            latitude: -6.175392,
            longitude: 106.827153,
            radius: 100
          }
        ],
        'template_impor_mitra_industri',
        'TEMPLATE IMPOR MITRA INDUSTRI (DU/DI) & TEMPAT PKL. Kolom Nama Mitra WAJIB diisi.'
      );
      toast.success('Template berhasil diunduh.');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal mengunduh template.';
      toast.error(msg);
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, jurusanList]);

  const handleImportMitra = useCallback(async (data: Record<string, unknown>[]) => {
    try {
      const formattedData = data?.map(item => ({
        nama: String(item['Nama Mitra'] || item['nama'] || ''),
        logo_url: item['URL Logo Perusahaan'] || item['logo_url'] ? String(item['URL Logo Perusahaan'] || item['logo_url']) : undefined,
        bidang: item['Bidang Industri'] || item['bidang'] ? String(item['Bidang Industri'] || item['bidang']) : undefined,
        alamat: item['Alamat Perusahaan'] || item['alamat'] ? String(item['Alamat Perusahaan'] || item['alamat']) : undefined,
        kontak: item['Kontak Perusahaan'] || item['kontak'] ? String(item['Kontak Perusahaan'] || item['kontak']) : undefined,
        pic_nama: item['Nama PIC'] || item['pic_nama'] ? String(item['Nama PIC'] || item['pic_nama']) : undefined,
        pic_jabatan: item['Jabatan PIC'] || item['pic_jabatan'] ? String(item['Jabatan PIC'] || item['pic_jabatan']) : undefined,
        pic_telepon: item['No. HP PIC'] || item['pic_telepon'] ? String(item['No. HP PIC'] || item['pic_telepon']) : undefined,
        pic_email: item['Email PIC'] || item['pic_email'] ? String(item['Email PIC'] || item['pic_email']) : undefined,
        mou_nomor: item['Nomor MoU'] || item['mou_nomor'] ? String(item['Nomor MoU'] || item['mou_nomor']) : undefined,
        mou_status: String(item['Status MoU'] || item['mou_status'] || 'AKTIF'),
        mou_tanggal_mulai: item['Tanggal Mulai MoU'] || item['mou_tanggal_mulai'] ? new Date(String(item['Tanggal Mulai MoU'] || item['mou_tanggal_mulai'])).toISOString() : undefined,
        mou_tanggal_berakhir: item['Tanggal Berakhir MoU'] || item['mou_tanggal_berakhir'] ? new Date(String(item['Tanggal Berakhir MoU'] || item['mou_tanggal_berakhir'])).toISOString() : undefined,
        kuota_pkl: Number(item['Kuota PKL'] || item['kuota_pkl'] || 0),
        kompetensi_keahlian: item['Kompetensi Keahlian'] || item['kompetensi_keahlian'] ? String(item['Kompetensi Keahlian'] || item['kompetensi_keahlian']) : undefined,
        latitude: item['Latitude'] || item['latitude'] ? Number(item['Latitude'] || item['latitude']) : undefined,
        longitude: item['Longitude'] || item['longitude'] ? Number(item['Longitude'] || item['longitude']) : undefined,
        radius: item['Radius Presensi (Meter)'] || item['radius'] ? Number(item['Radius Presensi (Meter)'] || item['radius']) : 100,
      }))?.filter(item => Boolean(item.nama)) || [];

      if (formattedData.length === 0) {
        throw new Error('Tidak ada data mitra yang valid untuk diimpor. Kolom Nama Mitra wajib diisi.');
      }

      const res = await hubinApi.importMitraBatch(formattedData);
      toast.success(res?.message || `Berhasil mengimpor ${formattedData.length} mitra industri.`);
      setIsImportModalOpen(false);
      refetch();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal mengimpor data mitra.';
      toast.error(msg);
      throw e;
    }
  }, [refetch]);

  const typedMitraResponse = mitraData as MitraListResponse | undefined;
  const rawList: MitraIndustri[] = useMemo(() => {
    if (Array.isArray(mitraData)) return mitraData;
    if (typedMitraResponse && Array.isArray(typedMitraResponse.data)) {
      return typedMitraResponse.data;
    }
    return [];
  }, [mitraData, typedMitraResponse]);

  const pagination = typedMitraResponse?.pagination;

  const mouStats: MitraStats = useMemo(() => {
    const s = typedMitraResponse?.stats;
    if (s) {
      return {
        total: s.total || 0,
        aktif: s.aktif || 0,
        expiringSoon: s.expiringSoon || 0,
        expired: s.expired || 0
      };
    }

    const total = pagination?.total ?? rawList.length;
    let aktif = 0;
    let expiringSoon = 0;
    let expired = 0;

    const now = new Date();
    rawList?.forEach((m: MitraIndustri) => {
      const endDate = m.mou_tanggal_berakhir ? new Date(m.mou_tanggal_berakhir) : null;
      const diffDays = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

      if (!m.mou_nomor || m.mou_status === 'EXPIRED' || (diffDays !== null && diffDays <= 0)) {
        expired++;
      } else if (diffDays !== null && diffDays > 0 && diffDays <= 30) {
        expiringSoon++;
      } else {
        aktif++;
      }
    });

    return { total, aktif, expiringSoon, expired };
  }, [typedMitraResponse, pagination?.total, rawList]);

  const stats = useMemo(() => [
    {
      title: 'Total Mitra',
      value: mouStats.total,
      icon: <Building2 size={24} />,
      gradient: 'from-blue-500 to-indigo-600'
    },
    {
      title: 'MoU Aktif',
      value: mouStats.aktif,
      icon: <CheckCircle2 size={24} />,
      gradient: 'from-emerald-400 to-teal-600'
    },
    {
      title: 'Mendekati Berakhir',
      value: mouStats.expiringSoon,
      icon: <Clock size={24} />,
      gradient: 'from-amber-400 to-orange-600'
    },
    {
      title: 'Ter-Geofence',
      value: rawList?.filter((m: MitraIndustri) => m.latitude && m.longitude).length || 0,
      icon: <Navigation size={24} />,
      gradient: 'from-purple-500 to-indigo-600'
    }
  ], [mouStats, rawList]);

  const breadcrumbs = useMemo(() => [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Mitra Industri', path: '/hubin/mitra' }
  ], []);

  // Table Columns generated from modular column factory
  const columns = useMemo(() => {
    return createMitraColumns({
      isHubin,
      isPembimbing,
      jurusanList,
      editingQuotaId,
      tempQuotaValue,
      setEditingQuotaId,
      setTempQuotaValue,
      onSaveQuickQuota: handleSaveQuickQuota,
      isPendingQuota: quickQuotaMutation.isPending,
      onSelectDetail: (m) => setSelectedDetailMitra(m),
      onEdit: (m) => {
        setEditingMitra(m);
        setIsModalOpen(true);
      },
      onSelectMoU: (m) => setSelectedMoUMitra(m),
      onDelete: handleDelete,
    });
  }, [
    isHubin,
    isPembimbing,
    jurusanList,
    editingQuotaId,
    tempQuotaValue,
    handleSaveQuickQuota,
    quickQuotaMutation.isPending,
    handleDelete,
  ]);

  const paginationProps = useMemo(() => ({
    page,
    totalPages: pagination?.totalPages || 1,
    limit,
    onPageChange: (p: number) => setPage(p),
    onLimitChange: (l: number) => {
      setLimit(l);
      setPage(1);
    }
  }), [page, pagination?.totalPages, limit]);

  const SectionCardTitle = (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between w-full pr-4">
      <div className="flex items-center gap-2">
        <Building2 className="text-indigo-600 dark:text-indigo-400" size={20} />
        <span>Daftar Mitra Industri</span>
      </div>
      <div className="flex items-center">
        {isHubin ? (
          <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-900/40 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Manajemen Penuh (Hubin)
          </span>
        ) : isPembimbing ? (
          <span className="text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Peninjau (Pembimbing Aktif)
          </span>
        ) : (
          <span className="text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400 border border-slate-200/50 dark:border-slate-800/40 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Peninjau (Guru Akademik)
          </span>
        )}
      </div>
    </div>
  );

  const tableToolbarLeft = useMemo(() => (
    <div className="relative w-72 sm:w-80 md:w-96">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
      <Input
        aria-label="Cari nama mitra atau bidang industri"
        placeholder="Cari nama mitra atau bidang..."
        value={searchTerm}
        onChange={(e) => {
          const parsed = mitraSearchSchema.safeParse({ searchTerm: e.target.value });
          if (parsed.success) {
            setSearchTerm(e.target.value);
          }
        }}
        className="w-full h-9 text-[13px] rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm pl-9"
      />
    </div>
  ), [searchTerm]);

  const tableToolbarRight = useMemo(() => (
    <div className="flex items-center gap-2">
      <Button
        variant="toolbarOutline"
        size="toolbarIcon"
        onClick={() => refetch()}
        disabled={isLoading}
        className="rounded-xl h-9 w-9"
      >
        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
      </Button>
      {isHubin && (
        <>
          <Button
            onClick={() => setIsImportModalOpen(true)}
            variant="toolbarOutline"
            size="toolbar"
            disabled={isExporting}
            className="h-9 px-3 rounded-xl flex items-center gap-1.5 font-bold text-xs text-emerald-700 bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-900/40 hover:bg-emerald-100/80"
            title="Import Mitra Industri dari Excel"
          >
            <FileSpreadsheet size={15} className="text-emerald-600 dark:text-emerald-400" />
            <span>Import Excel</span>
          </Button>
          <Button
            onClick={() => {
              setEditingMitra(null);
              setIsModalOpen(true);
            }}
            variant="toolbarPrimary"
            size="toolbar"
            className="h-9 px-4 rounded-xl flex items-center gap-1.5"
          >
            <Plus size={16} />
            Tambah Mitra
          </Button>
        </>
      )}
    </div>
  ), [isLoading, isHubin, isExporting, refetch]);

  const renderMobileCardItem = useCallback((row: MitraIndustri) => (
    <MitraIndustriCard
      key={row.id}
      row={row}
      isHubin={isHubin}
      isPembimbing={isPembimbing}
      jurusanList={jurusanList}
      editingQuotaId={editingQuotaId}
      tempQuotaValue={tempQuotaValue}
      setEditingQuotaId={setEditingQuotaId}
      setTempQuotaValue={setTempQuotaValue}
      onSaveQuickQuota={handleSaveQuickQuota}
      isPendingQuota={quickQuotaMutation.isPending}
      onSelectDetail={(m) => setSelectedDetailMitra(m)}
      onEdit={(m) => {
        setEditingMitra(m);
        setIsModalOpen(true);
      }}
      onSelectMoU={(m) => setSelectedMoUMitra(m)}
      onDelete={handleDelete}
    />
  ), [
    isHubin,
    isPembimbing,
    jurusanList,
    editingQuotaId,
    tempQuotaValue,
    handleSaveQuickQuota,
    quickQuotaMutation.isPending,
    handleDelete
  ]);

  const mainContent = (
    <div className="space-y-6">
      <SectionCard title={SectionCardTitle} icon={Building2} fullWidth noPadding>
        <div className="bg-transparent overflow-hidden">
          <MitraMouFilterBar
            selectedMouFilter={selectedMouFilter}
            setSelectedMouFilter={setSelectedMouFilter}
            setPage={setPage}
            mouStats={mouStats}
          />
          {isMobile ? (
            <div className="p-4 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch justify-between mb-4">
                {tableToolbarLeft}
                {tableToolbarRight}
              </div>
              <MobileAcademicList
                title="Daftar Mitra Industri"
                data={rawList}
                loading={isLoading}
                totalItems={pagination?.total || 0}
                emptyMessage="Tidak ada data mitra industri ditemukan"
                pagination={paginationProps}
                renderCard={renderMobileCardItem}
              />
            </div>
          ) : (
            <Table
              columns={columns}
              data={rawList}
              loading={isLoading}
              emptyMessage="Tidak ada data mitra industri ditemukan"
              compact={true}
              pagination={paginationProps}
              toolbarLeft={tableToolbarLeft}
              toolbarRight={tableToolbarRight}
            />
          )}
        </div>
      </SectionCard>

      {/* Modals with Suspense fallback */}
      <Suspense fallback={null}>
        {isModalOpen && (
          <MitraFormModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSubmit={handleSubmit}
            editingMitra={editingMitra}
            isPending={createMutation.isPending || updateMutation.isPending}
            isEditKontakOnly={isPembimbing && !isHubin}
            jurusanList={jurusanList}
          />
        )}
        {selectedMoUMitra && (
          <HubinMoUHistoryModal
            isOpen={Boolean(selectedMoUMitra)}
            onClose={() => setSelectedMoUMitra(null)}
            mitraId={selectedMoUMitra?.id || null}
            mitraNama={selectedMoUMitra?.nama || null}
          />
        )}
        {selectedDetailMitra && (
          <MitraDetailModal
            isOpen={Boolean(selectedDetailMitra)}
            onClose={() => setSelectedDetailMitra(null)}
            mitra={selectedDetailMitra}
          />
        )}
        {isImportModalOpen && (
          <ExcelImportModal
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            title="Import Mitra Industri"
            description="Unggah data master rekanan DUDI dan tempat PKL dari file Excel (.xlsx)."
            sampleDataHint="Pastikan kolom Nama Mitra diisi. Untuk memperbarui data mitra eksisting, samakan nama perusahaannya."
            onImport={handleImportMitra}
            onDownloadTemplate={handleDownloadTemplate}
            onSuccess={() => {
              refetch();
              queryClient.invalidateQueries({ queryKey: ['mitra-industri'] });
            }}
          />
        )}
      </Suspense>
    </div>
  );

  if (hideLayout) {
    return mainContent;
  }

  return (
    <PremiumFeatureGate
      moduleName="HUBIN"
      featureName="Manajemen Mitra Industri"
      description="Bangun ekosistem kemitraan industri yang kuat. Kelola database perusahaan rekanan, pantau status MOU, hingga sinkronisasi lokasi industri untuk geofencing absensi PKL."
    >
      <AcademicPageLayout
        title="Mitra Industri"
        description="Kelola daftar rekanan industri untuk program PKL"
        breadcrumbs={breadcrumbs}
        stats={stats}
        isLoadingStats={isLoading}
        hardeningModuleKey="mitraindustripage"
        instruction={{
          title: "Panduan Manajemen Mitra Industri",
          description: "Kelola data mitra industri (DU/DI) untuk kelancaran program Praktik Kerja Lapangan (PKL).",
          items: [
            { text: "Daftarkan data nama perusahaan/instansi mitra industri baru." },
            { text: "Tambahkan dokumen kerjasama (MOU) dan tentukan koordinat geofencing untuk presensi PKL siswa." },
            { text: "Gunakan fitur Update Kontak untuk menyesuaikan nomor telepon operasional sewaktu-waktu." }
          ]
        }}
      >
        {mainContent}
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});

export const MitraIndustriPage = React.memo(() => <MitraIndustriSection />);
export default MitraIndustriPage;
