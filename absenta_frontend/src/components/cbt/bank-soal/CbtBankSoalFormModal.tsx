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
import { BookOpen, CheckCircle2, Lock } from 'lucide-react';

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
      <div className="-mt-3 sm:-mt-6 -mx-3 sm:-mx-6 mb-3 sm:mb-4 h-2 bg-[#673ab7]" />
      <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
        {/* Kode & Tingkat */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="form-kode-bank" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Kode Bank Soal <span className="text-rose-500">*</span>
            </label>
            <Input
              id="form-kode-bank"
              value={kodeBank}
              onChange={(e) => setKodeBank(e.target.value.toUpperCase())}
              placeholder="Contoh: CBT-MAT-X-01"
              aria-label="Kode Bank Soal"
              required
            />
          </div>

          <div>
            <label htmlFor="form-tingkat" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tingkat / Jenjang <span className="text-rose-500">*</span>
            </label>
            <select
              id="form-tingkat"
              value={tingkat}
              onChange={(e) => setTingkat(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 h-9"
              aria-label="Tingkat Kelas"
            >
              <option value="X">Kelas X</option>
              <option value="XI">Kelas XI</option>
              <option value="XII">Kelas XII</option>
              <option value="SEMUA">Semua Tingkat</option>
            </select>
          </div>
        </div>

        {/* Judul Bank Soal */}
        <div>
          <label htmlFor="form-judul-bank" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Judul Bank Soal <span className="text-rose-500">*</span>
          </label>
          <Input
            id="form-judul-bank"
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
            placeholder="Contoh: Penilaian Akhir Semester (PAS) Matematika Terapan"
            aria-label="Judul Bank Soal"
            required
          />
        </div>

        {/* Mata Pelajaran & Guru */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <label htmlFor="form-mapel" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Mata Pelajaran <span className="text-rose-500">*</span>
              </label>
              {assignedMapels.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/60">
                    <BookOpen className="w-2.5 h-2.5" />
                    {showAllMapels ? 'Semua Mapel Sekolah' : `${assignedMapels.length} Mapel Diampu`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAllMapels((prev) => !prev)}
                    className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                  >
                    {showAllMapels ? `(Batasi ke ${assignedMapels.length} Mapel Diampu)` : `(Buka Semua Mapel)`}
                  </button>
                </div>
              )}
            </div>

            <SearchableSelect
              id="form-mapel"
              options={activeMapelOptions}
              value={mapelId}
              onChange={setMapelId}
              placeholder={
                isAssignedMapelsLoading || mapelLoading
                  ? 'Memuat mapel diampu...'
                  : activeMapelOptions.length === 0
                  ? 'Tidak ada mapel tersedia'
                  : 'Pilih Mata Pelajaran'
              }
              aria-label="Pilih Mata Pelajaran"
            />

            {/* Helper status interaktif */}
            {assignedMapels.length === 1 && !showAllMapels && (
              <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Otomatis terisi sesuai 1 mata pelajaran yang Anda ampu di sekolah.</span>
              </p>
            )}
            {assignedMapels.length === 0 && !isAssignedMapelsLoading && guruId && (
              <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                ⚠️ Guru ini belum memiliki jadwal ploting mapel di kurikulum. Menampilkan seluruh mapel.
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <label htmlFor="form-guru" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Guru Pembuat / Pengampu <span className="text-rose-500">*</span>
              </label>
              {isTeacherLocked && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  <Lock className="w-2.5 h-2.5" />
                  Terkunci ke profil Anda
                </span>
              )}
            </div>
            <SearchableSelect
              id="form-guru"
              options={guruOptions}
              value={guruId}
              onChange={(newGuruId) => {
                if (!isTeacherLocked) {
                  setGuruId(newGuruId);
                  setMapelId('');
                  setShowAllMapels(false);
                }
              }}
              disabled={isTeacherLocked}
              placeholder={guruLoading ? 'Memuat guru...' : 'Pilih Guru Pengampu'}
              aria-label="Pilih Guru Pengampu"
            />
          </div>
        </div>

        {/* Durasi & Pengacakan */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
          <div>
            <label htmlFor="form-alokasi" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Alokasi Waktu Default (Menit) <span className="text-rose-500">*</span>
            </label>
            <Input
              id="form-alokasi"
              type="number"
              min={10}
              max={300}
              value={alokasiMenit}
              onChange={(e) => setAlokasiMenit(Number(e.target.value))}
              aria-label="Alokasi Durasi Pengerjaan"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={acakSoal}
                onChange={(e) => setAcakSoal(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                aria-label="Acak Urutan Soal"
              />
              <span>Acak Urutan Soal</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={acakOpsi}
                onChange={(e) => setAcakOpsi(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                aria-label="Acak Opsi Pilihan (A-E)"
              />
              <span>Acak Opsi Jawaban</span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
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
            {isSubmitting ? 'Menyimpan...' : bankSoalToEdit ? 'Simpan Perubahan' : 'Buat Bank Soal'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
