import React, { useState, useEffect, Suspense, lazy } from 'react';
import { PendingSiswaModule } from './PendingSiswaModule';
import { useGerbangAttendanceData } from '../../../../hooks/attendance/useGerbangAttendanceData';
import { useTenant } from '../../../../hooks/useTenant';
import { toLocalDate } from '../../../../utils/attendance/time';
import { dropdownApi, type DropdownOption } from '../../../../api/dropdown.api';
import { useSocket } from '../../../../hooks/useSocket';
import { Card } from '../../../../components/ui/Card';
import { LogIn, LogOut, Loader, UserCheck, MapPin } from 'lucide-react';
import { TabSwitcher } from '../../../../components/ui/TabSwitcher';

import { useKelasOptions } from '../../../../hooks/useKelasOptions';
import { useCapabilities } from '../../../../hooks/useCapabilities';

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

export default React.memo(function ModeSimpleView({ 
  user, 
  isPetugasSiswa, 
  isPetugasGuru,
  kelasLabel,
}: ModeSimpleViewProps) {
  const { isAdmin, isGateOfficer, can } = useCapabilities();
  const isGerbangPos = isGateOfficer || can('attendance.gate.tap.entry');

  const { tenantId } = useTenant();
  const { isConnected, subscribe, unsubscribe, emit } = useSocket();
  const { options: fetchedKelasOptions } = useKelasOptions();
  const kelasOptions = fetchedKelasOptions || [];
  
  // State
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');
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

  const canAccessInput =
    isAdmin ||
    isGerbangPos ||
    user?.role?.name === 'OPERATOR' ||
    caps.includes('attendance.gate.tap.entry') ||
    caps.includes('attendance.gate.tap.entry');
  const canAccessManual = isAdmin || isPetugasSiswa || (caps.includes('attendance.sessions.update.attendance') && !isGerbangPos);

  const totalArrived = miniStats?.masuk || 0;
  const totalStudents = miniStats?.total_target || 0;
  const progressPercent = totalStudents > 0 ? Math.round((totalArrived / totalStudents) * 100) : 0;
  const belumCount = Math.max(0, totalStudents - totalArrived);

  const isKelasEmpty = !kelasLabel || kelasLabel === '-' || kelasLabel === 'N/A';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20 overflow-visible">
      {canAccessInput && (
        <Card className="overflow-hidden shadow-sm border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300">
          <div className="p-6 space-y-6">
            {/* Tab Switcher without redundant title */}
            <div className="flex items-center justify-between sm:justify-end gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 sm:hidden">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isConnected ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/50'}`}>
                  {isConnected ? 'Online' : 'Terputus'}
                </span>
              </div>
              <TabSwitcher
                options={[
                  { id: 'GERBANG_DATANG', label: 'Absen Masuk', icon: LogIn, colorClass: 'text-emerald-600 dark:text-emerald-400' },
                  { id: 'GERBANG_PULANG', label: 'Absen Keluar', icon: LogOut, colorClass: 'text-rose-600 dark:text-rose-400' }
                ]}
                activeTab={direction}
                onChange={(val) => setDirection(val as 'GERBANG_DATANG' | 'GERBANG_PULANG')}
              />
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
});
