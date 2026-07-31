import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Search,
  GraduationCap,
  Filter,
  LayoutGrid,
  Table as TableIcon,
  X,
  Layers
} from 'lucide-react';
import {
  getGlobalPresets,
  createGlobalPreset,
  updateGlobalPreset,
  deleteGlobalPreset,
} from '../../api/academic/mapel.api';
import type { GlobalMapelPreset } from '../../api/academic/mapel.api';
import { Button, Input, Modal, Badge } from '../../components/ui';
import toast from 'react-hot-toast';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import useConfirm from '../../hooks/useConfirm';

const JENJANG_OPTIONS = ['SD', 'MI', 'SMP', 'MTs', 'SMA', 'MA', 'SMK', 'MAK'];

const getCategoryBadge = (category: string) => {
  const c = category.toUpperCase();
  let cls = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  
  if (c.includes('UMUM')) {
    cls = 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
  } else if (c.includes('KEJURUAN') || c.includes('PRODUCTIVE') || c.includes('RPL') || c.includes('TKJ') || c.includes('AKL')) {
    cls = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
  } else if (c.includes('MULOK') || c.includes('LOKAL')) {
    cls = 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-800';
  } else if (c.includes('PILIHAN') || c.includes('PEMINATAN')) {
    cls = 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${cls}`}>
      {category}
    </span>
  );
};

const getJenjangBadge = (jenjang: string) => {
  const j = jenjang.toUpperCase();
  let cls = 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800';
  if (j === 'SMK' || j === 'MAK') {
    cls = 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800';
  } else if (j === 'SMA' || j === 'MA') {
    cls = 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border-violet-200 dark:border-violet-800';
  } else if (j === 'SMP' || j === 'MTS') {
    cls = 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-800';
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${cls}`}>
      {jenjang}
    </span>
  );
};

const EMPTY_FORM = { jenjang: '', category: '', nama_mapel: '', kode_mapel: '' };

export const MapelPresetsPage: React.FC = () => {
  const confirm = useConfirm();
  const [presets, setPresets] = useState<GlobalMapelPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterJenjang, setFilterJenjang] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<GlobalMapelPreset | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchPresets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getGlobalPresets();
      if (res.success) setPresets(res.data);
    } catch {
      toast.error('Gagal memuat preset global');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPresets(); }, [fetchPresets]);

  const handleOpenCreate = useCallback(() => {
    setEditingPreset(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((preset: GlobalMapelPreset) => {
    setEditingPreset(preset);
    setForm({ jenjang: preset.jenjang, category: preset.category, nama_mapel: preset.nama_mapel, kode_mapel: preset.kode_mapel });
    setModalOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.jenjang || !form.category || !form.nama_mapel || !form.kode_mapel) {
      toast.error('Semua field wajib diisi.');
      return;
    }
    try {
      setSaving(true);
      if (editingPreset) {
        await updateGlobalPreset(editingPreset.id, form);
        toast.success('Preset berhasil diperbarui.');
      } else {
        await createGlobalPreset(form);
        toast.success('Preset berhasil ditambahkan.');
      }
      setModalOpen(false);
      fetchPresets();
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menyimpan preset');
    } finally {
      setSaving(false);
    }
  }, [editingPreset, form, fetchPresets]);

  const handleDelete = useCallback(async (preset: GlobalMapelPreset) => {
    const ok = await confirm({
      title: 'Hapus Preset',
      description: `Hapus preset "${preset.nama_mapel}" (${preset.jenjang})? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Hapus',
      cancelText: 'Batal',
      style: 'danger',
    });
    if (!ok) return;
    try {
      await deleteGlobalPreset(preset.id);
      toast.success('Preset dihapus.');
      fetchPresets();
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menghapus preset');
    }
  }, [confirm, fetchPresets]);

  // Dynamic Category Options for filter dropdown
  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    presets.forEach(p => { if (p.category) set.add(p.category); });
    return Array.from(set).sort();
  }, [presets]);

  const filtered = useMemo(() => {
    return presets.filter(p => {
      const matchSearch = !searchTerm ||
        p.nama_mapel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.kode_mapel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.jenjang.toLowerCase().includes(searchTerm.toLowerCase());
      const matchJenjang = !filterJenjang || p.jenjang === filterJenjang;
      const matchCategory = !filterCategory || p.category === filterCategory;
      return matchSearch && matchJenjang && matchCategory;
    });
  }, [presets, searchTerm, filterJenjang, filterCategory]);

  const grouped = useMemo(() => {
    const res: Record<string, Record<string, GlobalMapelPreset[]>> = {};
    filtered.forEach(p => {
      if (!res[p.jenjang]) res[p.jenjang] = {};
      if (!res[p.jenjang][p.category]) res[p.jenjang][p.category] = [];
      res[p.jenjang][p.category].push(p);
    });
    return res;
  }, [filtered]);

  const totalJenjang = useMemo(() => [...new Set(presets.map(p => p.jenjang))].length, [presets]);
  const totalCategories = useMemo(() => [...new Set(presets.map(p => p.category))].length, [presets]);

  const hasActiveFilters = !!(searchTerm || filterJenjang || filterCategory);

  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setFilterJenjang('');
    setFilterCategory('');
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-500 to-blue-600 text-white p-3 rounded-2xl shadow-lg shadow-indigo-500/20">
            <BookOpen size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Katalog Preset Mata Pelajaran</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Kelola template mapel global Kurikulum Merdeka & K13 untuk semua jenjang sekolah</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={handleOpenCreate}
            className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none uppercase tracking-wider"
          >
            <Plus size={15} />
            Tambah Preset
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Preset', value: presets.length, icon: <BookOpen size={16} />, gradient: 'from-blue-500 to-indigo-700 text-white' },
          { label: 'Jenjang Terdaftar', value: totalJenjang, icon: <GraduationCap size={16} />, gradient: 'from-purple-500 to-violet-700 text-white' },
          { label: 'Kategori Mapel', value: totalCategories, icon: <Layers size={16} />, gradient: 'from-emerald-500 to-teal-700 text-white' },
        ].map(stat => (
          <AnalyticsCard
            key={stat.label}
            title={stat.label}
            value={stat.value}
            icon={stat.icon}
            gradient={stat.gradient}
            isLoading={loading}
          />
        ))}
      </div>

      {/* Toolbar Filter Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 space-y-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          
          {/* Search bar */}
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari preset, kode mapel, atau kategori..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-10 pr-4 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter selects & View switcher */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Filter Jenjang */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider hidden sm:inline">Jenjang:</span>
              <select
                value={filterJenjang}
                onChange={e => setFilterJenjang(e.target.value)}
                className="h-10 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="">Semua Jenjang</option>
                {JENJANG_OPTIONS.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>

            {/* Filter Kategori */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider hidden sm:inline">Kategori:</span>
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="h-10 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="">Semua Kategori</option>
                {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Reset Filters button */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                onClick={resetFilters}
                className="h-10 px-3 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl"
              >
                <X size={14} className="mr-1" /> Reset Filter
              </Button>
            )}

            <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block"></div>

            {/* Refresh */}
            <Button
              variant="toolbarOutline"
              onClick={fetchPresets}
              disabled={loading}
              className="h-10 w-10 p-0 flex items-center justify-center rounded-xl border-slate-200 dark:border-slate-700"
              title="Muat ulang data"
            >
              <RefreshCw className={`w-4 h-4 text-slate-600 dark:text-slate-300 ${loading ? 'animate-spin' : ''}`} />
            </Button>

            {/* View Mode Switcher Toggle */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Tampilan Tabel"
              >
                <TableIcon size={15} />
                <span className="hidden sm:inline text-[10px] font-black uppercase">Tabel</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Tampilan Kartu"
              >
                <LayoutGrid size={15} />
                <span className="hidden sm:inline text-[10px] font-black uppercase">Kartu</span>
              </button>
            </div>
          </div>
        </div>

        {/* Active Filter Badges */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filter Aktif:</span>
            {searchTerm && (
              <span className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-lg font-bold text-[10px]">
                Pencarian: "{searchTerm}"
                <X size={12} className="cursor-pointer hover:text-indigo-900" onClick={() => setSearchTerm('')} />
              </span>
            )}
            {filterJenjang && (
              <span className="inline-flex items-center gap-1 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 px-2.5 py-0.5 rounded-lg font-bold text-[10px]">
                Jenjang: {filterJenjang}
                <X size={12} className="cursor-pointer hover:text-purple-900" onClick={() => setFilterJenjang('')} />
              </span>
            )}
            {filterCategory && (
              <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-lg font-bold text-[10px]">
                Kategori: {filterCategory}
                <X size={12} className="cursor-pointer hover:text-emerald-900" onClick={() => setFilterCategory('')} />
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
          <RefreshCw className="animate-spin text-indigo-600 mr-2 mb-2" size={24} />
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Memuat katalog preset mata pelajaran...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
          <BookOpen size={48} className="mx-auto text-slate-300 dark:text-slate-700" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Tidak ada preset mata pelajaran yang cocok dengan filter.</p>
          {hasActiveFilters && (
            <Button onClick={resetFilters} variant="outline" className="rounded-xl text-xs font-bold">
              Bersihkan Filter
            </Button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW MODE */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in duration-300">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Daftar Preset Mapel Global ({filtered.length} Data)
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase">
              Menampilkan {filtered.length} dari total {presets.length} preset
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-4 py-3 text-center w-12">No</th>
                  <th className="px-4 py-3 w-28">Jenjang</th>
                  <th className="px-4 py-3 w-48">Kategori / Kelompok</th>
                  <th className="px-4 py-3">Nama Mata Pelajaran</th>
                  <th className="px-4 py-3 w-32 font-mono">Kode Mapel</th>
                  <th className="px-4 py-3 text-center w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {filtered.map((preset, index) => (
                  <tr
                    key={preset.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group"
                  >
                    <td className="px-4 py-3.5 text-center text-xs font-bold text-slate-400">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3.5">
                      {getJenjangBadge(preset.jenjang)}
                    </td>
                    <td className="px-4 py-3.5">
                      {getCategoryBadge(preset.category)}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {preset.nama_mapel}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px] font-bold rounded-md border border-slate-200 dark:border-slate-700">
                        {preset.kode_mapel}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEdit(preset)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-400 hover:text-blue-600 transition-colors"
                          title="Edit Preset"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(preset)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Hapus Preset"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-slate-50/50 dark:bg-slate-950/30 border-t border-slate-100 dark:border-slate-800 text-right">
            <span className="text-[10px] text-slate-400 font-bold uppercase">
              Total {filtered.length} Preset Terdaftar
            </span>
          </div>
        </div>
      ) : (
        /* GRID / CARD VIEW MODE */
        <div className="space-y-6 animate-in fade-in duration-300">
          {Object.entries(grouped).map(([jenjang, categories]) => (
            <div key={jenjang} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                <GraduationCap size={16} className="text-slate-600 dark:text-slate-300" />
                <span className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">{jenjang}</span>
                <Badge variant="info" size="sm">{Object.values(categories).flat().length} preset</Badge>
              </div>
              <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {Object.entries(categories).map(([category, items]) => (
                  <div key={category} className="px-5 py-4">
                    <div className="flex items-center gap-2 mb-3">
                      {getCategoryBadge(category)}
                      <span className="text-xs text-slate-400 font-bold">({items.length} mapel)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {items.map(preset => (
                        <div
                          key={preset.id}
                          className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-all group"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{preset.nama_mapel}</p>
                            <p className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">{preset.kode_mapel}</p>
                          </div>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleOpenEdit(preset)}
                              className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-slate-400 hover:text-blue-600 transition-colors"
                              title="Edit"
                            >
                              <Edit size={13} />
                            </button>
                            <button
                              onClick={() => handleDelete(preset)}
                              className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-600 transition-colors"
                              title="Hapus"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editingPreset ? 'Edit Preset Mapel' : 'Tambah Preset Mapel Baru'}
        size="md"
      >
        <div className="space-y-4 pt-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Jenjang Sekolah <span className="text-red-500">*</span>
            </label>
            <select
              value={form.jenjang}
              onChange={e => setForm(f => ({ ...f, jenjang: e.target.value }))}
              className="w-full h-10 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Pilih Jenjang...</option>
              {JENJANG_OPTIONS.map(j => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Kategori / Kelompok Mapel <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              placeholder="Contoh: UMUM, KEJURUAN, MULOK, PILIHAN, dll."
              className="h-10 text-sm font-bold rounded-xl"
            />
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Gunakan nama kelompok konsisten. Untuk kejuruan, isi nama jurusan (misal: RPL).</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Nama Mata Pelajaran <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.nama_mapel}
              onChange={e => setForm(f => ({ ...f, nama_mapel: e.target.value }))}
              placeholder="Contoh: Pemrograman Web"
              className="h-10 text-sm font-bold rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Kode Mapel <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.kode_mapel}
              onChange={e => setForm(f => ({ ...f, kode_mapel: e.target.value.toUpperCase() }))}
              placeholder="Contoh: WEB"
              className="h-10 text-sm font-black rounded-xl font-mono"
            />
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Kode akan digabung dengan singkatan jurusan dan prefix sekolah saat digunakan.</p>
          </div>
          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              variant="outline"
              className="rounded-xl px-5 font-bold text-xs"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center gap-2"
            >
              {saving && <RefreshCw size={13} className="animate-spin" />}
              {editingPreset ? 'Simpan Perubahan' : 'Tambah Preset'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MapelPresetsPage;
