import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal, Button, Badge } from '../../ui';
import { 
  Camera, 
  QrCode, 
  Search, 
  CheckCircle2, 
  RefreshCw, 
  User, 
  GraduationCap, 
  Sparkles, 
  ArrowRight,
  SwitchCamera,
  RotateCcw,
  Check,
  Zap,
  Image as ImageIcon
} from 'lucide-react';
import { getSiswaList, updateSiswa } from '../../../api/academic/siswa.api';
import { getGuruList, updateGuru } from '../../../api/academic/guru.api';
import type { Siswa, Guru } from '../../../types/academic';
import toast from 'react-hot-toast';

interface ExpressPhotoStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Mode = 'SISWA' | 'GURU';

// Synthesize high-frequency audio beep using Web Audio API
const playBeep = (type: 'success' | 'error' | 'shutter') => {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'shutter') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch {
    // Audio Context unallowed
  }
};

export const ExpressPhotoStudioModal: React.FC<ExpressPhotoStudioModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [mode, setMode] = useState<Mode>('SISWA');
  const [searchQuery, setSearchQuery] = useState('');
  const [targetPerson, setTargetPerson] = useState<Siswa | Guru | null>(null);
  const [step, setStep] = useState<'SCAN_TARGET' | 'CAPTURE_PHOTO' | 'PREVIEW_SAVE'>('SCAN_TARGET');
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [capturedPhotoDataUrl, setCapturedPhotoDataUrl] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [lastSavedInfo, setLastSavedInfo] = useState<{ name: string; identifier: string } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera stream helper
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Start webcam stream
  const startCameraStream = useCallback(async () => {
    stopCameraStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      toast.error('Gagal mengakses kamera. Pastikan izin kamera telah diberikan.');
      setCameraActive(false);
    }
  }, [facingMode, stopCameraStream]);

  // Start camera when entering capture step
  useEffect(() => {
    if (isOpen && step === 'CAPTURE_PHOTO') {
      startCameraStream();
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [isOpen, step, startCameraStream, stopCameraStream]);

  // Auto focus input on open
  useEffect(() => {
    if (isOpen && step === 'SCAN_TARGET') {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen, step]);

  // Reset modal state
  useEffect(() => {
    if (isOpen) {
      setStep('SCAN_TARGET');
      setSearchQuery('');
      setTargetPerson(null);
      setCapturedPhotoDataUrl(null);
      setLastSavedInfo(null);
    }
  }, [isOpen]);

  // Handle Search Target (QR Scan or Type)
  const handleSearchTarget = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setIsSearching(true);
    try {
      if (mode === 'SISWA') {
        const res = await getSiswaList(1, 10, trimmed);
        if (res.success && res.data.length > 0) {
          const exact = res.data.find(s => s.nisn === trimmed || s.nis === trimmed) || res.data[0];
          setTargetPerson(exact);
          setStep('CAPTURE_PHOTO');
          playBeep('success');
        } else {
          toast.error(`Siswa dengan NISN/NIS/Nama "${trimmed}" tidak ditemukan.`);
          playBeep('error');
        }
      } else {
        const res = await getGuruList(1, 10, trimmed);
        if (res.success && res.data.length > 0) {
          const exact = res.data.find(g => g.nip === trimmed) || res.data[0];
          setTargetPerson(exact);
          setStep('CAPTURE_PHOTO');
          playBeep('success');
        } else {
          toast.error(`Guru dengan NIP/Nama "${trimmed}" tidak ditemukan.`);
          playBeep('error');
        }
      }
    } catch {
      toast.error('Gagal mencari data target.');
      playBeep('error');
    } finally {
      setIsSearching(false);
    }
  }, [mode]);

  const handleTargetKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchTarget(searchQuery);
    }
  };

  // Capture Snapshot from Webcam Video Feed
  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');

    // Standard 3:4 portrait aspect ratio (600x800 px)
    const targetWidth = 600;
    const targetHeight = 800;
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Center crop calculation
    const videoAspect = video.videoWidth / video.videoHeight;
    const targetAspect = targetWidth / targetHeight;

    let sx = 0, sy = 0, sw = video.videoWidth, sh = video.videoHeight;
    if (videoAspect > targetAspect) {
      sw = video.videoHeight * targetAspect;
      sx = (video.videoWidth - sw) / 2;
    } else {
      sh = video.videoWidth / targetAspect;
      sy = (video.videoHeight - sh) / 2;
    }

    // Flip horizontally if front-facing camera for natural mirror feel
    if (facingMode === 'user') {
      ctx.translate(targetWidth, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setCapturedPhotoDataUrl(dataUrl);
    setStep('PREVIEW_SAVE');
    playBeep('shutter');
  };

  // Execute Photo Save to DB
  const handleSaveCapturedPhoto = async () => {
    if (!capturedPhotoDataUrl || !targetPerson) return;
    setIsSaving(true);
    try {
      if (mode === 'SISWA') {
        const res = await updateSiswa(targetPerson.id, { foto: capturedPhotoDataUrl });
        if (res.success) {
          const personName = (targetPerson as Siswa).nama_siswa;
          const identifier = (targetPerson as Siswa).nisn || (targetPerson as Siswa).nis || '-';
          setLastSavedInfo({ name: personName, identifier });
          toast.success(`📸 Foto ${personName} berhasil disimpan!`);
          playBeep('success');
          onSuccess?.();

          // Reset loop back to Step 1 for next student
          setStep('SCAN_TARGET');
          setSearchQuery('');
          setTargetPerson(null);
          setCapturedPhotoDataUrl(null);
        } else {
          toast.error(res.message || 'Gagal menyimpan foto siswa.');
          playBeep('error');
        }
      } else {
        const res = await updateGuru(targetPerson.id, { foto: capturedPhotoDataUrl });
        if (res.success) {
          const personName = (targetPerson as Guru).nama_guru;
          const identifier = (targetPerson as Guru).nip || '-';
          setLastSavedInfo({ name: personName, identifier });
          toast.success(`📸 Foto Guru ${personName} berhasil disimpan!`);
          playBeep('success');
          onSuccess?.();

          // Reset loop
          setStep('SCAN_TARGET');
          setSearchQuery('');
          setTargetPerson(null);
          setCapturedPhotoDataUrl(null);
        } else {
          toast.error(res.message || 'Gagal menyimpan foto guru.');
          playBeep('error');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan foto.';
      toast.error(msg);
      playBeep('error');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset/Retake Photo
  const handleRetakePhoto = () => {
    setCapturedPhotoDataUrl(null);
    setStep('CAPTURE_PHOTO');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Express Photo Studio (Capture Foto Massal Kartu Pelajar)"
      size="3xl"
    >
      <div className="p-6 space-y-6">
        {/* Top Header Mode Switch */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
              <Camera size={18} className="animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                Mode Foto Formal Cetak Kartu Pelajar
              </h4>
              <p className="text-[10px] text-slate-400 font-bold">
                Tembak QR NISN/NIP &rarr; Ambil Foto Webcam &rarr; Auto-Crop 3:4 Loop
              </p>
            </div>
          </div>

          <div className="inline-flex p-1 bg-slate-200/60 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => { setMode('SISWA'); setStep('SCAN_TARGET'); setTargetPerson(null); }}
              className={`px-3.5 py-1.5 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 ${
                mode === 'SISWA'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <GraduationCap size={14} /> Siswa
            </button>
            <button
              type="button"
              onClick={() => { setMode('GURU'); setStep('SCAN_TARGET'); setTargetPerson(null); }}
              className={`px-3.5 py-1.5 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 ${
                mode === 'GURU'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <User size={14} /> Guru & Staf
            </button>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-3 gap-3">
          <div className={`p-3 rounded-2xl border transition-all flex items-center gap-2.5 ${
            step === 'SCAN_TARGET' 
              ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 ring-2 ring-indigo-500/20'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-60'
          }`}>
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
              step === 'SCAN_TARGET' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
            }`}>
              1
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Identifikasi</p>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">Scan QR / Ketik</p>
            </div>
          </div>

          <div className={`p-3 rounded-2xl border transition-all flex items-center gap-2.5 ${
            step === 'CAPTURE_PHOTO' 
              ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 ring-2 ring-indigo-500/20'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-60'
          }`}>
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
              step === 'CAPTURE_PHOTO' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
            }`}>
              2
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Kamera Live</p>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">Posisikan Wajah</p>
            </div>
          </div>

          <div className={`p-3 rounded-2xl border transition-all flex items-center gap-2.5 ${
            step === 'PREVIEW_SAVE' 
              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-60'
          }`}>
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
              step === 'PREVIEW_SAVE' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
            }`}>
              3
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Simpan Foto</p>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">Verifikasi Result</p>
            </div>
          </div>
        </div>

        {/* Step 1: Scan Target */}
        {step === 'SCAN_TARGET' && (
          <div className="space-y-4 bg-slate-50/50 dark:bg-slate-950/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="space-y-2">
              <label htmlFor="photo-studio-search" className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Langkah 1: Tembak QR Code atau Ketik {mode === 'SISWA' ? 'NISN / NIS / Nama' : 'NIP / Nama'}
              </label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  id="photo-studio-search"
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleTargetKeyDown}
                  placeholder={mode === 'SISWA' ? "Arahkan scanner ke QR kartu sementara siswa atau ketik nama..." : "Arahkan scanner ke QR NIP guru atau ketik nama..."}
                  disabled={isSearching}
                  className="w-full h-12 pl-10 pr-24 text-sm font-semibold rounded-xl border border-indigo-300 dark:border-indigo-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 shadow-sm"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleSearchTarget(searchQuery)}
                  disabled={isSearching || !searchQuery.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 text-xs font-bold rounded-lg"
                >
                  {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Cari (Enter)'}
                </Button>
              </div>
              <p className="text-[10px] text-slate-400 italic font-semibold">
                * Scan Barcode/QR pada kartu sementara atau kartu profil digital akan otomatis memicu pencarian target.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Live Webcam Capture */}
        {step === 'CAPTURE_PHOTO' && (
          <div className="space-y-4">
            {targetPerson && (
              <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
                    {mode === 'SISWA' ? <GraduationCap size={18} /> : <User size={18} />}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">
                      {mode === 'SISWA' ? (targetPerson as Siswa).nama_siswa : (targetPerson as Guru).nama_guru}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {mode === 'SISWA' 
                        ? `NISN: ${(targetPerson as Siswa).nisn || '-'} • Kelas: ${(targetPerson as Siswa).Kelas?.nama_kelas || '-'}`
                        : `NIP: ${(targetPerson as Guru).nip || '-'}`
                      }
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setStep('SCAN_TARGET'); setTargetPerson(null); }}
                  className="text-xs h-7 text-slate-400 hover:text-slate-600"
                >
                  Ganti Personel
                </Button>
              </div>
            )}

            {/* Webcam Live Feed Container with Portrait Guide */}
            <div className="relative w-full max-w-md mx-auto aspect-[3/4] bg-slate-950 rounded-2xl overflow-hidden border-4 border-indigo-500/40 shadow-xl flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
              />

              {/* Portrait ID Photo Guide Overlay */}
              <div className="absolute inset-0 pointer-events-none border-[3px] border-dashed border-indigo-400/70 rounded-2xl flex flex-col items-center justify-center">
                {/* Oval Face Guide */}
                <div className="w-52 h-72 rounded-[50%] border-2 border-emerald-400/80 bg-emerald-500/5 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-slate-950/70 px-2 py-0.5 rounded-full mb-auto mt-6">
                    Posisikan Wajah Di Sini
                  </span>
                </div>
              </div>

              {!cameraActive && (
                <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
                  <p className="text-xs font-bold">Menghubungkan Kamera...</p>
                </div>
              )}
            </div>

            {/* Camera Actions Controls */}
            <div className="flex justify-center items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                className="rounded-xl"
                title="Putar Kamera"
              >
                <SwitchCamera size={14} className="mr-1.5" /> Putar Kamera
              </Button>

              <Button
                type="button"
                variant="toolbarPrimary"
                size="md"
                onClick={handleCaptureSnapshot}
                disabled={!cameraActive}
                className="px-8 font-black rounded-xl text-sm shadow-md"
              >
                <Camera size={16} className="mr-2" /> 📸 AMBIL FOTO (SPACE)
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview & Save */}
        {step === 'PREVIEW_SAVE' && capturedPhotoDataUrl && (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                Verifikasi Hasil Crop Foto 3:4
              </h4>
              <p className="text-[10px] text-slate-400 font-bold">
                Periksa Kualitas Foto Formal Sebelum Disimpan Ke Database
              </p>
            </div>

            {/* Crop Result Card */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="relative w-36 h-48 rounded-xl overflow-hidden border-2 border-emerald-500 shadow-md">
                <img
                  src={capturedPhotoDataUrl}
                  alt="Captured Portrait Preview"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1 right-1 bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md">
                  3:4 Formal
                </span>
              </div>

              <div className="space-y-3 text-center sm:text-left">
                {targetPerson && (
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                      {mode === 'SISWA' ? (targetPerson as Siswa).nama_siswa : (targetPerson as Guru).nama_guru}
                    </h3>
                    <p className="text-xs text-slate-500 font-bold">
                      {mode === 'SISWA' 
                        ? `NISN: ${(targetPerson as Siswa).nisn || '-'} • Kelas: ${(targetPerson as Siswa).Kelas?.nama_kelas || '-'}`
                        : `NIP: ${(targetPerson as Guru).nip || '-'}`
                      }
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 justify-center sm:justify-start pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRetakePhoto}
                    disabled={isSaving}
                    className="rounded-xl text-xs"
                  >
                    <RotateCcw size={13} className="mr-1.5" /> Foto Ulang
                  </Button>

                  <Button
                    type="button"
                    variant="success"
                    size="sm"
                    onClick={handleSaveCapturedPhoto}
                    disabled={isSaving}
                    className="rounded-xl text-xs font-black px-5 shadow-sm"
                  >
                    {isSaving ? (
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5 mr-1.5 stroke-[3px]" />
                    )}
                    SIMPAN FOTO SISWA
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Last Saved Toast Banner */}
        {lastSavedInfo && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>
                Foto Terakhir Disimpan: <strong>{lastSavedInfo.name}</strong> ({lastSavedInfo.identifier})
              </span>
            </div>
            <Sparkles size={14} className="text-emerald-500 animate-pulse shrink-0" />
          </div>
        )}

        <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
            <ImageIcon size={12} /> Format pasfoto tersimpan otomatis dalam rasio standar cetak kartu 3:4.
          </span>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Selesai & Tutup
          </Button>
        </div>
      </div>
    </Modal>
  );
};
