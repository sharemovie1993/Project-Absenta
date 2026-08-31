import React, { useRef, useState, useEffect, useMemo } from 'react';
import { User, Settings, LogOut, ChevronDown, Loader, Search, MessageSquare, Bell, Moon, Sun } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { guruApi, siswaApi } from '../../api/academic.api';
import { 
  listSiswaDocuments, listGuruDocuments, 
  getMemberDocPreviewUrl 
} from '../../api/memberDocs.api';
import { useTheme } from '../../hooks/useTheme';
import { useNotifications } from '../../hooks/useNotifications';
import { internalCommunicationApi, communicationKeys } from '@/api/internal-communication.api';
import toast from 'react-hot-toast';

export interface UserMenuProps {
  onOpenTeacherLocator?: () => void;
  onOpenNotifications?: () => void;
}

export function UserMenu({ onOpenTeacherLocator, onOpenNotifications }: UserMenuProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout, isLoading } = useAuthStore();
  const { theme, toggle: toggleTheme } = useTheme();
  const { unreadCount: notifUnreadCount } = useNotifications({ pollIntervalMs: 60000 });
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const isDarkMode = theme === 'dark-default';

  // 💬 Pusat Komunikasi Unread Count
  const { data: commUnreadCount = 0 } = useQuery({
    queryKey: communicationKeys.unreadCount(),
    queryFn: () => internalCommunicationApi.getUnreadCount(),
    enabled: !!user?.id,
    staleTime: 15 * 1000,
    refetchInterval: 20 * 1000
  });

  const roleName = user?.role?.name || '';
  const isSiswa = roleName === 'SISWA';
  const isGuru = roleName === 'GURU';

  // 1. Kueri profil Guru jika user saat ini adalah guru (agar mendapatkan ID Guru yang valid untuk query berkas)
  const { data: guruProfile } = useQuery({
    queryKey: ['my-guru-profile-menu', user?.id],
    queryFn: async () => {
      const res = await guruApi.getAll({ limit: 1, ...({ user_id: user?.id } as any) });
      return res.data?.[0] || null;
    },
    enabled: isGuru && !!user?.id,
  });

  // 2. Kueri profil Siswa jika user saat ini adalah siswa (agar mendapatkan ID Siswa yang valid untuk query berkas)
  const { data: siswaProfile } = useQuery({
    queryKey: ['my-siswa-profile-menu', user?.id],
    queryFn: async () => {
      const res = await siswaApi.getAll({ limit: 1, ...({ user_id: user?.id } as any) });
      return res.data?.[0] || null;
    },
    enabled: isSiswa && !!user?.id,
  });

  const entityId = useMemo(() => {
    if (isSiswa) return siswaProfile?.id || user?.siswa_id || '';
    if (isGuru) return guruProfile?.id || user?.guru_profile?.id || '';
    return '';
  }, [isSiswa, isGuru, siswaProfile, guruProfile, user]);

  // 3. Kueri daftar berkas warga untuk mendeteksi FOTO profil yang diupload
  const { data: docsData } = useQuery({
    queryKey: [isSiswa ? 'siswa-docs' : 'guru-docs', entityId],
    queryFn: () => isSiswa ? listSiswaDocuments(entityId) : listGuruDocuments(entityId),
    enabled: !!entityId,
  });

  const docs = docsData?.data ?? [];
  const fotoDoc = useMemo(() => docs.find(d => d.kategori === 'FOTO'), [docs]);

  // 4. Bangun URL foto profil dengan token otentikasi
  const fotoUrl = useMemo(() => {
    if (!fotoDoc || !entityId) return null;
    const raw = getMemberDocPreviewUrl(isSiswa ? 'SISWA' : 'GURU', entityId, fotoDoc.id);
    const tok = localStorage.getItem('access_token');
    return raw && tok ? `${raw}?token=${encodeURIComponent(tok)}` : raw;
  }, [fotoDoc, entityId, isSiswa]);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    navigate('/login');
    toast.success('Berhasil keluar dari akun!');
  };

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" className="px-3" disabled>
        <Loader className="w-4 h-4 animate-spin mr-2" />
        <span className="hidden md:inline">Loading...</span>
      </Button>
    );
  }

  const primaryRoleLabel = useMemo(() => {
    const jabatanList: string[] = Array.isArray(guruProfile?.jabatan_list)
      ? guruProfile.jabatan_list
      : Array.isArray((user as any)?.jabatan_list)
        ? (user as any).jabatan_list
        : [];
    
    if (jabatanList.length > 0) {
      const topJabatan = jabatanList.find(j => ['KURIKULUM', 'KEPALA_SEKOLAH', 'WAKA_KURIKULUM', 'STAFF_TU', 'KESISWAAN', 'BENDAHARA'].includes(j.toUpperCase())) || jabatanList[0];
      if (topJabatan) {
        return topJabatan.toUpperCase();
      }
    }

    if (roleName === 'GURU') return 'Guru';
    if (roleName === 'SISWA') return 'Siswa';
    return user?.role?.name || 'User';
  }, [user, guruProfile, roleName]);

  const initialChar = user?.full_name?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="relative" ref={menuRef}>
      {/* User Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Menu Pengguna"
        aria-expanded={isOpen}
        className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-2xs cursor-pointer group"
      >
        {fotoUrl ? (
          <img 
            src={fotoUrl} 
            alt={user?.full_name} 
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl object-cover shadow-xs border border-slate-100 dark:border-slate-800 shrink-0" 
          />
        ) : (
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-xs shrink-0">
            {initialChar}
          </div>
        )}
        <div className="hidden md:block text-left max-w-[120px]">
          <div className="text-xs font-black text-slate-800 dark:text-slate-200 truncate leading-tight">
            {user?.full_name || 'User'}
          </div>
          <div className="text-[9px] font-black text-indigo-500 uppercase tracking-wider leading-none mt-0.5">
            {primaryRoleLabel}
          </div>
        </div>
        <ChevronDown className={cn(
          "w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform duration-200 shrink-0 hidden sm:block",
          isOpen && "rotate-180"
        )} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* User Info Header (Clickable to /dashboard?tab=profil) */}
          <div 
            onClick={() => { setIsOpen(false); navigate('/dashboard?tab=profil'); }}
            className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
            title="Buka Profil Saya"
          >
            {fotoUrl ? (
              <img 
                src={fotoUrl} 
                alt={user?.full_name} 
                className="w-10 h-10 rounded-2xl object-cover border border-slate-100 dark:border-slate-800 shadow-sm shrink-0" 
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center text-white text-sm font-black shadow-sm shrink-0">
                {initialChar}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                {user?.full_name || 'User'}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800">
                  {primaryRoleLabel}
                </span>
                <span className="text-[10px] text-slate-400 truncate">
                  {user?.username || user?.email || ''}
                </span>
              </div>
            </div>
          </div>

          {/* Menu Items List */}
          <div className="py-1.5 px-2 space-y-1">
            {/* Profil Saya */}
            <button
              onClick={() => { setIsOpen(false); navigate('/dashboard?tab=profil'); }}
              className="flex items-center w-full px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors group cursor-pointer"
            >
              <User className="w-4 h-4 mr-2.5 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
              <span>Profil Saya</span>
            </button>

            {/* 🔍 Cari Posisi Guru */}
            <button
              onClick={() => {
                setIsOpen(false);
                if (onOpenTeacherLocator) {
                  onOpenTeacherLocator();
                } else {
                  navigate('/attendance/guru-monitoring');
                }
              }}
              className="flex items-center justify-between w-full px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors group cursor-pointer"
            >
              <div className="flex items-center">
                <Search className="w-4 h-4 mr-2.5 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                <span>Cari Posisi Guru</span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400">Ctrl+G</span>
            </button>

            {/* 💬 Pusat Komunikasi */}
            <button
              onClick={() => { setIsOpen(false); navigate('/komunikasi'); }}
              className="flex items-center justify-between w-full px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors group cursor-pointer"
            >
              <div className="flex items-center">
                <MessageSquare className="w-4 h-4 mr-2.5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                <span>Pusat Komunikasi</span>
              </div>
              {commUnreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[9.5px] font-black rounded-full bg-blue-600 text-white min-w-[18px] text-center">
                  {commUnreadCount > 99 ? '99+' : commUnreadCount}
                </span>
              )}
            </button>

            {/* 🔔 Notifikasi */}
            <button
              onClick={() => {
                setIsOpen(false);
                if (onOpenNotifications) {
                  onOpenNotifications();
                } else {
                  navigate('/dashboard');
                }
              }}
              className="flex items-center justify-between w-full px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors group cursor-pointer"
            >
              <div className="flex items-center">
                <Bell className="w-4 h-4 mr-2.5 text-slate-400 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors" />
                <span>Notifikasi</span>
              </div>
              {notifUnreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[9.5px] font-black rounded-full bg-rose-500 text-white min-w-[18px] text-center">
                  {Math.min(notifUnreadCount, 99)}
                </span>
              )}
            </button>

            {/* 🌓 Mode Tema Tampilan */}
            <button
              onClick={() => {
                toggleTheme();
              }}
              className="flex items-center justify-between w-full px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors group cursor-pointer"
            >
              <div className="flex items-center">
                {isDarkMode ? (
                  <Moon className="w-4 h-4 mr-2.5 text-indigo-400" />
                ) : (
                  <Sun className="w-4 h-4 mr-2.5 text-amber-500" />
                )}
                <span>Tema: {isDarkMode ? 'Gelap' : 'Terang'}</span>
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                {isDarkMode ? '🌙 Gelap' : '☀️ Terang'}
              </span>
            </button>
            
            {/* RBAC Protected Settings Menu (Excludes SISWA) */}
            {user?.role?.name !== 'SISWA' && (user?.capabilities?.some(cap => cap.startsWith('core.system.')) || user?.role?.name === 'SUPERADMIN') && (
              <button
                onClick={() => { setIsOpen(false); navigate('/settings'); }}
                className="flex items-center w-full px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors group cursor-pointer"
              >
                <Settings className="w-4 h-4 mr-2.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors" />
                <span>Pengaturan Sistem</span>
              </button>
            )}

            <div className="border-t border-slate-100 dark:border-slate-800 my-1 mx-2"></div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-3 py-2 text-xs font-black text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors group cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2.5 text-rose-500 group-hover:translate-x-0.5 transition-transform" />
              <span>Keluar Sesi</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserMenu;

