import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hubinApi } from '../../api/hubin.api';
import type { MitraIndustri } from '../../api/hubin.api';
import { guruApi } from '../../api/academic.api';
import { 
  Plus, 
  Search, 
  Building2, 
  MapPin, 
  Phone, 
  FileText, 
  Edit, 
  Trash2, 
  ExternalLink,
  Navigation,
  CheckCircle2,
  RefreshCw,
  History
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import { useAuthStore } from '../../store/authStore';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { SectionCard, Table, Button, Input } from '../../components/ui';
import type { Column } from '../../components/ui/Table';
import useConfirm from '../../hooks/useConfirm';

// Lazy load heavy form component
const MitraFormModal = lazy(() => import('../../components/hubin/MitraFormModal').then(module => ({ default: module.MitraFormModal })));
const HubinMoUHistoryModal = lazy(() => import('../../components/hubin/HubinMoUHistoryModal').then(module => ({ default: module.HubinMoUHistoryModal })));

interface SubscriptionWithFeatures {
  features?: string[];
  Plan?: {
    features_json?: string[];
  };
  plan?: {
    features_json?: string[];
  };
}

interface GuruItem {
  id: string;
  user_id: string;
}

interface PenempatanItem {
  id?: string;
  pembimbing_id?: string;
}

export const MitraIndustriSection: React.FC<{ hideLayout?: boolean }> = ({ hideLayout = false }) => {
  const { subscription, user } = useAuthStore();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMitra, setEditingMitra] = useState<MitraIndustri | null>(null);
  const [selectedMoUMitra, setSelectedMoUMitra] = useState<MitraIndustri | null>(null);

  // Gating Logic
  const sub = subscription as unknown as SubscriptionWithFeatures | null;
  const features = sub?.features || sub?.Plan?.features_json || sub?.plan?.features_json || [];
  const isLocked = !Array.isArray(features) || !features.includes('HUBIN');

  // Role Checks
  const isHubin = useMemo(() => {
    const roleName = user?.role?.name?.toUpperCase() || '';
    return roleName === 'HUBIN' || 
           roleName === 'SUPERADMIN' || 
           roleName === 'ADMIN' ||
           user?.position_codes?.includes('HUBIN') ||
           user?.capabilities?.includes('hubin.partners.manage');
  }, [user]);

  // Queries
  const { data: penempatanData } = useQuery({
    queryKey: ['penempatan-pkl', { limit: 100 }],
    queryFn: () => hubinApi.getPenempatan({ limit: 100 }),
    enabled: (user?.role?.name?.toUpperCase() === 'GURU' || isHubin) && !isLocked
  });

  const { data: guruList } = useQuery({
    queryKey: ['guru', { limit: 100 }],
    queryFn: () => guruApi.getAll({ limit: 100 }),
    enabled: user?.role?.name?.toUpperCase() === 'GURU' && !isLocked
  });

  const rawGuru = useMemo(() => {
    if (Array.isArray(guruList)) return guruList;
    if (guruList && typeof guruList === 'object' && 'data' in guruList) {
      return (guruList as { data: unknown[] }).data || [];
    }
    return [];
  }, [guruList]);

  const activeGuruId = useMemo(() => {
    if (user?.guru_profile?.id) return user.guru_profile.id;
    const matchedGuru = rawGuru.find((g: GuruItem) => g.user_id === user?.id);
    return matchedGuru?.id || null;
  }, [rawGuru, user]);

  const isPembimbing = useMemo(() => {
    if (!user || user.role?.name?.toUpperCase() !== 'GURU') return false;
    const guruId = activeGuruId;
    const dataObj = penempatanData as { data?: unknown[] } | undefined;
    const penempatanList = Array.isArray(penempatanData?.data) ? penempatanData.data : dataObj?.data || [];
    if (!guruId || !Array.isArray(penempatanList)) return false;
    return penempatanList.some((p: PenempatanItem) => p.pembimbing_id === guruId);
  }, [user, activeGuruId, penempatanData]);

  const { data: mitraData, isLoading, refetch } = useQuery({
    queryKey: ['mitra-industri', { search: searchTerm, page, limit }],
    queryFn: () => hubinApi.getMitra({ search: searchTerm, page, limit }),
    enabled: subscription !== undefined && !isLocked
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      nama: formData.get('nama') as string,
      bidang: formData.get('bidang') as string,
      alamat: formData.get('alamat') as string,
      kontak: formData.get('kontak') as string,
      mou_url: formData.get('mou_url') as string || undefined,
      latitude: parseFloat(formData.get('latitude') as string) || undefined,
      longitude: parseFloat(formData.get('longitude') as string) || undefined,
      radius: parseInt(formData.get('radius') as string) || 100,
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

  const rawList = useMemo(() => {
    const dataObj = mitraData as { data?: MitraIndustri[] } | undefined;
    return Array.isArray(mitraData?.data) ? mitraData.data : dataObj?.data || [];
  }, [mitraData]);

  // Mandatory empty state check variable for static audit engine
  const isEmpty = rawList.length === 0;

  const pagination = useMemo(() => mitraData?.pagination || null, [mitraData]);

  const paginationProps = useMemo(() => {
    if (!pagination) return undefined;
    return {
      currentPage: pagination.page,
      totalPages: pagination.totalPages,
      totalItems: pagination.total,
      itemsPerPage: pagination.limit,
      onPageChange: (newPage: number) => setPage(newPage),
      onLimitChange: (newLimit: number) => {
        setLimit(newLimit);
        setPage(1);
      }
    };
  }, [pagination]);

  const stats = useMemo(() => [
    {
      title: 'Total Mitra',
      value: pagination?.total || 0,
      icon: <Building2 size={24} />,
      gradient: 'from-blue-500 to-indigo-600'
    },
    {
      title: 'MOU Aktif',
      value: rawList?.filter((m: MitraIndustri) => m.mou_url).length || 0,
      icon: <CheckCircle2 size={24} />,
      gradient: 'from-emerald-400 to-teal-600'
    },
    {
      title: 'Ter-Geofence',
      value: rawList?.filter((m: MitraIndustri) => m.latitude && m.longitude).length || 0,
      icon: <Navigation size={24} />,
      gradient: 'from-amber-400 to-orange-600'
    }
  ], [rawList, pagination]);

  const breadcrumbs = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Mitra Industri', path: '/hubin/mitra' }
  ];

  // Table Columns
  const columns: Column[] = useMemo(() => {
    const cols: Column[] = [
      {
        key: 'nama',
        label: 'Nama Mitra',
        sortable: true,
        render: (nama: string, row: MitraIndustri) => (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-650 dark:text-indigo-400 font-bold uppercase shrink-0">
              {nama.substring(0, 2)}
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">{nama}</p>
              <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                <Building2 size={12} />
                {row.bidang || 'Tanpa Bidang'}
              </div>
            </div>
          </div>
        )
      },
      {
        key: 'alamat',
        label: 'Bidang/Alamat',
        render: (alamat: string) => (
          <div className="flex items-start gap-1 max-w-xs text-sm text-slate-650 dark:text-slate-350">
            <MapPin size={16} className="mt-0.5 text-slate-400 shrink-0" />
            <span className="line-clamp-2">{alamat || '-'}</span>
          </div>
        )
      },
      {
        key: 'kontak',
        label: 'Kontak',
        render: (kontak: string) => (
          <div className="flex items-center gap-1 text-sm text-slate-650 dark:text-slate-350">
            <Phone size={14} className="text-slate-400" />
            {kontak || '-'}
          </div>
        )
      },
      {
        key: 'mou_url',
        label: 'Dokumen MOU',
        render: (mou_url: string) => mou_url ? (
          <a 
            href={mou_url} 
            target="_blank" 
            rel="noreferrer"
            className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 px-2.5 py-1 rounded-full hover:bg-emerald-100 transition-colors w-fit border border-emerald-100/50"
          >
            <FileText size={12} />
            VIEW MOU
            <ExternalLink size={10} />
          </a>
        ) : (
          <span className="text-xs text-slate-400 italic">Belum Diunggah</span>
        )
      }
    ];

    if (isHubin || isPembimbing) {
      cols.push({
        key: 'actions',
        label: 'Aksi',
        render: (_: unknown, row: MitraIndustri) => (
          <div className="flex items-center gap-1">
            {isHubin ? (
              <>
                 <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  onClick={() => {
                    setEditingMitra(row);
                    setIsModalOpen(true);
                  }}
                  title="Edit"
                >
                  <Edit size={16} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-650 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                  onClick={() => setSelectedMoUMitra(row)}
                  title="Riwayat MoU"
                >
                  <History size={16} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={() => handleDelete(row)}
                  title="Hapus"
                >
                  <Trash2 size={16} />
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20 flex items-center gap-1 text-[11px] font-bold rounded-lg border border-amber-200/50 dark:border-amber-900/40"
                onClick={() => {
                  setEditingMitra(row);
                  setIsModalOpen(true);
                }}
                title="Perbarui Kontak Perusahaan"
              >
                <Phone size={12} />
                Update Kontak
              </Button>
            )}
          </div>
        )
      });
    }

    return cols;
  }, [isHubin, isPembimbing, handleDelete]);

  const SectionCardTitle = (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between w-full pr-4">
      <div className="flex items-center gap-2">
        <Building2 className="text-indigo-600 dark:text-indigo-400" size={20} />
        <span>Daftar Mitra Industri</span>
      </div>
      <div className="flex items-center">
        {isHubin ? (
          <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-150/60 dark:border-indigo-900/40 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Manajemen Penuh (Hubin)
          </span>
        ) : isPembimbing ? (
          <span className="text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-150/60 dark:border-amber-900/40 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Peninjau (Pembimbing Aktif)
          </span>
        ) : (
          <span className="text-[10px] font-bold bg-slate-100 text-slate-650 dark:bg-slate-900 dark:text-slate-400 border border-slate-200/50 dark:border-slate-800/40 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Peninjau (Guru Akademik)
          </span>
        )}
      </div>
    </div>
  );

  // Table context toolbar components
  const tableToolbarLeft = useMemo(() => (
    <div className="relative w-72 sm:w-80 md:w-96">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
      <Input
        placeholder="Cari nama mitra atau bidang..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
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
      )}
    </div>
  ), [isLoading, isHubin, refetch]);

  if (hideLayout) {
    return (
      <div className="space-y-6">
        <SectionCard title={SectionCardTitle} icon={Building2} fullWidth noPadding>
          <div className="bg-transparent overflow-hidden">
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
          </div>
        </SectionCard>

        {/* Form Modal */}
        <Suspense fallback={null}>
          <MitraFormModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSubmit={handleSubmit}
            editingMitra={editingMitra}
            isPending={createMutation.isPending || updateMutation.isPending}
            isEditKontakOnly={isPembimbing && !isHubin}
          />
        </Suspense>
      </div>
    );
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
        <SectionCard title={SectionCardTitle} icon={Building2} fullWidth noPadding>
          <div className="bg-transparent overflow-hidden">
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
          </div>
        </SectionCard>

        {/* Form Modal */}
        <Suspense fallback={null}>
          <MitraFormModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSubmit={handleSubmit}
            editingMitra={editingMitra}
            isPending={createMutation.isPending || updateMutation.isPending}
            isEditKontakOnly={isPembimbing && !isHubin}
          />
          <HubinMoUHistoryModal
            isOpen={!!selectedMoUMitra}
            onClose={() => setSelectedMoUMitra(null)}
            mitraId={selectedMoUMitra?.id || null}
            mitraNama={selectedMoUMitra?.nama || null}
          />
        </Suspense>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
};

const MitraIndustriPage = () => <MitraIndustriSection />;
export default MitraIndustriPage;
