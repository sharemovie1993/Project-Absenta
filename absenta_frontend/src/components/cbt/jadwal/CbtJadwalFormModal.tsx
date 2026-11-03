import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Button,
  Input,
  SearchableSelect,
} from '@/components/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useKelasOptions, useTahunPelajaranOptions, useSemesterOptions } from '@/components/common';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import { kurikulumApi } from '@/api/kurikulum.api';
import { useAuthStore } from '@/store/authStore';
import { useCapabilities } from '@/hooks/useCapabilities';
import type { CbtJadwalUjian } from '@/types/cbt.types';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { ShieldAlert, Clock, Calendar, CheckSquare, BookOpen, CheckCircle2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CbtJadwalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  jadwalToEdit?: CbtJadwalUjian | null;
  onSuccess: () => void;
  defaultGuruId?: string;
}

const jadwalSchema = z.object({
  bank_soal_id: z.string().min(1, 'Bank soal wajib dipilih'),
  tahun_pelajaran_id: z.string().min(1, 'Tahun pelajaran wajib dipilih'),
  semester_id: z.string().min(1, 'Semester wajib dipilih'),
  nama_sesi: z.string().min(3, 'Nama sesi minimal 3 karakter'),
  tanggal_mulai: z.string().min(1, 'Tanggal mulai wajib diisi'),
  tanggal_selesai: z.string().min(1, 'Tanggal selesai wajib diisi'),
  durasi_menit: z.number().int().min(10, 'Durasi minimal 10 menit'),
  toleransi_terlambat_menit: z.number().int().min(0),
  target_kelas_ids: z.array(z.string()).min(1, 'Pilih minimal satu kelas target ujian'),
});

export const CbtJadwalFormModal: React.FC<CbtJadwalFormModalProps> = ({
  isOpen,
  onClose,
  jadwalToEdit,
  onSuccess,
  defaultGuruId,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { isAdmin, isKurikulum } = useCapabilities();

  const { options: tpOptions } = useTahunPelajaranOptions();
  const { options: semOptions } = useSemesterOptions();
  const { options: kelasOptions, rawList: rawKelasList } = useKelasOptions();

  // Mode filter bank soal & rombel
  const [showAllSchoolBank, setShowAllSchoolBank] = useState(false);
  const [showAllGradeClasses, setShowAllGradeClasses] = useState(false);

  const teacherGuruId = useMemo(() => {
    if (defaultGuruId) return defaultGuruId;
    if (user?.guru_profile?.id) return user.guru_profile.id;
    return undefined;
  }, [defaultGuruId, user?.guru_profile?.id]);

  const activeGuruFilter = useMemo(() => {
    if (showAllSchoolBank) return undefined;
    if (isAdmin || isKurikulum) {
      return defaultGuruId || undefined;
    }
    return teacherGuruId;
  }, [showAllSchoolBank, isAdmin, isKurikulum, defaultGuruId, teacherGuruId]);

  // Fetch available bank soal terisolasi per guru
  const { data: bankSoalData, isLoading: isBankSoalLoading } = useQuery({
    queryKey: cbtQueryKeys.bankSoal({ limit: 100, guru_id: activeGuruFilter }),
    queryFn: () => cbtApi.getBankSoalList({ limit: 100, guru_id: activeGuruFilter }),
    enabled: isOpen,
  });

  const bankSoalOptions = useMemo(() => {
    return (bankSoalData?.items || []).map((b) => ({
      value: b.id,
      label: `${b.kode_bank} - ${b.judul} (${b.Mapel?.nama_mapel || '-'})`,
    }));
  }, [bankSoalData?.items]);

  const [bankSoalId, setBankSoalId] = useState('');

  // Bank Soal Terpilih
  const selectedBankSoal = useMemo(() => {
    return (bankSoalData?.items || []).find((b) => b.id === bankSoalId);
  }, [bankSoalData?.items, bankSoalId]);

  // Ambil penugasan mengajar guru untuk mengetahui rombel/kelas yang diampu
  const { data: teacherAssignmentsData } = useQuery({
    queryKey: ['guru-assigned-mapels', teacherGuruId],
    queryFn: () => (teacherGuruId ? kurikulumApi.getGuruMapel(teacherGuruId).catch(() => null) : null),
    enabled: isOpen && !!teacherGuruId,
  });

  // Ekstrak ID kelas yang diampu guru untuk mapel bank soal ini
  const teacherTaughtClassIds = useMemo(() => {
    const list = teacherAssignmentsData?.data || [];
    const targetMapelId = selectedBankSoal?.mapel_id;

    const relevant = targetMapelId
      ? list.filter((item: any) => item.mapel_id === targetMapelId || item.Mapel?.id === targetMapelId)
      : list;

    const pool = relevant.length > 0 ? relevant : list;
    const set = new Set<string>();
    pool.forEach((item: any) => {
      const kId = item.kelas_id || item.Kelas?.id;
      if (kId) set.add(kId);
    });
    return Array.from(set);
  }, [teacherAssignmentsData?.data, selectedBankSoal?.mapel_id]);

  // Konversi tingkat bank soal (X -> 10, XI -> 11, XII -> 12)
  const bankTingkatNumber = useMemo(() => {
    if (!selectedBankSoal) return undefined;
    if (selectedBankSoal.tingkat === 'X') return 10;
    if (selectedBankSoal.tingkat === 'XI') return 11;
    if (selectedBankSoal.tingkat === 'XII') return 12;
    return undefined;
  }, [selectedBankSoal]);

  // Lapis 1: Filter kelas berdasarkan tingkat bank soal
  const classesInTingkat = useMemo(() => {
    if (!bankTingkatNumber) return rawKelasList;
    return rawKelasList.filter((k) => Number(k.tingkat) === bankTingkatNumber);
  }, [rawKelasList, bankTingkatNumber]);

  // Lapis 2: Filter kelas yang diampu oleh guru tersebut
  const teacherClasses = useMemo(() => {
    if (teacherTaughtClassIds.length === 0) return [];
    return classesInTingkat.filter((k) => teacherTaughtClassIds.includes(k.id));
  }, [classesInTingkat, teacherTaughtClassIds]);

  // Daftar kelas yang ditampilkan pada checklist
  const displayedKelasList = useMemo(() => {
    if (!showAllGradeClasses && teacherClasses.length > 0) {
      return teacherClasses;
    }
    return classesInTingkat;
  }, [showAllGradeClasses, teacherClasses, classesInTingkat]);
  const [tpId, setTpId] = useState('');
  const [semId, setSemId] = useState('');
  const [namaSesi, setNamaSesi] = useState('');
  const [tanggalMulai, setTanggalMulai] = useState('');
  const [tanggalSelesai, setTanggalSelesai] = useState('');
  const [durasiMenit, setDurasiMenit] = useState<number>(90);
  const [toleransiMenit, setToleransiMenit] = useState<number>(15);
  const [targetKelasIds, setTargetKelasIds] = useState<string[]>([]);

  // Keamanan
  const [blockTabSwitch, setBlockTabSwitch] = useState(true);
  const [maxTabSwitches, setMaxTabSwitches] = useState(3);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [showResultInstant, setShowResultInstant] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (jadwalToEdit) {
      setBankSoalId(jadwalToEdit.bank_soal_id);
      setTpId(jadwalToEdit.tahun_pelajaran_id);
      setSemId(jadwalToEdit.semester_id);
      setNamaSesi(jadwalToEdit.nama_sesi);
      setTanggalMulai(jadwalToEdit.tanggal_mulai ? new Date(jadwalToEdit.tanggal_mulai).toISOString().slice(0, 16) : '');
      setTanggalSelesai(jadwalToEdit.tanggal_selesai ? new Date(jadwalToEdit.tanggal_selesai).toISOString().slice(0, 16) : '');
      setDurasiMenit(jadwalToEdit.durasi_menit);
      setToleransiMenit(jadwalToEdit.toleransi_terlambat_menit);
      setTargetKelasIds((jadwalToEdit.target_kelas_ids as string[]) || []);

      if (jadwalToEdit.setting_keamanan) {
        setBlockTabSwitch(jadwalToEdit.setting_keamanan.block_tab_switching ?? true);
        setMaxTabSwitches(jadwalToEdit.setting_keamanan.max_tab_switches ?? 3);
        setShuffleQuestions(jadwalToEdit.setting_keamanan.shuffle_questions ?? true);
        setShuffleOptions(jadwalToEdit.setting_keamanan.shuffle_options ?? true);
        setShowResultInstant(jadwalToEdit.setting_keamanan.show_result_instant ?? false);
      }
    } else {
      const now = new Date();
      const end = new Date(now.getTime() + 2 * 60 * 60 * 1000); // +2 jam
      setBankSoalId('');
      setTpId(tpOptions[0]?.value || '');
      setSemId(semOptions[0]?.value || '');
      setNamaSesi(`UAS Sesi ${new Date().toLocaleDateString('id-ID', { month: 'short', day: '2-digit' })}`);
      setTanggalMulai(now.toISOString().slice(0, 16));
      setTanggalSelesai(end.toISOString().slice(0, 16));
      setDurasiMenit(90);
      setToleransiMenit(15);
      setTargetKelasIds([]);
      setBlockTabSwitch(true);
      setMaxTabSwitches(3);
      setShuffleQuestions(true);
      setShuffleOptions(true);
      setShowResultInstant(false);
    }
  }, [jadwalToEdit, isOpen, tpOptions, semOptions]);

  // Auto-select bank soal jika guru hanya punya 1 paket bank soal
  useEffect(() => {
    if (isOpen && !jadwalToEdit && bankSoalOptions.length === 1 && !bankSoalId) {
      setBankSoalId(bankSoalOptions[0].value);
    }
  }, [isOpen, jadwalToEdit, bankSoalOptions, bankSoalId]);

  useEffect(() => {
    if (!isOpen) {
      setShowAllSchoolBank(false);
      setShowAllGradeClasses(false);
    }
  }, [isOpen]);

  // Auto-select kelas jika guru mengampu rombel tertentu saat bank soal dipilih
  useEffect(() => {
    if (isOpen && !jadwalToEdit && teacherClasses.length > 0 && targetKelasIds.length === 0) {
      setTargetKelasIds(teacherClasses.map((k) => k.id));
    }
  }, [isOpen, jadwalToEdit, teacherClasses, bankSoalId]);

  const toggleKelas = (id: string) => {
    setTargetKelasIds((prev) =>
      prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]
    );
  };

  const selectAllKelas = () => {
    const displayedIds = displayedKelasList.map((k) => k.id);
    const allSelected = displayedIds.length > 0 && displayedIds.every((id) => targetKelasIds.includes(id));
    if (allSelected) {
      setTargetKelasIds((prev) => prev.filter((id) => !displayedIds.includes(id)));
    } else {
      setTargetKelasIds((prev) => Array.from(new Set([...prev, ...displayedIds])));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = jadwalSchema.safeParse({
      bank_soal_id: bankSoalId,
      tahun_pelajaran_id: tpId,
      semester_id: semId,
      nama_sesi: namaSesi.trim(),
      tanggal_mulai: tanggalMulai,
      tanggal_selesai: tanggalSelesai,
      durasi_menit: Number(durasiMenit),
      toleransi_terlambat_menit: Number(toleransiMenit),
      target_kelas_ids: targetKelasIds,
    });

    if (!validation.success) {
      toast.error(validation.error.errors.map((err) => err.message).join(', '));
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        bank_soal_id: bankSoalId,
        tahun_pelajaran_id: tpId,
        semester_id: semId,
        nama_sesi: namaSesi.trim(),
        tanggal_mulai: new Date(tanggalMulai).toISOString(),
        tanggal_selesai: new Date(tanggalSelesai).toISOString(),
        durasi_menit: Number(durasiMenit),
        toleransi_terlambat_menit: Number(toleransiMenit),
        target_kelas_ids: targetKelasIds,
        setting_keamanan: {
          lock_device: true,
          block_tab_switching: blockTabSwitch,
          max_tab_switches: Number(maxTabSwitches),
          shuffle_questions: shuffleQuestions,
          shuffle_options: shuffleOptions,
          show_result_instant: showResultInstant,
        },
      };

      if (jadwalToEdit) {
        await cbtApi.updateJadwal(jadwalToEdit.id, payload);
        toast.success('Jadwal ujian berhasil diperbarui');
      } else {
        await cbtApi.createJadwal(payload);
        toast.success('Jadwal ujian berhasil dibuat (Token 6 digit otomatis di-generate)');
      }

      // 🛡️ Invalidate Cache secara agresif & refetch aktif
      await queryClient.invalidateQueries({
        queryKey: cbtQueryKeys.jadwal(),
        exact: false,
        refetchType: 'all',
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan jadwal ujian');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={jadwalToEdit ? 'Edit Jadwal Ujian CBT' : 'Jadwalkan Sesi Ujian CBT Baru'}
      size="lg"
    >
      <div className="-mt-3 sm:-mt-6 -mx-3 sm:-mx-6 mb-3 sm:mb-4 h-2 bg-[#673ab7]" />
      <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
        {/* Pilih Bank Soal */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <label htmlFor="jadwal-bank-soal" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Pilih Bank Soal <span className="text-rose-500">*</span>
            </label>
            {teacherGuruId && (
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/60">
                  <BookOpen className="w-2.5 h-2.5" />
                  {showAllSchoolBank ? 'Semua Bank Soal Sekolah' : `Bank Soal Saya (${bankSoalOptions.length})`}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAllSchoolBank((prev) => !prev)}
                  className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                >
                  {showAllSchoolBank ? '(Hanya Bank Soal Saya)' : '(Lihat Semua Bank Soal)'}
                </button>
              </div>
            )}
          </div>
          <SearchableSelect
            id="jadwal-bank-soal"
            options={bankSoalOptions}
            value={bankSoalId}
            onChange={setBankSoalId}
            placeholder={
              isBankSoalLoading
                ? 'Memuat bank soal...'
                : bankSoalOptions.length === 0
                ? 'Belum ada bank soal tersedia'
                : 'Pilih bank soal yang sudah dibuat...'
            }
            aria-label="Pilih Bank Soal"
          />
          {bankSoalOptions.length === 1 && !showAllSchoolBank && (
            <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Otomatis terpilih 1 paket bank soal milik Anda.</span>
            </p>
          )}
        </div>

        {/* Nama Sesi */}
        <div>
          <label htmlFor="jadwal-nama-sesi" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Nama Sesi Ujian <span className="text-rose-500">*</span>
          </label>
          <Input
            id="jadwal-nama-sesi"
            value={namaSesi}
            onChange={(e) => setNamaSesi(e.target.value)}
            placeholder="Contoh: UAS Ganjil 2026/2027 - Sesi 1 Pagi"
            aria-label="Nama Sesi Ujian"
            required
          />
        </div>

        {/* Tahun Pelajaran & Semester */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="jadwal-tp" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tahun Pelajaran <span className="text-rose-500">*</span>
            </label>
            <SearchableSelect
              options={tpOptions}
              value={tpId}
              onChange={setTpId}
              placeholder="Pilih Tahun Pelajaran"
              aria-label="Tahun Pelajaran"
            />
          </div>

          <div>
            <label htmlFor="jadwal-sem" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Semester <span className="text-rose-500">*</span>
            </label>
            <SearchableSelect
              options={semOptions}
              value={semId}
              onChange={setSemId}
              placeholder="Pilih Semester"
              aria-label="Semester"
            />
          </div>
        </div>

        {/* Rentang Waktu Ujian */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="jadwal-mulai" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Waktu Mulai Ujian <span className="text-rose-500">*</span>
            </label>
            <Input
              id="jadwal-mulai"
              type="datetime-local"
              value={tanggalMulai}
              onChange={(e) => setTanggalMulai(e.target.value)}
              aria-label="Waktu Mulai Ujian"
              required
            />
          </div>

          <div>
            <label htmlFor="jadwal-selesai" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Batas Akhir Ujian <span className="text-rose-500">*</span>
            </label>
            <Input
              id="jadwal-selesai"
              type="datetime-local"
              value={tanggalSelesai}
              onChange={(e) => setTanggalSelesai(e.target.value)}
              aria-label="Batas Akhir Ujian"
              required
            />
          </div>
        </div>

        {/* Durasi & Toleransi Terlambat */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="jadwal-durasi" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Durasi Ujian Siswa (Menit) <span className="text-rose-500">*</span>
            </label>
            <Input
              id="jadwal-durasi"
              type="number"
              min={10}
              max={300}
              value={durasiMenit}
              onChange={(e) => setDurasiMenit(Number(e.target.value))}
              aria-label="Durasi Pengerjaan Ujian"
              required
            />
          </div>

          <div>
            <label htmlFor="jadwal-toleransi" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Toleransi Terlambat Masuk (Menit)
            </label>
            <Input
              id="jadwal-toleransi"
              type="number"
              min={0}
              max={120}
              value={toleransiMenit}
              onChange={(e) => setToleransiMenit(Number(e.target.value))}
              aria-label="Toleransi Terlambat Masuk"
            />
          </div>
        </div>

        {/* Target Kelas */}
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Sasaran Rombongan Belajar / Kelas ({targetKelasIds.length} dipilih) <span className="text-rose-500">*</span>
              </label>
              {selectedBankSoal?.tingkat && selectedBankSoal.tingkat !== 'SEMUA' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                  Tingkat {selectedBankSoal.tingkat}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {teacherClasses.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllGradeClasses((prev) => !prev)}
                  className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                >
                  {showAllGradeClasses
                    ? `(Batasi ke ${teacherClasses.length} Kelas Diampu)`
                    : `(Tampilkan Semua Kelas Tingkat ${selectedBankSoal?.tingkat || ''}: ${classesInTingkat.length})`}
                </button>
              )}
              <button
                type="button"
                onClick={selectAllKelas}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                {displayedKelasList.length > 0 &&
                displayedKelasList.every((k) => targetKelasIds.includes(k.id))
                  ? 'Batal Pilih Semua'
                  : teacherClasses.length > 0 && !showAllGradeClasses
                  ? `Pilih Semua Kelas Saya (${displayedKelasList.length})`
                  : `Pilih Semua (${displayedKelasList.length})`}
              </button>
            </div>
          </div>

          <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl max-h-36 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50/50 dark:bg-slate-900/50">
            {displayedKelasList.map((k) => {
              const isChecked = targetKelasIds.includes(k.id);
              const isMyClass = teacherTaughtClassIds.includes(k.id);
              return (
                <label
                  key={k.id}
                  className={cn(
                    "flex items-center gap-2 p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 cursor-pointer text-xs font-medium transition-colors",
                    isChecked && "bg-violet-50/70 dark:bg-violet-950/40 border border-violet-200/60 dark:border-violet-800/60"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleKelas(k.id)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                    aria-label={`Target Kelas ${k.nama_kelas}`}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate font-semibold text-slate-800 dark:text-slate-200">{k.nama_kelas}</span>
                    <span className="text-[10px] text-slate-400">
                      Tingkat {k.tingkat} {isMyClass && '• Rombel Anda'}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>

          {displayedKelasList.length === 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 py-1">
              Tidak ditemukan rombel/kelas yang cocok dengan tingkat bank soal ini.
            </p>
          )}

          {teacherClasses.length > 0 && !showAllGradeClasses && (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Daftar kelas otomatis difilter hanya kelas yang Anda ajar untuk mata pelajaran ini.</span>
            </p>
          )}
        </div>

        {/* Pengaturan Keamanan Anti-Cheat */}
        <div className="p-4 bg-indigo-50/30 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/40 space-y-3">
          <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
            <ShieldAlert size={16} />
            <span>Pengaturan Keamanan Ujian (Anti-Cheat Engine)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={blockTabSwitch}
                onChange={(e) => setBlockTabSwitch(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                aria-label="Kunci Perpindahan Tab dan Fullscreen"
              />
              <span>Blokir Switch Tab & Keluar Fullscreen</span>
            </label>

            <div className="flex items-center gap-2">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Batas Toleransi Pelanggaran:</span>
              <select
                value={maxTabSwitches}
                onChange={(e) => setMaxTabSwitches(Number(e.target.value))}
                className="px-2 py-1 text-xs border rounded-lg bg-white dark:bg-slate-900 font-bold"
                aria-label="Batas Toleransi Pelanggaran"
              >
                <option value={1}>1 Kali (Ketat)</option>
                <option value={3}>3 Kali (Standar)</option>
                <option value={5}>5 Kali (Toleran)</option>
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={shuffleQuestions}
                onChange={(e) => setShuffleQuestions(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                aria-label="Acak Butir Soal"
              />
              <span>Acak Urutan Soal per Siswa</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={shuffleOptions}
                onChange={(e) => setShuffleOptions(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                aria-label="Acak Opsi Pilihan A-E"
              />
              <span>Acak Opsi Jawaban (A–E)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 dark:text-slate-300 sm:col-span-2">
              <input
                type="checkbox"
                checked={showResultInstant}
                onChange={(e) => setShowResultInstant(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                aria-label="Tampilkan Nilai Langsung"
              />
              <span>Tampilkan Nilai Langsung kepada Siswa setelah Submit</span>
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
            {isSubmitting ? 'Menyimpan...' : jadwalToEdit ? 'Simpan Perubahan' : 'Terbitkan Jadwal Ujian'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
