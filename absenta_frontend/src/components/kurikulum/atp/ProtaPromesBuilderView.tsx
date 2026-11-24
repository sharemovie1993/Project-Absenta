import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarRange,
  Printer,
  Save,
  GraduationCap,
  Sparkles,
  Layers,
  Check,
  AlertCircle,
} from 'lucide-react';

const ProtaPromesPrintModal = lazy(() =>
  import('./ProtaPromesPrintModal').then((m) => ({ default: m.ProtaPromesPrintModal }))
);
import { Button, Label } from '../../ui';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { getAtpList, TujuanPembelajaranItem } from '../../../api/atp.api';
import { listGuruMapel } from '../../../api/kurikulum/guru-mapel.api';
import { kurikulumApi } from '../../../api/kurikulum.api';
import { useAuth } from '../../../hooks/useAuth';
import { toast } from 'react-hot-toast';
import { cn } from '../../../lib/utils';

const FASE_OPTIONS = [
  { value: 'E', label: 'Fase E — Kelas 10 SMA/SMK' },
  { value: 'F', label: 'Fase F — Kelas 11-12 SMA/SMK' },
  { value: 'D', label: 'Fase D — Kelas 7-9 SMP' },
  { value: 'C', label: 'Fase C — Kelas 5-6 SD' },
  { value: 'B', label: 'Fase B — Kelas 3-4 SD' },
  { value: 'A', label: 'Fase A — Kelas 1-2 SD' },
];

const MONTHS_GANJIL = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const MONTHS_GENAP = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];

export interface ProtaPromesBuilderViewProps {
  initialMode?: 'PROTA' | 'PROMES';
  initialMapelId?: string;
  initialFase?: string;
  activeTpId?: string;
  activeSemId?: string;
  tahunPelajaranLabel?: string;
  onOpenAtpBuilder?: (mapelId?: string, fase?: string) => void;
  onSaved?: () => void;
}

export const ProtaPromesBuilderView: React.FC<ProtaPromesBuilderViewProps> = ({
  initialMode = 'PROTA',
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
  const sekolahNama = String((user as any)?.tenant?.nama_sekolah || 'Satuan Pendidikan');

  const [docMode, setDocMode] = useState<'PROTA' | 'PROMES'>(initialMode);
  const [selectedMapelId, setSelectedMapelId] = useState<string>(initialMapelId || '');
  const [selectedFase, setSelectedFase] = useState<string>(initialFase || 'E');
  const [promesSemester, setPromesSemester] = useState<'GANJIL' | 'GENAP'>('GANJIL');
  const [isSaving, setIsSaving] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Semester assignment per TP key (index or id): 'GANJIL' | 'GENAP'
  const [tpSemesterMap, setTpSemesterMap] = useState<Record<string, 'GANJIL' | 'GENAP'>>({});
  // Week distribution matrix for PROMES: key `${tpKey}_${monthIdx}_${weekIdx}` -> boolean
  const [promesWeeks, setPromesWeeks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setDocMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (initialMapelId) setSelectedMapelId(initialMapelId);
  }, [initialMapelId]);

  useEffect(() => {
    if (initialFase) setSelectedFase(initialFase);
  }, [initialFase]);

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

  // Auto-assign first half to GANJIL and second half to GENAP when TP list loads
  useEffect(() => {
    if (tpList.length === 0) return;
    setTpSemesterMap((prev) => {
      const next: Record<string, 'GANJIL' | 'GENAP'> = { ...prev };
      const half = Math.ceil(tpList.length / 2);
      tpList.forEach((tp, idx) => {
        const key = tp.id || tp.kode_tp || String(idx);
        if (!next[key]) {
          next[key] = idx < half ? 'GANJIL' : 'GENAP';
        }
      });
      return next;
    });
  }, [tpList]);

  const selectedMapelLabel =
    mapelOptions.find((m) => m.value === selectedMapelId)?.label || 'Mata Pelajaran';

  const protaSummary = useMemo(() => {
    let ganjilJp = 0;
    let genapJp = 0;
    tpList.forEach((tp, idx) => {
      const key = tp.id || tp.kode_tp || String(idx);
      const sem = tpSemesterMap[key] || 'GANJIL';
      const jp = Number(tp.alokasi_jp) || 0;
      if (sem === 'GANJIL') ganjilJp += jp;
      else genapJp += jp;
    });
    return { ganjilJp, genapJp, totalJp: ganjilJp + genapJp };
  }, [tpList, tpSemesterMap]);

  const months = promesSemester === 'GANJIL' ? MONTHS_GANJIL : MONTHS_GENAP;

  const promesTpList = useMemo(() => {
    const filtered = tpList.filter((tp, idx) => {
      const key = tp.id || tp.kode_tp || String(idx);
      return (tpSemesterMap[key] || 'GANJIL') === promesSemester;
    });
    return filtered.length > 0 ? filtered : tpList;
  }, [tpList, tpSemesterMap, promesSemester]);

  const toggleWeekCell = useCallback((tpKey: string, mIdx: number, wIdx: number) => {
    const cellKey = `${tpKey}_${mIdx}_${wIdx}`;
    setPromesWeeks((prev) => ({ ...prev, [cellKey]: !prev[cellKey] }));
  }, []);

  const buildPdfDocument = useCallback(async () => {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const isLandscape = docMode === 'PROMES';
    const doc = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageW = doc.internal.pageSize.getWidth();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(sekolahNama.toUpperCase(), pageW / 2, 15, { align: 'center' });

    doc.setFontSize(11);
    const titleText =
      docMode === 'PROTA'
        ? 'PROGRAM TAHUNAN (PROTA) — KURIKULUM MERDEKA'
        : `PROGRAM SEMESTER ${promesSemester} (PROMES) — KURIKULUM MERDEKA`;
    doc.text(titleText, pageW / 2, 22, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.line(14, 25, pageW - 14, 25);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Mata Pelajaran : ${selectedMapelLabel}`, 14, 32);
    doc.text(`Fase / Tahun   : Fase ${selectedFase} / ${tahunPelajaranLabel}`, 14, 37);
    doc.text(`Guru Pengampu  : ${guruNama}`, pageW / 2 + 10, 32);
    doc.text(`Sumber ATP     : ${activeAtp?.nama_atp || '-'}`, pageW / 2 + 10, 37);

    if (docMode === 'PROTA') {
      const body = tpList.map((tp, idx) => {
        const key = tp.id || tp.kode_tp || String(idx);
        const sem = tpSemesterMap[key] || 'GANJIL';
        return [
          idx + 1,
          tp.kode_tp || `TP ${idx + 1}`,
          tp.judul_materi,
          tp.deskripsi_tp || '-',
          sem === 'GANJIL' ? 'Ganjil (1)' : 'Genap (2)',
          `${tp.alokasi_jp || 0} JP`,
        ];
      });

      autoTable(doc, {
        startY: 43,
        head: [['No', 'Kode TP', 'Materi Pokok / Tujuan Pembelajaran', 'Capaian / Indikator', 'Semester', 'Alokasi']],
        body,
        foot: [['', '', `Total Ganjil: ${protaSummary.ganjilJp} JP • Total Genap: ${protaSummary.genapJp} JP`, '', 'TOTAL', `${protaSummary.totalJp} JP`]],
        styles: { fontSize: 8.5, cellPadding: 2.5, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [15, 23, 42] },
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', lineColor: [0, 0, 0], lineWidth: 0.2 },
        footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', lineColor: [0, 0, 0], lineWidth: 0.2 },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 48 },
          4: { cellWidth: 24, halign: 'center' },
          5: { cellWidth: 20, halign: 'center' },
        },
      });
    } else {
      const weekHeaders = months.flatMap((m) => ['1', '2', '3', '4'].map((w) => `${m.slice(0, 3)}\nM${w}`));
      const body = promesTpList.map((tp, idx) => {
        const key = tp.id || tp.kode_tp || String(idx);
        const cells = months.flatMap((_, mIdx) =>
          [0, 1, 2, 3].map((wIdx) => (promesWeeks[`${key}_${mIdx}_${wIdx}`] ? 'V' : ''))
        );
        return [idx + 1, tp.kode_tp || `TP ${idx + 1}`, tp.judul_materi, `${tp.alokasi_jp || 0}`, ...cells];
      });

      autoTable(doc, {
        startY: 43,
        head: [['No', 'Kode', 'Tujuan Pembelajaran / Materi', 'JP', ...weekHeaders]],
        body,
        styles: { fontSize: 7.5, cellPadding: 1.5, halign: 'center', lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [15, 23, 42] },
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', lineColor: [0, 0, 0], lineWidth: 0.2 },
        columnStyles: {
          0: { cellWidth: 8 },
          1: { cellWidth: 16 },
          2: { cellWidth: 55, halign: 'left' },
          3: { cellWidth: 10 },
        },
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
    doc.text('( _________________________ )', 25, currentY + 28);

    doc.text('Disusun oleh,', pageW - 75, currentY + 5);
    doc.text('Guru Mata Pelajaran', pageW - 75, currentY + 10);
    doc.text(guruNama, pageW - 75, currentY + 28);

    doc.text('Mengetahui / Menyetujui,', pageW / 2, currentY + 38, { align: 'center' });
    doc.text('Kepala Sekolah', pageW / 2, currentY + 43, { align: 'center' });
    doc.text('( _________________________ )', pageW / 2, currentY + 60, { align: 'center' });

    return doc;
  }, [
    docMode,
    promesSemester,
    sekolahNama,
    selectedMapelLabel,
    selectedFase,
    tahunPelajaranLabel,
    guruNama,
    activeAtp,
    tpList,
    tpSemesterMap,
    protaSummary,
    months,
    promesTpList,
    promesWeeks,
  ]);

  const handleOpenPrintPreview = () => {
    if (tpList.length === 0) {
      toast.error('Belum ada data TP dari ATP untuk dicetak.');
      return;
    }
    setIsPrintModalOpen(true);
  };

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
      const doc = await buildPdfDocument();
      const blob = doc.output('blob');
      const safeName = `${docMode}_${selectedMapelLabel.replace(/[^a-zA-Z0-9]+/g, '_')}_Fase_${selectedFase}.pdf`;
      const file = new File([blob], safeName, { type: 'application/pdf' });

      const judul =
        docMode === 'PROTA'
          ? `Program Tahunan (PROTA) ${selectedMapelLabel} — Fase ${selectedFase}`
          : `Program Semester ${promesSemester} (PROMES) ${selectedMapelLabel} — Fase ${selectedFase}`;

      const formData = new FormData();
      formData.append('judul', judul);
      formData.append('jenis', docMode);
      formData.append('mapel_id', selectedMapelId);
      formData.append('guru_id', guruId);
      formData.append('tahun_pelajaran_id', activeTpId);
      formData.append('semester_id', activeSemId);
      formData.append('file', file);

      await kurikulumApi.uploadPerangkatAjar(formData);
      toast.success(`${docMode} otomatis digenerate dari ATP & disimpan ke Perangkat Ajar!`);
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar-list'] });
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar-stats-all'] });
      if (onSaved) onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || `Gagal menyimpan ${docMode}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3 pb-6">
      {/* ═══ PANEL 1: Konteks & Mode Switcher (Compact) ═══ */}
      <div className="bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/40 dark:from-slate-900 dark:via-emerald-950/15 dark:to-slate-900 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 shadow-xs p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setDocMode('PROTA')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer',
                  docMode === 'PROTA'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                )}
              >
                Program Tahunan (PROTA)
              </button>
              <button
                type="button"
                onClick={() => setDocMode('PROMES')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer',
                  docMode === 'PROMES'
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                )}
              >
                Program Semester (PROMES)
              </button>
            </div>

            {docMode === 'PROTA' && tpList.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-black">
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  Ganjil: {protaSummary.ganjilJp} JP
                </span>
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                  Genap: {protaSummary.genapJp} JP
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Total: {protaSummary.totalJp} JP
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenPrintPreview}
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
              className="h-8 px-3.5 rounded-xl text-xs font-black gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm cursor-pointer"
            >
              <Save size={13} />
              <span>{isSaving ? 'Menyimpan...' : `Simpan ${docMode} ke Berkas`}</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <GraduationCap size={11} className="text-emerald-600" />
              Mata Pelajaran (Sumber ATP)
            </Label>
            {isLoadingMapel ? (
              <div className="h-9 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ) : (
              <SearchableSelect
                id="prota_mapel_select"
                options={mapelOptions}
                value={selectedMapelId}
                onChange={(val) => setSelectedMapelId(val)}
                placeholder="Pilih Mapel..."
              />
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Sparkles size={11} className="text-teal-600" />
              Fase Kurikulum
            </Label>
            <SearchableSelect
              id="prota_fase_select"
              options={FASE_OPTIONS}
              value={selectedFase}
              onChange={(val) => setSelectedFase(val || 'E')}
              placeholder="Pilih Fase..."
            />
          </div>

          {docMode === 'PROMES' && (
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <CalendarRange size={11} className="text-indigo-600" />
                Semester Target
              </Label>
              <div className="grid grid-cols-2 gap-1.5 h-10 p-1 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPromesSemester('GANJIL')}
                  className={cn(
                    'rounded-lg text-xs font-bold transition-all cursor-pointer',
                    promesSemester === 'GANJIL'
                      ? 'bg-teal-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                  )}
                >
                  Ganjil (Jul–Des)
                </button>
                <button
                  type="button"
                  onClick={() => setPromesSemester('GENAP')}
                  className={cn(
                    'rounded-lg text-xs font-bold transition-all cursor-pointer',
                    promesSemester === 'GENAP'
                      ? 'bg-teal-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                  )}
                >
                  Genap (Jan–Jun)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ PANEL 2: Konten Otomatis dari ATP ═══ */}
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
              Prota &amp; Promes ditarik otomatis dari daftar Tujuan Pembelajaran (TP) pada ATP agar Anda tidak perlu mengetik ulang.
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
      ) : docMode === 'PROTA' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-500 uppercase">
                  <th className="py-2.5 px-3 w-12 text-center">No</th>
                  <th className="py-2.5 px-3 w-24">Kode TP</th>
                  <th className="py-2.5 px-3">Materi Pokok &amp; Indikator</th>
                  <th className="py-2.5 px-3 w-44 text-center">Distribusi Semester</th>
                  <th className="py-2.5 px-3 w-20 text-center">JP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tpList.map((tp, idx) => {
                  const key = tp.id || tp.kode_tp || String(idx);
                  const sem = tpSemesterMap[key] || 'GANJIL';
                  return (
                    <tr key={key} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 text-center font-bold text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-[11px] border border-indigo-200/70 dark:border-indigo-800">
                          {tp.kode_tp}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">{tp.judul_materi}</div>
                        {tp.deskripsi_tp && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                            {tp.deskripsi_tp}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={() => setTpSemesterMap((p) => ({ ...p, [key]: 'GANJIL' }))}
                            className={cn(
                              'px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all',
                              sem === 'GANJIL'
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'text-slate-500 hover:text-slate-800'
                            )}
                          >
                            Ganjil
                          </button>
                          <button
                            type="button"
                            onClick={() => setTpSemesterMap((p) => ({ ...p, [key]: 'GENAP' }))}
                            className={cn(
                              'px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all',
                              sem === 'GENAP'
                                ? 'bg-purple-600 text-white shadow-2xs'
                                : 'text-slate-500 hover:text-slate-800'
                            )}
                          >
                            Genap
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-black font-mono text-slate-800 dark:text-slate-200">
                        {tp.alokasi_jp || 0} JP
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="px-3.5 py-2 bg-teal-50/70 dark:bg-teal-950/30 border-b border-teal-100 dark:border-teal-900/50 text-[11px] font-semibold text-teal-800 dark:text-teal-300">
            Klik kotak minggu (M1–M4) pada tiap bulan untuk menandai jadwal pelaksanaan TP di Semester {promesSemester}.
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase">
                  <th rowSpan={2} className="py-2 px-2.5 w-16 border-r border-slate-200 dark:border-slate-800">Kode</th>
                  <th rowSpan={2} className="py-2 px-3 min-w-[200px] border-r border-slate-200 dark:border-slate-800">Materi Pokok</th>
                  <th rowSpan={2} className="py-2 px-2 w-12 text-center border-r border-slate-200 dark:border-slate-800">JP</th>
                  {months.map((m) => (
                    <th key={m} colSpan={4} className="py-1.5 px-1 text-center border-r border-slate-200 dark:border-slate-800 last:border-r-0">
                      {m}
                    </th>
                  ))}
                </tr>
                <tr className="bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 text-[9px] font-bold text-slate-400">
                  {months.map((m) =>
                    [1, 2, 3, 4].map((w) => (
                      <th key={`${m}-${w}`} className="py-1 w-7 text-center border-r border-slate-100 dark:border-slate-800">
                        {w}
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {promesTpList.map((tp, idx) => {
                  const key = tp.id || tp.kode_tp || String(idx);
                  return (
                    <tr key={key} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                      <td className="py-2 px-2.5 font-mono font-bold text-[11px] text-teal-700 dark:text-teal-300 border-r border-slate-100 dark:border-slate-800">
                        {tp.kode_tp}
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-800 dark:text-slate-100 border-r border-slate-100 dark:border-slate-800">
                        {tp.judul_materi}
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-black border-r border-slate-100 dark:border-slate-800">
                        {tp.alokasi_jp || 0}
                      </td>
                      {months.map((_, mIdx) =>
                        [0, 1, 2, 3].map((wIdx) => {
                          const checked = Boolean(promesWeeks[`${key}_${mIdx}_${wIdx}`]);
                          return (
                            <td
                              key={`${mIdx}-${wIdx}`}
                              onClick={() => toggleWeekCell(key, mIdx, wIdx)}
                              className={cn(
                                'p-0 text-center border-r border-slate-100 dark:border-slate-800 cursor-pointer transition-colors select-none',
                                checked
                                  ? 'bg-teal-500 text-white'
                                  : 'hover:bg-teal-50 dark:hover:bg-teal-950/40'
                              )}
                            >
                              <div className="h-8 flex items-center justify-center">
                                {checked && <Check size={12} strokeWidth={3} />}
                              </div>
                            </td>
                          );
                        })
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Suspense fallback={null}>
        {isPrintModalOpen && (
          <ProtaPromesPrintModal
            isOpen={isPrintModalOpen}
            onClose={() => setIsPrintModalOpen(false)}
            docMode={docMode}
            promesSemester={promesSemester}
            mapelNama={selectedMapelLabel}
            fase={selectedFase}
            tahunPelajaranLabel={tahunPelajaranLabel}
            namaAtp={activeAtp?.nama_atp || ''}
            guruNama={guruNama}
            guruNip={guruNip}
            tpList={tpList}
            tpSemesterMap={tpSemesterMap}
            promesTpList={promesTpList}
            promesWeeks={promesWeeks}
            months={months}
            protaSummary={protaSummary}
          />
        )}
      </Suspense>
    </div>
  );
};
