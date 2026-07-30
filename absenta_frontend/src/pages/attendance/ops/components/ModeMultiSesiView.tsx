import React, { useEffect, useState, Suspense, lazy, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PendingSiswaModule } from './PendingSiswaModule';
import { SessionManagerModule } from './SessionManagerModule';
import { useGerbangAttendanceData } from '../../../../hooks/attendance/useGerbangAttendanceData';
import { dropdownApi, type DropdownOption } from '../../../../api/dropdown.api';
import { useTenant } from '../../../../hooks/useTenant';
import { useAuthStore } from '../../../../store/authStore';
import { useSocket } from '../../../../hooks/useSocket';
import { toLocalDate } from '../../../../utils/attendance/time';
import { 
  Loader, 
  Activity,
  ClipboardCheck, 
  MapPin,
  UserCheck
} from 'lucide-react';
import { TabSwitcher, type TabOption } from '../../../../components/ui/TabSwitcher';

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

export default function ModeMultiSesiView({ 
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

  useEffect(() => {
    if (!selectedKelasId && managedKelasIds && managedKelasIds.length > 0) {
      setSelectedKelasId(managedKelasIds[0]);
    }
  }, [managedKelasIds, selectedKelasId]);
  const [kelasOptions, setKelasOptions] = useState<DropdownOption[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('gerbang');
  const [lastScannedName, setLastScannedName] = useState<string | null>(null);

  const today = toLocalDate();
  const isAdmin = user?.role?.name === 'ADMIN' || user?.role?.name === 'SUPERADMIN';
  const caps = user?.capabilities || [];
  const positionCodes = user?.position_codes || [];
  
  const isGerbangPos = positionCodes.includes('GERBANG');
  const isWaliKelasPos = positionCodes.includes('WALIKELAS');

  const canAccessInput =
    isAdmin ||
    isGerbangPos ||
    user?.role?.name === 'OPERATOR' ||
    caps.includes('attendance.gate.tap.entry') ||
    caps.includes('attendance.scan.gate');
  
  const canAccessManual = isAdmin || isPetugasSiswa || isWaliKelasPos || isPetugasGuru || caps.includes('attendance.sessions.update.attendance');
  const canAccessSesi = isAdmin || isPetugasSiswa || isPetugasGuru || caps.includes('attendance.sessions.view.list');
  const canCreateSession = isAdmin || caps.includes('attendance.sessions.create');
  
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
    dropdownApi.getKelasForDropdown().then(setKelasOptions).catch(() => {});
  }, []);

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
    if (!canAccessInput && activeTab === 'gerbang') {
      if (canAccessManual) setActiveTab('manual');
      else if (canAccessSesi) setActiveTab('sesi');
    }
  }, [canAccessInput, canAccessManual, canAccessSesi, activeTab]);

  const tabOptions = useMemo((): TabOption[] => {
    const opts: TabOption[] = [];
    if (canAccessInput) {
      opts.push({ id: 'gerbang', label: 'Scanner Gerbang', icon: MapPin });
    }
    if (canAccessManual) {
      opts.push({ id: 'manual', label: 'Cek Manual', icon: ClipboardCheck });
    }
    if (canAccessSesi) {
      opts.push({ id: 'sesi', label: 'Manajemen Sesi', icon: Activity });
    }
    return opts;
  }, [canAccessInput, canAccessManual, canAccessSesi]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20 overflow-visible">
      {/* Header Tab Switcher (No redundant title, topbar already has title) */}
      {tabOptions.length > 0 && (
        <div className="flex items-center justify-between sm:justify-end gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 sm:hidden">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isConnected ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/50'}`}>
              {isConnected ? 'Online' : 'Terputus'}
            </span>
          </div>
          <TabSwitcher
            options={tabOptions}
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as TabType)}
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
                    refreshStats={async () => {
                      await refreshStats();
                      await fetchNotPresent();
                    }}
                    onTapSuccessMetadata={(data) => {
                      setLastScannedName(data.name);
                    }}
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
                  refreshData={async () => {
                    await refreshStats();
                    await fetchNotPresent();
                  }}
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
                />
              </section>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
