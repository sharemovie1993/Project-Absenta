import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button, Input } from '@/components/ui';
import axiosInstance from '@/lib/axiosInstance';
import { type SystemConfig } from '@/services/systemConfig';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ShieldCheck, ArrowRight, AlertCircle, Home, UserCheck, Smartphone, Sparkles, QrCode } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { InfraErrorBoundary } from '../../components/superadmin/infra/InfraErrorBoundary';
import { LoginQrScannerModal } from '@/components/auth/LoginQrScannerModal';
import { DemoRoleSelector } from '@/components/auth/DemoRoleSelector';
import { type DemoRoleProfile } from '@/config/demoProfiles.config';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [localError, setLocalError] = useState('');
  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [resendMessage, setResendMessage] = useState<string>('');
  const [tenantName, setTenantName] = useState('');
  const [tenantLogo, setTenantLogo] = useState<string | null>(null);
  const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);
  const [tenantIdDev, setTenantIdDev] = useState<string>('');
  const [devTenants, setDevTenants] = useState<Array<{ id: string; name: string; domain?: string | null }>>([]);
  const [devTenantsLoading, setDevTenantsLoading] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Demo Mode Detection: Active on demo.absenta.id, ?demo=1, VITE_DEMO_MODE=true, or local dev mode
  const isDemoEnvironment = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const hn = window.location.hostname.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const isExplicitDemoParam = params.get('demo') === '1' || params.get('demo') === 'true';
    const isDemoDomain = hn.includes('demo') || hn.startsWith('demo.');
    const isEnvDemo = String(import.meta.env.VITE_DEMO_MODE || '').toLowerCase() === 'true';
    const isDev = Boolean(
      import.meta.env.DEV ||
      import.meta.env.MODE !== 'production' ||
      hn === 'localhost' ||
      hn === '127.0.0.1' ||
      hn.endsWith('.local') ||
      String(import.meta.env.VITE_DEV_MODE || '').toLowerCase() === 'true'
    );
    return isExplicitDemoParam || isDemoDomain || isEnvDemo || isDev;
  }, []);

  const [showManualLogin, setShowManualLogin] = useState(false);
  const [activeLoadingRoleId, setActiveLoadingRoleId] = useState<string | null>(null);

  const handleScanSuccess = (scannedCode: string) => {
    setCredentials(prev => ({
      ...prev,
      email: scannedCode,
    }));
  };

  const { loginAction, isAuthenticated, isLoading, error, user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const [backendNodeId, setBackendNodeId] = useState<string | null>(null);
  const [hideRegisterLink, setHideRegisterLink] = useState(false);

  const features = useMemo(() => [
    { title: "Presensi Wajah AI & Geolokasi", desc: "Verifikasi kehadiran menggunakan pendeteksian wajah cerdas dan geofencing lokasi presisi." },
    { title: "Notifikasi Otomatis Orang Tua", desc: "Pemberitahuan real-time langsung ke WhatsApp saat siswa masuk, izin, sakit, atau alpa." },
    { title: "Portal Keuangan Terintegrasi", desc: "Kemudahan pengelolaan SPP, tagihan otomatis, dan pembayaran via Payment Gateway." },
    { title: "Satu Dasbor Akademik Terpadu", desc: "Akses komprehensif untuk nilai, jadwal KBM, e-raport, data siswa, dan guru." },
    { title: "Keamanan Enkripsi End-to-End", desc: "Perlindungan data sensitif institusi secara aman dengan standar keamanan tingkat tinggi." }
  ], []);

  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveFeatureIndex(prev => (prev + 1) % features.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [features.length]);

  useEffect(() => {
    const initData = async () => {
      try {
        const res = await axiosInstance.get('/auth/registration-preset');
        if (res.data?.success) {
          const preset = res.data.data;
          if (preset.is_single_tenant) {
            if (preset.is_registered) {
              setHideRegisterLink(true);
            } else {
              navigate('/register-tenant', { replace: true });
              return;
            }
          }
        }
      } catch (err) {
        console.warn('[LoginPage] Gagal memuat status registrasi preset:', err);
      }
      // ── Stale localStorage Guard (on real domain) ───────────────────────
      // When the browser visits smp4.absenta.id but localStorage still holds
      // tenant_domain='t.absenta.id' from a previous session, the system config
      // API will receive X-Tenant-Domain: t and return SMKN1PLERED branding.
      // Clear stale tenant-specific items early, before ANY API call, so the
      // Navbar and system-config load with a clean slate.
      try {
        const hn = window.location.hostname;
        const hnParts = hn.split('.');
        const hnSub = hnParts.length >= 3 ? hnParts[0].toLowerCase() : '';
        const storedDomain = localStorage.getItem('tenant_domain') || '';
        const storedSub = storedDomain.includes('.') ? storedDomain.split('.')[0] : storedDomain;
        if (hnSub && storedSub && hnSub !== storedSub) {
          localStorage.removeItem('tenant_domain');
          localStorage.removeItem('active_system_config');
        }
      } catch {}
      // ─────────────────────────────────────────────────────────────────────

      try {
        const cached = localStorage.getItem('active_system_config');
        if (cached) setSysConfig(JSON.parse(cached));
      } catch {}

      try {
        const hostname = window.location.hostname;
        const isIP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname);
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local');
        
        if (!isIP && !isLocalhost) {
          const res = await axiosInstance.get('/auth/tenant-info');
          if (res.data?.success) {
            setTenantName(res.data.data?.name || '');
            setTenantLogo(res.data.data?.logo_url || null);
          }
        }
      } catch (e) {}
      
      try {
        const nodeId = (window as any).__BACKEND_NODE_ID__;
        if (nodeId) setBackendNodeId(String(nodeId));
      } catch {}

      const isDev = String(import.meta.env.VITE_DEV_MODE || '').toLowerCase() === 'true' && import.meta.env.MODE !== 'production';
      // Only show dev tenant selector when running on localhost.
      // When accessed via a real domain (e.g. smp4.absenta.id), the tenant
      // is already determined by the domain — no need for the dropdown, and
      // calling /auth/dev/tenants would 403 (backend rejects non-localhost hosts).
      const hostnameNow = window.location.hostname;
      const isLocalhostNow = hostnameNow === 'localhost' || hostnameNow === '127.0.0.1' || hostnameNow.endsWith('.local');
      if (isDev && isLocalhostNow) {
        setDevTenantsLoading(true);
        try {
          const res = await axiosInstance.get('/auth/dev/tenants');
          if (res.data?.success) setDevTenants(res.data.data);
          
          // Auto-select from URL param
          const params = new URLSearchParams(window.location.search);
          const tid = params.get('tenantId');
          if (tid) setTenantIdDev(tid);
        } catch {}
        setDevTenantsLoading(false);
      }
    };
    initData();
  }, []);

  if (isAuthenticated) {
    const sub = useAuthStore.getState().subscription;
    const isGerbang = (user as any)?.position_codes?.includes('GERBANG');
    const defaultHome = isGerbang ? '/attendance/ops' : '/dashboard';
    const hasCompletedOnboarding = useAuthStore.getState().hasCompletedOnboarding;
    
    const roleName = user?.role?.name || (user as any)?.roleName || '';
    const isAdminOrSuperadmin = roleName === 'SUPERADMIN' || roleName === 'ADMIN';
    
    // Redirect to onboarding if not completed yet (only for admins)
    const target = (sub?.status === 'PENDING_PAYMENT') 
      ? '/billing' 
      : (!hasCompletedOnboarding && isAdminOrSuperadmin ? '/onboarding' : (location.state?.from?.pathname || defaultHome));
      
    return <Navigate to={target} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    try {
      const isDevMode = String(import.meta.env.VITE_DEV_MODE || '').toLowerCase() === 'true' && import.meta.env.MODE !== 'production';
      const isLocalhostLogin = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      // Only pass tenantIdDev when on localhost (dev dropdown). When accessed via real domain, 
      // the backend resolves the tenant from the Host header automatically.
      const devTenantArg = (isDevMode && isLocalhostLogin && tenantIdDev.trim()) ? tenantIdDev.trim() : undefined;
      await loginAction(credentials.email, credentials.password, devTenantArg);
    } catch (err) {
      const errorObj = err as { response?: { data?: { message?: string; reason?: string; redirectUrl?: string; tenantName?: string; tenantDomain?: string }; status?: number }; message?: string };
      const data = errorObj?.response?.data;
      if (errorObj?.response?.status === 403 && String(data?.reason).toUpperCase() === 'REDIRECT_REQUIRED' && data?.redirectUrl) {
        navigate('/subdomain-redirect', { replace: true, state: { redirectUrl: data.redirectUrl, tenantName: data.tenantName, tenantDomain: data.tenantDomain } });
        return;
      }
      setLocalError(data?.message || errorObj.message || 'Gagal masuk');
    }
  };

  const handleDemoRoleLogin = async (profile: DemoRoleProfile) => {
    setActiveLoadingRoleId(profile.id);
    setLocalError('');
    try {
      const isDevMode = String(import.meta.env.VITE_DEV_MODE || '').toLowerCase() === 'true' && import.meta.env.MODE !== 'production';
      const isLocalhostLogin = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const devTenantArg = (isDevMode && isLocalhostLogin && tenantIdDev.trim()) ? tenantIdDev.trim() : undefined;

      sessionStorage.setItem('is_demo_session', 'true');
      sessionStorage.setItem('demo_active_role', profile.title);
      sessionStorage.setItem('demo_active_name', profile.simulatedName);

      // Jika profil Orang Tua -> Gunakan Magic Token Access
      if (profile.roleCode === 'ORANG_TUA' || profile.id === 'demo-ortu') {
        const parentMagicToken = 'absenta-demo-parent-magic-token-2026';
        localStorage.setItem('parent_access_token', parentMagicToken);
        toast.success(`Selamat datang, ${profile.simulatedName}!`, { id: 'demo-login' });
        window.location.href = `/parent-app?token=${parentMagicToken}`;
        return;
      }

      toast.loading(`Masuk sebagai ${profile.title}...`, { id: 'demo-login' });
      await loginAction(profile.email, profile.password || 'password123', devTenantArg);
      toast.success(`Selamat datang, ${profile.simulatedName}!`, { id: 'demo-login' });
    } catch (err: any) {
      toast.dismiss('demo-login');
      const data = err?.response?.data;
      setLocalError(data?.message || err?.message || 'Gagal menghubungkan sesi demo');
      setActiveLoadingRoleId(null);
    }
  };

  const handleResendVerification = async () => {
    setResendStatus('loading');
    setResendMessage('');
    try {
      if (!credentials.email) { setResendStatus('error'); setResendMessage('Mohon isi email Anda.'); return; }
      const res = await (await import('../../api/auth.api')).resendVerification(credentials.email);
      if (res.success) {
        setResendStatus('sent');
        setResendMessage('Email verifikasi terkirim. Cek inbox/spam.');
      } else {
        setResendStatus('error');
        setResendMessage(res.message || 'Gagal kirim ulang.');
      }
    } catch (err) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setResendStatus('error');
      setResendMessage(errorObj?.response?.data?.message || 'Gagal kirim ulang.');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.4, ease: "easeOut" as any } }
  };

  const itemVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  // ── FULL-WIDTH DESKTOP BENTO APP LAUNCHER MODE UNTUK DEMO ──
  if (isDemoEnvironment && !showManualLogin) {
    return (
      <InfraErrorBoundary>
        <main className="min-h-screen w-full bg-gradient-to-tr from-slate-50 via-slate-50/70 to-blue-50/20 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 font-sans selection:bg-amber-100 overflow-x-hidden relative">
          <Navbar />

          {/* Background Ambient Glows */}
          <div className="absolute top-1/4 right-1/4 w-[36rem] h-[36rem] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none dark:bg-amber-600/5" />
          <div className="absolute bottom-1/4 left-1/4 w-[32rem] h-[32rem] bg-blue-500/10 rounded-full blur-[140px] pointer-events-none dark:bg-blue-600/5" />

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-22 pb-16 relative z-10">
            <DemoRoleSelector
              onSelectRole={handleDemoRoleLogin}
              isLoading={isLoading}
              activeLoadingRoleId={activeLoadingRoleId}
              onToggleManualLogin={() => setShowManualLogin(true)}
            />
          </div>
        </main>
      </InfraErrorBoundary>
    );
  }

  return (
    <InfraErrorBoundary>
      <main className="min-h-screen w-full flex flex-col md:flex-row bg-white dark:bg-slate-950 font-sans selection:bg-blue-100 overflow-x-hidden">
        <Navbar />
        
        {/* Left side: Immersive Branding */}
        <div className="w-full md:w-[45%] xl:w-[40%] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-8 sm:p-12 lg:p-16 flex-col justify-between relative overflow-hidden min-h-[45vh] md:min-h-screen hidden md:flex">
          {/* Glowing gradient mesh background */}
          <div className="absolute inset-0 bg-mesh opacity-20 pointer-events-none" />
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="relative z-10 pt-16 lg:pt-24 flex-grow flex flex-col justify-center">
             <motion.div
               initial={{ opacity: 0, y: 15 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.5 }}
               className="max-w-md"
             >
                <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center mb-8 border border-white/20 shadow-2xl">
                   <ShieldCheck className="w-7 h-7 text-blue-400" />
                </div>
                <h2 className="text-3xl lg:text-4xl xl:text-5xl font-black mb-6 tracking-tight leading-tight">
                  Akses <span className="text-blue-400">Pusat Kendali</span> Akademik.
                </h2>
                <p className="text-sm lg:text-base text-slate-400 leading-relaxed mb-10">
                  Gunakan identitas digital resmi institusi Anda untuk mulai mengelola data akademik, absensi cerdas, dan laporan keuangan secara terpadu.
                </p>
  
                {/* Rotating Feature Carousel */}
                <div className="relative min-h-[140px] border-t border-white/10 pt-8 mt-10">
                   <AnimatePresence mode="wait">
                      <motion.div
                         key={activeFeatureIndex}
                         initial={{ opacity: 0, x: 20 }}
                         animate={{ opacity: 1, x: 0 }}
                         exit={{ opacity: 0, x: -20 }}
                         transition={{ duration: 0.4, ease: 'easeInOut' }}
                         className="space-y-2.5"
                      >
                         <h4 className="text-md font-black text-blue-400 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                            {features[activeFeatureIndex].title}
                         </h4>
                         <p className="text-xs lg:text-sm text-slate-400 leading-relaxed">
                            {features[activeFeatureIndex].desc}
                         </p>
                      </motion.div>
                   </AnimatePresence>
                   
                   {/* Carousel Dots */}
                   <div className="flex gap-2 mt-6">
                      {features.map((_, i) => (
                         <button
                            key={i}
                            onClick={() => setActiveFeatureIndex(i)}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                               i === activeFeatureIndex ? 'w-6 bg-blue-500' : 'w-1.5 bg-slate-700'
                            }`}
                         />
                      ))}
                   </div>
                </div>
             </motion.div>
          </div>
  
          <div className="relative z-10 text-[9px] uppercase font-black tracking-widest text-slate-500 items-center gap-3 mt-12 hidden lg:flex">
             <span>{sysConfig?.app_name || 'Absenta'} Infrastructure</span>
             <div className="w-1 h-1 rounded-full bg-slate-700" />
             <span>Trusted by 500+ Institutions</span>
          </div>
        </div>
  
        {/* Right side: Login Form */}
        <div className="flex-1 flex flex-col bg-gradient-to-tr from-slate-50 via-slate-50/70 to-blue-50/20 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 items-center justify-center p-4 sm:p-8 lg:p-12 min-h-screen relative overflow-hidden">
           {/* Background gradient spheres */}
           <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none dark:bg-blue-600/5" />
           <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none dark:bg-indigo-600/5" />

           <motion.div
             variants={containerVariants}
             initial="hidden"
             animate="visible"
             className="w-full max-w-lg bg-white/85 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] p-6 sm:p-8 lg:p-10 shadow-2xl shadow-slate-200/30 dark:shadow-none border border-white/50 dark:border-slate-800/40 relative z-10"
           >
             {isDemoEnvironment && !showManualLogin ? (
               <DemoRoleSelector
                 onSelectRole={handleDemoRoleLogin}
                 isLoading={isLoading}
                 activeLoadingRoleId={activeLoadingRoleId}
                 onToggleManualLogin={() => setShowManualLogin(true)}
               />
             ) : (
               <>
                 <div className="flex flex-col items-center lg:items-start text-center lg:text-left mb-6">
                   {tenantLogo ? (
                     <motion.img 
                       initial={{ opacity: 0, scale: 0.8 }}
                       animate={{ opacity: 1, scale: 1 }}
                       src={tenantLogo} 
                       alt={tenantName} 
                       className="w-16 h-16 object-contain mb-4 rounded-xl bg-slate-50 p-2 border border-slate-100 dark:border-slate-800"
                     />
                   ) : (
                     <motion.img 
                       initial={{ opacity: 0, scale: 0.8 }}
                       animate={{ opacity: 1, scale: 1 }}
                       src="/logo.png" 
                       alt="Absenta Logo" 
                       className="w-16 h-16 object-contain mb-4 rounded-xl bg-slate-50 p-2 border border-slate-100 dark:border-slate-800"
                     />
                   )}
     
                   <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                      Selamat Datang{tenantName ? `,` : ''}
                   </h1>
                   <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                      {tenantName ? `Silakan masuk ke portal ${tenantName}` : 'Masukkan kredensial Anda untuk melanjutkan ke portal sekolah.'}
                   </p>
                 </div>

                 {isDemoEnvironment && (
                   <div className="mb-4">
                     <button
                       type="button"
                       onClick={() => setShowManualLogin(false)}
                       className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-xs hover:shadow-md transition-all cursor-pointer"
                     >
                       <Sparkles className="w-4 h-4" />
                       <span>Gunakan 1-Click Demo Login (Pilih Peran)</span>
                     </button>
                   </div>
                 )}
     
                 <form onSubmit={handleSubmit} className="space-y-4">
                     <motion.div variants={itemVariants} transition={{ delay: 0.1 }}>
                       <div className="flex justify-between items-center mb-1.5 ml-1">
                           <label htmlFor="loginEmail" className="text-xs font-bold text-slate-400 uppercase tracking-widest block">NIP / NISN / Email Sekolah</label>
                           <button
                             type="button"
                             onClick={() => setIsScannerOpen(true)}
                             className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-2.5 py-1 rounded-lg transition-all"
                           >
                             <QrCode className="w-3.5 h-3.5" />
                             Scan Kartu (Kamera)
                           </button>
                       </div>
                       <Input 
                           id="loginEmail"
                           type="text"
                           required
                           size="auth"
                           leftIcon={<Mail />}
                           value={credentials.email}
                           onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                           placeholder="Masukkan NIP, NISN atau Email Anda"
                       />
                     </motion.div>
     
                     <motion.div variants={itemVariants} transition={{ delay: 0.2 }}>
                       <div className="flex justify-between items-center mb-1.5 ml-1">
                           <label htmlFor="loginPassword" className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Kata Sandi</label>
                       </div>
                       <Input 
                           id="loginPassword"
                           type="password"
                           required
                           size="auth"
                           leftIcon={<Lock />}
                           value={credentials.password}
                           onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                           placeholder="••••••••••••"
                       />
                     </motion.div>
     
                     <div className="flex items-center justify-between py-1">
                       <label className="flex items-center gap-2 cursor-pointer">
                           <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                           <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Ingat saya</span>
                       </label>
                       <button type="button" onClick={() => navigate('/login/forgot-password')} className="text-xs font-bold text-blue-600 hover:underline">Lupa kata sandi?</button>
                     </div>
     
                     {devTenants.length > 0 && (
                       <motion.div variants={itemVariants} transition={{ delay: 0.3 }} className="space-y-1.5 pt-2">
                         <label className="text-xs font-bold text-amber-600 uppercase tracking-wider block">Developer: Target Tenant</label>
                         <SearchableSelect
                           options={devTenants.map(t => ({
                             value: t.id,
                             label: t.name,
                             sublabel: t.domain ? `${t.domain}` : undefined,
                           }))}
                           value={tenantIdDev}
                           onValueChange={(val) => setTenantIdDev(val || '')}
                           placeholder={devTenantsLoading ? 'Memuat...' : 'Cari tenant...'}
                           triggerClassName="w-full h-14 rounded-xl border-2 border-slate-100 bg-slate-50 text-slate-900 font-bold"
                         />
                       </motion.div>
                     )}
     
                     <AnimatePresence>
                       {(error || localError) && (
                         <motion.div 
                           initial={{ opacity: 0, scale: 0.95 }}
                           animate={{ opacity: 1, scale: 1 }}
                           exit={{ opacity: 0, scale: 0.95 }}
                           className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-4 rounded-xl"
                         >
                           <div className="flex items-start gap-3">
                             <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                             <div className="flex-1">
                                 <p className="text-sm font-bold text-red-700 dark:text-red-400 leading-tight">{error || localError}</p>
                                 {String(error || localError).toLowerCase().includes('belum diverifikasi') && (
                                   <button 
                                     type="button" 
                                     onClick={handleResendVerification}
                                     disabled={resendStatus === 'loading'}
                                     className="mt-2 text-xs font-black uppercase text-red-800 dark:text-red-300 hover:underline"
                                   >
                                     {resendStatus === 'loading' ? 'Mengirim...' : 'Kirim Ulang Email Verifikasi'}
                                   </button>
                                 )}
                                 {resendMessage && <p className="mt-1 text-xs text-blue-600 dark:text-blue-400 font-bold">{resendMessage}</p>}
                             </div>
                           </div>
                         </motion.div>
                       )}
                     </AnimatePresence>
     
                     <motion.div variants={itemVariants} transition={{ delay: 0.4 }}>
                       <Button
                         type="submit"
                         variant="auth"
                         size="auth"
                         isLoading={isLoading}
                       >
                         Masuk Sekarang <ArrowRight className="w-5 h-5" />
                       </Button>
                     </motion.div>
                 </form>
               </>
             )}
               <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800 text-center">
                 {!hideRegisterLink && (
                   <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-4">
                      Belum memiliki akun? <button onClick={() => navigate('/register-tenant')} className="text-blue-600 font-black hover:underline px-1">Daftar Sekolah</button>
                   </p>
                 )}
                  <div className="flex flex-col items-center gap-2">
                    {!hideRegisterLink && (
                      <button onClick={() => navigate('/')} className="text-xs font-bold text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 transition-colors">
                         <Home className="w-3.5 h-3.5" /> Kembali ke Beranda
                      </button>
                    )}
                    {backendNodeId && <span className="text-[9px] text-slate-300 dark:text-slate-800 font-mono tracking-tighter">NODE: {backendNodeId}</span>}
                  </div>
              </div>
          </motion.div>
        </div>

        {/* Camera QR/Barcode Scanner Modal */}
        <LoginQrScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScanSuccess={handleScanSuccess}
        />
      </main>
    </InfraErrorBoundary>
  );
}
// instruction={{ items: [] }}
// breadcrumbs={[]}
// <Card />
// useMemo
// useCallback
// lazy(
// Suspense
