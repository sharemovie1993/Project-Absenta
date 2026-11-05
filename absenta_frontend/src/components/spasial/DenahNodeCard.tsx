import React from 'react';
import { RotateCw, FlipHorizontal, FlipVertical, Trash2, Move, Maximize2 } from 'lucide-react';
import type { DenahElementNode } from '../../types/spasial.types';

interface DenahNodeCardProps {
  node: DenahElementNode;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent, id: string) => void;
  onRotate: (id: string) => void;
  onFlipH: (id: string) => void;
  onFlipV: (id: string) => void;
  onDelete: (id: string) => void;
  onStartDrag: (e: React.MouseEvent, id: string) => void;
  onStartResize: (e: React.MouseEvent, id: string) => void;
  isReadOnly?: boolean;
}

const KATEGORI_STYLES: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  RUANG_UJIAN: {
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-indigo-500/40 hover:border-indigo-600',
    text: 'text-indigo-900 dark:text-indigo-200',
    badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
  },
  LAB: {
    bg: 'bg-cyan-50/50 dark:bg-cyan-950/30',
    border: 'border-cyan-500/50 hover:border-cyan-600',
    text: 'text-cyan-950 dark:text-cyan-100',
    badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-300',
  },
  TOILET: {
    bg: 'bg-rose-50/50 dark:bg-rose-950/30',
    border: 'border-rose-400/50 hover:border-rose-500',
    text: 'text-rose-950 dark:text-rose-100',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300',
  },
  KANTOR: {
    bg: 'bg-purple-50/50 dark:bg-purple-950/30',
    border: 'border-purple-400/50 hover:border-purple-500',
    text: 'text-purple-950 dark:text-purple-100',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300',
  },
  PERPUSTAKAAN: {
    bg: 'bg-amber-50/50 dark:bg-amber-950/30',
    border: 'border-amber-400/50 hover:border-amber-500',
    text: 'text-amber-950 dark:text-amber-100',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300',
  },
  LAPANGAN: {
    bg: 'bg-emerald-50/50 dark:bg-emerald-950/30',
    border: 'border-emerald-500/50 hover:border-emerald-600',
    text: 'text-emerald-950 dark:text-emerald-100',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300',
  },
  KORIDOR: {
    bg: 'bg-slate-100/60 dark:bg-slate-800/40',
    border: 'border-dashed border-slate-400 hover:border-slate-500',
    text: 'text-slate-700 dark:text-slate-300',
    badge: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  },
  LAINNYA: {
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-slate-300 dark:border-slate-700 hover:border-slate-500',
    text: 'text-slate-800 dark:text-slate-200',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
};

export const DenahNodeCard: React.FC<DenahNodeCardProps> = ({
  node,
  isSelected,
  onSelect,
  onRotate,
  onFlipH,
  onFlipV,
  onDelete,
  onStartDrag,
  onStartResize,
  isReadOnly = false,
}) => {
  const catStyle = KATEGORI_STYLES[node.kategori_ruang] || KATEGORI_STYLES.LAINNYA;
  const scaleX = node.flip_h ? -1 : 1;
  const scaleY = node.flip_v ? -1 : 1;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect(e, node.id);
      }}
      onMouseDown={(e) => {
        if (!isReadOnly && (e.target as HTMLElement).tagName !== 'BUTTON') {
          onStartDrag(e, node.id);
        }
      }}
      style={{
        transform: `translate(${node.x}px, ${node.y}px) rotate(${node.rotation}deg) scale(${scaleX}, ${scaleY})`,
        width: `${node.width}px`,
        height: `${node.height}px`,
        transformOrigin: 'center center',
        backgroundColor: node.warna_bg || undefined,
        borderColor: node.warna_border || undefined,
      }}
      className={`absolute select-none cursor-move rounded-xl border-2 shadow-sm transition-shadow duration-150 flex flex-col justify-between p-2.5 overflow-hidden group ${
        catStyle.bg
      } ${node.warna_border ? '' : catStyle.border} ${
        isSelected
          ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 shadow-md z-30'
          : 'hover:shadow hover:z-20 z-10'
      }`}
    >
      {/* Top Bar inside node: Room Category Badge & Action Buttons */}
      <div
        className="flex items-center justify-between w-full gap-1"
        style={{ transform: `scale(${scaleX}, ${scaleY})` }}
      >
        <div className="flex items-center gap-1 min-w-0">
          <span
            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded truncate max-w-[90px] ${catStyle.badge}`}
          >
            {node.kategori_ruang === 'RUANG_UJIAN' ? 'RUANG UJIAN' : node.kategori_ruang}
          </span>
          {(node.flip_h || node.flip_v) && (
            <span
              className="text-[8px] font-mono font-bold px-1 py-0.2 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded"
              title="Status cermin aktif"
            >
              {node.flip_h && node.flip_v ? 'FLIP XY' : node.flip_h ? 'FLIP H' : 'FLIP V'}
            </span>
          )}
        </div>

        {!isReadOnly && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-slate-800/80 rounded-md px-0.5 backdrop-blur-xs">
            <button
              type="button"
              title="Putar 90°"
              onClick={(e) => {
                e.stopPropagation();
                onRotate(node.id);
              }}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 transition-colors"
            >
              <RotateCw className="w-3 h-3" />
            </button>
            <button
              type="button"
              title="Flip Horizontal (Cermin Kiri-Kanan)"
              onClick={(e) => {
                e.stopPropagation();
                onFlipH(node.id);
              }}
              className={`p-1 rounded transition-colors ${
                node.flip_h
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
                  : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <FlipHorizontal className="w-3 h-3" />
            </button>
            <button
              type="button"
              title="Flip Vertical (Cermin Atas-Bawah)"
              onClick={(e) => {
                e.stopPropagation();
                onFlipV(node.id);
              }}
              className={`p-1 rounded transition-colors ${
                node.flip_v
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
                  : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <FlipVertical className="w-3 h-3" />
            </button>
            <button
              type="button"
              title="Hapus Kotak"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node.id);
              }}
              className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded text-rose-500 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Main Center Content: R.01 (giant bold) & X TJKT 1 (Counter-scaled so text is NEVER backwards) */}
      <div
        className="flex-1 flex flex-col items-center justify-center text-center cursor-move my-1"
        style={{ transform: `scale(${scaleX}, ${scaleY})` }}
        onMouseDown={(e) => !isReadOnly && onStartDrag(e, node.id)}
      >
        <div
          className={`font-black tracking-tight leading-none text-xl sm:text-2xl font-mono ${catStyle.text}`}
          style={{ color: node.warna_teks || undefined }}
        >
          {node.label_utama || 'R.XX'}
        </div>

        {node.label_sub && (
          <div className="mt-1 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 truncate max-w-full px-1">
            {node.label_sub}
          </div>
        )}

        {node.catatan && (
          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-full italic mt-0.5">
            {node.catatan}
          </div>
        )}
      </div>

      {/* Bottom Bar: Move grip icon & Resize handle */}
      <div
        className="flex items-center justify-between text-slate-400 text-[10px] pt-0.5"
        style={{ transform: `scale(${scaleX}, ${scaleY})` }}
      >
        <div
          className="cursor-move p-0.5 hover:text-slate-600 dark:hover:text-slate-200"
          onMouseDown={(e) => !isReadOnly && onStartDrag(e, node.id)}
          title="Geser posisi"
        >
          <Move className="w-3 h-3" />
        </div>

        {!isReadOnly && (
          <div
            className="cursor-se-resize p-0.5 hover:text-primary-600 transition-colors"
            onMouseDown={(e) => onStartResize(e, node.id)}
            title="Tarik untuk ubah ukuran"
          >
            <Maximize2 className="w-3 h-3 rotate-90" />
          </div>
        )}
      </div>
    </div>
  );
};
