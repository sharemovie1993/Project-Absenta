import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { kesiswaanApi, type JenisPelanggaran, type JenisPrestasi } from '../../../api/kesiswaan.api';
import { bpbkApi } from '../../../api/bpbk.api';
import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../../components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/Tabs';
import { TabSwitcher } from '../../../components/ui/TabSwitcher';
import { Table } from '../../../components/ui/Table';
import type { Column } from '../../../components/ui/Table';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { Loader } from '../../../components/ui/Loader';
import { Label } from '../../../components/ui/Label';
import toast from 'react-hot-toast';
import useConfirm from '../../../hooks/useConfirm';
import { Plus, Edit2, Trash2, ShieldAlert, Trophy } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';

export const SettingsSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pelanggaran' | 'prestasi'>('pelanggaran');
  
  const [violations, setViolations] = useState<JenisPelanggaran[]>([]);
  const [achievements, setAchievements] = useState<JenisPrestasi[]>([]);
  
  const [loading, setLoading] = useState(true);

  const confirm = useConfirm();

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

  const fetchViolations = useCallback(async () => {
    try {
      const res = await kesiswaanApi.getJenisPelanggaran();
      setViolations(res.data || res || []);
    } catch (err: unknown) {
      console.error(err);
    }
  }, []);

  const fetchAchievements = useCallback(async () => {
    try {
      const res = await kesiswaanApi.getJenisPrestasi();
      setAchievements(res.data || []);
    } catch (err: unknown) {
      console.error(err);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchViolations(), fetchAchievements()]);
    setLoading(false);
  }, [fetchViolations, fetchAchievements]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // === VIOLATION ACTIONS ===
  const handleVSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vForm.nama_pelanggaran.trim()) {
      toast.error('Nama pelanggaran wajib diisi');
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
      fetchViolations();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Gagal menyimpan';
      toast.error(errorMsg);
    }
  }, [vId, vForm, fetchViolations]);

  const handleVDelete = useCallback(async (id: string) => {
    const ok = await confirm({
      title: 'Hapus Kategori Pelanggaran',
      description: 'Apakah Anda yakin ingin menghapus kategori pelanggaran ini?',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });
    if (!ok) return;
    try {
      await kesiswaanApi.deleteJenisPelanggaran(id);
      toast.success('Kategori pelanggaran berhasil dihapus');
      fetchViolations();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Gagal menghapus';
      toast.error(errorMsg);
    }
  }, [confirm, fetchViolations]);

  // === ACHIEVEMENT ACTIONS ===
  const handleASubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aForm.nama_prestasi.trim()) {
      toast.error('Nama prestasi wajib diisi');
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
      fetchAchievements();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Gagal menyimpan';
      toast.error(errorMsg);
    }
  }, [aId, aForm, fetchAchievements]);

  const handleADelete = useCallback(async (id: string) => {
    const ok = await confirm({
      title: 'Hapus Kategori Prestasi',
      description: 'Apakah Anda yakin ingin menghapus kategori prestasi ini?',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });
    if (!ok) return;
    try {
      await kesiswaanApi.deleteJenisPrestasi(id);
      toast.success('Kategori prestasi berhasil dihapus');
      fetchAchievements();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Gagal menghapus';
      toast.error(errorMsg);
    }
  }, [confirm, fetchAchievements]);

  const violationColumns: Column[] = useMemo(() => [
    {
      key: 'kategori',
      label: 'Bobot Tingkatan',
      render: (value: string) => (
        <Badge variant={value === 'BERAT' ? 'error' : value === 'SEDANG' ? 'warning' : 'outline'} className="text-[9px] font-black uppercase">
          {value}
        </Badge>
      )
    },
    {
      key: 'nama_pelanggaran',
      label: 'Jenis Pelanggaran',
      render: (value: string) => <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{value}</span>
    },
    {
      key: 'poin',
      label: 'Bobot Poin',
      render: (value: number) => <span className="text-xs font-black text-rose-500">+{value} Poin</span>
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_, item: any) => (
        <div className="flex gap-1 justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setVId(item.id);
              setVForm({ kategori: item.kategori, nama_pelanggaran: item.nama_pelanggaran, poin: item.poin });
              setViolationModalOpen(true);
            }}
            className="w-8 h-8 text-indigo-600 hover:bg-indigo-50"
          >
            <Edit2 size={13} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleVDelete(item.id)}
            className="w-8 h-8 text-rose-600 hover:bg-rose-50"
          >
            <Trash2 size={13} />
          </Button>
        </div>
      )
    }
  ], [handleVDelete]);

  const achievementColumns: Column[] = useMemo(() => [
    {
      key: 'kategori',
      label: 'Kategori',
      render: (value: string) => (
        <Badge variant="outline" className="text-[9px] font-black uppercase">
          {value}
        </Badge>
      )
    },
    {
      key: 'nama_prestasi',
      label: 'Kategori Prestasi',
      render: (value: string) => <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{value}</span>
    },
    {
      key: 'poin',
      label: 'Poin Penghargaan',
      render: (value: number) => <span className="text-xs font-black text-emerald-500">+{value} Poin</span>
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_, item: any) => (
        <div className="flex gap-1 justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setAId(item.id);
              setAForm({ kategori: item.kategori, nama_prestasi: item.nama_prestasi, poin: item.poin });
              setAchievementModalOpen(true);
            }}
            className="w-8 h-8 text-indigo-600 hover:bg-indigo-50"
          >
            <Edit2 size={13} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleADelete(item.id)}
            className="w-8 h-8 text-rose-600 hover:bg-rose-50"
          >
            <Trash2 size={13} />
          </Button>
        </div>
      )
    }
  ], [handleADelete]);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center">
        <Loader className="mb-4" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Menghubungkan Pengaturan Kategori...</p>
      </div>
    );
  }

  return (
    <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 p-6 rounded-2xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Pengaturan Kategori Kasus & Prestasi Siswa</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Konfigurasi bobot poin pelanggaran (kedisiplinan) dan poin penghargaan (prestasi)</p>
        </div>
        <Button
          variant="toolbarPrimary"
          size="toolbar"
          onClick={() => {
            if (activeTab === 'pelanggaran') {
              setVId(null);
              setVForm({ kategori: 'RINGAN', nama_pelanggaran: '', poin: 0 });
              setViolationModalOpen(true);
            } else {
              setAId(null);
              setAForm({ kategori: 'AKADEMIK', nama_prestasi: '', poin: 0 });
              setAchievementModalOpen(true);
            }
          }}
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          {activeTab === 'pelanggaran' ? 'Tambah Kategori Pelanggaran' : 'Tambah Kategori Prestasi'}
        </Button>
      </div>

      <Tabs value={activeTab} className="w-full" onValueChange={(val: any) => setActiveTab(val as 'pelanggaran' | 'prestasi')}>
        <TabSwitcher
          options={[
            { id: 'pelanggaran', label: 'Kategori Pelanggaran & Poin', icon: ShieldAlert, colorClass: 'text-rose-600 dark:text-rose-400' },
            { id: 'prestasi', label: 'Kategori Prestasi & Poin', icon: Trophy, colorClass: 'text-emerald-600 dark:text-emerald-400' }
          ]}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as 'pelanggaran' | 'prestasi')}
          className="mb-6"
        />

        <TabsContent value="pelanggaran" className="space-y-4">
          <Table
            columns={violationColumns}
            data={violations}
          />
        </TabsContent>

        <TabsContent value="prestasi" className="space-y-4">
          <Table
            columns={achievementColumns}
            data={achievements}
          />
        </TabsContent>
      </Tabs>

      {/* Violation Category Modal */}
      <Modal isOpen={violationModalOpen} onClose={() => setViolationModalOpen(false)} title={vId ? 'Edit Kategori Pelanggaran' : 'Tambah Kategori Pelanggaran Baru'} size="sm">
        <form onSubmit={handleVSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tingkat-pelanggaran" className="text-xs font-bold uppercase tracking-wider text-slate-500">Tingkat Pelanggaran</Label>
            <SearchableSelect
              id="tingkat-pelanggaran"
              options={[
                { value: 'RINGAN', label: 'Ringan' },
                { value: 'SEDANG', label: 'Sedang' },
                { value: 'BERAT', label: 'Berat' }
              ]}
              value={vForm.kategori}
              onValueChange={(val) => setVForm(prev => ({ ...prev, kategori: val }))}
              className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nama-pelanggaran" className="text-xs font-bold uppercase tracking-wider text-slate-500">Jenis / Nama Pelanggaran</Label>
            <Input
              id="nama-pelanggaran"
              placeholder="Contoh: Terlambat masuk sekolah, atribut tidak lengkap"
              value={vForm.nama_pelanggaran}
              onChange={(e) => setVForm(prev => ({ ...prev, nama_pelanggaran: e.target.value }))}
              className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="poin-pelanggaran" className="text-xs font-bold uppercase tracking-wider text-slate-500">Bobot Poin Pelanggaran</Label>
            <Input
              id="poin-pelanggaran"
              type="number"
              min="1"
              value={vForm.poin || ''}
              onChange={(e) => setVForm(prev => ({ ...prev, poin: parseInt(e.target.value) || 0 }))}
              className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="toolbarOutline" size="toolbar" onClick={() => setViolationModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="toolbarPrimary" size="toolbar" className="px-6">
              Simpan Kategori
            </Button>
          </div>
        </form>
      </Modal>

      {/* Achievement Category Modal */}
      <Modal isOpen={achievementModalOpen} onClose={() => setAchievementModalOpen(false)} title={aId ? 'Edit Kategori Prestasi' : 'Tambah Kategori Prestasi Baru'} size="sm">
        <form onSubmit={handleASubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="kategori-prestasi" className="text-xs font-bold uppercase tracking-wider text-slate-500">Kategori Kegiatan</Label>
            <SearchableSelect
              id="kategori-prestasi"
              options={[
                { value: 'AKADEMIK', label: 'Akademik' },
                { value: 'NON-AKADEMIK', label: 'Non-Akademik' },
                { value: 'KARAKTER', label: 'Karakter / Sikap Baik' }
              ]}
              value={aForm.kategori}
              onValueChange={(val) => setAForm(prev => ({ ...prev, kategori: val }))}
              className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nama-prestasi" className="text-xs font-bold uppercase tracking-wider text-slate-500">Nama / Kategori Penghargaan</Label>
            <Input
              id="nama-prestasi"
              placeholder="Contoh: Juara 1 Tingkat Kabupaten, Penghargaan Sikap Teladan"
              value={aForm.nama_prestasi}
              onChange={(e) => setAForm(prev => ({ ...prev, nama_prestasi: e.target.value }))}
              className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="poin-prestasi" className="text-xs font-bold uppercase tracking-wider text-slate-500">Poin Penghargaan (Reward)</Label>
            <Input
              id="poin-prestasi"
              type="number"
              min="1"
              value={aForm.poin || ''}
              onChange={(e) => setAForm(prev => ({ ...prev, poin: parseInt(e.target.value) || 0 }))}
              className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="toolbarOutline" size="toolbar" onClick={() => setAchievementModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="toolbarPrimary" size="toolbar" className="px-6">
              Simpan Kategori
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
};
