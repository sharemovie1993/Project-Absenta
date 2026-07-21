import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { X, SwitchCamera, Camera, AlertCircle, RefreshCw } from 'lucide-react';

interface LoginQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (code: string) => void;
}

export const LoginQrScannerModal: React.FC<LoginQrScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [statusText, setStatusText] = useState<string>('Menginisialisasi kamera...');
  const [hasError, setHasError] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // Stop active camera controls
  const stopCamera = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    setIsScanning(false);
  }, []);

  // Start scanning on selected device
  const startScanner = useCallback(
    async (deviceId?: string) => {
      stopCamera();
      setHasError(false);
      setStatusText('Membuka akses kamera...');

      try {
        const codeReader = new BrowserMultiFormatReader();

        // Enumerate devices if not already loaded
        let availableDevices = devices;
        if (availableDevices.length === 0) {
          availableDevices = await BrowserMultiFormatReader.listVideoInputDevices();
          setDevices(availableDevices);
        }

        const targetDeviceId = deviceId || (availableDevices.length > 0 ? availableDevices[0].deviceId : undefined);

        if (!videoRef.current) return;

        setStatusText('Arahkan QR Code atau Barcode ke dalam kotak...');
        setIsScanning(true);

        const controls = await codeReader.decodeFromVideoDevice(
          targetDeviceId,
          videoRef.current,
          (result, error, controls) => {
            if (result) {
              const scannedText = result.getText().trim();
              if (scannedText) {
                // Play audio beep feedback if possible
                try {
                  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                  const osc = audioCtx.createOscillator();
                  const gain = audioCtx.createGain();
                  osc.connect(gain);
                  gain.connect(audioCtx.destination);
                  osc.frequency.value = 880; // A5 pitch
                  gain.gain.value = 0.1;
                  osc.start();
                  osc.stop(audioCtx.currentTime + 0.15);
                } catch {
                  // Audio Context fallback ignored
                }

                controls.stop();
                controlsRef.current = null;
                onScanSuccess(scannedText);
                onClose();
              }
            }
          }
        );

        controlsRef.current = controls;
      } catch (err: any) {
        console.error('Camera Scanner Error:', err);
        setHasError(true);
        setStatusText(
          err?.name === 'NotAllowedError'
            ? 'Izin kamera ditolak. Silakan izinkan akses kamera di browser Anda.'
            : 'Gagal membuka kamera. Pastikan kamera terhubung dan tidak digunakan aplikasi lain.'
        );
        setIsScanning(false);
      }
    },
    [devices, stopCamera, onScanSuccess, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      startScanner(selectedDeviceId);
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, selectedDeviceId, startScanner, stopCamera]);

  const handleSwitchCamera = () => {
    if (devices.length < 2) return;
    const currentIndex = devices.findIndex((d) => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    const nextDeviceId = devices[nextIndex].deviceId;
    setSelectedDeviceId(nextDeviceId);
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
                Pindai QR Code atau Barcode pada Kartu Pelajar/Pegawai
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
        <div className="relative aspect-square max-h-[380px] bg-black flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
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

          {/* Error Message Display */}
          {hasError && (
            <div className="p-6 text-center text-white flex flex-col items-center gap-3">
              <AlertCircle className="w-12 h-12 text-red-400" />
              <p className="text-sm font-medium text-slate-200">{statusText}</p>
              <button
                onClick={() => startScanner(selectedDeviceId)}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-lg transition-all"
              >
                <RefreshCw className="w-4 h-4" /> Coba Lagi
              </button>
            </div>
          )}
        </div>

        {/* Footer / Controls */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-[280px]">
            {!hasError && statusText}
          </p>

          <div className="flex gap-2">
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
