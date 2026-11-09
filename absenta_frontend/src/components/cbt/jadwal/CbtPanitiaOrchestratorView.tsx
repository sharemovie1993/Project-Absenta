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
import {
  KelasRoomMapping,
  generateClassRoomMappings,
  loadPersistedRoomMappings,
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

  const defaultTodayStr = useMemo(() => {
    const now = getVirtualDate();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // ── Metrik Kesiapan Ujian (Exam Readiness Metrics) ──
  const stats = useMemo(() => {
    const totalBank = rawBankList.length;
    const bankSiap = readyBankList.length;
    const totalKelas = scopedKelasList.length;
    const ruangMapped = roomMappings.length;
    const totalJadwal = jadwalList.length;
    const pengawasAssigned = jadwalList.filter(
      (j) => !!(j.setting_keamanan?.pengawas_1_id || j.pengawas_guru_id)
    ).length;

    const isSoalReady = totalBank > 0 && bankSiap === totalBank;
    const isRuangReady = totalKelas > 0 && ruangMapped >= totalKelas;
    const isJadwalReady = totalJadwal > 0;
    const isPengawasReady = totalJadwal > 0 && pengawasAssigned === totalJadwal;

    return {
      totalBank,
      bankSiap,
      totalKelas,
      ruangMapped,
      totalJadwal,
      pengawasAssigned,
      isSoalReady,
      isRuangReady,
      isJadwalReady,
      isPengawasReady,
    };
  }, [rawBankList, readyBankList, scopedKelasList, roomMappings, jadwalList]);

  // Definisi 5 Fase Operasional Panitia (Label Ringkas 1 Kata Sesuai Konsep Garis Stepper)
  const phases: Array<{
    id: CbtPanitiaPhase;
    title: string;
    isDone: boolean;
    icon: React.ElementType;
  }> = [
    {
      id: 'fase_1_soal',
      title: 'Soal',
      isDone: stats.isSoalReady,
      icon: BookOpen,
    },
    {
      id: 'fase_2_ruang',
      title: 'Ruang',
      isDone: stats.isRuangReady,
      icon: DoorOpen,
    },
    {
      id: 'fase_3_jadwal',
      title: 'Jadwal',
      isDone: stats.isJadwalReady,
      icon: Calendar,
    },
    {
      id: 'fase_4_pengawas',
      title: 'Pengawas',
      isDone: stats.isPengawasReady,
      icon: Users,
    },
    {
      id: 'fase_5_monitor',
      title: 'Monitoring',
      isDone: false,
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

              return (
                <button
                  key={phase.id}
                  type="button"
                  onClick={() => setActiveTab(phase.id)}
                  className="group flex flex-col items-center focus:outline-hidden cursor-pointer"
                  title={`Fase ${idx + 1}: ${phase.title}`}
                >
                  {/* Circle Node */}
                  <div
                    className={cn(
                      'w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 shadow-2xs',
                      isActive
                        ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-950/80 scale-105'
                        : isPassed
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 group-hover:bg-slate-300 dark:group-hover:bg-slate-600'
                    )}
                  >
                    <Icon size={16} className="transition-transform group-hover:scale-110" />
                  </div>

                  {/* Label Below Node */}
                  <span
                    className={cn(
                      'mt-1.5 text-[11px] sm:text-xs transition-colors whitespace-nowrap text-center leading-tight',
                      isActive
                        ? 'font-bold text-indigo-600 dark:text-indigo-400'
                        : isPassed
                          ? 'font-bold text-slate-700 dark:text-slate-300'
                          : 'font-semibold text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                    )}
                  >
                    {phase.title}
                  </span>
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

      {activeTab !== 'fase_1_soal' && activeTab !== 'fase_2_ruang' && activeTab !== 'fase_3_jadwal' && (
        <>
          <div className="rounded-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs border border-slate-200/90 dark:border-slate-800 overflow-hidden">
            {flightDeckNode}
          </div>

          <div className="transition-opacity duration-200">
            {activeTab === 'fase_4_pengawas' && (
              <CbtPengawasMatrixPanel
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
                jadwalList={jadwalList}
                isLoadingJadwal={isLoadingJadwal}
                refetchJadwal={refetchJadwal}
                guruList={guruList}
                activeEvent={activeEvent}
                onBackToPengawas={() => setActiveTab('fase_4_pengawas')}
              />
            )}
          </div>
        </>
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
