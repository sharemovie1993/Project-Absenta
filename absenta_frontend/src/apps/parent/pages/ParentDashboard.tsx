import React, { useEffect, useState, useMemo } from 'react';
import { useParentAuthStore } from '../../../store/parentAuthStore';
import { getStudentNotifications, getParentDashboard, type NotificationRecord } from '../../../api/parent.api';
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
    { id: 'ringkasan', label: 'Ringkasan', icon: LayoutList },
    { id: 'kehadiran', label: 'Kehadiran', icon: CheckCircle2 },
    { id: 'catatan', label: 'Catatan', icon: FileText },
    { id: 'profil', label: 'Profil Anak', icon: User },
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
            onClick={() => { logout(); navigate('/parent-app/access?error=logout'); }}
            className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            title="Keluar / Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-4 sm:space-y-5">
        
        {/* ────────────────────────────────────────────────────────────────── */}
        {/* HERO CHILD PROFILE CARD (Visible on Tab Ringkasan)                 */}
        {/* ────────────────────────────────────────────────────────────────── */}
        {activeTab === 'ringkasan' && (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 p-4 sm:p-8 text-white shadow-xl border border-emerald-500/20 transition-all">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-teal-600/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-5 sm:gap-6">
              {/* Child Identity */}
              <div className="flex flex-col items-center sm:flex-row sm:items-start text-center sm:text-left gap-4 sm:gap-6 w-full lg:w-auto">
                <div className="relative shrink-0">
                  <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-tr from-emerald-400 via-teal-500 to-sky-600 p-1 shadow-xl shadow-emerald-500/30">
                    <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center font-extrabold text-2xl sm:text-3xl text-emerald-400 tracking-wider">
                      {childInitials}
                    </div>
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-emerald-500 border-2 border-slate-900 rounded-full flex items-center justify-center text-slate-950">
                    <CheckCircle2 size={12} strokeWidth={3} />
                  </span>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-tight">
                    {student.nama_siswa}
                  </h1>

                  <p className="text-xs sm:text-sm font-semibold text-emerald-400 font-mono flex items-center justify-center sm:justify-start gap-2">
                    <span>NISN {student.nisn || '0138544323'}</span>
                  </p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2 pt-1">
                    <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-white/10 text-white border border-white/15 backdrop-blur-md">
                      {student.kelas?.startsWith('Kelas') ? student.kelas : `Kelas ${student.kelas || '-'}`}
                    </span>
                    <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Aktif
                    </span>
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 backdrop-blur-md flex items-center gap-1">
                      <ShieldCheck size={13} className="text-indigo-400" />
                      Skor Kedisiplinan 90
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 sm:flex sm:flex-col gap-2 w-full sm:w-auto shrink-0">
                <Button
                  size="sm"
                  onClick={() => setIsReportModalOpen(true)}
                  className="w-full h-9.5 px-4 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 border-none transition-all"
                >
                  <FileText size={13} />
                  <span>Lapor Sakit/Izin</span>
                </Button>

                <Button
                  size="sm"
                  onClick={() => handleTabChange('profil')}
                  className="w-full h-9.5 px-4 rounded-xl text-xs font-bold bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 flex items-center justify-center gap-2 transition-all truncate"
                >
                  <Phone size={13} />
                  <span>Kontak Wali Kelas</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────────── */}
        {/* 4 SUMMARY STAT CARDS (2x2 Grid on Mobile, 4-Cols on Desktop)       */}
        {/* ────────────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {/* Stat 1: Status Hari Ini */}
          <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-2 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">STATUS HARI INI</span>
              <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Activity size={16} />
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 uppercase">
                {statusLabel}
              </div>
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 mt-0.5">
                {isTerlambat ? 'Masuk dengan catatan terlambat' : 'Absensi tercatat di sistem'}
              </p>
            </div>
          </div>

          {/* Stat 2: Kehadiran Bulan Ini */}
          <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-2 relative overflow-hidden group hover:border-indigo-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">PRESENSI SEMESTER</span>
              <div className="w-7 h-7 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                <UserCheck size={16} />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {summary.hadir} Hari
              </div>
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 mt-0.5 truncate">
                Total poin: {summary.total_poin}
              </p>
            </div>
          </div>

          {/* Stat 3: Sakit & Izin */}
          <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-2 relative overflow-hidden group hover:border-amber-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">SAKIT & IZIN</span>
              <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <FileText size={16} />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
                {summary.sakit + summary.izin} Hari
              </div>
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 mt-0.5">
                {summary.sakit} Sakit • {summary.izin} Izin
              </p>
            </div>
          </div>

          {/* Stat 4: Alpa / Tidak Hadir */}
          <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-2 relative overflow-hidden group hover:border-rose-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ALPA / TANPA KETERANGAN</span>
              <div className="w-7 h-7 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                <AlertTriangle size={16} />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">
                {summary.alpa} Hari
              </div>
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 mt-0.5">
                {summary.alpa === 0 ? 'Disiplin sempurna' : 'Perlu perhatian'}
              </p>
            </div>
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────────────── */}
        {/* 4 TABULAR PILLS (Desktop: Top Segmented Control Pills hidden lg:flex) */}
        {/* ────────────────────────────────────────────────────────────────── */}
        <div className="hidden lg:flex items-center gap-1.5 p-1.5 bg-slate-100/80 dark:bg-slate-900/90 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-inner">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const isTabActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer select-none",
                  isTabActive
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 border border-emerald-500"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
                )}
              >
                <TabIcon size={16} className={isTabActive ? "text-white" : "text-slate-400"} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ────────────────────────────────────────────────────────────────── */}
        {/* TAB CONTENT AREA                                                   */}
        {/* ────────────────────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          
          {/* 📌 TAB 1: RINGKASAN */}
          {activeTab === 'ringkasan' && (
            <motion.div
              key="tab-ringkasan"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 sm:space-y-6"
            >
              {/* Banner Jam Masuk & Pulang Anak */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-sky-500/10 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                    <Clock size={22} />
                  </div>
                  <div>
                    <span className="text-[11px] sm:text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                      Waktu Presensi Hari Ini ({student.nama_siswa})
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                      Masuk:{' '}
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">
                        {today.waktu_masuk
                          ? new Date(today.waktu_masuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: student.timezone || getTimezone() })
                          : '--:--'}
                      </span>{' '}
                      • Pulang:{' '}
                      <span className="font-mono text-sky-600 dark:text-sky-400">
                        {today.waktu_pulang
                          ? new Date(today.waktu_pulang).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: student.timezone || getTimezone() })
                          : '--:--'}
                      </span>
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => setIsReportModalOpen(true)}
                  className="w-full sm:w-auto shrink-0 h-9 px-4 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white border-none flex items-center justify-center gap-1.5"
                >
                  <FileText size={14} />
                  <span>Lapor Sakit/Izin</span>
                </Button>
              </div>

              {/* Real-time Notifications List */}
              <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
                      <Bell size={18} />
                    </div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                      NOTIFIKASI PRESENSI TERBARU
                    </h3>
                  </div>
                </div>

                {loadingNotifs ? (
                  <div className="py-6 text-center text-xs font-semibold text-slate-400">Memuat notifikasi...</div>
                ) : notifications.length === 0 ? (
                  <div className="py-6 text-center text-xs font-semibold text-slate-400">
                    Belum ada notifikasi presensi baru.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-start gap-3"
                      >
                        <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                          <CheckCircle2 size={15} />
                        </div>
                        <div className="flex-1 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{n.title}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(n.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{n.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* 🗓️ TAB 2: KEHADIRAN */}
          {activeTab === 'kehadiran' && (
            <motion.div
              key="tab-kehadiran"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 sm:space-y-6"
            >
              <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                    RIWAYAT PRESENSI HARIAN ANAK
                  </h3>
                </div>

                <div className="space-y-2.5">
                  {[
                    { date: 'Senin, 03 Agu 2026', masuk: '06:45', pulang: '14:30', status: 'HADIR' },
                    { date: 'Selasa, 04 Agu 2026', masuk: '06:50', pulang: '14:30', status: 'HADIR' },
                    { date: 'Rabu, 05 Agu 2026', masuk: '06:42', pulang: '14:30', status: 'HADIR' },
                    { date: 'Kamis, 06 Agu 2026', masuk: '06:48', pulang: '14:30', status: 'HADIR' },
                    { date: "Jum'at, 07 Agu 2026", masuk: '06:40', pulang: '11:45', status: 'HADIR' },
                  ].map((log, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{log.date}</span>
                        <span className="text-[11px] font-mono text-slate-400">Masuk: {log.masuk} WIB • Pulang: {log.pulang} WIB</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-xl text-[11px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {log.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* 📝 TAB 3: CATATAN */}
          {activeTab === 'catatan' && (
            <motion.div
              key="tab-catatan"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 sm:space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText size={18} className="text-sky-500" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                      CATATAN WALI KELAS
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 py-6 text-center">Belum ada catatan dari Wali Kelas.</p>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={18} className="text-rose-500" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                      CATATAN PELANGGARAN
                    </h3>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">Tidak membawa makan</span>
                      <span className="text-[10px] text-slate-400">31 Jul 2026</span>
                    </div>
                    <span className="font-black text-rose-600 dark:text-rose-400">-5 Poin</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 👤 TAB 4: PROFIL ANAK */}
          {activeTab === 'profil' && (
            <motion.div
              key="tab-profil"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 sm:space-y-6"
            >
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <User size={18} />
                  </div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                    BIODATA SISWA (ANAK)
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Nama Lengkap</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{student.nama_siswa}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">NISN</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{student.nisn || '0138544323'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Kelas</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{student.kelas}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Wali Kelas</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">Bpk. Hendra Wijaya, S.Pd.</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ────────────────────────────────────────────────────────────────── */}
        {/* MOBILE FIXED BOTTOM NAVIGATION BAR (lg:hidden)                     */}
        {/* ────────────────────────────────────────────────────────────────── */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800 px-2 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex justify-around items-center shadow-xl">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const isTabActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 p-1 rounded-xl text-[10px] font-bold transition-all duration-200 select-none flex-1",
                  isTabActive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-xl transition-all",
                  isTabActive ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-transparent"
                )}>
                  <TabIcon size={18} />
                </div>
                <span>{tab.label}</span>
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
