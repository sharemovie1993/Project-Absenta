import React, { useMemo, useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, Button, Badge, Loader, SectionCard } from '@/components/ui';
import { 
  CheckCircle, 
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
  Shield,
  Star,
  MessageSquare,
  ChevronRight
} from 'lucide-react';
import { getPublicPlans, formatCurrency } from '@/api/plans.api';
import type { Plan } from '@/types/plans';
import { useAuthStore } from '@/store/authStore';
import { getPublicModules } from '@/api/module.api';
import { useQuery } from '@tanstack/react-query';
import { getMySubscription } from '@/api/mySubscription.api';
import { 
  getServiceIcon, 
  getServiceTheme, 
  getServiceThumbnail 
} from '@/lib/billingUtils';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';

interface GroupedProduct {
  id: string;
  baseName: string;
  mode: string;
  module: string;
  icon: string;
  service_code: string;
  module_id: string;
  variants: Plan[];
  sizes: string[];
  periods: string[];
}

interface SubscriptionItem {
  plan_id: string;
  status: string;
  plan_name?: string;
  Plan?: Plan;
  plan_snapshot?: Plan;
}

interface MySubscriptionData {
  subscriptions: SubscriptionItem[];
}

function ServiceDetailContent() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user, tenantId } = useAuthStore();
  
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

  const subQuery = useQuery<any>({
    queryKey: ['my-subscription', tenantId],
    queryFn: async () => {
      const res = await getMySubscription();
      return res.success ? res.data : null;
    },
    enabled: isAuthenticated,
  });

  // 2. Grouping Logic
  const groupedProducts = useMemo(() => {
    const plans = plansQuery.data || [];
    const products: Record<string, GroupedProduct> = {};

    plans.forEach((p: any) => {
        const baseName = (p.name || '')
            .replace(/\((Micro|Small|Medium|Large|Enterprise|Bulanan|Tahunan|Monthly|Yearly)\)/gi, '')
            .replace(/\b(Micro|Small|Medium|Large|Enterprise|Bulanan|Tahunan|Monthly|Yearly)\b/gi, '')
            .replace(/-/g, '')
            .replace(/\s+/g, ' ')
            .trim();
            
        const moduleName = p.module?.name || 'Layanan';
        const mode = p.absensi_mode || 'STANDARD';
        const size = p.size_label || p.size || 'Standard';
        const serviceCode = String(p.serviceCode || p.service_code || p.moduleId || p.module_id || '').toUpperCase();
        
        // Group key matching UnifiedCatalog
        const groupKey = serviceCode || `${baseName}-${mode}`;
        
        if (!products[groupKey]) {
            products[groupKey] = {
                id: groupKey,
                baseName,
                mode,
                module: p.module?.name || moduleName,
                icon: p.module?.icon || 'Package',
                service_code: serviceCode,
                module_id: p.module_id || p.moduleId || '',
                variants: [],
                sizes: [],
                periods: []
            };
        }

        if (!products[groupKey].sizes.includes(size)) products[groupKey].sizes.push(size);
        if (p.billing_period && !products[groupKey].periods.includes(p.billing_period)) {
          products[groupKey].periods.push(p.billing_period);
        }
        
        products[groupKey].variants.push({
            ...p,
            size_label: size,
            billing_period: p.billing_period || p.billingPeriod
        });
    });

    return products;
  }, [plansQuery.data]);

  const product = useMemo(() => {
    if (!slug) return null;
    const slugUpper = slug.toUpperCase().trim();
    
    // 1. Direct match by group key
    if (groupedProducts[slug]) return groupedProducts[slug];
    if (groupedProducts[slugUpper]) return groupedProducts[slugUpper];
    
    // 2. Robust lookup by service_code, module_id, or baseName
    const list = Object.values(groupedProducts);
    const matched = list.find(g => 
      g.id.toUpperCase() === slugUpper ||
      g.service_code.toUpperCase() === slugUpper ||
      g.module_id.toUpperCase() === slugUpper ||
      g.baseName.toUpperCase().includes(slugUpper) ||
      slugUpper.includes(g.service_code.toUpperCase()) ||
      g.variants.some((v: any) => v.id?.toUpperCase() === slugUpper)
    );
    
    return matched || list[0] || null;
  }, [slug, groupedProducts]);

  // 3. Identification of Active Plan(s) for this module
  const activePlanIds = useMemo(() => {
    if (!product) return [];
    
    const isOwnedViaFeature = (user?.features?.includes(String(product.module_id || '').trim().toUpperCase())) ||
                              (product.module_id === 'ABSENSI' && user?.features?.includes(`ABSENSI-${String(product.mode || 'SIMPLE').trim().toUpperCase()}`));

    if (!subQuery.data) return [];
    const mySubsRaw = subQuery.data;
    const mySubs = Array.isArray(mySubsRaw) ? mySubsRaw : (mySubsRaw?.subscriptions || []);
    
    const productCode = String(product.service_code || '').trim().toUpperCase();
    const productName = String(product.baseName || '').trim().toUpperCase();

    const directPlanIds = mySubs
      .filter((s: SubscriptionItem) => {
        const subCode = String(s.plan_snapshot?.service_code || s.Plan?.service_code || '').trim().toUpperCase();
        const subName = String(s.plan_name || '').trim().toUpperCase();
        
        const isMatchByCode = subCode && productCode && (subCode === productCode || subCode.startsWith(productCode));
        const isMatchByName = subName && productName && subName.includes(productName);
        
        return isMatchByCode || isMatchByName;
      })
      .map((s: SubscriptionItem) => s.plan_id);

    if (isOwnedViaFeature && directPlanIds.length === 0) {
        const bundleSub = mySubs.find((s: SubscriptionItem) => {
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
      if (activePlanIds.length > 0) {
        const activeVariant = product.variants.find((v: Plan) => activePlanIds.includes(v.id));
        if (activeVariant) {
          setSelectedSize(activeVariant.size_label || 'Standard');
          setSelectedPeriod(activeVariant.billing_period?.startsWith('YEAR') ? 'YEAR' : 'MONTH');
          return;
        }
      }
      setSelectedSize(product.sizes[0] || 'Standard');
    }
  }, [product, selectedSize, activePlanIds]);

  const currentVariant = useMemo(() => {
    if (!product) return null;
    return product.variants.find((v: Plan) => 
      v.size_label === selectedSize && 
      String(v.billing_period).toUpperCase().startsWith(String(selectedPeriod).toUpperCase())
    ) || product.variants[0] || null;
  }, [product, selectedSize, selectedPeriod]);

  // 5. Button Label Logic
  const purchaseButtonLabel = useMemo(() => {
    if (!activePlanIds.length || !currentVariant) return 'Beli Sekarang';
    
    const mySubsRaw = subQuery.data;
    const mySubs = Array.isArray(mySubsRaw) ? mySubsRaw : (mySubsRaw?.subscriptions || []);
    const activeSub = mySubs.find((s: SubscriptionItem) => activePlanIds.includes(s.plan_id));
    if (!activeSub) return 'Beli Sekarang';

    const getMonthlyEquivalent = (plan: Plan | undefined) => {
      if (!plan) return 0;
      if (plan.price_monthly && plan.price_monthly > 0) return plan.price_monthly;
      if (plan.price_yearly && plan.price_yearly > 0) return Math.round(plan.price_yearly / 12);
      return 0;
    };

    const activePrice = getMonthlyEquivalent(activeSub.Plan || activeSub.plan_snapshot);
    const currentPrice = getMonthlyEquivalent(currentVariant);

    const activePeriod = String(activeSub.Plan?.billing_period || activeSub.plan_snapshot?.billing_period || '').toUpperCase();
    const currentPeriod = String(currentVariant.billing_period || '').toUpperCase();

    const isActiveYearly = activePeriod.startsWith('YEAR');
    const isCurrentYearly = currentPeriod.startsWith('YEAR');

    if (currentVariant.id === activeSub.plan_id) {
       if (activeSub.status === 'EXPIRED') return 'Aktifkan Kembali';
       return 'Perpanjang Sekarang';
    }

    if (!isActiveYearly && isCurrentYearly) return 'Upgrade Sekarang';
    if (isActiveYearly && !isCurrentYearly) return 'Downgrade Sekarang';
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

  const handleCheckout = useCallback(() => {
    if (!currentVariant) return;
    const cycle = selectedPeriod === 'YEAR' ? 12 : 1;
    const targetUrl = isAuthenticated 
      ? `/billing/checkout?plan_id=${currentVariant.id}&cycle=${cycle}` 
      : `/register-tenant?plan_id=${currentVariant.id}&cycle=${cycle}`;
    navigate(targetUrl);
  }, [currentVariant, selectedPeriod, isAuthenticated, navigate]);

  const handleGoHome = useCallback(() => navigate('/'), [navigate]);
  const handleGoCatalog = useCallback(() => navigate(isAuthenticated ? '/service-center?tab=catalog' : '/pricing'), [isAuthenticated, navigate]);
  const handleContactAdmin = useCallback(() => window.open('https://wa.me/6281222333444', '_blank'), []);

  const breadcrumbs = useMemo(() => [
    { label: 'Layanan' },
    { label: 'Katalog' },
    { label: product?.baseName || 'Detail' }
  ], [product?.baseName]);

  const instruction = useMemo(() => ({
    title: 'Detail Produk & Konfigurasi',
    description: 'Pilih kapasitas dan siklus penagihan yang paling sesuai untuk sekolah Anda.',
    items: [
      { text: 'Pilih kapasitas siswa yang sesuai dengan populasi sekolah Anda.' },
      { text: 'Pilih siklus penagihan Tahunan untuk penghematan biaya maksimal.' },
      { text: 'Fitur unggulan akan menyesuaikan dengan varian paket yang dipilih.' }
    ]
  }), []);

  if (plansQuery.isLoading || modulesQuery.isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center">
         <div className="flex flex-col items-center gap-4">
            <Loader size="lg" className="text-blue-600" />
            <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Memuat Detail Produk...</p>
         </div>
      </div>
    );
  }

  if (!product) {
     return (
       <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col items-center justify-center p-6">
         <motion.div initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} className="text-center space-y-6">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
               <Info size={40} />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight">Produk tidak ditemukan</h1>
            <Button variant="outline" onClick={handleGoCatalog} className="rounded-xl px-10 py-4 h-auto text-xs font-black uppercase tracking-widest border-2">
               <ArrowLeft size={18} className="mr-2" /> Kembali ke Katalog
            </Button>
         </motion.div>
       </div>
     );
  }

  const theme = getServiceTheme(product.service_code);
  const thumbnail = getServiceThumbnail(product.service_code, product.module, product.mode);
  const IconComp = getServiceIcon(product.service_code, product.icon);

  return (
    <AcademicPageLayout
      title={product.baseName}
      description={`Solusi cerdas ${product.baseName} yang dirancang khusus untuk meningkatkan efisiensi sekolah Anda.`}
      breadcrumbs={breadcrumbs}
      instruction={instruction}
      hardeningModuleKey="service_detail_page"
    >
      <div className="pb-12 max-w-7xl mx-auto">
        {/* Breadcrumb - Compact */}
        <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-8">
          <span className="hover:text-blue-600 cursor-pointer transition-colors" onClick={handleGoHome}>Home</span>
          <ChevronRight size={10} />
          <span className="hover:text-blue-600 cursor-pointer transition-colors" onClick={handleGoCatalog}>Katalog</span>
          <ChevronRight size={10} />
          <span className="text-slate-900 dark:text-white">{product.baseName}</span>
        </div>

        {/* 2. Purchase Panel Card */}
        <SectionCard noPadding fullWidth className="mb-12 border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
          <div className="p-8 md:p-12 bg-white dark:bg-slate-900 relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] -mr-32 -mt-32" />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 relative z-10">
              {/* Left Column: Product Info & Selectors */}
              <div className="space-y-10">
                <div>
                  <div className={`text-[10px] font-black ${theme.text} opacity-90 uppercase tracking-[0.3em] mb-3`}>{product.module} System</div>
                  <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white leading-none tracking-tight mb-5 uppercase">{product.baseName}</h1>
                  
                  <div className="flex items-center gap-5 text-[10px]">
                    <div className="flex items-center gap-1.5 text-amber-500">
                      {[1,2,3,4,5].map(i => <Star key={i} size={14} className="fill-current" />)}
                      <span className="text-slate-900 dark:text-white font-black ml-2 text-xs">4.9</span>
                    </div>
                    <div className="w-px h-4 bg-slate-200 dark:bg-slate-800" />
                    <div className="text-slate-500 font-black uppercase tracking-widest">128 Penilaian</div>
                  </div>
                </div>

                {/* Price Section - Compact */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] p-8 border border-slate-100 dark:border-slate-800 shadow-inner">
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl md:text-6xl font-black text-blue-600 tracking-tighter">
                      {formatCurrency(selectedPeriod === 'YEAR' ? (currentVariant?.price_yearly || 0) : (currentVariant?.price_monthly || 0))}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500 text-xs font-black uppercase tracking-[0.2em]">
                      {selectedPeriod === 'YEAR' ? '/ TAHUN' : '/ BULAN'}
                    </span>
                  </div>
                  {selectedPeriod === 'YEAR' && currentVariant?.price_monthly && (
                    <div className="mt-4 text-emerald-500 font-black text-[10px] flex items-center gap-2 uppercase tracking-widest bg-emerald-500/10 w-fit px-3 py-1.5 rounded-full">
                      <Zap size={14} className="fill-current" />
                      Hemat {formatCurrency((currentVariant.price_monthly * 12) - (currentVariant.price_yearly || 0))} dibanding bulanan!
                    </div>
                  )}
                </div>

                {/* Variant Selectors - Compact */}
                <div className="space-y-8">
                  {/* Capacity Selection */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Users size={16} className="text-blue-600" /> Pilih Kapasitas Sekolah
                    </label>
                    <div className="flex flex-wrap gap-3">
                    {product?.sizes?.map((s: string) => {
                      const isActive = product?.variants?.some((v: Plan) => v.size_label === s && activePlanIds.includes(v.id));
                      const isCurrentSelectionActive = product?.variants?.some((v: Plan) => v.size_label === s && v.billing_period?.startsWith(selectedPeriod) && activePlanIds.includes(v.id));
                        
                        return (
                          <button 
                            key={s}
                            onClick={() => setSelectedSize(s)}
                            className={`relative px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all border-2 flex flex-col items-center justify-center min-w-[120px] h-16 ${
                              selectedSize === s 
                              ? 'bg-slate-900 dark:bg-blue-600 text-white border-slate-900 dark:border-blue-600 shadow-xl scale-105' 
                              : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800'
                            } ${isActive ? 'ring-2 ring-emerald-500/30' : ''}`}
                          >
                            <div className="flex items-center gap-2">
                              {isActive && <CheckCircle size={12} className={selectedSize === s ? 'text-white' : 'text-emerald-500'} />}
                              {s}
                            </div>
                            {isActive && (
                              <span className={`text-[8px] mt-1 font-black uppercase tracking-tighter ${selectedSize === s ? 'text-blue-100' : 'text-emerald-500'}`}>
                                {isCurrentSelectionActive ? 'Aktif Saat Ini' : 'Sudah Dimiliki'}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Period Selection */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <ShieldCheck size={16} className="text-blue-600" /> Siklus Tagihan
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { id: 'MONTH', label: 'Bulanan', icon: <Smartphone size={16} /> },
                        { id: 'YEAR', label: 'Tahunan', icon: <Zap size={16} /> }
                      ].map((p) => {
                        const variant = product.variants.find((v: Plan) => 
                          v.size_label === selectedSize && 
                          String(v.billing_period).toUpperCase().startsWith(String(p.id).toUpperCase())
                        );
                        const isActive = variant && activePlanIds.includes(variant.id);

                        return (
                          <button 
                            key={p.id}
                            onClick={() => setSelectedPeriod(p.id as any)}
                            className={`relative px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all border-2 flex items-center gap-3 ${
                              selectedPeriod === p.id 
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xl' 
                              : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800'
                            } ${isActive ? 'ring-2 ring-emerald-500/30' : ''}`}
                          >
                            {p.icon}
                            <div className="flex items-center gap-2">
                              {p.label}
                              {isActive && <Badge className="bg-emerald-500 text-white border-none text-[8px] h-4 px-2 font-black shadow-sm">AKTIF</Badge>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Product Specifications */}
              <div className="lg:border-l lg:border-slate-100 lg:dark:border-slate-800 lg:pl-20 flex flex-col justify-center">
                <div className="space-y-10">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3">
                      <Info size={16} className="text-blue-600" /> Deskripsi Layanan
                    </h4>
                    <p className="text-[15px] font-medium text-slate-600 dark:text-slate-400 leading-relaxed italic">
                      {currentVariant?.description || `Solusi cerdas ${product.baseName} yang dirancang khusus untuk meningkatkan efisiensi dan transparansi operasional di lingkungan sekolah Anda.`}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 shadow-sm">
                      <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Kapasitas Maksimal</div>
                      <div className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        {currentVariant?.max_user ? `${currentVariant.max_user} Siswa` : 'Tak Terbatas'}
                      </div>
                    </div>
                    <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 shadow-sm">
                      <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Mode Operasi</div>
                      <div className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        {product.mode.replace('_', ' ')}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.3em] flex items-center gap-3">
                      <Sparkles size={18} className="text-blue-600" /> Fitur Unggulan Sistem
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
                      {Array.isArray(currentVariant?.features_json) ? currentVariant.features_json.map((f: string, i: number) => (
                        <div key={i} className="flex items-start gap-4 group/item">
                          <div className="mt-0.5 w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 text-blue-600 transition-transform group-hover/item:scale-110">
                            <Check size={14} className="stroke-[3]" />
                          </div>
                          <span className="text-[14px] font-bold text-slate-600 dark:text-slate-400 leading-snug uppercase tracking-tight">{f}</span>
                        </div>
                      )) : (
                        <div className="text-[12px] text-slate-500 italic uppercase font-black tracking-widest">Daftar fitur standar disertakan</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons - Compact */}
            <div className="mt-16 pt-10 border-t border-slate-100 dark:border-slate-800 relative z-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Button 
                  variant="outline"
                  className="h-16 rounded-2xl font-black text-[11px] uppercase tracking-widest border-2 flex items-center justify-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95"
                  onClick={handleContactAdmin}
                >
                  <MessageSquare size={20} /> Chat Konsultasi Admin
                </Button>
                <Button 
                  onClick={handleCheckout}
                  className={`h-16 rounded-2xl ${buttonConfig.color} text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-4 group transition-all duration-500 active:scale-95`}
                >
                  {purchaseButtonLabel}
                  <span className="group-hover:translate-x-2 group-hover:-translate-y-1 transition-transform duration-300">
                    {buttonConfig.icon}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* 3. Efisien & Terpercaya Card */}
        <SectionCard noPadding fullWidth className="mb-12 border-none shadow-2xl rounded-[3rem] overflow-hidden">
          <div className="p-10 bg-gradient-to-br from-slate-900 to-blue-900 text-white relative group">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 blur-[120px] rounded-full -mr-48 -mt-48 transition-transform group-hover:scale-110 duration-1000" />
            <h3 className="text-xl font-black mb-10 uppercase tracking-[0.2em]">Teknologi Efisien & Terpercaya</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: "Cloud Native", desc: "Akses fleksibel kapan saja, di mana saja.", icon: <Cloud size={20} /> },
                { title: "Real-time Sync", desc: "Data instan & akurat setiap detik.", icon: <Target size={20} /> },
                { title: "Bantuan 24/7", desc: "Support teknis siaga membantu Anda.", icon: <Users size={20} /> }
              ].map((item, i) => (
                <div key={i} className="flex gap-5 items-center p-6 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-md transition-all hover:bg-white/10">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0 shadow-inner">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="font-black text-xs uppercase tracking-widest mb-1">{item.title}</h4>
                    <p className="text-[11px] text-blue-100/60 font-medium leading-relaxed uppercase tracking-tight">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button className="w-full mt-10 rounded-2xl bg-white text-blue-950 font-black h-14 text-[11px] uppercase tracking-[0.2em] hover:bg-blue-50 transition-all shadow-xl active:scale-[0.98]">
              Pelajari Dokumentasi Lengkap
            </Button>
          </div>
        </SectionCard>

        {/* 4. Media Section (Image) */}
        <SectionCard noPadding fullWidth className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
          <div className={`absolute inset-0 bg-gradient-to-b ${theme.gradient} opacity-20`}></div>
          <div className="p-12 relative z-10 flex flex-col md:flex-row items-center gap-12">
            <div className="aspect-video md:w-1/2 flex items-center justify-center relative">
              <div className={`absolute inset-0 ${theme.iconBg} opacity-5 blur-[80px] rounded-full`} />
              {thumbnail ? (
                <motion.img 
                  layoutId={`img-${product.id}`}
                  src={thumbnail} 
                  alt={product.baseName}
                  className="w-full h-full object-contain filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.2)] transform group-hover:scale-110 transition-transform duration-1000 [mask-image:radial-gradient(circle,white_80%,transparent_100%)] dark:opacity-90 relative z-10"
                />
              ) : (
                <div className={`w-32 h-32 rounded-3xl ${theme.iconBg} text-white flex items-center justify-center shadow-2xl relative z-10`}>
                  <IconComp size={64} />
                </div>
              )}
            </div>
            
            <div className="md:w-1/2 grid grid-cols-2 gap-5 relative z-10">
              <Card className="p-6 rounded-[2rem] bg-white/60 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 shadow-xl flex items-center gap-5 backdrop-blur-xl transition-transform hover:-translate-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center shadow-inner">
                  <Shield size={24} />
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Keamanan</div>
                  <div className="text-sm font-black uppercase tracking-tight">Grade A+</div>
                </div>
              </Card>
              <Card className="p-6 rounded-[2rem] bg-white/60 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 shadow-xl flex items-center gap-5 backdrop-blur-xl transition-transform hover:-translate-y-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center shadow-inner">
                  <Star size={24} />
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Kepuasan</div>
                  <div className="text-sm font-black uppercase tracking-tight">4.9/5.0</div>
                </div>
              </Card>
            </div>
          </div>
        </SectionCard>
      </div>
    </AcademicPageLayout>
  );
}

export default function ServiceDetailPage() {
  return (
    <ServiceDetailContent />
  );
}
