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
