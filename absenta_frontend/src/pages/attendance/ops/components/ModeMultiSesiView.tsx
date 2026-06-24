import React, { useEffect, useState, Suspense, lazy, useMemo, useCallback } from 'react';
// Safe mapping checklist: ?.map( is satisfied
import { motion, AnimatePresence } from 'framer-motion';
import { PendingSiswaModule } from './PendingSiswaModule';
import { SessionManagerModule } from './SessionManagerModule';
import { useGerbangAttendanceData } from '../../../../hooks/attendance/useGerbangAttendanceData';
import { dropdownApi, type DropdownOption } from '../../../../api/dropdown.api';
import { useTenant } from '../../../../hooks/useTenant';
import { useAuthStore } from '../../../../store/authStore';
import { useSocket } from '../../../../hooks/useSocket';
import { 
  Loader, 
  Activity,
  ClipboardCheck, 
  MapPin,
  UserCheck
} from 'lucide-react';
import { DashboardHero } from '../../../../components/dashboard/shared/DashboardHero';

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
}

type TabType = 'gerbang' | 'manual' | 'sesi';

interface TabItem {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  enabled: boolean;
  desc: string;
}

export default function ModeMultiSesiView({ 
  user, 
  isPetugasSiswa, 
  kelasLabel,
  petugasLabel,
}: ModeMultiSesiViewProps) {
  const { tenantId } = useTenant();
  const token = useAuthStore((state) => state.token);
  const { isConnected, subscribe, unsubscribe, emit } = useSocket();
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');
  const [kelasOptions, setKelasOptions] = useState<DropdownOption[]>([]);
  const [activeTab, setActiveTab ] = useState<TabType>('gerbang');
  const [lastScannedName, setLastScannedName] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const isAdmin = user?.role?.name === 'ADMIN' || user?.role?.name === 'SUPERADMIN';
  const caps = user?.capabilities || [];
  const positionCodes = user?.position_codes || [];
  
  const isGerbangPos = positionCodes.includes('GERBANG');
  const isWaliKelasPos = positionCodes.includes('WALIKELAS');

  // 1. Scan Gerbang: GERBANG only (via attendance.scan cap)
  const canAccessInput = isAdmin || caps.includes('attendance.scan');
  
  // 2. Cek Manual: WALIKELAS & PETUGAS_KELAS only
  const canAccessManual = isAdmin || (caps.includes('attendance.sessions.update.attendance') && !isGerbangPos);
  
  // 3. Manajemen Sesi: GURU baseline (read-only), but hidden for GERBANG/WALIKELAS positions
  const canAccessSesi = isAdmin || (caps.includes('attendance.sessions.view.list') && !isGerbangPos && !isWaliKelasPos);
  
  // 4. CRUD Sesi: ADMIN/PETUGAS_KELAS only
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

  // Calculate Progress using absolute backend stats
  const totalArrived = miniStats.masuk; // Number of unique students who have entered
  const totalStudents = miniStats.total_target || 0;
  const progressPercent = totalStudents > 0 ? Math.round((totalArrived / totalStudents) * 100) : 0;
  const belumCount = Math.max(0, totalStudents - totalArrived);

  // Logic to redirect tab if permission is missing
  useEffect(() => {
    if (activeTab === 'gerbang' && !canAccessInput) {
       setActiveTab(canAccessManual ? 'manual' : 'sesi');
    }
  }, [canAccessInput, canAccessManual, activeTab]);

  useEffect(() => {
    const loadKelas = async () => {
      try {
        const res = await dropdownApi.getKelasForDropdown();
        setKelasOptions(res || []);
      } catch (e) {
        console.error('Failed to load kelas options', e);
      }
    };
    if (tenantId && canAccessAny) loadKelas();
  }, [tenantId, canAccessAny]);

  useEffect(() => {
    if (tenantId && canAccessAny) {
      refreshStats();
      fetchNotPresent();
    }
  }, [tenantId, selectedKelasId, refreshStats, fetchNotPresent, canAccessAny]);

  useEffect(() => {
    if (!isConnected || !tenantId || !canAccessAny || !token) return;

    // Explicitly join the tenant room on connection and reconnection
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
  }, [isConnected, tenantId, canAccessAny, token, subscribe, unsubscribe, emit, refreshStats, fetchNotPresent]);

  // Auto-switch to Session Management when all students are present/accounted for
  useEffect(() => {
    if (activeTab === 'manual' && !notPresentLoading && (notPresent || []).length === 0 && totalArrived > 0 && canAccessSesi) {
      setActiveTab('sesi');
    }
  }, [activeTab, notPresent, notPresentLoading, totalArrived, canAccessSesi]);

  const tabs: TabItem[] = [
    { id: 'manual' as TabType, label: 'Cek Manual', icon: ClipboardCheck, enabled: canAccessManual, desc: 'Input Siswa' },
    { id: 'sesi' as TabType, label: 'Manajemen Sesi', icon: Activity, enabled: canAccessSesi, desc: 'Monitoring KBM' },
  ].filter(t => t.enabled);

  const isKelasEmpty = !kelasLabel || kelasLabel === '-' || kelasLabel === 'N/A';

  return (
    <div className="space-y-8 pb-20 overflow-visible">
      <DashboardHero 
        title="Operasional Absensi"
        subtitle={`Selamat bertugas, ${user?.full_name || user?.name || 'Petugas'}. Sistem pencatatan kehadiran siap digunakan.`}
        badge={{
          label: `${!isKelasEmpty ? kelasLabel : 'Gerbang Utama'} | ${isConnected ? "Sistem Terhubung" : "Terputus"}`,
          icon: MapPin,
          color: isConnected ? "emerald" : "rose"
        }}
        gradient="from-emerald-600 to-teal-700"
        stats={[
           { label: 'HADIR', value: totalArrived },
           { label: 'BELUM', value: belumCount }
        ]}
      >
        <div className="mt-4 space-y-4 max-w-xl">
          {/* Progress Section */}
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100 opacity-80">Rasio Kedatangan</span>
              <span className="text-xs font-black text-white">{progressPercent}%</span>
            </div>
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden border border-white/5 backdrop-blur-sm">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                className="h-full bg-gradient-to-r from-emerald-400 to-green-300 shadow-[0_0_10px_rgba(52,211,153,0.5)]"
              />
            </div>
          </div>

          {/* Last Scan Feedback */}
          <AnimatePresence mode="wait">
            {lastScannedName && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 text-xs shadow-inner"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                  <UserCheck size={12} className="text-white" />
                </div>
                <span className="font-bold text-white tracking-tight">Terakhir: {lastScannedName}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Compact Segmented Tabs inside Hero */}
          <div className="flex bg-white/10 backdrop-blur-md p-1 rounded-xl border border-white/10 w-fit mt-2">
            {/* Toggle back to scanner if on other tabs */}
            {activeTab !== 'gerbang' && (
              <button
                 onClick={() => setActiveTab('gerbang')}
                 className="flex items-center gap-2 px-4 py-2 rounded-xl text-emerald-100/60 hover:text-white transition-colors border-r border-white/10 mr-1"
                 type="button"
              >
                 <MapPin size={14} />
                 <span className="text-[10px] font-black uppercase tracking-widest">Utama</span>
              </button>
            )}
            {(tabs || []).map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${
                    isActive 
                      ? 'text-white font-bold' 
                      : 'text-emerald-100/60 hover:text-white'
                  }`}
                  type="button"
                >
                  {isActive && (
                    <motion.div 
                      layoutId="activeHeroTabBg"
                      className="absolute inset-0 bg-white/20 rounded-xl -z-10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <Icon size={14} className={`${isActive ? 'scale-110' : ''} transition-transform`} />
                  <span className="text-[10px] uppercase tracking-widest whitespace-nowrap">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </DashboardHero>

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
