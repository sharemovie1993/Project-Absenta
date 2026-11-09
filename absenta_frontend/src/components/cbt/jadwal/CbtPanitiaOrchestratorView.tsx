import React, { useState, useMemo, useEffect, Suspense, lazy } from 'react';
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
} from 'lucide-react';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
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
  filterEffectiveJadwalList,
  evaluateStep1Soal,
  evaluateStep2Ruang,
  evaluateStep3Jadwal,
  evaluateStep4Pengawas,
  evaluateStep5Monitoring,
  PhaseReadinessResult,
  CbtPanitiaPhase,
} from './cbtOrchestratorHelper';
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
  });
  const activeEvent = eventsData?.active_event;

  const effectiveEventName = activeEvent?.nama_event || eventName;
  const effectiveTargetTingkat = useMemo(() => {
    if (activeEvent?.target_tingkat && activeEvent.target_tingkat.length > 0) {
      return activeEvent.target_tingkat;
    }
    return localTargetTingkat || [10, 11, 12];
  }, [activeEvent, localTargetTingkat]);

  const [activeTab, setActiveTab] = useState<CbtPanitiaPhase>('fase_1_soal');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const { rawList: guruList = [] } = useGuruOptions({ jenisPtk: 'ALL' });
  const { rawList: kelasList = [] } = useKelasOptions();
  const { activeYear: activeTp } = useTahunPelajaranOptions();
  const { activeSemester } = useSemesterOptions();

  // Filter kelas aktif sesuai sasaran tingkat event ujian yang sedang aktif
  const scopedKelasList = useMemo(() => {
    const active = kelasList.filter((k) => k.is_active !== false && String(k.status || '').toUpperCase() !== 'NONAKTIF');
    if (!effectiveTargetTingkat || effectiveTargetTingkat.length === 0) return active;
    return active.filter((k) => effectiveTargetTingkat.includes(Number(k.tingkat)));
  }, [kelasList, effectiveTargetTingkat]);

  // ── 1. State Ploting Ruang ke Kelas (Kelas-Centrik R.01 - R.n) ──
  const [roomMappings, setRoomMappings] = useState<KelasRoomMapping[]>([]);

  useEffect(() => {
    if (!scopedKelasList.length) {
      setRoomMappings([]);
      return;
    }
    const persisted = loadPersistedRoomMappings(tenantId);
    if (persisted) {
      const generated = generateClassRoomMappings(scopedKelasList);
      const merged = generated.map((item) => {
        const saved = persisted[item.kelas_id];
        if (saved) {
          return {
            ...item,
            slot_ruang: saved.slot_ruang || item.slot_ruang,
            nama_ruang: saved.nama_ruang || item.nama_ruang,
          };
        }
        return item;
      });
      setRoomMappings(merged);
    } else {
      setRoomMappings(generateClassRoomMappings(scopedKelasList));
    }
  }, [scopedKelasList, tenantId]);

  // ── 2. Fetch Bank Soal (Kapasitas Penuh 500 & StaleTime Guard) ──
  const { data: bankRes, refetch: refetchBankSoal } = useQuery({
    queryKey: cbtQueryKeys.bankSoal({ limit: 500 }),
    queryFn: () => cbtApi.getBankSoalList({ limit: 500 }),
    staleTime: 60 * 1000,
  });

  const rawBankList: CbtBankSoal[] = bankRes?.items || [];
  const readyBankList: CbtBankSoal[] = useMemo(() => {
    return rawBankList.filter((b) => (b.jumlah_soal || b._count?.Soal || 0) > 0);
  }, [rawBankList]);

  // ── 3. Fetch Jadwal Ujian Aktif ──
  const { data: jadwalRes, isLoading: isLoadingJadwal, refetch: refetchJadwal } = useQuery({
    queryKey: cbtQueryKeys.jadwal({ limit: 150 }),
    queryFn: () => cbtApi.getJadwalList({ limit: 150 }),
  });

  const jadwalList: CbtJadwalUjian[] = jadwalRes?.items || [];

  // ── 4. Fetch SK Penugasan Guru Mapel untuk Audit Kesiapan Soal ──
  const { data: guruMapelRes } = useQuery({
    queryKey: ['guru-mapel-readiness', activeTp?.id],
    queryFn: () => listGuruMapel({ tahun_pelajaran_id: activeTp?.id }),
    enabled: !!activeTp?.id,
    staleTime: 60 * 1000,
  });
  const rawGuruMapel = guruMapelRes?.data || [];

  const defaultTodayStr = useMemo(() => {
    const now = getVirtualDate();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Jadwal yang strictly patuh pada active event & target tingkat
  const effectiveJadwalList = useMemo(() => {
    return filterEffectiveJadwalList(jadwalList, activeEvent?.id, effectiveTargetTingkat);
  }, [jadwalList, activeEvent?.id, effectiveTargetTingkat]);

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
          {effectiveEventName && (
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100/80 dark:bg-indigo-950/80 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-700/60 text-indigo-700 dark:text-indigo-200 text-xs font-bold cursor-pointer transition-colors shadow-2xs"
              title="Event CBT Aktif (Klik untuk Pengaturan)"
            >
              <Lock size={12} className="text-indigo-500 shrink-0" />
              <span className="truncate max-w-xs sm:max-w-md font-bold">{effectiveEventName}</span>
            </button>
          )}
        </div>

        {/* Right: Quick Settings */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto text-xs">
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
                        isActive
                          ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-950/80 scale-105'
                          : rd.isDone
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20'
                            : isPassed
                              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
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
                        isActive
                          ? 'text-indigo-600 dark:text-indigo-400 font-black'
                          : rd.isDone
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : isPassed
                              ? 'font-bold text-slate-700 dark:text-slate-300'
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
          activeTpId={activeTp?.id}
          activeSemId={activeSemester?.id}
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
          eventName={effectiveEventName}
          activeTpName={activeTp?.nama}
          semester={activeSemester?.nama}
          targetTingkat={effectiveTargetTingkat}
          onProceedToNextPhase={() => setActiveTab('fase_3_jadwal')}
        />
      )}

      {activeTab === 'fase_3_jadwal' && (
        <CbtTimetableMatrixPanel
          topFlightDeck={flightDeckNode}
          bankList={readyBankList}
          roomMappings={roomMappings}
          activeTpId={activeTp?.id}
          activeSemId={activeSemester?.id}
          defaultTodayStr={defaultTodayStr}
          existingSchedules={jadwalList}
          activeEvent={activeEvent}
          eventName={effectiveEventName}
          targetTingkat={effectiveTargetTingkat}
          onSuccessGenerate={() => {
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
    </div>
  );
};

export default CbtPanitiaOrchestratorView;
