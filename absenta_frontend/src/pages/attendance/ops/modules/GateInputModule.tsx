import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { BrowserMultiFormatReader } from '@zxing/browser';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { useToast } from '../../../../hooks/useToast';
import { ToastContainer } from '../../../../components/ui/Toast';
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
import { GerbangInputPanel } from '../../../../components/attendance/gerbang/GerbangInputPanel';
import { Modal, Label, Switch } from '../../../../components/ui';
import { SmartStudentPicker, type Student } from '../../../../components/common/SmartStudentPicker';
import { Clock, AlertTriangle, ShieldAlert, RefreshCw, User, Search, X } from 'lucide-react';
import { BiometricHudOverlay } from '../../../../components/attendance/ai/BiometricHudOverlay';

interface GateInputModuleProps {
  miniStats: { masuk: number; keluar: number };
  refreshStats: () => Promise<void>;
  onTapSuccess?: () => void;
  onTapSuccessMetadata?: (data: { name: string }) => void;
  direction?: TapPayload['arah'];
  onDirectionChange?: (val: TapPayload['arah']) => void;
  minimal?: boolean;
}

const GerbangMiniStats = ({ masuk, keluar }: { masuk: number; keluar: number }) => (
  <div className="flex items-center gap-2">
    <div className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
      Masuk: {masuk}
    </div>
    <div className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
      Keluar: {keluar}
    </div>
  </div>
);

export const GateInputModule: React.FC<GateInputModuleProps> = ({
  miniStats,
  refreshStats,
  onTapSuccess,
  onTapSuccessMetadata,
  direction,
  onDirectionChange,
  minimal = false,
}) => {
  const { toasts, success, error, notice, removeToast } = useToast();
  const { tenantId } = useTenant();

  // State
  const [internalDirection, setInternalDirection] = useState<TapPayload['arah']>('GERBANG_DATANG');
  const inputDirection = direction || internalDirection;
  
  const [tenantConfig, setTenantConfig] = useState<{
    jamMasuk: string;
    jamPulang: string;
    toleransi: number;
  } | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [faceModelsLoaded, setFaceModelsLoaded] = useState(false);
  const lastAutoPhaseRef = useRef<'MASUK' | 'PULANG' | null>(null);

  // Load AI Models
  useEffect(() => {
    let isMounted = true;
    const loadModels = async () => {
      try {
        // Load all 3 necessary models for recognition from local models directory
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ]);
        if (isMounted) setFaceModelsLoaded(true);
      } catch (e) {
        console.warn('Gagal memuat model face-api lokal:', e);
      }
    };
    loadModels();
    return () => { isMounted = false; };
  }, []);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-switch direction based on schedule
  useEffect(() => {
    if (!tenantConfig) return;

    const checkAutoSwitch = () => {
      try {
        const [pHours, pMinutes] = tenantConfig.jamPulang.split(':').map(Number);
        
        // Target pulang (jamPulang)
        const pulangDate = new Date(currentTime);
        pulangDate.setHours(pHours, pMinutes, 0, 0);

        // Determine phase: If now >= jamPulang, then PULANG mode, else MASUK mode
        const currentPhase = currentTime >= pulangDate ? 'PULANG' : 'MASUK';

        // Initial set or Transition
        if (lastAutoPhaseRef.current !== currentPhase) {
           const newDirection = currentPhase === 'PULANG' ? 'GERBANG_PULANG' : 'GERBANG_DATANG';
           
           // Only notify if it's a transition (not initial load)
           if (lastAutoPhaseRef.current !== null) {
              notice(`Mode otomatis berubah ke ${currentPhase === 'PULANG' ? 'PULANG' : 'MASUK'}`, { duration: 3000 });
           }
           
           // Update direction
           if (onDirectionChange) {
             onDirectionChange(newDirection);
           } else {
             setInternalDirection(newDirection);
           }

           lastAutoPhaseRef.current = currentPhase;
        }
      } catch (e) {
        // Ignore parsing errors
      }
    };

    checkAutoSwitch();
  }, [currentTime, tenantConfig, onDirectionChange]);

  // Calculate status
  const getTimeStatus = () => {
    if (!tenantConfig || inputDirection !== 'GERBANG_DATANG') return null;
    
    try {
      const [hours, minutes] = tenantConfig.jamMasuk.split(':').map(Number);
      
      // Target masuk (jamMasuk)
      const targetDate = new Date(currentTime);
      targetDate.setHours(hours, minutes, 0, 0);

      // Limit toleransi
      const limitDate = new Date(targetDate);
      limitDate.setMinutes(minutes + tenantConfig.toleransi);
      
      const isLate = currentTime > limitDate;
      let lateMinutes = 0;

      if (isLate) {
        // Hitung selisih menit dari jam masuk (bukan dari limit toleransi)
        // Jika jam masuk 07:00, toleransi 15, datang 07:20 -> terlambat 20 menit
        const diffMs = currentTime.getTime() - targetDate.getTime();
        lateMinutes = Math.floor(diffMs / 60000);
      }

      return {
        status: isLate ? 'TERLAMBAT' : 'TEPAT_WAKTU',
        lateMinutes
      };
    } catch {
      return null;
    }
  };

  const timeStatus = getTimeStatus();

  const [isBypassMode, setIsBypassMode] = useState(false);

  const fetchTenantConfig = useCallback(async () => {
    if (!tenantId) return;
    setLoadingConfig(true);
    try {
      const res = await getTenantById(tenantId);
      if (res.data) {
        setTenantConfig({
          jamMasuk: res.data.jam_masuk_default || '07:00',
          jamPulang: res.data.jam_pulang_default || '14:00',
          toleransi: res.data.toleransi_keterlambatan_menit || 0
        });
      }
    } catch (err) {
      console.error('Failed to load tenant config', err);
    } finally {
      setLoadingConfig(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchTenantConfig();
  }, [fetchTenantConfig]);

  const handleDirectionChange = (val: TapPayload['arah']) => {
      if (onDirectionChange) onDirectionChange(val);
      else setInternalDirection(val);
  };

  const [inputTab, setInputTab] = useState<'HID' | 'QR' | 'FACE'>('HID');
  
  // HID / Quick Input
  const [hidToken, setHidToken] = useState('');
  const hidTimerRef = useRef<number | null>(null);
  const minIdLength = 6;

  // Scanner / Camera
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const detectorRef = useRef<any>(null);
  const zxingReaderRef = useRef<any>(null);
  const scannerRunningRef = useRef<boolean>(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [cameraDeviceId, setCameraDeviceId] = useState<string | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('user');
  const [scannerStatus, setScannerStatus] = useState('');
  const lastScanTokenRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  // Face
  const [faceSiswaId, setFaceSiswaId] = useState<string>('');
  const [selectedFaceSiswaId, setSelectedFaceSiswaId] = useState<string>('');
  const isSelectingRef = useRef(false);

  const [tapSubmitting, setTapSubmitting] = useState(false);
  const [enrollSubmitting, setEnrollSubmitting] = useState<boolean>(false);
  const [isFlashing, setIsFlashing] = useState(false);
  
  // Verification Feedback
  const [lastVerification, setLastVerification] = useState<{
    success: boolean;
    duplicate?: boolean;
    score?: number;
    threshold?: number;
    message?: string;
    timestamp?: number;
  } | null>(null);

  // Auto-Scan (1:N Recognition)
  const [isAutoScanActive, setIsAutoScanActive] = useState(false);
  const [lastIdentifiedStudent, setLastIdentifiedStudent] = useState<any>(null);
  const autoScanTimerRef = useRef<any>(null);
  const isProcessingAutoScanRef = useRef(false);
  
  // Real-time HUD stats
  const [currentDetections, setCurrentDetections] = useState<any>(null);
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const hudRequestRef = useRef<number | null>(null);
  const stabilityCounterRef = useRef<number>(0);
  const isAutoScanActiveRef = useRef<boolean>(false);
  
  // Audio
  const audioCtxRef = useRef<any>(null);

  // Helper: Play Beep
  const playBeep = async (type: 'success' | 'error' = 'success') => {
    try {
      const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new AC();
      const ctx = audioCtxRef.current as AudioContext;
      if (ctx.state === 'suspended') { try { await ctx.resume(); } catch {} }
      
      const playTone = (freq: number, dur: number, g: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(g, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur - 0.02);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + dur);
      };

      if (type === 'success') {
        playTone(1200, 0.2, 0.2);
      } else {
        playTone(400, 0.3, 0.3);
        setTimeout(() => playTone(400, 0.3, 0.3), 350);
      }
    } catch {}
  };

  // Helper: Video Devices
  const loadVideoDevices = async () => {
    try {
      let devices = await navigator.mediaDevices.enumerateDevices();
      devices = devices.filter(d => d.kind === 'videoinput');
      if ((!devices || devices.length === 0) && BrowserMultiFormatReader) {
        try {
          const zxList = await BrowserMultiFormatReader.listVideoInputDevices();
          devices = zxList as any;
        } catch {}
      }
      setVideoDevices(devices as any);
      if (!cameraDeviceId && devices && devices.length > 0) {
        const kw = cameraFacing === 'environment' ? ['back', 'rear', 'environment'] : ['front', 'user'];
        const found = devices.find(d => (d.label || '').toLowerCase().split(/\s|,/).some(w => kw.includes(w)));
        setCameraDeviceId((found?.deviceId || devices[0]?.deviceId || null) as any);
      }
    } catch {}
  };

  const buildVideoConstraints = () => {
    const base: any = { video: { width: { ideal: 1280 }, height: { ideal: 720 } } };
    if (cameraDeviceId) base.video.deviceId = { exact: cameraDeviceId };
    else base.video.facingMode = cameraFacing;
    return base;
  };

  // Logic: Handle Scan/Token
  const handleScanToken = async (tokenRaw: string, directStudentData: any = null) => {
    try {
      const t = tokenRaw.trim();
      if (t.length < minIdLength) return;
      
      let found: any = directStudentData;

      // Only resolve if directStudentData is not provided
      if (!found) {
        // Resolve Siswa
        const candidates = [t, t.toUpperCase(), t.replace(/[^A-Za-z0-9]/g, '')];
        for (const cand of candidates) {
            const res = await siswaApi.getAll({ 
                        search: cand, 
                        limit: 5,
                        search_fields: ['id', 'nama_siswa', 'no_rfid'],
                        context: 'elevated'
                        } as any);
            const list = res.data || [];
            
            // 1. Exact ID/RFID/NIS match
            const exact = list.find((s: any) => s.id === cand || String(s.nis || '').toUpperCase() === cand.toUpperCase() || String(s.no_rfid || '').toUpperCase() === cand.toUpperCase());
            if (exact) {
            found = exact;
            break;
            }

            // 2. Unique result fallback (allows Name search if unique)
            if (list.length === 1) {
            found = list[0];
            break;
            }
        }
      }

      if (!found?.id) {
        error('Siswa tidak ditemukan');
        setHidToken('');
        return;
      }

      if (found.status && found.status !== 'AKTIF') {
        error('Siswa sudah tidak aktif / mutasi');
        setHidToken('');
        return;
      }

      // Bypass Mode Logic
      if (isBypassMode) {
        const res = await bypassLate({
          siswa_id: found.id,
          note: 'Bypass Mode (Toggle)'
        });
        
        if (res.success) {
          success(`BYPASS BERHASIL: ${found.nama_siswa}`);
          await playBeep('success');
          setHidToken('');
          await refreshStats();
          onTapSuccess?.();
          onTapSuccessMetadata?.({ name: found.nama_siswa || found.nis || found.id });
        } else {
          error(`Bypass Gagal: ${res.message}`);
          setHidToken('');
        }
        return;
      }

      const tapRes: any = await submitTap({ siswa_id: found.id, arah: inputDirection, device_id: '', rfid: '' });
      const msg = String(tapRes?.message || '');
      
      if ((tapRes?.data && tapRes?.data?.duplicate_detected) || msg.toLowerCase().includes('sudah')) {
        const nameLabel = found.nama_siswa || found.nis || found.id;
        notice(`${nameLabel} Sudah Terekam`, { duration: 8000 });
        setHidToken('');
        onTapSuccess?.();
      } else {
        const nameLabel = found.nama_siswa || found.nis || found.id;
        success(nameLabel, { duration: 8000 });
        onTapSuccessMetadata?.({ name: nameLabel });
        await playBeep('success');
        setHidToken('');
        await refreshStats();
        onTapSuccess?.();
      }
    } catch (e: any) {
      const m = e?.response?.data?.message || e?.message || 'Gagal mencatat tap';
      error(String(m));
      setHidToken('');
    }
  };

  const autoSubmitGateHID = async (tokenRaw: string) => {
    const token = tokenRaw.trim();
    if (hidTimerRef.current) window.clearTimeout(hidTimerRef.current);
    if (!token) return;
    const t = window.setTimeout(async () => {
      if (token.length < minIdLength) return;
      await handleScanToken(token);
    }, 250);
    hidTimerRef.current = t;
  };

  // Logic: Search Dropdown (Debounce)
  const [searchCandidates, setSearchCandidates] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const debouncedHidToken = useDebounce(hidToken, 300);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const search = async () => {
      // Don't search if token is empty or looks like a quick scan (handled by autoSubmit)
      // Actually, let's just search if length > 1 to allow typing names
      if (!debouncedHidToken || debouncedHidToken.length < 2) {
        setSearchCandidates([]);
        setShowDropdown(false);
        return;
      }
      
      try {
        const res = await siswaApi.getAll({ 
            search: debouncedHidToken, 
            limit: 5,
            search_fields: ['id', 'nama_siswa', 'no_rfid', 'nis'],
            context: 'elevated'
        } as any);
        const list = (res.data || []).filter((s: any) => s.status === 'AKTIF');
        // Only show dropdown if we have results
        // And maybe exclude if it's an exact unique match that auto-submit would handle?
        // But visual feedback is good.
        setSearchCandidates(list);
        setShowDropdown(list.length > 0);
      } catch {
        setSearchCandidates([]);
        setShowDropdown(false);
      }
    };
    search();
  }, [debouncedHidToken]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Logic: Scanner
  const startScanner = async () => {
    try {
      const BarcodeDetectorCtor = (window as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => any }).BarcodeDetector;
      if (BarcodeDetectorCtor) {
        const formats = ['qr_code', 'code_128', 'ean_13', 'code_39', 'upc_a', 'data_matrix', 'pdf417'];
        detectorRef.current = new BarcodeDetectorCtor({ formats });
        await loadVideoDevices();
        const constraints = buildVideoConstraints();
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (videoRef.current) {
          (videoRef.current as any).srcObject = stream;
          await (videoRef.current as any).play();
        }
        scannerRunningRef.current = true;
        setScannerStatus('Scanner aktif');
        const loop = async () => {
          if (!scannerRunningRef.current) return;
          try {
            const videoEl = videoRef.current as HTMLVideoElement;
            const det = detectorRef.current;
            if (videoEl && det) {
              const results = await det.detect(videoEl);
              const raw = results && results[0] && (results[0].rawValue || results[0].rawValue);
              const token = typeof raw === 'string' ? raw.trim() : '';
              if (token) {
                const now = Date.now();
                if (!(token === lastScanTokenRef.current && now - lastScanTimeRef.current < 1500)) {
                  await handleScanToken(token);
                  lastScanTokenRef.current = token;
                  lastScanTimeRef.current = now;
                }
              }
            }
          } catch {}
          if (scannerRunningRef.current) requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
      } else {
        await loadVideoDevices();
        const devId = cameraDeviceId || undefined;
        if (!devId) {
            // fallback
        }
        zxingReaderRef.current = new BrowserMultiFormatReader();
        scannerRunningRef.current = true;
        setScannerStatus('Scanner aktif');
        await zxingReaderRef.current.decodeFromVideoDevice(devId, videoRef.current as HTMLVideoElement, async (result: any) => {
          if (!scannerRunningRef.current) return;
          const token = result && typeof result.getText === 'function' ? String(result.getText()).trim() : '';
          if (token) {
            const now = Date.now();
            if (!(token === lastScanTokenRef.current && now - lastScanTimeRef.current < 1500)) {
              await handleScanToken(token);
              lastScanTokenRef.current = token;
              lastScanTimeRef.current = now;
            }
          }
        });
      }
    } catch (e: any) {
      const msg = e?.message || 'Gagal memulai scanner';
      setScannerStatus(String(msg));
    }
  };

  const stopScanner = async () => {
    try {
      scannerRunningRef.current = false;
      setScannerStatus('');
      try {
        const videoEl = videoRef.current as any;
        const stream: MediaStream | null = videoEl?.srcObject || null;
        if (stream) {
          stream.getTracks().forEach(t => t.stop());
          if (videoEl) videoEl.srcObject = null;
        }
      } catch {}
      try { if (zxingReaderRef.current) await zxingReaderRef.current?.reset?.(); } catch {}
    } catch {}
  };

  // Logic: Face
  const startFacePreview = async () => {
    try {
      await loadVideoDevices();
      const constraints = buildVideoConstraints();
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        (videoRef.current as any).srcObject = stream;
        await (videoRef.current as any).play();
      }
      setScannerStatus('Kamera aktif');
    } catch (e: any) {
      const msg = e?.message || 'Gagal mengaktifkan kamera';
      setScannerStatus(String(msg));
    }
  };

  const stopFacePreview = async () => {
    try {
      if (hudRequestRef.current) cancelAnimationFrame(hudRequestRef.current);
      const videoEl = videoRef.current as any;
      const stream: MediaStream | null = videoEl?.srcObject || null;
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
        if (videoEl) videoEl.srcObject = null;
      }
      setScannerStatus('');
      setCurrentDetections(null);
    } catch {}
  };

  const captureFaceSnapshot = (): string | null => {
    try {
      const videoEl = videoRef.current as HTMLVideoElement | null;
      if (!videoEl) return null;
      const canvas = document.createElement('canvas');
      canvas.width = videoEl.videoWidth || 1280;
      canvas.height = videoEl.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.92);
    } catch {
      return null;
    }
  };

  const [isIdentifying, setIsIdentifying] = useState(false);
  const lastAutoScannedRef = useRef<{ id: string, time: number } | null>(null);

  const performAutoScan = useCallback(async (forcedDescriptor?: number[]) => {
    if (!isAutoScanActive || isProcessingAutoScanRef.current || inputTab !== 'FACE') return;
    
    // Auto-clear identification card after 3s
    if (lastVerification && Date.now() - (lastVerification.timestamp || 0) > 3000) {
        setLastVerification(null);
        setLastIdentifiedStudent(null);
    }

    const img = captureFaceSnapshot();
    if (!img) {
      autoScanTimerRef.current = setTimeout(() => performAutoScan(), 2000);
      return;
    }
    // --- AI FACE DESCRIPTOR EXTRACTION (PURE BROWSER AI) ---
    let descriptor: number[] | undefined = forcedDescriptor;
    
    // If no descriptor passed from HUD loop, extract it here (legacy/manual trigger fallback)
    if (!descriptor && videoRef.current) {
      if (!faceModelsLoaded) {
          autoScanTimerRef.current = setTimeout(() => performAutoScan(), 2000);
          return;
      }
      
      const detections = await faceapi.detectSingleFace(
          videoRef.current as any, 
          new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.45 })
      ).withFaceLandmarks().withFaceDescriptor();

      if (!detections) {
        autoScanTimerRef.current = setTimeout(() => performAutoScan(), 1000);
        return;
      }
      
      descriptor = Array.from(detections.descriptor);
    }

    try {
      isProcessingAutoScanRef.current = true;
      setIsIdentifying(true);

      const res = await verifyFaceTap({ 
        arah: inputDirection, 
        image_base64: img,
        embedding: descriptor 
      });
      const msg = String(res?.message || '');
      
      const score = (res as any)?.data?.verification_score || (res as any)?.details?.score;
      const threshold = (res as any)?.data?.verification_threshold || (res as any)?.details?.threshold;
      
      const data = (res as any).data;
      const identifiedId = data?.siswa_id || data?.id || data?.siswa_info?.id || data?.existing_record?.siswa_id;

      // COOLDOWN LOGIC: Prevent re-scanning same person too quickly (10 sec)
      if (res?.success && identifiedId && lastAutoScannedRef.current && lastAutoScannedRef.current?.id === identifiedId) {
          const elapsed = Date.now() - lastAutoScannedRef.current.time;
          if (elapsed < 10000) {
              // Just continue loop without re-triggering cards/beeps
              return;
          }
      }

      setLastVerification({
        success: res?.success || false,
        duplicate: (res as any).data?.duplicate_detected || false,
        score,
        threshold,
        message: msg,
        timestamp: Date.now()
      });

      const isDup = (res as any).data?.duplicate_detected || false;

      if (res?.success && res.data && !isDup) {
        // --- FRESH RECORD SUCCESS ---
        setLastIdentifiedStudent(res.data);
        lastAutoScannedRef.current = { id: identifiedId, time: Date.now() };
        
        const data = (res as any).data;
        const studentInfo = (data as any)?.siswa_info || (data as any)?.existing_record?.Siswa;
        const nameLabel = studentInfo?.nama || studentInfo?.nama_siswa || (data as any)?.nama_siswa || 'Siswa';
        success(`Halo, ${nameLabel}!`, { duration: 2500 });
        await playBeep('success');
        await refreshStats();
        onTapSuccess?.();
        onTapSuccessMetadata?.({ name: (res.data as any).nama_siswa || 'Siswa' });
      } else if (res?.success && isDup) {
        // --- ALREADY RECORDED (DUPLICATE) ---
        setLastIdentifiedStudent((res as any).data);
        lastAutoScannedRef.current = { id: identifiedId, time: Date.now() };
        notice('Siswa sudah terekam', { duration: 2500 });
      } else {
        // --- ERROR / NOT RECOGNIZED ---
        await playBeep('error');
        setLastIdentifiedStudent(null);
      }
    } catch (e) {
      console.error('AutoScan error', e);
    } finally {
      setIsIdentifying(false);
      isProcessingAutoScanRef.current = false;
      if (isAutoScanActive) {
        autoScanTimerRef.current = setTimeout(() => performAutoScan(), 2000); // Faster interval for responsiveness
      }
    }
  }, [isAutoScanActive, inputDirection, inputTab, lastVerification, refreshStats, onTapSuccess, faceModelsLoaded, captureFaceSnapshot, verifyFaceTap, playBeep, success, notice, error]);

  const hudDetectionLoop = useCallback(async () => {
    if (!videoRef.current || !faceModelsLoaded || inputTab !== 'FACE') return;

    const video = videoRef.current;
    const sizes = { width: video.videoWidth, height: video.videoHeight };

    if (sizes.width === 0) {
      hudRequestRef.current = requestAnimationFrame(hudDetectionLoop);
      return;
    }

    if (displaySize.width !== sizes.width) setDisplaySize(sizes);

    const detections = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.45 }))
      .withFaceLandmarks()
      .withFaceDescriptor(); // Added Descriptor here for optimization
      
    // Helper within loop since useMemo in HUD can't be accessed here directly
    const calculatePoseHeuristics = (det: any, size: any) => {
        if (!det?.landmarks) return null;
        const pts = det.landmarks.positions;
        const nose = pts[27];
        const jawL = pts[0];
        const jawR = pts[16];
        const dL = Math.sqrt(Math.pow(nose.x - jawL.x, 2) + Math.pow(nose.y - jawL.y, 2));
        const dR = Math.sqrt(Math.pow(jawR.x - nose.x, 2) + Math.pow(jawR.y - nose.y, 2));
        const yaw = dL / dR;
        const chin = pts[8];
        const dTop = Math.sqrt(Math.pow(pts[33].y - pts[27].y, 2));
        const dBottom = Math.sqrt(Math.pow(chin.y - pts[33].y, 2));
        const pitch = dTop / dBottom;
        
        // Face detection confidence score
        const faceScore = det.detection?.score || 0;
        
        // DYNAMIC WALK-THROUGH LOGIC:
        // isStable now ONLY requires a very high AI face confidence (>= 0.80).
        // It ignores angles (pitch/yaw) so users don't have to pause and look straight.
        const isStable = faceScore >= 0.80;
        return { isStable };
    };

    if (detections) {
      const resized = faceapi.resizeResults(detections, sizes);
      setCurrentDetections(resized);
      
      // Smart Auto-Trigger Intelligence (Dynamic Walk-Through)
      if (isAutoScanActive && !isIdentifying && !isProcessingAutoScanRef.current) {
         const hudStats = calculatePoseHeuristics(resized, sizes);
         
         // ZERO-DELAY TRIGGER: No need to wait for frames if we have high confidence
         if (hudStats?.isStable) {
            // Instantly extract descriptor and shoot to backend to prevent motion blur miss
            const descriptor = detections.descriptor ? Array.from((detections as any).descriptor) : undefined;
            performAutoScan(descriptor as any);
         }
      }
    } else {
      setCurrentDetections(null);
      stabilityCounterRef.current = 0;
    }

    hudRequestRef.current = requestAnimationFrame(hudDetectionLoop);
  }, [faceModelsLoaded, inputTab, displaySize.width, performAutoScan, isAutoScanActive, isIdentifying]);

  useEffect(() => {
    if (inputTab === 'FACE' && faceModelsLoaded) {
      hudRequestRef.current = requestAnimationFrame(hudDetectionLoop);
    }
    return () => {
      if (hudRequestRef.current) cancelAnimationFrame(hudRequestRef.current);
    };
  }, [inputTab, faceModelsLoaded, hudDetectionLoop]);

  const resolveSiswaForFace = async (): Promise<any> => {
    if (selectedFaceSiswaId) return { id: selectedFaceSiswaId };
    
    const t = (faceSiswaId || '').trim();
    if (!t) return null;

    const candidates = [t, t.toUpperCase(), t.replace(/[^A-Za-z0-9]/g, '')];
    for (const cand of candidates) {
        try {
            const res = await siswaApi.getAll({ 
                search: cand, 
                limit: 5,
                search_fields: ['id', 'nama_siswa', 'no_rfid'],
                context: 'elevated'
            } as any);
            const list = res.data || [];
            
            const exact = list.find((s: any) => s.id === cand || String(s.nis || '').toUpperCase() === cand.toUpperCase() || String(s.no_rfid || '').toUpperCase() === cand.toUpperCase());
            if (exact) return exact;
            
            if (list.length === 1) return list[0];
        } catch {}
    }
    return null;
  };

  const handleFaceVerifyTap = async () => {
    try {
      const siswa = await resolveSiswaForFace();
      if (!siswa?.id) { error('Siswa tidak ditemukan / ID tidak valid'); return; }
      const siswaId = siswa.id;

      const img = captureFaceSnapshot();
      if (!img) { error('Gagal mengambil foto dari kamera'); return; }
      
      // --- AI FACE DESCRIPTOR EXTRACTION (PURE BROWSER AI) ---
      let descriptor: number[] | undefined = undefined;
      if (videoRef.current) {
        if (!faceModelsLoaded) {
            error('Sistem AI Browser sedang memuat... Mohon tunggu.');
            return;
        }
        
        // Full detection with landmarks and descriptor
        const detections = await faceapi.detectSingleFace(
          videoRef.current as any, 
          new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.3 })
        ).withFaceLandmarks().withFaceDescriptor();
        
        if (!detections) {
          error('Wajah tidak terdeteksi! Mohon posisikan wajah di depan kamera.');
          return;
        }
        
        // Convert Float32Array to regular array for JSON serialization
        descriptor = Array.from(detections.descriptor);
      }

      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 400);

      setTapSubmitting(true);
      const res = await verifyFaceTap({ 
        siswa_id: siswaId, 
        arah: inputDirection, 
        image_base64: img,
        embedding: descriptor 
      });
      const msg = String(res?.message || '');
      
      const score = (res as any)?.data?.verification_score || (res as any)?.details?.score;
      const threshold = (res as any)?.data?.verification_threshold || (res as any)?.details?.threshold;

      setLastVerification({
        success: res?.success || false,
        duplicate: (res as any).data?.duplicate_detected || false,
        score,
        threshold,
        message: msg,
        timestamp: Date.now()
      });

      if (res?.success) {
        setLastIdentifiedStudent(res.data);
        const nameLabel = (res?.data as any)?.siswa_info?.nama || (res?.data as any)?.nama_siswa || res?.data?.siswa_id || 'Siswa';
        success(`Halo, ${nameLabel}!`, { duration: 3000 });
        await playBeep('success');
        setFaceSiswaId('');
        setSelectedFaceSiswaId('');
        await refreshStats();
        onTapSuccess?.();
        onTapSuccessMetadata?.({ name: nameLabel });
      } else {
        await playBeep('error');
        if (msg.toLowerCase().includes('sudah')) {
          setLastIdentifiedStudent(res?.data);
          notice('Siswa sudah terekam', { duration: 8000 });
        } else {
          setLastIdentifiedStudent(null);
          error(msg || 'Verifikasi wajah gagal');
        }
      }
    } catch (e: any) {
      const m = e?.response?.data?.message || e?.message || 'Verifikasi wajah gagal';
      error(String(m));
    } finally {
      setTapSubmitting(false);
    }
  };

  // Logic: Face Enrollment & Other Manuals...

  useEffect(() => {
    if (isAutoScanActive && inputTab === 'FACE') {
      autoScanTimerRef.current = setTimeout(performAutoScan, 1000);
    } else {
      if (autoScanTimerRef.current) clearTimeout(autoScanTimerRef.current);
    }
    return () => { if (autoScanTimerRef.current) clearTimeout(autoScanTimerRef.current); };
  }, [isAutoScanActive, inputTab, performAutoScan]);

  const handleFaceEnroll = async () => {
    try {
      const siswa = await resolveSiswaForFace();
      if (!siswa?.id) { error('Siswa tidak ditemukan / ID tidak valid'); return; }
      const siswaId = siswa.id;

      const img = captureFaceSnapshot();
      if (!img) { error('Gagal mengambil foto dari kamera'); return; }
      
      // --- AI FACE DESCRIPTOR EXTRACTION (PURE BROWSER AI) ---
      let descriptor: number[] | undefined = undefined;
      if (videoRef.current) {
        if (!faceModelsLoaded) {
            error('Sistem AI Browser sedang memuat... Mohon tunggu.');
            return;
        }

        const detections = await faceapi.detectSingleFace(
            videoRef.current as any, 
            new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.3 })
        ).withFaceLandmarks().withFaceDescriptor();

        if (!detections) {
          error('Wajah tidak terdeteksi! Mohon posisikan wajah agar terlihat jelas.');
          return;
        }
        
        descriptor = Array.from(detections.descriptor);
      }

      setEnrollSubmitting(true);
      const res = await enrollFaceTemplate({ 
        siswa_id: siswaId, 
        image_base64: img,
        embedding: descriptor 
      });
      const msg = String(res?.message || '');
      if (res?.success) {
        success('Template wajah terekam', { duration: 6000 });
        await playBeep('success');
      } else {
        error(msg || 'Perekaman wajah gagal');
      }
    } catch (e: any) {
      const m = e?.response?.data?.message || e?.message || 'Perekaman wajah gagal';
      error(String(m));
    } finally {
      setEnrollSubmitting(false);
    }
  };

  useEffect(() => {
    setLastVerification(null);
    setLastIdentifiedStudent(null);
    if (inputTab === 'QR') {
      startScanner();
    } else {
      stopScanner();
      if (inputTab === 'FACE') startFacePreview();
      else stopFacePreview();
    }
    return () => { stopScanner(); stopFacePreview(); };
  }, [inputTab, cameraFacing, cameraDeviceId]);



  const content = (
    <div className={`space-y-6 ${minimal ? 'p-0' : 'p-0'}`}>
      {!minimal && (
        <div className="flex flex-col gap-6">
            {/* 1. Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Direction Toggle */}
                <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-lg self-start w-full md:w-auto">
                    <button
                        onClick={() => handleDirectionChange('GERBANG_DATANG')}
                        className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-bold transition-all ${
                            inputDirection === 'GERBANG_DATANG'
                                ? 'bg-white dark:bg-gray-700 text-green-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                        }`}
                    >
                        MASUK
                    </button>
                    <button
                        onClick={() => handleDirectionChange('GERBANG_PULANG')}
                        className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-bold transition-all ${
                            inputDirection === 'GERBANG_PULANG'
                                ? 'bg-white dark:bg-gray-700 text-red-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                        }`}
                    >
                        PULANG
                    </button>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-center md:justify-end gap-6 md:gap-3 w-full md:w-auto bg-gray-50 dark:bg-gray-800/50 md:bg-transparent p-3 md:p-0 rounded-lg">
                    <div className="flex flex-col items-center md:items-end">
                        <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Hadir</span>
                        <span className="text-2xl font-bold text-green-600 leading-none">{miniStats.masuk}</span>
                    </div>
                    <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1"></div>
                    <div className="flex flex-col items-center md:items-start">
                        <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Pulang</span>
                        <span className="text-2xl font-bold text-red-600 leading-none">{miniStats.keluar}</span>
                    </div>
                </div>
            </div>

            {/* 2. Status Hero Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden relative">
                {/* Status Indicator Background Stripe */}
                <div className={`h-1.5 w-full ${
                    timeStatus?.status === 'TERLAMBAT' ? 'bg-red-500' : 'bg-green-500'
                }`} />
                
                <div className="p-3 md:p-5 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
                    {/* Clock & Status */}
                    <div className="flex items-center gap-3 md:gap-6 w-full md:w-auto justify-between md:justify-start">
                        <div className="text-left">
                            <div className="text-3xl md:text-4xl font-black tracking-tight text-gray-900 dark:text-white font-mono">
                                {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                <span className="text-sm md:text-lg text-gray-400 ml-1 font-normal">
                                    {currentTime.toLocaleTimeString('id-ID', { second: '2-digit' })}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs md:text-sm text-gray-500">
                                {tenantConfig ? (
                                    <>
                                        {inputDirection === 'GERBANG_DATANG' ? (
                                            <>
                                                <span>Masuk: <strong>{tenantConfig.jamMasuk}</strong></span>
                                                <span className="text-gray-300">•</span>
                                                <span>Tol: <strong>{tenantConfig.toleransi}m</strong></span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Pulang: <strong>{tenantConfig.jamPulang}</strong></span>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <span className="flex items-center gap-1 animate-pulse">
                                        <RefreshCw size={12} /> Memuat konfigurasi...
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Large Status Badge */}
                        {timeStatus && (
                            <div className={`px-3 py-1.5 md:px-5 md:py-2 rounded-lg border-l-4 flex flex-col items-end md:items-start justify-center ${
                                timeStatus.status === 'TERLAMBAT' 
                                    ? 'bg-red-50 border-red-500 text-red-700 dark:bg-red-900/20' 
                                    : 'bg-green-50 border-green-500 text-green-700 dark:bg-green-900/20'
                            }`}>
                                <span className="text-[10px] md:text-xs font-bold opacity-70 uppercase tracking-wide">Status Absensi</span>
                                <div className="flex items-center md:items-baseline gap-1.5 md:gap-2">
                                    <span className="text-base md:text-lg font-black tracking-tight">
                                        {timeStatus.status === 'TERLAMBAT' ? 'TERLAMBAT' : 'TEPAT WAKTU'}
                                    </span>
                                    {timeStatus.status === 'TERLAMBAT' && (
                                        <span className="text-xs md:text-sm font-bold bg-red-200 dark:bg-red-800 px-1 rounded text-red-800 dark:text-red-200">
                                            +{timeStatus.lateMinutes}m
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start border-t md:border-t-0 md:border-l pt-3 md:pt-0 pl-0 md:pl-6 border-gray-100 dark:border-gray-700">
                         <div className="flex flex-col items-end gap-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Mode Bypass</label>
                            <Switch 
                                checked={isBypassMode} 
                                onCheckedChange={setIsBypassMode} 
                                className={isBypassMode ? "bg-amber-500" : ""}
                            />
                        </div>
                         <button onClick={fetchTenantConfig} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 transition-colors" title="Refresh Config">
                            <RefreshCw size={18} />
                        </button>
                    </div>
                </div>
                
                {/* Bypass Active Banner */}
                {isBypassMode && (
                    <div className="bg-amber-50 dark:bg-amber-900/30 border-t border-amber-200 dark:border-amber-800 px-4 py-1.5 flex items-center justify-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400 animate-in slide-in-from-top-2">
                        <ShieldAlert size={14} />
                        MODE BYPASS AKTIF: Semua scan akan dicatat sebagai HADIR (Tepat Waktu) secara manual.
                    </div>
                )}
            </div>
        </div>
      )}

      {/* 3. Input Panel */}
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-visible transition-all duration-300 ${isBypassMode ? 'ring-2 ring-amber-400 border-transparent' : ''}`}>
         {/* Tabs */}
         <div className="flex border-b border-gray-100 dark:border-gray-700">
            {[
                { id: 'HID', label: '⌨️ Key/RFID', desktopLabel: '⌨️ Keyboard / RFID' },
                { id: 'QR', label: '📷 QR', desktopLabel: '📷 Scan QR' },
                { id: 'FACE', label: '👤 Wajah', desktopLabel: '👤 Wajah' }
            ].map((tab, index) => (
                <button
                    key={tab.id}
                    onClick={() => setInputTab(tab.id as any)}
                    className={`flex-1 py-3 text-xs md:text-sm font-medium transition-colors relative ${
                        index === 0 ? 'rounded-tl-xl' : ''
                    } ${
                        index === 2 ? 'rounded-tr-xl' : ''
                    } ${
                        inputTab === tab.id
                            ? 'text-blue-600 bg-blue-50/50 dark:text-blue-400 dark:bg-blue-900/10'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'
                    }`}
                >
                    <span className="md:hidden">{tab.label}</span>
                    <span className="hidden md:inline">{tab.desktopLabel}</span>
                    {inputTab === tab.id && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400" />
                    )}
                </button>
            ))}
         </div>
         
         <div className="p-4 md:p-6">
             <div className="max-w-2xl mx-auto">
                 {inputTab === 'HID' && (
                     <div className="flex flex-col gap-4">
                         <div className="relative group" ref={searchContainerRef}>
                            <div className="absolute inset-y-0 left-0 pl-3 md:pl-4 flex items-center pointer-events-none">
                                <span className="text-gray-400">
                                    {isBypassMode ? <ShieldAlert size={20} className="text-amber-500" /> : <div className="i-lucide-scan-line w-5 h-5" />}
                                </span>
                            </div>
                            <input
                                autoFocus
                                value={hidToken}
                                onChange={e => {
                                    setHidToken(e.target.value);
                                    autoSubmitGateHID(e.target.value);
                                }}
                                className={`w-full pl-10 md:pl-11 pr-4 py-2.5 md:py-4 text-base md:text-lg font-mono rounded-lg border-2 focus:ring-4 transition-all outline-none ${
                                    isBypassMode 
                                    ? 'border-amber-300 focus:border-amber-500 focus:ring-amber-500/20 bg-amber-50/30' 
                                    : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 bg-gray-50 focus:bg-white'
                                }`}
                                placeholder={isBypassMode ? "Scan Kartu / Input ID..." : "Scan Kartu / NIS..."}
                            />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                <span className="hidden md:inline text-xs text-gray-400 border border-gray-200 rounded px-1.5 py-0.5 bg-white">Auto-Submit</span>
                            </div>

                            {/* Search Dropdown */}
                            {showDropdown && searchCandidates.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden max-h-60 overflow-y-auto">
                                    {searchCandidates.map((student) => (
                                        <button
                                            key={student.id}
                                            onClick={() => {
                                                const token = student.no_rfid || student.nis || student.id;
                                                setHidToken(token);
                                                handleScanToken(token, student);
                                                setShowDropdown(false);
                                            }}
                                            className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0 flex items-center justify-between group/item"
                                        >
                                            <div>
                                                <div className="font-bold text-gray-900 dark:text-gray-100">
                                                    {student.nama_siswa}
                                                </div>
                                                <div className="text-xs text-gray-500 flex gap-2 mt-0.5">
                                                    {student.nis && <span className="bg-gray-100 dark:bg-gray-700 px-1.5 rounded">NIS: {student.nis}</span>}
                                                    {student.no_rfid && <span className="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 px-1.5 rounded">RFID</span>}
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-400 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                Pilih
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                         </div>
                         <div className="flex justify-end">
                             <Button 
                                variant={isBypassMode ? "warning" : "primary"} 
                                size="lg" 
                                onClick={() => handleScanToken(hidToken)}
                                disabled={!hidToken}
                                className="w-full md:w-auto px-8"
                            >
                                {isBypassMode ? 'PROSES BYPASS' : 'KIRIM ABSENSI'}
                             </Button>
                         </div>
                     </div>
                 )}
                 {/* Keep QR and FACE as is, just wrapped in the cleaner container */}
                 {inputTab === 'QR' && (
                     <div className="flex flex-col items-center gap-4">
                        <div className="relative overflow-hidden rounded-lg bg-black w-full aspect-video max-w-lg shadow-inner ring-1 ring-gray-900/10">
                             <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                             <div className="absolute inset-0 border-2 border-white/30 pointer-events-none">
                                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white/80 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
                             </div>
                             <div className="absolute bottom-4 left-0 w-full text-center text-white text-sm font-medium drop-shadow-md">
                                 {scannerStatus}
                             </div>
                        </div>
                        <div className="flex gap-2">
                             <Button variant="outline" size="sm" onClick={() => setCameraFacing(prev => prev === 'user' ? 'environment' : 'user')}>
                                 Switch Camera
                             </Button>
                        </div>
                     </div>
                 )}
                 {inputTab === 'FACE' && (
                                      <div className="flex flex-col gap-4">
                                          {/* Mode Selection */}
                                          <div className="flex flex-col md:flex-row gap-4">
                                              <div className="flex-1 flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                                                  <div className="flex items-center gap-2">
                                                      <div className={`w-3 h-3 rounded-full ${isAutoScanActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                                                      <span className="text-sm font-bold text-blue-800 dark:text-blue-300">Auto-Scan (Standby Mode)</span>
                                                  </div>
                                                  <Switch 
                                                      checked={isAutoScanActive} 
                                                      onCheckedChange={(val) => {
                                                          setIsAutoScanActive(val);
                                                          if (val) {
                                                              setFaceSiswaId('');
                                                              setSelectedFaceSiswaId('');
                                                          }
                                                      }} 
                                                  />
                                              </div>
                                              {!isAutoScanActive && (
                                                  <div className="flex-1 pb-60">
                                                      <SmartStudentPicker
                                                          value={faceSiswaId}
                                                          onChange={setFaceSiswaId}
                                                          onSelect={(s: Student) => {
                                                              setSelectedFaceSiswaId(s.id);
                                                              setFaceSiswaId(s.nama_siswa || '');
                                                          }}
                                                          scope="global"
                                                          placeholder="Scan 1:1: Cari siswa..."
                                                      />
                                                  </div>
                                              )}
                                          </div>

                                          {/* Camera Preview */}
                                          <div className="relative overflow-hidden rounded-xl bg-black w-full aspect-[4/3] shadow-2xl group border-4 border-gray-100 dark:border-gray-800">
                                              <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" muted playsInline />
                                              <BiometricHudOverlay 
                                                  detections={currentDetections} 
                                                  displaySize={displaySize} 
                                                  isGathering={isIdentifying}
                                              />
                                              
                                              {/* Flash Overlay */}
                                              {isFlashing && <div className="absolute inset-0 z-10 flash-overlay pointer-events-none" />}

                                              {/* Scanning Indicators */}
                                              {isAutoScanActive && (
                                                  <div className="absolute top-4 left-4 z-20 flex flex-col gap-1 items-start">
                                                      <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 animate-in fade-in zoom-in duration-500">
                                                          <div className="w-2 h-2 rounded-full bg-green-500 animate-ping"></div>
                                                          <span className="text-[10px] font-black text-white tracking-widest uppercase">Autonomous Scanning Active</span>
                                                      </div>
                                                      <div className="flex items-center gap-1.5 bg-blue-600/60 backdrop-blur-md px-2 py-1 rounded-full border border-blue-400/30 ml-2">
                                                          <div className="i-lucide-cpu w-3 h-3 text-blue-200" />
                                                          <span className="text-[9px] font-bold text-blue-100 uppercase">Browser AI Enabled</span>
                                                      </div>
                                                  </div>
                                              )}

                                              {/* SCREEN EDGE GLOW (Secondary Feedback) */}
                                              {lastVerification && (Date.now() - (lastVerification.timestamp || 0) < 3000) && (
                                                  <div className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-500 ring-[12px] ring-inset animate-edge-glow ${
                                                      lastVerification.success ? 'ring-green-500/60' : 'ring-red-500/60'
                                                  }`} />
                                              )}

                                              {/* PROMINENT IDENTIFIED STUDENT SUCCESS/FAIL CARD */}
                                              {lastVerification && (Date.now() - (lastVerification.timestamp || 0) < 5000) && (
                                                  <div className="absolute inset-x-0 bottom-6 z-50 px-6 animate-spring-up overflow-hidden">
                                                      <div className={`backdrop-blur-3xl border-2 p-6 rounded-3xl shadow-[0_30px_70px_rgba(0,0,0,0.6)] flex flex-col items-center gap-4 text-center transition-all ${
                                                          lastVerification.duplicate ? 'bg-amber-600/40 border-amber-400/50' : lastVerification.success ? 'bg-green-600/40 border-green-400/50' : 'bg-red-600/40 border-red-400/50'
                                                      }`}>
                                                          {/* Large Avatar / Status Icon */}
                                                          <div className="relative">
                                                              <div className={`w-28 h-28 rounded-full border-4 flex items-center justify-center overflow-hidden shadow-2xl transition-transform duration-500 transform hover:scale-105 ${
                                                                  lastVerification.duplicate ? 'border-amber-400 bg-amber-500' : lastVerification.success ? 'border-green-400 bg-green-500' : 'border-red-400 bg-red-500'
                                                              }`}>
                                                                  {lastVerification.success && lastIdentifiedStudent?.siswa_info?.foto_url ? (
                                                                      <img 
                                                                          src={lastIdentifiedStudent.siswa_info.foto_url} 
                                                                          alt="Siswa" 
                                                                          className="w-full h-full object-cover"
                                                                          onError={(e: any) => e.target.style.display = 'none'}
                                                                      />
                                                                  ) : (
                                                                      <div className={`${lastVerification.success ? 'i-lucide-user' : 'i-lucide-user-minus'} w-14 h-14 text-white opacity-80`} />
                                                                  )}
                                                              </div>
                                                              {/* Status Mini-Badge */}
                                                              <div className={`absolute -bottom-1 -right-1 w-10 h-10 rounded-full border-4 border-black/40 flex items-center justify-center shadow-lg ${
                                                                  lastVerification.duplicate ? 'bg-amber-500' : lastVerification.success ? 'bg-green-500' : 'bg-red-500'
                                                              }`}>
                                                                  {lastVerification.success ? (
                                                                      <div className="i-lucide-check w-5 h-5 text-white stroke-[4]" />
                                                                  ) : (
                                                                      <div className="i-lucide-x w-5 h-5 text-white stroke-[4]" />
                                                                  )}
                                                              </div>
                                                          </div>

                                                          <div className="space-y-1">
                                                              {/* Personal Greeting */}
                                                              <h3 className="text-white font-black text-2xl uppercase tracking-tighter leading-none">
                                                                  {lastVerification.duplicate ? 'SUDAH TERREKAM' : lastVerification.success ? (inputDirection === 'GERBANG_DATANG' ? 'Selamat Belajar!' : 'Hati-hati di Jalan!') : 'Wajah Tidak Dikenal'}
                                                              </h3>
                                                              <h4 className="text-white font-bold text-3xl mt-2 tracking-tight">
                                                                  {lastVerification.success 
                                                                      ? (lastIdentifiedStudent?.siswa_info?.nama || lastIdentifiedStudent?.nama_siswa || 'STUDENT')
                                                                      : (lastVerification.message || 'COBA LAGI')}
                                                              </h4>
                                                              {lastVerification.success && (
                                                                  <div className="flex items-center justify-center gap-3 text-white/80 text-sm font-black mt-2">
                                                                      <span className="bg-white/20 px-3 py-1 rounded-full">{lastIdentifiedStudent?.siswa_info?.nama_kelas || lastIdentifiedStudent?.Kelas?.nama_kelas || '---'}</span>
                                                                  </div>
                                                              )}
                                                          </div>

                                                          {/* Match Percentage Progress Bar */}
                                                          {lastVerification.score && (
                                                              <div className="w-full max-w-[200px] mt-2">
                                                                  <div className="flex justify-between items-center mb-1 px-1">
                                                                      <span className="text-[10px] font-black text-white/60 tracking-widest uppercase">Similarity</span>
                                                                      <span className="text-[10px] font-black text-white bg-white/10 px-1.5 rounded">{(lastVerification.score * 100).toFixed(0)}%</span>
                                                                  </div>
                                                                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                                                      <div 
                                                                          className={`h-full transition-all duration-1000 ${lastVerification.success ? 'bg-green-400' : 'bg-red-400'}`}
                                                                          style={{ width: `${(lastVerification.score * 100)}%` }}
                                                                      />
                                                                  </div>
                                                              </div>
                                                          )}
                                                      </div>
                                                  </div>
                                              )}

                                              {/* Premium Scan Overlay Mask */}
                                              <div className={`absolute inset-x-12 top-1/6 bottom-1/6 border-2 rounded-[48px] pointer-events-none transition-all duration-300 ${isIdentifying ? 'border-yellow-400/50 scale-[1.02]' : 'border-white/15'}`}>
                                                  <div className={`absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 rounded-tl-[44px] ${isIdentifying ? 'border-yellow-400 shadow-[0_0_15px_#facc15]' : 'border-blue-400'}`}></div>
                                                  <div className={`absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 rounded-tr-[44px] ${isIdentifying ? 'border-yellow-400 shadow-[0_0_15px_#facc15]' : 'border-blue-400'}`}></div>
                                                  <div className={`absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 rounded-bl-[44px] ${isIdentifying ? 'border-yellow-400 shadow-[0_0_15px_#facc15]' : 'border-blue-400'}`}></div>
                                                  <div className={`absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 rounded-br-[44px] ${isIdentifying ? 'border-yellow-400 shadow-[0_0_15px_#facc15]' : 'border-blue-400'}`}></div>
                                                  
                                                  {/* Moving Laser Line */}
                                                  <div className={`absolute top-0 left-4 right-4 h-1 bg-gradient-to-r from-transparent to-transparent animate-scan ${isIdentifying ? 'via-yellow-400 shadow-[0_0_25px_#facc15]' : 'via-blue-400 shadow-[0_0_25px_#60a5fa]'}`}></div>

                                                  {/* Processing Label */}
                                                  {isIdentifying && (
                                                      <div className="absolute inset-0 flex items-center justify-center">
                                                          <div className="bg-yellow-500/20 backdrop-blur-md px-6 py-2 rounded-full border border-yellow-400/30 animate-pulse">
                                                              <span className="text-yellow-400 font-black text-[10px] uppercase tracking-[0.3em] shadow-black drop-shadow-lg">
                                                                  Mengidentifikasi...
                                                              </span>
                                                          </div>
                                                      </div>
                                                  )}
                                              </div>

                                              {/* Camera Switch */}
                                              <div className="absolute top-4 right-4 flex gap-2">
                                                  <button 
                                                      onClick={() => setCameraFacing(f => f === 'user' ? 'environment' : 'user')}
                                                      className="bg-black/40 backdrop-blur-md text-white p-2.5 rounded-full border border-white/20 hover:bg-black/60 transition-all opacity-50 hover:opacity-100"
                                                  >
                                                      <RefreshCw size={16} />
                                                  </button>
                                              </div>
                                          </div>

                                          {/* Manual Controls Below Camera (Only in 1:1 mode) */}
                                          {!isAutoScanActive && (
                                              <div className="flex gap-3">
                                                  <Button
                                                      onClick={handleFaceVerifyTap}
                                                      isLoading={tapSubmitting}
                                                      disabled={!selectedFaceSiswaId}
                                                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black h-14 rounded-xl shadow-lg shadow-blue-500/20"
                                                  >
                                                      AMBIL FOTO & VERIFIKASI
                                                  </Button>
                                                  <Button
                                                      onClick={handleFaceEnroll}
                                                      isLoading={enrollSubmitting}
                                                      disabled={!selectedFaceSiswaId}
                                                      variant="outline"
                                                      className="px-6 font-black h-14 rounded-xl border-gray-200"
                                                  >
                                                      REKAM ULANG
                                                  </Button>
                                              </div>
                                          )}
                                          
                                          {isAutoScanActive && (
                                              <div className="text-center">
                                                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">
                                                      Sistem siap mengenali wajah secara otomatis...
                                                  </p>
                                              </div>
                                          )}
                                      </div>
                 )}
             </div>
         </div>
      </div>
      
      {/* Toasts */}
      <ToastContainer toasts={toasts} onRemove={removeToast} className="space-y-2 w-full" />
    </div>
  );

  if (minimal) return content;

  return (
    <Card className="!overflow-visible">
      {content}
    </Card>
  );
};
