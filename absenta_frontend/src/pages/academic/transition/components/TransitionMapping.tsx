import React, { useEffect, useState, useMemo } from 'react';
import {
  Button,
  Alert,
  AlertDescription,
} from '../../../../components/ui';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { getKelasList } from '../../../../api/academic/kelas.api';
import type { Kelas } from '../../../../types/academic';
import type { ClassMapping } from '../../../../api/academic/transition.api';
import {
  ArrowRight,
  RefreshCw,
  Check,
  Info,
  Loader2,
  GraduationCap,
  CheckCircle2,
} from 'lucide-react';

interface Props {
  onNext: (mapping: ClassMapping[]) => void;
  onBack: () => void;
  initialMapping?: ClassMapping[];
  managedClassId?: string;
}

// ── Tema warna per tingkat ─────────────────────────────────────────────────
const TINGKAT_THEMES = {
  10: {
    header: 'bg-gradient-to-br from-sky-500 to-sky-700',
    headerShadow: 'shadow-sky-500/30',
    connector: 'bg-sky-300 dark:bg-sky-700',
    cardBorder: 'border-sky-200 dark:border-sky-800',
    cardBg: 'bg-sky-50 dark:bg-sky-950/40',
    cardHover: 'hover:border-sky-400 hover:shadow-sky-100 dark:hover:shadow-sky-900/20',
    nameBg: 'bg-sky-500',
    nameText: 'text-white',
    label: 'TINGKAT X',
    selectBorder: 'border-sky-300 dark:border-sky-700',
    unmappedText: 'text-sky-400 dark:text-sky-500',
    dot: 'bg-sky-400',
  },
  11: {
    header: 'bg-gradient-to-br from-violet-500 to-violet-700',
    headerShadow: 'shadow-violet-500/30',
    connector: 'bg-violet-300 dark:bg-violet-700',
    cardBorder: 'border-violet-200 dark:border-violet-800',
    cardBg: 'bg-violet-50 dark:bg-violet-950/40',
    cardHover: 'hover:border-violet-400 hover:shadow-violet-100 dark:hover:shadow-violet-900/20',
    nameBg: 'bg-violet-500',
    nameText: 'text-white',
    label: 'TINGKAT XI',
    selectBorder: 'border-violet-300 dark:border-violet-700',
    unmappedText: 'text-violet-400 dark:text-violet-500',
    dot: 'bg-violet-400',
  },
  12: {
    header: 'bg-gradient-to-br from-rose-500 to-rose-700',
    headerShadow: 'shadow-rose-500/30',
    connector: 'bg-rose-300 dark:bg-rose-700',
    cardBorder: 'border-rose-200 dark:border-rose-800',
    cardBg: 'bg-rose-50 dark:bg-rose-950/40',
    cardHover: 'hover:border-rose-400 hover:shadow-rose-100 dark:hover:shadow-rose-900/20',
    nameBg: 'bg-rose-500',
    nameText: 'text-white',
    label: 'TINGKAT XII',
    selectBorder: 'border-rose-300 dark:border-rose-700',
    unmappedText: 'text-rose-400 dark:text-rose-500',
    dot: 'bg-rose-400',
  },
} as const;

type TingkatKey = keyof typeof TINGKAT_THEMES;

const getTheme = (tingkat: number) =>
  TINGKAT_THEMES[(tingkat as TingkatKey)] ?? TINGKAT_THEMES[12];

// ── Kartu Kelas (compact org-chart style) ─────────────────────────────────
const KelasCard: React.FC<{
  kelas: Kelas;
  isMapped: boolean;
  mappedValue: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
  isLast: boolean;
}> = ({ kelas, isMapped, mappedValue, options, onChange, isLast }) => {
  const theme = getTheme(kelas.tingkat);

  // Cari label kelas tujuan yang sudah dipetakan
  const mappedLabel = options.find(o => o.value === mappedValue)?.label ?? mappedValue;

  return (
    <div className="relative flex flex-col items-center w-full">
      {/* Garis penghubung atas */}
      <div className={`w-0.5 h-5 ${theme.connector}`} />

      {/* Kartu utama */}
      <div
        className={`w-full rounded-xl border-2 transition-all duration-300 shadow-sm hover:shadow-md p-3 flex items-center gap-2.5
          ${theme.cardBorder} ${theme.cardBg} ${theme.cardHover}`}
      >
        {/* Kelas Asal (Kiri) */}
        <div className="flex items-center gap-2 shrink-0">
          <div className={`${theme.nameBg} ${theme.nameText} px-3 py-1.5 rounded-lg flex items-center gap-2 font-black text-xs uppercase tracking-wide`}>
            <span>{kelas.nama_kelas}</span>
            {isMapped ? (
              <CheckCircle2 size={12} className="text-white/90" />
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
            )}
          </div>
          <ArrowRight size={14} className="text-slate-400 shrink-0" />
        </div>

        {/* Kelas Tujuan (Kanan) */}
        <div className="flex-1 min-w-0">
          <SearchableSelect
            value={mappedValue}
            onValueChange={onChange}
            options={options}
            placeholder="Pilih tujuan..."
            triggerClassName={`h-9 text-[10px] font-bold rounded-lg border-2 transition-all w-full ${
              isMapped
                ? 'border-green-300 dark:border-green-700 bg-green-50/60 dark:bg-green-950/20 text-green-700 dark:text-green-400'
                : `${theme.selectBorder} bg-white dark:bg-slate-950`
            }`}
          />
        </div>
      </div>

      {/* Garis penghubung bawah (kecuali kartu terakhir di kolom) */}
      {!isLast && <div className={`w-0.5 h-3 ${theme.connector}`} />}
    </div>
  );
};

// ── Kolom Tingkat (org-chart column) ──────────────────────────────────────
const TingkatColumn: React.FC<{
  tingkat: number;
  classes: Kelas[];
  mapping: Record<string, string>;
  getOptions: (k: Kelas) => { value: string; label: string }[];
  onMappingChange: (id: string, val: string) => void;
}> = ({ tingkat, classes, mapping, getOptions, onMappingChange }) => {
  const theme = getTheme(tingkat);
  if (classes.length === 0) return null;

  return (
    <div className="flex flex-col items-center flex-1 min-w-0">
      {/* Header tingkat */}
      <div
        className={`${theme.header} ${theme.headerShadow} shadow-lg text-white rounded-xl px-6 py-3 w-full text-center mb-0 z-10`}
      >
        <div className="text-[10px] font-black uppercase tracking-[0.25em] opacity-80 mb-0.5">Tingkat</div>
        <div className="text-lg font-black tracking-tight">{theme.label.replace('TINGKAT ', '')}</div>
      </div>

      {/* Garis vertikal dari header ke kartu pertama */}
      <div className={`w-0.5 h-6 ${theme.connector}`} />

      {/* Stack kartu kelas */}
      <div className="w-full flex flex-col gap-0">
        {classes.map((kelas, idx) => (
          <KelasCard
            key={kelas.id}
            kelas={kelas}
            isMapped={!!mapping[kelas.id]}
            mappedValue={mapping[kelas.id] || ''}
            options={getOptions(kelas)}
            onChange={(val) => onMappingChange(kelas.id, val)}
            isLast={idx === classes.length - 1}
          />
        ))}
      </div>
    </div>
  );
};

// ── Komponen utama ─────────────────────────────────────────────────────────
const TransitionMapping: React.FC<Props> = ({ onNext, onBack, initialMapping, managedClassId }) => {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<Kelas[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});

  useEffect(() => { fetchClasses(); }, []);

  useEffect(() => {
    if (initialMapping) {
      const map: Record<string, string> = {};
      initialMapping.forEach(m => { map[m.fromKelasId] = m.toKelasId; });
      setMapping(map);
    }
  }, [initialMapping]);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const res = await getKelasList(1, 1000);
      setClasses(res.data);
      if (!initialMapping) autoMapClasses(res.data);
    } catch (error) {
      console.error('Failed to fetch classes', error);
    } finally {
      setLoading(false);
    }
  };

  const autoMapClasses = (data: Kelas[]) => {
    const newMapping: Record<string, string> = {};
    const byJurusanTingkat: Record<string, Kelas[]> = {};
    data.forEach(k => {
      const key = `${k.jurusan_id || 'general'}:${k.tingkat}`;
      if (!byJurusanTingkat[key]) byJurusanTingkat[key] = [];
      byJurusanTingkat[key].push(k);
    });
    data.forEach(source => {
      const targetTingkat = source.tingkat + 1;
      const targetKey = `${source.jurusan_id || 'general'}:${targetTingkat}`;
      const candidates = byJurusanTingkat[targetKey];
      if (candidates && candidates.length > 0) {
        const sourceSuffix = source.nama_kelas.replace(/^(X|XI|XII|10|11|12)\s*/i, '');
        const exactMatch = candidates.find(c => {
          const targetSuffix = c.nama_kelas.replace(/^(X|XI|XII|10|11|12)\s*/i, '');
          return targetSuffix === sourceSuffix;
        });
        newMapping[source.id] = exactMatch ? exactMatch.id : candidates[0].id;
      } else if (source.tingkat >= 12) {
        newMapping[source.id] = 'LULUS';
      }
    });
    setMapping(prev => ({ ...prev, ...newMapping }));
  };

  const handleMappingChange = (sourceId: string, targetId: string) => {
    setMapping(prev => ({ ...prev, [sourceId]: targetId }));
  };

  const handleSubmit = () => {
    const result: ClassMapping[] = Object.entries(mapping).map(([from, to]) => ({
      fromKelasId: from,
      toKelasId: to,
    }));
    onNext(result);
  };

  const sortedClasses = useMemo(() =>
    [...classes].sort((a, b) =>
      a.tingkat !== b.tingkat ? a.tingkat - b.tingkat : a.nama_kelas.localeCompare(b.nama_kelas)
    ), [classes]);

  // Kelompokkan per tingkat
  const classesByTingkat = useMemo(() => {
    const grouped: Record<number, Kelas[]> = {};
    const base = managedClassId
      ? sortedClasses.filter(c => c.id === managedClassId)
      : sortedClasses;
    base.forEach(k => {
      if (!grouped[k.tingkat]) grouped[k.tingkat] = [];
      grouped[k.tingkat].push(k);
    });
    return grouped;
  }, [sortedClasses, managedClassId]);

  const tingkatList = useMemo(() =>
    Object.keys(classesByTingkat).map(Number).sort((a, b) => a - b),
    [classesByTingkat]);

  const getTargetOptions = (source: Kelas) => {
    const targetTingkat = source.tingkat + 1;
    const sameJurusan = sortedClasses.filter(
      c => c.tingkat === targetTingkat && c.jurusan_id === source.jurusan_id
    );
    const candidates = sameJurusan.length > 0
      ? sameJurusan
      : sortedClasses.filter(c => c.tingkat === targetTingkat);
    const options = candidates.map(c => ({
      value: c.id,
      label: `${c.nama_kelas}`,
    }));
    if (source.tingkat >= 12 || options.length === 0) {
      options.push({ value: 'LULUS', label: 'LULUS / ALUMNI' });
    }
    return options;
  };

  // Progress
  const totalClasses = sortedClasses.length;
  const mappedCount = Object.values(mapping).filter(Boolean).length;
  const progressPct = totalClasses > 0 ? Math.round((mappedCount / totalClasses) * 100) : 0;

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 animate-in fade-in duration-500">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Memuat Data Kelas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700">

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 px-5 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
            <GraduationCap size={18} />
          </div>
          <div>
            <p className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Pemetaan Kenaikan Kelas</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              {mappedCount} / {totalClasses} kelas terpetakan
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Progress bar */}
          <div className="hidden sm:flex flex-col items-end gap-1 min-w-[100px]">
            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{progressPct}% selesai</span>
          </div>
          <Button
            variant="toolbarOutline"
            size="toolbar"
            onClick={() => autoMapClasses(classes)}
            className="rounded-xl border-slate-200 dark:border-slate-800 flex-shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Auto-Map
          </Button>
        </div>
      </div>

      {/* ── Info Mode Terbatas ── */}
      {managedClassId && (
        <Alert className="bg-amber-50/50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30 rounded-xl border-dashed">
          <div className="flex gap-3">
            <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <AlertDescription className="text-[10px] font-bold text-amber-900 dark:text-amber-400 uppercase tracking-tight">
              Mode Terbatas: Anda hanya dapat melakukan pemetaan untuk kelas yang Anda ampu sebagai Wali Kelas.
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-3 px-1">
        {([10, 11, 12] as TingkatKey[]).map(t => {
          const th = getTheme(t);
          return (
            <div key={t} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${th.dot}`} />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{th.label}</span>
            </div>
          );
        })}
        <div className="flex items-center gap-1.5 ml-2">
          <CheckCircle2 size={12} className="text-green-500" />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sudah dipetakan</span>
        </div>
      </div>

      {/* ── Org-Chart Layout ── */}
      {tingkatList.length === 0 ? (
        <div className="py-20 text-center bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Tidak ada kelas yang ditemukan</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 overflow-x-auto">
          {/* Garis horizontal penghubung antar kolom */}
          <div className="relative flex items-start gap-4 min-w-max md:min-w-0">
            {/* Garis horizontal di atas kolom */}
            {tingkatList.length > 1 && (
              <div
                className="absolute top-[38px] left-[calc(50%/var(--cols))] right-[calc(50%/var(--cols))] h-0.5 bg-slate-200 dark:bg-slate-700 z-0"
                style={{ '--cols': tingkatList.length } as React.CSSProperties}
              />
            )}

            {tingkatList.map((tingkat) => (
              <TingkatColumn
                key={tingkat}
                tingkat={tingkat}
                classes={classesByTingkat[tingkat] || []}
                mapping={mapping}
                getOptions={getTargetOptions}
                onMappingChange={handleMappingChange}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Footer Actions ── */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        <Button
          variant="toolbarOutline"
          onClick={onBack}
          className="h-11 px-8 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2 border-slate-200 dark:border-slate-800 w-full sm:w-auto"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          Kembali
        </Button>

        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="hidden sm:flex flex-col items-end mr-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress Pemetaan</p>
            <p className="text-sm font-black text-slate-900 dark:text-slate-100">{mappedCount} / {totalClasses} Kelas</p>
          </div>
          <Button
            onClick={handleSubmit}
            className="h-11 px-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[10px] gap-2 shadow-xl shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 w-full sm:w-auto"
          >
            Peninjauan Preview
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TransitionMapping;
