import React from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';

export interface MeetingWhiteboardProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  toolMode: 'PEN' | 'ERASER';
  setToolMode: (mode: 'PEN' | 'ERASER') => void;
  brushColor: string;
  setBrushColor: (color: string) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
  clearWhiteboard: () => void;
  startDrawing: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  draw: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  stopDrawing: () => void;
  isVisible: boolean;
}

export const MeetingWhiteboard: React.FC<MeetingWhiteboardProps> = ({
  canvasRef,
  toolMode,
  setToolMode,
  brushColor,
  setBrushColor,
  brushSize,
  setBrushSize,
  clearWhiteboard,
  startDrawing,
  draw,
  stopDrawing,
  isVisible
}) => {
  return (
    <div
      className={`flex-1 flex-col bg-[#1c1c1c] rounded-2xl border border-[#333] overflow-hidden shadow-2xl ${
        isVisible ? 'flex' : 'hidden'
      }`}
    >
      {/* Whiteboard Toolbar */}
      <div className="px-4 py-2 bg-[#282828] border-b border-[#333] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-white">🖍️ Papan Tulis Digital KBM</span>

          <div className="flex items-center gap-1 bg-[#1f1f1f] p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setToolMode('PEN')}
              className={`px-2.5 py-1 text-xs rounded-md font-semibold cursor-pointer ${
                toolMode === 'PEN' ? 'bg-[#0E71EB] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Pena
            </button>
            <button
              type="button"
              onClick={() => setToolMode('ERASER')}
              className={`px-2.5 py-1 text-xs rounded-md font-semibold cursor-pointer ${
                toolMode === 'ERASER' ? 'bg-[#0E71EB] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Penghapus
            </button>
          </div>

          {/* Color Palette */}
          <div className="flex items-center gap-1.5">
            {['#ffffff', '#0E71EB', '#2DA771', '#E02424', '#FACA15'].map((col) => (
              <button
                key={col}
                type="button"
                onClick={() => {
                  setBrushColor(col);
                  setToolMode('PEN');
                }}
                style={{ backgroundColor: col }}
                className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                  brushColor === col && toolMode === 'PEN' ? 'scale-125 border-white' : 'border-transparent'
                }`}
              />
            ))}
          </div>

          {/* Brush Size */}
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <span>Ukuran:</span>
            <input
              type="range"
              min="1"
              max="12"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-20 accent-[#0E71EB]"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={clearWhiteboard}
          className="flex items-center gap-1 px-3 py-1 text-xs bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white rounded-lg transition-colors cursor-pointer"
        >
          <TrashIcon className="w-4 h-4" />
          <span>Bersihkan</span>
        </button>
      </div>

      {/* Drawing Canvas Area */}
      <canvas
        ref={canvasRef}
        width={1200}
        height={700}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        className="flex-1 bg-[#1c1c1c] cursor-crosshair w-full h-full"
      />
    </div>
  );
};
