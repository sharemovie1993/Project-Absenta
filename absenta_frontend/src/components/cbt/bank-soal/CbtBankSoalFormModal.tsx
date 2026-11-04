import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Button,
  Input,
  SearchableSelect,
} from '@/components/ui';
import { useGuruOptions, useMapelOptions, useSemesterOptions } from '@/components/common';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import { kurikulumApi } from '@/api/kurikulum.api';
import { useAuthStore } from '@/store/authStore';
import { useCapabilities } from '@/hooks/useCapabilities';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { CbtBankSoal } from '@/types/cbt.types';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { Layers, User, Sparkles, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';

export type CbtBankSoalScope = 'TERPUSAT_MASSAL' | 'MANDIRI_GURU';

export interface OfficialAsesmenType {
  key: string;
  singkatan: string;
  namaResmi: string;
  keterangan: string;
  defaultPrefix: string;
  allowedTingkat?: Array<'X' | 'XI' | 'XII' | 'SEMUA'>;
  tingkatRuleExplanation?: string;
}

export const OFFICIAL_ASESMEN_TYPES: OfficialAsesmenType[] = [
  {
    key: 'SAS',
    singkatan: 'SAS',
    namaResmi: 'Sumatif Akhir Semester',
    keterangan: 'Semester 1 (Ganjil)',
    defaultPrefix: 'SAS',
    allowedTingkat: ['X', 'XI', 'XII', 'SEMUA'],
  },
  {
    key: 'SAT',
    singkatan: 'SAT',
    namaResmi: 'Sumatif Akhir Tahun',
    keterangan: 'Kenaikan Kelas (Sem. 2)',
    defaultPrefix: 'SAT',
    allowedTingkat: ['X', 'XI'],
    tingkatRuleExplanation: 'Khusus Kenaikan Kelas X & XI',
  },
  {
    key: 'STS',
    singkatan: 'STS',
    namaResmi: 'Sumatif Tengah Semester',
    keterangan: 'Tengah Semester',
    defaultPrefix: 'STS',
    allowedTingkat: ['X', 'XI', 'XII', 'SEMUA'],
  },
  {
    key: 'PSAJ',
    singkatan: 'PSAJ',
    namaResmi: 'Penilaian Sumatif Akhir Jenjang',
    keterangan: 'Kelulusan Kelas XII',
    defaultPrefix: 'PSAJ',
    allowedTingkat: ['XII'],
    tingkatRuleExplanation: 'Khusus Kelulusan Kelas XII',
  },
  {
    key: 'SLM',
    singkatan: 'SLM',
    namaResmi: 'Sumatif Lingkup Materi',
    keterangan: 'Ulangan Bab / TP',
    defaultPrefix: 'SLM',
    allowedTingkat: ['X', 'XI', 'XII', 'SEMUA'],
  },
  {
    key: 'TRYOUT',
    singkatan: 'Simulasi',
    namaResmi: 'Simulasi / Try Out Asesmen',
    keterangan: 'Try Out & ANBK',
    defaultPrefix: 'TRYOUT',
    allowedTingkat: ['X', 'XI', 'XII', 'SEMUA'],
  },
];

export interface SmartPeriodDetection {
  recommendedKey: string;
  semesterLabel: string;
  monthName: string;
  reason: string;
  shortTag: string;
}

/**
 * Mendeteksi jenis kegiatan asesmen yang paling relevan secara cerdas
 * berdasarkan kalender bulan berjalan & semester aktif sekolah.
 * 
 * - Semester Ganjil (Juli - Des):
 *   * Juli-Agustus: SLM (Sumatif Lingkup Materi / Ulangan Awal Bab)
 *   * September-Oktober: STS (Sumatif Tengah Semester)
 *   * November-Desember: SAS (Sumatif Akhir Semester)
 * - Semester Genap (Januari - Juni):
 *   * Januari-Februari: SLM / Simulasi ANBK
 *   * Februari-Maret: STS (Sumatif Tengah Semester Genap)
 *   * Maret-April: PSAJ (Penilaian Sumatif Akhir Jenjang / Kelulusan XII)
 *   * Mei-Juni: SAT (Sumatif Akhir Tahun / Kenaikan Kelas)
 */
export function detectSmartAsesmenType(
  activeSemester?: { nama_semester?: string; is_active?: boolean } | null,
  tingkat?: string
): SmartPeriodDetection {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const monthName = monthNames[month - 1];

  const semName = (activeSemester?.nama_semester || '').toLowerCase();
  const isExplicitGenap = semName.includes('genap') || semName.includes('2');
  const isExplicitGanjil = semName.includes('ganjil') || semName.includes('gasal') || semName.includes('1');

  // Bila semester belum tersetting, gunakan kalender nasional Indonesia:
  // Bulan 7 - 12 (Juli - Desember) = Semester Ganjil
  // Bulan 1 - 6 (Januari - Juni) = Semester Genap
  const isGanjil = isExplicitGanjil ? true : isExplicitGenap ? false : (month >= 7 && month <= 12);
  const semesterLabel = isGanjil ? 'Semester Ganjil' : 'Semester Genap';

  if (isGanjil) {
    if (month >= 11 || month === 12) {
      return {
        recommendedKey: 'SAS',
        semesterLabel,
        monthName,
        reason: `Bulan ${monthName} berada di penghujung Semester Ganjil — waktu pelaksanaan Sumatif Akhir Semester (SAS).`,
        shortTag: 'Periode SAS (Akhir Smt 1)',
      };
    } else if (month === 9 || month === 10) {
      return {
        recommendedKey: 'STS',
        semesterLabel,
        monthName,
        reason: `Bulan ${monthName} adalah periode evaluasi progres Sumatif Tengah Semester (STS) Ganjil.`,
        shortTag: 'Periode STS (Tengah Smt 1)',
      };
    } else {
      return {
        recommendedKey: 'SLM',
        semesterLabel,
        monthName,
        reason: `Bulan ${monthName} adalah awal semester — pelaksanaan Sumatif Lingkup Materi / Ulangan Bab (SLM).`,
        shortTag: 'Periode SLM (Lingkup Materi)',
      };
    }
  } else {
    // Semester Genap (Januari - Juni)
    if (tingkat === 'XII' && (month === 2 || month === 3 || month === 4)) {
      return {
        recommendedKey: 'PSAJ',
        semesterLabel,
        monthName,
        reason: `Bulan ${monthName} bagi tingkat akhir (XII) adalah agenda Penilaian Sumatif Akhir Jenjang (PSAJ / Kelulusan).`,
        shortTag: 'Periode PSAJ (Tingkat XII)',
      };
    } else if (month >= 5 || month === 6) {
      return {
        recommendedKey: 'SAT',
        semesterLabel,
        monthName,
        reason: `Bulan ${monthName} berada di penghujung Semester Genap — waktu pelaksanaan evaluasi kenaikan kelas (SAT).`,
        shortTag: 'Periode SAT (Kenaikan Kelas)',
      };
    } else if (month === 2 || month === 3) {
      return {
        recommendedKey: 'STS',
        semesterLabel,
        monthName,
        reason: `Bulan ${monthName} adalah periode evaluasi progres Sumatif Tengah Semester (STS) Genap.`,
        shortTag: 'Periode STS (Tengah Smt 2)',
      };
    } else {
      return {
        recommendedKey: 'TRYOUT',
        semesterLabel,
        monthName,
        reason: `Bulan ${monthName} awal semester genap lazim untuk Simulasi / Try Out asesmen dan persiapan ANBK.`,
        shortTag: 'Simulasi / Try Out',
      };
    }
  }
}

interface CbtBankSoalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankSoalToEdit?: CbtBankSoal | null;
  onSuccess: () => void;
  defaultGuruId?: string;
  defaultMapelId?: string;
  roleContext?: 'GURU' | 'KURIKULUM' | 'ADMIN';
}

const step1Schema = z.object({
  mapel_id: z.string().min(1, 'Mata pelajaran wajib dipilih'),
  tingkat: z.enum(['X', 'XI', 'XII', 'SEMUA']),
});

const bankSoalSchema = z.object({
  kode_bank: z.string().min(2, 'Kode bank soal minimal 2 karakter').max(50),
  judul: z.string().min(3, 'Judul bank soal minimal 3 karakter').max(200),
  guru_id: z.string().min(1, 'Guru pembuat/penyusun soal wajib dipilih'),
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
  roleContext,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { isAdmin, isKurikulum } = useCapabilities();

  const isPrivilegedRole = isAdmin || isKurikulum || roleContext === 'KURIKULUM' || roleContext === 'ADMIN';

  // 1. Pemisahan Konteks: Mandiri Guru vs Terpusat Massal (UAS/PAS/US/Panitia)
  const initialScope: CbtBankSoalScope = useMemo(() => {
    if (bankSoalToEdit) {
      const code = bankSoalToEdit.kode_bank.toUpperCase();
      if (
        code.startsWith('PAS-') ||
        code.startsWith('UAS-') ||
        code.startsWith('PAT-') ||
        code.startsWith('US-') ||
        code.startsWith('PTS-') ||
        code.startsWith('SAS-') ||
        code.startsWith('SAT-') ||
        code.startsWith('STS-') ||
        code.startsWith('PSAJ-')
      ) {
        return 'TERPUSAT_MASSAL';
      }
      return 'MANDIRI_GURU';
    }
    return isPrivilegedRole && !defaultGuruId ? 'TERPUSAT_MASSAL' : 'MANDIRI_GURU';
  }, [bankSoalToEdit, isPrivilegedRole, defaultGuruId]);

  const { activeSemester } = useSemesterOptions();
  const [tingkat, setTingkat] = useState<'X' | 'XI' | 'XII' | 'SEMUA'>('X');

  // Deteksi cerdas asesmen resmi berdasarkan bulan berjalan & semester aktif
  const smartDetection = useMemo(() => {
    return detectSmartAsesmenType(activeSemester, tingkat);
  }, [activeSemester, tingkat]);

  const [step, setStep] = useState<1 | 2>(1);
  const [scope, setScope] = useState<CbtBankSoalScope>(initialScope);
  const [jenisKegiatanMassal, setJenisKegiatanMassal] = useState<string>(() => {
    if (bankSoalToEdit) {
      const code = bankSoalToEdit.kode_bank.toUpperCase();
      const detected = OFFICIAL_ASESMEN_TYPES.find((t) => code.startsWith(`${t.key}-`));
      if (detected) return detected.key;
    }
    return detectSmartAsesmenType(activeSemester, 'X').recommendedKey;
  });

  const isTeacherLocked = useMemo(() => {
    if (isPrivilegedRole || scope === 'TERPUSAT_MASSAL') return false;
    return Boolean(defaultGuruId || user?.guru_profile?.id);
  }, [isPrivilegedRole, scope, defaultGuruId, user?.guru_profile?.id]);

  // Evaluasi definisi asesmen & proteksi tingkat kelas yang diperkenankan (Anti Human-Error)
  const activeAsesmenDef = useMemo(() => {
    if (scope !== 'TERPUSAT_MASSAL') return null;
    return OFFICIAL_ASESMEN_TYPES.find((t) => t.key === jenisKegiatanMassal) || null;
  }, [scope, jenisKegiatanMassal]);

  const allowedTingkatList = useMemo(() => {
    if (!activeAsesmenDef?.allowedTingkat) {
      return ['X', 'XI', 'XII', 'SEMUA'] as const;
    }
    return activeAsesmenDef.allowedTingkat;
  }, [activeAsesmenDef]);

  const initialGuruId = useMemo(() => {
    return defaultGuruId || user?.guru_profile?.id || '';
  }, [defaultGuruId, user?.guru_profile?.id]);

  const { options: guruOptions, loading: guruLoading } = useGuruOptions();
  const { options: mapelOptions, loading: mapelLoading } = useMapelOptions();

  const [kodeBank, setKodeBank] = useState('');
  const [judul, setJudul] = useState('');
  const [guruId, setGuruId] = useState(initialGuruId);
  const [mapelId, setMapelId] = useState(defaultMapelId || '');
  const [alokasiMenit, setAlokasiMenit] = useState<number>(90);
  const [acakSoal, setAcakSoal] = useState(true);
  const [acakOpsi, setAcakOpsi] = useState(true);
  const [isShared, setIsShared] = useState(true);
  const [showAllMapels, setShowAllMapels] = useState(isPrivilegedRole || initialScope === 'TERPUSAT_MASSAL');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ambil data penugasan mapel guru yang sedang dipilih (hanya relevan di mode Mandiri Guru)
  const { data: teacherAssignedMapels, isLoading: isAssignedMapelsLoading } = useQuery({
    queryKey: ['guru-assigned-mapels', guruId],
    queryFn: () => (guruId ? kurikulumApi.getGuruMapel(guruId).catch(() => null) : null),
    enabled: isOpen && !!guruId && scope === 'MANDIRI_GURU',
  });

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

  const activeMapelOptions = useMemo(() => {
    if (scope === 'TERPUSAT_MASSAL' || showAllMapels || assignedMapels.length === 0) {
      return mapelOptions;
    }
    let base = assignedMapels;
    if (mapelId && !base.some((m) => m.value === mapelId)) {
      const canonical = mapelOptions.find((m) => m.value === mapelId);
      if (canonical) base = [canonical, ...base];
    }
    return base;
  }, [scope, showAllMapels, assignedMapels, mapelOptions, mapelId]);

  // Auto-generate judul & kode bank pada mode massal saat mapel atau kegiatan berubah
  const handleAutoFillMassal = (targetMapelId: string, targetTingkat: string, targetKegiatanKey: string) => {
    const selectedMapel = mapelOptions.find((m) => m.value === targetMapelId);
    const mapelName = selectedMapel?.label?.split('(')[0]?.trim() || 'Mata Pelajaran';
    const year = new Date().getFullYear();
    const cleanMapelCode = (selectedMapel?.label || 'MAPEL')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 4)
      .toUpperCase();

    const selectedDef = OFFICIAL_ASESMEN_TYPES.find((t) => t.key === targetKegiatanKey);
    const prefix = selectedDef?.defaultPrefix || targetKegiatanKey;
    const fullOfficialName = selectedDef?.namaResmi || targetKegiatanKey;

    const generatedCode = `${prefix}-${year}-${cleanMapelCode}-${targetTingkat}`;
    const generatedTitle = `${prefix} - ${mapelName} Tingkat ${targetTingkat} (${fullOfficialName})`;

    setKodeBank(generatedCode);
    setJudul(generatedTitle);
  };

  // Aksi pemilihan kegiatan massal dengan proteksi otomatis tingkat kelas (Anti Human-Error)
  const handleSelectKegiatanMassal = (targetKey: string) => {
    setJenisKegiatanMassal(targetKey);
    const def = OFFICIAL_ASESMEN_TYPES.find((t) => t.key === targetKey);
    let nextTingkat = tingkat;
    if (def?.allowedTingkat && !def.allowedTingkat.includes(tingkat)) {
      nextTingkat = def.allowedTingkat[0];
      setTingkat(nextTingkat);
    }
    if (mapelId) {
      handleAutoFillMassal(mapelId, nextTingkat, targetKey);
    }
  };

  useEffect(() => {
    if (bankSoalToEdit) {
      setStep(1);
      setKodeBank(bankSoalToEdit.kode_bank);
      setJudul(bankSoalToEdit.judul);
      setGuruId(bankSoalToEdit.guru_id);
      setMapelId(bankSoalToEdit.mapel_id);
      setTingkat(bankSoalToEdit.tingkat);
      setAlokasiMenit(bankSoalToEdit.alokasi_menit);
      setAcakSoal(bankSoalToEdit.acak_soal);
      setAcakOpsi(bankSoalToEdit.acak_opsi);
      setIsShared(bankSoalToEdit.status === 'PUBLISHED' || Boolean(bankSoalToEdit.is_shared));
      setShowAllMapels(true);

      const code = bankSoalToEdit.kode_bank.toUpperCase();
      const detected = OFFICIAL_ASESMEN_TYPES.find((t) => code.startsWith(`${t.key}-`));
      if (detected) {
        setJenisKegiatanMassal(detected.key);
      }
    } else {
      setStep(1);
      setScope(initialScope);
      const isMassal = initialScope === 'TERPUSAT_MASSAL';
      const year = new Date().getFullYear();
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const recKey = smartDetection.recommendedKey;
      const def = OFFICIAL_ASESMEN_TYPES.find((t) => t.key === recKey);
      const defaultTingkat = def?.allowedTingkat && !def.allowedTingkat.includes('X')
        ? def.allowedTingkat[0]
        : 'X';

      setJenisKegiatanMassal(recKey);
      setKodeBank(isMassal ? `${recKey}-${year}-MAPEL-${defaultTingkat}` : `CBT-${year}-${randomSuffix}`);
      setJudul('');
      setGuruId(initialGuruId);
      setMapelId(defaultMapelId || '');
      setTingkat(defaultTingkat);
      setAlokasiMenit(90);
      setAcakSoal(true);
      setAcakOpsi(true);
      setIsShared(true);
      setShowAllMapels(isPrivilegedRole || isMassal);
    }
  }, [bankSoalToEdit, initialGuruId, defaultMapelId, isOpen, initialScope, isPrivilegedRole, smartDetection.recommendedKey]);

  const handleChangeScope = (newScope: CbtBankSoalScope) => {
    setScope(newScope);
    const year = new Date().getFullYear();
    if (newScope === 'TERPUSAT_MASSAL') {
      setShowAllMapels(true);
      setIsShared(true);
      const recKey = smartDetection.recommendedKey;
      const def = OFFICIAL_ASESMEN_TYPES.find((t) => t.key === recKey);
      const targetTingkat = def?.allowedTingkat && !def.allowedTingkat.includes(tingkat)
        ? def.allowedTingkat[0]
        : tingkat;
      setJenisKegiatanMassal(recKey);
      setTingkat(targetTingkat);
      if (mapelId) {
        handleAutoFillMassal(mapelId, targetTingkat, recKey);
      }
    } else {
      if (
        kodeBank.startsWith('SAS-') ||
        kodeBank.startsWith('SAT-') ||
        kodeBank.startsWith('STS-') ||
        kodeBank.startsWith('PSAJ-') ||
        kodeBank.startsWith('PAS-') ||
        kodeBank.startsWith('PAT-')
      ) {
        setKodeBank(`SLM-${year}-${Math.floor(1000 + Math.random() * 9000)}`);
      }
    }
  };

  const handleNextStep = () => {
    const val = step1Schema.safeParse({ mapel_id: mapelId, tingkat });
    if (!val.success) {
      toast.error(val.error.issues.map((i) => i.message).join(', '));
      return;
    }

    if (scope === 'TERPUSAT_MASSAL' && !allowedTingkatList.includes(tingkat)) {
      toast.error(`Tingkat ${tingkat} tidak diperkenankan untuk jenis kegiatan asesmen ${jenisKegiatanMassal}`);
      return;
    }

    if (scope === 'TERPUSAT_MASSAL' && (!judul || judul.startsWith('SAS -') || judul.startsWith('PAS -') || judul.startsWith('SAT -') || judul.startsWith('PSAJ -'))) {
      handleAutoFillMassal(mapelId, tingkat, jenisKegiatanMassal);
    } else if (scope === 'MANDIRI_GURU' && !judul) {
      const selectedMapel = mapelOptions.find((m) => m.value === mapelId);
      const mapelName = selectedMapel?.label?.split('(')[0]?.trim() || 'Mata Pelajaran';
      setJudul(`Ulangan Harian - ${mapelName} Tingkat ${tingkat}`);
    }

    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (scope === 'TERPUSAT_MASSAL' && !allowedTingkatList.includes(tingkat)) {
      toast.error(`Tingkat ${tingkat} tidak diperkenankan untuk asesmen ${jenisKegiatanMassal}`);
      return;
    }

    const validation = bankSoalSchema.safeParse({
      kode_bank: kodeBank.trim().toUpperCase(),
      judul: judul.trim(),
      guru_id: guruId,
      mapel_id: mapelId,
      tingkat,
      alokasi_menit: Number(alokasiMenit),
    });

    if (!validation.success) {
      toast.error(
        validation.error.issues.map((err) => err.message).join(', ') || 'Data bank soal belum lengkap'
      );
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
        status: (scope === 'TERPUSAT_MASSAL' || isShared ? 'PUBLISHED' : 'DRAFT') as 'PUBLISHED' | 'DRAFT',
        is_shared: scope === 'TERPUSAT_MASSAL' ? true : isShared,
      };

      if (bankSoalToEdit) {
        await cbtApi.updateBankSoal(bankSoalToEdit.id, payload);
        toast.success('Bank soal berhasil diperbarui');
      } else {
        await cbtApi.createBankSoal(payload);
        toast.success(
          scope === 'TERPUSAT_MASSAL'
            ? 'Paket bank soal ujian serentak berhasil dibuat & siap dijadwalkan'
            : 'Bank soal mandiri guru berhasil dibuat'
        );
      }

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
      title={bankSoalToEdit ? 'Edit Paket Bank Soal' : 'Buat Paket Bank Soal'}
      size="lg"
    >
      {/* ── Stepper Ramping & Bersih ── */}
      <div className="mb-3.5 grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
        <button
          type="button"
          onClick={() => setStep(1)}
          className={cn(
            'flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer',
            step === 1
              ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300 shadow-2xs'
              : 'text-slate-500 hover:text-slate-800'
          )}
        >
          <span
            className={cn(
              'w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center shrink-0',
              step === 1 ? 'bg-violet-600 text-white' : 'bg-emerald-500 text-white'
            )}
          >
            {step > 1 ? '✓' : '1'}
          </span>
          <span>Sasaran Asesmen</span>
        </button>

        <button
          type="button"
          onClick={handleNextStep}
          className={cn(
            'flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer',
            step === 2
              ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300 shadow-2xs'
              : 'text-slate-500 hover:text-slate-800'
          )}
        >
          <span
            className={cn(
              'w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center shrink-0',
              step === 2 ? 'bg-violet-600 text-white' : 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            )}
          >
            2
          </span>
          <span>Identitas &amp; Waktu</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {step === 1 ? (
          /* ── TAHAP 1: KONTEKS, SASARAN, & MATA PELAJARAN ── */
          <div className="space-y-3">
            {/* 1. Konteks Penggunaan */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Jenis Bank Soal
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleChangeScope('TERPUSAT_MASSAL')}
                  className={cn(
                    'p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5',
                    scope === 'TERPUSAT_MASSAL'
                      ? 'bg-violet-50 dark:bg-violet-950/40 border-violet-600 ring-2 ring-violet-500/20 text-violet-950 dark:text-violet-100'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 hover:border-slate-300'
                  )}
                >
                  <div
                    className={cn(
                      'p-1.5 rounded-lg shrink-0',
                      scope === 'TERPUSAT_MASSAL' ? 'bg-violet-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    )}
                  >
                    <Layers size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs">Paket Massal Sekolah</div>
                    <div className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate">SAS, SAT, STS, PSAJ Serentak</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleChangeScope('MANDIRI_GURU')}
                  className={cn(
                    'p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5',
                    scope === 'MANDIRI_GURU'
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-600 ring-2 ring-indigo-500/20 text-indigo-950 dark:text-indigo-100'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 hover:border-slate-300'
                  )}
                >
                  <div
                    className={cn(
                      'p-1.5 rounded-lg shrink-0',
                      scope === 'MANDIRI_GURU' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    )}
                  >
                    <User size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs">Mandiri Guru</div>
                    <div className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate">Ulangan harian &amp; kuis kelas</div>
                  </div>
                </button>
              </div>
            </div>

            {/* 2. Kegiatan Asesmen (Hanya pada Paket Massal) */}
            {scope === 'TERPUSAT_MASSAL' && (
              <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Kegiatan Asesmen
                    </label>
                    <span className="text-[10.5px] text-violet-600 dark:text-violet-400 font-semibold flex items-center gap-1">
                      <Sparkles size={11} />
                      <span>Saran {smartDetection.monthName}: <strong>{smartDetection.recommendedKey}</strong></span>
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Permendikbud 21/2022
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {OFFICIAL_ASESMEN_TYPES.map((k) => {
                    const isSelected = jenisKegiatanMassal === k.key;
                    const isRecommended = smartDetection.recommendedKey === k.key;
                    return (
                      <button
                        key={k.key}
                        type="button"
                        onClick={() => handleSelectKegiatanMassal(k.key)}
                        className={cn(
                          'p-2 rounded-xl text-left transition-all cursor-pointer border flex flex-col justify-between gap-0.5',
                          isSelected
                            ? 'bg-violet-600 text-white border-violet-600 shadow-2xs'
                            : isRecommended
                            ? 'bg-violet-50/60 dark:bg-violet-950/20 text-slate-700 dark:text-slate-300 border-violet-300 dark:border-violet-700 hover:border-violet-400'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        )}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-xs">{k.singkatan}</span>
                          {isRecommended && (
                            <span
                              className={cn(
                                'text-[8.5px] font-bold px-1.5 py-0.2 rounded-full flex items-center gap-0.5',
                                isSelected
                                  ? 'bg-amber-400 text-amber-950 font-black'
                                  : 'bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300'
                              )}
                            >
                              <Sparkles size={8} />
                              <span>Bulan Ini</span>
                            </span>
                          )}
                        </div>
                        <p
                          className={cn(
                            'text-[10.5px] font-medium truncate',
                            isSelected ? 'text-violet-100' : 'text-slate-500 dark:text-slate-400'
                          )}
                        >
                          {k.keterangan}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Mata Pelajaran */}
            <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="form-mapel" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Mata Pelajaran
                </label>
                {scope === 'MANDIRI_GURU' && assignedMapels.length > 0 && (
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
                onChange={(newMapelId) => {
                  setMapelId(newMapelId);
                  if (scope === 'TERPUSAT_MASSAL') {
                    handleAutoFillMassal(newMapelId, tingkat, jenisKegiatanMassal);
                  }
                }}
                placeholder={
                  isAssignedMapelsLoading || mapelLoading
                    ? 'Memuat mata pelajaran...'
                    : activeMapelOptions.length === 0
                    ? 'Tidak ada mapel tersedia'
                    : 'Pilih mata pelajaran sekolah...'
                }
                aria-label="Pilih Mata Pelajaran"
              />
            </div>

            {/* 4. Tingkat Kelas (Terproteksi Anti Human-Error) */}
            <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tingkat Kelas
                </label>
                {activeAsesmenDef?.tingkatRuleExplanation && (
                  <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                    ⚠️ {activeAsesmenDef.tingkatRuleExplanation}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2">
                {(
                  [
                    { value: 'X', label: 'Kelas X' },
                    { value: 'XI', label: 'Kelas XI' },
                    { value: 'XII', label: 'Kelas XII' },
                    { value: 'SEMUA', label: 'Semua' },
                  ] as { value: 'X' | 'XI' | 'XII' | 'SEMUA'; label: string }[]
                ).map((item) => {
                  const isAllowed = allowedTingkatList.includes(item.value);
                  const isSelected = tingkat === item.value;

                  return (
                    <button
                      key={item.value}
                      type="button"
                      disabled={!isAllowed}
                      onClick={() => {
                        if (!isAllowed) return;
                        setTingkat(item.value);
                        if (scope === 'TERPUSAT_MASSAL' && mapelId) {
                          handleAutoFillMassal(mapelId, item.value, jenisKegiatanMassal);
                        }
                      }}
                      className={cn(
                        'py-2 px-2 rounded-lg border text-xs font-bold transition-all text-center flex items-center justify-center gap-1',
                        !isAllowed
                          ? 'opacity-35 bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 cursor-not-allowed line-through'
                          : isSelected
                          ? 'bg-violet-600 text-white border-violet-600 shadow-2xs cursor-pointer'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 hover:border-slate-300 cursor-pointer'
                      )}
                      title={!isAllowed ? `Tidak relevan untuk ${jenisKegiatanMassal}` : item.label}
                    >
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* ── TAHAP 2: IDENTITAS, DURASI, & PENYUSUN SOAL ── */
          <div className="space-y-3">
            {/* Judul & Kode Bank Soal */}
            <div className="space-y-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="form-judul-bank" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Judul Bank Soal
                  </label>
                  {mapelId && (
                    <button
                      type="button"
                      onClick={() => handleAutoFillMassal(mapelId, tingkat, jenisKegiatanMassal)}
                      className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 flex items-center gap-1 hover:underline cursor-pointer"
                      title="Generate otomatis judul standar"
                    >
                      <Sparkles size={11} />
                      <span>Format Standar</span>
                    </button>
                  )}
                </div>
                <Input
                  id="form-judul-bank"
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  placeholder="Contoh: SAS Ganjil - Matematika Tingkat X"
                  aria-label="Judul Bank Soal"
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="form-kode-bank" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Kode Paket
                </label>
                <Input
                  id="form-kode-bank"
                  value={kodeBank}
                  onChange={(e) => setKodeBank(e.target.value.toUpperCase())}
                  placeholder="Contoh: SAS-2026-MAT-X"
                  aria-label="Kode Bank Soal"
                  required
                />
              </div>
            </div>

            {/* Guru Penyusun / Penanggung Jawab */}
            {!isTeacherLocked && (
              <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                <label htmlFor="form-guru" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Guru Penyusun / Penanggung Jawab
                </label>
                <SearchableSelect
                  id="form-guru"
                  options={guruOptions}
                  value={guruId}
                  onChange={(newGuruId) => {
                    setGuruId(newGuruId);
                    if (scope === 'MANDIRI_GURU') {
                      setMapelId('');
                      setShowAllMapels(false);
                    }
                  }}
                  placeholder={guruLoading ? 'Memuat daftar guru...' : 'Pilih guru penyusun...'}
                  aria-label="Pilih Guru Penyusun Soal"
                />
              </div>
            )}

            {/* Durasi Ujian Default */}
            <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
              <label htmlFor="form-durasi" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Alokasi Durasi (Menit)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[60, 90, 120].map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => setAlokasiMenit(dur)}
                    className={cn(
                      'py-2 px-2 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center',
                      alokasiMenit === dur
                        ? 'bg-violet-600 text-white border-violet-600 shadow-2xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 hover:border-slate-300'
                    )}
                  >
                    {dur} Menit
                  </button>
                ))}
                <Input
                  id="form-durasi"
                  type="number"
                  value={alokasiMenit}
                  onChange={(e) => setAlokasiMenit(Number(e.target.value) || 90)}
                  aria-label="Alokasi Durasi Kustom"
                  className="text-center font-bold text-xs"
                />
              </div>
            </div>

            {/* Visibilitas & Berbagi Soal */}
            {scope === 'MANDIRI_GURU' ? (
              <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Visibilitas &amp; Berbagi Soal
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsShared(true)}
                    className={cn(
                      'py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center',
                      isShared
                        ? 'bg-violet-600 text-white border-violet-600 shadow-2xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 hover:border-slate-300'
                    )}
                  >
                    Ya, Bagikan Se-Mapel
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsShared(false)}
                    className={cn(
                      'py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center',
                      !isShared
                        ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 hover:border-slate-300'
                    )}
                  >
                    Pribadi
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  <span>
                    Paket soal massal otomatis berstatus <strong>PUBLISHED</strong> untuk penjadwalan terpusat.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Actions Footer Ramping ── */}
        <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800">
          {step === 1 ? (
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Batal
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStep(1)}
              disabled={isSubmitting}
              className="flex items-center gap-1.5"
            >
              <ArrowLeft size={14} />
              <span>Kembali</span>
            </Button>
          )}

          {step === 1 ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleNextStep}
              className="bg-[#673ab7] hover:bg-[#5e35b1] text-white font-bold flex items-center gap-1.5"
            >
              <span>Lanjut ke Tahap 2</span>
              <ArrowRight size={14} />
            </Button>
          ) : (
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              className="bg-[#673ab7] hover:bg-[#5e35b1] text-white font-bold"
            >
              {isSubmitting ? 'Menyimpan...' : scope === 'TERPUSAT_MASSAL' ? 'Terbitkan Paket Massal' : 'Simpan Bank Soal'}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
};
