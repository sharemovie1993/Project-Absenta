import React, { useState, Suspense, lazy } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DoorOpen, 
  Activity, 
  ClipboardList, 
  AlertCircle, 
  QrCode,
  Users,
  LogOut,
  RefreshCw,
  Scan,
  ShieldCheck,
  Shield,
  LogIn,
  CheckCircle2,
  AlertTriangle,
  Fingerprint,
  Camera,
  Check,
  Search,
  User,
  Clock,
  Building,
  Edit3,
  Key,
  MapPin,
  Award,
  Zap
} from 'lucide-react';
import { getGerbangDashboardStats } from '../../../api/dashboard.api';
import { Button } from '../../ui/Button';
import { cn } from '../../../lib/utils';
import { toast } from 'react-hot-toast';

const CatatPelanggaranModal = lazy(() => import('../../kesiswaan/modals/CatatPelanggaranModal').then(m => ({ default: m.CatatPelanggaranModal })));
const TindakMasalPelanggaranModal = lazy(() => import('../../kesiswaan/modals/TindakMasalPelanggaranModal').then(m => ({ default: m.TindakMasalPelanggaranModal })));

export const GerbangDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab State: scan | belum_absen | penindakan | profil_pos
  const activeTab = searchParams.get('tab') || 'scan';

  const handleTabChange = (newTab: string) => {
    setSearchParams({ tab: newTab });
  };

  const [catatModalOpen, setCatatModalOpen] = useState(false);
  const [tindakMasalModalOpen, setTindakMasalModalOpen] = useState(false);

  // Tap Simulation State
  const [nisnInput, setNisnInput] = useState('0058291824');
  const [scanResult, setScanResult] = useState<any>(null);
  const [isProcessingTap, setIsProcessingTap] = useState(false);

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['gerbang-stats'],
    queryFn: getGerbangDashboardStats,
    refetchInterval: 30000 
  });

  // Mock Students for Belum Absen
  const belumAbsenSiswaList = [
    { id: '1', nama: 'Daffa Rizky Saputra', nisn: '0058291828', kelas: 'XI RPL 1' },
    { id: '2', nama: 'Fajar Nugraha', nisn: '0058291830', kelas: 'XI RPL 2' },
    { id: '3', nama: 'Gita Gutawa', nisn: '0058291831', kelas: 'XI AKL 1' },
    { id: '4', nama: 'Hendra Setiawan', nisn: '0058291832', kelas: 'XII TKJ 1' },
    { id: '5', nama: 'Indah Permatasari', nisn: '0058291833', kelas: 'XII TKJ 2' },
    { id: '6', nama: 'Joko Widodo', nisn: '0058291834', kelas: 'X DKV 1' },
  ];

  const handleSimulateTap = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!nisnInput.trim()) {
      toast.error('Masukkan NISN atau No. RFID!');
      return;
    }

    setIsProcessingTap(true);
    setTimeout(() => {
      setIsProcessingTap(false);
      setScanResult({
        nama: 'Fahrizal Rahmat',
        nisn: nisnInput,
        kelas: 'XI RPL 1',
        jurusan: 'Rekayasa Perangkat Lunak',
        status: 'HADIR - TEPAT WAKTU',
        jam: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        foto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        gate: 'POS GERBANG UTAMA 1',
      });
      toast.success(`PRESENSI BERHASIL: Fahrizal Rahmat (XI RPL 1)`);
    }, 400);
  };

  const tabs = [
    { id: 'scan', label: 'Scan Gerbang', icon: Scan },
    { id: 'belum_absen', label: 'Belum Absen', icon: Users, badge: `${belumAbsenSiswaList.length} Siswa` },
    { id: 'penindakan', label: 'Penindakan', icon: AlertTriangle },
    { id: 'profil_pos', label: 'Profil Pos', icon: User },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* ────────────────────────────────────────────────────────────────── */}
      {/* 🛡️ TOP HERO CARD (Adopsi Layout Mockup Pos Satpam Gerbang)        */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="p-5 sm:p-7 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-4">
            {/* Red Shield Badge Icon */}
            <div className="w-12 h-12 rounded-2xl bg-rose-600/20 text-rose-500 border border-rose-500/30 flex items-center justify-center shrink-0 shadow-lg shadow-rose-950/50">
              <Shield size={26} />
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-rose-600/20 text-rose-400 border border-rose-500/40 uppercase">
                  POS KEAMANAN UTARA
                </span>
                <span className="text-xs font-semibold text-slate-500 font-mono">
                  /kesiswaan/pos-keamanan
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug truncate">
                {user?.full_name || user?.name || 'Pak Hendra'} — Petugas Pos Gerbang 1
              </h1>
            </div>
          </div>

          {/* Right Status Badge */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950/80 border border-slate-800 shrink-0 self-start md:self-auto">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono font-extrabold text-slate-300">
              RFID &amp; Kamera Terminal Ready
            </span>
          </div>
        </div>

        {/* ── INSET DARK TAB NAVIGATION BAR ───────────────────────────── */}
        <div className="p-1.5 rounded-2xl bg-slate-950/90 border border-slate-800/90 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const isTabActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap select-none",
                  isTabActive
                    ? "bg-slate-900 text-emerald-400 border border-emerald-500/40 shadow-md shadow-emerald-950/50"
                    : "text-slate-400 hover:text-white hover:bg-white/10"
                )}
              >
                <TabIcon size={15} className={isTabActive ? "text-emerald-400" : "text-slate-500"} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[9px] font-mono font-black border border-slate-700">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* TAB CONTENT AREA                                                   */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        
        {/* 🖥️ TAB 1: SCAN GERBANG (Adopsi Layout Mockup Satpam Gerbang) */}
        {activeTab === 'scan' && (
          <motion.div
            key="tab-scan"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6"
          >
            {/* Left Column: Terminal Scan RFID / Face Recognition */}
            <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Card Title & Camera Status Badge */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Camera size={18} className="text-rose-500" />
                    <h3 className="text-sm font-black text-white tracking-tight">
                      Terminal Scan RFID / Face Recognition
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase">
                    CAMERA 01 ONLINE
                  </span>
                </div>

                {/* Viewport Frame */}
                <div className="relative w-full h-64 sm:h-72 rounded-2xl bg-slate-950 border border-emerald-500/30 flex flex-col items-center justify-center text-center p-6 space-y-3 overflow-hidden group">
                  {/* Scanner Laser Reticle Animation */}
                  <div className="absolute inset-x-0 h-0.5 bg-emerald-400/80 shadow-[0_0_15px_#10b981] animate-pulse top-1/2 -translate-y-1/2 pointer-events-none" />

                  <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 shadow-inner">
                    <QrCode size={30} />
                  </div>
                  <div className="space-y-1 relative z-10">
                    <h4 className="text-xs font-mono font-extrabold text-slate-300 uppercase tracking-wider">
                      Arahkan Kartu RFID Siswa atau Wajah ke Kamera
                    </h4>
                    <p className="text-[10px] text-slate-500 font-medium">
                      Sensor RFID USB &amp; Kamera Web-RTC siap memproses tap
                    </p>
                  </div>
                </div>
              </div>

              {/* Simulation Tap Bar (Bottom) */}
              <form onSubmit={handleSimulateTap} className="pt-2 border-t border-slate-800 space-y-2">
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  Simulasi Tap Kartu RFID / Ketik NISN Siswa:
                </label>
                <div className="flex items-center gap-2.5">
                  <input
                    type="text"
                    value={nisnInput}
                    onChange={(e) => setNisnInput(e.target.value)}
                    placeholder="Masukkan NISN atau ID RFID..."
                    className="flex-1 h-10 px-4 rounded-2xl border border-slate-800 bg-slate-950 text-white font-mono text-xs font-bold focus:outline-none focus:border-rose-500 transition-all"
                  />
                  <Button
                    type="submit"
                    disabled={isProcessingTap}
                    className="h-10 px-5 rounded-2xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white border-none flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-900/40 shrink-0 uppercase tracking-wider"
                  >
                    <Zap size={14} />
                    <span>{isProcessingTap ? 'Memproses...' : 'TAP GERBANG'}</span>
                  </Button>
                </div>
              </form>
            </div>

            {/* Right Column: Hasil Verifikasi Presensi Gerbang */}
            <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl flex flex-col justify-between space-y-4">
              <div className="pb-2 border-b border-slate-800">
                <h3 className="text-sm font-black text-white tracking-tight">
                  Hasil Verifikasi Presensi Gerbang
                </h3>
              </div>

              {scanResult ? (
                /* Scanned Verification Card Result */
                <div className="p-5 rounded-2xl bg-slate-950 border border-emerald-500/40 space-y-5">
                  <div className="flex items-center gap-4">
                    <img
                      src={scanResult.foto}
                      alt={scanResult.nama}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500/50 shadow-md shrink-0"
                    />
                    <div className="space-y-0.5 min-w-0">
                      <span className="px-2.5 py-0.5 rounded-md text-[9px] font-mono font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase">
                        {scanResult.status}
                      </span>
                      <h4 className="text-lg font-black text-white tracking-tight">
                        {scanResult.nama}
                      </h4>
                      <p className="text-xs font-mono text-slate-400">
                        NISN: {scanResult.nisn} • {scanResult.kelas}
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800/80 text-xs font-mono space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">WAKTU TAP:</span>
                      <span className="font-bold text-white">{scanResult.jam}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">TERMINAL:</span>
                      <span className="font-bold text-emerald-400">{scanResult.gate}</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={() => setScanResult(null)}
                    className="w-full h-9 rounded-xl text-xs font-extrabold bg-slate-800 hover:bg-slate-700 text-white border-none cursor-pointer"
                  >
                    Reset Tampilan Verification
                  </Button>
                </div>
              ) : (
                /* Empty Verification State */
                <div className="py-16 flex flex-col items-center justify-center text-center space-y-3 bg-slate-950/60 rounded-2xl border border-dashed border-slate-800">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
                    <QrCode size={30} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Belum Ada Kartu Yang Di-Tap
                    </h4>
                    <p className="text-[11px] font-medium text-slate-500">
                      Gunakan tombol 'TAP GERBANG' di sebelah kiri untuk simulasi.
                    </p>
                  </div>
                </div>
              )}

              {/* Quick Audio & Speaker Indicator Footnote */}
              <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-500 pt-2 border-t border-slate-800">
                <span>GATE BEEP: ACTIVE</span>
                <span>DB SYNC: OK</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* 👥 TAB 2: BELUM ABSEN */}
        {activeTab === 'belum_absen' && (
          <motion.div
            key="tab-belum-absen"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="p-5 sm:p-7 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="space-y-0.5">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Daftar Siswa Belum Absen Masuk Gerbang ({belumAbsenSiswaList.length} Siswa)
                </h3>
                <p className="text-xs font-semibold text-slate-400">
                  Siswa yang belum terdeteksi melakukan tap-in di pos gerbang sekolah pagi ini.
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {belumAbsenSiswaList.map((siswa) => (
                <div
                  key={siswa.id}
                  className="p-3.5 px-4.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3"
                >
                  <div>
                    <h4 className="text-sm font-bold text-white">{siswa.nama}</h4>
                    <p className="text-[11px] font-mono text-slate-400">
                      NISN: {siswa.nisn} • {siswa.kelas}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => toast.success(`Mencatat Tap-in Manual untuk ${siswa.nama}...`)}
                    className="h-8.5 px-3.5 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white border-none cursor-pointer"
                  >
                    Tap-In Manual
                  </Button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ⚠️ TAB 3: PENINDAKAN */}
        {activeTab === 'penindakan' && (
          <motion.div
            key="tab-penindakan"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="p-5 sm:p-7 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                Penindakan &amp; Catat Pelanggaran Gerbang
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <AlertTriangle size={24} className="text-amber-400" />
                <h4 className="text-sm font-bold text-white">Catat Pelanggaran Siswa</h4>
                <p className="text-xs text-slate-400">Input catatan pelanggaran tata tertib di gerbang sekolah (Keterlambatan / Seragam).</p>
                <Button
                  onClick={() => setCatatModalOpen(true)}
                  className="w-full h-9 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white border-none cursor-pointer"
                >
                  Buka Form Pelanggaran
                </Button>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <CheckCircle2 size={24} className="text-emerald-400" />
                <h4 className="text-sm font-bold text-white">Tindak Masal Keterlambatan</h4>
                <p className="text-xs text-slate-400">Penindakan massal untuk kelompok siswa terlambat di gerbang sekolah.</p>
                <Button
                  onClick={() => setTindakMasalModalOpen(true)}
                  className="w-full h-9 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white border-none cursor-pointer"
                >
                  Buka Penindakan Masal
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* 👤 TAB 4: PROFIL POS (Adopsi 1:1 Presisi Layout Profil Guru / Profil Siswa) */}
        {activeTab === 'profil_pos' && (
          <motion.div
            key="tab-profil-pos"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-5 sm:space-y-6"
          >
            {/* 1. TOP ROW: 2 COLUMNS (Avatar Card & Account Settings Card) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
              
              {/* Left Column (Avatar & Quick Info Card) - 4 cols on lg */}
              <div className="lg:col-span-4 p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-xl flex flex-col justify-between space-y-5 text-center sm:text-left">
                <div className="space-y-4">
                  {/* Photo Avatar Frame */}
                  <div className="relative w-28 h-28 mx-auto rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 p-1 shadow-md flex items-center justify-center font-black text-3xl text-emerald-400">
                    {(user?.full_name || user?.name || 'Pak Hendra')
                      .split(' ')
                      .map((n: string) => n[0])
                      .filter(Boolean)
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
                    <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-2 border-slate-900 rounded-full flex items-center justify-center text-white shadow-sm">
                      <Check size={12} strokeWidth={4} />
                    </span>
                  </div>

                  {/* Teacher Name & Status Pill */}
                  <div className="text-center space-y-1">
                    <h3 className="text-lg font-black text-white tracking-tight">
                      {user?.full_name || user?.name || 'Pak Hendra'}
                    </h3>
                    <span className="inline-block px-3 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Petugas Jaga — Pos Gerbang Utara 1
                    </span>
                  </div>

                  {/* Quick Detail Key-Value List */}
                  <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-bold">NIP</span>
                      <span className="font-mono font-extrabold text-white">{(user?.guru_profile as any)?.nip || '196704000000000000'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-bold">NIK</span>
                      <span className="font-mono font-bold text-white">3273101508050002</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-bold">Tugas Fungsional</span>
                      <span className="font-bold text-white truncate max-w-[140px]">Petugas Presensi Gerbang</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-bold">Lokasi Pos</span>
                      <span className="font-bold text-emerald-400">POS UTARA 1</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Full-Width QR Card Digital Button */}
                <Button
                  type="button"
                  onClick={() => toast('Membuka QR Card Digital Petugas...', { icon: '💳' })}
                  className="w-full h-10 rounded-2xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white border-none flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  <QrCode size={16} />
                  <span>Lihat QR Card Digital</span>
                </Button>
              </div>

              {/* Right Column (Pengaturan Akun & Ganti Password Card) - 8 cols on lg */}
              <div className="lg:col-span-8 p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-xl space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Header Title with Edit Icon */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Edit3 size={16} className="text-emerald-400" />
                        <h3 className="text-sm font-black text-white tracking-tight">
                          Pengaturan Akun &amp; Ganti Password Petugas
                        </h3>
                      </div>
                      <p className="text-[11px] font-medium text-slate-400">
                        Perbarui kontak petugas pos gerbang atau ganti kata sandi portal
                      </p>
                    </div>
                  </div>

                  {/* Input Fields Grid */}
                  <form onSubmit={(e) => { e.preventDefault(); toast.success('Perubahan akun berhasil disimpan!'); }} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-300 block">
                          Nomor Telepon WhatsApp
                        </label>
                        <input
                          type="text"
                          defaultValue="6287779937341"
                          className="w-full h-10 px-3.5 rounded-xl border border-slate-800 bg-slate-950 font-mono text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-300 block">
                          Email Resmi
                        </label>
                        <input
                          type="email"
                          defaultValue={user?.email || 'hendra.satpam@absenta.sch.id'}
                          className="w-full h-10 px-3.5 rounded-xl border border-slate-800 bg-slate-950 font-mono text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-black text-white uppercase tracking-wider">
                        <Key size={14} className="text-amber-500" />
                        <span>GANTI KATA SANDI</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-300 block">
                            Password Lama
                          </label>
                          <input
                            type="password"
                            placeholder="********"
                            className="w-full h-10 px-3.5 rounded-xl border border-slate-800 bg-slate-950 text-xs font-medium text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-300 block">
                            Password Baru
                          </label>
                          <input
                            type="password"
                            placeholder="********"
                            className="w-full h-10 px-3.5 rounded-xl border border-slate-800 bg-slate-950 text-xs font-medium text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        type="submit"
                        className="h-10 px-6 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white border-none cursor-pointer shadow-md shadow-emerald-600/20"
                      >
                        Simpan Perubahan
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* 2. BOTTOM ROW: 4 GRID CARDS (DATA PRIBADI, JABATAN & TUGAS, KONTAK & ALAMAT, SERTIFIKASI & MASA KERJA) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              
              {/* Card 1: DATA PRIBADI */}
              <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-xl space-y-4 relative">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-emerald-400" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                      DATA PRIBADI PETUGAS
                    </h3>
                  </div>
                  <button type="button" onClick={() => toast('Edit data pribadi...', { icon: '✏️' })} className="text-slate-400 hover:text-emerald-400 cursor-pointer">
                    <Edit3 size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block">Jenis Kelamin</span>
                    <span className="font-bold text-white">Laki-laki</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block">Agama</span>
                    <span className="font-bold text-white">Islam</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block">Tempat Lahir</span>
                    <span className="font-bold text-white">Bandung</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block">Tanggal Lahir</span>
                    <span className="font-bold text-white">14 Mei 1982</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block">Email</span>
                    <span className="font-mono font-bold text-white truncate block">hendra.satpam@absenta.sch.id</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block">Pendidikan Terakhir</span>
                    <span className="font-bold text-white">SMA / GADA PRATAMA</span>
                  </div>
                </div>
              </div>

              {/* Card 2: JABATAN DAN TUGAS TAMBAHAN */}
              <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-xl space-y-4 relative">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-emerald-400" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                      JABATAN DAN POS UTAMA
                    </h3>
                  </div>
                  <button type="button" onClick={() => toast('Edit jabatan...', { icon: '✏️' })} className="text-slate-400 hover:text-emerald-400 cursor-pointer">
                    <Edit3 size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block">Status Kepegawaian</span>
                    <span className="font-bold text-white">Pegawai Tetap Yayasan / Sekolah</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block">Pos Tugas</span>
                    <span className="font-bold text-emerald-400">POS GERBANG UTARA 1</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block">Tugas Fungsional</span>
                    <span className="font-bold text-white">Petugas Absensi &amp; Keamanan</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block">Shift Utama</span>
                    <span className="font-extrabold text-emerald-400">PAGI (06.00 - 14.30 WIB)</span>
                  </div>
                </div>
              </div>

              {/* Card 3: KONTAK & ALAMAT */}
              <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-xl space-y-4 relative">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-emerald-400" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                      KONTAK &amp; ALAMAT
                    </h3>
                  </div>
                  <button type="button" onClick={() => toast('Edit kontak...', { icon: '✏️' })} className="text-slate-400 hover:text-emerald-400 cursor-pointer">
                    <Edit3 size={14} />
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block">Nomor Telepon</span>
                    <span className="font-mono font-bold text-white">6287779937341</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block">Alamat Rumah</span>
                    <span className="font-bold text-white">Jl. Gatot Subroto No. 123, Bandung</span>
                  </div>
                </div>
              </div>

              {/* Card 4: SERTIFIKASI & MASA KERJA */}
              <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-xl space-y-4 relative">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Award size={16} className="text-emerald-400" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                      SERTIFIKASI &amp; MASA KERJA
                    </h3>
                  </div>
                  <button type="button" onClick={() => toast('Edit sertifikasi...', { icon: '✏️' })} className="text-slate-400 hover:text-emerald-400 cursor-pointer">
                    <Edit3 size={14} />
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block">Sertifikasi Keamanan</span>
                    <span className="font-bold text-emerald-400">Gada Pratama (POLDA JABAR)</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block">Masa Kerja Pegawai</span>
                    <span className="font-bold text-white">8 Tahun 4 Bulan</span>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <Suspense fallback={null}>
        <CatatPelanggaranModal
          isOpen={catatModalOpen}
          onClose={() => setCatatModalOpen(false)}
        />
      </Suspense>

      <Suspense fallback={null}>
        <TindakMasalPelanggaranModal
          isOpen={tindakMasalModalOpen}
          onClose={() => setTindakMasalModalOpen(false)}
        />
      </Suspense>
    </div>
  );
};
