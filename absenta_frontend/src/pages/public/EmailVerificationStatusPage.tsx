import React, { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '@/lib/axiosInstance';
import { Button, SectionCard, Loader } from '@/components/ui';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Mail, ArrowRight, Loader2, MessageSquare, Clock } from 'lucide-react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';

// Lazy load layout components
const Navbar = lazy(() => import('@/components/layout/Navbar').then(m => ({ default: m.Navbar })));
const Footer = lazy(() => import('@/components/layout/Footer').then(m => ({ default: m.Footer })));

type VerifyStatus = 'VERIFIED' | 'NEEDS_CONFIRM' | 'EXPIRED' | 'INVALID' | 'MISSING_TOKEN' | '';

const EmailVerificationContent: React.FC = () => {
  const navigate = useNavigate();
  const { token: tokenParam } = useParams();
  const location = useLocation();
  const [status, setStatus] = useState<VerifyStatus>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [dd, setDd] = useState<number>(0);
  const [hh, setHh] = useState<number>(0);
  const [mm, setMm] = useState<number>(0);
  const [ss, setSs] = useState<number>(0);
  const [loginUrl, setLoginUrl] = useState<string>('');

  const token = useMemo(() => {
    const qs = new URLSearchParams(location.search);
    const qToken = qs.get('token') || '';
    return String(tokenParam || qToken || '').trim();
  }, [location.search, tokenParam]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (!token) {
          setStatus('MISSING_TOKEN');
          return;
        }
        const res = await axiosInstance.get(`/auth/verify-email?token=${encodeURIComponent(token)}`, {
          headers: { Accept: 'application/json' }
        });
        const data = res?.data;
        const st = String(data?.status || '').toUpperCase() as VerifyStatus;
        setExpiresAt(data?.expiresAt || null);
        setLoginUrl(data?.loginUrl || '');
        if (active) setStatus(st || '');
      } catch (e: unknown) {
        const err = e as any;
        const msg = err?.response?.data?.message || err?.message || 'Gagal memuat status verifikasi';
        setError(msg);
        const st = String(err?.response?.data?.status || '').toUpperCase() as VerifyStatus;
        setStatus(st || '');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    const update = () => {
      if (!expiresAt) return;
      const endMs = new Date(expiresAt).getTime();
      const nowMs = Date.now();
      const diff = Math.max(0, endMs - nowMs);
      const d = Math.floor(diff / (24 * 60 * 60 * 1000));
      const h = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      const m = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
      const s = Math.floor((diff % (60 * 1000)) / 1000);
      setDd(d);
      setHh(h);
      setMm(m);
      setSs(s);
      if (diff <= 0) {
        setStatus('EXPIRED');
        if (timer) clearInterval(timer);
      }
    };
    if (status === 'NEEDS_CONFIRM' && expiresAt) {
      update();
      timer = setInterval(update, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [status, expiresAt]);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axiosInstance.post(`/auth/verify-email/confirm`, { token }, {
        headers: { Accept: 'application/json' }
      });
      const data = res?.data;
      const st = String(data?.status || '').toUpperCase() as VerifyStatus;
      setStatus(st || 'VERIFIED');
    } catch (e: unknown) {
      const err = e as any;
      const msg = err?.response?.data?.message || err?.message || 'Gagal mengonfirmasi verifikasi';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendChannel = async (channel: 'email' | 'whatsapp') => {
    try {
      setLoading(true);
      setError(null);
      const val = channel === 'email' ? email : phone;
      if (!val) {
        setError(`${channel === 'email' ? 'Email' : 'Nomor WhatsApp'} wajib diisi`);
        return;
      }
      const payload = channel === 'email' ? { email, channel } : { phone, channel };
      const res = await axiosInstance.post(`/auth/resend-verification`, payload, {
        headers: { Accept: 'application/json' }
      });
      if (res?.data?.success) {
        if (channel === 'email') navigate('/check-email');
        else setError('Tautan baru telah dikirim via WhatsApp.');
      }
    } catch (e: unknown) {
      const err = e as any;
      const msg = err?.response?.data?.message || err?.message || `Gagal mengirim ulang verifikasi via ${channel}`;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const goLogin = () => {
    if (loginUrl) window.location.href = loginUrl;
    else navigate('/login');
  };

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: "easeOut" as any } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
  };

  const breadcrumbs = useMemo(() => [
    { label: 'Otentikasi' },
    { label: 'Verifikasi Email' }
  ], []);

  const instruction = useMemo(() => ({
    title: 'Verifikasi Akun',
    description: 'Pastikan email Anda telah terverifikasi untuk mengakses seluruh fitur platform.',
    items: [
      { text: 'Klik tombol konfirmasi untuk mengaktifkan akun Anda.' },
      { text: 'Jika tautan kedaluwarsa, silakan minta pengiriman ulang tautan baru.' },
      { text: 'Hubungi dukungan kami jika Anda tidak menerima email verifikasi.' }
    ]
  }), []);

  const statusConfig = {
    VERIFIED: {
      icon: <CheckCircle2 className="w-16 h-16 text-emerald-500" />,
      title: "Verifikasi Berhasil!",
      subtitle: "Akun Anda telah diaktifkan sepenuhnya. Selamat bergabung di ekosistem digital kami.",
      action: <Button onClick={goLogin} size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 text-white font-bold h-12">Masuk ke Dashboard</Button>,
      theme: "emerald"
    },
    NEEDS_CONFIRM: {
      icon: <Mail className="w-16 h-16 text-blue-500" />,
      title: "Konfirmasi Akun",
      subtitle: "Satu langkah lagi! Tekan tombol di bawah untuk mengaktifkan akses Anda.",
      action: (
        <div className="space-y-6 w-full">
           <Button onClick={handleConfirm} size="lg" className="w-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 text-white font-bold h-12">Konfirmasi Sekarang</Button>
           {expiresAt && (
             <div className="flex flex-col items-center gap-3">
                <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">Tautan Berakhir Dalam</span>
                <div className="flex items-center gap-4">
                  {[
                    { v: dd, l: "Hari" },
                    { v: String(hh).padStart(2,'0'), l: "Jam" },
                    { v: String(mm).padStart(2,'0'), l: "Menit" },
                    { v: String(ss).padStart(2,'0'), l: "Detik" }
                  ].map((x, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className="text-2xl font-black text-slate-800 dark:text-white">{x.v}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">{x.l}</div>
                    </div>
                  ))}
                </div>
             </div>
           )}
        </div>
      ),
      theme: "blue"
    },
    EXPIRED: {
      icon: <Clock className="w-16 h-16 text-amber-500" />,
      title: "Tautan Kedaluwarsa",
      subtitle: "Maaf, tautan verifikasi Anda sudah tidak berlaku lagi karena alasan keamanan.",
      action: (
        <div className="space-y-6 w-full text-left">
           <div className="space-y-4">
              <div className="group">
                <label htmlFor="email-input" className="text-xs font-bold text-slate-500 mb-1.5 block">Kirim ulang ke Email</label>
                <div className="relative">
                  <input 
                    id="email-input"
                    type="email" 
                    placeholder="nama@sekolah.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900 focus:ring-2 focus:ring-amber-500 transition-all outline-none"
                    aria-label="Email untuk pengiriman ulang"
                  />
                  <button onClick={() => handleResendChannel('email')} className="absolute right-2 top-2 p-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 hover:bg-amber-100 transition-colors" aria-label="Kirim via Email">
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="relative flex items-center gap-4 py-2">
                 <div className="flex-grow h-px bg-slate-100 dark:bg-slate-800" />
                 <span className="text-[10px] font-black text-slate-300 uppercase">Atau WhatsApp</span>
                 <div className="flex-grow h-px bg-slate-100 dark:bg-slate-800" />
              </div>
              <div className="group">
                <label htmlFor="whatsapp-input" className="text-xs font-bold text-slate-500 mb-1.5 block">Nomor WhatsApp</label>
                <div className="relative">
                  <input 
                    id="whatsapp-input"
                    type="text" 
                    placeholder="Nomor WhatsApp (62...)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                    aria-label="Nomor WhatsApp untuk pengiriman ulang"
                  />
                  <button onClick={() => handleResendChannel('whatsapp')} className="absolute right-2 top-2 p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 hover:bg-emerald-100 transition-colors" aria-label="Kirim via WhatsApp">
                    <MessageSquare className="w-5 h-5" />
                  </button>
                </div>
              </div>
           </div>
           <Button variant="ghost" onClick={goLogin} className="w-full text-slate-500 text-sm">Kembali ke Halaman Login</Button>
        </div>
      ),
      theme: "amber"
    },
    default: {
      icon: <XCircle className="w-16 h-16 text-red-500" />,
      title: "Verifikasi Gagal",
      subtitle: error || "Tautan tidak valid atau telah digunakan sebelumnya. Silakan periksa kembali email Anda.",
      action: (
        <div className="space-y-4 w-full">
           <Button onClick={goLogin} variant="outline" className="w-full py-3 h-12 rounded-xl font-bold">Kembali ke Login</Button>
           <Button variant="ghost" className="w-full text-blue-600 font-bold" onClick={() => setStatus('EXPIRED')}>Kirim Ulang Tautan</Button>
        </div>
      ),
      theme: "red"
    }
  };

  const activeContent = statusConfig[status as keyof typeof statusConfig] || statusConfig.default;

  return (
    <AcademicPageLayout
      title="Status Verifikasi Email"
      description="Verifikasi akun Anda untuk memulai pengalaman digital di platform kami."
      breadcrumbs={breadcrumbs}
      instruction={instruction}
      hardeningModuleKey="email_verification_status"
    >
      <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-100 dark:selection:bg-blue-900">
        <Suspense fallback={<div className="h-16" />}>
          <Navbar />
        </Suspense>
        
        <main className="flex-grow flex items-center justify-center py-16 px-4 relative overflow-hidden">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden opacity-30 dark:opacity-20 translate-y-[-10%]">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-mesh rounded-full blur-3xl opacity-50" />
          </div>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <div className="relative w-20 h-20 mx-auto mb-6">
                   <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-800" />
                   <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" as any }}
                      className="absolute inset-0 rounded-full border-4 border-t-blue-600 border-r-transparent"
                   />
                   <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-blue-600 animate-pulse" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Memproses Data...</h2>
                <p className="text-slate-500 mt-2">Sedang memproses tautan verifikasi Anda.</p>
              </motion.div>
            ) : (
              <motion.div
                key={status}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="w-full max-w-md relative z-10"
              >
                <SectionCard noPadding fullWidth className="rounded-3xl border-0 shadow-2xl shadow-blue-500/10 dark:bg-slate-900 overflow-hidden bg-white">
                  <div className="p-8 sm:p-12 text-center">
                    <motion.div 
                      initial={{ scale: 0.5, rotate: -20, opacity: 0 }}
                      animate={{ scale: 1, rotate: 0, opacity: 1 }}
                      transition={{ type: "spring", damping: 15, delay: 0.2 }}
                      className="mb-10 flex justify-center"
                    >
                      <div className="relative">
                         <div className={`absolute inset-0 rounded-full bg-${activeContent.theme}-500/20 dark:bg-${activeContent.theme}-500/10 blur-2xl animate-pulse`} />
                         <div className="relative bg-white dark:bg-slate-900 rounded-full p-4">
                          {activeContent.icon}
                         </div>
                      </div>
                    </motion.div>

                    <motion.h1 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight"
                    >
                      {activeContent.title}
                    </motion.h1>

                    <motion.p 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="text-slate-600 dark:text-slate-400 mb-10 leading-relaxed text-balance"
                    >
                      {activeContent.subtitle}
                    </motion.p>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      {activeContent.action}
                    </motion.div>
                  </div>

                  {/* Motivational Footer */}
                  <div className="bg-slate-50/80 dark:bg-slate-800/50 p-6 text-center border-t border-slate-100 dark:border-slate-800">
                     <p className="text-xs text-slate-400 m-0">
                      Membutuhkan bantuan teknis? <span className="text-blue-600 hover:underline cursor-pointer font-bold">Hubungi Support</span>
                     </p>
                  </div>
                </SectionCard>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <Suspense fallback={<div className="h-64" />}>
          <Footer />
        </Suspense>
      </div>
    </AcademicPageLayout>
  );
};

export default function EmailVerificationStatusPage() {
  return (
    <EmailVerificationContent />
  );
}
