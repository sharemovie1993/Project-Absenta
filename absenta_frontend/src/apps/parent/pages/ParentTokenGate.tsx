import { useEffect, useState } from 'react';
import { Link, useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, LogOut } from 'lucide-react';
import { getParentDashboard } from '../../../api/parent.api';
import { useParentAuthStore } from '../../../store/parentAuthStore';

export default function ParentTokenGate() {
  const navigate = useNavigate();
  const location = useLocation();
  console.log('🔥🔥🔥 ParentTokenGate EXECUTED');
  console.log('🔥🔥🔥 CURRENT PATH =', location.pathname);
  console.log('🔥🔥🔥 SEARCH =', location.search);
  const [searchParams] = useSearchParams();
  const { setToken, setData } = useParentAuthStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    console.log('🔥🔥🔥 TOKEN FROM QUERY =', token);
    
    if (!token) {
      setError('Token akses tidak ditemukan.');
      setStatus('error');
      return;
    }

    const validate = async () => {
      try {
        // Temporarily set token in localStorage so API can use it
        localStorage.setItem('parent_access_token', token);
        console.log('🔥🔥🔥 TOKEN SAVED TO localStorage');
        
        const data = await getParentDashboard();
        
        setToken(token);
        setData(data);
        setStatus('success');
      } catch (err: any) {
        localStorage.removeItem('parent_access_token');
        console.error('Parent Auth Error:', err);
        const errorMsg = err.response?.data?.message || err.message || 'Token akses tidak valid atau sudah kadaluarsa.';
        setError(errorMsg);
        setStatus('error');
      }
    };

    validate();
  }, [searchParams, setToken, setData]);

  if (searchParams.get('error') === 'logout') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-slate-50 dark:bg-slate-900">
        <div className="w-16 h-16 mb-4 text-amber-500 bg-amber-100 dark:bg-amber-950/50 rounded-2xl flex items-center justify-center shadow-inner">
          <LogOut size={28} />
        </div>
        <h1 className="text-xl font-black text-slate-900 dark:text-white mb-2">Sesi Anda Telah Berakhir</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm">
          Anda telah keluar dari Portal Orang Tua. Silakan gunakan tautan terbaru dari WhatsApp sekolah atau kembali ke halaman masuk.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Link
            to="/login"
            className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm shadow-md hover:opacity-90 transition-opacity"
          >
            Ke Halaman Masuk
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-slate-50 dark:bg-slate-900">
        <div className="w-16 h-16 mb-4 text-rose-500 bg-rose-100 dark:bg-rose-950/50 rounded-2xl flex items-center justify-center shadow-inner">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-xl font-black text-slate-900 dark:text-white mb-2">Akses Ditolak</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm">{error ?? 'Link tidak valid atau sudah kedaluwarsa.'}</p>
        <p className="mt-2 text-xs text-slate-400">Silakan minta link akses baru dari sekolah atau pihak administrasi.</p>
        <div className="mt-6 flex items-center gap-3">
          <Link
            to="/login"
            className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm shadow-md hover:opacity-90 transition-opacity"
          >
            Ke Halaman Utama
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-gray-50">
        <div className="w-16 h-16 mb-4 text-green-600 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Akses Berhasil</h1>
        <p className="text-gray-600">Silakan lanjut ke dashboard.</p>
        <button
          onClick={() => navigate('/parent-app/dashboard')}
          className="mt-6 inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700"
        >
          Buka Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
      <p className="text-gray-500 font-medium">Memvalidasi akses...</p>
    </div>
  );
}
