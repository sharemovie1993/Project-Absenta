import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { raporApi } from '../../../api/rapor.api';
import {
  LegerStudent,
  SummaryFormData,
  SummaryFormSchema,
  AcademicYear,
  Semester,
} from '../../../types/cetakRapor.types';

interface UseRaporSummaryManagerProps {
  selectedKelas: string;
  activeYear: AcademicYear | null;
  activeSemester: Semester | null;
  isGenap?: boolean;
}

export function useRaporSummaryManager({
  selectedKelas,
  activeYear,
  activeSemester,
  isGenap = false,
}: UseRaporSummaryManagerProps) {
  const queryClient = useQueryClient();

  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<LegerStudent | null>(null);
  const [summaryForm, setSummaryForm] = useState<SummaryFormData>({
    sakit: 0,
    izin: 0,
    alpa: 0,
    catatan_wali: '',
    keputusan_transisi: isGenap ? 'NAIK' : '',
    catatan_kokurikuler: '',
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof SummaryFormData, string>>>({});

  const summaryMutation = useMutation({
    mutationFn: raporApi.upsertRaporSummary,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leger'] });
      queryClient.invalidateQueries({ queryKey: ['rapor-leger-list'] });
      queryClient.invalidateQueries({ queryKey: ['academic-stats'] });
      toast.success('Rekap absensi & catatan wali kelas berhasil disimpan');
      setIsSummaryModalOpen(false);
    },
    onError: (err: Error) => {
      toast.error(`Gagal menyimpan catatan: ${err.message}`);
    },
  });

  const handleOpenSummaryModal = useCallback((student: LegerStudent) => {
    setSelectedStudent(student);
    const rawKep = (student.keputusan_transisi || '').trim().toUpperCase();
    const resolvedKep = isGenap
      ? (rawKep.includes('MENETAP') || rawKep.includes('TINGGAL') ? 'MENETAP' : 'NAIK')
      : '';

    setSummaryForm({
      sakit: student.sakit ?? 0,
      izin: student.izin ?? 0,
      alpa: student.alpa ?? 0,
      catatan_wali: student.catatan_wali ?? '',
      keputusan_transisi: resolvedKep,
      catatan_kokurikuler: student.catatan_kokurikuler ?? '',
    });
    setFormErrors({});
    setIsSummaryModalOpen(true);
  }, [isGenap]);

  const handleSummaryFormChange = useCallback((field: keyof SummaryFormData, val: string | number) => {
    setSummaryForm((prev) => ({ ...prev, [field]: val }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  }, []);

  const handleSummarySubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedStudent || !activeYear?.id || !activeSemester?.id) {
        toast.error('Data kelas / semester belum lengkap');
        return;
      }
      const validation = SummaryFormSchema.safeParse(summaryForm);
      if (!validation.success) {
        const errors: Partial<Record<keyof SummaryFormData, string>> = {};
        (validation.error.errors ?? [])?.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0] as keyof SummaryFormData] = err.message;
          }
        });
        setFormErrors(errors);
        toast.error('Mohon periksa kembali input form Anda');
        return;
      }

      summaryMutation.mutate({
        siswa_id: selectedStudent.id,
        kelas_id: selectedKelas,
        tahun_pelajaran_id: activeYear.id,
        semester_id: activeSemester.id,
        sakit: validation.data.sakit,
        izin: validation.data.izin,
        alpa: validation.data.alpa,
        catatan_wali: validation.data.catatan_wali,
        keputusan_transisi: isGenap ? (validation.data.keputusan_transisi || 'NAIK') : '',
        catatan_kokurikuler: validation.data.catatan_kokurikuler,
      });
    },
    [selectedStudent, activeYear, activeSemester, summaryForm, selectedKelas, summaryMutation, isGenap]
  );

  return {
    isSummaryModalOpen,
    setIsSummaryModalOpen,
    selectedStudent,
    summaryForm,
    formErrors,
    handleOpenSummaryModal,
    handleSummaryFormChange,
    handleSummarySubmit,
    isSavingSummary: summaryMutation.isPending,
  };
}
