import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, RefreshCw, AlertCircle, Sparkles, ShieldCheck, SwitchCamera, Check } from 'lucide-react';
import { Button } from '../../../ui';
import { cn } from '../../../../lib/utils';
import { toast } from 'react-hot-toast';
import { useWebRtcCamera } from '../../../../hooks/useWebRtcCamera';
import { useCameraOrientation } from '../../../../hooks/useCameraOrientation';
import { createPortal } from 'react-dom';

export interface BukaSesiFotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (photoDataUrl: string) => void;
  onOpenWithoutPhoto?: () => void;
  isPetugasSiswa?: boolean;
  kelasNama?: string;
  mapelNama?: string;
  guruNama?: string;
  jenisKegiatan?: string;
  activityName?: string;
  title?: string;
  badgeTitle?: string;
  instructionText?: string;
  isLoading?: boolean;
}

export const BukaSesiFotoModal: React.FC<BukaSesiFotoModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onOpenWithoutPhoto,
  isPetugasSiswa = false,
  kelasNama,
  mapelNama,
  guruNama,
  jenisKegiatan,
  activityName,
  title,
  badgeTitle,
  instructionText,
  isLoading = false,
}) => {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  const isActivity = Boolean(
    (jenisKegiatan && jenisKegiatan.toUpperCase() !== 'KBM') ||
    activityName
  );

  const displayActivityName = activityName || (
    isActivity 
      ? (jenisKegiatan === 'KETARUNAAN' 
          ? 'Program Ketarunaan' 
          : jenisKegiatan === 'DHUHA' 
          ? 'Pembiasaan Dhuha' 
          : jenisKegiatan === 'UPACARA'
          ? 'Upacara Bendera'
          : jenisKegiatan === 'APEL_SORE'
          ? 'Apel Sore'
          : (jenisKegiatan || 'Kegiatan'))
      : 'KBM'
  );

  const modalTitle = title || (isActivity ? `Buka Sesi ${displayActivityName}` : 'Buka Sesi KBM');
  const modalBadge = isActivity ? (jenisKegiatan?.toUpperCase() || 'KEGIATAN') : 'Buka Sesi KBM';
  const stampBadgeTitle = badgeTitle || (isActivity ? `✓ ABSENTA VERIFIED ${jenisKegiatan?.toUpperCase() || 'KEGIATAN'} STAMP` : '✓ ABSENTA VERIFIED KBM STAMP');
  const displayHeaderTitle = kelasNama || (isActivity ? 'Peleton / Seluruh Peserta' : 'Kelas');
  const displaySubject = mapelNama || displayActivityName;
  const displaySubtitle = `${displaySubject}${guruNama ? ` • ${guruNama}` : ''}`;
  const instruction = instructionText || (
    isPetugasSiswa
      ? 'Foto bersifat opsional untuk petugas kelas. Anda dapat memfoto suasana kelas, atau buka langsung tanpa foto.'
      : isActivity 
      ? 'Arahkan kamera ke barisan peleton / peserta kegiatan atau foto bersama pendamping.' 
      : 'Arahkan kamera ke suasana kelas atau selfie bersama siswa.'
  );
  const buttonSubmitText = isPetugasSiswa
    ? (isActivity ? `Buka Sesi ${displayActivityName} (Foto)` : 'Buka Sesi Kelas (Foto)')
    : (isActivity ? `Buka Sesi ${displayActivityName}` : 'Buka Sesi KBM');
  const loadingOverlayTitle = isActivity ? `Membuka Sesi ${displayActivityName}...` : 'Membuka Sesi KBM...';
  const loadingOverlayDesc = isActivity 
    ? 'Menyimpan bukti foto kegiatan & menyinkronkan kehadiran pembina/guru ke sistem.'
    : 'Menyimpan bukti foto & menyinkronkan kehadiran guru ke sistem.';

  const { angle, isLandscape, uiRotationStyle } = useCameraOrientation();

  const {
    videoRef,
    canvasRef,
    isCameraActive,
    cameraError,
    currentFacingMode,
    startCamera,
    stopCamera,
    switchCamera,
    capturePhoto,
    processExternalImageFile,
  } = useWebRtcCamera({
    facingMode: 'environment',
    idealWidth: 1280,
    idealHeight: 720,
  });

  // Handle native OS camera fallback capture with verified stamp
  const handleNativeCameraFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const stampedPhoto = await processExternalImageFile(
        file,
        {
          kelasNama: displayHeaderTitle,
          mapelNama: displaySubject,
          guruNama,
          badgeTitle: stampBadgeTitle,
        },
        0.75
      );
      if (stampedPhoto) {
        setCapturedImage(stampedPhoto);
        stopCamera();
      } else {
        toast.error('Gagal memproses foto kamera sistem');
      }
    } catch {
      toast.error('Gagal memproses foto dari kamera');
    } finally {
      if (nativeCameraInputRef.current) {
        nativeCameraInputRef.current.value = '';
      }
    }
  };

  // Update live clock for preview
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const str = now.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }) + ' • ' + now.toLocaleTimeString('id-ID', { hour12: false }) + ' WIB';
      setCurrentTime(str);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, capturedImage, startCamera, stopCamera]);

  // Capture Live Camera Photo with Gyro Orientation + Draw Stamp
  const handleCapturePhoto = () => {
    // ⚡ Shutter Flash & Haptic Feedback instan
    setIsFlashing(true);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(40); } catch (_) {}
    }
    setTimeout(() => setIsFlashing(false), 180);

    const photo = capturePhoto(
      {
        kelasNama: displayHeaderTitle,
        mapelNama: displaySubject,
        guruNama,
        badgeTitle: stampBadgeTitle,
      },
      0.75, // Kualitas optimal 0.75 (reduksi payload ~75% tanpa mengorbankan ketajaman teks stamp)
      angle
    );

    if (photo) {
      setCapturedImage(photo);
      stopCamera();
    } else {
      toast.error('Gagal menangkap foto dari kamera');
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleConfirmSubmit = () => {
    if (!capturedImage) {
      toast.error('Wajib mengambil foto bukti KBM live di kelas!');
      return;
    }
    onConfirm(capturedImage);
  };

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
        {/* Modal Container Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[94vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── 1. MODAL HEADER ── */}
          <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                <Camera size={20} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm font-black text-white truncate">
                    {displayHeaderTitle}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    {modalBadge}
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate">
                  {displaySubtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Switch Camera Button */}
              {!capturedImage && (
                <button
                  type="button"
                  onClick={() => switchCamera()}
                  disabled={isLoading || !isCameraActive}
                  title="Beralih Kamera Depan/Belakang"
                  className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700 disabled:opacity-30"
                >
                  <SwitchCamera size={18} className={currentFacingMode === 'user' ? "text-emerald-400" : "text-slate-300"} />
                </button>
              )}

              {/* Close Button */}
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                title="Tutup"
                className="p-2.5 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* ── 2. CAMERA VIEWFINDER / CAPTURED IMAGE ── */}
          <div className="relative bg-black flex items-center justify-center min-h-[260px] sm:min-h-[360px] max-h-[58vh] overflow-hidden m-3 sm:m-4 rounded-2xl border border-slate-800">
            {/* Shutter Blink / White Flash Effect */}
            {isFlashing && (
              <div className="absolute inset-0 bg-white/95 z-40 pointer-events-none animate-in fade-in duration-75 animate-out fade-out duration-150" />
            )}
            {!capturedImage ? (
              <>
                {/* Live Video Stream */}
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className={cn(
                    "w-full h-full object-cover max-h-[56vh] transition-transform duration-300",
                    currentFacingMode === 'user' && "-scale-x-100"
                  )}
                />
                <canvas ref={canvasRef} className="hidden" />
                <input
                  ref={nativeCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleNativeCameraFileChange}
                  className="hidden"
                />

                {/* Connecting State */}
                {!isCameraActive && !cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/95 z-20 p-4 text-center">
                    <RefreshCw className="animate-spin text-emerald-400" size={32} />
                    <span className="text-xs font-bold text-slate-300 tracking-wide">Menghubungkan &amp; Meminta Izin Kamera...</span>
                    <button
                      type="button"
                      onClick={() => nativeCameraInputRef.current?.click()}
                      className="mt-2 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Camera size={12} className="text-emerald-400" />
                      <span>Gunakan Kamera Sistem HP</span>
                    </button>
                  </div>
                )}

                {/* Camera Error State */}
                {cameraError && (
                  <div className="p-6 text-center space-y-3.5 bg-black/95 inset-0 absolute flex flex-col items-center justify-center z-30">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
                      <AlertCircle size={26} />
                    </div>
                    <div className="space-y-1.5 max-w-md">
                      <h5 className="text-sm font-black text-white">Akses Kamera Live Belum Aktif</h5>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {cameraError}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => startCamera()}
                        className="text-xs font-black bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw size={13} />
                        <span>Coba Akses Lagi</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => nativeCameraInputRef.current?.click()}
                        className="text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-none flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20"
                      >
                        <Camera size={13} />
                        <span>Buka Kamera Sistem</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Focus Reticle Guide */}
                {isCameraActive && !cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-48 sm:w-64 sm:h-64 border-2 border-white/20 rounded-3xl relative transition-all duration-300">
                      <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                      <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                      <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
                    </div>
                  </div>
                )}

                {/* Live Watermark Stamp Preview */}
                {isCameraActive && !cameraError && (
                  <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent border-t border-emerald-500/30 pointer-events-none flex flex-col justify-end text-left z-20">
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] sm:text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 drop-shadow-sm">
                          <ShieldCheck size={13} />
                          <span>{stampBadgeTitle}</span>
                        </span>
                        <span className="text-[10px] font-semibold text-slate-300 font-mono drop-shadow-sm">
                          {currentTime}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm font-black text-white truncate drop-shadow">
                        {displayHeaderTitle} — {displaySubject}
                      </p>
                      <p className="text-[10px] font-medium text-slate-200 truncate drop-shadow-sm">
                        {isActivity ? 'Pembina / Pendamping:' : 'Pengajar:'} {guruNama || (isActivity ? 'Pembina' : 'Guru')}
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Review Captured Image */
              <div className="relative w-full h-full flex items-center justify-center bg-black">
                <img
                  src={capturedImage}
                  alt={`Bukti Foto ${displayActivityName} dengan Stamp`}
                  className="max-h-[56vh] w-auto object-contain rounded-xl"
                />
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-emerald-500 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xl">
                  <Check size={14} className="stroke-[3]" />
                  <span>Foto &amp; Stamp Terverifikasi</span>
                </div>
              </div>
            )}
          </div>

          {/* ── 3. MODAL CONTROL FOOTER ── */}
          <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3">
            {!capturedImage ? (
              <div className="w-full flex items-center justify-between gap-3">
                <p className="text-xs text-slate-400 hidden sm:block">
                  {instruction}
                </p>

                {/* Shutter Button & Petugas Actions */}
                <div className="flex items-center justify-center mx-auto sm:mr-0 gap-3">
                  {isPetugasSiswa && onOpenWithoutPhoto && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onOpenWithoutPhoto}
                      disabled={isLoading}
                      className="h-11 px-3.5 rounded-xl text-xs font-black bg-indigo-950/70 hover:bg-indigo-900/90 text-indigo-300 border border-indigo-700/80 flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                      title="Buka sesi langsung tanpa foto untuk mulai mencatat kehadiran siswa"
                    >
                      <Sparkles size={13} className="text-amber-400" />
                      <span>Buka Sesi (Tanpa Foto)</span>
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleClose}
                    className="rounded-xl text-xs font-bold sm:hidden"
                  >
                    Batal
                  </Button>

                  <button
                    type="button"
                    onClick={handleCapturePhoto}
                    disabled={!isCameraActive || Boolean(cameraError)}
                    title={isPetugasSiswa ? "Ambil Foto Kelas (Opsional)" : "Ambil Foto Bukti (Klik Shutter)"}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 border-white/90 p-1 flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-xl disabled:opacity-40"
                  >
                    <div className="w-full h-full rounded-full bg-white hover:bg-emerald-300 active:bg-emerald-400 transition-colors shadow-inner flex items-center justify-center">
                      <Camera size={20} className="text-slate-900" />
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              /* Review Actions */
              <div className="w-full flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRetake}
                  disabled={isLoading}
                  className="h-10 px-4 rounded-xl text-xs font-extrabold bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 cursor-pointer"
                >
                  <RefreshCw size={13} className="mr-1.5" />
                  <span>Foto Ulang</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirmSubmit}
                  disabled={isLoading}
                  className="h-10 px-5 rounded-xl text-xs sm:text-sm font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-none shadow-lg shadow-emerald-500/30 flex items-center gap-1.5 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>{loadingOverlayTitle}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>{buttonSubmitText}</span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* ── 4. FULL MODAL SUBMITTING OVERLAY ── */}
          {isLoading && (
            <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3.5 p-6 text-center animate-in fade-in duration-150">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
                <RefreshCw size={26} className="animate-spin text-emerald-400" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-black text-white">{loadingOverlayTitle}</h4>
                <p className="text-xs text-slate-300 max-w-xs">
                  {loadingOverlayDesc}
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
