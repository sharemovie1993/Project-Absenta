import React, { useState } from 'react';
import { useTeacherIdentity } from '@/hooks/useAcademicIdentity';
import type { TeacherIdentity } from '@/utils/academic/academicIdentityNormalizer';
import { cn } from '@/lib/utils';
import {
  Briefcase,
  Award,
  Phone,
  MapPin,
  Calendar,
  UserCheck,
} from 'lucide-react';

export type TeacherIdentityVariant =
  | 'chip'
  | 'card'
  | 'detail'
  | 'print_table';

export interface UniversalTeacherIdentityProps {
  id?: string | null;
  data?: any;
  identityOverride?: Partial<TeacherIdentity>;
  mode?: 'screen' | 'print';
  variant?: TeacherIdentityVariant;
  className?: string;
  subtitle?: React.ReactNode;
  showPhoto?: boolean;
  nameSlot?: React.ReactNode;
  subtitleSlot?: React.ReactNode;
}

export const UniversalTeacherIdentity: React.FC<UniversalTeacherIdentityProps> = React.memo(({
  id,
  data,
  identityOverride,
  mode = 'screen',
  variant = 'card',
  className,
  subtitle,
  showPhoto = true,
  nameSlot,
  subtitleSlot,
}) => {
  const { identity: baseIdentity, isLoading } = useTeacherIdentity({
    id,
    initialData: data,
  });

  const identity: TeacherIdentity = React.useMemo(() => {
    return {
      ...baseIdentity,
      ...(identityOverride || {}),
    };
  }, [baseIdentity, identityOverride]);

  const [imageError, setImageError] = useState(false);

  // ─── SUBSISTEM FOTO PROFIL GURU ─────────────────────────────
  const renderPhoto = () => {
    if (!showPhoto) return null;

    if (mode === 'print') {
      const hasRealPhoto = identity.hasFoto && !imageError;
      return (
        <div className="w-[24mm] h-[32mm] border-[1.5px] border-black bg-white flex flex-col items-center justify-center text-center text-black shrink-0 overflow-hidden select-none">
          {hasRealPhoto ? (
            <img
              src={identity.fotoUrl!}
              alt={identity.nama}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-1 leading-tight text-black">
              <span className="text-[8pt] font-normal">Foto Guru</span>
            </div>
          )}
        </div>
      );
    }

    const hasRealPhoto = identity.hasFoto && !imageError;
    return (
      <div className="relative shrink-0">
        <div className="w-12 h-12 rounded-2xl overflow-hidden ring-2 ring-emerald-500/20 bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-sm">
          {hasRealPhoto ? (
            <img
              src={identity.fotoUrl!}
              alt={identity.nama}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-bold text-sm select-none">
              {identity.initials}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isLoading && mode === 'screen') {
    return (
      <div className={cn('animate-pulse flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl', className)}>
        <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
          <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════
  // MODE PRINT: PRINT_TABLE (SK Mengajar & Pembagian Tugas)
  // ═════════════════════════════════════════════════════════════
  if (mode === 'print') {
    return (
      <div className={cn('w-full text-black font-sans text-[9pt]', className)}>
        <table className="w-full border-collapse border border-black text-left">
          <tbody>
            <tr className="border-b border-black">
              <td className="w-[35%] p-1.5 font-bold bg-slate-100 border-r border-black">Nama Pendidik</td>
              <td className="p-1.5 font-bold">{identity.namaLengkapGelar}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-1.5 font-medium bg-slate-100 border-r border-black">NIP / NUPTK</td>
              <td className="p-1.5">{identity.nipClean || '-'} / {identity.nuptk || '-'}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-1.5 font-medium bg-slate-100 border-r border-black">Pangkat / Golongan</td>
              <td className="p-1.5">{identity.pangkatGolongan}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-1.5 font-medium bg-slate-100 border-r border-black">Jabatan / Jenis PTK</td>
              <td className="p-1.5">{identity.jabatan} • {identity.jenisPtk}</td>
            </tr>
            <tr>
              <td className="p-1.5 font-medium bg-slate-100 border-r border-black">Status Kepegawaian</td>
              <td className="p-1.5">{identity.statusKepegawaian}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════
  // MODE SCREEN 1: CHIP (Avatar Mini + Nama + NIP)
  // ═════════════════════════════════════════════════════════════
  if (variant === 'chip') {
    return (
      <div className={cn('inline-flex items-center gap-2 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs', className)}>
        {renderPhoto()}
        <div className="flex flex-col min-w-0">
          {nameSlot || (
            <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
              {identity.namaLengkapGelar}
            </span>
          )}
          {subtitleSlot || (
            <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
              {subtitle || `${identity.nipFormatted || identity.statusKepegawaian} • ${identity.jenisPtk}`}
            </span>
          )}
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════
  // MODE SCREEN 2: DETAIL (Drawer & Modal Profil Guru)
  // ═════════════════════════════════════════════════════════════
  if (variant === 'detail') {
    return (
      <div className={cn('w-full flex flex-col gap-4 text-slate-900 dark:text-slate-100', className)}>
        {/* Header Hero */}
        <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-emerald-50/70 via-white to-teal-50/50 dark:from-emerald-950/20 dark:via-slate-900 dark:to-teal-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
          {renderPhoto()}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 tracking-tight">
                {identity.namaLengkapGelar}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                {identity.statusKepegawaian}
              </span>
            </div>
            {identity.nipFormatted ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                {identity.nipFormatted}
              </p>
            ) : (
              <p className="text-xs text-slate-400 mt-0.5 italic">
                Non-PNS / Pegawai Kontrak
              </p>
            )}
            <div className="flex items-center gap-2 mt-2 text-xs font-medium text-slate-700 dark:text-slate-300">
              <span className="px-2 py-0.5 bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
                {identity.jabatan}
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold truncate">
                {identity.pangkatGolongan}
              </span>
            </div>
          </div>
        </div>

        {/* Matriks Info Kepegawaian */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <Briefcase size={14} className="text-emerald-500" />
              <span>Kepegawaian & NUPTK</span>
            </div>
            <div className="space-y-1 text-slate-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">NUPTK:</span>
                <span className="font-medium font-mono">{identity.nuptk || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Pendidikan:</span>
                <span className="font-medium">{identity.pendidikanTerakhir}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Jenis PTK:</span>
                <span className="font-medium">{identity.jenisPtk}</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <Phone size={14} className="text-teal-500" />
              <span>Kontak & Domisili</span>
            </div>
            <div className="space-y-1 text-slate-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Nomor Telepon:</span>
                <span className="font-medium">{identity.noHp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tempat, Tgl Lahir:</span>
                <span className="font-medium">{identity.ttlFormatted}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════
  // MODE SCREEN 3: CARD (Bento Card Profil Guru)
  // ═════════════════════════════════════════════════════════════
  return (
    <div className={cn('p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs hover:shadow-md transition-all flex items-start gap-3.5', className)}>
      {renderPhoto()}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
            {identity.namaLengkapGelar}
          </h4>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
            {identity.statusKepegawaian}
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {identity.nipFormatted || identity.jenisPtk} • {identity.pangkatGolongan}
        </p>
        <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1">
            <Award size={12} className="text-slate-400" />
            {identity.jabatan}
          </span>
        </div>
      </div>
    </div>
  );
});

UniversalTeacherIdentity.displayName = 'UniversalTeacherIdentity';
