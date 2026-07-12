import React, { useState, useCallback, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Search,
  GraduationCap,
  Filter,
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
import useConfirm from '../../hooks/useConfirm';

const JENJANG_OPTIONS = ['SMP', 'MTs', 'SMA', 'MA', 'SMK', 'MAK'];

const getCategoryBadge = (category: string) => {
  const commonCategories: Record<string, string> = {
    'Nilai Pancasila': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    'Bahasa Indonesia': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    'Matematika': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    'Bahasa Inggris': 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
    'PJOK': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    'Seni Budaya': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  };
  const cls = commonCategories[category] || 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${cls}`}>
      {category}
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

  const filtered = presets.filter(p => {
    const matchSearch = p.nama_mapel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.kode_mapel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchJenjang = !filterJenjang || p.jenjang === filterJenjang;
    return matchSearch && matchJenjang;
  });

  const grouped: Record<string, Record<string, GlobalMapelPreset[]>> = {};
  filtered.forEach(p => {
    if (!grouped[p.jenjang]) grouped[p.jenjang] = {};
    if (!grouped[p.jenjang][p.category]) grouped[p.jenjang][p.category] = [];
    grouped[p.jenjang][p.category].push(p);
  });

  const totalJenjang = [...new Set(presets.map(p => p.jenjang))].length;
  const totalCategories = [...new Set(presets.map(p => p.category))].length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
            <BookOpen size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">Katalog Preset Mata Pelajaran</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Kelola template mapel global Kurikulum Merdeka untuk semua jenjang sekolah</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total Preset', value: presets.length, icon: <BookOpen size={15} />, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Jenjang', value: totalJenjang, icon: <GraduationCap size={15} />, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
          { label: 'Kategori', value: totalCategories, icon: <Filter size={15} />, color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
        ].map(stat => (
          <div key={stat.label} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${stat.color}`}>{stat.icon}</div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{stat.value}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm mb-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 p-4">
          <div className="flex-1 relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Cari preset mapel..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-sm rounded-xl border-slate-200 dark:border-slate-700"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={filterJenjang}
              onChange={e => setFilterJenjang(e.target.value)}
              className="h-9 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Jenjang</option>
              {JENJANG_OPTIONS.map(j => <option key={j} value={j}>{j}</option>)}
            </select>
            <Button
              variant="toolbarOutline"
              size="toolbar"
              onClick={fetchPresets}
              disabled={loading}
              className="rounded-xl"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              onClick={handleOpenCreate}
              className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center gap-1.5 flex-shrink-0"
            >
              <Plus size={14} />
              Tambah Preset
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="animate-spin text-blue-500 mr-2" size={20} />
          <span className="text-slate-500 text-sm">Memuat preset...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Tidak ada preset ditemukan.</p>
        </div>
      ) : (
        <div className="space-y-6">
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
                      <span className="text-xs text-slate-400">({items.length} mapel)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {items.map(preset => (
                        <div
                          key={preset.id}
                          className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors group"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{preset.nama_mapel}</p>
                            <p className="text-[10px] font-mono text-slate-400">{preset.kode_mapel}</p>
                          </div>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleOpenEdit(preset)}
                              className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-slate-400 hover:text-blue-600 transition-colors"
                              title="Edit"
                            >
                              <Edit size={12} />
                            </button>
                            <button
                              onClick={() => handleDelete(preset)}
                              className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-600 transition-colors"
                              title="Hapus"
                            >
                              <Trash2 size={12} />
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
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Jenjang Sekolah <span className="text-red-500">*</span>
            </label>
            <select
              value={form.jenjang}
              onChange={e => setForm(f => ({ ...f, jenjang: e.target.value }))}
              className="w-full h-10 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Pilih Jenjang...</option>
              {JENJANG_OPTIONS.map(j => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Kategori / Kelompok Mapel <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              placeholder="Contoh: Matematika, RPL, TKJ, TBSM, dll."
              className="h-10 text-sm rounded-xl"
            />
            <p className="text-[10px] text-slate-400 mt-1">Gunakan nama kelompok konsisten. Untuk kejuruan, isi nama jurusan (misal: RPL).</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Nama Mata Pelajaran <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.nama_mapel}
              onChange={e => setForm(f => ({ ...f, nama_mapel: e.target.value }))}
              placeholder="Contoh: Pemrograman Web"
              className="h-10 text-sm rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Kode Mapel <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.kode_mapel}
              onChange={e => setForm(f => ({ ...f, kode_mapel: e.target.value.toUpperCase() }))}
              placeholder="Contoh: WEB"
              className="h-10 text-sm rounded-xl font-mono"
            />
            <p className="text-[10px] text-slate-400 mt-1">Kode akan digabung dengan singkatan jurusan dan prefix sekolah saat digunakan.</p>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              className="rounded-xl px-5"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl px-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2"
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
