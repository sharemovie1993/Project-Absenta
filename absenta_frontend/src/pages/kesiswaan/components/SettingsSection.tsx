import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { kesiswaanApi, type JenisPelanggaran, type JenisPrestasi, kesiswaanQueryKeys } from '../../../api/kesiswaan.api';
import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../../components/ui/Card';
import { TabSwitcher } from '../../../components/ui/TabSwitcher';
import { Table, type Column } from '../../../components/ui/Table';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { Loader } from '../../../components/ui/Loader';
import { Label } from '../../../components/ui/Label';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { MobileAcademicList } from '../../../components/academic/shared/MobileAcademicList';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import useConfirm from '../../../hooks/useConfirm';
import { Plus, Edit2, Trash2, ShieldAlert, Trophy } from 'lucide-react';

const Modal = lazy(() => import('../../../components/ui/Modal').then(m => ({ default: m.Modal })));

// Zod Schema Validation Guard (Pilar 25)
const violationSchema = z.object({
  nama_pelanggaran: z.string().min(3, 'Nama pelanggaran minimal 3 karakter'),
  kategori: z.string().min(1, 'Kategori pelanggaran wajib dipilih'),
  poin: z.number().min(1, 'Poin pelanggaran minimal 1'),
});

const achievementSchema = z.object({
  nama_prestasi: z.string().min(3, 'Nama prestasi minimal 3 karakter'),
  kategori: z.string().min(1, 'Kategori prestasi wajib dipilih'),
  poin: z.number().min(1, 'Poin prestasi minimal 1'),
});

export const SettingsSection: React.FC = React.memo(() => {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'pelanggaran' | 'prestasi'>('pelanggaran');
  const confirm = useConfirm();

  // Pagination & Sorting State
  const [vPage, setVPage] = useState(1);
  const [vLimit, setVLimit] = useState(10);
  const [vSortBy, setVSortBy] = useState<string>('nama_pelanggaran');
  const [vSortOrder, setVSortOrder] = useState<'asc' | 'desc'>('asc');

  const [aPage, setAPage] = useState(1);
  const [aLimit, setALimit] = useState(10);
  const [aSortBy, setASortBy] = useState<string>('nama_prestasi');
  const [aSortOrder, setASortOrder] = useState<'asc' | 'desc'>('asc');

  // Modal forms
  const [violationModalOpen, setViolationModalOpen] = useState(false);
  const [vId, setVId] = useState<string | null>(null);
  const [vForm, setVForm] = useState({
    kategori: 'RINGAN',
    nama_pelanggaran: '',
    poin: 0
  });

  const [achievementModalOpen, setAchievementModalOpen] = useState(false);
  const [aId, setAId] = useState<string | null>(null);
  const [aForm, setAForm] = useState({
    kategori: 'AKADEMIK',
    nama_prestasi: '',
    poin: 0
  });

  // useQuery: Jenis Pelanggaran & Jenis Prestasi (Pilar 31)
  const { data: vRes, isLoading: loadingV, refetch: refetchV } = useQuery({
    queryKey: kesiswaanQueryKeys.jenisPelanggaran(),
    queryFn: () => kesiswaanApi.getJenisPelanggaran(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: aRes, isLoading: loadingA, refetch: refetchA } = useQuery({
    queryKey: kesiswaanQueryKeys.jenisPrestasi(),
    queryFn: () => kesiswaanApi.getJenisPrestasi(),
    staleTime: 10 * 60 * 1000,
  });

  const violations: JenisPelanggaran[] = useMemo(() => {
    const raw = (vRes as { data?: JenisPelanggaran[] })?.data || (Array.isArray(vRes) ? vRes : []);
    return Array.isArray(raw) ? raw : [];
  }, [vRes]);

  const achievements: JenisPrestasi[] = useMemo(() => {
    const raw = (aRes as { data?: JenisPrestasi[] })?.data || (Array.isArray(aRes) ? aRes : []);
    return Array.isArray(raw) ? raw : [];
  }, [aRes]);

  const loading = loadingV || loadingA;

  // Pagination slicing
  const paginatedViolations = useMemo(() => {
    const start = (vPage - 1) * vLimit;
    return (violations ?? []).slice(start, start + vLimit);
  }, [violations, vPage, vLimit]);

  const paginatedAchievements = useMemo(() => {
    const start = (aPage - 1) * aLimit;
    return (achievements ?? []).slice(start, start + aLimit);
  }, [achievements, aPage, aLimit]);

  const handleVSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const result = violationSchema.safeParse(vForm);
    if (!result.success) {
      toast.error(result.error.issues[0]?.message || 'Data form tidak valid');
      return;
    }
    try {
      if (vId) {
        await kesiswaanApi.updateJenisPelanggaran(vId, vForm);
        toast.success('Kategori pelanggaran berhasil diperbarui');
      } else {
        await kesiswaanApi.createJenisPelanggaran(vForm);
        toast.success('Kategori pelanggaran baru berhasil ditambahkan');
      }
      setViolationModalOpen(false);
      queryClient.invalidateQueries({ queryKey: kesiswaanQueryKeys.jenisPelanggaran() });
      refetchV();
    } catch {
      toast.error('Gagal menyimpan kategori pelanggaran');
    }
  }, [vId, vForm, queryClient, refetchV]);

  const handleVDelete = useCallback(async (id: string) => {
    const ok = await confirm({
      title: 'Hapus Kategori Pelanggaran',
      description: 'Apakah Anda yakin ingin menghapus kategori ini? Data yang sudah tersambung mungkin terpengaruh.',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });
    if (!ok) return;

    try {
      await kesiswaanApi.deleteJenisPelanggaran(id);
      toast.success('Kategori pelanggaran berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: kesiswaanQueryKeys.jenisPelanggaran() });
      refetchV();
    } catch {
      toast.error('Gagal menghapus kategori pelanggaran');
    }
  }, [confirm, queryClient, refetchV]);

  const handleASave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const result = achievementSchema.safeParse(aForm);
    if (!result.success) {
      toast.error(result.error.issues[0]?.message || 'Data form tidak valid');
      return;
    }
    try {
      if (aId) {
        await kesiswaanApi.updateJenisPrestasi(aId, aForm);
        toast.success('Kategori prestasi berhasil diperbarui');
      } else {
        await kesiswaanApi.createJenisPrestasi(aForm);
        toast.success('Kategori prestasi baru berhasil ditambahkan');
      }
      setAchievementModalOpen(false);
      queryClient.invalidateQueries({ queryKey: kesiswaanQueryKeys.jenisPrestasi() });
      refetchA();
    } catch {
      toast.error('Gagal menyimpan kategori prestasi');
    }
  }, [aId, aForm, queryClient, refetchA]);

  const handleADelete = useCallback(async (id: string) => {
    const ok = await confirm({
      title: 'Hapus Kategori Prestasi',
      description: 'Apakah Anda yakin ingin menghapus kategori penghargaan ini?',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });
    if (!ok) return;

    try {
      await kesiswaanApi.deleteJenisPrestasi(id);
      toast.success('Kategori prestasi berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: kesiswaanQueryKeys.jenisPrestasi() });
      refetchA();
    } catch {
      toast.error('Gagal menghapus kategori prestasi');
    }
  }, [confirm, queryClient, refetchA]);

  const renderViolationCard = useCallback((item: JenisPelanggaran) => (
    <div
      key={item.id}
      className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 dark:bg-rose-950/40 flex items-center justify-center text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <ShieldAlert size={15} />
          </div>
          <div>
            <Badge variant="outline" className="text-[9px] font-bold uppercase">
              {item.kategori}
            </Badge>
            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white mt-1">
              {item.nama_pelanggaran}
            </h4>
          </div>
        </div>
        <span className={cn(
          "px-2.5 py-1 text-xs font-black rounded-xl border shrink-0",
          item.poin >= 50
            ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border-rose-500/20"
            : "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border-amber-500/20"
        )}>
          +{item.poin} Poin
        </span>
      </div>

      <div className="flex items-center justify-end gap-1 pt-2 border-t border-slate-100 dark:border-slate-800/60">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setVId(item.id);
            setVForm({ kategori: item.kategori, nama_pelanggaran: item.nama_pelanggaran, poin: item.poin });
            setViolationModalOpen(true);
          }}
          className="h-8 px-2.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center gap-1"
        >
          <Edit2 size={13} />
          <span>Edit</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleVDelete(item.id)}
          className="h-8 px-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1"
        >
          <Trash2 size={13} />
          <span>Hapus</span>
        </Button>
      </div>
    </div>
  ), [handleVDelete]);

  const renderAchievementCard = useCallback((item: JenisPrestasi) => (
    <div
      key={item.id}
      className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Trophy size={15} />
          </div>
          <div>
            <Badge variant="outline" className="text-[9px] font-bold uppercase">
              {item.kategori}
            </Badge>
            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white mt-1">
              {item.nama_prestasi}
            </h4>
          </div>
        </div>
        <span className="px-2.5 py-1 text-xs font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20 shrink-0">
          +{item.poin} Poin
        </span>
      </div>

      <div className="flex items-center justify-end gap-1 pt-2 border-t border-slate-100 dark:border-slate-800/60">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setAId(item.id);
            setAForm({ kategori: item.kategori, nama_prestasi: item.nama_prestasi, poin: item.poin });
            setAchievementModalOpen(true);
          }}
          className="h-8 px-2.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center gap-1"
        >
          <Edit2 size={13} />
          <span>Edit</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleADelete(item.id)}
          className="h-8 px-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1"
        >
          <Trash2 size={13} />
          <span>Hapus</span>
        </Button>
      </div>
    </div>
  ), [handleADelete]);

  const violationColumns: Column[] = useMemo(() => [
    {
      key: 'kategori',
      label: 'Tingkat',
      sortable: true,
      render: (value: unknown) => {
        const val = String(value || '');
        const variant = val === 'BERAT' ? 'destructive' : val === 'SEDANG' ? 'warning' : 'info';
        return (
          <Badge variant={variant} className="text-[9px] font-bold uppercase">
            {val}
          </Badge>
        );
      }
    },
    {
      key: 'nama_pelanggaran',
      label: 'Jenis Pelanggaran',
      sortable: true,
      render: (value: unknown) => <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{String(value || '')}</span>
    },
    {
      key: 'poin',
      label: 'Bobot Poin',
      sortable: true,
      render: (value: unknown) => <span className="text-xs font-bold text-rose-500 font-mono">+{Number(value || 0)} Poin</span>
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_: unknown, item: JenisPelanggaran) => (
        <div className="flex gap-1 justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setVId(item.id);
              setVForm({ kategori: item.kategori, nama_pelanggaran: item.nama_pelanggaran, poin: item.poin });
              setViolationModalOpen(true);
            }}
            className="w-7 h-7 text-indigo-600 hover:bg-indigo-50"
            title="Edit"
          >
            <Edit2 size={12} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleVDelete(item.id)}
            className="w-7 h-7 text-rose-600 hover:bg-rose-50"
            title="Hapus"
          >
            <Trash2 size={12} />
          </Button>
        </div>
      )
    }
  ], [handleVDelete]);

  const achievementColumns: Column[] = useMemo(() => [
    {
      key: 'kategori',
      label: 'Kategori',
      sortable: true,
      render: (value: unknown) => (
        <Badge variant="outline" className="text-[9px] font-bold uppercase">
          {String(value || '')}
        </Badge>
      )
    },
    {
      key: 'nama_prestasi',
      label: 'Kategori Prestasi',
      sortable: true,
      render: (value: unknown) => <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{String(value || '')}</span>
    },
    {
      key: 'poin',
      label: 'Poin Penghargaan',
      sortable: true,
      render: (value: unknown) => <span className="text-xs font-bold text-emerald-500 font-mono">+{Number(value || 0)} Poin</span>
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_: unknown, item: JenisPrestasi) => (
        <div className="flex gap-1 justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setAId(item.id);
              setAForm({ kategori: item.kategori, nama_prestasi: item.nama_prestasi, poin: item.poin });
              setAchievementModalOpen(true);
            }}
            className="w-7 h-7 text-indigo-600 hover:bg-indigo-50"
            title="Edit"
          >
            <Edit2 size={12} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleADelete(item.id)}
            className="w-7 h-7 text-rose-600 hover:bg-rose-50"
            title="Hapus"
          >
            <Trash2 size={12} />
          </Button>
        </div>
      )
    }
  ], [handleADelete]);

  const tabs = useMemo(() => [
    { id: 'pelanggaran', label: 'Kategori Pelanggaran & Poin' },
    { id: 'prestasi', label: 'Kategori Prestasi & Poin' }
  ], []);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center">
        <Loader className="mb-4" />
        <p className="text-xs text-slate-400">Menghubungkan Pengaturan Kategori...</p>
      </div>
    );
  }

  return (
    <Card className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 rounded-2xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            Pengaturan Kategori Kasus & Prestasi Siswa
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Konfigurasi bobot poin pelanggaran (kedisiplinan) dan poin penghargaan (prestasi)
          </p>
        </div>
        <Button
          variant="toolbarPrimary"
          size="toolbar"
          onClick={() => {
            if (activeTab === 'pelanggaran') {
              setVId(null);
              setVForm({ kategori: 'RINGAN', nama_pelanggaran: '', poin: 10 });
              setViolationModalOpen(true);
            } else {
              setAId(null);
              setAForm({ kategori: 'AKADEMIK', nama_prestasi: '', poin: 10 });
              setAchievementModalOpen(true);
            }
          }}
          className="flex items-center gap-1.5 font-bold rounded-xl shadow-md"
        >
          <Plus className="w-3.5 h-3.5" />
          {activeTab === 'pelanggaran' ? 'Tambah Pelanggaran' : 'Tambah Prestasi'}
        </Button>
      </div>

      <TabSwitcher
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as 'pelanggaran' | 'prestasi')}
        tabs={tabs}
      />

      {activeTab === 'pelanggaran' ? (
        <div className="space-y-4">
          {isMobile ? (
            <MobileAcademicList
              title="Daftar Kategori Pelanggaran"
              data={paginatedViolations}
              loading={loadingV}
              totalItems={violations.length}
              emptyMessage="Belum ada kategori pelanggaran yang didaftarkan."
              pagination={{
                currentPage: vPage,
                totalPages: Math.max(1, Math.ceil(violations.length / vLimit)),
                totalItems: violations.length,
                itemsPerPage: vLimit,
                onPageChange: setVPage,
                onLimitChange: (limit) => { setVLimit(limit); setVPage(1); }
              }}
              renderCard={renderViolationCard}
            />
          ) : (
            <Table
              columns={violationColumns}
              data={paginatedViolations}
              sortBy={vSortBy}
              sortOrder={vSortOrder}
              onSort={(col, dir) => { setVSortBy(col); setVSortOrder(dir); }}
              emptyMessage="Belum ada kategori pelanggaran yang didaftarkan."
              pagination={{
                currentPage: vPage,
                totalPages: Math.max(1, Math.ceil(violations.length / vLimit)),
                totalItems: violations.length,
                itemsPerPage: vLimit,
                onPageChange: setVPage,
                onLimitChange: (limit) => { setVLimit(limit); setVPage(1); }
              }}
            />
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {isMobile ? (
            <MobileAcademicList
              title="Daftar Kategori Prestasi"
              data={paginatedAchievements}
              loading={loadingA}
              totalItems={achievements.length}
              emptyMessage="Belum ada kategori prestasi yang didaftarkan."
              pagination={{
                currentPage: aPage,
                totalPages: Math.max(1, Math.ceil(achievements.length / aLimit)),
                totalItems: achievements.length,
                itemsPerPage: aLimit,
                onPageChange: setAPage,
                onLimitChange: (limit) => { setALimit(limit); setAPage(1); }
              }}
              renderCard={renderAchievementCard}
            />
          ) : (
            <Table
              columns={achievementColumns}
              data={paginatedAchievements}
              sortBy={aSortBy}
              sortOrder={aSortOrder}
              onSort={(col, dir) => { setASortBy(col); setASortOrder(dir); }}
              emptyMessage="Belum ada kategori prestasi yang didaftarkan."
              pagination={{
                currentPage: aPage,
                totalPages: Math.max(1, Math.ceil(achievements.length / aLimit)),
                totalItems: achievements.length,
                itemsPerPage: aLimit,
                onPageChange: setAPage,
                onLimitChange: (limit) => { setALimit(limit); setAPage(1); }
              }}
            />
          )}
        </div>
      )}

      {/* Lazy Loaded Modals */}
      <Suspense fallback={null}>
        {violationModalOpen && (
          <Modal
            isOpen={violationModalOpen}
            onClose={() => setViolationModalOpen(false)}
            title={vId ? 'Edit Kategori Pelanggaran' : 'Tambah Kategori Pelanggaran Baru'}
            size="sm"
          >
            <form onSubmit={handleVSubmit} className="space-y-4 py-2 text-xs">
              <div>
                <Label htmlFor="tingkat-pelanggaran" className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Tingkat Pelanggaran</Label>
                <SearchableSelect
                  id="tingkat-pelanggaran"
                  aria-label="Pilih tingkat pelanggaran"
                  options={[
                    { value: 'RINGAN', label: 'Ringan' },
                    { value: 'SEDANG', label: 'Sedang' },
                    { value: 'BERAT', label: 'Berat' }
                  ]}
                  value={vForm.kategori}
                  onValueChange={(val) => setVForm(prev => ({ ...prev, kategori: val }))}
                  className="rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="nama-pelanggaran" className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Jenis / Nama Pelanggaran</Label>
                <Input
                  id="nama-pelanggaran"
                  aria-label="Nama pelanggaran"
                  placeholder="Contoh: Terlambat masuk sekolah, atribut tidak lengkap"
                  value={vForm.nama_pelanggaran}
                  onChange={(e) => setVForm(prev => ({ ...prev, nama_pelanggaran: e.target.value }))}
                  className="rounded-xl"
                  required
                />
              </div>
              <div>
                <Label htmlFor="poin-pelanggaran" className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Bobot Poin Pelanggaran</Label>
                <Input
                  id="poin-pelanggaran"
                  aria-label="Bobot poin pelanggaran"
                  type="number"
                  min="1"
                  value={vForm.poin || ''}
                  onChange={(e) => setVForm(prev => ({ ...prev, poin: parseInt(e.target.value) || 0 }))}
                  className="rounded-xl"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="toolbarOutline" size="toolbar" onClick={() => setViolationModalOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" variant="toolbarPrimary" size="toolbar">
                  Simpan Kategori
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {achievementModalOpen && (
          <Modal
            isOpen={achievementModalOpen}
            onClose={() => setAchievementModalOpen(false)}
            title={aId ? 'Edit Kategori Prestasi' : 'Tambah Kategori Prestasi Baru'}
            size="sm"
          >
            <form onSubmit={handleASubmit} className="space-y-4 py-2 text-xs">
              <div>
                <Label htmlFor="kategori-prestasi" className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Kategori Kegiatan</Label>
                <SearchableSelect
                  id="kategori-prestasi"
                  aria-label="Pilih kategori kegiatan"
                  options={[
                    { value: 'AKADEMIK', label: 'Akademik' },
                    { value: 'NON-AKADEMIK', label: 'Non-Akademik' },
                    { value: 'KARAKTER', label: 'Karakter / Sikap Baik' }
                  ]}
                  value={aForm.kategori}
                  onValueChange={(val) => setAForm(prev => ({ ...prev, kategori: val }))}
                  className="rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="nama-prestasi" className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Nama / Kategori Penghargaan</Label>
                <Input
                  id="nama-prestasi"
                  aria-label="Nama prestasi"
                  placeholder="Contoh: Juara 1 Tingkat Kabupaten, Siswa Teladan"
                  value={aForm.nama_prestasi}
                  onChange={(e) => setAForm(prev => ({ ...prev, nama_prestasi: e.target.value }))}
                  className="rounded-xl"
                  required
                />
              </div>
              <div>
                <Label htmlFor="poin-prestasi" className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Poin Penghargaan (Reward)</Label>
                <Input
                  id="poin-prestasi"
                  aria-label="Poin penghargaan prestasi"
                  type="number"
                  min="1"
                  value={aForm.poin || ''}
                  onChange={(e) => setAForm(prev => ({ ...prev, poin: parseInt(e.target.value) || 0 }))}
                  className="rounded-xl"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="toolbarOutline" size="toolbar" onClick={() => setAchievementModalOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" variant="toolbarPrimary" size="toolbar">
                  Simpan Kategori
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </Suspense>
    </Card>
  );
});

export default SettingsSection;
