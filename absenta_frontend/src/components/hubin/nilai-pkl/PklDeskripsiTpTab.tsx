import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Sparkles, 
  Users, 
  GraduationCap,
  Edit3,
  X
} from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { DeskripsiTpItem, ScoreRow } from './types';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

export interface ActiveMitraSlot {
  mitra_id: string;
  mitra_nama: string;
  mitra_alamat?: string;
  siswa_count: number;
  rombel_list: string[];
  deskripsi_tp?: string;
  saved_id?: string;
}

export interface PklDeskripsiTpTabProps {
  mitraOptions?: { value: string; label: string }[];
  selectedMitra?: string;
  setSelectedMitra?: (val: string) => void;
  deskripsiTpText?: string;
  setDeskripsiTpText?: (val: string) => void;
  onSave: (payload: { mitra_id: string; jurusan_id?: string; deskripsi_tp: string }) => void;
  isSaving: boolean;
  deskripsiListData: DeskripsiTpItem[];
  isLoadingDeskripsi: boolean;
  scores?: ScoreRow[];
  isKaprog?: boolean;
  isHubin?: boolean;
  kaprogJurusan?: { id?: string; nama?: string; singkatan?: string } | null;
  selectedKelas?: string;
  jurusanOptions?: { value: string; label: string }[];
  selectedJurusanFilter?: string;
  setSelectedJurusanFilter?: (val: string) => void;
}

export const PklDeskripsiTpTab: React.FC<PklDeskripsiTpTabProps> = ({
  mitraOptions = [],
  onSave,
  isSaving,
  deskripsiListData = [],
  isLoadingDeskripsi,
  scores = [],
  isKaprog = false,
  isHubin = false,
  kaprogJurusan,
  selectedKelas,
  jurusanOptions = [],
  selectedJurusanFilter = '',
  setSelectedJurusanFilter,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'BELUM' | 'SUDAH'>('ALL');
  
  // State modal/drawer edit deskripsi untuk slot mitra tertentu
  const [activeEditingSlot, setActiveEditingSlot] = useState<ActiveMitraSlot | null>(null);
  const [editorText, setEditorText] = useState('');

  // 1. Agregasi Slot Mitra DUDI yang nyata digunakan oleh siswa periode aktif
  const activeMitraSlots = useMemo<ActiveMitraSlot[]>(() => {
    const map = new Map<string, {
      mitra_id: string;
      mitra_nama: string;
      mitra_alamat: string;
      siswa_count: number;
      rombel_set: Set<string>;
    }>();

    // Saring siswa sesuai konteks (kelas atau jurusan binaan)
    const targetJurusanId = selectedJurusanFilter || (isKaprog && !isHubin ? kaprogJurusan?.id : undefined);

    const filteredScores = scores.filter((s) => {
      if (selectedKelas && s.kelas_id !== selectedKelas) return false;
      if (targetJurusanId && (s as any).jurusan_id && (s as any).jurusan_id !== targetJurusanId) return false;
      return true;
    });

    filteredScores.forEach((s) => {
      const mitraNama = (s.mitra_nama || '').trim();
      if (!mitraNama || mitraNama === '-' || mitraNama.toLowerCase().includes('belum')) return;

      // Cari mitra_id yang cocok dari mitraOptions jika score belum menyertakan id langsung
      const matchedOpt = mitraOptions.find((m) => m.label.toLowerCase().includes(mitraNama.toLowerCase()) || mitraNama.toLowerCase().includes(m.label.toLowerCase()));
      const mId = matchedOpt?.value || s.mitra_nama;

      if (!map.has(mId)) {
        map.set(mId, {
          mitra_id: mId,
          mitra_nama: s.mitra_nama,
          mitra_alamat: s.alamat_dudi || '',
          siswa_count: 0,
          rombel_set: new Set<string>(),
        });
      }

      const current = map.get(mId)!;
      current.siswa_count += 1;
      if (s.nama_kelas) {
        current.rombel_set.add(s.nama_kelas);
      }
    });

    // Gabungkan dengan data deskripsi yang sudah tersimpan di database
    return Array.from(map.values()).map((slot) => {
      const saved = deskripsiListData.find((d) => 
        d.mitra_id === slot.mitra_id || 
        d.Mitra?.nama?.toLowerCase() === slot.mitra_nama.toLowerCase()
      );

      return {
        mitra_id: slot.mitra_id,
        mitra_nama: slot.mitra_nama,
        mitra_alamat: slot.mitra_alamat,
        siswa_count: slot.siswa_count,
        rombel_list: Array.from(slot.rombel_set),
        deskripsi_tp: saved?.deskripsi_tp || '',
        saved_id: saved?.id,
      };
    }).sort((a, b) => {
      // Prioritaskan yang belum diisi agar Kaprog langsung melihat apa yang perlu dikerjakan
      const aFilled = Boolean(a.deskripsi_tp && a.deskripsi_tp.trim().length >= 10);
      const bFilled = Boolean(b.deskripsi_tp && b.deskripsi_tp.trim().length >= 10);
      if (aFilled === bFilled) return a.mitra_nama.localeCompare(b.mitra_nama);
      return aFilled ? 1 : -1;
    });
  }, [scores, selectedKelas, mitraOptions, deskripsiListData]);

  // Statistik Cepat
  const totalSlots = activeMitraSlots.length;
  const filledSlotsCount = activeMitraSlots.filter((s) => s.deskripsi_tp && s.deskripsi_tp.trim().length >= 10).length;
  const pendingSlotsCount = totalSlots - filledSlotsCount;

  // Filter slot berdasarkan pencarian & status
  const displayedSlots = useMemo(() => {
    return activeMitraSlots.filter((slot) => {
      const matchSearch = 
        slot.mitra_nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        slot.rombel_list.some((r) => r.toLowerCase().includes(searchTerm.toLowerCase()));

      const isFilled = Boolean(slot.deskripsi_tp && slot.deskripsi_tp.trim().length >= 10);
      const matchStatus = 
        statusFilter === 'ALL' ||
        (statusFilter === 'SUDAH' && isFilled) ||
        (statusFilter === 'BELUM' && !isFilled);

      return matchSearch && matchStatus;
    });
  }, [activeMitraSlots, searchTerm, statusFilter]);

  // Buka editor untuk slot tertentu
  const handleOpenEditor = (slot: ActiveMitraSlot) => {
    setActiveEditingSlot(slot);
    setEditorText(slot.deskripsi_tp || '');
  };

  // Tutup editor
  const handleCloseEditor = () => {
    setActiveEditingSlot(null);
    setEditorText('');
  };

  // Terapkan Template Baku Kurikulum Merdeka
  const handleApplyTemplate = (mitraNama: string) => {
    const jurusanNama = kaprogJurusan?.nama || 'kompetensi kejuruan';
    const template = `Peserta didik mampu memahami alur proses bisnis dan budaya kerja industri, menerapkan keselamatan dan kesehatan kerja (K3LH), serta mempraktikkan penguasaan kompetensi kejuruan ${jurusanNama} sesuai dengan Standar Operasional Prosedur (SOP) di ${mitraNama}.`;
    setEditorText(template);
    toast.success('Template capaian Kurikulum Merdeka berhasil disisipkan!');
  };

  // Simpan deskripsi TP untuk slot aktif
  const handleSaveSlot = () => {
    if (!activeEditingSlot) return;
    if (!editorText.trim() || editorText.trim().length < 5) {
      toast.error('Deskripsi TP minimal 5 karakter');
      return;
    }

    onSave({
      mitra_id: activeEditingSlot.mitra_id,
      jurusan_id: selectedJurusanFilter || kaprogJurusan?.id || undefined,
      deskripsi_tp: editorText.trim(),
    });

    handleCloseEditor();
  };

  return (
    <Card className="p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-6">
      {/* Header Penjelasan & Ringkasan Slot */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base flex items-center gap-2">
              <Building2 size={20} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Slot Deskripsi Capaian Pembelajaran (TP) PKL</span>
            </h3>
            {isKaprog && !isHubin && (
              <span className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                <GraduationCap className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                <span>Konteks Jurusan Terkunci: {kaprogJurusan?.nama || 'Ketua Program Keahlian'}</span>
              </span>
            )}
            {isHubin && (
              <span className="text-[10px] font-bold bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800/60 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                <Sparkles className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                <span>Konteks: Pejabat Hubin (Supervisi Lintas Jurusan)</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Slot perusahaan terfilter otomatis berdasarkan penempatan nyata siswa kejuruan pada semester aktif. Narasi ini dicetak pada sertifikat resmi dan rapor PKL siswa.
          </p>
        </div>

        {/* Counter Badge Ringkasan */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-center">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Total DUDI</span>
            <span className="text-sm font-black font-mono text-slate-700 dark:text-slate-200">{totalSlots}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-center border border-emerald-200/50 dark:border-emerald-800/40">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block uppercase">Lengkap</span>
            <span className="text-sm font-black font-mono text-emerald-700 dark:text-emerald-300">{filledSlotsCount}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-center border border-amber-200/50 dark:border-amber-800/40">
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block uppercase">Belum Ada</span>
            <span className="text-sm font-black font-mono text-amber-700 dark:text-amber-300">{pendingSlotsCount}</span>
          </div>
        </div>
      </div>

      {/* Progress Keterisian TP PKL */}
      {totalSlots > 0 && (
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-100 dark:border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <span>Progres Keterisian Deskripsi TP DUDI:</span>
              <strong className={filledSlotsCount === totalSlots ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                {filledSlotsCount} dari {totalSlots} Perusahaan Selesai ({Math.round((filledSlotsCount / totalSlots) * 100)}%)
              </strong>
            </span>
            <span className="text-[11px] text-slate-400">
              {pendingSlotsCount > 0 ? `Sisa ${pendingSlotsCount} mitra perlu dirumuskan TP` : '✅ 100% Siap untuk Penilaian'}
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-500",
                filledSlotsCount === totalSlots ? "bg-emerald-500" : "bg-gradient-to-r from-amber-500 to-indigo-600"
              )}
              style={{ width: `${Math.round((filledSlotsCount / totalSlots) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Toolbar Filter Cepat & Search */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama perusahaan atau kelas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Context Selector untuk HUBIN */}
          {isHubin && jurusanOptions.length > 0 && (
            <div className="flex items-center gap-1.5 shrink-0">
              <select
                value={selectedJurusanFilter}
                onChange={(e) => setSelectedJurusanFilter?.(e.target.value)}
                className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer max-w-[200px] truncate"
              >
                <option value="">Semua Jurusan (Semua Binaan)</option>
                {jurusanOptions.map((j) => (
                  <option key={j.value} value={j.value}>
                    {j.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={cn(
              'px-3 py-1 rounded-lg transition-all cursor-pointer',
              statusFilter === 'ALL'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 font-bold shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            Semua ({totalSlots})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('BELUM')}
            className={cn(
              'px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1',
              statusFilter === 'BELUM'
                ? 'bg-amber-500 text-white font-bold shadow-2xs'
                : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50/50'
            )}
          >
            <AlertCircle className="w-3 h-3" />
            <span>Belum Diisi ({pendingSlotsCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('SUDAH')}
            className={cn(
              'px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1',
              statusFilter === 'SUDAH'
                ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50/50'
            )}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Sudah Ada ({filledSlotsCount})</span>
          </button>
        </div>
      </div>

      {/* Modal / Dialog Edit Deskripsi TP untuk Slot Mitra */}
      {activeEditingSlot && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-850">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                    {activeEditingSlot.mitra_nama}
                  </h4>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {activeEditingSlot.rombel_list.join(', ')} • {activeEditingSlot.siswa_count} Siswa PKL
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseEditor}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="flex items-center justify-between">
                <label htmlFor="slot-editor-text" className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  Deskripsi Capaian Pembelajaran (TP)
                </label>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate(activeEditingSlot.mitra_nama)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Gunakan Template Kurikulum Merdeka</span>
                </button>
              </div>

              <textarea
                id="slot-editor-text"
                rows={5}
                value={editorText}
                onChange={(e) => setEditorText(e.target.value)}
                placeholder="Peserta didik mampu memahami alur proses bisnis industri, menerapkan K3LH, serta mempraktikkan..."
                className="w-full p-3 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all leading-relaxed resize-none"
              />

              <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-indigo-800 dark:text-indigo-300 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  💡 Tips Penulisan Sesuai Regulasi:
                </span>
                <p className="leading-relaxed opacity-90">
                  Gunakan kata kerja operasional terukur (contoh: *mampu memahami*, *mempraktikkan*, *menganalisis*, *merakit*) dan sebutkan alat/mesin/teknologi spesifik yang dipelajari siswa di industri ini.
                </p>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseEditor}
                className="rounded-xl text-xs font-bold"
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleSaveSlot}
                disabled={isSaving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Menyimpan...' : 'Simpan Deskripsi TP'}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Grid Slot Kartu Industri */}
      {isLoadingDeskripsi ? (
        <div className="text-center py-16 text-xs text-slate-400">
          Memuat slot industri jurusan...
        </div>
      ) : displayedSlots.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs italic">
          {activeMitraSlots.length === 0
            ? 'Belum ada siswa yang ditempatkan pada perusahaan di jurusan/kelas ini pada semester aktif.'
            : 'Tidak ada slot industri yang cocok dengan pencarian / filter ini.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedSlots.map((slot) => {
            const isFilled = Boolean(slot.deskripsi_tp && slot.deskripsi_tp.trim().length >= 10);

            return (
              <div
                key={slot.mitra_id}
                className={cn(
                  'rounded-2xl border p-4 sm:p-5 flex flex-col justify-between transition-all shadow-2xs space-y-3.5',
                  isFilled
                    ? 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                    : 'bg-amber-50/20 dark:bg-amber-950/10 border-amber-200/80 dark:border-amber-900/60 hover:border-amber-300'
                )}
              >
                <div className="space-y-2">
                  {/* Top Bar: Nama Perusahaan & Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span className="truncate">{slot.mitra_nama}</span>
                      </h4>
                      {slot.mitra_alamat && (
                        <p className="text-[11px] text-slate-400 truncate">
                          {slot.mitra_alamat}
                        </p>
                      )}
                    </div>

                    {isFilled ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        Sudah Diisi
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-2.5 py-0.5 rounded-full shrink-0 animate-pulse">
                        <AlertCircle className="w-3 h-3 text-amber-500" />
                        Belum Diisi
                      </span>
                    )}
                  </div>

                  {/* Info Penempatan Siswa Jurusan */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap pt-0.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      <Users className="w-3 h-3 text-indigo-500" />
                      {slot.siswa_count} Siswa
                    </span>
                    <span className="truncate">
                      Rombel: <strong className="text-slate-700 dark:text-slate-300">{slot.rombel_list.join(', ') || '-'}</strong>
                    </span>
                  </div>

                  {/* Isi Deskripsi TP */}
                  <div className="pt-1">
                    {isFilled ? (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                        "{slot.deskripsi_tp}"
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-800/40 border border-dashed border-amber-200 dark:border-amber-800/60 text-xs text-amber-700/80 dark:text-amber-400/80 italic">
                        Belum ada narasi deskripsi capaian pembelajaran untuk industri ini.
                      </div>
                    )}
                  </div>
                </div>

                {/* Tombol Aksi */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                  {!isFilled && (
                    <button
                      type="button"
                      onClick={() => {
                        handleOpenEditor(slot);
                        handleApplyTemplate(slot.mitra_nama);
                      }}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Gunakan Template Baku</span>
                    </button>
                  )}

                  <Button
                    type="button"
                    onClick={() => handleOpenEditor(slot)}
                    variant={isFilled ? 'outline' : 'primary'}
                    className={cn(
                      'ml-auto text-xs font-bold rounded-xl h-8 px-3 flex items-center gap-1.5 cursor-pointer',
                      !isFilled && 'bg-amber-600 hover:bg-amber-700 text-white'
                    )}
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{isFilled ? 'Edit Deskripsi' : 'Isi Deskripsi TP'}</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default PklDeskripsiTpTab;
