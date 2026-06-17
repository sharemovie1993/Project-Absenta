import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, Badge } from '@/components/ui';
import { 
  Building2, 
  Wallet, 
  CheckCircle, 
  Loader, 
  ArrowLeft, 
  Sparkles, 
  Check, 
  Zap, 
  Cloud, 
  ShieldCheck,
  Smartphone,
  Info,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Target,
  Package,
  Shield,
  Star,
  MessageSquare,
  ChevronRight
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { getPublicPlans, formatCurrency } from '@/api/plans.api';
import type { Plan } from '@/types/plans';
import { useAuthStore } from '@/store/authStore';
import { getPublicModules } from '@/api/module.api';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { getMySubscription } from '@/api/mySubscription.api';
import { 
  getServiceIcon, 
  getServiceTheme, 
  getServiceThumbnail 
} from '@/lib/billingUtils';

export default function ServiceDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  
  // 1. Fetch Data
  const plansQuery = useQuery<Plan[]>({
    queryKey: ['public-plans'],
    queryFn: async () => {
      const res = await getPublicPlans();
      return res.success && Array.isArray(res.data) ? (res.data as Plan[]) : [];
    },
  });

  const modulesQuery = useQuery({
    queryKey: ['public-modules'],
    queryFn: async () => {
      const res = await getPublicModules();
      return res.success && Array.isArray(res.data) ? res.data : [];
    }
  });

  const { tenantId } = useAuthStore();
  const subQuery = useQuery({
    queryKey: ['my-subscription', tenantId],
    queryFn: async () => {
      const res = await getMySubscription();
      return res.success ? res.data : null;
    },
    enabled: isAuthenticated,
  });

  // 2. Grouping Logic (Must match ServiceCenterPage exactly)
  const { user } = useAuthStore();
  const groupedProducts = useMemo(() => {
    const plans = plansQuery.data || [];
    const products: Record<string, any> = {};

    plans.forEach((p: any) => {
        // Must match ServiceCenterPage logic
        const baseName = p.name
            .replace(/\((Micro|Small|Medium|Large|Enterprise|Bulanan|Tahunan|Monthly|Yearly)\)/gi, '')
            .replace(/\b(Micro|Small|Medium|Large|Enterprise|Bulanan|Tahunan|Monthly|Yearly)\b/gi, '')
            .replace(/-/g, '')
            .replace(/\s+/g, ' ')
            .trim();
            
        const moduleName = p.module?.name || 'Layanan';
        const mode = p.absensi_mode || 'STANDARD';
        const size = p.size_label || 'Standard';
        const groupKey = `${baseName}-${mode}`;
        
        if (!products[groupKey]) {
            products[groupKey] = {
                id: groupKey,
                baseName,
                mode,
                module: p.module?.name || moduleName,
                icon: p.module?.icon || 'Package',
                service_code: p.service_code,
                module_id: p.module_id,
                variants: [],
                sizes: [],
                periods: []
            };
        }

        if (!products[groupKey].sizes.includes(size)) products[groupKey].sizes.push(size);
        if (!products[groupKey].periods.includes(p.billing_period)) products[groupKey].periods.push(p.billing_period);
        
        products[groupKey].variants.push({
            ...p,
            size,
            period: p.billing_period
        });
    });

    return products;
  }, [plansQuery.data]);

  const product = useMemo(() => (slug && groupedProducts[slug]) || null, [slug, groupedProducts]);

  // 3. Identification of Active Plan(s) for this module
  const activePlanIds = useMemo(() => {
    if (!product) return [];
    
    // Check 1: User aggregated features (High priority for bundles)
    const isOwnedViaFeature = (user?.features?.includes(String(product.module_id || '').trim().toUpperCase())) ||
                              (product.module_id === 'ABSENSI' && user?.features?.includes(`ABSENSI-${String(product.mode || 'SIMPLE').trim().toUpperCase()}`));

    if (!subQuery.data) return [];
    const mySubs = (subQuery.data as any).subscriptions || [];
    
    const productCode = String(product.service_code || '').trim().toUpperCase();
    const productName = String(product.baseName || '').trim().toUpperCase();

    // Get all plan IDs owned by user that belong to this service/module
    const directPlanIds = mySubs
      .filter((s: any) => {
        const subCode = String(s.plan_snapshot?.service_code || s.Plan?.service_code || '').trim().toUpperCase();
        const subName = String(s.plan_name || '').trim().toUpperCase();
        
        // Flexible matching: check code, or check if name contains base product name
        const isMatchByCode = subCode && productCode && (subCode === productCode || subCode.startsWith(productCode));
        const isMatchByName = subName && productName && subName.includes(productName);
        
        return isMatchByCode || isMatchByName;
      })
      .map((s: any) => s.plan_id);

    // If owned via feature but no direct plan (e.g. via bundle), 
    // find the bundle subscription ID and return it so UI shows "Owned"
    if (isOwnedViaFeature && directPlanIds.length === 0) {
        const bundleSub = mySubs.find((s: any) => {
            const subId = String(s.Plan?.module_id || s.plan_snapshot?.module_id || '').trim().toUpperCase();
            return subId.startsWith('PAKET_LENGKAP');
        });
        if (bundleSub) return [bundleSub.plan_id];
    }

    return directPlanIds;
  }, [subQuery.data, product, user?.features]);

  // 4. Selection State
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<'MONTH' | 'YEAR'>('MONTH');

  useEffect(() => {
    if (product && !selectedSize) {
      // If there's an active plan in this product group, pre-select it
      if (activePlanIds.length > 0) {
        const activeVariant = product.variants.find((v: any) => activePlanIds.includes(v.id));
        if (activeVariant) {
          setSelectedSize(activeVariant.size);
          setSelectedPeriod(activeVariant.period);
          return;
        }
      }
      setSelectedSize(product.sizes[0]);
    }
  }, [product, selectedSize, activePlanIds]);

  const currentVariant = useMemo(() => {
    if (!product) return null;
    return product.variants.find((v: any) => 
      v.size === selectedSize && 
      String(v.period).toUpperCase().startsWith(String(selectedPeriod).toUpperCase())
    ) || product.variants[0];
  }, [product, selectedSize, selectedPeriod]);

  // 5. Button Label Logic (Hardened for Integrity)
  const purchaseButtonLabel = useMemo(() => {
    if (!activePlanIds.length || !currentVariant) return 'Beli Sekarang';
    
    const mySubs = (subQuery.data as any).subscriptions || [];
    const activeSub = mySubs.find((s: any) => activePlanIds.includes(s.plan_id));
    if (!activeSub) return 'Beli Sekarang';

    // If it's exactly the same plan
    if (currentVariant.id === activeSub.plan_id) {
       if (activeSub.status === 'EXPIRED') return 'Aktifkan Kembali';
       return 'Perpanjang Sekarang';
    }

    // Comparison logic for Upgrade/Downgrade based STRICTLY ON PRICE
    // Normalize prices to monthly equivalent for fair comparison
    const getMonthlyEquivalent = (plan: any) => {
      if (!plan) return 0;
      if (plan.price_monthly && plan.price_monthly > 0) return plan.price_monthly;
      if (plan.price_yearly && plan.price_yearly > 0) return Math.round(plan.price_yearly / 12);
      return 0;
    };

    const activePrice = getMonthlyEquivalent(activeSub.Plan || activeSub.plan_snapshot);
    const currentPrice = getMonthlyEquivalent(currentVariant);

    const activePeriod = String(activeSub.Plan?.billing_period || activeSub.plan_snapshot?.billing_period || '').toUpperCase();
    const currentPeriod = String(currentVariant.period || '').toUpperCase();

    const isActiveYearly = activePeriod.startsWith('YEAR');
    const isCurrentYearly = currentPeriod.startsWith('YEAR');

    // 1. Same Plan check
    if (currentVariant.id === activeSub.plan_id) {
       if (activeSub.status === 'EXPIRED') return 'Aktifkan Kembali';
       return 'Perpanjang Sekarang';
    }

    // 2. Logic based on Commitment (Monthly vs Yearly)
    // If upgrading from Monthly to Yearly -> ALWAYS Upgrade
    if (!isActiveYearly && isCurrentYearly) return 'Upgrade Sekarang';
    // If downgrading from Yearly to Monthly -> ALWAYS Downgrade (unless capacity is much higher)
    if (isActiveYearly && !isCurrentYearly) return 'Downgrade Sekarang';

    // 3. Logic based on Price (if periods are the same)
    if (currentPrice > activePrice) return 'Upgrade Sekarang';
    if (currentPrice < activePrice) return 'Downgrade Sekarang';
    
    return 'Ganti Paket';
  }, [activePlanIds, currentVariant, subQuery.data]);

  // 6. Button Style Config
  const buttonConfig = useMemo(() => {
    const label = purchaseButtonLabel;
    if (label.includes('Upgrade')) {
      return { color: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20', icon: <ArrowUpRight size={18} /> };
    }
    if (label.includes('Downgrade')) {
      return { color: 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20', icon: <ArrowDownRight size={18} /> };
    }
    if (label.includes('Perpanjang') || label.includes('Aktifkan')) {
      return { color: 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20', icon: <Zap size={18} /> };
    }
    return { color: 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20', icon: <ArrowRight size={18} /> };
  }, [purchaseButtonLabel]);

  // UI Helpers

  if (plansQuery.isLoading || modulesQuery.isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center">
         <div className="flex flex-col items-center gap-4">
            <Loader className="w-12 h-12 text-blue-600 animate-spin" />
            <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Memuat Detail Produk...</p>
         </div>
      </div>
    );
  }

  if (!product) {
     return (
       <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col items-center justify-center p-6">
         <motion.div initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} className="text-center space-y-6">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center mx-auto text-slate-400">
               <Info size={40} />
            </div>
            <h1 className="text-2xl font-bold">Produk tidak ditemukan</h1>
            <Button variant="outline" onClick={() => navigate(isAuthenticated ? '/service-center?tab=catalog' : '/pricing')} className="rounded-xl px-8 py-3 h-auto">
               <ArrowLeft size={18} className="mr-2" /> Kembali ke Katalog
            </Button>
         </motion.div>
       </div>
     );
  }

  const theme = getServiceTheme(product.service_code);
  const thumbnail = getServiceThumbnail(product.service_code, product.module, product.mode);
  const IconComp = getServiceIcon(product.service_code, product.icon);

  const handleCheckout = () => {
    if (!currentVariant) return;
    const cycle = selectedPeriod === 'YEAR' ? 12 : 1;
    const targetUrl = isAuthenticated 
      ? `/billing/checkout?plan_id=${currentVariant.id}&cycle=${cycle}` 
      : `/register-tenant?plan_id=${currentVariant.id}&cycle=${cycle}`;
    navigate(targetUrl);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] dark:bg-slate-950 flex flex-col selection:bg-blue-100 selection:text-blue-900">
      {!isAuthenticated && <Navbar />}
      
      <main className={`flex-grow ${!isAuthenticated ? 'pt-24' : 'pt-6'} pb-12`}>
        <div className="container mx-auto px-6">
           {/* Breadcrumb - Compact */}
           <div className="flex items-center gap-2 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-6">
              <span className="hover:text-blue-600 cursor-pointer transition-colors" onClick={() => navigate('/')}>Home</span>
              <ChevronRight size={10} />
              <span className="hover:text-blue-600 cursor-pointer transition-colors" onClick={() => navigate(isAuthenticated ? '/service-center?tab=catalog' : '/pricing')}>Katalog</span>
              <ChevronRight size={10} />
              <span className="text-slate-900 dark:text-white">{product.baseName}</span>
           </div>



           {/* 2. Purchase Panel Card */}
           <div className="mb-10">
              <Card className="p-6 md:p-8 rounded-3xl bg-white dark:bg-slate-900 border-none shadow-xl flex flex-col h-full">
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
                    {/* Left Column: Product Info & Selectors */}
                    <div className="space-y-8">
                       <div>
                          <div className={`text-xs font-black ${theme.text} opacity-90 uppercase tracking-[0.2em] mb-2`}>{product.module} System</div>
                          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white leading-tight tracking-tight mb-3 uppercase">{product.baseName}</h1>
                          
                          <div className="flex items-center gap-4 text-xs">
                             <div className="flex items-center gap-1.5 text-amber-500">
                                {[1,2,3,4,5].map(i => <Star key={i} size={12} className="fill-current" />)}
                                <span className="text-slate-900 dark:text-white font-black ml-1">4.9</span>
                             </div>
                             <div className="w-px h-3 bg-slate-200 dark:bg-slate-800" />
                             <div className="text-slate-500 font-bold">128 Penilaian</div>
                          </div>
                       </div>

                       {/* Price Section - Compact */}
                       <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 border border-slate-100 dark:border-slate-800">
                          <div className="flex items-baseline gap-2">
                             <span className="text-3xl md:text-5xl font-black text-blue-600 tracking-tighter">
                                {formatCurrency(selectedPeriod === 'YEAR' ? (currentVariant?.price_yearly || 0) : (currentVariant?.price_monthly || 0))}
                             </span>
                             <span className="text-slate-500 dark:text-slate-400 text-sm font-black uppercase tracking-widest">
                                {selectedPeriod === 'YEAR' ? '/ TAHUN' : '/ BULAN'}
                             </span>
                          </div>
                          {selectedPeriod === 'YEAR' && currentVariant?.price_monthly && (
                             <div className="mt-2 text-emerald-500 font-black text-[10px] flex items-center gap-2 uppercase tracking-widest">
                                <Zap size={14} className="fill-current" />
                                Hemat {formatCurrency((currentVariant.price_monthly * 12) - (currentVariant.price_yearly || 0))} dibanding bulanan!
                             </div>
                          )}
                       </div>

                       {/* Variant Selectors - Compact */}
                       <div className="space-y-6">
                          {/* Capacity Selection */}
                          <div className="space-y-3">
                             <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Users size={14} /> Pilih Kapasitas Sekolah
                             </label>
                              <div className="flex flex-wrap gap-2">
                                 {product.sizes.map((s: string) => {
                                    // Check if ANY period of this size is active
                                    const isActive = product.variants.some((v: any) => v.size === s && activePlanIds.includes(v.id));
                                    const isCurrentSelectionActive = product.variants.some((v: any) => v.size === s && v.period === selectedPeriod && activePlanIds.includes(v.id));
                                    
                                    return (
                                       <button 
                                          key={s}
                                          onClick={() => setSelectedSize(s)}
                                          className={`relative px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border-2 flex flex-col items-center justify-center min-w-[100px] ${
                                             selectedSize === s 
                                             ? 'bg-slate-900 dark:bg-blue-600 text-white border-slate-900 dark:border-blue-600 shadow-lg scale-105' 
                                             : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-100 dark:border-slate-800 hover:border-slate-200'
                                          } ${isActive ? 'border-emerald-500/50' : ''}`}
                                       >
                                          <div className="flex items-center gap-1.5">
                                            {isActive && <CheckCircle size={10} className={selectedSize === s ? 'text-white' : 'text-emerald-500'} />}
                                            {s}
                                          </div>
                                          {isActive && (
                                            <span className={`text-[8px] mt-0.5 font-black uppercase tracking-tighter ${selectedSize === s ? 'text-blue-100' : 'text-emerald-600'}`}>
                                              {isCurrentSelectionActive ? 'Aktif' : 'Dimiliki'}
                                            </span>
                                          )}
                                       </button>
                                    );
                                 })}
                              </div>
                          </div>

                          {/* Period Selection */}
                          <div className="space-y-3">
                             <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <ShieldCheck size={14} /> Siklus Tagihan
                             </label>
                              <div className="flex flex-wrap gap-2">
                                 {[
                                    { id: 'MONTH', label: 'Bulanan', icon: <Smartphone size={14} /> },
                                    { id: 'YEAR', label: 'Tahunan', icon: <Zap size={14} /> }
                                 ].map((p) => {
                                    // Check if this specific variant (selected size + this period) is active
                                    // Flexible matching for MONTH/MONTHLY and YEAR/YEARLY
                                    const variant = product.variants.find((v: any) => 
                                       v.size === selectedSize && 
                                       String(v.period).toUpperCase().startsWith(String(p.id).toUpperCase())
                                    );
                                    const isActive = variant && activePlanIds.includes(variant.id);

                                    return (
                                       <button 
                                          key={p.id}
                                          onClick={() => setSelectedPeriod(p.id as any)}
                                          className={`relative px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border-2 flex items-center gap-2 ${
                                             selectedPeriod === p.id 
                                             ? 'bg-blue-600 text-white border-blue-600 shadow-lg' 
                                             : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-100 dark:border-slate-800 hover:border-slate-200'
                                          } ${isActive ? 'border-emerald-500/50' : ''}`}
                                       >
                                          {p.icon}
                                          <div className="flex items-center gap-2">
                                            {p.label}
                                            {isActive && <Badge className="bg-emerald-500 text-white border-none text-[7px] h-3 px-1 font-black">AKTIF</Badge>}
                                          </div>
                                       </button>
                                    );
                                 })}
                              </div>
                          </div>
                       </div>
                    </div>

                    {/* Right Column: Product Specifications (Area User Lingkari) */}
                    <div className="lg:border-l lg:border-slate-100 lg:dark:border-slate-800 lg:pl-12 flex flex-col">
                       <div className="space-y-8">
                          {/* Product Description - Added as requested */}
                          <div className="space-y-3">
                             <h4 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Info size={14} className="text-blue-600" /> Penjelasan Produk
                             </h4>
                             <p className="text-[13.5px] font-medium text-slate-600 dark:text-slate-400 leading-relaxed italic">
                                {currentVariant?.description || `Solusi cerdas ${product.baseName} yang dirancang khusus untuk meningkatkan efisiensi dan transparansi operasional di lingkungan sekolah Anda.`}
                             </p>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                             <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                <div className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Kapasitas Maksimal</div>
                                <div className="text-md font-black text-slate-900 dark:text-white uppercase">
                                   {currentVariant?.max_user ? `${currentVariant.max_user} Siswa` : 'Tak Terbatas'}
                                </div>
                             </div>
                             <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                <div className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Mode Operasi</div>
                                <div className="text-md font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                   {product.mode.replace('_', ' ')}
                                </div>
                             </div>
                          </div>

                          <div>
                             <h4 className="text-[10px] font-black text-slate-900 dark:text-white mb-4 uppercase tracking-[0.2em] flex items-center gap-3">
                                <Sparkles size={16} className="text-blue-600" /> Fitur Unggulan :
                             </h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-y-3 gap-x-6">
                                {Array.isArray(currentVariant?.features_json) ? currentVariant.features_json.map((f: string, i: number) => (
                                   <div key={i} className="flex items-start gap-3">
                                      <div className="mt-0.5 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 text-blue-600">
                                         <Check size={12} />
                                      </div>
                                      <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-400 leading-snug">{f}</span>
                                   </div>
                                )) : (
                                   <div className="text-[12px] text-slate-500 italic">Memuat fitur...</div>
                                )}
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* Action Buttons - Compact */}
                 <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <Button 
                          variant="outline"
                          className="h-14 rounded-xl font-black text-[11px] uppercase tracking-widest border-2 flex items-center justify-center gap-3 hover:bg-slate-50"
                       >
                          <MessageSquare size={18} /> Chat Admin
                       </Button>
                       <Button 
                          onClick={handleCheckout}
                          className={`h-14 rounded-xl ${buttonConfig.color} text-white font-black text-[11px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 group transition-all duration-300`}
                       >
                          {purchaseButtonLabel}
                          <span className="group-hover:translate-x-1 group-hover:-translate-y-0.5 transition-transform">
                            {buttonConfig.icon}
                          </span>
                       </Button>
                    </div>
                 </div>
              </Card>
           </div>

           {/* 3. Efisien & Terpercaya Card (MOVED TO THIRD POSITION) */}
           <div className="mb-10">
              <Card className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-blue-900 text-white border-none shadow-xl relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full -mr-16 -mt-16" />
                 <h3 className="text-lg font-black mb-6 uppercase tracking-tight">Efisien & Terpercaya</h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                       { title: "Cloud Native", desc: "Akses fleksibel kapan saja.", icon: <Cloud size={16} /> },
                       { title: "Real-time", desc: "Data instan & akurat.", icon: <Target size={16} /> },
                       { title: "Bantuan 24/7", desc: "Support teknis siaga.", icon: <Users size={16} /> }
                    ].map((item, i) => (
                       <div key={i} className="flex gap-3 items-center p-3 rounded-xl bg-white/5 border border-white/10">
                          <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center flex-shrink-0">
                             {item.icon}
                          </div>
                          <div>
                             <h4 className="font-black text-[11px] uppercase tracking-tighter">{item.title}</h4>
                             <p className="text-[10px] text-blue-100/60 font-medium">{item.desc}</p>
                          </div>
                       </div>
                    ))}
                 </div>
                 <Button className="w-full mt-6 rounded-xl bg-white text-blue-950 font-black h-11 text-[10px] uppercase tracking-widest hover:bg-blue-50 transition-all">
                    Dokumentasi Lengkap
                 </Button>
              </Card>
           </div>

           {/* 4. Media Section (Image) */}
           <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-lg border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
              <div className={`absolute inset-0 bg-gradient-to-b ${theme.gradient} opacity-40`}></div>
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                 <div className="aspect-video md:w-1/2 flex items-center justify-center">
                    {thumbnail ? (
                       <motion.img 
                          layoutId={`img-${product.id}`}
                          src={thumbnail} 
                          alt={product.baseName}
                          className="w-full h-full object-contain filter drop-shadow-[0_15px_30px_rgba(0,0,0,0.15)] transform group-hover:scale-105 transition-transform duration-700 [mask-image:radial-gradient(circle,white_70%,transparent_100%)] dark:opacity-90"
                       />
                    ) : (
                       <div className={`w-24 h-24 rounded-xl ${theme.iconBg} text-white flex items-center justify-center shadow-xl`}>
                          <IconComp size={48} />
                       </div>
                    )}
                 </div>
                 
                 <div className="md:w-1/2 grid grid-cols-2 gap-3 relative z-10">
                    <Card className="p-4 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-3 backdrop-blur-sm">
                       <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center">
                          <Shield size={20} />
                       </div>
                       <div>
                          <div className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Keamanan</div>
                          <div className="text-xs font-black">Enterprise</div>
                       </div>
                    </Card>
                    <Card className="p-4 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-3 backdrop-blur-sm">
                       <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center">
                          <Star size={20} />
                       </div>
                       <div>
                          <div className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Rating</div>
                          <div className="text-xs font-black">4.9/5.0 Stars</div>
                       </div>
                    </Card>
                 </div>
              </div>
           </div>
        </div>
      </main>

      {!isAuthenticated && <Footer />}
    </div>
  );
}
