import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, RefreshCw, AlertCircle, Sparkles, ShieldCheck, SwitchCamera, Check } from 'lucide-react';
import { Button } from '../../../ui';
import { cn } from '../../../../lib/utils';
import { toast } from 'react-hot-toast';
import { useWebRtcCamera } from '../../../../hooks/useWebRtcCamera';
import { useCameraOrientation } from '../../../../hooks/useCameraOrientation';

interface BukaSesiFotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (photoDataUrl: string) => void;
  kelasNama?: string;
  mapelNama?: string;
  guruNama?: string;
  isLoading?: boolean;
}

export const BukaSesiFotoModal: React.FC<BukaSesiFotoModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  kelasNama,
  mapelNama,
  guruNama,
  isLoading = false,
}) => {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

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
  } = useWebRtcCamera({
    facingMode: 'environment',
    idealWidth: 1280,
    idealHeight: 720,
  });

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
    const photo = capturePhoto(
      {
        kelasNama,
        mapelNama,
        guruNama,
        badgeTitle: '✓ ABSENTA VERIFIED KBM STAMP',
      },
      0.88,
      angle
    );

    if (photo) {
      setCapturedImage(photo);
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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] bg-black flex flex-col justify-between overflow-hidden select-none">
        {/* ── TOP / LEFT CONTROLS BAR (TOP IN PORTRAIT, LEFT SIDEBAR IN LANDSCAPE) ── */}
        <div className="absolute top-0 inset-x-0 p-3 sm:p-5 landscape:top-0 landscape:bottom-0 landscape:left-0 landscape:right-auto landscape:w-18 landscape:flex-col landscape:p-3 landscape:justify-between flex items-center justify-between z-30 pointer-events-auto bg-gradient-to-b landscape:bg-gradient-to-r from-black/85 via-black/40 to-transparent">
          {/* Close Button */}
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            title="Tutup / Batalkan"
            style={uiRotationStyle}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md text-white border border-white/20 flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-lg"
          >
            <X size={18} />
          </button>

          {/* Center Class & Mapel Capsule */}
          <div 
            style={uiRotationStyle}
            className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white shadow-xl flex items-center gap-2 max-w-[200px] sm:max-w-md landscape:max-w-none"
          >
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <div className="min-w-0 text-center">
              <p className="text-[11px] sm:text-xs font-black truncate">{kelasNama || 'Kelas'}</p>
              <p className="text-[9px] sm:text-[10px] text-slate-300 truncate">{mapelNama || 'Mata Pelajaran'}</p>
            </div>
          </div>

          {/* Switch Camera Button (Front/Back) */}
          <button
            type="button"
            onClick={() => switchCamera()}
            disabled={isLoading || Boolean(capturedImage)}
            title={currentFacingMode === 'user' ? "Beralih ke Kamera Belakang (Kelas)" : "Beralih ke Kamera Depan (Selfie Bersama Kelas)"}
            style={uiRotationStyle}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md text-white border border-white/20 flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-lg disabled:opacity-40"
          >
            <SwitchCamera size={18} className={currentFacingMode === 'user' ? "text-emerald-400" : "text-white"} />
          </button>
        </div>

        {/* ── FULL SCREEN VIEWFINDER / PREVIEW ── */}
        <div className="relative flex-1 w-full h-full bg-black overflow-hidden flex items-center justify-center">
          {!capturedImage ? (
            <>
              {/* Full-bleed Video Stream (Mirrored on front selfie camera) */}
              <video
                ref={videoRef}
                playsInline
                muted
                className={cn(
                  "w-full h-full object-cover transition-transform duration-300",
                  currentFacingMode === 'user' && "-scale-x-100"
                )}
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Connecting State */}
              {!isCameraActive && !cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/95 z-20">
                  <RefreshCw className="animate-spin text-emerald-400" size={36} />
                  <span className="text-xs sm:text-sm font-bold text-slate-300 tracking-wide">Menghubungkan Kamera...</span>
                </div>
              )}

              {/* Camera Error / Permission Blocked State */}
              {cameraError && (
                <div className="p-6 text-center space-y-4 bg-black/95 inset-0 absolute flex flex-col items-center justify-center z-30">
                  <div className="w-16 h-16 rounded-3xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
                    <AlertCircle size={32} />
                  </div>
                  <div className="space-y-1.5 max-w-sm">
                    <h5 className="text-sm sm:text-base font-black text-white">Akses Kamera Diperlukan</h5>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Presensi KBM wajib diambil secara live dari kamera kelas. Harap izinkan akses kamera pada peramban web browser Anda.
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => startCamera()}
                    className="h-11 px-6 text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-none shadow-lg shadow-emerald-500/30 flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <RefreshCw size={15} />
                    <span>Coba Akses Kamera Lagi</span>
                  </Button>
                </div>
              )}

              {/* Focus Reticle Guide */}
              {isCameraActive && !cameraError && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-60 h-60 sm:w-80 sm:h-80 landscape:w-80 landscape:h-40 border-2 border-white/20 rounded-3xl relative transition-all duration-300">
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
                  </div>
                </div>
              )}

              {/* LIVE CAMERA OVERLAY: TRANSPARENT STAMP PREVIEW (NEATLY POSITIONED AT BOTTOM EDGE IN LANDSCAPE) */}
              {isCameraActive && !cameraError && (
                <div className="absolute bottom-28 sm:bottom-32 landscape:bottom-2 landscape:left-20 landscape:right-24 p-3.5 sm:p-4 landscape:py-1.5 landscape:px-3.5 bg-gradient-to-t landscape:bg-black/60 landscape:rounded-xl landscape:border landscape:border-emerald-500/30 from-black/90 via-black/50 to-transparent border-t landscape:border-t-0 border-emerald-500/40 backdrop-blur-[2px] pointer-events-none flex flex-col justify-end text-left z-20">
                  <div style={uiRotationStyle} className="space-y-0.5 origin-bottom-left transition-transform duration-300">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] sm:text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 drop-shadow-sm">
                        <ShieldCheck size={13} />
                        <span>✓ ABSENTA VERIFIED KBM STAMP</span>
                      </span>
                      <span className="text-[10px] sm:text-xs font-semibold text-slate-300 font-mono drop-shadow-sm">
                        {currentTime}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-black text-white truncate drop-shadow">
                      {kelasNama || 'Kelas'} — {mapelNama || 'Mata Pelajaran'}
                    </p>
                    <p className="text-[10px] sm:text-[11px] font-medium text-slate-200 truncate drop-shadow-sm">
                      Pengajar: {guruNama || 'Guru'}
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* PREVIEW CAPTURED PHOTO WITH STAMP (FULL SCREEN) */
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <img
                src={capturedImage}
                alt="Bukti Foto KBM dengan Stamp"
                className="w-full h-full object-contain"
              />
              <div className="absolute top-16 sm:top-20 left-4 px-3.5 py-1.5 rounded-full bg-emerald-500 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xl">
                <Check size={14} className="stroke-[3]" />
                <span>Foto &amp; Stamp Terverifikasi</span>
              </div>
            </div>
          )}
        </div>

        {/* ── SHUTTER / ACTION BAR (BOTTOM IN PORTRAIT, RIGHT SIDEBAR IN LANDSCAPE) ── */}
        <div className="absolute bottom-0 inset-x-0 p-4 sm:pb-8 landscape:bottom-0 landscape:top-0 landscape:right-0 landscape:left-auto landscape:w-22 landscape:flex-col landscape:p-3 flex items-center justify-around landscape:justify-center landscape:gap-4 z-30 pointer-events-auto bg-gradient-to-t landscape:bg-gradient-to-l from-black via-black/80 to-transparent">
          {!capturedImage ? (
            <div className="w-full max-w-sm landscape:w-auto landscape:max-w-none flex items-center justify-around landscape:flex-col landscape:gap-4">
              {/* Left Placeholder (portrait only) */}
              <div className="w-10 h-10 sm:w-12 sm:h-12 landscape:hidden" />

              {/* Native Circular Shutter Button (Right thumb trigger in landscape!) */}
              <button
                type="button"
                onClick={handleCapturePhoto}
                disabled={!isCameraActive || Boolean(cameraError)}
                title="Ambil Foto Bukti (Klik Shutter)"
                className="w-18 h-18 sm:w-20 sm:h-20 landscape:w-14 landscape:h-14 rounded-full border-4 border-white/90 p-1 flex items-center justify-center hover:scale-105 active:scale-90 transition-all cursor-pointer shadow-2xl disabled:opacity-40 disabled:scale-100"
              >
                <div className="w-full h-full rounded-full bg-white hover:bg-emerald-300 active:bg-emerald-400 transition-colors shadow-inner" />
              </button>

              {/* Right: Switch Camera (portrait only, in landscape it is on left sidebar) */}
              <button
                type="button"
                onClick={() => switchCamera()}
                disabled={!isCameraActive || Boolean(cameraError)}
                title="Ganti Kamera Depan/Belakang"
                style={uiRotationStyle}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 flex items-center justify-center active:scale-90 transition-all cursor-pointer shadow-lg disabled:opacity-30 landscape:hidden"
              >
                <SwitchCamera size={18} />
              </button>
            </div>
          ) : (
            /* Review Actions Bar */
            <div className="w-full max-w-md landscape:w-auto landscape:max-w-none flex items-center justify-center landscape:flex-col gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleRetake}
                disabled={isLoading}
                className="h-11 sm:h-12 landscape:h-10 landscape:px-3 flex-1 rounded-2xl text-xs font-extrabold bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <RefreshCw size={14} />
                <span>Foto Ulang</span>
              </Button>

              <Button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isLoading}
                className="h-11 sm:h-12 landscape:h-10 landscape:px-3 flex-[1.4] rounded-2xl text-xs sm:text-sm font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-none shadow-xl shadow-emerald-500/40 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Membuka Sesi...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    <span>Buka Sesi KBM</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </AnimatePresence>
  );
};
