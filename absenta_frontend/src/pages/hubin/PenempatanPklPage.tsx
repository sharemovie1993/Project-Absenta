import React, { useMemo, useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hubinApi } from '../../api/hubin.api';
import { guruApi } from '../../api/academic.api';
import { HubinJurnalStatus, HubinPklStatus } from '../../constants/HubinConstants';
import { 
  Search, 
  UserPlus, 
  Calendar, 
  Building2, 
  User, 
  ClipboardList, 
  CheckCircle2, 
  Award,
  MapPin,
  Printer,
  FileText,
  MessageCircle,
  Trash2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';

import { useAuthStore } from '../../store/authStore';
import { getMyTenant } from '../../api/tenants.api';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { SectionCard, Table, Button, Input, Loader } from '../../components/ui';
import { PklStatusBadge } from '../../components/hubin/PklStatusBadge';
import useConfirm from '../../hooks/useConfirm';
import { getPenempatanColumns } from '../../components/hubin/HubinPklColumns';

export interface SiswaData {
  id: string;
  nama_siswa: string;
  nis: string;
  no_hp?: string;
  Kelas?: {
    id: string;
    nama_kelas: string;
  };
}

export interface MitraData {
  id: string;
  nama: string;
  alamat?: string;
  kontak?: string;
}

export interface PembimbingData {
  id: string;
  nama_guru: string;
  full_name?: string;
  user_id?: string;
}

export interface SiswaPkl {
  id: string;
  siswa_id: string;
  mitra_id: string;
  pembimbing_id: string;
  status: HubinPklStatus;
  tanggal_mulai: string;
  tanggal_selesai: string;
  Siswa?: SiswaData;
  Mitra?: MitraData;
  Pembimbing?: PembimbingData;
  kunjungan_json?: Array<{
    catatan: string;
    foto_url?: string;
    latitude?: number;
    longitude?: number;
    tanggal?: string;
  }>;
  nilai_json?: {
    soft_skills: number;
    technical_skills: number;
    discipline: number;
    catatan?: string;
    nilai_akhir: number;
  };
  jurnal_json?: {
    file_url?: string;
    status?: HubinJurnalStatus;
    catatan_revisi?: string;
  };
}

export interface CreatePenempatanPayload {
  siswa_id: string;
  mitra_id: string;
  pembimbing_id: string | null;
  tanggal_mulai: string;
  tanggal_selesai: string | null;
  status: string;
}

export interface PenilaianPayload {
  soft_skills: number;
  technical_skills: number;
  discipline: number;
  catatan: string;
  nilai_akhir: number;
}

export interface KunjunganPayload {
  catatan: string;
  foto_url?: string;
  latitude?: number;
  longitude?: number;
}

const HubinPklPlottingModal = lazy(() => import('../../components/hubin/HubinPklPlottingModal').then(m => ({ default: m.HubinPklPlottingModal })));
const HubinPklNilaiModal = lazy(() => import('../../components/hubin/HubinPklNilaiModal').then(m => ({ default: m.HubinPklNilaiModal })));
const HubinPklKunjunganModal = lazy(() => import('../../components/hubin/HubinPklKunjunganModal').then(m => ({ default: m.HubinPklKunjunganModal })));
const HubinPklReviewJurnalModal = lazy(() => import('../../components/hubin/HubinPklReviewJurnalModal').then(m => ({ default: m.HubinPklReviewJurnalModal })));
const HubinPklPrintSurat = lazy(() => import('../../components/hubin/HubinPklPrintSurat').then(m => ({ default: m.HubinPklPrintSurat })));

const PenempatanPklPage: React.FC = () => {
  const { subscription, user } = useAuthStore();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [guruSearch, setGuruSearch] = useState('');
  const [mitraSearch, setMitraSearch] = useState('');
  const printTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const isGuru = useMemo(() => user?.role?.name?.toUpperCase() === 'GURU', [user]);
  
  const canManage = useMemo(() => {
    return !!(user?.role?.name?.toUpperCase() === 'ADMIN' || 
           user?.role?.name?.toUpperCase() === 'SUPERADMIN' ||
           user?.position_codes?.includes('HUBIN') ||
           user?.capabilities?.includes('hubin.partners.manage'));
  }, [user]);

  const [activeTab, setActiveTab] = useState<'ALL' | 'MY_GUIDANCE'>(canManage ? 'ALL' : 'MY_GUIDANCE');
  
  // Selected Plotting IDs
  const [selectedSiswaId, setSelectedSiswaId] = useState('');
  const [selectedMitraId, setSelectedMitraId] = useState('');
  const [selectedPembimbingId, setSelectedPembimbingId] = useState('');
  
  // Modals Open State
  const [isPlottingOpen, setIsPlottingOpen] = useState(false);
  const [isNilaiOpen, setIsNilaiOpen] = useState(false);
  const [isKunjunganOpen, setIsKunjunganOpen] = useState(false);
  const [visitLat, setVisitLat] = useState('');
  const [visitLng, setVisitLng] = useState('');
  const [visitFotoUrl, setVisitFotoUrl] = useState('');
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  
  const [isReviewJurnalOpen, setIsReviewJurnalOpen] = useState(false);
  const [reviewJurnalStatus, setReviewJurnalStatus] = useState<'DISETUJUI' | 'REVISI'>('DISETUJUI');
  const [reviewJurnalCatatan, setReviewJurnalCatatan] = useState('');
  
  // Selected Data for Modals
  const [selectedPkl, setSelectedPkl] = useState<SiswaPkl | null>(null);
  const [printData, setPrintData] = useState<SiswaPkl | null>(null);
  const [printKolektifMitraId, setPrintKolektifMitraId] = useState<string | null>(null);

  // Timer Cleanup Effect
  useEffect(() => {
    return () => {
      if (printTimerRef.current) {
        clearTimeout(printTimerRef.current);
      }
    };
  }, []);

  // Gating Logic
  const features = (subscription as { features?: string[] })?.features || subscription?.Plan?.features_json || subscription?.plan?.features_json || [];
  const isLocked = !Array.isArray(features) || !features.includes('HUBIN');
  const isEnabled = subscription !== undefined && !isLocked;

  // Queries
  const { data: tenantData } = useQuery({
    queryKey: ['tenant-details', user?.tenant_id],
    queryFn: () => getMyTenant(),
    enabled: !!user?.tenant_id
  });

  const { data: penempatanData, isLoading } = useQuery({
    queryKey: ['penempatan-pkl', { search: searchTerm, page, limit }],
    queryFn: () => hubinApi.getPenempatan({ search: searchTerm, page, limit }),
    enabled: isEnabled
  });

  const rawPenempatan = useMemo(() => {
    return Array.isArray(penempatanData?.data) ? penempatanData.data : (penempatanData as { data?: SiswaPkl[] })?.data || [];
  }, [penempatanData]);

  const pagination = useMemo(() => penempatanData?.pagination || null, [penempatanData]);

  const hasKolektif = useCallback((mitraId: string) => {
    if (!rawPenempatan) return false;
    const count = rawPenempatan.filter((item: SiswaPkl) => item.mitra_id === mitraId).length;
    return count > 1;
  }, [rawPenempatan]);

  const { data: mitraList, isLoading: isLoadingMitra } = useQuery({
    queryKey: ['mitra-remote-search', { search: mitraSearch }],
    queryFn: () => hubinApi.getMitra({ search: mitraSearch, limit: 250 }),
    enabled: isEnabled
  });

  const { data: guruList, isLoading: isLoadingGuru } = useQuery({
    queryKey: ['guru-remote-search', { search: guruSearch }],
    queryFn: () => guruApi.getAll({ search: guruSearch, limit: 250 }),
    enabled: isEnabled
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: CreatePenempatanPayload) => hubinApi.createPenempatan(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      toast.success('Penempatan PKL berhasil dibuat');
      setIsPlottingOpen(false);
      setSelectedSiswaId('');
      setSelectedMitraId('');
      setSelectedPembimbingId('');
    },
    onError: (error: unknown) => {
      const errorMsg = error instanceof Error ? error.message : 'Gagal membuat penempatan';
      toast.error(errorMsg);
    },
  });

  const nilaiMutation = useMutation({
    mutationFn: ({ id, nilai }: { id: string; nilai: PenilaianPayload }) => hubinApi.updatePenilaian(id, nilai),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      toast.success('Penilaian PKL berhasil disimpan');
      setIsNilaiOpen(false);
      setSelectedPkl(null);
    },
    onError: (error: unknown) => {
      const errorMsg = error instanceof Error ? error.message : 'Gagal menyimpan penilaian';
      toast.error(errorMsg);
    },
  });

  const kunjunganMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: KunjunganPayload }) => hubinApi.addKunjungan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      toast.success('Laporan kunjungan berhasil ditambahkan');
      setIsKunjunganOpen(false);
      setSelectedPkl(null);
      setVisitLat('');
      setVisitLng('');
      setVisitFotoUrl('');
    },
    onError: (error: unknown) => {
      const errorMsg = error instanceof Error ? error.message : 'Gagal menambahkan kunjungan';
      toast.error(errorMsg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => hubinApi.deletePenempatan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      toast.success('Penempatan PKL berhasil dihapus');
    },
    onError: (error: unknown) => {
      const errorMsg = error instanceof Error ? error.message : 'Gagal menghapus penempatan';
      toast.error(errorMsg);
    },
  });

  const reviewJurnalMutation = useMutation({
    mutationFn: ({ id, status, catatan }: { id: string; status: string; catatan: string }) => 
      hubinApi.reviewJurnalPortofolio(id, status, catatan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      toast.success('Review Jurnal & Portofolio berhasil disimpan!');
      setIsReviewJurnalOpen(false);
      setReviewJurnalCatatan('');
      setSelectedPkl(null);
    },
    onError: (error: unknown) => {
      const errorMsg = error instanceof Error ? error.message : 'Gagal menyimpan review';
      toast.error(errorMsg);
    },
  });

  // Plotting Submit Handler
  const handlePlottingSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (!selectedSiswaId || !selectedMitraId) {
      toast.error('Mohon pilih siswa dan mitra industri');
      return;
    }

    const data = {
      siswa_id: selectedSiswaId,
      mitra_id: selectedMitraId,
      pembimbing_id: selectedPembimbingId || null,
      tanggal_mulai: new Date(formData.get('tanggal_mulai') as string).toISOString(),
      tanggal_selesai: formData.get('tanggal_selesai') ? new Date(formData.get('tanggal_selesai') as string).toISOString() : null,
      status: 'AKTIF'
    };

    createMutation.mutate(data);
  }, [selectedSiswaId, selectedMitraId, selectedPembimbingId, createMutation]);

  // Penilaian Submit Handler
  const handleNilaiSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPkl) return;

    const formData = new FormData(e.currentTarget);
    const nilai = {
      soft_skills: parseFloat(formData.get('soft_skills') as string) || 0,
      technical_skills: parseFloat(formData.get('technical_skills') as string) || 0,
      discipline: parseFloat(formData.get('discipline') as string) || 0,
      catatan: formData.get('catatan') as string || '',
      nilai_akhir: Math.round(
        ((parseFloat(formData.get('soft_skills') as string) || 0) +
         (parseFloat(formData.get('technical_skills') as string) || 0) +
         (parseFloat(formData.get('discipline') as string) || 0)) / 3
      )
    };

    nilaiMutation.mutate({ id: selectedPkl.id, nilai });
  }, [selectedPkl, nilaiMutation]);

  // Kunjungan Submit Handler
  const handleKunjunganSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPkl) return;

    const formData = new FormData(e.currentTarget);
    const data = {
      catatan: formData.get('catatan') as string || '',
      foto_url: formData.get('foto_url') as string || undefined,
      latitude: parseFloat(formData.get('latitude') as string) || undefined,
      longitude: parseFloat(formData.get('longitude') as string) || undefined,
    };

    if (!data.catatan) {
      toast.error('Tuliskan catatan monitoring hasil kunjungan');
      return;
    }

    kunjunganMutation.mutate({ id: selectedPkl.id, data });
  }, [selectedPkl, kunjunganMutation]);

  const rawMitra = useMemo(() => Array.isArray(mitraList) ? (mitraList as MitraData[]) : ((mitraList as any)?.data as MitraData[]) || [], [mitraList]);
  const rawGuru = useMemo(() => Array.isArray(guruList) ? (guruList as PembimbingData[]) : ((guruList as any)?.data as PembimbingData[]) || [], [guruList]);

  const activeGuruId = useMemo(() => {
    if (user?.guru_profile?.id) return user.guru_profile.id;
    const matchedGuru = rawGuru.find((g: PembimbingData) => g.user_id === user?.id);
    return matchedGuru?.id || null;
  }, [rawGuru, user]);

  const isActuallyPembimbing = useMemo(() => {
    return rawPenempatan?.some((p: SiswaPkl) => p.pembimbing_id === activeGuruId);
  }, [rawPenempatan, activeGuruId]);

  const showTabs = useMemo(() => {
    // Tab hanya muncul jika dia HUBIN Global DAN sekaligus memiliki siswa bimbingan
    return canManage && isActuallyPembimbing;
  }, [canManage, isActuallyPembimbing]);

  // Sync activeTab if tabs are hidden
  useEffect(() => {
    if (!showTabs) {
      setActiveTab(canManage ? 'ALL' : 'MY_GUIDANCE');
    }
  }, [showTabs, canManage]);

  const filteredData = useMemo(() => {
    let result = rawPenempatan || [];
    if (activeTab === 'MY_GUIDANCE') {
      result = result.filter((p: SiswaPkl) => p.pembimbing_id === activeGuruId);
    }
    return result.filter((p: SiswaPkl) => 
      p.Siswa?.nama_siswa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.Mitra?.nama?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [rawPenempatan, searchTerm, activeTab, activeGuruId]);

  const paginationProps = useMemo(() => {
    if (!pagination) return undefined;
    return {
      currentPage: pagination.page,
      totalPages: pagination.totalPages,
      totalItems: pagination.total,
      itemsPerPage: pagination.limit,
      onPageChange: (newPage: number) => setPage(newPage),
      onLimitChange: (newLimit: number) => setLimit(newLimit)
    };
  }, [pagination]);

  const stats = useMemo(() => [
    {
      title: 'Total Penempatan',
      value: rawPenempatan?.length || 0,
      icon: <ClipboardList size={24} />,
      gradient: 'from-blue-500 to-indigo-605'
    },
    {
      title: 'Penempatan Aktif',
      value: rawPenempatan?.filter((p: SiswaPkl) => p.status === 'AKTIF').length || 0,
      icon: <CheckCircle2 size={24} />,
      gradient: 'from-emerald-450 to-teal-600'
    },
    {
      title: 'Mitra Terlibat',
      value: Array.from(new Set(rawPenempatan?.map((p: SiswaPkl) => p.mitra_id))).length || 0,
      icon: <Building2 size={24} />,
      gradient: 'from-amber-400 to-orange-600'
    }
  ], [rawPenempatan]);

  const breadcrumbs = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Penempatan PKL', path: '/hubin/penempatan' }
  ];

  const toolbar = canManage ? (
    <Button
      onClick={() => setIsPlottingOpen(true)}
      variant="toolbarPrimary"
      size="toolbar"
    >
      <UserPlus size={16} className="mr-1.5" />
      Plotting Baru
    </Button>
  ) : null;

  const mitraOptions = useMemo(() => {
    return rawMitra?.map((m: MitraData) => ({
      label: m.nama,
      value: m.id
    })) || [];
  }, [rawMitra]);

  const guruOptions = useMemo(() => {
    return rawGuru?.map((g: PembimbingData) => ({
      label: g.nama_guru || g.full_name || '',
      value: g.id
    })) || [];
  }, [rawGuru]);

  // Table Columns
  const columns = useMemo(() => getPenempatanColumns({
    rawMitra,
    canManage,
    hasKolektif,
    onNilai: (row) => {
      setSelectedPkl(row);
      setIsNilaiOpen(true);
    },
    onKunjungan: (row) => {
      setSelectedPkl(row);
      setIsKunjunganOpen(true);
    },
    onReviewJurnal: (row) => {
      setSelectedPkl(row);
      setReviewJurnalStatus(row.jurnal_json?.status === HubinJurnalStatus.REVISI ? HubinJurnalStatus.REVISI : HubinJurnalStatus.DISETUJUI);
      setReviewJurnalCatatan(row.jurnal_json?.catatan_revisi || '');
      setIsReviewJurnalOpen(true);
    },
    onCetakTugas: (row) => {
      setPrintKolektifMitraId(null);
      setPrintData(row);
      printTimerRef.current = setTimeout(() => {
        window.print();
      }, 250);
    },
    onCetakKolektif: (mitraId) => {
      setPrintData(null);
      setPrintKolektifMitraId(mitraId);
      printTimerRef.current = setTimeout(() => {
        window.print();
      }, 250);
    },
    onHapus: async (row) => {
      const isConfirmed = await confirm({
        title: 'Hapus Penempatan PKL',
        description: `Apakah Anda yakin ingin membatalkan plotting penempatan PKL untuk ${row.Siswa?.nama_siswa} di ${row.Mitra?.nama}?`,
        confirmText: 'Ya, Hapus',
        cancelText: 'Batal',
        style: 'danger'
      });
      if (isConfirmed) {
        deleteMutation.mutate(row.id);
      }
    }
  }), [rawMitra, canManage, hasKolektif, deleteMutation, confirm]);

  // Visit history list calculation
  const selectedKunjunganList = useMemo(() => {
    if (!selectedPkl || !Array.isArray(selectedPkl.kunjungan_json)) return [];
    return selectedPkl.kunjungan_json;
  }, [selectedPkl]);

  const collectiveStudents = useMemo(() => {
    if (!printKolektifMitraId || !rawPenempatan) return [];
    return rawPenempatan.filter((item: SiswaPkl) => item.mitra_id === printKolektifMitraId);
  }, [printKolektifMitraId, rawPenempatan]);

  const representativeRow = useMemo(() => {
    return collectiveStudents[0] || null;
  }, [collectiveStudents]);

  return (
    <PremiumFeatureGate
      moduleName="HUBIN"
      featureName="Penempatan PKL Siswa"
      description="Optimalkan proses penempatan kerja lapangan. Plotting siswa ke mitra industri secara cerdas, tunjuk guru pembimbing, dan kelola periode PKL dalam satu manajemen terpusat."
    >
      <AcademicPageLayout
        title="Penempatan PKL"
        description="Plotting siswa ke mitra industri dan penunjukkan pembimbing"
        breadcrumbs={breadcrumbs}
        stats={stats}
        isLoadingStats={isLoading}
        hardeningModuleKey="hubin_penempatan_pkl"
        instruction={{
          title: "Panduan Penempatan PKL",
          description: "Kelola plotting penempatan praktek kerja lapangan siswa ke mitra industri.",
          items: [
            { text: "Pilih siswa dan mitra industri untuk melakukan plotting penempatan baru." },
            { text: "Tunjuk guru pembimbing untuk memonitor progres PKL siswa." },
            { text: "Input nilai, buat laporan kunjungan, dan lakukan review jurnal siswa secara berkala." }
          ]
        }}
      >
        <SectionCard title="Data Penempatan PKL Siswa" icon={ClipboardList} fullWidth noPadding>
          {/* Custom Search & Toolbar */}
          <div className="flex flex-col md:flex-row gap-4 p-4 border-b border-gray-100 dark:border-gray-800 bg-slate-50/20 dark:bg-slate-900/10 items-center w-full justify-between">
            {/* Tab Filters */}
            {showTabs && (
              <div className="flex bg-slate-100/85 dark:bg-slate-950/45 p-1 rounded-xl shrink-0 border border-slate-200/50 dark:border-slate-800/40 w-full md:w-auto">
                {isGuru ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveTab('MY_GUIDANCE')}
                      className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                        activeTab === 'MY_GUIDANCE'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                          : 'text-slate-550 hover:text-slate-800 dark:hover:text-slate-250'
                      }`}
                    >
                      <User size={14} />
                      Bimbingan Saya
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('ALL')}
                      className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                        activeTab === 'ALL'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                          : 'text-slate-550 hover:text-slate-800 dark:hover:text-slate-250'
                      }`}
                    >
                      <ClipboardList size={14} />
                      Semua Penempatan
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveTab('ALL')}
                      className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                        activeTab === 'ALL'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                          : 'text-slate-550 hover:text-slate-800 dark:hover:text-slate-250'
                      }`}
                    >
                      <ClipboardList size={14} />
                      Semua Penempatan
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('MY_GUIDANCE')}
                      className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                        activeTab === 'MY_GUIDANCE'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                          : 'text-slate-550 hover:text-slate-800 dark:hover:text-slate-250'
                      }`}
                    >
                      <User size={14} />
                      Bimbingan Saya
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="flex-1 relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Cari nama siswa atau nama mitra industri..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 text-[13px] rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm pl-9"
              />
            </div>
          </div>

          <div className="bg-transparent overflow-hidden">
            <Table
              columns={columns}
              data={filteredData}
              loading={isLoading}
              emptyMessage="Belum ada data penempatan siswa PKL"
              compact={true}
              pagination={paginationProps}
              toolbarRight={toolbar}
            />
          </div>
        </SectionCard>

        <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm"><Loader size="lg" /></div>}>
          <HubinPklPlottingModal
            isOpen={isPlottingOpen}
            onClose={() => setIsPlottingOpen(false)}
            mitraOptions={mitraOptions}
            guruOptions={guruOptions}
            selectedSiswaId={selectedSiswaId}
            setSelectedSiswaId={setSelectedSiswaId}
            selectedMitraId={selectedMitraId}
            setSelectedMitraId={setSelectedMitraId}
            selectedPembimbingId={selectedPembimbingId}
            setSelectedPembimbingId={setSelectedPembimbingId}
            handlePlottingSubmit={handlePlottingSubmit}
            isPending={createMutation.isPending}
            onGuruSearch={setGuruSearch}
            onMitraSearch={setMitraSearch}
            isLoadingGuru={isLoadingGuru}
            isLoadingMitra={isLoadingMitra}
          />
        </Suspense>

        <Suspense fallback={null}>
          <HubinPklNilaiModal
            isOpen={isNilaiOpen}
            onClose={() => {
              setIsNilaiOpen(false);
              setSelectedPkl(null);
            }}
            selectedPkl={selectedPkl}
            handleNilaiSubmit={handleNilaiSubmit}
            isPending={nilaiMutation.isPending}
          />
        </Suspense>

        <Suspense fallback={null}>
          <HubinPklKunjunganModal
            isOpen={isKunjunganOpen}
            onClose={() => {
              setIsKunjunganOpen(false);
              setSelectedPkl(null);
              setVisitFotoUrl('');
            }}
            selectedPkl={selectedPkl}
            selectedKunjunganList={selectedKunjunganList}
            handleKunjunganSubmit={handleKunjunganSubmit}
            isPending={kunjunganMutation.isPending}
            isDetectingGps={isDetectingGps}
            setIsDetectingGps={setIsDetectingGps}
            visitLat={visitLat}
            setVisitLat={setVisitLat}
            visitLng={visitLng}
            setVisitLng={setVisitLng}
            visitFotoUrl={visitFotoUrl}
            setVisitFotoUrl={setVisitFotoUrl}
          />
        </Suspense>

        <Suspense fallback={null}>
          <HubinPklReviewJurnalModal
            isOpen={isReviewJurnalOpen}
            onClose={() => {
              setIsReviewJurnalOpen(false);
              setSelectedPkl(null);
            }}
            selectedPkl={selectedPkl}
            reviewJurnalStatus={reviewJurnalStatus}
            setReviewJurnalStatus={setReviewJurnalStatus}
            reviewJurnalCatatan={reviewJurnalCatatan}
            setReviewJurnalCatatan={setReviewJurnalCatatan}
            reviewJurnalMutation={reviewJurnalMutation}
          />
        </Suspense>

        <Suspense fallback={null}>
          <HubinPklPrintSurat
            printData={printData}
            printKolektifMitraId={printKolektifMitraId}
            tenantData={tenantData}
            collectiveStudents={collectiveStudents}
            representativeRow={representativeRow}
          />
        </Suspense>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
};

export default PenempatanPklPage;
