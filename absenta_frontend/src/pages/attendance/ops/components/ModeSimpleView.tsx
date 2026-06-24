import React, { useState, useEffect, Suspense, lazy, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PendingSiswaModule } from './PendingSiswaModule';
import { useGerbangAttendanceData } from '../../../../hooks/attendance/useGerbangAttendanceData';
import { useTenant } from '../../../../hooks/useTenant';
import { toLocalDate } from '../../../../utils/attendance/time';
import { dropdownApi, type DropdownOption } from '../../../../api/dropdown.api';
import { useSocket } from '../../../../hooks/useSocket';
import { Card } from '../../../../components/ui/Card';
import { LogIn, LogOut, Loader, UserCheck, MapPin } from 'lucide-react';
import { DashboardHero } from '../../../../components/dashboard/shared/DashboardHero';

// Lazy load GateInputModule to avoid loading ZXing library (400KB+) when not needed
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

interface ModeSimpleViewProps {
  user: UserCapabilities | null;
  absensiMode: 'SIMPLE' | 'MULTI_SESI' | null;
  isPetugasSiswa: boolean;
  isPetugasGuru: boolean;
  kelasLabel?: string;
  roleLabel?: string;
  petugasLabel?: string;
  petugasVariant?: 'success' | 'destructive' | 'outline';
}

export default function ModeSimpleView({ 
  user, 
  isPetugasSiswa, 
  kelasLabel,
}: ModeSimpleViewProps) {
  const isAdmin = user?.role?.name === 'ADMIN' || user?.role?.name === 'SUPERADMIN';
  const caps = user?.capabilities || [];
  const positionCodes = user?.position_codes || [];
  const isGerbangPos = positionCodes.includes('GERBANG');

  const { tenantId } = useTenant();
  const { isConnected, subscribe, unsubscribe, emit } = useSocket();
  
  // State
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');
  const [kelasOptions, setKelasOptions] = useState<DropdownOption[]>([]);
  const [direction, setDirection] = useState<'GERBANG_DATANG' | 'GERBANG_PULANG'>('GERBANG_DATANG');
  const [lastScannedName, setLastScannedName] = useState<string | null>(null);

  // Data Fetching
  const today = toLocalDate();
  const { 
    notPresent, 
    notPresentLoading, 
    fetchNotPresent, 
    miniStats, 
    refreshStats 
  } = useGerbangAttendanceData({ tenantId, selectedKelasId, tanggal: today });

  // Load Kelas Options
  useEffect(() => {
    dropdownApi.getKelasForDropdown().then(setKelasOptions).catch(() => {});
  }, []);

  // Additional Socket Events & Reconnection Room Join
  useEffect(() => {
    if (!isConnected || !tenantId) return;

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
  }, [isConnected, tenantId, subscribe, unsubscribe, emit, refreshStats, fetchNotPresent]);

  // Access Control
  const canAccessInput = isAdmin || caps.includes('attendance.scan');
  const canAccessManual = isAdmin || (caps.includes('attendance.sessions.update.attendance') && !isGerbangPos);

  const totalArrived = miniStats?.masuk || 0;
  const totalStudents = miniStats?.total_target || 0;
  const progressPercent = totalStudents > 0 ? Math.round((totalArrived / totalStudents) * 100) : 0;
  const belumCount = Math.max(0, totalStudents - totalArrived);

  const isKelasEmpty = !kelasLabel || kelasLabel === '-' || kelasLabel === 'N/A';

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20 overflow-visible">
      {/* Vitality Hero */}
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
          <AnimatePresence mode="wait" initial={false}>
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
        </div>
      </DashboardHero>

      {canAccessInput && (
        <Card className="overflow-hidden shadow-lg border-0 bg-white dark:bg-gray-800 transition-all duration-300">
          <div className="p-8 space-y-8">
            {/* 2. Direction Switch */}
            <div className="flex justify-center">
              <div className="inline-flex bg-gray-100 dark:bg-gray-900 p-1.5 rounded-xl shadow-inner w-full md:w-auto border border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => setDirection('GERBANG_DATANG')}
                  className={`flex-1 md:flex-none px-10 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${
                    direction === 'GERBANG_DATANG'
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 transform scale-105'
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                  type="button"
                >
                  <LogIn className="w-4 h-4" />
                  Absen Masuk
                </button>
                <button
                  onClick={() => setDirection('GERBANG_PULANG')}
                  className={`flex-1 md:flex-none px-10 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${
                    direction === 'GERBANG_PULANG'
                      ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20 transform scale-105'
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                  type="button"
                >
                  <LogOut className="w-4 h-4" />
                  Absen Keluar
                </button>
              </div>
            </div>

            {/* 3. Input Module */}
            <div className="max-w-2xl mx-auto">
              <Suspense fallback={
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Loader className="animate-spin mb-2" size={32} />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]">Memuat modul scanner...</p>
                </div>
              }>
                <GateInputModule 
                  miniStats={miniStats}
                  refreshStats={async () => { await refreshStats(); }}
                  onTapSuccessMetadata={(data) => {
                    setLastScannedName(data.name);
                  }}
                  direction={direction}
                  onDirectionChange={setDirection}
                  minimal={true}
                />
              </Suspense>
            </div>
          </div>
        </Card>
      )}
      
      {canAccessManual && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
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
        </div>
      )}

      {!canAccessInput && !canAccessManual && (
        <div className="text-center text-gray-500 mt-10 font-bold">
          Tidak ada modul yang tersedia untuk peran Anda di Mode Simple.
        </div>
      )}
    </div>
  );
}
