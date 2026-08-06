import React, { useRef, useState, useEffect, useMemo } from 'react';
import { User, Settings, LogOut, ChevronDown, Loader } from 'lucide-react';
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

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout, isLoading } = useAuthStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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
  };

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" className="px-3" disabled>
        <Loader className="w-4 h-4 animate-spin mr-2" />
        <span className="hidden md:inline">Loading...</span>
      </Button>
    );
  }

  const initialChar = user?.full_name?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="relative" ref={menuRef}>
      {/* User Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Menu Pengguna"
        aria-expanded={isOpen}
        className="flex items-center space-x-2 px-2.5 h-9 rounded-xl border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 transition-all"
      >
        {fotoUrl ? (
          <img 
            src={fotoUrl} 
            alt={user?.full_name} 
            className="w-7 h-7 rounded-full object-cover shadow-sm border border-slate-100 dark:border-slate-800" 
          />
        ) : (
          <div className="w-7 h-7 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-full flex items-center justify-center text-white text-xs font-black shadow-sm">
            {initialChar}
          </div>
        )}
        <div className="hidden md:block text-left max-w-[120px]">
          <div className="text-xs font-black text-slate-800 dark:text-slate-200 truncate leading-tight">
            {user?.full_name || 'User'}
          </div>
          <div className="text-[9px] font-black text-indigo-500 uppercase tracking-wider leading-none mt-0.5">
            {roleName === 'GURU' ? 'Guru' : (roleName === 'SISWA' ? 'Siswa' : user?.role?.name || 'User')}
          </div>
        </div>
        <ChevronDown className={cn(
          "w-3.5 h-3.5 text-slate-400 transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-850 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-slate-50 dark:border-slate-800/60 flex items-center gap-3">
            {fotoUrl ? (
              <img 
                src={fotoUrl} 
                alt={user?.full_name} 
                className="w-9 h-9 rounded-full object-cover border border-slate-100 dark:border-slate-800 shadow-sm" 
              />
            ) : (
              <div className="w-9 h-9 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-full flex items-center justify-center text-white text-sm font-black shadow-sm">
                {initialChar}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-xs font-black text-slate-850 dark:text-white truncate">
                {user?.full_name || 'User'}
              </div>
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                {user?.role?.name || 'SISWA'}
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1 px-1.5 space-y-0.5">
            <button
              onClick={() => { setIsOpen(false); navigate('/profile'); }}
              className="flex items-center w-full px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <User className="w-3.5 h-3.5 mr-2.5 text-slate-400" />
              Profil Saya
            </button>
            
            {/* RBAC Protected Settings Menu (Excludes SISWA) */}
            {user?.role?.name !== 'SISWA' && (user?.capabilities?.some(cap => cap.startsWith('core.system.')) || user?.role?.name === 'SUPERADMIN') && (
              <button
                onClick={() => { setIsOpen(false); navigate('/settings'); }}
                className="flex items-center w-full px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <Settings className="w-3.5 h-3.5 mr-2.5 text-slate-400" />
                Pengaturan Sistem
              </button>
            )}

            <div className="border-t border-slate-50 dark:border-slate-800/60 my-1 mx-2.5"></div>

            <button
              onClick={handleLogout}
              className="flex items-center w-full px-3 py-2 text-xs font-bold text-red-650 hover:bg-red-50/50 dark:hover:bg-red-950/20 rounded-xl transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 mr-2.5 text-red-400" />
              Keluar Sesi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
