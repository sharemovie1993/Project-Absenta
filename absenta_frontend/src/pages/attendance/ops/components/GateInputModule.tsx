import React, { useState, useRef, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  submitTap,
  verifyFaceTap,
  enrollFaceTemplate,
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
import { useScanner } from '../../../../hooks/useScanner';
import { useGateLogic } from '../../../../hooks/useGateLogic';
import { PageLoader, Card } from '../../../../components/ui';

import { GerbangStatusHero } from '../../../../components/attendance/gerbang/GerbangStatusHero';
import { GerbangKeyRfidInput } from '../../../../components/attendance/gerbang/GerbangKeyRfidInput';
import { GerbangQrInput } from '../../../../components/attendance/gerbang/GerbangQrInput';
import { GerbangFaceInput } from '../../../../components/attendance/gerbang/GerbangFaceInput';

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
  const [inputTab, setInputTab] = useState<'HID' | 'QR' | 'FACE'>('HID');

  // 2. HID / RFID Logic
  const [hidToken, setHidToken] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const debouncedHidToken = useDebounce(hidToken, 300);

  // Search candidates Query
  const candidatesQuery = useQuery({
    queryKey: ['student-candidates-search', debouncedHidToken],
    queryFn: async () => {
      const term = debouncedHidToken.trim();
      const isRfidOrBarcode = /^\d{8,}$/.test(term);
      if (term.length < 2 || isRfidOrBarcode) {
        return [];
      }
      const res = await siswaApi.getAll({
        search: term,
        limit: 8,
        search_fields: ['nisn', 'nis', 'no_rfid', 'nama_siswa', 'id'],
        elevated_context: 'true',
        context: 'elevated'
      } as any);
      return ((res.data || []).filter((s: Student) => s.status?.toUpperCase() === 'AKTIF' || !s.status)) as Student[];
    },
    enabled: debouncedHidToken.trim().length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  const searchCandidates = candidatesQuery.data || [];

  useEffect(() => {
    setShowDropdown(searchCandidates.length > 0);
  }, [searchCandidates]);

  // 3. Scanner / QR Logic
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraDeviceId, setCameraDeviceId] = useState<string | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const lastSubmittedTokenRef = useRef<string>('');
  const lastSubmittedTimeRef = useRef<number>(0);
  
  const [tapHistory, setTapHistory] = useState<{ id: string; type: 'success' | 'error'; message: string; time: string }[]>([]);

  // Helper to focus input field on direction change
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
  }, [inputDirection, inputTab, focusScanInput]);

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
    const t = tokenRaw.trim();
    if (t.length < 2) return;
    const now = Date.now();
    if (t === lastSubmittedTokenRef.current && now - lastSubmittedTimeRef.current < 5000) {
      console.warn('[GATE_TAP_DEBUG] Anti-looping guard blocked duplicate scan for token:', t);
      return;
    }
    console.log('[GATE_TAP_DEBUG] handleScanToken received token:', t);
    if (isProcessingRef.current) {
      console.warn('[GATE_TAP_DEBUG] Ignored scan because previous scan is still processing:', t);
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
        targetName = directStudentData.nama_siswa || directStudentData.nama_guru || '';
      } else {
        // 1. Try finding Siswa strictly by NISN, NIS, RFID, or ID
        try {
          const resSiswa = await siswaApi.getAll({
            search: t,
            limit: 1,
            search_fields: ['nisn', 'nis', 'no_rfid', 'id'],
            elevated_context: 'true',
            context: 'elevated'
          } as any);
          const foundSiswa = (resSiswa.data as Student[])?.[0];
          if (foundSiswa?.id) {
            targetId = foundSiswa.id;
            targetName = foundSiswa.nama_siswa || '';
          }
        } catch (e) {}

        // 2. If Siswa not found, try finding Guru strictly by NIP or NIK or ID
        if (!targetName) {
          try {
            const resGuru = await guruApi.getAll({
              search: t,
              limit: 1,
              search_fields: ['nip', 'nik', 'no_rfid', 'id'],
              elevated_context: 'true',
              context: 'elevated'
            } as any);
            const foundGuru = (resGuru.data as any[])?.[0];
            if (foundGuru?.id) {
              targetId = foundGuru.id;
              targetName = foundGuru.nama_guru || '';
            }
          } catch (e) {}
        }
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
        } else {
          const errMsg = (res as any).message || 'Gagal memproses bypass';
          toast.error(errMsg, { position: 'bottom-center' });
          addTapFeedback('error', errMsg, timeStr);
        }
        return;
      }

      // Submit tap directly to backend (backend resolves by NISN, NIS, RFID, NIP, or ID)
      const tapRes = await submitTap({ siswa_id: targetId, arah: inputDirection, device_id: '', rfid: t });
      if (tapRes.success) {
        const sInfo = (tapRes as any).data?.siswa_info;
        const gInfo = (tapRes as any).data?.guru_info;
        
        let successMsg = '';
        if (sInfo?.nama) {
          const kelasLabel = sInfo.nama_kelas ? ` - ${sInfo.nama_kelas}` : '';
          successMsg = `PRESENSI BERHASIL: ${sInfo.nama}${kelasLabel}`;
        } else if (gInfo?.nama) {
          successMsg = `PRESENSI BERHASIL: ${gInfo.nama} (${gInfo.jenis_ptk || 'Pegawai'})`;
        } else {
          successMsg = (tapRes as any).message || `PRESENSI BERHASIL: ${targetName || 'Siswa'}`;
        }

        toast.success(successMsg, { position: 'bottom-center' });
        addTapFeedback('success', successMsg, timeStr);
        await playBeep('success');
        await refreshStats();
        onTapSuccess?.();
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
  }, [inputDirection, isBypassMode, refreshStats, onTapSuccess, playBeep, addTapFeedback, focusScanInput]);

  // Auto-submit RFID / barcode scanner input when 8+ digits are typed
  useEffect(() => {
    const term = debouncedHidToken.trim();
    if (!term) {
      lastSubmittedTokenRef.current = '';
      return;
    }
    if (/^\d{8,}$/.test(term) && lastSubmittedTokenRef.current !== term) {
      lastSubmittedTokenRef.current = term;
      handleScanToken(term);
    }
  }, [debouncedHidToken, handleScanToken]);

  const { scannerStatus, startScanner, stopScanner, cycleCamera } = useScanner({ cameraFacing, cameraDeviceId, onScan: handleScanToken, videoRef });

  // 4. Face Logic (Briefly encapsulated for now, ideally moved to hook later)
  const [faceModelsLoaded, setFaceModelsLoaded] = useState(false);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isAutoScanActive, setIsAutoScanActive] = useState(false);
  const [lastVerification, setLastVerification] = useState<any>(null);
  const [lastIdentifiedStudent, setLastIdentifiedStudent] = useState<any>(null);
  const [currentDetections, setCurrentDetections] = useState<any>(null);
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [faceSiswaId, setFaceSiswaId] = useState('');
  const [selectedFaceSiswaId, setSelectedFaceSiswaId] = useState('');

  // Fetch Config
  const fetchTenantConfig = useCallback(async () => {
    await tenantConfigQuery.refetch();
  }, [tenantConfigQuery]);

  // Tab Effects
  useEffect(() => {
    console.log('[GATE_INPUT_DEBUG] Tab effect fired, inputTab =', inputTab);
    if (inputTab === 'QR') {
      console.log('[GATE_INPUT_DEBUG] Triggering startScanner() for QR mode');
      startScanner();
    } else {
      console.log('[GATE_INPUT_DEBUG] Triggering stopScanner() for non-QR mode');
      stopScanner();
    }
    return () => {
      console.log('[GATE_INPUT_DEBUG] Cleanup triggering stopScanner()');
      stopScanner();
    };
  }, [inputTab, startScanner, stopScanner]);

  const content = (
    <div className="space-y-6">
      {!minimal && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-lg self-start w-full md:w-auto">
              <button onClick={() => setInternalDirection('GERBANG_DATANG')} className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-bold transition-all ${inputDirection === 'GERBANG_DATANG' ? 'bg-white dark:bg-gray-700 text-green-600 shadow-sm' : 'text-gray-500'}`}>MASUK</button>
              <button onClick={() => setInternalDirection('GERBANG_PULANG')} className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-bold transition-all ${inputDirection === 'GERBANG_PULANG' ? 'bg-white dark:bg-gray-700 text-red-600 shadow-sm' : 'text-gray-500'}`}>PULANG</button>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-end"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hadir</span><span className="text-2xl font-black text-green-600">{miniStats.masuk}</span></div>
              <div className="w-px h-8 bg-gray-200" />
              <div className="flex flex-col items-start"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pulang</span><span className="text-2xl font-black text-red-600">{miniStats.keluar}</span></div>
            </div>
          </div>
          <Suspense fallback={<PageLoader />}><GerbangStatusHero currentTime={currentTime} tenantConfig={tenantConfig} inputDirection={inputDirection} timeStatus={timeStatus as any} isBypassMode={isBypassMode} setIsBypassMode={setIsBypassMode} onRefreshConfig={fetchTenantConfig} loadingConfig={loadingConfig} /></Suspense>
        </div>
      )}

      <div className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden ${isBypassMode ? 'ring-4 ring-amber-400/20 border-amber-400' : ''}`}>
        <div className="flex border-b border-slate-100 dark:border-slate-800">
          {['HID', 'QR', 'FACE'].map(t => (
            <button key={t} onClick={() => setInputTab(t as any)} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all ${inputTab === t ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>{t}</button>
          ))}
        </div>
        <div className="p-4 sm:p-6">
          <Suspense fallback={<PageLoader />}>
            {inputTab === 'HID' && <GerbangKeyRfidInput hidToken={hidToken} onHidTokenChange={setHidToken} autoSubmitGateHID={handleScanToken} isBypassMode={isBypassMode} showDropdown={showDropdown} setShowDropdown={setShowDropdown} searchCandidates={searchCandidates} onSelectStudent={(t, s) => handleScanToken(t, s)} onSubmit={handleScanToken} />}
            {inputTab === 'QR' && <GerbangQrInput scannerStatus={scannerStatus} onSwitchCamera={cycleCamera} />}
            {inputTab === 'FACE' && <GerbangFaceInput videoRef={videoRef} currentDetections={currentDetections} displaySize={displaySize} isIdentifying={isIdentifying} isFlashing={isFlashing} isAutoScanActive={isAutoScanActive} setIsAutoScanActive={setIsAutoScanActive} lastVerification={lastVerification} lastIdentifiedStudent={lastIdentifiedStudent} inputDirection={inputDirection} cameraFacing={cameraFacing} onSwitchCamera={() => setCameraFacing(f => f === 'user' ? 'environment' : 'user')} faceSiswaId={faceSiswaId} setFaceSiswaId={setFaceSiswaId} selectedFaceSiswaId={selectedFaceSiswaId} setSelectedFaceSiswaId={setSelectedFaceSiswaId} onSelectStudent={(s) => { setSelectedFaceSiswaId(s.id); setFaceSiswaId(s.nama_siswa || ''); }} handleFaceVerifyTap={() => {}} tapSubmitting={false} handleFaceEnroll={() => {}} enrollSubmitting={false} />}
          </Suspense>
        </div>
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
