import React, { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  submitTap,
  bypassLate,
  type TapPayload,
} from '../../../../api/attendanceGerbang.api';
import { siswaApi } from '../../../../api/academic.api';
import { getTenantById } from '../../../../api/tenants.api';
import { useTenant } from '../../../../hooks/useTenant';
import { useDebounce } from '../../../../hooks/useDebounce';
import { AttendanceErrorBoundary } from '../../../../components/attendance/AttendanceErrorBoundary';
import PremiumFeatureGate from '../../../../components/auth/PremiumFeatureGate';
import { useAudioFeedback } from '../../../../hooks/useAudioFeedback';
import { useGateLogic } from '../../../../hooks/useGateLogic';
import { PageLoader, Card } from '../../../../components/ui';

import { GerbangStatusHero } from '../../../../components/attendance/gerbang/GerbangStatusHero';
import { GerbangKeyRfidInput } from '../../../../components/attendance/gerbang/GerbangKeyRfidInput';

import { type Student } from '../../../../components/common/SmartStudentPicker';

interface GateInputModuleProps {
  miniStats: { masuk: number; keluar: number };
  refreshStats: () => Promise<void>;
  onTapSuccess?: () => void;
  onTapSuccessMetadata?: (data: { name: string }) => void;
  direction?: TapPayload['arah'];
  onDirectionChange?: (val: TapPayload['arah']) => void;
  minimal?: boolean;
}

const GateInputModuleComponent: React.FC<GateInputModuleProps> = ({
  miniStats,
  refreshStats,
  onTapSuccess,
  onTapSuccessMetadata,
  direction,
  onDirectionChange,
  minimal = false,
}) => {
  const { tenantId } = useTenant();
  const { playBeep } = useAudioFeedback();

  // Tenant config Query
  const tenantConfigQuery = useQuery({
    queryKey: ['tenant-config-gate', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const res = await getTenantById(tenantId);
      return res.data || null;
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  const tenantConfig = tenantConfigQuery.data || null;
  const loadingConfig = tenantConfigQuery.isLoading;

  const { currentTime, internalDirection, setInternalDirection, timeStatus } = useGateLogic(tenantConfig, onDirectionChange);
  const inputDirection = direction || internalDirection;
  
  const [isBypassMode, setIsBypassMode] = useState(false);

  // HID / RFID / 2D Barcode Scanner Input State
  const [hidToken, setHidToken] = useState('');

  const isProcessingRef = useRef<boolean>(false);
  const lastSubmittedTokenRef = useRef<string>('');
  const lastSubmittedTimeRef = useRef<number>(0);
  
  const [tapHistory, setTapHistory] = useState<{ id: string; type: 'success' | 'error'; message: string; time: string }[]>([]);

  // Helper to focus input field
  const focusScanInput = useCallback(() => {
    setTimeout(() => {
      const inputEl = document.getElementById('hid-input-field') as HTMLInputElement | null;
      if (inputEl) {
        inputEl.focus();
      }
    }, 50);
  }, []);

  // Auto-focus input on direction change
  useEffect(() => {
    focusScanInput();
  }, [inputDirection, focusScanInput]);

  const addTapFeedback = useCallback((type: 'success' | 'error', message: string, time: string) => {
    const newItem = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      message,
      time
    };
    setTapHistory(prev => [newItem, ...prev.slice(0, 4)]);
  }, []);

  const handleScanToken = useCallback(async (tokenRaw: string, directStudentData: Student | null = null) => {
    const t = String(tokenRaw || '').trim();
    if (!t) return;

    const now = Date.now();
    // Prevent double submission within 1.5s for same token
    if (lastSubmittedTokenRef.current === t && (now - lastSubmittedTimeRef.current) < 1500) {
      return;
    }

    if (isProcessingRef.current) {
      return;
    }
    isProcessingRef.current = true;
    lastSubmittedTokenRef.current = t;
    lastSubmittedTimeRef.current = now;

    try {
      let targetId: string = t;
      let targetName: string = '';

      if (directStudentData) {
        targetId = directStudentData.id;
        targetName = directStudentData.nama_siswa || (directStudentData as any).nama_guru || '';
      }

      const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // If bypass mode is active
      if (isBypassMode) {
        const res = await bypassLate({ siswa_id: targetId, note: 'Bypass Mode' });
        if (res.success) {
          const sInfo = (res as any).data;
          const nama = sInfo?.nama_siswa || targetName || 'Siswa';
          const kelas = sInfo?.kelas && sInfo.kelas !== '-' ? ` - ${sInfo.kelas}` : '';
          const msg = `BYPASS BERHASIL: ${nama}${kelas}`;
          
          toast.success(msg, { position: 'bottom-center' });
          addTapFeedback('success', msg, timeStr);
          await playBeep('success');
          await refreshStats();
          onTapSuccess?.();
          onTapSuccessMetadata?.({ name: nama });
        } else {
          const errMsg = (res as any).message || 'Gagal memproses bypass';
          toast.error(errMsg, { position: 'bottom-center' });
          addTapFeedback('error', errMsg, timeStr);
        }
        return;
      }

      // Direct single-step submission to backend (Backend resolves NIP, NIK, NISN, RFID, or UUID instantly)
      const tapRes = await submitTap({ siswa_id: targetId, arah: inputDirection, device_id: '', rfid: t });
      if (tapRes.success) {
        const sInfo = (tapRes as any).data?.siswa_info;
        const gInfo = (tapRes as any).data?.guru_info;
        
        let successMsg = '';
        let personName = '';
        if (sInfo?.nama) {
          personName = sInfo.nama;
          const kelasLabel = sInfo.nama_kelas ? ` - ${sInfo.nama_kelas}` : '';
          successMsg = `PRESENSI BERHASIL: ${sInfo.nama}${kelasLabel}`;
        } else if (gInfo?.nama) {
          personName = gInfo.nama;
          successMsg = `PRESENSI BERHASIL: ${gInfo.nama} (${gInfo.jenis_ptk || 'Pegawai'})`;
        } else {
          personName = targetName || 'Siswa/Guru';
          successMsg = (tapRes as any).message || `PRESENSI BERHASIL: ${personName}`;
        }

        toast.success(successMsg, { position: 'bottom-center' });
        addTapFeedback('success', successMsg, timeStr);
        await playBeep('success');
        await refreshStats();
        onTapSuccess?.();
        onTapSuccessMetadata?.({ name: personName });
      } else {
        const errMsg = (tapRes as any).message || 'Gagal mencatat tap';
        toast.error(errMsg, { position: 'bottom-center' });
        addTapFeedback('error', errMsg, timeStr);
      }
    } catch (e: any) {
      const errMsg = e.response?.data?.message || e.message || 'Gagal mencatat tap';
      toast.error(errMsg, { position: 'bottom-center' });
      addTapFeedback('error', errMsg, new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } finally {
      setHidToken('');
      isProcessingRef.current = false;
      focusScanInput();
    }
  }, [inputDirection, isBypassMode, refreshStats, onTapSuccess, onTapSuccessMetadata, playBeep, addTapFeedback, focusScanInput]);

  // Fetch Config
  const fetchTenantConfig = useCallback(async () => {
    await tenantConfigQuery.refetch();
  }, [tenantConfigQuery]);

  const content = (
    <div className="space-y-6">
      {!minimal && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-full md:w-auto">
              <button 
                type="button"
                onClick={() => setInternalDirection('GERBANG_DATANG')} 
                className={`flex-1 md:flex-none px-4 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  inputDirection === 'GERBANG_DATANG' 
                    ? 'bg-white dark:bg-gray-700 text-green-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>MASUK</span>
                <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                  inputDirection === 'GERBANG_DATANG'
                    ? 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300'
                    : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {miniStats.masuk}
                </span>
              </button>
              <button 
                type="button"
                onClick={() => setInternalDirection('GERBANG_PULANG')} 
                className={`flex-1 md:flex-none px-4 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  inputDirection === 'GERBANG_PULANG' 
                    ? 'bg-white dark:bg-gray-700 text-red-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>PULANG</span>
                <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                  inputDirection === 'GERBANG_PULANG'
                    ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                    : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {miniStats.keluar}
                </span>
              </button>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <div className="flex flex-col items-end"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hadir</span><span className="text-2xl font-black text-green-600">{miniStats.masuk}</span></div>
              <div className="w-px h-8 bg-gray-200" />
              <div className="flex flex-col items-start"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pulang</span><span className="text-2xl font-black text-red-600">{miniStats.keluar}</span></div>
            </div>
          </div>
          <Suspense fallback={<PageLoader />}><GerbangStatusHero currentTime={currentTime} tenantConfig={tenantConfig} inputDirection={inputDirection} timeStatus={timeStatus as any} isBypassMode={isBypassMode} setIsBypassMode={setIsBypassMode} onRefreshConfig={fetchTenantConfig} loadingConfig={loadingConfig} /></Suspense>
        </div>
      )}

      {/* Universal Fast-Lane Hardware Scanner Card (Single Clean Terminal) */}
      <div className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden p-4 sm:p-6 ${isBypassMode ? 'ring-4 ring-amber-400/20 border-amber-400' : ''}`}>
        <Suspense fallback={<PageLoader />}>
          <GerbangKeyRfidInput 
            hidToken={hidToken} 
            onHidTokenChange={setHidToken} 
            isBypassMode={isBypassMode} 
            onSubmit={handleScanToken} 
          />
        </Suspense>
      </div>

      {/* Live Result History Stream (Slide Down Animation - Latest Scan on TOP) */}
      {tapHistory.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-400 px-1">
            <span>Riwayat Tap Terakhir (Terbaru di Atas)</span>
            <button 
              type="button" 
              onClick={() => setTapHistory([])}
              className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
            >
              Bersihkan
            </button>
          </div>
          <div className="space-y-2">
            {tapHistory.map((item, idx) => (
              <div 
                key={item.id}
                className={`p-3.5 rounded-xl border flex items-center justify-between shadow-xs transition-all duration-300 animate-in fade-in slide-in-from-top-3 ${
                  idx === 0 ? 'ring-2 ring-indigo-500/20 scale-[1.01]' : 'opacity-85'
                } ${
                  item.type === 'success' 
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200' 
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${
                    item.type === 'success' ? 'bg-emerald-500 text-white shadow-xs' : 'bg-rose-500 text-white shadow-xs'
                  }`}>
                    {item.type === 'success' ? '✓' : '✕'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs sm:text-sm uppercase tracking-tight truncate">{item.message}</span>
                      {idx === 0 && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-indigo-600 text-white uppercase shrink-0">
                          Terbaru
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] opacity-75 font-medium mt-0.5">Waktu Tap: {item.time} WIB</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <AttendanceErrorBoundary>
      <PremiumFeatureGate moduleName="ABSENSI" featureName="Presensi Realtime" description="Kelola pencatatan kehadiran dengan validasi otomatis.">
        {minimal ? content : <Card className="border-none shadow-none bg-transparent">{content}</Card>}
      </PremiumFeatureGate>
    </AttendanceErrorBoundary>
  );
};

export const GateInputModule = React.memo(GateInputModuleComponent);
