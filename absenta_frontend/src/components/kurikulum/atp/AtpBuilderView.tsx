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
import { Button, Input, Label } from '../../ui';
import { SearchableSelect } from '../../ui/SearchableSelect';
import {
  getAtpList,
  upsertAtp,
  TujuanPembelajaranItem
} from '../../../api/atp.api';
import { AtpTemplateData } from '../../../api/atp-template.api';
import { AtpTemplatePickerModal } from './AtpTemplatePickerModal';
import { listGuruMapel } from '../../../api/kurikulum/guru-mapel.api';
import { useAuth } from '../../../hooks/useAuth';
import { toast } from 'react-hot-toast';
import { cn } from '../../../lib/utils';

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

const LOWERCASE_WORDS = new Set([
  'dan', 'atau', 'di', 'ke', 'dari', 'pada', 'untuk', 'dengan', 'yang', 'dalam', 'atas', 'oleh', 'sebagai'
]);

/** Auto Title Case untuk judul ATP & Materi Pokok (mempertahankan akronim huruf besar). */
function toSmartTitleCase(raw: string): string {
  const clean = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  return clean
    .split(' ')
    .map((word, idx) => {
      if (!word) return '';
      if (word.length > 1 && word === word.toUpperCase() && /[A-Z]/.test(word)) {
        return word;
      }
      const lower = word.toLowerCase();
      if (idx > 0 && LOWERCASE_WORDS.has(lower)) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

/** Auto Sentence Case untuk deskripsi / Capaian Pembelajaran (kapital awal kalimat). */
function toSmartSentenceCase(raw: string): string {
  const clean = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  return clean.replace(/(^\s*[a-zA-Z\u00C0-\u024F])|([.!?]\s+[a-zA-Z\u00C0-\u024F])/g, (m) => m.toUpperCase());
}

export interface AtpBuilderViewProps {
  initialMapelId?: string;
  initialFase?: string;
  embedded?: boolean;
  onSaved?: () => void;
}

export const AtpBuilderView: React.FC<AtpBuilderViewProps> = ({
  initialMapelId,
  initialFase,
  embedded = false,
  onSaved,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const guruId = String((user as any)?.guru_profile?.id || '');

  const [selectedMapelId, setSelectedMapelId] = useState<string>(initialMapelId || '');
  const [selectedFase, setSelectedFase] = useState<string>(initialFase || 'E');
  const [activeAtpId, setActiveAtpId] = useState<string | null>(null);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState<boolean>(false);

  const [namaAtp, setNamaAtp] = useState<string>('');
  const [totalJp, setTotalJp] = useState<number>(36);
  const [tpList, setTpList] = useState<TujuanPembelajaranItem[]>([{ ...DEFAULT_TP }]);

  useEffect(() => {
    if (initialMapelId) setSelectedMapelId(initialMapelId);
  }, [initialMapelId]);

  useEffect(() => {
    if (initialFase) setSelectedFase(initialFase);
  }, [initialFase]);

  const handleApplyTemplate = (tpl: AtpTemplateData) => {
    setSelectedFase(tpl.fase);
    setNamaAtp(tpl.nama_template);
    setTotalJp(tpl.total_alokasi_jp || 36);
    if (tpl.TpTemplate && tpl.TpTemplate.length > 0) {
      setTpList(tpl.TpTemplate.map((tp, idx) => ({
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

  const { data: guruMapelList = [], isLoading: isLoadingMapel } = useQuery({
    queryKey: ['guruMapelForAtp', guruId],
    queryFn: async () => {
      if (!guruId) return [];
      const res = await listGuruMapel({ guru_id: guruId });
      const seen = new Set<string>();
      return (res.data || []).filter((gm: any) => {
        if (!gm?.Mapel?.id || seen.has(gm.Mapel.id)) return false;
        seen.add(gm.Mapel.id);
        return true;
      });
    },
    enabled: Boolean(guruId),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000
  });

  const mapelOptions = useMemo(
    () =>
      (guruMapelList as any[]).map((gm) => ({
        value: gm.Mapel.id,
        label: gm.Mapel.nama_mapel || 'Mata Pelajaran',
      })),
    [guruMapelList]
  );

  useEffect(() => {
    if (guruMapelList.length > 0 && !selectedMapelId) {
      setSelectedMapelId((guruMapelList[0] as any)?.Mapel?.id || '');
    }
  }, [guruMapelList, selectedMapelId]);

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

  useEffect(() => {
    if ((atpPlans as any[]).length > 0) {
      const current = (atpPlans as any[])[0];
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
      const mapelItem = (guruMapelList as any[]).find((gm) => gm?.Mapel?.id === selectedMapelId);
      const mapelName = mapelItem?.Mapel?.nama_mapel || '';
      setNamaAtp(mapelName ? `ATP ${mapelName} — Fase ${selectedFase}` : `ATP Baru — Fase ${selectedFase}`);
      setTotalJp(36);
      setTpList([{ ...DEFAULT_TP }]);
    }
  }, [atpPlans, selectedMapelId, selectedFase, guruMapelList]);

  const handleAddTp = useCallback(() => {
    setTpList((prev) => {
      const nextIdx = prev.length + 1;
      return [
        ...prev,
        {
          kode_tp: `TP 1.${nextIdx}`,
          judul_materi: '',
          deskripsi_tp: '',
          alokasi_jp: 4,
          urutan: nextIdx,
          is_completed: false
        }
      ];
    });
  }, []);

  const handleRemoveTp = useCallback((index: number) => {
    setTpList((prev) => {
      if (prev.length <= 1) {
        toast.error('Minimal harus ada 1 TP');
        return prev;
      }
      return prev.filter((_, i) => i !== index).map((item, idx) => ({ ...item, urutan: idx + 1 }));
    });
  }, []);

  const handleMoveTp = useCallback((index: number, direction: 'up' | 'down') => {
    setTpList((prev) => {
      const targetIdx = direction === 'up' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const updated = [...prev];
      [updated[index], updated[targetIdx]] = [updated[targetIdx], updated[index]];
      return updated.map((item, idx) => ({ ...item, urutan: idx + 1 }));
    });
  }, []);

  const handleTpChange = useCallback((index: number, field: keyof TujuanPembelajaranItem, value: unknown) => {
    setTpList((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMapelId) throw new Error('Pilih mata pelajaran terlebih dahulu');
      const formattedNamaAtp = toSmartTitleCase(namaAtp);
      if (!formattedNamaAtp) throw new Error('Nama ATP wajib diisi');

      const formattedTpList = tpList.map((t) => ({
        ...t,
        kode_tp: String(t.kode_tp || '').trim().toUpperCase(),
        judul_materi: toSmartTitleCase(t.judul_materi),
        deskripsi_tp: toSmartSentenceCase(t.deskripsi_tp || ''),
      }));

      setNamaAtp(formattedNamaAtp);
      setTpList(formattedTpList);

      const cleanTp = formattedTpList.filter((t) => t.judul_materi.trim());
      if (cleanTp.length === 0) throw new Error('Isi setidaknya 1 judul materi pada TP');
      return upsertAtp({
        id: activeAtpId || undefined,
        guru_id: guruId,
        mapel_id: selectedMapelId,
        fase: selectedFase,
        nama_atp: formattedNamaAtp,
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
      if (onSaved) onSaved();
    },
    onError: (err: any) => toast.error(err?.message || 'Gagal menyimpan ATP')
  });

  const calculatedJp = tpList.reduce((acc, curr) => acc + (Number(curr.alokasi_jp) || 0), 0);
  const selectedMapelItem = (guruMapelList as any[]).find((gm) => gm?.Mapel?.id === selectedMapelId);

  return (
    <div className={cn('space-y-4', embedded ? 'pb-2' : 'pb-28 lg:pb-6')}>
      {/* ═══ PANEL 1: Selektor Konteks (Mapel + Fase + Nama) ═════════ */}
      <div className="bg-gradient-to-br from-white via-indigo-50/35 to-blue-50/45 dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-900 rounded-2xl sm:rounded-3xl border border-indigo-200/80 dark:border-indigo-900/60 shadow-xs p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xs">
              <BookOpen size={16} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Konteks ATP</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Mapel yang Anda ampu &amp; fase kurikulum</p>
            </div>
          </div>

          <Button
            type="button"
            onClick={() => setIsTemplatePickerOpen(true)}
            variant="outline"
            className="h-9 px-3.5 rounded-xl font-bold text-xs gap-1.5 border-indigo-300 dark:border-indigo-700 bg-white/90 dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 shadow-2xs self-start sm:self-auto cursor-pointer"
          >
            <Sparkles size={14} className="text-indigo-500" />
            <span>Gunakan Template Siap Pakai</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <GraduationCap size={12} className="text-blue-500" />
              Mata Pelajaran yang Anda Ampu
            </Label>
            {isLoadingMapel ? (
              <div className="h-11 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ) : mapelOptions.length === 0 ? (
              <div className="h-11 rounded-xl border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-950/30 flex items-center px-3">
                <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                  Belum ada penugasan mapel — hubungi admin Kurikulum
                </span>
              </div>
            ) : (
              <SearchableSelect
                id="atp_mapel_select"
                aria-label="Pilih Mata Pelajaran"
                options={mapelOptions}
                value={selectedMapelId}
                onChange={(val) => setSelectedMapelId(val)}
                placeholder="Pilih Mata Pelajaran..."
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles size={12} className="text-indigo-500" />
              Fase Kurikulum Merdeka
            </Label>
            <SearchableSelect
              id="atp_fase_select"
              aria-label="Pilih Fase Kurikulum"
              options={FASE_OPTIONS}
              value={selectedFase}
              onChange={(val) => setSelectedFase(val || 'E')}
              placeholder="Pilih Fase..."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-indigo-100/80 dark:border-slate-800">
          <div className="sm:col-span-3 space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Nama ATP</span>
              <span className="text-[10px] font-semibold text-indigo-500 dark:text-indigo-400">Auto Title Case</span>
            </Label>
            <Input
              value={namaAtp}
              onChange={(e) => setNamaAtp(e.target.value)}
              onBlur={(e) => setNamaAtp(toSmartTitleCase(e.target.value))}
              placeholder="Contoh: ATP Matematika — Fase E Semester Ganjil"
              className="h-11 rounded-xl text-sm font-bold bg-white dark:bg-slate-950 border-indigo-200/80 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/25"
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
              {calculatedJp} JP / {totalJp} JP ({tpList.filter((t) => t.judul_materi).length} TP)
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-indigo-200/70 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-indigo-100/80 dark:border-slate-800 bg-gradient-to-r from-indigo-50/70 via-blue-50/50 to-white dark:from-indigo-950/30 dark:via-slate-900 dark:to-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-xs">
              <Layers size={16} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Tujuan Pembelajaran (TP)</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">Susun urut sesuai linimasa pembelajaran • Judul &amp; CP otomatis kapital rapi</p>
            </div>
          </div>
          <Button
            type="button"
            onClick={handleAddTp}
            variant="outline"
            className="h-9 px-3.5 rounded-xl font-bold text-xs gap-1.5 border-blue-300 dark:border-blue-800 bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 cursor-pointer shadow-2xs"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Tambah TP</span>
            <span className="sm:hidden">+ TP</span>
          </Button>
        </div>

        <div className="p-4 sm:p-5 space-y-3 bg-slate-50/40 dark:bg-slate-950/30">
          {tpList.map((tp, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200/90 dark:border-slate-800 border-l-4 border-l-indigo-500 dark:border-l-indigo-500 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all overflow-hidden shadow-2xs"
            >
              <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-gradient-to-r from-indigo-50/60 via-slate-50/80 to-white dark:from-indigo-950/30 dark:via-slate-900 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                    {idx + 1}
                  </span>
                  <Input
                    value={tp.kode_tp}
                    onChange={(e) => handleTpChange(idx, 'kode_tp', e.target.value)}
                    onBlur={(e) => handleTpChange(idx, 'kode_tp', String(e.target.value || '').trim().toUpperCase())}
                    placeholder="Kode TP"
                    className="w-24 h-7 rounded-lg text-xs font-bold font-mono px-2 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800"
                  />
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => handleMoveTp(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer transition-all"
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveTp(idx, 'down')}
                    disabled={idx === tpList.length - 1}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer transition-all"
                  >
                    <ArrowDown size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveTp(idx)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer transition-all ml-1"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div className="p-3 space-y-2.5 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-3 sm:items-start">
                <div className="sm:col-span-4 space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Materi Pokok <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={tp.judul_materi}
                    onChange={(e) => handleTpChange(idx, 'judul_materi', e.target.value)}
                    onBlur={(e) => handleTpChange(idx, 'judul_materi', toSmartTitleCase(e.target.value))}
                    placeholder="Contoh: Komponen Motor Bakar"
                    className="h-9 rounded-xl text-xs font-bold bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900"
                  />
                </div>

                <div className="sm:col-span-7 space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Capaian Pembelajaran (CP) / Indikator
                  </Label>
                  <Input
                    value={tp.deskripsi_tp}
                    onChange={(e) => handleTpChange(idx, 'deskripsi_tp', e.target.value)}
                    onBlur={(e) => handleTpChange(idx, 'deskripsi_tp', toSmartSentenceCase(e.target.value))}
                    placeholder="Kompetensi yang diharapkan dikuasai peserta didik..."
                    className="h-9 rounded-xl text-xs bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900"
                  />
                </div>

                <div className="sm:col-span-1 space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">JP</Label>
                  <Input
                    type="number"
                    min="1"
                    max="99"
                    value={tp.alokasi_jp}
                    onChange={(e) => handleTpChange(idx, 'alokasi_jp', Number(e.target.value))}
                    className="h-9 rounded-xl text-xs font-bold font-mono text-center"
                  />
                </div>
              </div>
            </div>
          ))}

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

      {/* Save Action Bar */}
      {embedded ? (
        <div className="sticky bottom-0 z-20 flex items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur border border-slate-200 dark:border-slate-800 shadow-lg">
          <div className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950 border border-blue-200/60 dark:border-blue-800/60 text-center shrink-0">
            <span className="text-[10px] text-blue-500 font-bold mr-1.5">Alokasi:</span>
            <span className="text-xs font-black text-blue-900 dark:text-blue-100 font-mono">{calculatedJp}/{totalJp} JP</span>
          </div>
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !selectedMapelId}
            className="flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-98 text-white font-black text-xs sm:text-sm shadow-md shadow-blue-500/25 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Save size={15} />
            <span>{saveMutation.isPending ? 'Menyimpan...' : 'Simpan & Terbitkan ATP'}</span>
          </button>
        </div>
      ) : (
        <>
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
        </>
      )}

      <AtpTemplatePickerModal
        isOpen={isTemplatePickerOpen}
        onClose={() => setIsTemplatePickerOpen(false)}
        defaultFase={selectedFase}
        defaultMapelName={selectedMapelItem?.Mapel?.nama_mapel}
        onSelectTemplate={handleApplyTemplate}
      />
    </div>
  );
};
