import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sliders,
  Lock,
  Unlock,
  Save,
  Send,
  Shield,
  Award,
  AlertCircle,
  RefreshCw,
  Search,
  ChevronDown,
  Sparkles,
  Info,
  FileSpreadsheet,
  ShieldAlert,
  Zap,
  Copy,
  Trash2,
  ClipboardPaste,
  ArrowRightLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import Tooltip from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils';
import {
  getKetarunaanNilaiKelas,
  saveKetarunaanNilaiBulk,
  lockKetarunaanNilai,
  unlockKetarunaanNilai,
  saveKetarunaanSkema,
  syncKetarunaanPresensi5Siklus,
  KetarunaanNilaiStudent,
} from '@/api/kesiswaan/programKetarunaan.api';
import { StudentScoreItem } from '@/types/inputNilai.types';
import { ExcelCompareNilaiModal } from '@/components/rapor/input-nilai/ExcelCompareNilaiModal';
import { KetarunaanSkemaSettingsModal } from './KetarunaanSkemaSettingsModal';
import { SertifikatKetarunaanModal } from './SertifikatKetarunaanModal';
import { KetarunaanExportModal } from './KetarunaanExportModal';
import { KetarunaanArchiveCorrectionModal } from './KetarunaanArchiveCorrectionModal';

export interface KetarunaanPenilaianTabProps {
  tahunPelajaranId?: string;
  tahunPelajaranNama?: string;
  semesterId?: string;
  semesterNama?: string;
  kelasId?: string;
  kelasNama?: string;
  jurusanId?: string;
  jurusanNama?: string;
}

type LocalRowScore = {
  samapta: number;
  pbb: number;
  disiplin: number;
  mental: number;
  deskripsi_cp: string;
};

type EditableField = 'samapta' | 'pbb' | 'disiplin' | 'mental' | 'deskripsi_cp';

const EDITABLE_FIELDS: EditableField[] = ['samapta', 'pbb', 'disiplin', 'mental', 'deskripsi_cp'];
const COL_LETTERS: Record<number, string> = { 0: 'B', 1: 'C', 2: 'D', 3: 'E', 4: 'H' };

export const KetarunaanPenilaianTab: React.FC<KetarunaanPenilaianTabProps> = ({
  tahunPelajaranId,
  tahunPelajaranNama,
  semesterId,
  semesterNama,
  kelasId,
  kelasNama,
  jurusanId,
  jurusanNama,
}) => {
  const queryClient = useQueryClient();
  const [isSkemaModalOpen, setIsSkemaModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isExcelMenuOpen, setIsExcelMenuOpen] = useState(false);
  const excelMenuRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [kkmThreshold, setKkmThreshold] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('absenta_kkm_ketarunaan');
      const parsed = saved ? parseInt(saved, 10) : 71;
      return !isNaN(parsed) && parsed >= 50 && parsed <= 95 ? parsed : 71;
    } catch {
      return 71;
    }
  });

  const [localScores, setLocalScores] = useState<Record<string, LocalRowScore>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isSyncingPresensi, setIsSyncingPresensi] = useState(false);
  const [selectedCertStudent, setSelectedCertStudent] = useState<KetarunaanNilaiStudent | null>(null);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);

  // Active focused cell tracking for Excel formula bar & active cell highlights
  const [activeCell, setActiveCell] = useState<{
    row: number;
    col: number;
    field: EditableField;
    colLetter: string;
    studentName?: string;
    siswaId?: string;
  } | null>(null);

  // Close Excel dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (excelMenuRef.current && !excelMenuRef.current.contains(event.target as Node)) {
        setIsExcelMenuOpen(false);
      }
    };
    if (isExcelMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExcelMenuOpen]);

  // Peringatan sebelum menutup tab/browser jika masih ada perubahan nilai yang belum disimpan
  useEffect(() => {
    if (!hasChanges) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  const handleKkmChange = useCallback((newVal: number) => {
    const valid = Math.max(50, Math.min(95, isNaN(newVal) ? 71 : newVal));
    setKkmThreshold(valid);
    try {
      localStorage.setItem('absenta_kkm_ketarunaan', String(valid));
    } catch {}
  }, []);

  // 1. Query Data Nilai Kelas
  const {
    data: nilaiResponse,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['ketarunaan-nilai-kelas', kelasId, tahunPelajaranId, semesterId],
    queryFn: () =>
      getKetarunaanNilaiKelas({
        kelas_id: kelasId!,
        tahun_pelajaran_id: tahunPelajaranId!,
        semester_id: semesterId!,
      }),
    enabled: Boolean(kelasId && tahunPelajaranId && semesterId),
  });

  const payloadData: any =
    (nilaiResponse as any)?.students != null
      ? nilaiResponse
      : (nilaiResponse as any)?.data ?? nilaiResponse;
  const skema = payloadData?.skema || null;
  const students: KetarunaanNilaiStudent[] = payloadData?.students || [];
  const isClassLocked = Boolean(payloadData?.is_class_locked);

  const effectiveKelasNama = payloadData?.kelas?.nama_kelas || kelasNama || '';
  const effectiveJurusanNama = payloadData?.kelas?.Jurusan?.nama || jurusanNama || '';

  // Konteks periode dari backend (SSOT) untuk mencegah salah input lintas tahun pelajaran
  const period = payloadData?.period || null;
  const rosterSource: string = payloadData?.roster_source || '';
  const periodTahun: string = period?.tahun || tahunPelajaranNama || '';
  const periodSemester: string = period?.nama_semester || semesterNama || '';
  const isArchivePeriod = Boolean(period && !period.is_active_period);
  const isReadOnly = isClassLocked || isArchivePeriod;

  // Kunci konteks dari payload yang benar-benar sedang tampil di layar
  const loadedKelasId: string = payloadData?.kelas?.id || '';
  const loadedTpId: string = period?.tahun_pelajaran_id || '';
  const loadedSemesterId: string = period?.semester_id || '';

  const assertLoadedContextReady = useCallback(() => {
    if (isLoading || isRefetching) {
      throw new Error('Data sedang dimuat ulang. Tunggu hingga proses muat selesai.');
    }
    if (!loadedKelasId || !loadedTpId || !loadedSemesterId) {
      throw new Error('Konteks akademik dari server belum siap. Silakan muat ulang data.');
    }
    if (
      loadedKelasId !== kelasId ||
      loadedTpId !== tahunPelajaranId ||
      loadedSemesterId !== semesterId
    ) {
      throw new Error(
        'Konteks filter telah berubah dari data yang sedang tampil di layar. Muat ulang data terlebih dahulu.'
      );
    }
    return {
      kelas_id: loadedKelasId,
      tahun_pelajaran_id: loadedTpId,
      semester_id: loadedSemesterId,
    };
  }, [
    isLoading,
    isRefetching,
    loadedKelasId,
    loadedTpId,
    loadedSemesterId,
    kelasId,
    tahunPelajaranId,
    semesterId,
  ]);

  // Initialize local score state when data loads
  useEffect(() => {
    if (students.length > 0) {
      const initial: Record<string, LocalRowScore> = {};
      students.forEach((s) => {
        initial[s.siswa_id] = {
          samapta: s.nilai_samapta ?? 0,
          pbb: s.nilai_pbb ?? 0,
          disiplin: s.nilai_disiplin ?? 0,
          mental: s.nilai_mental ?? 0,
          deskripsi_cp: s.deskripsi_rapor ?? '',
        };
      });
      setLocalScores(initial);
      setHasChanges(false);
    } else {
      setLocalScores({});
      setHasChanges(false);
    }
  }, [students]);

  // Kalkulasi live nilai akhir, predikat, dan narasi otomatis
  const calculateLiveFinal = useCallback(
    (scores: { samapta: number; pbb: number; disiplin: number; mental: number }) => {
      const bSamapta = skema?.bobot_samapta ?? 25;
      const bPbb = skema?.bobot_pbb ?? 20;
      const bDisiplin = skema?.bobot_disiplin ?? 30;
      const bMental = skema?.bobot_mental ?? 25;
      const mode = skema?.mode_pelatihan || 'SEMI_TARUNA';

      const raw =
        (scores.samapta * bSamapta +
          scores.pbb * bPbb +
          scores.disiplin * bDisiplin +
          scores.mental * bMental) /
        100;
      const final = Math.round(raw * 10) / 10;
      let grade = 'D';
      if (final >= 86) grade = 'A';
      else if (final >= 71) grade = 'B';
      else if (final >= 56) grade = 'C';

      let autoNarasi = '';
      if (mode === 'FULL_TARUNA') {
        if (grade === 'A') {
          autoNarasi =
            'Menunjukkan keunggulan kesamaptaan jasmani yang prima dan kepemimpinan baris-berbaris (PBB) yang sangat tangguh. Disiplin atribut ketarunaan dan jiwa korsa terpelihara dengan sangat baik.';
        } else if (grade === 'B') {
          autoNarasi =
            'Menunjukkan kebugaran jasmani yang baik dan menguasai peraturan baris-berbaris (PBB) dengan tertib. Mematuhi tata tertib atribut ketarunaan dan menunjukkan kerja sama tim yang solid.';
        } else if (grade === 'C') {
          autoNarasi =
            'Memenuhi standar minimal kesamaptaan fisik dan baris-berbaris. Perlu peningkatan disiplin kehadiran dan konsistensi sikap taruna.';
        } else {
          autoNarasi =
            'Belum memenuhi standar kualifikasi kesamaptaan jasmani dan kedisiplinan ketarunaan. Memerlukan bimbingan intensif dan pembinaan ulang.';
        }
      } else {
        if (grade === 'A') {
          autoNarasi =
            'Menunjukkan komitmen kedisiplinan dan kepatuhan tata tertib yang sangat tinggi. Kebugaran jasmani terpelihara dengan prima serta menerapkan budaya kerja 5R dan etos tanggung jawab secara konsisten.';
        } else if (grade === 'B') {
          autoNarasi =
            'Memiliki kedisiplinan dan kebugaran jasmani yang baik. Mampu mengikuti apel dan kegiatan pembiasaan sekolah dengan tertib serta berakhlak mulia.';
        } else if (grade === 'C') {
          autoNarasi =
            'Cukup tertib dalam mengikuti pembiasaan sekolah dan kebugaran dasar. Perlu meningkatkan ketepatan waktu dan kerapian atribut seragam.';
        } else {
          autoNarasi =
            'Perlu pembinaan khusus dalam hal kedisiplinan, kehadiran pembiasaan pagi, dan pembentukan karakter etos kerja.';
        }
      }

      return { final, grade, autoNarasi };
    },
    [skema]
  );

  // Color Coding Helper based on KKM threshold (matching e-Rapor ScoreGridTable)
  const getScoreInputStyle = useCallback(
    (scoreVal: number | string | null | undefined) => {
      if (scoreVal === null || scoreVal === undefined || scoreVal === '') {
        return 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100';
      }
      const num = parseFloat(String(scoreVal));
      if (isNaN(num)) return 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100';

      if (num < kkmThreshold) {
        return 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-300 border-rose-300 dark:border-rose-800 font-black';
      }
      const upperTuntas = Math.max(85, kkmThreshold + 14);
      if (num >= kkmThreshold && num <= upperTuntas) {
        return 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold';
      }
      return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-black';
    },
    [kkmThreshold]
  );

  // Handler update skor per siswa
  const handleScoreChange = useCallback(
    (siswaId: string, aspect: 'samapta' | 'pbb' | 'disiplin' | 'mental', rawVal: string | number) => {
      if (isReadOnly) {
        toast.error('Tidak dapat mengubah nilai: Lembar berada dalam Mode Hanya Baca.');
        return;
      }
      const parsed = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).replace(',', '.'));
      if (!isNaN(parsed) && (parsed < 0 || parsed > 100)) {
        toast.error('Nilai harus berkisar antara 0 - 100.');
        return;
      }
      const sanitized = isNaN(parsed) ? 0 : Math.max(0, Math.min(100, Math.round(parsed * 10) / 10));
      setLocalScores((prev) => ({
        ...prev,
        [siswaId]: {
          ...(prev[siswaId] || { samapta: 0, pbb: 0, disiplin: 0, mental: 0, deskripsi_cp: '' }),
          [aspect]: sanitized,
        },
      }));
      setHasChanges(true);
    },
    [isReadOnly]
  );

  const handleDeskripsiChange = useCallback(
    (siswaId: string, val: string) => {
      if (isReadOnly) return;
      setLocalScores((prev) => ({
        ...prev,
        [siswaId]: {
          ...(prev[siswaId] || { samapta: 0, pbb: 0, disiplin: 0, mental: 0, deskripsi_cp: '' }),
          deskripsi_cp: val,
        },
      }));
      setHasChanges(true);
    },
    [isReadOnly]
  );

  // 1-Click Copy CP to All
  const handleCopyCpToAll = useCallback(
    (sourceCp: string) => {
      if (isReadOnly) return;
      if (!sourceCp || !sourceCp.trim()) {
        toast.warning('Teks Capaian Kompetensi (CP) sumber masih kosong.');
        return;
      }
      setLocalScores((prev) => {
        const next = { ...prev };
        students.forEach((s) => {
          const cur = next[s.siswa_id] || { samapta: 0, pbb: 0, disiplin: 0, mental: 0, deskripsi_cp: '' };
          next[s.siswa_id] = { ...cur, deskripsi_cp: sourceCp };
        });
        return next;
      });
      setHasChanges(true);
      toast.success('Berhasil menyalin Capaian Kompetensi ke seluruh taruna!');
    },
    [isReadOnly, students]
  );

  // 1-Click Clear CP
  const handleClearCpAll = useCallback(() => {
    if (isReadOnly) return;
    setLocalScores((prev) => {
      const next = { ...prev };
      students.forEach((s) => {
        const cur = next[s.siswa_id] || { samapta: 0, pbb: 0, disiplin: 0, mental: 0, deskripsi_cp: '' };
        next[s.siswa_id] = { ...cur, deskripsi_cp: '' };
      });
      return next;
    });
    setHasChanges(true);
    toast.info('Catatan Capaian kustom dikosongkan (akan menggunakan narasi rumus otomatis).');
  }, [isReadOnly, students]);

  // Quick fill untuk 1 rombel sekaligus
  const handleQuickFill = (aspect: 'samapta' | 'pbb' | 'disiplin' | 'mental') => {
    if (isReadOnly) return;
    const inputVal = window.prompt(`Isi nilai serentak untuk aspek ${aspect.toUpperCase()} (0 - 100):`, '80');
    if (inputVal === null) return;
    const num = Math.max(0, Math.min(100, parseInt(inputVal, 10) || 0));
    setLocalScores((prev) => {
      const updated = { ...prev };
      students.forEach((s) => {
        if (!updated[s.siswa_id]) {
          updated[s.siswa_id] = { samapta: 0, pbb: 0, disiplin: 0, mental: 0, deskripsi_cp: '' };
        }
        updated[s.siswa_id] = { ...updated[s.siswa_id], [aspect]: num };
      });
      return updated;
    });
    setHasChanges(true);
    toast.success(`Berhasil mengisi nilai ${aspect.toUpperCase()} = ${num} untuk ${students.length} taruna.`);
  };

  // Filter siswa berdasarkan pencarian nama/NIS
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(
      (s) =>
        (s.nama_siswa || '').toLowerCase().includes(q) ||
        (s.nis || '').toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  // Keyboard Grid Navigation (Excel-style navigation: Enter, Shift+Enter, Tab, Shift+Tab, Arrow keys)
  const handleKeyDownGrid = useCallback(
    (
      e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
      rowIndex: number,
      colIndex: number
    ) => {
      const totalRows = filteredStudents.length;
      const maxCols = EDITABLE_FIELDS.length; // 5 editable cols: 0=samapta, 1=pbb, 2=disiplin, 3=mental, 4=deskripsi_cp

      if (e.key === 'Enter') {
        if (e.shiftKey) {
          if (rowIndex > 0) {
            e.preventDefault();
            const target = document.getElementById(
              `ketarunaan-grid-${rowIndex - 1}-${colIndex}`
            ) as HTMLInputElement | HTMLTextAreaElement;
            target?.focus();
            target?.select?.();
          }
        } else {
          if (rowIndex < totalRows - 1) {
            e.preventDefault();
            const target = document.getElementById(
              `ketarunaan-grid-${rowIndex + 1}-${colIndex}`
            ) as HTMLInputElement | HTMLTextAreaElement;
            target?.focus();
            target?.select?.();
          }
        }
        return;
      }

      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (colIndex > 0) {
            e.preventDefault();
            const target = document.getElementById(
              `ketarunaan-grid-${rowIndex}-${colIndex - 1}`
            ) as HTMLInputElement | HTMLTextAreaElement;
            target?.focus();
            target?.select?.();
          } else if (rowIndex > 0) {
            e.preventDefault();
            const target = document.getElementById(
              `ketarunaan-grid-${rowIndex - 1}-${maxCols - 1}`
            ) as HTMLInputElement | HTMLTextAreaElement;
            target?.focus();
            target?.select?.();
          }
        } else {
          if (colIndex < maxCols - 1) {
            e.preventDefault();
            const target = document.getElementById(
              `ketarunaan-grid-${rowIndex}-${colIndex + 1}`
            ) as HTMLInputElement | HTMLTextAreaElement;
            target?.focus();
            target?.select?.();
          } else if (rowIndex < totalRows - 1) {
            e.preventDefault();
            const target = document.getElementById(
              `ketarunaan-grid-${rowIndex + 1}-0`
            ) as HTMLInputElement | HTMLTextAreaElement;
            target?.focus();
            target?.select?.();
          }
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        if (rowIndex < totalRows - 1) {
          e.preventDefault();
          const target = document.getElementById(
            `ketarunaan-grid-${rowIndex + 1}-${colIndex}`
          ) as HTMLInputElement | HTMLTextAreaElement;
          target?.focus();
          target?.select?.();
        }
      } else if (e.key === 'ArrowUp') {
        if (rowIndex > 0) {
          e.preventDefault();
          const target = document.getElementById(
            `ketarunaan-grid-${rowIndex - 1}-${colIndex}`
          ) as HTMLInputElement | HTMLTextAreaElement;
          target?.focus();
          target?.select?.();
        }
      } else if (e.key === 'ArrowRight') {
        const input = e.currentTarget;
        const isAtEnd = input.selectionEnd === input.value.length;
        const isAllSelected = input.selectionStart === 0 && input.selectionEnd === input.value.length;
        if ((isAtEnd || isAllSelected) && colIndex < maxCols - 1) {
          e.preventDefault();
          const target = document.getElementById(
            `ketarunaan-grid-${rowIndex}-${colIndex + 1}`
          ) as HTMLInputElement | HTMLTextAreaElement;
          target?.focus();
          target?.select?.();
        }
      } else if (e.key === 'ArrowLeft') {
        const input = e.currentTarget;
        const isAtStart = input.selectionStart === 0;
        const isAllSelected = input.selectionStart === 0 && input.selectionEnd === input.value.length;
        if ((isAtStart || isAllSelected) && colIndex > 0) {
          e.preventDefault();
          const target = document.getElementById(
            `ketarunaan-grid-${rowIndex}-${colIndex - 1}`
          ) as HTMLInputElement | HTMLTextAreaElement;
          target?.focus();
          target?.select?.();
        }
      }
    },
    [filteredStudents.length]
  );

  // Bulk Paste Matrix from Excel / Google Sheets (Multi-Row & Multi-Column)
  const handleBulkPaste = useCallback(
    (startRowIndex: number, startColIndex: number, rawClipboardText: string) => {
      if (isReadOnly) {
        toast.error('Tidak dapat menempel nilai: Mode Hanya Baca aktif.');
        return false;
      }
      if (!rawClipboardText || !rawClipboardText.trim()) return false;

      const rawLines = rawClipboardText
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n');

      while (rawLines.length > 0 && rawLines[rawLines.length - 1].trim() === '') {
        rawLines.pop();
      }
      if (rawLines.length === 0) return false;

      const rawMatrix: string[][] = rawLines.map((line) => line.split('\t').map((c) => c.trim()));

      // Deteksi bila user menyalin baris utuh [No, NIS, Nama, Samapta, PBB, Disiplin, Mental, ...]
      let effectiveMatrix = rawMatrix;
      let effectiveStartCol = startColIndex;

      const looksLikeFullRow = rawMatrix.some(
        (row) =>
          row.length >= 6 &&
          isNaN(Number(row[2].replace(',', '.'))) &&
          row[2].length > 2 &&
          (!isNaN(Number(row[3].replace(',', '.'))) || row[3] === '' || row[3] === '-')
      );

      if (looksLikeFullRow && startColIndex === 0) {
        effectiveMatrix = rawMatrix.map((row) => (row.length >= 4 ? row.slice(3) : row));
        effectiveStartCol = 0;
      }

      let updatedRowsCount = 0;
      let maxColsAffected = 0;

      setLocalScores((prev) => {
        const next = { ...prev };
        const maxRows = filteredStudents.length;

        effectiveMatrix.forEach((rowValues, rOffset) => {
          const targetRow = startRowIndex + rOffset;
          if (targetRow >= maxRows) return;
          const student = filteredStudents[targetRow];
          if (!student) return;

          const curObj: LocalRowScore = {
            ...(next[student.siswa_id] || {
              samapta: 0,
              pbb: 0,
              disiplin: 0,
              mental: 0,
              deskripsi_cp: '',
            }),
          };
          let rowModified = false;

          rowValues.forEach((cellVal, cOffset) => {
            const targetColIndex = effectiveStartCol + cOffset;
            if (targetColIndex >= EDITABLE_FIELDS.length) return;
            const field = EDITABLE_FIELDS[targetColIndex];
            if (!field) return;

            if (field === 'deskripsi_cp') {
              if (cellVal !== undefined) {
                curObj.deskripsi_cp = cellVal;
                rowModified = true;
              }
            } else {
              const cleanStr = cellVal.replace(',', '.');
              if (cleanStr === '' || cleanStr === '-') {
                curObj[field] = 0;
                rowModified = true;
              } else {
                const num = parseFloat(cleanStr);
                if (!isNaN(num)) {
                  curObj[field] = Math.max(0, Math.min(100, Math.round(num * 10) / 10));
                  rowModified = true;
                }
              }
            }

            if (cOffset + 1 > maxColsAffected) {
              maxColsAffected = cOffset + 1;
            }
          });

          if (rowModified) {
            next[student.siswa_id] = curObj;
            updatedRowsCount++;
          }
        });

        return next;
      });

      if (updatedRowsCount > 0) {
        setHasChanges(true);
        toast.success(
          `Berhasil menempel ${updatedRowsCount} baris × ${maxColsAffected} kolom dari Excel!`,
          { icon: '📋' }
        );
        return true;
      }
      return false;
    },
    [isReadOnly, filteredStudents]
  );

  const handleCellPaste = useCallback(
    (e: React.ClipboardEvent, rowIndex: number, colIndex: number) => {
      const text = e.clipboardData.getData('text/plain');
      if (!text) return;
      if (text.includes('\t') || text.includes('\n')) {
        e.preventDefault();
        handleBulkPaste(rowIndex, colIndex, text);
      }
    },
    [handleBulkPaste]
  );

  const handlePasteFromClipboardButton = useCallback(async () => {
    if (isReadOnly) {
      toast.error('Tidak dapat menempel nilai: Mode Hanya Baca aktif.');
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        toast.warning('Clipboard kosong. Silakan salin (Ctrl+C) data dari Excel terlebih dahulu.');
        return;
      }
      const targetRow = activeCell?.row ?? 0;
      const targetCol = activeCell?.col ?? 0;
      handleBulkPaste(targetRow, targetCol, text);
    } catch {
      toast.info('Gunakan pintasan keyboard (Ctrl + V) langsung pada sel input untuk menempel nilai dari Excel.');
    }
  }, [isReadOnly, activeCell, handleBulkPaste]);

  // Copy All Scores to Clipboard in TSV (Excel format)
  const handleCopyAllScoresToClipboard = useCallback(() => {
    if (students.length === 0) {
      toast.warning('Belum ada data nilai taruna untuk disalin.');
      return;
    }

    const headers = [
      'NO',
      'NIS',
      'NAMA TARUNA',
      'SAMAPTA',
      'PBB',
      'DISIPLIN',
      'MENTAL',
      'PREDIKAT',
      'NILAI RAPOR',
      'CAPAIAN KOMPETENSI (CP)',
    ];

    const rows = students.map((s, idx) => {
      const sc = localScores[s.siswa_id] || {
        samapta: 0,
        pbb: 0,
        disiplin: 0,
        mental: 0,
        deskripsi_cp: '',
      };
      const live = calculateLiveFinal(sc);
      return [
        idx + 1,
        s.nis,
        s.nama_siswa,
        sc.samapta,
        sc.pbb,
        sc.disiplin,
        sc.mental,
        live.grade,
        live.final,
        sc.deskripsi_cp || s.deskripsi_rapor || live.autoNarasi,
      ].join('\t');
    });

    const tsv = [headers.join('\t'), ...rows].join('\n');
    navigator.clipboard
      .writeText(tsv)
      .then(() => {
        toast.success(`Berhasil menyalin ${students.length} baris nilai ke clipboard format Excel!`, {
          icon: '📋',
        });
      })
      .catch(() => {
        toast.error('Gagal menyalin ke clipboard.');
      });
  }, [students, localScores, calculateLiveFinal]);

  // Adapter untuk reusable ExcelCompareNilaiModal (Smart Komparasi Excel)
  const compareModalScores: StudentScoreItem[] = useMemo(() => {
    return students.map((s) => {
      const sc = localScores[s.siswa_id] || {
        samapta: 0,
        pbb: 0,
        disiplin: 0,
        mental: 0,
        deskripsi_cp: '',
      };
      const live = calculateLiveFinal(sc);
      return {
        siswa_id: s.siswa_id,
        nama: s.nama_siswa,
        nis: s.nis,
        sumatif_1: sc.samapta,
        sumatif_2: sc.pbb,
        sumatif_3: sc.disiplin,
        sumatif_4: sc.mental,
        sumatif_akhir: null,
        nilai_rapor_final: live.final,
        nilai: live.final,
        deskripsi_cp: sc.deskripsi_cp || s.deskripsi_rapor || '',
        deskripsi: sc.deskripsi_cp || s.deskripsi_rapor || '',
      };
    });
  }, [students, localScores, calculateLiveFinal]);

  const handleApplyComparedGrades = useCallback((updatedList: StudentScoreItem[]) => {
    setLocalScores((prev) => {
      const next = { ...prev };
      updatedList.forEach((item) => {
        const cur = next[item.siswa_id] || {
          samapta: 0,
          pbb: 0,
          disiplin: 0,
          mental: 0,
          deskripsi_cp: '',
        };
        next[item.siswa_id] = {
          samapta: item.sumatif_1 !== null && item.sumatif_1 !== undefined && item.sumatif_1 !== '' ? Number(item.sumatif_1) : cur.samapta,
          pbb: item.sumatif_2 !== null && item.sumatif_2 !== undefined && item.sumatif_2 !== '' ? Number(item.sumatif_2) : cur.pbb,
          disiplin: item.sumatif_3 !== null && item.sumatif_3 !== undefined && item.sumatif_3 !== '' ? Number(item.sumatif_3) : cur.disiplin,
          mental: item.sumatif_4 !== null && item.sumatif_4 !== undefined && item.sumatif_4 !== '' ? Number(item.sumatif_4) : cur.mental,
          deskripsi_cp: item.deskripsi_cp !== undefined ? String(item.deskripsi_cp) : cur.deskripsi_cp,
        };
      });
      return next;
    });
    setHasChanges(true);
  }, []);

  // Active Cell Coordinate (e.g. "B4", "C12")
  const activeCoordinate = useMemo(() => {
    if (!activeCell) return 'A1';
    return `${activeCell.colLetter}${activeCell.row + 1}`;
  }, [activeCell]);

  // Formula & Value preview inside the Excel Formula Bar
  const activeFormulaPreview = useMemo(() => {
    if (!activeCell || !filteredStudents[activeCell.row]) {
      return 'Klik salah satu sel untuk navigasi atau tempel (Ctrl+V) langsung dari Excel / Google Sheets.';
    }
    const student = filteredStudents[activeCell.row];
    const sc = localScores[student.siswa_id] || {
      samapta: 0,
      pbb: 0,
      disiplin: 0,
      mental: 0,
      deskripsi_cp: '',
    };

    if (activeCell.field === 'samapta') {
      return `[${student.nama_siswa}] SAMAPTA (Bobot ${skema?.bobot_samapta ?? 25}%) = ${sc.samapta} • Standar KKM: ${kkmThreshold}`;
    }
    if (activeCell.field === 'pbb') {
      return `[${student.nama_siswa}] PBB (Bobot ${skema?.bobot_pbb ?? 20}%) = ${sc.pbb} • Standar KKM: ${kkmThreshold}`;
    }
    if (activeCell.field === 'disiplin') {
      return `[${student.nama_siswa}] DISIPLIN (Bobot ${skema?.bobot_disiplin ?? 30}%) = ${sc.disiplin} • Standar KKM: ${kkmThreshold}`;
    }
    if (activeCell.field === 'mental') {
      return `[${student.nama_siswa}] MENTAL (Bobot ${skema?.bobot_mental ?? 25}%) = ${sc.mental} • Standar KKM: ${kkmThreshold}`;
    }
    if (activeCell.field === 'deskripsi_cp') {
      const live = calculateLiveFinal(sc);
      return `[${student.nama_siswa}] CAPAIAN KOMPETENSI (CP) = "${sc.deskripsi_cp || student.deskripsi_rapor || live.autoNarasi}"`;
    }
    return `[${student.nama_siswa}]`;
  }, [activeCell, filteredStudents, localScores, skema, kkmThreshold, calculateLiveFinal]);

  const isCellActive = (r: number, c: number) => activeCell?.row === r && activeCell?.col === c;

  // Handler Tarik Rekomendasi Nilai dari Presensi 5 Siklus
  const handleSyncPresensi = async () => {
    if (!kelasId || !tahunPelajaranId || !semesterId) return;
    const confirmed = window.confirm(
      'Tarik nilai kehadiran 5 siklus ketarunaan (Upacara, Ketarunaan Pagi, Pembiasaan Dhuha, Apel Sore)?\n\n' +
        'Sistem akan otomatis menghitung persentase kehadiran nyata di lapangan dan mengisi rekomendasi nilai DISIPLIN dan MENTAL untuk seluruh taruna di rombel ini.'
    );
    if (!confirmed) return;

    try {
      setIsSyncingPresensi(true);
      const res = await syncKetarunaanPresensi5Siklus({
        kelas_id: kelasId,
        tahun_pelajaran_id: tahunPelajaranId,
        semester_id: semesterId,
      });

      const data = (res as any)?.data ?? res;
      const rekap = data?.rekap || {};
      let updatedCount = 0;

      setLocalScores((prev) => {
        const next = { ...prev };
        students.forEach((s) => {
          const r = rekap[s.siswa_id];
          if (r) {
            const cur = next[s.siswa_id] || {
              samapta: s.nilai_samapta ?? 0,
              pbb: s.nilai_pbb ?? 0,
              disiplin: 0,
              mental: 0,
              deskripsi_cp: s.deskripsi_rapor ?? '',
            };
            next[s.siswa_id] = {
              ...cur,
              disiplin: r.rekomendasi_disiplin,
              mental: r.rekomendasi_mental,
            };
            updatedCount++;
          }
        });
        return next;
      });

      setHasChanges(true);
      toast.success(
        `Berhasil menyinkronkan kehadiran 5 siklus (${data?.totalSesiTerlaksana ?? 0} sesi) untuk ${updatedCount} taruna! Klik 'Simpan' untuk menyimpan.`
      );
    } catch (err: any) {
      toast.error('Gagal menyinkronkan presensi: ' + (err?.message || 'Terjadi kendala jaringan'));
    } finally {
      setIsSyncingPresensi(false);
    }
  };

  // Mutation: Simpan Draf
  const saveMutation = useMutation({
    mutationFn: async () => {
      const ctx = assertLoadedContextReady();
      const items = students.map((s) => {
        const sc = localScores[s.siswa_id] || {
          samapta: 0,
          pbb: 0,
          disiplin: 0,
          mental: 0,
          deskripsi_cp: '',
        };
        return {
          siswa_id: s.siswa_id,
          siswa_akademik_id: s.siswa_akademik_id,
          nilai_samapta: sc.samapta,
          nilai_pbb: sc.pbb,
          nilai_disiplin: sc.disiplin,
          nilai_mental: sc.mental,
          custom_deskripsi: sc.deskripsi_cp.trim() || undefined,
        };
      });
      return saveKetarunaanNilaiBulk({
        ...ctx,
        items,
      });
    },
    onSuccess: () => {
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['ketarunaan-nilai-kelas'] });
      toast.success(`Nilai ketarunaan rombel ${effectiveKelasNama} berhasil disimpan!`);
    },
    onError: (err: any) => {
      toast.error('Gagal menyimpan nilai: ' + (err?.response?.data?.message || err?.message || 'Terjadi kendala'));
    },
  });

  // Mutation: Kunci Nilai & Kirim ke Rapor
  const lockMutation = useMutation({
    mutationFn: async () => {
      const ctx = assertLoadedContextReady();
      const items = students.map((s) => {
        const sc = localScores[s.siswa_id] || {
          samapta: 0,
          pbb: 0,
          disiplin: 0,
          mental: 0,
          deskripsi_cp: '',
        };
        return {
          siswa_id: s.siswa_id,
          siswa_akademik_id: s.siswa_akademik_id,
          nilai_samapta: sc.samapta,
          nilai_pbb: sc.pbb,
          nilai_disiplin: sc.disiplin,
          nilai_mental: sc.mental,
          custom_deskripsi: sc.deskripsi_cp.trim() || undefined,
        };
      });
      await saveKetarunaanNilaiBulk({
        ...ctx,
        items,
      });

      return lockKetarunaanNilai(ctx);
    },
    onSuccess: () => {
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['ketarunaan-nilai-kelas'] });
      toast.success('Nilai berhasil dikunci dan narasi capaian telah dikirimkan ke Rapor Kokurikuler Wali Kelas!');
    },
    onError: (err: any) => {
      toast.error('Gagal mengunci nilai: ' + (err?.response?.data?.message || err?.message || 'Terjadi kendala'));
    },
  });

  // Mutation: Buka Kunci Nilai
  const unlockMutation = useMutation({
    mutationFn: async () => {
      const ctx = assertLoadedContextReady();
      return unlockKetarunaanNilai(ctx);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ketarunaan-nilai-kelas'] });
      toast.success('Kunci nilai berhasil dibuka kembali.');
    },
    onError: (err: any) => {
      toast.error('Gagal membuka kunci nilai: ' + (err?.response?.data?.message || err?.message || 'Terjadi kendala'));
    },
  });

  if (!kelasId) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
          <Shield className="w-12 h-12 text-slate-400 mb-3" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">
            Pilih Rombel / Kelas Terlebih Dahulu
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Gunakan filter toolbar di bagian atas untuk memilih kelas yang ingin dinilai kesamaptaan &amp; ketarunaannya.
          </p>

          <div className="mt-5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExportModalOpen(true)}
              className="gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 shadow-sm"
              title="Ekspor Seluruh Nilai Ketarunaan Satu Sekolah ke Excel untuk Mail Merge"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Ekspor Nilai Ketarunaan (Semua Rombel)</span>
            </Button>
          </div>
        </div>

        <KetarunaanExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          currentStudents={[]}
          currentScores={{}}
          skema={null}
          kelasId={undefined}
          kelasNama={undefined}
          jurusanNama={undefined}
          tahunPelajaranId={tahunPelajaranId}
          tahunPelajaranNama={tahunPelajaranNama}
          semesterId={semesterId}
          semesterNama={semesterNama}
        />
      </>
    );
  }

  return (
    <Card className="w-full p-3 sm:p-5 border-none shadow-sm dark:bg-slate-900/40 space-y-3">
      {/* ── Sleek Header Bar (Mengadopsi Standar Lembar Input Nilai e-Rapor) ──── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              KETARUNAAN &amp; KESAMAPTAAN
              {effectiveKelasNama && (
                <span className="text-slate-400 font-normal"> • {effectiveKelasNama}</span>
              )}
            </h3>

            <span className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-md">
              {students.length} Siswa
            </span>

            <span
              title="Nilai akhir ketarunaan dikalkulasi otomatis dari 4 pilar sesuai bobot skema aktif"
              className="inline-flex items-center gap-1 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-md cursor-help transition-all shadow-2xs"
            >
              <Zap size={11} className="text-indigo-600 dark:text-indigo-400" />
              <span>
                Mode: Hitung Otomatis (Rumus •{' '}
                {skema?.mode_pelatihan === 'FULL_TARUNA' ? 'Murni Ketarunaan' : 'Semi Ketarunaan'})
              </span>
            </span>

            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
              TP {periodTahun || '-'} • {periodSemester || '-'}
            </span>

            {isClassLocked ? (
              <Badge
                variant="outline"
                className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 gap-1 text-[10px]"
              >
                <Lock className="w-3 h-3" /> Terkunci di Rapor
              </Badge>
            ) : isArchivePeriod ? (
              <Badge
                variant="outline"
                className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 gap-1 text-[10px]"
              >
                <Lock className="w-3 h-3" /> Hanya Baca (Arsip)
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 gap-1 text-[10px]"
              >
                <Unlock className="w-3 h-3" /> Draf Terbuka
              </Badge>
            )}
          </div>

          {/* Compact Legend, KKM & Bobot Row */}
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-500 dark:text-slate-400">KKM:</span>
              {isReadOnly ? (
                <span className="font-bold text-slate-700 dark:text-slate-200">{kkmThreshold}</span>
              ) : (
                <input
                  id="kkm-ketarunaan-input"
                  aria-label="Batas KKM Ketarunaan"
                  type="number"
                  min={50}
                  max={95}
                  value={kkmThreshold}
                  onChange={(e) => handleKkmChange(parseInt(e.target.value, 10) || 71)}
                  className="w-10 text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-bold text-indigo-600 dark:text-indigo-400 py-0.5"
                />
              )}
            </div>

            <span className="text-slate-300 dark:text-slate-700">•</span>

            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> &lt;{kkmThreshold} Remedial
              </span>
              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> {kkmThreshold}–{Math.max(85, kkmThreshold + 14)} Tuntas
              </span>
              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> ≥{Math.max(86, kkmThreshold + 15)} Sangat Baik
              </span>
            </div>

            <span className="text-slate-300 dark:text-slate-700">•</span>

            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <span>
                Bobot: Samapta {skema?.bobot_samapta ?? 25}% • PBB {skema?.bobot_pbb ?? 20}% • Disiplin{' '}
                {skema?.bobot_disiplin ?? 30}% • Mental {skema?.bobot_mental ?? 25}%
              </span>
              <Tooltip
                placement="bottom"
                content={
                  <div className="space-y-1.5 p-1 text-[11px] leading-relaxed text-left">
                    <p className="font-bold text-slate-900 dark:text-white">Rumus Nilai Rapor Ketarunaan:</p>
                    <p className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                      (Samapta×{skema?.bobot_samapta ?? 25}% + PBB×{skema?.bobot_pbb ?? 20}% + Disiplin×
                      {skema?.bobot_disiplin ?? 30}% + Mental×{skema?.bobot_mental ?? 25}%) / 100
                    </p>
                  </div>
                }
              >
                <span className="text-slate-400 hover:text-indigo-500 cursor-pointer inline-flex items-center">
                  <Info className="w-3.5 h-3.5" />
                </span>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Toolbar Action Group (Skema, Tarik 5 Siklus, Import/Export Dropdown, Simpan, Kunci) */}
        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-start lg:justify-end">
          {!isArchivePeriod && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSkemaModalOpen(true)}
              className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold text-xs h-[36px] px-3 flex items-center gap-1.5 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-500" />
              <span>Skema &amp; Bobot</span>
            </Button>
          )}

          {!isReadOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSyncPresensi}
              disabled={isSyncingPresensi}
              className="border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl font-bold text-xs h-[36px] px-3 flex items-center gap-1.5 cursor-pointer"
              title="Tarik nilai Disiplin & Mental otomatis dari presensi 5 siklus (Upacara, Ketarunaan, Dhuha, Apel Sore)"
            >
              <Sparkles className={`w-3.5 h-3.5 text-indigo-500 ${isSyncingPresensi ? 'animate-spin' : ''}`} />
              <span>{isSyncingPresensi ? 'Menghitung...' : 'Tarik 5 Siklus'}</span>
            </Button>
          )}

          {/* Dropdown Menu Import / Export (Identik dengan Lembar Input Nilai e-Rapor) */}
          <div className="relative inline-block text-left" ref={excelMenuRef}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsExcelMenuOpen((prev) => !prev)}
              className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold text-xs h-[36px] px-3 flex items-center gap-1.5 cursor-pointer"
              title="Pilihan Smart Komparasi Excel, Isi Cepat, dan Ekspor Mail Merge"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Import / Export</span>
              <ChevronDown
                className={`w-3 h-3 text-slate-400 transition-transform ${isExcelMenuOpen ? 'rotate-180' : ''}`}
              />
            </Button>

            {isExcelMenuOpen && (
              <div className="absolute right-0 mt-2 w-60 origin-top-right rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 py-1 divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in-95 duration-100">
                {!isReadOnly && (
                  <div className="p-1 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsExcelMenuOpen(false);
                        setIsCompareModalOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <ArrowRightLeft className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span>Smart Komparasi Nilai Excel</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsExcelMenuOpen(false);
                        handleQuickFill('samapta');
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-lg flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span>Isi Cepat Serentak: Samapta</span>
                      <span className="text-[10px] font-mono text-slate-400">Kolom B</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsExcelMenuOpen(false);
                        handleQuickFill('pbb');
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-lg flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span>Isi Cepat Serentak: PBB</span>
                      <span className="text-[10px] font-mono text-slate-400">Kolom C</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsExcelMenuOpen(false);
                        handleQuickFill('disiplin');
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-lg flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span>Isi Cepat Serentak: Disiplin</span>
                      <span className="text-[10px] font-mono text-slate-400">Kolom D</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsExcelMenuOpen(false);
                        handleQuickFill('mental');
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-lg flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span>Isi Cepat Serentak: Mental</span>
                      <span className="text-[10px] font-mono text-slate-400">Kolom E</span>
                    </button>
                  </div>
                )}

                <div className="p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsExcelMenuOpen(false);
                      setIsExportModalOpen(true);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Export Excel &amp; Mail Merge</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {isArchivePeriod ? (
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={students.length === 0 || isLoading}
              onClick={() => setIsArchiveModalOpen(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs h-[36px] px-3.5 flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Buka ruang khusus Pembina untuk mengoreksi nilai ketarunaan pada tahun pelajaran/semester arsip"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Dapur Koreksi Arsip</span>
            </Button>
          ) : !isClassLocked ? (
            <>
              <Button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || students.length === 0}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-100 dark:shadow-none text-xs h-[36px] px-3.5 flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saveMutation.isPending ? 'Menyimpan...' : 'Simpan'}</span>
              </Button>

              <Button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      `Kunci nilai rombel ${effectiveKelasNama} pada TP ${periodTahun} (${periodSemester}) untuk ${students.length} taruna dan kirimkan narasi capaian ke Rapor Kokurikuler Wali Kelas?`
                    )
                  ) {
                    lockMutation.mutate();
                  }
                }}
                disabled={lockMutation.isPending || students.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs h-[36px] px-3.5 flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{lockMutation.isPending ? 'Mengunci...' : 'Kunci ke Rapor'}</span>
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (
                  window.confirm(
                    `Buka kembali kunci nilai rombel ${effectiveKelasNama} (TP ${periodTahun} • ${periodSemester}) untuk perbaikan/remedial?`
                  )
                ) {
                  unlockMutation.mutate();
                }
              }}
              disabled={unlockMutation.isPending}
              className="border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 rounded-xl font-bold text-xs h-[36px] px-3.5 flex items-center gap-1.5 cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Buka Kunci Nilai</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="h-[36px] w-[36px] p-0 rounded-xl border-slate-200 dark:border-slate-700"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Banner Peringatan Perubahan Belum Disimpan */}
      {hasChanges && !isArchivePeriod && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl px-3.5 py-2 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-semibold">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Terdapat perubahan nilai pada rombel <strong>{effectiveKelasNama}</strong> (TP {periodTahun} •{' '}
              {periodSemester}) yang belum disimpan.
            </span>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="gap-1 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shrink-0 h-7 px-2.5 rounded-lg"
          >
            <Save className="w-3 h-3" />
            <span>{saveMutation.isPending ? 'Menyimpan...' : 'Simpan Sekarang'}</span>
          </Button>
        </div>
      )}

      {/* Banner Status Penguncian / Arsip */}
      {isArchivePeriod && (
        <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold mr-1">
                Mode Baca-Saja (Arsip TP {periodTahun} • {periodSemester}):
              </span>
              <span>
                Lembar penilaian reguler dikunci otomatis agar tidak terjadi salah input lintas tahun pelajaran. Untuk revisi atau ujian susulan arsip, gunakan Dapur Khusus Pembina.
              </span>
            </div>
          </div>
          {students.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsArchiveModalOpen(true)}
              className="gap-1.5 text-xs font-bold border-amber-400 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/60 shrink-0 rounded-xl"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Buka Dapur Koreksi Arsip</span>
            </Button>
          )}
        </div>
      )}

      {rosterSource === 'MASTER_SISWA_FALLBACK' && (
        <div className="px-3 py-2 rounded-xl bg-sky-50/80 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 text-[11px] text-sky-800 dark:text-sky-200 font-medium">
          Roster akademik semester ini belum di-generate — menampilkan daftar siswa aktif rombel saat ini.
        </div>
      )}

      {/* ── EXCEL FORMULA & SPREADSHEET TOOLBAR (Identik dengan Lembar Input Nilai e-Rapor) ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono shadow-2xs">
        {/* Active Cell Box & Formula Bar */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Excel Name Box (e.g. "B1", "C4") */}
          <div
            className="flex items-center justify-center px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-100 font-bold min-w-[64px] shadow-2xs select-none"
            title="Koordinat Sel Aktif"
          >
            <span className="text-emerald-700 dark:text-emerald-400 font-black">{activeCoordinate}</span>
          </div>

          {/* Formula 'fx' indicator */}
          <div className="font-serif italic font-black text-slate-400 dark:text-slate-500 select-none px-0.5 text-sm">
            fx
          </div>

          {/* Value / Formula display */}
          <div
            className="flex-1 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300 truncate font-mono text-[11px]"
            title={activeFormulaPreview}
          >
            {activeFormulaPreview}
          </div>
        </div>

        {/* Search & Excel Clipboard Quick Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap shrink-0 self-end sm:self-auto font-sans">
          <div className="relative w-44">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama / NIS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-2.5 py-1 text-[11px] rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {!isReadOnly && (
            <button
              type="button"
              onClick={() => setIsCompareModalOpen(true)}
              title="Buka Smart Komparasi Nilai dari Excel (mencocokkan nilai per taruna berdasarkan NIS/Nama tanpa khawatir tertukar baris)"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-[11px] shadow-2xs cursor-pointer transition-colors"
            >
              <ArrowRightLeft size={13} />
              <span>Smart Komparasi Excel</span>
            </button>
          )}

          {!isReadOnly && (
            <button
              type="button"
              onClick={handlePasteFromClipboardButton}
              title="Tempel data Excel dari clipboard ke sel yang dipilih (Ctrl + V)"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px] shadow-2xs cursor-pointer transition-colors"
            >
              <ClipboardPaste size={13} />
              <span>Paste Clipboard</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyAllScoresToClipboard}
            title="Salin seluruh tabel nilai ke clipboard dalam format Excel (TSV)"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded font-bold text-[11px] cursor-pointer transition-colors shadow-2xs"
          >
            <Copy size={13} />
            <span>Salin ke Excel</span>
          </button>
        </div>
      </div>

      {/* ── EXCEL SPREADSHEET GRID TABLE ────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-2 py-8">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton key={idx} className="h-8 w-full rounded-lg" />
          ))}
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="py-14 px-4 text-center border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
          {searchQuery.trim() ? (
            <p className="text-xs text-slate-400">Tidak ada taruna yang cocok dengan pencarian.</p>
          ) : (
            <div className="flex flex-col items-center gap-1.5 max-w-md mx-auto">
              <AlertCircle className="w-6 h-6 text-amber-500" />
              <p className="font-bold text-slate-700 dark:text-slate-200 text-xs">
                Rombel {effectiveKelasNama || 'ini'} tidak memiliki taruna pada TP {periodTahun || '-'} Semester{' '}
                {periodSemester || '-'}.
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Daftar taruna diambil dari data rombel per tahun pelajaran (riwayat akademik), bukan dari kelas siswa saat ini. Jika angkatan ini berada di rombel lain pada tahun tersebut, gunakan tombol linimasa angkatan di bawah filter Kelas.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-300 dark:border-slate-700 rounded-lg shadow-2xs bg-white dark:bg-slate-900">
          <table className="w-full text-xs text-left border-collapse border-spacing-0 select-text">
            {/* EXCEL COLUMN HEADERS */}
            <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-300 dark:border-slate-700">
              <tr>
                <th className="py-2 px-2 w-12 text-center border-r border-slate-300 dark:border-slate-700 font-mono text-[10px] text-slate-400 bg-slate-200/50 dark:bg-slate-800/90 select-none">
                  #
                </th>

                <th className="py-2 px-3 border-r border-slate-300 dark:border-slate-700 min-w-[230px]">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 mb-0.5">
                    <span className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-[9px] font-bold">A</span>
                    <span>SISWA</span>
                  </div>
                  <span className="text-slate-800 dark:text-slate-100 font-black">NAMA SISWA</span>
                </th>

                {/* Col B: SAMAPTA */}
                <th className="py-2 px-1 text-center w-22 min-w-[78px] border-r border-slate-300 dark:border-slate-700">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-slate-400 mb-0.5">
                    <span className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-[9px] font-bold">B</span>
                    <span>{skema?.bobot_samapta ?? 25}%</span>
                  </div>
                  <span className="text-slate-800 dark:text-slate-100 font-bold">SAMAPTA</span>
                </th>

                {/* Col C: PBB */}
                <th className="py-2 px-1 text-center w-22 min-w-[78px] border-r border-slate-300 dark:border-slate-700">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-slate-400 mb-0.5">
                    <span className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-[9px] font-bold">C</span>
                    <span>{skema?.bobot_pbb ?? 20}%</span>
                  </div>
                  <span className="text-slate-800 dark:text-slate-100 font-bold">PBB</span>
                </th>

                {/* Col D: DISIPLIN */}
                <th className="py-2 px-1 text-center w-22 min-w-[78px] border-r border-slate-300 dark:border-slate-700">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-slate-400 mb-0.5">
                    <span className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-[9px] font-bold">D</span>
                    <span>{skema?.bobot_disiplin ?? 30}%</span>
                  </div>
                  <span className="text-slate-800 dark:text-slate-100 font-bold">DISIPLIN</span>
                </th>

                {/* Col E: MENTAL */}
                <th className="py-2 px-1 text-center w-22 min-w-[78px] border-r border-slate-300 dark:border-slate-700">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-slate-400 mb-0.5">
                    <span className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-[9px] font-bold">E</span>
                    <span>{skema?.bobot_mental ?? 25}%</span>
                  </div>
                  <span className="text-slate-800 dark:text-slate-100 font-bold">MENTAL</span>
                </th>

                {/* Col F: PREDIKAT (Computed fx) */}
                <th className="py-2 px-1 text-center w-20 min-w-[70px] border-r border-slate-300 dark:border-slate-700 bg-slate-200/40 dark:bg-slate-800/60">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-slate-400 mb-0.5">
                    <span className="bg-slate-300 dark:bg-slate-600 px-1 rounded text-[9px] font-bold">F</span>
                    <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-mono font-bold">fx</span>
                  </div>
                  <span className="text-slate-700 dark:text-slate-300 font-bold">PREDIKAT</span>
                </th>

                {/* Col G: NILAI RAPOR (Computed fx) */}
                <th className="py-2 px-1 text-center w-24 min-w-[85px] border-r border-slate-300 dark:border-slate-700 bg-indigo-100/60 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-mono mb-0.5">
                    <span className="bg-indigo-200/70 dark:bg-indigo-800 px-1 rounded text-[9px] font-bold">G</span>
                    <span className="text-[9px] font-mono font-bold">fx</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-extrabold">NILAI RAPOR</span>
                    <span className="text-[8px] font-bold lowercase text-slate-400">(rumus)</span>
                  </div>
                </th>

                {/* Col H: CAPAIAN KOMPETENSI (CP) */}
                <th className="py-2 px-3 min-w-[290px]">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400 mb-0.5">
                        <span className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-[9px] font-bold">H</span>
                        <span>CAPAIAN</span>
                      </div>
                      <span className="text-slate-800 dark:text-slate-100 font-bold">CAPAIAN KOMPETENSI (CP)</span>
                    </div>
                    {!isReadOnly && (
                      <div className="flex items-center gap-1 font-sans">
                        <button
                          type="button"
                          onClick={() => {
                            const firstStudent = filteredStudents[0];
                            if (!firstStudent) return;
                            const firstSc = localScores[firstStudent.siswa_id] || {
                              samapta: 0,
                              pbb: 0,
                              disiplin: 0,
                              mental: 0,
                              deskripsi_cp: '',
                            };
                            const firstLive = calculateLiveFinal(firstSc);
                            handleCopyCpToAll(
                              firstSc.deskripsi_cp || firstStudent.deskripsi_rapor || firstLive.autoNarasi
                            );
                          }}
                          title="Salin CP Baris Pertama ke Semua Taruna"
                          className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Copy size={11} /> Salin ke Semua
                        </button>
                        <button
                          type="button"
                          onClick={handleClearCpAll}
                          title="Reset ke Narasi Otomatis"
                          className="text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800 flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Trash2 size={11} /> Kosongkan
                        </button>
                      </div>
                    )}
                  </div>
                </th>
              </tr>
            </thead>

            {/* EXCEL SPREADSHEET BODY */}
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/80 font-medium text-slate-700 dark:text-slate-300">
              {filteredStudents.map((s, idx) => {
                const current = localScores[s.siswa_id] || {
                  samapta: 0,
                  pbb: 0,
                  disiplin: 0,
                  mental: 0,
                  deskripsi_cp: '',
                };
                const live = calculateLiveFinal(current);
                const isRowActive = activeCell?.row === idx;

                return (
                  <tr
                    key={s.siswa_id}
                    className={cn(
                      'hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-none',
                      isRowActive && 'bg-emerald-50/15 dark:bg-emerald-950/15'
                    )}
                  >
                    {/* Excel Row Index Column */}
                    <td
                      className={cn(
                        'py-1.5 px-2 text-center font-mono text-[11px] border-r border-slate-300 dark:border-slate-700 select-none transition-colors',
                        isRowActive
                          ? 'bg-emerald-100/70 dark:bg-emerald-950/60 font-black text-emerald-800 dark:text-emerald-300'
                          : 'bg-slate-100/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold'
                      )}
                    >
                      {idx + 1}
                    </td>

                    {/* Col A: Student Name, NIS, 5-Siklus Attendance & Sertifikat */}
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-700/80">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 dark:text-white leading-tight truncate max-w-[220px]">
                            {s.nama_siswa}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            NIS: {s.nis}
                          </div>
                          {s.presensi &&
                            (s.presensi.total_sesi_disiplin > 0 || s.presensi.total_sesi_duha > 0) && (
                              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                {s.presensi.total_sesi_disiplin > 0 && (
                                  <span
                                    className="inline-flex items-center px-1 py-0.2 rounded text-[9px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                                    title="Kehadiran Upacara, Ketarunaan & Apel Sore"
                                  >
                                    Disiplin: {s.presensi.hadir_disiplin}/{s.presensi.total_sesi_disiplin} ({s.presensi.persen_disiplin}%)
                                  </span>
                                )}
                                {s.presensi.total_sesi_duha > 0 && (
                                  <span
                                    className="inline-flex items-center px-1 py-0.2 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                                    title="Kehadiran Pembiasaan Dhuha Jum'at"
                                  >
                                    Dhuha: {s.presensi.hadir_duha}/{s.presensi.total_sesi_duha} ({s.presensi.persen_duha}%)
                                  </span>
                                )}
                              </div>
                            )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCertStudent({
                              ...s,
                              nilai_samapta: current.samapta,
                              nilai_pbb: current.pbb,
                              nilai_disiplin: current.disiplin,
                              nilai_mental: current.mental,
                              nilai_akhir: live.final,
                              predikat: live.grade,
                              deskripsi_rapor: current.deskripsi_cp || s.deskripsi_rapor || live.autoNarasi,
                            });
                            setIsCertModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors shrink-0 cursor-pointer"
                          title="Pratinjau & Cetak Sertifikat Ketarunaan"
                        >
                          <Award className="w-3 h-3 text-indigo-500" />
                          <span>Sertifikat</span>
                        </button>
                      </div>
                    </td>

                    {/* Col 0..3: Samapta (B), PBB (C), Disiplin (D), Mental (E) */}
                    {(['samapta', 'pbb', 'disiplin', 'mental'] as const).map((aspect, colIdx) => {
                      const colLetter = COL_LETTERS[colIdx];
                      const active = isCellActive(idx, colIdx);
                      return (
                        <td
                          key={aspect}
                          className={cn(
                            'p-0 relative h-9 border border-slate-200 dark:border-slate-700/80 transition-none',
                            active &&
                              'ring-2 ring-emerald-600 dark:ring-emerald-400 ring-inset z-10 bg-emerald-50/30 dark:bg-emerald-950/30'
                          )}
                        >
                          <input
                            id={`ketarunaan-grid-${idx}-${colIdx}`}
                            aria-label={`${aspect.toUpperCase()} untuk ${s.nama_siswa}`}
                            type="text"
                            inputMode="decimal"
                            disabled={isReadOnly}
                            readOnly={isReadOnly}
                            value={current[aspect] ?? ''}
                            onChange={(e) => handleScoreChange(s.siswa_id, aspect, e.target.value)}
                            onKeyDown={(e) => handleKeyDownGrid(e, idx, colIdx)}
                            onFocus={(e) => {
                              setActiveCell({
                                row: idx,
                                col: colIdx,
                                field: aspect,
                                colLetter,
                                studentName: s.nama_siswa,
                                siswaId: s.siswa_id,
                              });
                              e.currentTarget.select?.();
                            }}
                            onPaste={(e) => handleCellPaste(e, idx, colIdx)}
                            className={cn(
                              'w-full h-full text-center font-mono font-bold text-xs bg-transparent border-0 outline-none p-0 m-0',
                              getScoreInputStyle(current[aspect]),
                              isReadOnly ? 'cursor-default select-text' : 'cursor-cell'
                            )}
                          />
                          {active && (
                            <span className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-emerald-600 dark:bg-emerald-400 pointer-events-none z-20" />
                          )}
                        </td>
                      );
                    })}

                    {/* Computed Col F: PREDIKAT */}
                    <td className="py-1 px-1 text-center font-mono font-bold text-xs border border-slate-200 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-800/40 select-none">
                      <span
                        className={cn(
                          'inline-block w-6 h-6 leading-6 text-center rounded-md font-mono font-black text-xs',
                          live.grade === 'A'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : live.grade === 'B'
                            ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                            : live.grade === 'C'
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                            : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                        )}
                      >
                        {live.grade}
                      </span>
                    </td>

                    {/* Computed Col G: NILAI RAPOR FINAL (Rumus fx) */}
                    <td className="py-1 px-1 text-center font-mono font-black text-sm border border-slate-200 dark:border-slate-700/80 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 select-none">
                      <div className="flex items-center justify-center gap-1">
                        <span>{live.final}</span>
                        <span
                          title="Nilai rapor dihitung otomatis dari 4 pilar ketarunaan sesuai bobot"
                          className="text-[8px] font-bold px-1 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 cursor-help"
                        >
                          fx
                        </span>
                      </div>
                    </td>

                    {/* Col 4 (Letter H): CAPAIAN KOMPETENSI (CP) */}
                    <td
                      className={cn(
                        'p-0 relative border border-slate-200 dark:border-slate-700/80 transition-none',
                        isCellActive(idx, 4) &&
                          'ring-2 ring-emerald-600 dark:ring-emerald-400 ring-inset z-10 bg-emerald-50/15 dark:bg-emerald-950/20'
                      )}
                    >
                      <div className="flex items-center w-full h-full min-h-[36px] px-2 py-0.5 gap-1.5">
                        <textarea
                          id={`ketarunaan-grid-${idx}-4`}
                          aria-label={`Capaian Kompetensi untuk ${s.nama_siswa}`}
                          rows={1}
                          disabled={isReadOnly}
                          readOnly={isReadOnly}
                          value={current.deskripsi_cp}
                          onChange={(e) => handleDeskripsiChange(s.siswa_id, e.target.value)}
                          onKeyDown={(e) => handleKeyDownGrid(e, idx, 4)}
                          onFocus={() => {
                            setActiveCell({
                              row: idx,
                              col: 4,
                              field: 'deskripsi_cp',
                              colLetter: 'H',
                              studentName: s.nama_siswa,
                              siswaId: s.siswa_id,
                            });
                          }}
                          onPaste={(e) => handleCellPaste(e, idx, 4)}
                          placeholder={s.deskripsi_rapor || live.autoNarasi}
                          className={cn(
                            'w-full text-xs bg-transparent border-0 outline-none p-0 m-0 text-slate-800 dark:text-slate-200 resize-none font-sans leading-snug placeholder:text-slate-400',
                            isReadOnly ? 'cursor-default select-text' : 'cursor-text'
                          )}
                        />
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyCpToAll(current.deskripsi_cp || s.deskripsi_rapor || live.autoNarasi)
                            }
                            title="Salin CP ini ke semua taruna"
                            className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors shrink-0 cursor-pointer"
                          >
                            <Copy size={12} />
                          </button>
                        )}
                      </div>
                      {isCellActive(idx, 4) && (
                        <span className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-emerald-600 dark:bg-emerald-400 pointer-events-none z-20" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Excel Helper & Shortcut Bar (Identik dengan e-Rapor) ───────────────── */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-800/40 px-3 py-2 rounded-lg border border-slate-200/80 dark:border-slate-700/60 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
            <FileSpreadsheet size={13} />
            <span>Excel Multi-Cell Ready:</span>
          </span>
          <span>
            Salin data tabel/kolom dari Excel, lalu tekan{' '}
            <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded shadow-2xs font-bold text-slate-700 dark:text-slate-300">
              Ctrl + V
            </kbd>{' '}
            di sel mana saja. Gunakan tombol panah,{' '}
            <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded shadow-2xs font-bold text-slate-700 dark:text-slate-300">
              Enter
            </kbd>
            , atau{' '}
            <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded shadow-2xs font-bold text-slate-700 dark:text-slate-300">
              Tab
            </kbd>{' '}
            untuk bernavigasi antar sel.
          </span>
        </div>
      </div>

      {/* ── Reusable Smart Komparasi Excel Modal (Komponen Bersama Rapor) ──────── */}
      {isCompareModalOpen && (
        <ExcelCompareNilaiModal
          isOpen={isCompareModalOpen}
          onClose={() => setIsCompareModalOpen(false)}
          scores={compareModalScores}
          entryMode="sumatif"
          subjectName="KETARUNAAN & KESAMAPTAAN"
          className={effectiveKelasNama}
          kkmThreshold={kkmThreshold}
          onApplyGrades={handleApplyComparedGrades}
          columnLabels={{
            s1: 'Samapta',
            s2: 'PBB',
            s3: 'Disiplin',
            s4: 'Mental',
            hideSAkhir: true,
            cp: 'Capaian Kompetensi (CP)',
            placeholder:
              'Blok kolom dari Excel (NIS, Nama Taruna, Samapta, PBB, Disiplin, Mental, Capaian) -> Copy (Ctrl+C) -> Paste di sini (Ctrl+V).\nContoh:\n26271001\tAGUNG NURHUDA\t85\t90\t88\t92\tCapaian ketarunaan sangat baik\n26271002\tAHMAD RIFFA I\t78\t82\t85\t80\tDisiplin dan tertib',
          }}
        />
      )}

      {/* ── Modal Skema Penilaian ──────────────────────────────────────────────── */}
      <KetarunaanSkemaSettingsModal
        isOpen={isSkemaModalOpen}
        onClose={() => setIsSkemaModalOpen(false)}
        skema={skema}
        onSave={async (newSkema) => {
          await saveKetarunaanSkema(newSkema);
          queryClient.invalidateQueries({ queryKey: ['ketarunaan-nilai-kelas'] });
        }}
        isSaving={false}
        tahunPelajaranId={tahunPelajaranId || ''}
        semesterId={semesterId || null}
        jurusanId={jurusanId || null}
        jurusanNama={jurusanNama}
      />

      {/* ── Modal Cetak Sertifikat Ketarunaan (Depan & Belakang) ────────────────── */}
      <SertifikatKetarunaanModal
        isOpen={isCertModalOpen}
        onClose={() => {
          setIsCertModalOpen(false);
          setSelectedCertStudent(null);
        }}
        student={selectedCertStudent}
        students={filteredStudents}
        onSelectStudent={(nextSt) => {
          const sc = localScores[nextSt.siswa_id] || {
            samapta: nextSt.nilai_samapta ?? 0,
            pbb: nextSt.nilai_pbb ?? 0,
            disiplin: nextSt.nilai_disiplin ?? 0,
            mental: nextSt.nilai_mental ?? 0,
            deskripsi_cp: nextSt.deskripsi_rapor ?? '',
          };
          const live = calculateLiveFinal(sc);
          setSelectedCertStudent({
            ...nextSt,
            nilai_samapta: sc.samapta,
            nilai_pbb: sc.pbb,
            nilai_disiplin: sc.disiplin,
            nilai_mental: sc.mental,
            nilai_akhir: live.final,
            predikat: live.grade,
            deskripsi_rapor: sc.deskripsi_cp || nextSt.deskripsi_rapor || live.autoNarasi,
          });
        }}
        skema={skema}
        kelasId={loadedKelasId || kelasId}
        kelasNama={effectiveKelasNama}
        jurusanId={jurusanId}
        jurusanNama={effectiveJurusanNama}
        tahunPelajaran={loadedTpId || tahunPelajaranId}
        tahunPelajaranNama={periodTahun}
        semester={loadedSemesterId || semesterId}
        semesterNama={periodSemester}
      />

      {/* ── Modal Ekspor Nilai Ketarunaan ke Excel (Mail Merge) ───────────────── */}
      <KetarunaanExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        currentStudents={students}
        currentScores={localScores}
        skema={skema}
        calculateLiveFinal={calculateLiveFinal}
        kelasId={kelasId}
        kelasNama={effectiveKelasNama}
        jurusanNama={effectiveJurusanNama}
        tahunPelajaranId={tahunPelajaranId}
        tahunPelajaranNama={tahunPelajaranNama}
        semesterId={semesterId}
        semesterNama={semesterNama}
      />

      {/* ── Dapur Khusus Koreksi Nilai Arsip (Pembina) ────────────────────────── */}
      <KetarunaanArchiveCorrectionModal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        kelasId={loadedKelasId || kelasId || ''}
        kelasNama={effectiveKelasNama}
        tahunPelajaranId={loadedTpId || tahunPelajaranId || ''}
        tahunPelajaranNama={periodTahun}
        semesterId={loadedSemesterId || semesterId || ''}
        semesterNama={periodSemester}
        skema={skema}
        students={students}
        isClassLocked={isClassLocked}
      />
    </Card>
  );
};
