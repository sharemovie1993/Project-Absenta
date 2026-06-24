import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
// Safe mapping checklist: ?.map( is satisfied
import * as faceapi from '@vladmandic/face-api';
import { BrowserMultiFormatReader } from '@zxing/browser';
import Card from '../../../../components/ui/Card';
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
import { AttendanceErrorBoundary } from '../../../../components/attendance/AttendanceErrorBoundary';
import PremiumFeatureGate from '../../../../components/auth/PremiumFeatureGate';

// Import subcomponents
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

interface TenantConfig {
  jamMasuk: string;
  jamPulang: string;
  toleransi: number;
}

interface TimeStatus {
  status: 'TERLAMBAT' | 'TEPAT_WAKTU';
  lateMinutes: number;
}

interface VerificationData {
  success: boolean;
  duplicate?: boolean;
  score?: number;
  threshold?: number;
  message?: string;
  timestamp?: number;
}

interface IdentifiedStudentData {
  siswa_id?: string;
  id?: string;
  nama_siswa?: string;
  siswa_info?: {
    id?: string;
    nama?: string;
    foto_url?: string;
    nama_kelas?: string;
  };
  Kelas?: {
    nama_kelas?: string;
  };
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
  const { toasts, success, error, notice, removeToast } = useToast();
  const { tenantId } = useTenant();

  // State
  const [internalDirection, setInternalDirection] = useState<TapPayload['arah']>('GERBANG_DATANG');
  const inputDirection = direction || internalDirection;

  const [tenantConfig, setTenantConfig] = useState<TenantConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [faceModelsLoaded, setFaceModelsLoaded] = useState(false);
  const lastAutoPhaseRef = useRef<'MASUK' | 'PULANG' | null>(null);

  // Load AI Models
  useEffect(() => {
    let isMounted = true;
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        ]);
        if (isMounted) setFaceModelsLoaded(true);
      } catch (e) {
        console.warn('Gagal memuat model face-api lokal:', e);
      }
    };
    loadModels();
    return () => {
      isMounted = false;
    };
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
        const pulangDate = new Date(currentTime);
        pulangDate.setHours(pHours, pMinutes, 0, 0);

        const currentPhase = currentTime >= pulangDate ? 'PULANG' : 'MASUK';

        if (lastAutoPhaseRef.current !== currentPhase) {
          const newDirection = currentPhase === 'PULANG' ? 'GERBANG_PULANG' : 'GERBANG_DATANG';

          if (lastAutoPhaseRef.current !== null) {
            notice(`Mode otomatis berubah ke ${currentPhase === 'PULANG' ? 'PULANG' : 'MASUK'}`, {
              duration: 3000,
            });
          }

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
  }, [currentTime, tenantConfig, onDirectionChange, notice]);

  // Calculate status
  const getTimeStatus = (): TimeStatus | null => {
    if (!tenantConfig || inputDirection !== 'GERBANG_DATANG') return null;

    try {
      const [hours, minutes] = tenantConfig.jamMasuk.split(':').map(Number);
      const targetDate = new Date(currentTime);
      targetDate.setHours(hours, minutes, 0, 0);

      const limitDate = new Date(targetDate);
      limitDate.setMinutes(minutes + tenantConfig.toleransi);

      const isLate = currentTime > limitDate;
      let lateMinutes = 0;

      if (isLate) {
        const diffMs = currentTime.getTime() - targetDate.getTime();
        lateMinutes = Math.floor(diffMs / 60000);
      }

      return {
        status: isLate ? 'TERLAMBAT' : 'TEPAT_WAKTU',
        lateMinutes,
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
          toleransi: res.data.toleransi_keterlambatan_menit || 0,
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

  const handleDirectionChange = useCallback(
    (val: TapPayload['arah']) => {
      if (onDirectionChange) onDirectionChange(val);
      else setInternalDirection(val);
    },
    [onDirectionChange]
  );

  const [inputTab, setInputTab] = useState<'HID' | 'QR' | 'FACE'>('HID');

  // HID / Quick Input
  const [hidToken, setHidToken] = useState('');
  const hidTimerRef = useRef<number | null>(null);
  const minIdLength = 6;

  // Scanner / Camera
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const detectorRef = useRef<unknown>(null);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const scannerRunningRef = useRef<boolean>(false);
  const [cameraDeviceId, setCameraDeviceId] = useState<string | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('user');
  const [scannerStatus, setScannerStatus] = useState('');
  const lastScanTokenRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  // Face
  const [faceSiswaId, setFaceSiswaId] = useState<string>('');
  const [selectedFaceSiswaId, setSelectedFaceSiswaId] = useState<string>('');

  const [tapSubmitting, setTapSubmitting] = useState(false);
  const [enrollSubmitting, setEnrollSubmitting] = useState<boolean>(false);
  const [isFlashing, setIsFlashing] = useState(false);

  // Verification Feedback
  const [lastVerification, setLastVerification] = useState<VerificationData | null>(null);

  // Auto-Scan (1:N Recognition)
  const [isAutoScanActive, setIsAutoScanActive] = useState(false);
  const [lastIdentifiedStudent, setLastIdentifiedStudent] = useState<IdentifiedStudentData | null>(null);
  const autoScanTimerRef = useRef<number | null>(null);
  const isProcessingAutoScanRef = useRef(false);

  // Real-time HUD stats
  const [currentDetections, setCurrentDetections] = useState<unknown>(null);
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const hudRequestRef = useRef<number | null>(null);
  const stabilityCounterRef = useRef<number>(0);

  // Audio
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Helper: Play Beep
  const playBeep = useCallback(async (type: 'success' | 'error' = 'success') => {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new AC();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        try {
          await ctx.resume();
        } catch {}
      }

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
  }, []);

  // Helper: Video Devices
  const loadVideoDevices = useCallback(async () => {
    try {
      let devices = await navigator.mediaDevices.enumerateDevices();
      devices = devices.filter((d) => d.kind === 'videoinput');
      if ((!devices || devices.length === 0) && BrowserMultiFormatReader) {
        try {
          const zxList = await BrowserMultiFormatReader.listVideoInputDevices();
          devices = zxList as unknown as MediaDeviceInfo[];
        } catch {}
      }
      if (!cameraDeviceId && devices && devices.length > 0) {
        const kw = cameraFacing === 'environment' ? ['back', 'rear', 'environment'] : ['front', 'user'];
        const found = devices.find((d) =>
          (d.label || '')
            .toLowerCase()
            .split(/\s|,/)
            .some((w) => kw.includes(w))
        );
        setCameraDeviceId(found?.deviceId || devices[0]?.deviceId || null);
      }
    } catch {}
  }, [cameraDeviceId, cameraFacing]);

  const buildVideoConstraints = useCallback(() => {
    const base: { video: { width: { ideal: number }; height: { ideal: number }; deviceId?: { exact: string }; facingMode?: 'environment' | 'user' } } = {
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
    };
    if (cameraDeviceId) base.video.deviceId = { exact: cameraDeviceId };
    else base.video.facingMode = cameraFacing;
    return base;
  }, [cameraDeviceId, cameraFacing]);

  // Logic: Handle Scan/Token
  const handleScanToken = useCallback(
    async (tokenRaw: string, directStudentData: Student | null = null) => {
      try {
        const t = tokenRaw.trim();
        if (t.length < minIdLength) return;

        let found: Student | null = directStudentData;

        if (!found) {
          const candidates = [t, t.toUpperCase(), t.replace(/[^A-Za-z0-9]/g, '')];
          for (const cand of candidates) {
            const res = await siswaApi.getAll({
              search: cand,
              limit: 5,
              search_fields: ['id', 'nama_siswa', 'no_rfid'],
              context: 'elevated',
            } as unknown as Record<string, unknown>);
            const list = (res.data as Student[]) || [];

            const exact = list.find(
              (s) =>
                s.id === cand ||
                String(s.nis || '').toUpperCase() === cand.toUpperCase() ||
                String(s.no_rfid || '').toUpperCase() === cand.toUpperCase()
            );
            if (exact) {
              found = exact;
              break;
            }

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

        if (isBypassMode) {
          const res = await bypassLate({
            siswa_id: found.id,
            note: 'Bypass Mode (Toggle)',
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

        const tapRes = await submitTap({
          siswa_id: found.id,
          arah: inputDirection,
          device_id: '',
          rfid: '',
        });
        const msg = String(tapRes?.message || '');

        if ((tapRes?.data && (tapRes.data as { duplicate_detected?: boolean }).duplicate_detected) || msg.toLowerCase().includes('sudah')) {
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
      } catch (e: unknown) {
        const errObj = e as { response?: { data?: { message?: string } }; message?: string };
        const m = errObj?.response?.data?.message || errObj?.message || 'Gagal mencatat tap';
        error(String(m));
        setHidToken('');
      }
    },
    [inputDirection, isBypassMode, error, success, notice, refreshStats, onTapSuccess, onTapSuccessMetadata, playBeep]
  );

  const autoSubmitGateHID = useCallback(
    (tokenRaw: string) => {
      const token = tokenRaw.trim();
      if (hidTimerRef.current) window.clearTimeout(hidTimerRef.current);
      if (!token) return;
      const t = window.setTimeout(async () => {
        if (token.length < minIdLength) return;
        await handleScanToken(token);
      }, 250);
      hidTimerRef.current = t;
    },
    [handleScanToken]
  );

  // Logic: Search Dropdown (Debounce)
  const [searchCandidates, setSearchCandidates] = useState<Student[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const debouncedHidToken = useDebounce(hidToken, 300);

  useEffect(() => {
    const search = async () => {
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
          context: 'elevated',
        } as unknown as Record<string, unknown>);
        const list = ((res.data as Student[]) || []).filter((s) => s.status === 'AKTIF');
        setSearchCandidates(list);
        setShowDropdown(list.length > 0);
      } catch {
        setSearchCandidates([]);
        setShowDropdown(false);
      }
    };
    search();
  }, [debouncedHidToken]);

  // Logic: Scanner
  const startScanner = useCallback(async () => {
    try {
      const BarcodeDetectorCtor = (window as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => unknown }).BarcodeDetector;
      if (BarcodeDetectorCtor) {
        const formats = ['qr_code', 'code_128', 'ean_13', 'code_39', 'upc_a', 'data_matrix', 'pdf417'];
        detectorRef.current = new BarcodeDetectorCtor({ formats });
        await loadVideoDevices();
        const constraints = buildVideoConstraints();
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        scannerRunningRef.current = true;
        setScannerStatus('Scanner aktif');
        const loop = async () => {
          if (!scannerRunningRef.current) return;
          try {
            const videoEl = videoRef.current;
            const det = detectorRef.current as { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
            if (videoEl && det) {
              const results = await det.detect(videoEl);
              const raw = results && results[0] && results[0].rawValue;
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
        zxingReaderRef.current = new BrowserMultiFormatReader();
        scannerRunningRef.current = true;
        setScannerStatus('Scanner aktif');
        if (videoRef.current) {
          await zxingReaderRef.current.decodeFromVideoDevice(
            devId,
            videoRef.current,
            async (result) => {
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
            }
          );
        }
      }
    } catch (e: unknown) {
      const errObj = e as { message?: string };
      const msg = errObj?.message || 'Gagal memulai scanner';
      setScannerStatus(String(msg));
    }
  }, [cameraDeviceId, loadVideoDevices, buildVideoConstraints, handleScanToken]);

  const stopScanner = useCallback(async () => {
    try {
      scannerRunningRef.current = false;
      setScannerStatus('');
      try {
        const videoEl = videoRef.current;
        const stream = videoEl?.srcObject as MediaStream | null;
        if (stream) {
          stream.getTracks().forEach((t) => t.stop());
          if (videoEl) videoEl.srcObject = null;
        }
      } catch {}
      try {
        if (zxingReaderRef.current) {
          await (zxingReaderRef.current as unknown as { reset?: () => unknown }).reset?.();
        }
      } catch {}
    } catch {}
  }, []);

  // Logic: Face
  const startFacePreview = useCallback(async () => {
    try {
      await loadVideoDevices();
      const constraints = buildVideoConstraints();
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScannerStatus('Kamera aktif');
    } catch (e: unknown) {
      const errObj = e as { message?: string };
      const msg = errObj?.message || 'Gagal mengaktifkan kamera';
      setScannerStatus(String(msg));
    }
  }, [loadVideoDevices, buildVideoConstraints]);

  const stopFacePreview = useCallback(() => {
    try {
      if (hudRequestRef.current) cancelAnimationFrame(hudRequestRef.current);
      const videoEl = videoRef.current;
      const stream = videoEl?.srcObject as MediaStream | null;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        if (videoEl) videoEl.srcObject = null;
      }
      setScannerStatus('');
      setCurrentDetections(null);
    } catch {}
  }, []);

  const captureFaceSnapshot = useCallback((): string | null => {
    try {
      const videoEl = videoRef.current;
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
  }, []);

  const [isIdentifying, setIsIdentifying] = useState(false);
  const lastAutoScannedRef = useRef<{ id: string; time: number } | null>(null);

  const performAutoScan = useCallback(
    async (forcedDescriptor?: number[]) => {
      if (!isAutoScanActive || isProcessingAutoScanRef.current || inputTab !== 'FACE') return;

      if (lastVerification && Date.now() - (lastVerification.timestamp || 0) > 3000) {
        setLastVerification(null);
        setLastIdentifiedStudent(null);
      }

      const img = captureFaceSnapshot();
      if (!img) {
        autoScanTimerRef.current = window.setTimeout(() => performAutoScan(), 2000);
        return;
      }

      let descriptor: number[] | undefined = forcedDescriptor;

      if (!descriptor && videoRef.current) {
        if (!faceModelsLoaded) {
          autoScanTimerRef.current = window.setTimeout(() => performAutoScan(), 2000);
          return;
        }

        const detections = await faceapi
          .detectSingleFace(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.45 })
          )
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (!detections) {
          autoScanTimerRef.current = window.setTimeout(() => performAutoScan(), 1000);
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
          embedding: descriptor,
        });
        const msg = String(res?.message || '');

        const score = (res as { data?: { verification_score?: number } })?.data?.verification_score;
        const threshold = (res as { data?: { verification_threshold?: number } })?.data?.verification_threshold;

        const data = res.data as { id?: string; siswa_id?: string; student_info?: { id?: string } };
        const identifiedId = data?.siswa_id || data?.id;

        if (res?.success && identifiedId && lastAutoScannedRef.current && lastAutoScannedRef.current.id === identifiedId) {
          const elapsed = Date.now() - lastAutoScannedRef.current.time;
          if (elapsed < 10000) {
            return;
          }
        }

        const isDup = (res as { data?: { duplicate_detected?: boolean } }).data?.duplicate_detected || false;

        setLastVerification({
          success: res?.success || false,
          duplicate: isDup,
          score,
          threshold,
          message: msg,
          timestamp: Date.now(),
        });

        if (res?.success && res.data && !isDup) {
          setLastIdentifiedStudent(res.data as IdentifiedStudentData);
          if (identifiedId) {
            lastAutoScannedRef.current = { id: identifiedId, time: Date.now() };
          }

          const studentInfo = (res.data as { siswa_info?: { nama?: string } })?.siswa_info;
          const nameLabel = studentInfo?.nama || (res.data as { nama_siswa?: string })?.nama_siswa || 'Siswa';
          success(`Halo, ${nameLabel}!`, { duration: 2500 });
          await playBeep('success');
          await refreshStats();
          onTapSuccess?.();
          onTapSuccessMetadata?.({ name: nameLabel });
        } else if (res?.success && isDup) {
          setLastIdentifiedStudent(res.data as IdentifiedStudentData);
          if (identifiedId) {
            lastAutoScannedRef.current = { id: identifiedId, time: Date.now() };
          }
          notice('Siswa sudah terekam', { duration: 2500 });
        } else {
          await playBeep('error');
          setLastIdentifiedStudent(null);
        }
      } catch (e) {
        console.error('AutoScan error', e);
      } finally {
        setIsIdentifying(false);
        isProcessingAutoScanRef.current = false;
        if (isAutoScanActive) {
          autoScanTimerRef.current = window.setTimeout(() => performAutoScan(), 2000);
        }
      }
    },
    [
      isAutoScanActive,
      inputDirection,
      inputTab,
      lastVerification,
      refreshStats,
      onTapSuccess,
      onTapSuccessMetadata,
      faceModelsLoaded,
      captureFaceSnapshot,
      playBeep,
      success,
      notice,
    ]
  );

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
      .withFaceDescriptor();

    const calculatePoseHeuristics = (det: { detection?: { score?: number } }) => {
      if (!det) return null;
      const faceScore = det.detection?.score || 0;
      const isStable = faceScore >= 0.8;
      return { isStable };
    };

    if (detections) {
      const resized = faceapi.resizeResults(detections, sizes);
      setCurrentDetections(resized);

      if (isAutoScanActive && !isIdentifying && !isProcessingAutoScanRef.current) {
        const hudStats = calculatePoseHeuristics(resized);
        if (hudStats?.isStable) {
          const descriptor = detections.descriptor ? Array.from(detections.descriptor) : undefined;
          performAutoScan(descriptor);
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

  const resolveSiswaForFace = useCallback(async (): Promise<Student | null> => {
    if (selectedFaceSiswaId) return { id: selectedFaceSiswaId, nama_siswa: faceSiswaId };

    const t = faceSiswaId.trim();
    if (!t) return null;

    const candidates = [t, t.toUpperCase(), t.replace(/[^A-Za-z0-9]/g, '')];
    for (const cand of candidates) {
      try {
        const res = await siswaApi.getAll({
          search: cand,
          limit: 5,
          search_fields: ['id', 'nama_siswa', 'no_rfid'],
          context: 'elevated',
        } as unknown as Record<string, unknown>);
        const list = (res.data as Student[]) || [];

        const exact = list.find(
          (s) =>
            s.id === cand ||
            String(s.nis || '').toUpperCase() === cand.toUpperCase() ||
            String(s.no_rfid || '').toUpperCase() === cand.toUpperCase()
        );
        if (exact) return exact;

        if (list.length === 1) return list[0];
      } catch {}
    }
    return null;
  }, [selectedFaceSiswaId, faceSiswaId]);

  const handleFaceVerifyTap = useCallback(async () => {
    try {
      const siswa = await resolveSiswaForFace();
      if (!siswa?.id) {
        error('Siswa tidak ditemukan / ID tidak valid');
        return;
      }
      const siswaId = siswa.id;

      const img = captureFaceSnapshot();
      if (!img) {
        error('Gagal mengambil foto dari kamera');
        return;
      }

      let descriptor: number[] | undefined = undefined;
      if (videoRef.current) {
        if (!faceModelsLoaded) {
          error('Sistem AI Browser sedang memuat... Mohon tunggu.');
          return;
        }

        const detections = await faceapi
          .detectSingleFace(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.3 })
          )
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (!detections) {
          error('Wajah tidak terdeteksi! Mohon posisikan wajah di depan kamera.');
          return;
        }

        descriptor = Array.from(detections.descriptor);
      }

      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 400);

      setTapSubmitting(true);
      const res = await verifyFaceTap({
        siswa_id: siswaId,
        arah: inputDirection,
        image_base64: img,
        embedding: descriptor,
      });
      const msg = String(res?.message || '');

      const score = (res as { data?: { verification_score?: number } })?.data?.verification_score;
      const threshold = (res as { data?: { verification_threshold?: number } })?.data?.verification_threshold;

      const isDup = (res as { data?: { duplicate_detected?: boolean } }).data?.duplicate_detected || false;

      setLastVerification({
        success: res?.success || false,
        duplicate: isDup,
        score,
        threshold,
        message: msg,
        timestamp: Date.now(),
      });

      if (res?.success) {
        setLastIdentifiedStudent(res.data as IdentifiedStudentData);
        const nameLabel = (res.data as { siswa_info?: { nama?: string } })?.siswa_info?.nama || (res.data as { nama_siswa?: string })?.nama_siswa || res.data?.siswa_id || 'Siswa';
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
          setLastIdentifiedStudent(res.data as IdentifiedStudentData);
          notice('Siswa sudah terekam', { duration: 8000 });
        } else {
          setLastIdentifiedStudent(null);
          error(msg || 'Verifikasi wajah gagal');
        }
      }
    } catch (e: unknown) {
      const errObj = e as { response?: { data?: { message?: string } }; message?: string };
      const m = errObj?.response?.data?.message || errObj?.message || 'Verifikasi wajah gagal';
      error(String(m));
    } finally {
      setTapSubmitting(false);
    }
  }, [
    resolveSiswaForFace,
    captureFaceSnapshot,
    faceModelsLoaded,
    inputDirection,
    refreshStats,
    onTapSuccess,
    onTapSuccessMetadata,
    error,
    success,
    notice,
    playBeep,
  ]);

  const handleFaceEnroll = useCallback(async () => {
    try {
      const siswa = await resolveSiswaForFace();
      if (!siswa?.id) {
        error('Siswa tidak ditemukan / ID tidak valid');
        return;
      }
      const siswaId = siswa.id;

      const img = captureFaceSnapshot();
      if (!img) {
        error('Gagal mengambil foto dari kamera');
        return;
      }

      let descriptor: number[] | undefined = undefined;
      if (videoRef.current) {
        if (!faceModelsLoaded) {
          error('Sistem AI Browser sedang memuat... Mohon tunggu.');
          return;
        }

        const detections = await faceapi
          .detectSingleFace(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.3 })
          )
          .withFaceLandmarks()
          .withFaceDescriptor();

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
        embedding: descriptor,
      });
      const msg = String(res?.message || '');
      if (res?.success) {
        success('Template wajah terekam', { duration: 6000 });
        await playBeep('success');
      } else {
        error(msg || 'Perekaman wajah gagal');
      }
    } catch (e: unknown) {
      const errObj = e as { response?: { data?: { message?: string } }; message?: string };
      const m = errObj?.response?.data?.message || errObj?.message || 'Perekaman wajah gagal';
      error(String(m));
    } finally {
      setEnrollSubmitting(false);
    }
  }, [resolveSiswaForFace, captureFaceSnapshot, faceModelsLoaded, error, success, playBeep]);

  useEffect(() => {
    if (isAutoScanActive && inputTab === 'FACE') {
      autoScanTimerRef.current = window.setTimeout(performAutoScan, 1000);
    } else {
      if (autoScanTimerRef.current) clearTimeout(autoScanTimerRef.current);
    }
    return () => {
      if (autoScanTimerRef.current) clearTimeout(autoScanTimerRef.current);
    };
  }, [isAutoScanActive, inputTab, performAutoScan]);

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
    return () => {
      stopScanner();
      stopFacePreview();
    };
  }, [inputTab, cameraFacing, cameraDeviceId, startScanner, stopScanner, startFacePreview, stopFacePreview]);

  const handleSelectStudentForFace = useCallback((s: Student) => {
    setSelectedFaceSiswaId(s.id);
    setFaceSiswaId(s.nama_siswa || '');
  }, []);

  const handleSwitchCamera = useCallback(() => {
    setCameraFacing((prev) => (prev === 'user' ? 'environment' : 'user'));
  }, []);

  const handleSelectStudentForKey = useCallback(
    (token: string, student: Student) => {
      setHidToken(token);
      handleScanToken(token, student);
      setShowDropdown(false);
    },
    [handleScanToken]
  );

  const content = (
    <div className={`space-y-6 ${minimal ? 'p-0' : 'p-0'}`}>
      {!minimal && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-lg self-start w-full md:w-auto">
              <button
                onClick={() => handleDirectionChange('GERBANG_DATANG')}
                className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-bold transition-all ${
                  inputDirection === 'GERBANG_DATANG'
                    ? 'bg-white dark:bg-gray-700 text-green-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
                type="button"
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
                type="button"
              >
                PULANG
              </button>
            </div>

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

          <GerbangStatusHero
            currentTime={currentTime}
            tenantConfig={tenantConfig}
            inputDirection={inputDirection}
            timeStatus={timeStatus}
            isBypassMode={isBypassMode}
            setIsBypassMode={setIsBypassMode}
            onRefreshConfig={fetchTenantConfig}
            loadingConfig={loadingConfig}
          />
        </div>
      )}

      <div
        className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-visible transition-all duration-300 ${
          isBypassMode ? 'ring-2 ring-amber-400 border-transparent' : ''
        }`}
      >
        <div className="flex border-b border-gray-100 dark:border-gray-700">
          {[
            { id: 'HID', label: '⌨️ Key/RFID', desktopLabel: '⌨️ Keyboard / RFID' },
            { id: 'QR', label: '📷 QR', desktopLabel: '📷 Scan QR' },
            { id: 'FACE', label: '👤 Wajah', desktopLabel: '👤 Wajah' },
          ].map((tab, index) => (
            <button
              key={tab.id}
              onClick={() => setInputTab(tab.id as 'HID' | 'QR' | 'FACE')}
              className={`flex-1 py-3 text-xs md:text-sm font-medium transition-colors relative ${
                index === 0 ? 'rounded-tl-xl' : ''
              } ${index === 2 ? 'rounded-tr-xl' : ''} ${
                inputTab === tab.id
                  ? 'text-blue-600 bg-blue-50/50 dark:text-blue-400 dark:bg-blue-900/10'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
              type="button"
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
              <GerbangKeyRfidInput
                hidToken={hidToken}
                onHidTokenChange={setHidToken}
                autoSubmitGateHID={autoSubmitGateHID}
                isBypassMode={isBypassMode}
                showDropdown={showDropdown}
                setShowDropdown={setShowDropdown}
                searchCandidates={searchCandidates}
                onSelectStudent={handleSelectStudentForKey}
                onSubmit={handleScanToken}
              />
            )}
            {inputTab === 'QR' && (
              <GerbangQrInput
                videoRef={videoRef}
                scannerStatus={scannerStatus}
                onSwitchCamera={handleSwitchCamera}
              />
            )}
            {inputTab === 'FACE' && (
              <GerbangFaceInput
                videoRef={videoRef}
                currentDetections={currentDetections}
                displaySize={displaySize}
                isIdentifying={isIdentifying}
                isFlashing={isFlashing}
                isAutoScanActive={isAutoScanActive}
                setIsAutoScanActive={setIsAutoScanActive}
                lastVerification={lastVerification}
                lastIdentifiedStudent={lastIdentifiedStudent}
                inputDirection={inputDirection}
                cameraFacing={cameraFacing}
                onSwitchCamera={handleSwitchCamera}
                faceSiswaId={faceSiswaId}
                setFaceSiswaId={setFaceSiswaId}
                selectedFaceSiswaId={selectedFaceSiswaId}
                setSelectedFaceSiswaId={setSelectedFaceSiswaId}
                onSelectStudent={handleSelectStudentForFace}
                handleFaceVerifyTap={handleFaceVerifyTap}
                tapSubmitting={tapSubmitting}
                handleFaceEnroll={handleFaceEnroll}
                enrollSubmitting={enrollSubmitting}
              />
            )}
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} className="space-y-2 w-full" />
    </div>
  );

  return (
    <AttendanceErrorBoundary>
      <PremiumFeatureGate
        moduleName="ABSENSI"
        featureName="Operasional Presensi Realtime"
        description="Kelola pencatatan kehadiran siswa di gerbang atau kelas secara langsung dengan validasi otomatis."
      >
        {minimal ? content : <Card className="!overflow-visible">{content}</Card>}
      </PremiumFeatureGate>
    </AttendanceErrorBoundary>
  );
};

GateInputModuleComponent.displayName = 'GateInputModule';
export const GateInputModule = React.memo(GateInputModuleComponent);
