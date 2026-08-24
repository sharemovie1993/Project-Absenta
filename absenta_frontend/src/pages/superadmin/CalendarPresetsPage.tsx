import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Search,
  Tag,
  Loader2
} from 'lucide-react';
import { kurikulumApi } from '../../api/kurikulum.api';
import { Button, Input, SectionCard, Badge, Table, type Column } from '../../components/ui';
import toast from 'react-hot-toast';
import { SuperAdminPageLayout } from '../../components/layout/SuperAdminPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import useConfirm from '../../hooks/useConfirm';

// Lazy load Modal (Pilar 13)
const CalendarPresetModal = lazy(() => import('./components/CalendarPresetModal'));

// Zod Schema Validation Guard (Pilar 25)
const calendarPresetSchema = z.object({
  judul: z.string().min(2, 'Judul event minimal 2 karakter'),
  jenis: z.string().min(1, 'Jenis event wajib dipilih'),
  jenjang: z.string().default('ALL'),
  keterangan: z.string().optional(),
});

interface PresetItem {
  id: string;
  judul: string;
  jenis: string;
  jenjang?: string;
  keterangan?: string;
}

const JENJANG_OPTIONS = ['ALL', 'SD', 'MI', 'SMP', 'MTs', 'SMA', 'MA', 'SMK', 'MAK'];

const JENIS_OPTIONS = [
  { value: 'LIBUR_NASIONAL', label: 'Libur Nasional' },
  { value: 'LIBUR_SEKOLAH', label: 'Libur Sekolah' },
  { value: 'PTS', label: 'Penilaian Tengah Semester (PTS)' },
  { value: 'PAS', label: 'Penilaian Akhir Semester (PAS)' },
  { value: 'KEGIATAN', label: 'Kegiatan Sekolah' },
  { value: 'MINGGU_EFEKTIF', label: 'Minggu Efektif' },
  { value: 'LAINNYA', label: 'Lainnya' },
];

const getJenisLabel = (val: string) => {
  const found = JENIS_OPTIONS.find(j => j.value === val);
  return found ? found.label : val;
};

const getJenisBadgeVariant = (val: string): 'destructive' | 'warning' | 'info' | 'primary' | 'success' | 'secondary' => {
  const mapper: Record<string, 'destructive' | 'warning' | 'info' | 'primary' | 'success' | 'secondary'> = {
    'LIBUR_NASIONAL': 'destructive',
    'LIBUR_SEKOLAH': 'warning',
    'PTS': 'info',
    'PAS': 'primary',
    'KEGIATAN': 'success',
    'MINGGU_EFEKTIF': 'secondary',
  };
  return mapper[val] || 'secondary';
};

const EMPTY_FORM = { jenjang: 'ALL', judul: '', jenis: 'KEGIATAN', keterangan: '' };

export const CalendarPresetsPage: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<PresetItem | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // Table pagination & sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<string>('judul');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const calendarPresetsQuery = useQuery({
    queryKey: ['superadmin-calendar-presets'],
    queryFn: async () => {
      const res = await kurikulumApi.getCalendarPresets();
      return (res.data || []) as PresetItem[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const presets = calendarPresetsQuery.data || [];
  const loading = calendarPresetsQuery.isLoading;

  const fetchPresets = useCallback(async () => {
    await calendarPresetsQuery.refetch();
  }, [calendarPresetsQuery]);

  const handleOpenCreate = useCallback(() => {
    setEditingPreset(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((preset: PresetItem) => {
    setEditingPreset(preset);
    setForm({
      jenjang: preset.jenjang || 'ALL',
      judul: preset.judul,
      jenis: preset.jenis,
      keterangan: preset.keterangan || ''
    });
    setModalOpen(true);
  }, []);

  const saveCalendarPresetMutation = useMutation({
    mutationFn: (data: typeof form) =>
      editingPreset
        ? kurikulumApi.updateCalendarPreset(editingPreset.id, data)
        : kurikulumApi.createCalendarPreset(data),
    onSuccess: () => {
      toast.success(editingPreset ? 'Preset berhasil diperbarui.' : 'Preset berhasil ditambahkan.');
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['superadmin-calendar-presets'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan preset';
      toast.error(msg);
    }
  });

  const deleteCalendarPresetMutation = useMutation({
    mutationFn: (id: string) => kurikulumApi.deleteCalendarPreset(id),
    onSuccess: () => {
      toast.success('Preset dihapus.');
      queryClient.invalidateQueries({ queryKey: ['superadmin-calendar-presets'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus preset';
      toast.error(msg);
    }
  });

  const handleSave = useCallback(async () => {
    const parsed = calendarPresetSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || 'Form belum valid');
      return;
    }
    await saveCalendarPresetMutation.mutateAsync(form);
  }, [form, saveCalendarPresetMutation]);

  const handleDelete = useCallback(async (preset: PresetItem) => {
    const ok = await confirm({
      title: 'Hapus Preset Kalender',
      description: `Hapus preset "${preset.judul}"? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Hapus',
      cancelText: 'Batal',
      style: 'danger',
    });
    if (!ok) return;
    await deleteCalendarPresetMutation.mutateAsync(preset.id);
  }, [confirm, deleteCalendarPresetMutation]);

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return (presets ?? []).filter(p => {
      return p.judul.toLowerCase().includes(term) ||
        p.jenis.toLowerCase().includes(term) ||
        (p.jenjang && p.jenjang.toLowerCase().includes(term)) ||
        (p.keterangan && p.keterangan.toLowerCase().includes(term));
    });
  }, [presets, searchTerm]);

  const totalTypes = useMemo(() => {
    return [...new Set((presets ?? []).map(p => p.jenis))].length;
  }, [presets]);

  const headerStats = useMemo(() => [
    {
      title: 'Total Preset',
      value: presets.length,
      icon: <Calendar size={16} className="text-white" />,
      gradient: 'from-indigo-600 to-indigo-800',
      subtitle: 'Template event terdaftar'
    },
    {
      title: 'Tipe Kategori Event',
      value: totalTypes,
      icon: <Tag size={16} className="text-white" />,
      gradient: 'from-purple-600 to-purple-800',
      subtitle: 'Kelompok agenda pendidikan'
    },
  ], [presets, totalTypes]);

  const breadcrumbs = useMemo(() => [
    { label: 'Platform Kurikulum' },
    { label: 'Preset Kalender Akademik' }
  ], []);

  const instruction = useMemo(() => ({
    title: 'Panduan Preset Kalender Akademik',
    description: 'Kelola template agenda, libur nasional, PTS/PAS, dan kegiatan rutin tahunan untuk seluruh tenant sekolah.',
    items: [
      { text: 'Preset ini digunakan saat sekolah melakukan sinkronisasi kalender akademik otomatis.' },
      { text: 'Tentukan jenjang spesifik atau pilih ALL untuk berlaku di seluruh jenjang sekolah.' },
      { text: 'Pilih jenis agenda sesuai kalender pendidikan dinas pendidikan.' }
    ]
  }), []);

  const tableColumns: Column[] = useMemo(() => [
    {
      key: 'judul',
      label: 'Nama Agenda / Event',
      sortable: true,
      render: (_: unknown, row: PresetItem) => (
        <div>
          <span className="font-bold text-xs text-slate-900 dark:text-white block">{row.judul}</span>
          {row.keterangan ? (
            <span className="text-[10px] text-slate-400 block line-clamp-1">{row.keterangan}</span>
          ) : (
            <span className="text-[10px] text-slate-400 italic">Tidak ada keterangan</span>
          )}
        </div>
      )
    },
    {
      key: 'jenis',
      label: 'Kategori Agenda',
      sortable: true,
      render: (_: unknown, row: PresetItem) => (
        <Badge variant={getJenisBadgeVariant(row.jenis)} className="text-[10px] font-bold">
          {getJenisLabel(row.jenis)}
        </Badge>
      )
    },
    {
      key: 'jenjang',
      label: 'Jenjang Sasaran',
      sortable: true,
      render: (_: unknown, row: PresetItem) => (
        <Badge variant="outline" className="text-[10px] font-bold font-mono">
          {row.jenjang || 'ALL'}
        </Badge>
      )
    },
    {
      key: 'actions',
      label: 'Aksi',
      align: 'right',
      render: (_: unknown, row: PresetItem) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleOpenEdit(row)}
            className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600 rounded-lg"
          >
            <Edit size={14} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row)}
            className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 rounded-lg"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      )
    }
  ], [handleOpenEdit, handleDelete]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return (filtered ?? []).slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const jenjangSelectOptions = useMemo(() => [
    ...(JENJANG_OPTIONS ?? [])?.map(j => ({ value: j, label: j }))
  ], []);

  const jenisSelectOptions = useMemo(() => [
    ...(JENIS_OPTIONS ?? [])?.map(j => ({ value: j.value, label: j.label }))
  ], []);

  return (
    <InfraErrorBoundary>
      <SuperAdminPageLayout
        hardeningModuleKey="calendar_presets_page"
        title="Katalog Preset Event Kalender"
        description="Kelola template event kalender pendidikan global untuk mempermudah setup tahun ajaran baru sekolah."
        breadcrumbs={breadcrumbs}
        instruction={instruction}
        stats={headerStats}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm w-full min-w-0 max-w-full">
            <Table
              columns={tableColumns}
              data={paginatedData}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={(col, dir) => { setSortBy(col); setSortOrder(dir); }}
              emptyMessage="Tidak ada preset event kalender ditemukan."
              toolbarLeft={
                <div className="relative max-w-xs w-full min-w-0">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    id="search-calendar-preset"
                    aria-label="Cari preset event kalender"
                    placeholder="Cari preset event..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-9 rounded-xl text-xs w-full"
                  />
                </div>
              }
              toolbarRight={
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="toolbarOutline"
                    size="toolbar"
                    onClick={fetchPresets}
                    disabled={loading}
                    className="rounded-xl"
                  >
                    <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                  </Button>
                  <Button
                    type="button"
                    variant="toolbarPrimary"
                    size="toolbar"
                    onClick={handleOpenCreate}
                    className="rounded-xl font-bold"
                  >
                    <Plus size={14} className="mr-1.5" />
                    Tambah Preset
                  </Button>
                </div>
              }
              pagination={{
                currentPage,
                totalPages: Math.max(1, Math.ceil(filtered.length / itemsPerPage)),
                totalItems: filtered.length,
                itemsPerPage,
                onPageChange: setCurrentPage,
                onLimitChange: (limit) => { setItemsPerPage(limit); setCurrentPage(1); }
              }}
            />
          </div>
        </SectionCard>

        {/* Lazy Loaded Modal */}
        {modalOpen && (
          <Suspense fallback={null}>
            <CalendarPresetModal
              isOpen={modalOpen}
              onClose={() => setModalOpen(false)}
              isEditing={Boolean(editingPreset)}
              form={form}
              setForm={setForm}
              jenjangSelectOptions={jenjangSelectOptions}
              jenisSelectOptions={jenisSelectOptions}
              onSave={handleSave}
              isPending={saveCalendarPresetMutation.isPending}
            />
          </Suspense>
        )}
      </SuperAdminPageLayout>
    </InfraErrorBoundary>
  );
});

export default CalendarPresetsPage;
