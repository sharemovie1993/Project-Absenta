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
  const [currentFacingMode, setCurrentFacingMode] = useState<'environment' | 'user'>(facingMode);

  // Cleanly stop stream tracks & detach video element
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      tracks.forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch (_) {}
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
      console.log('[AbsentaCamera] 📹 Enumerated video devices:', videoDevices.map((d, idx) => ({
        index: idx,
        deviceId: d.deviceId ? d.deviceId.slice(0, 16) + '...' : '(empty)',
        label: d.label || `Camera ${idx + 1}`,
      })));
      setDevices(videoDevices);
      return videoDevices;
    } catch (err) {
      console.warn('[AbsentaCamera] ⚠️ Failed to enumerate devices:', err);
      return [];
    }
  }, []);

  // Start camera with requested deviceId or facingMode constraints
  const startCamera = useCallback(async (deviceId?: string, targetFacingMode?: 'environment' | 'user') => {
    setCameraError(null);

    const modeToUse = targetFacingMode || currentFacingMode;
    console.log('[AbsentaCamera] 🎬 startCamera called. Target mode:', modeToUse, 'Target deviceId:', deviceId || '(none)');

    if (!navigator.mediaDevices?.getUserMedia) {
      console.error('[AbsentaCamera] ❌ navigator.mediaDevices.getUserMedia is not supported on this browser/context.');
      setCameraError('Fitur kamera tidak didukung pada peramban web ini.');
      return;
    }

    try {
      // 1. Cleanly stop old stream tracks and detach video element first so hardware sensor is released
      stopCamera();

      // Pause to ensure mobile OS releases the hardware camera sensor
      await new Promise((r) => setTimeout(r, 100));

      let stream: MediaStream | null = null;
      let usedStrategy = '';

      // Strategy 1: Targeted deviceId (Direct physical sensor selection)
      if (deviceId) {
        try {
          console.log('[AbsentaCamera] 🔍 Attempting Strategy 1: deviceId { exact:', deviceId.slice(0, 16), '... }');
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: { exact: deviceId },
            },
            audio: false,
          });
          usedStrategy = `Strategy 1 (exact deviceId)`;
        } catch (err1: any) {
          console.warn('[AbsentaCamera] ⚠️ Strategy 1 (deviceId) failed:', err1.name, err1.message);
        }
      }

      // Strategy 2: Standard facingMode string (Most compatible with modern Chrome & Safari)
      if (!stream) {
        try {
          console.log('[AbsentaCamera] 🔍 Attempting Strategy 2: facingMode:', modeToUse);
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: modeToUse,
              width: { ideal: idealWidth },
              height: { ideal: idealHeight },
            },
            audio: false,
          });
          usedStrategy = `Strategy 2 (facingMode: ${modeToUse})`;
        } catch (err2: any) {
          console.warn('[AbsentaCamera] ⚠️ Strategy 2 (facingMode) failed:', err2.name, err2.message);
        }
      }

      // Strategy 3: Basic facingMode without resolution constraints
      if (!stream) {
        try {
          console.log('[AbsentaCamera] 🔍 Attempting Strategy 3: Basic facingMode:', modeToUse);
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: modeToUse,
            },
            audio: false,
          });
          usedStrategy = `Strategy 3 (basic facingMode: ${modeToUse})`;
        } catch (err3: any) {
          console.warn('[AbsentaCamera] ⚠️ Strategy 3 failed:', err3.name, err3.message);
        }
      }

      // Strategy 4: Generic video fallback
      if (!stream) {
        console.log('[AbsentaCamera] 🔍 Attempting Strategy 4: Generic video constraint { video: true }');
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        usedStrategy = 'Strategy 4 (generic video: true)';
      }

      console.log('[AbsentaCamera] ✅ Stream successfully acquired via', usedStrategy);
      const activeTrack = stream.getVideoTracks()[0];
      if (activeTrack) {
        const settings = activeTrack.getSettings ? activeTrack.getSettings() : {};
        const trackDeviceId = settings.deviceId || deviceId || '';
        if (trackDeviceId) setActiveDeviceId(trackDeviceId);

        console.log('[AbsentaCamera] 📊 Active Track Settings:', {
          label: activeTrack.label,
          facingMode: settings.facingMode || '(unknown)',
          width: settings.width,
          height: settings.height,
          deviceId: trackDeviceId ? trackDeviceId.slice(0, 16) + '...' : '(none)',
        });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch((playErr) => {
          console.warn('[AbsentaCamera] ⚠️ video.play() warning:', playErr);
        });
      }

      setIsCameraActive(true);
      if (targetFacingMode) setCurrentFacingMode(targetFacingMode);

      refreshDevices();
    } catch (err: any) {
      console.error('[AbsentaCamera] ❌ ALL camera acquisition strategies failed:', err.name, err.message, err);
      setIsCameraActive(false);
      setCameraError(`Akses kamera ditolak atau gagal dibuka (${err.name || 'Error'}: ${err.message || 'unknown'}).`);
    }
  }, [currentFacingMode, idealWidth, idealHeight, stopCamera, refreshDevices]);

  // Switch smoothly between front (selfie) and rear (classroom) cameras
  const switchCamera = useCallback(async () => {
    const nextMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    console.log('[AbsentaCamera] 🔄 switchCamera clicked! Switching from', currentFacingMode, '➔', nextMode);
    setCurrentFacingMode(nextMode);

    let latestDevices = devices;
    if (latestDevices.length === 0) {
      latestDevices = (await refreshDevices()) || [];
    }

    let targetDeviceId: string | undefined = undefined;

    if (latestDevices.length > 1) {
      // 1. Try finding device matching label (front / selfie / back / rear)
      const match = latestDevices.find((d) => {
        const lbl = (d.label || '').toLowerCase();
        if (nextMode === 'user') {
          return lbl.includes('front') || lbl.includes('user') || lbl.includes('depan') || lbl.includes('selfie') || lbl.includes('facetime') || lbl.includes('1');
        } else {
          return lbl.includes('back') || lbl.includes('rear') || lbl.includes('environment') || lbl.includes('belakang') || lbl.includes('0');
        }
      });

      if (match && match.deviceId) {
        targetDeviceId = match.deviceId;
        console.log('[AbsentaCamera] 🎯 Matched device by label:', match.label);
      } else {
        // 2. Cycle to next device in enumerated devices list
        const currentIndex = latestDevices.findIndex((d) => d.deviceId === activeDeviceId);
        const nextIndex = (currentIndex + 1) % latestDevices.length;
        targetDeviceId = latestDevices[nextIndex]?.deviceId;
        console.log('[AbsentaCamera] 🔄 Cycled to device index', nextIndex, ':', latestDevices[nextIndex]?.label);
      }
    }

    await startCamera(targetDeviceId, nextMode);
  }, [currentFacingMode, devices, activeDeviceId, refreshDevices, startCamera]);

  // Helper to draw text that dynamically shrinks and truncates with ellipsis if it exceeds maxWidth
  const drawFittedText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    preferredFontSize: number,
    weight: string = 'bold',
    color: string = '#ffffff'
  ) => {
    let fontSize = preferredFontSize;
    ctx.font = `${weight} ${fontSize}px sans-serif`;
    let textWidth = ctx.measureText(text).width;

    // 1. Shrink font size dynamically down to 70% of preferred size if needed
    while (textWidth > maxWidth && fontSize > preferredFontSize * 0.70) {
      fontSize -= 1;
      ctx.font = `${weight} ${fontSize}px sans-serif`;
      textWidth = ctx.measureText(text).width;
    }

    // 2. If still too long at minimum font size, truncate with ellipsis
    let finalText = text;
    if (textWidth > maxWidth) {
      while (ctx.measureText(finalText + '...').width > maxWidth && finalText.length > 3) {
        finalText = finalText.slice(0, -1);
      }
      finalText += '...';
    }

    ctx.fillStyle = color;
    ctx.fillText(finalText, x, y);
  };

  // Draw transparent stamp on canvas with smart text fitting and zero overflow
  const applyStampToCanvas = useCallback((
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    stamp?: CameraStampDetails
  ) => {
    if (!stamp) return;

    const isPortraitCanvas = height > width;
    const stampHeight = isPortraitCanvas
      ? Math.max(90, Math.floor(height * 0.16))
      : Math.max(68, Math.floor(height * 0.18));
    const y = height - stampHeight;

    ctx.save();

    // 1. Transparent gradient background (high visibility, low opacity - non blocking)
    const gradient = ctx.createLinearGradient(0, y, 0, height);
    gradient.addColorStop(0, 'rgba(15, 23, 42, 0.15)');
    gradient.addColorStop(0.3, 'rgba(15, 23, 42, 0.55)');
    gradient.addColorStop(1, 'rgba(15, 23, 42, 0.80)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, y, width, stampHeight);

    // 2. Top Accent Line (Emerald Green)
    ctx.fillStyle = 'rgba(16, 185, 129, 0.90)';
    ctx.fillRect(0, y, width, Math.max(2, Math.floor(height * 0.005)));

    const paddingX = Math.max(14, Math.floor(width * 0.035));
    const maxWidth = width - paddingX * 2;
    const baseFontSize = isPortraitCanvas
      ? Math.max(11, Math.floor(stampHeight * 0.16))
      : Math.max(12, Math.floor(stampHeight * 0.20));

    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }) + ' • ' + now.toLocaleTimeString('id-ID', { hour12: false }) + ' WIB';

    let currentY = y + baseFontSize + Math.floor(stampHeight * 0.09);

    // Subtle text shadow for high contrast
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    if (isPortraitCanvas) {
      // ── PORTRAIT FORMAT (Clean 3-4 stacked lines, zero truncation) ──
      // Line 1: Badge Title
      drawFittedText(
        ctx,
        stamp.badgeTitle || '✓ ABSENTA VERIFIED KBM STAMP',
        paddingX,
        currentY,
        maxWidth,
        Math.max(10, Math.floor(baseFontSize * 0.85)),
        'bold',
        '#34d399'
      );

      // Line 2: Kelas & Mapel
      currentY += baseFontSize + 4;
      const line1Text = `${stamp.kelasNama || 'Kelas'} — ${stamp.mapelNama || 'Mata Pelajaran'}`;
      drawFittedText(
        ctx,
        line1Text,
        paddingX,
        currentY,
        maxWidth,
        Math.max(13, Math.floor(baseFontSize * 1.20)),
        'bold',
        '#ffffff'
      );

      // Line 3: Guru
      currentY += baseFontSize + 4;
      const line2Text = `Pengajar: ${stamp.guruNama || 'Guru'}`;
      drawFittedText(
        ctx,
        line2Text,
        paddingX,
        currentY,
        maxWidth,
        Math.max(11, Math.floor(baseFontSize * 0.95)),
        '600',
        '#e2e8f0'
      );

      // Line 4: Timestamp (Dedicated full line in portrait)
      currentY += baseFontSize + 2;
      drawFittedText(
        ctx,
        dateStr,
        paddingX,
        currentY,
        maxWidth,
        Math.max(10, Math.floor(baseFontSize * 0.85)),
        '500',
        '#94a3b8'
      );
    } else {
      // ── LANDSCAPE FORMAT (Wide horizontal layout) ──
      // Line 1: Badge Title (Left) + Timestamp (Right)
      drawFittedText(
        ctx,
        stamp.badgeTitle || '✓ ABSENTA VERIFIED KBM STAMP',
        paddingX,
        currentY,
        Math.floor(maxWidth * 0.55),
        Math.max(10, Math.floor(baseFontSize * 0.85)),
        'bold',
        '#34d399'
      );

      // Timestamp Right Aligned
      ctx.font = `500 ${Math.max(10, Math.floor(baseFontSize * 0.85))}px sans-serif`;
      ctx.fillStyle = '#cbd5e1';
      const timeWidth = ctx.measureText(dateStr).width;
      ctx.fillText(dateStr, width - paddingX - timeWidth, currentY);

      // Line 2: Kelas & Mapel
      currentY += baseFontSize + 4;
      const line1Text = `${stamp.kelasNama || 'Kelas'} — ${stamp.mapelNama || 'Mata Pelajaran'}`;
      drawFittedText(
        ctx,
        line1Text,
        paddingX,
        currentY,
        maxWidth,
        Math.max(13, Math.floor(baseFontSize * 1.20)),
        'bold',
        '#ffffff'
      );

      // Line 3: Guru
      currentY += baseFontSize + 3;
      const line2Text = `Pengajar: ${stamp.guruNama || 'Guru'}`;
      drawFittedText(
        ctx,
        line2Text,
        paddingX,
        currentY,
        maxWidth,
        Math.max(11, Math.floor(baseFontSize * 0.90)),
        '500',
        '#e2e8f0'
      );
    }

    ctx.restore();
  }, []);

  // Capture current photo frame from video element to Data URL with WYSIWYG crop & orientation awareness
  const capturePhoto = useCallback((
    stampDetails?: CameraStampDetails,
    quality = 0.88,
    captureAngle = 0
  ): string | null => {
    if (!videoRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    const vW = video.videoWidth || idealWidth;
    const vH = video.videoHeight || idealHeight;

    const isStreamLandscape = vW > vH;
    const isTargetLandscape = captureAngle === 90 || captureAngle === 270;

    // Viewport aspect ratio matching (WYSIWYG: Match what the user actually sees on screen)
    const viewW = video.clientWidth || window.innerWidth;
    const viewH = video.clientHeight || window.innerHeight;
    const targetAspect = viewW > 0 && viewH > 0 ? viewW / viewH : (isTargetLandscape ? 16 / 9 : 9 / 16);

    let effectiveAngle = 0;
    if (isTargetLandscape && !isStreamLandscape) {
      effectiveAngle = captureAngle === 270 ? 270 : 90;
    } else if (captureAngle === 180) {
      effectiveAngle = 180;
    }

    const isRotated = effectiveAngle === 90 || effectiveAngle === 270;

    // Calculate crop rectangle on source video buffer to match screen aspect ratio (object-fit: cover simulation)
    const streamAspect = isRotated ? vH / vW : vW / vH;
    let sX = 0, sY = 0, sW = vW, sH = vH;

    if (Math.abs(streamAspect - targetAspect) > 0.05) {
      if (streamAspect > targetAspect) {
        // Stream is wider than viewport -> crop left & right
        const desiredW = Math.round(vH * targetAspect);
        sW = Math.min(vW, desiredW);
        sX = Math.max(0, Math.round((vW - sW) / 2));
      } else {
        // Stream is taller than viewport -> crop top & bottom
        const desiredH = Math.round(vW / targetAspect);
        sH = Math.min(vH, desiredH);
        sY = Math.max(0, Math.round((vH - sH) / 2));
      }
    }

    if (isRotated) {
      canvas.width = sH;
      canvas.height = sW;
    } else {
      canvas.width = sW;
      canvas.height = sH;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.save();

    if (effectiveAngle === 90) {
      ctx.translate(canvas.width, 0);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(video, sX, sY, sW, sH, 0, 0, sW, sH);
    } else if (effectiveAngle === 270) {
      ctx.translate(0, canvas.height);
      ctx.rotate((270 * Math.PI) / 180);
      ctx.drawImage(video, sX, sY, sW, sH, 0, 0, sW, sH);
    } else if (effectiveAngle === 180) {
      ctx.translate(canvas.width, canvas.height);
      ctx.rotate((180 * Math.PI) / 180);
      ctx.drawImage(video, sX, sY, sW, sH, 0, 0, sW, sH);
    } else {
      ctx.drawImage(video, sX, sY, sW, sH, 0, 0, canvas.width, canvas.height);
    }

    ctx.restore();

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
    currentFacingMode,
    startCamera,
    stopCamera,
    switchCamera,
    capturePhoto,
    applyStampToCanvas,
  };
}
