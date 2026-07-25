import { useCallback, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import toast from 'react-hot-toast';

interface ScannerOptions {
  cameraFacing: 'environment' | 'user';
  cameraDeviceId: string | null;
  onScan: (token: string) => Promise<void>;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}

export const useScanner = ({ cameraFacing, cameraDeviceId, onScan }: ScannerOptions) => {
  const [scannerStatus, setScannerStatus] = useState('');
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScanTokenRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);
  const isStoppingRef = useRef<boolean>(false);
  const activeCameraIndexRef = useRef<number>(0);
  const availableCamerasRef = useRef<any[]>([]);

  // Keep latest onScan in ref to keep startScanner callback stable
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const loadVideoDevices = useCallback(async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      const validDevices = devices.filter((d) => !/ir\s|infrared|virtual|obs/i.test(d.label));
      return (validDevices.length > 0 ? validDevices : devices).map((d) => ({
        deviceId: d.id,
        label: d.label,
        kind: 'videoinput' as const,
      }));
    } catch {
      return [];
    }
  }, []);

  const stopScanner = useCallback(async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;
    setScannerStatus('');
    try {
      if (html5QrCodeRef.current) {
        if (html5QrCodeRef.current.isScanning) {
          console.log('[USCANNER_DEBUG] Stopping html5QrCode active scan...');
          await html5QrCodeRef.current.stop();
        }
        console.log('[USCANNER_DEBUG] Clearing html5QrCode instance...');
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      }
    } catch (e) {
      console.warn('[USCANNER_DEBUG] Stop scanner warning:', e);
    } finally {
      isStoppingRef.current = false;
    }
  }, []);

  const startScanner = useCallback(async (forceRestart = false) => {
    // If camera is already scanning active and NOT a forced restart, skip restart to prevent flicker
    if (!forceRestart && html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      console.log('[USCANNER_DEBUG] Camera is already active and scanning. Skipping redundant restart.');
      return;
    }

    console.log('[USCANNER_DEBUG] startScanner initiated! (forceRestart:', forceRestart, ')');
    try {
      await stopScanner();

      // Wait for #qr-reader element to mount in DOM
      console.log('[USCANNER_DEBUG] Searching for #qr-reader element in DOM...');
      let container: HTMLElement | null = null;
      for (let i = 0; i < 50; i++) {
        container = document.getElementById('qr-reader');
        if (container) break;
        await new Promise((res) => setTimeout(res, 100));
      }

      if (!container) {
        console.error('[USCANNER_DEBUG] #qr-reader element NOT FOUND in DOM after 5 seconds!');
        setScannerStatus('Elemen pemindai QR (#qr-reader) tidak ditemukan di DOM');
        return;
      }

      console.log('[USCANNER_DEBUG] Found #qr-reader. Container size:', container.clientWidth, 'x', container.clientHeight);
      container.innerHTML = '';

      // Fetch actual hardware cameras first
      let rawCameras: any[] = [];
      try {
        rawCameras = await Html5Qrcode.getCameras();
        console.log('[USCANNER_DEBUG] Raw hardware cameras:', rawCameras);
      } catch (camErr: any) {
        console.warn('[USCANNER_DEBUG] getCameras error:', camErr);
        if (String(camErr?.message || camErr).toLowerCase().includes('permission') || String(camErr).includes('NotAllowedError')) {
          setScannerStatus('⚠️ IZIN KAMERA DITOLAK: Klik ikon Gembok di baris URL -> Izin Kamera -> Izinkan (Allow), lalu tekan F5.');
          return;
        }
      }

      const rgbCameras = rawCameras.filter((c) => !/ir\s|infrared|virtual|obs/i.test(c.label));
      const cameras = rgbCameras.length > 0 ? rgbCameras : rawCameras;
      availableCamerasRef.current = cameras;

      const html5QrCode = new Html5Qrcode('qr-reader');
      html5QrCodeRef.current = html5QrCode;

      setScannerStatus('Memulai Pemindai Kamera Belakang HD...');

      // Smart camera selection: Prioritize Rear/Back camera by default for mobile devices
      let cameraConfig: any = null;
      if (cameraDeviceId) {
        cameraConfig = {
          deviceId: { exact: cameraDeviceId },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        };
      } else if (cameras && cameras.length > 0) {
        const backCam = cameras.find((c) => /back|rear|environment|main|0/i.test(c.label));
        const frontCam = cameras.find((c) => /front|user|facing/i.test(c.label));
        let selectedId = cameras[activeCameraIndexRef.current % cameras.length].id;

        if (cameraFacing === 'environment' && backCam) {
          selectedId = backCam.id;
        } else if (cameraFacing === 'user' && frontCam) {
          selectedId = frontCam.id;
        }

        cameraConfig = {
          deviceId: { exact: selectedId },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        };
      } else {
        cameraConfig = {
          facingMode: cameraFacing,
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        };
      }

      const qrConfig = {
        fps: 30,
        aspectRatio: 1.777778,
        videoConstraints: {
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      };

      const handleSuccess = async (decodedText: string) => {
        const token = decodedText ? decodedText.trim() : '';
        if (token) {
          const now = Date.now();
          // Strict 5-second anti-loop cooldown for identical token
          if (token === lastScanTokenRef.current && now - lastScanTimeRef.current < 5000) {
            return;
          }

          console.log('⚡⚡⚡ [USCANNER_DEBUG] DECODED QR TEXT:', token);
          lastScanTokenRef.current = token;
          lastScanTimeRef.current = now;

          toast.success(`QR TERBACA: ${token}`, { id: 'qr-toast-success', duration: 2000 });
          await onScanRef.current(token);
        }
      };

      try {
        await html5QrCode.start(cameraConfig, qrConfig, handleSuccess, () => {});
      } catch (startErr: any) {
        console.warn('[USCANNER_DEBUG] Target HD camera start failed, trying fallback basic config:', startErr);
        try {
          if (cameras && cameras.length > 0) {
            await html5QrCode.start(cameras[0].id, { fps: 30, aspectRatio: 1.777778 }, handleSuccess, () => {});
          } else {
            await html5QrCode.start({ facingMode: 'environment' }, { fps: 30, aspectRatio: 1.777778 }, handleSuccess, () => {});
          }
        } catch (fallbackErr) {
          console.error('[USCANNER_DEBUG] Fallback camera start error:', fallbackErr);
        }
      }

      // Apply Hardware Auto-Focus and Continuous Focus Constraints if supported
      try {
        const videoEl = document.querySelector('#qr-reader video') as HTMLVideoElement | null;
        if (videoEl && videoEl.srcObject) {
          const stream = videoEl.srcObject as MediaStream;
          const [track] = stream.getVideoTracks();
          if (track && typeof track.getCapabilities === 'function') {
            const caps = track.getCapabilities() as any;
            console.log('[USCANNER_DEBUG] Hardware camera capabilities:', caps);

            const constraintsToApply: any = {};

            if (caps.focusMode && Array.isArray(caps.focusMode) && caps.focusMode.includes('continuous')) {
              constraintsToApply.focusMode = 'continuous';
            }

            if (caps.zoom) {
              const targetZoom = Math.min(caps.zoom.max || 1, Math.max(caps.zoom.min || 1, 1.2));
              constraintsToApply.zoom = targetZoom;
            }

            if (Object.keys(constraintsToApply).length > 0) {
              await track.applyConstraints({ advanced: [constraintsToApply] });
              console.log('✅ [USCANNER_DEBUG] Applied hardware Auto-Focus constraints:', constraintsToApply);
            }
          }
        }
      } catch (focusErr) {
        console.warn('[USCANNER_DEBUG] Non-critical focus constraint warning:', focusErr);
      }

      const currentCamLabel = cameras.length > 0 ? cameras[activeCameraIndexRef.current % cameras.length]?.label || 'Kamera Belakang' : 'Kamera Belakang';
      console.log('✅ [USCANNER_DEBUG] html5QrCode.start SUCCESSFUL with camera:', currentCamLabel);
      setScannerStatus(`Kamera Aktif: ${currentCamLabel}`);
    } catch (e: any) {
      console.error('[USCANNER_DEBUG] Start scanner exception:', e);
      setScannerStatus(String(e?.message || 'Gagal memulai pemindai kamera'));
    }
  }, [cameraDeviceId, cameraFacing, stopScanner]);

  const cycleCamera = useCallback(async () => {
    if (availableCamerasRef.current.length > 1) {
      activeCameraIndexRef.current = (activeCameraIndexRef.current + 1) % availableCamerasRef.current.length;
      console.log('[USCANNER_DEBUG] Cycling to next camera index:', activeCameraIndexRef.current);
      await stopScanner();
      await startScanner(true);
    } else {
      console.log('[USCANNER_DEBUG] Only 1 registered camera, forcing re-scan hardware list...');
      activeCameraIndexRef.current = activeCameraIndexRef.current + 1;
      await stopScanner();
      await startScanner(true);
    }
  }, [startScanner, stopScanner]);

  return {
    scannerStatus,
    startScanner,
    stopScanner,
    loadVideoDevices,
    cycleCamera
  };
};
