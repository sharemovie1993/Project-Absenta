import React from 'react';
import { User } from 'lucide-react';
import { resolveProfilePhotoUrl } from '../../lib/utils';
import { cn } from '../../lib/utils';

// ─── Size config ────────────────────────────────────────────────────────────

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

const SIZE_MAP: Record<AvatarSize, { avatar: string; initial: string; px: number }> = {
  xs: { avatar: 'w-7 h-7',   initial: 'text-xs',   px: 28 },
  sm: { avatar: 'w-9 h-9',   initial: 'text-sm',   px: 36 },
  md: { avatar: 'w-10 h-10', initial: 'text-base', px: 40 },
  lg: { avatar: 'w-12 h-12', initial: 'text-lg',   px: 48 },
};

// ─── Props ───────────────────────────────────────────────────────────────────

export interface SiswaIdentityCellProps {
  /** Path foto dari DB (Siswa.foto) atau URL lengkap */
  foto?: string | null;
  /** nama_siswa */
  nama?: string | null;
  /** NIS siswa */
  nis?: string | null;
  /** Nama kelas */
  kelas?: string | null;
  /** Nama jurusan (opsional) */
  jurusan?: string | null;
  /** Label tahun pelajaran, misal "2024/2025 (Ganjil)" */
  tahunPelajaran?: string | null;
  /** Ukuran avatar */
  size?: AvatarSize;
  /** Tampilkan info sekunder (NIS, kelas, TP) */
  showMeta?: boolean;
  /** Override className wrapper */
  className?: string;
  /** Override className nama */
  nameClassName?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Komponen shared untuk menampilkan identitas siswa (foto + nama + info sekunder).
 * Digunakan lintas modul: PKL, Presensi, Nilai, Absensi, dll.
 *
 * Fallback hierarchy:
 *   1. Foto profil via resolveProfilePhotoUrl
 *   2. onError → ui-avatars.com (generate inisial otomatis)
 *   3. Jika tidak ada foto sama sekali → div inisial huruf pertama nama (warna indigo)
 */
export const SiswaIdentityCell: React.FC<SiswaIdentityCellProps> = React.memo(({
  foto,
  nama,
  nis,
  kelas,
  jurusan,
  tahunPelajaran,
  size = 'sm',
  showMeta = true,
  className,
  nameClassName,
}) => {
  const { avatar: avatarCls, initial: initialCls, px } = SIZE_MAP[size];

  const namaDisplay = nama || '—';
  const inisial = nama?.trim().charAt(0).toUpperCase() ?? '?';

  // Fallback src untuk onError (ui-avatars.com menghasilkan avatar inisial)
  const fallbackSrc = `https://ui-avatars.com/api/?name=${encodeURIComponent(namaDisplay)}&background=6366f1&color=fff&size=128`;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* ── Avatar ── */}
      {foto ? (
        <img
          src={resolveProfilePhotoUrl(foto)}
          alt={namaDisplay}
          width={px}
          height={px}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = fallbackSrc;
          }}
          className={cn(
            avatarCls,
            'rounded-full object-cover shrink-0',
            'ring-1 ring-indigo-100 dark:ring-indigo-900/40',
            'bg-slate-100 dark:bg-slate-800',
          )}
        />
      ) : (
        <div
          className={cn(
            avatarCls,
            'rounded-full shrink-0 flex items-center justify-center',
            'bg-indigo-100 dark:bg-indigo-950/40',
            'text-indigo-600 dark:text-indigo-400 font-bold',
            initialCls,
          )}
        >
          {nama ? inisial : <User size={14} />}
        </div>
      )}

      {/* ── Text info ── */}
      <div className="min-w-0">
        <p
          className={cn(
            'font-semibold text-slate-900 dark:text-slate-100 truncate',
            nameClassName,
          )}
        >
          {namaDisplay}
        </p>

        {showMeta && (nis || kelas || jurusan || tahunPelajaran) && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 mt-0.5">
            {nis && <span>NIS: {nis}</span>}

            {kelas && (
              <>
                {nis && <span>•</span>}
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  {kelas}
                </span>
              </>
            )}

            {jurusan && (
              <>
                {(nis || kelas) && <span>•</span>}
                <span className="text-slate-500 dark:text-slate-400 truncate">
                  {jurusan}
                </span>
              </>
            )}

            {tahunPelajaran && (
              <>
                {(nis || kelas || jurusan) && <span>•</span>}
                <span className="text-[10px] font-semibold text-indigo-650 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-100/50 dark:border-indigo-900/30 shrink-0">
                  TP {tahunPelajaran}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default SiswaIdentityCell;
