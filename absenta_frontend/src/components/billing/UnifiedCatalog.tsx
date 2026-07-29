import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  LayoutGrid, 
  Package, 
  Search, 
  ArrowRight, 
  CheckCircle, 
  Sparkles,
  Info
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';

import { Card, Button, Badge, Loader } from '../ui';
import { getPublicPlans } from '../../api/plans.api';
import { getPublicModules } from '../../api/module.api';
import { 
  formatCurrency, 
  getServiceIcon, 
  getServiceTheme, 
  getServiceThumbnail 
} from '../../lib/billingUtils';
import { useCartStore } from '../../store/useCartStore';
import { CartDrawer } from './CartDrawer';
import { RABCalculatorModal } from './RABCalculatorModal';
import toast from 'react-hot-toast';

interface UnifiedCatalogProps {
  mode: 'public' | 'private';
  ownedFeatures?: string[];
  ownedServices?: any[];
  onSelectPlan?: (plan: any) => void;
}

export const UnifiedCatalog: React.FC<UnifiedCatalogProps> = ({ 
  mode, 
  ownedFeatures = [], 
  ownedServices = [],
  onSelectPlan 
}) => {
  const navigate = useNavigate();
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [mainCategory, setMainCategory] = useState<'SAAS' | 'HARDWARE'>('SAAS');
  const [configView, setConfigView] = useState<'GRID' | 'COMPARE'>('GRID');
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [isRABModalOpen, setIsRABModalOpen] = useState(false);

  const cartItems = useCartStore((state) => state.items);
  const setCartOpen = useCartStore((state) => state.setCartOpen);
  const addItemToCart = useCartStore((state) => state.addItem);

  // 1. Plans Query — satu sumber: getPublicPlans() sudah mencakup software + hardware (product_id=cakola)
  const plansQuery = useQuery({
    queryKey: ['public-plans'],
    queryFn: async () => {
      // Fetch semua plan dari backend (sudah include hardware via product_id=cakola)
      const res = await getPublicPlans();
      const plans: any[] = Array.isArray((res.data as any)?.plans)
        ? (res.data as any).plans
        : Array.isArray(res.data) ? res.data : [];

      // Cek apakah hardware plans sudah ada di response backend
      const HARDWARE_IDS = ['SERVER_HARDWARE', 'NETWORK_HARDWARE', 'ABSENSI_HARDWARE', 'PHYSICAL_SERVICE'];
      const hasHardware = plans.some((p: any) => HARDWARE_IDS.includes(p.module_id));

      if (!hasHardware) {
        // Fallback: ambil langsung dari Server Lisensi jika backend belum include hardware
        try {
          const hwRes = await fetch('https://api.absenta.id/api/license/packages?product_id=cakola');
          const hwData = await hwRes.json();
          if (hwData?.success && Array.isArray(hwData.data)) {
            const hwPlans = hwData.data
              .filter((h: any) => HARDWARE_IDS.includes(h.module_id))
              .map((h: any) => ({
                id: h.id,
                name: h.name || h.title,
                module_id: h.module_id,
                service_code: h.service_code || h.module_id,
                price_monthly: h.price_monthly || 0,
                price_yearly: h.price_yearly || 0,
                price_onetime: h.price_onetime || Number(String(h.price || 0).replace(/[^0-9]/g, '')) || 0,
                weight_grams: h.weight_grams || 0,
                size_label: 'Unit',
                billing_period: h.billing_period || 'ONETIME',
                max_user: h.device_limit || 0,
                features_json: typeof h.features_json === 'string'
                  ? JSON.parse(h.features_json)
                  : (h.features_json || []),
                module: {
                  id: h.module_id,
                  name: h.module_id === 'SERVER_HARDWARE' ? 'Server Node'
                      : h.module_id === 'NETWORK_HARDWARE' ? 'Network Wi-Fi 6'
                      : h.module_id === 'PHYSICAL_SERVICE' ? 'Kartu & Cetak'
                      : 'Biometrik & RFID',
                  icon: h.module_id === 'SERVER_HARDWARE' ? 'Server'
                      : h.module_id === 'NETWORK_HARDWARE' ? 'Wifi'
                      : h.module_id === 'PHYSICAL_SERVICE' ? 'CreditCard'
                      : 'Fingerprint',
                }
              }));
            return [...plans, ...hwPlans];
          }
        } catch (err) {
          console.warn('[UnifiedCatalog] Hardware fallback fetch gagal:', err);
        }
      }

      return plans;
    },
    staleTime: 1000 * 60 * 5,
  });

  // 2. Modules Query — dari backend + hardware categories sebagai fallback
  const modulesQuery = useQuery({
    queryKey: ['public-modules'],
    queryFn: async () => {
      const res = await getPublicModules();
      const modules: any[] = Array.isArray(res.data) ? res.data : [];

      // Pastikan hardware modules selalu ada di filter bar
      const hardwareModules = [
        { id: 'SERVER_HARDWARE',  name: 'Server Node',      icon: 'Server'      },
        { id: 'NETWORK_HARDWARE', name: 'Network Wi-Fi 6',  icon: 'Wifi'        },
        { id: 'ABSENSI_HARDWARE', name: 'Biometrik & RFID', icon: 'Fingerprint' },
        { id: 'PHYSICAL_SERVICE', name: 'Kartu & Cetak',    icon: 'CreditCard'  },
      ];
      hardwareModules.forEach(hm => {
        if (!modules.some((m: any) => m.id === hm.id)) modules.push(hm);
      });

      return modules;
    },
    staleTime: 1000 * 60 * 60,
  });

  const catalogPlans = plansQuery.data || [];
  const allModules = modulesQuery.data || [];

  const HARDWARE_MODULE_IDS = ['SERVER_HARDWARE', 'NETWORK_HARDWARE', 'ABSENSI_HARDWARE', 'PHYSICAL_SERVICE'];

  const visibleSubModules = useMemo(() => {
    if (!allModules || !Array.isArray(allModules)) return [];
    return allModules.filter((m: any) => {
      const isHwModule = HARDWARE_MODULE_IDS.includes(m.id);
      if (mainCategory === 'SAAS') return !isHwModule;
      if (mainCategory === 'HARDWARE') return isHwModule;
      return true;
    });
  }, [allModules, mainCategory]);

  const filteredPlans = useMemo(() => {
    if (!catalogPlans || !Array.isArray(catalogPlans)) return [];
    
    // Filter out Academic Core / CORE plans entirely from the catalog
    const nonCorePlans = catalogPlans.filter((p: any) => {
      const code = String(p.code || p.service_code || '').toUpperCase();
      const name = String(p.name || '').toUpperCase();
      return !code.includes('CORE') && !name.includes('CORE_PLATFORM') && !name.includes('ACADEMIC CORE');
    });

    const HARDWARE_MODULE_IDS = ['SERVER_HARDWARE', 'NETWORK_HARDWARE', 'ABSENSI_HARDWARE', 'PHYSICAL_SERVICE'];
    const isHardwareItem = (p: any) => {
      return HARDWARE_MODULE_IDS.includes(p.module_id) ||
        p.service_code === 'HARDWARE' || p.service_code === 'PHYSICAL_GOODS' ||
        p.type === 'HARDWARE_PERIPHERAL' || p.type === 'PHYSICAL_SERVICE' ||
        p.id.includes('SERVER') || p.id.includes('DELL') || p.id.includes('HW_');
    };

    return nonCorePlans.filter((p: any) => {
      // 1. Filter by Main Category Segment (SAAS vs HARDWARE)
      if (mainCategory === 'SAAS' && isHardwareItem(p)) return false;
      if (mainCategory === 'HARDWARE' && !isHardwareItem(p)) return false;

      // 2. Filter by Specific Sub-Module Pill Tab
      if (categoryFilter === 'ALL') return true;

      const modId = String(p.module_id || '').toUpperCase();
      const filter = String(categoryFilter).toUpperCase();
      const sCode = String(p.service_code || p.Module?.service_code || '').toUpperCase();
      const pCode = String(p.code || '').toUpperCase();

      if (filter === 'ABSENSI')   return sCode.includes('ABSENSI')   || pCode.includes('ABSENSI');
      if (filter === 'KOPERASI')  return sCode.includes('KOPERASI')  || sCode.includes('KANTIN')   || pCode.includes('KOPERASI');
      if (filter === 'INVENTORY') return sCode.includes('INVENTORY') || sCode.includes('SARPRAS')  || pCode.includes('INVENTORY');

      // Hardware categories: match by module_id prefix
      if (filter === 'SERVER_HARDWARE')  return modId === 'SERVER_HARDWARE';
      if (filter === 'NETWORK_HARDWARE') return modId === 'NETWORK_HARDWARE';
      if (filter === 'ABSENSI_HARDWARE') return modId === 'ABSENSI_HARDWARE';
      if (filter === 'PHYSICAL_SERVICE') return modId === 'PHYSICAL_SERVICE';

      return sCode === filter;
    });
  }, [catalogPlans, categoryFilter, mainCategory]);

  // Urutan ukuran dari kecil ke besar (Shopee-style)
  const SIZE_ORDER = ['Micro', 'Small', 'Medium', 'Large', 'Enterprise', 'Pro', 'Ultra', 'Lite', 'Basic', 'Standard'];

  const groupedProducts = useMemo(() => {
    const products: Record<string, any> = {};

    filteredPlans.forEach((p: any) => {
        const HARDWARE_MODULE_IDS = ['SERVER_HARDWARE', 'NETWORK_HARDWARE', 'ABSENSI_HARDWARE', 'PHYSICAL_SERVICE'];
        const isHardware = HARDWARE_MODULE_IDS.includes(p.module_id) ||
          p.service_code === 'HARDWARE' || p.service_code === 'PHYSICAL_GOODS' ||
          p.type === 'HARDWARE_PERIPHERAL' || p.type === 'PHYSICAL_SERVICE';

        // Ekstrak nama dasar produk (tanpa ukuran dan periode)
        const baseName = isHardware
            ? p.name
            : p.name
                .replace(/\((.*?)\)/g, '')
                .replace(/\b(Micro|Small|Medium|Large|Enterprise|Pro|Basic|Ultra|Lite)\b/gi, '')
                .replace(/\b(Bulanan|Tahunan|Monthly|Yearly|Daily|Mingguan)\b/gi, '')
                .replace(/-/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

        const moduleName = p.module?.name || 'Layanan';
        const planMode = p.absensi_mode || 'STANDARD';

        // Grouping key: Hardware devices use p.id so each item is a standalone card
        const groupKey = isHardware
            ? p.id
            : (p.module_id ? `${p.module_id}-${planMode}` : `${baseName}-${planMode}`);

        if (!products[groupKey]) {
            products[groupKey] = {
                id: groupKey,
                baseName: baseName || p.name,
                module: moduleName,
                module_id: p.module_id,
                icon: p.module?.icon || 'Package',
                service_code: p.service_code,
                mode: planMode,
                variants: [],         // Semua plan (MONTH + YEAR) disimpan untuk lookup
                uniqueSizes: new Set<string>(), // Hanya size_label unik (tanpa duplikat periode)
            };
        }

        const extractSize = (plan: any): string => {
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
            if (limit <= 1200) return 'Large';
            if (limit <= 2500) return 'Enterprise';
            return 'Ultra';
          }

          return 'Standard';
        };

        const size = extractSize(p);
        products[groupKey].uniqueSizes.add(size);
        products[groupKey].variants.push(p);
    });

    return Object.values(products).map(p => ({
        ...p,
        // sizes: array unik ukuran, diurutkan dari kecil ke besar
        sizes: Array.from(p.uniqueSizes as Set<string>).sort((a: string, b: string) => {
            const ai = SIZE_ORDER.findIndex(s => s.toLowerCase() === a.toLowerCase());
            const bi = SIZE_ORDER.findIndex(s => s.toLowerCase() === b.toLowerCase());
            return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        }),
    })).sort((a, b) => {
        const getLowestPrice = (groupItem: any) => {
            const prices = groupItem.variants.map((v: any) =>
                (v.price_onetime && v.price_onetime > 0) ? v.price_onetime : (v.price_monthly || v.price_yearly || 0)
            ).filter((p: number) => p > 0);
            return prices.length > 0 ? Math.min(...prices) : 0;
        };
        return getLowestPrice(a) - getLowestPrice(b);
    });
  }, [filteredPlans]);

  // Section Grouping helper for visual category section blocks
  const sectionGroups = useMemo(() => {
    if (groupedProducts.length === 0) return [];

    const SECTIONS = [
      {
        id: 'SERVER_HARDWARE',
        title: '🖥️ Server Node & Engine Lokal Sekolah',
        subtitle: 'Server Build-Up Dell PowerEdge & Mini PC Workstation untuk Engine Lokal Sekolah',
        badge: 'Local Engine',
        gradient: 'from-blue-600 via-indigo-600 to-violet-700'
      },
      {
        id: 'ABSENSI_HARDWARE',
        title: '🖐️ Mesin Biometrik & Reader RFID Presensi',
        subtitle: 'Terminal Sidik Jari, Face Recognition Hikvision & ZKTeco, serta Reader RFID Ruang Kelas',
        badge: 'Gate & Class Terminal',
        gradient: 'from-indigo-600 via-purple-600 to-pink-600'
      },
      {
        id: 'NETWORK_HARDWARE',
        title: '🌐 Network & Wi-Fi 6 Infrastructure',
        subtitle: 'Access Point Enterprise Wi-Fi 6 & Switch PoE Managed untuk Infrastruktur Sekolah',
        badge: 'Wi-Fi 6 & PoE',
        gradient: 'from-cyan-600 via-blue-600 to-indigo-600'
      },
      {
        id: 'PHYSICAL_SERVICE',
        title: '🎴 Kartu Pelajar PVC RFID Custom',
        subtitle: 'Paket Cetak Kartu PVC RFID Mifare 13.56MHz Custom Design Logo & Data Siswa',
        badge: 'Custom Mifare',
        gradient: 'from-emerald-600 via-teal-600 to-cyan-600'
      },
      {
        id: 'SAAS_MODULES',
        title: '💻 Aplikasi Cloud SaaS & Add-on Modul',
        subtitle: 'Platform Core Absenta, Modul Keuangan SPP, Jurnal PKL, CBT, & Kredit WhatsApp Broadcast',
        badge: 'Cloud SaaS',
        gradient: 'from-blue-600 via-indigo-600 to-purple-600'
      }
    ];

    const map: Record<string, any[]> = {};
    SECTIONS.forEach(s => { map[s.id] = []; });

    groupedProducts.forEach(group => {
      const modId = String(group.module_id || '').toUpperCase();
      const id = String(group.id || '').toUpperCase();

      if (modId === 'SERVER_HARDWARE' || id.startsWith('HW_SERVER') || id.includes('DELL')) {
        map['SERVER_HARDWARE'].push(group);
      } else if (modId === 'ABSENSI_HARDWARE' || id.startsWith('HW_FP') || id.startsWith('HW_RFID') || id.startsWith('HW_FACE') || id.includes('HIKVISION') || id.includes('ZKTECO')) {
        map['ABSENSI_HARDWARE'].push(group);
      } else if (modId === 'NETWORK_HARDWARE' || id.startsWith('HW_AP') || id.startsWith('HW_SWITCH') || id.includes('OMADA') || id.includes('RUIJIE') || id.includes('UNIFI')) {
        map['NETWORK_HARDWARE'].push(group);
      } else if (modId === 'PHYSICAL_SERVICE' || id.startsWith('SVC_') || id.includes('PVC_KARTU')) {
        map['PHYSICAL_SERVICE'].push(group);
      } else {
        map['SAAS_MODULES'].push(group);
      }
    });

    const getItemPrice = (groupItem: any) => {
      const prices = groupItem.variants.map((v: any) =>
        (v.price_onetime && v.price_onetime > 0) ? v.price_onetime : (v.price_monthly || v.price_yearly || 0)
      ).filter((p: number) => p > 0);
      return prices.length > 0 ? Math.min(...prices) : 0;
    };

    const getItemTypeScore = (groupItem: any) => {
      const isDell = groupItem.id.includes('DELL') || groupItem.baseName.toLowerCase().includes('dell');
      return isDell ? 2 : 1; // 1 = Custom Node, 2 = Dell Build-Up
    };

    return SECTIONS.filter(s => map[s.id].length > 0).map(s => ({
      ...s,
      items: map[s.id].sort((a, b) => {
        const typeDiff = getItemTypeScore(a) - getItemTypeScore(b);
        if (typeDiff !== 0) return typeDiff;
        return getItemPrice(a) - getItemPrice(b);
      })
    }));
  }, [groupedProducts]);

  const handleCardClick = (group: any) => {
    if (onSelectPlan) {
      // Marketplace style: Begitu klik kartu, langsung kirim grup ke sidebar
      // Biarkan sidebar yang menangani pemilihan varian (Edisi & Periode)
      onSelectPlan(group);
    } else {
      // In public mode, navigate to specific service or registration
      navigate(`/services/${group.id}`);
    }
  };

  return (
    <div className="space-y-10">
      {/* Module Explorer Header */}
      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="max-w-xl">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1 tracking-tight">Katalog Solusi Sekolah</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium opacity-80">Pilih modul otomasi yang tepat untuk efisiensi operasional sekolah Anda.</p>
          </div>
          
          <div className="flex bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 self-start shadow-inner items-center gap-1">
            <button 
              onClick={() => setConfigView('GRID')}
              className={`px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${configView === 'GRID' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Belanja
            </button>
            <button 
              onClick={() => setConfigView('COMPARE')}
              className={`px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${configView === 'COMPARE' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Bandingkan
            </button>
            <button 
              onClick={() => navigate('/billing/rab-calculator')}
              className="px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20 hover:scale-105 flex items-center gap-1.5"
            >
              🧮 Kalkulator RAB
            </button>
          </div>
        </div>

        {/* ── TOP MAIN CATEGORY SEGMENT SWITCHER (SAAS vs HARDWARE PENGADAAN) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => { setMainCategory('SAAS'); setCategoryFilter('ALL'); }}
            className={`p-5 rounded-2xl border-2 text-left transition-all flex items-center gap-4 ${
              mainCategory === 'SAAS'
                ? 'bg-blue-600 border-blue-600 text-white shadow-xl scale-[1.01]'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-400'
            }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold shrink-0 ${
              mainCategory === 'SAAS' ? 'bg-white/20 text-white' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
            }`}>
              <LucideIcons.Cloud size={24} />
            </div>
            <div>
              <div className="font-black text-sm uppercase tracking-wider">1. Cloud SaaS Solution</div>
              <div className={`text-xs ${mainCategory === 'SAAS' ? 'text-blue-100' : 'text-slate-400'}`}>Cloud Apps, Add-on Modul & WA Credit (Instant Payment)</div>
            </div>
          </button>

          <button
            onClick={() => { setMainCategory('HARDWARE'); setCategoryFilter('ALL'); }}
            className={`p-5 rounded-2xl border-2 text-left transition-all flex items-center gap-4 ${
              mainCategory === 'HARDWARE'
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl scale-[1.01]'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400'
            }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold shrink-0 ${
              mainCategory === 'HARDWARE' ? 'bg-white/20 text-white' : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
            }`}>
              <LucideIcons.Building2 size={24} />
            </div>
            <div>
              <div className="font-black text-sm uppercase tracking-wider">2. On-Premise Solution & Hardware</div>
              <div className={`text-xs ${mainCategory === 'HARDWARE' ? 'text-indigo-100' : 'text-slate-400'}`}>Server Lokal (Dell/Mini PC), Biometrik & RFID (SIPLaH/RAB)</div>
            </div>
          </button>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setCategoryFilter('ALL')}
            className={`px-6 h-12 rounded-full font-black text-[11px] uppercase tracking-[0.15em] transition-all duration-300 flex items-center gap-3 border-2 ${categoryFilter === 'ALL' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xl scale-105' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600'}`}
          >
            <LayoutGrid size={16} />
            {mainCategory === 'SAAS' ? 'Semua Layanan SaaS' : mainCategory === 'HARDWARE' ? 'Semua Perangkat Hardware' : 'Semua Layanan'}
          </button>

          {visibleSubModules.map((m: any) => {
            const Icon = (LucideIcons as any)[m.icon] || Package;
            const isActive = categoryFilter === m.id;
            return (
              <button 
                key={m.id}
                onClick={() => setCategoryFilter(m.id)}
                className={`px-6 h-12 rounded-full font-black text-[11px] uppercase tracking-[0.15em] transition-all duration-300 flex items-center gap-3 border-2 ${isActive ? 'bg-blue-600 text-white border-blue-600 shadow-xl scale-105' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600'}`}
              >
                <Icon size={16} />
                {m.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Product Catalog Area */}
      <div className="relative">
        <AnimatePresence mode="wait">
          {configView === 'COMPARE' ? (
            <motion.div
              key="compare"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="bg-white dark:bg-slate-900/50 backdrop-blur-3xl rounded-[3rem] border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-2xl"
            >
               <table className="w-full text-sm text-left border-collapse min-w-[800px]">
                 <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                       <th className="p-10 text-xs font-black uppercase tracking-widest text-slate-400 w-1/4">Komponen Fitur</th>
                       {groupedProducts.slice(0, 3).map(p => (
                           <th key={p.id} className="p-10">
                              <div className="text-[10px] font-black text-blue-600 uppercase mb-2 tracking-tighter">{p.module}</div>
                              <div className="text-xl font-black text-slate-900 dark:text-white leading-tight">{p.baseName}</div>
                           </th>
                         ))}
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50 font-medium">
                    <tr>
                       <td className="p-8 pl-10 text-slate-500 font-bold">Mode Pengoperasian</td>
                       {groupedProducts.slice(0, 3).map(p => (
                         <td key={p.id} className="p-8 text-slate-900 dark:text-white font-black">{p.mode.replace('_', ' ')}</td>
                       ))}
                    </tr>
                 </tbody>
               </table>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-12"
            >
              {plansQuery.isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="p-4 rounded-[3rem] bg-slate-50 dark:bg-slate-900 animate-pulse h-[450px]"><div /></Card>
                  ))}
                </div>
              ) : sectionGroups.length === 0 ? (
                <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
                  <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-8 shadow-xl"><Search size={32} className="text-slate-400" /></div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Produk Tidak Ditemukan</h3>
                  <p className="text-slate-500 max-w-sm text-sm font-medium">Maaf, saat ini belum ada penawaran untuk kategori ini.</p>
                </div>
              ) : (
                sectionGroups.map((section) => (
                  <div key={section.id} className="space-y-6">
                    {/* SECTION CATEGORY HEADER BANNER */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 px-6 bg-slate-50 dark:bg-slate-950/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                      <div>
                        <h4 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                          {section.title}
                        </h4>
                        <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5 leading-normal">
                          {section.subtitle}
                        </p>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-800/40 shrink-0">
                        {section.items.length} Produk Pilihan
                      </span>
                    </div>

                    {/* ITEMS GRID PER SECTION (EXACT 5 COLUMNS DESKTOP GRID) */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-3">
                      {section.items.map((group) => {
                        const customImage = group.variants.find((v: any) => v.image_url)?.image_url;
                        const thumbnail = customImage || getServiceThumbnail(group.service_code, group.module, group.mode);
                        const lowestPrice = Math.min(
                          ...group.variants.map((v: any) =>
                            v.price_onetime > 0 ? v.price_onetime : (v.price_monthly || v.price_yearly || 0)
                          )
                        );
                        const IconComp = getServiceIcon(group.service_code, group.icon);
                        
                        const matchingService = mode === 'private' ? ownedServices.find((s: any) => {
                          const sModuleId = String(s.Plan?.module_id || s.plan_snapshot?.module_id || '').trim().toUpperCase();
                          const sMode = String(s.Plan?.absensi_mode || s.plan_snapshot?.absensi_mode || 'SIMPLE').trim().toUpperCase();
                          const gModuleId = String(group.module_id || '').trim().toUpperCase();
                          const gMode = String(group.mode || 'SIMPLE').trim().toUpperCase();
                          return sModuleId === gModuleId && (gModuleId !== 'ABSENSI' || sMode === gMode);
                        }) : null;

                        const serviceStatus = matchingService?.status?.toUpperCase();
                        const isActive = serviceStatus === 'ACTIVE' || serviceStatus === 'TRIAL';
                        const isDellBuildUp = group.id.includes('DELL') || group.baseName.toLowerCase().includes('dell');
                        const isCustomNode = group.id.includes('NODE') || group.baseName.toLowerCase().includes('mini pc') || group.baseName.toLowerCase().includes('workstation');

                        return (
                          <motion.div 
                            key={group.id} 
                            whileHover={{ y: -4 }}
                            onClick={() => handleCardClick(group)}
                            className="cursor-pointer bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md hover:border-blue-500 transition-all flex flex-col h-full group"
                          >
                            {/* 1. SQUARE TOP IMAGE COVER - 100% COVER EDGE-TO-EDGE */}
                            <div className="w-full aspect-square bg-slate-50 dark:bg-slate-950 relative overflow-hidden flex items-center justify-center p-2 border-b border-slate-100 dark:border-slate-800/60">
                              {thumbnail ? (
                                <img 
                                  src={thumbnail} 
                                  alt={group.baseName} 
                                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <IconComp size={40} className="text-slate-400 dark:text-slate-500 group-hover:text-blue-600 transition-colors" />
                              )}

                              {isActive && (
                                <span className="absolute top-1.5 left-1.5 bg-emerald-600 text-white font-bold text-[8px] px-1.5 py-0.5 rounded shadow z-10">
                                  Terpasang
                                </span>
                              )}

                              {isDellBuildUp ? (
                                <span className="absolute top-1.5 right-1.5 bg-blue-600 text-white font-bold text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded shadow z-10">
                                  Dell Build-Up
                                </span>
                              ) : isCustomNode ? (
                                <span className="absolute top-1.5 right-1.5 bg-emerald-600 text-white font-bold text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded shadow z-10">
                                  Custom Node
                                </span>
                              ) : null}
                            </div>

                            {/* 2. COMPACT CONTENT UNDER IMAGE (EXACT TOKOPEDIA STYLE: TITLE + PRICE ONLY) */}
                            <div className="p-2.5 flex flex-col justify-between flex-1 space-y-2">
                              <h3 
                                style={{ fontSize: '9.5px', fontWeight: 400 }} 
                                className="text-slate-700 dark:text-slate-300 leading-tight line-clamp-2 min-h-[1.75rem] group-hover:text-blue-600 transition-colors"
                              >
                                {group.baseName}
                              </h3>

                              <div>
                                <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white font-mono tracking-tight">
                                  {formatCurrency(lowestPrice)}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Variant Selector Modal for Private Mode */}
      <AnimatePresence>
        {selectedGroup && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedGroup(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white dark:bg-slate-950 rounded-[2.5rem] shadow-2xl z-[111] overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              <div className="p-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-600/20">
                      {React.createElement((LucideIcons as any)[selectedGroup.icon] || Package, { size: 24 })}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{selectedGroup.baseName}</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedGroup.module}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedGroup(null)}
                    className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-500 hover:text-red-500 transition-colors"
                  >
                    <LucideIcons.X size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedGroup.variants.map((v: any) => (
                    <div
                      key={v.id}
                      onClick={() => {
                        onSelectPlan?.({
                          ...v,
                          moduleName: selectedGroup.module,
                          moduleIcon: selectedGroup.icon
                        });
                        setSelectedGroup(null);
                      }}
                      className="group cursor-pointer p-6 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 hover:border-blue-600 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-900/50 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <Badge variant="outline" className="text-[10px] font-black uppercase py-0.5 px-3 bg-white dark:bg-slate-800 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors">Edisi {v.size}</Badge>
                        <div className="text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowRight size={16} />
                        </div>
                      </div>
                      <h4 className="text-lg font-black text-slate-900 dark:text-white mb-1">{v.name.replace(/-/g, ' ')}</h4>
                      <div className="text-xl font-black text-blue-600 dark:text-blue-400">
                        {formatCurrency(v.price_monthly)}
                        <span className="text-[10px] text-slate-400 font-bold ml-1 uppercase">/bln</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium">Kapasitas hingga {v.max_user?.toLocaleString() || 'Unlimited'} Pengguna</p>
                      
                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            addItemToCart({
                              plan_id: v.id,
                              name: v.name,
                              price: v.price_onetime > 0 ? v.price_onetime : (v.price_monthly || 0),
                              type: v.type || 'SOFTWARE_SUBSCRIPTION',
                              weightGrams: v.weight_grams || 0,
                              moduleName: selectedGroup.module
                            });
                            toast.success(`${v.name} telah ditambahkan ke keranjang!`);
                          }}
                          className="w-full py-2 px-3 rounded-xl bg-indigo-600/10 hover:bg-indigo-600 text-indigo-600 dark:text-indigo-400 hover:text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                        >
                          <LucideIcons.Plus size={14} />
                          + Tambah ke Keranjang
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800 flex items-center gap-3">
                  <Info size={16} className="text-amber-600 flex-shrink-0" />
                  <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400 leading-relaxed">Pilih salah satu variasi paket di atas untuk melanjutkan ke proses aktivasi layanan.</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Cart Button */}
      {mode === 'private' && (
        <>
          <button
            onClick={() => setCartOpen(true)}
            className="fixed bottom-6 right-6 z-40 p-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xl shadow-indigo-600/50 flex items-center gap-3 border border-indigo-400/40 hover:scale-105 active:scale-95 transition-all"
          >
            <div className="relative">
              <LucideIcons.ShoppingBag className="w-6 h-6" />
              {cartItems.reduce((sum, item) => sum + item.qty, 0) > 0 && (
                <span className="absolute -top-2 -right-2 bg-rose-500 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900 animate-in zoom-in">
                  {cartItems.reduce((sum, item) => sum + item.qty, 0)}
                </span>
              )}
            </div>
            <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">
              Keranjang Belanja
            </span>
          </button>

          <CartDrawer />

          <RABCalculatorModal
            isOpen={isRABModalOpen}
            onClose={() => setIsRABModalOpen(false)}
            availablePlans={plansQuery.data || []}
            onApplyOrder={(items) => {
              items.forEach(item => {
                addItemToCart({
                  planId: item.plan.id,
                  planName: item.plan.name,
                  price: item.plan.price_onetime || item.plan.price_monthly || 0,
                  cycle: 'ONETIME',
                  qty: item.quantity
                });
              });
              setCartOpen(true);
              toast.success('Hasil rancangan RAB berhasil dimasukkan ke Keranjang Belanja!');
            }}
          />
        </>
      )}
    </div>
  );
};
