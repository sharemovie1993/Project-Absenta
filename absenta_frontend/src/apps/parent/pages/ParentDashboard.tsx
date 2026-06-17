import { useEffect, useState } from 'react';
import { useParentAuthStore } from '../../../store/parentAuthStore';
import { getStudentNotifications, getParentDashboard, type NotificationRecord } from '../../../api/parent.api';
import { useParentSocket } from '../hooks/useParentSocket';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, Clock, LogOut, Activity, UserCheck, UserX, AlertTriangle, Award } from 'lucide-react';
import ReportAbsenceModal from '../components/ReportAbsenceModal';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';

export default function ParentDashboard() {
  console.log('🔥🔥🔥 ParentDashboard MOUNTED');
  console.log('🔥🔥🔥 TOKEN IN DASHBOARD =', localStorage.getItem('parent_access_token'));
  
  const { data, setData, selectedStudentId, setSelectedStudentId, getSelectedStudent, logout } = useParentAuthStore();
  const { socket } = useParentSocket();
  const navigate = useNavigate();
  const student = getSelectedStudent();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  
  // 1. Refresh Dashboard Data (Background)
  useEffect(() => {
    // Always refresh latest status from server to ensure data is not stale
    getParentDashboard()
      .then(newData => {
        // Only update if data actually changed significantly (deep comparison is expensive, just set it for now)
        setData(newData);
      })
      .catch(err => {
        console.error('Failed to refresh dashboard:', err);
        // If 401, token expired
        // if (err.response?.status === 401) {
        //   logout();
        //   navigate('/parent-app/access?error=expired');
        // }
      });
  }, []); // Run once on mount

  // 2. Real-time Updates
  useEffect(() => {
    if (!socket || !student) return;

    const handleUpdate = (payload: any) => {
      // Check if update is for current student
      if (payload?.data?.siswa_id === student.siswa_id) {
        console.log('[ParentDashboard] Realtime update:', payload);
        
        // Refresh dashboard data
        getParentDashboard()
          .then(setData)
          .catch(console.error);
          
        // Refresh notifications
        getStudentNotifications(student.siswa_id, 1, 3)
          .then(res => setNotifications(res.data))
          .catch(console.error);
      }
    };

    const handleNotification = (payload: any) => {
        console.log('[ParentDashboard] Notification received:', payload);
        // Refresh notifications list
        getStudentNotifications(student.siswa_id, 1, 3)
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
    // Fetch notifications for selected student
    getStudentNotifications(student.siswa_id, 1, 3)
      .then(res => setNotifications(res.data))
      .catch(console.error)
      .finally(() => setLoadingNotifs(false));
      
  }, [student?.siswa_id]); // Only re-run if selected student changes

  if (!data || !student) {
     return <div className="flex items-center justify-center min-h-screen text-gray-500">Memuat data...</div>;
  }

  const { status_kehadiran_hari_ini: today, ringkasan_kehadiran: summary } = student;
  
  // Helper: Map status to friendly label
  const getFriendlyStatus = (status: string, _isTerlambat?: boolean) => {
    // if (status === 'HADIR' && isTerlambat) return 'Terlambat'; // User wants "HADIR" with subtitle
    switch (status) {
      case 'ALPA': return 'Tidak Hadir';
      case 'PULANG_CEPAT': return 'Pulang Lebih Awal';
      case 'HADIR': return 'Hadir';
      case 'SAKIT': return 'Sakit';
      case 'IZIN': return 'Izin';
      default: return today.label || status;
    }
  };

  const statusLabel = getFriendlyStatus(today.status, today.is_terlambat);
  const isTidakHadir = today.status === 'ALPA';
  const isTerlambat = today.status === 'HADIR' && today.is_terlambat;

  // Hero Color Logic
  const getHeroColor = (hint: string) => {
    if (today.status === 'ALPA') return 'bg-red-500'; // Ensure consistent red for Tidak Hadir
    if (isTerlambat) return 'bg-orange-500'; // Override for Late -> Orange
    switch(hint) {
      case 'green': return 'bg-green-600';
      case 'orange': return 'bg-orange-500';
      case 'blue': return 'bg-blue-600';
      case 'red': return 'bg-red-600';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="pb-24 bg-gray-50 min-h-screen">
      {/* Header / Student Switcher */}
      <div className="bg-white px-6 py-4 shadow-sm sticky top-0 z-10 flex justify-between items-center">
        <div className="flex flex-col">
          {data.siswa.length > 1 ? (
            <div className="relative w-[200px]">
              <SearchableSelect
                value={selectedStudentId || ''}
                onValueChange={(val) => setSelectedStudentId(val)}
                options={data.siswa.map((s: any) => ({ label: s.nama_siswa, value: s.siswa_id }))}
                placeholder="Pilih Siswa"
                searchPlaceholder="Cari Siswa..."
                triggerClassName="w-full font-semibold"
              />
            </div>
          ) : (
            <h1 className="font-bold text-xl text-gray-800 leading-tight">{student.nama_siswa}</h1>
          )}
          <p className="text-sm text-gray-500 mt-0.5">{student.kelas?.startsWith('Kelas') ? student.kelas : `Kelas ${student.kelas || '-'}`}</p>
        </div>
        
        <button onClick={() => { logout(); navigate('/parent-app/access?error=logout'); }} className="text-gray-400 p-2 hover:bg-gray-50 rounded-full transition-colors">
           <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Hero Section */}
      <div className={`${getHeroColor(today.color_hint)} text-white p-6 rounded-b-[2.5rem] shadow-xl transition-colors duration-300 relative overflow-hidden`}>
        <div className="absolute top-0 left-0 w-full h-full bg-white/5 pointer-events-none"></div>
        <div className="flex flex-col items-center text-center space-y-3 py-6 relative z-10">
          <span className="text-white/90 text-sm font-medium tracking-wide">Status Kehadiran Hari Ini</span>
          
          <div className="flex flex-col items-center">
            <h2 className="text-4xl font-extrabold tracking-tight drop-shadow-sm uppercase">{statusLabel}</h2>
            {isTerlambat && (
              <>
                <div className="w-12 h-0.5 bg-white/40 my-2 rounded-full"></div>
                <span className="text-lg font-medium text-white/90">(Terlambat)</span>
              </>
            )}
          </div>
          
          {isTidakHadir ? (
            <div className="mt-4 px-4 py-2 bg-white/10 rounded-lg backdrop-blur-sm">
               <p className="text-white font-medium text-base">Tidak ada data kehadiran hari ini</p>
            </div>
          ) : (
            <div className="flex items-center space-x-6 mt-6 bg-white/15 rounded-xl px-6 py-3 backdrop-blur-md border border-white/10 shadow-lg">
              <div className="flex flex-col items-center">
                <span className="text-xs text-white/80 uppercase tracking-wider mb-1">Masuk</span>
                <span className="font-bold font-mono text-2xl">
                  {today.waktu_masuk ? new Date(today.waktu_masuk).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit', timeZone: student.timezone || 'Asia/Jakarta'}) : '--:--'}
                </span>
              </div>
              <div className="w-px h-10 bg-white/30"></div>
              <div className="flex flex-col items-center">
                <span className="text-xs text-white/80 uppercase tracking-wider mb-1">Pulang</span>
                <span className="font-bold font-mono text-2xl">
                  {today.waktu_pulang ? new Date(today.waktu_pulang).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit', timeZone: student.timezone || 'Asia/Jakarta'}) : '--:--'}
                </span>
              </div>
            </div>
          )}
          
          <p className="text-[10px] text-white/60 mt-6 font-light">
            Status diperbarui otomatis dari sistem absensi sekolah.
          </p>
        </div>
      </div>

      {/* Quick Action - Report Absence */}
      {today.status === 'BELUM_HADIR' && (
        <div className="px-6 -mt-8 relative z-20 mb-6">
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="w-full bg-white rounded-xl p-4 shadow-lg flex items-center justify-between group active:scale-[0.95] transition-all border border-blue-50"
          >
            <div className="flex items-center space-x-4">
              <div className="bg-blue-50 p-3 rounded-xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
              </div>
              <div className="flex flex-col items-start text-left">
                  <span className="font-bold text-gray-800 text-sm">Lapor Ketidakhadiran</span>
                  <span className="text-[10px] text-gray-500 font-medium mt-0.5">Ajukan izin atau sakit disini</span>
              </div>
            </div>
            <div className="bg-gray-50 p-2 rounded-full text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>
      )}

      <ReportAbsenceModal 
        isOpen={isReportModalOpen} 
        onClose={() => setIsReportModalOpen(false)} 
        studentId={student.siswa_id}
        onSuccess={() => {
           getParentDashboard().then(setData).catch(console.error);
        }}
      />

      {/* Summary Grid */}
      <div className="px-6 mt-10">
        <h3 className="text-sm font-bold text-gray-800 mb-5">Ringkasan Semester</h3>
        <div className="grid grid-cols-2 gap-4">
          <AnalyticsCard
            title="Poin Kehadiran"
            value={summary.total_poin}
            subtitle="Total poin semester ini"
            icon={<Award size={20} />}
            gradient="from-indigo-500 to-purple-600"
            className="col-span-2"
          />
          <AnalyticsCard
            title="Hadir"
            value={summary.hadir}
            subtitle="Kehadiran tepat waktu"
            icon={<UserCheck size={20} />}
            gradient="from-green-500 to-emerald-600"
          />
          <AnalyticsCard
            title="Terlambat"
            value={summary.terlambat}
            subtitle="Datang terlambat"
            icon={<AlertTriangle size={20} />}
            gradient="from-orange-400 to-red-500"
          />
          <AnalyticsCard
            title="Sakit"
            value={summary.sakit}
            subtitle="Izin sakit tercatat"
            icon={<Activity size={20} />}
            gradient="from-blue-500 to-cyan-600"
          />
          <AnalyticsCard
            title="Izin"
            value={summary.izin}
            subtitle="Izin resmi sekolah"
            icon={<Clock size={20} />}
            gradient="from-purple-500 to-pink-600"
          />
          <AnalyticsCard
            title="Tidak Hadir"
            value={summary.alpa}
            subtitle="Tanpa keterangan"
            icon={<UserX size={20} />}
            gradient="from-red-500 to-pink-600"
          />
          <AnalyticsCard
            title="Dispensasi"
            value={summary.dispen}
            subtitle="Tugas luar sekolah"
            icon={<Activity size={20} />}
            gradient="from-teal-500 to-green-600"
          />
        </div>
      </div>

      {/* Notifications */}
      <div className="px-6 mt-10">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-sm font-bold text-gray-800">Info Terbaru</h3>
          {notifications.length > 0 && (
             <span className="text-xs text-blue-600 font-medium cursor-pointer hover:underline">Lihat Semua</span>
          )}
        </div>
        
        <div className="space-y-4">
          {loadingNotifs ? (
             <div className="text-center py-8 text-gray-400 text-sm">Memuat notifikasi...</div>
          ) : notifications.length === 0 ? (
             <div className="text-center py-10 px-6 text-gray-500 text-sm bg-white rounded-xl border border-gray-100 shadow-sm">
                <p className="font-medium text-gray-600 mb-1">Belum ada informasi baru hari ini.</p>
                <p className="text-xs text-gray-400">Kami akan memberi tahu jika ada update kehadiran.</p>
             </div>
          ) : (
            notifications.map(notif => (
              <div 
                key={notif.id} 
                onClick={() => navigate(`/parent-app/notification/${notif.id}`, { state: { notif } })}
                className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-start space-x-4 active:scale-[0.98] transition-all cursor-pointer hover:shadow-md"
              >
                <div className={`p-3 rounded-full shrink-0 ${notif.is_read ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 text-blue-600'}`}>
                  <Bell className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                     <h4 className={`text-sm truncate pr-2 ${notif.is_read ? 'font-medium text-gray-600' : 'font-bold text-gray-900'}`}>{notif.title}</h4>
                     {!notif.is_read && <span className="w-2.5 h-2.5 bg-red-500 rounded-full shrink-0 mt-1.5 shadow-sm"></span>}
                  </div>
                  <p className="text-gray-500 text-xs mt-1.5 line-clamp-2 leading-relaxed">{notif.message}</p>
                  <p className="text-gray-400 text-[10px] mt-3 flex items-center font-medium">
                    <Clock className="w-3 h-3 mr-1.5" />
                    {new Date(notif.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'})}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-2 flex justify-around items-center z-20 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button className="flex flex-col items-center text-blue-600 p-2">
          <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-[10px] font-bold">Beranda</span>
        </button>
        
        {student.absensi_mode === 'MULTI_SESI' && (
          <>
            <button 
              onClick={() => navigate('/parent-app/tracking-harian')}
              className="flex flex-col items-center text-gray-400 hover:text-gray-600 p-2"
            >
              <Activity className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-medium">Tracking</span>
            </button>
            <button 
              onClick={() => navigate('/parent-app/history')}
              className="flex flex-col items-center text-gray-400 hover:text-gray-600 p-2"
            >
              <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-[10px] font-medium">Riwayat</span>
            </button>
          </>
        )}

        <button 
          onClick={() => navigate('/parent-app/rekap-bulanan')}
          className="flex flex-col items-center text-gray-400 hover:text-gray-600 p-2"
        >
          <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-[10px] font-medium">Rekap</span>
        </button>
      </div>
    </div>
  );
}
