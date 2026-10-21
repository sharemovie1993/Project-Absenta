import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTahunPelajaranOptions } from '@/hooks/useTahunPelajaranOptions';
import { useSemesterOptions } from '@/hooks/useSemesterOptions';
import { useKelasOptions } from '@/hooks/useKelasOptions';
import { useGuruOptions } from '@/hooks/useGuruOptions';
import { useSiswaOptions } from '@/hooks/useSiswaOptions';
import { useDebounce } from '@/hooks/useDebounce';
import { getKelasCohortLineage, type CohortLineageStage } from '@/api/attendanceGerbang.api';
import { useJenjang } from '@/hooks/useJenjang';
import { toLocalMonth, toLocalDate } from '@/utils/attendance/time';
import type { SearchableSelectOption } from '@/components/ui/SearchableSelect';
import type {
  AcademicFilterValues,
  UseAcademicFilterOptions,
  UseAcademicFilterReturn,
  AcademicFilterToolbarProps,
} from './types';

const ROMAN_MAP: Record<number, string> = {
  1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI',
  7: 'VII', 8: 'VIII', 9: 'IX',
  10: 'X', 11: 'XI', 12: 'XII', 13: 'XIII',
};

export function useAcademicFilter(options: UseAcademicFilterOptions = {}): UseAcademicFilterReturn {
  const { tingkatList, jenjang, isJenjangSmk } = useJenjang();

  const tingkatOptions: SearchableSelectOption[] = useMemo(() => {
    return tingkatList.map((t) => {
      const roman = ROMAN_MAP[t];
      const romanText = roman ? ` (${roman})` : '';
      return {
        value: String(t),
        label: `Kelas ${t}${romanText}`,
      };
    });
  }, [tingkatList]);
  const {
    enableTp = true,
    enableSemester = false,
    enableTingkat = false,
    enableKelas = false,
    enableCohort = true,
    enableBulan = false,
    enableTanggal = false,
    enableGuru = false,
    enableSiswa = false,
    enableSearch = false,

    initialTpId = '',
    initialSemesterId = '',
    initialTingkat = '',
    initialKelasId = '',
    initialBulan = '',
    initialTanggal = '',
    initialGuruId = '',
    initialSiswaId = '',
    initialSearch = '',

    jurusanId,
    searchDebounceMs = 350,

    onFilterChange,
    onTpChange,
    onKelasChange,
  } = options;

  // ── 1. Controlled Filter State ──────────────────────────────────────────────
  const [tahunPelajaranId, setTahunPelajaranId] = useState<string>(initialTpId);
  const [semesterId, setSemesterId] = useState<string>(initialSemesterId);
  const [tingkat, setTingkat] = useState<number | ''>(initialTingkat);
  const [kelasId, setKelasId] = useState<string>(initialKelasId);
  const [bulan, setBulan] = useState<string>(initialBulan || (enableBulan ? toLocalMonth() : ''));
  const [tanggal, setTanggal] = useState<string>(initialTanggal || (enableTanggal ? toLocalDate() : ''));
  const [guruId, setGuruId] = useState<string>(initialGuruId);
  const [siswaId, setSiswaId] = useState<string>(initialSiswaId);
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);

  const debouncedSearchQuery = useDebounce(searchQuery, searchDebounceMs);

  // ── 2. Data Options Hooks ───────────────────────────────────────────────────
  const {
    options: tpOptions,
    activeYear: activeTp,
    isLoading: isLoadingTp,
  } = useTahunPelajaranOptions();

  // Auto-set initial active TP jika belum terisi
  useEffect(() => {
    if (!tahunPelajaranId && !initialTpId && activeTp?.id) {
      setTahunPelajaranId(activeTp.id);
    }
  }, [activeTp, tahunPelajaranId, initialTpId]);

  const {
    options: semesterOptions,
    isLoading: isLoadingSem,
  } = useSemesterOptions({
    tahunPelajaranId: tahunPelajaranId || undefined,
  });

  const {
    rawList: rawKelasList,
    isLoading: isLoadingKelas,
  } = useKelasOptions({
    onlyActive: true,
    jurusanId: jurusanId || undefined,
    tingkat: typeof tingkat === 'number' ? tingkat : undefined,
  });

  const kelasOptions: SearchableSelectOption[] = useMemo(() => {
    let list = rawKelasList;
    if (typeof tingkat === 'number') {
      list = list.filter((k) => k.tingkat === tingkat);
    }
    if (jurusanId) {
      list = list.filter((k) => k.jurusan_id === jurusanId);
    }
    return list.map((k) => ({
      value: k.id,
      label: `${k.nama_kelas} - Tingkat ${k.tingkat}`,
      nama_kelas: k.nama_kelas,
      tingkat: k.tingkat,
    }));
  }, [rawKelasList, tingkat, jurusanId]);

  // Auto-select kelas pertama jika belum dipilih & enableKelas aktif
  useEffect(() => {
    if (enableKelas && kelasOptions.length > 0 && (!kelasId || !kelasOptions.some((k) => k.value === kelasId))) {
      setKelasId(kelasOptions[0].value);
    }
  }, [enableKelas, kelasOptions, kelasId]);

  const {
    options: guruOptions,
    isLoading: isLoadingGuru,
  } = useGuruOptions({
    onlyActive: true,
  });

  const {
    options: siswaOptions,
    isLoading: isLoadingSiswa,
  } = useSiswaOptions({
    kelasId: kelasId || undefined,
    onlyActive: true,
    enabled: enableSiswa,
  });

  // ── 3. Query Linimasa Angkatan Rombel Riil (Cohort Lineage) ─────────────────
  const isCohortEnabled = enableKelas && enableCohort && Boolean(kelasId);

  const {
    data: cohortData,
    isLoading: isLoadingCohort,
  } = useQuery({
    queryKey: ['academic-filter-cohort-lineage', kelasId, tahunPelajaranId],
    queryFn: async () => {
      if (!kelasId) return null;
      const res = await getKelasCohortLineage(kelasId, {
        tahun_pelajaran_id: tahunPelajaranId || undefined,
      });
      return res?.data || null;
    },
    enabled: isCohortEnabled,
    staleTime: 5 * 60 * 1000,
  });

  const cohortStages = cohortData?.stages || [];

  // Rombel padanan di tapel terpilih (jika kelas aktif saat ini kosong di tapel ini tapi rombel angkatannya ada)
  const suggestedStage = useMemo(() => {
    if (!cohortStages || cohortStages.length === 0) return null;
    return (
      cohortStages.find(
        (s) =>
          s.is_available &&
          s.tahun_pelajaran_id === tahunPelajaranId &&
          s.kelas_id &&
          s.kelas_id !== kelasId
      ) || null
    );
  }, [cohortStages, tahunPelajaranId, kelasId]);

  // ── 4. Intelligent Action Handlers ──────────────────────────────────────────
  const handleJumpCohortStage = useCallback(
    (stage: CohortLineageStage) => {
      if (!stage.is_available || !stage.kelas_id || !stage.tahun_pelajaran_id) return;

      setKelasId(stage.kelas_id);
      setTahunPelajaranId(stage.tahun_pelajaran_id);

      // Auto-align bulan ke Juli tapel jika bulan sekarang di luar rentang kalender
      if (stage.tahun && enableBulan && bulan) {
        const match = stage.tahun.match(/^(\d{4})\/(\d{4})$/);
        if (match) {
          const startYear = parseInt(match[1], 10);
          const endYear = parseInt(match[2], 10);
          const currentYear = parseInt(bulan.split('-')[0], 10);
          const currentMonthNum = parseInt(bulan.split('-')[1], 10);
          const isInRange =
            (currentYear === startYear && currentMonthNum >= 7) ||
            (currentYear === endYear && currentMonthNum <= 6);

          if (!isInRange) {
            const today = toLocalMonth();
            const todayYear = parseInt(today.split('-')[0], 10);
            const todayMonthNum = parseInt(today.split('-')[1], 10);
            const isTodayInRange =
              (todayYear === startYear && todayMonthNum >= 7) ||
              (todayYear === endYear && todayMonthNum <= 6);

            setBulan(isTodayInRange ? today : `${startYear}-07`);
          }
        }
      }

      toast.success(`Beralih ke ${stage.nama_kelas || stage.label} (${stage.tahun || ''})`);
      onKelasChange?.(stage.kelas_id);
      onTpChange?.(stage.tahun_pelajaran_id);
    },
    [enableBulan, bulan, onKelasChange, onTpChange]
  );

  const handleTpChange = useCallback(
    (newTpId: string) => {
      setTahunPelajaranId(newTpId);

      // Auto-switch rombel jika di tapel baru terdapat stage yang valid dari angkatan ini
      if (cohortStages.length > 0) {
        const matchingStage = cohortStages.find(
          (s) => s.is_available && s.tahun_pelajaran_id === newTpId && s.kelas_id
        );
        if (matchingStage && matchingStage.kelas_id && matchingStage.kelas_id !== kelasId) {
          setKelasId(matchingStage.kelas_id);
          toast.success(`Menyesuaikan ke rombel ${matchingStage.nama_kelas || matchingStage.label} (${matchingStage.tahun})`);
          onKelasChange?.(matchingStage.kelas_id);
        }
      }

      // Auto-align bulan
      const selectedTp = tpOptions.find((t) => t.value === newTpId);
      if (selectedTp?.label && enableBulan && bulan) {
        const match = selectedTp.label.match(/^(\d{4})\/(\d{4})$/);
        if (match) {
          const startYear = parseInt(match[1], 10);
          const endYear = parseInt(match[2], 10);
          const currentYear = parseInt(bulan.split('-')[0], 10);
          const currentMonthNum = parseInt(bulan.split('-')[1], 10);
          const isInRange =
            (currentYear === startYear && currentMonthNum >= 7) ||
            (currentYear === endYear && currentMonthNum <= 6);

          if (!isInRange) {
            const today = toLocalMonth();
            const todayYear = parseInt(today.split('-')[0], 10);
            const todayMonthNum = parseInt(today.split('-')[1], 10);
            const isTodayInRange =
              (todayYear === startYear && todayMonthNum >= 7) ||
              (todayYear === endYear && todayMonthNum <= 6);

            setBulan(isTodayInRange ? today : `${startYear}-07`);
          }
        }
      }

      // Reset semester jika TP berganti
      if (enableSemester) {
        setSemesterId('');
      }

      onTpChange?.(newTpId);
    },
    [cohortStages, kelasId, tpOptions, enableBulan, bulan, enableSemester, onKelasChange, onTpChange]
  );

  const resetFilters = useCallback(() => {
    if (activeTp?.id) setTahunPelajaranId(activeTp.id);
    setSemesterId(initialSemesterId);
    setTingkat(initialTingkat);
    if (kelasOptions[0]?.value) setKelasId(kelasOptions[0].value);
    if (enableBulan) setBulan(toLocalMonth());
    if (enableTanggal) setTanggal(toLocalDate());
    setGuruId('');
    setSiswaId('');
    setSearchQuery('');
  }, [activeTp, initialSemesterId, initialTingkat, kelasOptions, enableBulan, enableTanggal]);

  // ── 5. Values & Change Listener ────────────────────────────────────────────
  const values: AcademicFilterValues = useMemo(
    () => ({
      tahunPelajaranId,
      semesterId,
      tingkat,
      kelasId,
      bulan,
      tanggal,
      guruId,
      siswaId,
      searchQuery: debouncedSearchQuery,
    }),
    [
      tahunPelajaranId,
      semesterId,
      tingkat,
      kelasId,
      bulan,
      tanggal,
      guruId,
      siswaId,
      debouncedSearchQuery,
    ]
  );

  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    onFilterChange?.(values);
  }, [values, onFilterChange]);

  const selectedKelasLabel = useMemo(() => {
    return kelasOptions.find((k) => k.value === kelasId)?.label || '';
  }, [kelasOptions, kelasId]);

  // ── 6. Assemble Toolbar Props ──────────────────────────────────────────────
  const toolbarProps: AcademicFilterToolbarProps = {
    enableTp,
    enableSemester,
    enableTingkat,
    enableKelas,
    enableCohort,
    enableBulan,
    enableTanggal,
    enableGuru,
    enableSiswa,
    enableSearch,

    values: {
      ...values,
      searchQuery, // input gets immediate non-debounced string
    },

    setTahunPelajaranId: handleTpChange,
    setSemesterId,
    setTingkat,
    setKelasId,
    setBulan,
    setTanggal,
    setGuruId,
    setSiswaId,
    setSearchQuery,

    tpOptions,
    semesterOptions,
    tingkatOptions,
    kelasOptions,
    guruOptions,
    siswaOptions,

    isLoadingTp,
    isLoadingSem,
    isLoadingKelas,
    isLoadingGuru,
    isLoadingSiswa,
    isLoadingCohort,

    cohortStages,
    suggestedStage,
    onJumpCohortStage: handleJumpCohortStage,
  };

  return {
    values,
    debouncedSearchQuery,

    setTahunPelajaranId: handleTpChange,
    setSemesterId,
    setTingkat,
    setKelasId,
    setBulan,
    setTanggal,
    setGuruId,
    setSiswaId,
    setSearchQuery,
    resetFilters,

    handleTpChange,
    handleJumpCohortStage,

    tpOptions,
    semesterOptions,
    tingkatOptions,
    kelasOptions,
    guruOptions,
    siswaOptions,

    isLoadingTp,
    isLoadingSem,
    isLoadingKelas,
    isLoadingGuru,
    isLoadingSiswa,
    isLoadingCohort,

    activeTpYear: activeTp ? { id: activeTp.id, tahun: activeTp.tahun } : null,
    selectedKelasLabel,
    cohortStages,
    suggestedStage,
    jenjang,
    isJenjangSmk,

    toolbarProps,
  };
}
