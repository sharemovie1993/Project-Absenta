import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Moon, 
  Sun, 
  Bell, 
  Search, 
  Settings, 
  LogOut, 
  X, 
  ChevronRight,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/hooks/useTheme';
import { useNotifications } from '@/hooks/useNotifications';
import { useSiswaMe } from '@/hooks/useSiswaMe';
import { useGuruMe } from '@/hooks/useGuruMe';
import { resolveProfilePhotoUrl, cn } from '@/lib/utils';
import { ConfirmModal } from '@/components/ui/Modal';
import toast from 'react-hot-toast';

export interface MobileAccountSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTeacherLocator?: () => void;
  onOpenNotifications?: () => void;
}

export const MobileAccountSheet: React.FC<MobileAccountSheetProps> = ({
  isOpen,
  onClose,
  onOpenTeacherLocator,
  onOpenNotifications,
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { theme, toggle: toggleTheme } = useTheme();
  const { unreadCount: notifUnreadCount } = useNotifications({ pollIntervalMs: 60000 });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const isDarkMode = theme === 'dark-default';
  const roleName = user?.role?.name || '';
  const isSiswa = roleName === 'SISWA';
  const isGuru = roleName === 'GURU';

  const { siswaProfile } = useSiswaMe();
  const { guruProfile } = useGuruMe();

  const rawPhoto = useMemo(() => {
    if ((user as any)?.foto) return (user as any).foto;
    if ((user as any)?.foto_url) return (user as any).foto_url;
    if ((user as any)?.avatar) return (user as any).avatar;
    if (isSiswa) {
      if (siswaProfile?.foto) return siswaProfile.foto;
      if ((siswaProfile as any)?.foto_url) return (siswaProfile as any).foto_url;
    }
    if (isGuru) {
      if (guruProfile?.foto) return guruProfile.foto;
      if ((guruProfile as any)?.foto_url) return (guruProfile as any).foto_url;
    }
    return null;
  }, [user, isSiswa, isGuru, siswaProfile, guruProfile]);

  const fotoUrl = rawPhoto ? resolveProfilePhotoUrl(rawPhoto) : null;
  const initialChar = (user?.full_name || (user as any)?.name || 'U').charAt(0).toUpperCase();

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
    return user?.role?.name || 'Pengguna';
  }, [user, guruProfile, roleName]);

  const handleLogout = () => {
    logout();
    onClose();
    setShowLogoutConfirm(false);
    navigate('/login');
    toast.success('Berhasil keluar dari akun!');
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
            />

            {/* Bottom Sheet Modal Container */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="relative z-50 w-full bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200/80 dark:border-slate-800 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
            >
              {/* Sheet Drag Pill & Header */}
              <div className="pt-3 pb-2 px-4 flex flex-col items-center border-b border-slate-100 dark:border-slate-800/80">
                <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mb-3" />
                <div className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                      Akun Saya &amp; Sesi
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Sheet Body Content */}
              <div className="p-4 space-y-4 overflow-y-auto no-scrollbar pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
                {/* 1. Identity Card */}
                <div 
                  onClick={() => {
                    onClose();
                    navigate('/dashboard?tab=profil');
                  }}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                >
                  {fotoUrl ? (
                    <img 
                      src={fotoUrl} 
                      alt={user?.full_name} 
                      className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs shrink-0" 
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center text-white text-base font-black shadow-xs shrink-0">
                      {initialChar}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">
                      {user?.full_name || 'Pengguna'}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="px-2 py-0.5 rounded-md text-[9.5px] font-black bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {primaryRoleLabel}
                      </span>
                      <span className="text-[11px] text-slate-400 truncate">
                        {user?.username || user?.email || ''}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>

                {/* 2. Menu Quick Actions List */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden shadow-xs">
                  {/* Mode Tema: Terang / Gelap */}
                  <div 
                    onClick={toggleTheme}
                    className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-indigo-950/60 text-amber-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        {isDarkMode ? <Moon size={16} /> : <Sun size={16} />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Mode Tema Tampilan
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {isDarkMode ? 'Mode Gelap (Hemat daya)' : 'Mode Terang (Standar)'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10.5px] font-extrabold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                      {isDarkMode ? '🌙 Gelap' : '☀️ Terang'}
                    </span>
                  </div>

                  {/* Notifikasi */}
                  <div 
                    onClick={() => {
                      onClose();
                      if (onOpenNotifications) {
                        onOpenNotifications();
                      } else {
                        navigate('/dashboard');
                      }
                    }}
                    className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Bell size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Pusat Notifikasi
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Peringatan KBM, izin &amp; pengumuman
                        </p>
                      </div>
                    </div>
                    {notifUnreadCount > 0 ? (
                      <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-rose-500 text-white min-w-[20px] text-center shadow-xs">
                        {Math.min(notifUnreadCount, 99)}
                      </span>
                    ) : (
                      <ChevronRight size={16} className="text-slate-400" />
                    )}
                  </div>

                  {/* Cari Posisi Guru (Teacher Locator) */}
                  <div 
                    onClick={() => {
                      onClose();
                      if (onOpenTeacherLocator) {
                        onOpenTeacherLocator();
                      } else {
                        navigate('/attendance/guru-monitoring');
                      }
                    }}
                    className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Search size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Cari Posisi Guru
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Monitoring kelas &amp; lokasi jam mengajar
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-400" />
                  </div>

                  {/* Pengaturan Sistem (Admin/Superadmin) */}
                  {user?.role?.name !== 'SISWA' && (user?.capabilities?.some(cap => cap.startsWith('core.system.')) || user?.role?.name === 'SUPERADMIN') && (
                    <div 
                      onClick={() => {
                        onClose();
                        navigate('/settings');
                      }}
                      className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                          <Settings size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Pengaturan Sistem
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Konfigurasi aplikasi &amp; hak akses
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-400" />
                    </div>
                  )}

                  {/* Buka Biodata / Profil Lengkap */}
                  <div 
                    onClick={() => {
                      onClose();
                      navigate('/dashboard?tab=profil');
                    }}
                    className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <User size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Biodata &amp; Berkas Pribadi
                        </p>
                        <p className="text-[10px] text-slate-400">
                          NIP, NIK, KK, SK &amp; dokumen kepegawaian
                        </p>
                      </div>
                    </div>
                    <ExternalLink size={15} className="text-slate-400" />
                  </div>
                </div>

                {/* 3. Tombol Logout (Keluar Sesi) Tegas Merah */}
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-full py-3 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200/80 dark:border-rose-900/70 text-rose-600 dark:text-rose-400 flex items-center justify-center gap-2 text-xs font-black transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                >
                  <LogOut size={16} />
                  <span>Keluar dari Akun (Logout)</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Dialog Konfirmasi Logout */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Konfirmasi Keluar Sesi"
        message="Apakah Anda yakin ingin keluar dari akun Absenta? Anda harus masuk kembali untuk mengakses fitur sistem."
        confirmText="Ya, Keluar"
        cancelText="Batal"
        variant="danger"
      />
    </>
  );
};
