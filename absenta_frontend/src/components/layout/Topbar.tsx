import React, { useState } from 'react';
import { Menu, Bell, Check, X, Calendar, AlertTriangle, Info, CheckCircle, CreditCard, FileText, Sparkles, LayoutGrid, Smartphone, ArrowLeft, LogOut, MessageSquare } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { UserMenu } from './UserMenu';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
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

interface TopbarProps {
  onMenuClick: () => void;
  isSidebarOpen: boolean;
}

export const Topbar = React.memo(({ onMenuClick, isSidebarOpen }: TopbarProps) => {
  const { recent, loading, error, unreadCount, markAsReadLocal, markAllAsReadLocal, reload, isUnread } = useNotifications({ pollIntervalMs: 60000 });
  const [open, setOpen] = useState<boolean>(false);
  const [selectedNotification, setSelectedNotification] = useState<any | null>(null);
  const [sesiDetail, setSesiDetail] = useState<any | null>(null);
  const [sesiLoading, setSesiLoading] = useState<boolean>(false);
  const [logoError, setLogoError] = useState<boolean>(false);
  const configQuery = useQuery({ queryKey: ['system-config','active'], queryFn: fetchActiveSystemConfig });
  const systemConfig = configQuery.data || null;

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

  return (
    <header className="topbar fixed top-0 left-0 right-0 z-30 h-16 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800/60 transition-all">
        <div className="w-full h-full flex items-center px-4 transition-all duration-500">

        {/* Sisi Kiri: Branding */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            {/* Mobile Menu Toggle */}
            <button
              onClick={onMenuClick}
              aria-label="Buka Menu"
              className="lg:hidden p-2 -ml-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Logo & Info Sekolah */}
            <Link to="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                 {resolvedLogoUrl && !logoError ? (
                  <img 
                    src={resolvedLogoUrl} 
                    alt={systemConfig?.app_name || 'Logo App'} 
                    className="w-8 h-8 rounded-lg object-contain" 
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-md border border-blue-400/30">
                    <span className="text-white font-black text-xs tracking-wider">
                      {(systemConfig?.app_name || 'Absenta').slice(0,2).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight leading-none uppercase">
                    {systemConfig?.app_name || 'Sistem Absensi'}
                  </span>
                  {(() => {
                    const raw = String((tenantMode || '') || (subscription?.Plan?.absensi_mode));
                    const norm = raw.trim().replace(/[\s-]+/g, '_').toUpperCase();
                    if (!norm || isSystemSuperAdmin(user?.role?.name, user?.tenant_id)) return null;
                    const isSimple = norm === 'SIMPLE';
                    return (
                      <div className="flex items-center gap-1 mt-1">
                        <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isSimple ? "bg-emerald-500" : "bg-blue-500")} />
                        <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none">
                          {norm.replace('_', ' ')}
                        </span>
                      </div>
                    );
                  })()}
                </div>
            </Link>

            {isNotDashboard && (
              <Link
                to="/dashboard"
                className="flex items-center gap-1.5 ml-2 sm:ml-3 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold transition-all flex-shrink-0 border border-slate-200/80 dark:border-slate-800"
                title="Kembali ke Launcher Apps"
              >
                <ArrowLeft size={16} className="stroke-[2.5]" />
                <span className="hidden sm:inline">Kembali</span>
              </Link>
            )}
        </div>

        {/* Kolom 3: Konten Topbar Lainnya (Right Section) */}
        <div className="flex items-center px-4 gap-2 sm:gap-4 ml-auto">

          {/* 💬 Pusat Komunikasi Sekolah */}
          <Link
            to="/komunikasi"
            className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            title="Pusat Komunikasi & Perpesanan Sekolah"
          >
            <MessageSquare className="w-5 h-5" />
            {commUnreadCount > 0 && (
              <span className="absolute top-1 right-1 bg-blue-600 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-xs">
                {commUnreadCount > 99 ? '99+' : commUnreadCount}
              </span>
            )}
          </Link>

          {/* Notifications */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="relative rounded-full w-9 h-9 p-0"
              onClick={() => setOpen((v) => !v)}
              aria-label="Buka Notifikasi"
              aria-expanded={open}
            >
              <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              {/* Notification Badge */}
              {unreadCount > 0 && (
                 <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center border-2 border-white dark:border-slate-900">
                    {Math.min(unreadCount, 99)}
                 </span>
              )}
            </Button>
            {open && (
              <div className="fixed inset-x-4 top-[64px] sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 rounded-t-xl">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Notifikasi</h3>
                    <p className="text-[10px] text-slate-500">Update terbaru untuk Anda</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                      <Button variant="ghost" size="xs" onClick={markAllAsReadLocal} className="text-[10px] h-6 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                        Tandai dibaca
                      </Button>
                    )}
                    <Button variant="ghost" size="xs" onClick={reload} className="h-6 w-6 p-0 rounded-full" title="Refresh">
                      <span className="sr-only">Refresh</span>
                      <svg className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                    </Button>
                  </div>
                </div>
                
                <div className="max-h-[24rem] overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-950/50">
                  {error && (
                    <div className="mx-4 mt-2 px-3 py-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-md flex items-center gap-2">
                      <AlertTriangle className="w-3 h-3" />
                      {error}
                    </div>
                  )}
                  
                  {recent.length === 0 && !loading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                        <Bell className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                      </div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-200">Tidak ada notifikasi</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-[180px]">Saat ada update penting, notifikasi akan muncul di sini.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {recent.slice(0, 10).map((n) => {
                          const type = String(n.type || '').toLowerCase();
                          const isFailed = String(n.status || '').toUpperCase() === 'FAILED';
                          const isUnreadItem = isUnread(n.id);
                          
                          // Determine Action & Metadata
                          const meta = (() => {
                            if (type.includes('payment_failed')) return { badgeColor: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', action: { label: 'Bayar Sekarang', href: '/billing/payments' } };
                            if (type.includes('subscription')) return { badgeColor: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', action: { label: 'Cek Paket', href: '/billing/subscriptions' } };
                            if (type.includes('billing') || type.includes('invoice')) return { badgeColor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', action: { label: 'Lihat Tagihan', href: '/billing/billings' } };
                            if (type.includes('attendance')) return { badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', action: null };
                            return { badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400', action: null };
                          })();

                          return (
                            <div
                              key={n.id}
                              onClick={() => {
                                markAsReadLocal(n.id);
                                setSelectedNotification(n);
                                setSesiDetail(null);
                                if (String(n.type || '').toUpperCase() === 'ATTENDANCE' && n.related_id) {
                                  try {
                                    setSesiLoading(true);
                                    const d = new Date(n.created_at);
                                    const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                                    getSesiAbsensiList({ tanggal: ds }).then((res) => {
                                      const arr = Array.isArray(res.data) ? res.data : [];
                                      const found = arr.find((s: any) => String(s.id) === String(n.related_id));
                                      setSesiDetail(found || null);
                                    }).finally(() => setSesiLoading(false));
                                  } catch {
                                    setSesiLoading(false);
                                  }
                                }
                                setOpen(false);
                              }}
                              className={`group relative px-4 py-3 transition-all hover:bg-white dark:hover:bg-slate-900 cursor-pointer ${isUnreadItem ? 'bg-white dark:bg-slate-900 border-l-2 border-blue-500' : 'bg-transparent border-l-2 border-transparent opacity-80 hover:opacity-100'}`}
                            >
                              <div className="flex gap-3">
                                {/* Icon Container */}
                                <div className={`flex-shrink-0 mt-0.5 w-8 h-8 rounded-full flex items-center justify-center ${isUnreadItem ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                  {getNotificationIcon(n.type, n.status)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0 space-y-0.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className={`text-xs font-medium truncate ${isUnreadItem ? 'text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`}>
                                      {cleanMessage(n.subject) || 'Notifikasi Baru'}
                                    </p>
                                    <span className="text-[10px] text-slate-400 flex-shrink-0 whitespace-nowrap">
                                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: idLocale })}
                                    </span>
                                  </div>
                                  
                                  <p className={`text-xs leading-relaxed line-clamp-2 ${isUnreadItem ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500 dark:text-slate-500'}`}>
                                    {cleanMessage(n.message)}
                                  </p>
                                  {/* Footer: Action & Status */}
                                  <div className="flex items-center justify-between pt-1.5">
                                      <div className="flex items-center gap-2">
                                        {meta.action ? (
                                           <Link 
                                             to={meta.action.href} 
                                             className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-0.5"
                                             onClick={() => markAsReadLocal(n.id)}
                                           >
                                             {meta.action.label}
                                             <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                                           </Link>
                                        ) : (
                                          <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-medium ${meta.badgeColor}`}>
                                            {n.type?.replace(/_/g, ' ')}
                                          </span>
                                        )}
                                      </div>
                                      
                                      {isUnreadItem && (
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            markAsReadLocal(n.id);
                                          }}
                                          className="text-[10px] text-slate-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          Tandai dibaca
                                        </button>
                                      )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                  {loading && (
                    <div className="px-4 py-6 text-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mx-auto mb-2"></div>
                      <p className="text-xs text-slate-500">Memuat update...</p>
                    </div>
                  )}
                </div>
                
                {/* Footer Link */}
                <div className="border-t border-slate-100 dark:border-slate-800 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl text-center">
                   <Link to="/notifications" className="text-xs font-medium text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors">
                      Lihat Semua Notifikasi
                   </Link>
                </div>
              </div>
            )}
          </div>

          {/* Date Pill (Matching reference layout) */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs border border-emerald-200/60 dark:border-emerald-800/60 shadow-2xs">
            <Calendar size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span>{formattedToday}</span>
          </div>

          <ThemeToggle />

          {/* Clean Logout Door Button */}
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shadow-2xs"
            title="Keluar / Logout"
          >
            <LogOut size={18} />
          </button>
        </div>

        {/* Notification Detail Modal */}
        <Modal
          isOpen={!!selectedNotification}
          onClose={() => setSelectedNotification(null)}
          title={cleanMessage(selectedNotification?.subject) || 'Detail Notifikasi'}
          size="md"
        >
          <div className="space-y-4">
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
      </div>
    </header>
  );
});

Topbar.displayName = 'Topbar';

