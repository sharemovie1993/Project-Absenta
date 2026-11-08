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
import { CbtProctorMonitoringView } from '../sesi/CbtProctorMonitoringView';

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

export const CbtPanitiaOrchestratorView: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const tenantId = user?.tenant_id;
  const { mode, eventName, isOrkestrasi, isMandiri, updateMode } = useCbtOperationMode();

  const [activeTab, setActiveTab] = useState<CbtPanitiaPhase>('fase_1_soal');
  const [subModeFase1, setSubModeFase1] = useState<'readiness' | 'manage'>('readiness');
  const [subModeFase3, setSubModeFase3] = useState<'matrix' | 'table'>('matrix');

  const { rawList: guruList = [] } = useGuruOptions({ jenisPtk: 'ALL' });
  const { rawList: kelasList = [] } = useKelasOptions();
  const { activeYear: activeTp } = useTahunPelajaranOptions();
  const { activeSemester } = useSemesterOptions();

  // Filter kelas aktif saja
  const activeKelasList = useMemo(() => {
    return kelasList.filter((k) => k.is_active !== false && String(k.status || '').toUpperCase() !== 'NONAKTIF');
  }, [kelasList]);

  // ── 1. State Ploting Ruang ke Kelas (Kelas-Centrik R.01 - R.n) ──
  const [roomMappings, setRoomMappings] = useState<KelasRoomMapping[]>([]);

  useEffect(() => {
    if (!activeKelasList.length) return;
    const persisted = loadPersistedRoomMappings(tenantId);
    if (persisted) {
      const generated = generateClassRoomMappings(activeKelasList);
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
      setRoomMappings(generateClassRoomMappings(activeKelasList));
    }
  }, [activeKelasList, tenantId]);

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
    const totalKelas = activeKelasList.length;
    const ruangMapped = roomMappings.length;
    const totalJadwal = jadwalList.length;
    const pengawasAssigned = jadwalList.filter((j) => !!j.pengawas_guru_id).length;

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
  }, [rawBankList, readyBankList, activeKelasList, roomMappings, jadwalList]);

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
      {/* ── Header Meja Kerja Panitia CBT (Sleek & Focused) ── */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900 dark:bg-slate-950 text-white shadow-xs border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 shrink-0">
              <Layers size={17} />
            </span>
            <h2 className="text-sm sm:text-base font-bold tracking-tight text-white">
              Meja Kerja Panitia CBT
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto text-xs">
            {isOrkestrasi && eventName && (
              <span className="px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-700/60 text-indigo-200 text-xs font-semibold flex items-center gap-1.5">
                <Lock size={12} className="text-indigo-400" />
                <span>{eventName}</span>
              </span>
            )}
            <span className="bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 text-slate-300 text-xs font-semibold">
              {activeTp?.nama || 'TP Aktif'} • {activeSemester?.nama || 'Semester'}
            </span>
          </div>
        </div>

        {/* Mode Operasional Controller Strip */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Mode:
            </span>
            <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-800/90 border border-slate-700/80">
              <button
                type="button"
                onClick={() => updateMode('ORKESTRASI')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                  isOrkestrasi ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                )}
              >
                <Sparkles size={12} />
                <span>Ujian Massal</span>
              </button>
              <button
                type="button"
                onClick={() => updateMode('MANDIRI')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                  isMandiri ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                )}
              >
                <UserCheck size={12} />
                <span>KBM Mandiri</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Pipeline Stepper 5 Fase (Sleek & Noise-Free) ── */}
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-2.5 border-t border-slate-800/80">
          {phases.map((phase) => {
            const Icon = phase.icon;
            const isActive = activeTab === phase.id;

            return (
              <button
                key={phase.id}
                type="button"
                onClick={() => setActiveTab(phase.id)}
                className={cn(
                  'p-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer flex items-center justify-between gap-2 border',
                  isActive
                    ? 'bg-white text-slate-900 border-white shadow-sm'
                    : 'bg-white/5 hover:bg-white/10 text-white border-white/10 hover:border-white/20'
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs',
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white/10 text-indigo-300'
                    )}
                  >
                    <Icon size={14} />
                  </span>
                  <div className="min-w-0">
                    <p className={cn('text-xs font-bold truncate leading-tight', isActive ? 'text-slate-900' : 'text-white')}>
                      {phase.title}
                    </p>
                    <p className={cn('text-[10px] font-semibold truncate', isActive ? 'text-indigo-600' : 'text-slate-400')}>
                      {phase.stat}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Render Panel Fase Aktif ── */}
      <div className="transition-opacity duration-200">
        {activeTab === 'fase_1_soal' && (
          <div className="space-y-3">
            <div className="flex items-center justify-end px-1">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 shrink-0">
                <button
                  type="button"
                  onClick={() => setSubModeFase1('readiness')}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                    subModeFase1 === 'readiness'
                      ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  )}
                >
                  <CheckCircle2 size={13} />
                  <span>Kesiapan Soal</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSubModeFase1('manage')}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                    subModeFase1 === 'manage'
                      ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  )}
                >
                  <BookOpen size={13} />
                  <span>Kelola Butir Soal</span>
                </button>
              </div>
            </div>

            {subModeFase1 === 'readiness' ? (
              <CbtBankSoalReadinessPanel
                bankList={rawBankList}
                activeTpId={activeTp?.id}
                activeSemId={activeSemester?.id}
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
            kelasList={activeKelasList}
            roomMappings={roomMappings}
            onUpdateRoomMappings={setRoomMappings}
            tenantId={tenantId}
            eventName={eventName}
            onProceedToNextPhase={() => setActiveTab('fase_3_jadwal')}
          />
        )}

        {activeTab === 'fase_3_jadwal' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 px-1 flex-wrap">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <SlidersHorizontal size={13} className="text-violet-600" />
                <span>Pilih Tampilan Fase 3:</span>
              </span>
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setSubModeFase3('matrix')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                    subModeFase3 === 'matrix'
                      ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  )}
                >
                  <Sparkles size={13} />
                  <span>Matriks Hari &amp; Sesi (Generator Massal)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSubModeFase3('table')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                    subModeFase3 === 'table'
                      ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  )}
                >
                  <TableProperties size={13} />
                  <span>Daftar Sesi Ujian (Tabel &amp; Card)</span>
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
            onProceedToNextPhase={() => setActiveTab('fase_5_monitor')}
          />
        )}

        {activeTab === 'fase_5_monitor' && (
          <CbtProctorMonitoringView
            initialJadwalId={jadwalList[0]?.id}
            onBack={() => setActiveTab('fase_4_pengawas')}
          />
        )}
      </div>
    </div>
  );
};

export default CbtPanitiaOrchestratorView;
