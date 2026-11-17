import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Input, SearchableSelect, Badge } from '@/components/ui';
import { useGuruOptions, useMapelOptions, useSemesterOptions, useJurusanOptions } from '@/components/common';
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
import { Layers, User, Sparkles, ArrowRight, ArrowLeft, CheckCircle2, Users, AlertCircle, AlertTriangle, Share2, Check, ShieldCheck } from 'lucide-react';
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
import { evaluateJurusanOccupancy } from './cbtJurusanAvailabilityHelper';
import { getMgmpSharedTeacherIds, setMgmpSharedTeacherIds } from '../jadwal/cbtMgmpHelper';
import { useCbtOperationMode } from '../cbtModeHelper';

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

  const { activeSemester } = useSemesterOptions();
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

  // Ambil daftar bank soal yang sudah ada untuk mapel & tingkat ini guna pencegahan duplikasi varian jurusan
  const { data: existingBanksRes } = useQuery({
    queryKey: ['cbt-existing-banks-by-mapel-tingkat', mapelId, tingkat],
    queryFn: () =>
      mapelId
        ? cbtApi
            .getBankSoalList({
              mapel_id: mapelId,
              tingkat: tingkat !== 'SEMUA' ? tingkat : undefined,
              limit: 200,
            })
            .catch(() => null)
        : null,
    enabled: isOpen && Boolean(mapelId),
    staleTime: 30 * 1000,
  });

  const existingBanks = useMemo(() => {
    return existingBanksRes?.items || (existingBanksRes as any)?.data?.items || [];
  }, [existingBanksRes]);

  const jurusanOccupancy = useMemo(() => {
    return evaluateJurusanOccupancy({
      existingBanks,
      currentEditingBankId: bankSoalToEdit?.id,
      targetTingkat: tingkat,
    });
  }, [existingBanks, bankSoalToEdit?.id, tingkat]);

  // Auto-reset jika jurusan yang dipilih sebelumnya ternyata occupied saat ganti mapel/tingkat
  useEffect(() => {
    if (jurusan && jurusanOccupancy.isJurusanOccupied(jurusan)) {
      setJurusan('');
    }
  }, [jurusan, jurusanOccupancy]);

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
    targetJurusan?: string
  ) => {
    const activeJur = targetJurusan !== undefined ? targetJurusan : jurusan;
    const { kodeBank: genCode, judul: genTitle } = generateAutoFillMassal({
      mapelOptions: activeMapelOptions,
      targetMapelId,
      targetTingkat,
      targetKegiatanKey,
      targetJurusan: activeJur,
      jenjang,
    });
    setKodeBank(genCode);
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
      const isSharedBank = Boolean(bankSoalToEdit.is_shared) || existingColleagues.length > 0;
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
      // Validasi anti human-error: defaultTingkat hanya dipakai jika secara spesifik dikirim dari konteks luar.
      // Jika tidak ada defaultTingkat spesifik, tingkat dikosongkan agar guru WAJIB memilih sendiri secara sadar.
      const initialTingkat = (defaultTingkat && validTingkat.includes(defaultTingkat))
        ? defaultTingkat
        : '';

      setTingkatTouched(false);
      setJenisKegiatanMassal(recKey);
      setKodeBank(isMassal ? `${recKey}-${year}-MAPEL${initialTingkat ? `-${initialTingkat}` : ''}` : `CBT-${year}-${randomSuffix}`);
      setJudul('');
      setGuruId(initialGuruId);
      setMapelId(defaultMapelId || '');
      setUnitPengajaranId('');
      setTingkat(initialTingkat);
      setAlokasiMenit(60);
      setAcakSoal(true);
      setAcakOpsi(true);
      setIsShared(false);
      setSelectedColleagueIds([]);
      setShowAllMapels(isPrivilegedRole || isMassal);
    }
  }, [isOpen, bankSoalToEdit, lockedEventKey, effectiveTingkatList, defaultTingkat, defaultMapelId]);

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

      const payload = {
        kode_bank: kodeBank.trim().toUpperCase(),
        judul: judul.trim(),
        guru_id: guruId,
        mapel_id: mapelId,
        unit_pengajaran_id: unitPengajaranId || null,
        tingkat,
        jurusan: jurusan || null,
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
      title={
        bankSoalToEdit
          ? 'Edit Paket Bank Soal'
          : scope === 'TERPUSAT_MASSAL'
          ? (isShared ? 'Buat Master Bank Soal MGMP (Ujian Bersama)' : 'Buat Bank Soal Ujian Mandiri')
          : 'Buat Bank Soal Mandiri'
      }
      size="lg"
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

              <div className="grid grid-cols-3 gap-2">
                {dynamicTingkatOptions.map((item) => {
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
                        setTingkatTouched(false);
                        if (scope === 'TERPUSAT_MASSAL' && mapelId) {
                          triggerAutoFillMassal(mapelId, item.value, jenisKegiatanMassal, jurusan);
                        }
                      }}
                      className={cn(
                        'py-2.5 px-3 rounded-lg border text-sm font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer',
                        !isAllowed
                          ? 'opacity-35 bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 cursor-not-allowed line-through'
                          : isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-400 dark:ring-indigo-500'
                          : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30'
                      )}
                      title={!isAllowed ? `Tidak relevan untuk ${jenisKegiatanMassal}` : `Pilih sasaran untuk ${item.label}`}
                    >
                      {isSelected && <CheckCircle2 size={15} className="text-white shrink-0" />}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {!tingkat && tingkatTouched && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1 mt-1">
                  <AlertCircle size={12} />
                  <span>Silakan pilih salah satu tingkat (X, XI, atau XII) di atas.</span>
                </p>
              )}
            </div>

            {/* 4. Sasaran Konsentrasi Keahlian / Jurusan */}
            <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Sasaran Konsentrasi Keahlian / Jurusan
                </label>
                <span className="text-[10px] text-slate-400 font-medium">
                  {jurusan ? `Khusus ${jurusan}` : 'Berlaku untuk semua rombel'}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
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
                        setJurusan('');
                        if (scope === 'TERPUSAT_MASSAL' && mapelId) {
                          triggerAutoFillMassal(mapelId, tingkat, jenisKegiatanMassal, '');
                        }
                      }}
                      className={cn(
                        'py-1.5 px-2.5 rounded-lg border text-xs font-semibold transition-all text-left flex items-center gap-1 cursor-pointer',
                        isGeneralOcc
                          ? 'opacity-40 bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                          : isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-2xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                      )}
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

                {/* Custom chip jika jurusan dari default/prop tidak ada di daftar master */}
                {jurusan && !rawJurusanList.some((j) => ((j.singkatan || j.kode || j.kode_jurusan || j.nama || '') as string).trim().toUpperCase() === jurusan.toUpperCase()) && (
                  <button
                    type="button"
                    onClick={() => setJurusan('')}
                    className="py-1.5 px-2.5 rounded-lg border text-xs font-bold bg-indigo-600 text-white border-indigo-600 shadow-2xs cursor-pointer flex items-center gap-1"
                    title="Klik untuk membatalkan jurusan khusus ini"
                  >
                    <span>{jurusan}</span>
                    <span className="text-[9px] ml-0.5 opacity-80">✕</span>
                  </button>
                )}

                {/* Chip Jurusan Spesifik */}
                {rawJurusanList && rawJurusanList.map((j) => {
                  const code = ((j.singkatan || j.kode || j.kode_jurusan || j.nama || '') as string).trim();
                  const isSelected = jurusan.toUpperCase() === code.toUpperCase();
                  const occInfo = jurusanOccupancy.getOccupiedInfo(code);
                  const isOccupied = Boolean(occInfo);

                  return (
                    <button
                      key={j.id}
                      type="button"
                      disabled={isOccupied}
                      onClick={() => {
                        if (isOccupied) return;
                        setJurusan(code);
                        if (scope === 'TERPUSAT_MASSAL' && mapelId) {
                          triggerAutoFillMassal(mapelId, tingkat, jenisKegiatanMassal, code);
                        }
                      }}
                      className={cn(
                        'py-1.5 px-2.5 rounded-lg border text-xs font-medium transition-all text-left flex items-center gap-1 cursor-pointer',
                        isOccupied
                          ? 'opacity-40 bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                          : isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-2xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                      )}
                      title={isOccupied ? `Bank soal jurusan ${code} sudah dibuat oleh ${occInfo?.guruName || 'rekan guru'}` : j.nama}
                    >
                      <span>{code}</span>
                      {isOccupied && (
                        <span className="text-[8.5px] px-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 ml-0.5">
                          Sudah Ada
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Opsi Distribusi Bank Soal (Mencegah Human Error & Memperjelas Niat Guru) */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Share2 size={13} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Apakah naskah ini akan dibagikan ke rekan guru lain?</span>
                </label>
                <span
                  className={cn(
                    'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                    isShared
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800'
                      : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                  )}
                >
                  {isShared ? 'Mode MGMP (Bersama)' : 'Mode Mandiri'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Opsi 1: Mandiri */}
                <button
                  type="button"
                  onClick={() => {
                    setIsShared(false);
                    setSelectedColleagueIds([]);
                  }}
                  className={cn(
                    'p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 relative',
                    !isShared
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500 shadow-2xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <User size={13} className={!isShared ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
                      <span>Tidak, Khusus Mandiri</span>
                    </span>
                    {!isShared && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-600 text-white flex items-center gap-0.5">
                        <Check size={10} /> Terpilih
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Khusus untuk diri sendiri dan rombel kelas binaan Anda. Rekan guru lain tidak menerima naskah ini.
                  </p>
                </button>

                {/* Opsi 2: Dibagikan (MGMP) */}
                <button
                  type="button"
                  onClick={() => {
                    setIsShared(true);
                  }}
                  className={cn(
                    'p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 relative',
                    isShared
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500 shadow-2xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <Users size={13} className={isShared ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
                      <span>Ya, Dibagikan (MGMP)</span>
                    </span>
                    {isShared && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-600 text-white flex items-center gap-0.5">
                        <Check size={10} /> Terpilih
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Naskah bersama se-mapel &amp; tingkat. Rekan paralel yang dipilih otomatis bebas tugas membuat soal.
                  </p>
                </button>
              </div>

              {/* Tampilan Kondisional: Colleague Picker jika isShared, Info Box Aman jika Mandiri */}
              {isShared ? (
                <div className="pt-2 animate-in fade-in duration-200">
                  <CbtMgmpColleaguePicker
                    mapelId={mapelId}
                    tingkat={tingkat}
                    jurusan={jurusan}
                    currentGuruId={guruId}
                    selectedIds={selectedColleagueIds}
                    onChangeSelectedIds={setSelectedColleagueIds}
                    title="Pilih Rekan Guru Paralel Penerima Naskah:"
                  />
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300 animate-in fade-in duration-200">
                  <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
                  <span>
                    <strong>Mode Mandiri Aktif:</strong> Naskah ini aman dan privat hanya untuk rombel kelas Anda. Tidak ada rekan guru lain yang akan terhubung.
                  </span>
                </div>
              )}
            </div>
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
                      onClick={() => triggerAutoFillMassal(mapelId, tingkat, jenisKegiatanMassal)}
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
  );
};
