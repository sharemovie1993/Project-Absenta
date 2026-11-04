import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Button,
  Input,
  SearchableSelect,
} from '@/components/ui';
import { useGuruOptions, useMapelOptions } from '@/components/common';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import { kurikulumApi } from '@/api/kurikulum.api';
import { useAuthStore } from '@/store/authStore';
import { useCapabilities } from '@/hooks/useCapabilities';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { CbtBankSoal } from '@/types/cbt.types';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { cn } from '@/lib/utils';

interface CbtBankSoalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankSoalToEdit?: CbtBankSoal | null;
  onSuccess: () => void;
  defaultGuruId?: string;
  defaultMapelId?: string;
}

const bankSoalSchema = z.object({
  kode_bank: z.string().min(2, 'Kode bank soal minimal 2 karakter').max(50),
  judul: z.string().min(3, 'Judul bank soal minimal 3 karakter').max(200),
  guru_id: z.string().min(1, 'Guru pembuat soal wajib dipilih'),
  mapel_id: z.string().min(1, 'Mata pelajaran wajib dipilih'),
  tingkat: z.enum(['X', 'XI', 'XII', 'SEMUA']),
  alokasi_menit: z.number().int().min(10, 'Alokasi durasi minimal 10 menit').max(300),
});

export const CbtBankSoalFormModal: React.FC<CbtBankSoalFormModalProps> = ({
  isOpen,
  onClose,
  bankSoalToEdit,
  onSuccess,
  defaultGuruId,
  defaultMapelId,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { isAdmin, isKurikulum } = useCapabilities();

  // Kunci pemilihan guru jika user yang login adalah guru biasa (bukan Admin / Kurikulum)
  const isTeacherLocked = useMemo(() => {
    if (isAdmin || isKurikulum) return false;
    return Boolean(defaultGuruId || user?.guru_profile?.id);
  }, [isAdmin, isKurikulum, defaultGuruId, user?.guru_profile?.id]);

  const initialGuruId = useMemo(() => {
    return defaultGuruId || user?.guru_profile?.id || '';
  }, [defaultGuruId, user?.guru_profile?.id]);

  const { options: guruOptions, loading: guruLoading } = useGuruOptions();
  const { options: mapelOptions, loading: mapelLoading } = useMapelOptions();

  const [kodeBank, setKodeBank] = useState('');
  const [judul, setJudul] = useState('');
  const [guruId, setGuruId] = useState(initialGuruId);
  const [mapelId, setMapelId] = useState(defaultMapelId || '');
  const [tingkat, setTingkat] = useState<'X' | 'XI' | 'XII' | 'SEMUA'>('X');
  const [alokasiMenit, setAlokasiMenit] = useState<number>(90);
  const [acakSoal, setAcakSoal] = useState(true);
  const [acakOpsi, setAcakOpsi] = useState(true);
  const [showAllMapels, setShowAllMapels] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ambil data penugasan mapel guru yang sedang dipilih
  const { data: teacherAssignedMapels, isLoading: isAssignedMapelsLoading } = useQuery({
    queryKey: ['guru-assigned-mapels', guruId],
    queryFn: () => (guruId ? kurikulumApi.getGuruMapel(guruId).catch(() => null) : null),
    enabled: isOpen && !!guruId,
  });

  // Ekstrak daftar unik mapel yang diampu guru
  const assignedMapels = useMemo(() => {
    const list = teacherAssignedMapels?.data || [];
    const map = new Map<string, { value: string; label: string }>();
    list.forEach((item: any) => {
      const id = item.mapel_id || item.Mapel?.id;
      if (id && !map.has(id)) {
        const canonical = mapelOptions.find((m) => m.value === id);
        const label = canonical?.label || item.Mapel?.nama_mapel || id;
        map.set(id, { value: id, label });
      }
    });
    return Array.from(map.values());
  }, [teacherAssignedMapels?.data, mapelOptions]);

  // Opsi mapel aktif (difilter hanya mapel yang diampu, atau semua jika dipilih/fallback)
  const activeMapelOptions = useMemo(() => {
    let base = showAllMapels || assignedMapels.length === 0 ? mapelOptions : assignedMapels;
    
    // Pastikan jika sedang edit, mapel yang sudah tersimpan tetap muncul di daftar opsi
    if (mapelId && !base.some((m) => m.value === mapelId)) {
      const canonical = mapelOptions.find((m) => m.value === mapelId);
      if (canonical) {
        base = [canonical, ...base];
      }
    }
    return base;
  }, [showAllMapels, assignedMapels, mapelOptions, mapelId]);

  // Inisialisasi form saat buka modal atau ganti mode edit
  useEffect(() => {
    if (bankSoalToEdit) {
      setKodeBank(bankSoalToEdit.kode_bank);
      setJudul(bankSoalToEdit.judul);
      setGuruId(bankSoalToEdit.guru_id);
      setMapelId(bankSoalToEdit.mapel_id);
      setTingkat(bankSoalToEdit.tingkat);
      setAlokasiMenit(bankSoalToEdit.alokasi_menit);
      setAcakSoal(bankSoalToEdit.acak_soal);
      setAcakOpsi(bankSoalToEdit.acak_opsi);
      setShowAllMapels(false);
    } else {
      setKodeBank(`CBT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
      setJudul('');
      setGuruId(initialGuruId);
      setMapelId(defaultMapelId || '');
      setTingkat('X');
      setAlokasiMenit(90);
      setAcakSoal(true);
      setAcakOpsi(true);
      setShowAllMapels(false);
    }
  }, [bankSoalToEdit, initialGuruId, defaultMapelId, isOpen]);

  // Auto-select mapel jika guru hanya mengampu 1 mapel
  useEffect(() => {
    if (!isOpen || bankSoalToEdit) return;

    if (!showAllMapels && assignedMapels.length === 1) {
      setMapelId(assignedMapels[0].value);
    } else if (!showAllMapels && assignedMapels.length > 1) {
      // Jika mapel saat ini bukan salah satu mapel diampu guru
      if (mapelId && !assignedMapels.some((m) => m.value === mapelId)) {
        setMapelId('');
      }
    }
  }, [isOpen, bankSoalToEdit, assignedMapels, showAllMapels]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = bankSoalSchema.safeParse({
      kode_bank: kodeBank.trim().toUpperCase(),
      judul: judul.trim(),
      guru_id: guruId,
      mapel_id: mapelId,
      tingkat,
      alokasi_menit: Number(alokasiMenit),
    });

    if (!validation.success) {
      toast.error(validation.error.errors.map((err) => err.message).join(', '));
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        kode_bank: kodeBank.trim().toUpperCase(),
        judul: judul.trim(),
        guru_id: guruId,
        mapel_id: mapelId,
        tingkat,
        alokasi_menit: Number(alokasiMenit),
        acak_soal: acakSoal,
        acak_opsi: acakOpsi,
      };

      if (bankSoalToEdit) {
        await cbtApi.updateBankSoal(bankSoalToEdit.id, payload);
        toast.success('Bank soal berhasil diperbarui');
      } else {
        await cbtApi.createBankSoal(payload);
        toast.success('Bank soal berhasil dibuat');
      }

      // 🛡️ Invalidate Cache secara agresif & refetch aktif (standar industri)
      await queryClient.invalidateQueries({
        queryKey: cbtQueryKeys.bankSoal(),
        exact: false,
        refetchType: 'all',
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan bank soal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={bankSoalToEdit ? 'Edit Paket Bank Soal' : 'Buat Paket Bank Soal Baru'}
      size="md"
    >
      <div className="-mt-3 sm:-mt-6 -mx-3 sm:-mx-6 mb-3 sm:mb-4 h-1.5 bg-[#673ab7]" />
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Pertanyaan Guru (Hanya tampil jika Admin / Kurikulum) */}
        {!isTeacherLocked && (
          <div className="space-y-1.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
            <label htmlFor="form-guru" className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              Siapa guru pembuat soalnya?
            </label>
            <SearchableSelect
              id="form-guru"
              options={guruOptions}
              value={guruId}
              onChange={(newGuruId) => {
                setGuruId(newGuruId);
                setMapelId('');
                setShowAllMapels(false);
              }}
              placeholder={guruLoading ? 'Memuat guru...' : 'Pilih guru...'}
              aria-label="Pilih Guru Pengampu"
            />
          </div>
        )}

        {/* Pertanyaan 1: Mata Pelajaran */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="form-mapel" className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Untuk mata pelajaran apa?
            </label>
            {assignedMapels.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAllMapels((prev) => !prev)}
                className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
              >
                {showAllMapels ? 'Mapel Saya' : 'Semua Mapel'}
              </button>
            )}
          </div>

          <SearchableSelect
            id="form-mapel"
            options={activeMapelOptions}
            value={mapelId}
            onChange={setMapelId}
            placeholder={
              isAssignedMapelsLoading || mapelLoading
                ? 'Memuat mata pelajaran...'
                : activeMapelOptions.length === 0
                ? 'Tidak ada mapel tersedia'
                : 'Pilih mata pelajaran...'
            }
            aria-label="Pilih Mata Pelajaran"
          />
        </div>

        {/* Pertanyaan 2: Tingkat / Jenjang Kelas */}
        <div className="space-y-1.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Untuk kelas tingkat berapa?
          </p>
          <div className="grid grid-cols-4 gap-2">
            {(
              [
                { value: 'X', label: 'Kelas X' },
                { value: 'XI', label: 'Kelas XI' },
                { value: 'XII', label: 'Kelas XII' },
                { value: 'SEMUA', label: 'Semua' },
              ] as { value: 'X' | 'XI' | 'XII' | 'SEMUA'; label: string }[]
            ).map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setTingkat(item.value)}
                className={cn(
                  'py-2 px-2 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center',
                  tingkat === item.value
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-violet-300'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pertanyaan 3: Judul Bank Soal */}
        <div className="space-y-1.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
          <label htmlFor="form-judul-bank" className="block text-xs font-bold text-slate-800 dark:text-slate-200">
            Apa judul paket soal ini?
          </label>
          <Input
            id="form-judul-bank"
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
            placeholder="Contoh: PAS Matematika Ganjil"
            aria-label="Judul Bank Soal"
            required
          />
        </div>

        {/* Pertanyaan 4: Pengacakan Soal & Opsi */}
        <div className="space-y-1.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Acak urutan soal & pilihan jawaban?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setAcakSoal(true);
                setAcakOpsi(true);
              }}
              className={cn(
                'py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center',
                acakSoal
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              )}
            >
              Ya
            </button>

            <button
              type="button"
              onClick={() => {
                setAcakSoal(false);
                setAcakOpsi(false);
              }}
              className={cn(
                'py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center',
                !acakSoal
                  ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              )}
            >
              Tidak
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSubmitting}
            className="bg-[#673ab7] hover:bg-[#5e35b1] text-white font-bold"
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
