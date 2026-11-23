import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MapPin,
  Globe,
  Building2,
  Navigation,
  Home,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Search,
  ChevronRight,
  FolderTree,
  X,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axiosInstance';
import { SuperAdminPageLayout } from '@/components/layout/SuperAdminPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { Button, Input, SectionCard, SearchableSelect } from '@/components/ui';
import Modal from '@/components/ui/Modal';
import useConfirm from '@/hooks/useConfirm';
import { cn } from '@/lib/utils';

interface WilayahItem {
  kode: string;
  nama: string;
  tingkat: number;
  parent_kode: string | null;
  Parent?: {
    kode: string;
    nama: string;
    tingkat: number;
  } | null;
  _count?: {
    Children: number;
  };
}

interface WilayahStats {
  provinsi: number;
  kabupaten: number;
  kecamatan: number;
  kelurahan: number;
  total: number;
}

interface WilayahOption {
  kode: string;
  label: string;
  value: string;
}

const TINGKAT_META: Record<number, { label: string; shortLabel: string; badgeClass: string }> = {
  1: {
    label: 'Provinsi',
    shortLabel: 'PROVINSI',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
  },
  2: {
    label: 'Kabupaten / Kota',
    shortLabel: 'KAB / KOTA',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
  },
  3: {
    label: 'Kecamatan',
    shortLabel: 'KECAMATAN',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800',
  },
  4: {
    label: 'Kelurahan / Desa',
    shortLabel: 'KEL / DESA',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  },
};

export const WilayahPresetsPage: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  // Filters & Pagination
  const [tingkatFilter, setTingkatFilter] = useState<string>('');
  const [selectedProvKode, setSelectedProvKode] = useState<string>('');
  const [selectedKabKode, setSelectedKabKode] = useState<string>('');
  const [selectedKecKode, setSelectedKecKode] = useState<string>('');
  const [drillParent, setDrillParent] = useState<{ kode: string; nama: string; tingkat: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(25);

  // Modal Create / Edit
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<WilayahItem | null>(null);
  const [modalProvKode, setModalProvKode] = useState<string>('');
  const [modalKabKode, setModalKabKode] = useState<string>('');
  const [modalKecKode, setModalKecKode] = useState<string>('');
  const [isGeneratingCode, setIsGeneratingCode] = useState<boolean>(false);
  const [formData, setFormData] = useState<{
    kode: string;
    nama: string;
    tingkat: number;
    parent_kode: string;
  }>({
    kode: '',
    nama: '',
    tingkat: 1,
    parent_kode: '',
  });

  // 1. Fetch Stats
  const statsQuery = useQuery<WilayahStats>({
    queryKey: ['superadmin-wilayah-stats'],
    queryFn: async () => {
      const res = await api.get('/wilayah/stats');
      return res.data?.data || { provinsi: 0, kabupaten: 0, kecamatan: 0, kelurahan: 0, total: 0 };
    },
    staleTime: 60 * 1000,
  });
  const stats = statsQuery.data || { provinsi: 0, kabupaten: 0, kecamatan: 0, kelurahan: 0, total: 0 };

  // 2. Cascading Options for Drill-Down Toolbar
  const provinsiOptionsQuery = useQuery<WilayahOption[]>({
    queryKey: ['wilayah-options-provinsi'],
    queryFn: async () => {
      const res = await api.get('/wilayah/provinsi');
      return res.data?.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const kabupatenOptionsQuery = useQuery<WilayahOption[]>({
    queryKey: ['wilayah-options-kabupaten', selectedProvKode],
    queryFn: async () => {
      const res = await api.get('/wilayah/kabupaten', { params: { provinsi_kode: selectedProvKode } });
      return res.data?.data || [];
    },
    enabled: Boolean(selectedProvKode),
    staleTime: 5 * 60 * 1000,
  });

  const kecamatanOptionsQuery = useQuery<WilayahOption[]>({
    queryKey: ['wilayah-options-kecamatan', selectedKabKode],
    queryFn: async () => {
      const res = await api.get('/wilayah/kecamatan', { params: { kabupaten_kode: selectedKabKode } });
      return res.data?.data || [];
    },
    enabled: Boolean(selectedKabKode),
    staleTime: 5 * 60 * 1000,
  });

  // Cascading Options inside Modal Form
  const modalKabupatenOptionsQuery = useQuery<WilayahOption[]>({
    queryKey: ['wilayah-modal-kabupaten', modalProvKode],
    queryFn: async () => {
      const res = await api.get('/wilayah/kabupaten', { params: { provinsi_kode: modalProvKode } });
      return res.data?.data || [];
    },
    enabled: isModalOpen && Boolean(modalProvKode),
    staleTime: 5 * 60 * 1000,
  });

  const modalKecamatanOptionsQuery = useQuery<WilayahOption[]>({
    queryKey: ['wilayah-modal-kecamatan', modalKabKode],
    queryFn: async () => {
      const res = await api.get('/wilayah/kecamatan', { params: { kabupaten_kode: modalKabKode } });
      return res.data?.data || [];
    },
    enabled: isModalOpen && Boolean(modalKabKode),
    staleTime: 5 * 60 * 1000,
  });

  const fetchNextCode = useCallback(async (tingkat: number, parentKode: string) => {
    if (tingkat > 1 && !parentKode) return;
    setIsGeneratingCode(true);
    try {
      const res = await api.get('/wilayah/next-code', {
        params: {
          tingkat,
          parent_kode: tingkat > 1 ? parentKode : undefined,
        },
      });
      const suggested = res.data?.data?.next_kode;
      if (suggested) {
        setFormData((prev) => ({
          ...prev,
          kode: suggested,
        }));
      }
    } catch {
      // Fallback prefix if endpoint fails
      if (parentKode) {
        setFormData((prev) => ({ ...prev, kode: prev.kode || parentKode }));
      }
    } finally {
      setIsGeneratingCode(false);
    }
  }, []);

  // Auto-generate next code in Create mode whenever tingkat or parent_kode changes
  useEffect(() => {
    if (!isModalOpen || editingItem) return;
    if (formData.tingkat === 1) {
      fetchNextCode(1, '');
    } else if (formData.parent_kode) {
      fetchNextCode(formData.tingkat, formData.parent_kode);
    } else {
      setFormData((prev) => ({ ...prev, kode: '' }));
    }
  }, [isModalOpen, editingItem, formData.tingkat, formData.parent_kode, fetchNextCode]);

  // Effective parent_kode & tingkat based on drill-down or cascading dropdowns
  const effectiveParentKode = useMemo(() => {
    if (drillParent) return drillParent.kode;
    if (selectedKecKode) return selectedKecKode;
    if (selectedKabKode) return selectedKabKode;
    if (selectedProvKode) return selectedProvKode;
    return '';
  }, [drillParent, selectedKecKode, selectedKabKode, selectedProvKode]);

  const effectiveTingkat = useMemo(() => {
    if (tingkatFilter) return tingkatFilter;
    if (drillParent) return String(Math.min(4, drillParent.tingkat + 1));
    if (selectedKecKode) return '4';
    if (selectedKabKode) return '3';
    if (selectedProvKode) return '2';
    return '';
  }, [tingkatFilter, drillParent, selectedKecKode, selectedKabKode, selectedProvKode]);

  // 3. Fetch Paginated Wilayah List
  const wilayahQuery = useQuery<{
    data: WilayahItem[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }>({
    queryKey: ['superadmin-wilayah-manage', effectiveTingkat, effectiveParentKode, searchTerm, page, limit],
    queryFn: async () => {
      const res = await api.get('/wilayah/manage', {
        params: {
          tingkat: effectiveTingkat || undefined,
          parent_kode: effectiveParentKode || undefined,
          search: searchTerm.trim() || undefined,
          page,
          limit,
        },
      });
      return {
        data: res.data?.data || [],
        meta: res.data?.meta || { total: 0, page: 1, limit: 25, totalPages: 1 },
      };
    },
    staleTime: 30 * 1000,
  });

  const items = wilayahQuery.data?.data || [];
  const meta = wilayahQuery.data?.meta || { total: 0, page: 1, limit: 25, totalPages: 1 };

  // Mutations
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/wilayah/sync');
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Data wilayah berhasil disinkronkan');
      queryClient.invalidateQueries({ queryKey: ['superadmin-wilayah-stats'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-wilayah-manage'] });
      queryClient.invalidateQueries({ queryKey: ['wilayah-options-provinsi'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal menyinkronkan data wilayah');
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      if (editingItem) {
        const res = await api.put(`/wilayah/manage/${encodeURIComponent(editingItem.kode)}`, {
          nama: payload.nama,
          parent_kode: payload.tingkat === 1 ? null : payload.parent_kode || null,
        });
        return res.data;
      }
      const res = await api.post('/wilayah/manage', {
        kode: payload.kode,
        nama: payload.nama,
        tingkat: Number(payload.tingkat),
        parent_kode: Number(payload.tingkat) === 1 ? null : payload.parent_kode || null,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || (editingItem ? 'Wilayah diperbarui' : 'Wilayah ditambahkan'));
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['superadmin-wilayah-stats'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-wilayah-manage'] });
      queryClient.invalidateQueries({ queryKey: ['wilayah-options-provinsi'] });
      queryClient.invalidateQueries({ queryKey: ['wilayah-options-kabupaten'] });
      queryClient.invalidateQueries({ queryKey: ['wilayah-options-kecamatan'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan data wilayah');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (kode: string) => {
      const res = await api.delete(`/wilayah/manage/${encodeURIComponent(kode)}`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Data wilayah berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['superadmin-wilayah-stats'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-wilayah-manage'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal menghapus data wilayah');
    },
  });

  // Helper to derive cascading codes (Prov: 2 digit, Kab: 4 digit, Kec: 7 digit) from any parent_kode
  const hydrateModalHierarchyFromParentKode = useCallback((parentKode: string, targetTingkat: number) => {
    const clean = (parentKode || '').replace(/\D/g, '');
    const prov = clean.length >= 2 ? clean.slice(0, 2) : selectedProvKode || '';
    const kab = clean.length >= 4 ? clean.slice(0, 4) : selectedKabKode || '';
    const kec = clean.length >= 6 ? clean : selectedKecKode || '';

    setModalProvKode(targetTingkat >= 2 ? prov : '');
    setModalKabKode(targetTingkat >= 3 ? kab : '');
    setModalKecKode(targetTingkat >= 4 ? kec : '');
  }, [selectedProvKode, selectedKabKode, selectedKecKode]);

  // Handlers
  const handleOpenCreate = useCallback(
    (parentItem?: WilayahItem) => {
      setEditingItem(null);
      if (parentItem) {
        const childTingkat = Math.min(4, parentItem.tingkat + 1);
        hydrateModalHierarchyFromParentKode(parentItem.kode, childTingkat);
        setFormData({
          kode: '',
          nama: '',
          tingkat: childTingkat,
          parent_kode: parentItem.kode,
        });
      } else {
        const defaultTingkat = effectiveTingkat ? Number(effectiveTingkat) : 1;
        let inferredParent = '';
        if (defaultTingkat === 2) inferredParent = selectedProvKode || (effectiveParentKode.length === 2 ? effectiveParentKode : '');
        else if (defaultTingkat === 3) inferredParent = selectedKabKode || (effectiveParentKode.length === 4 ? effectiveParentKode : '');
        else if (defaultTingkat === 4) inferredParent = selectedKecKode || (effectiveParentKode.length >= 6 ? effectiveParentKode : '');

        hydrateModalHierarchyFromParentKode(inferredParent || effectiveParentKode, defaultTingkat);
        setFormData({
          kode: '',
          nama: '',
          tingkat: defaultTingkat,
          parent_kode: defaultTingkat > 1 ? inferredParent : '',
        });
      }
      setIsModalOpen(true);
    },
    [effectiveTingkat, effectiveParentKode, selectedProvKode, selectedKabKode, selectedKecKode, hydrateModalHierarchyFromParentKode]
  );

  const handleOpenEdit = useCallback((item: WilayahItem) => {
    setEditingItem(item);
    hydrateModalHierarchyFromParentKode(item.parent_kode || '', item.tingkat);
    setFormData({
      kode: item.kode,
      nama: item.nama,
      tingkat: item.tingkat,
      parent_kode: item.parent_kode || '',
    });
    setIsModalOpen(true);
  }, [hydrateModalHierarchyFromParentKode]);

  const handleDelete = useCallback(
    async (item: WilayahItem) => {
      const childCount = item._count?.Children || 0;
      const ok = await confirm({
        title: `Hapus Wilayah ${item.nama}?`,
        message:
          childCount > 0
            ? `Peringatan: Wilayah "${item.nama}" (${item.kode}) memiliki ${childCount} sub-wilayah di bawahnya yang juga akan ikut terhapus. Lanjutkan?`
            : `Apakah Anda yakin ingin menghapus wilayah "${item.nama}" (Kode: ${item.kode})?`,
        confirmText: 'Ya, Hapus',
        variant: 'danger',
      });
      if (ok) {
        deleteMutation.mutate(item.kode);
      }
    },
    [confirm, deleteMutation]
  );

  const handleDrillDown = useCallback((item: WilayahItem) => {
    if (item.tingkat >= 4) return;
    setDrillParent({ kode: item.kode, nama: item.nama, tingkat: item.tingkat });
    setTingkatFilter('');
    setSearchTerm('');
    setPage(1);
  }, []);

  const handleResetFilters = useCallback(() => {
    setTingkatFilter('');
    setSelectedProvKode('');
    setSelectedKabKode('');
    setSelectedKecKode('');
    setDrillParent(null);
    setSearchTerm('');
    setPage(1);
  }, []);

  const headerStats = useMemo(
    () => [
      {
        title: 'Total Provinsi',
        value: stats.provinsi.toLocaleString('id-ID'),
        icon: <Globe size={16} className="text-white" />,
        gradient: 'from-indigo-600 to-indigo-800',
        subtitle: 'Tingkat 1 Nasional',
      },
      {
        title: 'Kabupaten / Kota',
        value: stats.kabupaten.toLocaleString('id-ID'),
        icon: <Building2 size={16} className="text-white" />,
        gradient: 'from-sky-600 to-blue-800',
        subtitle: 'Tingkat 2 Dati II',
      },
      {
        title: 'Total Kecamatan',
        value: stats.kecamatan.toLocaleString('id-ID'),
        icon: <Navigation size={16} className="text-white" />,
        gradient: 'from-teal-600 to-emerald-800',
        subtitle: 'Tingkat 3 Distrik',
      },
      {
        title: 'Kelurahan / Desa',
        value: stats.kelurahan.toLocaleString('id-ID'),
        icon: <Home size={16} className="text-white" />,
        gradient: 'from-emerald-600 to-green-800',
        subtitle: `Total ${stats.total.toLocaleString('id-ID')} entri wilayah`,
      },
    ],
    [stats]
  );

  const breadcrumbs = useMemo(
    () => [{ label: 'Preset Global' }, { label: 'Master Data Wilayah (Kemendagri)' }],
    []
  );

  const instruction = useMemo(
    () => ({
      title: 'Panduan Master Data Wilayah Administratif',
      description:
        'Kelola referensi wilayah administratif 4 tingkat (Provinsi, Kabupaten/Kota, Kecamatan, Kelurahan/Desa) yang menjadi sumber SSOT dropdown alamat sekolah, siswa, guru, dan DUDI di seluruh tenant.',
      items: [
        { text: 'Gunakan filter bertingkat (Provinsi → Kabupaten/Kota → Kecamatan) atau klik tombol Sub-Wilayah pada baris tabel untuk menelusuri hierarki.' },
        { text: 'Klik tombol "+ Sub" pada baris Provinsi/Kabupaten/Kecamatan untuk langsung menambahkan wilayah bawahan di dalam induk tersebut.' },
        { text: 'Gunakan tombol "Sinkronkan Wilayah Dasar" untuk memastikan data referensi dasar provinsi & kabupaten nasional terisi.' },
      ],
    }),
    []
  );

  return (
    <InfraErrorBoundary>
      <SuperAdminPageLayout
        hardeningModuleKey="wilayah_presets_page"
        title="Master Data Wilayah Administratif"
        description="Pusat pengelolaan referensi wilayah nasional 4 tingkat (Provinsi, Kabupaten/Kota, Kecamatan, Kelurahan/Desa) untuk seluruh tenant."
        breadcrumbs={breadcrumbs}
        instruction={instruction}
        stats={headerStats}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="space-y-4 w-full min-w-0 max-w-full">
            {/* Level Pills & Action Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: '', label: 'Semua Tingkat' },
                  { id: '1', label: '1. Provinsi' },
                  { id: '2', label: '2. Kab / Kota' },
                  { id: '3', label: '3. Kecamatan' },
                  { id: '4', label: '4. Kel / Desa' },
                ].map((tab) => {
                  const isActive = effectiveTingkat === tab.id && !drillParent;
                  return (
                    <button
                      key={tab.id || 'all'}
                      type="button"
                      onClick={() => {
                        setDrillParent(null);
                        setTingkatFilter(tab.id);
                        setPage(1);
                      }}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                        isActive
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      )}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending}
                  className="rounded-xl text-xs font-bold h-9"
                >
                  <RefreshCw size={13} className={cn('mr-1.5', syncMutation.isPending && 'animate-spin')} />
                  <span>Sinkronkan Wilayah Dasar</span>
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => handleOpenCreate()}
                  className="rounded-xl text-xs font-bold h-9 bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <Plus size={14} className="mr-1.5" />
                  <span>Tambah Wilayah</span>
                </Button>
              </div>
            </div>

            {/* Cascading Hierarchy Filter & Search Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Filter Provinsi
                </label>
                <SearchableSelect
                  id="filter-wilayah-prov"
                  value={selectedProvKode}
                  onValueChange={(val) => {
                    setDrillParent(null);
                    setSelectedProvKode(val || '');
                    setSelectedKabKode('');
                    setSelectedKecKode('');
                    setTingkatFilter('');
                    setPage(1);
                  }}
                  options={[
                    { label: 'Semua Provinsi', value: '' },
                    ...(provinsiOptionsQuery.data || []).map((p) => ({
                      label: `${p.kode} - ${p.label}`,
                      value: p.kode,
                    })),
                  ]}
                  placeholder="Pilih Provinsi..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Filter Kabupaten / Kota
                </label>
                <SearchableSelect
                  id="filter-wilayah-kab"
                  value={selectedKabKode}
                  disabled={!selectedProvKode}
                  onValueChange={(val) => {
                    setDrillParent(null);
                    setSelectedKabKode(val || '');
                    setSelectedKecKode('');
                    setTingkatFilter('');
                    setPage(1);
                  }}
                  options={[
                    { label: 'Semua Kabupaten / Kota', value: '' },
                    ...(kabupatenOptionsQuery.data || []).map((k) => ({
                      label: `${k.kode} - ${k.label}`,
                      value: k.kode,
                    })),
                  ]}
                  placeholder={selectedProvKode ? 'Pilih Kab/Kota...' : 'Pilih Provinsi dulu'}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Filter Kecamatan
                </label>
                <SearchableSelect
                  id="filter-wilayah-kec"
                  value={selectedKecKode}
                  disabled={!selectedKabKode}
                  onValueChange={(val) => {
                    setDrillParent(null);
                    setSelectedKecKode(val || '');
                    setTingkatFilter('');
                    setPage(1);
                  }}
                  options={[
                    { label: 'Semua Kecamatan', value: '' },
                    ...(kecamatanOptionsQuery.data || []).map((kc) => ({
                      label: `${kc.kode} - ${kc.label}`,
                      value: kc.kode,
                    })),
                  ]}
                  placeholder={selectedKabKode ? 'Pilih Kecamatan...' : 'Pilih Kab/Kota dulu'}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Pencarian Kode / Nama Wilayah
                </label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Cari kode (3214) atau nama..."
                    className="w-full h-9 pl-9 pr-8 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        setPage(1);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Active Drill-Down Banner */}
            {(drillParent || selectedProvKode || selectedKabKode || selectedKecKode || tingkatFilter) && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/60 rounded-xl text-xs">
                <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-semibold">
                  <FolderTree size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>
                    Filter Aktif:{' '}
                    {drillParent ? (
                      <strong>
                        Sub-Wilayah dari {drillParent.nama} (Kode: {drillParent.kode})
                      </strong>
                    ) : (
                      <strong>
                        {effectiveTingkat ? TINGKAT_META[Number(effectiveTingkat)]?.label : 'Semua Tingkat'}
                        {effectiveParentKode ? ` • Induk: ${effectiveParentKode}` : ''}
                      </strong>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {drillParent && (
                    <button
                      type="button"
                      onClick={() => setDrillParent(null)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] hover:bg-indigo-100 cursor-pointer"
                    >
                      <ArrowLeft size={12} />
                      <span>Kembali ke Tingkat Sebelumnya</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[11px] hover:bg-slate-100 cursor-pointer"
                  >
                    <X size={12} />
                    <span>Reset Semua Filter</span>
                  </button>
                </div>
              </div>
            )}

            {/* Main Wilayah Data Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      <th className="p-3.5 w-36">Kode Wilayah</th>
                      <th className="p-3.5">Nama Wilayah Administratif</th>
                      <th className="p-3.5 w-36">Tingkat</th>
                      <th className="p-3.5">Wilayah Induk (Parent)</th>
                      <th className="p-3.5 text-center w-36">Sub-Wilayah</th>
                      <th className="p-3.5 text-right w-44">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {wilayahQuery.isLoading ? (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-400">
                          <RefreshCw className="animate-spin mx-auto mb-2 text-indigo-500" size={22} />
                          <span className="font-semibold">Memuat daftar referensi wilayah...</span>
                        </td>
                      </tr>
                    ) : items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-400">
                          <MapPin className="mx-auto mb-2 opacity-40" size={32} />
                          <p className="font-bold text-slate-600 dark:text-slate-300">
                            Tidak ada data wilayah yang cocok dengan filter
                          </p>
                          <p className="text-[11px] mt-1">
                            Gunakan tombol &ldquo;Tambah Wilayah&rdquo; atau &ldquo;Sinkronkan Wilayah Dasar&rdquo; untuk mengisi data.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => {
                        const metaTingkat = TINGKAT_META[item.tingkat] || TINGKAT_META[1];
                        const childCount = item._count?.Children || 0;
                        return (
                          <tr
                            key={item.kode}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="p-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                              <span className="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60">
                                {item.kode}
                              </span>
                            </td>
                            <td className="p-3.5 font-bold text-slate-800 dark:text-slate-100">
                              {item.nama}
                            </td>
                            <td className="p-3.5">
                              <span
                                className={cn(
                                  'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border',
                                  metaTingkat.badgeClass
                                )}
                              >
                                {metaTingkat.shortLabel}
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-600 dark:text-slate-400">
                              {item.Parent ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">
                                    {item.Parent.kode}
                                  </span>
                                  <span className="font-medium truncate max-w-[200px]">{item.Parent.nama}</span>
                                </div>
                              ) : item.parent_kode ? (
                                <span className="font-mono text-[11px] text-slate-400">Induk: {item.parent_kode}</span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">- (Tingkat Nasional)</span>
                              )}
                            </td>
                            <td className="p-3.5 text-center">
                              {item.tingkat < 4 ? (
                                <button
                                  type="button"
                                  onClick={() => handleDrillDown(item)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/60 text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 font-bold text-[11px] transition-colors cursor-pointer"
                                  title={`Telusuri sub-wilayah di dalam ${item.nama}`}
                                >
                                  <span>{childCount} Sub</span>
                                  <ChevronRight size={12} />
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-medium">Tingkat Akhir</span>
                              )}
                            </td>
                            <td className="p-3.5 text-right">
                              <div className="inline-flex items-center justify-end gap-1">
                                {item.tingkat < 4 && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenCreate(item)}
                                    className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] transition-colors cursor-pointer"
                                    title={`Tambah ${TINGKAT_META[item.tingkat + 1]?.label} di bawah ${item.nama}`}
                                  >
                                    + Sub
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(item)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                  title="Edit Wilayah"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(item)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                  title="Hapus Wilayah"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-slate-50/70 dark:bg-slate-950/50 border-t border-slate-200/80 dark:border-slate-800 text-xs">
                <span className="text-slate-500 font-medium">
                  Menampilkan <strong>{items.length}</strong> dari <strong>{meta.total.toLocaleString('id-ID')}</strong> data wilayah
                  (Halaman {meta.page} dari {meta.totalPages})
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-xl text-xs h-8 px-3"
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={page >= meta.totalPages}
                    onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                    className="rounded-xl text-xs h-8 px-3"
                  >
                    Selanjutnya
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Modal Create / Edit Wilayah */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingItem ? `Edit Wilayah: ${editingItem.nama}` : 'Tambah Master Wilayah Baru'}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate(formData);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tingkat Wilayah Administratif
              </label>
              <select
                value={formData.tingkat}
                disabled={Boolean(editingItem)}
                onChange={(e) => {
                  const newTingkat = Number(e.target.value);
                  let nextParent = '';
                  if (newTingkat === 2) nextParent = modalProvKode;
                  else if (newTingkat === 3) nextParent = modalKabKode;
                  else if (newTingkat === 4) nextParent = modalKecKode;

                  setFormData((prev) => ({
                    ...prev,
                    tingkat: newTingkat,
                    parent_kode: nextParent,
                    kode: '',
                  }));
                }}
                className="w-full h-10 px-3 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl"
              >
                <option value={1}>1 - Provinsi</option>
                <option value={2}>2 - Kabupaten / Kota</option>
                <option value={3}>3 - Kecamatan</option>
                <option value={4}>4 - Kelurahan / Desa</option>
              </select>
            </div>

            {/* Automated Cascading Parent Selectors */}
            {formData.tingkat >= 2 && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Hierarki Wilayah Induk (Otomatis)
                  </span>
                  {formData.parent_kode && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      Parent Kode: {formData.parent_kode}
                    </span>
                  )}
                </div>

                {/* Dropdown 1: Provinsi (Shown for Tingkat 2, 3, 4) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {formData.tingkat === 2 ? 'Pilih Provinsi Induk' : '1. Pilih Provinsi'}{' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  <SearchableSelect
                    id="modal-wilayah-prov"
                    value={modalProvKode}
                    onValueChange={(val) => {
                      const nextProv = val || '';
                      setModalProvKode(nextProv);
                      setModalKabKode('');
                      setModalKecKode('');
                      setFormData((prev) => ({
                        ...prev,
                        parent_kode: prev.tingkat === 2 ? nextProv : '',
                        kode: prev.tingkat === 2 ? prev.kode : '',
                      }));
                    }}
                    options={(provinsiOptionsQuery.data || []).map((p) => ({
                      label: `${p.kode} - ${p.label}`,
                      value: p.kode,
                    }))}
                    placeholder="Cari & pilih Provinsi..."
                  />
                </div>

                {/* Dropdown 2: Kabupaten / Kota (Shown for Tingkat 3, 4) */}
                {formData.tingkat >= 3 && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {formData.tingkat === 3 ? '2. Pilih Kabupaten / Kota Induk' : '2. Pilih Kabupaten / Kota'}{' '}
                      <span className="text-rose-500">*</span>
                    </label>
                    <SearchableSelect
                      id="modal-wilayah-kab"
                      value={modalKabKode}
                      disabled={!modalProvKode}
                      onValueChange={(val) => {
                        const nextKab = val || '';
                        setModalKabKode(nextKab);
                        setModalKecKode('');
                        setFormData((prev) => ({
                          ...prev,
                          parent_kode: prev.tingkat === 3 ? nextKab : '',
                          kode: prev.tingkat === 3 ? prev.kode : '',
                        }));
                      }}
                      options={(modalKabupatenOptionsQuery.data || []).map((k) => ({
                        label: `${k.kode} - ${k.label}`,
                        value: k.kode,
                      }))}
                      placeholder={
                        !modalProvKode
                          ? 'Pilih Provinsi terlebih dahulu...'
                          : modalKabupatenOptionsQuery.isLoading
                          ? 'Memuat Kabupaten/Kota...'
                          : 'Cari & pilih Kabupaten/Kota...'
                      }
                    />
                  </div>
                )}

                {/* Dropdown 3: Kecamatan (Shown for Tingkat 4) */}
                {formData.tingkat === 4 && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      3. Pilih Kecamatan Induk <span className="text-rose-500">*</span>
                    </label>
                    <SearchableSelect
                      id="modal-wilayah-kec"
                      value={modalKecKode}
                      disabled={!modalKabKode}
                      onValueChange={(val) => {
                        const nextKec = val || '';
                        setModalKecKode(nextKec);
                        setFormData((prev) => ({
                          ...prev,
                          parent_kode: nextKec,
                        }));
                      }}
                      options={(modalKecamatanOptionsQuery.data || []).map((kc) => ({
                        label: `${kc.kode} - ${kc.label}`,
                        value: kc.kode,
                      }))}
                      placeholder={
                        !modalKabKode
                          ? 'Pilih Kabupaten/Kota terlebih dahulu...'
                          : modalKecamatanOptionsQuery.isLoading
                          ? 'Memuat Kecamatan...'
                          : 'Cari & pilih Kecamatan Induk...'
                      }
                    />
                  </div>
                )}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Kode Wilayah (Kemendagri / BPS) <span className="text-rose-500">*</span>
                </label>
                {!editingItem && (
                  <button
                    type="button"
                    disabled={isGeneratingCode || (formData.tingkat > 1 && !formData.parent_kode)}
                    onClick={() => fetchNextCode(formData.tingkat, formData.parent_kode)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 disabled:opacity-40 cursor-pointer"
                  >
                    <Sparkles size={12} className={cn(isGeneratingCode && 'animate-spin')} />
                    <span>{isGeneratingCode ? 'Menghitung kode...' : 'Generate Kode Otomatis'}</span>
                  </button>
                )}
              </div>
              <Input
                value={formData.kode}
                disabled={Boolean(editingItem)}
                onChange={(e) => setFormData((prev) => ({ ...prev, kode: e.target.value }))}
                placeholder={
                  isGeneratingCode
                    ? 'Menghitung kode urut berikutnya...'
                    : formData.tingkat > 1 && !formData.parent_kode
                    ? `Pilih ${TINGKAT_META[formData.tingkat - 1]?.label} Induk di atas untuk auto-fill kode`
                    : 'Contoh: 32 / 3214 / 3214050 / 3214050001'
                }
                required
              />
              {!editingItem && (
                <p className="text-[11px] text-slate-400 mt-1">
                  Kode wilayah terisi otomatis melanjutkan urutan kode terakhir di bawah induk terpilih (tetap dapat disesuaikan manual bila perlu).
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nama Wilayah <span className="text-rose-500">*</span>
              </label>
              <Input
                value={formData.nama}
                onChange={(e) => setFormData((prev) => ({ ...prev, nama: e.target.value }))}
                placeholder={
                  formData.tingkat === 1
                    ? 'Contoh: JAWA BARAT'
                    : formData.tingkat === 2
                    ? 'Contoh: KABUPATEN PURWAKARTA'
                    : formData.tingkat === 3
                    ? 'Contoh: PLERED'
                    : 'Contoh: PLERED / BABAKANSARI'
                }
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={saveMutation.isPending || (formData.tingkat > 1 && !formData.parent_kode)}
                className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                {saveMutation.isPending ? 'Menyimpan...' : editingItem ? 'Simpan Perubahan' : 'Tambahkan Wilayah'}
              </Button>
            </div>
          </form>
        </Modal>
      </SuperAdminPageLayout>
    </InfraErrorBoundary>
  );
});

WilayahPresetsPage.displayName = 'WilayahPresetsPage';
export default WilayahPresetsPage;
