import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  PenTool,
  RotateCcw,
  Check,
  X,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export interface DigitalSignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureBase64: string) => void;
  title?: string;
  subtitle?: string;
  penName?: string;
  initialSignature?: string | null;
  allowUploadAlternative?: boolean;
}

/**
 * Trims transparent pixels from an HTML5 canvas to produce a clean, tight signature stamp
 */
const trimCanvas = (canvas: HTMLCanvasElement): string => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas.toDataURL('image/png');

  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let hasPixels = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const alpha = data[idx + 3];
      // Check if pixel is drawn (alpha > 20)
      if (alpha > 20) {
        hasPixels = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!hasPixels) return canvas.toDataURL('image/png');

  // Add 12px padding around bounding box
  const pad = 12 * (window.devicePixelRatio || 1);
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width, maxX + pad);
  maxY = Math.min(height, maxY + pad);

  const trimmedWidth = maxX - minX;
  const trimmedHeight = maxY - minY;

  const trimmedCanvas = document.createElement('canvas');
  trimmedCanvas.width = trimmedWidth;
  trimmedCanvas.height = trimmedHeight;

  const trimmedCtx = trimmedCanvas.getContext('2d');
  if (!trimmedCtx) return canvas.toDataURL('image/png');

  trimmedCtx.drawImage(
    canvas,
    minX,
    minY,
    trimmedWidth,
    trimmedHeight,
    0,
    0,
    trimmedWidth,
    trimmedHeight
  );

  return trimmedCanvas.toDataURL('image/png');
};

export const DigitalSignaturePadModal: React.FC<DigitalSignaturePadModalProps> = ({
  isOpen,
  onClose,
  onSave,
  title = 'Tanda Tangan Digital Resmi',
  subtitle,
  penName = 'Penandatangan',
  initialSignature = null,
  allowUploadAlternative = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [mode, setMode] = useState<'PEN' | 'UPLOAD'>('PEN');
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [penColor, setPenColor] = useState<'#1e3a8a' | '#0f172a'>('#1e3a8a'); // Default Navy Blue (Tinta Pulpen Basah)
  const [penWidth, setPenWidth] = useState<number>(2.6);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize Canvas with proper high-DPI resolution
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;

    ctx.clearRect(0, 0, rect.width, rect.height);
    setIsEmpty(true);
    setUploadedImage(null);

    // If initialSignature is provided as base64 and mode is PEN, draw it
    if (initialSignature && initialSignature.startsWith('data:image')) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, (rect.width - 160) / 2, (rect.height - 80) / 2, 160, 80);
        setIsEmpty(false);
      };
      img.src = initialSignature;
    }
  }, [penColor, penWidth, initialSignature]);

  useEffect(() => {
    if (isOpen) {
      setMode('PEN');
      const timer = setTimeout(() => {
        initCanvas();
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penWidth;
    }
  }, [penColor, penWidth]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e.nativeEvent) {
      if (e.nativeEvent.touches.length === 0) return { x: 0, y: 0 };
      const touch = e.nativeEvent.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }

    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setIsEmpty(false);

    const coords = getCoordinates(e);
    lastPointRef.current = coords;

    ctx.beginPath();
    ctx.arc(coords.x, coords.y, penWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = penColor;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || !lastPointRef.current) return;

    const currentCoords = getCoordinates(e);

    const midPoint = {
      x: (lastPointRef.current.x + currentCoords.x) / 2,
      y: (lastPointRef.current.y + currentCoords.y) / 2,
    };

    ctx.quadraticCurveTo(
      lastPointRef.current.x,
      lastPointRef.current.y,
      midPoint.x,
      midPoint.y
    );
    ctx.stroke();

    lastPointRef.current = currentCoords;
  };

  const stopDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    e.preventDefault();
    setIsDrawing(false);
    lastPointRef.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setIsEmpty(true);
    setUploadedImage(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const base64 = loadEvent.target?.result as string;
      setUploadedImage(base64);
      setIsEmpty(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (mode === 'UPLOAD') {
      if (!uploadedImage) return;
      onSave(uploadedImage);
      onClose();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;
    const croppedSignature = trimCanvas(canvas);
    onSave(croppedSignature);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <div className="space-y-4">
        {/* Header & Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b text-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium">Penandatangan:</span>
              <span className="font-bold text-foreground">{penName}</span>
            </div>
            {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>

          {allowUploadAlternative && (
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setMode('PEN')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer',
                  mode === 'PEN'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <PenTool className="w-3.5 h-3.5 text-primary" />
                Goreskan Pen
              </button>
              <button
                type="button"
                onClick={() => setMode('UPLOAD')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer',
                  mode === 'UPLOAD'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Upload className="w-3.5 h-3.5 text-indigo-500" />
                Unggah Berkas
              </button>
            </div>
          )}
        </div>

        {/* PEN MODE */}
        {mode === 'PEN' && (
          <div className="space-y-3">
            {/* Color & Width Toolbar */}
            <div className="flex items-center justify-between bg-muted/30 px-3 py-2 rounded-xl text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-medium text-[11px]">Warna Tinta:</span>
                <div className="flex items-center gap-1.5 bg-background border p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setPenColor('#1e3a8a')}
                    className={cn(
                      'w-5 h-5 rounded-full bg-[#1e3a8a] border-2 transition-transform cursor-pointer',
                      penColor === '#1e3a8a'
                        ? 'scale-110 border-white ring-2 ring-blue-500 shadow-xs'
                        : 'border-transparent opacity-60'
                    )}
                    title="Tinta Biru Resmi Pulpen (Direkomendasikan)"
                  />
                  <button
                    type="button"
                    onClick={() => setPenColor('#0f172a')}
                    className={cn(
                      'w-5 h-5 rounded-full bg-[#0f172a] border-2 transition-transform cursor-pointer',
                      penColor === '#0f172a'
                        ? 'scale-110 border-white ring-2 ring-slate-800 shadow-xs'
                        : 'border-transparent opacity-60'
                    )}
                    title="Tinta Hitam Pekat"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-medium text-[11px]">Ketebalan:</span>
                <div className="flex items-center gap-1 bg-background border p-0.5 rounded-lg text-[10px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setPenWidth(1.8)}
                    className={cn(
                      'px-2 py-0.5 rounded cursor-pointer transition-colors',
                      penWidth === 1.8 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                    )}
                  >
                    Halus
                  </button>
                  <button
                    type="button"
                    onClick={() => setPenWidth(2.6)}
                    className={cn(
                      'px-2 py-0.5 rounded cursor-pointer transition-colors',
                      penWidth === 2.6 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                    )}
                  >
                    Sedang
                  </button>
                  <button
                    type="button"
                    onClick={() => setPenWidth(3.8)}
                    className={cn(
                      'px-2 py-0.5 rounded cursor-pointer transition-colors',
                      penWidth === 3.8 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                    )}
                  >
                    Tebal
                  </button>
                </div>
              </div>
            </div>

            {/* Canvas Area */}
            <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-950 overflow-hidden shadow-inner select-none">
              <canvas
                ref={canvasRef}
                className="w-full h-56 block touch-none cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />

              {/* Baseline Guideline */}
              <div className="absolute left-8 right-8 bottom-12 border-b border-dashed border-slate-300 dark:border-slate-700 pointer-events-none" />

              {isEmpty && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none text-slate-400 dark:text-slate-500">
                  <PenTool className="w-8 h-8 mb-2 opacity-30 stroke-1" />
                  <p className="text-xs font-semibold">Goreskan Tanda Tangan Anda di Sini</p>
                  <p className="text-[10px] opacity-75 mt-0.5">
                    Gunakan Pen Stylus, Jari, atau Kursor Mouse
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* UPLOAD MODE */}
        {mode === 'UPLOAD' && (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileUpload}
              className="hidden"
            />

            {uploadedImage ? (
              <div className="relative border-2 border-slate-300 dark:border-slate-700 rounded-2xl p-4 bg-white dark:bg-slate-950 flex flex-col items-center justify-center h-56">
                <img
                  src={uploadedImage}
                  alt="Tanda Tangan Terunggah"
                  className="max-h-40 max-w-full object-contain"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 text-xs gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Ganti Berkas Gambar
                </Button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 hover:bg-muted/40 cursor-pointer h-56 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-foreground">Klik untuk Unggah Berkas TTD</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Format PNG transparan atau JPG (Maks. 2MB)
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2">
          {mode === 'PEN' ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearCanvas}
              disabled={isEmpty}
              className="text-xs gap-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Bersihkan / Ulangi
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isEmpty}
              className="text-xs gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Terapkan Tanda Tangan
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
