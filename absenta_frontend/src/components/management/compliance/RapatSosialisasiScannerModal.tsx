import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { X, SwitchCamera, Camera, AlertCircle, CheckCircle2, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui';

export interface RapatSosialisasiScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanResult: (code: string) => void;
  lastScannedTeacher?: { nama: string; nip: string } | null;
}

export const RapatSosialisasiScannerModal: React.FC<RapatSosialisasiScannerModalProps> = ({
  isOpen,
  onClose,
  onScanResult,
  lastScannedTeacher,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [statusText, setStatusText] = useState<string>('Menginisialisasi kamera...');
  const [hasError, setHasError] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // Ambil daftar perangkat kamera
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;

    async function initCamera() {
      try {
        setHasError(false);
        setStatusText('Mendeteksi perangkat kamera...');

        const codeReader = new BrowserMultiFormatReader();
        const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices();

        if (!mounted) return;

        if (videoInputDevices.length === 0) {
          setHasError(true);
          setStatusText('Kamera tidak ditemukan pada perangkat ini.');
          return;
        }

        setDevices(videoInputDevices);

        // Prioritaskan kamera belakang (environment) jika di ponsel / tablet
        const backCamera = videoInputDevices.find(
          (d) =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('belakang') ||
            d.label.toLowerCase().includes('environment')
        );

        const chosenDeviceId = backCamera ? backCamera.deviceId : videoInputDevices[0].deviceId;
        setSelectedDeviceId(chosenDeviceId);
      } catch (err: any) {
        if (!mounted) return;
        setHasError(true);
        setStatusText('Izin kamera ditolak atau kamera sedang digunakan aplikasi lain.');
      }
    }

    initCamera();

    return () => {
      mounted = false;
      if (controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
      }
    };
  }, [isOpen]);

  // Mulai streaming kamera & decode QR
  useEffect(() => {
    if (!isOpen || !selectedDeviceId || !videoRef.current) return;

    let isSubscribed = true;
    const codeReader = new BrowserMultiFormatReader();

    async function startDecoding() {
      try {
        if (controlsRef.current) {
          controlsRef.current.stop();
          controlsRef.current = null;
        }

        setIsScanning(true);
        setStatusText('Arahkan kamera ke Kartu QR / Barcode Guru...');

        const controls = await codeReader.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current!,
          (result, error) => {
            if (!isSubscribed) return;

            if (result) {
              const text = result.getText().trim();
              if (text) {
                onScanResult(text);
              }
            }
          }
        );

        if (isSubscribed) {
          controlsRef.current = controls;
        } else {
          controls.stop();
        }
      } catch (err: any) {
        if (isSubscribed) {
          setHasError(true);
          setStatusText('Gagal membuka stream kamera: ' + (err.message || 'Error'));
          setIsScanning(false);
        }
      }
    }

    startDecoding();

    return () => {
      isSubscribed = false;
      if (controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
      }
    };
  }, [isOpen, selectedDeviceId, onScanResult]);

  const handleToggleCamera = () => {
    if (devices.length <= 1) return;
    const currentIndex = devices.findIndex((d) => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    setSelectedDeviceId(devices[nextIndex].deviceId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header Modal */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 flex items-center justify-center font-bold">
              <Camera size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Live Scanner Registrasi Panitia
              </h3>
              <p className="text-[11px] text-slate-500">Scan QR / Kartu Identitas Peserta Rapat</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Video Camera Container */}
        <div className="relative w-full aspect-square bg-black flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />

          {/* Target Reticle Overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
            <div className="w-56 h-56 border-2 border-indigo-400/80 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
              {/* Corner accents */}
              <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-indigo-500 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-indigo-500 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-indigo-500 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-indigo-500 rounded-br-lg" />

              {/* Animated laser line */}
              <div className="w-full h-0.5 bg-indigo-500/80 absolute top-1/2 -translate-y-1/2 animate-pulse shadow-md" />
            </div>
          </div>

          {/* Switch Camera Button (jika multi-kamera) */}
          {devices.length > 1 && (
            <button
              type="button"
              onClick={handleToggleCamera}
              className="absolute top-3 right-3 p-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full shadow-md backdrop-blur-sm cursor-pointer transition-colors"
              title="Ganti Kamera"
            >
              <SwitchCamera size={16} />
            </button>
          )}

          {/* Error Banner */}
          {hasError && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center text-rose-300">
              <AlertCircle size={36} className="mb-2 text-rose-500" />
              <p className="text-xs font-semibold">{statusText}</p>
            </div>
          )}
        </div>

        {/* Footer & Live Last Scanned Info */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 space-y-3">
          {lastScannedTeacher ? (
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <div className="text-left">
                  <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                    {lastScannedTeacher.nama}
                  </p>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
                    NIP: {lastScannedTeacher.nip} • Hadir
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-300">
                Tercatat
              </span>
            </div>
          ) : (
            <p className="text-center text-xs text-slate-500 dark:text-slate-400">
              {statusText}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Tutup Scanner
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
