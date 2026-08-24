import React, { useEffect, useState, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import axiosInstance from '../lib/axiosInstance';
import { InfraErrorBoundary } from '../components/superadmin/infra/InfraErrorBoundary';
import { User, Lock, Eye, EyeOff, LogIn, QrCode, Server } from 'lucide-react';
import { LoginQrScannerModal } from '../components/auth/LoginQrScannerModal';
import { ServerDomainSetupModal } from '../components/auth/ServerDomainSetupModal';
import { getSavedServerDomain } from '../services/serverConfig';
import toast from 'react-hot-toast';

const Login: React.FC = () => {
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  });
  const [localError, setLocalError] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const { loginAction, isAuthenticated, isLoading, error } = useAuthStore();
  const location = useLocation();

  const handleScanSuccess = (scannedCode: string) => {
    setCredentials(prev => ({
      ...prev,
      email: scannedCode,
    }));
  };
  
  useEffect(() => {
    const fetchTenantInfo = async () => {
      try {
        const res = await axiosInstance.get('/auth/tenant-info');
        if (res.data?.success) {
          setTenantName(res.data.data?.name || '');
        }
      } catch {}
    };
    fetchTenantInfo();
  }, []);

  // Redirect if already authenticated
  if (isAuthenticated) {
    const from = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!credentials.email || !credentials.password) {
      setLocalError('Email/NISN dan password harus diisi');
      return;
    }

    try {
      await loginAction(credentials.email, credentials.password);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || error || 'Login gagal. Periksa kembali NISN/Email dan Password Anda.';
      setLocalError(errorMessage);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <InfraErrorBoundary>
      <div className="min-h-screen relative flex items-center justify-center bg-slate-50 dark:bg-slate-950 overflow-hidden py-12 px-4 sm:px-6 lg:px-8">
        {/* Glow Spheres for Background Decoration */}
        <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-400 dark:bg-blue-600 rounded-full filter blur-[80px] opacity-30 dark:opacity-20 animate-pulse" />
        <div className="absolute bottom-0 -right-4 w-80 h-80 bg-indigo-400 dark:bg-indigo-600 rounded-full filter blur-[100px] opacity-35 dark:opacity-25 animate-pulse" />
        
        <div className="max-w-md w-full relative z-10">
          {/* Glass Card */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-8 shadow-[0_20px_50px_rgba(8,_112,_184,_0.07)] dark:shadow-[0_20px_50px_rgba(0,_0,_0,_0.3)]">
            
            {/* Header / Brand */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4 transform hover:rotate-12 transition-transform duration-300">
                <LogIn className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-center bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 dark:from-white dark:via-sky-100 dark:to-white bg-clip-text text-transparent">
                {tenantName ? tenantName : 'Absenta Portal'}
              </h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 text-center font-medium">
                Masuk untuk mengakses sistem presensi sekolah
              </p>
            </div>
            
            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Email / NISN Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="email" className="text-xs font-semibold text-slate-600 dark:text-slate-400 tracking-wide uppercase">
                    NISN / NIP / Email
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-2.5 py-1 rounded-lg transition-all"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    Scan Kartu (Kamera)
                  </button>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors duration-200" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="text"
                    required
                    className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 sm:text-sm"
                    placeholder="Masukkan NISN, NIP, atau Email Anda"
                    value={credentials.email}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Scan Kartu via Kamera"
                  >
                    <QrCode className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-semibold text-slate-600 dark:text-slate-400 tracking-wide uppercase">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors duration-200" />
                  </div>
                  <input
                    ref={passwordInputRef}
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 sm:text-sm"
                    placeholder="••••••••"
                    value={credentials.password}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error Alert */}
              {(localError || error) && (
                <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded-xl text-red-600 dark:text-red-400 text-xs font-medium leading-relaxed">
                  {localError || error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-md shadow-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Memproses masuk...
                  </div>
                ) : (
                  'Masuk ke Akun'
                )}
              </button>

              {/* Server Domain Switcher */}
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => setIsServerModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-semibold transition-all cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-slate-400">Server:</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                    {getSavedServerDomain() || (typeof window !== 'undefined' ? window.location.hostname : 'Default')}
                  </span>
                  <span className="text-blue-500 font-bold ml-1 hover:underline">Ganti</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Camera QR/Barcode Scanner Modal */}
        <LoginQrScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScanSuccess={handleScanSuccess}
        />

        {/* Server Domain Gateway / Switcher Modal */}
        <ServerDomainSetupModal
          isOpen={isServerModalOpen}
          onClose={() => setIsServerModalOpen(false)}
        />
      </div>
    </InfraErrorBoundary>
  );
};

export default Login;
