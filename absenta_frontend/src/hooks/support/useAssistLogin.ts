import { useState } from 'react';
import toast from 'react-hot-toast';
import axiosInstance from '../../lib/axiosInstance';

export function useAssistLogin() {
  const [isAssistLoading, setIsAssistLoading] = useState(false);

  const handleAssistLogin = async (tenantId: string, tenantName: string) => {
    setIsAssistLoading(true);
    const toastId = toast.loading(`Menyiapkan mode asisten untuk ${tenantName}...`);
    try {
      // 1. Dapatkan state zustand persist asli untuk dicadangkan
      const currentStorage = localStorage.getItem('auth-storage');
      if (currentStorage) {
        localStorage.setItem('support_auth_state', currentStorage);
      }

      // 2. Hubungi backend untuk melakukan impersonate (assist login)
      const response = await axiosInstance.post('/auth/impersonate', { tenantId });
      
      if (response.data && response.data.success) {
        const { user: impersonatedUser, token, refreshToken } = response.data.data;

        // 3. Simpan token-token ke local storage standar
        localStorage.setItem('access_token', token);
        localStorage.setItem('refresh_token', refreshToken);
        if (impersonatedUser.tenant_id) {
          localStorage.setItem('tenant_id', impersonatedUser.tenant_id);
        }

        // 4. Tulis langsung sesi asisten baru ke 'auth-storage' secara atomik
        const newAuthStorage = {
          state: {
            isAuthenticated: true,
            user: impersonatedUser,
            subscription: null,
            token: token,
            refreshToken: refreshToken,
            tenantId: impersonatedUser.tenant_id || null,
            tenantMode: impersonatedUser.tenant?.absensi_mode ?? null
          },
          version: 0
        };
        localStorage.setItem('auth-storage', JSON.stringify(newAuthStorage));

        toast.success(`Berhasil assist login sebagai Admin "${tenantName}"`, { id: toastId });
        
        // 5. Alihkan ke dasbor sekolah target secara instan
        window.location.href = '/';
      } else {
        toast.error(response.data?.message || 'Gagal menyiapkan sesi bantuan', { id: toastId });
      }
    } catch (err: any) {
      console.error('Assist login error:', err);
      const msg = err.response?.data?.message || err.message || 'Gagal terhubung ke server';
      toast.error(msg, { id: toastId });
    } finally {
      setIsAssistLoading(false);
    }
  };

  return {
    handleAssistLogin,
    isAssistLoading
  };
}
