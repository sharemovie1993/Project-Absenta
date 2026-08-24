import React, { useEffect, useState, Suspense, lazy, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PendingSiswaModule } from './PendingSiswaModule';
import { SessionManagerModule } from './SessionManagerModule';
import { useGerbangAttendanceData } from '../../../../hooks/attendance/useGerbangAttendanceData';
import { dropdownApi, type DropdownOption } from '../../../../api/dropdown.api';
import { useTenant } from '../../../../hooks/useTenant';
import { useAuthStore } from '../../../../store/authStore';
import { useCapabilities } from '../../../../hooks/useCapabilities';
import { useSocket } from '../../../../hooks/useSocket';
import { toLocalDate } from '../../../../utils/attendance/time';
import { 
  Loader, 
  Activity,
  ClipboardCheck, 
  MapPin,
  UserCheck
} from 'lucide-react';
import { useKelasOptions } from '../../../../hooks/useKelasOptions';
import { TabSwitcher, type TabOption } from '../../../../components/ui/TabSwitcher';

import { useSearchParams } from 'react-router-dom';

// Lazy load GateInputModule
const GateInputModule = lazy(() => import('./GateInputModule').then(module => ({ default: module.GateInputModule })));

interface UserRole {
  name: string;
}

interface UserCapabilities {
  role?: UserRole;
  capabilities?: string[];
  position_codes?: string[];
  full_name?: string;
  name?: string;
  guru_profile?: {
    wali_kelas_di?: { id?: string } | string;
    kelas_id?: string;
  };
  siswa_profile?: {
    kelas_id?: string;
  };
  kelas_id?: string;
  Siswa?: {
    kelas_id?: string;
  };
  siswa?: {
    kelas_id?: string;
  };
}

interface ModeMultiSesiViewProps {
  user: UserCapabilities | null;
  absensiMode: 'SIMPLE' | 'MULTI_SESI' | null;
  isPetugasSiswa: boolean;
  isPetugasGuru: boolean;
  kelasLabel?: string;
  roleLabel?: string;
  petugasLabel?: string;
  petugasVariant?: 'success' | 'destructive' | 'outline';
  managedKelasIds?: string[];
}

type TabType = 'gerbang' | 'manual' | 'sesi';

export default React.memo(function ModeMultiSesiView({ 
  user, 
  isPetugasSiswa, 
  isPetugasGuru,
  kelasLabel,
  managedKelasIds,
}: ModeMultiSesiViewProps) {
  const { tenantId } = useTenant();
  const token = useAuthStore((state) => state.token);
  const { isConnected, subscribe, unsubscribe, emit } = useSocket();
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');
  const { options: fetchedKelasOptions } = useKelasOptions();
  const kelasOptions = useMemo(() => fetchedKelasOptions || [], [fetchedKelasOptions]);
  const [searchParams] = useSearchParams();

  const initialTab = useMemo<TabType>(() => {
    const t = searchParams.get('tab')?.toLowerCase();
    if (t === 'manual') return 'manual';
    if (t === 'sesi') return 'sesi';
    if (t === 'gerbang') return 'gerbang';
    return 'gerbang';
  }, [searchParams]);

  useEffect(() => {
    if (selectedKelasId) return;

    // 1. Petugas Kelas auto-filter ke managedKelasIds
    if (managedKelasIds && managedKelasIds.length > 0) {
      setSelectedKelasId(managedKelasIds[0]);
      return;
    }

    // 2. Wali Kelas auto-filter ke kelas bimbingan
    const waliKelasObj = user?.guru_profile?.wali_kelas_di;
    const waliKelasId = typeof waliKelasObj === 'object' ? waliKelasObj?.id : (waliKelasObj || user?.guru_profile?.kelas_id);
    if (waliKelasId) {
      if (kelasOptions.length > 0) {
        const match = kelasOptions.find(o => String(o.value) === String(waliKelasId) || String(o.label).toLowerCase() === String(waliKelasId).toLowerCase());
        if (match) {
          setSelectedKelasId(String(match.value));
          return;
        }
      }
      setSelectedKelasId(String(waliKelasId));
      return;
    }

    // 3. Siswa auto-filter ke kelas_id miliknya
    const siswaKelasId = user?.siswa_profile?.kelas_id || user?.kelas_id || user?.Siswa?.kelas_id || user?.siswa?.kelas_id;
    if (siswaKelasId) {
      if (kelasOptions.length > 0) {
        const match = kelasOptions.find(o => String(o.value) === String(siswaKelasId));
        if (match) {
          setSelectedKelasId(String(match.value));
          return;
        }
      }
      setSelectedKelasId(String(siswaKelasId));
      return;
    }
  }, [managedKelasIds, selectedKelasId, user, kelasOptions]);

  const urlTabParam = useMemo(() => {
    const t = searchParams.get('tab')?.toLowerCase();
    if (t === 'manual' || t === 'sesi' || t === 'gerbang') return t as TabType;
    return null;
  }, [searchParams]);

  const [activeTab, setActiveTab] = useState<TabType>(urlTabParam || initialTab);

  const [lastScannedName, setLastScannedName] = useState<string | null>(null);

  const today = toLocalDate();
  const { isAdmin, isGateOfficer, isHomeroomTeacher, isOperator, can } = useCapabilities();
  const isGerbangPos = isGateOfficer || can('attendance.gate.tap.entry');
  const isWaliKelasPos = isHomeroomTeacher || !!user?.guru_profile?.wali_kelas_di;

  // 1. Scanner Gerbang (Admin, Operator, Satpam/Petugas Gerbang, Guru Piket, atau saat diarahkan via ?tab=gerbang)
  const hasGateDutyOrPerm = 
    isAdmin ||
    isGerbangPos ||
    isOperator ||
    can('attendance.gate.tap.entry') ||
    can('attendance.gate.scan') ||
    urlTabParam === 'gerbang';

  const canAccessInput = !isPetugasSiswa && hasGateDutyOrPerm;
  
  // 2. Cek Manual (Wali Kelas, Petugas Kelas, Guru, Admin)
  const canAccessManual = isAdmin || isPetugasSiswa || isWaliKelasPos || isPetugasGuru || can('attendance.sessions.update.attendance');

  // 3. Manajemen Sesi (Admin, Petugas Kelas, Guru Mapel)
  const canAccessSesi = isAdmin || isPetugasSiswa || isPetugasGuru || can('attendance.sessions.view.list');
  const canCreateSession = isAdmin || isPetugasSiswa || can('attendance.sessions.create');
  
  const canAccessAny = canAccessInput || canAccessManual || canAccessSesi;

  const {
    notPresent,
    notPresentLoading,
    fetchNotPresent,
    miniStats,
    refreshStats,
  } = useGerbangAttendanceData({
    tenantId,
    selectedKelasId,
    tanggal: today,
    enabled: canAccessAny
  });

  useEffect(() => {
    if (!isConnected || !tenantId) return;

    emit('join_tenant', tenantId);

    const handleUpdate = () => {
      refreshStats();
      fetchNotPresent();
    };

    subscribe('attendance_feed_update', handleUpdate);
    subscribe('tenant_attendance_update', handleUpdate);
    subscribe('gerbang_tap_update', handleUpdate);
    subscribe('attendance_update', handleUpdate);

    return () => {
      unsubscribe('attendance_feed_update', handleUpdate);
      unsubscribe('tenant_attendance_update', handleUpdate);
      unsubscribe('gerbang_tap_update', handleUpdate);
      unsubscribe('attendance_update', handleUpdate);
    };
  }, [isConnected, tenantId, subscribe, unsubscribe, emit, refreshStats, fetchNotPresent]);

  useEffect(() => {
    if (urlTabParam) {
      if (urlTabParam === 'gerbang') {
        setActiveTab('gerbang');
      } else if (urlTabParam === 'manual') {
        setActiveTab('sesi');
      } else {
        setActiveTab(urlTabParam);
      }
    } else if (isPetugasSiswa) {
      setActiveTab('sesi');
    } else if (isWaliKelasPos && !canAccessInput) {
      setActiveTab('sesi');
    } else if (!canAccessInput && activeTab === 'gerbang') {
      if (canAccessSesi) setActiveTab('sesi');
    }
  }, [urlTabParam, isWaliKelasPos, isPetugasSiswa, canAccessInput, canAccessSesi]);

  const tabOptions = useMemo((): TabOption[] => {
    // 🔵 1. Jika secara eksplisit dipanggil dari menu "Absensi Kelas" Guru (?tab=sesi) atau redirect dari ?tab=manual
    if (urlTabParam === 'sesi' || urlTabParam === 'manual') {
      const opts: TabOption[] = [];
      opts.push({ id: 'sesi', label: 'Manajemen Sesi', icon: Activity });
      if (canAccessInput) {
        opts.push({ id: 'gerbang', label: 'Scanner Gerbang', icon: MapPin });
      }
      return opts;
    }

    // 🟡 2. Jika dipanggil dari Petugas Kelas Siswa
    if (isPetugasSiswa) {
      return [
        { id: 'sesi', label: 'Manajemen Sesi', icon: Activity },
      ];
    }

    // 🟢 3. Peran Umum / Fallback (Gerbang, Satpam, Admin, Operator, Guru)
    const opts: TabOption[] = [];
    if (canAccessInput || urlTabParam === 'gerbang') {
      opts.push({ id: 'gerbang', label: 'Scanner Gerbang', icon: MapPin });
    }
    if (canAccessSesi) {
      opts.push({ id: 'sesi', label: 'Manajemen Sesi', icon: Activity });
    }
    return opts;
  }, [urlTabParam, isPetugasSiswa, canAccessInput, canAccessSesi]);

  const handleTabChange = useCallback((id: string) => {
    setActiveTab(id as TabType);
  }, []);

  const handleRefreshData = useCallback(async () => {
    await refreshStats();
    await fetchNotPresent();
  }, [refreshStats, fetchNotPresent]);

  const handleTapSuccess = useCallback((data: { name: string }) => {
    setLastScannedName(data.name);
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto px-2 sm:px-4 pb-20 overflow-visible">
      {/* Header Tab Switcher (Hanya tampil jika ada lebih dari 1 opsi tab) */}
      {tabOptions.length > 1 && (
        <div className="flex items-center justify-between sm:justify-end gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 sm:hidden">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isConnected ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/50'}`}>
              {isConnected ? 'Online' : 'Terputus'}
            </span>
          </div>
          <TabSwitcher
            options={tabOptions}
            activeTab={activeTab}
            onChange={handleTabChange}
          />
        </div>
      )}

      {/* Content Area */}
      <main className="max-w-6xl mx-auto px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'gerbang' && (
              <section className="space-y-8">
                <Suspense fallback={
                  <div className="flex flex-col items-center justify-center py-40">
                    <Loader className="animate-spin text-indigo-600 mb-4" size={40} />
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Inisialisasi Hardware Scanner...</p>
                  </div>
                }>
                  <GateInputModule 
                    miniStats={miniStats}
                    refreshStats={handleRefreshData}
                    onTapSuccessMetadata={handleTapSuccess}
                  />
                </Suspense>
              </section>
            )}

            {activeTab === 'manual' && (
              <section className="space-y-8">
                <PendingSiswaModule 
                  notPresent={notPresent}
                  notPresentLoading={notPresentLoading}
                  miniStats={miniStats}
                  selectedKelasId={selectedKelasId}
                  setSelectedKelasId={setSelectedKelasId}
                  kelasOptions={kelasOptions}
                  isPetugasSiswa={isPetugasSiswa}
                  userRole={user?.role?.name}
                  socketConnected={isConnected}
                  refreshData={handleRefreshData}
                />
              </section>
            )}

            {activeTab === 'sesi' && (
              <section className="space-y-8">
                <SessionManagerModule 
                  selectedKelasId={selectedKelasId}
                  setSelectedKelasId={setSelectedKelasId}
                  kelasOptions={kelasOptions}
                  isPetugasSiswa={isPetugasSiswa}
                  userRole={user?.role?.name}
                  canCreateSession={canCreateSession}
                  managedKelasIds={managedKelasIds}
                  user={user}
                />
              </section>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
});
