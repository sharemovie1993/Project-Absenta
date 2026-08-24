import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

interface SignaturePadProps {
  onSave: (base64: string | null) => void;
  label: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = React.memo(({ onSave, label }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getEventCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e.nativeEvent) {
      if (e.nativeEvent.touches.length === 0) return { x: 0, y: 0 };
      const touch = e.nativeEvent.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    }
    
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setIsEmpty(false);
    const coords = getEventCoords(e);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (e.cancelable) e.preventDefault();

    const coords = getEventCoords(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      onSave(canvas.toDataURL('image/jpeg', 0.85));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onSave(null);
  };

  return (
    <div className="space-y-1.5 flex-1">
      <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
        <span>{label}</span>
        {!isEmpty && (
          <button 
            type="button" 
            onClick={clearCanvas}
            className="text-[10px] text-rose-500 hover:text-rose-600 underline font-bold"
          >
            Hapus Tanda Tangan
          </button>
        )}
      </div>
      <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden bg-white shadow-inner flex flex-col items-center justify-center p-1">
        <canvas
          ref={canvasRef}
          width={300}
          height={120}
          className="cursor-crosshair touch-none w-full max-w-[300px] h-[120px] bg-white block rounded-lg"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {isEmpty && (
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider -mt-7 pointer-events-none select-none">
            Goreskan tanda tangan di sini
          </span>
        )}
      </div>
    </div>
  );
});
