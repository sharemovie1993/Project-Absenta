import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Alert, ModalFooter } from '../../ui';
import { Save, X, RefreshCw } from 'lucide-react';
import { getGuruList } from '../../../api/academic/guru.api';
import { getMapelList } from '../../../api/academic/mapel.api';
import { getJurusanList } from '../../../api/academic/jurusan.api';
import { getKelasForDropdown } from '../../../api/dropdown.api';
import { assignGuruMapel } from '../../../api/kurikulum/guru-mapel.api';
import type { Guru, Mapel } from '../../../types/academic';
import toast from 'react-hot-toast';
import { guruMapelSchema, type GuruMapelFormValues } from '../../../schemas/academic/guru-mapel.schema';

// Modular Sections
import { GuruMapelAssignmentSection } from './form/GuruMapelAssignmentSection';

interface Props {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const GuruMapelForm = React.memo<Props>(({ onSuccess, onCancel }) => {
  const queryClient = useQueryClient();
  const [guruOptions, setGuruOptions] = useState<Guru[]>([]);
  const [mapelOptions, setMapelOptions] = useState<Mapel[]>([]);
  const [jurusanOptions, setJurusanOptions] = useState<any[]>([]);
  const [kelasOptions, setKelasOptions] = useState<any[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Scope Plotting States
  const [scopeMode, setScopeMode] = useState<'GLOBAL' | 'JURUSAN' | 'KELAS'>('GLOBAL');
  const [scopeJurusanId, setScopeJurusanId] = useState<string>('');
  const [scopeKelasId, setScopeKelasId] = useState<string>('');

  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<GuruMapelFormValues>({
    resolver: zodResolver(guruMapelSchema),
    defaultValues: {
      guru_id: '',
      mapel_id: ''
    }
  });

  useEffect(() => {
    const loadOptions = async () => {
      try {
        setLoadingOptions(true);
        const [gurus, mapels, jurusans, kelas] = await Promise.all([
          getGuruList(1, 100, ''),
          getMapelList(1, 100, ''),
          getJurusanList(1, 100).catch(() => ({ data: [] })),
          getKelasForDropdown().catch(() => [])
        ]);
        setGuruOptions(gurus.data || []);
        setMapelOptions(mapels.data || []);
        setJurusanOptions(jurusans.data || []);
        setKelasOptions(Array.isArray(kelas) ? kelas : []);
      } catch (e: any) {
        setError(e?.message || 'Gagal memuat data');
      } finally {
        setLoadingOptions(false);
      }
    };
    loadOptions();
  }, []);

  const onFormSubmit = async (data: GuruMapelFormValues) => {
    try {
      setSubmitting(true);
      setError(null);
      const payload = {
        ...data,
        jurusan_id: scopeMode === 'JURUSAN' ? scopeJurusanId || null : null,
        kelas_id: scopeMode === 'KELAS' ? scopeKelasId || null : null,
      };
      const res = await assignGuruMapel(payload);
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['beban-guru-list'] });
        queryClient.invalidateQueries({ queryKey: ['jadwal-kbm-grid'] });
        queryClient.invalidateQueries({ queryKey: ['jadwal-guru-timeline'] });

        toast.success('Penugasan berhasil disimpan');
        onSuccess?.();
      } else {
        setError(res.message || 'Gagal menyimpan');
      }
    } catch (e: any) {
      setError(e?.message || 'Gagal menyimpan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        {error && <Alert variant="destructive">{error}</Alert>}
        
        <GuruMapelAssignmentSection 
          control={control}
          errors={errors}
          guruOptions={guruOptions}
          mapelOptions={mapelOptions}
          jurusanOptions={jurusanOptions}
          kelasOptions={kelasOptions}
          scopeMode={scopeMode}
          setScopeMode={setScopeMode}
          scopeJurusanId={scopeJurusanId}
          setScopeJurusanId={setScopeJurusanId}
          scopeKelasId={scopeKelasId}
          setScopeKelasId={setScopeKelasId}
          loading={loadingOptions}
        />

        <ModalFooter className="pt-6 border-t border-slate-100 dark:border-slate-800 gap-3">
          <Button
            type="button"
            variant="toolbarOutline"
            size="toolbar"
            onClick={onCancel}
            disabled={submitting}
          >
            <X className="w-3.5 h-3.5 mr-2" />
            Batalkan
          </Button>
          <Button
            type="submit"
            variant="toolbarPrimary"
            size="toolbar"
            disabled={submitting || loadingOptions}
            className="px-8"
          >
            {submitting ? (
              <RefreshCw size={14} className="mr-2 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 mr-2" />
            )}
            Simpan Penugasan
          </Button>
        </ModalFooter>
      </form>
    </div>
  );
});

GuruMapelForm.displayName = 'GuruMapelForm';

export default GuruMapelForm;
