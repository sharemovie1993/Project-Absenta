import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Input, SearchableSelect, Badge } from '@/components/ui';
import { useGuruOptions, useMapelOptions, useSemesterOptions, useJurusanOptions, useTahunPelajaranOptions } from '@/components/common';
import { useJenjang } from '@/hooks/useJenjang';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import { kurikulumApi } from '@/api/kurikulum.api';
import { listTenantUnits } from '@/api/kurikulum/guru-mapel.api';
import { useAuthStore } from '@/store/authStore';
import { useCapabilities } from '@/hooks/useCapabilities';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { CbtBankSoal, CbtEventItem } from '@/types/cbt.types';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { Layers, User, Sparkles, ArrowRight, ArrowLeft, CheckCircle2, Users, AlertCircle, AlertTriangle, Share2, Check, ShieldCheck, Star, Lock, History, Loader2, Eye } from 'lucide-react';
import {
  type CbtBankSoalScope,
  getOfficialAsesmenTypes,
  findMatchingAsesmenType,
  OFFICIAL_ASESMEN_TYPES,
  detectSmartAsesmenType,
  generateAutoFillMassal,
  getAllowedTingkatForAsesmen,
  cbtBankSoalStep1Schema,
  cbtBankSoalPayloadSchema,
  getTingkatRoman,
  formatTingkatLabel,
} from './cbtAsesmenHelper';
import { CbtMgmpColleaguePicker } from './CbtMgmpColleaguePicker';
import { CbtBankSoalDetailModal } from './CbtBankSoalDetailModal';
import { evaluateJurusanOccupancy } from './cbtJurusanAvailabilityHelper';
import { getMgmpSharedTeacherIds, setMgmpSharedTeacherIds } from '../jadwal/cbtMgmpHelper';
import { useCbtOperationMode } from '../cbtModeHelper';
import { useTeacherCbtDutyStatus } from './useTeacherCbtDutyStatus';
import { parseStrictTingkatValue } from './cbtDutyEngine';

export * from './cbtAsesmenHelper';

interface CbtBankSoalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankSoalToEdit?: CbtBankSoal | null;
  onSuccess: () => void;
  defaultGuruId?: string;
  defaultMapelId?: string;
  defaultTingkat?: 'X' | 'XI' | 'XII' | string;
  defaultJurusan?: string;
  roleContext?: 'GURU' | 'KURIKULUM' | 'ADMIN';
  activeEvent?: CbtEventItem | null;
  eventName?: string;
  targetTingkat?: number[];
  customMapelOptions?: Array<{ value: string; label: string; raw?: any }>;
}

export const CbtBankSoalFormModal: React.FC<CbtBankSoalFormModalProps> = ({
  isOpen,
  onClose,
  bankSoalToEdit,
  onSuccess,
  defaultGuruId,
  defaultMapelId,
  defaultTingkat,
  defaultJurusan,
  roleContext,
  activeEvent: propActiveEvent,
  eventName: propEventName,
  targetTingkat: propTargetTingkat,
  customMapelOptions,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { isAdmin, isKurikulum } = useCapabilities();
  const isPrivilegedRole = isAdmin || isKurikulum || roleContext === 'KURIKULUM' || roleContext === 'ADMIN';

  const { tingkatList, jenjang } = useJenjang();
  const officialAsesmenTypes = useMemo(() => getOfficialAsesmenTypes(jenjang), [jenjang]);

  // ── Kepatuhan Pengaturan Event (Event-Compliance Engine) ──
  const cbtMode = useCbtOperationMode();
  const activeEvent = propActiveEvent !== undefined ? propActiveEvent : cbtMode.activeEvent;
  const { activeYear: activeTp } = useTahunPelajaranOptions();
  const { activeSemester, rawList: semRawList = [] } = useSemesterOptions();
  const activeEventId = activeEvent?.id;
  const activeTpId = activeTp?.id || activeEvent?.tahun_pelajaran_id;
  const activeSemId = useMemo(() => {
    if (activeSemester?.id) return activeSemester.id;
    if (activeEvent?.semester && semRawList.length > 0) {
      const target = String(activeEvent.semester).toUpperCase().trim();
      const matched = semRawList.find((s: any) =>
        String(s.nama_semester || s.nama || '').toUpperCase().includes(target)
      );
      if (matched?.id) return matched.id;
    }
    return undefined;
  }, [activeSemester?.id, activeEvent?.semester, semRawList]);
  const eventName = propEventName || cbtMode.eventName;
  const rawTargetTingkat =
    propTargetTingkat && propTargetTingkat.length > 0
      ? propTargetTingkat
      : (activeEvent?.target_tingkat && activeEvent.target_tingkat.length > 0
          ? activeEvent.target_tingkat
          : cbtMode.targetTingkat);

  const effectiveTargetTingkat = useMemo(() => {
    if (rawTargetTingkat && rawTargetTingkat.length > 0) return rawTargetTingkat;
    if (activeEvent?.target_tingkat && activeEvent.target_tingkat.length > 0) return activeEvent.target_tingkat;
    return undefined;
  }, [rawTargetTingkat, activeEvent?.target_tingkat]);

  const effectiveTingkatList = useMemo(() => {
    if (effectiveTargetTingkat && effectiveTargetTingkat.length > 0) {
      return tingkatList.filter((t) => effectiveTargetTingkat.includes(t));
    }
    return tingkatList;
  }, [effectiveTargetTingkat, tingkatList]);

  const lockedEventKey = useMemo(() => {
    const raw = `${activeEvent?.kode_event || ''} ${activeEvent?.nama_event || ''} ${eventName || ''}`.toUpperCase().trim();
    if (!raw) return undefined;
    for (const t of officialAsesmenTypes) {
      if (raw.includes(t.key) || raw.includes(t.defaultPrefix)) return t.key;
      if (t.aliases?.some((a) => raw.includes(a))) return t.key;
    }
    if (raw.includes('ASAS') || raw.includes('SAS') || raw.includes('PAS') || raw.includes('UAS')) return 'PSAS';
    if (raw.includes('ASAT') || raw.includes('SAT') || raw.includes('PAT')) return 'PSAT';
    if (raw.includes('ASTS') || raw.includes('STS') || raw.includes('PTS')) return 'PSTS';
    if (raw.includes('ASAJ') || raw.includes('PSAJ') || raw.includes('AM')) return 'PSAJ';
    if (raw.includes('UKK')) return 'UKK';
    if (activeEvent) return officialAsesmenTypes[0]?.key || 'PSAS';
    return undefined;
  }, [activeEvent, eventName, officialAsesmenTypes]);

  // 1. Pemisahan Konteks: Mandiri Guru vs Terpusat Massal
  const initialScope: CbtBankSoalScope = useMemo(() => {
    if (bankSoalToEdit) {
      const detected = findMatchingAsesmenType(bankSoalToEdit.kode_bank, officialAsesmenTypes);
      const isMassal =
        Boolean(detected) ||
        Boolean(bankSoalToEdit.is_shared) ||
        Boolean(bankSoalToEdit.Kontributor && bankSoalToEdit.Kontributor.length > 0) ||
        Boolean(bankSoalToEdit.judul?.trim().startsWith('['));
      return isMassal ? 'TERPUSAT_MASSAL' : 'MANDIRI_GURU';
    }
    if (lockedEventKey) return 'TERPUSAT_MASSAL';
    return isPrivilegedRole && !defaultGuruId ? 'TERPUSAT_MASSAL' : 'MANDIRI_GURU';
  }, [bankSoalToEdit, lockedEventKey, isPrivilegedRole, defaultGuruId, officialAsesmenTypes]);

  const defaultInitialTingkat = useMemo(() => {
    if (defaultTingkat) {
      const r = getTingkatRoman(defaultTingkat);
      const romanList = effectiveTingkatList.map((t) => getTingkatRoman(t));
      if (romanList.includes(r)) return r;
    }
    return ''; // Wajib kosong jika tidak diberikan spesifik agar guru memilih secara sadar
  }, [defaultTingkat, effectiveTingkatList]);

  const [tingkat, setTingkat] = useState<string>(() => {
    return bankSoalToEdit?.tingkat || defaultInitialTingkat;
  });
  const [tingkatTouched, setTingkatTouched] = useState<boolean>(false);

  // Deteksi cerdas asesmen resmi berdasarkan kalender bulan, semester aktif, & jenjang
  const smartDetection = useMemo(() => {
    return detectSmartAsesmenType(activeSemester, tingkat, effectiveTingkatList, jenjang);
  }, [activeSemester, tingkat, effectiveTingkatList, jenjang]);

  const [step, setStep] = useState<1 | 2>(1);
  const [scope, setScope] = useState<CbtBankSoalScope>(initialScope);
  const [jenisKegiatanMassal, setJenisKegiatanMassal] = useState<string>(() => {
    if (bankSoalToEdit) {
      const detected = findMatchingAsesmenType(bankSoalToEdit.kode_bank, officialAsesmenTypes);
      if (detected) return detected.key;
      const rawJudul = (bankSoalToEdit.judul || '').toUpperCase();
      for (const t of officialAsesmenTypes) {
        if (rawJudul.includes(t.key) || (t.aliases && t.aliases.some((a) => rawJudul.includes(a)))) {
          return t.key;
        }
      }
    }
    if (lockedEventKey) return lockedEventKey;
    return detectSmartAsesmenType(activeSemester, defaultInitialTingkat, effectiveTingkatList, jenjang).recommendedKey;
  });

  const isTeacherLocked = useMemo(() => {
    if (isPrivilegedRole || scope === 'TERPUSAT_MASSAL') return false;
    return Boolean(defaultGuruId || user?.guru_profile?.id);
  }, [isPrivilegedRole, scope, defaultGuruId, user?.guru_profile?.id]);

  // Evaluasi daftar tingkat kelas yang sah (Anti Human-Error)
  const activeAsesmenDef = useMemo(() => {
    if (scope !== 'TERPUSAT_MASSAL') return null;
    return officialAsesmenTypes.find((t) => t.key === jenisKegiatanMassal) || null;
  }, [scope, jenisKegiatanMassal, officialAsesmenTypes]);

  const allowedTingkatList = useMemo(() => {
    return getAllowedTingkatForAsesmen(scope, jenisKegiatanMassal, effectiveTingkatList, jenjang);
  }, [scope, jenisKegiatanMassal, effectiveTingkatList, jenjang]);

  const dynamicTingkatOptions = useMemo(() => {
    const list = (effectiveTingkatList || []).map((t) => ({
      value: getTingkatRoman(t),
      label: formatTingkatLabel(t),
    }));
    // Jika ada filter event sasaran tingkat spesifik (misal hanya 10 dan 11), jangan tampilkan 'Semua'
    if (effectiveTargetTingkat && effectiveTargetTingkat.length > 0 && effectiveTargetTingkat.length < tingkatList.length) {
      return list;
    }
    return [...list, { value: 'SEMUA', label: 'Semua' }];
  }, [effectiveTingkatList, effectiveTargetTingkat, tingkatList.length]);

  const initialGuruId = useMemo(() => {
    return defaultGuruId || user?.guru_profile?.id || '';
  }, [defaultGuruId, user?.guru_profile?.id]);

  const { options: guruOptions, isLoading: isGuruLoading } = useGuruOptions();
  const { options: mapelOptions, loading: mapelLoading } = useMapelOptions();
  const { rawList: rawJurusanList } = useJurusanOptions();

  const [jurusan, setJurusan] = useState<string>(() => bankSoalToEdit?.jurusan || defaultJurusan || '');

  const selectedJurusanList = useMemo(() => {
    if (!jurusan) return [];
    return jurusan
      .split(/[,;/|]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
  }, [jurusan]);

  useEffect(() => {
    if (defaultJurusan && !bankSoalToEdit) {
      setJurusan(defaultJurusan);
    }
  }, [defaultJurusan, bankSoalToEdit]);

  const [kodeBank, setKodeBank] = useState('');
  const [judul, setJudul] = useState('');
  const [guruId, setGuruId] = useState(initialGuruId);
  const [mapelId, setMapelId] = useState(defaultMapelId || '');
  const [unitPengajaranId, setUnitPengajaranId] = useState<string>(bankSoalToEdit?.unit_pengajaran_id || '');
  const [alokasiMenit, setAlokasiMenit] = useState<number>(60);
  const [acakSoal, setAcakSoal] = useState(true);
  const [acakOpsi, setAcakOpsi] = useState(true);
  const [isShared, setIsShared] = useState(false);
  const [selectedColleagueIds, setSelectedColleagueIds] = useState<string[]>([]);
  const [showAllMapels, setShowAllMapels] = useState(isPrivilegedRole || initialScope === 'TERPUSAT_MASSAL');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ambil data kewajiban mengajar guru untuk evaluasi anti human-error pada pilihan Tingkat & Jurusan
  const { items: teacherDutyItems = [] } = useTeacherCbtDutyStatus(guruId || initialGuruId);

  const relevantDutiesForMapel = useMemo(() => {
    if (!mapelId || !teacherDutyItems || teacherDutyItems.length === 0) return [];
    return teacherDutyItems.filter((item) => item.mapelId === mapelId);
  }, [mapelId, teacherDutyItems]);

  // Auto-select jurusan binaan di Mode Mandiri agar tidak tercatat sebagai "Semua Jurusan (Umum)" (jurusan: null)
  useEffect(() => {
    if (bankSoalToEdit || defaultJurusan || isShared || !tingkat) return;
    const duty = relevantDutiesForMapel.find((d) => d.tingkatRoman === tingkat);
    const teachingJurs = duty?.teachingJurusans || [];
    if (teachingJurs.length > 0 && !jurusan) {
      setJurusan(teachingJurs.join(', '));
    }
  }, [bankSoalToEdit, defaultJurusan, isShared, tingkat, relevantDutiesForMapel, jurusan]);

  const tingkatDutyMap = useMemo(() => {
    const map = new Map<
      string,
      {
        isFullyCovered: boolean;
        hasPending: boolean;
        coveredCount: number;
        pendingCount: number;
        totalCount: number;
        masterAuthorName?: string;
        teachingJurusans: string[];
      }
    >();

    relevantDutiesForMapel.forEach((d) => {
      const t = d.tingkatRoman;
      if (!map.has(t)) {
        map.set(t, {
          isFullyCovered: true,
          hasPending: false,
          coveredCount: 0,
          pendingCount: 0,
          totalCount: 0,
          masterAuthorName: undefined,
          teachingJurusans: [],
        });
      }
      const entry = map.get(t)!;
      entry.totalCount += 1;
      if (d.teachingJurusans && d.teachingJurusans.length > 0) {
        d.teachingJurusans.forEach((tj) => {
          if (!entry.teachingJurusans.includes(tj)) {
            entry.teachingJurusans.push(tj);
          }
        });
      }
      if (d.targetJurusan && !entry.teachingJurusans.includes(d.targetJurusan)) {
        entry.teachingJurusans.push(d.targetJurusan);
      }
      if (d.status === 'COVERED_OWN' || d.status === 'COVERED_MGMP') {
        entry.coveredCount += 1;
        if (d.masterAuthorName && !entry.masterAuthorName) {
          entry.masterAuthorName = d.masterAuthorName;
        }
      } else {
        entry.isFullyCovered = false;
        entry.hasPending = true;
        entry.pendingCount += 1;
      }
    });

    return map;
  }, [relevantDutiesForMapel]);

  // Hard Lock Evaluator: Periksa apakah sasaran tingkat / jurusan saat ini SUDAH di-cover oleh rekan MGMP
  const isTargetCoveredByColleague = useMemo(() => {
    if (bankSoalToEdit) return { isLocked: false, authorName: undefined };
    if (!tingkat) return { isLocked: false, authorName: undefined };

    const dutyInfo = tingkatDutyMap.get(tingkat);
    if (!dutyInfo) return { isLocked: false, authorName: undefined };

    // 1. Jika seluruh tingkat sudah 100% covered oleh rekan MGMP:
    // TINGKAT INI MUTLAK TERKUNCI! Guru tidak boleh membuat naskah tandingan untuk tingkat ini.
    // Memilih jurusan apapun pada tingkat ini tidak akan membuka kunci.
    if (dutyInfo.isFullyCovered && dutyInfo.masterAuthorName) {
      return { isLocked: true, authorName: dutyInfo.masterAuthorName };
    }

    // 2. Jika tingkat belum fully covered tapi jurusan spesifik yang dipilih guru semuanya sudah berstatus COVERED_MGMP
    if (selectedJurusanList.length > 0) {
      const matchingDuties = relevantDutiesForMapel.filter(
        (d) =>
          d.tingkatRoman === tingkat &&
          d.targetJurusan &&
          selectedJurusanList.includes(d.targetJurusan.toUpperCase())
      );
      if (matchingDuties.length > 0 && matchingDuties.every((d) => d.status === 'COVERED_MGMP')) {
        const author = matchingDuties.find((d) => d.masterAuthorName)?.masterAuthorName;
        return { isLocked: true, authorName: author };
      }
    }

    return { isLocked: false, authorName: undefined };
  }, [bankSoalToEdit, tingkat, tingkatDutyMap, selectedJurusanList, relevantDutiesForMapel]);

  // Evaluasi apakah sasaran yang dipilih berada di luar jadwal mengajar guru (Mode Mandiri)
  const isTargetOutOfSchedule = useMemo(() => {
    if (isShared) return { isInvalid: false, message: '' }; // Mode MGMP terbuka skala sekolah
    if (bankSoalToEdit) return { isInvalid: false, message: '' };
    if (!tingkat) return { isInvalid: false, message: '' };

    const dutyInfo = tingkatDutyMap.get(tingkat);
    // Jika guru punya penugasan mengajar di mapel ini
    if (relevantDutiesForMapel.length > 0) {
      // a. Guru sama sekali tidak punya rombel/jadwal di tingkat ini
      if (!dutyInfo || dutyInfo.teachingJurusans.length === 0) {
        return {
          isInvalid: true,
          message: `Anda tidak memiliki jadwal mengajar di Tingkat ${tingkat}. Mode Mandiri hanya untuk rombel binaan Anda sendiri.`,
        };
      }

      // b. Guru memilih jurusan di luar jadwal mengajarnya
      if (selectedJurusanList.length > 0) {
        const invalidJurusans = selectedJurusanList.filter(
          (j) => !dutyInfo.teachingJurusans.includes(j.toUpperCase())
        );
        if (invalidJurusans.length > 0) {
          return {
            isInvalid: true,
            message: `Jurusan ${invalidJurusans.join(', ')} bukan merupakan jadwal mengajar Anda di Tingkat ${tingkat}.`,
          };
        }
      }
    }

    return { isInvalid: false, message: '' };
  }, [isShared, bankSoalToEdit, tingkat, tingkatDutyMap, relevantDutiesForMapel, selectedJurusanList]);

  // Ambil data Unit Pengajaran aktif untuk mapel terpilih (membedakan Ujian Resmi Gabungan vs Kuis Unit)
  const { data: tenantUnitsRes } = useQuery({
    queryKey: ['kurikulum-units-by-mapel', mapelId],
    queryFn: () => listTenantUnits({ mapel_id: mapelId, is_active: true }).catch(() => null),
    enabled: isOpen && !!mapelId,
  });

  const availableUnits = useMemo(() => {
    const units = tenantUnitsRes?.data || [];
    const seen = new Map<string, { id: string; nama_unit: string; guru_nama?: string; guru_id?: string | null }>();
    units.forEach((u) => {
      if (u.id && !seen.has(u.id)) {
        seen.set(u.id, {
          id: u.id,
          nama_unit: u.nama_unit,
          guru_nama: u.Guru?.nama_guru,
          guru_id: u.guru_id,
        });
      }
    });
    return Array.from(seen.values());
  }, [tenantUnitsRes?.data]);

  // Ambil daftar bank soal yang sudah ada pada EVENT & TP/SEMESTER AKTIF guna pencegahan duplikasi
  const { data: existingBanksRes } = useQuery({
    queryKey: ['cbt-existing-banks-by-mapel-tingkat', mapelId, tingkat, activeTpId, activeSemId, activeEventId],
    queryFn: () =>
      mapelId
        ? cbtApi
            .getBankSoalList({
              mapel_id: mapelId,
              tingkat: tingkat !== 'SEMUA' ? tingkat : undefined,
              ...(activeTpId ? { tahun_pelajaran_id: activeTpId } : {}),
              ...(activeSemId ? { semester_id: activeSemId } : {}),
              ...(activeEventId ? { event_id: activeEventId } : {}),
              limit: 200,
            })
            .catch(() => null)
        : null,
    enabled: isOpen && Boolean(mapelId),
    staleTime: 30 * 1000,
  });

  // Ambil daftar bank soal dari event/TP sebelumnya untuk tawaran Rollover langsung di dalam modal
  const [rollingOverBankId, setRollingOverBankId] = useState<string | null>(null);
  const [previewBankSoal, setPreviewBankSoal] = useState<CbtBankSoal | null>(null);
  const [userChoseCreateNew, setUserChoseCreateNew] = useState(false);

  useEffect(() => {
    setUserChoseCreateNew(false);
  }, [isOpen, mapelId, tingkat]);
  const { data: previousEventBanksRes } = useQuery({
    queryKey: ['cbt-previous-banks-for-rollover-offer', mapelId, tingkat, activeEventId],
    queryFn: () =>
      mapelId && tingkat
        ? cbtApi
            .getBankSoalList({
              mapel_id: mapelId,
              tingkat: tingkat !== 'SEMUA' ? tingkat : undefined,
              limit: 50,
            })
            .catch(() => null)
        : null,
    enabled: isOpen && !bankSoalToEdit && Boolean(mapelId) && Boolean(tingkat),
    staleTime: 30 * 1000,
  });

  const previousEventBanks: CbtBankSoal[] = useMemo(() => {
    const raw = previousEventBanksRes?.items || (previousEventBanksRes as any)?.data?.items || [];
    return raw.filter((b: CbtBankSoal) => {
      const totalSoal = b.jumlah_soal || b._count?.Soal || 0;
      if (totalSoal <= 0) return false;
      if (activeEventId && b.event_id === activeEventId) return false;
      return true;
    });
  }, [previousEventBanksRes, activeEventId]);

  const isAwaitingRolloverDecision =
    !bankSoalToEdit && Boolean(activeEventId) && previousEventBanks.length > 0 && !userChoseCreateNew;

  const handleInlineRollover = async (sourceBank: CbtBankSoal) => {
    if (!activeEventId) {
      toast.error('Belum ada Event CBT aktif untuk tujuan rollover.');
      return;
    }
    try {
      setRollingOverBankId(sourceBank.id);
      const res = await cbtApi.rolloverBankSoal({
        bank_soal_ids: [sourceBank.id],
        target_event_id: activeEventId,
        target_tahun_pelajaran_id: activeTpId,
        target_semester_id: activeSemId,
        keep_status: true,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: cbtQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['cbt-bank-soal-for-teacher-duty'] }),
        queryClient.invalidateQueries({ queryKey: ['cbt-existing-banks-by-mapel-tingkat'] }),
      ]);
      if (res.created_count > 0) {
        toast.success(`Berhasil mengambil & rollover "${sourceBank.judul}" ke event ini!`);
      } else {
        toast.success(`Bank soal "${sourceBank.judul}" sudah tersedia di event ini.`);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal melakukan rollover bank soal');
    } finally {
      setRollingOverBankId(null);
    }
  };

  const existingBanks = useMemo(() => {
    return existingBanksRes?.items || (existingBanksRes as any)?.data?.items || [];
  }, [existingBanksRes]);

  const jurusanOccupancy = useMemo(() => {
    return evaluateJurusanOccupancy({
      existingBanks,
      currentEditingBankId: bankSoalToEdit?.id,
      targetTingkat: tingkat,
      currentGuruId: guruId,
      isSharedMode: isShared,
    });
  }, [existingBanks, bankSoalToEdit?.id, tingkat, guruId, isShared]);

  // Auto-reset jika jurusan yang dipilih sebelumnya ternyata occupied saat ganti mapel/tingkat
  useEffect(() => {
    if (jurusan && jurusanOccupancy.isJurusanOccupied(jurusan)) {
      setJurusan('');
    }
  }, [jurusan, jurusanOccupancy]);

  const toggleJurusan = (code: string) => {
    // Cegah interaksi sama sekali jika tingkat/jurusan sedang terkunci anti-duplikasi
    if (isTargetCoveredByColleague.isLocked) return;
    if (isShared && jurusanOccupancy.isGeneralOccupied) return;

    const cleanCode = code.trim().toUpperCase();
    if (jurusanOccupancy.isJurusanOccupied(cleanCode)) return;

    let nextList: string[];
    if (selectedJurusanList.includes(cleanCode)) {
      nextList = selectedJurusanList.filter((c) => c !== cleanCode);
    } else {
      nextList = [...selectedJurusanList, cleanCode];
    }
    const nextJurusan = nextList.join(', ');
    setJurusan(nextJurusan);
    if (scope === 'TERPUSAT_MASSAL' && mapelId) {
      triggerAutoFillMassal(mapelId, tingkat, jenisKegiatanMassal, nextJurusan);
    }
  };

  const selectAllTeachingJurusans = (jurusans: string[]) => {
    if (isTargetCoveredByColleague.isLocked) return;
    if (isShared && jurusanOccupancy.isGeneralOccupied) return;

    const validJurusans = jurusans.filter((j) => !jurusanOccupancy.isJurusanOccupied(j));
    const nextJurusan = validJurusans.join(', ');
    setJurusan(nextJurusan);
    if (scope === 'TERPUSAT_MASSAL' && mapelId) {
      triggerAutoFillMassal(mapelId, tingkat, jenisKegiatanMassal, nextJurusan);
    }
  };

  const clearJurusan = () => {
    if (isTargetCoveredByColleague.isLocked) return;
    if (isShared && jurusanOccupancy.isGeneralOccupied) return;

    setJurusan('');
    if (scope === 'TERPUSAT_MASSAL' && mapelId) {
      triggerAutoFillMassal(mapelId, tingkat, jenisKegiatanMassal, '');
    }
  };

  // Ambil data penugasan mapel guru yang sedang dipilih (hanya relevan di mode Mandiri Guru)
  const { data: teacherAssignedMapels, isLoading: isAssignedMapelsLoading } = useQuery({
    queryKey: ['guru-assigned-mapels', guruId],
    queryFn: () => (guruId ? kurikulumApi.getGuruMapel(guruId).catch(() => null) : null),
    enabled: isOpen && !!guruId && scope === 'MANDIRI_GURU',
  });

  const assignedMapels = useMemo(() => {
    const list = teacherAssignedMapels?.data || [];
    const map = new Map<string, { value: string; label: string; raw?: any }>();
    list.forEach((item: any) => {
      const id = item.mapel_id || item.Mapel?.id;
      if (id && !map.has(id)) {
        const canonical = mapelOptions.find((m) => m.value === id);
        const label = canonical?.label || item.Mapel?.nama_mapel || id;
        map.set(id, { value: id, label, raw: (canonical as any)?.raw || item.Mapel });
      }
    });
    return Array.from(map.values());
  }, [teacherAssignedMapels?.data, mapelOptions]);

  const activeMapelOptions = useMemo(() => {
    if (customMapelOptions && customMapelOptions.length > 0) {
      return customMapelOptions;
    }
    if (scope === 'TERPUSAT_MASSAL' || showAllMapels || assignedMapels.length === 0) {
      return mapelOptions;
    }
    let base = assignedMapels;
    if (mapelId && !base.some((m) => m.value === mapelId)) {
      const canonical = mapelOptions.find((m) => m.value === mapelId);
      if (canonical) base = [canonical, ...base];
    }
    return base;
  }, [customMapelOptions, scope, showAllMapels, assignedMapels, mapelOptions, mapelId]);

  // Sinkronisasi otomatis judul & kode bank pada mode massal
  const triggerAutoFillMassal = (
    targetMapelId: string,
    targetTingkat: string,
    targetKegiatanKey: string,
    targetJurusan?: string,
    overrideIsShared?: boolean
  ) => {
    const activeJur = targetJurusan !== undefined ? targetJurusan : jurusan;
    const activeShared = overrideIsShared !== undefined ? overrideIsShared : isShared;
    const { kodeBank: genCode, judul: genTitle } = generateAutoFillMassal({
      mapelOptions: activeMapelOptions,
      targetMapelId,
      targetTingkat,
      targetKegiatanKey,
      targetJurusan: activeJur,
      jenjang,
      isShared: activeShared,
    });

    // Cek duplikasi kode_bank terhadap daftar bank soal yang sudah ada di tenant (Anti-Collision)
    let finalCode = genCode;
    const conflictList = existingBanks || [];
    if (conflictList.some((b: any) => b.kode_bank === finalCode && b.id !== bankSoalToEdit?.id)) {
      let counter = 2;
      while (conflictList.some((b: any) => b.kode_bank === `${finalCode}-${counter}` && b.id !== bankSoalToEdit?.id)) {
        counter++;
      }
      finalCode = `${finalCode}-${counter}`;
    }

    setKodeBank(finalCode);
    setJudul(genTitle);
  };

  // Aksi pemilihan kegiatan massal dengan proteksi otomatis tingkat kelas (Anti Human-Error)
  const handleSelectKegiatanMassal = (targetKey: string) => {
    setJenisKegiatanMassal(targetKey);
    const validTingkat = getAllowedTingkatForAsesmen('TERPUSAT_MASSAL', targetKey, effectiveTingkatList, jenjang);
    let nextTingkat = tingkat;
    if (tingkat && validTingkat.length > 0 && !validTingkat.includes(tingkat)) {
      nextTingkat = '';
      setTingkat('');
    }
    if (mapelId && nextTingkat) {
      triggerAutoFillMassal(mapelId, nextTingkat, targetKey);
    }
  };

  // Inisialisasi awal saat modal dibuka
  useEffect(() => {
    if (!isOpen) return;

    if (bankSoalToEdit) {
      setStep(1);
      setKodeBank(bankSoalToEdit.kode_bank);
      setJudul(bankSoalToEdit.judul);
      setGuruId(bankSoalToEdit.guru_id);
      setMapelId(bankSoalToEdit.mapel_id);
      setUnitPengajaranId(bankSoalToEdit.unit_pengajaran_id || '');
      setJurusan(bankSoalToEdit.jurusan || '');
      setTingkat(bankSoalToEdit.tingkat);
      setTingkatTouched(false);
      setAlokasiMenit(bankSoalToEdit.alokasi_menit);
      setAcakSoal(bankSoalToEdit.acak_soal);
      setAcakOpsi(bankSoalToEdit.acak_opsi);
      const existingColleagues = getMgmpSharedTeacherIds(bankSoalToEdit, user?.tenant_id).filter(
        (id) => id !== bankSoalToEdit.guru_id
      );
      setSelectedColleagueIds(existingColleagues);
      const isSharedBank =
        Boolean(bankSoalToEdit.is_shared) || existingColleagues.length > 0;
      setIsShared(isSharedBank);
      setShowAllMapels(true);

      const detected = findMatchingAsesmenType(bankSoalToEdit.kode_bank, officialAsesmenTypes);
      const isMassal =
        Boolean(detected) ||
        Boolean(bankSoalToEdit.is_shared) ||
        Boolean(bankSoalToEdit.Kontributor && bankSoalToEdit.Kontributor.length > 0) ||
        Boolean(bankSoalToEdit.judul?.trim().startsWith('['));
      setScope(isMassal ? 'TERPUSAT_MASSAL' : 'MANDIRI_GURU');
      if (detected) {
        setJenisKegiatanMassal(detected.key);
      } else if (isMassal) {
        const rawJudul = (bankSoalToEdit.judul || '').toUpperCase();
        for (const t of officialAsesmenTypes) {
          if (rawJudul.includes(t.key) || (t.aliases && t.aliases.some((a) => rawJudul.includes(a)))) {
            setJenisKegiatanMassal(t.key);
            break;
          }
        }
      }
    } else {
      setStep(1);
      setScope(initialScope);
      const isMassal = initialScope === 'TERPUSAT_MASSAL';
      const year = new Date().getFullYear();
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const initialSmart = detectSmartAsesmenType(activeSemester, defaultInitialTingkat, effectiveTingkatList, jenjang);
      const recKey = lockedEventKey || initialSmart.recommendedKey;
      const validTingkat = getAllowedTingkatForAsesmen(
        isMassal ? 'TERPUSAT_MASSAL' : 'MANDIRI_GURU',
        recKey,
        effectiveTingkatList,
        jenjang
      );
      // Prioritas 1: Jika ada defaultTingkat spesifik dari klik baris matriks, gunakan itu
      // Prioritas 2: Jika tidak ada, rekomendasikan otomatis tingkat pertama yang MASIH BELUM SELESAI (hasPending)
      let initialTingkat = (defaultTingkat && validTingkat.includes(defaultTingkat))
        ? defaultTingkat
        : '';

      if (!initialTingkat && relevantDutiesForMapel.length > 0) {
        const pendingEntry = Array.from(tingkatDutyMap.entries()).find(
          ([t, stat]) => stat.hasPending && validTingkat.includes(t)
        );
        if (pendingEntry) {
          initialTingkat = pendingEntry[0];
        }
      }

      // Prioritas jurusan: jika ada defaultJurusan dari klik baris matriks, langsung pre-fill
      let initialJurusan = defaultJurusan || '';
      if (!initialJurusan && initialTingkat) {
        const tDuty = tingkatDutyMap.get(initialTingkat);
        if (tDuty && tDuty.teachingJurusans.length === 1) {
          initialJurusan = tDuty.teachingJurusans[0];
        }
      }

      setTingkatTouched(false);
      setJenisKegiatanMassal(recKey);
      setKodeBank(isMassal ? `${recKey}-${year}-MAPEL${initialTingkat ? `-${initialTingkat}` : ''}` : `CBT-${year}-${randomSuffix}`);
      setJudul('');
      setGuruId(initialGuruId);
      setMapelId(defaultMapelId || '');
      setUnitPengajaranId('');
      setTingkat(initialTingkat);
      setJurusan(initialJurusan);
      setAlokasiMenit(60);
      setAcakSoal(true);
      setAcakOpsi(true);
      setIsShared(false);
      setSelectedColleagueIds([]);
      setShowAllMapels(isPrivilegedRole || isMassal);

      if (defaultMapelId && initialTingkat && isMassal) {
        triggerAutoFillMassal(defaultMapelId, initialTingkat, recKey, initialJurusan);
      }
    }
  }, [isOpen, bankSoalToEdit, lockedEventKey, effectiveTingkatList, defaultTingkat, defaultJurusan, defaultMapelId]);

  const handleChangeScope = (newScope: CbtBankSoalScope) => {
    setScope(newScope);
    const year = new Date().getFullYear();
    if (newScope === 'TERPUSAT_MASSAL') {
      setShowAllMapels(true);
      setIsShared(false);
      setUnitPengajaranId('');
      const recKey = lockedEventKey || smartDetection.recommendedKey;
      const validTingkat = getAllowedTingkatForAsesmen('TERPUSAT_MASSAL', recKey, effectiveTingkatList, jenjang);
      const targetTingkat = (tingkat && validTingkat.includes(tingkat)) ? tingkat : '';
      setJenisKegiatanMassal(recKey);
      setTingkat(targetTingkat);
      if (mapelId && targetTingkat) {
        triggerAutoFillMassal(mapelId, targetTingkat, recKey);
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

  const handleNextStep = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    setTingkatTouched(true);

    if (isTargetCoveredByColleague.isLocked) {
      toast.error(
        `Pembuatan bank soal dikunci karena sasaran ini telah resmi di-cover oleh rekan guru MGMP (${isTargetCoveredByColleague.authorName || 'Rekan Guru'}).`
      );
      return;
    }

    if (isShared && jurusanOccupancy.isGeneralOccupied) {
      toast.error(
        `Pembuatan master MGMP dikunci karena paket master Umum untuk Tingkat ${tingkat} sudah diterbitkan oleh ${jurusanOccupancy.generalInfo?.guruName || 'rekan guru'}.`
      );
      return;
    }

    if (isTargetOutOfSchedule.isInvalid) {
      toast.error(isTargetOutOfSchedule.message);
      return;
    }

    if (!tingkat || tingkat.trim() === '') {
      toast.error('Silakan pilih tingkat kelas sasaran soal (X, XI, atau XII) terlebih dahulu!');
      return;
    }

    const val = cbtBankSoalStep1Schema.safeParse({ mapel_id: mapelId, tingkat });
    if (!val.success) {
      toast.error(val.error.issues.map((i) => i.message).join(', '));
      return;
    }

    if (scope === 'TERPUSAT_MASSAL' && !allowedTingkatList.includes(tingkat)) {
      toast.error(`Tingkat ${tingkat} tidak diperkenankan untuk jenis kegiatan asesmen ${jenisKegiatanMassal}`);
      return;
    }

    if (scope === 'TERPUSAT_MASSAL') {
      const isAutoTitle =
        !judul ||
        officialAsesmenTypes.some(
          (t) =>
            judul.startsWith(`${t.defaultPrefix} -`) ||
            judul.startsWith(`${t.key} -`) ||
            judul.startsWith(`${t.singkatan} -`)
        );
      if (isAutoTitle) {
        triggerAutoFillMassal(mapelId, tingkat, jenisKegiatanMassal, jurusan);
      }
    } else if (scope === 'MANDIRI_GURU' && !judul) {
      const selectedMapel = mapelOptions.find((m) => m.value === mapelId);
      const mapelName = selectedMapel?.label?.split('(')[0]?.trim() || 'Mata Pelajaran';
      setJudul(`Ulangan Harian - ${mapelName} Tingkat ${tingkat}`);
    }

    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Guard ketat: Cegah form submission jika belum berada di Tahap 2
    if (step !== 2) {
      return;
    }

    if (isTargetCoveredByColleague.isLocked) {
      toast.error('Pembuatan bank soal dikunci karena sasaran ini telah di-cover oleh rekan guru MGMP.');
      return;
    }

    if (isShared && jurusanOccupancy.isGeneralOccupied) {
      toast.error(
        `Pembuatan master MGMP dikunci karena paket master Umum untuk Tingkat ${tingkat} sudah diterbitkan oleh ${jurusanOccupancy.generalInfo?.guruName || 'rekan guru'}.`
      );
      return;
    }

    if (isTargetOutOfSchedule.isInvalid) {
      toast.error(isTargetOutOfSchedule.message);
      return;
    }

    if (!tingkat || tingkat.trim() === '') {
      setTingkatTouched(true);
      toast.error('Tingkat kelas sasaran wajib dipilih!');
      return;
    }

    if (scope === 'TERPUSAT_MASSAL' && !allowedTingkatList.includes(tingkat)) {
      toast.error(`Tingkat ${tingkat} tidak diperkenankan untuk asesmen ${jenisKegiatanMassal}`);
      return;
    }

    const validation = cbtBankSoalPayloadSchema.safeParse({
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

      const matchedJurusanIds = (rawJurusanList || [])
        .filter((j) => {
          const code = ((j.singkatan || j.kode || j.kode_jurusan || j.nama || '') as string)
            .toUpperCase()
            .trim();
          return code && selectedJurusanList.includes(code);
        })
        .map((j) => j.id)
        .filter(Boolean);

      const payload = {
        kode_bank: kodeBank.trim().toUpperCase(),
        judul: judul.trim(),
        guru_id: guruId,
        mapel_id: mapelId,
        event_id: bankSoalToEdit?.event_id ?? activeEvent?.id ?? null,
        unit_pengajaran_id: unitPengajaranId || null,
        tingkat,
        tingkat_num: parseStrictTingkatValue(tingkat),
        jurusan: jurusan || null,
        jurusan_id: matchedJurusanIds.length === 1 ? matchedJurusanIds[0] : null,
        target_jurusan_ids: matchedJurusanIds.length > 0 ? matchedJurusanIds : null,
        alokasi_menit: Number(alokasiMenit),
        acak_soal: acakSoal,
        acak_opsi: acakOpsi,
        status: (scope === 'TERPUSAT_MASSAL' || isShared ? 'PUBLISHED' : 'DRAFT') as 'PUBLISHED' | 'DRAFT',
        is_shared: isShared,
        contributor_guru_ids: isShared ? selectedColleagueIds : [],
        auto_sync_kolaborasi: isShared && !unitPengajaranId,
      };

      if (bankSoalToEdit) {
        await cbtApi.updateBankSoal(bankSoalToEdit.id, payload);
        setMgmpSharedTeacherIds(bankSoalToEdit.id, isShared ? selectedColleagueIds : [], user?.tenant_id);
        toast.success('Bank soal berhasil diperbarui');
      } else {
        const createRes = await cbtApi.createBankSoal(payload);
        const newBankId = (createRes as any)?.data?.id || (createRes as any)?.id;
        if (newBankId) {
          setMgmpSharedTeacherIds(newBankId, isShared ? selectedColleagueIds : [], user?.tenant_id);
        }
        toast.success(
          scope === 'TERPUSAT_MASSAL'
            ? 'Paket bank soal ujian serentak berhasil dibuat & siap dijadwalkan'
            : 'Bank soal mandiri guru berhasil dibuat'
        );
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: cbtQueryKeys.bankSoal(),
          exact: false,
          refetchType: 'all',
        }),
        queryClient.invalidateQueries({
          queryKey: ['cbt-bank-soal-for-teacher-duty'],
          exact: false,
          refetchType: 'all',
        }),
        queryClient.invalidateQueries({
          queryKey: ['teacher-cbt-duty-status'],
          exact: false,
          refetchType: 'all',
        }),
        queryClient.invalidateQueries({
          queryKey: ['cbt-panitia-orchestrator'],
          exact: false,
          refetchType: 'all',
        }),
        queryClient.invalidateQueries({
          queryKey: ['cbt-existing-banks-by-mapel-tingkat'],
          exact: false,
          refetchType: 'all',
        }),
      ]);

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan bank soal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        bankSoalToEdit
          ? 'Edit Paket Bank Soal'
          : scope === 'TERPUSAT_MASSAL'
          ? (isShared ? 'Buat Master Bank Soal MGMP (Ujian Bersama)' : 'Buat Bank Soal Ujian Mandiri')
          : 'Buat Bank Soal Mandiri'
      }
      size="3xl"
    >
      {/* ── Stepper Ramping & Bersih ── */}
      <div className="mb-3.5 grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
        <button
          key="pill-nav-step-1"
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setStep(1);
          }}
          className={cn(
            'flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer',
            step === 1
              ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-2xs'
              : 'text-slate-500 hover:text-slate-800'
          )}
        >
          <span
            className={cn(
              'w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center shrink-0',
              step === 1 ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
            )}
          >
            {step > 1 ? '✓' : '1'}
          </span>
          <span>1. Sasaran &amp; Distribusi</span>
        </button>

        <button
          key="pill-nav-step-2"
          type="button"
          onClick={handleNextStep}
          className={cn(
            'flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer',
            step === 2
              ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-2xs'
              : 'text-slate-500 hover:text-slate-800'
          )}
        >
          <span
            className={cn(
              'w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center shrink-0',
              step === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            )}
          >
            2
          </span>
          <span>2. Identitas &amp; Waktu</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {step === 1 ? (
          /* ── TAHAP 1: KONTEKS, SASARAN, MATA PELAJARAN, & DISTRIBUSI MGMP ── */
          <div className="space-y-3">
            {/* 1. Kegiatan / Event Asesmen */}
            {scope === 'TERPUSAT_MASSAL' ? (
              lockedEventKey ? (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Kegiatan Asesmen
                  </label>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-bold text-xs shadow-2xs">
                        {lockedEventKey}
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {activeEvent?.nama_event || eventName || activeAsesmenDef?.namaResmi || lockedEventKey}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[9.5px] font-bold border-indigo-200 text-indigo-700 dark:border-indigo-800 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/40">
                      Terkunci
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Kegiatan Asesmen
                    </label>
                    <span className="text-[10.5px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                      <Sparkles size={11} />
                      <span>Saran: <strong>{smartDetection.recommendedKey}</strong></span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {officialAsesmenTypes.map((k) => {
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
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                              : isRecommended
                              ? 'bg-indigo-50/60 dark:bg-indigo-950/20 text-slate-700 dark:text-slate-300 border-indigo-300 dark:border-indigo-700 hover:border-indigo-400'
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
                                    : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300'
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
                              isSelected ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'
                            )}
                          >
                            {k.keterangan}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )
            ) : (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Peruntukan Bank Soal
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleChangeScope('TERPUSAT_MASSAL')}
                    className={cn(
                      'p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 relative',
                      scope === 'TERPUSAT_MASSAL'
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-600 ring-2 ring-indigo-500/20 text-indigo-950 dark:text-indigo-100 shadow-2xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 hover:border-slate-300'
                    )}
                  >
                    <div
                      className={cn(
                        'p-2 rounded-xl shrink-0 mt-0.5',
                        scope === 'TERPUSAT_MASSAL' ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      )}
                    >
                      <Users size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs">Master MGMP / Bersama</span>
                      </div>
                      <div className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                        Dibuat untuk dibagikan ke rekan guru se-mapel &amp; tingkat
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleChangeScope('MANDIRI_GURU')}
                    className={cn(
                      'p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 relative',
                      scope === 'MANDIRI_GURU'
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-600 ring-2 ring-indigo-500/20 text-indigo-950 dark:text-indigo-100 shadow-2xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 hover:border-slate-300'
                    )}
                  >
                    <div
                      className={cn(
                        'p-2 rounded-xl shrink-0 mt-0.5',
                        scope === 'MANDIRI_GURU' ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      )}
                    >
                      <User size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs">Mandiri Guru</span>
                      </div>
                      <div className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                        Ulangan harian, kuis &amp; latihan khusus kelas binaan Anda sendiri
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* 2. Mata Pelajaran */}
            <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="form-mapel" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Mata Pelajaran
                </label>
                {scope === 'MANDIRI_GURU' && assignedMapels.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAllMapels((prev) => !prev)}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
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
                  setUnitPengajaranId('');
                  if (scope === 'TERPUSAT_MASSAL') {
                    triggerAutoFillMassal(newMapelId, tingkat, jenisKegiatanMassal);
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

              {/* Cakupan Unit Pengajaran (Hanya di mode Mandiri Guru jika memiliki unit materi) */}
              {mapelId && availableUnits.length > 0 && scope === 'MANDIRI_GURU' && (
                <div className="mt-2 p-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/70 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Layers size={12} className="text-indigo-600 dark:text-indigo-400" />
                      <span>Cakupan Unit Pengajaran</span>
                    </span>
                    <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                      {availableUnits.length} Unit Aktif
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setUnitPengajaranId('')}
                      className={cn(
                        'p-2 rounded-lg border text-left transition-all cursor-pointer',
                        !unitPengajaranId
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                      )}
                    >
                      <div className="text-[11px] font-bold flex items-center justify-between gap-1">
                        <span>Gabungan Mapel Induk</span>
                        <span
                          className={cn(
                            'text-[9px] px-1.5 py-0.2 rounded-full font-bold',
                            !unitPengajaranId
                              ? 'bg-white/20 text-white'
                              : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                          )}
                        >
                          Umum
                        </span>
                      </div>
                      <p className={cn('text-[10px] mt-0.5', !unitPengajaranId ? 'text-indigo-100' : 'text-slate-500')}>
                        Mencakup seluruh materi kurikulum mapel induk.
                      </p>
                    </button>
                    <div
                      className={cn(
                        'p-2 rounded-lg border transition-all',
                        unitPengajaranId
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-400 dark:border-indigo-700'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                      )}
                    >
                      <label htmlFor="form-unit-pengajaran" className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Khusus Unit / Modul Guru:
                      </label>
                      <select
                        id="form-unit-pengajaran"
                        value={unitPengajaranId}
                        onChange={(e) => setUnitPengajaranId(e.target.value)}
                        className="w-full text-[11px] font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      >
                        <option value="">-- Pilih Unit Pengajaran Tertentu --</option>
                        {availableUnits.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.nama_unit}{u.guru_nama ? ` — ${u.guru_nama}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Tingkat Kelas */}
            <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <span>Tingkat Sasaran Bank Soal</span>
                <span className="text-rose-500">*</span>
                {!tingkat && (
                  <span className="text-[10px] font-normal text-rose-500 ml-1">
                    (Wajib dipilih)
                  </span>
                )}
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {dynamicTingkatOptions.map((item) => {
                  const isAllowed = allowedTingkatList.includes(item.value);
                  const isSelected = tingkat === item.value;
                  const dutyInfo = tingkatDutyMap.get(item.value);

                  return (
                    <button
                      key={item.value}
                      type="button"
                      disabled={!isAllowed}
                      onClick={() => {
                        if (!isAllowed) return;
                        setTingkat(item.value);
                        setTingkatTouched(false);
                        if (scope === 'TERPUSAT_MASSAL' && mapelId) {
                          triggerAutoFillMassal(mapelId, item.value, jenisKegiatanMassal, jurusan);
                        }
                      }}
                      className={cn(
                        'p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 cursor-pointer relative',
                        !isAllowed
                          ? 'opacity-35 bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 cursor-not-allowed line-through'
                          : isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-400 dark:ring-indigo-500'
                          : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30'
                      )}
                      title={!isAllowed ? `Tidak relevan untuk ${jenisKegiatanMassal}` : `Pilih sasaran untuk ${item.label}`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-bold text-xs">{item.label}</span>
                        {isSelected && <CheckCircle2 size={14} className="text-white shrink-0" />}
                      </div>

                      {/* Badge Indikator Ketercoveran / Kewajiban Mengajar Guru */}
                      {dutyInfo && (
                        <div className="w-full">
                          {dutyInfo.isFullyCovered ? (
                            <span
                              className={cn(
                                'text-[9px] px-1.5 py-0.5 rounded-md font-bold inline-flex items-center gap-0.5',
                                isSelected
                                  ? 'bg-emerald-400 text-emerald-950 font-black'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                              )}
                            >
                              ✓ Siap Diuji
                            </span>
                          ) : dutyInfo.hasPending ? (
                            <span
                              className={cn(
                                'text-[9px] px-1.5 py-0.5 rounded-md font-bold inline-flex items-center gap-0.5',
                                isSelected
                                  ? 'bg-amber-300 text-amber-950 font-black'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                              )}
                            >
                              ⚠️ Belum Dibuat
                            </span>
                          ) : null}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Proteksi Hard Lock jika Tingkat / Rombel Sasaran Sudah Di-cover Rekan MGMP */}
              {isTargetCoveredByColleague.isLocked ? (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs text-rose-900 dark:text-rose-200 space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-200">
                    <Lock size={16} className="text-rose-600 shrink-0" />
                    <span>Pembuatan Bank Soal Dikunci (Anti-Duplikasi Ujian)</span>
                  </div>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed pl-6">
                    Rombel sasaran Anda pada Tingkat {tingkat} telah resmi <strong>di-cover oleh naskah master rekan sejawat Anda: {isTargetCoveredByColleague.authorName || 'Rekan Guru'}</strong>. Anda telah bebas tugas dan tidak diperkenankan membuat naskah tandingan untuk mapel &amp; tingkat yang sama.
                  </p>
                  <div className="p-2 rounded-lg bg-rose-100/70 dark:bg-rose-900/40 text-[11px] text-rose-800 dark:text-rose-200 pl-3 border border-rose-200 dark:border-rose-800 leading-relaxed">
                    💡 <strong>Prosedur jika ingin membuat naskah mandiri terpisah:</strong> Silakan hubungi <strong>{isTargetCoveredByColleague.authorName || 'rekan guru tersebut'}</strong> untuk melepaskan <em>(uncheck)</em> centang nama Anda dari daftar penerima share naskah beliau terlebih dahulu.
                  </div>
                </div>
              ) : tingkat && tingkatDutyMap.get(tingkat)?.isFullyCovered ? (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5 animate-in fade-in">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold flex items-center gap-1.5">
                      <span>Tingkat {tingkat} Anda Sudah 100% Selesai (Bebas Tugas)</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-200 text-emerald-800 font-bold">
                        Siap Diuji
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5 leading-relaxed">
                      Seluruh rombel binaan Anda di Tingkat {tingkat} telah siap diuji
                      {tingkatDutyMap.get(tingkat)?.masterAuthorName ? ` (di-cover oleh naskah MGMP ${tingkatDutyMap.get(tingkat)?.masterAuthorName})` : ''}
                      . Anda <strong>tidak wajib</strong> membuat bank soal baru lagi di tingkat ini.
                    </p>
                  </div>
                </div>
              ) : null}

              {!tingkat && tingkatTouched && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1 mt-1">
                  <AlertCircle size={12} />
                  <span>Silakan pilih salah satu tingkat (X, XI, atau XII) di atas.</span>
                </p>
              )}
            </div>

            {/* Tawaran Rollover Eksplisit jika sudah ada naskah Mapel & Tingkat ini di Event / TP Sebelumnya */}
            {!bankSoalToEdit && activeEventId && previousEventBanks.length > 0 && isAwaitingRolloverDecision && (
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/80 space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <History size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-black text-indigo-950 dark:text-indigo-100">
                      Naskah Soal Tingkat {tingkat} Sudah Ada di Event Sebelumnya
                    </div>
                    <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-0.5 leading-relaxed">
                      Apakah Anda ingin <strong>mengambil (Rollover)</strong> salah satu dari {previousEventBanks.length} naskah yang sudah ada di bawah ini ke event aktif, atau <strong>membuat bank soal baru</strong>?
                    </p>
                  </div>
                </div>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {previousEventBanks.slice(0, 6).map((prevBank) => {
                    const totalSoal = prevBank.jumlah_soal || prevBank._count?.Soal || 0;
                    const isRolling = rollingOverBankId === prevBank.id;
                    return (
                      <div
                        key={prevBank.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60 shadow-2xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                            {prevBank.judul}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {prevBank.Guru?.nama_guru || '-'} • <span className="font-semibold text-emerald-600 dark:text-emerald-400">{totalSoal} Soal</span> • {prevBank.TahunPelajaran?.tahun || 'Event Sebelumnya'}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => setPreviewBankSoal(prevBank)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                            title="Pratinjau Butir Soal"
                          >
                            <Eye size={13} />
                            <span>Preview</span>
                          </button>
                          <button
                            type="button"
                            disabled={rollingOverBankId !== null}
                            onClick={() => handleInlineRollover(prevBank)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 disabled:opacity-50 cursor-pointer shadow-2xs"
                          >
                            {isRolling ? <Loader2 size={13} className="animate-spin" /> : <History size={13} />}
                            <span>Ambil (Rollover)</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="pt-2 border-t border-indigo-200/70 dark:border-indigo-800/60 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80">
                    Ingin menyusun naskah baru dari awal untuk event ini?
                  </span>
                  <button
                    type="button"
                    onClick={() => setUserChoseCreateNew(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 text-xs font-bold cursor-pointer shadow-2xs shrink-0"
                  >
                    + Buat Baru Saja
                  </button>
                </div>
              </div>
            )}

            {/* 4. Model Distribusi: Tentukan Intensi Terlebih Dahulu (Mandiri vs Bersama) */}
            {!isAwaitingRolloverDecision && (
            <>
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              {!bankSoalToEdit && activeEventId && previousEventBanks.length > 0 && userChoseCreateNew && (
                <div className="flex items-center justify-between pb-1">
                  <button
                    type="button"
                    onClick={() => setUserChoseCreateNew(false)}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft size={12} />
                    <span>Kembali ke pilihan Rollover ({previousEventBanks.length} naskah tersedia)</span>
                  </button>
                </div>
              )}
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Share2 size={13} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Model Distribusi Naskah</span>
                </label>
                <span
                  className={cn(
                    'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                    isShared
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                  )}
                >
                  {isShared ? 'Naskah Bersama (Master MGMP)' : 'Khusus Mandiri'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Opsi 1: Mandiri */}
                <button
                  type="button"
                  onClick={() => {
                    setIsShared(false);
                    setSelectedColleagueIds([]);
                    const curDuty = tingkat ? tingkatDutyMap.get(tingkat) : undefined;
                    const nextJur =
                      !bankSoalToEdit && curDuty?.teachingJurusans && curDuty.teachingJurusans.length > 0
                        ? curDuty.teachingJurusans.join(', ')
                        : jurusan;
                    if (!bankSoalToEdit && curDuty?.teachingJurusans && curDuty.teachingJurusans.length > 0) {
                      setJurusan(nextJur);
                    }
                    if (!bankSoalToEdit && scope === 'TERPUSAT_MASSAL' && mapelId) {
                      triggerAutoFillMassal(mapelId, tingkat, jenisKegiatanMassal, nextJur, false);
                    }
                  }}
                  className={cn(
                    'p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 relative',
                    !isShared
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20 shadow-2xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <User size={14} className={!isShared ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'} />
                      <span>Khusus Mandiri (Kelas Saya)</span>
                    </span>
                    {!isShared && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-600 text-white flex items-center gap-0.5">
                        <Check size={10} /> Aktif
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Hanya untuk jurusan/rombel binaan Anda sendiri (Draft; terkunci jika sudah ter-cover Master MGMP).
                  </p>
                </button>

                {/* Opsi 2: Dibagikan (MGMP) */}
                <button
                  type="button"
                  onClick={() => {
                    setIsShared(true);
                    const hasOccupiedSelection = selectedJurusanList.some((code) =>
                      Boolean(jurusanOccupancy.getOccupiedInfo(code))
                    );
                    const nextJur = hasOccupiedSelection || jurusanOccupancy.isGeneralOccupied ? '' : jurusan;
                    if (nextJur !== jurusan) {
                      setJurusan(nextJur);
                    }
                    if (!bankSoalToEdit && scope === 'TERPUSAT_MASSAL' && mapelId) {
                      triggerAutoFillMassal(mapelId, tingkat, jenisKegiatanMassal, nextJur, true);
                    }
                  }}
                  className={cn(
                    'p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 relative',
                    isShared
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20 shadow-2xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <Users size={14} className={isShared ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
                      <span>Naskah Bersama (Master MGMP)</span>
                    </span>
                    {isShared && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-600 text-white flex items-center gap-0.5">
                        <Check size={10} /> Aktif
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Naskah bersama se-sekolah (langsung Terbit/Published). Rekan yang belum punya soal mandiri otomatis ter-cover.
                  </p>
                </button>
              </div>
            </div>

            {/* 5. Sasaran Konsentrasi Keahlian / Jurusan (ADAPTIF MENGIKUTI MODEL DISTRIBUSI) */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              {(() => {
                const currentTingkatDuty = tingkat ? tingkatDutyMap.get(tingkat) : undefined;
                const myTeachingJurusans = currentTingkatDuty?.teachingJurusans || [];
                const isLocked = isTargetCoveredByColleague.isLocked;

                if (!isShared) {
                  /* ── TAMPILAN KHUSUS MANDIRI: HANYA JURUSAN BINAAN GURU (MULTI-SELECT / RUMPUN) ── */
                  return (
                    <div className="space-y-2 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Star size={13} className="text-amber-500 fill-amber-500" />
                          <span>Pilih Jurusan Rombel Binaan Anda (Bisa Multi-Pilih / Rumpun):</span>
                        </label>
                        {!isLocked && myTeachingJurusans.length > 1 && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => selectAllTeachingJurusans(myTeachingJurusans)}
                              className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                            >
                              Pilih Semua
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              type="button"
                              onClick={clearJurusan}
                              className="text-[10px] font-semibold text-slate-500 hover:underline cursor-pointer"
                            >
                              Reset
                            </button>
                          </div>
                        )}
                      </div>

                      {myTeachingJurusans.length > 0 ? (
                        <div className="space-y-1.5">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                            {myTeachingJurusans.map((code) => {
                              const isChecked = selectedJurusanList.includes(code.toUpperCase());
                              const occInfo = jurusanOccupancy.getOccupiedInfo(code);
                              const isOccupied = isLocked || Boolean(occInfo);

                              return (
                                <button
                                  key={code}
                                  type="button"
                                  disabled={isOccupied}
                                  onClick={() => {
                                    if (isOccupied) return;
                                    toggleJurusan(code);
                                  }}
                                  className={cn(
                                    'p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-1.5',
                                    isOccupied
                                      ? 'opacity-40 bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed select-none'
                                      : isChecked
                                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-950 dark:text-emerald-100 font-bold ring-1 ring-emerald-500 shadow-2xs cursor-pointer'
                                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 cursor-pointer'
                                  )}
                                  title={
                                    isOccupied
                                      ? `Terkunci: Rombel jurusan ${code} sudah di-cover oleh naskah master rekan MGMP (${isTargetCoveredByColleague.authorName || occInfo?.guruName || 'Rekan Guru'})`
                                      : `Jurusan ${code}`
                                  }
                                >
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={cn(
                                        'w-4 h-4 rounded border flex items-center justify-center text-[10px] font-black',
                                        isOccupied
                                          ? 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400'
                                          : isChecked
                                          ? 'bg-emerald-600 text-white border-emerald-600'
                                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                                      )}
                                    >
                                      {isChecked ? '✓' : ''}
                                    </div>
                                    <span className="text-xs">{code}</span>
                                  </div>
                                  {isOccupied ? (
                                    <span className="text-[9px] px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-0.5">
                                      <Lock size={8} /> Terkunci
                                    </span>
                                  ) : (
                                    <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-semibold">
                                      Binaan
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {/* Keterangan Sasaran Terpilih */}
                          {isLocked ? (
                            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                              <Lock size={14} className="text-rose-500 shrink-0" />
                              <span>
                                Seluruh rombel binaan Anda pada Tingkat {tingkat} telah di-cover oleh naskah master rekan MGMP ({isTargetCoveredByColleague.authorName || 'Rekan Guru'}). Pemilihan jurusan dinonaktifkan.
                              </span>
                            </div>
                          ) : (
                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                              <ShieldCheck size={15} className="text-emerald-600 shrink-0" />
                              {selectedJurusanList.length > 0 ? (
                                <span>
                                  Naskah mandiri ini mencakup jurusan:{' '}
                                  <strong className="text-slate-800 dark:text-slate-100">{selectedJurusanList.join(', ')}</strong>.
                                </span>
                              ) : (
                                <span>
                                  Pilih minimal 1 jurusan binaan Anda di atas agar sasaran kelas tercatat spesifik.
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ) : relevantDutiesForMapel.length > 0 ? (
                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
                          <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-200">
                            <AlertCircle size={14} className="text-amber-600 shrink-0" />
                            <span>Tidak Ada Jadwal Mengajar di Tingkat {tingkat || '-'}</span>
                          </div>
                          <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 mt-1 leading-relaxed">
                            Anda tidak memiliki rombel binaan di Tingkat {tingkat} untuk mata pelajaran ini. Mode Mandiri hanya untuk rombel binaan Anda sendiri. Silakan beralih ke <strong>Naskah Bersama (Master MGMP)</strong> jika ingin membuat naskah lintas jurusan se-sekolah.
                          </p>
                        </div>
                      ) : (
                        /* Fallback jika data rombel belum spesifik di jadwal */
                        <div className="space-y-1.5">
                          <p className="text-[11px] text-slate-500">
                            Pilih jurusan rombel yang Anda ampu di tingkat {tingkat || '-'}:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {rawJurusanList && rawJurusanList.map((j) => {
                              const code = ((j.singkatan || j.kode || j.kode_jurusan || j.nama || '') as string).trim();
                              const isChecked = selectedJurusanList.includes(code.toUpperCase());

                              return (
                                <button
                                  key={j.id}
                                  type="button"
                                  onClick={() => toggleJurusan(code)}
                                  className={cn(
                                    'py-1.5 px-2.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5',
                                    isChecked
                                      ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-2xs'
                                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 hover:border-slate-300'
                                  )}
                                >
                                  <span>{code}</span>
                                  {isChecked && <span className="text-[9px]">✓</span>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Notifikasi jika memilih jurusan di luar jadwal mengajar */}
                      {isTargetOutOfSchedule.isInvalid && (
                        <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                          <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                          <p className="text-[11px] leading-relaxed">
                            {isTargetOutOfSchedule.message}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                }

                /* ── TAMPILAN KHUSUS MGMP BERSAMA (SKALA SEKOLAH) ── */
                return (
                  <div className="space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Cakupan Jurusan Master MGMP Se-Sekolah:
                      </label>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {jurusan ? `Khusus Jurusan ${jurusan}` : 'Berlaku untuk semua jurusan'}
                      </span>
                    </div>

                    {/* Banner Penjelas jika Semua Jurusan Sudah Ada */}
                    {jurusanOccupancy.isGeneralOccupied && (
                      <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2.5">
                        <Lock size={16} className="text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-rose-800 dark:text-rose-200">
                            Naskah Master Umum (Semua Jurusan) Sudah Diterbitkan
                          </div>
                          <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5 leading-relaxed">
                            Paket Master <strong>Umum (Semua Jurusan)</strong> untuk Tingkat {tingkat || '-'} telah diterbitkan oleh{' '}
                            <strong>{jurusanOccupancy.generalInfo?.guruName || 'rekan guru'}</strong>. Seluruh jurusan pada tingkat ini telah resmi tercakup dalam naskah master tersebut sehingga pembuatan bank soal baru dikunci untuk mencegah duplikasi ujian.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5 items-center">
                      {/* Chip Semua Jurusan (Umum) */}
                      {(() => {
                        const isGeneralOcc = jurusanOccupancy.isGeneralOccupied;
                        const isSelected = !jurusan;
                        return (
                          <button
                            type="button"
                            disabled={isGeneralOcc}
                            onClick={() => {
                              if (isGeneralOcc) return;
                              clearJurusan();
                            }}
                            className={cn(
                              'py-1.5 px-2.5 rounded-lg border text-xs font-semibold transition-all text-left flex items-center gap-1 cursor-pointer',
                              isGeneralOcc
                                ? 'opacity-40 bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                                : isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-2xs'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                            )}
                            title={
                              isGeneralOcc
                                ? `Bank soal Umum sudah dibuat oleh ${jurusanOccupancy.generalInfo?.guruName || 'rekan guru'}`
                                : 'Berlaku untuk semua rombel se-sekolah'
                            }
                          >
                            <span>Semua Jurusan (Umum)</span>
                            {isGeneralOcc && (
                              <span className="text-[8.5px] px-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 ml-0.5">
                                Sudah Ada
                              </span>
                            )}
                          </button>
                        );
                      })()}

                      {/* Seluruh Jurusan di Sekolah (Multi-Select atau Single Select) */}
                      {rawJurusanList &&
                        rawJurusanList.map((j) => {
                          const code = ((j.singkatan || j.kode || j.kode_jurusan || j.nama || '') as string).trim();
                          const isChecked = selectedJurusanList.includes(code.toUpperCase());
                          const occInfo = jurusanOccupancy.getOccupiedInfo(code);
                          const isOccupied = Boolean(occInfo);

                          return (
                            <button
                              key={j.id}
                              type="button"
                              disabled={isOccupied}
                              onClick={() => toggleJurusan(code)}
                              className={cn(
                                'py-1.5 px-2.5 rounded-lg border text-xs font-medium transition-all text-left flex items-center gap-1 cursor-pointer',
                                isOccupied
                                  ? 'opacity-40 bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                                  : isChecked
                                  ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-2xs'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                              )}
                              title={
                                isOccupied
                                  ? `Bank soal jurusan ${code} sudah di-cover oleh naskah master Umum (${occInfo?.guruName || 'rekan guru'})`
                                  : j.nama
                              }
                            >
                              <span>{code}</span>
                              {isOccupied ? (
                                <span className="text-[8.5px] px-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 ml-0.5">
                                  Sudah Ada
                                </span>
                              ) : isChecked ? (
                                <span className="text-[9px]">✓</span>
                              ) : null}
                            </button>
                          );
                        })}
                    </div>

                    {/* Colleague Picker untuk Mode MGMP (hanya jika master umum belum diterbitkan) */}
                    {!jurusanOccupancy.isGeneralOccupied && (
                      <div className="pt-2">
                        <CbtMgmpColleaguePicker
                          mapelId={mapelId}
                          tingkat={tingkat}
                          jurusan={jurusan}
                          currentGuruId={guruId}
                          selectedIds={selectedColleagueIds}
                          onChangeSelectedIds={setSelectedColleagueIds}
                          title="Pilih Rekan Guru Paralel Penerima Naskah:"
                          isEditMode={Boolean(bankSoalToEdit)}
                        />
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            </>
            )}
          </div>
        ) : (
          /* ── TAHAP 2: IDENTITAS, DURASI, & PENYUSUN SOAL ── */
          <div className="space-y-3">
            {/* Ringkasan Sasaran Bank Soal (Konfirmasi Visual Anti Human-Error) */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  Sasaran Terpilih:
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  🎯 Tingkat {tingkat || '-'}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  📚 {mapelOptions.find((m) => m.value === mapelId)?.label?.split('(')[0]?.trim() || 'Mata Pelajaran'}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  👥 {jurusan ? `Jurusan ${jurusan}` : 'Semua Jurusan'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline cursor-pointer flex items-center gap-1 ml-auto"
                title="Kembali ke langkah 1 untuk mengubah mata pelajaran atau tingkat sasaran"
              >
                <span>Ubah Sasaran</span>
                <ArrowLeft size={12} className="rotate-180" />
              </button>
            </div>

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
                      onClick={() => triggerAutoFillMassal(mapelId, tingkat, jenisKegiatanMassal, jurusan)}
                      className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline cursor-pointer"
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
                  placeholder="Contoh: PSAS Ganjil - Matematika Tingkat X"
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
                  placeholder={isGuruLoading ? 'Memuat daftar guru...' : 'Pilih guru penyusun...'}
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
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
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
                  onChange={(e) => setAlokasiMenit(Number(e.target.value) || 60)}
                  aria-label="Alokasi Durasi Kustom"
                  className="text-center font-bold text-xs"
                />
              </div>
            </div>

            {/* Konfirmasi Status Distribusi di Langkah 2 (Read-only, Bebas Redudansi) */}
            <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
              {isShared ? (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11.5px] text-emerald-900 dark:text-emerald-200 space-y-1">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>Paket MGMP Siap Diterbitkan &amp; Terdistribusi</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 pl-6 leading-relaxed">
                    Naskah dibagikan sebagai paket MGMP bersama.
                    {selectedColleagueIds.length > 0 ? (
                      <> Terdistribusi ke <strong>{selectedColleagueIds.length} rekan guru paralel</strong> yang telah Anda pilih.</>
                    ) : (
                      <> Belum ada rekan guru spesifik yang dipilih (Anda dapat kembali ke Langkah 1 jika ingin memilih rekan).</>
                    )}
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11.5px] text-slate-800 dark:text-slate-200 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
                    <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                    <span>Naskah Khusus Mandiri (Kelas Binaan Anda)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6 leading-relaxed">
                    Naskah ini tersimpan khusus untuk kelas yang Anda ampu dan tidak dibagikan ke rekan guru lain. Jika ingin mengubahnya menjadi paket MGMP bersama, silakan kembali ke Langkah 1.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Actions Footer Ramping ── */}
        <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800">
          {step === 1 ? (
            <Button
              key="btn-step1-cancel"
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Batal
            </Button>
          ) : (
            <Button
              key="btn-step2-back"
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setStep(1);
              }}
              disabled={isSubmitting}
              className="flex items-center gap-1.5"
            >
              <ArrowLeft size={14} />
              <span>Kembali</span>
            </Button>
          )}

          {step === 1 ? (
            isAwaitingRolloverDecision ? null : isTargetCoveredByColleague.isLocked ? (
              <Button
                key="btn-step1-locked"
                type="button"
                variant="outline"
                size="sm"
                disabled={true}
                className="bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 cursor-not-allowed flex items-center gap-1.5 font-bold"
                title={`Terkunci: Rombel sasaran ini telah di-cover oleh rekan guru MGMP Anda (${isTargetCoveredByColleague.authorName || 'Rekan Guru'})`}
              >
                <Lock size={14} className="text-rose-500" />
                <span>Terkunci: Sudah Di-cover Rekan MGMP</span>
              </Button>
            ) : isShared && jurusanOccupancy.isGeneralOccupied ? (
              <Button
                key="btn-step1-mgmp-locked"
                type="button"
                variant="outline"
                size="sm"
                disabled={true}
                className="bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 cursor-not-allowed flex items-center gap-1.5 font-bold"
                title={`Terkunci: Naskah Master Umum untuk Tingkat ${tingkat} sudah diterbitkan oleh ${jurusanOccupancy.generalInfo?.guruName || 'rekan guru'}`}
              >
                <Lock size={14} className="text-rose-500" />
                <span>Terkunci: Master Umum Tingkat {tingkat} Sudah Ada</span>
              </Button>
            ) : isTargetOutOfSchedule.isInvalid ? (
              <Button
                key="btn-step1-invalid-schedule"
                type="button"
                variant="outline"
                size="sm"
                disabled={true}
                className="bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 cursor-not-allowed flex items-center gap-1.5 font-bold"
                title={isTargetOutOfSchedule.message}
              >
                <Lock size={14} className="text-amber-500" />
                <span>Terkunci: Bukan Jadwal Mengajar Anda</span>
              </Button>
            ) : (
              <Button
                key="btn-step1-next"
                type="button"
                variant="primary"
                size="sm"
                onClick={handleNextStep}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span>Lanjut: Identitas &amp; Waktu</span>
                <ArrowRight size={14} />
              </Button>
            )
          ) : (
            <Button
              key="btn-step2-submit"
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer shadow-2xs"
            >
              {isSubmitting ? 'Menyimpan...' : isShared ? 'Terbitkan Master MGMP' : 'Simpan Bank Soal Mandiri'}
            </Button>
          )}
        </div>
      </form>
    </Modal>

    {previewBankSoal && (
      <CbtBankSoalDetailModal
        isOpen={Boolean(previewBankSoal)}
        onClose={() => setPreviewBankSoal(null)}
        bankSoal={previewBankSoal}
        readOnly={true}
      />
    )}
    </>
  );
};
