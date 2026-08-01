import React, { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  Save, 
  Layers,
  ClipboardPaste,
  FileOutput,
  Sparkles,
  Calculator,
  ChevronDown,
  ChevronUp,
  Copy,
  Trash2
} from 'lucide-react';
import { OperationalPageLayout } from '../../components/layout/OperationalPageLayout';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { raporApi } from '../../api/rapor.api';
import { kelasApi, mapelApi, tahunPelajaranApi, siswaApi } from '../../api/academic.api';
import { useKelasOptions } from '../../hooks/useKelasOptions';
import { useMapelOptions } from '../../hooks/useMapelOptions';
import { useTahunPelajaranOptions } from '../../hooks/useTahunPelajaranOptions';
import { useSemesterOptions } from '../../hooks/useSemesterOptions';
import { useSiswaOptions } from '../../hooks/useSiswaOptions';
import { toast } from 'sonner';

export default function InputNilaiPage() {
  const queryClient = useQueryClient();

  // Mode Selection: 'sumatif' (Kurikulum Merdeka S1,S2,S3,Akhir) vs 'kategori'
  const [entryMode, setEntryMode] = useState<'sumatif' | 'kategori'>('sumatif');

  // Filters State
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedMapel, setSelectedMapel] = useState('');
  const [selectedJenisNilai, setSelectedJenisNilai] = useState('');
  const [selectedSesiKbm, setSelectedSesiKbm] = useState('');

  // Paste Modal State
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteRawText, setPasteRawText] = useState('');

  // Excel Import File State
  const [excelFile, setExcelFile] = useState<File | null>(null);

  // Scores Grid State
  const [scores, setScores] = useState<Array<{
    siswa_id: string;
    nama_siswa: string;
    nis: string;
    nilai: number;
    sumatif_1?: number | null;
    sumatif_2?: number | null;
    sumatif_3?: number | null;
    rata_rata_sumatif?: number | null;
    nilai_akhir_sumatif?: number | null;
    nilai_rapor_final?: number | null;
    capaian_kompetensi?: string;
    catatan_deskripsi?: string;
  }>>([]);

  // KKM Threshold state (persisted per selectedMapel in localStorage)
  const [kkmThreshold, setKkmThreshold] = useState<number>(70);

  // Sync KKM Threshold when selectedMapel changes
  useEffect(() => {
    if (selectedMapel) {
      const saved = localStorage.getItem(`absenta_kkm_mapel_${selectedMapel}`);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
          setKkmThreshold(parsed);
          return;
        }
      }
    }
    setKkmThreshold(70); // default 70
  }, [selectedMapel]);

  // Handle KKM threshold change
  const handleKkmThresholdChange = (newVal: number) => {
    const val = Math.max(0, Math.min(100, newVal));
    setKkmThreshold(val);
    if (selectedMapel) {
      localStorage.setItem(`absenta_kkm_mapel_${selectedMapel}`, val.toString());
    }
  };

  // Consume Standardized Custom Hooks
  const { rawList: classes } = useKelasOptions({ onlyActive: true });

  const selectedKelasObj = useMemo(() => {
    return classes.find((k: any) => k.id === selectedKelas);
  }, [classes, selectedKelas]);

  const targetTingkat = useMemo(() => {
    if (!selectedKelasObj?.tingkat) return undefined;
    const val = String(selectedKelasObj.tingkat).trim().toUpperCase();
    if (val === '10' || val === 'X') return 10;
    if (val === '11' || val === 'XI') return 11;
    if (val === '12' || val === 'XII') return 12;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? undefined : parsed;
  }, [selectedKelasObj]);

  const { rawList: subjects } = useMapelOptions({
    kelasId: selectedKelas,
    tingkat: targetTingkat
  });

  const { activeTahunPelajaran: activeYear } = useTahunPelajaranOptions();
  const { activeSemester } = useSemesterOptions({ tahunPelajaranId: activeYear?.id });
  const { rawList: studentsInKelas, isLoading: isLoadingStudents } = useSiswaOptions({
    kelasId: selectedKelas,
    onlyActive: true
  });

  const { data: categories } = useQuery({
    queryKey: ['jenis-penilaian'],
    queryFn: () => raporApi.getJenisPenilaian()
  });

  // Teacher Progress Detail Accordion State (Default True)
  const [showProgressDetail, setShowProgressDetail] = useState(true);

  // Fetch Teacher Input Progress Summary across all assigned classes/mapel
  const { data: teacherProgressData } = useQuery({
    queryKey: ['teacher-grade-progress', activeYear?.id, activeSemester?.id],
    queryFn: () => raporApi.getTeacherProgress({
      tahun_pelajaran_id: activeYear?.id,
      semester_id: activeSemester?.id
    }),
    enabled: !!activeYear && !!activeSemester
  });

  const progressInfo = teacherProgressData?.data;

  // Auto-select first class-mapel task when progressInfo is loaded
  useEffect(() => {
    if (!selectedKelas && progressInfo?.tasks && progressInfo.tasks.length > 0) {
      setSelectedKelas(progressInfo.tasks[0].kelas_id);
      setSelectedMapel(progressInfo.tasks[0].mapel_id);
    }
  }, [selectedKelas, progressInfo]);

  // Fetch All Grades for the selected class to calculate completion status per Mapel
  const { data: classAllGrades } = useQuery({
    queryKey: ['class-all-grades-status', selectedKelas, activeYear?.id, activeSemester?.id],
    queryFn: () => raporApi.getNilas({
      kelas_id: selectedKelas,
      tahun_pelajaran_id: activeYear?.id,
      semester_id: activeSemester?.id
    }),
    enabled: !!selectedKelas && !!activeYear && !!activeSemester
  });

  // Mapel Grade Input Completion Status Map
  const mapelStatusMap = useMemo(() => {
    const map = new Map<string, { count: number; total: number; status: 'completed' | 'partial' | 'empty' }>();
    if (!selectedKelas || !studentsInKelas || studentsInKelas.length === 0) return map;

    const totalStudents = studentsInKelas.length;
    const gradeList: any[] = classAllGrades?.data || [];

    // Group filled student count by mapel_id
    const filledStudentsByMapel = new Map<string, Set<string>>();
    gradeList.forEach((n: any) => {
      if (n.mapel_id && n.siswa_id) {
        const isFilled = (n.nilai !== null && n.nilai !== undefined && n.nilai > 0) ||
                         (n.sumatif_1 !== null && n.sumatif_1 !== undefined) ||
                         (n.nilai_akhir_sumatif !== null && n.nilai_akhir_sumatif !== undefined);
        if (isFilled) {
          if (!filledStudentsByMapel.has(n.mapel_id)) filledStudentsByMapel.set(n.mapel_id, new Set());
          filledStudentsByMapel.get(n.mapel_id)!.add(n.siswa_id);
        }
      }
    });

    subjects?.forEach((m: any) => {
      const siswaSet = filledStudentsByMapel.get(m.id);
      const count = siswaSet ? siswaSet.size : 0;
      let status: 'completed' | 'partial' | 'empty' = 'empty';
      if (count >= totalStudents && totalStudents > 0) {
        status = 'completed';
      } else if (count > 0) {
        status = 'partial';
      }
      map.set(m.id, { count, total: totalStudents, status });
    });

    return map;
  }, [selectedKelas, studentsInKelas, classAllGrades, subjects]);

  // Fetch Existing Grades for selected Mapel & Kelas
  const { data: existingGrades, isLoading: isLoadingGrades } = useQuery({
    queryKey: ['grades', selectedKelas, selectedMapel, selectedJenisNilai, activeYear?.id, activeSemester?.id],
    queryFn: () => raporApi.getNilas({
      kelas_id: selectedKelas,
      mapel_id: selectedMapel,
      jenis_nilai_id: selectedJenisNilai || undefined,
      tahun_pelajaran_id: activeYear?.id,
      semester_id: activeSemester?.id
    }),
    enabled: !!selectedKelas && !!selectedMapel && !!activeYear && !!activeSemester
  });

  // Diagnostic Console Log for Filter & Query States
  useEffect(() => {
    console.log('🎛️ [InputNilaiPage] State Diagnostics:', {
      selectedKelas,
      selectedMapel,
      entryMode,
      activeYearId: activeYear?.id,
      activeSemesterId: activeSemester?.id,
      classesCount: classes?.length,
      subjectsCount: subjects?.length,
      studentsInKelasCount: studentsInKelas?.length,
      existingGradesCount: existingGrades?.data?.length,
      scoresCount: scores?.length,
      isLoadingStudents,
      isLoadingGrades
    });
  }, [selectedKelas, selectedMapel, entryMode, activeYear, activeSemester, classes, subjects, studentsInKelas, existingGrades, scores, isLoadingStudents, isLoadingGrades]);

  // Prepopulate Scores Grid with full student roster + existing grades
  useEffect(() => {
    console.log('🔄 [InputNilaiPage] useEffect prepopulateScores triggered:', {
      selectedKelas,
      selectedMapel,
      studentsInKelasCount: studentsInKelas?.length,
      existingGradesCount: existingGrades?.data?.length
    });

    if (selectedKelas && studentsInKelas && studentsInKelas.length > 0) {
      const existingMap = new Map();
      if (existingGrades?.data && Array.isArray(existingGrades.data)) {
        existingGrades.data.forEach((item: any) => {
          existingMap.set(item.siswa_id, item);
        });
      }

      const grid = studentsInKelas.map((siswa: any) => {
        const existing = existingMap.get(siswa.id);
        return {
          siswa_id: siswa.id,
          nama_siswa: siswa.nama_siswa || '',
          nis: siswa.nis || '',
          nilai: existing?.nilai ?? 0,
          sumatif_1: existing?.sumatif_1 ?? null,
          sumatif_2: existing?.sumatif_2 ?? null,
          sumatif_3: existing?.sumatif_3 ?? null,
          rata_rata_sumatif: existing?.rata_rata_sumatif ?? null,
          nilai_akhir_sumatif: existing?.nilai_akhir_sumatif ?? null,
          nilai_rapor_final: existing?.nilai_rapor_final ?? existing?.nilai ?? 0,
          capaian_kompetensi: existing?.capaian_kompetensi || existing?.catatan_deskripsi || '',
          catatan_deskripsi: existing?.catatan_deskripsi || ''
        };
      });

      console.log('✅ [InputNilaiPage] Grid successfully created with', grid.length, 'students!');
      setScores(grid);
    } else {
      console.warn('⚠️ [InputNilaiPage] Could not prepopulate grid. Reasons:', {
        hasSelectedKelas: !!selectedKelas,
        hasStudentsInKelas: !!studentsInKelas,
        studentsCount: studentsInKelas?.length
      });
    }
  }, [selectedKelas, selectedMapel, studentsInKelas, existingGrades]);

  // Success Banner State
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Save Batch Sumatif Mutation
  const sumatifSaveMutation = useMutation({
    mutationFn: raporApi.upsertBatchSumatifNilai,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      queryClient.invalidateQueries({ queryKey: ['students-by-kelas'] });
      toast.success('🎉 BERHASIL DISIMPAN! Nilai Sumatif & Capaian Kompetensi sekelas telah tersimpan ke database.', {
        duration: 5000,
      });
      setSaveSuccessMsg('Daftar nilai sumatif & capaian kompetensi sekelas berhasil tersimpan permanen ke database!');
      setTimeout(() => setSaveSuccessMsg(null), 6000);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menyimpan nilai sumatif');
    }
  });

  // Bulk Save Mutation (Legacy)
  const bulkSaveMutation = useMutation({
    mutationFn: raporApi.upsertBulkNilai,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      queryClient.invalidateQueries({ queryKey: ['students-by-kelas'] });
      toast.success('🎉 BERHASIL DISIMPAN! Nilai siswa sekelas berhasil tersimpan ke database.');
      setSaveSuccessMsg('Daftar nilai siswa sekelas berhasil tersimpan permanen!');
      setTimeout(() => setSaveSuccessMsg(null), 6000);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menyimpan nilai');
    }
  });

  const importExcelMutation = useMutation({
    mutationFn: raporApi.importNilaiExcel,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      toast.success(res.message || 'Excel berhasil diimpor');
      setExcelFile(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal mengimpor file Excel');
    }
  });

  // Handle Score Field Change with Auto-Calc
  const handleSumatifChange = (index: number, field: string, val: any) => {
    setScores(prev => {
      const clone = [...prev];
      const target = { ...clone[index] };

      if (['sumatif_1', 'sumatif_2', 'sumatif_3', 'nilai_akhir_sumatif'].includes(field)) {
        const num = val === '' ? null : Math.min(100, Math.max(0, parseFloat(val) || 0));
        (target as any)[field] = num;

        // Auto Calc Rata-rata Sumatif
        const sList = [target.sumatif_1, target.sumatif_2, target.sumatif_3].filter(
          (v): v is number => v !== null && v !== undefined && !isNaN(v)
        );
        let rata: number | null = null;
        if (sList.length > 0) {
          rata = Number((sList.reduce((a, b) => a + b, 0) / sList.length).toFixed(2));
        }
        target.rata_rata_sumatif = rata;

        // Auto Calc Nilai Rapor Final = (Rata-rata + Nilai Akhir) / 2
        const nAkhir = target.nilai_akhir_sumatif;
        if (rata !== null && nAkhir !== null && nAkhir !== undefined) {
          target.nilai_rapor_final = Number(((rata + nAkhir) / 2).toFixed(2));
        } else if (nAkhir !== null && nAkhir !== undefined) {
          target.nilai_rapor_final = nAkhir;
        } else if (rata !== null) {
          target.nilai_rapor_final = rata;
        } else {
          target.nilai_rapor_final = 0;
        }
        target.nilai = target.nilai_rapor_final;
      } else if (field === 'capaian_kompetensi') {
        target.capaian_kompetensi = val;
      }

      clone[index] = target;
      return clone;
    });
  };

  // Copy Capaian Kompetensi (CP) to all students in 1-click
  const handleCopyCpToAll = (fromIndex: number = 0) => {
    if (scores.length === 0) return;

    const targetCp = scores[fromIndex]?.capaian_kompetensi || scores.find(s => s.capaian_kompetensi?.trim())?.capaian_kompetensi || '';
    if (!targetCp.trim()) {
      toast.error('Isi narasi Capaian Kompetensi (CP) pada minimal 1 baris siswa terlebih dahulu');
      return;
    }

    setScores(prev => prev.map(s => ({
      ...s,
      capaian_kompetensi: targetCp,
      catatan_deskripsi: targetCp
    })));

    toast.success(`✨ Berhasil menyalin Capaian Kompetensi ke seluruh ${scores.length} siswa!`);
  };

  // Clear Capaian Kompetensi (CP) for all students in 1-click
  const handleClearCpAll = () => {
    if (scores.length === 0) return;

    setScores(prev => prev.map(s => ({
      ...s,
      capaian_kompetensi: '',
      catatan_deskripsi: ''
    })));

    toast.info('🗑️ Narasi Capaian Kompetensi (CP) seluruh siswa telah dikosongkan.');
  };

  // Excel-like Keyboard Arrow Key Navigation (Up, Down, Left, Right, Enter)
  const handleKeyDownGrid = (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) => {
    const { key } = e;
    const maxRows = scores.length;
    const maxCols = entryMode === 'sumatif' ? 5 : 2;

    let targetRow = rowIndex;
    let targetCol = colIndex;

    if (key === 'ArrowUp') {
      e.preventDefault();
      targetRow = Math.max(0, rowIndex - 1);
    } else if (key === 'ArrowDown' || key === 'Enter') {
      e.preventDefault();
      targetRow = Math.min(maxRows - 1, rowIndex + 1);
    } else if (key === 'ArrowLeft') {
      const input = e.currentTarget;
      const isSelected = input.selectionStart !== input.selectionEnd;
      if (isSelected || input.selectionStart === 0 || !input.value) {
        if (colIndex > 0) {
          e.preventDefault();
          targetCol = colIndex - 1;
        }
      }
    } else if (key === 'ArrowRight') {
      const input = e.currentTarget;
      const isSelected = input.selectionStart !== input.selectionEnd;
      if (isSelected || input.selectionStart === input.value.length || !input.value) {
        if (colIndex < maxCols - 1) {
          e.preventDefault();
          targetCol = colIndex + 1;
        }
      }
    } else {
      return;
    }

    const targetId = `input-grid-${targetRow}-${targetCol}`;
    const targetEl = document.getElementById(targetId) as HTMLInputElement | null;
    if (targetEl) {
      targetEl.focus();
      targetEl.select();
    }
  };

  // Color coding helper for scores (Dynamic low/high score styling based on mapel KKM)
  const getScoreInputStyle = (val: number | null | undefined, isFinal = false) => {
    if (val === null || val === undefined || val === '') {
      return isFinal
        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold border-none'
        : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border-none';
    }
    const num = Number(val);
    if (isNaN(num)) return 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border-none';

    if (num < kkmThreshold) {
      // Nilai Di Bawah KKM / Remedial (Soft Rose / Red Tint)
      return isFinal
        ? 'bg-rose-600 text-white font-black shadow-md ring-2 ring-rose-400'
        : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-black border border-rose-300 dark:border-rose-800 shadow-sm';
    }
    const highThreshold = Math.max(85, kkmThreshold + 15);
    if (num >= highThreshold) {
      // Nilai Sangat Baik (Soft Emerald / Green Tint)
      return isFinal
        ? 'bg-emerald-600 text-white font-black shadow-md ring-2 ring-emerald-400'
        : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-900';
    }
    // Nilai Cukup / Tuntas (Normal / Amber for Final)
    return isFinal
      ? 'bg-indigo-600 text-white font-black shadow-md'
      : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border-none';
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 [InputNilaiPage] handleSaveSubmit triggered. State:', {
      selectedKelas,
      selectedMapel,
      activeYearId: activeYear?.id,
      activeSemesterId: activeSemester?.id,
      entryMode,
      scoresCount: scores.length
    });

    if (!selectedKelas) {
      toast.error('Pilih Kelas Rombel terlebih dahulu');
      return;
    }
    if (!selectedMapel) {
      toast.error('Pilih Mata Pelajaran terlebih dahulu');
      return;
    }
    if (!activeYear || !activeSemester) {
      toast.error('Tahun Pelajaran atau Semester aktif belum diset di sistem');
      return;
    }
    if (scores.length === 0) {
      toast.error('Tidak ada data siswa untuk disimpan');
      return;
    }

    if (entryMode === 'sumatif') {
      const payload = {
        mapel_id: selectedMapel,
        tahun_pelajaran_id: activeYear.id,
        semester_id: activeSemester.id,
        scores: scores.map(s => ({
          siswa_id: s.siswa_id,
          sumatif_1: s.sumatif_1,
          sumatif_2: s.sumatif_2,
          sumatif_3: s.sumatif_3,
          nilai_akhir_sumatif: s.nilai_akhir_sumatif,
          capaian_kompetensi: s.capaian_kompetensi
        }))
      };
      console.log('📤 [InputNilaiPage] Mutating sumatifSaveMutation with payload:', payload);
      sumatifSaveMutation.mutate(payload);
    } else {
      if (!selectedJenisNilai) {
        toast.error('Pilih Kategori Penilaian terlebih dahulu');
        return;
      }
      bulkSaveMutation.mutate({
        mapel_id: selectedMapel,
        tahun_pelajaran_id: activeYear.id,
        semester_id: activeSemester.id,
        jenis_nilai_id: selectedJenisNilai,
        sesi_absensi_id: selectedSesiKbm || null,
        scores: scores.map(s => ({
          siswa_id: s.siswa_id,
          nilai: s.nilai,
          catatan_deskripsi: s.catatan_deskripsi
        }))
      });
    }
  };

  // Handle Paste from Excel (TSV Parsing)
  const handleProcessPaste = () => {
    if (!pasteRawText.trim()) {
      toast.error('Data yang di-paste masih kosong');
      return;
    }

    const lines = pasteRawText.trim().split('\n');
    let updatedCount = 0;

    setScores(prev => {
      const clone = [...prev];
      lines.forEach(line => {
        const parts = line.split('\t').map(p => p.trim());
        if (parts.length < 2) return;

        const nisOrNama = parts[0].toLowerCase();

        // Match student by NIS or Name
        const idx = clone.findIndex(
          s => s.nis.toLowerCase() === nisOrNama || s.nama_siswa.toLowerCase().includes(nisOrNama)
        );

        if (idx !== -1) {
          const s1 = parseFloat(parts[1]) || null;
          const s2 = parseFloat(parts[2]) || null;
          const s3 = parseFloat(parts[3]) || null;
          const nAkhir = parseFloat(parts[4]) || null;
          const cpText = parts[5] || '';

          const target = { ...clone[idx] };
          if (s1 !== null) target.sumatif_1 = s1;
          if (s2 !== null) target.sumatif_2 = s2;
          if (s3 !== null) target.sumatif_3 = s3;
          if (nAkhir !== null) target.nilai_akhir_sumatif = nAkhir;
          if (cpText) target.capaian_kompetensi = cpText;

          // Re-calc
          const sList = [target.sumatif_1, target.sumatif_2, target.sumatif_3].filter(
            (v): v is number => v !== null && v !== undefined && !isNaN(v)
          );
          let rata: number | null = null;
          if (sList.length > 0) {
            rata = Number((sList.reduce((a, b) => a + b, 0) / sList.length).toFixed(2));
          }
          target.rata_rata_sumatif = rata;

          const nA = target.nilai_akhir_sumatif;
          if (rata !== null && nA !== null && nA !== undefined) {
            target.nilai_rapor_final = Number(((rata + nA) / 2).toFixed(2));
          } else if (nA !== null && nA !== undefined) {
            target.nilai_rapor_final = nA;
          } else if (rata !== null) {
            target.nilai_rapor_final = rata;
          }
          target.nilai = target.nilai_rapor_final ?? 0;

          clone[idx] = target;
          updatedCount++;
        }
      });
      return clone;
    });

    toast.success(`Berhasil mencocokkan & memperbarui ${updatedCount} baris data dari Excel!`);
    setShowPasteModal(false);
    setPasteRawText('');
  };

  // Export e-Rapor Kemendikbud (Authenticated Blob Download)
  const handleExportEraporKemendikbud = async () => {
    if (!selectedKelas || !selectedMapel || !activeYear || !activeSemester) {
      toast.error('Pilih Kelas dan Mapel terlebih dahulu');
      return;
    }
    try {
      toast.info('Mengunduh berkas format e-Rapor Kemendikbud...');
      const response = await raporApi.exportEraporKemendikbudBlob({
        kelas_id: selectedKelas,
        mapel_id: selectedMapel,
        tahun_pelajaran_id: activeYear.id,
        semester_id: activeSemester.id,
      });

      // Extract filename from header or build fallback
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'eRapor_Kemendikbud.xlsx';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      // Create Blob & Trigger Download
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Berkas ${filename} berhasil diunduh! Siap diimport ke e-Rapor Kemendikbud.`);
    } catch (err: any) {
      console.error('❌ [InputNilaiPage] Failed to export e-Rapor:', err);
      toast.error(err.message || 'Gagal mengunduh berkas e-Rapor Kemendikbud');
    }
  };

  const handleDownloadTemplate = async () => {
    if (!selectedKelas || !selectedMapel) {
      toast.error('Pilih Kelas dan Mata Pelajaran terlebih dahulu');
      return;
    }
    if (entryMode === 'kategori' && !selectedJenisNilai) {
      toast.error('Pilih Kategori Penilaian terlebih dahulu untuk Mode Kategori');
      return;
    }
    try {
      toast.info('Mengunduh template format Excel...');
      const response = await raporApi.downloadTemplateBlob({
        kelas_id: selectedKelas,
        mapel_id: selectedMapel,
        jenis_nilai_id: entryMode === 'kategori' ? selectedJenisNilai : undefined,
        mode: entryMode
      });

      const contentDisposition = response.headers['content-disposition'];
      let filename = `Template_Nilai_${entryMode}.xlsx`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Template Excel ${filename} berhasil diunduh!`);
    } catch (err: any) {
      console.error('❌ [InputNilaiPage] Failed to download template:', err);
      toast.error(err.message || 'Gagal mengunduh template Excel');
    }
  };

  const handleImportExcelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!excelFile || !selectedMapel) {
      toast.error('Pilih file Excel dan Mata Pelajaran terlebih dahulu');
      return;
    }
    if (entryMode === 'kategori' && !selectedJenisNilai) {
      toast.error('Pilih Kategori Penilaian terlebih dahulu untuk Mode Kategori');
      return;
    }
    const formData = new FormData();
    formData.append('file', excelFile);
    formData.append('mapel_id', selectedMapel);
    formData.append('tahun_pelajaran_id', activeYear!.id);
    formData.append('semester_id', activeSemester!.id);
    if (entryMode === 'kategori' && selectedJenisNilai) {
      formData.append('jenis_nilai_id', selectedJenisNilai);
    }
    formData.append('mode', entryMode);
    if (selectedSesiKbm) formData.append('sesi_absensi_id', selectedSesiKbm);

    importExcelMutation.mutate(formData);
  };

  const breadcrumbs = useMemo(() => [
    { label: 'Rapor', href: '/rapor/dashboard' },
    { label: 'Input Nilai Siswa' }
  ], []);

  return (
    <OperationalPageLayout
      title="Input Nilai & Capaian Kompetensi Rapor"
      shortTitle="Input Nilai Rapor"
      subtitle={`Pengisian Lembar Kerja Operasional Kurikulum Merdeka${activeYear ? ` — TP ${activeYear.tahun}` : ''}${activeSemester ? ` (${activeSemester.nama_semester})` : ''}`}
      backPath="/dashboard"
      backLabel="Kembali ke Dashboard"
      hardeningModuleKey="inputnilaipage"
      statusBadge={
        <Badge variant="success" className="font-bold flex items-center gap-1">
          <Sparkles size={12} />
          POS OPERASIONAL LAYAR PENUH
        </Badge>
      }
    >
      <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        
        {/* Progres Input Nilai Guru Header Bar */}
        <div className="bg-slate-900 border border-slate-800 text-white p-5 rounded-3xl shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black text-base shadow-inner">
                {progressInfo ? `${Math.round(progressInfo.percentage)}%` : '0%'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-black tracking-wide">PROGRES PENGISIAN NILAI SAYA</h2>
                  <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                    TP {activeYear?.tahun || '—'} ({activeSemester?.nama_semester || '—'})
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {progressInfo
                    ? `${progressInfo.completed_tasks} dari ${progressInfo.total_tasks} Mapel Kelas Selesai Diinput (${progressInfo.percentage}% Selesai)`
                    : 'Memuat progres pengisian nilai...'}
                </p>
              </div>
            </div>

            {/* Mode Switcher Buttons */}
            <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/60 self-stretch md:self-auto justify-end">
              <button
                onClick={() => setEntryMode('sumatif')}
                className={`px-3.5 py-2 text-xs font-extrabold rounded-xl transition-all ${
                  entryMode === 'sumatif' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400/40' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Mode Sumatif Merdeka
              </button>
              <button
                onClick={() => setEntryMode('kategori')}
                className={`px-3.5 py-2 text-xs font-extrabold rounded-xl transition-all ${
                  entryMode === 'kategori' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400/40' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Mode Kategori (Legacy)
              </button>
            </div>
          </div>

          {/* Animated Progress Bar */}
          <div className="space-y-2">
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700/50">
              <div
                className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 h-full rounded-full transition-all duration-700 ease-out shadow-sm"
                style={{ width: `${Math.min(100, Math.max(0, progressInfo?.percentage || 0))}%` }}
              />
            </div>

            {/* Metric Chips & Accordion Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2 sm:gap-3 text-xs font-bold">
                <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-1 rounded-xl">
                  🟢 <strong>{progressInfo?.completed_tasks || 0}</strong> Selesai (Lengkap)
                </span>
                <span className="flex items-center gap-1.5 text-amber-400 bg-amber-950/60 border border-amber-800/50 px-2.5 py-1 rounded-xl">
                  🟡 <strong>{progressInfo?.partial_tasks || 0}</strong> Dalam Proses
                </span>
                <span className="flex items-center gap-1.5 text-rose-400 bg-rose-950/60 border border-rose-800/50 px-2.5 py-1 rounded-xl">
                  🔴 <strong>{progressInfo?.empty_tasks || 0}</strong> Belum Diisi
                </span>
              </div>

              {progressInfo && progressInfo.tasks && progressInfo.tasks.length > 0 && (
                <button
                  onClick={() => setShowProgressDetail(!showProgressDetail)}
                  className="text-xs font-extrabold text-indigo-300 hover:text-white bg-indigo-950/60 hover:bg-indigo-900/80 px-3 py-1 rounded-xl border border-indigo-800/60 flex items-center gap-1.5 transition-all"
                >
                  {showProgressDetail ? 'Sembunyikan Rincian Progress' : '🔍 Lihat Rincian Progress Mapel Kelas'}
                  {showProgressDetail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              )}
            </div>
          </div>

          {/* Expandable Progress Detail Breakdown Table */}
          {showProgressDetail && progressInfo?.tasks && (
            <div className="pt-3 border-t border-slate-800 animate-in fade-in slide-in-from-top-2 duration-300 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Pilih Kelas & Mapel Mengajar:
                </span>
                {entryMode === 'kategori' && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400">Kategori:</span>
                    <select
                      value={selectedJenisNilai}
                      onChange={(e) => {
                        setSelectedJenisNilai(e.target.value);
                        setScores([]);
                      }}
                      className="bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold px-2.5 py-1 text-white focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">Pilih Kategori Penilaian</option>
                      {categories?.data?.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.nama} ({c.kode}) - {c.bobot}x</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {progressInfo.tasks.map((t: any, idx: number) => {
                  const isCurrent = t.kelas_id === selectedKelas && t.mapel_id === selectedMapel;
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedKelas(t.kelas_id);
                        setSelectedMapel(t.mapel_id);
                        toast.info(`Memilih ${t.nama_kelas} — ${t.nama_mapel}`);
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-indigo-900/60 border-indigo-500 shadow-lg ring-2 ring-indigo-500/50'
                          : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-white flex items-center gap-1.5">
                          <span className="text-indigo-400">{t.nama_kelas}</span> — {t.nama_mapel}
                        </span>
                        <span className="text-[10px]">
                          {t.status === 'completed' && '🟢 Lengkap'}
                          {t.status === 'partial' && '🟡 Sebagian'}
                          {t.status === 'empty' && '🔴 Belum'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                        <span>Siswa Terisi:</span>
                        <span className="font-mono font-bold text-slate-200">
                          {t.siswa_terisi} / {t.total_siswa} Siswa
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {saveSuccessMsg && (
          <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-bold text-white text-sm">
                ✓
              </div>
              <div>
                <p className="text-xs font-bold">{saveSuccessMsg}</p>
                <p className="text-[10px] text-emerald-100">Nilai siap digunakan untuk penerbitan Leger & e-Rapor resmi Dinas.</p>
              </div>
            </div>
            <button onClick={() => setSaveSuccessMsg(null)} className="text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-all text-white">
              Tutup
            </button>
          </div>
        )}

        {selectedKelas && selectedMapel && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Input Grid Nilai (Kiri 3 Cols) */}
            <Card className="lg:col-span-3 p-5 border-none shadow-sm dark:bg-slate-900/40 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-3">
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                    Lembar Pengisian Nilai Kelas
                    <span className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-md">
                      {scores.length} Siswa
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {entryMode === 'sumatif' 
                      ? 'Formula Rapor: Nilai Akhir = (Rata-rata(S1,S2,S3) + Sumatif Akhir) / 2' 
                      : 'Input nilai langsung per kategori.'}
                  </p>
                  <div className="flex items-center gap-2.5 mt-2 text-[10px] flex-wrap">
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="font-bold text-slate-600 dark:text-slate-300">Batas KKM Mapel Ini:</span>
                      <input
                        type="number"
                        min={50}
                        max={95}
                        value={kkmThreshold}
                        onChange={(e) => handleKkmThresholdChange(parseInt(e.target.value, 10) || 70)}
                        className="w-12 text-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md font-black text-indigo-600 dark:text-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 py-0.5"
                      />
                      <span className="text-[9px] text-slate-400 font-semibold">(Tersimpan per Mapel)</span>
                    </div>

                    <span className="font-semibold text-slate-400">Status Pewarnaan:</span>
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-black border border-rose-300 dark:border-rose-800">
                      🔴 &lt; {kkmThreshold} (Remedial)
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                      ⚪ {kkmThreshold} - {Math.max(84, kkmThreshold + 14)} (Tuntas)
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800">
                      🟢 ≥ {Math.max(85, kkmThreshold + 15)} (Sangat Baik)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {entryMode === 'sumatif' && (
                    <Button 
                      type="button"
                      onClick={() => setShowPasteModal(true)}
                      variant="outline"
                      className="border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl font-bold text-xs"
                    >
                      <ClipboardPaste className="w-4 h-4 mr-1.5" />
                      Paste dari Excel
                    </Button>
                  )}

                  <Button 
                    onClick={handleSaveSubmit}
                    disabled={sumatifSaveMutation.isPending || bulkSaveMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-100 dark:shadow-none text-xs"
                  >
                    <Save className="w-4 h-4 mr-1.5" />
                    SIMPAN PERUBAHAN
                  </Button>
                </div>
              </div>

              {isLoadingStudents || isLoadingGrades ? (
                <div className="text-center py-20 text-slate-400 text-xs italic">Menarik daftar siswa rombel...</div>
              ) : scores.length === 0 ? (
                <div className="text-center py-20 text-slate-400 text-xs italic">Rombel kosong atau tidak ada siswa aktif.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-black tracking-wider text-[10px]">
                        <th className="py-2.5 px-2">No</th>
                        <th className="py-2.5 px-2">Nama Siswa</th>

                        {entryMode === 'sumatif' ? (
                          <>
                            <th className="py-2.5 px-1 text-center w-16">Sumatif 1</th>
                            <th className="py-2.5 px-1 text-center w-16">Sumatif 2</th>
                            <th className="py-2.5 px-1 text-center w-16">Sumatif 3</th>
                            <th className="py-2.5 px-1 text-center w-20 text-indigo-600 dark:text-indigo-400">Rata-Rata</th>
                            <th className="py-2.5 px-1 text-center w-20 text-amber-600 dark:text-amber-400">Sumatif Akhir</th>
                            <th className="py-2.5 px-1 text-center w-20 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">NILAI RAPOR</th>
                            <th className="py-2.5 px-2">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span>Capaian Kompetensi (CP Narasi)</span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleCopyCpToAll(0)}
                                    title="Salin CP dari baris terisi ke seluruh siswa sekelas"
                                    className="text-[9px] font-extrabold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-md flex items-center gap-1 transition-all"
                                  >
                                    <Copy size={11} />
                                    Salin ke Semua
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleClearCpAll}
                                    title="Kosongkan seluruh narasi CP siswa sekelas"
                                    className="text-[9px] font-extrabold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/80 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-md flex items-center gap-1 transition-all"
                                  >
                                    <Trash2 size={11} />
                                    Kosongkan CP
                                  </button>
                                </div>
                              </div>
                            </th>
                          </>
                        ) : (
                          <>
                            <th className="py-2.5 px-2 w-24">Nilai (0-100)</th>
                            <th className="py-2.5 px-2">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span>Deskripsi Rapor</span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleCopyCpToAll(0)}
                                    title="Salin Deskripsi dari baris terisi ke seluruh siswa sekelas"
                                    className="text-[9px] font-extrabold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-md flex items-center gap-1 transition-all"
                                  >
                                    <Copy size={11} />
                                    Salin ke Semua
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleClearCpAll}
                                    title="Kosongkan seluruh deskripsi siswa sekelas"
                                    className="text-[9px] font-extrabold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/80 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-md flex items-center gap-1 transition-all"
                                  >
                                    <Trash2 size={11} />
                                    Kosongkan Deskripsi
                                  </button>
                                </div>
                              </div>
                            </th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {scores.map((score, index) => (
                        <tr key={score.siswa_id} className="border-b border-slate-50 dark:border-slate-900/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                          <td className="py-3 px-2 font-bold text-slate-400">{index + 1}</td>
                          <td className="py-3 px-2 font-semibold text-slate-800 dark:text-slate-200">
                            {score.nama_siswa}
                            <span className="block text-[9px] text-slate-400 font-normal">NIS. {score.nis}</span>
                          </td>

                          {entryMode === 'sumatif' ? (
                            <>
                              <td className="py-2 px-1">
                                <input
                                  id={`input-grid-${index}-0`}
                                  type="text"
                                  inputMode="decimal"
                                  value={score.sumatif_1 ?? ''}
                                  onChange={(e) => handleSumatifChange(index, 'sumatif_1', e.target.value)}
                                  onKeyDown={(e) => handleKeyDownGrid(e, index, 0)}
                                  onFocus={(e) => e.target.select()}
                                  className={`w-full text-xs text-center p-2 rounded-lg transition-all focus:ring-2 focus:ring-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${getScoreInputStyle(score.sumatif_1)}`}
                                />
                              </td>
                              <td className="py-2 px-1">
                                <input
                                  id={`input-grid-${index}-1`}
                                  type="text"
                                  inputMode="decimal"
                                  value={score.sumatif_2 ?? ''}
                                  onChange={(e) => handleSumatifChange(index, 'sumatif_2', e.target.value)}
                                  onKeyDown={(e) => handleKeyDownGrid(e, index, 1)}
                                  onFocus={(e) => e.target.select()}
                                  className={`w-full text-xs text-center p-2 rounded-lg transition-all focus:ring-2 focus:ring-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${getScoreInputStyle(score.sumatif_2)}`}
                                />
                              </td>
                              <td className="py-2 px-1">
                                <input
                                  id={`input-grid-${index}-2`}
                                  type="text"
                                  inputMode="decimal"
                                  value={score.sumatif_3 ?? ''}
                                  onChange={(e) => handleSumatifChange(index, 'sumatif_3', e.target.value)}
                                  onKeyDown={(e) => handleKeyDownGrid(e, index, 2)}
                                  onFocus={(e) => e.target.select()}
                                  className={`w-full text-xs text-center p-2 rounded-lg transition-all focus:ring-2 focus:ring-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${getScoreInputStyle(score.sumatif_3)}`}
                                />
                              </td>
                              <td className={`py-2 px-1 text-center text-xs rounded-lg transition-all ${getScoreInputStyle(score.rata_rata_sumatif)}`}>
                                {score.rata_rata_sumatif ?? '-'}
                              </td>
                              <td className="py-2 px-1">
                                <input
                                  id={`input-grid-${index}-3`}
                                  type="text"
                                  inputMode="decimal"
                                  value={score.nilai_akhir_sumatif ?? ''}
                                  onChange={(e) => handleSumatifChange(index, 'nilai_akhir_sumatif', e.target.value)}
                                  onKeyDown={(e) => handleKeyDownGrid(e, index, 3)}
                                  onFocus={(e) => e.target.select()}
                                  className={`w-full text-xs text-center p-2 rounded-lg transition-all focus:ring-2 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${getScoreInputStyle(score.nilai_akhir_sumatif)}`}
                                />
                              </td>
                              <td className={`py-2 px-1 text-center font-black text-sm rounded-lg transition-all ${getScoreInputStyle(score.nilai_rapor_final, true)}`}>
                                {score.nilai_rapor_final ?? 0}
                              </td>
                              <td className="py-2 px-2">
                                <div className="relative flex items-center gap-1">
                                  <input
                                    id={`input-grid-${index}-4`}
                                    type="text"
                                    placeholder="Narasi capaian kompetensi..."
                                    value={score.capaian_kompetensi ?? ''}
                                    onChange={(e) => handleSumatifChange(index, 'capaian_kompetensi', e.target.value)}
                                    onKeyDown={(e) => handleKeyDownGrid(e, index, 4)}
                                    onFocus={(e) => e.target.select()}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs font-medium p-2 text-slate-700 dark:text-white focus:ring-1 focus:ring-indigo-500 pr-8"
                                  />
                                  {score.capaian_kompetensi && (
                                    <button
                                      type="button"
                                      onClick={() => handleCopyCpToAll(index)}
                                      title="Salin CP baris ini ke seluruh siswa"
                                      className="absolute right-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                                    >
                                      <Copy size={13} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-3 px-2">
                                <input
                                  id={`input-grid-${index}-0`}
                                  type="text"
                                  inputMode="decimal"
                                  value={score.nilai}
                                  onChange={(e) => handleSumatifChange(index, 'nilai', e.target.value)}
                                  onKeyDown={(e) => handleKeyDownGrid(e, index, 0)}
                                  onFocus={(e) => e.target.select()}
                                  className={`w-full text-xs font-black text-center p-2.5 rounded-xl transition-all focus:ring-2 focus:ring-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${getScoreInputStyle(score.nilai)}`}
                                />
                              </td>
                              <td className="py-3 px-2">
                                <div className="relative flex items-center gap-1">
                                  <input
                                    id={`input-grid-${index}-1`}
                                    type="text"
                                    placeholder="Deskripsi Rapor..."
                                    value={score.catatan_deskripsi ?? ''}
                                    onChange={(e) => handleSumatifChange(index, 'catatan_deskripsi', e.target.value)}
                                    onKeyDown={(e) => handleKeyDownGrid(e, index, 1)}
                                    onFocus={(e) => e.target.select()}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-medium p-2.5 text-slate-700 dark:text-white focus:ring-1 focus:ring-indigo-500 pr-8"
                                  />
                                  {score.catatan_deskripsi && (
                                    <button
                                      type="button"
                                      onClick={() => handleCopyCpToAll(index)}
                                      title="Salin Deskripsi baris ini ke seluruh siswa"
                                      className="absolute right-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                                    >
                                      <Copy size={13} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Impor & Ekspor e-Rapor (Kanan 1 Col) */}
            <div className="space-y-6">
              
              {/* Card Export e-Rapor Kemendikbud */}
              <Card className="p-5 border-none shadow-sm bg-gradient-to-br from-indigo-900 to-slate-900 text-white space-y-4 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-28 h-28 bg-indigo-500/10 rounded-full blur-xl"></div>
                <div className="flex items-center gap-2 text-indigo-300">
                  <FileOutput size={20} />
                  <h3 className="font-bold text-xs uppercase tracking-wider">Export e-Rapor Kemendikbud</h3>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Unduh file Excel yang telah ter-format khusus sesuai skema impor aplikasi <strong>e-Rapor resmi Dinas Pendidikan</strong>.
                </p>

                <Button
                  onClick={handleExportEraporKemendikbud}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl h-11 shadow-lg shadow-indigo-500/25"
                >
                  <Download className="w-4 h-4 mr-2" />
                  EXPORT SIAP IMPORT E-RAPOR
                </Button>
              </Card>

              {/* Card Template & Import Standard */}
              <Card className="p-5 border-none shadow-sm dark:bg-slate-900/40 space-y-4">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center">
                  <FileSpreadsheet size={18} className="mr-2 text-indigo-500" />
                  Impor & Ekspor Excel Offline
                </h3>
                <p className="text-xs text-slate-450 leading-relaxed font-medium">
                  Unduh template Excel rombel ini, isi nilai di komputer offline, lalu unggah kembali.
                </p>

                <div className="pt-2 space-y-3">
                  <Button
                    onClick={handleDownloadTemplate}
                    variant="outline"
                    className="w-full border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl h-11 flex items-center justify-center"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    UNDUH TEMPLATE EXCEL
                  </Button>

                  <div className="border-t border-slate-50 dark:border-slate-800 my-4"></div>

                  <form onSubmit={handleImportExcelSubmit} className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Unggah Berkas Excel</label>
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100 cursor-pointer"
                    />

                    <Button
                      type="submit"
                      disabled={!excelFile}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl h-11"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      IMPOR MASSAL NILAI
                    </Button>
                  </form>
                </div>
              </Card>

            </div>

          </div>
        )}

        {/* Modal Paste dari Excel */}
        {showPasteModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ClipboardPaste className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Paste Data dari Excel / Google Sheets</h3>
                </div>
                <button
                  onClick={() => setShowPasteModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Copy kolom dari Excel dalam urutan tab berikut: <br />
                  <strong className="text-indigo-600 dark:text-indigo-400">NIS (atau Nama) | Sumatif 1 | Sumatif 2 | Sumatif 3 | Sumatif Akhir | CP Narasi</strong>
                </p>

                <textarea
                  rows={8}
                  value={pasteRawText}
                  onChange={(e) => setPasteRawText(e.target.value)}
                  placeholder={`Contoh (Paste dari Excel):\n2526100414\t82\t81\t\t80\tMemahami ayat Al-Qur'an...\n2526100415\t78\t77\t\t75\tCukup mampu memahami...`}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-xs font-mono text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPasteModal(false)}
                  className="rounded-xl text-xs font-bold"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  onClick={handleProcessPaste}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                >
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  PROSES & PASANG KE TABEL
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </OperationalPageLayout>
  );
}
