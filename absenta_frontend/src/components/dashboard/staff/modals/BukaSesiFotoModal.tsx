import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, X, RefreshCw, AlertCircle, Sparkles, ShieldCheck } from 'lucide-react';
import { Button } from '../../../ui';
import { toast } from 'react-hot-toast';
import { useWebRtcCamera } from '../../../../hooks/useWebRtcCamera';

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
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    videoRef,
    canvasRef,
    isCameraActive,
    cameraError,
    startCamera,
    stopCamera,
    capturePhoto,
    applyStampToCanvas,
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
    if (isOpen && activeTab === 'camera' && !capturedImage) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, capturedImage, startCamera, stopCamera]);

  // Capture Live Camera Photo + Draw Stamp
  const handleCapturePhoto = () => {
    const photo = capturePhoto({
      kelasNama,
      mapelNama,
      guruNama,
      badgeTitle: '✓ ABSENTA VERIFIED KBM STAMP',
    });

    if (photo) {
      setCapturedImage(photo);
    } else {
      toast.error('Gagal menangkap foto dari kamera');
    }
  };

  // Upload File + Draw Stamp
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar!');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error('Ukuran foto maksimal 8MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current || document.createElement('canvas');
          canvas.width = img.width || 1280;
          canvas.height = img.height || 720;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            applyStampToCanvas(ctx, canvas.width, canvas.height, {
              kelasNama,
              mapelNama,
              guruNama,
              badgeTitle: '✓ ABSENTA VERIFIED KBM STAMP',
            });
            const stampedUrl = canvas.toDataURL('image/jpeg', 0.88);
            setCapturedImage(stampedUrl);
          }
        };
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRetake = () => {
    setCapturedImage(null);
    if (activeTab === 'camera') {
      startCamera();
    }
  };

  const handleConfirmSubmit = () => {
    if (!capturedImage) {
      toast.error('Wajib melampirkan foto bukti KBM!');
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl text-white overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Camera size={16} />
                </div>
                <h3 className="text-base font-extrabold text-white">Foto Bukti Pembukaan KBM</h3>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                {kelasNama || 'Kelas'} • {mapelNama || 'Mata Pelajaran'}
              </p>
            </div>

            <button
              onClick={handleClose}
              disabled={isLoading}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 space-y-4">
            {!capturedImage ? (
              <>
                {/* Tab Switcher */}
                <div className="p-1 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('camera')}
                    className={`py-2 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      activeTab === 'camera' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Camera size={14} />
                    <span>Kamera Langsung</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    className={`py-2 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      activeTab === 'upload' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Upload size={14} />
                    <span>Unggah Foto</span>
                  </button>
                </div>

                {/* View Container */}
                {activeTab === 'camera' ? (
                  <div className="relative rounded-2xl bg-black overflow-hidden aspect-video border border-slate-800 flex items-center justify-center">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {!isCameraActive && !cameraError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/90 z-20">
                        <RefreshCw className="animate-spin text-emerald-400" size={28} />
                        <span className="text-xs font-semibold text-slate-400">Menghubungkan Kamera...</span>
                      </div>
                    )}

                    {cameraError && (
                      <div className="p-4 text-center space-y-3 bg-slate-950/95 inset-0 absolute flex flex-col items-center justify-center z-30">
                        <AlertCircle className="text-rose-400 mx-auto" size={32} />
                        <p className="text-xs font-semibold text-rose-300 max-w-xs">{cameraError}</p>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            setActiveTab('upload');
                          }}
                          className="mt-1 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-none shadow-md"
                        >
                          Gunakan Unggah File Sebagai Ganti
                        </Button>
                      </div>
                    )}

                    {/* LIVE CAMERA OVERLAY: TRANSPARENT STAMP PREVIEW */}
                    {isCameraActive && !cameraError && (
                      <>
                        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent border-t border-emerald-500/50 backdrop-blur-[2px] pointer-events-none flex flex-col justify-end text-left z-10 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1 drop-shadow-sm">
                              <ShieldCheck size={12} />
                              <span>✓ ABSENTA VERIFIED KBM STAMP</span>
                            </span>
                            <span className="text-[10px] font-semibold text-slate-300 font-mono drop-shadow-sm">
                              {currentTime}
                            </span>
                          </div>
                          <p className="text-xs font-black text-white truncate drop-shadow">
                            {kelasNama || 'Kelas'} — {mapelNama || 'Mata Pelajaran'}
                          </p>
                          <p className="text-[11px] font-medium text-slate-200 truncate drop-shadow-sm">
                            Pengajar: {guruNama || 'Guru'}
                          </p>
                        </div>

                        {/* Capture Button floating above transparent live stamp overlay */}
                        <div className="absolute bottom-16 inset-x-0 flex justify-center z-20">
                          <button
                            type="button"
                            onClick={handleCapturePhoto}
                            className="h-11 px-6 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-500/40 active:scale-95 transition-all cursor-pointer border border-emerald-300/40"
                          >
                            <Camera size={17} />
                            <span>Tangkap Foto</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-8 rounded-2xl bg-slate-950 border-2 border-dashed border-slate-800 hover:border-emerald-500/50 transition-all flex flex-col items-center justify-center text-center cursor-pointer space-y-2 group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload size={22} />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-extrabold text-white">Klik untuk memilih file foto</p>
                      <p className="text-[11px] text-slate-400">Stamp Detail Sesi akan terpasang secara otomatis</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                )}
              </>
            ) : (
              /* Preview Captured Photo with Stamp */
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden aspect-video border border-emerald-500/50 shadow-md">
                  <img
                    src={capturedImage}
                    alt="Bukti Foto KBM dengan Stamp"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                    <ShieldCheck size={13} />
                    <span>Foto &amp; Stamp Terpasang</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRetake}
                  disabled={isLoading}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <RefreshCw size={14} />
                  <span>Foto Ulang / Ganti File</span>
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={isLoading}
              className="h-10 px-4 rounded-xl text-xs text-slate-400 border-slate-800 hover:text-white"
            >
              Batal
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleConfirmSubmit}
              disabled={!capturedImage || isLoading}
              className="h-10 px-5 rounded-xl text-xs font-extrabold bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-none shadow-md shadow-emerald-500/20 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Membuka Sesi...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Buka Sesi KBM Sekarang</span>
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
