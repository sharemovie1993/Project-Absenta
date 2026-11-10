import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTahunPelajaranOptions } from '@/hooks/useTahunPelajaranOptions';
import { useSemesterOptions } from '@/hooks/useSemesterOptions';
import { useKelasOptions } from '@/hooks/useKelasOptions';
import { useMapelOptions } from '@/hooks/useMapelOptions';
import { useGuruOptions } from '@/hooks/useGuruOptions';
import { useSiswaOptions } from '@/hooks/useSiswaOptions';
import { useDudiOptions } from '@/hooks/useDudiOptions';
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
  UnifiedPeriodOption,
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
    enableMitra = false,
    enableCohort = true,
    enableMapel = false,
    enableBulan = false,
    enableTanggal = false,
    enableGuru = false,
    enableSiswa = false,
    enableSearch = false,
    enableGender = false,
    enableStatusSiswa = false,

    initialTpId = '',
    initialSemesterId = '',
    initialTingkat = '',
    initialKelasId = '',
    initialMitraId = '',
    initialMapelId = '',
    initialBulan = '',
    initialTanggal = '',
    initialGuruId = '',
    initialSiswaId = '',
    initialSearch = '',
    initialGender = '',
    initialStatusSiswa = '',

    jurusanId,
    searchDebounceMs = 350,
    allowAllKelas = false,
    allowAllMitra = true,
    isKelasDisabled = false,
    mitraOptions: customMitraOptions,
    genderOptions: customGenderOptions,
    statusSiswaOptions: customStatusSiswaOptions,

    onFilterChange,
    onTpChange,
    onKelasChange,
    onMitraChange,
    onMapelChange,
    onGenderChange,
    onStatusSiswaChange,
  } = options;

  // ── 1. Controlled Filter State ──────────────────────────────────────────────
  const [tahunPelajaranId, setTahunPelajaranId] = useState<string>(initialTpId);
  const [semesterId, setSemesterId] = useState<string>(initialSemesterId);
  const [tingkat, setTingkat] = useState<number | ''>(initialTingkat);
  const [kelasId, setKelasId] = useState<string>(initialKelasId);
  const [mitraId, setMitraId] = useState<string>(initialMitraId);
  const [mapelId, setMapelId] = useState<string>(initialMapelId);
  const [bulan, setBulan] = useState<string>(initialBulan || (enableBulan ? toLocalMonth() : ''));
  const [tanggal, setTanggal] = useState<string>(initialTanggal || (enableTanggal ? toLocalDate() : ''));
  const [guruId, setGuruId] = useState<string>(initialGuruId);
  const [siswaId, setSiswaId] = useState<string>(initialSiswaId);
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);
  const [gender, setGender] = useState<string>(initialGender);
  const [statusSiswa, setStatusSiswa] = useState<string>(initialStatusSiswa);

  const debouncedSearchQuery = useDebounce(searchQuery, searchDebounceMs);

  // ── 2. Data Options Hooks ───────────────────────────────────────────────────
  const {
    options: tpOptions,
    rawList: tpRawList,
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
    rawList: semesterRawList,
    allRawList: allSemestersRawList,
    activeSemester,
    isLoading: isLoadingSem,
  } = useSemesterOptions({
    tahunPelajaranId: tahunPelajaranId || undefined,
  });

  // Auto-set active Semester jika belum terisi atau tidak valid di TP saat ini
  useEffect(() => {
    if (enableSemester && semesterOptions.length > 0) {
      const isCurrentValid = semesterId && semesterOptions.some((s) => s.value === semesterId);
      if (!isCurrentValid) {
        if (activeSemester?.id && semesterOptions.some((s) => s.value === activeSemester.id)) {
          setSemesterId(activeSemester.id);
        } else {
          setSemesterId(semesterOptions[0].value);
        }
      }
    }
  }, [enableSemester, activeSemester, semesterOptions, semesterId]);

  const {
    rawList: rawKelasList,
    isLoading: isLoadingKelas,
  } = useKelasOptions({
    onlyActive: true,
    jurusanId: jurusanId || undefined,
    tingkat: typeof tingkat === 'number' ? tingkat : undefined,
    enabled: enableKelas,
  });

  const kelasOptions: SearchableSelectOption[] = useMemo(() => {
    let list = rawKelasList;
    if (typeof tingkat === 'number') {
      list = list.filter((k) => k.tingkat === tingkat);
    }
    if (jurusanId) {
      list = list.filter((k) => k.jurusan_id === jurusanId);
    }
    const mapped = list.map((k) => ({
      value: k.id,
      label: `${k.nama_kelas} - Tingkat ${k.tingkat}`,
      nama_kelas: k.nama_kelas,
      tingkat: k.tingkat,
    }));
    if (allowAllKelas) {
      return [{ value: '', label: 'Semua' }, ...mapped];
    }
    return mapped;
  }, [rawKelasList, tingkat, jurusanId, allowAllKelas]);

  // Auto-select kelas pertama jika belum dipilih & enableKelas aktif
  useEffect(() => {
    if (!allowAllKelas && enableKelas && kelasOptions.length > 0 && (!kelasId || !kelasOptions.some((k) => k.value === kelasId))) {
      setKelasId(kelasOptions[0].value);
    }
  }, [enableKelas, kelasOptions, kelasId, allowAllKelas]);

  // ── DUDI / Mitra Industri Options Hook ──────────────────────────────────────
  const {
    options: fetchedMitraOptions,
    isLoading: isLoadingFetchedMitra,
  } = useDudiOptions({
    enabled: enableMitra && !customMitraOptions,
  });

  const mitraOptions: SearchableSelectOption[] = useMemo(() => {
    const baseList = customMitraOptions || fetchedMitraOptions || [];
    if (allowAllMitra) {
      if (!baseList.some((m) => m.value === '')) {
        return [{ value: '', label: 'Semua' }, ...baseList];
      }
    }
    return baseList;
  }, [customMitraOptions, fetchedMitraOptions, allowAllMitra]);

  const isLoadingMitra = customMitraOptions ? false : isLoadingFetchedMitra;

  const handleMitraChange = useCallback(
    (newMitraId: string) => {
      setMitraId(newMitraId);
      onMitraChange?.(newMitraId);
    },
    [onMitraChange]
  );

  const {
    options: mapelOptions,
    isLoading: isLoadingMapel,
  } = useMapelOptions({
    kelasId: kelasId || undefined,
    tingkat: typeof tingkat === 'number' ? tingkat : undefined,
    enabled: enableMapel,
  });

  const handleKelasChange = useCallback(
    (newKelasId: string) => {
      setKelasId(newKelasId);
      setMapelId('');
      onKelasChange?.(newKelasId);
    },
    [onKelasChange]
  );

  const handleMapelChange = useCallback(
    (newMapelId: string) => {
      setMapelId(newMapelId);
      onMapelChange?.(newMapelId);
    },
    [onMapelChange]
  );

  const {
    options: guruOptions,
    isLoading: isLoadingGuru,
  } = useGuruOptions({
    onlyActive: true,
    enabled: enableGuru,
  });

  const {
    options: siswaOptions,
    isLoading: isLoadingSiswa,
  } = useSiswaOptions({
    kelasId: kelasId || undefined,
    onlyActive: true,
    enabled: enableSiswa,
  });

  // ── Gender & Status Siswa Options & Handlers ───────────────────────────────
  const defaultGenderOptions: SearchableSelectOption[] = useMemo(() => [
    { value: '', label: 'Semua' },
    { value: 'L', label: 'Laki-laki (L)' },
    { value: 'P', label: 'Perempuan (P)' },
  ], []);

  const defaultStatusSiswaOptions: SearchableSelectOption[] = useMemo(() => [
    { value: '', label: 'Semua' },
    { value: 'AKTIF', label: 'Aktif' },
    { value: 'LULUS', label: 'Lulus' },
    { value: 'MUTASI', label: 'Mutasi' },
    { value: 'KELUAR', label: 'Keluar' },
  ], []);

  const genderOptions = customGenderOptions || defaultGenderOptions;
  const statusSiswaOptions = customStatusSiswaOptions || defaultStatusSiswaOptions;

  const handleGenderChange = useCallback(
    (newGender: string) => {
      setGender(newGender);
      onGenderChange?.(newGender);
    },
    [onGenderChange]
  );

  const handleStatusSiswaChange = useCallback(
    (newStatus: string) => {
      setStatusSiswa(newStatus);
      onStatusSiswaChange?.(newStatus);
    },
    [onStatusSiswaChange]
  );

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

      // Sinkronisasi semester otomatis saat TP berganti (tidak dibiarkan kosong/strip)
      if (enableSemester) {
        const semestersInNewTp = semesterRawList.filter((s) => s.tahun_pelajaran_id === newTpId);
        const activeSemInNewTp = semestersInNewTp.find((s) => s.is_active);
        const matchingSemByName = semesterId
          ? semestersInNewTp.find((s) => {
              const currentName = (semesterRawList.find((cur) => cur.id === semesterId)?.nama_semester || '').toLowerCase();
              return currentName && (s.nama_semester || '').toLowerCase() === currentName;
            })
          : null;

        const nextSemId = activeSemInNewTp?.id || matchingSemByName?.id || semestersInNewTp[0]?.id || '';
        setSemesterId(nextSemId);
      }

      onTpChange?.(newTpId);
    },
    [cohortStages, kelasId, tpOptions, enableBulan, bulan, enableSemester, semesterRawList, semesterId, onKelasChange, onTpChange]
  );

  const resetFilters = useCallback(() => {
    if (activeTp?.id) setTahunPelajaranId(activeTp.id);
    setSemesterId(initialSemesterId);
    setTingkat(initialTingkat);
    if (allowAllKelas) {
      setKelasId(initialKelasId || '');
    } else if (kelasOptions[0]?.value) {
      setKelasId(kelasOptions[0].value);
    }
    setMitraId(initialMitraId || '');
    if (enableBulan) setBulan(toLocalMonth());
    if (enableTanggal) setTanggal(toLocalDate());
    setMapelId('');
    setGuruId('');
    setSiswaId('');
    setSearchQuery('');
    setGender(initialGender);
    setStatusSiswa(initialStatusSiswa);
  }, [activeTp, initialSemesterId, initialTingkat, allowAllKelas, initialKelasId, kelasOptions, initialMitraId, enableBulan, enableTanggal, initialGender, initialStatusSiswa]);

  // ── 5. Values & Change Listener ────────────────────────────────────────────
  const values: AcademicFilterValues = useMemo(
    () => ({
      tahunPelajaranId,
      semesterId,
      tingkat,
      kelasId,
      mitraId,
      mapelId,
      bulan,
      tanggal,
      guruId,
      siswaId,
      searchQuery: debouncedSearchQuery,
      gender,
      statusSiswa,
    }),
    [
      tahunPelajaranId,
      semesterId,
      tingkat,
      kelasId,
      mitraId,
      mapelId,
      bulan,
      tanggal,
      guruId,
      siswaId,
      debouncedSearchQuery,
      gender,
      statusSiswa,
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

  const selectedMitraLabel = useMemo(() => {
    return mitraOptions.find((m) => m.value === mitraId)?.label || '';
  }, [mitraOptions, mitraId]);

  const selectedMapelLabel = useMemo(() => {
    return mapelOptions.find((m) => m.value === mapelId)?.label || '';
  }, [mapelOptions, mapelId]);

  const selectedTahunPelajaranNama = useMemo(() => {
    const opt = tpOptions.find((t) => t.value === tahunPelajaranId);
    if (opt?.label) {
      return opt.label.replace(/\s*([★⭐])\s*/g, '').trim();
    }
    const raw = tpRawList?.find((y) => y.id === tahunPelajaranId) || activeTp;
    return raw?.tahun || '';
  }, [tpOptions, tahunPelajaranId, tpRawList, activeTp]);

  const selectedSemesterNama = useMemo(() => {
    const opt = semesterOptions.find((s) => s.value === semesterId);
    if (opt?.label) {
      return opt.label.replace(/\s*([★⭐])\s*/g, '').trim();
    }
    const rawSem = semesterRawList?.find((s) => s.id === semesterId) || activeSemester;
    if (rawSem?.nama_semester) {
      return rawSem.nama_semester.replace(/\s*([★⭐])\s*/g, '').trim();
    }
    return '';
  }, [semesterOptions, semesterId, semesterRawList, activeSemester]);

  const resolvedActiveTpYear = useMemo(() => {
    const selectedTpObj = tpRawList?.find((y) => y.id === tahunPelajaranId) || activeTp || null;
    return selectedTpObj
      ? {
          id: selectedTpObj.id,
          tahun: selectedTpObj.tahun,
          nama: (selectedTpObj as any).nama || selectedTpObj.tahun,
          is_active: Boolean(selectedTpObj.is_active),
        }
      : null;
  }, [tpRawList, tahunPelajaranId, activeTp]);

  const resolvedActiveSemester = useMemo(() => {
    const semObj = semesterRawList?.find((s) => s.id === semesterId) || activeSemester;
    return semObj
      ? {
          id: semObj.id,
          nama_semester: (semObj.nama_semester || (semObj as any).nama || '').replace(/\s*([★⭐])\s*/g, '').trim(),
          is_active: Boolean(semObj.is_active),
        }
      : null;
  }, [semesterRawList, semesterId, activeSemester]);

  const handleSelectUnifiedPeriod = useCallback((newTpId: string, newSemesterId: string) => {
    handleTpChange(newTpId);
    setSemesterId(newSemesterId);
  }, [handleTpChange]);

  const unifiedPeriodOptions = useMemo<UnifiedPeriodOption[]>(() => {
    const list: UnifiedPeriodOption[] = [];
    const tpList = tpRawList && tpRawList.length > 0 ? tpRawList : [];
    const semList = allSemestersRawList && allSemestersRawList.length > 0 ? allSemestersRawList : (semesterRawList || []);

    // Urutkan TP: yang aktif di paling atas, kemudian urut tahun descending
    const sortedTps = [...tpList].sort((a, b) => {
      if (a.is_active && !b.is_active) return -1;
      if (!a.is_active && b.is_active) return 1;
      return (b.tahun || '').localeCompare(a.tahun || '');
    });

    sortedTps.forEach((tp) => {
      const tpSemesters = semList.filter((s) => s.tahun_pelajaran_id === tp.id);
      // Urutkan semester: Ganjil (1) lalu Genap (2)
      const sortedSems = [...tpSemesters].sort((a, b) => {
        const nameA = a.nama_semester?.toLowerCase() || '';
        const nameB = b.nama_semester?.toLowerCase() || '';
        if (nameA.includes('ganjil') || nameA.includes('1')) return -1;
        if (nameB.includes('ganjil') || nameB.includes('1')) return 1;
        return 0;
      });

      sortedSems.forEach((sem) => {
        const cleanSem = (sem.nama_semester || '').replace(/^semester\s+/i, '').trim();
        const isBothActive = Boolean(tp.is_active && sem.is_active);
        list.push({
          key: `${tp.id}___${sem.id}`,
          tpId: tp.id,
          semesterId: sem.id,
          label: `${tp.tahun} • ${cleanSem}`,
          tpTahun: tp.tahun,
          semesterNama: cleanSem,
          isActive: isBothActive,
        });
      });
    });

    // Fallback jika semList kosong tapi ada options
    if (list.length === 0 && tpOptions.length > 0 && semesterOptions.length > 0) {
      tpOptions.forEach((tp) => {
        semesterOptions.forEach((sem) => {
          list.push({
            key: `${tp.value}___${sem.value}`,
            tpId: tp.value,
            semesterId: sem.value,
            label: `${tp.label.replace(/\s*([⭐★])\s*/g, '').trim()} • ${sem.label.replace(/\s*([⭐★])\s*/g, '').trim()}`,
            tpTahun: tp.label,
            semesterNama: sem.label,
            isActive: Boolean(tp.label.includes('⭐') && sem.label.includes('⭐')),
          });
        });
      });
    }

    return list;
  }, [tpRawList, allSemestersRawList, semesterRawList, tpOptions, semesterOptions]);

  // ── 6. Assemble Toolbar Props ──────────────────────────────────────────────
  const toolbarProps: AcademicFilterToolbarProps = {
    enableTp,
    enableSemester,
    enableTingkat,
    enableKelas,
    enableMitra,
    enableCohort,
    enableMapel,
    enableBulan,
    enableTanggal,
    enableGuru,
    enableSiswa,
    enableSearch,
    enableGender,
    enableStatusSiswa,

    values: {
      ...values,
      searchQuery, // input gets immediate non-debounced string
    },

    selectedTahunPelajaranNama,
    selectedSemesterNama,
    activeTpYear: resolvedActiveTpYear,
    activeSemester: resolvedActiveSemester,
    unifiedPeriodOptions,
    onSelectUnifiedPeriod: handleSelectUnifiedPeriod,

    setTahunPelajaranId: handleTpChange,
    setSemesterId,
    setTingkat,
    setKelasId: handleKelasChange,
    setMitraId: handleMitraChange,
    setMapelId: handleMapelChange,
    setBulan,
    setTanggal,
    setGuruId,
    setSiswaId,
    setSearchQuery,
    setGender: handleGenderChange,
    setStatusSiswa: handleStatusSiswaChange,

    tpOptions,
    semesterOptions,
    tingkatOptions,
    kelasOptions,
    mitraOptions,
    mapelOptions,
    guruOptions,
    siswaOptions,
    genderOptions,
    statusSiswaOptions,

    isLoadingTp,
    isLoadingSem,
    isLoadingKelas,
    isLoadingMitra,
    isLoadingMapel,
    isLoadingGuru,
    isLoadingSiswa,
    isLoadingCohort,

    cohortStages,
    suggestedStage,
    onJumpCohortStage: handleJumpCohortStage,

    allowAllKelas,
    allowAllMitra,
    isKelasDisabled,
    onReset: resetFilters,
  };

  return {
    values,
    debouncedSearchQuery,

    setTahunPelajaranId: handleTpChange,
    setSemesterId,
    setTingkat,
    setKelasId: handleKelasChange,
    setMitraId: handleMitraChange,
    setMapelId: handleMapelChange,
    setBulan,
    setTanggal,
    setGuruId,
    setSiswaId,
    setSearchQuery,
    setGender: handleGenderChange,
    setStatusSiswa: handleStatusSiswaChange,

    unifiedPeriodOptions,
    onSelectUnifiedPeriod: handleSelectUnifiedPeriod,
    resetFilters,

    handleTpChange,
    handleKelasChange,
    handleMitraChange,
    handleMapelChange,
    handleGenderChange,
    handleStatusSiswaChange,
    handleJumpCohortStage,

    tpOptions,
    semesterOptions,
    tingkatOptions,
    kelasOptions,
    mitraOptions,
    mapelOptions,
    guruOptions,
    siswaOptions,
    genderOptions,
    statusSiswaOptions,

    isLoadingTp,
    isLoadingSem,
    isLoadingKelas,
    isLoadingMitra,
    isLoadingMapel,
    isLoadingGuru,
    isLoadingSiswa,
    isLoadingCohort,

    activeAcademicYear: activeTp
      ? {
          id: activeTp.id,
          tahun: activeTp.tahun,
          nama: (activeTp as any).nama || activeTp.tahun,
          is_active: Boolean(activeTp.is_active),
        }
      : null,
    activeTpYear: resolvedActiveTpYear,
    activeSemester: resolvedActiveSemester,
    selectedTahunPelajaranNama,
    selectedSemesterNama,
    selectedKelasLabel,
    selectedMitraLabel,
    selectedMapelLabel,
    cohortStages,
    suggestedStage,
    jenjang,
    isJenjangSmk,

    toolbarProps,
  };
}
