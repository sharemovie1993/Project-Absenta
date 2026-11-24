import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Award,
  Printer,
  Save,
  GraduationCap,
  Sparkles,
  Layers,
  AlertCircle,
  SlidersHorizontal,
} from 'lucide-react';
import { Button, Input, Label } from '../../ui';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { getAtpList, TujuanPembelajaranItem } from '../../../api/atp.api';
import { listGuruMapel } from '../../../api/kurikulum/guru-mapel.api';
import { kurikulumApi } from '../../../api/kurikulum.api';
import { sekolahApi } from '../../../api/academic/sekolah.api';
import { getStrukturTree, getStrukturList } from '../../../api/academic/strukturOrganisasi.api';
import { useAuth } from '../../../hooks/useAuth';
import { toast } from 'react-hot-toast';
import { cn } from '../../../lib/utils';
import { extractSignersFromData } from './useKurikulumSigners';
import type { KktpIntervalBand, KktpRubricRow } from './KktpPrintModal';

const KktpPrintModal = lazy(() =>
  import('./KktpPrintModal').then((m) => ({ default: m.KktpPrintModal }))
);

const FASE_OPTIONS = [
  { value: 'E', label: 'Fase E — Kelas 10 SMA/SMK' },
  { value: 'F', label: 'Fase F — Kelas 11-12 SMA/SMK' },
  { value: 'D', label: 'Fase D — Kelas 7-9 SMP' },
  { value: 'C', label: 'Fase C — Kelas 5-6 SD' },
  { value: 'B', label: 'Fase B — Kelas 3-4 SD' },
  { value: 'A', label: 'Fase A — Kelas 1-2 SD' },
];

function buildDefaultIntervals(threshold: number): KktpIntervalBand[] {
  const t = Math.max(50, Math.min(95, threshold));
  const midHigh = Math.min(99, t + Math.floor((100 - t) / 2));
  return [
    { label: 'Perlu Bimbingan', min: 0, max: Math.max(0, t - 25), tuntas: false, tindakLanjut: 'Remedial di seluruh bagian' },
    { label: 'Cukup / Remedial', min: Math.max(1, t - 24), max: t - 1, tuntas: false, tindakLanjut: 'Remedial di bagian yang diperlukan' },
    { label: 'Baik (Tuntas)', min: t, max: midHigh, tuntas: true, tindakLanjut: 'Tidak perlu remedial' },
    { label: 'Sangat Baik (Mahir)', min: midHigh + 1, max: 100, tuntas: true, tindakLanjut: 'Pengayaan atau tantangan lebih' },
  ];
}

export interface KktpBuilderViewProps {
  initialMapelId?: string;
  initialFase?: string;
  activeTpId?: string;
  activeSemId?: string;
  tahunPelajaranLabel?: string;
  onOpenAtpBuilder?: (mapelId?: string, fase?: string) => void;
  onSaved?: () => void;
}

export const KktpBuilderView: React.FC<KktpBuilderViewProps> = ({
  initialMapelId,
  initialFase,
  activeTpId,
  activeSemId,
  tahunPelajaranLabel = '2026/2027',
  onOpenAtpBuilder,
  onSaved,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const guruId = String((user as any)?.guru_profile?.id || '');
  const guruNama = String((user as any)?.guru_profile?.nama_guru || user?.name || 'Guru Mata Pelajaran');
  const guruNip = String((user as any)?.guru_profile?.nip || '');

  const [selectedMapelId, setSelectedMapelId] = useState<string>(initialMapelId || '');
  const [selectedFase, setSelectedFase] = useState<string>(initialFase || 'E');
  const [approach, setApproach] = useState<'INTERVAL' | 'RUBRIK'>('INTERVAL');
  const [kktpThreshold, setKktpThreshold] = useState<number>(75);
  const [rubricMap, setRubricMap] = useState<Record<string, KktpRubricRow>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  useEffect(() => {
    if (initialMapelId) setSelectedMapelId(initialMapelId);
  }, [initialMapelId]);

  useEffect(() => {
    if (initialFase) setSelectedFase(initialFase);
  }, [initialFase]);

  const intervals = useMemo(() => buildDefaultIntervals(kktpThreshold), [kktpThreshold]);

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
    queryFn: () =>
      getAtpList({
        guru_id: guruId || undefined,
        mapel_id: selectedMapelId || undefined,
        fase: selectedFase,
      }),
    enabled: Boolean(selectedMapelId),
    staleTime: 2 * 60 * 1000,
  });

  const activeAtp = (atpPlans as any[])[0] || null;
  const tpList: TujuanPembelajaranItem[] = useMemo(
    () => (activeAtp?.TujuanPembelajaran || []) as TujuanPembelajaranItem[],
    [activeAtp]
  );

  // Auto-generate default rubric descriptions from TP titles
  useEffect(() => {
    if (tpList.length === 0) return;
    setRubricMap((prev) => {
      const next = { ...prev };
      tpList.forEach((tp, idx) => {
        const key = tp.id || tp.kode_tp || String(idx);
        if (!next[key]) {
          const topic = tp.judul_materi || 'materi';
          next[key] = {
            perluBimbingan: `Belum mampu memahami konsep dasar ${topic}`,
            cukup: `Mampu menjelaskan sebagian konsep ${topic} dengan bimbingan`,
            baik: `Mampu menerapkan konsep ${topic} secara mandiri dan tepat`,
            sangatBaik: `Mampu menganalisis dan mengembangkan ${topic} secara kreatif`,
          };
        }
      });
      return next;
    });
  }, [tpList]);

  const selectedMapelLabel =
    mapelOptions.find((m) => m.value === selectedMapelId)?.label || 'Mata Pelajaran';

  const handleRubricChange = useCallback(
    (key: string, field: keyof KktpRubricRow, value: string) => {
      setRubricMap((prev) => ({
        ...prev,
        [key]: { ...(prev[key] || { perluBimbingan: '', cukup: '', baik: '', sangatBaik: '' }), [field]: value },
      }));
    },
    []
  );

  const buildFallbackPdf = useCallback(async () => {
    const [{ jsPDF }, autoTableMod, sekolahRes, treeRes, listRes] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
      sekolahApi.getProfile().catch(() => null),
      getStrukturTree().catch(() => ({})),
      getStrukturList().catch(() => []),
    ]);
    const autoTable = autoTableMod.default;
    const signers = extractSignersFromData(sekolahRes, treeRes, listRes);

    const isLandscape = approach === 'RUBRIK';
    const doc = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageW = doc.internal.pageSize.getWidth();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(signers.sekolahNama.toUpperCase(), pageW / 2, 15, { align: 'center' });

    doc.setFontSize(11);
    doc.text('KRITERIA KETERCAPAIAN TUJUAN PEMBELAJARAN (KKTP)', pageW / 2, 22, { align: 'center' });
    doc.setLineWidth(0.5);
    doc.line(14, 25, pageW - 14, 25);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Mata Pelajaran : ${selectedMapelLabel}`, 14, 32);
    doc.text(`Fase / Tahun   : Fase ${selectedFase} / ${tahunPelajaranLabel}`, 14, 37);
    doc.text(`Guru Pengampu  : ${guruNama}`, pageW / 2 + 10, 32);
    doc.text(
      `Pendekatan     : ${approach === 'INTERVAL' ? `Interval Nilai (KKTP >= ${kktpThreshold})` : 'Rubrik 4 Kriteria'}`,
      pageW / 2 + 10,
      37
    );

    if (approach === 'INTERVAL') {
      autoTable(doc, {
        startY: 42,
        head: [['Rentang Nilai', 'Predikat', 'Status', 'Tindak Lanjut']],
        body: intervals.map((b) => [`${b.min} - ${b.max}`, b.label, b.tuntas ? 'Tuntas' : 'Belum Tuntas', b.tindakLanjut]),
        styles: { fontSize: 8.5, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [15, 23, 42] },
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', lineColor: [0, 0, 0], lineWidth: 0.2 },
      });

      const afterIntervalY = ((doc as any).lastAutoTable?.finalY || 70) + 6;
      autoTable(doc, {
        startY: afterIntervalY,
        head: [['No', 'Kode TP', 'Tujuan Pembelajaran / Materi Pokok', 'Indikator Ketercapaian', 'Ambang']],
        body: tpList.map((tp, idx) => [idx + 1, tp.kode_tp, tp.judul_materi, tp.deskripsi_tp || '-', `>= ${kktpThreshold}`]),
        styles: { fontSize: 8.5, cellPadding: 2.2, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [15, 23, 42] },
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', lineColor: [0, 0, 0], lineWidth: 0.2 },
        columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 20, halign: 'center' }, 4: { cellWidth: 20, halign: 'center' } },
      });
    } else {
      autoTable(doc, {
        startY: 42,
        head: [['No', 'Kode', 'Tujuan Pembelajaran', 'Perlu Bimbingan', 'Cukup', 'Baik (Tuntas)', 'Sangat Baik']],
        body: tpList.map((tp, idx) => {
          const key = tp.id || tp.kode_tp || String(idx);
          const r = rubricMap[key];
          return [idx + 1, tp.kode_tp, tp.judul_materi, r?.perluBimbingan || '-', r?.cukup || '-', r?.baik || '-', r?.sangatBaik || '-'];
        }),
        styles: { fontSize: 7.5, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [15, 23, 42] },
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', lineColor: [0, 0, 0], lineWidth: 0.2 },
      });
    }

    const pageH = doc.internal.pageSize.getHeight();
    let currentY = ((doc as any).lastAutoTable?.finalY || 120) + 10;
    if (currentY > pageH - 60 || (!isLandscape && currentY > 200)) {
      doc.addPage();
      currentY = 24;
    }

    doc.setFontSize(9);
    doc.text('Diverifikasi oleh,', 25, currentY + 5);
    doc.text('Wakasek Bidang Kurikulum', 25, currentY + 10);
    doc.text(signers.wakaNama, 25, currentY + 28);
    doc.text(`NIP. ${signers.wakaNip}`, 25, currentY + 33);

    doc.text('Disusun oleh,', pageW - 75, currentY + 5);
    doc.text('Guru Mata Pelajaran', pageW - 75, currentY + 10);
    doc.text(guruNama, pageW - 75, currentY + 28);
    doc.text(`NIP. ${guruNip || '-'}`, pageW - 75, currentY + 33);

    doc.text('Mengetahui / Menyetujui,', pageW / 2, currentY + 42, { align: 'center' });
    doc.text('Kepala Sekolah', pageW / 2, currentY + 47, { align: 'center' });
    doc.text(signers.kepsekNama, pageW / 2, currentY + 64, { align: 'center' });
    doc.text(`NIP. ${signers.kepsekNip}`, pageW / 2, currentY + 69, { align: 'center' });

    return doc;
  }, [approach, selectedMapelLabel, selectedFase, tahunPelajaranLabel, guruNama, guruNip, kktpThreshold, intervals, tpList, rubricMap]);

  const handleSaveToPerangkat = async () => {
    if (tpList.length === 0) {
      toast.error('Belum ada data TP dari ATP untuk disimpan.');
      return;
    }
    if (!activeTpId || !activeSemId || !guruId || !selectedMapelId) {
      toast.error('Konteks Tahun Pelajaran / Semester / Mapel belum lengkap.');
      return;
    }

    try {
      setIsSaving(true);
      const doc = await buildFallbackPdf();
      const blob = doc.output('blob');
      const safeName = `KKTP_${selectedMapelLabel.replace(/[^a-zA-Z0-9]+/g, '_')}_Fase_${selectedFase}.pdf`;
      const file = new File([blob], safeName, { type: 'application/pdf' });

      const formData = new FormData();
      formData.append('judul', `KKTP ${selectedMapelLabel} — Fase ${selectedFase} (${approach === 'INTERVAL' ? `Ambang ${kktpThreshold}` : 'Rubrik'})`);
      formData.append('jenis', 'KKTP');
      formData.append('mapel_id', selectedMapelId);
      formData.append('guru_id', guruId);
      formData.append('tahun_pelajaran_id', activeTpId);
      formData.append('semester_id', activeSemId);
      formData.append('file', file);

      await kurikulumApi.uploadPerangkatAjar(formData);
      toast.success('KKTP otomatis digenerate dari ATP & disimpan ke Perangkat Ajar!');
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar-list'] });
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar-stats-all'] });
      if (onSaved) onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal menyimpan KKTP');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3 pb-6">
      {/* ═══ PANEL 1: Konteks & Pendekatan KKTP ═══ */}
      <div className="bg-gradient-to-br from-white via-rose-50/30 to-pink-50/40 dark:from-slate-900 dark:via-rose-950/15 dark:to-slate-900 rounded-2xl border border-rose-200/80 dark:border-rose-900/60 shadow-xs p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
          <div className="inline-flex p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setApproach('INTERVAL')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer',
                approach === 'INTERVAL'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              )}
            >
              Interval Nilai
            </button>
            <button
              type="button"
              onClick={() => setApproach('RUBRIK')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer',
                approach === 'RUBRIK'
                  ? 'bg-pink-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              )}
            >
              Rubrik 4 Kriteria
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => tpList.length > 0 ? setIsPrintModalOpen(true) : toast.error('Belum ada data TP dari ATP.')}
              disabled={tpList.length === 0}
              className="h-8 px-3 rounded-xl text-xs font-bold gap-1.5 border-slate-300 dark:border-slate-700 cursor-pointer"
            >
              <Printer size={13} />
              <span>Cetak / PDF Resmi</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveToPerangkat}
              disabled={isSaving || tpList.length === 0}
              className="h-8 px-3.5 rounded-xl text-xs font-black gap-1.5 bg-rose-600 hover:bg-rose-500 text-white shadow-sm cursor-pointer"
            >
              <Save size={13} />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan KKTP ke Berkas'}</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <GraduationCap size={11} className="text-rose-600" />
              Mata Pelajaran (Sumber ATP)
            </Label>
            {isLoadingMapel ? (
              <div className="h-9 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ) : (
              <SearchableSelect
                id="kktp_mapel_select"
                options={mapelOptions}
                value={selectedMapelId}
                onChange={(val) => setSelectedMapelId(val)}
                placeholder="Pilih Mapel..."
              />
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Sparkles size={11} className="text-pink-600" />
              Fase Kurikulum
            </Label>
            <SearchableSelect
              id="kktp_fase_select"
              options={FASE_OPTIONS}
              value={selectedFase}
              onChange={(val) => setSelectedFase(val || 'E')}
              placeholder="Pilih Fase..."
            />
          </div>

          {approach === 'INTERVAL' && (
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <SlidersHorizontal size={11} className="text-rose-600" />
                Ambang Ketuntasan (KKTP)
              </Label>
              <Input
                type="number"
                min={50}
                max={95}
                value={kktpThreshold}
                onChange={(e) => setKktpThreshold(Number(e.target.value) || 75)}
                className="h-10 rounded-xl text-xs font-black font-mono text-center bg-white dark:bg-slate-950"
              />
            </div>
          )}
        </div>
      </div>

      {/* ═══ PANEL 2: Konten KKTP dari ATP ═══ */}
      {isLoadingAtp ? (
        <div className="h-48 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
      ) : tpList.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-amber-300 dark:border-amber-700 p-8 text-center space-y-3">
          <AlertCircle className="w-9 h-9 text-amber-500 mx-auto" />
          <div className="space-y-1">
            <h4 className="text-sm font-black text-slate-900 dark:text-white">
              ATP untuk {selectedMapelLabel} (Fase {selectedFase}) Belum Tersedia
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              KKTP ditarik otomatis dari daftar Tujuan Pembelajaran (TP) pada ATP agar selaras dengan modul ajar &amp; penilaian.
            </p>
          </div>
          {onOpenAtpBuilder && (
            <Button
              type="button"
              onClick={() => onOpenAtpBuilder(selectedMapelId, selectedFase)}
              className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black gap-1.5 cursor-pointer"
            >
              <Layers size={14} />
              <span>Susun ATP Sekarang</span>
            </Button>
          )}
        </div>
      ) : approach === 'INTERVAL' ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {intervals.map((b, i) => (
              <div
                key={i}
                className={cn(
                  'p-3 rounded-xl border text-xs',
                  b.tuntas
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50/70 dark:bg-rose-950/25 border-rose-200 dark:border-rose-800'
                )}
              >
                <div className="font-mono font-black text-sm text-slate-900 dark:text-white">
                  {b.min} – {b.max}
                </div>
                <div className="font-bold text-[11px] mt-0.5 text-slate-800 dark:text-slate-200">{b.label}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{b.tindakLanjut}</div>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-500 uppercase">
                    <th className="py-2.5 px-3 w-12 text-center">No</th>
                    <th className="py-2.5 px-3 w-24">Kode TP</th>
                    <th className="py-2.5 px-3">Tujuan Pembelajaran &amp; Indikator</th>
                    <th className="py-2.5 px-3 w-28 text-center">Ambang KKTP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {tpList.map((tp, idx) => (
                    <tr key={tp.id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 text-center font-bold text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-mono font-bold text-[11px] border border-rose-200/70 dark:border-rose-800">
                          {tp.kode_tp}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">{tp.judul_materi}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{tp.deskripsi_tp || '-'}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-black font-mono text-[11px]">
                          <Award size={11} /> ≥ {kktpThreshold}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {tpList.map((tp, idx) => {
            const key = tp.id || tp.kode_tp || String(idx);
            const row = rubricMap[key] || { perluBimbingan: '', cukup: '', baik: '', sangatBaik: '' };
            return (
              <div
                key={key}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 space-y-2.5 shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-mono font-black text-[11px]">
                    {tp.kode_tp}
                  </span>
                  <span className="font-bold text-xs text-slate-900 dark:text-white">{tp.judul_materi}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-rose-600">Perlu Bimbingan</Label>
                    <Input
                      value={row.perluBimbingan}
                      onChange={(e) => handleRubricChange(key, 'perluBimbingan', e.target.value)}
                      className="h-9 text-[11px] rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-amber-600">Cukup</Label>
                    <Input
                      value={row.cukup}
                      onChange={(e) => handleRubricChange(key, 'cukup', e.target.value)}
                      className="h-9 text-[11px] rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-emerald-600">Baik (Tuntas)</Label>
                    <Input
                      value={row.baik}
                      onChange={(e) => handleRubricChange(key, 'baik', e.target.value)}
                      className="h-9 text-[11px] rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-indigo-600">Sangat Baik</Label>
                    <Input
                      value={row.sangatBaik}
                      onChange={(e) => handleRubricChange(key, 'sangatBaik', e.target.value)}
                      className="h-9 text-[11px] rounded-xl"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Suspense fallback={null}>
        {isPrintModalOpen && (
          <KktpPrintModal
            isOpen={isPrintModalOpen}
            onClose={() => setIsPrintModalOpen(false)}
            approach={approach}
            kktpThreshold={kktpThreshold}
            intervals={intervals}
            rubricMap={rubricMap}
            mapelNama={selectedMapelLabel}
            fase={selectedFase}
            tahunPelajaranLabel={tahunPelajaranLabel}
            namaAtp={activeAtp?.nama_atp || ''}
            guruNama={guruNama}
            guruNip={guruNip}
            tpList={tpList}
          />
        )}
      </Suspense>
    </div>
  );
};
