import React, { useState } from 'react';
import { Menu, Bell, Check, X, Calendar, AlertTriangle, Info, CheckCircle, CreditCard, FileText, Sparkles, LayoutGrid, Smartphone, ArrowLeft, LogOut, MessageSquare, Search } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { UserMenu } from './UserMenu';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { TeacherLocatorModal } from '../shared/TeacherLocatorModal';
import { useNotifications } from '../../hooks/useNotifications';
import { useQuery } from '@tanstack/react-query';
import { fetchActiveSystemConfig } from '@/services/systemConfig';
import { getSesiAbsensiList } from '../../api/attendanceGerbang.api';
import { useAuthStore } from '@/store/authStore';
import { isSystemSuperAdmin } from '@/utils/rbac';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { mapSubscriptionToUI } from '../../utils/subscriptionMapper';
import { formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { cn, resolveProfilePhotoUrl } from '@/lib/utils';
import toast from 'react-hot-toast';
import { resolveSmartDashboardMode } from '@/helpers/dashboardModeHelper';
import { internalCommunicationApi, communicationKeys } from '@/api/internal-communication.api';
import { AppLauncherDropdown } from './AppLauncherDropdown';
import { getActiveApp } from '@/config/absentaAppsRegistry';

interface TopbarProps {
  onMenuClick: () => void;
  isSidebarOpen: boolean;
}

export const Topbar = React.memo(({ onMenuClick, isSidebarOpen }: TopbarProps) => {
  const { recent, loading, error, unreadCount, markAsReadLocal, markAllAsReadLocal, reload, isUnread } = useNotifications({ pollIntervalMs: 60000 });
  const [open, setOpen] = useState<boolean>(false);
  const [locatorModalOpen, setLocatorModalOpen] = useState<boolean>(false);
  const [selectedNotification, setSelectedNotification] = useState<any | null>(null);
  const [sesiDetail, setSesiDetail] = useState<any | null>(null);
  const [sesiLoading, setSesiLoading] = useState<boolean>(false);
  const [logoError, setLogoError] = useState<boolean>(false);
  const configQuery = useQuery({ queryKey: ['system-config','active'], queryFn: fetchActiveSystemConfig });
  const systemConfig = configQuery.data || null;

  // ⌨️ Global Shortcut for Teacher Locator (Ctrl + G or Cmd + G)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'g' || e.key === 'G')) {
        e.preventDefault();
        setLocatorModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const rawLogoUrl = (systemConfig as any)?.logo_url;
  const resolvedLogoUrl = rawLogoUrl ? resolveProfilePhotoUrl(rawLogoUrl) : null;
  const { user, subscription, tenantMode, logout } = useAuthStore();
  
  // 💬 Pusat Komunikasi Unread Count
  const { data: commUnreadCount = 0 } = useQuery({
    queryKey: communicationKeys.unreadCount(),
    queryFn: () => internalCommunicationApi.getUnreadCount(),
    enabled: !!user?.id,
    staleTime: 15 * 1000,
    refetchInterval: 20 * 1000
  });

  // Use Mapper for consistent UI state
  const _uiState = subscription ? mapSubscriptionToUI(subscription) : null;

  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Berhasil keluar dari akun!');
  };

  const handleGoBack = () => {
    // Navigasi cerdas ke halaman sebelumnya jika ada riwayat sesi, fallback ke /dashboard
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  const formattedToday = React.useMemo(() => {
    return new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, []);

  const [dashboardMode, setDashboardMode] = useState<'portal' | 'desktop'>(() => {
    return resolveSmartDashboardMode(user);
  });

  React.useEffect(() => {
    if (user && !localStorage.getItem('absenta_dashboard_mode')) {
      setDashboardMode(resolveSmartDashboardMode(user));
    }
  }, [user]);

  React.useEffect(() => {
    const handleModeChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setDashboardMode(customEvent.detail);
      }
    };
    window.addEventListener('absenta-dashboard-mode-change', handleModeChange);
    return () => window.removeEventListener('absenta-dashboard-mode-change', handleModeChange);
  }, []);

  const handleToggleDashboardMode = () => {
    const newMode = dashboardMode === 'portal' ? 'desktop' : 'portal';
    setDashboardMode(newMode);
    localStorage.setItem('absenta_dashboard_mode', newMode);
    window.dispatchEvent(new CustomEvent('absenta-dashboard-mode-change', { detail: newMode }));

    if (location.pathname !== '/dashboard' && location.pathname !== '/') {
      navigate('/dashboard');
    }

    toast.success(
      newMode === 'portal'
        ? 'Beralih ke Mode Mobile 📱'
        : 'Beralih ke Mode Desktop 🖥️'
    );
  };

  const isPortalMode = dashboardMode === 'portal';
  const isNotDashboard = path !== '/dashboard' && path !== '/' && path !== '/dashboard/overview';
  const pageTitleMap: Record<string, string> = {
    '/': 'Dashboard',
    '/dashboard': 'Dashboard',
    '/attendance/sesi': 'Sesi',
    '/attendance/gerbang': 'Gerbang',
    '/billing': 'Billing',
    '/billing/subscriptions': 'Subscriptions',
    '/billing/billings': 'Billings',
    '/billing/payments': 'Payments',
    '/tenants': 'Tenants',
    '/management/users': 'Users',
    '/academic/siswa': 'Data Siswa'
  };
  const pageTitle = pageTitleMap[path] ?? (() => {
    const parts = path.split('/').filter(Boolean);
    if (parts.length === 0) return 'Dashboard';
    const last = parts[parts.length - 1];
    return last.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  })();
  
  const getNotificationIcon = (type: string, status: string) => {
    const t = type.toLowerCase();
    if (status === 'FAILED') return <AlertTriangle className="w-5 h-5 text-red-500" />;
    if (t.includes('attendance')) return <Calendar className="w-5 h-5 text-blue-500" />;
    if (t.includes('payment') || t.includes('billing') || t.includes('invoice')) return <CreditCard className="w-5 h-5 text-orange-500" />;
    if (t.includes('subscription')) return <FileText className="w-5 h-5 text-yellow-500" />;
    if (t === 'success') return <CheckCircle className="w-5 h-5 text-green-500" />;
    return <Info className="w-5 h-5 text-slate-500" />;
  };

  const cleanMessage = (msg: string | null | undefined) => {
    if (!msg) return '';
    return msg
      .replace(/\*/g, '') // Remove bold markers
      .replace(/_/g, '')  // Remove italic markers
      .replace(/~/g, '')  // Remove strikethrough markers
      .replace(/```/g, '') // Remove code block markers
      .replace(/`/g, '')  // Remove inline code markers
      .replace(/^🔔\s*/, '') // Remove bell icon at start
      .trim();
  };

  const activeApp = React.useMemo(() => {
    return getActiveApp(location.pathname);
  }, [location.pathname]);

  return (
    <header className="topbar fixed top-0 left-0 right-0 z-30 h-16 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800/60 transition-all">
        <div className="w-full h-full flex items-center px-4 transition-all duration-500">

        {/* Sisi Kiri: Branding & Nama Aplikasi Aktif */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
            {/* Hamburger Menu Toggle */}
            <button
              onClick={onMenuClick}
              aria-label="Buka Menu"
              className="p-2 -ml-1 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Logo & Judul Aplikasi Aktif */}
            {activeApp ? (
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <Link to="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0">
                  {resolvedLogoUrl && !logoError ? (
                    <img 
                      src={resolvedLogoUrl} 
                      alt="Logo" 
                      className="w-8 h-8 rounded-lg object-contain shrink-0" 
                      onError={() => setLogoError(true)}
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-md shrink-0 text-white font-black text-xs">
                      A
                    </div>
                  )}
                </Link>
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">/</span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <activeApp.icon className={cn("h-4 w-4 shrink-0 hidden sm:inline-block", activeApp.color.text)} />
                    <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight uppercase truncate">
                      {activeApp.name}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <Link to="/dashboard" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity shrink-0">
                {resolvedLogoUrl && !logoError ? (
                  <img 
                    src={resolvedLogoUrl} 
                    alt={systemConfig?.app_name || 'Logo App'} 
                    className="w-8 h-8 rounded-lg object-contain shrink-0" 
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-md border border-blue-400/30 shrink-0">
                    <span className="text-white font-black text-xs tracking-wider">
                      {(systemConfig?.app_name || 'Absenta').slice(0,2).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="hidden sm:flex flex-col min-w-0">
                  <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight leading-none uppercase truncate max-w-[150px] md:max-w-[220px]">
                    {systemConfig?.app_name || 'Sistem Absensi'}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Workspace Portal
                  </span>
                </div>
              </Link>
            )}
        </div>

        {/* Kolom 3: Konten Topbar Kanan (Minimalist & Zero-Noise) */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          {/* ⠶ App Launcher (9-Dots) - Akses Cepat Modul */}
          <AppLauncherDropdown />

          {/* 👤 Profile User Menu (Avatar, Name, Jabatan & Menu Akses Cepat) */}
          <UserMenu 
            onOpenTeacherLocator={() => setLocatorModalOpen(true)}
            onOpenNotifications={() => setOpen(true)}
          />
        </div>

        {/* Notification Detail Modal */}
        <Modal
          isOpen={!!selectedNotification}
          onClose={() => setSelectedNotification(null)}
          title={cleanMessage(selectedNotification?.subject) || 'Detail Notifikasi'}
          size="md"
        >
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-full flex items-center justify-center ${selectedNotification ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                {selectedNotification && getNotificationIcon(selectedNotification.type, selectedNotification.status)}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {selectedNotification?.type?.replace(/_/g, ' ')}
                </p>
                <p className="text-xs text-slate-500">
                  {selectedNotification && formatDistanceToNow(new Date(selectedNotification.created_at), { addSuffix: true, locale: idLocale })}
                </p>
              </div>
            </div>
            
            {sesiLoading ? (
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                <p className="text-sm text-slate-500 text-center py-2">Memuat detail sesi...</p>
              </div>
            ) : sesiDetail ? (
              <div className="space-y-4">
                 <div className="bg-blue-50 dark:bg-slate-950 p-4 rounded-lg border border-blue-100 dark:border-slate-800">
                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                       <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                       Detail Sesi Aktif
                    </h4>
                    
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                      Ada sesi aktif yang memerlukan kehadiran Anda. Berikut detailnya:
                    </p>

                    <div className="grid grid-cols-[100px_1fr] gap-y-3 text-sm">
                       <div className="text-slate-500 dark:text-slate-400">Kegiatan</div>
                       <div className="font-medium text-slate-900 dark:text-slate-100">{sesiDetail.jenis_kegiatan}</div>
                       
                       <div className="text-slate-500 dark:text-slate-400">Kelas</div>
                       <div className="font-medium text-slate-900 dark:text-slate-100">{sesiDetail.Kelas?.nama_kelas || '-'}</div>

                       <div className="text-slate-500 dark:text-slate-400">Guru</div>
                       <div className="font-medium text-slate-900 dark:text-slate-100">{sesiDetail.Guru?.nama_guru || '-'}</div>
                       
                       <div className="text-slate-500 dark:text-slate-400">Waktu</div>
                       <div className="font-medium text-slate-900 dark:text-slate-100">
                          {sesiDetail.waktu_mulai ? new Date(sesiDetail.waktu_mulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'} s.d {sesiDetail.waktu_selesai ? new Date(sesiDetail.waktu_selesai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                       </div>
                    </div>
                 </div>
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700 max-h-[60vh] overflow-y-auto">
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {cleanMessage(selectedNotification?.message)}
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={() => setSelectedNotification(null)}>
                Tutup
              </Button>
            </div>
          </div>
        </Modal>

        {/* 🔍 Global Teacher Locator Modal */}
        <TeacherLocatorModal
          isOpen={locatorModalOpen}
          onClose={() => setLocatorModalOpen(false)}
        />
      </div>
    </header>
  );
});

Topbar.displayName = 'Topbar';

