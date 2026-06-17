import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Button, 
  Loader,
  Alert,
  ConfirmDialog,
  ModalFooter
} from '../../ui';
import { semesterSchema, type SemesterFormValues } from '../../../schemas/academic/semester.schema';
import { Save, X, RefreshCw } from 'lucide-react';
import { getTahunPelajaranList } from '../../../api/academic/tahunPelajaran.api';
import { getSemesterDetail, createSemester, updateSemester, type CreateSemesterPayload, type UpdateSemesterPayload } from '../../../api/academic/semester.api';
import { useToast } from '../../../hooks/useToast';
import type { TahunPelajaran } from '../../../types/academic';

// Modular Sections
import { SemesterInfoSection } from './form/SemesterInfoSection';

interface SemesterFormProps {
  semesterId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit' | 'view';
}

const SEMESTER_OPTIONS = [
  { value: 'Ganjil', label: 'Semester Ganjil' },
  { value: 'Genap', label: 'Semester Genap' }
];

const SemesterForm: React.FC<SemesterFormProps> = ({
  semesterId,
  onSuccess,
  onCancel,
  mode = 'create'
}) => {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [tahunPelajaranList, setTahunPelajaranList] = useState<TahunPelajaran[]>([]);
  const [loadingTahunPelajaran, setLoadingTahunPelajaran] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [showActivateConfirm, setShowActivateConfirm] = useState(false);
  
  const { showToast } = useToast();

  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors }
  } = useForm<SemesterFormValues>({
    resolver: zodResolver(semesterSchema),
    defaultValues: {
      nama_semester: '',
      tahun_pelajaran_id: '',
      is_active: false
    }
  });

  const watchedTahunPelajaranId = watch('tahun_pelajaran_id');

  // Load tahun pelajaran for dropdown
  useEffect(() => {
    const loadTahunPelajaran = async () => {
      try {
        setLoadingTahunPelajaran(true);
        const response = await getTahunPelajaranList(1, 100);
        if (response.success) {
          setTahunPelajaranList(response.data);
        }
      } catch (error) {
        console.error('Error loading tahun pelajaran:', error);
        showToast('Gagal memuat data tahun pelajaran', 'error');
      } finally {
        setLoadingTahunPelajaran(false);
      }
    };

    loadTahunPelajaran();
  }, [showToast]);

  // Load semester data for edit/view mode
  useEffect(() => {
    const loadSemesterData = async () => {
      if (!semesterId || mode === 'create') return;

      try {
        setLoadingData(true);
        const semester = await getSemesterDetail(semesterId);
        
        reset({
          nama_semester: semester.nama_semester || '',
          tahun_pelajaran_id: semester.tahun_pelajaran_id || '',
          is_active: semester.is_active || false
        });
      } catch (error) {
        console.error('Error loading semester data:', error);
        setSubmitError('Gagal memuat data semester');
        showToast('Gagal memuat data semester', 'error');
      } finally {
        setLoadingData(false);
      }
    };

    loadSemesterData();
  }, [semesterId, mode, reset, showToast]);

  const handleActiveChange = (checked: boolean) => {
    if (checked) {
      if (!watchedTahunPelajaranId) {
        showToast('Pilih Tahun Pelajaran terlebih dahulu', 'error');
        return;
      }

      const selectedTp = tahunPelajaranList.find(t => t.id === watchedTahunPelajaranId);
      if (!selectedTp?.is_active) {
        showToast('Semester tidak dapat diaktifkan karena Tahun Pelajaran terpilih tidak aktif', 'error');
        return;
      }

      setShowActivateConfirm(true);
    } else {
      setValue('is_active', false, { shouldDirty: true });
    }
  };

  const confirmActivation = () => {
    setValue('is_active', true, { shouldDirty: true });
    setShowActivateConfirm(false);
  };

  const onSubmit = async (data: SemesterFormValues) => {
    try {
      setLoading(true);
      setSubmitError('');

      if (isEditMode && semesterId) {
        const updatePayload: UpdateSemesterPayload = {
          nama_semester: data.nama_semester,
          tahun_pelajaran_id: data.tahun_pelajaran_id,
          is_active: data.is_active
        };
        
        const response = await updateSemester(semesterId, updatePayload);
        if (response.success) {
          showToast('Semester berhasil diperbarui', 'success');
          onSuccess?.();
        } else {
          setSubmitError(response.message || 'Gagal memperbarui semester');
        }
      } else {
        const createPayload: CreateSemesterPayload = {
          nama_semester: data.nama_semester,
          tahun_pelajaran_id: data.tahun_pelajaran_id,
          is_active: data.is_active
        };
        
        const response = await createSemester(createPayload);
        if (response.success) {
          showToast('Semester berhasil dibuat', 'success');
          onSuccess?.();
        } else {
          setSubmitError(response.message || 'Gagal membuat semester');
        }
      }
    } catch (error: any) {
      console.error('Error submitting semester:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Terjadi kesalahan saat menyimpan data';
      setSubmitError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
        <Loader size="lg" />
        <span className="ml-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Memuat data semester...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {submitError && (
          <Alert variant="destructive">
            {submitError}
          </Alert>
        )}

        <SemesterInfoSection 
          control={control}
          errors={errors}
          isViewMode={isViewMode}
          watch={watch}
          tahunPelajaranList={tahunPelajaranList}
          loadingTahunPelajaran={loadingTahunPelajaran}
          semesterOptions={SEMESTER_OPTIONS}
          handleActiveChange={handleActiveChange}
        />

        <ModalFooter className="mt-4 pt-6 border-t border-slate-100 dark:border-slate-800 gap-3">
          <Button
            type="button"
            variant="toolbarOutline"
            size="toolbar"
            onClick={onCancel}
            disabled={loading}
          >
            <X className="w-3.5 h-3.5 mr-2" />
            {isViewMode ? 'Tutup Detail' : 'Batalkan'}
          </Button>
          
          {!isViewMode && (
            <Button
              type="submit"
              variant="toolbarPrimary"
              size="toolbar"
              disabled={loading || loadingTahunPelajaran}
              className="px-8"
            >
              {loading ? (
                <RefreshCw size={14} className="mr-2 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-2" />
              )}
              {isEditMode ? 'Simpan Perubahan' : 'Buat Semester Baru'}
            </Button>
          )}
        </ModalFooter>
      </form>

      <ConfirmDialog
        isOpen={showActivateConfirm}
        onCancel={() => setShowActivateConfirm(false)}
        onConfirm={confirmActivation}
        title="Konfirmasi Aktivasi Semester"
        description="Apakah Anda yakin ingin mengaktifkan semester ini? Tindakan ini akan menonaktifkan semester lain yang sedang aktif pada tahun pelajaran yang sama."
        confirmText="Ya, Aktifkan"
        cancelText="Batal"
        style="warning"
      />
    </div>
  );
};

export default SemesterForm;
