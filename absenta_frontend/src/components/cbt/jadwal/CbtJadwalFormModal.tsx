import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Button,
  Input,
  SearchableSelect,
} from '@/components/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useKelasOptions, useTahunPelajaranOptions, useSemesterOptions, useGuruOptions } from '@/components/common';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import { kurikulumApi } from '@/api/kurikulum.api';
import { useAuthStore } from '@/store/authStore';
import { useCapabilities } from '@/hooks/useCapabilities';
import type { CbtJadwalUjian, CbtRaporSlot } from '@/types/cbt.types';
import toast from 'react-hot-toast';
import { z } from 'zod';
import {
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatLocalDateTime,
  getTimezone,
  getTimezoneLabel,
  getVirtualDate,
  localDateTimeInputToISO,
} from '@/utils/attendance/time';

interface CbtJadwalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  jadwalToEdit?: CbtJadwalUjian | null;
  onSuccess: () => void;
  defaultGuruId?: string;
}

const step1Schema = z.object({
  bank_soal_id: z.string().min(1, 'Bank soal wajib dipilih'),
  nama_sesi: z.string().min(3, 'Nama sesi minimal 3 karakter'),
  tanggal_mulai: z.string().min(1, 'Tanggal mulai wajib diisi'),
  tanggal_selesai: z.string().min(1, 'Tanggal selesai wajib diisi'),
  durasi_menit: z.number().int().min(10, 'Durasi minimal 10 menit'),
  toleransi_terlambat_menit: z.number().int().min(0),
});

const jadwalSchema = step1Schema.extend({
  tahun_pelajaran_id: z.string().min(1, 'Tahun pelajaran aktif tidak ditemukan'),
  semester_id: z.string().min(1, 'Semester aktif tidak ditemukan'),
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

  const { options: tpOptions, activeYear: activeTpYear } = useTahunPelajaranOptions();
  const { rawList: rawKelasList } = useKelasOptions();
  const { options: staffOptions, rawList: rawStaffList } = useGuruOptions({ jenisPtk: 'ALL' });

  const pengawasSelectOptions = useMemo(() => {
    return [
      { value: '', label: '— Belum Diploting / Default Guru Mapel —' },
      ...staffOptions,
    ];
  }, [staffOptions]);

  // Wizard Step State (1 = Identitas & Waktu, 2 = Distribusi Kelas, 3 = Integrasi Rapor & Keamanan)
  const [step, setStep] = useState<1 | 2 | 3>(1);

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
    return (bankSoalData?.items || []).map((b) => {
      const isColleagueBank = Boolean(teacherGuruId && b.guru_id !== teacherGuruId);
      return {
        value: b.id,
        label: isColleagueBank
          ? `[Bersama • ${b.Guru?.nama_guru || 'Guru Se-Mapel'}] ${b.judul} (${b.Mapel?.nama_mapel || '-'})`
          : `${b.kode_bank} - ${b.judul} (${b.Mapel?.nama_mapel || '-'})`,
      };
    });
  }, [bankSoalData?.items, teacherGuruId]);

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

  // Konteks Akademik (disinkronkan otomatis di belakang layar)
  const [tpId, setTpId] = useState('');
  const [semId, setSemId] = useState('');
  const { options: semOptions, activeSemester } = useSemesterOptions({
    tahunPelajaranId: tpId || undefined,
  });

  useEffect(() => {
    if (!tpId && (activeTpYear?.id || tpOptions[0]?.value)) {
      setTpId(activeTpYear?.id || tpOptions[0]?.value || '');
    }
  }, [tpId, activeTpYear?.id, tpOptions]);

  useEffect(() => {
    if (semOptions.length > 0) {
      const isValid = semId && semOptions.some((s) => s.value === semId);
      if (!isValid) {
        if (activeSemester?.id && semOptions.some((s) => s.value === activeSemester.id)) {
          setSemId(activeSemester.id);
        } else {
          setSemId(semOptions[0].value);
        }
      }
    }
  }, [semOptions, semId, activeSemester?.id]);

  const [namaSesi, setNamaSesi] = useState('');
  const [tanggalMulai, setTanggalMulai] = useState('');
  const [tanggalSelesai, setTanggalSelesai] = useState('');
  const [durasiMenit, setDurasiMenit] = useState<number>(90);
  const [toleransiMenit, setToleransiMenit] = useState<number>(15);
  const [targetKelasIds, setTargetKelasIds] = useState<string[]>([]);

  // Keamanan & Otomasi Rapor + Ploting Pengawas & Proktor
  const [blockTabSwitch, setBlockTabSwitch] = useState(true);
  const [maxTabSwitches, setMaxTabSwitches] = useState(3);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [showResultInstant, setShowResultInstant] = useState(false);
  const [autoTransferRapor, setAutoTransferRapor] = useState(true);
  const [targetRaporSlot, setTargetRaporSlot] = useState<CbtRaporSlot>('sumatif_akhir');
  const [ruangUjian, setRuangUjian] = useState('');
  const [pengawas1Id, setPengawas1Id] = useState('');
  const [proktorId, setProktorId] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeTz = getTimezone();
  const tzLabel = getTimezoneLabel(activeTz);

  const computeEndFromStart = (startLocal: string, minutes: number): string => {
    try {
      const startIso = localDateTimeInputToISO(startLocal, activeTz);
      const startMs = new Date(startIso).getTime();
      if (Number.isNaN(startMs)) return startLocal;
      const dur = Math.max(10, Number(minutes) || 90);
      return formatLocalDateTime(new Date(startMs + dur * 60 * 1000));
    } catch {
      return startLocal;
    }
  };

  const syncWithNow = () => {
    const now = getVirtualDate();
    const startStr = formatLocalDateTime(now);
    setTanggalMulai(startStr);
    setTanggalSelesai(computeEndFromStart(startStr, durasiMenit));
  };

  const handleStartChange = (newStart: string) => {
    setTanggalMulai(newStart);
    setTanggalSelesai(computeEndFromStart(newStart, durasiMenit));
  };

  const handleDurationChange = (newDur: number) => {
    setDurasiMenit(newDur);
    if (tanggalMulai) {
      setTanggalSelesai(computeEndFromStart(tanggalMulai, newDur));
    }
  };

  const endTimePreview = useMemo(() => {
    if (!tanggalSelesai) return '';
    const timePart = tanggalSelesai.split('T')[1];
    return timePart ? `${timePart.slice(0, 5)} ${tzLabel}` : '';
  }, [tanggalSelesai, tzLabel]);

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);

    if (jadwalToEdit) {
      setBankSoalId(jadwalToEdit.bank_soal_id);
      setTpId(jadwalToEdit.tahun_pelajaran_id || activeTpYear?.id || tpOptions[0]?.value || '');
      setSemId(jadwalToEdit.semester_id || activeSemester?.id || semOptions[0]?.value || '');
      setNamaSesi(jadwalToEdit.nama_sesi);
      const startStr = jadwalToEdit.tanggal_mulai
        ? formatLocalDateTime(new Date(jadwalToEdit.tanggal_mulai))
        : '';
      setTanggalMulai(startStr);
      setTanggalSelesai(
        jadwalToEdit.tanggal_selesai
          ? formatLocalDateTime(new Date(jadwalToEdit.tanggal_selesai))
          : computeEndFromStart(startStr, jadwalToEdit.durasi_menit)
      );
      setDurasiMenit(jadwalToEdit.durasi_menit);
      setToleransiMenit(jadwalToEdit.toleransi_terlambat_menit);
      setTargetKelasIds((jadwalToEdit.target_kelas_ids as string[]) || []);

      if (jadwalToEdit.setting_keamanan) {
        setBlockTabSwitch(jadwalToEdit.setting_keamanan.block_tab_switching ?? true);
        setMaxTabSwitches(jadwalToEdit.setting_keamanan.max_tab_switches ?? 3);
        setShuffleQuestions(jadwalToEdit.setting_keamanan.shuffle_questions ?? true);
        setShuffleOptions(jadwalToEdit.setting_keamanan.shuffle_options ?? true);
        setShowResultInstant(jadwalToEdit.setting_keamanan.show_result_instant ?? false);
        setAutoTransferRapor(jadwalToEdit.setting_keamanan.auto_transfer_rapor ?? false);
        setTargetRaporSlot(jadwalToEdit.setting_keamanan.target_rapor_slot || 'sumatif_akhir');
        setRuangUjian(jadwalToEdit.setting_keamanan.ruang_ujian || '');
        setPengawas1Id(jadwalToEdit.setting_keamanan.pengawas_1_id || '');
        setProktorId(
          jadwalToEdit.setting_keamanan.proktor_id ||
            jadwalToEdit.setting_keamanan.pengawas_2_id ||
            ''
        );
      }
    } else {
      const now = getVirtualDate();
      const startStr = formatLocalDateTime(now);
      setBankSoalId('');
      setTpId(activeTpYear?.id || tpOptions[0]?.value || '');
      setSemId(activeSemester?.id || semOptions[0]?.value || '');
      setNamaSesi(
        `UAS Sesi ${now.toLocaleDateString('id-ID', {
          month: 'short',
          day: '2-digit',
          timeZone: activeTz,
        })}`
      );
      setTanggalMulai(startStr);
      setTanggalSelesai(computeEndFromStart(startStr, 90));
      setDurasiMenit(90);
      setToleransiMenit(15);
      setTargetKelasIds([]);
      setBlockTabSwitch(true);
      setMaxTabSwitches(3);
      setShuffleQuestions(true);
      setShuffleOptions(true);
      setShowResultInstant(false);
      setAutoTransferRapor(true);
      setTargetRaporSlot('sumatif_akhir');
      setRuangUjian('');
      setPengawas1Id(teacherGuruId || '');
      setProktorId('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jadwalToEdit, isOpen]);

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
      setStep(1);
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

  const validateStep1 = (): boolean => {
    const check = step1Schema.safeParse({
      bank_soal_id: bankSoalId,
      nama_sesi: namaSesi.trim(),
      tanggal_mulai: tanggalMulai,
      tanggal_selesai: tanggalSelesai,
      durasi_menit: Number(durasiMenit),
      toleransi_terlambat_menit: Number(toleransiMenit),
    });

    if (!check.success) {
      toast.error(check.error.issues.map((err) => err.message).join(', ') || 'Data jadwal langkah 1 belum lengkap');
      return false;
    }

    const startMs = new Date(localDateTimeInputToISO(tanggalMulai, activeTz)).getTime();
    const endMs = new Date(localDateTimeInputToISO(tanggalSelesai, activeTz)).getTime();
    if (endMs <= startMs) {
      toast.error('Batas akhir ujian harus lebih besar dari waktu mulai ujian');
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (targetKelasIds.length === 0) {
      toast.error('Pilih minimal satu kelas target ujian');
      return false;
    }
    return true;
  };

  const handleGoToStep = (targetStep: 1 | 2 | 3, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (targetStep === 1) {
      setStep(1);
      return;
    }
    if (targetStep === 2) {
      if (!validateStep1()) return;
      setStep(2);
      return;
    }
    if (targetStep === 3) {
      if (!validateStep1()) return;
      if (!validateStep2()) return;
      setStep(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (step === 1) {
      handleGoToStep(2);
      return;
    }
    if (step === 2) {
      handleGoToStep(3);
      return;
    }

    const resolvedTpId = tpId || activeTpYear?.id || tpOptions[0]?.value || '';
    const resolvedSemId = semId || activeSemester?.id || semOptions[0]?.value || '';

    const validation = jadwalSchema.safeParse({
      bank_soal_id: bankSoalId,
      tahun_pelajaran_id: resolvedTpId,
      semester_id: resolvedSemId,
      nama_sesi: namaSesi.trim(),
      tanggal_mulai: tanggalMulai,
      tanggal_selesai: tanggalSelesai,
      durasi_menit: Number(durasiMenit),
      toleransi_terlambat_menit: Number(toleransiMenit),
      target_kelas_ids: targetKelasIds,
    });

    if (!validation.success) {
      toast.error(validation.error.issues.map((err) => err.message).join(', ') || 'Data jadwal ujian belum lengkap');
      return;
    }

    try {
      setIsSubmitting(true);

      const pengawas1Obj = rawStaffList.find((g) => g.id === pengawas1Id);
      const proktorObj = rawStaffList.find((g) => g.id === proktorId);

      const payload = {
        bank_soal_id: bankSoalId,
        tahun_pelajaran_id: resolvedTpId,
        semester_id: resolvedSemId,
        nama_sesi: namaSesi.trim(),
        tanggal_mulai: localDateTimeInputToISO(tanggalMulai, activeTz),
        tanggal_selesai: localDateTimeInputToISO(tanggalSelesai, activeTz),
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
          auto_transfer_rapor: autoTransferRapor,
          target_rapor_slot: autoTransferRapor ? targetRaporSlot : null,
          created_by_guru_id: teacherGuruId || null,
          ruang_ujian: ruangUjian.trim() || null,
          pengawas_1_id: pengawas1Id || null,
          pengawas_1_nama: pengawas1Obj?.nama_guru || null,
          pengawas_1_nip: pengawas1Obj?.nip || null,
          proktor_id: proktorId || null,
          proktor_nama: proktorObj?.nama_guru || null,
          proktor_nip: proktorObj?.nip || null,
          pengawas_2_id: proktorId || null,
          pengawas_2_nama: proktorObj?.nama_guru || null,
          pengawas_2_nip: proktorObj?.nip || null,
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
      size="md"
    >
      <div className="-mt-3 sm:-mt-6 -mx-3 sm:-mx-6 mb-3 sm:mb-4 h-1.5 bg-[#673ab7]" />

      {/* Stepper Header 3 Langkah */}
      <div className="grid grid-cols-3 gap-1.5 p-1 mb-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60">
        <button
          type="button"
          onClick={(e) => handleGoToStep(1, e)}
          className={cn(
            'flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer min-w-0',
            step === 1
              ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300 shadow-2xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          )}
        >
          <span
            className={cn(
              'w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center shrink-0',
              step === 1 ? 'bg-violet-600 text-white' : 'bg-emerald-500 text-white'
            )}
          >
            1
          </span>
          <span className="truncate">Waktu</span>
        </button>

        <button
          type="button"
          onClick={(e) => handleGoToStep(2, e)}
          className={cn(
            'flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer min-w-0',
            step === 2
              ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300 shadow-2xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          )}
        >
          <span
            className={cn(
              'w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center shrink-0',
              step === 2
                ? 'bg-violet-600 text-white'
                : step > 2
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            )}
          >
            2
          </span>
          <span className="truncate">Kelas ({targetKelasIds.length})</span>
        </button>

        <button
          type="button"
          onClick={(e) => handleGoToStep(3, e)}
          className={cn(
            'flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer min-w-0',
            step === 3
              ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300 shadow-2xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          )}
        >
          <span
            className={cn(
              'w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center shrink-0',
              step === 3
                ? 'bg-violet-600 text-white'
                : 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            )}
          >
            3
          </span>
          <span className="truncate">Rapor</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {step === 1 ? (
          <div className="space-y-3.5 py-0.5">
            {/* Pertanyaan 1: Pilih Bank Soal */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="jadwal-bank-soal" className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Pakai bank soal yang mana?
                </label>
                {teacherGuruId && (
                  <button
                    type="button"
                    onClick={() => setShowAllSchoolBank((prev) => !prev)}
                    className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                  >
                    {showAllSchoolBank ? 'Milik Saya' : 'Semua Bank Soal'}
                  </button>
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
                    : 'Pilih bank soal...'
                }
                aria-label="Pilih Bank Soal"
              />
            </div>

            {/* Pertanyaan 2: Nama Sesi */}
            <div className="space-y-1.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
              <label htmlFor="jadwal-nama-sesi" className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Apa nama sesi ujian ini?
              </label>
              <Input
                id="jadwal-nama-sesi"
                value={namaSesi}
                onChange={(e) => setNamaSesi(e.target.value)}
                placeholder="Contoh: UAS Sesi 1"
                aria-label="Nama Sesi Ujian"
                required
              />
            </div>

            {/* Pertanyaan 3: Waktu Mulai Ujian */}
            <div className="space-y-1.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="jadwal-mulai" className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Kapan ujian dimulai ({tzLabel})?
                </label>
                <button
                  type="button"
                  onClick={syncWithNow}
                  className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                >
                  Sekarang
                </button>
              </div>

              <Input
                id="jadwal-mulai"
                type="datetime-local"
                value={tanggalMulai}
                onChange={(e) => handleStartChange(e.target.value)}
                aria-label="Waktu Mulai Ujian"
                required
              />
            </div>

            {/* Pertanyaan 4: Durasi Pengerjaan */}
            <div className="space-y-1.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="jadwal-durasi" className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Berapa menit waktu pengerjaan?
                </label>
                {endTimePreview && (
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Selesai {endTimePreview}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[45, 60, 90, 120].map((mnt) => (
                  <button
                    key={mnt}
                    type="button"
                    onClick={() => handleDurationChange(mnt)}
                    className={cn(
                      'py-2 px-2 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center',
                      durasiMenit === mnt
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-violet-300'
                    )}
                  >
                    {mnt}m
                  </button>
                ))}
                <Input
                  id="jadwal-durasi"
                  type="number"
                  min={10}
                  max={300}
                  value={durasiMenit}
                  onChange={(e) => handleDurationChange(Number(e.target.value))}
                  aria-label="Durasi Pengerjaan Ujian"
                  className="text-center font-bold px-1.5"
                  required
                />
              </div>
            </div>
          </div>
        ) : step === 2 ? (
          <div className="space-y-3.5 py-0.5">
            {/* Pertanyaan 1: Sasaran Kelas */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Untuk kelas mana saja?
                </p>
                <div className="flex items-center gap-2.5 shrink-0">
                  {teacherClasses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAllGradeClasses((prev) => !prev)}
                      className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                    >
                      {showAllGradeClasses ? 'Kelas Saya' : 'Semua Kelas'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={selectAllKelas}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {displayedKelasList.length > 0 &&
                    displayedKelasList.every((k) => targetKelasIds.includes(k.id))
                      ? 'Reset'
                      : 'Pilih Semua'}
                  </button>
                </div>
              </div>

              {displayedKelasList.length === 0 ? (
                <p className="text-xs text-amber-600 dark:text-amber-400 py-1">
                  Tidak ada kelas yang cocok.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {displayedKelasList.map((k) => {
                    const isChecked = targetKelasIds.includes(k.id);
                    return (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() => toggleKelas(k.id)}
                        aria-label={`Target Kelas ${k.nama_kelas}`}
                        className={cn(
                          'px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer',
                          isChecked
                            ? 'bg-violet-600 text-white border-violet-600'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-violet-300'
                        )}
                      >
                        {k.nama_kelas}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pertanyaan 1b: Ploting Ruang & Pengawas / Proktor Ujian */}
            <div className="space-y-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <label htmlFor="jadwal-ruang" className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Di ruang / kelas mana ujian berlangsung? <span className="font-normal text-slate-400">(Opsional)</span>
                </label>
                <Input
                  id="jadwal-ruang"
                  value={ruangUjian}
                  onChange={(e) => setRuangUjian(e.target.value)}
                  placeholder="Contoh: Ruang 10 / Kelas X-1 / Lab Komputer"
                  aria-label="Ruang atau Kelas Ujian"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1 min-w-0">
                  <label htmlFor="jadwal-pengawas-1" className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    Siapa Pengawas Ruang / Kelas?
                  </label>
                  <SearchableSelect
                    id="jadwal-pengawas-1"
                    options={pengawasSelectOptions}
                    value={pengawas1Id}
                    onChange={setPengawas1Id}
                    placeholder="Pilih Guru Pengawas..."
                    aria-label="Pilih Pengawas Ruang"
                  />
                </div>

                <div className="space-y-1 min-w-0">
                  <label htmlFor="jadwal-proktor" className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    Proktor / Pengawas 2 <span className="font-normal text-slate-400">(Opsional)</span>
                  </label>
                  <SearchableSelect
                    id="jadwal-proktor"
                    options={pengawasSelectOptions}
                    value={proktorId}
                    onChange={setProktorId}
                    placeholder="Kosongkan jika cukup 1 pengawas..."
                    aria-label="Pilih Proktor Ujian"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                💡 Guru yang di-plot sebagai <strong>Pengawas Ruang</strong> otomatis mendapatkan akses <strong>Token Masuk, Aktifkan Sesi, Live Monitoring, Reset Login Siswa, & Cetak Berita Acara</strong> di akunnya.
              </p>
            </div>

            {/* Pertanyaan 2: Nilai Langsung Tampil atau Tidak */}
            <div className="space-y-1.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Tampilkan nilai langsung ke siswa?
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowResultInstant(true)}
                  className={cn(
                    'py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center',
                    showResultInstant
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  )}
                >
                  Ya
                </button>

                <button
                  type="button"
                  onClick={() => setShowResultInstant(false)}
                  className={cn(
                    'py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center',
                    !showResultInstant
                      ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  )}
                >
                  Tidak
                </button>
              </div>
            </div>

            {/* Pertanyaan 3: Proteksi Kecurangan (Anti-Cheat) */}
            <div className="space-y-1.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Aktifkan mode anti-curang (acak soal & kunci tab)?
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setBlockTabSwitch(true);
                    setShuffleQuestions(true);
                    setShuffleOptions(true);
                  }}
                  className={cn(
                    'py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center',
                    blockTabSwitch
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  )}
                >
                  Ya
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBlockTabSwitch(false);
                  }}
                  className={cn(
                    'py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center',
                    !blockTabSwitch
                      ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  )}
                >
                  Tidak
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5 py-0.5">
            {/* Pertanyaan Utama yang Simpel & Fokus */}
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Transfer nilai otomatis ke e-Rapor?
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAutoTransferRapor(true)}
                  className={cn(
                    'py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center',
                    autoTransferRapor
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  )}
                >
                  Ya
                </button>

                <button
                  type="button"
                  onClick={() => setAutoTransferRapor(false)}
                  className={cn(
                    'py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center',
                    !autoTransferRapor
                      ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  )}
                >
                  Tidak
                </button>
              </div>
            </div>

            {/* Pertanyaan Lanjutan (Hanya jika dijawab Ya) */}
            {autoTransferRapor && (
              <div className="space-y-1.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Masukkan ke kolom nilai mana?
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {(
                    [
                      { key: 'sumatif_1', label: 'SUM 1' },
                      { key: 'sumatif_2', label: 'SUM 2' },
                      { key: 'sumatif_3', label: 'SUM 3' },
                      { key: 'sumatif_akhir', label: 'SUM AKHIR' },
                    ] as { key: CbtRaporSlot; label: string }[]
                  ).map((slot) => {
                    const active = targetRaporSlot === slot.key;
                    return (
                      <button
                        key={slot.key}
                        type="button"
                        onClick={() => setTargetRaporSlot(slot.key)}
                        className={cn(
                          'py-2 px-2 rounded-lg border text-xs font-bold text-center transition-all cursor-pointer',
                          active
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-emerald-400'
                        )}
                      >
                        {slot.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          {step > 1 ? (
            <Button
              key="btn-back"
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => handleGoToStep((step - 1) as 1 | 2, e)}
              disabled={isSubmitting}
              className="flex items-center gap-1.5"
            >
              <ArrowLeft size={14} />
              <span>Kembali</span>
            </Button>
          ) : (
            <Button
              key="btn-cancel"
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Batal
            </Button>
          )}

          {step === 1 ? (
            <Button
              key="btn-next-step2"
              type="button"
              variant="primary"
              size="sm"
              onClick={(e) => handleGoToStep(2, e)}
              className="bg-[#673ab7] hover:bg-[#5e35b1] text-white font-bold flex items-center gap-1.5"
            >
              <span>Lanjut</span>
              <ArrowRight size={14} />
            </Button>
          ) : step === 2 ? (
            <Button
              key="btn-next-step3"
              type="button"
              variant="primary"
              size="sm"
              onClick={(e) => handleGoToStep(3, e)}
              className="bg-[#673ab7] hover:bg-[#5e35b1] text-white font-bold flex items-center gap-1.5"
            >
              <span>Lanjut</span>
              <ArrowRight size={14} />
            </Button>
          ) : (
            <Button
              key="btn-submit"
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              className="bg-[#673ab7] hover:bg-[#5e35b1] text-white font-bold"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan'}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
};
