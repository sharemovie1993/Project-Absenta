import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTahunPelajaranOptions } from './useTahunPelajaranOptions';
import { useSemesterOptions } from './useSemesterOptions';

export interface AcademicContextValue {
  // ── Controlled State ──
  selectedTahunPelajaran: string;
  setSelectedTahunPelajaran: (id: string) => void;
  selectedSemester: string;
  setSelectedSemester: (id: string) => void;

  /** Ganti TP dan reset semester secara otomatis; memanggil onTpChange jika ada. */
  handleTpChange: (newTpId: string) => void;
  /** Ganti semester; memanggil onSemesterChange jika ada. */
  handleSemesterChange: (newSemId: string) => void;

  // ── Options untuk SearchableSelect ──
  tpOptions: ReturnType<typeof useTahunPelajaranOptions>['options'];
  semesterOptions: ReturnType<typeof useSemesterOptions>['options'];
  isLoadingTp: boolean;
  isLoadingSem: boolean;

  // ── Derived "active" objects ──
  /** Objek TP yang sedang dipilih (atau aktif jika belum dipilih). */
  activeYear: { id: string; tahun: string; nama: string } | null;
  /** Objek Semester yang sedang dipilih (atau aktif jika belum dipilih). */
  activeSemester: { id: string; nama_semester: string; nama: string } | null;

  // ── Raw lists (jika komponen butuh akses mendalam) ──
  tpRawList: ReturnType<typeof useTahunPelajaranOptions>['rawList'];
  semesterRawList: ReturnType<typeof useSemesterOptions>['rawList'];
}

export interface UseAcademicContextOptions {
  /** ID Tahun Pelajaran awal (misal dari URL param). */
  initialTpId?: string;
  /** ID Semester awal (misal dari URL param). */
  initialSemId?: string;
  /**
   * Callback dipanggil setelah TP berubah (setelah semester di-reset).
   * Gunakan untuk side-effect spesifik halaman (misal: reset kelas/mapel terpilih).
   */
  onTpChange?: (newTpId: string) => void;
  /**
   * Callback dipanggil setelah Semester berubah.
   * Gunakan untuk side-effect spesifik halaman.
   */
  onSemesterChange?: (newSemId: string) => void;
}

/**
 * Hook reusable untuk konteks akademik (Tahun Pelajaran + Semester).
 *
 * Mengelola:
 * - State `selectedTahunPelajaran` + `selectedSemester`
 * - Auto-set ke tahun/semester aktif saat data pertama kali dimuat
 * - Reset semester otomatis saat TP berubah
 * - Derived `activeYear` dan `activeSemester` objects
 * - Options untuk `<SearchableSelect />`
 */
export function useAcademicContext({
  initialTpId = '',
  initialSemId = '',
  onTpChange,
  onSemesterChange,
}: UseAcademicContextOptions = {}): AcademicContextValue {
  const [selectedTahunPelajaran, setSelectedTahunPelajaran] = useState<string>(initialTpId);
  const [selectedSemester, setSelectedSemester] = useState<string>(initialSemId);

  // ── Data Hooks ──
  const {
    options: tpOptions,
    rawList: tpRawList,
    activeYear: activeTp,
    isLoading: isLoadingTp,
  } = useTahunPelajaranOptions();

  const {
    options: semesterOptions,
    rawList: semesterRawList,
    activeSemester: activeSem,
    isLoading: isLoadingSem,
  } = useSemesterOptions({
    tahunPelajaranId: selectedTahunPelajaran || undefined,
  });

  // ── Auto-set: pilih TP aktif saat pertama load (jika belum ada initialTpId) ──
  useEffect(() => {
    if (!selectedTahunPelajaran && !initialTpId && activeTp?.id) {
      setSelectedTahunPelajaran(activeTp.id);
    }
  }, [activeTp, selectedTahunPelajaran, initialTpId]);

  // ── Auto-set: pilih Semester aktif saat pertama load atau saat TP berubah ──
  useEffect(() => {
    if (!selectedSemester && !initialSemId && activeSem?.id) {
      setSelectedSemester(activeSem.id);
    }
  }, [activeSem, selectedSemester, initialSemId]);

  // ── Handler: ganti TP → reset semester ──
  const handleTpChange = useCallback((newTpId: string) => {
    setSelectedTahunPelajaran(newTpId);
    setSelectedSemester('');
    onTpChange?.(newTpId);
  }, [onTpChange]);

  // ── Handler: ganti Semester ──
  const handleSemesterChange = useCallback((newSemId: string) => {
    setSelectedSemester(newSemId);
    onSemesterChange?.(newSemId);
  }, [onSemesterChange]);

  // ── Derived: activeYear ──
  const activeYear = useMemo(() => {
    const id = selectedTahunPelajaran || activeTp?.id;
    if (!id) return null;
    const found = tpRawList.find((y) => y.id === id);
    const tahun = found?.tahun || (found as any)?.nama || activeTp?.tahun || id;
    return { id, tahun, nama: `TP ${tahun}` };
  }, [activeTp, selectedTahunPelajaran, tpRawList]);

  // ── Derived: activeSemester ──
  const activeSemester = useMemo(() => {
    const id = selectedSemester || activeSem?.id;
    if (!id) return null;
    const found = semesterRawList.find((s) => s.id === id);
    const namaSemester = found?.nama_semester || activeSem?.nama_semester || id;
    return { id, nama_semester: namaSemester, nama: `Semester ${namaSemester}` };
  }, [activeSem, selectedSemester, semesterRawList]);

  return {
    selectedTahunPelajaran,
    setSelectedTahunPelajaran,
    selectedSemester,
    setSelectedSemester,
    handleTpChange,
    handleSemesterChange,
    tpOptions,
    semesterOptions,
    isLoadingTp,
    isLoadingSem,
    activeYear,
    activeSemester,
    tpRawList,
    semesterRawList,
  };
}
