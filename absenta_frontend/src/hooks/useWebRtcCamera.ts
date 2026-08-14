import { useState, useRef, useCallback, useEffect } from 'react';

export interface CameraStampDetails {
  kelasNama?: string;
  mapelNama?: string;
  guruNama?: string;
  badgeTitle?: string;
}

export interface UseWebRtcCameraOptions {
  facingMode?: 'environment' | 'user';
  idealWidth?: number;
  idealHeight?: number;
  autoStart?: boolean;
}

/**
 * Enterprise WebRTC Camera Hook for Absenta Application
 * Manages WebRTC camera streams, device enumeration, error handling, clean unmounting, and canvas photo capture.
 */
export function useWebRtcCamera(options: UseWebRtcCameraOptions = {}) {
  const {
    facingMode = 'environment',
    idealWidth = 1280,
    idealHeight = 720,
    autoStart = false,
  } = options;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string>('');

  // Cleanly stop stream tracks
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Enumerate available camera devices
  const refreshDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter((dev) => dev.kind === 'videoinput');
      setDevices(videoDevices);
    } catch (_) {}
  }, []);

  // Start camera with requested deviceId or facingMode constraints
  const startCamera = useCallback(async (deviceId?: string) => {
    setCameraError(null);
    setIsCameraActive(false);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Fitur kamera tidak didukung pada peramban web ini.');
      return;
    }

    try {
      stopCamera();

      const videoConstraints: MediaTrackConstraints = deviceId
        ? { deviceId: { exact: deviceId } }
        : { facingMode, width: { ideal: idealWidth }, height: { ideal: idealHeight } };

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setIsCameraActive(true);
      if (deviceId) setActiveDeviceId(deviceId);

      refreshDevices();
    } catch (err: any) {
      // Fallback: simple video constraint
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          await videoRef.current.play().catch(() => {});
        }
        setIsCameraActive(true);
        refreshDevices();
      } catch (fallbackErr: any) {
        stopCamera();
        setCameraError('Akses kamera ditolak atau perangkat kamera tidak ditemukan.');
      }
    }
  }, [facingMode, idealWidth, idealHeight, stopCamera, refreshDevices]);

  // Switch between available devices or toggle facingMode
  const switchCamera = useCallback(async () => {
    if (devices.length > 1) {
      const currentIndex = devices.findIndex((d) => d.deviceId === activeDeviceId);
      const nextIndex = (currentIndex + 1) % devices.length;
      const nextDevice = devices[nextIndex];
      if (nextDevice) {
        await startCamera(nextDevice.deviceId);
      }
    } else {
      const nextMode = facingMode === 'environment' ? 'user' : 'environment';
      await startCamera();
    }
  }, [devices, activeDeviceId, facingMode, startCamera]);

  // Draw transparent stamp on canvas without blocking the underlying image
  const applyStampToCanvas = useCallback((
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    stamp?: CameraStampDetails
  ) => {
    if (!stamp) return;

    const stampHeight = Math.max(68, Math.floor(height * 0.18));
    const y = height - stampHeight;

    ctx.save();

    // 1. Transparent gradient background (high visibility, low opacity - non blocking)
    const gradient = ctx.createLinearGradient(0, y, 0, height);
    gradient.addColorStop(0, 'rgba(15, 23, 42, 0.20)');
    gradient.addColorStop(0.3, 'rgba(15, 23, 42, 0.45)');
    gradient.addColorStop(1, 'rgba(15, 23, 42, 0.65)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, y, width, stampHeight);

    // 2. Top Accent Line (Emerald Green with slight transparency)
    ctx.fillStyle = 'rgba(16, 185, 129, 0.85)';
    ctx.fillRect(0, y, width, Math.max(2, Math.floor(height * 0.006)));

    const paddingX = Math.max(14, Math.floor(width * 0.03));
    const baseFontSize = Math.max(11, Math.floor(stampHeight * 0.20));

    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }) + ' • ' + now.toLocaleTimeString('id-ID', { hour12: false }) + ' WIB';

    let currentY = y + baseFontSize + Math.floor(stampHeight * 0.08);

    // Subtle text shadow for high contrast over any camera background
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    // Badge Title
    ctx.font = `bold ${Math.max(10, Math.floor(baseFontSize * 0.85))}px sans-serif`;
    ctx.fillStyle = '#34d399';
    ctx.fillText(stamp.badgeTitle || '✓ ABSENTA VERIFIED KBM STAMP', paddingX, currentY);

    // Line 1: Kelas & Mapel
    currentY += baseFontSize + 3;
    ctx.font = `bold ${Math.max(13, Math.floor(baseFontSize * 1.20))}px sans-serif`;
    ctx.fillStyle = '#ffffff';
    const line1Text = `${stamp.kelasNama || 'Kelas'} — ${stamp.mapelNama || 'Mata Pelajaran'}`;
    ctx.fillText(line1Text, paddingX, currentY);

    // Line 2: Guru & Timestamp
    currentY += baseFontSize + 3;
    ctx.font = `500 ${Math.max(11, Math.floor(baseFontSize * 0.90))}px sans-serif`;
    ctx.fillStyle = '#e2e8f0';
    const line2Text = `Pengajar: ${stamp.guruNama || 'Guru'}  |  ${dateStr}`;
    ctx.fillText(line2Text, paddingX, currentY);

    ctx.restore();
  }, []);

  // Capture current photo frame from video element to Data URL
  const capturePhoto = useCallback((stampDetails?: CameraStampDetails, quality = 0.88): string | null => {
    if (!videoRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || idealWidth;
    canvas.height = video.videoHeight || idealHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (stampDetails) {
      applyStampToCanvas(ctx, canvas.width, canvas.height, stampDetails);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    stopCamera();
    return dataUrl;
  }, [idealWidth, idealHeight, applyStampToCanvas, stopCamera]);

  useEffect(() => {
    if (autoStart) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [autoStart, startCamera, stopCamera]);

  return {
    videoRef,
    canvasRef,
    isCameraActive,
    cameraError,
    devices,
    activeDeviceId,
    startCamera,
    stopCamera,
    switchCamera,
    capturePhoto,
    applyStampToCanvas,
  };
}
