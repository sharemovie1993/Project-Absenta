import React, { useState, useRef, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
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

// Lazy load UI components
const GerbangStatusHero = lazy(() => import('../../../../components/attendance/gerbang/GerbangStatusHero').then(m => ({ default: m.GerbangStatusHero })));
const GerbangKeyRfidInput = lazy(() => import('../../../../components/attendance/gerbang/GerbangKeyRfidInput').then(m => ({ default: m.GerbangKeyRfidInput })));
const GerbangQrInput = lazy(() => import('../../../../components/attendance/gerbang/GerbangQrInput').then(m => ({ default: m.GerbangQrInput })));
const GerbangFaceInput = lazy(() => import('../../../../components/attendance/gerbang/GerbangFaceInput').then(m => ({ default: m.GerbangFaceInput })));

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

  // 1. Core Logic & Timing
  const [tenantConfig, setTenantConfig] = useState<any>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const { currentTime, internalDirection, setInternalDirection, timeStatus } = useGateLogic(tenantConfig, onDirectionChange);
  const inputDirection = direction || internalDirection;
  
  const [isBypassMode, setIsBypassMode] = useState(false);
  const [inputTab, setInputTab] = useState<'HID' | 'QR' | 'FACE'>('HID');

  // 2. HID / RFID Logic
  const [hidToken, setHidToken] = useState('');
  const [searchCandidates, setSearchCandidates] = useState<Student[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const debouncedHidToken = useDebounce(hidToken, 300);

  // 3. Scanner / QR Logic
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('user');
  const [cameraDeviceId, setCameraDeviceId] = useState<string | null>(null);
  
  const handleScanToken = useCallback(async (tokenRaw: string, directStudentData: Student | null = null) => {
    try {
      const t = tokenRaw.trim();
      if (t.length < 6) return;
      let found = directStudentData;
      if (!found) {
        const res = await siswaApi.getAll({ search: t, limit: 1, search_fields: ['id', 'no_rfid', 'nis'], context: 'elevated' } as any);
        found = (res.data as Student[])?.[0] || null;
      }
      if (!found?.id) { toast.error('Siswa tidak ditemukan'); setHidToken(''); return; }
      
      if (isBypassMode) {
        const res = await bypassLate({ siswa_id: found.id, note: 'Bypass Mode' });
        if (res.success) { toast.success(`BYPASS: ${found.nama_siswa}`); await playBeep('success'); await refreshStats(); onTapSuccess?.(); }
        return;
      }

      const tapRes = await submitTap({ siswa_id: found.id, arah: inputDirection, device_id: '', rfid: '' });
      if (tapRes.success) { toast.success(found.nama_siswa || ''); await playBeep('success'); await refreshStats(); onTapSuccess?.(); }
    } catch (e: any) { toast.error(e.message || 'Gagal mencatat tap'); } finally { setHidToken(''); }
  }, [inputDirection, isBypassMode, refreshStats, onTapSuccess, playBeep]);

  const { scannerStatus, startScanner, stopScanner } = useScanner({ cameraFacing, cameraDeviceId, onScan: handleScanToken, videoRef });

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
    if (!tenantId) return;
    setLoadingConfig(true);
    try {
      const res = await getTenantById(tenantId);
      if (res.data) setTenantConfig({ jamMasuk: res.data.jam_masuk_default || '07:00', jamPulang: res.data.jam_pulang_default || '14:00', toleransi: res.data.toleransi_keterlambatan_menit || 0 });
    } finally { setLoadingConfig(false); }
  }, [tenantId]);

  useEffect(() => { fetchTenantConfig(); }, [fetchTenantConfig]);

  // Tab Effects
  useEffect(() => {
    if (inputTab === 'QR') {
      startScanner();
    } else {
      stopScanner();
    }
    return () => {
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

      <div className={`bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden ${isBypassMode ? 'ring-4 ring-amber-400/20 border-amber-400' : ''}`}>
        <div className="flex border-b border-slate-100 dark:border-slate-800">
          {['HID', 'QR', 'FACE'].map(t => (
            <button key={t} onClick={() => setInputTab(t as any)} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${inputTab === t ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>{t}</button>
          ))}
        </div>
        <div className="p-8">
          <Suspense fallback={<PageLoader />}>
            {inputTab === 'HID' && <GerbangKeyRfidInput hidToken={hidToken} onHidTokenChange={setHidToken} autoSubmitGateHID={handleScanToken} isBypassMode={isBypassMode} showDropdown={showDropdown} setShowDropdown={setShowDropdown} searchCandidates={searchCandidates} onSelectStudent={(t, s) => handleScanToken(t, s)} onSubmit={handleScanToken} />}
            {inputTab === 'QR' && <GerbangQrInput videoRef={videoRef} scannerStatus={scannerStatus} onSwitchCamera={() => setCameraFacing(f => f === 'user' ? 'environment' : 'user')} />}
            {inputTab === 'FACE' && <GerbangFaceInput videoRef={videoRef} currentDetections={currentDetections} displaySize={displaySize} isIdentifying={isIdentifying} isFlashing={isFlashing} isAutoScanActive={isAutoScanActive} setIsAutoScanActive={setIsAutoScanActive} lastVerification={lastVerification} lastIdentifiedStudent={lastIdentifiedStudent} inputDirection={inputDirection} cameraFacing={cameraFacing} onSwitchCamera={() => setCameraFacing(f => f === 'user' ? 'environment' : 'user')} faceSiswaId={faceSiswaId} setFaceSiswaId={setFaceSiswaId} selectedFaceSiswaId={selectedFaceSiswaId} setSelectedFaceSiswaId={setSelectedFaceSiswaId} onSelectStudent={(s) => { setSelectedFaceSiswaId(s.id); setFaceSiswaId(s.nama_siswa || ''); }} handleFaceVerifyTap={() => {}} tapSubmitting={false} handleFaceEnroll={() => {}} enrollSubmitting={false} />}
          </Suspense>
        </div>
      </div>
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
