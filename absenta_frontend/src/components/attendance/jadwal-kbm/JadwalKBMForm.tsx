import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { Button, Input, Label, Alert, AlertDescription, ModalFooter, Loader } from '../../ui';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { mapelApi, guruApi } from '../../../api/academic.api';
import { jenisKegiatanMasterApi, type JenisKegiatanMaster } from '../../../api/academic/jenisKegiatanMaster.api';
import {
  createJadwalKBM,
  updateJadwalKBM,
  type CreateJadwalPayload,
  type JadwalKBM
} from '../../../api/attendance/jadwalKBM.api';
import { getMyTenant } from '../../../api/tenants.api';
import { LogService } from '../../../utils/LogService';
import { HARI_LIST } from '../../../constants/day.constants';
import { Calendar, Clock, BookOpen, User, Info as InfoIcon, Save, X, RefreshCw } from 'lucide-react';

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: JadwalKBM;
  kelasId?: string;
  tahunPelajaranId?: string;
  semesterId?: string;
}

export const JadwalKBMForm: React.FC<Props> = React.memo(({ onSuccess, onCancel, initialData, kelasId, tahunPelajaranId, semesterId }) => {
  const queryClient = useQueryClient();
  const [mapelOptions, setMapelOptions] = useState<{ value: string; label: string }[]>([]);
  const [guruOptions, setGuruOptions] = useState<{ value: string; label: string }[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [jenisOptions, setJenisOptions] = useState<Array<{ value: string; label: string; tipe: string }>>([]);
  const [shiftJamPelajaran, setShiftJamPelajaran] = useState<any>(null);

  useEffect(() => {
    const fetchTenantShift = async () => {
      try {
        const tenantRes = await getMyTenant();
        if (tenantRes?.success && tenantRes.data?.shift_jam_pelajaran) {
          setShiftJamPelajaran(tenantRes.data.shift_jam_pelajaran);
        }
      } catch (err) {
        console.error('Failed to load shift jam pelajaran config:', err);
      }
    };
    fetchTenantShift();
  }, []);

  const resolveSlotTime = (slotIndex: number): { start: string; end: string } => {
    const targetKelasId = initialData?.kelas_id || kelasId || '';
    if (shiftJamPelajaran && targetKelasId) {
      const assignedShiftId = shiftJamPelajaran.class_assignments?.[targetKelasId] || 'pagi';
      const shift = shiftJamPelajaran.shifts?.find((s: any) => s.id === assignedShiftId) || shiftJamPelajaran.shifts?.[0];
      if (shift) {
        const slot = shift.slots?.find((sl: any) => sl.slot === slotIndex);
        if (slot) {
          return { start: slot.start, end: slot.end };
        }
      }
    }
    const SLOT_TIME: Record<number, { start: string; end: string }> = {
      1: { start: "07:00", end: "07:45" },
      2: { start: "07:45", end: "08:30" },
      3: { start: "08:30", end: "09:15" },
      4: { start: "09:35", end: "10:20" },
      5: { start: "10:20", end: "11:05" },
      6: { start: "11:05", end: "11:50" },
      7: { start: "12:30", end: "13:15" },
      8: { start: "13:15", end: "14:00" },
      9: { start: "14:00", end: "14:45" },
      10: { start: "14:45", end: "15:30" },
    };
    return SLOT_TIME[slotIndex] || { start: "07:00", end: "07:45" };
  };
  
  const { control, handleSubmit, watch, setValue, formState: { isSubmitting } } = useForm<CreateJadwalPayload>({
    defaultValues: {
      hari: initialData?.hari || 'SENIN',
      slot_index: initialData?.slot_index || 1,
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
          guruApi.getAll({ limit: 100, jenis_ptk: 'PENDIDIK' }),
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
      
      // Resolve times from slot_index
      const times = resolveSlotTime(Number(payload.slot_index || 1));
      payload.jam_mulai = times.start;
      payload.jam_selesai = times.end;
      payload.slot_index = Number(payload.slot_index || 1);

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
        await updateJadwalKBM(initialData.id, payload);
      } else {
        await createJadwalKBM(payload);
      }
      
      queryClient.invalidateQueries({ queryKey: ['jadwal-kbm-grid'] });
      queryClient.invalidateQueries({ queryKey: ['jadwal-guru-timeline'] });

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
                    options={HARI_LIST.map(d => ({ value: d.value, label: `${d.label} (${d.value})` }))}
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

            {/* Jam Pelajaran (Slot Index) */}
            <div className="space-y-2 group md:col-span-2">
              <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                Jam Pelajaran <span className="text-rose-500">*</span>
              </Label>
              <Controller
                name="slot_index"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    value={String(field.value || 1)}
                    onValueChange={(val) => field.onChange(Number(val))}
                    options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `Jam Pelajaran Ke-${i + 1}` }))}
                    placeholder="Pilih Jam Pelajaran"
                    triggerClassName="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                )}
              />
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                <span>Waktu Terhitung: <strong className="text-slate-700 dark:text-slate-250 font-black">{resolveSlotTime(Number(watch('slot_index') || 1)).start} - {resolveSlotTime(Number(watch('slot_index') || 1)).end}</strong></span>
              </div>
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
});
