import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  PenTool,
  RotateCcw,
  Check,
  X,
  Trash2,
  Sparkles,
  Eraser,
  Palette,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export interface DigitalSignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureBase64: string) => void;
  title?: string;
  penName?: string;
}

export const DigitalSignaturePadModal: React.FC<DigitalSignaturePadModalProps> = ({
  isOpen,
  onClose,
  onSave,
  title = 'Tanda Tangan Digital (Pen)',
  penName = 'Penandatangan',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [penColor, setPenColor] = useState<'#1e3a8a' | '#0f172a'>('#1e3a8a'); // Default Navy Blue (Tinta Pulpen Resmi)
  const [penWidth, setPenWidth] = useState<number>(2.5);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize Canvas with proper high-DPI resolution
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use actual client dimensions
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;

    // Clear to transparent
    ctx.clearRect(0, 0, rect.width, rect.height);
    setIsEmpty(true);
  }, [penColor, penWidth]);

  useEffect(() => {
    if (isOpen) {
      // Delay slightly for modal mount animation
      const timer = setTimeout(() => {
        initCanvas();
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initCanvas]);

  // Update pen settings on context
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

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
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

    // Quadratic curve for ultra-smooth handwriting curves
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

  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
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
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;
    // Export transparent PNG for seamless document stamping
    const base64 = canvas.toDataURL('image/png');
    onSave(base64);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <div className="space-y-4">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-medium">Penandatangan:</span>
            <span className="font-bold text-foreground">{penName}</span>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {/* Color picker */}
            <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setPenColor('#1e3a8a')}
                className={cn(
                  'w-5 h-5 rounded-full bg-[#1e3a8a] border-2 transition-transform cursor-pointer',
                  penColor === '#1e3a8a' ? 'scale-110 border-white shadow-xs' : 'border-transparent opacity-60'
                )}
                title="Tinta Biru Resmi Pulpen"
              />
              <button
                type="button"
                onClick={() => setPenColor('#0f172a')}
                className={cn(
                  'w-5 h-5 rounded-full bg-[#0f172a] border-2 transition-transform cursor-pointer',
                  penColor === '#0f172a' ? 'scale-110 border-white shadow-xs' : 'border-transparent opacity-60'
                )}
                title="Tinta Hitam Pekat"
              />
            </div>

            {/* Thickness */}
            <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg text-[11px] font-medium">
              <button
                type="button"
                onClick={() => setPenWidth(2)}
                className={cn(
                  'px-2 py-0.5 rounded cursor-pointer transition-colors',
                  penWidth === 2 ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'
                )}
              >
                Halus
              </button>
              <button
                type="button"
                onClick={() => setPenWidth(2.8)}
                className={cn(
                  'px-2 py-0.5 rounded cursor-pointer transition-colors',
                  penWidth === 2.8 ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'
                )}
              >
                Sedang
              </button>
              <button
                type="button"
                onClick={() => setPenWidth(3.8)}
                className={cn(
                  'px-2 py-0.5 rounded cursor-pointer transition-colors',
                  penWidth === 3.8 ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'
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

          {/* Guidelines Line */}
          <div className="absolute left-8 right-8 bottom-12 border-b border-dashed border-slate-300 dark:border-slate-700 pointer-events-none" />

          {/* Placeholder hint */}
          {isEmpty && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none text-slate-400 dark:text-slate-500">
              <PenTool className="w-8 h-8 mb-2 opacity-30 stroke-1" />
              <p className="text-xs font-medium">Goreskan Tanda Tangan Anda di Sini</p>
              <p className="text-[10px] opacity-75 mt-0.5">Dapat menggunakan Pen Stylus, Jari, atau Mouse</p>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearCanvas}
            disabled={isEmpty}
            className="text-xs gap-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Bersihkan / Ulangi
          </Button>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isEmpty}
              className="text-xs gap-1.5"
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
