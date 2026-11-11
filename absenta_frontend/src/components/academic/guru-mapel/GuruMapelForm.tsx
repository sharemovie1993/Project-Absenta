import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Alert, ModalFooter } from '../../ui';
import { Save, X, RefreshCw, Layers } from 'lucide-react';
import { getGuruList } from '../../../api/academic/guru.api';
import { getMapelList } from '../../../api/academic/mapel.api';
import { getJurusanList } from '../../../api/academic/jurusan.api';
import { getKelasForDropdown } from '../../../api/dropdown.api';
import { assignGuruMapel } from '../../../api/kurikulum/guru-mapel.api';
import type { Guru, Mapel, TeachingMode } from '../../../types/academic';
import toast from 'react-hot-toast';
import { guruMapelSchema, type GuruMapelFormValues } from '../../../schemas/academic/guru-mapel.schema';

// Modular Sections
import { GuruMapelAssignmentSection } from './form/GuruMapelAssignmentSection';
import { UnitPengajaranEditor, type EditableUnitDraft } from './UnitPengajaranEditor';

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
  const [teachingMode, setTeachingMode] = useState<TeachingMode>('SINGLE');
  const [unitDrafts, setUnitDrafts] = useState<EditableUnitDraft[]>([
    { nama_unit: 'Sub-Materi 1', guru_id: '', jp_alokasi: 2, target_sumatif_slot: 'sumatif_1', is_active: true },
    { nama_unit: 'Sub-Materi 2', guru_id: '', jp_alokasi: 2, target_sumatif_slot: 'sumatif_2', is_active: true },
  ]);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<GuruMapelFormValues>({
    resolver: zodResolver(guruMapelSchema),
    defaultValues: {
      guru_id: '',
      mapel_id: ''
    }
  });
  const watchedGuruId = watch('guru_id');

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
      if (teachingMode === 'COLLABORATION') {
        const missing = unitDrafts.find((u) => !u.guru_id || !u.nama_unit.trim());
        if (missing) {
          setError('Setiap unit kolaborasi wajib memiliki Nama Sub-Materi dan Guru Pengampu.');
          return;
        }
      }

      const payload = {
        ...data,
        jurusan_id: scopeMode === 'JURUSAN' ? scopeJurusanId || null : null,
        kelas_id: scopeMode === 'KELAS' ? scopeKelasId || null : null,
        teaching_mode: teachingMode,
        units:
          teachingMode === 'COLLABORATION'
            ? unitDrafts.map((u, idx) => ({
                nama_unit: u.nama_unit.trim(),
                guru_id: u.guru_id,
                jp_alokasi: Number(u.jp_alokasi || 2),
                target_sumatif_slot: u.target_sumatif_slot || null,
                urutan: idx + 1,
              }))
            : undefined,
      };
      const res = await assignGuruMapel(payload);
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['beban-guru-list'] });
        queryClient.invalidateQueries({ queryKey: ['jadwal-kbm-grid'] });
        queryClient.invalidateQueries({ queryKey: ['jadwal-guru-timeline'] });
        queryClient.invalidateQueries({ queryKey: ['evaluasi-kinerja-guru'] });

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

        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Mode Kolaborasi / Pecah Sub-Materi
                </p>
                <p className="text-[11px] text-slate-500">
                  Aktifkan bila 1 mapel Dapodik diajar bersama beberapa guru sub-materi.
                </p>
              </div>
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={teachingMode === 'COLLABORATION'}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setTeachingMode(checked ? 'COLLABORATION' : 'SINGLE');
                  if (checked && watchedGuruId) {
                    setUnitDrafts((prev) =>
                      prev.map((u, idx) => (idx === 0 && !u.guru_id ? { ...u, guru_id: watchedGuruId } : u))
                    );
                  }
                }}
                className="w-4 h-4 accent-indigo-600 rounded"
              />
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                {teachingMode === 'COLLABORATION' ? 'Aktif' : 'Normal (Single)'}
              </span>
            </label>
          </div>

          {teachingMode === 'COLLABORATION' && (
            <UnitPengajaranEditor
              units={unitDrafts}
              onChange={setUnitDrafts}
              guruOptions={guruOptions}
              defaultGuruId={watchedGuruId}
            />
          )}
        </div>

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
