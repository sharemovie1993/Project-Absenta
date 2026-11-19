import React, { useState, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { ShieldAlert, ArrowLeft, Loader2, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

export const ImpersonationBanner: React.FC = () => {
  const { user, isImpersonating, revertImpersonationAction } = useAuthStore();
  const [isReverting, setIsReverting] = useState(false);

  // Check if original admin backup exists in localStorage
  const originalSession = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('absenta_original_admin_session');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, [isImpersonating]);

  // If not impersonating and no backup session, render nothing
  if (!isImpersonating && !originalSession && !user?.is_impersonated) {
    return null;
  }

  const adminName = originalSession?.impersonator?.name || originalSession?.user?.full_name || 'Admin';
  const teacherName = user?.full_name || user?.name || 'Guru';
  const teacherNip = user?.guru_profile?.nip || '';
  const teacherRole = user?.role?.name || 'GURU';

  const handleRevert = async () => {
    try {
      setIsReverting(true);
      toast.loading('Mengembalikan sesi Administrator...', { id: 'revert-impersonate' });
      await revertImpersonationAction();
      toast.success(`Kembali ke sesi Admin ${adminName}`, { id: 'revert-impersonate' });
    } catch (err: any) {
      toast.error(err.message || 'Gagal kembali ke akun admin', { id: 'revert-impersonate' });
      setIsReverting(false);
    }
  };

  return (
    <div className="sticky top-14 lg:top-16 z-30 mb-3 -mt-1 sm:-mt-0 rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white shadow-lg border border-amber-400/40 px-3.5 sm:px-5 py-2.5 sm:py-3 animate-in slide-in-from-top-3 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Sisi Kiri: Status Impersonasi & Profil Guru */}
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="p-2 bg-white/20 backdrop-blur-xs rounded-xl shrink-0 shadow-inner mt-0.5 sm:mt-0">
            <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/25 text-amber-100 border border-white/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Mode Impersonasi Guru
              </span>
              <span className="text-[11px] text-amber-100/90 font-medium hidden sm:inline">
                (Login oleh Admin: <strong className="text-white">{adminName}</strong>)
              </span>
            </div>
            <div className="text-xs sm:text-sm font-medium text-white/95 truncate mt-0.5">
              Anda sedang melihat sistem sebagai: <strong className="font-black text-amber-100 underline decoration-amber-300 underline-offset-2">{teacherName}</strong>
              {teacherNip ? (
                <span className="text-xs text-amber-200/90 ml-1.5 font-mono">[{teacherNip}]</span>
              ) : (
                <span className="text-xs text-amber-200/90 ml-1.5">({teacherRole})</span>
              )}
            </div>
          </div>
        </div>

        {/* Sisi Kanan: Tombol Kembali ke Admin */}
        <div className="flex items-center justify-end shrink-0">
          <Button
            size="sm"
            onClick={handleRevert}
            disabled={isReverting}
            className="w-full sm:w-auto bg-white text-amber-950 hover:bg-amber-50 active:scale-95 font-black text-xs px-4 py-2 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer border-none"
          >
            {isReverting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Mengalihkan...</span>
              </>
            ) : (
              <>
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali ke Akun Admin</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ImpersonationBanner;
