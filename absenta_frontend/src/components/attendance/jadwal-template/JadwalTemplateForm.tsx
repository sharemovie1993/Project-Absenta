import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button, Input, Label, Alert, AlertDescription, ModalFooter, Loader } from '../../ui';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { mapelApi, guruApi } from '../../../api/academic.api';
import { jenisKegiatanMasterApi, type JenisKegiatanMaster } from '../../../api/academic/jenisKegiatanMaster.api';
import {
  createJadwalTemplate,
  updateJadwalTemplate,
  type CreateJadwalPayload,
  type JadwalTemplate
} from '../../../api/attendance/jadwalTemplate.api';
import { LogService } from '../../../utils/LogService';
import { Calendar, Clock, BookOpen, User, Info as InfoIcon, Save, X, RefreshCw } from 'lucide-react';

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: JadwalTemplate;
  kelasId?: string;
  tahunPelajaranId?: string;
  semesterId?: string;
}

export const JadwalTemplateForm: React.FC<Props> = ({ onSuccess, onCancel, initialData, kelasId, tahunPelajaranId, semesterId }) => {
  const [mapelOptions, setMapelOptions] = useState<{ value: string; label: string }[]>([]);
  const [guruOptions, setGuruOptions] = useState<{ value: string; label: string }[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [jenisOptions, setJenisOptions] = useState<Array<{ value: string; label: string; tipe: string }>>([]);
  
  const { control, handleSubmit, watch, setValue, formState: { isSubmitting } } = useForm<CreateJadwalPayload>({
    defaultValues: {
      hari: initialData?.hari || 'SENIN',
      jam_mulai: initialData?.jam_mulai || '07:00',
      jam_selesai: initialData?.jam_selesai || '08:30',
      jenis_kegiatan: initialData?.jenis_kegiatan || '',
      mapel_id: initialData?.mapel_id,
      guru_id: initialData?.guru_id,
      tahun_pelajaran_id: initialData?.tahun_pelajaran_id || tahunPelajaranId || '',
      semester_id: initialData?.semester_id || semesterId || '',
      kelas_id: initialData?.kelas_id || kelasId || '',
    }
  });

  const jenisKegiatan = watch('jenis_kegiatan');
  const selectedJenis = jenisOptions.find(opt => opt.value === jenisKegiatan);
  const tipe = (selectedJenis?.tipe || String(jenisKegiatan || '')).toUpperCase();

  useEffect(() => {
    const loadResources = async () => {
      setLoadingResources(true);
      try {
        const [mapelRes, guruRes, jenisRes] = await Promise.all([
          mapelApi.getAll({ limit: 100 }),
          guruApi.getAll({ limit: 100 }),
          jenisKegiatanMasterApi.getAll({ page: 1, limit: 100 })
        ]);
        
        setMapelOptions((mapelRes.data || []).map((m: any) => ({ value: m.id, label: `${m.nama_mapel} (${m.kode})` })));
        setGuruOptions((guruRes.data || []).map((g: any) => ({ value: g.id, label: g.nama_guru || g.User?.full_name || 'Guru' })));
        const jenisMaster: JenisKegiatanMaster[] = jenisRes.data || [];
        const filtered = jenisMaster
          .filter(j => j.aktif)
          .filter(j => String(j.tipe).toUpperCase() !== 'GERBANG');
        const opts = filtered.map(j => ({ value: j.id, label: j.nama, tipe: String(j.tipe) }));
        setJenisOptions(opts);
        
        if (initialData?.jenis_kegiatan) {
           const found = opts.find(o => o.value === initialData.jenis_kegiatan || o.tipe === initialData.jenis_kegiatan);
           if (found) {
             setValue('jenis_kegiatan', found.value as any);
           } else if (opts.length > 0) {
             setValue('jenis_kegiatan', opts[0].value as any);
           }
        } else if (!watch('jenis_kegiatan') && opts.length > 0) {
          setValue('jenis_kegiatan', opts[0].value as any);
        }
      } catch (err) {
        LogService.error('Failed to load resources', err);
      } finally {
        setLoadingResources(false);
      }
    };
    loadResources();
  }, []);

  const onSubmit = async (data: CreateJadwalPayload) => {
    setErrorMsg(null);
    try {
      const payload = { ...data };
      if (!payload.tahun_pelajaran_id || !payload.semester_id || !payload.kelas_id) {
        setErrorMsg('Konteks akademik belum siap.');
        return;
      }
      const currentJenis = jenisOptions.find(opt => opt.value === payload.jenis_kegiatan);
      const tipeNow = String(currentJenis?.tipe || '').toUpperCase();
      
      if (['APEL', 'DUHA', 'PEMBIASAAN', 'UPACARA'].includes(tipeNow)) {
        delete payload.mapel_id;
        delete payload.guru_id;
      } else if (tipeNow === 'JURUSAN') {
        if (!payload.guru_id) {
          setErrorMsg('Guru wajib diisi untuk kegiatan JURUSAN');
          return;
        }
      } else if (tipeNow.startsWith('KBM')) {
        if (!payload.mapel_id || !payload.guru_id) {
          setErrorMsg('Mapel dan Guru wajib diisi untuk KBM');
          return;
        }
      }

      if (initialData?.id) {
        await updateJadwalTemplate(initialData.id, payload);
      } else {
        await createJadwalTemplate(payload);
      }
      
      onSuccess();
    } catch (err: any) {
      LogService.error('Failed to save jadwal', err);
      const msg = err.response?.data?.message || 'Gagal menyimpan jadwal.';
      if (err.response?.data?.error?.code === 'KELAS_CONFLICT') {
        setErrorMsg(`Gagal: Kelas sudah ada jadwal di jam tersebut.`);
      } else if (err.response?.data?.error?.code === 'GURU_CONFLICT') {
        setErrorMsg(`Gagal: Guru yang dipilih sedang mengajar di kelas lain.`);
      } else {
        setErrorMsg(msg);
      }
    }
  };

  if (loadingResources) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {errorMsg && (
          <Alert variant="destructive">
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Hari */}
            <div className="space-y-2 group">
              <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                Hari Pelaksanaan <span className="text-rose-500">*</span>
              </Label>
              <Controller
                name="hari"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    value={field.value}
                    onValueChange={field.onChange}
                    options={['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'].map(d => ({ value: d, label: d }))}
                    placeholder="Pilih Hari"
                    triggerClassName="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                )}
              />
            </div>
            
            {/* Jenis Kegiatan */}
            <div className="space-y-2 group">
              <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                Jenis Kegiatan <span className="text-rose-500">*</span>
              </Label>
              <Controller
                name="jenis_kegiatan"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    value={field.value}
                    onValueChange={field.onChange}
                    options={jenisOptions}
                    placeholder="Pilih Jenis"
                    triggerClassName="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                )}
              />
            </div>

            {/* Waktu */}
            <div className="space-y-2 group">
              <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                Jam Mulai <span className="text-rose-500">*</span>
              </Label>
              <Controller
                name="jam_mulai"
                control={control}
                render={({ field }) => (
                  <Input type="time" {...field} className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl" />
                )}
              />
            </div>
            <div className="space-y-2 group">
              <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                Jam Selesai <span className="text-rose-500">*</span>
              </Label>
              <Controller
                name="jam_selesai"
                control={control}
                render={({ field }) => (
                  <Input type="time" {...field} className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl" />
                )}
              />
            </div>

            {/* Conditional Fields for KBM/JURUSAN */}
            {String(tipe).toUpperCase().startsWith('KBM') && (
              <>
                <div className="space-y-2 md:col-span-2 group">
                  <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                    Mata Pelajaran <span className="text-rose-500">*</span>
                  </Label>
                  <Controller
                    name="mapel_id"
                    control={control}
                    render={({ field }) => (
                      <SearchableSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        options={mapelOptions}
                        placeholder="Pilih Mata Pelajaran"
                        triggerClassName="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
                      />
                    )}
                  />
                </div>

                <div className="space-y-2 md:col-span-2 group">
                  <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                    Guru Pengajar <span className="text-rose-500">*</span>
                  </Label>
                  <Controller
                    name="guru_id"
                    control={control}
                    render={({ field }) => (
                      <SearchableSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        options={guruOptions}
                        placeholder="Pilih Guru Pengajar"
                        triggerClassName="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
                      />
                    )}
                  />
                </div>
              </>
            )}
            
            {String(tipe).toUpperCase() === 'JURUSAN' && (
              <div className="space-y-2 md:col-span-2 group">
                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                  Guru Penanggung Jawab <span className="text-rose-500">*</span>
                </Label>
                <Controller
                  name="guru_id"
                  control={control}
                  render={({ field }) => (
                    <SearchableSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      options={guruOptions}
                      placeholder="Pilih Guru Penanggung Jawab"
                      triggerClassName="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
                    />
                  )}
                />
              </div>
            )}
          </div>
        </div>

        <ModalFooter className="mt-4 pt-6 border-t border-slate-100 dark:border-slate-800 gap-3">
          <Button
            type="button"
            variant="toolbarOutline"
            size="toolbar"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            <X className="w-3.5 h-3.5 mr-2" />
            Batalkan
          </Button>
          <Button
            type="submit"
            variant="toolbarPrimary"
            size="toolbar"
            disabled={isSubmitting}
            className="px-8"
          >
            {isSubmitting ? (
              <RefreshCw size={14} className="mr-2 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 mr-2" />
            )}
            Simpan Jadwal
          </Button>
        </ModalFooter>
      </form>
    </div>
  );
};
