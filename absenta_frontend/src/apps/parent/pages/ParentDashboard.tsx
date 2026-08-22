import React, { useEffect, useState, useMemo } from 'react';
import { useParentAuthStore } from '../../../store/parentAuthStore';
import { getStudentNotifications, getParentDashboard, reportStudentAbsence, type NotificationRecord } from '../../../api/parent.api';
import { getTimezone } from '../../../utils/attendance/time';
import { useParentSocket } from '../hooks/useParentSocket';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  ChevronRight, 
  LogOut, 
  Activity, 
  UserCheck, 
  Award, 
  FileText, 
  MessageCircle, 
  CheckCircle2,
  Calendar,
  User,
  LayoutList,
  AlertTriangle,
  Trophy,
  RefreshCw,
  QrCode,
  MapPin,
  Heart,
  Phone,
  ArrowRight,
  ShieldCheck,
  Clock,
  Send,
  X
} from 'lucide-react';
import ReportAbsenceModal from '../components/ReportAbsenceModal';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

export default function ParentDashboard() {
  const { data, setData, selectedStudentId, setSelectedStudentId, getSelectedStudent, logout } = useParentAuthStore();
  const { socket } = useParentSocket();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab State (?tab=ringkasan)
  const activeTab = searchParams.get('tab') || 'ringkasan';
  const handleTabChange = (newTab: string) => {
    setSearchParams({ tab: newTab });
  };

  const student = getSelectedStudent();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Form Perizinan 1-Tap State
  const [jenisIzin, setJenisIzin] = useState<'sakit' | 'izin'>('sakit');
  const [alasanIzin, setAlasanIzin] = useState('');
  const [isSubmittingIzin, setIsSubmittingIzin] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [leaveHistory, setLeaveHistory] = useState<any[]>([
    {
      id: 'rz1',
      jenis: 'Sakit',
      badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
      timestamp: '2026-08-10 06:15 WIB',
      alasan: 'Demam tinggi dan flu berat, saran dokter istirahat total 2 hari.',
      statusText: 'Disetujui / Terdaftar',
      statusColor: 'text-emerald-600 dark:text-emerald-400',
    },
  ]);

  const handleSendLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student?.siswa_id) {
      toast.error('Data anak belum teridentifikasi.');
      return;
    }
    if (!alasanIzin.trim()) {
      toast.error('Mohon isi alasan / keterangan perizinan.');
      return;
    }

    setIsSubmittingIzin(true);
    try {
      const statusPayload = jenisIzin === 'sakit' ? 'SAKIT' : 'IZIN';
      await reportStudentAbsence(student.siswa_id, {
        status: statusPayload,
        keterangan: alasanIzin,
        attachment: attachmentFile || undefined,
      });

      toast.success('Surat perizinan berhasil terkirim ke sistem & Wali Kelas!');

      const newRecord = {
        id: 'l-' + Date.now(),
        jenis: jenisIzin === 'sakit' ? 'Sakit' : 'Izin',
        badgeColor: jenisIzin === 'sakit'
          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
          : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB (Hari ini)',
        alasan: alasanIzin,
        statusText: 'Disetujui / Terdaftar',
        statusColor: 'text-emerald-600 dark:text-emerald-400',
      };
      setLeaveHistory(prev => [newRecord, ...prev]);

      setAlasanIzin('');
      setAttachmentFile(null);

      // Refresh dashboard info
      getParentDashboard().then(setData).catch(console.error);
    } catch (err: any) {
      console.error('Lapor absen error:', err);
      toast.error(err?.response?.data?.message || 'Gagal mengirim perizinan.');
    } finally {
      setIsSubmittingIzin(false);
    }
  };

  // 1. Refresh Dashboard Data (Background)
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const newData = await getParentDashboard();
      setData(newData);
      if (student?.siswa_id) {
        const notifRes = await getStudentNotifications(student.siswa_id, 1, 5);
        setNotifications(notifRes.data);
      }
      toast.success('Data presensi anak berhasil diperbarui!');
    } catch (err) {
      toast.error('Gagal memperbarui data.');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    getParentDashboard()
      .then(newData => setData(newData))
      .catch(console.error);
  }, [setData]);

  // 2. Real-time Socket Updates
  useEffect(() => {
    if (!socket || !student) return;

    const handleUpdate = (payload: any) => {
      if (payload?.data?.siswa_id === student.siswa_id) {
        getParentDashboard().then(setData).catch(console.error);
        getStudentNotifications(student.siswa_id, 1, 5)
          .then(res => setNotifications(res.data))
          .catch(console.error);
      }
    };

    const handleNotification = (payload: any) => {
      getStudentNotifications(student.siswa_id, 1, 5)
        .then(res => setNotifications(res.data))
        .catch(console.error);
    };

    socket.on('attendance_update', handleUpdate);
    socket.on('notification', handleNotification);
    
    return () => {
      socket.off('attendance_update', handleUpdate);
      socket.off('notification', handleNotification);
    };
  }, [socket, student?.siswa_id, setData]);

  // 3. Fetch Notifications
  useEffect(() => {
    if (!student) return;
    setLoadingNotifs(true);
    getStudentNotifications(student.siswa_id, 1, 5)
      .then(res => setNotifications(res.data))
      .catch(console.error)
      .finally(() => setLoadingNotifs(false));
  }, [student?.siswa_id]);

  if (!data || !student) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-500 space-y-3">
        <RefreshCw size={28} className="animate-spin text-emerald-600" />
        <p className="text-xs font-extrabold uppercase tracking-wider">Memuat Data Portal Orang Tua...</p>
      </div>
    );
  }

  const { status_kehadiran_hari_ini: today, ringkasan_kehadiran: summary } = student;

  const getFriendlyStatus = (status: string) => {
    switch (status) {
      case 'ALPA': return 'Tidak Hadir';
      case 'PULANG_CEPAT': return 'Pulang Lebih Awal';
      case 'HADIR': return 'Hadir';
      case 'SAKIT': return 'Sakit';
      case 'IZIN': return 'Izin';
      default: return today.label || status;
    }
  };

  const statusLabel = getFriendlyStatus(today.status);
  const isTerlambat = today.status === 'HADIR' && today.is_terlambat;

  const childInitials = useMemo(() => {
    const name = student.nama_siswa || 'Anak';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }, [student.nama_siswa]);

  const tabs = [
    { id: 'ringkasan', label: 'Feed', fullLabel: 'Ringkasan Feed', icon: Activity },
    { id: 'kehadiran', label: 'Presensi', fullLabel: 'Presensi Anak', icon: Calendar },
    { id: 'perizinan', label: 'Perizinan', fullLabel: 'Perizinan (1-Tap)', icon: FileText, badge: '2' },
    { id: 'catatan', label: 'Poin', fullLabel: 'Poin & Kasus', icon: ShieldCheck },
    { id: 'profil', label: 'Profil', fullLabel: 'Profil Ortu', icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 pb-24 lg:pb-8">
      {/* ────────────────────────────────────────────────────────────────── */}
      {/* TOP BAR / STUDENT SWITCHER                                         */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-8 py-3.5 sticky top-0 z-30 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
            <Heart size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              PORTAL ORANG TUA
            </p>
            {data.siswa.length > 1 ? (
              <div className="w-[180px] sm:w-[220px] mt-0.5">
                <SearchableSelect
                  value={selectedStudentId || ''}
                  onValueChange={(val) => setSelectedStudentId(val)}
                  options={data.siswa.map((s: any) => ({ label: s.nama_siswa, value: s.siswa_id }))}
                  placeholder="Pilih Anak"
                  searchPlaceholder="Cari nama anak..."
                  triggerClassName="w-full font-bold text-xs h-8"
                />
              </div>
            ) : (
              <h1 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                {student.nama_siswa}
              </h1>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw size={16} className={cn(isRefreshing && "animate-spin")} />
          </button>
          <button
            onClick={() => {
              logout();
              localStorage.removeItem('parent_access_token');
              sessionStorage.removeItem('is_demo_session');
              sessionStorage.removeItem('demo_active_role');
              sessionStorage.removeItem('demo_active_name');
              window.location.href = '/login';
            }}
            className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            title="Keluar / Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-4 sm:space-y-5">
        
        {/* ────────────────────────────────────────────────────────────────── */}
        {/* ────────────────────────────────────────────────────────────────── */}
        {/* TOP INTEGRATED HERO BANNER CARD & TAB NAV (Adopsi Gambar 1)        */}
        {/* ────────────────────────────────────────────────────────────────── */}
        <div className="p-5 sm:p-7 rounded-3xl bg-gradient-to-r from-orange-600 via-amber-600 to-rose-600 text-white shadow-xl space-y-6 relative overflow-hidden">
          
          {/* Header Row: Badges, Title & Linked Student Pill */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
            <div className="space-y-2">
              {/* Top Badges */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider border border-white/20 shadow-xs">
                  PARENT PORTAL MONITORING
                </span>
                <span className="px-3 py-1 rounded-full bg-amber-400/30 backdrop-blur-md text-amber-100 text-[10px] font-extrabold flex items-center gap-1.5 border border-amber-300/30">
                  <Bell size={12} className="text-amber-200 animate-bounce" />
                  WhatsApp Live Alerts Active
                </span>
              </div>

              {/* Parent Name Greeting */}
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-sm">
                Selamat Pagi, {(data as any)?.nama_orang_tua || (data as any)?.orang_tua?.nama || 'H. Suryadi Rahmat, S.E.'}
              </h1>

              {/* Subtitle */}
              <p className="text-xs sm:text-sm font-medium text-white/90">
                Memantau Presensi &amp; Kedisiplinan Anak:{' '}
                <span className="font-bold text-white underline decoration-white/70 decoration-2 underline-offset-2">
                  {student.nama_siswa} ({student.kelas?.startsWith('Kelas') ? student.kelas : `Kelas ${student.kelas || 'XI RPL 1'}`})
                </span>
              </p>
            </div>

            {/* Right Badge: Connected Student Profile Card */}
            <div className="p-2.5 px-3.5 rounded-2xl bg-black/20 backdrop-blur-md border border-white/20 flex items-center gap-3 shrink-0 self-start md:self-auto shadow-inner">
              <div className="w-11 h-11 rounded-xl bg-white/20 text-white font-black text-sm flex items-center justify-center border border-white/30 shadow-xs overflow-hidden">
                {student.foto ? (
                  <img src={student.foto} alt={student.nama_siswa} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-black text-xs">{childInitials}</span>
                )}
              </div>
              <div>
                <span className="text-[9px] font-black text-amber-200 uppercase tracking-widest block">
                  SISWA TERHUBUNG
                </span>
                <span className="text-xs sm:text-sm font-black text-white tracking-tight">
                  {student.nama_siswa}
                </span>
              </div>
            </div>
          </div>

          {/* Tab Navigation Row Inset (Embedded Dark Navigation Bar) */}
          <div className="p-1.5 rounded-2xl bg-slate-950/80 backdrop-blur-md border border-white/10 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar relative z-10 shadow-lg">
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
                      : "text-slate-300 hover:text-white hover:bg-white/10"
                  )}
                >
                  <TabIcon size={15} className={isTabActive ? "text-emerald-400" : "text-slate-400"} />
                  <span>{tab.fullLabel}</span>
                  {tab.badge && (
                    <span className="w-4 h-4 rounded-full bg-purple-500 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
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
          
          {/* ⚡ TAB 1: RINGKASAN FEED */}
          {activeTab === 'ringkasan' && (
            <motion.div
              key="tab-ringkasan"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-5 sm:space-y-6"
            >
              {/* 3 Metric Cards Grid (Adopsi Layout Gambar 1) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                {/* Card 1: Status Gerbang Hari Ini */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Status Gerbang Hari Ini
                    </span>
                    <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 uppercase">
                      {statusLabel} {today.waktu_masuk ? `(${new Date(today.waktu_masuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB)` : ''}
                    </div>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Gate 1 Utara • {isTerlambat ? 'Terlambat' : 'Tepat Waktu'}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={20} />
                  </div>
                </div>

                {/* Card 2: Skor Kedisiplinan Anak */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Skor Kedisiplinan Anak
                    </span>
                    <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono">
                      {summary.total_poin ?? 90} / 100 Poin
                    </div>
                    <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      Predikat: SANGAT BAIK
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                    <ShieldCheck size={20} />
                  </div>
                </div>

                {/* Card 3: Notifikasi WA Ortu */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Notifikasi WA Ortu
                    </span>
                    <div className="text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400 truncate max-w-[180px]">
                      AKTIF (+62812...)
                    </div>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Laporan Tap Instant
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0">
                    <Phone size={20} />
                  </div>
                </div>
              </div>

              {/* Live Feed Activity Monitoring Sekolah Container */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-2.5">
                    <Activity size={18} className="text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                      Live Feed Activity Monitoring Sekolah
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    Real-time Sync
                  </span>
                </div>

                {/* Feed Items List */}
                <div className="space-y-3">
                  {[
                    {
                      id: 'f1',
                      title: 'Tap Masuk Gerbang Utama',
                      subtitle: `${student.nama_siswa} telah tiba di sekolah melalui Gate 1 Utara (RFID Scan OK).`,
                      badge: 'HADIR TEPAT WAKTU',
                      badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
                      iconColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
                      time: today.waktu_masuk ? new Date(today.waktu_masuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB' : '06:48 WIB',
                    },
                    {
                      id: 'f2',
                      title: 'Sesi KBM Dimulai',
                      subtitle: 'Guru Drs. Budi Santoso telah membuka sesi Pemrograman Web di Lab Komputer 2.',
                      badge: 'KBM AKTIF',
                      badgeColor: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
                      iconColor: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
                      time: '07:00 WIB',
                    },
                    {
                      id: 'f3',
                      title: 'Pencatatan Keterlambatan',
                      subtitle: 'Bagas Prasetyo terdeteksi masuk gerbang pukul 07:18 WIB (+18m late).',
                      badge: 'TERLAMBAT',
                      badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
                      iconColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
                      time: '07:18 WIB',
                    },
                    {
                      id: 'f4',
                      title: 'Pengajuan Surat Izin Sakit',
                      subtitle: 'Orang tua Elvina Nurul Zahra mengajukan izin sakit terlampir surat dokter.',
                      badge: 'SURAT IZIN',
                      badgeColor: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
                      iconColor: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
                      time: '06:15 WIB',
                    },
                  ].map((item) => (
                    <div
                      key={item.id}
                      className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 dark:bg-slate-950/70 border border-slate-200/70 dark:border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5", item.iconColor)}>
                          <Clock size={20} />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap text-[10px] font-bold">
                            <span className={cn("px-2 py-0.5 rounded-md font-mono uppercase tracking-wider border", item.badgeColor)}>
                              {item.badge}
                            </span>
                          </div>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                            {item.title}
                          </h4>
                          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            {item.subtitle}
                          </p>
                        </div>
                      </div>

                      <span className="text-xs font-mono font-extrabold text-slate-500 dark:text-slate-400 shrink-0 self-end sm:self-auto">
                        {item.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* 🗓️ TAB 2: PRESENSI ANAK */}
          {activeTab === 'kehadiran' && (
            <motion.div
              key="tab-kehadiran"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5"
            >
              {/* Header Title */}
              <div className="pb-2 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Rekap Presensi Anak (Agustus 2026)
                </h3>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Bulan Ini: {summary.hadir} Hari Hadir
                </span>
              </div>

              {/* Attendance Log Cards List (Adopsi Layout Mockup Presensi) */}
              <div className="space-y-3">
                {[
                  {
                    date: '2026-08-10',
                    status: 'Hadir',
                    statusColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
                    metode: 'Metode: RFID • Tepat waktu via Gerbang Utara Gate 1',
                    tapMasuk: '06:42 WIB',
                    tapKeluar: '-',
                  },
                  {
                    date: '2026-08-08',
                    status: 'Hadir',
                    statusColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
                    metode: 'Metode: FaceScan • Face Recognition Sukses',
                    tapMasuk: '06:35 WIB',
                    tapKeluar: '-',
                  },
                  {
                    date: '2026-08-07',
                    status: 'Terlambat',
                    statusColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
                    metode: 'Metode: Manual • Terlambat 18 menit (Macet jalan raya)',
                    tapMasuk: '07:18 WIB',
                    tapKeluar: '-',
                  },
                  {
                    date: '2026-08-06',
                    status: 'Hadir',
                    statusColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
                    metode: 'Metode: RFID',
                    tapMasuk: '06:50 WIB',
                    tapKeluar: '-',
                  },
                  {
                    date: '2026-08-05',
                    status: 'Alpa',
                    statusColor: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
                    metode: 'Metode: • Belum ada kabar dari orang tua',
                    tapMasuk: '-',
                    tapKeluar: '-',
                  },
                  {
                    date: '2026-08-04',
                    status: 'Sakit',
                    statusColor: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
                    metode: 'Metode: • Surat dokter terlampir via Ortu Portal',
                    tapMasuk: '-',
                    tapKeluar: '-',
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 dark:bg-slate-950/70 border border-slate-200/70 dark:border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono font-extrabold text-sm text-slate-900 dark:text-white">
                          {item.date}
                        </span>
                        <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border", item.statusColor)}>
                          {item.status}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {item.metode}
                      </p>
                    </div>

                    <div className="text-right shrink-0 font-mono text-xs font-bold space-y-0.5 self-end sm:self-auto">
                      <div className="text-slate-800 dark:text-slate-200">
                        Tap Masuk: <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{item.tapMasuk}</span>
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        Tap Keluar: {item.tapKeluar}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* 📝 TAB 3: PERIZINAN (1-TAP) */}
          {activeTab === 'perizinan' && (
            <motion.div
              key="tab-perizinan"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6"
            >
              {/* Left Column: Form 1-Tap Pengajuan Izin Anak */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
                <div className="space-y-1 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-2.5">
                    <FileText size={20} className="text-amber-500" />
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                      Form 1-Tap Pengajuan Izin Anak
                    </h3>
                  </div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Kirimkan surat izin sakit atau izin keperluan ke Wali Kelas
                  </p>
                </div>

                <form onSubmit={handleSendLeaveRequest} className="space-y-4">
                  {/* Jenis Perizinan (Segmented Buttons) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Jenis Perizinan
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setJenisIzin('sakit')}
                        className={cn(
                          "py-2.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer",
                          jenisIzin === 'sakit'
                            ? "bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/20"
                            : "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:bg-slate-100"
                        )}
                      >
                        🩺 Sakit
                      </button>
                      <button
                        type="button"
                        onClick={() => setJenisIzin('izin')}
                        className={cn(
                          "py-2.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer",
                          jenisIzin === 'izin'
                            ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20"
                            : "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:bg-slate-100"
                        )}
                      >
                        🏠 Izin
                      </button>
                    </div>
                  </div>

                  {/* Alasan / Keterangan Lengkap */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Alasan / Keterangan Lengkap
                    </label>
                    <textarea
                      rows={3}
                      value={alasanIzin}
                      onChange={(e) => setAlasanIzin(e.target.value)}
                      placeholder="Contoh: Ananda sakit demam tinggi sejak semalam, saran dokter istirahat total 2 hari."
                      className="w-full p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/70 text-xs font-medium focus:outline-none focus:border-amber-500 transition-all placeholder:text-slate-400"
                    />
                  </div>

                  {/* Lampiran Foto Surat Dokter / Catatan */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Lampiran Foto Surat Dokter / Bukti (Opsional)
                    </label>
                    <label className="p-4 sm:p-5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 text-center hover:border-amber-500/50 transition-all cursor-pointer block group">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-1.5 group-hover:scale-110 transition-transform">
                        <FileText size={18} />
                      </div>
                      <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        {attachmentFile ? attachmentFile.name : 'Klik untuk Unggah Surat Dokter / Bukti'}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                        {attachmentFile ? `${(attachmentFile.size / 1024).toFixed(1)} KB` : 'JPG, PNG, PDF maks 5MB'}
                      </p>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isSubmittingIzin}
                    className="w-full h-11 rounded-2xl text-xs font-extrabold bg-amber-600 hover:bg-amber-700 text-white border-none flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingIzin ? (
                      <RefreshCw size={15} className="animate-spin" />
                    ) : (
                      <Send size={15} />
                    )}
                    <span>{isSubmittingIzin ? 'Mengirim Surat Izin...' : 'Kirim Surat Izin ke Wali Kelas'}</span>
                  </Button>
                </form>
              </div>

              {/* Right Column: Riwayat Surat Izin Diajukan */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
                <div className="pb-2 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    Riwayat Surat Izin Diajukan
                  </h3>
                  <span className="text-xs font-bold text-slate-400 font-mono">
                    {leaveHistory.length} Surat
                  </span>
                </div>

                <div className="space-y-3">
                  {leaveHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 dark:bg-slate-950/70 border border-slate-200/70 dark:border-slate-800/80 space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border", item.badgeColor)}>
                          {item.jenis}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 font-bold">
                          {item.timestamp}
                        </span>
                      </div>

                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-relaxed">
                        "{item.alasan}"
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-xs font-medium">
                        <span className="text-slate-400 text-[11px]">Status Sistem &amp; Walas:</span>
                        <span className={cn("font-bold flex items-center gap-1.5", item.statusColor)}>
                          <CheckCircle2 size={14} />
                          {item.statusText}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* 🛡️ TAB 4: POIN & KASUS (CATATAN KEDISIPLINAN) */}
          {activeTab === 'catatan' && (
            <motion.div
              key="tab-catatan"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5"
            >
              {/* Header Title */}
              <div className="pb-2 border-b border-slate-100 dark:border-slate-800/80">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Transparansi Catatan Kedisiplinan Anak
                </h3>
              </div>

              {/* Discipline Record List (Adopsi Layout Mockup Poin & Kasus) */}
              <div className="space-y-3">
                {[
                  {
                    id: 'pk1',
                    title: 'Juara 1 LKS Rekayasa Perangkat Lunak Tingkat Kota',
                    meta: 'Tanggal: 2026-07-28 • Diproses oleh: Drs. Budi Santoso, M.Pd',
                    poin: '+15 Poin',
                    poinColor: 'text-emerald-600 dark:text-emerald-400',
                  },
                  {
                    id: 'pk2',
                    title: 'Terlambat Masuk Sekolah (>15 Menit)',
                    meta: 'Tanggal: 2026-08-02 • Diproses oleh: Pak Hendra (Satpam Gerbang)',
                    poin: '-5 Poin',
                    poinColor: 'text-rose-600 dark:text-rose-400',
                  },
                  {
                    id: 'pk3',
                    title: 'Petugas Upacara Bendera HUT Kemerdekaan RI',
                    meta: 'Tanggal: 2026-08-05 • Diproses oleh: Ibu Rahmawati, S.Pd',
                    poin: '+5 Poin',
                    poinColor: 'text-emerald-600 dark:text-emerald-400',
                  },
                  {
                    id: 'pk4',
                    title: 'Seragam Tidak Sesuai Ketentuan (Sepatu Putih)',
                    meta: 'Tanggal: 2026-08-08 • Diproses oleh: Tim Ketertiban BK',
                    poin: '-10 Poin',
                    poinColor: 'text-rose-600 dark:text-rose-400',
                  },
                  {
                    id: 'pk5',
                    title: 'Meninggalkan Lingkungan Sekolah Tanpa Izin (Bolas KBM)',
                    meta: 'Tanggal: 2026-08-04 • Diproses oleh: Pak Suwandi, S.ST (Guru Piket)',
                    poin: '-25 Poin',
                    poinColor: 'text-rose-600 dark:text-rose-400',
                  },
                ].map((item) => (
                  <div
                    key={item.id}
                    className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 dark:bg-slate-950/70 border border-slate-200/70 dark:border-slate-800/80 flex items-center justify-between gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                  >
                    <div className="space-y-1 min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                        {item.title}
                      </h4>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {item.meta}
                      </p>
                    </div>

                    <span className={cn("text-xs sm:text-sm font-extrabold font-mono shrink-0", item.poinColor)}>
                      {item.poin}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* 👤 TAB 5: PROFIL ORTU & PENGATURAN NOTIFIKASI WA */}
          {activeTab === 'profil' && (
            <motion.div
              key="tab-profil"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5"
            >
              {/* Header Title */}
              <div className="pb-2 border-b border-slate-100 dark:border-slate-800/80">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Pengaturan Profil &amp; Notifikasi WhatsApp
                </h3>
              </div>

              {/* Notification Setting Card (Adopsi Layout Mockup Profil Ortu) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 dark:bg-slate-950/70 border border-amber-500/30 dark:border-amber-500/20 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Phone size={20} />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                      Laporan WhatsApp Otomatis
                    </h4>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Kirimkan pesan WA saat anak melakukan Tap Gerbang atau Absen KBM
                    </p>
                  </div>
                </div>

                <span className="px-3.5 py-1 rounded-full text-xs font-extrabold bg-emerald-500 text-white shadow-sm shrink-0">
                  Aktif
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ────────────────────────────────────────────────────────────────── */}
        {/* MOBILE FIXED BOTTOM NAVIGATION BAR (lg:hidden)                     */}
        {/* ────────────────────────────────────────────────────────────────── */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800 px-1 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex justify-around items-center shadow-xl">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const isTabActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 p-1 rounded-xl text-[10px] font-bold transition-all duration-200 select-none flex-1 relative cursor-pointer",
                  isTabActive
                    ? "text-emerald-600 dark:text-emerald-400 font-black"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-xl transition-all relative",
                  isTabActive ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-transparent"
                )}>
                  <TabIcon size={18} />
                  {tab.badge && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-purple-500 text-white text-[8px] font-black flex items-center justify-center border border-white dark:border-slate-900">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span className="truncate max-w-[64px]">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Lapor Sakit/Izin */}
        <ReportAbsenceModal 
          isOpen={isReportModalOpen} 
          onClose={() => setIsReportModalOpen(false)} 
          studentId={student.siswa_id}
          onSuccess={() => {
            getParentDashboard().then(setData).catch(console.error);
          }}
        />
      </div>
    </div>
  );
}
