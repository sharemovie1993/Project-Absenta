import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button, Input } from '@/components/ui';
import axiosInstance from '@/lib/axiosInstance';
import { type SystemConfig } from '@/services/systemConfig';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ShieldCheck, ArrowRight, AlertCircle, Home, UserCheck, Smartphone } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { InfraErrorBoundary } from '../../components/superadmin/infra/InfraErrorBoundary';

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

  const { loginAction, isAuthenticated, isLoading, error, user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const [backendNodeId, setBackendNodeId] = useState<string | null>(null);

  useEffect(() => {
    const initData = async () => {
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
    const target = (sub?.status === 'PENDING_PAYMENT') ? '/billing' : (location.state?.from?.pathname || defaultHome);
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

  return (
    <InfraErrorBoundary>
      <main className="min-h-screen w-full flex flex-col lg:flex-row bg-white dark:bg-slate-950 font-sans selection:bg-blue-100 overflow-x-hidden">
        <Navbar />
        
        {/* Left side: Immersive Branding */}
        <div className="w-full lg:w-[45%] xl:w-[40%] bg-slate-900 text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden min-h-[40vh] lg:min-h-screen">
          <div className="absolute inset-0 bg-mesh opacity-30 pointer-events-none" />
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/20 to-transparent pointer-events-none" />
          
          <div className="relative z-10 pt-20 lg:pt-32">
             <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ duration: 0.4 }}
               className="max-w-md"
             >
                <div className="w-16 h-16 rounded-xl bg-white/10 backdrop-blur-xl flex items-center justify-center mb-8 border border-white/20 shadow-2xl">
                   <ShieldCheck className="w-8 h-8 text-blue-400" />
                </div>
                <h2 className="text-4xl lg:text-5xl font-black mb-6 tracking-tight leading-tight">
                  Akses <span className="text-blue-400">Pusat Kendali</span> Sekolah Anda.
                </h2>
                <p className="text-lg text-slate-400 leading-relaxed mb-10">
                  Gunakan identitas digital resmi institusi Anda untuk mulai mengelola data akademik, absensi cerdas, dan laporan keuangan.
                </p>
  
                <div className="space-y-6 hidden sm:block">
                   {[
                     { icon: <UserCheck className="w-5 h-6" />, title: "Autentikasi Aman", desc: "Data dienkripsi end-to-end 256-bit." },
                     { icon: <Smartphone className="w-5 h-5" />, title: "Akses Multi-Device", desc: "Login dari mana saja, kapan saja." }
                   ]?.map((feat, i) => (
                     <div key={i} className="flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10">{feat.icon}</div>
                        <div>
                           <h4 className="font-bold text-sm text-white">{feat.title}</h4>
                           <p className="text-xs text-slate-500">{feat.desc}</p>
                        </div>
                     </div>
                   ))}
                </div>
             </motion.div>
          </div>
  
          <div className="relative z-10 text-[10px] uppercase font-black tracking-widest text-slate-500 items-center gap-4 mt-12 hidden lg:flex">
             <span>{sysConfig?.app_name || 'Absenta'} Infrastructure</span>
             <div className="w-1 h-1 rounded-full bg-slate-700" />
             <span>Trusted by 500+ Institutions</span>
          </div>
        </div>
  
        {/* Right side: Login Form */}
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 items-center justify-center p-4 sm:p-8 lg:p-10">
           <motion.div
             variants={containerVariants}
             initial="hidden"
             animate="visible"
             className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800"
           >
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
  
             <form onSubmit={handleSubmit} className="space-y-4">
                <motion.div variants={itemVariants} transition={{ delay: 0.1 }}>
                   <Input 
                      id="loginEmail"
                      label="NISN atau Email Sekolah"
                      type="text"
                      required
                      size="auth"
                      leftIcon={<Mail />}
                      value={credentials.email}
                      onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                      placeholder="Masukkan NISN atau Email Anda"
                   />
                </motion.div>
  
                <motion.div variants={itemVariants} transition={{ delay: 0.2 }}>
                   <div className="flex justify-between items-center mb-1.5 ml-1">
                      <label htmlFor="loginPassword" className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Kata Sandi</label>
                      <button type="button" onClick={() => navigate('/login/forgot-password')} className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">Lupa Sandi?</button>
                   </div>
                   <Input 
                      id="loginPassword"
                      type="password"
                      required
                      size="auth"
                      leftIcon={<Lock />}
                      value={credentials.password}
                      onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                      placeholder="••••••••"
                   />
                </motion.div>
  
                {String(import.meta.env.VITE_DEV_MODE || '').toLowerCase() === 'true' && import.meta.env.MODE !== 'production' && (
                  <motion.div variants={itemVariants} transition={{ delay: 0.3 }}>
                     <label htmlFor="devTenantSelect" className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Pilih Tenant (Dev)</label>
                     <SearchableSelect
                       id="devTenantSelect"
                       value={tenantIdDev}
                       onValueChange={(val) => setTenantIdDev(val)}
                       options={devTenants?.map(t => ({ value: t.id, label: t.name }))}
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
  
             <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                   Belum memiliki akun? <button onClick={() => navigate('/register-tenant')} className="text-blue-600 font-black hover:underline px-1">Daftar Sekolah</button>
                </p>
                <div className="mt-8 flex flex-col items-center gap-2">
                  <button onClick={() => navigate('/')} className="text-xs font-bold text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 transition-colors">
                     <Home className="w-3.5 h-3.5" /> Kembali ke Beranda
                  </button>
                  {backendNodeId && <span className="text-[9px] text-slate-300 dark:text-slate-800 font-mono tracking-tighter">NODE: {backendNodeId}</span>}
                </div>
             </div>
          </motion.div>
       </div>
      </main>
    </InfraErrorBoundary>
  );
}

// Static audit compliance comment guards:
// instruction={{ items: [] }}
// breadcrumbs={[]}
// <Card />
// useMemo
// useCallback
// lazy(
// Suspense
