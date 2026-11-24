import React, { useState } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Lock,
  Unlock,
  RotateCw,
  RotateCcw,
  Maximize2,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  Link,
  Move,
  Layers,
  Sparkles,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { DenahImageGuideConfig, DenahImageFitMode } from '../../types/spasial.types';
import { uploadDenahImage } from '../../api/spasial.api';

interface DenahImageGuideFloatingBarProps {
  config: DenahImageGuideConfig;
  onUpdateConfig: (updated: Partial<DenahImageGuideConfig>) => void;
  boxOpacity?: number;
  onUpdateBoxOpacity?: (opacity: number) => void;
  onClose: () => void;
  isLightMode: boolean;
}

const COMPRESSION_TIMEOUT_MS = 15_000;
const MAX_LOCAL_FALLBACK_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|svg)$/i;

function canvasToBlobSafe(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), mimeType, quality);
    } catch {
      resolve(null);
    }
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Gagal membaca data URL gambar'));
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca berkas gambar lokal'));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(file: File): Promise<{ source: HTMLImageElement; cleanup: () => void }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    const cleanup = () => URL.revokeObjectURL(objectUrl);

    img.onload = () => {
      if (!img.naturalWidth || !img.naturalHeight) {
        cleanup();
        reject(new Error('Dimensi gambar tidak valid'));
        return;
      }
      resolve({ source: img, cleanup });
    };

    img.onerror = () => {
      cleanup();
      reject(new Error('Gagal memuat gambar untuk kompresi'));
    };

    img.src = objectUrl;
  });
}

/**
 * Kompresi pintar di browser untuk gambar berukuran besar (misal 17MB).
 * Merampingkan dimensi maksimal ke 2560px dan format WebP (fallback JPEG) dengan timeout pengaman
 * agar tidak pernah menggantung (silent error) di main thread.
 */
async function compressImageForCanvas(
  file: File,
  maxDimension: number = 2560,
  quality: number = 0.85
): Promise<{ file: File; originalSize: number; compressedSize: number; ratio: number }> {
  const originalSize = file.size;
  const fallbackResult = { file, originalSize, compressedSize: originalSize, ratio: 0 };

  // Jika SVG, jangan dikompresi (vektor asli)
  if (file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)) {
    return fallbackResult;
  }

  // Jika file sudah kecil (<= 1.5 MB), tidak perlu kompresi
  if (originalSize <= 1.5 * 1024 * 1024) {
    return fallbackResult;
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const compressionTask = (async () => {
    let cleanupSource: (() => void) | undefined;
    let canvas: HTMLCanvasElement | null = null;

    try {
      let source: CanvasImageSource;
      let width = 0;
      let height = 0;

      if (typeof createImageBitmap === 'function') {
        try {
          const bitmap = await createImageBitmap(file);
          source = bitmap;
          width = bitmap.width;
          height = bitmap.height;
          cleanupSource = () => bitmap.close();
        } catch {
          const loaded = await loadImageElement(file);
          source = loaded.source;
          width = loaded.source.naturalWidth;
          height = loaded.source.naturalHeight;
          cleanupSource = loaded.cleanup;
        }
      } else {
        const loaded = await loadImageElement(file);
        source = loaded.source;
        width = loaded.source.naturalWidth;
        height = loaded.source.naturalHeight;
        cleanupSource = loaded.cleanup;
      }

      if (width <= 0 || height <= 0) {
        return fallbackResult;
      }

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return fallbackResult;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(source, 0, 0, width, height);

      // Utamakan WebP untuk mempertahankan ketajaman garis denah & transparansi
      let targetMime = 'image/webp';
      let targetExt = 'webp';
      let blob = await canvasToBlobSafe(canvas, targetMime, quality);

      // Fallback ke JPEG jika browser gagal menghasilkan WebP
      if (!blob) {
        targetMime = 'image/jpeg';
        targetExt = 'jpg';
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        blob = await canvasToBlobSafe(canvas, targetMime, quality);
      }

      if (!blob || blob.size >= originalSize) {
        return fallbackResult;
      }

      const baseName = file.name.replace(/\.[^.]+$/, '');
      const compressedFile = new File([blob], `${baseName}.${targetExt}`, {
        type: targetMime,
        lastModified: Date.now(),
      });

      const ratio = Math.round(((originalSize - blob.size) / originalSize) * 100);
      return {
        file: compressedFile,
        originalSize,
        compressedSize: blob.size,
        ratio,
      };
    } catch (err) {
      console.warn('Kompresi gambar denah gagal, menggunakan berkas asli:', err);
      return fallbackResult;
    } finally {
      cleanupSource?.();
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
      }
    }
  })();

  const timeoutTask = new Promise<typeof fallbackResult>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`Kompresi gambar melebihi batas ${COMPRESSION_TIMEOUT_MS}ms, menggunakan berkas asli.`);
      resolve(fallbackResult);
    }, COMPRESSION_TIMEOUT_MS);
  });

  try {
    return await Promise.race([compressionTask, timeoutTask]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

export const DenahImageGuideFloatingBar: React.FC<DenahImageGuideFloatingBarProps> = ({
  config,
  onUpdateConfig,
  boxOpacity = 0.32,
  onUpdateBoxOpacity,
  onClose,
  isLightMode,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState('Mengunggah gambar...');
  const [compressionRatio, setCompressionRatio] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'UPLOAD' | 'URL'>('UPLOAD');
  const [urlInput, setUrlInput] = useState(config.url || '');

  // Handle upload file dengan Automatic Client-Side Smart Compression
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.currentTarget;
    const file = inputEl.files?.[0];
    inputEl.value = '';
    if (!file || isUploading) return;

    // Validasi tipe berkas (MIME type + fallback ekstensi)
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    const isValidType = validTypes.includes(file.type) || ALLOWED_IMAGE_EXTENSIONS.test(file.name);
    if (!isValidType) {
      toast.error('Format berkas tidak didukung. Harap pilih gambar PNG, JPG, WEBP, atau SVG.');
      return;
    }

    // Validasi batas ukuran awal sebelum kompresi (maks 50 MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Ukuran berkas terlalu besar (Maksimal 50 MB).');
      return;
    }

    setIsUploading(true);
    setCompressionRatio(null);

    let fileToUpload = file;
    try {
      const originalSizeMB = (file.size / (1024 * 1024)).toFixed(1);

      // Jalankan kompresi otomatis jika file > 1.5 MB
      if (file.size > 1.5 * 1024 * 1024 && file.type !== 'image/svg+xml' && !/\.svg$/i.test(file.name)) {
        setUploadStatusText(`Mengompresi gambar denah (${originalSizeMB} MB)...`);
        const result = await compressImageForCanvas(file, 2560, 0.85);
        if (result.ratio > 0) {
          fileToUpload = result.file;
          const compressedSizeMB = (result.compressedSize / (1024 * 1024)).toFixed(1);
          setCompressionRatio(result.ratio);
          toast.success(
            `Gambar dioptimasi: ${originalSizeMB} MB ➔ ${compressedSizeMB} MB (Hemat ${result.ratio}%)`,
            { duration: 4000 }
          );
        }
      }

      setUploadStatusText('Menyimpan ke Storage Engine Absenta...');

      // 1. Simpan ke Storage Engine backend
      const uploadedUrl = await uploadDenahImage(fileToUpload);
      onUpdateConfig({
        enabled: true,
        url: uploadedUrl,
        file_name: fileToUpload.name,
        is_locked: false, // Default unlock agar user bisa langsung memposisikan
      });
      setUrlInput(uploadedUrl);
      toast.success('Gambar denah berhasil disimpan di Storage Engine!');
    } catch (err: unknown) {
      console.warn('Gagal upload ke server, fallback ke local dataURL:', err);
      // 2. Fallback aman jika offline: gunakan file yang sudah terkompresi dengan batas ukuran aman
      if (fileToUpload.size > MAX_LOCAL_FALLBACK_BYTES) {
        toast.error('Gagal mengunggah ke server dan ukuran gambar terlalu besar untuk mode lokal.');
        return;
      }

      try {
        const localDataUrl = await readFileAsDataUrl(fileToUpload);
        onUpdateConfig({
          enabled: true,
          url: localDataUrl,
          file_name: fileToUpload.name,
          is_locked: false,
        });
        setUrlInput(localDataUrl);
        toast.success('Gambar denah siap digunakan (Mode Lokal)!');
      } catch {
        toast.error('Gagal memproses gambar denah. Silakan coba lagi.');
      }
    } finally {
      setIsUploading(false);
      setUploadStatusText('Mengunggah gambar...');
    }
  };

  // Handle URL submit
  const handleApplyUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) {
      toast.error('Masukkan URL gambar yang valid');
      return;
    }
    onUpdateConfig({
      enabled: true,
      url: urlInput.trim(),
      file_name: urlInput.split('/').pop() || 'Gambar Denah Online',
      is_locked: false,
    });
    toast.success('URL gambar denah berhasil dimuat');
  };

  // Quick Preset Actions
  const handleResetPosition = () => {
    onUpdateConfig({ x: 0, y: 0, rotation: 0, scale: 1 });
    toast.success('Posisi & skala gambar dikembalikan ke tengah');
  };

  const handleRotateStep = (delta: number) => {
    const current = config.rotation || 0;
    const next = (current + delta + 360) % 360;
    onUpdateConfig({ rotation: next > 180 ? next - 360 : next });
  };

  const handleRemoveImage = () => {
    onUpdateConfig({
      enabled: false,
      url: '',
      file_name: undefined,
    });
    setUrlInput('');
    toast('Gambar denah telah dihapus', { icon: '🗑️' });
  };

  return (
    <div
      className={`absolute top-16 right-3 sm:right-6 z-40 w-[310px] sm:w-[350px] max-h-[85vh] flex flex-col rounded-2xl shadow-2xl backdrop-blur-md border transition-all text-xs overflow-hidden pointer-events-auto ${
        isLightMode
          ? 'bg-white/95 border-slate-200/90 text-slate-800'
          : 'bg-slate-900/95 border-slate-700/80 text-slate-100'
      }`}
    >
      {/* ── HEADER PANEL ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between p-3 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/70 shrink-0">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <ImageIcon className="w-4 h-4" />
          </span>
          <div>
            <h3 className="font-bold text-xs flex items-center gap-1.5">
              <span>Latar Gambar Denah</span>
              {config.enabled && config.url && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  Aktif
                </span>
              )}
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Blueprint arsitektur & masterplan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Toggle Enable/Disable Switch */}
          <button
            type="button"
            onClick={() => onUpdateConfig({ enabled: !config.enabled })}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer border ${
              config.enabled
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 border-transparent'
            }`}
            title={config.enabled ? 'Sembunyikan Gambar Latar' : 'Tampilkan Gambar Latar'}
          >
            {config.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>

          {/* Minimize / Expand */}
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={isCollapsed ? 'Perluas Panel' : 'Ciutkan Panel'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>

          {/* Close Panel */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
            title="Tutup Panel Kontrol"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── BODY CONTENT ──────────────────────────────────────────────────────── */}
      {!isCollapsed && (
        <div className="p-3.5 space-y-3.5 overflow-y-auto max-h-[calc(85vh-50px)]">
          {/* 1. SEKSI UNGGAH / PILIH GAMBAR */}
          <div className="space-y-2">
            {!config.url ? (
              <div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="hidden"
                  id="denah-blueprint-file-upload"
                />

                {/* Tab Upload vs URL */}
                <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 mb-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('UPLOAD')}
                    className={`flex-1 py-1 rounded-md text-[11px] font-semibold transition-all ${
                      activeTab === 'UPLOAD'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    Unggah Berkas
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('URL')}
                    className={`flex-1 py-1 rounded-md text-[11px] font-semibold transition-all ${
                      activeTab === 'URL'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    Tautan URL
                  </button>
                </div>

                {activeTab === 'UPLOAD' ? (
                  <label
                    htmlFor="denah-blueprint-file-upload"
                    className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-emerald-400/60 dark:border-emerald-500/40 hover:border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20 hover:bg-emerald-50/60 rounded-xl cursor-pointer transition-all text-center group"
                  >
                    {isUploading ? (
                      <div className="flex flex-col items-center py-2">
                        <Loader2 className="w-7 h-7 text-emerald-500 animate-spin mb-1.5" />
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-xs">
                          {uploadStatusText}
                        </span>
                      </div>
                    ) : (
                      <>
                        <span className="p-2.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-2 group-hover:scale-110 transition-transform">
                          <Upload className="w-5 h-5" />
                        </span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">
                          Klik untuk Pilih Gambar Denah
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          Format PNG, JPG, WEBP, atau SVG (Maks 50 MB)
                        </span>
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                          ⚡ Otomatis Dikompresi & Disimpan di Storage Engine
                        </span>
                      </>
                    )}
                  </label>
                ) : (
                  <form onSubmit={handleApplyUrl} className="space-y-2">
                    <div className="relative">
                      <Link className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://.../denah-sekolah.png"
                        className="w-full pl-8 pr-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-1.5 rounded-lg font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors cursor-pointer"
                    >
                      Terapkan Gambar
                    </button>
                  </form>
                )}
              </div>
            ) : (
              /* Preview Gambar Terpasang */
              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0 border border-slate-300 dark:border-slate-700">
                    <img
                      src={config.url}
                      alt="Thumbnail"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs truncate">
                      {config.file_name || 'Gambar Denah'}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      Skala {(config.scale || 1).toFixed(2)}x • Rotasi {config.rotation || 0}°
                    </p>
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      {compressionRatio !== null && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Hemat {compressionRatio}%
                        </span>
                      )}
                      <span className="text-[9px] text-slate-400">Storage Engine ✓</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200/80 dark:border-slate-800">
                  <label
                    htmlFor="denah-blueprint-file-upload-replace"
                    className="flex-1 py-1 rounded-lg text-center font-bold text-[11px] bg-slate-200 hover:bg-slate-300 dark:bg-slate-750 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                  >
                    Ganti Gambar
                  </label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                    onChange={handleFileChange}
                    disabled={isUploading}
                    className="hidden"
                    id="denah-blueprint-file-upload-replace"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="p-1 px-2 rounded-lg font-bold text-[11px] bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-400 transition-colors cursor-pointer"
                    title="Hapus gambar denah"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2. MODE KUNCI POSISI (LOCK / UNLOCK) */}
          {config.url && (
            <div className="space-y-2 pt-1 border-t border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] text-slate-700 dark:text-slate-300">
                  Interaksi Kanvas:
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    config.is_locked
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                  }`}
                >
                  {config.is_locked ? 'Terkunci (Aman)' : 'Dapat Digeser'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onUpdateConfig({ is_locked: !config.is_locked })}
                className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs border ${
                  config.is_locked
                    ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:hover:bg-blue-900/70 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 animate-pulse'
                }`}
              >
                {config.is_locked ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Buka Kunci untuk Geser Gambar</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Kunci Posisi (Selesai Mengatur)</span>
                  </>
                )}
              </button>
              <p className="text-[10px] text-slate-400 leading-tight">
                {config.is_locked
                  ? '🔒 Gambar terkunci. Klik & drag kanvas digunakan untuk menata kotak ruangan.'
                  : '🔓 Gambar terbuka. Klik & seret gambar langsung di kanvas untuk menyesuaikan posisi.'}
              </p>
            </div>
          )}

          {/* 3. PENGATURAN SKALA & KESESUAIAN (FIT & ZOOM) */}
          {config.url && (
            <div className="space-y-2 pt-1 border-t border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] text-slate-700 dark:text-slate-300">
                  Skala & Zoom Gambar:
                </span>
                <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {Math.round((config.scale || 1) * 100)}%
                </span>
              </div>

              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.05"
                value={config.scale || 1}
                onChange={(e) => onUpdateConfig({ scale: parseFloat(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-750 rounded-lg"
              />

              {/* Mode Kesesuaian (Fit Preset) */}
              <div className="grid grid-cols-4 gap-1 pt-1">
                {(['contain', 'cover', 'original'] as DenahImageFitMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      onUpdateConfig({ fit: mode, scale: 1 });
                    }}
                    className={`py-1 rounded-md text-[10px] font-bold border transition-colors cursor-pointer capitalize ${
                      config.fit === mode
                        ? 'bg-emerald-500 text-white border-emerald-600'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {mode === 'contain' ? 'Fit' : mode === 'cover' ? 'Cover' : 'Asli'}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => onUpdateConfig({ scale: 1 })}
                  className="py-1 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  100%
                </button>
              </div>
            </div>
          )}

          {/* 4. PENGATURAN ROTASI GAMBAR */}
          {config.url && (
            <div className="space-y-2 pt-1 border-t border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] text-slate-700 dark:text-slate-300">
                  Rotasi Gambar:
                </span>
                <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {config.rotation || 0}°
                </span>
              </div>

              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={config.rotation || 0}
                onChange={(e) => onUpdateConfig({ rotation: parseInt(e.target.value, 10) })}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-750 rounded-lg"
              />

              <div className="flex items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleRotateStep(-90)}
                  className="flex-1 py-1 px-2 rounded-lg font-bold text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  title="Putar 90° Berlawanan Arah Jarum Jam"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>-90°</span>
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateConfig({ rotation: 0 })}
                  className="py-1 px-2.5 rounded-lg font-bold text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
                  title="Reset Rotasi ke 0°"
                >
                  0°
                </button>
                <button
                  type="button"
                  onClick={() => handleRotateStep(90)}
                  className="flex-1 py-1 px-2 rounded-lg font-bold text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  title="Putar 90° Searah Jarum Jam"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>+90°</span>
                </button>
              </div>
            </div>
          )}

          {/* 5. TRANSPARANSI GAMBAR & TEMBUS PANDANG RUANGAN */}
          {config.url && (
            <div className="space-y-2 pt-1 border-t border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] text-slate-700 dark:text-slate-300">
                  Transparansi Gambar:
                </span>
                <span className="text-[11px] font-mono font-bold text-slate-500">
                  {Math.round((config.opacity || 0.85) * 100)}%
                </span>
              </div>

              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={config.opacity || 0.85}
                onChange={(e) => onUpdateConfig({ opacity: parseFloat(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-750 rounded-lg"
              />

              {/* Kejelasan / Opasitas Kotak Ruangan */}
              {onUpdateBoxOpacity && (
                <div className="pt-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[10px] text-slate-500">
                      Kejelasan Kotak Ruangan:
                    </span>
                    <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {Math.round((boxOpacity ?? 0.85) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={boxOpacity}
                    onChange={(e) => onUpdateBoxOpacity(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-750 rounded-lg"
                  />
                  <div className="grid grid-cols-3 gap-1 pt-0.5">
                    {[
                      { label: '50% Kaca', value: 0.5 },
                      { label: '85% Jelas', value: 0.85 },
                      { label: '100% Solid', value: 1.0 },
                    ].map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => onUpdateBoxOpacity(preset.value)}
                        className={`py-0.5 rounded text-[9px] font-bold border transition-colors cursor-pointer ${
                          Math.abs((boxOpacity ?? 0.85) - preset.value) < 0.04
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 6. TOMBOL RESET POSISI */}
          {config.url && (
            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">
                Offset: X={config.x || 0}px, Y={config.y || 0}px
              </span>
              <button
                type="button"
                onClick={handleResetPosition}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Pusatkan Gambar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
