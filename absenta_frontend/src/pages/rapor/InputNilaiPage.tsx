import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  FileSpreadsheet, 
  Layers,
  FileOutput,
  Sparkles,
  Calculator,
  Printer,
  UserCheck
} from 'lucide-react';
import { SectionCard } from '../../components/ui/SectionCard';
import { OperationalPageLayout } from '../../components/layout/OperationalPageLayout';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { raporApi } from '../../api/rapor.api';
import { kelasApi, mapelApi, tahunPelajaranApi, semesterApi, siswaApi } from '../../api/academic.api';
import { useKelasOptions } from '../../hooks/useKelasOptions';
import { useMapelOptions } from '../../hooks/useMapelOptions';
import { useSiswaOptions } from '../../hooks/useSiswaOptions';
import { useTahunPelajaranOptions } from '../../hooks/useTahunPelajaranOptions';
import { useSemesterOptions } from '../../hooks/useSemesterOptions';
import { useJenjang } from '../../hooks/useJenjang';
import { toast } from 'sonner';
import { generateStyledExcelTemplate } from '../../utils/excel-advanced.utils';

// Import Hardened Types, Schemas, & Subcomponents
import { StudentScoreItem, TeacherTaskItem, ClassItem, SubjectItem, CategoryItem } from '../../types/inputNilai.types';
import { ScoreInputSchema, KkmThresholdSchema, BulkPasteTextSchema } from '../../schemas/inputNilai.schema';
import { ActiveTaskNavCard } from '../../components/rapor/input-nilai/ActiveTaskNavCard';
import { TeacherProgressCard } from '../../components/rapor/input-nilai/TeacherProgressCard';
import { ScoreGridTable } from '../../components/rapor/input-nilai/ScoreGridTable';
import { ExcelPasteModal } from '../../components/rapor/input-nilai/ExcelPasteModal';
import { BulkImportExcelCard } from '../../components/rapor/input-nilai/BulkImportExcelCard';

export default function InputNilaiPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedKelas, setSelectedKelas] = useState<string>('');
  const [selectedMapel, setSelectedMapel] = useState<string>('');
  const [selectedJenisNilai, setSelectedJenisNilai] = useState<string>('');
  const [entryMode, setEntryMode] = useState<'sumatif' | 'kategori'>('sumatif');
  const [showProgressDetail, setShowProgressDetail] = useState<boolean>(false);
  
  // Scores Grid State
  const [scores, setScores] = useState<StudentScoreItem[]>([]);
  const [excelFile, setExcelFile] = useState<File | null>(null);

  // Modal Paste State
  const [showPasteModal, setShowPasteModal] = useState<boolean>(false);
  const [pasteRawText, setPasteRawText] = useState<string>('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Subject-Persistent KKM Threshold State
  const [kkmThreshold, setKkmThreshold] = useState<number>(70);

  // Task Search & Filter State
  const [taskSearchQuery, setTaskSearchQuery] = useState<string>('');
  const [taskStatusFilter, setTaskStatusFilter] = useState<'all' | 'empty' | 'partial' | 'completed'>('all');

  // ── Centralized System Hooks ──
  const { config: jenjangConfig } = useJenjang();
  const { options: kelasOptions, rawList: classList, isLoading: isLoadingClasses } = useKelasOptions({
    filterByJenjang: false,
    onlyActive: true,
  });
  const { options: mapelOptions, rawList: mapelList, isLoading: isLoadingMapel } = useMapelOptions();
  const { options: tpOptions, activeTp } = useTahunPelajaranOptions();
  const { options: semesterOptions, activeSemester: activeSem } = useSemesterOptions();

  const [selectedTahunPelajaran, setSelectedTahunPelajaran] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('');

  useEffect(() => {
    if (!selectedTahunPelajaran && activeTp?.id) {
      setSelectedTahunPelajaran(activeTp.id);
    }
  }, [activeTp, selectedTahunPelajaran]);

  useEffect(() => {
    if (!selectedSemester && activeSem?.id) {
      setSelectedSemester(activeSem.id);
    }
  }, [activeSem, selectedSemester]);

  const activeYear = useMemo(() => {
    const id = selectedTahunPelajaran || activeTp?.id;
    if (!id) return null;
    return { id, tahun: activeTp?.tahun || id };
  }, [activeTp, selectedTahunPelajaran]);

  const activeSemester = useMemo(() => {
    const id = selectedSemester || activeSem?.id;
    if (!id) return null;
    return { id, nama_semester: activeSem?.nama_semester || id };
  }, [activeSem, selectedSemester]);

  const { data: categories } = useQuery({
    queryKey: ['kategori-nilai'],
    queryFn: async () => {
      try {
        return await raporApi.getKategoriNilai();
      } catch {
        return { data: [] };
      }
    },
    enabled: entryMode === 'kategori'
  });

  const { data: teacherProgressData } = useQuery({
    queryKey: ['teacher-progress', activeYear?.id, activeSemester?.id],
    queryFn: async () => {
      try {
        return await raporApi.getTeacherProgress({
          tahun_pelajaran_id: activeYear?.id,
          semester_id: activeSemester?.id
        });
      } catch {
        return { data: null };
      }
    },
  });

  const classes: ClassItem[] = useMemo(() => (classList as any) || [], [classList]);
  const subjects: SubjectItem[] = useMemo(() => (mapelList as any) || [], [mapelList]);
  const progressInfo = useMemo(() => teacherProgressData?.data, [teacherProgressData]);

  // Persistent KKM Threshold Sync per selected mapel
  useEffect(() => {
    if (selectedMapel) {
      const stored = localStorage.getItem(`absenta_kkm_mapel_${selectedMapel}`);
      if (stored) {
        const val = parseInt(stored, 10);
        if (!isNaN(val)) setKkmThreshold(val);
      } else {
        setKkmThreshold(70);
      }
    }
  }, [selectedMapel]);

  const handleKkmThresholdChange = useCallback((newVal: number) => {
    const parsed = KkmThresholdSchema.safeParse(newVal);
    const validVal = parsed.success ? parsed.data : 70;
    setKkmThreshold(validVal);
    if (selectedMapel) {
      localStorage.setItem(`absenta_kkm_mapel_${selectedMapel}`, validVal.toString());
    }
  }, [selectedMapel]);

  // Memoized Filtered Tasks for search & filter tabs
  const filteredTasks = useMemo(() => {
    if (!progressInfo?.tasks) return [];
    return progressInfo.tasks.filter((t: TeacherTaskItem) => {
      if (taskStatusFilter !== 'all' && t.status !== taskStatusFilter) return false;
      if (taskSearchQuery.trim()) {
        const q = taskSearchQuery.toLowerCase();
        const matchKelas = t.nama_kelas?.toLowerCase().includes(q);
        const matchMapel = t.nama_mapel?.toLowerCase().includes(q);
        if (!matchKelas && !matchMapel) return false;
      }
      return true;
    });
  }, [progressInfo, taskStatusFilter, taskSearchQuery]);

  // Task Navigation (Next / Previous Task Buttons)
  const currentTaskIndex = useMemo(() => {
    if (!progressInfo?.tasks) return -1;
    return progressInfo.tasks.findIndex((t: TeacherTaskItem) => t.kelas_id === selectedKelas && t.mapel_id === selectedMapel);
  }, [progressInfo, selectedKelas, selectedMapel]);

  const prevTask = useMemo(() => {
    if (currentTaskIndex > 0 && progressInfo?.tasks) {
      return progressInfo.tasks[currentTaskIndex - 1];
    }
    return null;
  }, [currentTaskIndex, progressInfo]);

  const nextTask = useMemo(() => {
    if (currentTaskIndex >= 0 && progressInfo?.tasks && currentTaskIndex < progressInfo.tasks.length - 1) {
      return progressInfo.tasks[currentTaskIndex + 1];
    }
    return null;
  }, [currentTaskIndex, progressInfo]);

  const handleNavigateTask = useCallback((direction: 'prev' | 'next') => {
    const target = direction === 'prev' ? prevTask : nextTask;
    if (target) {
      setSelectedKelas(target.kelas_id);
      setSelectedMapel(target.mapel_id);
      setScores([]);
      toast.info(`${direction === 'prev' ? '◀️' : '▶️'} Pindah ke ${target.nama_kelas} — ${target.nama_mapel}`);
    }
  }, [prevTask, nextTask]);

  // Auto-select first class-mapel task when progressInfo is loaded
  useEffect(() => {
    if (!selectedKelas && progressInfo?.tasks && progressInfo.tasks.length > 0) {
      setSelectedKelas(progressInfo.tasks[0].kelas_id);
      setSelectedMapel(progressInfo.tasks[0].mapel_id);
    }
  }, [selectedKelas, progressInfo]);

  // Reset scores grid immediately whenever selected filter changes
  useEffect(() => {
    setScores([]);
  }, [selectedKelas, selectedMapel, entryMode, selectedJenisNilai]);

  // Query students for selected class via centralized system hook
  const { rawList: studentListHook, isLoading: isLoadingStudents } = useSiswaOptions({
    kelasId: selectedKelas,
    onlyActive: true,
  });

  // Query existing grades
  const { data: existingGradesData, isLoading: isLoadingGrades } = useQuery({
    queryKey: ['grades', selectedKelas, selectedMapel, selectedJenisNilai, activeYear?.id, activeSemester?.id],
    queryFn: () => raporApi.getNilai({
      kelas_id: selectedKelas,
      mapel_id: selectedMapel,
      jenis_nilai_id: selectedJenisNilai || undefined,
      tahun_pelajaran_id: activeYear?.id,
      semester_id: activeSemester?.id
    }),
    enabled: !!selectedKelas && !!activeYear && !!activeSemester
  });

  // Combine students and existing grades into scores state
  useEffect(() => {
    if (studentListHook && studentListHook.length > 0) {
      const studentList = studentListHook;
      const gradesList = existingGradesData?.data || [];

      interface ApiSiswaRecord { id: string; nama_siswa?: string; nama?: string; nama_lengkap?: string; nis?: string; nisn?: string }
      interface ApiGradeRecord { siswa_id: string; sumatif_1?: number; sumatif_2?: number; sumatif_3?: number; sumatif_akhir?: number; deskripsi_cp?: string; capaian_kompetensi?: string; deskripsi?: string; nilai?: number }

      const initialScores: StudentScoreItem[] = studentList?.map((s: ApiSiswaRecord) => {
        const found = gradesList.find((g: ApiGradeRecord) => g.siswa_id === s.id);
        const studentName = s.nama_siswa || s.nama_lengkap || s.nama || '—';
        const studentNis = s.nis || s.nisn || '—';

        if (found) {
          return {
            siswa_id: s.id,
            nama: studentName,
            nis: studentNis,
            sumatif_1: found.sumatif_1 ?? null,
            sumatif_2: found.sumatif_2 ?? null,
            sumatif_3: found.sumatif_3 ?? null,
            sumatif_akhir: found.sumatif_akhir ?? null,
            deskripsi_cp: found.deskripsi_cp ?? found.capaian_kompetensi ?? found.deskripsi ?? '',
            nilai: found.nilai ?? null,
            deskripsi: found.deskripsi ?? found.deskripsi_cp ?? ''
          };
        }
        return {
          siswa_id: s.id,
          nama: studentName,
          nis: studentNis,
          sumatif_1: null,
          sumatif_2: null,
          sumatif_3: null,
          sumatif_akhir: null,
          deskripsi_cp: '',
          nilai: null,
          deskripsi: ''
        };
      }) || [];

      setScores(initialScores);
    }
  }, [studentListHook, existingGradesData]);

  // Score Input Change Handler with Zod Schema Validation & Range Checks
  const handleScoreChange = useCallback((index: number, field: keyof StudentScoreItem, val: string | number | null) => {
    setScores(prev => {
      const updated = [...prev];
      if (!updated[index]) return prev;

      // Range check for numeric score fields
      if (['sumatif_1', 'sumatif_2', 'sumatif_3', 'sumatif_akhir', 'nilai'].includes(field as string)) {
        if (val !== '' && val !== null && val !== undefined) {
          const num = parseFloat(String(val));
          if (!isNaN(num) && (num < 0 || num > 100)) {
            toast.error('Nilai harus berkisar antara 0 - 100.');
            return prev;
          }
        }
      }

      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  }, []);

  // 1-Click Copy CP to All
  const handleCopyCpToAll = useCallback((sourceCp: string) => {
    if (!sourceCp.trim()) {
      toast.warning('Teks Capaian Kompetensi (CP) baris pertama masih kosong.');
      return;
    }
    setScores(prev => prev?.map(s => ({ ...s, deskripsi_cp: sourceCp })) || []);
    toast.success(`Berhasil menyalin Capaian Kompetensi ke seluruh siswa!`);
  }, []);

  // 1-Click Clear CP
  const handleClearCpAll = useCallback(() => {
    setScores(prev => prev?.map(s => ({ ...s, deskripsi_cp: '' })) || []);
    toast.info('Seluruh Capaian Kompetensi (CP) telah dikosongkan.');
  }, []);

  // Keyboard Grid Navigation
  const handleKeyDownGrid = useCallback((e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, rowIndex: number, colIndex: number) => {
    const totalRows = scores.length;
    const maxCols = entryMode === 'sumatif' ? 5 : 2;

    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      if (rowIndex < totalRows - 1) {
        e.preventDefault();
        const target = document.getElementById(`input-grid-${rowIndex + 1}-${colIndex}`) as HTMLInputElement;
        target?.focus();
        target?.select?.();
      }
    } else if (e.key === 'ArrowUp') {
      if (rowIndex > 0) {
        e.preventDefault();
        const target = document.getElementById(`input-grid-${rowIndex - 1}-${colIndex}`) as HTMLInputElement;
        target?.focus();
        target?.select?.();
      }
    } else if (e.key === 'ArrowRight') {
      const input = e.currentTarget;
      if (input.selectionStart === input.selectionEnd) {
        if (colIndex < maxCols - 1) {
          e.preventDefault();
          const target = document.getElementById(`input-grid-${rowIndex}-${colIndex + 1}`) as HTMLInputElement;
          target?.focus();
          target?.select?.();
        }
      }
    } else if (e.key === 'ArrowLeft') {
      const input = e.currentTarget;
      if (input.selectionStart === input.selectionEnd && input.selectionStart === 0) {
        if (colIndex > 0) {
          e.preventDefault();
          const target = document.getElementById(`input-grid-${rowIndex}-${colIndex - 1}`) as HTMLInputElement;
          target?.focus();
          target?.select?.();
        }
      }
    }
  }, [scores.length, entryMode]);

  // Color Coding Helper based on subject KKM threshold
  const getScoreInputStyle = useCallback((scoreVal: string | number | null) => {
    if (scoreVal === null || scoreVal === undefined || scoreVal === '') {
      return 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100';
    }
    const num = parseFloat(String(scoreVal));
    if (isNaN(num)) return 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100';
    
    if (num < kkmThreshold) {
      return 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-300 border-rose-300 dark:border-rose-800 font-black';
    }
    const upperTuntas = Math.max(84, kkmThreshold + 14);
    if (num >= kkmThreshold && num <= upperTuntas) {
      return 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold';
    }
    return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-black';
  }, [kkmThreshold]);

  // Save Mutations
  const sumatifSaveMutation = useMutation({
    mutationFn: (data: unknown) => raporApi.saveSumatifMassal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-progress'] });
      setSaveSuccessMsg('Seluruh nilai Sumatif & Capaian Kompetensi berhasil disimpan ke database!');
      toast.success('Penyimpanan Nilai Berhasil!');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal menyimpan nilai sumatif.';
      toast.error(msg);
    }
  });

  const bulkSaveMutation = useMutation({
    mutationFn: (data: unknown) => raporApi.saveNilaiBulk(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-progress'] });
      setSaveSuccessMsg('Nilai Kategori berhasil disimpan ke database!');
      toast.success('Penyimpanan Nilai Bulk Berhasil!');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal menyimpan nilai bulk.';
      toast.error(msg);
    }
  });

  const handleSaveSubmit = useCallback(() => {
    if (!selectedKelas || !selectedMapel) {
      toast.error('Silakan pilih Kelas Rombel dan Mata Pelajaran terlebih dahulu.');
      return;
    }

    if (entryMode === 'sumatif') {
      const payload = {
        kelas_id: selectedKelas,
        mapel_id: selectedMapel,
        tahun_pelajaran_id: activeYear?.id,
        semester_id: activeSemester?.id,
        scores: scores?.map(s => ({
          siswa_id: s.siswa_id,
          sumatif_1: s.sumatif_1 !== null && s.sumatif_1 !== '' ? Number(s.sumatif_1) : null,
          sumatif_2: s.sumatif_2 !== null && s.sumatif_2 !== '' ? Number(s.sumatif_2) : null,
          sumatif_3: s.sumatif_3 !== null && s.sumatif_3 !== '' ? Number(s.sumatif_3) : null,
          sumatif_akhir: s.sumatif_akhir !== null && s.sumatif_akhir !== '' ? Number(s.sumatif_akhir) : null,
          nilai_akhir_sumatif: s.sumatif_akhir !== null && s.sumatif_akhir !== '' ? Number(s.sumatif_akhir) : null,
          deskripsi_cp: s.deskripsi_cp || '',
          capaian_kompetensi: s.deskripsi_cp || ''
        })) || []
      };
      sumatifSaveMutation.mutate(payload);
    } else {
      if (!selectedJenisNilai) {
        toast.error('Pilih Kategori Penilaian terlebih dahulu.');
        return;
      }
      const payload = {
        kelas_id: selectedKelas,
        mapel_id: selectedMapel,
        jenis_nilai_id: selectedJenisNilai,
        tahun_pelajaran_id: activeYear?.id,
        semester_id: activeSemester?.id,
        scores: scores?.map(s => ({
          siswa_id: s.siswa_id,
          nilai: s.nilai !== null && s.nilai !== '' ? Number(s.nilai) : null,
          deskripsi: s.deskripsi || ''
        })) || []
      };
      bulkSaveMutation.mutate(payload);
    }
  }, [selectedKelas, selectedMapel, entryMode, activeYear, activeSemester, scores, selectedJenisNilai, sumatifSaveMutation, bulkSaveMutation]);

  // Excel Paste Process Handler
  const handleProcessPaste = useCallback(() => {
    const parseRes = BulkPasteTextSchema.safeParse(pasteRawText);
    if (!parseRes.success) {
      toast.error(parseRes.error.errors[0]?.message || 'Teks paste kosong.');
      return;
    }

    const lines = pasteRawText.trim().split('\n');
    let matchedCount = 0;

    setScores(prev => {
      const nextScores = [...prev];
      lines?.forEach(line => {
        const cols = line.split('\t');
        if (cols.length >= 2) {
          const key = cols[0].trim();
          const targetIndex = nextScores.findIndex(s => s.nis === key || s.nama.toLowerCase().includes(key.toLowerCase()));
          if (targetIndex !== -1) {
            matchedCount++;
            nextScores[targetIndex] = {
              ...nextScores[targetIndex],
              sumatif_1: cols[1]?.trim() || nextScores[targetIndex].sumatif_1,
              sumatif_2: cols[2]?.trim() || nextScores[targetIndex].sumatif_2,
              sumatif_3: cols[3]?.trim() || nextScores[targetIndex].sumatif_3,
              sumatif_akhir: cols[4]?.trim() || nextScores[targetIndex].sumatif_akhir,
              deskripsi_cp: cols[5]?.trim() || nextScores[targetIndex].deskripsi_cp
            };
          }
        }
      });
      return nextScores;
    });

    setShowPasteModal(false);
    setPasteRawText('');
    toast.success(`Berhasil mencocokkan dan memasang nilai untuk ${matchedCount} siswa!`);
  }, [pasteRawText]);

  // Excel Styled Template Download Handler
  const handleDownloadTemplate = useCallback(async () => {
    if (!selectedKelas || !selectedMapel) {
      toast.error('Pilih Kelas Rombel dan Mata Pelajaran terlebih dahulu.');
      return;
    }
    const currentKelasObj = classes.find(k => k.id === selectedKelas);
    const currentMapelObj = subjects.find(m => m.id === selectedMapel);

    try {
      const blob = await generateStyledExcelTemplate({
        nama_kelas: currentKelasObj?.nama_kelas || 'Rombel',
        nama_mapel: currentMapelObj?.nama_mapel || 'Mata Pelajaran',
        tahun_pelajaran: activeYear?.nama || '2025/2026',
        semester: activeSemester?.nama || 'Ganjil',
        students: scores?.map(s => ({ nis: s.nis, nama: s.nama })) || []
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Template_Nilai_${currentKelasObj?.nama_kelas}_${currentMapelObj?.nama_mapel}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('Format Excel Bermerek Resmi berhasil diunduh!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('Gagal mengunduh format Excel: ' + msg);
    }
  }, [selectedKelas, selectedMapel, classes, subjects, activeYear, activeSemester, scores]);

  // Excel Bulk File Upload Handler
  const uploadExcelMutation = useMutation({
    mutationFn: (formData: FormData) => raporApi.importExcel(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-progress'] });
      toast.success('Impor Excel Massal Berhasil!');
      setExcelFile(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal mengimpor berkas Excel.';
      toast.error(msg);
    }
  });

  const handleUploadSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!excelFile) return;
    if (!selectedKelas || !selectedMapel) {
      toast.error('Pilih Kelas dan Mapel terlebih dahulu.');
      return;
    }
    const formData = new FormData();
    formData.append('file', excelFile);
    formData.append('kelas_id', selectedKelas);
    formData.append('mapel_id', selectedMapel);
    formData.append('tahun_pelajaran_id', activeYear?.id || '');
    formData.append('semester_id', activeSemester?.id || '');

    uploadExcelMutation.mutate(formData);
  }, [excelFile, selectedKelas, selectedMapel, activeYear, activeSemester, uploadExcelMutation]);

  const selectedKelasObj = useMemo(() => classes.find(k => k.id === selectedKelas), [classes, selectedKelas]);
  const selectedMapelObj = useMemo(() => subjects.find(m => m.id === selectedMapel), [subjects, selectedMapel]);

  // Export e-Rapor Kemendikbud Handler
  const handleExportEraporKemendikbud = useCallback(async () => {
    if (!selectedKelas || !selectedMapel) {
      toast.error('Pilih Kelas Rombel dan Mata Pelajaran terlebih dahulu.');
      return;
    }
    const currentKelasObj = classes.find(k => k.id === selectedKelas);
    const currentMapelObj = subjects.find(m => m.id === selectedMapel);

    try {
      const blob = await generateStyledExcelTemplate({
        nama_kelas: currentKelasObj?.nama_kelas || 'Rombel',
        nama_mapel: currentMapelObj?.nama_mapel || 'Mata Pelajaran',
        tahun_pelajaran: activeYear?.nama || '2025/2026',
        semester: activeSemester?.nama || 'Ganjil',
        students: scores?.map(s => ({ nis: s.nis, nama: s.nama })) || []
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `eRapor_Kemendikbud_${currentKelasObj?.nama_kelas}_${currentMapelObj?.nama_mapel}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('Berkas Siap Impor e-Rapor Kemendikbud berhasil diunduh!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('Gagal mengunduh e-Rapor: ' + msg);
    }
  }, [selectedKelas, selectedMapel, classes, subjects, activeYear, activeSemester, scores]);

  return (
    <OperationalPageLayout
      title="Lembar Input Nilai e-Rapor"
      shortTitle="Input Nilai"
      subtitle="Pengisian Nilai Rapor Kurikulum Merdeka & K-13 secara cepat, fleksibel, dan terintegrasi."
      hardeningModuleKey="InputNilaiPage"
      actions={
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono text-xs">
            <Calculator className="w-3.5 h-3.5 mr-1" />
            {activeYear?.nama || 'TP...'} — {activeSemester?.nama || 'Semester...'}
          </Badge>

          {/* Quick Navigation Shortcuts */}
          <button
            type="button"
            onClick={() => navigate('/rapor/cetak')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all"
            title="Buka Preview & Cetak Rapor Siswa"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Preview & Cetak Rapor</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/kurikulum/wali-kelas')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all"
            title="Buka Hub Manajemen Wali Kelas"
          >
            <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden sm:inline">Hub Wali Kelas</span>
          </button>

          {/* Mode Switcher Pills */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              aria-label="Mode Sumatif Merdeka"
              onClick={() => setEntryMode('sumatif')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                entryMode === 'sumatif'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 inline mr-1" />
              Sumatif (Merdeka)
            </button>
            <button
              type="button"
              aria-label="Mode Per Kategori"
              onClick={() => setEntryMode('kategori')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                entryMode === 'kategori'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 inline mr-1" />
              Per Kategori (K-13)
            </button>
          </div>
        </div>
      }
    >
      <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
        <div className="space-y-6">

          {/* Progress Bar & Rombel Filter Section */}
          <TeacherProgressCard
            progressInfo={progressInfo}
            showProgressDetail={showProgressDetail}
            onToggleProgressDetail={() => setShowProgressDetail(!showProgressDetail)}
            taskStatusFilter={taskStatusFilter}
            onSetTaskStatusFilter={setTaskStatusFilter}
            taskSearchQuery={taskSearchQuery}
            onSetTaskSearchQuery={setTaskSearchQuery}
            filteredTasks={filteredTasks}
            selectedKelas={selectedKelas}
            selectedMapel={selectedMapel}
            onSelectTask={(kId, mId, kNama, mNama) => {
              setSelectedKelas(kId);
              setSelectedMapel(mId);
              toast.info(`Memilih ${kNama} — ${mNama}`);
            }}
          />

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
              <button
                type="button"
                aria-label="Tutup notifikasi sukses"
                onClick={() => setSaveSuccessMsg(null)}
                className="text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-all text-white"
              >
                Tutup
              </button>
            </div>
          )}

          {selectedKelas && selectedMapel && (
            <div className="space-y-6">
              
              {/* Active Class & Subject Task Navigation Card (Unified 1-Block Maju/Mundur) */}
              <ActiveTaskNavCard
                selectedKelasName={selectedKelasObj?.nama_kelas}
                selectedMapelName={selectedMapelObj?.nama_mapel}
                currentTaskIndex={currentTaskIndex}
                totalTasks={progressInfo?.tasks?.length || 0}
                currentTaskStatus={currentTaskIndex >= 0 ? progressInfo?.tasks?.[currentTaskIndex]?.status : undefined}
                siswaTerisi={currentTaskIndex >= 0 ? progressInfo?.tasks?.[currentTaskIndex]?.siswa_terisi || 0 : 0}
                totalSiswa={currentTaskIndex >= 0 ? progressInfo?.tasks?.[currentTaskIndex]?.total_siswa || 0 : 0}
                prevTask={prevTask}
                nextTask={nextTask}
                onNavigateTask={handleNavigateTask}
              />

              {/* Full Width Input Grid Nilai with Integrated Top Action Toolbar */}
              <ScoreGridTable
                scores={scores}
                entryMode={entryMode}
                kkmThreshold={kkmThreshold}
                onKkmThresholdChange={handleKkmThresholdChange}
                onScoreChange={handleScoreChange}
                onCopyCpToAll={handleCopyCpToAll}
                onClearCpAll={handleClearCpAll}
                onKeyDownGrid={handleKeyDownGrid}
                getScoreInputStyle={getScoreInputStyle}
                onShowPasteModal={() => setShowPasteModal(true)}
                onSaveSubmit={handleSaveSubmit}
                onDownloadTemplate={handleDownloadTemplate}
                onExportEraporKemendikbud={handleExportEraporKemendikbud}
                onUploadSubmit={handleUploadSubmit}
                isUploading={uploadExcelMutation.isPending}
                isSaving={sumatifSaveMutation.isPending || bulkSaveMutation.isPending}
                isLoading={isLoadingStudents || isLoadingGrades}
              />
            </div>
          )}

          {/* Modal Paste dari Excel */}
          <ExcelPasteModal
            isOpen={showPasteModal}
            onClose={() => setShowPasteModal(false)}
            rawText={pasteRawText}
            onRawTextChange={setPasteRawText}
            onProcessPaste={handleProcessPaste}
          />

        </div>
      </SectionCard>
    </OperationalPageLayout>
  );
}
