const atpSchema = z.object({
  nama_atp: z.string().min(1, 'Nama ATP wajib diisi'),
  fase: z.string().min(1, 'Fase wajib diisi')
});
import { SectionCard } from '../../components/ui/SectionCard';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { z } from 'zod';
import { formatDate } from '@/utils/date.utils';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Save,
  ArrowUp,
  ArrowDown,
  Layers,
  Trash2,
  Sparkles,
  BookOpen,
  GraduationCap,
  Clock
} from 'lucide-react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { Button, Input, Label } from '../../components/ui';
import {
  getAtpList,
  upsertAtp,
  TujuanPembelajaranItem
} from '../../api/atp.api';
import { AtpTemplateData } from '../../api/atp-template.api';
import { AtpTemplatePickerModal } from '../../components/kurikulum/atp/AtpTemplatePickerModal';
import { listGuruMapel } from '../../api/kurikulum/guru-mapel.api';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';

const FASE_OPTIONS = [
  { value: 'A', label: 'Fase A — Kelas 1-2 SD' },
  { value: 'B', label: 'Fase B — Kelas 3-4 SD' },
  { value: 'C', label: 'Fase C — Kelas 5-6 SD' },
  { value: 'D', label: 'Fase D — Kelas 7-9 SMP' },
  { value: 'E', label: 'Fase E — Kelas 10 SMA/SMK' },
  { value: 'F', label: 'Fase F — Kelas 11-12 SMA/SMK' },
];

const DEFAULT_TP: TujuanPembelajaranItem = {
  kode_tp: 'TP 1.1',
  judul_materi: '',
  deskripsi_tp: '',
  alokasi_jp: 4,
  urutan: 1,
  is_completed: false
};

export const AtpBuilderPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const guruId = (user as Record<string, unknown>)?.guru_profile?.id || '';

  // ─── Selector State ───────────────────────────────────────────────
  const [selectedMapelId, setSelectedMapelId] = useState<string>('');
  const [selectedFase, setSelectedFase] = useState<string>('E');
  const [activeAtpId, setActiveAtpId] = useState<string | null>(null);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState<boolean>(false);

  // ─── Form State ───────────────────────────────────────────────────
  const [namaAtp, setNamaAtp] = useState<string>('');
  const [totalJp, setTotalJp] = useState<number>(36);
  const [tpList, setTpList] = useState<TujuanPembelajaranItem[]>([{ ...DEFAULT_TP }]);

  const handleApplyTemplate = (tpl: AtpTemplateData) => {
    setSelectedFase(tpl.fase);
    setNamaAtp(tpl.nama_template);
    setTotalJp(tpl.total_alokasi_jp || 36);
    if (tpl.TpTemplate && tpl.TpTemplate.length > 0) {
      setTpList(tpl.TpTemplate?.map((tp, idx) => ({
        kode_tp: tp.kode_tp || `TP 1.${idx + 1}`,
        judul_materi: tp.judul_materi || '',
        deskripsi_tp: tp.deskripsi_tp || '',
        alokasi_jp: tp.alokasi_jp || 2,
        urutan: tp.urutan || idx + 1,
        is_completed: false
      })));
    }
    toast.success(`Template "${tpl.nama_template}" berhasil dimuat ke formulir! ✨`);
  };

  // ─── Fetch Mapel Yang Guru Ajar ───────────────────────────────────
  const { data: guruMapelList = [], isLoading: isLoadingMapel } = useQuery({
    queryKey: ['guruMapelForAtp', guruId],
    queryFn: async () => {
      if (!guruId) return [];
      const res = await listGuruMapel({ guru_id: guruId });
      // De-duplicate by mapel_id
      const seen = new Set<string>();
      return (res.data || []).filter((gm: unknown) => {
        if (!gm.Mapel?.id || seen.has(gm.Mapel.id)) return false;
        seen.add(gm.Mapel.id);
        return true;
      });
    },
    enabled: Boolean(guruId),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000
  });

  // Auto-pilih mapel pertama jika belum dipilih
  useEffect(() => {
    if (guruMapelList.length > 0 && !selectedMapelId) {
      setSelectedMapelId((guruMapelList[0] as Record<string, unknown>).Mapel?.id || '');
    }
  }, [guruMapelList, selectedMapelId]);

  // ─── Fetch ATP Plans untuk Mapel & Fase terpilih ─────────────────
  const { data: atpPlans = [], isLoading: isLoadingAtp } = useQuery({
    queryKey: ['atpList', guruId, selectedMapelId, selectedFase],
    queryFn: () => getAtpList({
      guru_id: guruId || undefined,
      mapel_id: selectedMapelId || undefined,
      fase: selectedFase
    }),
    enabled: Boolean(selectedMapelId),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  });

  // ─── Populate form saat ATP ditemukan ────────────────────────────
  useEffect(() => {
    if ((atpPlans as Record<string, unknown>[]).length > 0) {
      const current = (atpPlans as Record<string, unknown>[])[0];
      setActiveAtpId(current.id || null);
      setNamaAtp(current.nama_atp || '');
      setTotalJp(current.total_alokasi_jp || 36);
      if (current.TujuanPembelajaran?.length > 0) {
        setTpList(current.TujuanPembelajaran);
      } else {
        setTpList([{ ...DEFAULT_TP }]);
      }
    } else {
      setActiveAtpId(null);
      const mapelItem = (guruMapelList as Record<string, unknown>[]).find((gm: unknown) => gm.Mapel?.id === selectedMapelId);
      const mapelName = mapelItem?.Mapel?.nama_mapel || '';
      setNamaAtp(mapelName ? `ATP ${mapelName} — Fase ${selectedFase}` : `ATP Baru — Fase ${selectedFase}`);
      setTotalJp(36);
      setTpList([{ ...DEFAULT_TP }]);
    }
  }, [atpPlans, selectedMapelId, selectedFase]);

  // ─── TP Operations ────────────────────────────────────────────────
  const handleAddTp = useCallback(() => {
    const nextIdx = tpList.length + 1;
    setTpList(prev => [...prev, {
      kode_tp: `TP 1.${nextIdx}`,
      judul_materi: '',
      deskripsi_tp: '',
      alokasi_jp: 4,
      urutan: nextIdx,
      is_completed: false
    }]);
  }, [tpList.length]);

  const handleRemoveTp = useCallback((index: number) => {
    if (tpList.length <= 1) { toast.error('Minimal harus ada 1 TP'); return; }
    setTpList(prev => prev.filter((_, i) => i !== index)?.map((item, idx) => ({ ...item, urutan: idx + 1 })));
  }, [tpList.length]);

  const handleMoveTp = useCallback((index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= tpList.length) return;
    setTpList(prev => {
      const updated = [...prev];
      [updated[index], updated[targetIdx]] = [updated[targetIdx], updated[index]];
      return updated?.map((item, idx) => ({ ...item, urutan: idx + 1 }));
    });
  }, [tpList]);

  const handleTpChange = useCallback((index: number, field: keyof TujuanPembelajaranItem, value: unknown) => {
    setTpList(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  // ─── Save Mutation ────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMapelId) throw new Error('Pilih mata pelajaran terlebih dahulu');
      if (!namaAtp.trim()) throw new Error('Nama ATP wajib diisi');
      const cleanTp = tpList.filter(t => t.judul_materi.trim());
      if (cleanTp.length === 0) throw new Error('Isi setidaknya 1 judul materi pada TP');
      return upsertAtp({
        id: activeAtpId || undefined,
        guru_id: guruId,
        mapel_id: selectedMapelId,
        fase: selectedFase,
        nama_atp: namaAtp,
        total_alokasi_jp: totalJp,
        status: 'PUBLISHED',
        tujuan_pembelajaran: cleanTp
      });
    },
    onSuccess: () => {
      toast.success('Rencana ATP & TP berhasil disimpan! ✨');
      queryClient.invalidateQueries({ queryKey: ['atpList'] });
      queryClient.invalidateQueries({ queryKey: ['activeTpForSesi'] });
      queryClient.invalidateQueries({ queryKey: ['rekapJurnalSesiList'] });
      queryClient.invalidateQueries({ queryKey: ['guruTeachingTimeline'] });
      queryClient.invalidateQueries({ queryKey: ['guru-riwayat-ajar'] });
    },
    onError: (err: unknown) => toast.error(err.message || 'Gagal menyimpan ATP')
  });

  const calculatedJp = tpList.reduce((acc, curr) => acc + (Number(curr.alokasi_jp) || 0), 0);
  const selectedMapelItem = (guruMapelList as Record<string, unknown>[]).find((gm: unknown) => gm.Mapel?.id === selectedMapelId);

  return (
    <AcademicPageLayout hardeningModuleKey="kurikulum_atp_builder"
      title="Penyusun ATP & TP"
      description="Rancang Alur Tujuan Pembelajaran per mata pelajaran yang Anda ampu — berbasis Kurikulum Merdeka."
      breadcrumbs={[
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Kurikulum', path: '/kurikulum/dashboard' },
        { label: 'Penyusun ATP & TP', path: '/kurikulum/atp' }
      ]}
      instruction={{
        title: 'Cara Kerja ATP Builder (Kurikulum Merdeka)',
        description: 'Susun ATP per mapel yang Anda ajar.',
        items: [
          { text: 'Pilih mata pelajaran yang Anda ampu — hanya tampil mapel Anda sendiri.' },
          { text: 'Pilih Fase Kurikulum Merdeka (Fase E untuk Kelas 10, Fase F untuk Kelas 11-12).' },
          { text: 'Setelah disimpan, TP ini otomatis muncul di Form Jurnal KBM sebagai pilihan 1-klik.' }
        ]
      }}
    >
      <SectionCard fullWidth className="flex flex-col w-full min-w-0 max-w-full border-none shadow-none bg-transparent p-0">
      {/* Padding bawah agar tidak tertutup sticky bar */}
      <div className="space-y-4 pb-28 lg:pb-6">

        {/* ═══ PANEL 1: Selektor Konteks (Mapel + Fase + Nama) ═════════ */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 sm:p-5">
          {/* Panel Label & Template Picker Trigger */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                <BookOpen size={16} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Konteks ATP</h3>
                <p className="text-[11px] text-slate-400 font-medium">Mapel yang Anda ampu &amp; fase kurikulum</p>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => setIsTemplatePickerOpen(true)}
              variant="outline"
              className="h-9 px-3.5 rounded-xl font-bold text-xs gap-1.5 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 shadow-sm self-start sm:self-auto cursor-pointer"
            >
              <Sparkles size={14} className="text-indigo-500" />
              <span>Gunakan Template Siap Pakai</span>
            </Button>
          </div>

          {/* Mapel + Fase — 2 kolom di desktop, stacked di HP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Mapel */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <GraduationCap size={12} className="text-blue-500" />
                Mata Pelajaran yang Anda Ampu
              </Label>
              {isLoadingMapel ? (
                <div className="h-11 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              ) : (guruMapelList as Record<string, unknown>[]).length === 0 ? (
                <div className="h-11 rounded-xl border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-950/30 flex items-center px-3">
                  <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                    Belum ada penugasan mapel — hubungi admin Kurikulum
                  </span>
                </div>
              ) : (
                <SearchableSelect
    id="atp_select"
    aria-label="Pilih Opsi ATP"
    options={[
      { value: 'Fase A', label: 'Fase A (Kelas 1-2)' },
      { value: 'Fase B', label: 'Fase B (Kelas 3-4)' },
      { value: 'Fase C', label: 'Fase C (Kelas 5-6)' },
      { value: 'Fase D', label: 'Fase D (Kelas 7-9)' },
      { value: 'Fase E', label: 'Fase E (Kelas 10)' },
      { value: 'Fase F', label: 'Fase F (Kelas 11-12)' }
    ]}
    placeholder="Pilih Fase..."
  />
              )}
            </div>

            {/* Fase Kurikulum */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles size={12} className="text-indigo-500" />
                Fase Kurikulum Merdeka
              </Label>
              <SearchableSelect
    id="atp_select"
    aria-label="Pilih Opsi ATP"
    options={[
      { value: 'Fase A', label: 'Fase A (Kelas 1-2)' },
      { value: 'Fase B', label: 'Fase B (Kelas 3-4)' },
      { value: 'Fase C', label: 'Fase C (Kelas 5-6)' },
      { value: 'Fase D', label: 'Fase D (Kelas 7-9)' },
      { value: 'Fase E', label: 'Fase E (Kelas 10)' },
      { value: 'Fase F', label: 'Fase F (Kelas 11-12)' }
    ]}
    placeholder="Pilih Fase..."
  />
            </div>
          </div>

          {/* Nama ATP + Target JP */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="sm:col-span-3 space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nama ATP</Label>
              <Input
                value={namaAtp}
                onChange={(e) => setNamaAtp(e.target.value)}
                placeholder="Contoh: ATP Matematika — Fase E Semester Ganjil"
                className="h-11 rounded-xl text-sm font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Clock size={11} /> Target JP
              </Label>
              <Input
                type="number"
                value={totalJp}
                onChange={(e) => setTotalJp(Number(e.target.value))}
                className="h-11 rounded-xl text-sm font-bold font-mono text-center"
              />
            </div>
          </div>

          {/* Alokasi Progress */}
          {!isLoadingAtp && selectedMapelId && (
            <div className="mt-3 flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 font-medium">Realisasi:</span>
              <span className={cn(
                'px-2.5 py-1 rounded-full text-[11px] font-black',
                calculatedJp > totalJp
                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                  : calculatedJp === totalJp
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                    : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
              )}>
                {calculatedJp} JP / {totalJp} JP ({tpList.filter(t => t.judul_materi).length} TP)
              </span>
              {activeAtpId && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  ✓ ATP Aktif Tersimpan
                </span>
              )}
            </div>
          )}
        </div>

        {/* ═══ PANEL 2: Rangkaian TP ═══════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                <Layers size={16} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Tujuan Pembelajaran (TP)</h3>
                <p className="text-[11px] text-slate-400 font-medium hidden sm:block">Susun urut sesuai linimasa pembelajaran</p>
              </div>
            </div>
            <Button
              type="button"
              onClick={handleAddTp}
              variant="outline"
              className="h-9 px-3.5 rounded-xl font-bold text-xs gap-1.5 border-blue-300 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Tambah TP</span>
              <span className="sm:hidden">+ TP</span>
            </Button>
          </div>

          {/* TP List */}
          <div className="p-4 sm:p-5 space-y-3">
            {tpList?.map((tp, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 hover:border-blue-300 dark:hover:border-blue-700 transition-all overflow-hidden"
              >
                {/* TP Header: nomor, kode, controls */}
                <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-white/80 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <Input
                      value={tp.kode_tp}
                      onChange={(e) => handleTpChange(idx, 'kode_tp', e.target.value)}
                      placeholder="Kode TP"
                      className="w-24 h-7 rounded-lg text-xs font-bold font-mono px-2"
                    />
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button type="button" onClick={() => handleMoveTp(idx, 'up')} disabled={idx === 0}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer transition-all">
                      <ArrowUp size={13} />
                    </button>
                    <button type="button" onClick={() => handleMoveTp(idx, 'down')} disabled={idx === tpList.length - 1}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer transition-all">
                      <ArrowDown size={13} />
                    </button>
                    <button type="button" onClick={() => handleRemoveTp(idx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer transition-all ml-1">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* TP Body: stacked di HP, 3-col di desktop */}
                <div className="p-3 space-y-2.5 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-3 sm:items-start">
                  {/* Judul Materi */}
                  <div className="sm:col-span-4 space-y-1">
                    <Label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Materi Pokok <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      value={tp.judul_materi}
                      onChange={(e) => handleTpChange(idx, 'judul_materi', e.target.value)}
                      placeholder="Contoh: Komponen Motor Bakar"
                      className="h-9 rounded-xl text-xs font-bold"
                    />
                  </div>

                  {/* Deskripsi CP */}
                  <div className="sm:col-span-7 space-y-1">
                    <Label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Capaian Pembelajaran (CP) / Indikator
                    </Label>
                    <Input
                      value={tp.deskripsi_tp}
                      onChange={(e) => handleTpChange(idx, 'deskripsi_tp', e.target.value)}
                      placeholder="Kompetensi yang diharapkan dikuasai peserta didik..."
                      className="h-9 rounded-xl text-xs"
                    />
                  </div>

                  {/* JP */}
                  <div className="sm:col-span-1 space-y-1">
                    <Label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">JP</Label>
                    <Input
                      type="number" min="1" max="99"
                      value={tp.alokasi_jp}
                      onChange={(e) => handleTpChange(idx, 'alokasi_jp', Number(e.target.value))}
                      className="h-9 rounded-xl text-xs font-bold font-mono text-center"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Tambah lebih banyak */}
            <button
              type="button"
              onClick={handleAddTp}
              className="w-full py-3.5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-700 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>Tambah Tujuan Pembelajaran (TP) Berikutnya</span>
            </button>
          </div>
        </div>
      </div>

      {/* ═══ STICKY SAVE — Fixed FAB di Desktop ═══════════════════════ */}
      <div className="hidden lg:block fixed bottom-6 right-6 z-50">
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !selectedMapelId}
          className="flex items-center gap-2.5 h-12 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-98 text-white font-black text-sm shadow-xl shadow-blue-500/30 transition-all disabled:opacity-50 cursor-pointer"
        >
          <Save size={16} />
          {saveMutation.isPending ? 'Menyimpan...' : 'Simpan & Terbitkan ATP'}
        </button>
      </div>

      {/* ═══ STICKY SAVE — Full-width bar di HP (di atas bottom nav) ═══ */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 z-50 px-4 py-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950 border border-blue-200/60 dark:border-blue-800/60 shrink-0 text-center">
            <p className="text-[10px] text-blue-500 font-bold leading-none">Alokasi</p>
            <p className="text-xs font-black text-blue-900 dark:text-blue-100 font-mono">{calculatedJp}/{totalJp} JP</p>
          </div>
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !selectedMapelId}
            className="flex-1 h-11 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Save size={15} />
            {saveMutation.isPending ? 'Menyimpan...' : 'Simpan & Terbitkan ATP'}
          </button>
        </div>
      </div>

      {/* ═══ Template Picker Modal ═══ */}
      <AtpTemplatePickerModal
        isOpen={isTemplatePickerOpen}
        onClose={() => setIsTemplatePickerOpen(false)}
        defaultFase={selectedFase}
        defaultMapelName={selectedMapelItem?.Mapel?.nama_mapel}
        onSelectTemplate={handleApplyTemplate}
      />
    </SectionCard>
    </AcademicPageLayout>
  );
};

export default AtpBuilderPage;
