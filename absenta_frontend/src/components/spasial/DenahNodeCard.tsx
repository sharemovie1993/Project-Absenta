import React from 'react';
import { RotateCw, FlipHorizontal, Trash2, Maximize2, Type } from 'lucide-react';
import type { DenahElementNode } from '../../types/spasial.types';
import { detectNodeTingkat, TINGKAT_STYLES } from './denahTingkatHelper';

interface DenahNodeCardProps {
  node: DenahElementNode;
  isSelected: boolean;
  isHighlighted?: boolean;
  highlightLabel?: string;
  onSelect: (e: React.MouseEvent, id: string) => void;
  onRotate: (id: string) => void;
  onToggleTextUpright?: (id: string) => void;
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
    border: 'border-indigo-500/50 hover:border-indigo-600',
    text: 'text-indigo-950 dark:text-indigo-200',
    badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
  },
  LAB: {
    bg: 'bg-cyan-50/70 dark:bg-cyan-950/40',
    border: 'border-cyan-500/60 hover:border-cyan-600',
    text: 'text-cyan-950 dark:text-cyan-100',
    badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-300',
  },
  TOILET: {
    bg: 'bg-rose-50/70 dark:bg-rose-950/40',
    border: 'border-rose-400/60 hover:border-rose-500',
    text: 'text-rose-950 dark:text-rose-100',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300',
  },
  KANTOR: {
    bg: 'bg-purple-50/70 dark:bg-purple-950/40',
    border: 'border-purple-400/60 hover:border-purple-500',
    text: 'text-purple-950 dark:text-purple-100',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300',
  },
  PERPUSTAKAAN: {
    bg: 'bg-amber-50/70 dark:bg-amber-950/40',
    border: 'border-amber-400/60 hover:border-amber-500',
    text: 'text-amber-950 dark:text-amber-100',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300',
  },
  LAPANGAN: {
    bg: 'bg-emerald-50/70 dark:bg-emerald-950/40',
    border: 'border-emerald-500/60 hover:border-emerald-600',
    text: 'text-emerald-950 dark:text-emerald-100',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300',
  },
  KORIDOR: {
    bg: 'bg-slate-100/70 dark:bg-slate-800/50',
    border: 'border-dashed border-slate-400 hover:border-slate-500',
    text: 'text-slate-800 dark:text-slate-200',
    badge: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  },
  LAINNYA: {
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-slate-300 dark:border-slate-700 hover:border-slate-500',
    text: 'text-slate-900 dark:text-slate-100',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
};

export const DenahNodeCard = React.memo<DenahNodeCardProps>(
  ({
    node,
    isSelected,
    isHighlighted = false,
    highlightLabel,
    onSelect,
    onRotate,
    onToggleTextUpright,
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

    // Deteksi tingkat rombel (Tingkat 10, 11, 12) agar kartu ruangan terkelompokkan dengan warna pembeda kontras
    const detectedTingkat = detectNodeTingkat(node);
    const tingkatStyle =
      (node.kategori_ruang === 'RUANG_UJIAN' || !node.kategori_ruang) && detectedTingkat
        ? TINGKAT_STYLES[detectedTingkat]
        : null;

    const effectiveBg = tingkatStyle ? tingkatStyle.bg : catStyle.bg;
    const effectiveBorder = tingkatStyle ? tingkatStyle.border : catStyle.border;
    const effectiveGlow = tingkatStyle ? tingkatStyle.glow : 'shadow-sm';

    // Deteksi rotasi 90° atau 270° dan fitur rotasi kotak tanpa memutar teks
    const isRotated90or270 = node.rotation === 90 || node.rotation === 270;
    const isTextUpright = node.kunci_teks_tegak !== false; // Default: true (Teks selalu tegak & mudah dibaca)
    const textRotation = isTextUpright ? -node.rotation : 0;

    // Adaptasi ukuran tipografi berdasarkan dimensi visual kotak
    const effectiveW = isRotated90or270 ? node.height : node.width;
    const effectiveH = isRotated90or270 ? node.width : node.height;
    const isMini = effectiveW < 115 || effectiveH < 65;
    const isMedium = effectiveW < 155 || effectiveH < 85;

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
          transform: `translate3d(${node.x}px, ${node.y}px, 0) rotate(${node.rotation}deg) scale(${scaleX}, ${scaleY})`,
          width: `${node.width}px`,
          height: `${node.height}px`,
          transformOrigin: 'center center',
          backgroundColor: isHighlighted ? undefined : (node.warna_bg || undefined),
          borderColor: isHighlighted ? undefined : (node.warna_border || undefined),
          willChange: isSelected ? 'transform' : 'auto',
        }}
        className={`absolute select-none cursor-move rounded-xl border-2 transition-colors duration-150 flex flex-col items-center justify-center p-1 ${
          isHighlighted ? 'overflow-visible' : 'overflow-hidden'
        } group ${
          isHighlighted
            ? 'ring-4 ring-violet-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 border-violet-600 bg-gradient-to-br from-violet-100 via-white to-indigo-100 dark:from-violet-950/90 dark:via-slate-900 dark:to-indigo-950/90 shadow-2xl shadow-violet-500/60 z-40 animate-[pulse_1.8s_cubic-bezier(0.4,0,0.6,1)_infinite]'
            : isSelected
            ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 shadow-md z-30 ' + effectiveBg + (node.warna_border ? '' : ' ' + effectiveBorder)
            : 'hover:shadow hover:z-20 z-10 ' + effectiveGlow + ' ' + effectiveBg + (node.warna_border ? '' : ' ' + effectiveBorder)
        }`}
      >
      {/* Efek Berdenyut (Radar Pulse Wave) saat Highlight Denah Aktif */}
      {isHighlighted && (
        <>
          <div className="absolute -inset-3 rounded-2xl bg-violet-500/30 animate-ping pointer-events-none z-0" />
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-violet-600 text-white text-[10px] font-black shadow-lg animate-bounce whitespace-nowrap border border-white/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              {highlightLabel || 'RUANGAN ANDA'}
            </span>
          </div>
        </>
      )}
      {/* Floating Hover Action Toolbar (Posisi absolute: TIDAK memakan ruang tinggi kartu) */}
      {!isReadOnly && (
        <div
          className="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 dark:bg-slate-800/95 rounded-md p-0.5 shadow-md border border-slate-200 dark:border-slate-700 backdrop-blur-xs z-20 pointer-events-auto"
          style={{ transform: `rotate(${textRotation}deg) scale(${scaleX}, ${scaleY})` }}
        >
          <button
            type="button"
            title="Putar Kotak 90° (Teks Tetap Tegak)"
            onClick={(e) => {
              e.stopPropagation();
              onRotate(node.id);
            }}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <RotateCw className="w-3 h-3" />
          </button>
          {onToggleTextUpright && (
            <button
              type="button"
              title={
                isTextUpright
                  ? 'Teks Terkunci Tegak (Klik agar teks ikut miring dengan kotak)'
                  : 'Teks Mengikuti Rotasi Kotak (Klik untuk mengunci teks tegak lurus)'
              }
              onClick={(e) => {
                e.stopPropagation();
                onToggleTextUpright(node.id);
              }}
              className={`p-1 rounded transition-colors cursor-pointer ${
                isTextUpright
                  ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 font-black'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <Type className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            title="Flip Horizontal (Cermin Kiri-Kanan)"
            onClick={(e) => {
              e.stopPropagation();
              onFlipH(node.id);
            }}
            className={`p-1 rounded transition-colors cursor-pointer ${
              node.flip_h
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
                : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <FlipHorizontal className="w-3 h-3" />
          </button>
          <button
            type="button"
            title="Hapus Kotak"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node.id);
            }}
            className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded text-rose-500 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Fokus Utama: HANYA Nomor Ruang (R.01) & Nama Kelas (X AKL 1) - Bebas Rotasi (Teks Tetap Tegak Lurus) */}
      <div
        className="flex flex-col items-center justify-center text-center cursor-move px-1"
        style={{
          width: isRotated90or270 && isTextUpright ? `${node.height}px` : '100%',
          height: isRotated90or270 && isTextUpright ? `${node.width}px` : '100%',
          transform: `rotate(${textRotation}deg) scale(${scaleX}, ${scaleY})`,
          transformOrigin: 'center center',
        }}
        onMouseDown={(e) => !isReadOnly && onStartDrag(e, node.id)}
      >
        {/* Badge Tingkat Kelas (TK. X / TK. XI / TK. XII) - Membedakan Kelompok Tingkat Secara Instan */}
        {tingkatStyle && (
          <span
            className={`inline-flex items-center font-black tracking-wider uppercase rounded-xs ${
              tingkatStyle.badge
            } ${
              isMini
                ? 'text-[7.5px] px-1 py-0 leading-tight mb-0.5'
                : isMedium
                ? 'text-[8.5px] px-1.5 py-0.2 leading-tight mb-0.5'
                : 'text-[9.5px] px-2 py-0.5 leading-tight mb-1'
            }`}
          >
            {tingkatStyle.badgeLabel}
          </span>
        )}

        {/* Label Nomor Ruang: R.01 (Bongsor, Tebal, & Kontras Tinggi) */}
        <div
          className={`font-black tracking-tight leading-none font-mono ${
            isHighlighted
              ? 'text-violet-700 dark:text-violet-300'
              : tingkatStyle
              ? tingkatStyle.text
              : catStyle.text
          } ${
            isMini
              ? 'text-base sm:text-lg'
              : isMedium
              ? 'text-xl sm:text-2xl'
              : 'text-2xl sm:text-3xl'
          }`}
          style={{ color: isHighlighted ? undefined : (node.warna_teks || undefined) }}
        >
          {node.label_utama || 'R.XX'}
        </div>

        {/* Label Nama Kelas: X AKL 1 (Jelas & Terbaca meski dari Zoom Jauh) */}
        {node.label_sub && (
          <div
            className={`font-extrabold truncate max-w-full leading-tight ${
              tingkatStyle ? tingkatStyle.subtext : 'text-slate-800 dark:text-slate-100'
            } ${
              isMini
                ? 'text-[10px] sm:text-[11px] mt-0.5'
                : isMedium
                ? 'text-xs sm:text-sm mt-0.5'
                : 'text-sm sm:text-base mt-1'
            }`}
          >
            {node.label_sub}
          </div>
        )}
      </div>

      {/* Floating Corner Resize Handle (Posisi absolute pojok kanan-bawah: TIDAK memakan baris layout) */}
      {!isReadOnly && (
        <div
          className={`absolute bottom-0.5 right-0.5 cursor-se-resize p-1 text-slate-400 hover:text-primary-600 transition-opacity z-20 ${
            isSelected ? 'opacity-90' : 'opacity-0 group-hover:opacity-90'
          }`}
          style={{ transform: `scale(${scaleX}, ${scaleY})` }}
          onMouseDown={(e) => onStartResize(e, node.id)}
          title="Tarik untuk ubah ukuran kotak"
        >
          <Maximize2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 rotate-90" />
        </div>
      )}
    </div>
  );
}, (prev, next) => {
  return (
    prev.node === next.node &&
    prev.isSelected === next.isSelected &&
    prev.isHighlighted === next.isHighlighted &&
    prev.highlightLabel === next.highlightLabel &&
    prev.isReadOnly === next.isReadOnly
  );
});

DenahNodeCard.displayName = 'DenahNodeCard';
