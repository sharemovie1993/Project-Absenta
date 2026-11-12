import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { X, SwitchCamera, Camera, AlertCircle, CheckCircle2, QrCode, Sparkles, UserCheck, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui';
import { sosialisasiApi, type RapatSosialisasiSession } from '@/api/academic/sosialisasi.api';
import toast from 'react-hot-toast';

export interface TeacherSosialisasiScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  guruId: string;
  guruNama: string;
  guruNip?: string;
  tenantId?: string;
  activeSession?: RapatSosialisasiSession | null;
  isAlreadyAttended?: boolean;
  waktuHadir?: string;
  onSuccess?: () => void;
}

export const TeacherSosialisasiScanModal: React.FC<TeacherSosialisasiScanModalProps> = ({
  isOpen,
  onClose,
  guruId,
  guruNama,
  guruNip,
  tenantId,
  activeSession,
  isAlreadyAttended = false,
  waktuHadir,
  onSuccess,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [statusText, setStatusText] = useState<string>('Menginisialisasi kamera...');
  const [hasError, setHasError] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successInfo, setSuccessInfo] = useState<{ nama: string; waktu: string } | null>(null);

  // Ambil daftar perangkat kamera saat modal dibuka dan guru belum hadir
  useEffect(() => {
    if (!isOpen || isAlreadyAttended) return;

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
          setStatusText('Kamera tidak ditemukan pada perangkat Anda.');
          return;
        }

        setDevices(videoInputDevices);

        // Utamakan kamera belakang (environment) di smartphone
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
        setStatusText('Izin akses kamera ditolak. Silakan izinkan akses kamera atau gunakan tombol konfirmasi langsung.');
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
  }, [isOpen, isAlreadyAttended]);

  // Handler konfirmasi kehadiran
  const handleProcessAttendance = useCallback(
    async (tokenInput: string) => {
      if (isSubmitting) return;

      let effectiveToken = tokenInput.trim();
      // Ekstrak token jika QR berupa URL penuh
      try {
        if (effectiveToken.includes('token=')) {
          const url = new URL(effectiveToken);
          effectiveToken = url.searchParams.get('token') || url.searchParams.get('qrToken') || effectiveToken;
        } else {
          const match = effectiveToken.match(/(?:token|qrToken)=([^&]+)/i);
          if (match) effectiveToken = match[1];
        }
      } catch {
        // Fallback jika bukan URL valid
      }

      setIsSubmitting(true);
      try {
        const res = await sosialisasiApi.submitPublicSelfAttend({
          tenantId: tenantId || activeSession?.tenant_id,
          qrToken: effectiveToken,
          guruIdOrNip: guruId || guruNip || '',
        });

        if (res.success) {
          toast.success(`Berhasil! Kehadiran ${guruNama} telah tercatat.`);
          setSuccessInfo({
            nama: res.guru.nama || guruNama,
            waktu: new Date(res.guru.waktuHadir).toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          });
          if (controlsRef.current) {
            controlsRef.current.stop();
            controlsRef.current = null;
          }
          if (onSuccess) onSuccess();
        } else {
          toast.error(res.message || 'Gagal mencatat kehadiran');
        }
      } catch (error: any) {
        toast.error(error.message || 'Kode QR tidak sesuai dengan sesi rapat aktif');
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, tenantId, activeSession, guruId, guruNip, guruNama, onSuccess]
  );

  // Streaming kamera dan decoding QR
  useEffect(() => {
    if (!isOpen || isAlreadyAttended || !selectedDeviceId || !videoRef.current || successInfo) return;

    let isSubscribed = true;
    const codeReader = new BrowserMultiFormatReader();

    async function startDecoding() {
      try {
        if (controlsRef.current) {
          controlsRef.current.stop();
          controlsRef.current = null;
        }

        setIsScanning(true);
        setStatusText('Arahkan kamera ke Lembar QR Cetak di depan/meja...');

        const controls = await codeReader.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current!,
          (result, error) => {
            if (!isSubscribed) return;

            if (result) {
              const text = result.getText().trim();
              if (text) {
                handleProcessAttendance(text);
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
          setStatusText('Gagal membuka streaming kamera.');
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
  }, [isOpen, isAlreadyAttended, selectedDeviceId, successInfo, handleProcessAttendance]);

  const handleToggleCamera = () => {
    if (devices.length <= 1) return;
    const currentIndex = devices.findIndex((d) => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    setSelectedDeviceId(devices[nextIndex].deviceId);
  };

  const handleDirectConfirm = () => {
    if (!activeSession?.qr_token) {
      toast.error('Token rapat tidak terdeteksi. Silakan scan lembar QR.');
      return;
    }
    handleProcessAttendance(activeSession.qr_token);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="p-4 bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center font-bold backdrop-blur-xs">
              <QrCode size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">Presensi Rapat Sosialisasi</h3>
              <p className="text-[11px] text-white/80 truncate max-w-[240px]">
                {activeSession?.nama_acara || 'Sosialisasi Platform Absenta'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Identitas Guru Logged In */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Peserta Rapat</span>
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
                {guruNama}
              </h4>
              <p className="text-[11px] text-slate-500 font-mono">NIP: {guruNip || '-'}</p>
            </div>
            <div className="shrink-0 pl-2">
              <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                Akun Terverifikasi
              </span>
            </div>
          </div>

          {/* Kondisi 1: Sudah Hadir atau Sukses Baru Saja */}
          {isAlreadyAttended || successInfo ? (
            <div className="p-6 bg-gradient-to-b from-emerald-50/80 to-teal-50/40 dark:from-emerald-950/40 dark:to-teal-950/20 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-500/20">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h4 className="text-base font-black text-emerald-900 dark:text-emerald-100">
                  Kehadiran Berhasil Diverifikasi!
                </h4>
                <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-1">
                  Terima kasih atas partisipasi Anda dalam Rapat Sosialisasi Penggunaan Platform.
                </p>
              </div>
              <div className="pt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border-t border-emerald-200 dark:border-emerald-800/60">
                Waktu Presensi:{' '}
                {successInfo?.waktu ||
                  (waktuHadir
                    ? new Date(waktuHadir).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                    : 'Tercatat')}
              </div>
              <div className="pt-2">
                <Button variant="primary" onClick={onClose} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                  Selesai
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Kondisi 2: Kamera Scanner Belum Hadir */}
              <div className="relative aspect-square max-w-[280px] mx-auto rounded-2xl overflow-hidden bg-slate-950 border-2 border-indigo-500 shadow-inner flex items-center justify-center">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                  autoPlay
                />

                {/* Reticle / Target Box Scanner */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
                  <div className="w-full h-full border-2 border-dashed border-violet-400 rounded-xl relative animate-pulse flex items-center justify-center">
                    <span className="text-[10px] text-white/90 bg-slate-950/70 px-2 py-0.5 rounded-full font-bold">
                      Arahkan ke QR Cetak
                    </span>
                  </div>
                </div>

                {/* Tombol Ganti Kamera */}
                {devices.length > 1 && (
                  <button
                    onClick={handleToggleCamera}
                    className="absolute top-2 right-2 p-2 rounded-xl bg-slate-900/80 text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Ganti Kamera"
                  >
                    <SwitchCamera size={16} />
                  </button>
                )}
              </div>

              {/* Status Teks */}
              <p className="text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
                {statusText}
              </p>

              {/* Opsi Cadangan: Konfirmasi 1-Klik Langsung */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="text-center text-[11px] text-slate-400">
                  Kendala scan kamera di ruangan?
                </div>
                <Button
                  variant="outline"
                  onClick={handleDirectConfirm}
                  disabled={isSubmitting}
                  className="w-full rounded-xl py-2.5 text-xs font-bold border-violet-300 dark:border-violet-800 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/50 flex items-center justify-center gap-2"
                >
                  <UserCheck size={16} />
                  <span>{isSubmitting ? 'Mencatat Kehadiran...' : 'Konfirmasi Kehadiran Saya Sekarang'}</span>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherSosialisasiScanModal;
