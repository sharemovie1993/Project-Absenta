import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Alert, ModalFooter } from '../../ui';
import { Save, X, RefreshCw } from 'lucide-react';
import { getGuruList } from '../../../api/academic/guru.api';
import { getMapelList } from '../../../api/academic/mapel.api';
import { assignGuruMapel } from '../../../api/academic/guru-mapel.api';
import type { Guru, Mapel } from '../../../types/academic';
import { useToast } from '../../../hooks/useToast';
import { guruMapelSchema, type GuruMapelFormValues } from '../../../schemas/academic/guru-mapel.schema';

// Modular Sections
import { GuruMapelAssignmentSection } from './form/GuruMapelAssignmentSection';

interface Props {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const GuruMapelForm: React.FC<Props> = ({ onSuccess, onCancel }) => {
  const [guruOptions, setGuruOptions] = useState<Guru[]>([]);
  const [mapelOptions, setMapelOptions] = useState<Mapel[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { showToast } = useToast();

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
        const [gurus, mapels] = await Promise.all([
          getGuruList(1, 100, ''),
          getMapelList(1, 100, ''),
        ]);
        setGuruOptions(gurus.data);
        setMapelOptions(mapels.data);
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
      const res = await assignGuruMapel(data);
      if (res.success) {
        showToast('Penugasan berhasil disimpan', 'success');
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
};

export default GuruMapelForm;
