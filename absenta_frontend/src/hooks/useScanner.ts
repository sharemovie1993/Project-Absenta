import { useCallback, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

interface ScannerOptions {
  cameraFacing: 'environment' | 'user';
  cameraDeviceId: string | null;
  onScan: (token: string) => Promise<void>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export const useScanner = ({ cameraFacing, cameraDeviceId, onScan, videoRef }: ScannerOptions) => {
  const [scannerStatus, setScannerStatus] = useState('');
  const scannerRunningRef = useRef<boolean>(false);
  const detectorRef = useRef<any>(null);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const lastScanTokenRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  const loadVideoDevices = useCallback(async () => {
    try {
      let devices = await navigator.mediaDevices.enumerateDevices();
      devices = devices.filter((d) => d.kind === 'videoinput');
      return devices;
    } catch {
      return [];
    }
  }, []);

  const buildVideoConstraints = useCallback((deviceId: string | null) => {
    const base: any = {
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
    };
    if (deviceId) base.video.deviceId = { exact: deviceId };
    else base.video.facingMode = cameraFacing;
    return base;
  }, [cameraFacing]);

  const startScanner = useCallback(async () => {
    try {
      const BarcodeDetectorCtor = (window as any).BarcodeDetector;
      if (BarcodeDetectorCtor) {
        const formats = ['qr_code', 'code_128', 'ean_13', 'code_39', 'upc_a', 'data_matrix', 'pdf417'];
        detectorRef.current = new BarcodeDetectorCtor({ formats });
        const constraints = buildVideoConstraints(cameraDeviceId);
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
            const det = detectorRef.current;
            if (videoEl && det) {
              const results = await det.detect(videoEl);
              const raw = results && results[0] && results[0].rawValue;
              const token = typeof raw === 'string' ? raw.trim() : '';
              if (token) {
                const now = Date.now();
                if (!(token === lastScanTokenRef.current && now - lastScanTimeRef.current < 1500)) {
                  await onScan(token);
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
        zxingReaderRef.current = new BrowserMultiFormatReader();
        scannerRunningRef.current = true;
        setScannerStatus('Scanner aktif');
        if (videoRef.current) {
          await zxingReaderRef.current.decodeFromVideoDevice(
            cameraDeviceId || undefined,
            videoRef.current,
            async (result) => {
              if (!scannerRunningRef.current) return;
              const token = result && typeof result.getText === 'function' ? String(result.getText()).trim() : '';
              if (token) {
                const now = Date.now();
                if (!(token === lastScanTokenRef.current && now - lastScanTimeRef.current < 1500)) {
                  await onScan(token);
                  lastScanTokenRef.current = token;
                  lastScanTimeRef.current = now;
                }
              }
            }
          );
        }
      }
    } catch (e: any) {
      setScannerStatus(String(e?.message || 'Gagal memulai scanner'));
    }
  }, [cameraDeviceId, buildVideoConstraints, onScan, videoRef]);

  const stopScanner = useCallback(async () => {
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
        await (zxingReaderRef.current as any).reset?.();
      }
    } catch {}
  }, [videoRef]);

  return {
    scannerStatus,
    startScanner,
    stopScanner,
    loadVideoDevices
  };
};
