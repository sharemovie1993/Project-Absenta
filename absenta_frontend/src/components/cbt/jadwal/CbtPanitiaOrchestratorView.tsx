import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  useKelasOptions,
  useTahunPelajaranOptions,
  useSemesterOptions,
  useGuruOptions,
} from '@/components/common';
import {
  DoorOpen,
  Calendar,
  Users,
  Layers,
  Sparkles,
} from 'lucide-react';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import type { CbtJadwalUjian, CbtBankSoal } from '@/types/cbt.types';
import { getVirtualDate } from '@/utils/attendance/time';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import {
  KelasRoomMapping,
  generateClassRoomMappings,
  loadPersistedRoomMappings,
} from './cbtOrchestratorHelper';
import { CbtKelasRoomTreePanel } from './CbtKelasRoomTreePanel';
import { CbtTimetableMatrixPanel } from './CbtTimetableMatrixPanel';
import { CbtPengawasMatrixPanel } from './CbtPengawasMatrixPanel';

export const CbtPanitiaOrchestratorView: React.FC = () => {
  const { user } = useAuthStore();
  const tenantId = user?.tenant_id;

  const [activeTab, setActiveTab] = useState<'room_plotting' | 'mapel_timetable' | 'pengawas_matrix'>('room_plotting');

  const { rawList: guruList = [] } = useGuruOptions({ jenisPtk: 'ALL' });
  const { rawList: kelasList = [] } = useKelasOptions();
  const { activeYear: activeTp } = useTahunPelajaranOptions();
  const { activeSemester } = useSemesterOptions();

  // ── 1. State Ploting Ruang ke Kelas (Kelas-Centrik R.01 - R.n) ──
  const [roomMappings, setRoomMappings] = useState<KelasRoomMapping[]>([]);

  useEffect(() => {
    if (!kelasList.length) return;
    const persisted = loadPersistedRoomMappings(tenantId);
    if (persisted) {
      const generated = generateClassRoomMappings(kelasList);
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
      setRoomMappings(generateClassRoomMappings(kelasList));
    }
  }, [kelasList, tenantId]);

  // ── 2. Fetch Bank Soal Siap Ujian ──
  const { data: bankRes } = useQuery({
    queryKey: cbtQueryKeys.bankSoal({ limit: 100 }),
    queryFn: () => cbtApi.getBankSoalList({ limit: 100 }),
  });

  const bankList: CbtBankSoal[] = useMemo(() => {
    return (bankRes?.items || []).filter((b) => (b.jumlah_soal || b._count?.Soal || 0) > 0);
  }, [bankRes]);

  // ── 3. Fetch Jadwal Ujian Aktif ──
  const { data: jadwalRes, isLoading: isLoadingJadwal } = useQuery({
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

  return (
    <div className="space-y-4 w-full max-w-full min-w-0">
      {/* Header Mode Navigation */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Layers size={17} className="text-violet-600" />
            <span>Meja Kerja Orkestrasi Asesmen &amp; Ujian Massal Serentak</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Kelola ploting ruang ujian kelas-centrik (R.01 s/d R.n), susun matriks mapel ke hari/sesi, dan tugaskan pengawas anti-bentrok.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('room_plotting')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
              activeTab === 'room_plotting'
                ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            )}
          >
            <DoorOpen size={14} />
            <span>1. Ploting Ruang ke Kelas ({kelasList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mapel_timetable')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
              activeTab === 'mapel_timetable'
                ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            )}
          >
            <Calendar size={14} />
            <span>2. Ploting Mapel ke Hari &amp; Sesi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pengawas_matrix')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
              activeTab === 'pengawas_matrix'
                ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            )}
          >
            <Users size={14} />
            <span>3. Ploting Pengawas &amp; Ruang ({jadwalList.length})</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'room_plotting' && (
        <CbtKelasRoomTreePanel
          kelasList={kelasList}
          roomMappings={roomMappings}
          onUpdateRoomMappings={setRoomMappings}
          tenantId={tenantId}
        />
      )}

      {activeTab === 'mapel_timetable' && (
        <CbtTimetableMatrixPanel
          bankList={bankList}
          roomMappings={roomMappings}
          activeTpId={activeTp?.id}
          activeSemId={activeSemester?.id}
          defaultTodayStr={defaultTodayStr}
          onSuccessGenerate={() => setActiveTab('pengawas_matrix')}
        />
      )}

      {activeTab === 'pengawas_matrix' && (
        <CbtPengawasMatrixPanel
          jadwalList={jadwalList}
          guruList={guruList}
          isLoadingJadwal={isLoadingJadwal}
        />
      )}
    </div>
  );
};

export default CbtPanitiaOrchestratorView;
