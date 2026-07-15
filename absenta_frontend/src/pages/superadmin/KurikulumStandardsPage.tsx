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
  Clock,
  LayoutGrid,
  List,
} from 'lucide-react';
import { kurikulumApi, GlobalKurikulumStandard } from '../../api/kurikulum.api';
import { Button, Input, Modal, Badge } from '../../components/ui';
import toast from 'react-hot-toast';
import useConfirm from '../../hooks/useConfirm';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';

const JENJANG_OPTIONS = ['SD', 'SMP', 'SMA', 'SMK'];
const CATEGORY_OPTIONS = ['UMUM', 'KEJURUAN', 'MULOK', 'PILIHAN'];

const getCategoryBadge = (category?: string) => {
  if (!category) return null;
  const classes: Record<string, string> = {
    'UMUM': 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-300 border-blue-100 dark:border-blue-900/40',
    'KEJURUAN': 'bg-violet-50 text-violet-700 dark:bg-violet-950/20 dark:text-violet-300 border-violet-100 dark:border-violet-900/40',
    'MULOK': 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300 border-amber-100 dark:border-amber-900/40',
    'PILIHAN': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/40',
  };
  const cls = classes[category.toUpperCase()] || 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-100 dark:border-slate-700';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-bold tracking-wide uppercase ${cls}`}>
      {category}
    </span>
  );
};

const EMPTY_FORM = { jenjang: '', category: 'UMUM', nama_mapel: '', kode_mapel: '', tingkat: 10, jp_per_minggu: 2 };

export const KurikulumStandardsPage: React.FC = () => {
  const confirm = useConfirm();
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [standards, setStandards] = useState<GlobalKurikulumStandard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterJenjang, setFilterJenjang] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStandard, setEditingStandard] = useState<GlobalKurikulumStandard | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchStandards = useCallback(async () => {
    try {
      setLoading(true);
      const res = await kurikulumApi.getStandardReferences();
      if (res.success) setStandards(res.data);
    } catch {
      toast.error('Gagal memuat acuan standar kurikulum');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStandards(); }, [fetchStandards]);

  const handleOpenCreate = useCallback(() => {
    setEditingStandard(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((standard: GlobalKurikulumStandard) => {
    setEditingStandard(standard);
    setForm({
      jenjang: standard.jenjang,
      category: standard.category || 'UMUM',
      nama_mapel: standard.nama_mapel,
      kode_mapel: standard.kode_mapel,
      tingkat: standard.tingkat,
      jp_per_minggu: standard.jp_per_minggu,
    });
    setModalOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.jenjang || !form.nama_mapel || !form.kode_mapel || form.tingkat === undefined || form.jp_per_minggu === undefined) {
      toast.error('Semua field bertanda bintang (*) wajib diisi.');
      return;
    }
    try {
      setSaving(true);
      if (editingStandard) {
        await kurikulumApi.updateStandardReference(editingStandard.id, form);
        toast.success('Acuan standar berhasil diperbarui.');
      } else {
        await kurikulumApi.createStandardReference(form);
        toast.success('Acuan standar baru berhasil ditambahkan.');
      }
      setModalOpen(false);
      fetchStandards();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal menyimpan acuan standar');
    } finally {
      setSaving(false);
    }
  }, [editingStandard, form, fetchStandards]);

  const handleDelete = useCallback(async (standard: GlobalKurikulumStandard) => {
    const ok = await confirm({
      title: 'Hapus Acuan Standar',
      description: `Hapus acuan standar "${standard.nama_mapel}" (Tingkat ${standard.tingkat} - ${standard.jenjang})? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Hapus',
      cancelText: 'Batal',
      style: 'danger',
    });
    if (!ok) return;
    try {
      await kurikulumApi.deleteStandardReference(standard.id);
      toast.success('Acuan standar berhasil dihapus.');
      fetchStandards();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal menghapus acuan standar');
    }
  }, [confirm, fetchStandards]);

  const filtered = standards.filter(s => {
    const matchSearch = s.nama_mapel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.kode_mapel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.category || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchJenjang = !filterJenjang || s.jenjang === filterJenjang;
    return matchSearch && matchJenjang;
  });

  // Group by jenjang -> tingkat -> standards
  const grouped: Record<string, Record<number, GlobalKurikulumStandard[]>> = {};
  filtered.forEach(s => {
    if (!grouped[s.jenjang]) grouped[s.jenjang] = {};
    if (!grouped[s.jenjang][s.tingkat]) grouped[s.jenjang][s.tingkat] = [];
    grouped[s.jenjang][s.tingkat].push(s);
  });

  const totalJenjang = [...new Set(standards.map(s => s.jenjang))].length;
  const totalTingkat = [...new Set(standards.map(s => s.tingkat))].length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
            <Clock size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">Katalog Standar Beban JP Kurikulum</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Kelola beban Jam Pelajaran (JP) resmi Permendikbudristek Nomor 12 Tahun 2024</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Acuan JP', value: standards.length, icon: <BookOpen size={16} />, gradient: 'from-indigo-500 to-indigo-700 text-white' },
          { label: 'Jenjang Tercover', value: totalJenjang, icon: <GraduationCap size={16} />, gradient: 'from-purple-500 to-purple-700 text-white' },
          { label: 'Tingkat Kelas', value: totalTingkat, icon: <Filter size={16} />, gradient: 'from-emerald-500 to-emerald-700 text-white' },
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

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm mb-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 p-4">
          <div className="flex-1 relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Cari mapel acuan..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-sm rounded-xl border-slate-200 dark:border-slate-700"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={filterJenjang}
              onChange={e => setFilterJenjang(e.target.value)}
              className="h-9 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Semua Jenjang</option>
              {JENJANG_OPTIONS.map(j => <option key={j} value={j}>{j}</option>)}
            </select>
            <Button
              variant="toolbarOutline"
              size="toolbar"
              onClick={fetchStandards}
              disabled={loading}
              className="rounded-xl"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            
            {/* View Mode Toggle */}
            <div className="flex border border-slate-200 dark:border-slate-700 rounded-xl p-0.5 bg-slate-50 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'grid' 
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
                title="Tampilan Grid"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'table' 
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
                title="Tampilan Tabel"
              >
                <List size={15} />
              </button>
            </div>

            <Button
              onClick={handleOpenCreate}
              className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-1.5 flex-shrink-0"
            >
              <Plus size={14} />
              Tambah Acuan JP
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="animate-spin text-indigo-500 mr-2" size={20} />
          <span className="text-slate-500 text-sm">Memuat acuan standar...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Clock size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Tidak ada acuan standar ditemukan.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([jenjang, tingkatGroup]) => (
            <div key={jenjang} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                <GraduationCap size={16} className="text-slate-600 dark:text-slate-300" />
                <span className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">JENJANG {jenjang}</span>
                <Badge variant="info" size="sm">
                  {Object.values(tingkatGroup).flat().length} acuan
                </Badge>
              </div>
              {viewMode === 'table' ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-black tracking-wider text-slate-400 dark:text-slate-500">
                        <th className="px-5 py-3.5 w-24">Kelas</th>
                        <th className="px-3 py-3.5 w-28">Kode</th>
                        <th className="px-3 py-3.5">Nama Mata Pelajaran</th>
                        <th className="px-3 py-3.5 w-40">Kelompok</th>
                        <th className="px-3 py-3.5 w-36 text-indigo-600 dark:text-indigo-400">Alokasi JP</th>
                        <th className="px-5 py-3.5 w-24 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/50 dark:divide-slate-800/40">
                      {Object.values(tingkatGroup)
                        .flat()
                        .sort((a, b) => {
                          if (a.tingkat !== b.tingkat) return a.tingkat - b.tingkat;
                          return a.nama_mapel.localeCompare(b.nama_mapel);
                        })
                        .map(standard => (
                          <tr key={standard.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition-all group">
                            <td className="px-5 py-3.5">
                              <span className="font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-0.5 rounded text-[10px] uppercase tracking-wider">
                                Kelas {standard.tingkat}
                              </span>
                            </td>
                            <td className="px-3 py-3.5">
                              <span className="font-mono bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded font-bold text-[9px] border border-slate-200 dark:border-slate-700/50">
                                {standard.kode_mapel}
                              </span>
                            </td>
                            <td className="px-3 py-3.5 font-bold text-slate-800 dark:text-slate-200">
                              {standard.nama_mapel}
                            </td>
                            <td className="px-3 py-3.5">
                              {getCategoryBadge(standard.category)}
                            </td>
                            <td className="px-3 py-3.5 font-extrabold text-slate-700 dark:text-slate-350">
                              {standard.jp_per_minggu} JP <span className="text-[10px] text-slate-450 dark:text-slate-500 font-normal">/ Minggu</span>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleOpenEdit(standard)}
                                  className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-450 hover:text-indigo-650 transition-colors"
                                  title="Edit"
                                >
                                  <Edit size={13} />
                                </button>
                                <button
                                  onClick={() => handleDelete(standard)}
                                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-450 hover:text-red-650 transition-colors"
                                  title="Hapus"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60 p-5 space-y-6">
                  {Object.entries(tingkatGroup)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([tingkat, items]) => (
                      <div key={tingkat} className="pt-4 first:pt-0">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg">
                            Kelas {tingkat}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                            ({items.length} mapel standar)
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {items.map(standard => (
                            <div
                              key={standard.id}
                              className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/30 hover:border-indigo-200 dark:hover:border-indigo-900/50 hover:bg-slate-100/50 dark:hover:bg-slate-800/60 transition-all group"
                            >
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{standard.nama_mapel}</p>
                                  {getCategoryBadge(standard.category)}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                                  <span className="font-mono bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1 py-0.2 rounded font-bold">{standard.kode_mapel}</span>
                                  <span>•</span>
                                  <span className="text-indigo-600 dark:text-indigo-400 font-black">{standard.jp_per_minggu} JP/Minggu</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleOpenEdit(standard)}
                                  className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-400 hover:text-indigo-650 transition-colors"
                                  title="Edit"
                                >
                                  <Edit size={13} />
                                </button>
                                <button
                                  onClick={() => handleDelete(standard)}
                                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-450 hover:text-red-650 transition-colors"
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
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editingStandard ? 'Edit Acuan JP Kurikulum' : 'Tambah Acuan JP Kurikulum'}
        size="md"
      >
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Jenjang <span className="text-red-500">*</span>
              </label>
              <select
                value={form.jenjang}
                onChange={e => setForm(f => ({ ...f, jenjang: e.target.value }))}
                className="w-full h-10 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="">Pilih Jenjang...</option>
                {JENJANG_OPTIONS.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Kelompok Mapel
              </label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full h-10 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Tingkat Kelas <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min={1}
                max={13}
                value={form.tingkat}
                onChange={e => setForm(f => ({ ...f, tingkat: Number(e.target.value) }))}
                placeholder="1 - 13"
                className="h-10 text-sm rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                JP per Minggu <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min={1}
                max={50}
                value={form.jp_per_minggu}
                onChange={e => setForm(f => ({ ...f, jp_per_minggu: Number(e.target.value) }))}
                placeholder="JP"
                className="h-10 text-sm rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Nama Mata Pelajaran <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.nama_mapel}
              onChange={e => setForm(f => ({ ...f, nama_mapel: e.target.value }))}
              placeholder="Contoh: Pendidikan Agama Islam dan Budi Pekerti"
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
              placeholder="Contoh: PAIBP"
              className="h-10 text-sm rounded-xl font-mono"
            />
            <p className="text-[10px] text-slate-400 mt-1">Kode ini digunakan sebagai kunci pencocokan otomatis di tabel frontend.</p>
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
              className="rounded-xl px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-2"
            >
              {saving && <RefreshCw size={13} className="animate-spin" />}
              {editingStandard ? 'Simpan Perubahan' : 'Tambah Acuan'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default KurikulumStandardsPage;
