import React, { useState, useMemo, useEffect, useRef, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  useKelasOptions,
  useTahunPelajaranOptions,
  useSemesterOptions,
  useGuruOptions,
} from '@/components/common';
import {
  BookOpen,
  DoorOpen,
  Calendar,
  Users,
  Activity,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  TableProperties,
  SlidersHorizontal,
  Loader,
  Lock,
  Unlock,
  Edit2,
  Check,
  History,
} from 'lucide-react';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import { CbtRolloverModal, type CbtRolloverMode } from '../shared/CbtRolloverModal';
import { Modal } from '@/components/ui';
import type { CbtJadwalUjian, CbtBankSoal } from '@/types/cbt.types';
import { getVirtualDate } from '@/utils/attendance/time';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useCbtOperationMode } from '../cbtModeHelper';
import { listGuruMapel } from '@/api/kurikulum/guru-mapel.api';
import {
  KelasRoomMapping,
  generateClassRoomMappings,
  loadPersistedRoomMappings,
  loadPersistedRoomMappingsList,
  savePersistedRoomMappings,
  filterEffectiveJadwalList,
  evaluateStep1Soal,
  evaluateStep2Ruang,
  evaluateStep3Jadwal,
  evaluateStep4Pengawas,
  evaluateStep5Monitoring,
  PhaseReadinessResult,
  CbtPanitiaPhase,
} from './cbtOrchestratorHelper';
import { fetchDenahList, spasialQueryKeys } from '@/api/spasial.api';
import { CbtBankSoalReadinessPanel } from './CbtBankSoalReadinessPanel';
import { CbtKelasRoomTreePanel } from './CbtKelasRoomTreePanel';
import { CbtTimetableMatrixPanel } from './CbtTimetableMatrixPanel';
import { CbtPengawasMatrixPanel } from './CbtPengawasMatrixPanel';
import { CbtPanitiaLiveCommandPanel } from './CbtPanitiaLiveCommandPanel';

const CbtEventSettingsTable = lazy(() =>
  import('./CbtEventSettingsTable').then((m) => ({ default: m.CbtEventSettingsTable }))
);

export type CbtPanitiaPhase =
  | 'fase_1_soal'
  | 'fase_2_ruang'
  | 'fase_3_jadwal'
  | 'fase_4_pengawas'
  | 'fase_5_monitor';

export interface CbtPanitiaOrchestratorViewProps {
  onOpenSettings?: () => void;
}

export const CbtPanitiaOrchestratorView: React.FC<CbtPanitiaOrchestratorViewProps> = ({
  onOpenSettings,
}) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const tenantId = user?.tenant_id;
  const { mode, eventName, isOrkestrasi, isMandiri, targetTingkat: localTargetTingkat } = useCbtOperationMode();

  // Query Konfigurasi Event Aktif dari Database Tenant
  const { data: eventsData } = useQuery({
    queryKey: cbtQueryKeys.eventsSummary(),
    queryFn: () => cbtApi.getEventsSummary(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const systemActiveEvent = eventsData?.active_event;

  const availableEvents = useMemo(() => {
    const groups = eventsData?.summary || [];
    const list: any[] = [];
    const seen = new Set<string>();
    groups.forEach((grp: any) => {
      (grp?.events || []).forEach((ev: any) => {
        if (!ev?.id || seen.has(ev.id)) return;
        seen.add(ev.id);
        list.push(ev);
      });
    });
    if (systemActiveEvent?.id && !seen.has(systemActiveEvent.id)) {
      list.unshift(systemActiveEvent);
    }
    return list.sort((a, b) => Number(Boolean(b.is_active)) - Number(Boolean(a.is_active)));
  }, [eventsData, systemActiveEvent]);

  const activeEvent = useMemo(() => {
    if (selectedEventId) {
      const matched = availableEvents.find((e) => e.id === selectedEventId);
      if (matched) return matched;
    }
    return systemActiveEvent;
  }, [selectedEventId, availableEvents, systemActiveEvent]);

  const isViewingNonActiveEvent = Boolean(
    activeEvent?.id && systemActiveEvent?.id && activeEvent.id !== systemActiveEvent.id
  );

  const effectiveEventName = activeEvent?.nama_event || eventName;
  const effectiveTargetTingkat = useMemo(() => {
    if (activeEvent?.target_tingkat && activeEvent.target_tingkat.length > 0) {
      return activeEvent.target_tingkat;
    }
    return localTargetTingkat || [10, 11, 12];
  }, [activeEvent, localTargetTingkat]);

  const [activeTab, setActiveTab] = useState<CbtPanitiaPhase>('fase_1_soal');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [rolloverModalMode, setRolloverModalMode] = useState<CbtRolloverMode | null>(null);

  const { rawList: guruList = [] } = useGuruOptions({ jenisPtk: 'ALL' });
  const { rawList: kelasList = [] } = useKelasOptions();
  const { activeYear: activeTp, rawList: tpRawList = [] } = useTahunPelajaranOptions();
  const { activeSemester, rawList: semRawList = [] } = useSemesterOptions();

  // Konteks Akademik Efektif: Prioritaskan TP & Semester aktif sistem agar isolasi lintas periode terjaga
  const effectiveTpId = activeTp?.id || activeEvent?.tahun_pelajaran_id;
  const effectiveSemId = useMemo(() => {
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

  // Resolusi Tahun Pelajaran SSoT: Prioritaskan Pengaturan Event CBT Aktif -> Konteks Akademik Aktif
  const effectiveTpName = useMemo(() => {
    if (activeEvent?.tahun_pelajaran_id && eventsData?.summary) {
      const matched = eventsData.summary.find(
        (s) => s.tahun_pelajaran_id === activeEvent.tahun_pelajaran_id
      );
      if (matched?.tahun_ajaran) return matched.tahun_ajaran;
    }
    if (activeEvent?.tahun_pelajaran_id && tpRawList.length > 0) {
      const matched = tpRawList.find((tp) => tp.id === activeEvent.tahun_pelajaran_id);
      if (matched?.tahun) return matched.tahun;
    }
    if (activeTp?.tahun) return activeTp.tahun;
    if ((activeTp as any)?.nama) return (activeTp as any).nama;

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    return curMonth >= 7 ? `${curYear}/${curYear + 1}` : `${curYear - 1}/${curYear}`;
  }, [activeEvent, eventsData, tpRawList, activeTp]);

  // Resolusi Semester SSoT: Prioritaskan Pengaturan Event CBT Aktif -> Konteks Akademik Aktif
  const effectiveSemesterName = useMemo(() => {
    if (activeEvent?.semester) {
      return activeEvent.semester;
    }
    if (activeSemester?.nama_semester) {
      return activeSemester.nama_semester;
    }
    if ((activeSemester as any)?.nama) {
      return (activeSemester as any).nama;
    }
    const curMonth = new Date().getMonth() + 1;
    return curMonth >= 7 ? 'GANJIL' : 'GENAP';
  }, [activeEvent, activeSemester]);

  // Filter kelas aktif sesuai sasaran tingkat event ujian yang sedang aktif
  const scopedKelasList = useMemo(() => {
    const active = kelasList.filter((k) => k.is_active !== false && String(k.status || '').toUpperCase() !== 'NONAKTIF');
    if (!effectiveTargetTingkat || effectiveTargetTingkat.length === 0) return active;
    return active.filter((k) => effectiveTargetTingkat.includes(Number(k.tingkat)));
  }, [kelasList, effectiveTargetTingkat]);

  // ── 1. Query Denah Spasial Kampus (Master Sarpras / Event Ujian) ──
  const { data: denahListData } = useQuery({
    queryKey: spasialQueryKeys.list({ tipe: 'EVENT_UJIAN' }),
    queryFn: () => fetchDenahList({ tipe: 'EVENT_UJIAN' }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const denahMapByKelasId = useMemo(() => {
    const map = new Map<string, { slot_ruang: string; nama_ruang: string }>();
    if (Array.isArray(denahListData)) {
      denahListData.forEach((d) => {
        const elements = Array.isArray(d.elements) ? d.elements : [];
        elements.forEach((el: any) => {
          if (!el || !el.label_utama) return;
          const slot = String(el.label_utama).trim();
          const nama = el.catatan || el.label_sub || slot;
          if (el.kelas_id && !map.has(el.kelas_id)) {
            map.set(el.kelas_id, { slot_ruang: slot, nama_ruang: nama });
          }
        });
      });
    }
    return map;
  }, [denahListData]);

  // ── 2. State Ploting Ruang ke Kelas (Kelas-Centrik R.01 - R.n & Terintegrasi Denah Spasial) ──
  const [roomMappings, setRoomMappings] = useState<KelasRoomMapping[]>([]);
  const isRoomInitializedRef = useRef(false);

  useEffect(() => {
    isRoomInitializedRef.current = false;
  }, [activeEvent?.id, effectiveTpId]);

  useEffect(() => {
    if (!scopedKelasList.length) {
      setRoomMappings([]);
      isRoomInitializedRef.current = false;
      return;
    }

    // Jika komponen sudah diinisialisasi dan state saat ini sudah memuat seluruh kelas target,
    // JANGAN timpa balik urutan susunan (mencegah revert susunan saat query denah/kelas re-fetch di background)
    // NAMUN tetap sinkronkan metadata kelas (jurusan, tingkat, nama) yang melekat dari master backend
    if (isRoomInitializedRef.current && roomMappings.length > 0) {
      const currentIds = new Set(roomMappings.map((r) => r.kelas_id));
      const allExist = scopedKelasList.every((k) => currentIds.has(k.id));
      if (allExist && roomMappings.length === scopedKelasList.length) {
        let hasChanges = false;
        const reconciled = roomMappings.map((rm) => {
          const master = scopedKelasList.find((k) => k.id === rm.kelas_id);
          if (!master) return rm;
          const jurKode =
            master.kode_jurusan ||
            master.Jurusan?.kode ||
            master.Jurusan?.singkatan ||
            master.Jurusan?.ProgramKeahlian?.kode ||
            master.Jurusan?.ProgramKeahlian?.singkatan ||
            master.Jurusan?.kode_jurusan ||
            rm.kode_jurusan;
          const jurNama =
            master.nama_jurusan ||
            master.Jurusan?.nama ||
            master.Jurusan?.nama_jurusan ||
            master.Jurusan?.ProgramKeahlian?.nama ||
            master.Jurusan?.singkatan ||
            rm.nama_jurusan;
          const mNamaKelas = master.nama_kelas || master.nama || rm.nama_kelas;
          const mTingkat = Number(master.tingkat) || rm.tingkat;
          const mJurusanId = master.jurusan_id || master.Jurusan?.id || rm.jurusan_id;

          if (
            rm.jurusan_id !== mJurusanId ||
            rm.kode_jurusan !== jurKode ||
            rm.nama_jurusan !== jurNama ||
            rm.nama_kelas !== mNamaKelas ||
            rm.tingkat !== mTingkat
          ) {
            hasChanges = true;
            return {
              ...rm,
              jurusan_id: mJurusanId,
              kode_jurusan: jurKode,
              nama_jurusan: jurNama,
              nama_kelas: mNamaKelas,
              tingkat: mTingkat,
            };
          }
          return rm;
        });

        if (hasChanges) {
          setRoomMappings(reconciled);
          savePersistedRoomMappings(reconciled, tenantId, activeEvent?.id);
        }
        return;
      }
    }

    const eventId = activeEvent?.id;
    // Prioritaskan room_mappings dari Cloud Server (DB SSoT), fallback ke LocalStorage
    const cloudRoomMappings = (activeEvent?.room_mappings && Array.isArray(activeEvent.room_mappings) && activeEvent.room_mappings.length > 0)
      ? activeEvent.room_mappings
      : null;
    const persistedList = cloudRoomMappings || loadPersistedRoomMappingsList(tenantId, eventId);
    const persistedMap = loadPersistedRoomMappings(tenantId, eventId);

    // 1. Jika sudah ada susunan array tersimpan (format v2), pertahankan urutan persis yang diatur panitia
    if (persistedList && Array.isArray(persistedList) && persistedList.length > 0) {
      const activeIds = new Set(scopedKelasList.map((k) => k.id));
      const ordered: KelasRoomMapping[] = [];

      // Masukkan item tersimpan yang masih relevan dengan kelas aktif
      persistedList.forEach((item) => {
        if (activeIds.has(item.kelas_id)) {
          // Update data nama kelas / jurusan jika ada perubahan dari master kelas
          const master = scopedKelasList.find((k) => k.id === item.kelas_id);
          const masterJurKode =
            master?.kode_jurusan ||
            master?.Jurusan?.kode ||
            master?.Jurusan?.singkatan ||
            master?.Jurusan?.ProgramKeahlian?.kode ||
            master?.Jurusan?.ProgramKeahlian?.singkatan ||
            master?.Jurusan?.kode_jurusan ||
            item.kode_jurusan;

          const masterJurNama =
            master?.nama_jurusan ||
            master?.Jurusan?.nama ||
            master?.Jurusan?.nama_jurusan ||
            master?.Jurusan?.ProgramKeahlian?.nama ||
            master?.Jurusan?.singkatan ||
            item.nama_jurusan;

          ordered.push({
            ...item,
            nama_kelas: master?.nama_kelas || master?.nama || item.nama_kelas,
            tingkat: Number(master?.tingkat) || item.tingkat,
            jurusan_id: master?.jurusan_id || item.jurusan_id,
            kode_jurusan: masterJurKode,
            nama_jurusan: masterJurNama,
          });
        }
      });

      // Tambahkan rombel baru jika ada rombel yang belum terdaftar di susunan sebelumnya
      const existingOrderedIds = new Set(ordered.map((o) => o.kelas_id));
      scopedKelasList.forEach((k) => {
        if (!existingOrderedIds.has(k.id)) {
          const nextSlotNum = ordered.length + 1;
          const padLength = scopedKelasList.length > 99 ? 3 : 2;
          const slotCode = `R.${String(nextSlotNum).padStart(padLength, '0')}`;
          ordered.push({
            kelas_id: k.id,
            nama_kelas: k.nama_kelas || k.nama || `Kelas ${nextSlotNum}`,
            tingkat: Number(k.tingkat) || 10,
            jurusan_id: k.jurusan_id,
            kode_jurusan:
              k.kode_jurusan ||
              k.Jurusan?.kode ||
              k.Jurusan?.singkatan ||
              k.Jurusan?.ProgramKeahlian?.kode ||
              k.Jurusan?.ProgramKeahlian?.singkatan ||
              k.Jurusan?.kode_jurusan,
            nama_jurusan:
              k.nama_jurusan ||
              k.Jurusan?.nama ||
              k.Jurusan?.nama_jurusan ||
              k.Jurusan?.ProgramKeahlian?.nama ||
              k.Jurusan?.singkatan,
            slot_ruang: slotCode,
            nama_ruang: `Ruang ${String(nextSlotNum).padStart(padLength, '0')}`,
            kapasitas: k.kapasitas || 36,
          });
        }
      });

      setRoomMappings(ordered);
      savePersistedRoomMappings(ordered, tenantId, eventId);
      isRoomInitializedRef.current = true;
      return;
    }

    // 2. Fallback: Inisialisasi awal jika belum ada data tersimpan
    const generated = generateClassRoomMappings(scopedKelasList);
    const merged = generated.map((item) => {
      // Prioritas 1: editan tersimpan
      const saved = persistedMap?.[item.kelas_id];
      if (saved && (saved.slot_ruang || saved.nama_ruang)) {
        return {
          ...item,
          slot_ruang: saved.slot_ruang || item.slot_ruang,
          nama_ruang: saved.nama_ruang || item.nama_ruang,
        };
      }

      // Prioritas 2: dari denah spasial
      const fromDenah = denahMapByKelasId.get(item.kelas_id);
      if (fromDenah && (fromDenah.slot_ruang || fromDenah.nama_ruang)) {
        return {
          ...item,
          slot_ruang: fromDenah.slot_ruang || item.slot_ruang,
          nama_ruang: fromDenah.nama_ruang || item.nama_ruang,
        };
      }

      return item;
    });

    setRoomMappings(merged);
    savePersistedRoomMappings(merged, tenantId, eventId);
    isRoomInitializedRef.current = true;
  }, [scopedKelasList, tenantId, activeEvent?.id, denahMapByKelasId]);

  // ── 2. Fetch Bank Soal (Terikat Konteks TP, Semester & Event Aktif) ──
  const bankQueryParams = useMemo(
    () => ({
      limit: 500,
      ...(effectiveTpId ? { tahun_pelajaran_id: effectiveTpId } : {}),
      ...(effectiveSemId ? { semester_id: effectiveSemId } : {}),
      ...(activeEvent?.id ? { event_id: activeEvent.id } : {}),
    }),
    [effectiveTpId, effectiveSemId, activeEvent?.id]
  );
  const { data: bankRes, refetch: refetchBankSoal } = useQuery({
    queryKey: cbtQueryKeys.bankSoal(bankQueryParams),
    queryFn: () => cbtApi.getBankSoalList(bankQueryParams),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const rawBankList: CbtBankSoal[] = bankRes?.items || [];
  const readyBankList: CbtBankSoal[] = useMemo(() => {
    return rawBankList.filter((b) => (b.jumlah_soal || b._count?.Soal || 0) > 0);
  }, [rawBankList]);

  // ── 3. Fetch Jadwal Ujian Aktif (Terikat Konteks TP & Semester Event Aktif) ──
  const jadwalQueryParams = useMemo(
    () => ({
      limit: 1000,
      sort_direction: 'asc' as const,
      ...(effectiveTpId ? { tahun_pelajaran_id: effectiveTpId } : {}),
      ...(effectiveSemId ? { semester_id: effectiveSemId } : {}),
    }),
    [effectiveTpId, effectiveSemId]
  );
  const { data: jadwalRes, isLoading: isLoadingJadwal, refetch: refetchJadwal } = useQuery({
    queryKey: cbtQueryKeys.jadwal(jadwalQueryParams),
    queryFn: () => cbtApi.getJadwalList(jadwalQueryParams),
    enabled: Boolean(effectiveTpId),
    staleTime: 3 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const jadwalList: CbtJadwalUjian[] = jadwalRes?.items || [];

  // ── 4. Fetch SK Penugasan Guru Mapel untuk Audit Kesiapan Soal (Terikat TP Event Aktif) ──
  const { data: guruMapelRes } = useQuery({
    queryKey: ['guru-mapel-readiness', effectiveTpId],
    queryFn: () => listGuruMapel({ tahun_pelajaran_id: effectiveTpId }),
    enabled: !!effectiveTpId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const rawGuruMapel = guruMapelRes?.data || [];

  const defaultTodayStr = useMemo(() => {
    const now = getVirtualDate();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Jadwal yang strictly patuh pada active event & target tingkat (berbasis kelas_id mutlak)
  const effectiveJadwalList = useMemo(() => {
    return filterEffectiveJadwalList(jadwalList, activeEvent?.id, effectiveTargetTingkat, roomMappings);
  }, [jadwalList, activeEvent?.id, effectiveTargetTingkat, roomMappings]);

  // ── ENGINE KETUNTASAN TIAP FASE MEJA KERJA PANITIA ──
  const readinessStep1 = useMemo(() => {
    return evaluateStep1Soal({
      rawGuruMapel,
      bankList: rawBankList,
      targetTingkat: effectiveTargetTingkat,
      tenantId,
    });
  }, [rawGuruMapel, rawBankList, effectiveTargetTingkat, tenantId]);

  const readinessStep2 = useMemo(() => {
    return evaluateStep2Ruang({
      scopedKelasList,
      roomMappings,
    });
  }, [scopedKelasList, roomMappings]);

  const readinessStep3 = useMemo(() => {
    return evaluateStep3Jadwal({
      effectiveJadwalList,
    });
  }, [effectiveJadwalList]);

  const readinessStep4 = useMemo(() => {
    return evaluateStep4Pengawas({
      effectiveJadwalList,
    });
  }, [effectiveJadwalList]);

  const readinessStep5 = useMemo(() => {
    return evaluateStep5Monitoring({
      effectiveJadwalList,
    });
  }, [effectiveJadwalList]);

  // Definisi 5 Fase Operasional Panitia
  const phases: Array<{
    id: CbtPanitiaPhase;
    title: string;
    readiness: PhaseReadinessResult;
    icon: React.ElementType;
  }> = [
    {
      id: 'fase_1_soal',
      title: 'Soal',
      readiness: readinessStep1,
      icon: BookOpen,
    },
    {
      id: 'fase_2_ruang',
      title: 'Ruang',
      readiness: readinessStep2,
      icon: DoorOpen,
    },
    {
      id: 'fase_3_jadwal',
      title: 'Jadwal',
      readiness: readinessStep3,
      icon: Calendar,
    },
    {
      id: 'fase_4_pengawas',
      title: 'Pengawas',
      readiness: readinessStep4,
      icon: Users,
    },
    {
      id: 'fase_5_monitor',
      title: 'Monitoring',
      readiness: readinessStep5,
      icon: Activity,
    },
  ];

  // Hitung index aktif & persentase garis progress horizontal
  const activeIndex = Math.max(0, phases.findIndex((p) => p.id === activeTab));
  const fillPercent = activeIndex === 4 ? 100 : activeIndex * 20 + 10;

  // Definisi Node Flight Deck (Header + Stepper Garis Lingkaran) untuk disatukan dalam 1 ruang
  const flightDeckNode = (
    <div className="p-3 sm:p-3.5 space-y-2.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Left: Event Scope Badge (Integrated) */}
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-600/30 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-500/30 shrink-0">
            <Layers size={16} />
          </span>
          <h2 className="text-sm font-black tracking-tight text-slate-900 dark:text-white shrink-0">
            Meja Kerja Panitia
          </h2>
          {availableEvents.length > 1 ? (
            <div className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-bold shadow-2xs',
              isViewingNonActiveEvent
                ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200'
                : 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-200 dark:border-indigo-700/60 text-indigo-700 dark:text-indigo-200'
            )}>
              <Calendar size={12} className="shrink-0" />
              <span className="text-[11px] font-semibold opacity-75 shrink-0">Event:</span>
              <select
                value={activeEvent?.id || ''}
                onChange={(e) => setSelectedEventId(e.target.value)}
                aria-label="Pilih Konteks Event Meja Kerja Panitia"
                className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer min-w-[200px] sm:min-w-[260px] max-w-[360px]"
              >
                {availableEvents.map((ev) => (
                  <option key={ev.id} value={ev.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                    {ev.nama_event}{ev.is_active ? ' (Aktif)' : ' (Persiapan / Non-Aktif)'}
                  </option>
                ))}
              </select>
            </div>
          ) : effectiveEventName ? (
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100/80 dark:bg-indigo-950/80 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-700/60 text-indigo-700 dark:text-indigo-200 text-xs font-bold cursor-pointer transition-colors shadow-2xs"
              title="Event CBT Aktif (Klik untuk Pengaturan)"
            >
              <Lock size={12} className="text-indigo-500 shrink-0" />
              <span className="truncate max-w-xs sm:max-w-md font-bold">{effectiveEventName}</span>
            </button>
          ) : null}
        </div>

        {/* Right: Quick Rollover & Settings */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto text-xs flex-wrap">
          <button
            type="button"
            onClick={() =>
              setRolloverModalMode(activeTab === 'fase_2_ruang' ? 'event-config' : 'bank-soal')
            }
            className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
            title="Tarik Bank Soal atau Konfigurasi Ruang/Pengawas dari Event Sebelumnya"
          >
            <History size={13} />
            <span>{activeTab === 'fase_2_ruang' ? 'Rollover Ruang/Event' : 'Rollover Soal'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSettingsModalOpen(true);
              onOpenSettings?.();
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
            title="Buka Pengaturan Event CBT"
          >
            <SlidersHorizontal size={13} className="text-indigo-600 dark:text-indigo-400" />
            <span>Pengaturan</span>
          </button>
        </div>
      </div>

      {isViewingNonActiveEvent && activeEvent && (
        <div className="px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between gap-2 flex-wrap">
          <span>
            Mode Persiapan Event Non-Aktif: Anda sedang mengatur <strong>{activeEvent.nama_event}</strong> (belum aktif di siswa). Simulasi/ujian aktif tetap berjalan normal.
          </span>
          <button
            type="button"
            onClick={() => setSelectedEventId('')}
            className="text-[11px] font-bold text-amber-900 dark:text-amber-100 underline cursor-pointer shrink-0"
          >
            Kembali ke Event Aktif
          </button>
        </div>
      )}

      {/* ── Stepper Garis Lingkaran Horizontal (Sesuai Konsep Desain) ── */}
      <div className="pt-2 pb-1 border-t border-slate-100 dark:border-slate-800/80">
        <div className="relative pt-1 pb-1">
          {/* Horizontal Track Line Container */}
          <div className="absolute top-[17px] sm:top-[19px] left-0 right-0 h-1 sm:h-1.5 bg-slate-200 dark:bg-slate-700/80 rounded-full z-0 overflow-hidden">
            {/* Active Progress Fill Line */}
            <div
              className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-300 ease-in-out"
              style={{
                width: `${fillPercent}%`,
              }}
            />
          </div>

          {/* Circles and Labels Grid */}
          <div className="grid grid-cols-5 relative z-10">
            {phases.map((phase, idx) => {
              const Icon = phase.icon;
              const isActive = activeTab === phase.id;
              const isPassed = idx < activeIndex;
              const rd = phase.readiness;

              return (
                <button
                  key={phase.id}
                  type="button"
                  onClick={() => setActiveTab(phase.id)}
                  className="group flex flex-col items-center focus:outline-hidden cursor-pointer"
                  title={rd.detailText}
                >
                  {/* Circle Node with micro check / warning badge */}
                  <div className="relative">
                    <div
                      className={cn(
                        'w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 shadow-2xs',
                        rd.isDone
                          ? isActive
                            ? 'bg-emerald-600 text-white ring-4 ring-emerald-200 dark:ring-emerald-900/60 scale-105 shadow-emerald-500/20'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20'
                          : rd.hasWarning
                            ? isActive
                              ? 'bg-rose-600 text-white ring-4 ring-rose-200 dark:ring-rose-900/60 scale-105 shadow-rose-500/20'
                              : 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-500/20'
                            : isActive
                              ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-950/80 scale-105'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 group-hover:bg-slate-300 dark:group-hover:bg-slate-600'
                      )}
                    >
                      <Icon size={16} className="transition-transform group-hover:scale-110" />
                    </div>

                    {/* Micro completion or warning badge at top-right */}
                    {rd.isDone ? (
                      <span
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs border-2 border-white dark:border-slate-900 animate-in zoom-in-75"
                        title="Tuntas"
                      >
                        <Check size={9} strokeWidth={3} />
                      </span>
                    ) : rd.hasWarning ? (
                      <span
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs border-2 border-white dark:border-slate-900 animate-in zoom-in-75"
                        title="Ada Bentrok/Kendala"
                      >
                        <AlertCircle size={9} strokeWidth={3} />
                      </span>
                    ) : null}
                  </div>

                  {/* Label & Dynamic Readiness Subtitle */}
                  <div className="mt-1 flex flex-col items-center leading-tight">
                    <span
                      className={cn(
                        'text-[11px] sm:text-xs transition-colors whitespace-nowrap text-center font-bold',
                        rd.isDone
                          ? isActive
                            ? 'text-emerald-700 dark:text-emerald-300 font-black'
                            : 'text-emerald-700 dark:text-emerald-400 font-bold'
                          : rd.hasWarning
                            ? 'text-rose-600 dark:text-rose-400 font-black'
                            : isActive
                              ? 'text-indigo-600 dark:text-indigo-400 font-black'
                              : 'font-semibold text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                      )}
                    >
                      {phase.title}
                    </span>
                    <span
                      className={cn(
                        'text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-md font-bold mt-0.5 whitespace-nowrap transition-all',
                        rd.isDone
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800'
                          : rd.hasWarning
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800'
                            : isActive
                              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      )}
                    >
                      {rd.badgeLabel}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-3 w-full max-w-full min-w-0">
      {/* ── Satukan Flight Deck + Toolbar ke dalam 1 Ruang Utuh pada Fase 1 & 2 ── */}
      {activeTab === 'fase_1_soal' && (
        <CbtBankSoalReadinessPanel
          topFlightDeck={flightDeckNode}
          bankList={rawBankList}
          activeTpId={effectiveTpId}
          activeSemId={effectiveSemId}
          targetTingkat={effectiveTargetTingkat}
          eventName={effectiveEventName}
          activeEvent={activeEvent}
          onProceedToNextPhase={() => setActiveTab('fase_2_ruang')}
          onRefreshBankList={() => refetchBankSoal()}
        />
      )}

      {activeTab === 'fase_2_ruang' && (
        <CbtKelasRoomTreePanel
          topFlightDeck={flightDeckNode}
          kelasList={scopedKelasList}
          roomMappings={roomMappings}
          onUpdateRoomMappings={setRoomMappings}
          tenantId={tenantId}
          eventId={activeEvent?.id}
          eventName={effectiveEventName}
          activeTpName={effectiveTpName}
          semester={effectiveSemesterName}
          activeEvent={activeEvent}
          targetTingkat={effectiveTargetTingkat}
          onProceedToNextPhase={() => setActiveTab('fase_3_jadwal')}
        />
      )}

      {activeTab === 'fase_3_jadwal' && (
        <CbtTimetableMatrixPanel
          topFlightDeck={flightDeckNode}
          bankList={rawBankList}
          rawGuruMapel={rawGuruMapel}
          roomMappings={roomMappings}
          activeTpId={effectiveTpId}
          activeSemId={effectiveSemId}
          defaultTodayStr={defaultTodayStr}
          existingSchedules={effectiveJadwalList}
          activeEvent={activeEvent}
          eventName={effectiveEventName}
          targetTingkat={effectiveTargetTingkat}
          onSuccessGenerate={() => {
            refetchBankSoal();
            refetchJadwal();
            setActiveTab('fase_4_pengawas');
          }}
          onProceedToNextPhase={() => setActiveTab('fase_4_pengawas')}
        />
      )}

      {activeTab === 'fase_4_pengawas' && (
        <CbtPengawasMatrixPanel
          topFlightDeck={flightDeckNode}
          jadwalList={jadwalList}
          guruList={guruList}
          isLoadingJadwal={isLoadingJadwal}
          eventName={effectiveEventName}
          targetTingkat={effectiveTargetTingkat}
          activeEvent={activeEvent}
          refetchJadwal={refetchJadwal}
          onProceedToNextPhase={() => setActiveTab('fase_5_monitor')}
        />
      )}

      {activeTab === 'fase_5_monitor' && (
        <CbtPanitiaLiveCommandPanel
          topFlightDeck={flightDeckNode}
          jadwalList={jadwalList}
          isLoadingJadwal={isLoadingJadwal}
          refetchJadwal={refetchJadwal}
          guruList={guruList}
          kelasList={scopedKelasList}
          activeEvent={activeEvent}
          targetTingkat={effectiveTargetTingkat}
          onBackToPengawas={() => setActiveTab('fase_4_pengawas')}
        />
      )}

      {/* ── Modal Pengaturan Event Ujian CBT ── */}
      <Modal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        size="6xl"
        title={
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800 shrink-0">
              <TableProperties size={16} />
            </span>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Pengaturan Event Ujian CBT
            </h3>
          </div>
        }
      >
        <div className="p-4 sm:p-5 max-h-[82vh] overflow-y-auto">
          <Suspense
            fallback={
              <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                <Loader className="w-5 h-5 animate-spin text-indigo-600" />
                <span>Memuat Tabel Pengaturan Event...</span>
              </div>
            }
          >
            <CbtEventSettingsTable
              isInsideModal
              onSelectEventForOrchestrator={() => {
                setIsSettingsModalOpen(false);
              }}
            />
          </Suspense>
        </div>
      </Modal>
      <CbtRolloverModal
        isOpen={rolloverModalMode !== null}
        onClose={() => setRolloverModalMode(null)}
        mode={rolloverModalMode || 'bank-soal'}
        targetEvent={activeEvent}
        targetTpId={effectiveTpId}
        targetSemId={effectiveSemId}
        onSuccess={() => {
          refetchBankSoal();
          refetchJadwal();
        }}
      />
    </div>
  );
};

export default CbtPanitiaOrchestratorView;
