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
  UserCheck,
} from 'lucide-react';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
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

const CbtBankSoalView = lazy(() =>
  import('@/components/cbt/bank-soal/CbtBankSoalView').then((m) => ({ default: m.CbtBankSoalView }))
);
const CbtJadwalView = lazy(() =>
  import('./CbtJadwalView').then((m) => ({ default: m.CbtJadwalView }))
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
  const { mode, eventName, isOrkestrasi, isMandiri, targetTingkat: localTargetTingkat, updateMode } = useCbtOperationMode();

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
  const [subModeFase1, setSubModeFase1] = useState<'readiness' | 'manage'>('readiness');
  const [subModeFase3, setSubModeFase3] = useState<'matrix' | 'table'>('matrix');

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

  // Definisi 5 Fase Operasional Panitia
  const phases: Array<{
    id: CbtPanitiaPhase;
    title: string;
    stat: string;
    isDone: boolean;
    icon: React.ElementType;
  }> = [
    {
      id: 'fase_1_soal',
      title: '1. Kesiapan Soal',
      stat: `${stats.bankSiap} Bank Siap`,
      isDone: stats.isSoalReady,
      icon: BookOpen,
    },
    {
      id: 'fase_2_ruang',
      title: '2. Ruang Ujian',
      stat: `${stats.ruangMapped} Rombel`,
      isDone: stats.isRuangReady,
      icon: DoorOpen,
    },
    {
      id: 'fase_3_jadwal',
      title: '3. Hari & Sesi',
      stat: `${stats.totalJadwal} Sesi`,
      isDone: stats.isJadwalReady,
      icon: Calendar,
    },
    {
      id: 'fase_4_pengawas',
      title: '4. Pengawas',
      stat: `${stats.pengawasAssigned} Terplot`,
      isDone: stats.isPengawasReady,
      icon: Users,
    },
    {
      id: 'fase_5_monitor',
      title: '5. Monitoring',
      stat: 'Hari H CBT',
      isDone: false,
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-4 w-full max-w-full min-w-0">
      {/* ── Header Meja Kerja Panitia CBT (Streamlined Single-Bar Flight Deck) ── */}
      <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs border border-slate-200/90 dark:border-slate-800 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Left: Event Scope Badge (Integrated) */}
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-600/30 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-500/30 shrink-0">
              <Layers size={16} />
            </span>
            <h2 className="text-sm font-black tracking-tight text-slate-900 dark:text-white shrink-0">
              Meja Kerja Panitia
            </h2>
            {isOrkestrasi && effectiveEventName && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-700/60 text-indigo-700 dark:text-indigo-200 text-xs font-bold">
                <Lock size={11} className="text-indigo-500 shrink-0" />
                <span className="truncate max-w-[200px] sm:max-w-xs">{effectiveEventName}</span>
                <span className="px-1.5 py-0.2 rounded-md bg-indigo-200/80 dark:bg-indigo-800 text-[10px] font-black text-indigo-900 dark:text-indigo-100">
                  Tingkat {effectiveTargetTingkat.join(', ')} • {scopedKelasList.length} Rombel
                </span>
              </span>
            )}
          </div>

          {/* Right: Mode Switcher & Quick Settings */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto text-xs">
            <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80">
              <button
                type="button"
                onClick={() => updateMode('ORKESTRASI')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                  isOrkestrasi
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                )}
                title="Mode Ujian Massal Panitia Terpusat"
              >
                <Sparkles size={11} />
                <span>Ujian Massal</span>
              </button>
              <button
                type="button"
                onClick={() => updateMode('MANDIRI')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                  isMandiri
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                )}
                title="Mode KBM Mandiri Guru"
              >
                <UserCheck size={11} />
                <span>KBM Mandiri</span>
              </button>
            </div>

            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                title="Buka Hirarki & Pengaturan Event CBT"
              >
                <SlidersHorizontal size={13} className="text-indigo-600 dark:text-indigo-400" />
                <span className="hidden sm:inline">Pengaturan</span>
              </button>
            )}

            <span className="hidden md:inline-block text-[11px] font-semibold text-slate-500 dark:text-slate-400 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800">
              {activeTp?.nama || 'TP Aktif'}
            </span>
          </div>
        </div>

        {/* ── Stepper 5 Fase (Compact Streamlined Ribbon) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          {phases.map((phase) => {
            const Icon = phase.icon;
            const isActive = activeTab === phase.id;

            return (
              <button
                key={phase.id}
                type="button"
                onClick={() => setActiveTab(phase.id)}
                className={cn(
                  'px-2.5 py-1.5 rounded-xl text-left transition-all duration-150 cursor-pointer flex items-center justify-between gap-1.5 border',
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs dark:bg-white dark:text-slate-900 dark:border-white'
                    : 'bg-slate-50/70 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/60'
                )}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={cn(
                      'w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-xs',
                      isActive
                        ? 'bg-white/20 text-white dark:bg-indigo-600 dark:text-white'
                        : 'bg-slate-200/80 dark:bg-white/10 text-slate-600 dark:text-indigo-300'
                    )}
                  >
                    <Icon size={12} />
                  </span>
                  <p
                    className={cn(
                      'text-xs font-bold truncate leading-tight',
                      isActive ? 'text-white dark:text-slate-900' : 'text-slate-900 dark:text-white'
                    )}
                  >
                    {phase.title}
                  </p>
                </div>
                <span
                  className={cn(
                    'text-[10px] font-bold px-1.5 py-0.2 rounded-md shrink-0',
                    isActive
                      ? 'bg-white/25 text-white dark:bg-indigo-100 dark:text-indigo-900'
                      : 'bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  )}
                >
                  {phase.stat}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Render Panel Fase Aktif ── */}
      <div className="transition-opacity duration-200">
        {activeTab === 'fase_1_soal' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-indigo-600" />
                <span>Audit &amp; Kesiapan Bank Soal</span>
              </span>
              <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shrink-0">
                <button
                  type="button"
                  onClick={() => setSubModeFase1('readiness')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                    subModeFase1 === 'readiness'
                      ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  )}
                >
                  <CheckCircle2 size={12} />
                  <span>Audit Kesiapan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSubModeFase1('manage')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                    subModeFase1 === 'manage'
                      ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  )}
                >
                  <BookOpen size={12} />
                  <span>Kelola Butir Soal</span>
                </button>
              </div>
            </div>

            {subModeFase1 === 'readiness' ? (
              <CbtBankSoalReadinessPanel
                bankList={rawBankList}
                activeTpId={activeTp?.id}
                activeSemId={activeSemester?.id}
                targetTingkat={effectiveTargetTingkat}
                eventName={effectiveEventName}
                onProceedToNextPhase={() => setActiveTab('fase_2_ruang')}
                onRefreshBankList={() => refetchBankSoal()}
              />
            ) : (
              <Suspense
                fallback={
                  <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
                    <Loader className="animate-spin mx-auto text-violet-600 mb-2" size={24} />
                    <p className="text-xs text-slate-500">Memuat Modul Kelola Bank Soal...</p>
                  </div>
                }
              >
                <CbtBankSoalView hideLayout={true} roleContext="KURIKULUM" />
              </Suspense>
            )}
          </div>
        )}

        {activeTab === 'fase_2_ruang' && (
          <CbtKelasRoomTreePanel
            kelasList={scopedKelasList}
            roomMappings={roomMappings}
            onUpdateRoomMappings={setRoomMappings}
            tenantId={tenantId}
            eventName={effectiveEventName}
            activeTpName={activeTp?.nama}
            semester={activeSemester?.nama}
            onProceedToNextPhase={() => setActiveTab('fase_3_jadwal')}
          />
        )}

        {activeTab === 'fase_3_jadwal' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2 px-1 flex-wrap">
              <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-indigo-600" />
                <span>Rangkaian Hari &amp; Sesi Ujian</span>
              </span>
              <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shrink-0">
                <button
                  type="button"
                  onClick={() => setSubModeFase3('matrix')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                    subModeFase3 === 'matrix'
                      ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  )}
                >
                  <Sparkles size={12} />
                  <span>Matriks Generator</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSubModeFase3('table')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                    subModeFase3 === 'table'
                      ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  )}
                >
                  <TableProperties size={12} />
                  <span>Daftar Sesi Terbit</span>
                </button>
              </div>
            </div>

            {subModeFase3 === 'matrix' ? (
              <CbtTimetableMatrixPanel
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
              />
            ) : (
              <Suspense
                fallback={
                  <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
                    <Loader className="animate-spin mx-auto text-violet-600 mb-2" size={24} />
                    <p className="text-xs text-slate-500">Memuat Daftar Jadwal Sesi...</p>
                  </div>
                }
              >
                <CbtJadwalView
                  hideLayout={true}
                  onNavigateMonitor={() => setActiveTab('fase_5_monitor')}
                />
              </Suspense>
            )}
          </div>
        )}

        {activeTab === 'fase_4_pengawas' && (
          <CbtPengawasMatrixPanel
            jadwalList={jadwalList}
            guruList={guruList}
            isLoadingJadwal={isLoadingJadwal}
            eventName={effectiveEventName}
            targetTingkat={effectiveTargetTingkat}
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
    </div>
  );
};

export default CbtPanitiaOrchestratorView;
