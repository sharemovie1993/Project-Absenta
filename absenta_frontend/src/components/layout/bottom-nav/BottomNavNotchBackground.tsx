import React, { useRef, useState, useLayoutEffect } from 'react';
import type { EcosystemTheme, EcosystemType } from '@/config/bottomNavEcosystems.config';

export interface BottomNavNotchBackgroundProps {
  theme: EcosystemTheme;
  ecosystem: EcosystemType;
  notchWidth?: number;
  notchDepth?: number;
  height?: number;
}

export function getEcosystemGradient(ecosystem: EcosystemType): [string, string] {
  switch (ecosystem) {
    case 'kaprog': return ['#d97706', '#b45309']; // amber-600 to amber-700
    case 'walas': return ['#0284c7', '#1d4ed8']; // sky-600 to blue-700
    case 'tu': return ['#4338ca', '#1e293b']; // indigo-700 to slate-800
    case 'kurikulum': return ['#059669', '#0f766e']; // emerald-600 to teal-700
    case 'kesiswaan': return ['#e11d48', '#b91c1c']; // rose-600 to red-700
    case 'hubin': return ['#ea580c', '#b45309']; // orange-600 to amber-700
    case 'bpbk': return ['#9333ea', '#5b21b6']; // purple-600 to violet-800
    case 'bkk': return ['#0e7490', '#1e40af']; // cyan-700 to blue-800
    case 'sarpras': return ['#0f766e', '#065f46']; // teal-700 to emerald-800
    case 'toolman': return ['#334155', '#18181b']; // slate-700 to zinc-900
    case 'ekskul': return ['#c026d3', '#7e22ce']; // fuchsia-600 to purple-700
    case 'pembimbing_pkl': return ['#2563eb', '#3730a3']; // blue-600 to indigo-800
    case 'satpam': return ['#0f172a', '#020617']; // slate-900 to slate-950
    case 'koperasi': return ['#16a34a', '#15803d']; // green-600 to green-700
    case 'piket': return ['#4f46e5', '#6d28d9']; // indigo-600 to violet-700
    case 'admin': return ['#7c3aed', '#1e1b4b']; // violet-600 to slate-900
    default: return ['#ffffff', '#ffffff'];
  }
}

/**
 * ── GAYA 1: BOTTOM BAR DOCK DENGAN NOTCH CEKUNG MELAYANG (CURVED NOTCH CUTOUT) ──
 * Menghasilkan kurva lengkung S-Curve mulus (C1 Continuous) persis seperti desain referensi:
 * - Sudut luar dan sudut palung memiliki tangen horizontal mulus tanpa patahan siku.
 * - Ruang di atas lekukan berlubang transparan (zero-overlap) sehingga konten halaman terlihat alami.
 * - Mendukung tema terang (putih), tema gelap (slate-900/950), dan tema gradient Layer 2 per-divisi.
 */
export const BottomNavNotchBackground: React.FC<BottomNavNotchBackgroundProps> = React.memo(({
  theme,
  ecosystem,
  notchWidth = 84,
  notchDepth = 22,
  height = 64,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(() => (typeof window !== 'undefined' ? window.innerWidth - 24 : 360));

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        const measured = containerRef.current.clientWidth;
        if (measured > 0) setWidth(measured);
      }
    };
    updateWidth();

    const resizeObserver = new ResizeObserver(() => {
      updateWidth();
    });
    resizeObserver.observe(containerRef.current);

    window.addEventListener('resize', updateWidth);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  const center = width / 2;
  const p1 = center - notchWidth / 2;
  const p2 = center + notchWidth / 2;
  const rTop = 26;
  const rBottom = 26;

  // Path formula untuk Gaya 1:
  // 1. Sudut kiri atas membulat
  // 2. Garis lurus ke bahu kiri notch
  // 3. S-curve turun ke dasar palung cekung
  // 4. S-curve naik ke bahu kanan notch
  // 5. Garis lurus ke sudut kanan atas membulat
  // 6. Sisi kanan turun ke sudut kanan bawah membulat
  // 7. Sisi bawah lurus ke sudut kiri bawah membulat
  // 8. Menutup path
  const fillPathD = `
    M 0 ${rTop}
    Q 0 0 ${rTop} 0
    L ${p1} 0
    C ${p1 + 14} 0 ${center - 22} ${notchDepth} ${center} ${notchDepth}
    C ${center + 22} ${notchDepth} ${p2 - 14} 0 ${p2} 0
    L ${width - rTop} 0
    Q ${width} 0 ${width} ${rTop}
    L ${width} ${height - rBottom}
    Q ${width} ${height} ${width - rBottom} ${height}
    L ${rBottom} ${height}
    Q 0 ${height} 0 ${height - rBottom}
    Z
  `.replace(/\s+/g, ' ').trim();

  // Path garis pembatas atas halus (top border stroke)
  const topStrokeD = `
    M 0 ${rTop}
    Q 0 0 ${rTop} 0
    L ${p1} 0
    C ${p1 + 14} 0 ${center - 22} ${notchDepth} ${center} ${notchDepth}
    C ${center + 22} ${notchDepth} ${p2 - 14} 0 ${p2} 0
    L ${width - rTop} 0
    Q ${width} 0 ${width} ${rTop}
  `.replace(/\s+/g, ' ').trim();

  const isLayer2 = theme.isLayer2;
  const gradientColors = getEcosystemGradient(ecosystem);
  const gradId = `notch-grad-${ecosystem}`;

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-visible"
      aria-hidden="true"
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full filter drop-shadow-[0_8px_25px_rgba(0,0,0,0.12)] dark:drop-shadow-[0_12px_32px_rgba(0,0,0,0.55)]"
        style={{ overflow: 'visible' }}
      >
        <defs>
          {isLayer2 && (
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={gradientColors[0]} />
              <stop offset="100%" stopColor={gradientColors[1]} />
            </linearGradient>
          )}
        </defs>

        {/* 1. Background Fill dengan Lekukan Notch Cekung */}
        <path
          d={fillPathD}
          fill={isLayer2 ? `url(#${gradId})` : undefined}
          className={
            isLayer2
              ? undefined
              : "fill-white/95 dark:fill-slate-900/95 transition-colors duration-200"
          }
        />

        {/* 2. Top Border Stroke yang meliuk mengikuti kurva */}
        <path
          d={topStrokeD}
          fill="none"
          strokeWidth="1.2"
          className={
            isLayer2
              ? "stroke-white/35"
              : "stroke-slate-200/80 dark:stroke-slate-800 transition-colors duration-200"
          }
        />
      </svg>
    </div>
  );
});

BottomNavNotchBackground.displayName = 'BottomNavNotchBackground';
