import React, { useState, useCallback, useEffect } from 'react';
import {
  Briefcase,
  Plus,
  Search,
  Edit2,
  Trash2,
  Layers,
  ChevronDown,
  ChevronUp,
  Bookmark,
  Activity
} from 'lucide-react';
import {
  getGlobalPresets,
  createGlobalProgramPreset,
  updateGlobalProgramPreset,
  deleteGlobalProgramPreset,
  createGlobalJurusanPreset,
  updateGlobalJurusanPreset,
  deleteGlobalJurusanPreset,
  GlobalProgramPreset,
  GlobalJurusanPreset
} from '../../api/academic/jurusan-presets.api';
import { Button, Input, Modal, Badge } from '../../components/ui';
import { AnalyticsCard } from '../../components/ui/AnalyticsCard';
import toast from 'react-hot-toast';
import useConfirm from '../../hooks/useConfirm';

const EMPTY_PROGRAM_FORM = { bidang_keahlian: '', nama: '', kode: '', singkatan: '' };
const EMPTY_JURUSAN_FORM = { program_preset_id: '', nama: '', kode: '', singkatan: '' };

export const JurusanPresetsPage: React.FC = () => {
  const confirm = useConfirm();
  const [presets, setPresets] = useState<GlobalProgramPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [programModalOpen, setProgramModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<GlobalProgramPreset | null>(null);
  const [programForm, setProgramForm] = useState(EMPTY_PROGRAM_FORM);
  const [savingProgram, setSavingProgram] = useState(false);

  const [jurusanModalOpen, setJurusanModalOpen] = useState(false);
  const [editingJurusan, setEditingJurusan] = useState<GlobalJurusanPreset | null>(null);
  const [jurusanForm, setJurusanForm] = useState(EMPTY_JURUSAN_FORM);
  const [savingJurusan, setSavingJurusan] = useState(false);

  // Accordion state
  const [expandedProgramIds, setExpandedProgramIds] = useState<string[]>([]);

  const fetchPresets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getGlobalPresets();
      if (res.success) {
        setPresets(res.data);
        // Expand all by default initially
        setExpandedProgramIds(res.data.map(p => p.id));
      }
    } catch {
      toast.error('Gagal memuat preset global program & jurusan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);

  const toggleExpand = (id: string) => {
    setExpandedProgramIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // --- PROGRAM ACTIONS ---
  const handleOpenCreateProgram = () => {
    setEditingProgram(null);
    setProgramForm(EMPTY_PROGRAM_FORM);
    setProgramModalOpen(true);
  };

  const handleOpenEditProgram = (prog: GlobalProgramPreset) => {
    setEditingProgram(prog);
    setProgramForm({
      bidang_keahlian: prog.bidang_keahlian,
      nama: prog.nama,
      kode: prog.kode,
      singkatan: prog.singkatan
    });
    setProgramModalOpen(true);
  };

  const handleSaveProgram = async () => {
    const { bidang_keahlian, nama, kode, singkatan } = programForm;
    if (!bidang_keahlian || !nama || !kode || !singkatan) {
      toast.error('Semua field program wajib diisi.');
      return;
    }
    try {
      setSavingProgram(true);
      if (editingProgram) {
        await updateGlobalProgramPreset(editingProgram.id, programForm);
        toast.success('Program preset berhasil diperbarui.');
      } else {
        await createGlobalProgramPreset(programForm);
        toast.success('Program preset berhasil ditambahkan.');
      }
      setProgramModalOpen(false);
      fetchPresets();
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menyimpan program preset');
    } finally {
      setSavingProgram(false);
    }
  };

  const handleDeleteProgram = async (prog: GlobalProgramPreset) => {
    const ok = await confirm({
      title: 'Hapus Program Preset',
      description: `Hapus program preset "${prog.nama}"? Semua jurusan di bawahnya juga akan ikut terhapus.`,
      confirmText: 'Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });
    if (!ok) return;
    try {
      await deleteGlobalProgramPreset(prog.id);
      toast.success('Program preset dihapus.');
      fetchPresets();
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menghapus program preset');
    }
  };

  // --- JURUSAN ACTIONS ---
  const handleOpenCreateJurusan = (programId: string) => {
    setEditingJurusan(null);
    setJurusanForm({ ...EMPTY_JURUSAN_FORM, program_preset_id: programId });
    setJurusanModalOpen(true);
  };

  const handleOpenEditJurusan = (jur: GlobalJurusanPreset) => {
    setEditingJurusan(jur);
    setJurusanForm({
      program_preset_id: jur.program_preset_id,
      nama: jur.nama,
      kode: jur.kode,
      singkatan: jur.singkatan
    });
    setJurusanModalOpen(true);
  };

  const handleSaveJurusan = async () => {
    const { program_preset_id, nama, kode, singkatan } = jurusanForm;
    if (!program_preset_id || !nama || !kode || !singkatan) {
      toast.error('Semua field jurusan wajib diisi.');
      return;
    }
    try {
      setSavingJurusan(true);
      if (editingJurusan) {
        await updateGlobalJurusanPreset(editingJurusan.id, { nama, kode, singkatan });
        toast.success('Jurusan preset berhasil diperbarui.');
      } else {
        await createGlobalJurusanPreset({ program_preset_id, nama, kode, singkatan });
        toast.success('Jurusan preset berhasil ditambahkan.');
      }
      setJurusanModalOpen(false);
      fetchPresets();
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menyimpan jurusan preset');
    } finally {
      setSavingJurusan(false);
    }
  };

  const handleDeleteJurusan = async (jur: GlobalJurusanPreset) => {
    const ok = await confirm({
      title: 'Hapus Jurusan Preset',
      description: `Hapus jurusan preset "${jur.nama}"? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });
    if (!ok) return;
    try {
      await deleteGlobalJurusanPreset(jur.id);
      toast.success('Jurusan preset dihapus.');
      fetchPresets();
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menghapus jurusan preset');
    }
  };

  // Filters
  const filtered = presets.map(p => {
    const matchProgram = p.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.kode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.bidang_keahlian.toLowerCase().includes(searchTerm.toLowerCase());

    const matchedJurusans = p.jurusans.filter(j =>
      j.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.kode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.singkatan.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (matchProgram || matchedJurusans.length > 0) {
      return {
        ...p,
        jurusans: matchProgram ? p.jurusans : matchedJurusans
      };
    }
    return null;
  }).filter((p): p is GlobalProgramPreset => p !== null);

  const totalPrograms = presets.length;
  const totalJurusans = presets.reduce((acc, curr) => acc + curr.jurusans.length, 0);
  const totalBidang = [...new Set(presets.map(p => p.bidang_keahlian))].length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
            <Briefcase size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">Katalog Preset Jurusan & Program</h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Kelola daftar global preset Program dan Konsentrasi Keahlian (SMK) untuk seluruh tenant sekolah
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="toolbarPrimary"
          size="toolbar"
          onClick={handleOpenCreateProgram}
        >
          <Plus size={16} className="mr-2" />
          Program Baru
        </Button>
      </div>

      {/* Analytics Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <AnalyticsCard
          title="Total Program Keahlian"
          value={totalPrograms}
          icon={<Layers size={16} />}
          gradient="from-blue-500 to-indigo-600 text-white"
          isLoading={loading}
        />
        <AnalyticsCard
          title="Total Konsentrasi (Jurusan)"
          value={totalJurusans}
          icon={<Briefcase size={16} />}
          gradient="from-violet-500 to-purple-600 text-white"
          isLoading={loading}
        />
        <AnalyticsCard
          title="Bidang Keahlian"
          value={totalBidang}
          icon={<Bookmark size={16} />}
          gradient="from-emerald-500 to-teal-600 text-white"
          isLoading={loading}
        />
      </div>

      {/* Toolbar / Search */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm mb-6 flex flex-col md:flex-row items-center gap-3 justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari program, jurusan, singkatan..."
            className="w-full pl-10 pr-4 h-10 text-[12px] font-semibold border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
      </div>

      {/* Main List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Activity className="animate-spin text-indigo-500 mb-2" size={24} />
          <span className="text-[11px] font-semibold">Memuat presets...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl py-12 text-center text-slate-400 text-[11px] font-semibold">
          Tidak ada data preset program & jurusan yang ditemukan.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(prog => {
            const isExpanded = expandedProgramIds.includes(prog.id);
            return (
              <div key={prog.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm transition-all">
                {/* Header Card Program */}
                <div className="p-4 flex items-center justify-between flex-wrap gap-4 border-b border-slate-50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/30">
                  <div className="flex items-start gap-3 flex-1 min-w-0" onClick={() => toggleExpand(prog.id)} style={{ cursor: 'pointer' }}>
                    <div className="bg-white dark:bg-slate-950 p-2 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm text-indigo-500">
                      <Layers size={18} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                        {prog.bidang_keahlian}
                      </span>
                      <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight flex items-center gap-2">
                        {prog.nama}
                        <Badge variant="outline" className="text-[9px] font-bold">
                          {prog.kode}
                        </Badge>
                      </h3>
                      <p className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold uppercase">
                        Singkatan: {prog.singkatan} · ({prog.jurusans.length} Jurusan)
                      </p>
                    </div>
                  </div>

                  {/* Actions Program */}
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="toolbarOutline"
                      size="toolbar"
                      onClick={() => handleOpenCreateJurusan(prog.id)}
                      className="text-[9px]"
                    >
                      <Plus size={12} className="mr-1" />
                      Jurusan Baru
                    </Button>
                    <Button
                      type="button"
                      variant="toolbarOutline"
                      size="toolbarIcon"
                      onClick={() => handleOpenEditProgram(prog)}
                    >
                      <Edit2 size={12} />
                    </Button>
                    <Button
                      type="button"
                      variant="toolbarOutline"
                      size="toolbarIcon"
                      onClick={() => handleDeleteProgram(prog)}
                      className="text-red-500 hover:text-red-600 dark:hover:text-red-400"
                    >
                      <Trash2 size={12} />
                    </Button>
                    <button
                      type="button"
                      onClick={() => toggleExpand(prog.id)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 ml-2"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Jurusan List (Expanded) */}
                {isExpanded && (
                  <div className="p-4 bg-white dark:bg-slate-950/20">
                    {prog.jurusans.length === 0 ? (
                      <p className="text-center text-[10px] text-slate-400 py-4 font-semibold italic">
                        Belum ada jurusan preset di bawah program ini.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {prog.jurusans.map(jur => (
                          <div
                            key={jur.id}
                            className="bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between hover:border-slate-200 dark:hover:border-slate-700 transition-all shadow-sm"
                          >
                            <div className="space-y-0.5 min-w-0 pr-2">
                              <h4 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                                {jur.nama}
                              </h4>
                              <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500">
                                Kode: {jur.kode} · Singkatan: {jur.singkatan}
                              </p>
                            </div>

                            <div className="flex gap-1 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => handleOpenEditJurusan(jur)}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                              >
                                <Edit2 size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteJurusan(jur)}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-500"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* --- MODAL PROGRAM --- */}
      <Modal
        isOpen={programModalOpen}
        onClose={() => setProgramModalOpen(false)}
        title={editingProgram ? 'Edit Program Keahlian' : 'Tambah Program Keahlian'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Bidang Keahlian"
            value={programForm.bidang_keahlian}
            onChange={(e) => setProgramForm(prev => ({ ...prev, bidang_keahlian: e.target.value }))}
            placeholder="Contoh: Teknologi Informasi"
            required
          />
          <Input
            label="Nama Program Keahlian"
            value={programForm.nama}
            onChange={(e) => setProgramForm(prev => ({ ...prev, nama: e.target.value }))}
            placeholder="Contoh: Pengembangan Perangkat Lunak dan Gim"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Kode"
              value={programForm.kode}
              onChange={(e) => setProgramForm(prev => ({ ...prev, kode: e.target.value }))}
              placeholder="Contoh: PPLG"
              required
            />
            <Input
              label="Singkatan"
              value={programForm.singkatan}
              onChange={(e) => setProgramForm(prev => ({ ...prev, singkatan: e.target.value }))}
              placeholder="Contoh: PPLG"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
            <Button
              type="button"
              variant="toolbarOutline"
              size="toolbar"
              onClick={() => setProgramModalOpen(false)}
              disabled={savingProgram}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="toolbarPrimary"
              size="toolbar"
              onClick={handleSaveProgram}
              disabled={savingProgram}
            >
              {savingProgram ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* --- MODAL JURUSAN --- */}
      <Modal
        isOpen={jurusanModalOpen}
        onClose={() => setJurusanModalOpen(false)}
        title={editingJurusan ? 'Edit Konsentrasi Keahlian' : 'Tambah Konsentrasi Keahlian'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Nama Konsentrasi Keahlian"
            value={jurusanForm.nama}
            onChange={(e) => setJurusanForm(prev => ({ ...prev, nama: e.target.value }))}
            placeholder="Contoh: Rekayasa Perangkat Lunak"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Kode"
              value={jurusanForm.kode}
              onChange={(e) => setJurusanForm(prev => ({ ...prev, kode: e.target.value }))}
              placeholder="Contoh: RPL"
              required
            />
            <Input
              label="Singkatan"
              value={jurusanForm.singkatan}
              onChange={(e) => setJurusanForm(prev => ({ ...prev, singkatan: e.target.value }))}
              placeholder="Contoh: RPL"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
            <Button
              type="button"
              variant="toolbarOutline"
              size="toolbar"
              onClick={() => setJurusanModalOpen(false)}
              disabled={savingJurusan}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="toolbarPrimary"
              size="toolbar"
              onClick={handleSaveJurusan}
              disabled={savingJurusan}
            >
              {savingJurusan ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default JurusanPresetsPage;
