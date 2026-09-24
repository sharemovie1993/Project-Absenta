import React, { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { StudentScoreItem, ClassItem, SubjectItem } from '../../../types/inputNilai.types';
import { KkmThresholdSchema, BulkPasteTextSchema } from '../../../schemas/inputNilai.schema';
import { raporApi } from '../../../api/rapor.api';
import { generateStyledExcelTemplate } from '../../../utils/excel-advanced.utils';
import { AcademicYear, Semester } from '../../../types/cetakRapor.types';

export interface ApiSiswaRecord {
  id: string;
  nama_siswa?: string;
  nama?: string;
  nama_lengkap?: string;
  nis?: string;
  nisn?: string;
}

export interface ApiGradeRecord {
  siswa_id: string;
  sumatif_1?: number | null;
  sumatif_2?: number | null;
  sumatif_3?: number | null;
  sumatif_akhir?: number | null;
  nilai_akhir_sumatif?: number | null;
  rata_rata_sumatif?: number | null;
  nilai_rapor_final?: number | null;
  deskripsi_cp?: string;
  capaian_kompetensi?: string;
  catatan_deskripsi?: string;
  deskripsi?: string;
  nilai?: number | null;
}

export interface UseScoreSheetManagerProps {
  selectedKelas: string;
  selectedMapel: string;
  selectedJenisNilai?: string;
  entryMode: 'sumatif' | 'kategori';
  activeYear: AcademicYear | null;
  activeSemester: Semester | null;
  classes: ClassItem[];
  subjects: SubjectItem[];
  isReadOnly: boolean;
  studentList: ApiSiswaRecord[] | null | undefined;
  existingGrades: ApiGradeRecord[] | null | undefined;
}

export function useScoreSheetManager({
  selectedKelas,
  selectedMapel,
  selectedJenisNilai = '',
  entryMode,
  activeYear,
  activeSemester,
  classes,
  subjects,
  isReadOnly,
  studentList,
  existingGrades,
}: UseScoreSheetManagerProps) {
  const queryClient = useQueryClient();
  const [scores, setScores] = useState<StudentScoreItem[]>([]);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [kkmThreshold, setKkmThreshold] = useState<number>(70);

  // Modal Paste State
  const [showPasteModal, setShowPasteModal] = useState<boolean>(false);
  const [pasteRawText, setPasteRawText] = useState<string>('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

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

  // Combine students and existing grades into scores state
  useEffect(() => {
    if (studentList && studentList.length > 0) {
      const gradesList = existingGrades || [];

      const initialScores: StudentScoreItem[] = (studentList ?? []).map((s: ApiSiswaRecord) => {
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
            sumatif_akhir: found.sumatif_akhir ?? found.nilai_akhir_sumatif ?? null,
            deskripsi_cp: found.deskripsi_cp ?? found.capaian_kompetensi ?? found.catatan_deskripsi ?? found.deskripsi ?? '',
            nilai: found.nilai ?? found.nilai_rapor_final ?? null,
            deskripsi: found.deskripsi ?? found.deskripsi_cp ?? found.catatan_deskripsi ?? '',
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
          deskripsi: '',
        };
      });

      setScores(initialScores);
    }
  }, [studentList, existingGrades]);

  // Score Input Change Handler with Range Checks
  const handleScoreChange = useCallback((index: number, field: keyof StudentScoreItem, val: string | number | null) => {
    if (isReadOnly) {
      toast.error('Tidak dapat mengubah nilai: Anda berada dalam Mode Hanya Baca (Read-Only).');
      return;
    }
    setScores((prev) => {
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
  }, [isReadOnly]);

  // 1-Click Copy CP to All
  const handleCopyCpToAll = useCallback((sourceCp: string) => {
    if (isReadOnly) return;
    if (!sourceCp.trim()) {
      toast.warning('Teks Capaian Kompetensi (CP) baris pertama masih kosong.');
      return;
    }
    setScores((prev) => (prev ?? []).map((s) => ({ ...s, deskripsi_cp: sourceCp })));
    toast.success('Berhasil menyalin Capaian Kompetensi ke seluruh siswa!');
  }, [isReadOnly]);

  // 1-Click Clear CP
  const handleClearCpAll = useCallback(() => {
    if (isReadOnly) return;
    setScores((prev) => (prev ?? []).map((s) => ({ ...s, deskripsi_cp: '' })));
    toast.info('Seluruh Capaian Kompetensi (CP) telah dikosongkan.');
  }, [isReadOnly]);

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
      queryClient.invalidateQueries({ queryKey: ['rapor-leger-list'] });
      queryClient.invalidateQueries({ queryKey: ['rapor-teacher-progress'] });
      queryClient.invalidateQueries({ queryKey: ['academic-stats'] });
      queryClient.invalidateQueries({ queryKey: ['class-subject-progress-input'] });
      queryClient.invalidateQueries({ queryKey: ['class-subject-progress'] });
      setSaveSuccessMsg('Seluruh nilai Sumatif & Capaian Kompetensi berhasil disimpan ke database!');
      toast.success('Penyimpanan Nilai Berhasil!');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal menyimpan nilai sumatif.';
      toast.error(msg);
    },
  });

  const bulkSaveMutation = useMutation({
    mutationFn: (data: unknown) => raporApi.saveNilaiBulk(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-progress'] });
      queryClient.invalidateQueries({ queryKey: ['rapor-leger-list'] });
      queryClient.invalidateQueries({ queryKey: ['rapor-teacher-progress'] });
      queryClient.invalidateQueries({ queryKey: ['academic-stats'] });
      queryClient.invalidateQueries({ queryKey: ['class-subject-progress-input'] });
      queryClient.invalidateQueries({ queryKey: ['class-subject-progress'] });
      setSaveSuccessMsg('Nilai Kategori berhasil disimpan ke database!');
      toast.success('Penyimpanan Nilai Bulk Berhasil!');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal menyimpan nilai bulk.';
      toast.error(msg);
    },
  });

  const handleSaveSubmit = useCallback(() => {
    if (isReadOnly) {
      toast.error('Akses ditolak: Anda berada dalam Mode Hanya Baca (Read-Only). Hanya Guru Pengampu yang berhak menyimpan nilai.');
      return;
    }

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
        scores: (scores ?? []).map((s) => ({
          siswa_id: s.siswa_id,
          sumatif_1: s.sumatif_1 !== null && s.sumatif_1 !== '' ? Number(s.sumatif_1) : null,
          sumatif_2: s.sumatif_2 !== null && s.sumatif_2 !== '' ? Number(s.sumatif_2) : null,
          sumatif_3: s.sumatif_3 !== null && s.sumatif_3 !== '' ? Number(s.sumatif_3) : null,
          sumatif_akhir: s.sumatif_akhir !== null && s.sumatif_akhir !== '' ? Number(s.sumatif_akhir) : null,
          nilai_akhir_sumatif: s.sumatif_akhir !== null && s.sumatif_akhir !== '' ? Number(s.sumatif_akhir) : null,
          deskripsi_cp: s.deskripsi_cp || '',
          capaian_kompetensi: s.deskripsi_cp || '',
          catatan_deskripsi: s.deskripsi_cp || '',
        })),
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
        scores: (scores ?? []).map((s) => ({
          siswa_id: s.siswa_id,
          nilai: s.nilai !== null && s.nilai !== '' ? Number(s.nilai) : null,
          deskripsi: s.deskripsi || '',
        })),
      };
      bulkSaveMutation.mutate(payload);
    }
  }, [isReadOnly, selectedKelas, selectedMapel, entryMode, activeYear, activeSemester, scores, selectedJenisNilai, sumatifSaveMutation, bulkSaveMutation]);

  // Excel Paste Process Handler
  const handleProcessPaste = useCallback(() => {
    if (isReadOnly) {
      toast.error('Akses ditolak: Anda berada dalam Mode Hanya Baca (Read-Only).');
      return;
    }

    const parseRes = BulkPasteTextSchema.safeParse(pasteRawText);
    if (!parseRes.success) {
      toast.error(parseRes.error.errors[0]?.message || 'Teks paste kosong.');
      return;
    }

    const lines = pasteRawText.trim().split('\n');
    let matchedCount = 0;

    setScores((prev) => {
      const nextScores = [...prev];
      (lines ?? []).forEach((line) => {
        const cols = line.split('\t');
        if (cols.length >= 2) {
          const key = cols[0].trim();
          const targetIndex = nextScores.findIndex((s) => s.nis === key || s.nama.toLowerCase().includes(key.toLowerCase()));
          if (targetIndex !== -1) {
            matchedCount++;
            nextScores[targetIndex] = {
              ...nextScores[targetIndex],
              sumatif_1: cols[1]?.trim() || nextScores[targetIndex].sumatif_1,
              sumatif_2: cols[2]?.trim() || nextScores[targetIndex].sumatif_2,
              sumatif_3: cols[3]?.trim() || nextScores[targetIndex].sumatif_3,
              sumatif_akhir: cols[4]?.trim() || nextScores[targetIndex].sumatif_akhir,
              deskripsi_cp: cols[5]?.trim() || nextScores[targetIndex].deskripsi_cp,
            };
          }
        }
      });
      return nextScores;
    });

    setShowPasteModal(false);
    setPasteRawText('');
    toast.success(`Berhasil mencocokkan dan memasang nilai untuk ${matchedCount} siswa!`);
  }, [isReadOnly, pasteRawText]);

  // Excel Styled Template Download Handler
  const handleDownloadTemplate = useCallback(async () => {
    if (!selectedKelas || !selectedMapel) {
      toast.error('Pilih Kelas Rombel dan Mata Pelajaran terlebih dahulu.');
      return;
    }
    const currentKelasObj = classes.find((k) => k.id === selectedKelas);
    const currentMapelObj = subjects.find((m) => m.id === selectedMapel);

    try {
      const blob = await generateStyledExcelTemplate({
        nama_kelas: currentKelasObj?.nama_kelas || 'Rombel',
        nama_mapel: currentMapelObj?.nama_mapel || 'Mata Pelajaran',
        tahun_pelajaran: activeYear?.nama || '2025/2026',
        semester: activeSemester?.nama || 'Ganjil',
        students: (scores ?? []).map((s) => ({ nis: s.nis, nama: s.nama })),
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
      queryClient.invalidateQueries({ queryKey: ['rapor-leger-list'] });
      queryClient.invalidateQueries({ queryKey: ['rapor-teacher-progress'] });
      queryClient.invalidateQueries({ queryKey: ['academic-stats'] });
      queryClient.invalidateQueries({ queryKey: ['class-subject-progress-input'] });
      queryClient.invalidateQueries({ queryKey: ['class-subject-progress'] });
      toast.success('Impor Excel Massal Berhasil!');
      setExcelFile(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal mengimpor berkas Excel.';
      toast.error(msg);
    },
  });

  const handleUploadSubmit = useCallback((file: File) => {
    if (isReadOnly) {
      toast.error('Akses ditolak: Anda berada dalam Mode Hanya Baca (Read-Only).');
      return;
    }
    if (!file) return;
    if (!selectedKelas || !selectedMapel) {
      toast.error('Pilih Kelas dan Mapel terlebih dahulu.');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('kelas_id', selectedKelas);
    formData.append('mapel_id', selectedMapel);
    formData.append('tahun_pelajaran_id', activeYear?.id || '');
    formData.append('semester_id', activeSemester?.id || '');

    uploadExcelMutation.mutate(formData);
  }, [isReadOnly, selectedKelas, selectedMapel, activeYear, activeSemester, uploadExcelMutation]);

  // Export e-Rapor Kemendikbud Handler
  const handleExportEraporKemendikbud = useCallback(async () => {
    if (!selectedKelas || !selectedMapel) {
      toast.error('Pilih Kelas Rombel dan Mata Pelajaran terlebih dahulu.');
      return;
    }
    const currentKelasObj = classes.find((k) => k.id === selectedKelas);
    const currentMapelObj = subjects.find((m) => m.id === selectedMapel);

    try {
      // Prioritaskan format Kemendikbud multi-sheet dari server
      const blobRes = await raporApi.exportEraporKemendikbudBlob({
        kelas_id: selectedKelas,
        mapel_id: selectedMapel,
        tahun_pelajaran_id: activeYear?.id || '',
        semester_id: activeSemester?.id || '',
      });

      const url = window.URL.createObjectURL(blobRes);
      const a = document.createElement('a');
      a.href = url;
      a.download = `eRapor_Kemendikbud_${currentKelasObj?.nama_kelas || 'Rombel'}_${currentMapelObj?.nama_mapel || 'Mapel'}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('Berkas Siap Impor e-Rapor Kemendikbud berhasil diunduh!');
    } catch {
      // Fallback ke generator lokal terformat jika koneksi offline/endpoint terkendala
      try {
        const blob = await generateStyledExcelTemplate({
          nama_kelas: currentKelasObj?.nama_kelas || 'Rombel',
          nama_mapel: currentMapelObj?.nama_mapel || 'Mata Pelajaran',
          tahun_pelajaran: activeYear?.nama || '2025/2026',
          semester: activeSemester?.nama || 'Ganjil',
          students: (scores ?? []).map((s) => ({ nis: s.nis, nama: s.nama })),
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
    }
  }, [selectedKelas, selectedMapel, classes, subjects, activeYear, activeSemester, scores]);

  return {
    scores,
    setScores,
    kkmThreshold,
    handleKkmThresholdChange,
    handleScoreChange,
    handleCopyCpToAll,
    handleClearCpAll,
    handleKeyDownGrid,
    getScoreInputStyle,
    showPasteModal,
    setShowPasteModal,
    pasteRawText,
    setPasteRawText,
    handleProcessPaste,
    handleSaveSubmit,
    handleDownloadTemplate,
    handleExportEraporKemendikbud,
    handleUploadSubmit,
    isSaving: sumatifSaveMutation.isPending || bulkSaveMutation.isPending,
    isUploading: uploadExcelMutation.isPending,
    saveSuccessMsg,
    setSaveSuccessMsg,
  };
}
