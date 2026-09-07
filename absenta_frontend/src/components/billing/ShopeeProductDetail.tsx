
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  ShoppingCart, 
  Sparkles, 
  Check, 
  CheckCircle2, 
  ShieldCheck, 
  Clock, 
  Building2, 
  HelpCircle, 
  Zap, 
  Lock,
  Layers
} from 'lucide-react';
import { Button } from '../ui';
import { formatCurrency, getServiceIcon, isCompleteBundlePlan } from '@/lib/billingUtils';
import { useCartStore } from '../../store/useCartStore';
import toast from 'react-hot-toast';

export interface ProductDetailProps {
  group: any;
  onBack: () => void;
  onCheckout?: (payload: any) => void;
  activeAcademicTier?: string;
  ownedServices?: any[];
  checkoutProcessing?: boolean;
}

const SIZE_ORDER = ['Micro', 'Small', 'Medium', 'Large', 'Enterprise', 'Pro', 'Ultra', 'Lite', 'Basic', 'Standard'];

const TIER_CAPACITY_INFO: Record<string, { maxUsers: number; capacityLabel: string; suitableFor: string }> = {
  MICRO: { maxUsers: 200, capacityLabel: 's.d 200 Siswa', suitableFor: 'SD / SMP Kecil' },
  SMALL: { maxUsers: 500, capacityLabel: 's.d 500 Siswa', suitableFor: 'SMP / SMA Sedang' },
  MEDIUM: { maxUsers: 1000, capacityLabel: 's.d 1.000 Siswa', suitableFor: 'SMA / SMK Standar' },
  LARGE: { maxUsers: 1500, capacityLabel: 's.d 1.500 Siswa', suitableFor: 'SMKN / SMAN Besar' },
  ENTERPRISE: { maxUsers: 2500, capacityLabel: 's.d 2.500 Siswa', suitableFor: 'SMKN / Kampus Terbesar' },
  ULTRA: { maxUsers: 5000, capacityLabel: 's.d 5.000 Siswa', suitableFor: 'Yayasan / Multi-Kampus' },
};

const extractSizeLabel = (v: any): string => {
  if (v?.size_label) return v.size_label;
  const name = String(v?.name || v?.title || '');
  const id = String(v?.id || '');
  if (/\b(Micro)\b/i.test(name) || /MICRO/i.test(id)) return 'Micro';
  if (/\b(Small)\b/i.test(name) || /SMALL/i.test(id)) return 'Small';
  if (/\b(Medium)\b/i.test(name) || /MEDIUM/i.test(id)) return 'Medium';
  if (/\b(Large)\b/i.test(name) || /LARGE/i.test(id)) return 'Large';
  if (/\b(Enterprise)\b/i.test(name) || /ENTERPRISE/i.test(id)) return 'Enterprise';
  if (/\b(Ultra|Campus)\b/i.test(name) || /ULTRA/i.test(id)) return 'Ultra';
  const limit = v?.device_limit || v?.max_user || 0;
  if (limit > 0) {
    if (limit <= 300) return 'Micro';
    if (limit <= 600) return 'Small';
    if (limit <= 1200) return 'Medium';
    if (limit <= 2500) return 'Large';
    return 'Enterprise';
  }
  return 'Standard';
};

export const ShopeeProductDetail: React.FC<ProductDetailProps> = ({
  group,
  onBack,
  onCheckout,
  activeAcademicTier = 'Micro',
  ownedServices = [],
  checkoutProcessing = false
}) => {
  const isHardware = Boolean(group.isHardware);
  const addItemToCart = useCartStore((state) => state.addItem);
  const setCartOpen = useCartStore((state) => state.setCartOpen);

  // Group variants by size
  const groupedVariants = useMemo(() => {
    if (!group?.variants) return [];
    const map = new Map<string, any[]>();
    group.variants.forEach((v: any) => {
      const key = extractSizeLabel(v);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(v);
    });
    return Array.from(map.entries()).sort(([a], [b]) => {
      const ai = SIZE_ORDER.findIndex(s => s.toLowerCase() === a.toLowerCase());
      const bi = SIZE_ORDER.findIndex(s => s.toLowerCase() === b.toLowerCase());
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [group?.variants]);

  // Initial State selection
  const defaultSize = useMemo(() => {
    if (groupedVariants.length > 0) {
      const academicTierLower = String(activeAcademicTier || 'Micro').toLowerCase();
      const matched = groupedVariants.find(([s]) => s.toLowerCase() === academicTierLower);
      return matched ? matched[0] : groupedVariants[0][0];
    }
    return 'Micro';
  }, [groupedVariants, activeAcademicTier]);

  const [selectedSize, setSelectedSize] = useState<string>(defaultSize);
  const [selectedPeriod, setSelectedPeriod] = useState<'MONTH' | 'YEAR' | 'ONETIME'>(isHardware ? 'ONETIME' : 'MONTH');
  const [selectedHwVariantId, setSelectedHwVariantId] = useState<string>(group.variants?.[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'features' | 'bos_guide' | 'faq'>('features');
  const [imgError, setImgError] = useState(false);

  // Resolve matching plan
  const selectedPlan = useMemo(() => {
    if (!group?.variants || group.variants.length === 0) return null;
    if (isHardware) {
      return group.variants.find((v: any) => v.id === selectedHwVariantId) || group.variants[0];
    }
    const sizeMatch = group.variants.find((v: any) => {
      const vSize = extractSizeLabel(v);
      const vPeriod = v.billing_period === 'YEARLY' ? 'YEAR' : (v.billing_period === 'MONTHLY' ? 'MONTH' : v.billing_period);
      return vSize.toLowerCase() === selectedSize.toLowerCase() && vPeriod === selectedPeriod;
    });
    if (sizeMatch) return sizeMatch;
    return group.variants.find((v: any) => extractSizeLabel(v).toLowerCase() === selectedSize.toLowerCase()) || group.variants[0];
  }, [group?.variants, isHardware, selectedHwVariantId, selectedSize, selectedPeriod]);

  // Price Calculation
  const priceMonthly = Number(selectedPlan?.price_monthly || 0);
  const priceYearly = Number(selectedPlan?.price_yearly || 0);
  const priceOnetime = Number(selectedPlan?.price_onetime || 0);

  const displayPrice = isHardware
    ? (priceOnetime || priceMonthly || 0)
    : (selectedPeriod === 'YEAR'
        ? (priceYearly > 0 ? priceYearly : Math.round(priceMonthly * 12 * 0.8))
        : priceMonthly
      );

  const yearlySavings = !isHardware && selectedPeriod === 'YEAR' && priceMonthly > 0
    ? ((priceMonthly * 12) - displayPrice)
    : 0;

  // Unit Cost Calculation per student
  const currentTierKey = selectedSize.toUpperCase();
  const currentTierInfo = TIER_CAPACITY_INFO[currentTierKey] || TIER_CAPACITY_INFO['ENTERPRISE'];
  const effectiveMonthlyPrice = selectedPeriod === 'YEAR'
    ? Math.round(displayPrice / 12)
    : displayPrice;
  const perStudentPerMonth = currentTierInfo?.maxUsers > 0
    ? Math.round(effectiveMonthlyPrice / currentTierInfo.maxUsers)
    : 0;

  const featuresList = useMemo(() => {
    const raw = selectedPlan?.features_json || group?.features_json;
    if (Array.isArray(raw)) return raw.filter(Boolean);
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
      } catch {
        return [];
      }
    }
    return [];
  }, [selectedPlan, group]);

  const isCompleteBundle = useMemo(() => {
    return isCompleteBundlePlan(group) || isCompleteBundlePlan(selectedPlan);
  }, [group, selectedPlan]);

  const detailedFeatures = useMemo(() => {
    const list: { title: string; description: string; isHighlight?: boolean }[] = [];
    const seenTitles = new Set<string>();

    const addFeature = (title: string, description: string, isHighlight = false) => {
      const key = title.toLowerCase().trim();
      if (!seenTitles.has(key)) {
        seenTitles.add(key);
        list.push({ title, description, isHighlight });
      }
    };

    if (!isHardware) {
      // 1. Core Platform Base
      addFeature('Academic Core TU & Guru', 'Jurnal mengajar GTK, kalender akademik, dan olah kurikulum.');
      addFeature('Kesiswaan & Disiplin Siswa', 'Poin pelanggaran, catatan konseling BK, dan prestasi siswa.');

      // 2. Jika Paket Lengkap: Otomatis tambahkan seluruh suite resmi + Easy Tunnel
      if (isCompleteBundle) {
        addFeature('Presensi Digital Multi-Sesi', 'Absensi RFID, Geofencing GPS, multi-shift, & magang DUDI.');
        addFeature('Koperasi & POS Kasir Digital', 'Kasir minimarket/kantin, tabungan siswa, & laporan SHU.');
        addFeature('Manajemen Sarana & Prasarana', 'Inventaris aset sekolah, cetak barcode QR, & peminjaman alat.');
        addFeature('Hubungan Industri & PKL (BKK)', 'Kemitraan DUDI, jurnal magang digital, & Tracer Study alumni.');
        addFeature('WhatsApp Gateway Notifikasi', 'Broadcast instan presensi kehadiran, tagihan, & pengumuman.');
        addFeature('Domain Online Easy Tunnel', 'Subdomain .absenta.id + SSL HTTPS gratis tanpa perlu IP Publik.', true);
        addFeature('Prioritas Dukungan Teknis 24/7', 'Jaminan SLA Uptime 99.9%, update otomatis, & backup harian.');
        return list;
      }
    }

    const MODULE_FEATURE_MAP: Record<string, { title: string; description: string }> = {
      KOPERASI: {
        title: 'Koperasi & POS Kasir Digital',
        description: 'Kasir minimarket/kantin, tabungan siswa, kartu cashless, & SHU.'
      },
      COOPERATIVE: {
        title: 'Koperasi & POS Kasir Digital',
        description: 'Kasir minimarket/kantin, tabungan siswa, kartu cashless, & SHU.'
      },
      SARPRAS: {
        title: 'Manajemen Sarana & Prasarana',
        description: 'Inventaris aset sekolah, cetak barcode QR, & peminjaman alat.'
      },
      INVENTORY: {
        title: 'Manajemen Sarana & Prasarana',
        description: 'Inventaris aset sekolah, cetak barcode QR, & peminjaman alat.'
      },
      HUBIN: {
        title: 'Hubungan Industri & PKL (BKK)',
        description: 'Kemitraan DUDI, jurnal magang digital, & Tracer Study alumni.'
      },
      BKK: {
        title: 'Bursa Kerja Khusus & Alumni',
        description: 'Penyaluran tenaga kerja lulusan dan kuesioner Tracer Study.'
      },
      WHATSAPP: {
        title: 'WhatsApp Gateway Notifikasi',
        description: 'Broadcast otomatis absensi kehadiran, tagihan, & pengumuman.'
      },
      ABSENSI: {
        title: 'Presensi Digital Standar',
        description: 'Absensi RFID kartu, QR Code, Geofencing GPS, & laporan real-time.'
      },
      'ABSENSI-MULTI_SESI': {
        title: 'Presensi Digital Multi-Sesi',
        description: 'Absensi multi-shift, monitoring DUDI PKL, lembur GTK, & ekstrakurikuler.'
      },
      CBT: {
        title: 'Ujian Online CBT & Bank Soal',
        description: 'Pelaksanaan ujian anti-curang, acak soal & kunci, koreksi otomatis.'
      },
      RAPOR: {
        title: 'Olah Nilai & Cetak E-Rapor',
        description: 'Penilaian kurikulum merdeka, deskripsi capaian, & cetak buku rapor.'
      },
      EASY_TUNNEL: {
        title: 'Domain Online Easy Tunnel',
        description: 'Subdomain resmi .absenta.id + SSL HTTPS gratis tanpa IP Publik.'
      }
    };

    // 3. Untuk Modul Satuan / Hardware: Enriched dari featuresList
    featuresList.forEach((rawItem: string) => {
      const upper = String(rawItem || '').trim().toUpperCase();
      
      // Skip redundant raw tags
      if (upper === 'ALL_IN_ONE' || upper === 'PAKET_LENGKAP' || upper.startsWith('AKSES SELURUH MODUL')) {
        return;
      }

      if (MODULE_FEATURE_MAP[upper]) {
        const meta = MODULE_FEATURE_MAP[upper];
        addFeature(meta.title, meta.description);
      } else {
        const formattedTitle = rawItem
          .replace(/[_-]/g, ' ')
          .replace(/\b([a-z])/g, (_, c) => c.toUpperCase());
        addFeature(formattedTitle, 'Fasilitas resmi pendukung operasional sekolah.');
      }
    });

    if (isHardware) {
      addFeature('Garansi Resmi & Penggantian Unit', 'Jaminan penggantian unit hardware jika mengalami kendala teknis.');
      addFeature('Panduan Instalasi & Bimbingan Teknis', 'Dukungan konfigurasi awal dan panduan integrasi jaringan.');
    }

    return list;
  }, [isHardware, isCompleteBundle, featuresList]);

  const handleAddToCart = () => {
    if (!selectedPlan) return;
    addItemToCart({
      plan_id: selectedPlan.id,
      name: group.baseName + ' (' + (isHardware ? selectedPlan.name : ('Edisi ' + selectedSize)) + ')',
      price: displayPrice,
      type: isHardware ? 'HARDWARE_PURCHASE' : 'SOFTWARE_SUBSCRIPTION',
      billingPeriod: selectedPeriod,
      moduleName: group.module || 'Modul Absenta'
    });
    setCartOpen(true);
    toast.success(group.baseName + ' berhasil ditambahkan ke keranjang!');
  };

  const handleBuyNow = () => {
    if (!selectedPlan) return;
    const payload = {
      id: selectedPlan.id,
      service_code: group.service_code || selectedPlan.service_code,
      moduleIcon: group.icon,
      moduleName: group.module,
      name: group.baseName + ' - ' + (isHardware ? selectedPlan.name : ('Edisi ' + selectedSize)),
      size: selectedSize,
      period: selectedPeriod,
      price_monthly: priceMonthly,
      price_yearly: priceYearly,
      price_onetime: priceOnetime,
      group: group
    };
    if (onCheckout) {
      onCheckout(payload);
    } else {
      handleAddToCart();
    }
  };

  const IconComp = getServiceIcon(group.service_code, group.icon);

  return (
    <div className="space-y-4 pb-24 md:pb-8 animate-in fade-in duration-200">
      {/* ── 1. COMPACT TOP NAV & BREADCRUMB ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-white dark:bg-slate-900 px-4 py-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-200 text-xs font-bold transition-all active:scale-95"
          >
            <ArrowLeft size={13} />
            <span>Kembali ke Katalog</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-medium">
            <span>Katalog</span>
            <span>/</span>
            <span className="text-slate-600 dark:text-slate-300">{group.module}</span>
            <span>/</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold truncate max-w-xs">{group.baseName}</span>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
          <CheckCircle2 size={12} className="text-emerald-500" />
          <span>Terverifikasi Resmi SIPLaH &amp; Juknis BOS</span>
        </div>
      </div>

      {/* ── 2. SHOPEE MAIN 2-COLUMN SHOWCASE (OPTIMIZED FOR 1366px LAPTOPS) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
        {/* ── LEFT COLUMN: COMPACT IMAGE & TRUST CHIPS (lg:col-span-5) ── */}
        <div className="lg:col-span-5 space-y-3 lg:sticky lg:top-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-4 sm:p-5 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-3 left-3 z-10">
              <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-slate-900/90 dark:bg-slate-950/90 text-white backdrop-blur-md shadow-2xs">
                {isHardware ? 'Hardware Fisik' : 'Cloud SaaS'}
              </span>
            </div>

            {!isHardware && (
              <div className="absolute top-3 right-3 z-10">
                <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-amber-500 text-white shadow-2xs">
                  Hemat 20%
                </span>
              </div>
            )}

            {/* Product Image */}
            <div className="w-full h-44 sm:h-52 lg:h-56 flex items-center justify-center p-2 bg-gradient-to-br from-slate-50 to-indigo-50/20 dark:from-slate-800/40 dark:to-indigo-950/30 rounded-xl border border-slate-100 dark:border-slate-800/60">
              {group.imageUrl && !imgError ? (
                <img
                  src={group.imageUrl}
                  alt={group.baseName}
                  onError={() => setImgError(true)}
                  className="max-h-full max-w-full object-contain filter drop-shadow-md hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <IconComp size={40} />
                </div>
              )}
            </div>
          </div>

          {/* Compact Trust Badges Row */}
          <div className="bg-slate-50/90 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200/70 dark:border-slate-800">
            <div className="grid grid-cols-2 gap-1.5 text-[10.5px] text-slate-600 dark:text-slate-300 font-medium">
              <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/60">
                <Check size={11} className="text-emerald-500 font-bold shrink-0" />
                <span className="truncate">Siap SPJ BOS ARKAS</span>
              </div>
              <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/60">
                <Check size={11} className="text-emerald-500 font-bold shrink-0" />
                <span className="truncate">Faktur Pajak PPN 11%</span>
              </div>
              <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/60">
                <Check size={11} className="text-emerald-500 font-bold shrink-0" />
                <span className="truncate">SLA Uptime 99.9%</span>
              </div>
              <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/60">
                <Check size={11} className="text-emerald-500 font-bold shrink-0" />
                <span className="truncate">Bimbingan Teknis GTK</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: INTERACTIVE PDP CONFIGURATION (lg:col-span-7) ── */}
        <div className="lg:col-span-7 space-y-4 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          {/* Header Title & Rating */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider">
                {group.module}
              </span>
              <div className="flex items-center gap-1 text-[11px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-200/60 dark:border-amber-800/60">
                <span>★ 5.0</span>
                <span className="text-slate-400 font-normal">| 100% Puas (Sekolah Negeri &amp; Swasta)</span>
              </div>
            </div>

            <h1 className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
              {group.baseName}
            </h1>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
              {group.description}
            </p>
          </div>

          {/* 🌟 SHOPEE COMPACT DYNAMIC PRICE CARD 🌟 */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Harga:</span>
                <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight">
                  {formatCurrency(displayPrice)}
                </div>
                <span className="text-xs font-bold text-slate-500 font-sans">
                  {isHardware ? '/unit' : selectedPeriod === 'YEAR' ? '/tahun' : '/bulan'}
                </span>
                {yearlySavings > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black uppercase tracking-wider shadow-2xs">
                    Hemat 20%
                  </span>
                )}
              </div>

              {/* School Unit Cost Breakdown */}
              {!isHardware && currentTierInfo && (
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-100/80 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold border border-emerald-300/60 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Setara <strong>{formatCurrency(perStudentPerMonth)} / siswa / bln</strong></span>
                </div>
              )}
            </div>

            {!isHardware && currentTierInfo && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Kapasitas {currentTierInfo.capacityLabel} • Cocok untuk {currentTierInfo.suitableFor}
              </div>
            )}
          </div>

          {/* 🌟 PAKET LENGKAP INCLUDED BONUSES (EASY TUNNEL & FULL ACCESS) 🌟 */}
          {isCompleteBundle && (
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-50/90 via-violet-50/50 to-purple-50/70 dark:from-indigo-950/40 dark:via-violet-950/30 dark:to-purple-950/30 border border-indigo-200/80 dark:border-indigo-800/80 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={13} className="text-amber-500 fill-amber-500" />
                  <span className="text-[10.5px] font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider">
                    Keuntungan Resmi Paket Lengkap
                  </span>
                </div>
                <span className="text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                  All-in-One
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5 text-xs">
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                  <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                  <span className="font-semibold text-[11px]">1x Dedicated Easy Tunnel (SSL HTTPS)</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                  <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                  <span className="font-semibold text-[11px]">WhatsApp Notification Gateway</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                  <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                  <span className="font-semibold text-[11px]">Semua Modul Terbuka Penuh</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                  <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                  <span className="font-semibold text-[11px]">Klaim Domain Pasca-Bayar di Menu Tunnel</span>
                </div>
              </div>
            </div>
          )}

          {/* ── LEVEL 1: PILIHAN EDISI KAPASITAS SISWA (SLIM PILL CHIPS) ── */}
          {groupedVariants.length > 0 && !isHardware && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  1. Edisi Kapasitas Siswa:
                </span>
                <span className="text-[10.5px] text-slate-400 font-medium">
                  Berdasarkan total siswa aktif
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {groupedVariants.map(([sizeLabel]) => {
                  const isSelected = selectedSize.toLowerCase() === sizeLabel.toLowerCase();
                  const academicTierLower = String(activeAcademicTier || 'Micro').toLowerCase();
                  const academicIdx = SIZE_ORDER.findIndex(s => s.toLowerCase() === academicTierLower);
                  const sizeIdx = SIZE_ORDER.findIndex(s => s.toLowerCase() === sizeLabel.toLowerCase());
                  const isLocked = group.service_code !== 'KOPERASI' && academicIdx !== -1 && sizeIdx !== -1 && sizeIdx < academicIdx;
                  const tierMeta = TIER_CAPACITY_INFO[sizeLabel.toUpperCase()] || { capacityLabel: 'Siswa', suitableFor: '' };

                  return (
                    <button
                      key={sizeLabel}
                      type="button"
                      disabled={isLocked}
                      onClick={() => {
                        if (!isLocked) setSelectedSize(sizeLabel);
                      }}
                      className={"px-3.5 py-2 rounded-xl transition-all duration-150 border text-left flex items-center gap-2 " + (
                        isLocked
                          ? "bg-slate-100 dark:bg-slate-900/40 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-50 text-xs"
                          : isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/25 ring-2 ring-indigo-500/20"
                          : "bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:text-indigo-600"
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black tracking-wide">{sizeLabel}</span>
                        <span className={"text-[10px] " + (isSelected ? "text-indigo-100 font-medium" : "text-slate-400 dark:text-slate-500")}>
                          ({tierMeta.capacityLabel.replace('s.d ', '≤')})
                        </span>
                      </div>
                      {isSelected && <CheckCircle2 size={13} className="text-white shrink-0 ml-0.5" />}
                      {isLocked && <Lock size={11} className="text-slate-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* HARDWARE VARIANTS SELECTOR (SLIM) */}
          {isHardware && (
            <div className="space-y-2 pt-1">
              <div className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                1. Tipe Spesifikasi / Paket Hardware:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.variants.map((v: any) => {
                  const isSelected = selectedHwVariantId === v.id;
                  const price = v.price_onetime || v.price_monthly || 0;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedHwVariantId(v.id)}
                      className={"px-3.5 py-2.5 rounded-xl border transition-all text-left flex items-center justify-between " + (
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/25"
                          : "bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-400"
                      )}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">{v.name}</div>
                        <div className={"text-[11px] font-mono font-semibold " + (isSelected ? "text-indigo-100" : "text-indigo-600 dark:text-indigo-400")}>{formatCurrency(price)}</div>
                      </div>
                      {isSelected && <CheckCircle2 size={15} className="text-white shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── LEVEL 2: PILIHAN SIKLUS TAGIHAN (SLIM TOGGLE SWITCH) ── */}
          {!isHardware && (
            <div className="space-y-2 pt-1">
              <div className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center justify-between">
                <span>2. Siklus Tagihan:</span>
                <span className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-bold normal-case">
                  💡 Diskon 20% Paket Tahunan
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* BULANAN */}
                <button
                  type="button"
                  onClick={() => setSelectedPeriod('MONTH')}
                  className={"px-3.5 py-2.5 rounded-xl text-left border transition-all flex items-center justify-between " + (
                    selectedPeriod === 'MONTH'
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/25 ring-2 ring-indigo-500/20"
                      : "bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-400"
                  )}
                >
                  <div>
                    <div className="text-xs font-bold">📅 Tagihan Bulanan</div>
                    <div className={"text-[10px] " + (selectedPeriod === 'MONTH' ? "text-indigo-100" : "text-slate-400")}>
                      Operasional reguler
                    </div>
                  </div>
                  {selectedPeriod === 'MONTH' && <CheckCircle2 size={15} className="text-white shrink-0" />}
                </button>

                {/* TAHUNAN */}
                <button
                  type="button"
                  onClick={() => setSelectedPeriod('YEAR')}
                  className={"px-3.5 py-2.5 rounded-xl text-left border transition-all flex items-center justify-between relative " + (
                    selectedPeriod === 'YEAR'
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/25 ring-2 ring-indigo-500/20"
                      : "bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-400"
                  )}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold">🌟 Paket Tahunan</span>
                      <span className="px-1.5 py-0.2 bg-amber-500 text-white text-[8px] font-black rounded-full uppercase tracking-wider">
                        -20%
                      </span>
                    </div>
                    <div className={"text-[10px] font-semibold " + (selectedPeriod === 'YEAR' ? "text-amber-200" : "text-emerald-600 dark:text-emerald-400")}>
                      Rekomendasi SPJ BOS ARKAS
                    </div>
                  </div>
                  {selectedPeriod === 'YEAR' && <CheckCircle2 size={15} className="text-white shrink-0" />}
                </button>
              </div>
            </div>
          )}

          {/* ── DESKTOP ACTION BUTTONS (SLIM & CRISP) ── */}
          <div className="hidden md:flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={handleAddToCart}
              className="flex-1 h-10.5 rounded-xl border border-indigo-600 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 font-bold text-xs flex items-center justify-center gap-1.5"
            >
              <ShoppingCart size={15} />
              <span>Masukkan Keranjang</span>
            </Button>

            <Button
              type="button"
              onClick={handleBuyNow}
              disabled={checkoutProcessing}
              className="flex-1 h-10.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/25 flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              <Zap size={15} className={checkoutProcessing ? 'animate-spin' : ''} />
              <span>{checkoutProcessing ? 'Memproses Pesanan...' : (isHardware ? 'Beli Sekarang' : 'Langganan Sekarang')}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── 3. DETAILED SPECIFICATION & BOS GUIDE (COMPACT TABS) ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 space-y-3.5">
        {/* Navigation Tabs for Details */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('features')}
            className={"px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 " + (
              activeTab === 'features'
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <Layers size={13} />
            <span>Fitur &amp; Modul Termasuk</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bos_guide')}
            className={"px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 " + (
              activeTab === 'bos_guide'
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <Building2 size={13} />
            <span>Panduan SPJ BOS &amp; SIPLaH</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('faq')}
            className={"px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 " + (
              activeTab === 'faq'
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <HelpCircle size={13} />
            <span>Tanya Jawab</span>
          </button>
        </div>

        {/* Tab 1: Fitur & Modul yang Termasuk */}
        {activeTab === 'features' && (
          <div className="space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Daftar Modul &amp; Fasilitas Terintegrasi:
              </h3>
              <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                {detailedFeatures.length} Fasilitas Siap Digunakan
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {detailedFeatures.map((item, i) => (
                <div
                  key={i}
                  className={"p-3 rounded-xl border flex items-start gap-2.5 transition-all " + (
                    item.isHighlight
                      ? "bg-gradient-to-br from-indigo-50/80 to-violet-50/60 dark:from-indigo-950/40 dark:to-violet-950/30 border-indigo-200 dark:border-indigo-800 shadow-2xs"
                      : "bg-slate-50 dark:bg-slate-950 border-slate-200/70 dark:border-slate-800/80"
                  )}
                >
                  <CheckCircle2
                    size={15}
                    className={"shrink-0 mt-0.5 " + (item.isHighlight ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-emerald-500")}
                  />
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                      {item.title}
                    </div>
                    <div className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-snug">
                      {item.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Panduan SPJ BOS & SIPLaH */}
        {activeTab === 'bos_guide' && (
          <div className="space-y-3 animate-in fade-in duration-150">
            <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 space-y-2">
              <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                <Building2 size={15} className="text-emerald-600" />
                <span>Tata Cara Pengadaan &amp; SPJ Anggaran BOS Sekolah</span>
              </div>
              <p className="text-xs text-emerald-900 dark:text-emerald-300 leading-relaxed">
                Platform Absenta terdaftar resmi sebagai mitra pengadaan sekolah di <strong>SIPLaH (Sistem Informasi Pengadaan Sekolah)</strong> Kemendikbudristek.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 text-xs">
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-emerald-200/70 dark:border-emerald-800/80">
                  <div className="font-bold text-emerald-900 dark:text-emerald-200 text-xs">1. Pos Rekening ARKAS</div>
                  <div className="text-slate-500 text-[10.5px] mt-0.5">Belanja Langganan Aplikasi Manajemen Sekolah.</div>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-emerald-200/70 dark:border-emerald-800/80">
                  <div className="font-bold text-emerald-900 dark:text-emerald-200 text-xs">2. Faktur Pajak Resmi</div>
                  <div className="text-slate-500 text-[10.5px] mt-0.5">e-Faktur PPN 11% &amp; PPh 22/23 terpotong sah.</div>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-emerald-200/70 dark:border-emerald-800/80">
                  <div className="font-bold text-emerald-900 dark:text-emerald-200 text-xs">3. Berkas Audit BPK</div>
                  <div className="text-slate-500 text-[10.5px] mt-0.5">BAP dan e-Kwitansi lengkap untuk SPJ semester.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: FAQ */}
        {activeTab === 'faq' && (
          <div className="space-y-2 animate-in fade-in duration-150">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 space-y-0.5">
              <div className="text-xs font-bold text-slate-900 dark:text-white">Apakah lisensi dapat diperpanjang di tengah tahun ajaran?</div>
              <p className="text-xs text-slate-500 leading-relaxed">Bisa. Masa aktif otomatis bertambah tanpa menghapus data yang ada.</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 space-y-0.5">
              <div className="text-xs font-bold text-slate-900 dark:text-white">Bagaimana jika jumlah siswa bertambah melebihi kapasitas edisi?</div>
              <p className="text-xs text-slate-500 leading-relaxed">Sekolah dapat melakukan upgrade kapasitas (misal Small ke Medium) kapan saja dengan selisih biaya proporsional.</p>
            </div>
          </div>
        )}
      </div>

      {/* ── 4. MOBILE STICKY BOTTOM ACTION BAR (FIXED FOR ISMOBILE) ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-3.5 px-4 flex items-center justify-between gap-3 shadow-2xl">
        <div className="min-w-0">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Total Pembayaran
          </div>
          <div className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono leading-none truncate">
            {formatCurrency(displayPrice)}
          </div>
          <div className="text-[9px] text-slate-400 mt-0.5">
            PPN 11% sudah termasuk
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleAddToCart}
            className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shrink-0 active:scale-95 transition-transform"
            aria-label="Tambah ke Keranjang"
          >
            <ShoppingCart size={18} />
          </button>

          <Button
            type="button"
            onClick={handleBuyNow}
            disabled={checkoutProcessing}
            className="px-5 h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 active:scale-95 transition-transform disabled:opacity-60"
          >
            <span>{checkoutProcessing ? 'Memproses...' : (isHardware ? 'Beli' : 'Langganan')}</span>
            <Zap size={14} className={checkoutProcessing ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>
    </div>
  );
};
