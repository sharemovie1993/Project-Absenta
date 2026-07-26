import React, { useEffect, useState, useMemo } from 'react';
import {
  Button,
  Alert,
  AlertDescription,
} from '../../../../components/ui';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { getKelasList } from '../../../../api/academic/kelas.api';
import type { Kelas } from '../../../../types/academic';
import type { ClassMapping, MissingNextClassItem } from '../../../../api/academic/transition.api';
import { detectMissingNextClasses, createNextGradeClasses } from '../../../../api/academic/transition.api';
import {
  ArrowRight,
  RefreshCw,
  Check,
  Info,
  Loader2,
  GraduationCap,
  CheckCircle2,
  Wand2,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import useConfirm from '../../../../hooks/useConfirm';

interface Props {
  onNext: (mapping: ClassMapping[]) => void;
  onBack: () => void;
  initialMapping?: ClassMapping[];
  managedClassId?: string;
}

// ── Tema warna dinamis per tingkat (index-based, mendukung SD/SMP/SMA) ────
const TINGKAT_THEMES = [
  { // Index 0: Sky/Blue
    header: 'bg-gradient-to-br from-sky-500 to-sky-700',
    headerShadow: 'shadow-sky-500/30',
    connector: 'bg-sky-300 dark:bg-sky-700',
    cardBorder: 'border-sky-200 dark:border-sky-800',
    cardBg: 'bg-sky-50 dark:bg-sky-950/40',
    cardHover: 'hover:border-sky-400 hover:shadow-sky-100 dark:hover:shadow-sky-900/20',
    nameBg: 'bg-sky-500',
    nameText: 'text-white',
    selectBorder: 'border-sky-300 dark:border-sky-700',
    unmappedText: 'text-sky-400 dark:text-sky-500',
    dot: 'bg-sky-400',
  },
  { // Index 1: Violet/Purple
    header: 'bg-gradient-to-br from-violet-500 to-violet-700',
    headerShadow: 'shadow-violet-500/30',
    connector: 'bg-violet-300 dark:bg-violet-700',
    cardBorder: 'border-violet-200 dark:border-violet-800',
    cardBg: 'bg-violet-50 dark:bg-violet-950/40',
    cardHover: 'hover:border-violet-400 hover:shadow-violet-100 dark:hover:shadow-violet-900/20',
    nameBg: 'bg-violet-500',
    nameText: 'text-white',
    selectBorder: 'border-violet-300 dark:border-violet-700',
    unmappedText: 'text-violet-400 dark:text-violet-500',
    dot: 'bg-violet-400',
  },
  { // Index 2: Rose/Pink
    header: 'bg-gradient-to-br from-rose-500 to-rose-700',
    headerShadow: 'shadow-rose-500/30',
    connector: 'bg-rose-300 dark:bg-rose-700',
    cardBorder: 'border-rose-200 dark:border-rose-800',
    cardBg: 'bg-rose-50 dark:bg-rose-950/40',
    cardHover: 'hover:border-rose-400 hover:shadow-rose-100 dark:hover:shadow-rose-900/20',
    nameBg: 'bg-rose-500',
    nameText: 'text-white',
    selectBorder: 'border-rose-300 dark:border-rose-700',
    unmappedText: 'text-rose-400 dark:text-rose-500',
    dot: 'bg-rose-400',
  },
  { // Index 3: Emerald/Green
    header: 'bg-gradient-to-br from-emerald-500 to-emerald-700',
    headerShadow: 'shadow-emerald-500/30',
    connector: 'bg-emerald-300 dark:bg-emerald-700',
    cardBorder: 'border-emerald-200 dark:border-emerald-800',
    cardBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    cardHover: 'hover:border-emerald-400 hover:shadow-emerald-100 dark:hover:shadow-emerald-900/20',
    nameBg: 'bg-emerald-500',
    nameText: 'text-white',
    selectBorder: 'border-emerald-300 dark:border-emerald-700',
    unmappedText: 'text-emerald-400 dark:text-emerald-500',
    dot: 'bg-emerald-400',
  },
  { // Index 4: Amber/Orange
    header: 'bg-gradient-to-br from-amber-500 to-amber-700',
    headerShadow: 'shadow-amber-500/30',
    connector: 'bg-amber-300 dark:bg-amber-700',
    cardBorder: 'border-amber-200 dark:border-amber-800',
    cardBg: 'bg-amber-50 dark:bg-amber-950/40',
    cardHover: 'hover:border-amber-400 hover:shadow-amber-100 dark:hover:shadow-amber-900/20',
    nameBg: 'bg-amber-500',
    nameText: 'text-white',
    selectBorder: 'border-amber-300 dark:border-amber-700',
    unmappedText: 'text-amber-400 dark:text-amber-500',
    dot: 'bg-amber-400',
  },
  { // Index 5: Indigo
    header: 'bg-gradient-to-br from-indigo-500 to-indigo-700',
    headerShadow: 'shadow-indigo-500/30',
    connector: 'bg-indigo-300 dark:bg-indigo-700',
    cardBorder: 'border-indigo-200 dark:border-indigo-800',
    cardBg: 'bg-indigo-50 dark:bg-indigo-950/40',
    cardHover: 'hover:border-indigo-400 hover:shadow-indigo-100 dark:hover:shadow-indigo-900/20',
    nameBg: 'bg-indigo-500',
    nameText: 'text-white',
    selectBorder: 'border-indigo-300 dark:border-indigo-700',
    unmappedText: 'text-indigo-400 dark:text-indigo-500',
    dot: 'bg-indigo-400',
  },
];

// Pilih tema berdasarkan indeks dalam daftar tingkat yang aktif (dinamis, bergilir)
const getTheme = (tingkat: number, tingkatList: number[]) => {
  const idx = tingkatList.indexOf(tingkat);
  return TINGKAT_THEMES[idx >= 0 ? idx % TINGKAT_THEMES.length : 0];
};

// ── Kartu Kelas (compact org-chart style) ─────────────────────────────────
const KelasCard: React.FC<{
  kelas: Kelas;
  theme: typeof TINGKAT_THEMES[0];
  isMapped: boolean;
  mappedValue: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
  isLast: boolean;
}> = ({ kelas, theme, isMapped, mappedValue, options, onChange, isLast }) => {
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
  tingkatList: number[];
  classes: Kelas[];
  mapping: Record<string, string>;
  getOptions: (k: Kelas) => { value: string; label: string }[];
  onMappingChange: (id: string, val: string) => void;
}> = ({ tingkat, tingkatList, classes, mapping, getOptions, onMappingChange }) => {
  const theme = getTheme(tingkat, tingkatList);
  if (classes.length === 0) return null;

  return (
    <div className="flex flex-col items-center flex-1 min-w-0">
      {/* Header tingkat */}
      <div
        className={`${theme.header} ${theme.headerShadow} shadow-lg text-white rounded-xl px-6 py-3 w-full text-center mb-0 z-10`}
      >
        <div className="text-[10px] font-black uppercase tracking-[0.25em] opacity-80 mb-0.5">Tingkat</div>
        <div className="text-lg font-black tracking-tight">{tingkat}</div>
      </div>

      {/* Garis vertikal dari header ke kartu pertama */}
      <div className={`w-0.5 h-6 ${theme.connector}`} />

      {/* Stack kartu kelas */}
      <div className="w-full flex flex-col gap-0">
        {classes.map((kelas, idx) => (
          <KelasCard
            key={kelas.id}
            kelas={kelas}
            theme={theme}
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
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<Kelas[]>([]);       // Kelas aktif saja (sumber)
  const [allClasses, setAllClasses] = useState<Kelas[]>([]); // Semua kelas (tujuan)
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [missingClasses, setMissingClasses] = useState<MissingNextClassItem[]>([]);
  const [creatingClasses, setCreatingClasses] = useState(false);
  const [editedNames, setEditedNames] = useState<Record<string, string>>({});

  // Dynamic maxTingkat from allClasses (fallback jika jenjang tidak diset)
  const maxTingkat = useMemo(() => {
    if (allClasses.length === 0) return 12;
    return Math.max(...allClasses.map(k => k.tingkat || 0));
  }, [allClasses]);

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
      // Kelas sumber: hanya yang aktif (ada siswa aktif di semester berjalan)
      // Kelas tujuan: juga hanya yang aktif — kelas tidak aktif tidak boleh jadi tujuan pemetaan
      const [activeRes, allRes, missingRes] = await Promise.all([
        getKelasList(1, 1000, '', '', '', '', 'true'),
        getKelasList(1, 1000, '', '', '', '', 'true'),
        detectMissingNextClasses(),
      ]);
      setClasses(activeRes.data);
      setAllClasses(allRes.data);
      if (missingRes?.data?.missing) {
        setMissingClasses(missingRes.data.missing);
        // Pre-fill editedNames with suggested names
        const names: Record<string, string> = {};
        missingRes.data.missing.forEach(m => { names[m.sourceKelasId] = m.suggestedNama; });
        setEditedNames(names);
      }
      if (!initialMapping) autoMapClasses(activeRes.data);
    } catch (error) {
      console.error('Failed to fetch classes', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoCreateClasses = async () => {
    const ok = await confirm({
      title: 'Buat Kelas Tingkat Berikutnya',
      description: `Sistem akan membuat ${missingClasses.length} kelas baru untuk tingkat berikutnya. Anda bisa ubah nama kelas sebelum dibuat. Lanjutkan?`,
      confirmText: 'Buat Kelas',
      cancelText: 'Batal',
      style: 'warning',
    });
    if (!ok) return;
    setCreatingClasses(true);
    try {
      const payload = missingClasses.map(m => ({
        sourceKelasId: m.sourceKelasId,
        namaKelas: editedNames[m.sourceKelasId] || m.suggestedNama,
      }));
      const res = await createNextGradeClasses(payload);
      toast.success(`${res.data.created} kelas berhasil dibuat! Silakan lanjutkan pemetaan.`);
      setMissingClasses([]);
      await fetchClasses(); // Reload classes after creation
    } catch (err: any) {
      toast.error(err?.message || 'Gagal membuat kelas');
    } finally {
      setCreatingClasses(false);
    }
  };

  const autoMapClasses = async (data: Kelas[], showConfirm = false) => {
    if (showConfirm) {
      const ok = await confirm({
        title: 'Konfirmasi Auto-Map',
        description: 'Sistem akan otomatis memetakan kelas asal ke kelas tujuan berdasarkan Program Keahlian. Harap periksa kembali hasilnya sebelum melanjutkan ke langkah berikutnya.',
        confirmText: 'Terapkan',
        cancelText: 'Batal',
        style: 'warning',
      });
      if (!ok) return;
    }

    const newMapping: Record<string, string> = {};

    // Gunakan allClasses untuk kandidat tujuan (termasuk kelas tidak aktif)
    const targetPool = allClasses.length > 0 ? allClasses : data;

    // Helper: Ambil key Program Keahlian (atau fallback ke jurusan_id)
    const getGroupKey = (k: Kelas) => {
      return k.Jurusan?.program_keahlian_id || k.jurusan_id || 'general';
    };

    // Kelompokkan target (tingkat XI/XII) per ProgramKeahlian:tingkat
    const byProgramTingkat: Record<string, Kelas[]> = {};
    targetPool.forEach(k => {
      const key = `${getGroupKey(k)}:${k.tingkat}`;
      if (!byProgramTingkat[key]) byProgramTingkat[key] = [];
      byProgramTingkat[key].push(k);
    });

    // Urutkan target secara alfabetis berdasarkan nama kelas
    Object.values(byProgramTingkat).forEach(arr =>
      arr.sort((a, b) => a.nama_kelas.localeCompare(b.nama_kelas))
    );

    // Kelompokkan sumber (tingkat X/XI) per ProgramKeahlian:tingkat
    const sourceByProgramTingkat: Record<string, Kelas[]> = {};
    data.forEach(k => {
      const key = `${getGroupKey(k)}:${k.tingkat}`;
      if (!sourceByProgramTingkat[key]) sourceByProgramTingkat[key] = [];
      sourceByProgramTingkat[key].push(k);
    });

    // Urutkan sumber secara alfabetis berdasarkan nama kelas
    Object.values(sourceByProgramTingkat).forEach(arr =>
      arr.sort((a, b) => a.nama_kelas.localeCompare(b.nama_kelas))
    );

    // Helper: ambil angka di akhir nama kelas (misal "X TE 1" → "1", "XI TOI 2" → "2")
    const getTrailingNumber = (name: string): string | null => {
      const match = name.match(/(\d+)\s*$/);
      return match ? match[1] : null;
    };

    // Helper: hapus prefix tingkat dari nama kelas
    const removeTingkatPrefix = (name: string) =>
      name.replace(/^(XII|XI|X|12|11|10)\s*/i, '').trim();

    // Set untuk mencatat kelas tujuan yang sudah terpakai (menghindari bentrokan pemetaan ganda)
    const usedTargets = new Set<string>();

    // Compute maxTingkat dynamically from the data
    const localMaxTingkat = data.length > 0 ? Math.max(...data.map(k => k.tingkat || 0)) : 12;

    data.forEach(source => {
      const targetTingkat = source.tingkat + 1;
      const targetKey = `${getGroupKey(source)}:${targetTingkat}`;
      const candidates = byProgramTingkat[targetKey] || [];

      // Kelas tingkat tertinggi → LULUS (dinamis berdasarkan jenjang)
      if (source.tingkat >= localMaxTingkat) {
        newMapping[source.id] = 'LULUS';
        return;
      }

      if (candidates.length === 0) return;

      // ── Strategi 1: Exact suffix match (dan belum terpakai) ─────────────────
      // Cocok untuk penamaan standar: X AKL 1 → XI AKL 1
      const sourceSuffix = removeTingkatPrefix(source.nama_kelas);
      const exactMatch = candidates.find(c =>
        !usedTargets.has(c.id) && removeTingkatPrefix(c.nama_kelas) === sourceSuffix
      );
      if (exactMatch) {
        newMapping[source.id] = exactMatch.id;
        usedTargets.add(exactMatch.id);
        return;
      }

      // ── Strategi 2: Trailing number match (dan belum terpakai) ──────────────
      // Untuk Kurikulum Merdeka: X TE 1 → XI TOI 1, X TE 4 → XI TAV 1
      const sourceNumber = getTrailingNumber(source.nama_kelas);
      if (sourceNumber) {
        const numberMatch = candidates.find(c =>
          !usedTargets.has(c.id) && getTrailingNumber(c.nama_kelas) === sourceNumber
        );
        if (numberMatch) {
          newMapping[source.id] = numberMatch.id;
          usedTargets.add(numberMatch.id);
          return;
        }
      }

      // ── Strategi 3: Positional order (dan belum terpakai) ───────────────────
      // Petakan berurutan indeks relatif kelas dalam rumpun program keahlian
      const sourceGroupKey = `${getGroupKey(source)}:${source.tingkat}`;
      const sourceGroup = sourceByProgramTingkat[sourceGroupKey] || [];
      const sourceIndex = sourceGroup.findIndex(k => k.id === source.id);

      if (sourceIndex !== -1) {
        // Cari kandidat yang belum terpakai terdekat secara indeks
        const unusedCandidates = candidates.filter(c => !usedTargets.has(c.id));
        if (unusedCandidates.length > 0) {
          const match = unusedCandidates[Math.min(sourceIndex, unusedCandidates.length - 1)];
          newMapping[source.id] = match.id;
          usedTargets.add(match.id);
          return;
        }
      }

      // ── Fallback: Ambil kandidat pertama yang tersisa ───────────────────────
      const fallback = candidates.find(c => !usedTargets.has(c.id)) || candidates[0];
      if (fallback) {
        newMapping[source.id] = fallback.id;
        usedTargets.add(fallback.id);
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
    const allSorted = [...allClasses].sort((a, b) =>
      a.tingkat !== b.tingkat ? a.tingkat - b.tingkat : a.nama_kelas.localeCompare(b.nama_kelas)
    );
    const allAtTarget = allSorted.filter(c => c.tingkat === targetTingkat);

    // Jika kelas ini di tingkat tertinggi → hanya LULUS
    if (source.tingkat >= maxTingkat) {
      return [{ value: 'LULUS', label: 'LULUS / ALUMNI' }];
    }

    // Jika tidak ada kelas tujuan tersedia (sekolah 1 angkatan / belum dibuat)
    if (allAtTarget.length === 0) {
      return [{ value: '', label: `— Kelas ${targetTingkat} belum ada, buat dulu —`, group: 'Perhatian' }];
    }

    // Program Keahlian source
    const sourceProgramKeahlianId = source.Jurusan?.program_keahlian_id;

    // Prioritas: kelas dengan Program Keahlian yang sama (atau jurusan yang sama jika PK belum diset)
    const samePK = sourceProgramKeahlianId
      ? allAtTarget.filter(c => c.Jurusan?.program_keahlian_id === sourceProgramKeahlianId)
      : allAtTarget.filter(c => c.jurusan_id === source.jurusan_id);

    const otherPK = allAtTarget.filter(c =>
      !samePK.some(s => s.id === c.id)
    );

    const options: { value: string; label: string; group?: string }[] = [];

    if (samePK.length > 0) {
      samePK.forEach(c => options.push({
        value: c.id,
        label: c.nama_kelas,
        group: sourceProgramKeahlianId
          ? `Program Keahlian: ${samePK[0].Jurusan?.ProgramKeahlian?.nama || 'Sama'}`
          : 'Jurusan Sama'
      }));
    }

    if (otherPK.length > 0) {
      otherPK.forEach(c => options.push({
        value: c.id,
        label: c.nama_kelas,
        group: 'Program Keahlian Lain'
      }));
    }

    options.push({ value: 'LULUS', label: 'LULUS / ALUMNI' });

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
            onClick={() => autoMapClasses(classes, true)}
            className="rounded-xl border-slate-200 dark:border-slate-800 flex-shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Auto-Map
          </Button>
        </div>
      </div>

      {/* ── Banner Kelas Tujuan Belum Ada (Sekolah 1 Angkatan) ── */}
      {missingClasses.length > 0 && (
        <Alert className="bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800 rounded-xl">
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-black text-orange-900 dark:text-orange-300 uppercase tracking-tight">
                  {missingClasses.length} Kelas Tingkat Berikutnya Belum Ada
                </p>
                <p className="text-[10px] text-orange-700 dark:text-orange-400 mt-0.5">
                  Kelas-kelas berikut tidak memiliki pasangan di tingkat selanjutnya. Buat otomatis atau tambahkan manual di menu Kelas.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 ml-7">
              {missingClasses.map(m => (
                <div key={m.sourceKelasId} className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-orange-800 dark:text-orange-300 min-w-[120px]">{m.sourceNama} →</span>
                  <input
                    type="text"
                    value={editedNames[m.sourceKelasId] ?? m.suggestedNama}
                    onChange={e => setEditedNames(prev => ({ ...prev, [m.sourceKelasId]: e.target.value }))}
                    className="text-[11px] px-2 py-1 rounded-lg border border-orange-300 dark:border-orange-700 bg-white dark:bg-orange-950/40 text-orange-900 dark:text-orange-200 font-bold w-40 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
              ))}
            </div>
            <div className="ml-7">
              <Button
                onClick={handleAutoCreateClasses}
                disabled={creatingClasses}
                className="h-8 px-4 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-widest text-[9px] gap-2 shadow-md shadow-orange-500/20"
              >
                {creatingClasses ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                {creatingClasses ? 'Membuat...' : `Buat ${missingClasses.length} Kelas Otomatis`}
              </Button>
            </div>
          </div>
        </Alert>
      )}

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
        {tingkatList.map(t => {
          const th = getTheme(t, tingkatList);
          return (
            <div key={t} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${th.dot}`} />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">TINGKAT {t}</span>
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
                tingkatList={tingkatList}
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
