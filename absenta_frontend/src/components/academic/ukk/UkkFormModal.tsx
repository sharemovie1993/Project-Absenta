import React, { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Award, User, GraduationCap, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useGuruOptions } from '@/hooks/useGuruOptions';
import { raporApi } from '@/api/rapor.api';
import { hubinApi } from '@/api/hubin.api';
import { cn } from '@/lib/utils';

// Skema Validasi Zod (Pilar 25 Google Platform Standards)
const ukkFormSchema = z.object({
  siswa_id: z.string().min(1, 'Siswa wajib dipilih'),
  asesor_internal: z.string().max(255).optional().nullable(),
  asesor_eksternal: z.string().min(1, 'Asesor eksternal wajib diisi').max(255),
  mitra_industri_id: z.string().optional().nullable(),
  nilai_praktik: z.number().min(0, 'Min 0').max(100, 'Maks 100'),
  nilai_teori: z.number().min(0).max(100).optional().nullable(),
  predikat: z.string().min(1, 'Predikat wajib diisi'),
  nomor_sertifikat: z.string().min(1, 'Nomor sertifikat wajib diisi'),
  tanggal_terbit: z.string().min(1, 'Tanggal terbit wajib diisi'),
});

export interface UkkFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    id?: string;
    siswa_id: string;
    nama_siswa: string;
    nis?: string;
    kelas?: string;
    asesor_internal?: string | null;
    asesor_eksternal?: string;
    mitra_industri_id?: string | null;
    nilai_praktik?: number;
    nilai_teori?: number | null;
    predikat?: string;
    nomor_sertifikat?: string;
    tanggal_terbit?: string;
  } | null;
  onSuccess?: () => void;
}

export const UkkFormModal: React.FC<UkkFormModalProps> = ({
  isOpen,
  onClose,
  initialData,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  // Form State
  const [asesorInternal, setAsesorInternal] = useState('');
  const [asesorEksternal, setAsesorEksternal] = useState('');
  const [mitraIndustriId, setMitraIndustriId] = useState('');
  const [nilaiPraktik, setNilaiPraktik] = useState<string>('85');
  const [nilaiTeori, setNilaiTeori] = useState<string>('');
  const [predikat, setPredikat] = useState('Kompeten');
  const [nomorSertifikat, setNomorSertifikat] = useState('');
  const [tanggalTerbit, setTanggalTerbit] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch daftar mitra industri untuk pilihan asesor eksternal
  const { data: mitraRes } = useQuery({
    queryKey: ['mitra-options-ukk'],
    queryFn: () => hubinApi.getMitraList({ limit: 100 }).catch(() => null),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const mitraOptions = useMemo(() => {
    const list = mitraRes?.data?.list || mitraRes?.list || mitraRes?.data || [];
    return Array.isArray(list) ? list : [];
  }, [mitraRes]);

  // Hook Master Data Guru
  const { options: guruOptions, rawList: guruList, isLoading: isLoadingGuru } = useGuruOptions({
    jenisPtk: 'ALL',
    onlyActive: true,
  });

  const computedGuruOptions = useMemo(() => {
    if (!asesorInternal) return guruOptions;
    const exists = guruOptions.some(
      (opt) =>
        opt.value === asesorInternal ||
        opt.label.toLowerCase().includes(asesorInternal.toLowerCase())
    );
    if (!exists && asesorInternal) {
      return [{ value: asesorInternal, label: asesorInternal }, ...guruOptions];
    }
    return guruOptions;
  }, [guruOptions, asesorInternal]);

  const currentGuruValue = useMemo(() => {
    if (!asesorInternal) return '';
    const found = guruList.find(
      (g) => g.nama_guru === asesorInternal || g.id === asesorInternal
    );
    return found?.id || asesorInternal;
  }, [asesorInternal, guruList]);

  // Hitung predikat otomatis berdasarkan nilai praktik & teori
  const calculatePredikat = (praktik: number, teori?: number | null): string => {
    const finalScore =
      teori !== undefined && teori !== null && !isNaN(teori)
        ? praktik * 0.7 + teori * 0.3
        : praktik;

    if (finalScore >= 90) return 'Sangat Kompeten';
    if (finalScore >= 75) return 'Kompeten';
    if (finalScore >= 65) return 'Cukup Kompeten';
    return 'Belum Kompeten';
  };

  // Populate form saat initialData berubah
  useEffect(() => {
    if (initialData) {
      setAsesorInternal(initialData.asesor_internal || '');
      setAsesorEksternal(initialData.asesor_eksternal || '');
      setMitraIndustriId(initialData.mitra_industri_id || '');
      setNilaiPraktik(
        initialData.nilai_praktik !== undefined && initialData.nilai_praktik !== null
          ? String(initialData.nilai_praktik)
          : '85'
      );
      setNilaiTeori(
        initialData.nilai_teori !== undefined && initialData.nilai_teori !== null
          ? String(initialData.nilai_teori)
          : ''
      );
      setPredikat(initialData.predikat || 'Kompeten');
      setNomorSertifikat(
        initialData.nomor_sertifikat ||
          `UKK/${new Date().getFullYear()}/${initialData.nis || 'REG'}`
      );
      setTanggalTerbit(
        initialData.tanggal_terbit
          ? typeof initialData.tanggal_terbit === 'string'
            ? initialData.tanggal_terbit.split('T')[0]
            : new Date(initialData.tanggal_terbit).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      );
      setFormErrors({});
    }
  }, [initialData, isOpen]);

  // Handler perubahan nilai praktik untuk auto predikat
  const handlePraktikChange = (val: string) => {
    setNilaiPraktik(val);
    const numP = parseFloat(val);
    const numT = nilaiTeori ? parseFloat(nilaiTeori) : null;
    if (!isNaN(numP)) {
      setPredikat(calculatePredikat(numP, numT));
    }
  };

  const handleTeoriChange = (val: string) => {
    setNilaiTeori(val);
    const numP = parseFloat(nilaiPraktik);
    const numT = val ? parseFloat(val) : null;
    if (!isNaN(numP)) {
      setPredikat(calculatePredikat(numP, numT));
    }
  };

  // Mutation simpan nilai UKK
  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      return raporApi.upsertUkk(payload);
    },
    onSuccess: () => {
      toast.success('Nilai UKK berhasil disimpan');
      queryClient.invalidateQueries({ queryKey: ['kaprog-ukk-list'] });
      queryClient.invalidateQueries({ queryKey: ['kaprog-stats'] });
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Gagal menyimpan nilai UKK';
      toast.error(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialData?.siswa_id) return;

    const payload = {
      siswa_id: initialData.siswa_id,
      asesor_internal: asesorInternal.trim() || null,
      asesor_eksternal: asesorEksternal.trim(),
      mitra_industri_id: mitraIndustriId || null,
      nilai_praktik: parseFloat(nilaiPraktik) || 0,
      nilai_teori: nilaiTeori ? parseFloat(nilaiTeori) : null,
      predikat: predikat.trim(),
      nomor_sertifikat: nomorSertifikat.trim(),
      tanggal_terbit: tanggalTerbit,
    };

    const parseResult = ukkFormSchema.safeParse(payload);
    if (!parseResult.success) {
      const errors: Record<string, string> = {};
      parseResult.error.errors.forEach((err) => {
        if (err.path[0]) errors[String(err.path[0])] = err.message;
      });
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    mutation.mutate(payload);
  };

  if (!isOpen || !initialData) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      className="w-full max-w-[94vw] sm:max-w-lg max-h-[92vh] flex flex-col overflow-hidden"
      title={
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
              Input Nilai UKK
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Uji Kompetensi & Sertifikat Keahlian
            </p>
          </div>
        </div>
      }
    >
      <form
        onSubmit={handleSubmit}
        className="flex flex-col flex-1 overflow-hidden"
      >
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto max-h-[calc(92vh-125px)] no-scrollbar">
          {/* Profil Singkat Siswa */}
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {initialData.nama_siswa}
              </h4>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                <span>NIS: {initialData.nis || '-'}</span>
                <span>•</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {initialData.kelas || '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Nilai Praktik & Teori (2 Kolom di Desktop & HP) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Nilai Praktik <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={nilaiPraktik}
                onChange={(e) => handlePraktikChange(e.target.value)}
                placeholder="0 - 100"
                className={cn(
                  'w-full px-3 py-2 text-sm font-mono font-bold rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500',
                  formErrors.nilai_praktik ? 'border-rose-400' : 'border-slate-200 dark:border-slate-700'
                )}
              />
              {formErrors.nilai_praktik && (
                <p className="text-[10px] text-rose-500">{formErrors.nilai_praktik}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Nilai Teori <span className="text-slate-400 font-normal">(Opsional)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={nilaiTeori}
                onChange={(e) => handleTeoriChange(e.target.value)}
                placeholder="Opsional"
                className="w-full px-3 py-2 text-sm font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Predikat (Segmented Bar Ramping) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Predikat Kelulusan <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
              {[
                { id: 'Sangat Kompeten', label: 'Sangat' },
                { id: 'Kompeten', label: 'Kompeten' },
                { id: 'Cukup Kompeten', label: 'Cukup' },
                { id: 'Belum Kompeten', label: 'Belum' },
              ].map((p) => {
                const isActive = predikat === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPredikat(p.id)}
                    className={cn(
                      'py-1.5 px-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all text-center cursor-pointer truncate',
                      isActive
                        ? p.id === 'Belum Kompeten'
                          ? 'bg-rose-500 text-white shadow-xs'
                          : 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Asesor Internal & Eksternal (Responsif) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Asesor Guru (Internal Master)</span>
                {asesorInternal && (
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-normal truncate max-w-[140px]">
                    {asesorInternal}
                  </span>
                )}
              </label>
              <SearchableSelect
                value={currentGuruValue}
                onValueChange={(val) => {
                  const found = guruList.find((g) => g.id === val);
                  setAsesorInternal(found ? found.nama_guru : val);
                }}
                options={computedGuruOptions}
                placeholder="Pilih Guru Penguji Internal..."
                searchPlaceholder="Cari nama guru atau NIP..."
                isLoading={isLoadingGuru}
                clearable
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Asesor DUDI (Eksternal) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={asesorEksternal}
                onChange={(e) => setAsesorEksternal(e.target.value)}
                placeholder="Nama asesor industri / LSP"
                className={cn(
                  'w-full px-3 py-2 text-xs rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500',
                  formErrors.asesor_eksternal ? 'border-rose-400' : 'border-slate-200 dark:border-slate-700'
                )}
              />
              {formErrors.asesor_eksternal && (
                <p className="text-[10px] text-rose-500">{formErrors.asesor_eksternal}</p>
              )}
            </div>
          </div>

          {/* Mitra Industri DUDI */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Mitra Industri (DUDI)
            </label>
            <select
              value={mitraIndustriId}
              onChange={(e) => setMitraIndustriId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">-- Pilih Mitra DUDI (Opsional) --</option>
              {mitraOptions.map((m: any) => (
                <option key={m.id} value={m.id}>
                  {m.nama_mitra || m.nama} {m.bidang_usaha ? `(${m.bidang_usaha})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* No Sertifikat & Tanggal Terbit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                No. Sertifikat <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={nomorSertifikat}
                onChange={(e) => setNomorSertifikat(e.target.value)}
                placeholder="UKK/2026/001"
                className={cn(
                  'w-full px-3 py-2 text-xs font-mono rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500',
                  formErrors.nomor_sertifikat ? 'border-rose-400' : 'border-slate-200 dark:border-slate-700'
                )}
              />
              {formErrors.nomor_sertifikat && (
                <p className="text-[10px] text-rose-500">{formErrors.nomor_sertifikat}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Tanggal Terbit <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={tanggalTerbit}
                onChange={(e) => setTanggalTerbit(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-end gap-2 p-3 sm:p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={mutation.isPending}
            className="text-xs font-semibold rounded-xl cursor-pointer"
          >
            Batal
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={mutation.isPending}
            className="text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs"
          >
            {mutation.isPending ? 'Menyimpan...' : 'Simpan Nilai'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
