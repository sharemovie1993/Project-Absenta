import React, { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Search,
  Tag,
  FileText
} from 'lucide-react';
import { kurikulumApi } from '../../api/kurikulum.api';
import { Button, Input, Modal } from '../../components/ui';
import toast from 'react-hot-toast';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import useConfirm from '../../hooks/useConfirm';

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

const getJenisBadgeCls = (val: string) => {
  const mapper: Record<string, string> = {
    'LIBUR_NASIONAL': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    'LIBUR_SEKOLAH': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    'PTS': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    'PAS': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    'KEGIATAN': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    'MINGGU_EFEKTIF': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  };
  return mapper[val] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
};

const EMPTY_FORM = { jenjang: 'ALL', judul: '', jenis: 'KEGIATAN', keterangan: '' };

export const CalendarPresetsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<any | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const calendarPresetsQuery = useQuery({
    queryKey: ['superadmin-calendar-presets'],
    queryFn: async () => {
      const res = await kurikulumApi.getCalendarPresets();
      return res.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const presets = calendarPresetsQuery.data || [];
  const loading = calendarPresetsQuery.isLoading;

  const fetchPresets = useCallback(async () => {
    await calendarPresetsQuery.refetch();
  }, [calendarPresetsQuery]);

  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);

  const handleOpenCreate = useCallback(() => {
    setEditingPreset(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((preset: any) => {
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
    mutationFn: (data: any) =>
      editingPreset
        ? kurikulumApi.updateCalendarPreset(editingPreset.id, data)
        : kurikulumApi.createCalendarPreset(data),
    onSuccess: () => {
      toast.success(editingPreset ? 'Preset berhasil diperbarui.' : 'Preset berhasil ditambahkan.');
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['superadmin-calendar-presets'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal menyimpan preset');
    }
  });

  const deleteCalendarPresetMutation = useMutation({
    mutationFn: (id: string) => kurikulumApi.deleteCalendarPreset(id),
    onSuccess: () => {
      toast.success('Preset dihapus.');
      queryClient.invalidateQueries({ queryKey: ['superadmin-calendar-presets'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal menghapus preset');
    }
  });

  const handleSave = useCallback(async () => {
    if (!form.judul || !form.jenis) {
      toast.error('Judul dan Jenis wajib diisi.');
      return;
    }
    await saveCalendarPresetMutation.mutateAsync(form);
  }, [form, saveCalendarPresetMutation]);

  const handleDelete = useCallback(async (preset: any) => {
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

  const filtered = presets.filter(p => {
    const term = searchTerm.toLowerCase();
    return p.judul.toLowerCase().includes(term) ||
      p.jenis.toLowerCase().includes(term) ||
      (p.jenjang && p.jenjang.toLowerCase().includes(term)) ||
      (p.keterangan && p.keterangan.toLowerCase().includes(term));
  });

  const totalTypes = [...new Set(presets.map(p => p.jenis))].length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
            <Calendar size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">Katalog Preset Event Kalender</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Kelola template event kalender pendidikan global untuk SMK dan jenjang lainnya</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {[
          { label: 'Total Preset', value: presets.length, icon: <Calendar size={16} />, gradient: 'from-indigo-500 to-indigo-700 text-white' },
          { label: 'Tipe Event', value: totalTypes, icon: <Tag size={16} />, gradient: 'from-purple-500 to-purple-700 text-white' },
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
              placeholder="Cari preset event kalender..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-sm rounded-xl border-slate-200 dark:border-slate-700"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="toolbarOutline"
              size="toolbar"
              onClick={fetchPresets}
              disabled={loading}
              className="rounded-xl"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </Button>
            <Button
              variant="toolbarPrimary"
              size="toolbar"
              onClick={handleOpenCreate}
              className="rounded-xl px-4 text-xs font-bold"
            >
              <Plus size={14} className="mr-1.5" />
              Tambah Preset
            </Button>
          </div>
        </div>
      </div>

      {/* Preset List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-12 gap-3 text-slate-500">
            <RefreshCw className="animate-spin" size={18} />
            <span className="text-xs font-bold">Memuat presets...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            Tidak ada preset event kalender ditemukan.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map(p => (
              <div key={p.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{p.judul}</h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getJenisBadgeCls(p.jenis)}`}>
                      {getJenisLabel(p.jenis)}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                      {p.jenjang || 'ALL'}
                    </span>
                  </div>
                  {p.keterangan ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-2xl">{p.keterangan}</p>
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-slate-600 italic">Tidak ada keterangan</p>
                  )}
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 rounded-lg"
                    onClick={() => handleOpenEdit(p)}
                  >
                    <Edit size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 rounded-lg"
                    onClick={() => handleDelete(p)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingPreset ? 'Edit Preset Event' : 'Tambah Preset Event'}
        size="md"
      >
        <div className="space-y-4 p-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Nama / Judul Event *</label>
            <Input
              value={form.judul}
              onChange={e => setForm(f => ({ ...f, judul: e.target.value }))}
              placeholder="cth. Masa Pengenalan Lingkungan Sekolah (MPLS)"
              className="w-full text-sm rounded-xl border-slate-200 dark:border-slate-700"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Jenjang *</label>
            <select
              value={form.jenjang}
              onChange={e => setForm(f => ({ ...f, jenjang: e.target.value }))}
              className="w-full h-10 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {JENJANG_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Jenis Event *</label>
            <select
              value={form.jenis}
              onChange={e => setForm(f => ({ ...f, jenis: e.target.value }))}
              className="w-full h-10 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {JENIS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Keterangan (opsional)</label>
            <textarea
              value={form.keterangan}
              onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))}
              placeholder="Informasi deskripsi event..."
              rows={3}
              className="w-full p-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-750 dark:text-slate-250 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={saving}
              className="rounded-xl px-4 text-xs font-bold"
            >
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl px-4 text-xs font-bold"
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CalendarPresetsPage;
