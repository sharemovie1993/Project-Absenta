import React, { useEffect, useMemo, useState } from 'react';
import { User } from 'lucide-react';
import { cn, resolveProfilePhotoUrl } from '@/lib/utils';

export interface PersonPhotoProps {
  /** Nama Guru / Siswa / Pengawas (untuk alt text & fallback inisial) */
  name?: string | null;
  /** URL / path relatif foto (otomatis di-resolve via resolveProfilePhotoUrl) */
  foto?: string | null;
  /** Bentuk tampilan: 'portrait' (kartu 2-kolom) atau 'circle' (avatar bulat) */
  variant?: 'portrait' | 'circle';
  /** Ukuran preset */
  size?: 'sm' | 'md' | 'lg';
  /** Badge kecil di bagian bawah foto (khusus variant 'portrait', misal 'Guru' / 'Pengawas') */
  badgeLabel?: string;
  /** Teks sekunder di sebelah kanan nama (jika showName=true) */
  subtitle?: string | null;
  /** Jika true, merender foto + nama berdampingan */
  showName?: boolean;
  className?: string;
  imgClassName?: string;
}

const CIRCLE_SIZE_MAP = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-11 h-11 text-sm',
  lg: 'w-14 h-14 text-base',
};

const PORTRAIT_SIZE_MAP = {
  sm: 'w-16 h-20 text-base rounded-xl',
  md: 'w-20 h-24 sm:w-24 sm:h-28 text-lg sm:text-xl rounded-2xl',
  lg: 'w-24 h-28 sm:w-28 sm:h-32 text-xl sm:text-2xl rounded-2xl',
};

function getInitials(name?: string | null): string {
  const clean = String(name || '').trim();
  if (!clean || clean === '-') return '';
  return clean
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
}

/**
 * Komponen standar reusable untuk menampilkan foto profil Guru, Siswa, maupun Pengawas
 * dengan resolusi URL otomatis (`resolveProfilePhotoUrl`) dan fallback inisial.
 */
export const PersonPhoto: React.FC<PersonPhotoProps> = React.memo(({
  name,
  foto,
  variant = 'circle',
  size = 'md',
  badgeLabel,
  subtitle,
  showName = false,
  className,
  imgClassName,
}) => {
  const [imgError, setImgError] = useState(false);

  const resolvedUrl = useMemo(() => (foto ? resolveProfilePhotoUrl(foto) : ''), [foto]);

  useEffect(() => {
    setImgError(false);
  }, [resolvedUrl]);

  const initials = useMemo(() => getInitials(name), [name]);
  const displayName = String(name || '').trim() || '-';

  const frameClass =
    variant === 'portrait'
      ? cn(
          'relative shrink-0 overflow-hidden border-2 border-indigo-100 dark:border-indigo-900/70 bg-gradient-to-br from-indigo-50 to-slate-100 dark:from-indigo-950/60 dark:to-slate-900 shadow-xs flex items-center justify-center',
          PORTRAIT_SIZE_MAP[size]
        )
      : cn(
          'relative shrink-0 rounded-full overflow-hidden border border-indigo-200 dark:border-indigo-700 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-black flex items-center justify-center',
          CIRCLE_SIZE_MAP[size]
        );

  const photoElement = (
    <div className={cn(frameClass, !showName && className)}>
      {resolvedUrl && !imgError ? (
        <img
          src={resolvedUrl}
          alt={displayName}
          onError={() => setImgError(true)}
          className={cn('w-full h-full object-cover object-top', imgClassName)}
        />
      ) : (
        <span className="font-black text-indigo-600 dark:text-indigo-300 select-none">
          {initials || <User size={variant === 'portrait' ? 22 : 14} />}
        </span>
      )}

      {variant === 'portrait' && badgeLabel && (
        <span className="absolute inset-x-0 bottom-0 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-center bg-slate-900/70 text-white backdrop-blur-2xs">
          {badgeLabel}
        </span>
      )}
    </div>
  );

  if (!showName) {
    return photoElement;
  }

  return (
    <div className={cn('flex items-center gap-2.5 min-w-0', className)}>
      {photoElement}
      <div className="min-w-0">
        <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
          {displayName}
        </p>
        {subtitle && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
});

PersonPhoto.displayName = 'PersonPhoto';
