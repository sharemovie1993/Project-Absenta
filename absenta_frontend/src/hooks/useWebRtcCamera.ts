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
  const startRequestIdRef = useRef<number>(0);
  const currentFacingModeRef = useRef<'environment' | 'user'>(facingMode);

  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState<boolean>(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string>('');
  const [currentFacingMode, setCurrentFacingModeState] = useState<'environment' | 'user'>(facingMode);

  const setCurrentFacingMode = useCallback((mode: 'environment' | 'user') => {
    currentFacingModeRef.current = mode;
    setCurrentFacingModeState(mode);
  }, []);

  // Cleanly stop stream tracks & detach video element
  const stopCamera = useCallback(() => {
    // Invalidate any in-flight startCamera request
    startRequestIdRef.current += 1;

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
      if (!navigator.mediaDevices?.enumerateDevices) return [];
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

  // Detect if an error is strictly a permission denial
  const checkIsPermissionDeniedError = (err: any): boolean => {
    if (!err) return false;
    const name = String(err.name || '');
    const msg = String(err.message || '').toLowerCase();
    return (
      name === 'NotAllowedError' ||
      name === 'PermissionDeniedError' ||
      name === 'SecurityError' ||
      msg.includes('permission denied') ||
      msg.includes('permission dismissed') ||
      msg.includes('not allowed')
    );
  };

  // Start camera with requested deviceId or facingMode constraints
  const startCamera = useCallback(async (deviceId?: string, targetFacingMode?: 'environment' | 'user') => {
    setCameraError(null);
    setIsPermissionDenied(false);

    const modeToUse = targetFacingMode || currentFacingModeRef.current;
    if (targetFacingMode) {
      currentFacingModeRef.current = targetFacingMode;
      setCurrentFacingModeState(targetFacingMode);
    }

    console.log('[AbsentaCamera] 🎬 startCamera called. Target mode:', modeToUse, 'Target deviceId:', deviceId || '(none)');

    if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      console.error('[AbsentaCamera] ❌ Insecure context (HTTP). Camera requires HTTPS.');
      setCameraError('Akses kamera membutuhkan koneksi aman (HTTPS). Pastikan Anda mengakses alamat situs dengan https://');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      console.error('[AbsentaCamera] ❌ navigator.mediaDevices.getUserMedia is not supported on this browser/context.');
      setCameraError('Fitur kamera live tidak didukung pada peramban ini. Silakan gunakan tombol "Buka Kamera Sistem" di bawah.');
      return;
    }

    try {
      // 1. Cleanly stop old stream tracks and detach video element first so hardware sensor is released
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          try { track.stop(); } catch (_) {}
        });
        streamRef.current = null;
      }
      if (videoRef.current) {
        try { videoRef.current.pause(); } catch (_) {}
        videoRef.current.srcObject = null;
      }
      setIsCameraActive(false);

      const requestId = ++startRequestIdRef.current;

      // Pause to ensure mobile OS releases the hardware camera sensor
      await new Promise((r) => setTimeout(r, 120));
      if (requestId !== startRequestIdRef.current) return;

      let stream: MediaStream | null = null;
      let usedStrategy = '';
      let lastError: any = null;

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
          lastError = err1;
          console.warn('[AbsentaCamera] ⚠️ Strategy 1 (deviceId) failed:', err1.name, err1.message);
          if (checkIsPermissionDeniedError(err1)) {
            throw err1;
          }
          if (err1?.name === 'NotReadableError' || err1?.name === 'TrackStartError') {
            await new Promise((r) => setTimeout(r, 350));
          }
        }
      }

      // Strategy 2: Standard facingMode string (Most compatible with modern Chrome, Safari & Capacitor WebView)
      if (!stream) {
        try {
          console.log('[AbsentaCamera] 🔍 Attempting Strategy 2: facingMode:', modeToUse);
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: modeToUse },
              width: { ideal: idealWidth },
              height: { ideal: idealHeight },
            },
            audio: false,
          });
          usedStrategy = `Strategy 2 (facingMode ideal: ${modeToUse})`;
        } catch (err2: any) {
          lastError = err2;
          console.warn('[AbsentaCamera] ⚠️ Strategy 2 (facingMode) failed:', err2.name, err2.message);
          if (checkIsPermissionDeniedError(err2)) {
            throw err2;
          }
          if (err2?.name === 'NotReadableError' || err2?.name === 'TrackStartError') {
            await new Promise((r) => setTimeout(r, 350));
          }
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
          lastError = err3;
          console.warn('[AbsentaCamera] ⚠️ Strategy 3 failed:', err3.name, err3.message);
          if (checkIsPermissionDeniedError(err3)) {
            throw err3;
          }
          if (err3?.name === 'NotReadableError' || err3?.name === 'TrackStartError') {
            await new Promise((r) => setTimeout(r, 350));
          }
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

      // Check if modal closed or another startCamera superseded this request while waiting for user permission
      if (requestId !== startRequestIdRef.current) {
        stream.getTracks().forEach((t) => {
          try { t.stop(); } catch (_) {}
        });
        return;
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
        const videoEl = videoRef.current;
        videoEl.muted = true;
        videoEl.playsInline = true;
        videoEl.setAttribute('playsinline', 'true');
        videoEl.setAttribute('webkit-playsinline', 'true');
        videoEl.srcObject = stream;
        await videoEl.play().catch((playErr) => {
          console.warn('[AbsentaCamera] ⚠️ video.play() warning:', playErr);
        });
      }

      setIsCameraActive(true);
      setCameraError(null);
      setIsPermissionDenied(false);

      refreshDevices();
    } catch (err: any) {
      console.error('[AbsentaCamera] ❌ ALL camera acquisition strategies failed:', err?.name, err?.message, err);
      setIsCameraActive(false);

      const denied = checkIsPermissionDeniedError(err);
      setIsPermissionDenied(denied);

      const isCapacitorNative =
        typeof window !== 'undefined' &&
        Boolean((window as any).Capacitor?.isNativePlatform?.() || (window as any).Capacitor?.isNative);

      if (denied) {
        if (isCapacitorNative) {
          setCameraError(
            'Izin kamera belum aktif di aplikasi. Buka Pengaturan HP ➔ Aplikasi ➔ Absenta ➔ Izin ➔ Kamera ➔ pilih "Izinkan", atau gunakan tombol "Buka Kamera Sistem" di bawah.'
          );
        } else {
          setCameraError(
            'Izin akses kamera ditolak oleh browser. Klik ikon Gembok / Pengaturan Situs di sebelah kiri alamat URL atas, ubah Kamera menjadi "Izinkan (Allow)", atau gunakan tombol "Buka Kamera Sistem" di bawah.'
          );
        }
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        setCameraError('Perangkat kamera tidak ditemukan pada perangkat Anda. Gunakan tombol "Buka Kamera Sistem" di bawah.');
      } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
        setCameraError('Kamera sedang digunakan oleh aplikasi lain atau tab browser lain. Tutup aplikasi kamera lain lalu klik "Coba Akses Lagi", atau gunakan "Buka Kamera Sistem".');
      } else {
        setCameraError(`Gagal mengaktifkan kamera live (${err?.name || 'Error'}). Silakan klik "Coba Akses Lagi" atau gunakan "Buka Kamera Sistem" di bawah.`);
      }
    }
  }, [idealWidth, idealHeight, refreshDevices]);

  // Listen for browser camera permission state changes so granting permission auto-starts camera
  useEffect(() => {
    let permStatus: PermissionStatus | null = null;
    let isMounted = true;

    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'camera' as PermissionName })
        .then((status) => {
          if (!isMounted) return;
          permStatus = status;
          status.onchange = () => {
            if (!isMounted) return;
            if (status.state === 'granted' && !streamRef.current) {
              console.log('[AbsentaCamera] 🔓 Camera permission granted via browser settings, auto-starting camera...');
              startCamera();
            }
          };
        })
        .catch(() => {
          // Ignore on browsers that don't support querying 'camera' permission
        });
    }

    return () => {
      isMounted = false;
      if (permStatus) {
        permStatus.onchange = null;
      }
    };
  }, [startCamera]);

  // Switch smoothly between front (selfie) and rear (classroom) cameras
  const switchCamera = useCallback(async () => {
    const prevMode = currentFacingModeRef.current;
    const nextMode = prevMode === 'environment' ? 'user' : 'environment';
    console.log('[AbsentaCamera] 🔄 switchCamera clicked! Switching from', prevMode, '➔', nextMode);
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
  }, [devices, activeDeviceId, refreshDevices, startCamera, setCurrentFacingMode]);

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
    quality = 0.75,
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

    // ⚡ Optimasi Resolusi: Batasi dimensi maksimal ke 960px agar payload Base64 hemat & anti-ghost response
    const rawOutW = isRotated ? sH : sW;
    const rawOutH = isRotated ? sW : sH;
    const maxDim = 960;
    let finalW = rawOutW;
    let finalH = rawOutH;
    if (Math.max(rawOutW, rawOutH) > maxDim) {
      const scale = maxDim / Math.max(rawOutW, rawOutH);
      finalW = Math.round(rawOutW * scale);
      finalH = Math.round(rawOutH * scale);
    }

    canvas.width = finalW;
    canvas.height = finalH;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.save();

    if (effectiveAngle === 90) {
      ctx.translate(canvas.width, 0);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(video, sX, sY, sW, sH, 0, 0, finalH, finalW);
    } else if (effectiveAngle === 270) {
      ctx.translate(0, canvas.height);
      ctx.rotate((270 * Math.PI) / 180);
      ctx.drawImage(video, sX, sY, sW, sH, 0, 0, finalH, finalW);
    } else if (effectiveAngle === 180) {
      ctx.translate(canvas.width, canvas.height);
      ctx.rotate((180 * Math.PI) / 180);
      ctx.drawImage(video, sX, sY, sW, sH, 0, 0, finalW, finalH);
    } else {
      ctx.drawImage(video, sX, sY, sW, sH, 0, 0, finalW, finalH);
    }

    ctx.restore();

    if (stampDetails) {
      applyStampToCanvas(ctx, canvas.width, canvas.height, stampDetails);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    return dataUrl;
  }, [idealWidth, idealHeight, applyStampToCanvas]);

  // Process external image file (e.g. from native system camera capture input fallback) with the exact same KBM stamp
  const processExternalImageFile = useCallback((
    file: File,
    stampDetails?: CameraStampDetails,
    quality = 0.75
  ): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!file) {
        resolve(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const resultUrl = e.target?.result as string;
        if (!resultUrl) {
          resolve(null);
          return;
        }

        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current || document.createElement('canvas');
          const rawW = img.naturalWidth || img.width || 1280;
          const rawH = img.naturalHeight || img.height || 720;
          const maxDim = 960;
          let finalW = rawW;
          let finalH = rawH;

          if (Math.max(rawW, rawH) > maxDim) {
            const scale = maxDim / Math.max(rawW, rawH);
            finalW = Math.round(rawW * scale);
            finalH = Math.round(rawH * scale);
          }

          canvas.width = finalW;
          canvas.height = finalH;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }

          ctx.drawImage(img, 0, 0, finalW, finalH);

          if (stampDetails) {
            applyStampToCanvas(ctx, canvas.width, canvas.height, stampDetails);
          }

          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(null);
        img.src = resultUrl;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }, [applyStampToCanvas]);

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
    isPermissionDenied,
    devices,
    activeDeviceId,
    currentFacingMode,
    startCamera,
    stopCamera,
    switchCamera,
    capturePhoto,
    processExternalImageFile,
    applyStampToCanvas,
  };
}
