import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchActiveSystemConfig } from '@/services/systemConfig';
import { Button, Input, Checkbox, Modal, ModalFooter, Card } from '@/components/ui';
import toast from 'react-hot-toast';
import { registerTenant } from '@/api/auth.api';
import { 
  Loader2, 
  CheckCircle2, 
  ArrowRight, 
  Check, 
  X, 
  Info, 
  School, 
  ShieldCheck, 
  Globe, 
  Lock, 
  PenLine,
  Scale,
  Eye,
  EyeOff,
  BookOpen,
  UserCheck as UserCheckIcon,
  CreditCard,
  LogIn,
  RefreshCw,
  ArrowLeft,
  UserPlus,
  Mail,
  Sparkles,
  Gavel
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axiosInstance from '@/lib/axiosInstance';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useDebounce } from '@/hooks/useDebounce';

import { MAIN_DOMAIN } from '@/config/env-config';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

type NpsnLookupResult = {
  source: 'cache' | 'kemendik' | 'registered';
  data: {
    npsn: string;
    nama: string;
    jenjang?: string | null;
    akreditasi?: string | null;
    alamat?: string | null;
    kota?: string | null;
    provinsi?: string | null;
    telepon?: string | null;
    email?: string | null;
    website?: string | null;
    kepala_sekolah?: string | null;
  };
  is_registered?: boolean;
  registered_info?: {
    tenant_name: string;
    admin_name: string;
    admin_contact: string;
  };
};

const RegisterTenant = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSingleTenant, setIsSingleTenant] = useState(false);

  useEffect(() => {
    const checkPreset = async () => {
      try {
        const res = await axiosInstance.get('/auth/registration-preset');
        if (res.data?.success) {
          const preset = res.data.data;
          if (preset.is_single_tenant) {
            if (preset.is_registered) {
              toast.error('Registrasi sekolah sudah selesai dilakukan untuk server ini.');
              navigate('/login');
              return;
            }
            setIsSingleTenant(true);
            setFormData(prev => ({
              ...prev,
              tenant_name: preset.school_name || '',
              tenant_domain: preset.subdomain || '',
              npsn: preset.npsn || prev.npsn,
              admin_phone: preset.operator_phone || prev.admin_phone
            }));
            setDomainStatus('available');
            setDomainEdited(true);
            if (preset.npsn) {
              setNpsnStatus('found');
              setNpsnMessage(preset.school_name);
            }
          }
        }
      } catch (err: any) {
        console.warn('[RegistrationPreset] Gagal memuat data awal:', err.message);
      }
    };
    checkPreset();
  }, []);


  // Extract plan_id from URL query params
  const { planIdFromQuery, cycleFromQuery } = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      planIdFromQuery: params.get('planId') || params.get('plan_id'),
      cycleFromQuery: parseInt(params.get('cycle') || '1', 10)
    };
  }, [location.search]);


  const { data: systemConfig } = useQuery({
    queryKey: ['system-config', 'active', 'public'],
    queryFn: fetchActiveSystemConfig,
  });

  const appName = systemConfig?.app_name || 'Sistem Absensi';

  // Fetch Academic Tier plans dynamically from API (no auth required)
  const { data: academicTierPlans, isLoading: academicPlansLoading } = useQuery({
    queryKey: ['academic-tier-plans'],
    queryFn: async () => {
      const res = await axiosInstance.get('/billing/plans/academic-tiers');
      return (res.data?.data || []) as Array<{
        id: string;
        code: string;
        name: string;
        size_label: string | null;
        max_user: number | null;
        description: string | null;
      }>;
    },
    staleTime: 1000 * 60 * 10, // cache 10 menit
    retry: 1,
  });

  // Fallback static tiers jika API gagal
  const STATIC_TIERS = [
    { id: 'ACADEMIC_MICRO_TAHUNAN', size_label: 'Micro', max_user: 100 },
    { id: 'ACADEMIC_SMALL_TAHUNAN', size_label: 'Small', max_user: 300 },
    { id: 'ACADEMIC_MEDIUM_TAHUNAN', size_label: 'Medium', max_user: 600 },
    { id: 'ACADEMIC_LARGE_TAHUNAN', size_label: 'Large', max_user: 1200 },
    { id: 'ACADEMIC_ENTERPRISE_TAHUNAN', size_label: 'Enterprise', max_user: null },
  ];
  const tierOptions = (academicTierPlans && academicTierPlans.length > 0) ? academicTierPlans : STATIC_TIERS;
  
  const [formData, setFormData] = useState({
    tenant_name: '',
    tenant_domain: '',
    npsn: '',
    alamat: '',
    admin_full_name: '',
    admin_email: '',
    admin_password: '',
    confirm_password: '', // Added for consistency
    admin_phone: '',
    agreedToTerms: false,
    academic_tier: 'MICRO'
  });

  const [loading, setLoading] = useState(false);
  const [npsnLoading, setNpsnLoading] = useState(false);
  const [npsnStatus, setNpsnStatus] = useState<'idle' | 'checking' | 'found' | 'not_found' | 'error'>('idle');
  const [npsnMessage, setNpsnMessage] = useState('');
  const [domainEdited, setDomainEdited] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [existingRegistration, setExistingRegistration] = useState<NpsnLookupResult['registered_info'] | null>(null);
  const [showLegalModal, setShowLegalModal] = useState<'terms' | 'privacy' | null>(null);
  const [showPasswordInSuccess, setShowPasswordInSuccess] = useState(false);

  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable' | 'error'>('idle');
  const [domainStatus, setDomainStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable' | 'error'>('idle');
  
  const debouncedEmail = useDebounce(formData.admin_email, 800);
  const debouncedDomain = useDebounce(formData.tenant_domain, 800);

  useEffect(() => {
    if (isSingleTenant) return;
    if (!domainEdited && formData.tenant_name) {
      const slug = formData.tenant_name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
      setFormData(prev => ({ ...prev, tenant_domain: slug }));
    }
  }, [formData.tenant_name, domainEdited, isSingleTenant]);

  const validateField = (name: string, value: any) => {
    let error = '';
    switch (name) {
      case 'tenant_domain':
        if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(value)) error = 'Format subdomain tidak valid.';
        break;
      case 'admin_email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = 'Format email tidak valid.';
        break;
      case 'admin_phone':
        if (!/^(\+62|62|0)8[1-9][0-9]{6,11}$/.test(String(value).replace(/[- ]/g, ''))) error = 'Nomor telepon tidak valid.';
        break;
      case 'admin_password':
        if (value.length < 8) error = 'Minimal 8 karakter.';
        break;
      case 'confirm_password':
        if (value !== formData.admin_password) error = 'Kata sandi tidak cocok.';
        break;
      case 'npsn':
        if (!/^\d{8}$/.test(value)) error = 'Harus 8 digit angka.';
        break;
    }
    setErrors(prev => ({ ...prev, [name]: error }));
    return error;
  };

  const checkEmailAvailable = async (email: string) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    setEmailStatus('checking');
    try {
      const res = await axiosInstance.get<{ success: boolean; available: boolean }>(`/auth/check-email`, { params: { email } });
      if (res.data.success) {
        if (res.data.available) setEmailStatus('available');
        else {
          setEmailStatus('unavailable');
          setErrors(prev => ({ ...prev, admin_email: 'Email sudah terdaftar.' }));
        }
      }
    } catch { setEmailStatus('error'); }
  };

  const checkDomainAvailable = async (domain: string) => {
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(domain)) return;
    setDomainStatus('checking');
    try {
      const res = await axiosInstance.get<{ success: boolean; message: string; data: { available: boolean } }>(`/auth/check-domain`, { params: { domain } });
      if (res.data.success) {
        if (res.data.data.available) {
          setDomainStatus('available');
          setErrors(prev => {
            const next = { ...prev };
            delete next.tenant_domain;
            return next;
          });
        } else {
          setDomainStatus('unavailable');
          setErrors(prev => ({ ...prev, tenant_domain: res.data.message || 'Subdomain sudah digunakan.' }));
        }
      }
    } catch { 
      setDomainStatus('error'); 
    }
  };

  useEffect(() => {
    if (debouncedEmail && !errors.admin_email) checkEmailAvailable(debouncedEmail);
  }, [debouncedEmail]);

  useEffect(() => {
    if (isSingleTenant) return;
    if (debouncedDomain && !errors.tenant_domain) {
      checkDomainAvailable(debouncedDomain);
    }
  }, [debouncedDomain, isSingleTenant]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    validateField(name, value);
    if (name === 'tenant_domain') {
      setDomainEdited(true);
      setDomainStatus('idle');
    }
    if (name === 'npsn') {
       if (value.length >= 8) checkNpsn(value);
       else { setNpsnStatus('idle'); setNpsnMessage(''); }
    }
    if (name === 'admin_email') { setEmailStatus('idle'); }
  };

  const checkNpsn = async (npsn: string) => {
    if (!npsn || npsn.length < 8 || npsnLoading) return;
    setNpsnLoading(true); setNpsnStatus('checking'); setNpsnMessage('');
    try {
      const res = await axiosInstance.get<{ success: boolean; data: NpsnLookupResult }>(`/sekolah/lookup-npsn/${npsn}`);
      if (res.data?.success && res.data?.data) {
        const result = res.data.data;
        if (result.is_registered && result.registered_info) {
           setNpsnStatus('error'); setExistingRegistration(result.registered_info);
           setNpsnMessage('Sekolah Sudah Terdaftar');
           return;
        }
        setExistingRegistration(null);
        setNpsnStatus('found');
        setNpsnMessage(result.data.nama);
        setFormData(prev => ({
          ...prev,
          tenant_name: result.data.nama,
          alamat: result.data.alamat || prev.alamat,
          tenant_domain: isSingleTenant 
            ? prev.tenant_domain 
            : (!domainEdited ? result.data.nama.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) : prev.tenant_domain)
        }));
        toast.success('Data sekolah ditemukan!');
      } else {
        setNpsnStatus('not_found');
        setNpsnMessage('Sekolah tidak ditemukan');
      }
    } catch { setNpsnStatus('not_found'); setNpsnMessage('Data tidak ditemukan'); }
    finally { setNpsnLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.values(errors).some(err => err !== '')) { toast.error('Mohon perbaiki kesalahan pada form.'); return; }
    if (!formData.agreedToTerms) { toast.error('Anda harus menyetujui Syarat & Ketentuan.'); return; }
    
    setLoading(true);
    try {
      await registerTenant({
        ...formData,
        tenant_domain: formData.tenant_domain.toLowerCase().replace(/[^a-z0-9-]/g, ''),
        plan_id: planIdFromQuery || undefined,
        billing_cycle_months: cycleFromQuery || 1
      });
      toast.success('Registrasi berhasil! Silakan cek email Anda.');
      setIsSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal registrasi');
    } finally { setLoading(false); }
  };

  const containerVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" as any } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-950 font-sans selection:bg-blue-100 overflow-x-hidden">
      <Navbar />
      
      <main className="flex-grow flex flex-col lg:flex-row pt-16 lg:pt-0">
        {/* Left Side: Immersive Hero */}
        <div className="w-full lg:w-[40%] xl:w-[35%] bg-slate-900 text-white p-6 sm:p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden min-h-[35vh] lg:min-h-screen">
           <div className="absolute inset-0 bg-mesh opacity-20 pointer-events-none" />
           <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/20 to-transparent pointer-events-none" />
           
           <div className="relative z-10 pt-8 lg:pt-24">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md">
                 <div className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur-xl flex items-center justify-center mb-6 border border-white/20 shadow-2xl">
                    <School className="w-8 h-8 text-blue-400" />
                 </div>
                 <h1 className="text-4xl lg:text-5xl font-black mb-6 leading-tight tracking-tight">
                    Transformasi <span className="text-blue-400">Digital</span> Institusi Anda.
                 </h1>
                 <p className="text-lg text-slate-400 leading-relaxed mb-10">
                    Bawa sekolah Anda ke ekosistem yang transparan, aman, dan memudahkan manajemen akademik harian.
                 </p>

                 <div className="space-y-6 hidden sm:block">
                    {[
                      { icon: <ShieldCheck className="w-5 h-5" />, title: "Infrastruktur Aman", desc: "Data terenkripsi tingkat militer." },
                      { icon: <Globe className="w-5 h-5" />, title: "Subdomain Eksklusif", desc: "Akses personal untuk institusi Anda." }
                    ].map((feat, i) => (
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
        </div>

        {/* Right Side: Registration Form */}
        <div className="flex-grow bg-slate-50 dark:bg-slate-950 p-4 sm:p-8 lg:p-10 flex items-start justify-center overflow-y-auto pt-20 lg:pt-10">
           <motion.div 
             variants={containerVariants}
             initial="hidden"
             animate="visible"
             className="w-full max-w-4xl"
           >
              <Card className="rounded-3xl overflow-hidden border-0 shadow-2xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900">
                 <div className="p-6 sm:p-10">
                    <AnimatePresence mode="wait">
                      {!isSuccess ? (
                        <motion.div
                          key="form"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                        >
                           <div className="mb-8">
                              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Daftar Institusi Baru</h2>
                              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Lengkapi detail untuk membangun sistem absensi mandiri sekolah Anda.</p>
                           </div>

                           {isSingleTenant && (
                             <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-start gap-3">
                               <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
                               <div>
                                 <h4 className="text-sm font-bold">Mode Single-Tenant (On-Premise / Hybrid)</h4>
                                 <p className="text-xs mt-0.5 opacity-90">
                                   Server ini berjalan khusus untuk satu sekolah. Subdomain telah dikunci secara otomatis sesuai dengan Kunci Lisensi yang terpasang, sedangkan NPSN dan Nama Sekolah dapat Anda sesuaikan.
                                 </p>
                               </div>
                             </div>
                           )}

                          <form onSubmit={handleSubmit} className="space-y-6">
                             {/* Section: Data Sekolah */}
                             <div className="space-y-6">
                                <div className="flex items-center gap-3 mb-2">
                                   <div className="w-8 h-1 bg-blue-600 rounded-full" />
                                   <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">1. Informasi Sekolah</h3>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                   <Input 
                                      label="NPSN (8 Digit)"
                                      name="npsn"
                                      value={formData.npsn}
                                      onChange={handleChange}
                                      placeholder="Contoh: 20212345"
                                      size="auth"
                                      errorText={errors.npsn}
                                      rightIcon={npsnLoading ? <Loader2 className="animate-spin" /> : npsnStatus === 'found' ? <CheckCircle2 className="text-emerald-500" /> : undefined}
                                      required
                                   />
                                   <Input 
                                      label="Nama Institusi"
                                      name="tenant_name"
                                      value={formData.tenant_name}
                                      onChange={handleChange}
                                      placeholder="SMKN 1 Contoh"
                                      size="auth"
                                      required
                                   />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                   <Input 
                                      label="Subdomain Aplikasi"
                                      name="tenant_domain"
                                      value={formData.tenant_domain}
                                      onChange={handleChange}
                                      placeholder="nama-sekolah"
                                      size="auth"
                                      className="pr-36"
                                      errorText={errors.tenant_domain}
                                      rightIcon={
                                        <div className="flex items-center gap-1.5 select-none pr-1 font-bold text-slate-400">
                                          {domainStatus === 'checking' && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                                          {domainStatus === 'available' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                          {domainStatus === 'unavailable' && <X className="w-4 h-4 text-red-500" />}
                                          <span>.{MAIN_DOMAIN}</span>
                                        </div>
                                      }
                                      required
                                      readOnly={isSingleTenant}
                                   />
                                   <Input 
                                      label="Lokasi Singkat"
                                      name="alamat"
                                      value={formData.alamat}
                                      onChange={handleChange}
                                      placeholder="Contoh: Jakarta Selatan"
                                      size="auth"
                                      required
                                   />
                                </div>

                                 {/* ── Kapasitas Sekolah: Visual Card Picker ── */}
                                 <div>
                                   <div className="flex items-start gap-2 mb-3">
                                     <div>
                                       <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">
                                         Berapa jumlah siswa aktif di sekolah Anda?
                                       </label>
                                       <p className="text-[11px] text-slate-400 mt-0.5">
                                         Pilih kapasitas yang paling sesuai — ini menentukan paket dasar gratis (Academic Core) Anda.
                                       </p>
                                     </div>
                                   </div>

                                   {academicPlansLoading ? (
                                     <div className="flex items-center gap-2 text-slate-400 py-4">
                                       <Loader2 size={16} className="animate-spin" />
                                       <span className="text-xs font-medium">Memuat pilihan kapasitas...</span>
                                     </div>
                                   ) : (
                                     <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                                       {tierOptions.map((tier) => {
                                         const label = tier.size_label || tier.id.replace('ACADEMIC_', '').replace('_TAHUNAN', '');
                                         const tierKey = label.toUpperCase();
                                         const isSelected = formData.academic_tier === tierKey;
                                         const isPopular = tierKey === 'SMALL';

                                         const TIER_META: Record<string, { emoji: string; color: string; selectedColor: string }> = {
                                           MICRO:      { emoji: '🏫', color: 'border-slate-200 hover:border-blue-300 dark:border-slate-700',      selectedColor: 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 ring-2 ring-blue-500/30' },
                                           SMALL:      { emoji: '🏫', color: 'border-slate-200 hover:border-blue-300 dark:border-slate-700',      selectedColor: 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 ring-2 ring-blue-500/30' },
                                           MEDIUM:     { emoji: '🏫', color: 'border-slate-200 hover:border-indigo-300 dark:border-slate-700',    selectedColor: 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/30' },
                                           LARGE:      { emoji: '🏛️', color: 'border-slate-200 hover:border-violet-300 dark:border-slate-700',   selectedColor: 'border-violet-500 bg-violet-50 dark:bg-violet-950/40 ring-2 ring-violet-500/30' },
                                           ENTERPRISE: { emoji: '🏙️', color: 'border-slate-200 hover:border-amber-300 dark:border-slate-700',    selectedColor: 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 ring-2 ring-amber-500/30' },
                                         };
                                         const meta = TIER_META[tierKey] || TIER_META['MICRO'];
                                         // Kapasitas dari data API (dinamis)
                                         const capacityText = tier.max_user
                                           ? `S/d ${tier.max_user.toLocaleString('id-ID')} siswa`
                                           : 'Tanpa batas';

                                         return (
                                           <button
                                             key={tier.id}
                                             type="button"
                                             onClick={() => setFormData(prev => ({ ...prev, academic_tier: tierKey }))}
                                             className={`relative flex flex-col items-center text-center p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer w-full ${
                                               isSelected ? meta.selectedColor : `bg-white dark:bg-slate-900 ${meta.color}`
                                             }`}
                                           >
                                             {isPopular && (
                                               <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full whitespace-nowrap">
                                                 Paling Populer
                                               </span>
                                             )}
                                             <span className="text-xl mb-1">{meta.emoji}</span>
                                             <span className={`text-[11px] font-black ${ isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300' }`}>
                                               {label}
                                             </span>
                                             <span className={`text-[9px] font-semibold mt-0.5 leading-tight ${ isSelected ? 'text-slate-600 dark:text-slate-400' : 'text-slate-400' }`}>
                                               {capacityText}
                                             </span>
                                             {isSelected && (
                                               <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-blue-600 rounded-full flex items-center justify-center">
                                                 <Check size={8} strokeWidth={3} className="text-white" />
                                               </span>
                                             )}
                                           </button>
                                         );
                                       })}
                                     </div>
                                   )}

                                   {/* Info box: apa itu Academic Core */}
                                   <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl flex gap-2.5 items-start">
                                     <Info size={13} className="text-blue-500 shrink-0 mt-0.5" />
                                     <p className="text-[10.5px] text-blue-700 dark:text-blue-300 font-medium leading-relaxed">
                                       <strong>Paket Academic Core gratis selamanya.</strong> Kapasitas ini menentukan batas jumlah siswa aktif. Jika ingin menambah fitur seperti Absensi Digital atau Koperasi, Anda bisa membeli modul tambahan dengan edisi yang sama atau lebih tinggi.
                                     </p>
                                   </div>
                                 </div>
                             </div>

                             {/* Section: Admin Info */}
                             <div className="space-y-6">
                                <div className="flex items-center gap-3 mb-2">
                                   <div className="w-8 h-1 bg-blue-600 rounded-full" />
                                   <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">2. Akun Administrator</h3>
                                </div>

                                <Input 
                                   label="Nama Lengkap"
                                   name="admin_full_name"
                                   value={formData.admin_full_name}
                                   onChange={handleChange}
                                   placeholder="Contoh: Budi Sudarsono"
                                   size="auth"
                                   required
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                   <Input 
                                      label="Email Resmi"
                                      type="email"
                                      name="admin_email"
                                      value={formData.admin_email}
                                      onChange={handleChange}
                                      placeholder="admin@sekolah.id"
                                      size="auth"
                                      errorText={errors.admin_email}
                                      rightIcon={emailStatus === 'checking' ? <Loader2 className="animate-spin" /> : emailStatus === 'available' ? <CheckCircle2 className="text-emerald-500" /> : undefined}
                                      required
                                   />
                                   <Input 
                                      label="WhatsApp / Telepon"
                                      name="admin_phone"
                                      value={formData.admin_phone}
                                      onChange={handleChange}
                                      placeholder="0812..."
                                      size="auth"
                                      errorText={errors.admin_phone}
                                      required
                                   />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                   <Input 
                                      label="Kata Sandi"
                                      type="password"
                                      name="admin_password"
                                      value={formData.admin_password}
                                      onChange={handleChange}
                                      placeholder="Minimal 8 karakter"
                                      size="auth"
                                      errorText={errors.admin_password}
                                      required
                                   />
                                   <Input 
                                      label="Konfirmasi Sandi"
                                      type="password"
                                      name="confirm_password"
                                      value={formData.confirm_password}
                                      onChange={handleChange}
                                      placeholder="Ulangi sandi"
                                      size="auth"
                                      errorText={errors.confirm_password}
                                      required
                                   />
                                </div>
                             </div>

                             <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-8">
                                <label className="flex items-start gap-4 p-5 rounded-xl bg-blue-50/30 dark:bg-blue-900/10 border border-blue-100/30 dark:border-blue-900/30 cursor-pointer transition-colors hover:bg-blue-50/50">
                                   <Checkbox id="terms" checked={formData.agreedToTerms} onCheckedChange={(c) => setFormData(p => ({...p, agreedToTerms: c as boolean}))} className="mt-1" />
                                   <span className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                      Saya menyatakan data di atas benar dan menyetujui <button type="button" onClick={() => setShowLegalModal('terms')} className="text-blue-600 font-bold hover:underline">Ketentuan Layanan</button> serta <button type="button" onClick={() => setShowLegalModal('privacy')} className="text-blue-600 font-bold hover:underline">Kebijakan Privasi</button>.
                                   </span>
                                </label>

                                <div className="flex flex-col sm:flex-row gap-4">
                                   <Button type="submit" isLoading={loading} variant="auth" size="auth">
                                      Daftar Sekarang <ArrowRight className="w-5 h-5 ml-auto" />
                                   </Button>
                                   <Button type="button" variant="outline" onClick={() => navigate('/login')} className="h-14 rounded-xl px-8 border-2 font-bold text-slate-600">
                                      Batal
                                   </Button>
                                </div>
                             </div>
                          </form>
                        </motion.div>
                      ) : (
                        <motion.div 
                          key="success"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="text-center py-8"
                        >
                           <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6">
                              <Check className="w-10 h-10 text-emerald-600" />
                           </div>
                           <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Pendaftaran Sukses!</h2>
                           <p className="text-slate-500 dark:text-slate-400 text-base mb-10 leading-relaxed italic">
                              Kami telah mengirimkan email verifikasi ke <strong className="text-blue-600">{formData.admin_email}</strong> serta detail login ke WhatsApp Anda. Silakan cek inbox email dan WhatsApp Anda untuk segera mengaktifkan portal sekolah {formData.tenant_name}.
                           </p>
                           
                           <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-100 dark:border-slate-800 mb-10 text-left space-y-4">
                              <div className="flex justify-between items-center text-sm">
                                 <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Portal URL</span>
                                 <span className="text-slate-900 dark:text-white font-black">
                                    {/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(MAIN_DOMAIN) 
                                       ? MAIN_DOMAIN 
                                       : `${formData.tenant_domain}.${MAIN_DOMAIN}`
                                    }
                                    {window.location.port && window.location.port !== '80' && window.location.port !== '443' ? `:${window.location.port}` : ''}
                                 </span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                 <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Email Admin</span>
                                 <span className="text-slate-900 dark:text-white font-black">{formData.admin_email}</span>
                              </div>
                           </div>

                           <Button onClick={() => navigate('/login')} variant="auth" size="auth">
                              Masuk ke Dashboard <ArrowRight className="w-5 h-5 ml-auto" />
                           </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                 </div>
              </Card>
           </motion.div>
           
           <div className="mt-8 flex flex-col items-center gap-2">
             <button onClick={() => navigate('/')} className="text-xs font-bold text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Beranda
             </button>
           </div>
        </div>

        {/* Legal Modals */}
        <Modal 
          isOpen={showLegalModal === 'terms'} 
          onClose={() => setShowLegalModal(null)}
          zIndex={1000}
          title={<div className="flex items-center gap-3"><Scale className="w-5 h-5 text-blue-600" /><span>Ketentuan Layanan</span></div>}
          size="3xl"
        >
          <div className="space-y-6">
             <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                Selamat datang di {appName}. Dengan mendaftarkan institusi Anda, Anda menyetujui kesepakatan penggunaan platform guna menjamin layanan yang aman dan berkualitas.
             </p>
             <div className="grid grid-cols-1 gap-4">
               {[
                 { t: "1. Akun & Keanggotaan", d: "Pihak sekolah bertanggung jawab penuh atas keamanan kredensial akun administrator." },
                 { t: "2. Integritas Data", d: "Sistem hanya digunakan untuk pengelolaan data akademik yang sah." },
                 { t: "3. Ketentuan Biaya", d: "Layanan bersifat berlangganan sesuai paket yang dipilih." }
               ].map((item, i) => (
                 <section key={i} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{item.t}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">{item.d}</p>
                 </section>
               ))}
             </div>
          </div>
          <ModalFooter>
             <Button onClick={() => setShowLegalModal(null)} className="h-12 px-10 rounded-xl font-bold bg-blue-600 text-white">Saya Mengerti</Button>
          </ModalFooter>
        </Modal>

        <Modal 
          isOpen={showLegalModal === 'privacy'} 
          onClose={() => setShowLegalModal(null)}
          zIndex={1000}
          title={<div className="flex items-center gap-3"><Lock className="w-5 h-5 text-emerald-600" /><span>Kebijakan Privasi</span></div>}
          size="3xl"
        >
          <div className="space-y-6 text-sm text-slate-600 dark:text-slate-400">
             <p>Kami mengadopsi standar keamanan tingkat perbankan untuk melindungi setiap bit informasi institusi Anda. Kami tidak akan pernah menjual atau membagikan data institusi Anda kepada pihak ketiga.</p>
          </div>
          <ModalFooter>
             <Button onClick={() => setShowLegalModal(null)} className="h-12 px-10 rounded-xl font-bold bg-blue-600 text-white">Saya Mengerti</Button>
          </ModalFooter>
        </Modal>
      </main>

      <Footer />

    </div>
  );
};

export default RegisterTenant;
