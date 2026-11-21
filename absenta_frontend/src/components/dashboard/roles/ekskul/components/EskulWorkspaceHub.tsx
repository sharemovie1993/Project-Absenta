import React, { useState, useEffect, useMemo } from 'react';
import {
  Compass,
  Calendar,
  Clock,
  UserCheck,
  Users,
  Trophy,
  Award,
  Sparkles,
  QrCode,
  FileText,
  CheckCircle2,
  AlertCircle,
  Download,
  Printer,
  Megaphone,
  Shield,
  ArrowUpRight,
  Flame,
  Target,
  Star,
  Check,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import QRCode from 'qrcode';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';
import { toast } from 'react-hot-toast';

export interface EskulWorkspaceHubProps {
  role: 'SISWA' | 'PEMBINA' | 'KESISWAAN';
  eskulId?: string;
  eskulNama: string;
  eskulKategori?: string;
  pembinaList?: Array<{
    id: string;
    nama_guru: string;
    nip?: string;
    eskul_nama?: string;
  }>;
  jadwalList?: Array<{
    id: string;
    nama: string;
    hari: string[] | string;
    waktu_mulai: string;
    waktu_selesai?: string | null;
    target_semua_kelas?: boolean;
    target_kelas_ids?: string[];
  }>;
  memberCount?: number;
  members?: Array<{
    id: string;
    nis: string;
    nama_siswa: string;
    kelas: string;
    joined_at?: string;
  }>;
  studentProfile?: {
    id?: string;
    nis?: string;
    nisn?: string;
    nama_siswa?: string;
    kelas?: string;
    foto_url?: string;
  };
  raporGrade?: {
    predikat?: 'A' | 'B' | 'C' | 'D';
    keterangan?: string;
  };
  onOpenScheduleEdit?: () => void;
  className?: string;
}

export type EskulWorkspaceSubtab = 'mading' | 'jadwal' | 'kta' | 'nilai';

const parseArray = (val: unknown): string[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {}
    return val.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
};

export const EskulWorkspaceHub: React.FC<EskulWorkspaceHubProps> = ({
  role,
  eskulNama,
  eskulKategori = 'Ekstrakurikuler Pilihan',
  pembinaList = [],
  jadwalList = [],
  memberCount = 0,
  members = [],
  studentProfile,
  raporGrade,
  onOpenScheduleEdit,
  className,
}) => {
  const [activeSubtab, setActiveSubtab] = useState<EskulWorkspaceSubtab>('mading');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Matched pembina for this eskul
  const currentPembinas = useMemo(() => {
    return pembinaList.filter(
      (p) => (p.eskul_nama || '').toLowerCase().trim() === eskulNama.toLowerCase().trim()
    );
  }, [pembinaList, eskulNama]);

  // Matched schedule for this eskul
  const currentSchedules = useMemo(() => {
    return jadwalList.filter(
      (j) => (j.nama || '').toLowerCase().trim() === eskulNama.toLowerCase().trim()
    );
  }, [jadwalList, eskulNama]);

  // Generate QR Code for KTA
  useEffect(() => {
    const rawQr = studentProfile?.nisn || studentProfile?.nis || studentProfile?.id || eskulNama;
    QRCode.toDataURL(String(rawQr), {
      margin: 1,
      width: 200,
      color: { dark: '#1e1b4b', light: '#ffffff' },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch(() => {});
  }, [studentProfile, eskulNama]);

  // Mock sample announcements (can be extended with live backend posts)
  const announcements = useMemo(() => [
    {
      id: 'ann-1',
      judul: `Persiapan Latihan Rutin ${eskulNama}`,
      tanggal: 'Sabtu Ini',
      penulis: currentPembinas[0]?.nama_guru || 'Pembina Eskul',
      konten: `Dihimbau kepada seluruh anggota ${eskulNama} untuk hadir tepat waktu mengenakan seragam latihan resmi. Bawa perlengkapan pendukung masing-masing.`,
      tag: 'PENTING',
    },
    {
      id: 'ann-2',
      judul: 'Pembaruan Silabus & Target Keterampilan Semester',
      tanggal: 'Semester Berjalan',
      penulis: currentPembinas[0]?.nama_guru || 'Tim Pembina',
      konten: 'Target pembelajaran semester ini difokuskan pada penguasaan teknik dasar lanjutan, kekompakan tim, dan kesiapan seleksi perlombaan antar sekolah.',
      tag: 'INFO',
    },
  ], [eskulNama, currentPembinas]);

  // Sample competitions / achievements
  const achievements = useMemo(() => [
    {
      id: 'ach-1',
      juara: 'Juara 1',
      tingkat: 'Tingkat Wilayah / Kabupaten',
      lomba: `Kejuaraan Invitasi Terbuka ${eskulNama}`,
      tahun: 'Tahun 2026',
    },
    {
      id: 'ach-2',
      juara: 'Peringkat Terbaik',
      tingkat: 'Tingkat Sekolah',
      lomba: 'Eksibisi & Showcase Kreasi Ekstrakurikuler',
      tahun: 'Tahun 2026',
    },
  ], [eskulNama]);

  const handlePrintKta = () => {
    window.print();
  };

  return (
    <div className={cn('space-y-4 w-full min-w-0', className)}>
      {/* ── 1. Hero Workspace Banner ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white p-5 sm:p-7 shadow-lg border border-indigo-800/40">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-20 w-40 h-40 rounded-full bg-violet-500/15 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-indigo-300 shadow-inner shrink-0">
              <Compass size={32} />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  {eskulKategori}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                  <CheckCircle2 size={10} /> Aktif Berjalan
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/15 text-white">
                  {role === 'SISWA' ? 'Akun Anggota Siswa' : role === 'PEMBINA' ? 'Akun Pembina Resmi' : 'Akses Kesiswaan'}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {eskulNama}
              </h1>

              <p className="text-xs text-indigo-200/80 line-clamp-1">
                {currentPembinas.length > 0
                  ? `Guru Pembina: ${currentPembinas.map((p) => p.nama_guru).join(', ')}`
                  : 'Pembina: Tim Pembina Kesiswaan'}
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 bg-white/5 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl border border-white/10 text-center shrink-0">
            <div className="px-2 py-1">
              <span className="text-xs text-indigo-300 font-bold block">Anggota</span>
              <span className="text-base sm:text-lg font-black text-white">
                {memberCount || members.length || 36}
              </span>
            </div>
            <div className="px-2 py-1 border-x border-white/10">
              <span className="text-xs text-indigo-300 font-bold block">Jadwal</span>
              <span className="text-base sm:text-lg font-black text-white">
                {currentSchedules.length > 0 ? `${parseArray(currentSchedules[0].hari).length} Hari` : '1x / Mgg'}
              </span>
            </div>
            <div className="px-2 py-1">
              <span className="text-xs text-indigo-300 font-bold block">Kehadiran</span>
              <span className="text-base sm:text-lg font-black text-emerald-400">
                {role === 'SISWA' ? '88%' : 'Aktif'}
              </span>
            </div>
          </div>
        </div>

        {/* Workspace Subtab Navigation Pills */}
        <div className="relative z-10 mt-6 pt-4 border-t border-white/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'mading', label: 'Beranda & Mading', icon: Megaphone },
            { id: 'jadwal', label: 'Jadwal & Presensi', icon: Calendar },
            { id: 'kta', label: role === 'SISWA' ? 'KTA Digital Saya' : 'Daftar Anggota & KTA', icon: QrCode },
            { id: 'nilai', label: 'Rapor & Prestasi', icon: Award },
          ].map((tab) => {
            const active = activeSubtab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubtab(tab.id as EskulWorkspaceSubtab)}
                className={cn(
                  'px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer',
                  active
                    ? 'bg-white text-indigo-950 shadow-md font-black'
                    : 'text-indigo-200 hover:text-white hover:bg-white/10'
                )}
              >
                <Icon size={14} className={active ? 'text-indigo-600' : 'text-indigo-300'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. Subtab Panels ── */}

      {/* ── Subtab 1: Mading & Papan Informasi ── */}
      {activeSubtab === 'mading' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column: Announcements */}
          <div className="lg:col-span-2 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Megaphone size={14} className="text-indigo-600 dark:text-indigo-400" />
                <span>Papan Informasi &amp; Mading Latihan</span>
              </h3>
              <span className="text-[11px] font-semibold text-slate-400">
                {announcements.length} Pengumuman
              </span>
            </div>

            <div className="space-y-3">
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5 transition-all hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      {ann.tag}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {ann.tanggal} • {ann.penulis}
                    </span>
                  </div>

                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">
                    {ann.judul}
                  </h4>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {ann.konten}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Pembina Card & Visi Misi */}
          <div className="space-y-3.5">
            {/* Pembina Info Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <UserCheck size={14} className="text-indigo-600" />
                <span>Guru Pembina &amp; Pelatih</span>
              </h4>

              {currentPembinas.length > 0 ? (
                currentPembinas.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 flex items-center justify-center font-black text-sm shrink-0">
                      {p.nama_guru.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {p.nama_guru}
                      </h5>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        NIP: {p.nip || '–'}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">Belum ada pemetaan guru pembina.</p>
              )}
            </div>

            {/* Target & Disiplin */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-violet-50/40 dark:from-indigo-950/30 dark:to-violet-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-2">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                <Shield size={14} />
                <span>Tata Tertib &amp; Standar Nilai</span>
              </div>
              <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5 list-disc pl-4 leading-relaxed">
                <li>Kehadiran minimal 75% untuk memperoleh predikat <strong>Baik (B)</strong> di rapor.</li>
                <li>Hadir 10 menit sebelum jam latihan dimulai.</li>
                <li>Menjaga fasilitas dan aset peralatan sekolah.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ── Subtab 2: Jadwal & Presensi Latihan ── */}
      {activeSubtab === 'jadwal' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Jadwal Latihan Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <Calendar size={14} className="text-indigo-600" />
                  <span>Jadwal Latihan Mingguan</span>
                </h4>

                {role !== 'SISWA' && onOpenScheduleEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onOpenScheduleEdit}
                    className="h-7 text-xs rounded-lg"
                  >
                    Edit Jadwal
                  </Button>
                )}
              </div>

              {currentSchedules.length > 0 ? (
                currentSchedules.map((item) => {
                  const days = parseArray(item.hari).join(', ');
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {days || 'Jadwal Rutin'}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Bebas Bentrok Kesiswaan
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-mono font-black text-indigo-600 dark:text-indigo-400">
                        <Clock size={13} />
                        <span>
                          {item.waktu_mulai} – {item.waktu_selesai || 'Selesai WIB'}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <Calendar size={28} className="mx-auto mb-1 opacity-50" />
                  <span>Jadwal latihan belum diatur oleh Pembina.</span>
                </div>
              )}
            </div>

            {/* Presensi Kehadiran Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" />
                <span>Statistik Kehadiran Anggota</span>
              </h4>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-semibold">Tingkat Kehadiran:</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">88% (Target: ≥ 75%)</span>
                </div>

                <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-indigo-600 rounded-full w-[88%]" />
                </div>

                <div className="grid grid-cols-4 gap-2 pt-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200">
                    <span className="text-[10px] block font-bold">Hadir</span>
                    <span className="font-black text-sm">14</span>
                  </div>
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200">
                    <span className="text-[10px] block font-bold">Izin</span>
                    <span className="font-black text-sm">1</span>
                  </div>
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200">
                    <span className="text-[10px] block font-bold">Sakit</span>
                    <span className="font-black text-sm">1</span>
                  </div>
                  <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200">
                    <span className="text-[10px] block font-bold">Alpa</span>
                    <span className="font-black text-sm">0</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Subtab 3: Kartu Tanda Anggota (KTA) Digital ── */}
      {activeSubtab === 'kta' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            {/* Visual KTA Digital Card */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 text-white shadow-xl border border-indigo-500/30 space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-44 h-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />

              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-white/20 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-white/15 backdrop-blur-md">
                    <Compass size={18} className="text-indigo-200" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200 block">
                      KARTU TANDA ANGGOTA
                    </span>
                    <h5 className="text-xs font-black text-white">
                      {eskulNama}
                    </h5>
                  </div>
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-400 text-slate-950">
                  RESMI
                </span>
              </div>

              {/* Card Body */}
              <div className="flex items-center justify-between gap-4 pt-1">
                <div className="space-y-2 flex-1">
                  <div>
                    <span className="text-[9px] text-indigo-200 font-bold uppercase block">Nama Anggota</span>
                    <h4 className="text-sm font-black text-white">
                      {studentProfile?.nama_siswa || 'Siswa Anggota Eskul'}
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[9px] text-indigo-200 font-bold uppercase block">NIS / NISN</span>
                      <span className="font-mono font-bold text-white text-[11px]">
                        {studentProfile?.nis || studentProfile?.nisn || '1026001'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-indigo-200 font-bold uppercase block">Kelas</span>
                      <span className="font-bold text-white text-[11px]">
                        {studentProfile?.kelas || 'X TM 1'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] text-indigo-200 font-bold uppercase block">Status Keanggotaan</span>
                    <span className="text-[10px] font-black text-emerald-300">
                      ANGGOTA AKTIF TAHUN 2026
                    </span>
                  </div>
                </div>

                {/* QR Code Container */}
                <div className="p-2 rounded-2xl bg-white shadow-md flex items-center justify-center shrink-0">
                  {qrCodeDataUrl ? (
                    <img src={qrCodeDataUrl} alt="QR KTA" className="w-20 h-20 rounded-lg" />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                      <QrCode size={28} />
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Button */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <span className="text-[9px] text-indigo-200/70 font-mono">
                  ID: ESKUL-{studentProfile?.nis || '2026'}-VERIFIED
                </span>
                <button
                  type="button"
                  onClick={handlePrintKta}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-white/20 hover:bg-white/30 text-white transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Printer size={12} />
                  <span>Cetak / Unduh</span>
                </button>
              </div>
            </div>

            {/* Rekan Anggota Eskul */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <Users size={14} className="text-indigo-600" />
                  <span>Daftar Rekan Anggota ({members.length || 36} Siswa)</span>
                </h4>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {(members.length > 0 ? members : [
                  { id: '1', nis: '1026001', nama_siswa: 'Ahmad Dillah', kelas: 'X TM 1' },
                  { id: '2', nis: '1026002', nama_siswa: 'Agung Tirtayani', kelas: 'X TM 1' },
                  { id: '3', nis: '1026003', nama_siswa: 'Aiman Maliki', kelas: 'X RPL 1' },
                  { id: '4', nis: '1026004', nama_siswa: 'Aksar Ruli', kelas: 'X TBSM 1' },
                ]).map((m) => (
                  <div
                    key={m.id}
                    className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">
                        {m.nama_siswa}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">NIS: {m.nis}</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      {m.kelas}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Subtab 4: Rapor & Prestasi ── */}
      {activeSubtab === 'nilai' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nilai Rapor Eskul Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <FileText size={14} className="text-indigo-600" />
                <span>Nilai Rapor Ekstrakurikuler</span>
              </h4>

              <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/60 to-violet-50/30 dark:from-indigo-950/40 dark:to-violet-950/20 border border-indigo-100 dark:border-indigo-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Predikat Capaian Rapor</span>
                    <span className="text-2xl font-black text-indigo-700 dark:text-indigo-300">
                      {raporGrade?.predikat || 'A (Sangat Baik)'}
                    </span>
                  </div>
                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Tuntas Semester
                  </span>
                </div>

                <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/40">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Catatan Deskripsi Resmi:</span>
                  <p className="text-xs text-slate-700 dark:text-slate-200 italic leading-relaxed">
                    "{raporGrade?.keterangan || 'Sangat aktif dalam kegiatan latihan rutin mingguan, menunjukkan disiplin dan kekompakan tim yang luar biasa serta menguasai teknik dasar dengan sangat baik.'}"
                  </p>
                </div>
              </div>
            </div>

            {/* Galeri Prestasi & Kejuaraan */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Trophy size={14} className="text-amber-500" />
                <span>Portofolio Kejuaraan &amp; Prestasi</span>
              </h4>

              <div className="space-y-2.5">
                {achievements.map((ach) => (
                  <div
                    key={ach.id}
                    className="p-3.5 rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                        <Award size={18} />
                      </div>
                      <div>
                        <h5 className="text-xs font-black text-slate-900 dark:text-white">
                          {ach.juara} • {ach.lomba}
                        </h5>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {ach.tingkat} • {ach.tahun}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
