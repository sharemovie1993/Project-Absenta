import React, { useEffect, useState } from 'react';
import { BookOpen, Info as InfoIcon, Hash, Layers } from 'lucide-react';
import { Input } from '../../../ui/Input';
import { Label } from '../../../ui/Label';
import { SectionCard, DetailRow } from './FormShared';
import { getProgramKeahlianList, createProgramKeahlian } from '../../../../api/academic/program-keahlian.api';
import { getGlobalPresets } from '../../../../api/academic/jurusan-presets.api';
import type { ProgramKeahlian } from '../../../../types/academic';
import toast from 'react-hot-toast';

interface JurusanInfoSectionProps {
  register: any;
  errors: any;
  isViewMode: boolean;
  watch: any;
  setValue?: any;
}

export const JurusanInfoSection = React.memo<JurusanInfoSectionProps>(({
  register,
  errors,
  isViewMode,
  watch,
  setValue,
}) => {
  const [programKeahlianList, setProgramKeahlianList] = useState<ProgramKeahlian[]>([]);
  const selectedPKId = watch('program_keahlian_id');
  const selectedPK = programKeahlianList.find(p => p.id === selectedPKId);

  const [presets, setPresets] = useState<any[]>([]);

  useEffect(() => {
    getProgramKeahlianList(1, 100).then(res => setProgramKeahlianList(res.data)).catch(() => {});
    
    getGlobalPresets()
      .then(res => {
        if (res.success && res.data) {
          const flat: any[] = [];
          res.data.forEach(prog => {
            if (prog.jurusans) {
              prog.jurusans.forEach(jur => {
                flat.push({
                  id: jur.id,
                  nama: jur.nama,
                  kode: jur.kode,
                  singkatan: jur.singkatan,
                  program_nama: prog.nama,
                  program_kode: prog.kode,
                  program_singkatan: prog.singkatan,
                  bidang_keahlian: prog.bidang_keahlian
                });
              });
            }
          });
          setPresets(flat);
        }
      })
      .catch(err => console.error('Failed to load global presets in form:', err));
  }, []);

  useEffect(() => {
    if (setValue && selectedPKId && programKeahlianList.length > 0) {
      setValue('program_keahlian_id', selectedPKId);
    }
  }, [programKeahlianList, selectedPKId, setValue]);


  if (isViewMode) {
    return (
      <SectionCard title="Informasi Jurusan (Konsentrasi Keahlian)" icon={BookOpen}>
        <DetailRow icon={<BookOpen size={16} />} label="Nama Konsentrasi Keahlian" value={watch('nama')} />
        <DetailRow icon={<Hash size={16} />} label="Singkatan" value={watch('singkatan') || '-'} />
        <DetailRow icon={<Hash size={16} />} label="Kode Internal" value={watch('kode') || '-'} />
        <DetailRow
          icon={<Layers size={16} />}
          label="Program Keahlian"
          value={selectedPK ? `${selectedPK.nama}${selectedPK.bidang_keahlian ? ` (${selectedPK.bidang_keahlian})` : ''}` : '-'}
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Informasi Jurusan (Konsentrasi Keahlian)" icon={BookOpen}>
      {/* Option to load from Global Preset (Autofill) */}
      {!isViewMode && presets.length > 0 && (
        <div className="space-y-2 md:col-span-2 p-4 bg-violet-50/40 dark:bg-violet-950/15 rounded-2xl border border-violet-100 dark:border-violet-900/40 mb-2">
          <label className="text-[11px] font-bold text-violet-750 dark:text-violet-300 uppercase tracking-wider block mb-1">
            🚀 Preset Konsentrasi Keahlian (Autofill Cepat)
          </label>
          <select
            onChange={(e) => {
              const selectedPresetId = e.target.value;
              if (selectedPresetId) {
                const preset = presets.find(p => p.id === selectedPresetId);
                if (preset && setValue) {
                  setValue('nama', preset.nama);
                  setValue('singkatan', preset.singkatan || '');
                  setValue('kode', preset.kode || '');
                  
                  const matchedPK = programKeahlianList.find(
                    pk => pk.nama.toUpperCase() === preset.program_nama.toUpperCase() ||
                          (pk.kode && pk.kode.toUpperCase() === preset.program_kode.toUpperCase())
                  );
                  if (matchedPK) {
                    setValue('program_keahlian_id', matchedPK.id);
                    toast.success(`Autofill berhasil untuk jurusan ${preset.nama}`);
                  } else {
                    // Create Program Keahlian automatically in the background
                    const toastId = toast.loading(`Mendaftarkan Program Keahlian induk "${preset.program_nama}" otomatis...`);
                    createProgramKeahlian({
                      nama: preset.program_nama,
                      kode: preset.program_kode || null,
                      singkatan: preset.program_singkatan || null,
                      bidang_keahlian: preset.bidang_keahlian || null
                    }).then(newPKRes => {
                      toast.dismiss(toastId);
                      if (newPKRes && newPKRes.data) {
                        const newPK = newPKRes.data;
                        // Add new PK to local select options state
                        setProgramKeahlianList(prev => [...prev, newPK]);
                        // Set the value
                        setValue('program_keahlian_id', newPK.id);
                        toast.success(`Autofill berhasil! Program Keahlian "${newPK.nama}" otomatis didaftarkan.`);
                      } else {
                        toast.error("Gagal mendaftarkan Program Keahlian induk otomatis.");
                      }
                    }).catch(err => {
                      toast.dismiss(toastId);
                      console.error("Auto PK creation failed:", err);
                      toast.error("Gagal mendaftarkan Program Keahlian induk otomatis.");
                    });
                  }
                }
              }
            }}
            className="w-full h-10 px-3 text-[12px] font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-400"
          >
            <option value="">— Pilih Preset Konsentrasi Keahlian —</option>
            {presets.map(p => (
              <option key={p.id} value={p.id}>
                {p.nama} ({p.program_nama} · {p.bidang_keahlian})
              </option>
            ))}
          </select>
          <p className="text-[9px] text-slate-500 italic mt-1">
            * Memilih salah satu preset akan mengisi otomatis semua field di bawah. Anda masih bisa mengeditnya secara manual.
          </p>
        </div>
      )}

      {/* Nama */}
      <div className="space-y-2 md:col-span-2 group">
        <div className="flex items-center justify-between px-1">
          <Label htmlFor="nama" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
            Nama Konsentrasi Keahlian <span className="text-rose-500">*</span>
          </Label>
          <div className="flex items-center gap-1.5">
            <InfoIcon className="w-3 h-3 text-blue-400" />
            <p className="text-[9px] text-blue-500 font-medium italic">Tampil di Ijazah & Transkrip</p>
          </div>
        </div>
        <Input
          id="nama"
          {...register('nama')}
          list="preset-jurusans-list"
          placeholder="Contoh: Teknik Komputer Jaringan..."
          disabled={isViewMode}
          className={`h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl ${errors.nama ? 'border-red-500 focus:ring-red-500/20' : ''}`}
        />
        <datalist id="preset-jurusans-list">
          {presets.map(p => (
            <option key={p.id} value={p.nama}>
              {p.program_nama} · {p.bidang_keahlian}
            </option>
          ))}
        </datalist>
        {errors.nama && <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.nama.message}</p>}
      </div>

      {/* Program Keahlian (Parent) */}
      <div className="space-y-2 md:col-span-2 group">
        <div className="flex items-center justify-between px-1">
          <Label htmlFor="program_keahlian_id" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
            Program Keahlian (Induk)
          </Label>
          <div className="flex items-center gap-1.5">
            <InfoIcon className="w-3 h-3 text-violet-400" />
            <p className="text-[9px] text-violet-500 font-medium italic">Tampil di Ijazah &amp; digunakan untuk pemetaan kenaikan kelas</p>
          </div>
        </div>
        <select
          id="program_keahlian_id"
          {...register('program_keahlian_id')}
          disabled={isViewMode}
          className="w-full h-10 px-3 text-[12px] font-semibold rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-all"
        >
          <option value="">— Pilih Program Keahlian —</option>
          {programKeahlianList.map(pk => (
            <option key={pk.id} value={pk.id}>
              {pk.nama}{pk.bidang_keahlian ? ` · ${pk.bidang_keahlian}` : ''}
            </option>
          ))}
        </select>
        {programKeahlianList.length === 0 && (
          <p className="text-[9px] text-amber-500 font-medium px-1">
            ⚠ Belum ada Program Keahlian. Buat dulu di menu Data Program Keahlian.
          </p>
        )}
      </div>

      {/* Singkatan */}
      <div className="space-y-2 md:col-span-2 group">
        <div className="flex items-center justify-between px-1">
          <Label htmlFor="singkatan" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
            Singkatan <span className="text-rose-500">*</span>
          </Label>
          <div className="flex items-center gap-1.5">
            <InfoIcon className="w-3 h-3 text-blue-400" />
            <p className="text-[9px] text-blue-500 font-medium italic">Tampil di Diagram &amp; Nama Kelas (Contoh: TKJ)</p>
          </div>
        </div>
        <Input
          id="singkatan"
          {...register('singkatan', {
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
              e.target.value = e.target.value.toUpperCase();
            }
          })}
          placeholder="Entry Singkatan (Contoh: TKJ)..."
          disabled={isViewMode}
          className={`h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl ${errors.singkatan ? 'border-red-500 focus:ring-red-500/20' : ''}`}
        />
        {errors.singkatan && <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.singkatan.message}</p>}
      </div>

      {/* Kode Internal */}
      <div className="space-y-2 md:col-span-2 group opacity-80">
        <div className="flex items-center justify-between px-1">
          <Label htmlFor="kode" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
            Kode Internal / Dapodik
          </Label>
          <div className="flex items-center gap-1.5">
            <InfoIcon className="w-3 h-3 text-slate-400" />
            <p className="text-[9px] text-slate-500 font-medium italic">Opsional</p>
          </div>
        </div>
        <Input
          id="kode"
          {...register('kode')}
          placeholder="Entry Kode Internal (opsional)..."
          disabled={isViewMode}
          className={`h-10 text-[13px] font-bold tracking-tight bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl ${errors.kode ? 'border-red-500 focus:ring-red-500/20' : ''}`}
        />
        {errors.kode && <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.kode.message}</p>}
      </div>
    </SectionCard>
  );
});

JurusanInfoSection.displayName = 'JurusanInfoSection';
