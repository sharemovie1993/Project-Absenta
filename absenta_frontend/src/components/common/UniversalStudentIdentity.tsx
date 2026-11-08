import React, { useState } from 'react';
import { useStudentIdentity } from '@/hooks/useAcademicIdentity';
import type { StudentIdentity } from '@/utils/academic/academicIdentityNormalizer';
import { cn } from '@/lib/utils';
import {
  GraduationCap,
  Calendar,
  MapPin,
  Users,
  Phone,
  ShieldCheck,
  User,
} from 'lucide-react';

export type StudentIdentityVariant =
  | 'chip'
  | 'card'
  | 'detail'
  | 'print_kv'
  | 'print_table';

export interface UniversalStudentIdentityProps {
  id?: string | null;
  data?: any;
  identityOverride?: Partial<StudentIdentity>;
  mode?: 'screen' | 'print';
  variant?: StudentIdentityVariant;
  className?: string;
  subtitle?: string;
  showPhoto?: boolean;
  photoSizeMm?: { width: number; height: number }; // default 3x4: 28x36 mm
  fields?: Array<
    | 'nama'
    | 'ttl'
    | 'nis'
    | 'nisn'
    | 'nis_nisn'
    | 'nik'
    | 'kelas'
    | 'program_keahlian'
    | 'konsentrasi_keahlian'
    | 'bidang_keahlian'
    | 'sekolah_asal'
    | 'orang_tua'
    | 'alamat'
  >;
}

export const UniversalStudentIdentity: React.FC<UniversalStudentIdentityProps> = React.memo(({
  id,
  data,
  identityOverride,
  mode = 'screen',
  variant = 'card',
  className,
  subtitle,
  showPhoto = true,
  photoSizeMm = { width: 28, height: 36 },
  fields,
}) => {
  const { identity: baseIdentity, isLoading } = useStudentIdentity({
    id,
    initialData: data,
  });

  const identity: StudentIdentity = React.useMemo(() => {
    return {
      ...baseIdentity,
      ...(identityOverride || {}),
    };
  }, [baseIdentity, identityOverride]);

  const [imageError, setImageError] = useState(false);

  // ─── SUBSISTEM FOTO PROFIL (DUAL-MODE) ─────────────────────────
  const renderPhoto = () => {
    if (!showPhoto) return null;

    if (mode === 'print') {
      const hasRealPhoto = identity.hasFoto && !imageError;
      return (
        <div
          style={{
            width: `${photoSizeMm.width}mm`,
            height: `${photoSizeMm.height}mm`,
          }}
          className="border-[1.5px] border-black bg-white flex flex-col items-center justify-center text-center text-black shrink-0 overflow-hidden select-none"
        >
          {hasRealPhoto ? (
            <img
              src={identity.fotoUrl!}
              alt={identity.nama}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-1 leading-tight text-black">
              <span className="text-[9pt] font-normal">Pas Foto</span>
              <span className="text-[9pt] font-normal">3 × 4</span>
            </div>
          )}
        </div>
      );
    }

    // Mode Screen (Web App)
    const hasRealPhoto = identity.hasFoto && !imageError;
    return (
      <div className="relative shrink-0">
        <div className="w-12 h-12 rounded-2xl overflow-hidden ring-2 ring-indigo-500/20 bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-sm">
          {hasRealPhoto ? (
            <img
              src={identity.fotoUrl!}
              alt={identity.nama}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-bold text-sm select-none">
              {identity.initials}
            </div>
          )}
        </div>
        <div
          className={cn(
            'absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[8px] font-bold',
            identity.jenisKelamin === 'P'
              ? 'bg-rose-500 text-white'
              : 'bg-blue-500 text-white'
          )}
          title={identity.jenisKelaminLabel}
        >
          {identity.jenisKelamin}
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
  // MODE PRINT 1: PRINT_KV (Format Paragraf Piagam & Sertifikat PKL)
  // ═════════════════════════════════════════════════════════════
  if (mode === 'print' && variant === 'print_kv') {
    const defaultFields = [
      'nama',
      'ttl',
      'nis_nisn',
      'program_keahlian',
      'konsentrasi_keahlian',
      'sekolah_asal',
    ];
    const activeFields = fields || defaultFields;

    return (
      <div className={cn('w-full text-[9.5pt] leading-relaxed text-black font-sans', className)}>
        <table className="table-fixed border-collapse">
          <tbody>
            {activeFields.includes('nama') && (
              <tr>
                <td className="w-[45mm] py-0.5">Nama</td>
                <td className="w-[4mm] py-0.5 text-center">:</td>
                <td className="py-0.5 font-bold uppercase">{identity.nama}</td>
              </tr>
            )}
            {activeFields.includes('ttl') && (
              <tr>
                <td className="py-0.5">Tempat, Tanggal Lahir</td>
                <td className="py-0.5 text-center">:</td>
                <td className="py-0.5">{identity.ttlFormatted}</td>
              </tr>
            )}
            {activeFields.includes('nis_nisn') && (
              <tr>
                <td className="py-0.5">Nomor Induk Siswa/NISN</td>
                <td className="py-0.5 text-center">:</td>
                <td className="py-0.5">{identity.nis || '-'} / {identity.nisn || '-'}</td>
              </tr>
            )}
            {activeFields.includes('nis') && !activeFields.includes('nis_nisn') && (
              <tr>
                <td className="py-0.5">Nomor Induk Siswa</td>
                <td className="py-0.5 text-center">:</td>
                <td className="py-0.5">{identity.nis || '-'}</td>
              </tr>
            )}
            {activeFields.includes('program_keahlian') && (
              <tr>
                <td className="py-0.5">Program Keahlian</td>
                <td className="py-0.5 text-center">:</td>
                <td className="py-0.5">{identity.programKeahlian}</td>
              </tr>
            )}
            {activeFields.includes('konsentrasi_keahlian') && (
              <tr>
                <td className="py-0.5">Konsentrasi Keahlian</td>
                <td className="py-0.5 text-center">:</td>
                <td className="py-0.5">{identity.jurusanNama}</td>
              </tr>
            )}
            {activeFields.includes('kelas') && (
              <tr>
                <td className="py-0.5">Kelas / Tingkat</td>
                <td className="py-0.5 text-center">:</td>
                <td className="py-0.5">{identity.namaKelas} (Fase {identity.fase})</td>
              </tr>
            )}
            {activeFields.includes('sekolah_asal') && (
              <tr>
                <td className="py-0.5">Sekolah Asal</td>
                <td className="py-0.5 text-center">:</td>
                <td className="py-0.5 font-bold uppercase">{identity.sekolahAsal || '-'}</td>
              </tr>
            )}
            {activeFields.includes('orang_tua') && (
              <tr>
                <td className="py-0.5">Nama Orang Tua / Wali</td>
                <td className="py-0.5 text-center">:</td>
                <td className="py-0.5">{identity.namaOrtuFormal}</td>
              </tr>
            )}
            {activeFields.includes('alamat') && (
              <tr>
                <td className="py-0.5">Alamat Siswa</td>
                <td className="py-0.5 text-center">:</td>
                <td className="py-0.5">{identity.alamatLengkap}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════
  // MODE PRINT 2: PRINT_TABLE (Format Tabel Buku Induk & Cover Rapor)
  // ═════════════════════════════════════════════════════════════
  if (mode === 'print' && variant === 'print_table') {
    return (
      <div className={cn('w-full text-black font-sans text-[9pt]', className)}>
        <table className="w-full border-collapse border border-black text-left">
          <tbody>
            <tr className="border-b border-black">
              <td className="w-[35%] p-1.5 font-bold bg-slate-100 border-r border-black">Nama Lengkap Siswa</td>
              <td className="p-1.5 font-bold uppercase">{identity.nama}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-1.5 font-medium bg-slate-100 border-r border-black">Nomor Induk Siswa (NIS / NISN)</td>
              <td className="p-1.5">{identity.nis} / {identity.nisn}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-1.5 font-medium bg-slate-100 border-r border-black">Tempat, Tanggal Lahir</td>
              <td className="p-1.5">{identity.ttlFormatted}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-1.5 font-medium bg-slate-100 border-r border-black">Jenis Kelamin / Agama</td>
              <td className="p-1.5">{identity.jenisKelaminLabel} / {identity.agama}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-1.5 font-medium bg-slate-100 border-r border-black">Kelas / Konsentrasi Keahlian</td>
              <td className="p-1.5">{identity.namaKelas} • {identity.jurusanNama}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-1.5 font-medium bg-slate-100 border-r border-black">Nama Orang Tua (Ayah / Ibu)</td>
              <td className="p-1.5">{identity.namaAyah} / {identity.namaIbu}</td>
            </tr>
            <tr>
              <td className="p-1.5 font-medium bg-slate-100 border-r border-black">Alamat Lengkap</td>
              <td className="p-1.5">{identity.alamatLengkap}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════
  // MODE SCREEN 1: CHIP (Avatar Mini + Nama + Badge Ringkas)
  // ═════════════════════════════════════════════════════════════
  if (variant === 'chip') {
    return (
      <div className={cn('inline-flex items-center gap-2 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs', className)}>
        {renderPhoto()}
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
            {identity.nama}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
            {subtitle || `${identity.nis} • ${identity.namaKelas}`}
          </span>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════
  // MODE SCREEN 2: DETAIL (Tabulasi Lengkap Modal / Drawer)
  // ═════════════════════════════════════════════════════════════
  if (variant === 'detail') {
    return (
      <div className={cn('w-full flex flex-col gap-5 text-slate-900 dark:text-slate-100', className)}>
        {/* Header Hero */}
        <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-indigo-50/70 via-white to-purple-50/50 dark:from-indigo-950/20 dark:via-slate-900 dark:to-purple-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
          {renderPhoto()}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 tracking-tight">
                {identity.nama}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                {identity.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              NIS: {identity.nis} • NISN: {identity.nisn}
            </p>
            <div className="flex items-center gap-2 mt-2 text-xs font-medium text-slate-700 dark:text-slate-300">
              <span className="px-2 py-0.5 bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
                {identity.namaKelas}
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold truncate">
                {identity.jurusanNama}
              </span>
            </div>
          </div>
        </div>

        {/* Matriks 4 Kolom Informasi Lengkap */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* Data Pribadi */}
          <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <User size={14} className="text-indigo-500" />
              <span>Identitas Diri</span>
            </div>
            <div className="space-y-1 text-slate-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Tempat, Tgl Lahir:</span>
                <span className="font-medium text-right">{identity.ttlFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Jenis Kelamin:</span>
                <span className="font-medium">{identity.jenisKelaminLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Agama:</span>
                <span className="font-medium">{identity.agama}</span>
              </div>
            </div>
          </div>

          {/* Akademik */}
          <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <GraduationCap size={14} className="text-purple-500" />
              <span>Kurikulum & Jurusan</span>
            </div>
            <div className="space-y-1 text-slate-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Konsentrasi:</span>
                <span className="font-medium text-indigo-600 dark:text-indigo-400">{identity.jurusanNama}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Program Keahlian:</span>
                <span className="font-medium">{identity.programKeahlian}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tingkat / Fase:</span>
                <span className="font-medium">{identity.tingkatRomawi} (Fase {identity.fase})</span>
              </div>
            </div>
          </div>

          {/* Orang Tua */}
          <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <Users size={14} className="text-emerald-500" />
              <span>Keluarga & Orang Tua</span>
            </div>
            <div className="space-y-1 text-slate-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Nama Ayah:</span>
                <span className="font-medium">{identity.namaAyah}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Nama Ibu:</span>
                <span className="font-medium">{identity.namaIbu}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Kontak Ortu:</span>
                <span className="font-medium">{identity.kontakOrtu}</span>
              </div>
            </div>
          </div>

          {/* Alamat */}
          <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <MapPin size={14} className="text-amber-500" />
              <span>Domisili Siswa</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              {identity.alamatLengkap}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════
  // MODE SCREEN 3: CARD (Bento Card Ringkas Dashboard Walas/Kaprog)
  // ═════════════════════════════════════════════════════════════
  return (
    <div className={cn('p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs hover:shadow-md transition-all flex items-start gap-3.5', className)}>
      {renderPhoto()}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
            {identity.nama}
          </h4>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {identity.namaKelas}
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
          NIS: {identity.nis}{identity.jurusanNama && identity.jurusanNama !== '-' ? ` • ${identity.jurusanNama}` : ''}
        </p>
        <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1">
            <Calendar size={12} className="text-slate-400" />
            {identity.ttlFormatted}
          </span>
        </div>
      </div>
    </div>
  );
});

UniversalStudentIdentity.displayName = 'UniversalStudentIdentity';
