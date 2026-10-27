import React, { useMemo } from 'react';
import {
  Building2,
  Calendar,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Phone,
  UserCheck,
  FileText,
  Briefcase,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AbsensiPklView } from '@/components/hubin/absensi/AbsensiPklView';

export interface SiswaPklTabProps {
  myPenempatan: any;
  isAktifPkl: boolean;
  todayPklAbsensi: any;
  pklHadir: number;
  pklSisaHari: number | null;
  pendingJurnals: any[];
  pendingJurnalCount: number;
  studentName?: string;
  className?: string;
  onRefreshData?: () => void;
}

export const SiswaPklTab: React.FC<SiswaPklTabProps> = React.memo(({
  myPenempatan,
  isAktifPkl,
  todayPklAbsensi,
  pklHadir,
  pklSisaHari,
  pendingJurnals,
  pendingJurnalCount,
  studentName,
  className,
  onRefreshData,
}) => {
  const mitra = myPenempatan?.Mitra || {};
  const pembimbing = myPenempatan?.Pembimbing || {};

  const tglMulaiFormatted = useMemo(() => {
    if (!myPenempatan?.tanggal_mulai) return '-';
    try {
      return new Date(myPenempatan.tanggal_mulai).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return myPenempatan.tanggal_mulai;
    }
  }, [myPenempatan?.tanggal_mulai]);

  const tglSelesaiFormatted = useMemo(() => {
    if (!myPenempatan?.tanggal_selesai) return '-';
    try {
      return new Date(myPenempatan.tanggal_selesai).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return myPenempatan.tanggal_selesai;
    }
  }, [myPenempatan?.tanggal_selesai]);

  if (!myPenempatan) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-xs">
        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/50 rounded-2xl flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
          <Briefcase size={32} />
        </div>
        <div className="space-y-1.5 max-w-md mx-auto">
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
            Belum Terdaftar Penempatan PKL
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Akun Anda belum memiliki data penempatan Praktik Kerja Lapangan (PKL) yang aktif di sistem. Silakan hubungi Koordinator Hubin atau Guru Pembimbing untuk proses plotting DU/DI.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 w-full max-w-full min-w-0">
      {/* 1. HERO INDUSTRY & MENTOR PROFILE BANNER */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-indigo-500/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Left: DU/DI Profile */}
          <div className="space-y-3 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant={isAktifPkl ? 'success' : 'secondary'}
                className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5"
              >
                {isAktifPkl ? 'PKL Sedang Berjalan' : 'Selesai'}
              </Badge>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-semibold text-slate-300">
                {className ? `Kelas ${className}` : 'Siswa Magang'}
              </span>
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2 flex-wrap">
                <Building2 size={22} className="text-indigo-400 shrink-0" />
                <span>{mitra.nama || 'Mitra Industri DU/DI'}</span>
              </h2>
              {mitra.alamat && (
                <p className="text-xs text-slate-400 mt-1 flex items-start gap-1.5 line-clamp-2">
                  <MapPin size={13} className="shrink-0 mt-0.5 text-slate-500" />
                  <span>{mitra.alamat}</span>
                </p>
              )}
            </div>

            <div className="flex items-center gap-4 flex-wrap text-xs text-slate-300 pt-1 border-t border-slate-800">
              <span className="flex items-center gap-1.5">
                <Calendar size={13} className="text-indigo-400" />
                <span>Periode: <strong>{tglMulaiFormatted}</strong> s/d <strong>{tglSelesaiFormatted}</strong></span>
              </span>
              {mitra.pic_nama && (
                <span className="flex items-center gap-1.5">
                  <UserCheck size={13} className="text-emerald-400" />
                  <span>Mentor DU/DI: <strong>{mitra.pic_nama}</strong></span>
                </span>
              )}
            </div>
          </div>

          {/* Right: Pembimbing Card */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs min-w-[220px] sm:max-w-xs space-y-2 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 block">
              Guru Pembimbing Sekolah
            </span>
            <div className="text-xs">
              <p className="font-black text-white text-sm truncate">
                {pembimbing.nama_guru || 'Belum Ditentukan'}
              </p>
              {pembimbing.nip && (
                <p className="text-[11px] text-slate-400 font-mono">NIP: {pembimbing.nip}</p>
              )}
            </div>
            {pembimbing.no_hp && (
              <a
                href={`https://wa.me/${pembimbing.no_hp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-xs"
              >
                <Phone size={12} />
                <span>Chat Pembimbing (WA)</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* 2. HIGH-DENSITY MINI METRICS STRIP */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Total Kehadiran</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
            {pklHadir} <span className="text-xs font-semibold text-slate-400">Hari</span>
          </p>
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block">
            Tercatat di sistem
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Sisa Waktu PKL</span>
            <Clock size={16} className="text-blue-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
            {pklSisaHari !== null ? pklSisaHari : '-'}{' '}
            <span className="text-xs font-semibold text-slate-400">Hari</span>
          </p>
          <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 block">
            Hingga selesai magang
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Jurnal Perlu Diisi</span>
            <AlertTriangle
              size={16}
              className={pendingJurnalCount > 0 ? 'text-amber-500' : 'text-emerald-500'}
            />
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
            {pendingJurnalCount}{' '}
            <span className="text-xs font-semibold text-slate-400">Hari</span>
          </p>
          <span
            className={`text-[11px] font-semibold block ${
              pendingJurnalCount > 0
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {pendingJurnalCount > 0 ? 'Wajib segera dilengkapi!' : 'Semua jurnal lengkap ✓'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Status Hari Ini</span>
            <ShieldCheck size={16} className="text-indigo-500" />
          </div>
          <p className="text-sm sm:text-base font-black truncate text-slate-900 dark:text-white mt-1">
            {todayPklAbsensi?.status ||
              (todayPklAbsensi?.jam_masuk
                ? todayPklAbsensi.jam_pulang
                  ? 'SELESAI KERJA'
                  : 'SEDANG BEKERJA'
                : 'BELUM ABSEN')}
          </p>
          <span className="text-[11px] font-semibold text-slate-400 block truncate">
            {todayPklAbsensi?.jam_masuk
              ? `Masuk: ${todayPklAbsensi.jam_masuk.substring(0, 5)}`
              : 'Silakan tap check-in'}
          </span>
        </div>
      </div>

      {/* 3. PENDING JOURNAL REMINDER ACTION CARD */}
      {pendingJurnalCount > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 shadow-xs space-y-2.5">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs sm:text-sm">
            <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Perhatian: Ada {pendingJurnalCount} hari presensi yang belum Anda lengkapi laporan kegiatannya!</span>
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-400/90 leading-relaxed">
            Guru Pembimbing memerlukan jurnal harian untuk memvalidasi nilai magang dan sertifikat kompetensi Anda.
          </p>
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {pendingJurnals.slice(0, 5).map((item: any) => (
              <span
                key={item.id}
                className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-[11px] font-mono font-bold text-amber-900 dark:text-amber-200"
              >
                {item.tanggal ? item.tanggal.substring(0, 10) : 'Hari Ini'}
              </span>
            ))}
            {pendingJurnals.length > 5 && (
              <span className="text-xs text-amber-600 font-bold">
                +{pendingJurnals.length - 5} hari lainnya
              </span>
            )}
          </div>
        </div>
      )}

      {/* 4. PUSAT PRESENSI & JURNAL TERPADU (CORE HUBIN VIEW) */}
      <div className="pt-1">
        <AbsensiPklView
          hideLayout={true}
          isModal={false}
          onClose={onRefreshData}
        />
      </div>
    </div>
  );
});
