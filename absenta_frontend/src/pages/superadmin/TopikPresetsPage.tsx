import React, { useState, useCallback, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Search,
  BookOpen,
  Filter,
  GraduationCap,
  Layers,
} from 'lucide-react';
import { kurikulumApi } from '../../api/kurikulum.api';
import { Button, Input, Modal, Badge } from '../../components/ui';
import toast from 'react-hot-toast';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import useConfirm from '../../hooks/useConfirm';
import { JENJANG_TINGKAT_MAP } from './LibraryTemplatesPage';


interface GlobalTopikPresetItem {
  id: string;
  jenjang: string;
  nama_mapel: string;
  kode_mapel?: string;
  fase?: string;
  tingkat?: number;
  judul_topik: string;
  deskripsi?: string;
  kategori: string;
}

const JENJANG_OPTIONS = ['SD', 'MI', 'SMP', 'MTs', 'SMA', 'MA', 'SMK', 'MAK', 'ALL'];

const EMPTY_FORM = {
  jenjang: 'SMK',
  nama_mapel: '',
  kode_mapel: '',
  fase: 'E',
  tingkat: 10,
  judul_topik: '',
  deskripsi: '',
  kategori: 'UMUM',
};

export const TopikPresetsPage: React.FC = () => {
  const confirm = useConfirm();
  const [presets, setPresets] = useState<GlobalTopikPresetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterJenjang, setFilterJenjang] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const fetchPresets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await kurikulumApi.getTopikPresets({
        jenjang: filterJenjang || undefined,
      });
      if (res?.success) {
        setPresets(res.data || []);
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat preset topik');
    } finally {
      setLoading(false);
    }
  }, [filterJenjang]);

  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: GlobalTopikPresetItem) => {
    setEditingId(item.id);
    setFormData({
      jenjang: item.jenjang || 'SMK',
      nama_mapel: item.nama_mapel || '',
      kode_mapel: item.kode_mapel || '',
      fase: item.fase || 'E',
      tingkat: item.tingkat || 10,
      judul_topik: item.judul_topik || '',
      deskripsi: item.deskripsi || '',
      kategori: item.kategori || 'UMUM',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_mapel || !formData.judul_topik) {
      toast.error('Nama mapel dan Judul topik wajib diisi');
      return;
    }

    try {
      if (editingId) {
        await kurikulumApi.updateTopikPreset(editingId, {
          ...formData,
          tingkat: Number(formData.tingkat),
        });
        toast.success('Preset topik berhasil diperbarui');
      } else {
        await kurikulumApi.createTopikPreset({
          ...formData,
          tingkat: Number(formData.tingkat),
        });
        toast.success('Preset topik baru berhasil ditambahkan');
      }
      setIsModalOpen(false);
      fetchPresets();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan preset topik');
    }
  };

  const handleDelete = async (id: string, judul: string) => {
    const isOk = await confirm({
      title: 'Hapus Preset Topik AI',
      message: `Apakah Anda yakin ingin menghapus topik "${judul}" dari database global?`,
      confirmText: 'Ya, Hapus Topik',
      style: 'danger',
    });
    if (!isOk) return;

    try {
      await kurikulumApi.deleteTopikPreset(id);
      toast.success('Preset topik berhasil dihapus');
      fetchPresets();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus preset topik');
    }
  };

  const filteredPresets = presets.filter((item) => {
    const matchesSearch =
      item.judul_topik.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.nama_mapel.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesJenjang = !filterJenjang || item.jenjang === filterJenjang;
    return matchesSearch && matchesJenjang;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-amber-500 fill-amber-400" />
            Katalog Preset Topik AI (Kurikulum Merdeka)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola data rekomendasi topik materi pembelajaran berbasis AI secara terpusat untuk seluruh sekolah platform.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchPresets} disabled={loading} className="gap-2 rounded-xl">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleOpenCreate} className="gap-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-md shadow-violet-500/20">
            <Plus className="w-4 h-4" />
            Tambah Preset Topik
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnalyticsCard
          title="Total Preset Topik AI"
          value={presets.length}
          icon={<Sparkles size={16} />}
          gradient="from-amber-500 to-orange-600 text-white"
          isLoading={loading}
        />
        <AnalyticsCard
          title="Cakupan Mata Pelajaran"
          value={new Set(presets.map((p) => p.nama_mapel)).size}
          icon={<BookOpen size={16} />}
          gradient="from-blue-500 to-indigo-600 text-white"
          isLoading={loading}
        />
        <AnalyticsCard
          title="Topik Umum (KBM)"
          value={presets.filter((p) => p.kategori === 'UMUM' || p.kategori === 'KBM').length}
          icon={<Layers size={16} />}
          gradient="from-emerald-500 to-teal-600 text-white"
          isLoading={loading}
        />
        <AnalyticsCard
          title="Topik Kejuruan & P5"
          value={presets.filter((p) => p.kategori === 'KEJURUAN' || p.kategori === 'P5').length}
          icon={<GraduationCap size={16} />}
          gradient="from-purple-500 to-violet-600 text-white"
          isLoading={loading}
        />
      </div>


      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari topik atau mapel..."
            className="pl-9 text-xs rounded-xl"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterJenjang}
            onChange={(e) => setFilterJenjang(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none font-semibold"
          >
            <option value="">Semua Jenjang</option>
            {JENJANG_OPTIONS.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3.5">Jenjang</th>
                <th className="p-3.5">Mata Pelajaran</th>
                <th className="p-3.5">Fase & Kelas</th>
                <th className="p-3.5">Judul Topik Pembelajaran AI</th>
                <th className="p-3.5">Kategori</th>
                <th className="p-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Memuat data preset topik...
                  </td>
                </tr>
              ) : filteredPresets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Belum ada data preset topik untuk filter ini.
                  </td>
                </tr>
              ) : (
                filteredPresets.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5">
                      <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 font-bold text-[10px]">
                        {item.jenjang}
                      </Badge>
                    </td>
                    <td className="p-3.5 font-bold text-slate-900 dark:text-slate-100">
                      {item.nama_mapel}
                      {item.kode_mapel && <span className="text-[10px] text-slate-400 font-normal ml-1">({item.kode_mapel})</span>}
                    </td>
                    <td className="p-3.5 font-medium text-slate-600 dark:text-slate-300">
                      {item.tingkat ? `Kelas ${item.tingkat}` : '-'} {item.fase ? `(Fase ${item.fase})` : ''}
                    </td>
                    <td className="p-3.5 font-medium text-slate-800 dark:text-slate-200 max-w-md">
                      {item.judul_topik}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.kategori === 'KEJURUAN'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                          : item.kategori === 'P5'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : 'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300'
                      }`}>
                        {item.kategori}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenEdit(item)}
                        className="h-8 w-8 p-0 text-slate-500 hover:text-violet-600"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(item.id, item.judul_topik)}
                        className="h-8 w-8 p-0 text-slate-500 hover:text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Preset Topik AI' : 'Tambah Preset Topik AI Baru'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Jenjang *</label>
              <select
                value={formData.jenjang}
                onChange={(e) => setFormData({ ...formData, jenjang: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none font-medium"
              >
                {JENJANG_OPTIONS.map((j) => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Kategori Topik *</label>
              <select
                value={formData.kategori}
                onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none font-medium"
              >
                <option value="UMUM">UMUM (KBM Reguler)</option>
                <option value="KEJURUAN">KEJURUAN (SMK/MAK)</option>
                <option value="P5">PROJEK P5</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Mata Pelajaran *</label>
              <Input
                value={formData.nama_mapel}
                onChange={(e) => setFormData({ ...formData, nama_mapel: e.target.value })}
                placeholder="Contoh: Bahasa Inggris / Matematika"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Kode Mapel (Opsional)</label>
              <Input
                value={formData.kode_mapel}
                onChange={(e) => setFormData({ ...formData, kode_mapel: e.target.value })}
                placeholder="Contoh: ING / MTK"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tingkat Kelas *</label>
              {(() => {
                const options = JENJANG_TINGKAT_MAP[formData.jenjang] || JENJANG_TINGKAT_MAP['SMK'];
                return (
                  <select
                    value={formData.tingkat}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const match = options.find((o) => o.tingkat === val);
                      setFormData({
                        ...formData,
                        tingkat: val,
                        fase: match?.fase || formData.fase
                      });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-violet-500 outline-none font-bold"
                  >
                    {options.map((opt) => (
                      <option key={opt.tingkat} value={opt.tingkat}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                );
              })()}
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Fase Kurikulum Merdeka (Auto)</label>
              <div className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 font-bold text-violet-700 dark:text-violet-300 flex items-center justify-between">
                <span>Fase {formData.fase || 'E'}</span>
                <Badge className="bg-violet-200 dark:bg-violet-900 text-violet-900 dark:text-violet-200 text-[10px]">
                  Auto-Sync
                </Badge>
              </div>
            </div>
          </div>


          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Judul Topik Pembelajaran AI *</label>
            <Input
              value={formData.judul_topik}
              onChange={(e) => setFormData({ ...formData, judul_topik: e.target.value })}
              placeholder="Contoh: Analytical Exposition Text & Public Speaking"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Deskripsi / Ruang Lingkup (Opsional)</label>
            <textarea
              rows={3}
              value={formData.deskripsi}
              onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
              placeholder="Ringkasan cakupan materi..."
              className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white">
              Simpan Preset
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TopikPresetsPage;
