import * as LucideIcons from 'lucide-react';
import { 
  Building2, 
  Wallet, 
  FileText, 
  Package, 
  LayoutGrid, 
  Sparkles 
} from 'lucide-react';

export const formatCurrency = (amount: number = 0, currency: string = 'IDR') => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currency || 'IDR',
    minimumFractionDigits: 0,
  }).format(amount || 0);
};

export const getServiceIcon = (code: string | undefined | null, moduleIcon?: string | null) => {
  if (moduleIcon && (LucideIcons as any)[moduleIcon]) {
     return (LucideIcons as any)[moduleIcon];
  }

  const c = String(code || '').toUpperCase();
  if (c.includes('ABSENSI')) return Building2;
  if (c.includes('KOPERASI')) return Wallet;
  if (c.includes('KANTIN')) return Wallet;
  if (c.includes('RAPOR')) return FileText;
  if (c.includes('INVENTORY') || c.includes('SARPRAS')) return Package;
  if (c.includes('HUBIN')) return LayoutGrid;
  if (c.includes('PAKET_LENGKAP')) return Sparkles;
  return Package;
};

export const getServiceTheme = (code: string | undefined | null) => {
  const c = String(code || '').toUpperCase();
  if (c.includes('ABSENSI') || c.includes('ATTENDANCE')) {
    return {
      color: 'blue',
      gradient: 'from-blue-600/20 via-blue-500/5 to-transparent',
      glow: 'shadow-blue-500/20',
      iconBg: 'bg-blue-600',
      text: 'text-blue-600'
    };
  }
  if (c.includes('KOPERASI') || c.includes('COOPERATIVE') || c.includes('POS')) {
    return {
      color: 'emerald',
      gradient: 'from-emerald-600/20 via-emerald-500/5 to-transparent',
      glow: 'shadow-emerald-500/20',
      iconBg: 'bg-emerald-600',
      text: 'text-emerald-600'
    };
  }
  if (c.includes('HUBIN') || c.includes('PKL')) {
    return {
      color: 'purple',
      gradient: 'from-purple-600/20 via-purple-500/5 to-transparent',
      glow: 'shadow-purple-500/20',
      iconBg: 'bg-purple-600',
      text: 'text-purple-600'
    };
  }
  if (c.includes('SARPRAS') || c.includes('INVENTORY') || c.includes('ASSET')) {
    return {
      color: 'amber',
      gradient: 'from-amber-600/20 via-amber-500/5 to-transparent',
      glow: 'shadow-amber-500/20',
      iconBg: 'bg-amber-600',
      text: 'text-amber-600'
    };
  }
  if (c.includes('WHATSAPP')) {
    return {
      color: 'emerald',
      gradient: 'from-emerald-600/20 via-emerald-500/5 to-transparent',
      glow: 'shadow-emerald-500/20',
      iconBg: 'bg-emerald-600',
      text: 'text-emerald-600'
    };
  }
  if (c.includes('PAKET_LENGKAP')) {
    return {
      color: 'indigo',
      gradient: 'from-indigo-600/30 via-violet-500/10 to-transparent',
      glow: 'shadow-indigo-500/40',
      iconBg: 'bg-gradient-to-br from-indigo-600 to-violet-600',
      text: 'text-indigo-600 dark:text-indigo-400'
    };
  }
  return {
    color: 'slate',
    gradient: 'from-slate-600/20 via-slate-500/5 to-transparent',
    glow: 'shadow-slate-500/20',
    iconBg: 'bg-slate-600',
    text: 'text-slate-600'
  };
};

export const getServiceThumbnail = (code: string | undefined | null, moduleName?: string | null, mode?: string | null) => {
  const c = String(code || '').toUpperCase();
  const n = String(moduleName || '').toUpperCase();
  const m = String(mode || '').toUpperCase();

  const isAbsensi = c.includes('ABSENSI') || c.includes('ATTENDANCE') || n.includes('ABSENSI') || n.includes('PRESENCE');
  const isKoperasi = c.includes('KOPERASI') || c.includes('COOPERATIVE') || c.includes('POS') || n.includes('KOPERASI') || n.includes('MART');
  const isInventory = c.includes('INVENTORY') || c.includes('SARPRAS') || c.includes('ASSET') || n.includes('INVENTORY') || n.includes('SARPRAS') || n.includes('ASET');
  const isHubin = c.includes('HUBIN') || c.includes('PKL') || n.includes('HUBIN') || n.includes('PKL') || n.includes('INDUSTRI');
  const isWhatsapp = c.includes('WHATSAPP') || n.includes('WHATSAPP') || n.includes('WA ');
  const isServer = c.includes('SERVER') || c.includes('DELL') || n.includes('SERVER') || n.includes('DELL');
  
  if (isServer) return '/assets/modules/server.png';
  if (isAbsensi) {
     if (m === 'MULTI_SESI' || m.includes('MULTI')) return '/assets/modules/absensi-multi-sesi.png';
     return '/assets/modules/absensi-simple.png';
  }
  if (isKoperasi) return '/assets/modules/koperasi.png';
  if (isInventory) return '/assets/modules/inventory.png';
  if (isHubin) return '/assets/modules/hubin.png';
  if (isWhatsapp) return '/assets/modules/whatsapp.png';
  
  return null;
};

export const getServiceStyle = (name: string) => {
  const colorPalettes = [
    { dot: 'bg-blue-500', text: 'text-blue-600', shadow: 'shadow-blue-500/20' },
    { dot: 'bg-emerald-500', text: 'text-emerald-600', shadow: 'shadow-emerald-500/20' },
    { dot: 'bg-amber-500', text: 'text-amber-600', shadow: 'shadow-amber-500/20' },
    { dot: 'bg-purple-500', text: 'text-purple-600', shadow: 'shadow-purple-500/20' },
    { dot: 'bg-rose-500', text: 'text-rose-600', shadow: 'shadow-rose-500/20' },
    { dot: 'bg-indigo-500', text: 'text-indigo-600', shadow: 'shadow-indigo-500/20' },
    { dot: 'bg-cyan-500', text: 'text-cyan-600', shadow: 'shadow-cyan-500/20' },
    { dot: 'bg-orange-500', text: 'text-orange-600', shadow: 'shadow-orange-500/20' },
    { dot: 'bg-teal-500', text: 'text-teal-600', shadow: 'shadow-teal-500/20' },
    { dot: 'bg-pink-500', text: 'text-pink-600', shadow: 'shadow-pink-500/20' },
  ];

  if (!name || name === 'Umum') return { dot: 'bg-slate-400', text: 'text-slate-500', icon: 'Box' };
  
  const n = String(name).toUpperCase();
  let icon = 'Box';
  if (n.includes('ABSENSI')) icon = 'UserCheck';
  else if (n.includes('INVENTORY') || n.includes('SARPRAS')) icon = 'Package';
  else if (n.includes('KEUANGAN')) icon = 'Wallet';
  else if (n.includes('PERPUSTAKAAN')) icon = 'Book';
  else if (n.includes('CORE')) icon = 'Shield';

  // Hash string to consistently pick a color from the palette
  let hash = 0;
  const str = String(name).toUpperCase();
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % colorPalettes.length;
  return { ...colorPalettes[index], icon };
};

/**
 * 🛡️ Helper eksplisit untuk mendeteksi apakah suatu produk / plan / grup adalah Paket Lengkap (All-in-One Bundle)
 */
export const isCompleteBundlePlan = (planOrGroup: any): boolean => {
  if (!planOrGroup) return false;
  const sCode = String(planOrGroup.service_code || planOrGroup.serviceCode || '').toUpperCase();
  const mId = String(planOrGroup.module_id || planOrGroup.moduleId || (planOrGroup.module && planOrGroup.module.id) || '').toUpperCase();
  const gKey = String(planOrGroup.groupKey || '').toUpperCase();
  const pId = String(planOrGroup.id || planOrGroup.plan_id || '').toUpperCase();
  const pName = String(planOrGroup.name || planOrGroup.baseName || planOrGroup.title || '').toUpperCase();

  const rawFeatures = planOrGroup.features_json || planOrGroup.features || (planOrGroup.Plan && planOrGroup.Plan.features_json) || [];
  const featuresUpper = Array.isArray(rawFeatures)
    ? rawFeatures.map((f: any) => String(f).toUpperCase())
    : [];

  return (
    sCode === 'PAKET_LENGKAP' ||
    mId === 'PAKET_LENGKAP' ||
    gKey === 'SAAS_GROUP_PAKET_LENGKAP' ||
    pId.startsWith('PAKET_LENGKAP') ||
    pName.includes('PAKET LENGKAP') ||
    pName.includes('ALL-IN-ONE') ||
    featuresUpper.includes('PAKET_LENGKAP') ||
    featuresUpper.includes('ALL_IN_ONE') ||
    featuresUpper.includes('EASY_TUNNEL')
  );
};

/**
 * 🏷️ Helper untuk mengekstrak label ukuran paket (Micro, Small, Medium, Large, Enterprise, Ultra, Standard)
 */
export const extractPlanSizeLabel = (plan: any): string => {
  if (plan?.size_label) return plan.size_label;
  const name = String(plan?.name || plan?.title || '');
  const id = String(plan?.id || '');

  if (/\b(Micro)\b/i.test(name) || /MICRO/i.test(id)) return 'Micro';
  if (/\b(Small)\b/i.test(name) || /SMALL/i.test(id)) return 'Small';
  if (/\b(Medium)\b/i.test(name) || /MEDIUM/i.test(id)) return 'Medium';
  if (/\b(Large)\b/i.test(name) || /LARGE/i.test(id)) return 'Large';
  if (/\b(Enterprise)\b/i.test(name) || /ENTERPRISE/i.test(id)) return 'Enterprise';
  if (/\b(Ultra|Campus)\b/i.test(name) || /ULTRA/i.test(id)) return 'Ultra';

  const limit = plan?.device_limit || plan?.max_user || 0;
  if (limit > 0) {
    if (limit <= 300) return 'Micro';
    if (limit <= 600) return 'Small';
    if (limit <= 1200) return 'Medium';
    if (limit <= 2500) return 'Large';
    return 'Enterprise';
  }

  return 'Standard';
};

/**
 * 🎯 Resolves the standardized Catalog Group Key (e.g. SAAS_GROUP_PAKET_LENGKAP)
 * for any Plan, Subscription, Service, or slug string.
 */
export const resolveServiceCatalogGroupKey = (itemOrSlug: any): string => {
  if (!itemOrSlug) return 'SAAS_GROUP_PAKET_LENGKAP';

  // If itemOrSlug is a string (e.g. URL slug or key)
  if (typeof itemOrSlug === 'string') {
    const s = itemOrSlug.toUpperCase().trim();
    if (s.startsWith('SAAS_GROUP_') || s.startsWith('HW_GROUP_')) return itemOrSlug;
    if (s.includes('PAKET LENGKAP') || s.includes('PAKET_LENGKAP') || s.includes('ALL-IN-ONE') || s.includes('ALL_IN_ONE')) {
      return 'SAAS_GROUP_PAKET_LENGKAP';
    }
    if (s.includes('WHATSAPP') || s.includes('WA')) return 'SAAS_GROUP_WHATSAPP';
    if (s.includes('HUBIN') || s.includes('PKL') || s.includes('INDUSTRI')) return 'SAAS_GROUP_HUBIN';
    if (s.includes('KOPERASI') || s.includes('COOPERATIVE') || s.includes('KANTIN')) return 'SAAS_GROUP_KOPERASI';
    if (s.includes('SARPRAS') || s.includes('INVENTORY') || s.includes('ASET')) return 'SAAS_GROUP_SARPRAS';
    if (s.includes('MULTI')) return 'SAAS_GROUP_ABSENSI_MULTI';
    if (s.includes('ABSENSI') || s.includes('PRESENSI')) return 'SAAS_GROUP_ABSENSI_SIMPLE';
    if (s.includes('DELL') || s.includes('SERVER')) return 'HW_GROUP_DELL_SERVER';
    if (s.includes('MINI') || s.includes('NODE')) return 'HW_GROUP_MINI_PC';
    if (s.includes('TERMINAL') || s.includes('FINGERPRINT') || s.includes('FACE')) return 'HW_GROUP_TERMINAL';
    if (s.includes('NETWORK') || s.includes('WIFI')) return 'HW_GROUP_NETWORK';
    if (s.includes('PVC') || s.includes('KARTU')) return 'HW_GROUP_PVC_CARDS';
    return itemOrSlug;
  }

  // If itemOrSlug is an object (SubscriptionItem, Plan, Group, etc.)
  const plan = itemOrSlug.Plan || itemOrSlug.plan_snapshot || itemOrSlug;
  const nameUpper = String(plan.name || plan.baseName || plan.title || plan.mainTitle || itemOrSlug.name || itemOrSlug.mainTitle || '').toUpperCase();
  const idUpper = String(plan.id || plan.plan_id || itemOrSlug.id || itemOrSlug.plan_id || '').toUpperCase();
  const serviceCodeUpper = String(plan.service_code || plan.serviceCode || itemOrSlug.service_code || itemOrSlug.serviceCode || '').toUpperCase();
  const moduleUpper = String(plan.module_id || plan.moduleId || itemOrSlug.module_id || itemOrSlug.moduleKey || (plan.module && plan.module.id) || '').toUpperCase();
  const modeUpper = String(plan.absensi_mode || itemOrSlug.absensi_mode || itemOrSlug.mode || '').toUpperCase();

  // 1. Hardware checks
  const isHardware = 
    idUpper.includes('SERVER') || idUpper.includes('DELL') || idUpper.includes('HW_') || idUpper.startsWith('SVC_') ||
    serviceCodeUpper === 'HARDWARE' || serviceCodeUpper === 'PHYSICAL_GOODS' ||
    itemOrSlug.type === 'HARDWARE_PERIPHERAL' || itemOrSlug.type === 'PHYSICAL_SERVICE';

  if (isHardware) {
    if (idUpper.includes('DELL') || nameUpper.includes('DELL')) return 'HW_GROUP_DELL_SERVER';
    if (idUpper.includes('NODE') || nameUpper.includes('MINI PC') || nameUpper.includes('WORKSTATION')) return 'HW_GROUP_MINI_PC';
    if (idUpper.includes('AP_') || idUpper.includes('SWITCH') || nameUpper.includes('WI-FI') || nameUpper.includes('SWITCH')) return 'HW_GROUP_NETWORK';
    if (idUpper.includes('FP_') || idUpper.includes('RFID') || nameUpper.includes('HIKVISION') || nameUpper.includes('ZKTECO') || nameUpper.includes('FINGERPRINT') || nameUpper.includes('FACE')) return 'HW_GROUP_TERMINAL';
    if (idUpper.includes('PVC') || nameUpper.includes('KARTU') || nameUpper.includes('MIFARE')) return 'HW_GROUP_PVC_CARDS';
    return `HW_${plan.module_id || plan.id || 'DEVICE'}`;
  }

  // 2. Paket Lengkap (All-in-One)
  if (
    isCompleteBundlePlan(itemOrSlug) ||
    isCompleteBundlePlan(plan) ||
    nameUpper.includes('PAKET LENGKAP') ||
    idUpper.includes('PAKET_LENGKAP') ||
    serviceCodeUpper === 'PAKET_LENGKAP' ||
    moduleUpper === 'PAKET_LENGKAP' ||
    Boolean(itemOrSlug.isMasterPackage)
  ) {
    return 'SAAS_GROUP_PAKET_LENGKAP';
  }

  // 3. WhatsApp Gateway
  if (nameUpper.includes('WHATSAPP') || idUpper.includes('WHATSAPP') || serviceCodeUpper === 'WHATSAPP' || moduleUpper === 'WHATSAPP') {
    return 'SAAS_GROUP_WHATSAPP';
  }

  // 4. Hubungan Industri (Hubin & PKL)
  if (nameUpper.includes('HUBUNGAN INDUSTRI') || nameUpper.includes('HUBIN') || nameUpper.includes('PKL') || idUpper.includes('HUBIN') || serviceCodeUpper === 'HUBIN' || moduleUpper === 'HUBIN') {
    return 'SAAS_GROUP_HUBIN';
  }

  // 5. Koperasi Sekolah & POS Kantin
  if (nameUpper.includes('KOPERASI') || idUpper.includes('KOPERASI') || serviceCodeUpper === 'KOPERASI' || moduleUpper === 'KOPERASI' || serviceCodeUpper === 'COOPERATIVE') {
    return 'SAAS_GROUP_KOPERASI';
  }

  // 6. Sarana Prasarana & Inventory
  if (nameUpper.includes('SARANA PRASARANA') || nameUpper.includes('SARPRAS') || nameUpper.includes('INVENTORY') || idUpper.includes('SARPRAS') || serviceCodeUpper === 'SARPRAS' || moduleUpper === 'SARPRAS') {
    return 'SAAS_GROUP_SARPRAS';
  }

  // 7. Presensi Multi-Sesi
  if (nameUpper.includes('MULTI') || modeUpper === 'MULTI_SESI' || idUpper.includes('MULTI')) {
    return 'SAAS_GROUP_ABSENSI_MULTI';
  }

  // 8. Presensi Standar / Simple
  if (nameUpper.includes('ABSENSI') || serviceCodeUpper === 'ABSENSI' || moduleUpper === 'ABSENSI' || nameUpper.includes('PRESENSI')) {
    return 'SAAS_GROUP_ABSENSI_SIMPLE';
  }

  return 'SAAS_GROUP_PAKET_LENGKAP';
};


