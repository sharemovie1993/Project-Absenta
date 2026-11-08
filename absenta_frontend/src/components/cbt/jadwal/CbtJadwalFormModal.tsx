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
import { ArrowRight, ArrowLeft, Layers, Info, Check, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatLocalDateTime,
  getTimezone,
  getTimezoneLabel,
  getVirtualDate,
  localDateTimeInputToISO,
} from '@/utils/attendance/time';
import {
  cbtJadwalStep1Schema,
  cbtJadwalPayloadSchema,
  computeEndFromStart,
  getEndTimePreview,
  resolveBankTingkatNumber,
  extractTeacherTaughtClassIds,
  filterClassesByTingkat,
  filterTeacherClasses,
  filterValidTargetKelasIds,
} from './cbtJadwalHelper';

interface CbtJadwalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  jadwalToEdit?: CbtJadwalUjian | null;
  onSuccess: () => void;
  defaultGuruId?: string;
  initialBankSoalId?: string;
  initialTahunPelajaranId?: string;
  initialSemesterId?: string;
}

export const CbtJadwalFormModal: React.FC<CbtJadwalFormModalProps> = ({
  isOpen,
  onClose,
  jadwalToEdit,
  onSuccess,
  defaultGuruId,
  initialBankSoalId,
  initialTahunPelajaranId,
  initialSemesterId,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { isAdmin, isKurikulum } = useCapabilities();

  const { options: tpOptions, activeYear: activeTpYear } = useTahunPelajaranOptions();
  const { rawList: rawKelasList } = useKelasOptions();
  const { options: staffOptions, rawList: rawStaffList } = useGuruOptions({ jenisPtk: 'ALL' });

  const pengawasSelectOptions = useMemo(() => [
    { value: '', label: '— Belum Diploting / Default Guru Mapel —' },
    ...staffOptions,
  ], [staffOptions]);

  // Wizard Step State (1 = Waktu & Sesi, 2 = Target Kelas & Pengawas, 3 = Rapor & Keamanan)
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [showAllSchoolBank, setShowAllSchoolBank] = useState(false);
  const [showAllGradeClasses, setShowAllGradeClasses] = useState(false);

  const teacherGuruId = useMemo(() => {
    if (defaultGuruId) return defaultGuruId;
    if (user?.guru_profile?.id) return user.guru_profile.id;
    return undefined;
  }, [defaultGuruId, user?.guru_profile?.id]);

  const activeGuruFilter = useMemo(() => {
    if (showAllSchoolBank) return undefined;
    if (isAdmin || isKurikulum) return defaultGuruId || undefined;
    return teacherGuruId;
  }, [showAllSchoolBank, isAdmin, isKurikulum, defaultGuruId, teacherGuruId]);

  // Bank Soal Query
  const { data: bankSoalData, isLoading: isBankSoalLoading } = useQuery({
    queryKey: cbtQueryKeys.bankSoal({ limit: 100, guru_id: activeGuruFilter }),
    queryFn: () => cbtApi.getBankSoalList({ limit: 100, guru_id: activeGuruFilter }),
    enabled: isOpen,
  });

  const bankSoalOptions = useMemo(() => {
    return (bankSoalData?.items || []).map((b) => {
      const isColleague = Boolean(teacherGuruId && b.guru_id !== teacherGuruId);
      return {
        value: b.id,
        label: isColleague
          ? `[Bersama • ${b.Guru?.nama_guru || 'Guru Se-Mapel'}] ${b.judul} (${b.Mapel?.nama_mapel || '-'})`
          : `${b.kode_bank} - ${b.judul} (${b.Mapel?.nama_mapel || '-'})`,
      };
    });
  }, [bankSoalData?.items, teacherGuruId]);

  const [bankSoalId, setBankSoalId] = useState('');
  const selectedBankSoal = useMemo(() => {
    return (bankSoalData?.items || []).find((b) => b.id === bankSoalId);
  }, [bankSoalData?.items, bankSoalId]);

  // Penugasan Mengajar Guru untuk penargetan rombel
  const { data: teacherAssignmentsData } = useQuery({
    queryKey: ['guru-assigned-mapels', teacherGuruId],
    queryFn: () => (teacherGuruId ? kurikulumApi.getGuruMapel(teacherGuruId).catch(() => null) : null),
    enabled: isOpen && !!teacherGuruId,
  });

  const teacherTaughtClassIds = useMemo(() => {
    return extractTeacherTaughtClassIds(teacherAssignmentsData?.data, selectedBankSoal?.mapel_id);
  }, [teacherAssignmentsData?.data, selectedBankSoal?.mapel_id]);

  const bankTingkatNumber = useMemo(() => resolveBankTingkatNumber(selectedBankSoal), [selectedBankSoal]);
  const classesInTingkat = useMemo(() => filterClassesByTingkat(rawKelasList, bankTingkatNumber), [rawKelasList, bankTingkatNumber]);
  const teacherClasses = useMemo(() => filterTeacherClasses(classesInTingkat, teacherTaughtClassIds), [classesInTingkat, teacherTaughtClassIds]);

  const displayedKelasList = useMemo(() => {
    if (!showAllGradeClasses && teacherClasses.length > 0) return teacherClasses;
    return classesInTingkat;
  }, [showAllGradeClasses, teacherClasses, classesInTingkat]);

  // Konteks Akademik Terpadu
  const [tpId, setTpId] = useState('');
  const [semId, setSemId] = useState('');
  const { options: semOptions, activeSemester } = useSemesterOptions({
    tahunPelajaranId: tpId || undefined,
  });

  const activeTz = getTimezone();
  const tzLabel = getTimezoneLabel(activeTz);

  // Form Fields
  const [namaSesi, setNamaSesi] = useState('');
  const [tanggalMulai, setTanggalMulai] = useState('');
  const [tanggalSelesai, setTanggalSelesai] = useState('');
  const [durasiMenit, setDurasiMenit] = useState<number>(90);
  const [toleransiMenit, setToleransiMenit] = useState<number>(15);
  const [targetKelasIds, setTargetKelasIds] = useState<string[]>([]);
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

  // Konteks Mode Guru Mandiri vs Panitia/Admin
  const isTeacherMode = useMemo(() => {
    return Boolean(defaultGuruId || (teacherGuruId && !isAdmin));
  }, [defaultGuruId, teacherGuruId, isAdmin]);

  const currentTeacherObj = useMemo(() => {
    if (!teacherGuruId) return null;
    return rawStaffList.find((g) => g.id === teacherGuruId) || null;
  }, [rawStaffList, teacherGuruId]);

  const currentTeacherName = currentTeacherObj?.nama_guru || user?.full_name || 'Anda Sendiri';

  // Sinkronisasi ID kelas terpilih yang valid dan aktif di layar
  const validTargetKelasIds = useMemo(() => {
    return filterValidTargetKelasIds(targetKelasIds, displayedKelasList);
  }, [targetKelasIds, displayedKelasList]);

  const selectedCount = validTargetKelasIds.length;
  const totalCount = displayedKelasList.length;
  const isAllSelected = totalCount > 0 && selectedCount === totalCount;

  const firstSelectedClass = useMemo(() => {
    if (validTargetKelasIds.length === 0) return null;
    return rawKelasList.find((k) => k.id === validTargetKelasIds[0]) || null;
  }, [validTargetKelasIds, rawKelasList]);

  const pengawas1Obj = useMemo(() => {
    return rawStaffList.find((g) => g.id === pengawas1Id) || currentTeacherObj || null;
  }, [rawStaffList, pengawas1Id, currentTeacherObj]);

  const proktorObj = useMemo(() => {
    return rawStaffList.find((g) => g.id === proktorId) || null;
  }, [rawStaffList, proktorId]);

  // Initial Sync Konteks Akademik & Edit State
  useEffect(() => {
    if (!isOpen) return;
    setStep(1);

    if (jadwalToEdit) {
      setBankSoalId(jadwalToEdit.bank_soal_id);
      setTpId(jadwalToEdit.tahun_pelajaran_id || initialTahunPelajaranId || activeTpYear?.id || tpOptions[0]?.value || '');
      setSemId(jadwalToEdit.semester_id || initialSemesterId || activeSemester?.id || semOptions[0]?.value || '');
      setNamaSesi(jadwalToEdit.nama_sesi);
      const startStr = jadwalToEdit.tanggal_mulai ? formatLocalDateTime(new Date(jadwalToEdit.tanggal_mulai)) : '';
      setTanggalMulai(startStr);
      setTanggalSelesai(
        jadwalToEdit.tanggal_selesai
          ? formatLocalDateTime(new Date(jadwalToEdit.tanggal_selesai))
          : computeEndFromStart(startStr, jadwalToEdit.durasi_menit, activeTz)
      );
      setDurasiMenit(jadwalToEdit.durasi_menit);
      setToleransiMenit(jadwalToEdit.toleransi_terlambat_menit);
      setTargetKelasIds((jadwalToEdit.target_kelas_ids as string[]) || []);

      if (jadwalToEdit.setting_keamanan) {
        const sec = jadwalToEdit.setting_keamanan;
        setBlockTabSwitch(sec.block_tab_switching ?? true);
        setMaxTabSwitches(sec.max_tab_switches ?? 3);
        setShuffleQuestions(sec.shuffle_questions ?? true);
        setShuffleOptions(sec.shuffle_options ?? true);
        setShowResultInstant(sec.show_result_instant ?? false);
        setAutoTransferRapor(sec.auto_transfer_rapor ?? false);
        setTargetRaporSlot(sec.target_rapor_slot || 'sumatif_akhir');
        setRuangUjian(sec.ruang_ujian || '');
        setPengawas1Id(sec.pengawas_1_id || '');
        setProktorId(sec.proktor_id || sec.pengawas_2_id || '');
      }
    } else {
      const now = getVirtualDate();
      const startStr = formatLocalDateTime(now);
      const targetBank = initialBankSoalId
        ? (bankSoalData?.items || []).find((b) => b.id === initialBankSoalId)
        : null;
      setBankSoalId(initialBankSoalId || '');
      setTpId(initialTahunPelajaranId || activeTpYear?.id || tpOptions[0]?.value || '');
      setSemId(initialSemesterId || activeSemester?.id || semOptions[0]?.value || '');
      setNamaSesi(
        targetBank
          ? `Ulangan ${targetBank.judul}`
          : `Sesi Ujian ${now.toLocaleDateString('id-ID', { month: 'short', day: '2-digit', timeZone: activeTz })}`
      );
      setTanggalMulai(startStr);
      const defaultDuration = targetBank?.alokasi_menit || 90;
      setTanggalSelesai(computeEndFromStart(startStr, defaultDuration, activeTz));
      setDurasiMenit(defaultDuration);
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
  }, [isOpen, jadwalToEdit, initialBankSoalId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select bank soal & kelas bawaan
  useEffect(() => {
    if (isOpen && !jadwalToEdit) {
      if (initialBankSoalId) {
        setBankSoalId(initialBankSoalId);
        const b = (bankSoalData?.items || []).find((item) => item.id === initialBankSoalId);
        if (b) {
          setNamaSesi((prev) => {
            if (!prev || prev.startsWith('Sesi Ujian') || prev.startsWith('UAS Sesi')) {
              return `Ulangan ${b.judul}`;
            }
            return prev;
          });
          if (b.alokasi_menit) {
            setDurasiMenit((prev) => (prev === 90 ? b.alokasi_menit : prev));
          }
        }
      } else if (bankSoalOptions.length === 1 && !bankSoalId) {
        setBankSoalId(bankSoalOptions[0].value);
      }
    }
  }, [isOpen, jadwalToEdit, initialBankSoalId, bankSoalData?.items, bankSoalOptions, bankSoalId]);

  useEffect(() => {
    if (isOpen && !jadwalToEdit && teacherClasses.length > 0 && targetKelasIds.length === 0) {
      setTargetKelasIds(teacherClasses.map((k) => k.id));
    }
  }, [isOpen, jadwalToEdit, teacherClasses, bankSoalId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStartChange = (newStart: string) => {
    setTanggalMulai(newStart);
    setTanggalSelesai(computeEndFromStart(newStart, durasiMenit, activeTz));
  };

  const handleDurationChange = (newDur: number) => {
    setDurasiMenit(newDur);
    if (tanggalMulai) {
      setTanggalSelesai(computeEndFromStart(tanggalMulai, newDur, activeTz));
    }
  };

  const syncWithNow = () => {
    const now = getVirtualDate();
    const startStr = formatLocalDateTime(now);
    setTanggalMulai(startStr);
    setTanggalSelesai(computeEndFromStart(startStr, durasiMenit, activeTz));
  };

  const toggleKelas = (id: string) => {
    setTargetKelasIds((prev) => prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]);
  };

  const selectAllKelas = () => {
    const ids = displayedKelasList.map((k) => k.id);
    if (isAllSelected) {
      setTargetKelasIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setTargetKelasIds(ids);
    }
  };

  const validateStep1 = (): boolean => {
    const check = cbtJadwalStep1Schema.safeParse({
      bank_soal_id: bankSoalId,
      nama_sesi: namaSesi.trim(),
      tanggal_mulai: tanggalMulai,
      tanggal_selesai: tanggalSelesai,
      durasi_menit: Number(durasiMenit),
      toleransi_terlambat_menit: Number(toleransiMenit),
    });
    if (!check.success) {
      toast.error(check.error.issues.map((err) => err.message).join(', ') || 'Data waktu/sesi belum lengkap');
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

  const handleGoToStep = (targetStep: 1 | 2 | 3, e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (targetStep === 1) { setStep(1); return; }
    if (targetStep === 2) { if (validateStep1()) setStep(2); return; }
    if (targetStep === 3) {
      if (!validateStep1()) return;
      if (selectedCount === 0) { toast.error('Pilih minimal satu kelas target ujian'); return; }
      setStep(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) { handleGoToStep(2); return; }
    if (step === 2) { handleGoToStep(3); return; }

    const resolvedTpId = tpId || activeTpYear?.id || tpOptions[0]?.value || '';
    const resolvedSemId = semId || activeSemester?.id || semOptions[0]?.value || '';

    const validation = cbtJadwalPayloadSchema.safeParse({
      bank_soal_id: bankSoalId,
      tahun_pelajaran_id: resolvedTpId,
      semester_id: resolvedSemId,
      nama_sesi: namaSesi.trim(),
      tanggal_mulai: tanggalMulai,
      tanggal_selesai: tanggalSelesai,
      durasi_menit: Number(durasiMenit),
      toleransi_terlambat_menit: Number(toleransiMenit),
      target_kelas_ids: validTargetKelasIds,
    });

    if (!validation.success) {
      toast.error(validation.error.issues.map((err) => err.message).join(', ') || 'Data jadwal ujian belum lengkap');
      return;
    }

    try {
      setIsSubmitting(true);
      const defaultAutoRuang = selectedCount > 1
        ? 'Multi-Ruang Kelas'
        : (firstSelectedClass ? `Kelas ${firstSelectedClass.nama_kelas}` : 'Ruang Kelas');

      const finalPengawasId = (selectedCount > 1 && !isTeacherMode)
        ? null
        : (pengawas1Id || (isTeacherMode ? teacherGuruId : null) || null);

      const finalPengawasObj = rawStaffList.find((g) => g.id === finalPengawasId) || currentTeacherObj;

      const payload = {
        bank_soal_id: bankSoalId,
        tahun_pelajaran_id: resolvedTpId,
        semester_id: resolvedSemId,
        nama_sesi: namaSesi.trim(),
        tanggal_mulai: localDateTimeInputToISO(tanggalMulai, activeTz),
        tanggal_selesai: localDateTimeInputToISO(tanggalSelesai, activeTz),
        durasi_menit: Number(durasiMenit),
        toleransi_terlambat_menit: Number(toleransiMenit),
        target_kelas_ids: validTargetKelasIds,
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
          ruang_ujian: ruangUjian.trim() || defaultAutoRuang,
          pengawas_1_id: finalPengawasId,
          pengawas_1_nama: finalPengawasObj?.nama_guru || null,
          pengawas_1_nip: finalPengawasObj?.nip || null,
          proktor_id: (selectedCount > 1 && !isTeacherMode) ? null : (proktorId || null),
          proktor_nama: (selectedCount > 1 && !isTeacherMode) ? null : (proktorObj?.nama_guru || null),
          proktor_nip: (selectedCount > 1 && !isTeacherMode) ? null : (proktorObj?.nip || null),
        },
      };

      if (jadwalToEdit) {
        await cbtApi.updateJadwal(jadwalToEdit.id, payload);
        toast.success('Jadwal ujian berhasil diperbarui');
      } else {
        await cbtApi.createJadwal(payload);
        toast.success('Jadwal ujian berhasil dibuat (Token 6 digit otomatis di-generate)');
      }

      await queryClient.invalidateQueries({ queryKey: cbtQueryKeys.jadwal(), exact: false, refetchType: 'all' });
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan jadwal ujian');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Label TP & Semester Terpilih untuk indikator kontekstual
  const activeTpLabel = useMemo(() => tpOptions.find((t) => t.value === tpId)?.label || activeTpYear?.tahun || 'Aktif', [tpOptions, tpId, activeTpYear]);
  const activeSemLabel = useMemo(() => semOptions.find((s) => s.value === semId)?.label || activeSemester?.nama_semester || 'Aktif', [semOptions, semId, activeSemester]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={jadwalToEdit ? 'Edit Jadwal Ujian CBT' : 'Jadwalkan Sesi Ujian CBT Baru'} size="md">
      <div className="-mt-3 sm:-mt-6 -mx-3 sm:-mx-6 mb-3 sm:mb-4 h-1.5 bg-[#673ab7]" />

      {/* Stepper Header 3 Langkah */}
      <div className="grid grid-cols-3 gap-1.5 p-1 mb-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60">
        {[
          { num: 1, label: 'Waktu' },
          { num: 2, label: selectedCount > 0 ? `Kelas (${selectedCount})` : 'Kelas' },
          { num: 3, label: 'Rapor' },
        ].map((s) => (
          <button
            key={s.num}
            type="button"
            onClick={(e) => handleGoToStep(s.num as 1 | 2 | 3, e)}
            className={cn(
              'flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer min-w-0',
              step === s.num
                ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300 shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            <span className={cn('w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center shrink-0', step === s.num ? 'bg-violet-600 text-white' : step > s.num ? 'bg-emerald-500 text-white' : 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300')}>
              {s.num}
            </span>
            <span className="truncate">{s.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {step === 1 ? (
          <div className="space-y-3.5 py-0.5">
            {/* Indikator Konteks Akademik Terpadu */}
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-violet-50/80 dark:bg-violet-950/40 border border-violet-200/60 dark:border-violet-800/50 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-600 animate-pulse" />
                <span className="text-slate-600 dark:text-slate-300">Konteks Akademik:</span>
                <span className="font-bold text-violet-900 dark:text-violet-200">{activeTpLabel}</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300">
                {activeSemLabel}
              </span>
            </div>

            {/* Pertanyaan 1: Pilih Bank Soal */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="jadwal-bank-soal" className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Pakai bank soal yang mana?
                </label>
                {teacherGuruId && !initialBankSoalId && (
                  <button type="button" onClick={() => setShowAllSchoolBank((prev) => !prev)} className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer">
                    {showAllSchoolBank ? 'Milik Saya' : 'Semua Bank Soal'}
                  </button>
                )}
              </div>
              {initialBankSoalId && selectedBankSoal ? (
                <div className="p-2.5 rounded-xl bg-violet-50/70 dark:bg-violet-950/40 border border-violet-200/80 dark:border-violet-800/60 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[10px] font-black text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-900/60 px-1.5 py-0.2 rounded">
                        {selectedBankSoal.kode_bank}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">Tingkat {selectedBankSoal.tingkat}</span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate mt-0.5">
                      {selectedBankSoal.judul}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 shrink-0">
                    Bank Terpilih
                  </span>
                </div>
              ) : (
                <SearchableSelect
                  id="jadwal-bank-soal"
                  options={bankSoalOptions}
                  value={bankSoalId}
                  onChange={setBankSoalId}
                  placeholder={isBankSoalLoading ? 'Memuat bank soal...' : bankSoalOptions.length === 0 ? 'Belum ada bank soal tersedia' : 'Pilih bank soal...'}
                  aria-label="Pilih Bank Soal"
                />
              )}
            </div>

            {/* Pertanyaan 2: Nama Sesi */}
            <div className="space-y-1.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
              <label htmlFor="jadwal-nama-sesi" className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Apa nama sesi ujian ini?
              </label>
              <Input id="jadwal-nama-sesi" value={namaSesi} onChange={(e) => setNamaSesi(e.target.value)} placeholder="Contoh: UAS Sesi 1" aria-label="Nama Sesi Ujian" required />
            </div>

            {/* Pertanyaan 3: Waktu Mulai Ujian */}
            <div className="space-y-1.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="jadwal-mulai" className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Kapan ujian dimulai ({tzLabel})?
                </label>
                <button type="button" onClick={syncWithNow} className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer">
                  Sekarang
                </button>
              </div>
              <Input id="jadwal-mulai" type="datetime-local" value={tanggalMulai} onChange={(e) => handleStartChange(e.target.value)} aria-label="Waktu Mulai Ujian" required />
            </div>

            {/* Pertanyaan 4: Durasi Pengerjaan */}
            <div className="space-y-1.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="jadwal-durasi" className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Berapa menit waktu pengerjaan?
                </label>
                {tanggalSelesai && (
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Selesai {getEndTimePreview(tanggalSelesai, tzLabel)}
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
                      durasiMenit === mnt ? 'bg-violet-600 text-white border-violet-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-violet-300'
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
            {/* Sasaran Kelas */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Untuk kelas mana saja?</p>
                  {totalCount > 0 && (
                    <span
                      className={cn(
                        'text-[10px] font-black px-2 py-0.5 rounded-full border',
                        isAllSelected
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                      )}
                    >
                      {isAllSelected
                        ? `✓ Lengkap (${selectedCount}/${totalCount} Terpilih)`
                        : `${selectedCount}/${totalCount} Terpilih`}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  {teacherClasses.length > 0 && (
                    <button type="button" onClick={() => setShowAllGradeClasses((prev) => !prev)} className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer">
                      {showAllGradeClasses ? 'Kelas Saya' : 'Semua Kelas'}
                    </button>
                  )}
                  <button type="button" onClick={selectAllKelas} className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                    {isAllSelected ? 'Reset' : 'Pilih Semua'}
                  </button>
                </div>
              </div>

              {displayedKelasList.length === 0 ? (
                <p className="text-xs text-amber-600 dark:text-amber-400 py-1">Tidak ada kelas yang cocok dengan tingkat bank soal.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                  {displayedKelasList.map((k) => {
                    const isChecked = validTargetKelasIds.includes(k.id);
                    return (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() => toggleKelas(k.id)}
                        aria-label={`Target Kelas ${k.nama_kelas}`}
                        className={cn(
                          'inline-flex items-center px-2.5 py-1 rounded-lg border text-xs transition-all cursor-pointer select-none',
                          isChecked
                            ? 'bg-violet-50 text-violet-700 border-violet-300 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-700 font-bold shadow-2xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                        )}
                      >
                        {isChecked && <Check size={11} className="mr-1 stroke-[3] text-violet-600 dark:text-violet-400" />}
                        <span>{k.nama_kelas}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Ploting Ruang & Pengawas / Proktor (Hanya Muncul untuk Mode Panitia / Kurikulum / Super Admin) */}
            {!isTeacherMode && (
              selectedCount > 1 ? (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 shrink-0 mt-0.5">
                    <Layers size={14} />
                  </div>
                  <div className="text-xs space-y-0.5 min-w-0">
                    <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                      <span>Ujian Serentak Multi-Kelas ({selectedCount} Rombel)</span>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
                        Paralel
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                      Ploting slot ruang fisik (<span className="font-mono font-semibold text-slate-700 dark:text-slate-300">R.01 s/d R.{String(selectedCount).padStart(2, '0')}</span>) &amp; guru pengawas diatur terpusat melalui <strong>Meja Orkestrasi CBT</strong>.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                  <div className="space-y-1">
                    <label htmlFor="jadwal-ruang" className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                      Di ruang / kelas mana ujian berlangsung? <span className="font-normal text-slate-400">(Opsional)</span>
                    </label>
                    <Input id="jadwal-ruang" value={ruangUjian} onChange={(e) => setRuangUjian(e.target.value)} placeholder="Contoh: Ruang 10 / Lab Komputer" aria-label="Ruang atau Kelas Ujian" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1 min-w-0">
                      <label htmlFor="jadwal-pengawas-1" className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                        Siapa Pengawas Ruang / Kelas?
                      </label>
                      <SearchableSelect id="jadwal-pengawas-1" options={pengawasSelectOptions} value={pengawas1Id} onChange={setPengawas1Id} placeholder="Pilih Guru Pengawas..." aria-label="Pilih Pengawas Ruang" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <label htmlFor="jadwal-proktor" className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                        Proktor / Pengawas 2 <span className="font-normal text-slate-400">(Opsional)</span>
                      </label>
                      <SearchableSelect id="jadwal-proktor" options={pengawasSelectOptions} value={proktorId} onChange={setProktorId} placeholder="Kosongkan jika cukup 1 pengawas..." aria-label="Pilih Proktor Ujian" />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    💡 Guru yang di-plot sebagai <strong>Pengawas</strong> otomatis mendapatkan akses Token, Monitoring, Reset Login, & Berita Acara.
                  </p>
                </div>
              )
            )}
          </div>
        ) : (
          <div className="space-y-3.5 py-0.5">
            {/* Keamanan & Opsi Nilai */}
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Tampilkan nilai langsung ke siswa setelah selesai?</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setShowResultInstant(true)} className={cn('py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center', showResultInstant ? 'bg-violet-600 text-white border-violet-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800')}>
                  Ya
                </button>
                <button type="button" onClick={() => setShowResultInstant(false)} className={cn('py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center', !showResultInstant ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800')}>
                  Tidak
                </button>
              </div>
            </div>

            <div className="space-y-1.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Aktifkan mode anti-curang (acak soal & kunci tab)?</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => { setBlockTabSwitch(true); setShuffleQuestions(true); setShuffleOptions(true); }} className={cn('py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center', blockTabSwitch ? 'bg-violet-600 text-white border-violet-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800')}>
                  Ya
                </button>
                <button type="button" onClick={() => setBlockTabSwitch(false)} className={cn('py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center', !blockTabSwitch ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800')}>
                  Tidak
                </button>
              </div>
            </div>

            {/* Transfer Nilai e-Rapor */}
            <div className="space-y-1.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Transfer nilai otomatis ke e-Rapor?</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setAutoTransferRapor(true)} className={cn('py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center', autoTransferRapor ? 'bg-violet-600 text-white border-violet-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800')}>
                  Ya
                </button>
                <button type="button" onClick={() => setAutoTransferRapor(false)} className={cn('py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center', !autoTransferRapor ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800')}>
                  Tidak
                </button>
              </div>
            </div>

            {autoTransferRapor && (
              <div className="space-y-1.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Masukkan ke kolom nilai mana?</p>
                <div className="grid grid-cols-4 gap-2">
                  {([
                    { key: 'sumatif_1', label: 'SUM 1' },
                    { key: 'sumatif_2', label: 'SUM 2' },
                    { key: 'sumatif_3', label: 'SUM 3' },
                    { key: 'sumatif_akhir', label: 'SUM AKHIR' },
                  ] as { key: CbtRaporSlot; label: string }[]).map((slot) => {
                    const active = targetRaporSlot === slot.key;
                    return (
                      <button
                        key={slot.key}
                        type="button"
                        onClick={() => setTargetRaporSlot(slot.key)}
                        className={cn('py-2 px-2 rounded-lg border text-xs font-bold text-center transition-all cursor-pointer', active ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-emerald-400')}
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

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          {step > 1 ? (
            <Button key="btn-back" type="button" variant="outline" size="sm" onClick={(e) => handleGoToStep((step - 1) as 1 | 2, e)} disabled={isSubmitting} className="flex items-center gap-1.5">
              <ArrowLeft size={14} />
              <span>Kembali</span>
            </Button>
          ) : (
            <Button key="btn-cancel" type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Batal
            </Button>
          )}

          {step === 1 ? (
            <Button key="btn-next-step2" type="button" variant="primary" size="sm" onClick={(e) => handleGoToStep(2, e)} className="bg-[#673ab7] hover:bg-[#5e35b1] text-white font-bold flex items-center gap-1.5">
              <span>Lanjut</span>
              <ArrowRight size={14} />
            </Button>
          ) : step === 2 ? (
            <Button key="btn-next-step3" type="button" variant="primary" size="sm" onClick={(e) => handleGoToStep(3, e)} className="bg-[#673ab7] hover:bg-[#5e35b1] text-white font-bold flex items-center gap-1.5">
              <span>Lanjut</span>
              <ArrowRight size={14} />
            </Button>
          ) : (
            <Button key="btn-submit" type="submit" variant="primary" size="sm" disabled={isSubmitting} className="bg-[#673ab7] hover:bg-[#5e35b1] text-white font-bold">
              {isSubmitting ? 'Menyimpan...' : 'Simpan'}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
};
