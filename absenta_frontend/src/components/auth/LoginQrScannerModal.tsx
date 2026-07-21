import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { X, SwitchCamera, Camera, AlertCircle, RefreshCw, Upload, Image as ImageIcon } from 'lucide-react';

interface LoginQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (code: string) => void;
}

/**
 * Smart extractor to safely extract NISN / NIP / Email from raw QR text or JSON payload
 */
function extractIdentityFromQrText(rawText: string): string {
  const trimmed = rawText.trim();
  if (!trimmed) return '';

  // Try parsing as JSON if QR contains encoded object
  try {
    const obj = JSON.parse(trimmed);
    if (obj && typeof obj === 'object') {
      const candidate = obj.nisn || obj.nip || obj.nis || obj.email || obj.username || obj.id || obj.code;
      if (candidate) {
        return String(candidate).trim();
      }
    }
  } catch {
    // Plain text payload
  }

  // Handle URL format (e.g., https://absenta.id/student/12345678)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed);
      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length > 0) {
        return segments[segments.length - 1];
      }
    } catch {
      // Ignore URL parsing errors
    }
  }

  return trimmed;
}

export const LoginQrScannerModal: React.FC<LoginQrScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [statusText, setStatusText] = useState<string>('Menginisialisasi kamera...');
  const [hasError, setHasError] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isFileLoading, setIsFileLoading] = useState<boolean>(false);

  // Play audio beep feedback
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = 880; // A5 pitch
      gain.gain.value = 0.12;
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {
      // Audio Context fallback ignored
    }
  };

  // Safe camera cleanup
  const cleanupCamera = () => {
    if (controlsRef.current) {
      try {
        controlsRef.current.stop();
      } catch {}
      controlsRef.current = null;
    }

    if (videoRef.current && videoRef.current.srcObject) {
      try {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      } catch {}
      videoRef.current.srcObject = null;
    }
  };

  // Stable Camera Init Effect (Only runs when modal opens or selected camera changes)
  useEffect(() => {
    if (!isOpen) {
      cleanupCamera();
      setIsScanning(false);
      return;
    }

    let isMounted = true;
    let controlsInstance: IScannerControls | null = null;

    const initScanner = async () => {
      cleanupCamera();
      setHasError(false);
      setStatusText('Membuka kamera...');

      try {
        const reader = new BrowserMultiFormatReader();

        // Enumerate devices
        let videoDevices: MediaDeviceInfo[] = [];
        try {
          videoDevices = await BrowserMultiFormatReader.listVideoInputDevices();
          if (isMounted) setDevices(videoDevices);
        } catch {}

        // Prioritize back/rear camera by default if no camera is selected yet
        let targetDeviceId = selectedDeviceId;
        if (!targetDeviceId && videoDevices.length > 0) {
          const backCamera = videoDevices.find((device) => {
            const label = device.label.toLowerCase();
            return (
              label.includes('back') ||
              label.includes('rear') ||
              label.includes('environment') ||
              label.includes('belakang') ||
              label.includes('out') ||
              label.includes('camera 0') // Common default main rear camera index
            );
          });
          targetDeviceId = backCamera ? backCamera.deviceId : videoDevices[0].deviceId;
          if (isMounted && targetDeviceId !== selectedDeviceId) {
            setSelectedDeviceId(targetDeviceId);
          }
        }

        const activeDeviceId = targetDeviceId || (videoDevices.length > 0 ? videoDevices[0].deviceId : undefined);

        if (!videoRef.current || !isMounted) return;

        setStatusText('Arahkan QR Code atau Barcode ke kamera...');
        setIsScanning(true);

        controlsInstance = await reader.decodeFromVideoDevice(
          activeDeviceId,
          videoRef.current,
          (result, error, controls) => {
            if (result && isMounted) {
              const scannedRaw = result.getText().trim();
              const extracted = extractIdentityFromQrText(scannedRaw);
              if (extracted) {
                playBeep();
                try {
                  controls.stop();
                } catch {}
                cleanupCamera();
                onScanSuccess(extracted);
                onClose();
              }
            }
          }
        );

        if (isMounted) {
          controlsRef.current = controlsInstance;
        } else {
          try {
            controlsInstance.stop();
          } catch {}
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Camera Init Error:', err);
        setHasError(true);
        setStatusText(
          err?.name === 'NotAllowedError'
            ? 'Izin kamera ditolak. Harap izinkan akses kamera di browser Anda.'
            : 'Gagal membuka kamera. Anda bisa menggunakan tombol Upload Foto Kartu.'
        );
        setIsScanning(false);
      }
    };

    // Small 150ms delay to ensure video DOM node is mounted and ready
    const timer = setTimeout(() => {
      initScanner();
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      cleanupCamera();
    };
  }, [isOpen, selectedDeviceId]);

  const handleSwitchCamera = () => {
    if (devices.length < 2) return;
    const currentIndex = devices.findIndex((d) => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    const nextDeviceId = devices[nextIndex].deviceId;
    setSelectedDeviceId(nextDeviceId);
  };

  // Scan QR from Image File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsFileLoading(true);
    setStatusText('Membaca QR Code dari file foto...');

    try {
      const imageUrl = URL.createObjectURL(file);
      const codeReader = new BrowserMultiFormatReader();
      const result = await codeReader.decodeFromImageUrl(imageUrl);
      
      URL.revokeObjectURL(imageUrl);

      if (result) {
        const rawText = result.getText().trim();
        const extracted = extractIdentityFromQrText(rawText);
        if (extracted) {
          playBeep();
          cleanupCamera();
          onScanSuccess(extracted);
          onClose();
        }
      } else {
        alert('Gagal mendeteksi QR Code atau Barcode pada foto ini. Pastikan foto terlihat jelas.');
      }
    } catch (err) {
      console.error('File QR Decode Error:', err);
      alert('Gagal membaca QR Code dari foto ini. Pastikan foto kartu terfokus dan tidak kabur.');
    } finally {
      setIsFileLoading(false);
      setStatusText('Arahkan QR Code atau Barcode ke dalam kotak...');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Scan Kartu NISN / NIP
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pindai QR / Barcode atau unggah foto kartu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Scanner Area */}
        <div className="relative aspect-square max-h-[360px] bg-black flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            muted
            playsInline
          />

          {/* Scanner Overlay Viewfinder */}
          {isScanning && !hasError && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              {/* Outer dimmed border */}
              <div className="w-64 h-64 relative border-2 border-blue-500/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] flex items-center justify-center">
                {/* Corner Accents */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />

                {/* Pulsing Scan Line */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
              </div>
            </div>
          )}

          {/* Loading File Overlay */}
          {isFileLoading && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-3 z-20">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
              <p className="text-xs font-bold text-slate-200">Membaca QR dari gambar foto...</p>
            </div>
          )}

          {/* Error Message Display */}
          {hasError && !isFileLoading && (
            <div className="p-6 text-center text-white flex flex-col items-center gap-3">
              <AlertCircle className="w-12 h-12 text-red-400" />
              <p className="text-sm font-medium text-slate-200">{statusText}</p>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDeviceId((prev) => prev)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-lg transition-all"
                >
                  <RefreshCw className="w-4 h-4" /> Coba Lagi
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold shadow-lg transition-all"
                >
                  <Upload className="w-4 h-4" /> Upload Foto Kartu
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />

        {/* Footer / Controls */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-[220px]">
            {!hasError && statusText}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-xl text-xs font-bold transition-colors"
              title="Unggah foto kartu dari galeri"
            >
              <ImageIcon className="w-4 h-4" />
              Upload Foto
            </button>

            {devices.length > 1 && (
              <button
                type="button"
                onClick={handleSwitchCamera}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                title="Ganti Kamera"
              >
                <SwitchCamera className="w-4 h-4" />
                Ganti Kamera
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
