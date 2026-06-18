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
  const [configView, setConfigView] = useState<'GRID' | 'COMPARE'>('GRID');
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);

  // 1. Plans Query
  const plansQuery = useQuery({
    queryKey: ['public-plans'],
    queryFn: async () => {
      const res = await getPublicPlans();
      const plans = (res.data as any)?.plans || res.data || [];
      return Array.isArray(plans) ? plans : [];
    },
    staleTime: 1000 * 60 * 10,
  });

  // 2. Modules Query
  const modulesQuery = useQuery({
    queryKey: ['public-modules'],
    queryFn: async () => {
      const res = await getPublicModules();
      return res.data || [];
    },
    staleTime: 1000 * 60 * 60,
  });

  const catalogPlans = plansQuery.data || [];
  const allModules = modulesQuery.data || [];

  const filteredPlans = useMemo(() => {
    if (!catalogPlans || !Array.isArray(catalogPlans)) return [];
    if (categoryFilter === 'ALL') return catalogPlans;
    
    return catalogPlans.filter((p: any) => {
      if (p.module_id && p.module_id.toUpperCase() === categoryFilter.toUpperCase()) return true;

      const sCode = String(p.service_code || '').toUpperCase();
      const pCode = String(p.code || '').toUpperCase();
      const filter = String(categoryFilter).toUpperCase();

      if (filter === 'ABSENSI') return sCode.includes('ABSENSI') || pCode.includes('ABSENSI');
      if (filter === 'KOPERASI') return sCode.includes('KOPERASI') || sCode.includes('KANTIN') || pCode.includes('KOPERASI');
      if (filter === 'INVENTORY') return sCode.includes('INVENTORY') || sCode.includes('SARPRAS') || pCode.includes('INVENTORY');
      
      return sCode === filter;
    });
  }, [catalogPlans, categoryFilter]);

  const groupedProducts = useMemo(() => {
    const products: Record<string, any> = {};

    filteredPlans.forEach((p: any) => {
        const baseName = p.name
            .replace(/\((Micro|Small|Medium|Large|Enterprise|Bulanan|Tahunan|Monthly|Yearly)\)/gi, '')
            .replace(/\b(Micro|Small|Medium|Large|Enterprise|Bulanan|Tahunan|Monthly|Yearly)\b/gi, '')
            .replace(/-/g, '')
            .replace(/\s+/g, ' ')
            .trim();
            
        const moduleName = p.module?.name || 'Layanan';
        const planMode = p.absensi_mode || 'STANDARD';
        const size = p.size_label || 'Standard';
        const groupKey = `${baseName}-${planMode}`;
        
        if (!products[groupKey]) {
            products[groupKey] = {
                id: groupKey,
                baseName,
                mode: planMode,
                module: p.module?.name || moduleName,
                icon: p.module?.icon || 'Package',
                service_code: p.service_code,
                module_id: p.module_id,
                variants: [],
                sizes: new Set<string>(),
                periods: new Set<string>()
            };
        }

        products[groupKey].sizes.add(size);
        products[groupKey].variants.push({ ...p, size });
    });

    return Object.values(products).map(p => ({
        ...p,
        sizes: Array.from(p.sizes).sort((a, b) => {
            const vA = p.variants.find((v: any) => v.size === a);
            const vB = p.variants.find((v: any) => v.size === b);
            return (vA?.max_user || 0) - (vB?.max_user || 0);
        })
    })).sort((a, b) => {
        const maxPriceA = Math.max(...a.variants.map((v: any) => v.price_monthly || 0));
        const maxPriceB = Math.max(...b.variants.map((v: any) => v.price_monthly || 0));
        return maxPriceB - maxPriceA;
    });
  }, [filteredPlans]);

  const handleCardClick = (group: any) => {
    if (onSelectPlan) {
      // In private mode, if there are multiple variants, show the selector
      if (group.variants.length > 1) {
        setSelectedGroup(group);
      } else {
        // If only one variant, select it directly
        const variant = group.variants[0];
        onSelectPlan({
          ...variant,
          moduleName: group.module,
          moduleIcon: group.icon
        });
      }
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
          
          <div className="flex bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 self-start shadow-inner">
            <button 
              onClick={() => setConfigView('GRID')}
              className={`px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${configView === 'GRID' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Belanja
            </button>
            <button 
              onClick={() => setConfigView('COMPARE')}
              className={`px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${configView === 'COMPARE' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Bandingkan
            </button>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setCategoryFilter('ALL')}
            className={`px-6 h-12 rounded-full font-black text-[11px] uppercase tracking-[0.15em] transition-all duration-300 flex items-center gap-3 border-2 ${categoryFilter === 'ALL' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xl scale-105' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600'}`}
          >
            <LayoutGrid size={16} />
            Semua Layanan
          </button>

          {allModules.map((m: any) => {
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
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
            >
              {plansQuery.isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="p-4 rounded-[3rem] bg-slate-50 dark:bg-slate-900 animate-pulse h-[450px]"><div /></Card>
                ))
              ) : groupedProducts.length === 0 ? (
                <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
                  <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-8 shadow-xl"><Search size={32} className="text-slate-400" /></div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Produk Tidak Ditemukan</h3>
                  <p className="text-slate-500 max-w-sm text-sm font-medium">Maaf, saat ini belum ada penawaran untuk kategori ini.</p>
                </div>
              ) : (
                groupedProducts.map((group) => {
                  const thumbnail = getServiceThumbnail(group.service_code, group.module, group.mode);
                  const theme = getServiceTheme(group.service_code);
                  const lowestPrice = Math.min(...group.variants.map((v: any) => v.price_monthly));
                  const IconComp = getServiceIcon(group.service_code, group.icon);
                  
                  // Check Ownership & Status (only for private mode)
                  const matchingService = mode === 'private' ? ownedServices.find((s: any) => {
                    const sModuleId = String(s.Plan?.module_id || s.plan_snapshot?.module_id || '').trim().toUpperCase();
                    const sMode = String(s.Plan?.absensi_mode || s.plan_snapshot?.absensi_mode || 'SIMPLE').trim().toUpperCase();
                    const gModuleId = String(group.module_id || '').trim().toUpperCase();
                    const gMode = String(group.mode || 'SIMPLE').trim().toUpperCase();
                    return sModuleId === gModuleId && (gModuleId !== 'ABSENSI' || sMode === gMode);
                  }) : null;

                  const serviceStatus = matchingService?.status?.toUpperCase();
                  const isActive = serviceStatus === 'ACTIVE' || serviceStatus === 'TRIAL';
                  const isPending = serviceStatus === 'UPGRADE_PENDING' || serviceStatus === 'PENDING_PAYMENT';
                  const isOwned = isActive || isPending;

                  return (
                    <motion.div 
                      key={group.id} 
                      layout 
                      whileHover={{ y: -10 }}
                      onClick={() => handleCardClick(group)}
                      className="cursor-pointer"
                    >
                      <Card className={`group rounded-3xl border-2 transition-all duration-700 flex flex-col h-full shadow-lg hover:shadow-2xl relative overflow-hidden ${
                        group.module_id?.startsWith('PAKET_LENGKAP')
                          ? 'border-indigo-600/60 bg-white dark:bg-slate-900 ring-8 ring-indigo-500/5 shadow-[0_0_60px_-15px_rgba(79,70,229,0.25)] scale-[1.02]' 
                          : isActive 
                            ? 'border-emerald-500/50 bg-emerald-50/5 dark:bg-emerald-950/10 ring-1 ring-emerald-500/20' 
                            : isPending
                              ? 'border-amber-500/50 bg-amber-50/5 dark:bg-amber-950/10 ring-1 ring-amber-500/20'
                              : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900'
                      }`}>
                        {group.module_id?.startsWith('PAKET_LENGKAP') && (
                          <>
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(79,70,229,0.2),transparent_70%)] animate-pulse pointer-events-none" />
                            <div className="absolute -top-1 -right-1 z-30 overflow-hidden w-32 h-32 pointer-events-none">
                               <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-[11px] font-black py-2.5 px-14 absolute top-6 -right-12 rotate-45 shadow-2xl uppercase tracking-widest flex items-center justify-center gap-2 ring-2 ring-white/30">
                                  <Sparkles size={12} className="fill-white" />
                                  Value
                               </div>
                            </div>
                            <div className="absolute bottom-40 right-6 z-20">
                              <div className="bg-orange-500 text-white text-[10px] font-black px-4 py-2 rounded-xl shadow-xl shadow-orange-500/40 flex flex-col items-center leading-none uppercase tracking-tighter transform -rotate-12 border-2 border-white/20 scale-110">
                                <span>Hemat</span>
                                <span className="text-base">40%</span>
                              </div>
                            </div>
                          </>
                        )}
                        {isActive && (
                          <div className="absolute top-6 right-6 z-20">
                            <div className="bg-emerald-500 text-white text-[11px] font-bold px-4 py-1.5 rounded-full shadow-lg shadow-emerald-500/20 flex items-center gap-2 uppercase tracking-widest animate-in fade-in zoom-in duration-500 ring-4 ring-white dark:ring-slate-900">
                              <CheckCircle size={14} className="stroke-[3px]" />
                              Terpasang
                            </div>
                          </div>
                        )}
                        {isPending && (
                          <div className="absolute top-6 right-6 z-20">
                            <div className="bg-amber-500 text-white text-[10px] font-bold px-4 py-1.5 rounded-full shadow-lg shadow-amber-500/20 flex items-center gap-2 uppercase tracking-widest animate-in fade-in zoom-in duration-500 ring-4 ring-white dark:ring-slate-900">
                              <LucideIcons.Clock size={14} className="stroke-[3px]" />
                              Menunggu Pembayaran
                            </div>
                          </div>
                        )}
                        
                        <div className="h-56 relative overflow-hidden flex items-center justify-center p-8">
                           <div className={`absolute inset-0 bg-gradient-to-b ${theme.gradient} opacity-50`}></div>
                           <div className="relative z-10 w-full h-full flex items-center justify-center">
                              {thumbnail ? (
                                 <motion.img 
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    src={thumbnail} 
                                    alt={group.baseName} 
                                    className="w-full h-full object-contain filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.15)] group-hover:scale-110 transition-transform duration-700 [mask-image:radial-gradient(circle,white_75%,transparent_100%)] dark:opacity-90" 
                                 />
                              ) : (
                                 <div className={`w-24 h-24 rounded-xl ${theme.iconBg} text-white flex items-center justify-center shadow-2xl`}>
                                    <IconComp size={48} />
                                 </div>
                              )}
                           </div>
                        </div>

                        <div className="px-8 pb-8 pt-2 flex-1 flex flex-col">
                           <div className="mb-6">
                              {!group.baseName.toUpperCase().includes(group.module.toUpperCase()) && (
                                 <div className={`text-[12px] font-black ${theme.text} uppercase tracking-[0.15em] mb-2 opacity-90`}>{group.module}</div>
                              )}
                              <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight mb-3 line-clamp-2 min-h-[3.5rem] tracking-tight group-hover:text-blue-600 transition-colors uppercase">{group.baseName}</h3>
                              <div className="flex flex-wrap gap-2">
                                 <Badge variant="outline" className="text-[11px] font-black py-0.5 px-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30 uppercase tracking-widest">{group.sizes.length} Variasi</Badge>
                              </div>
                           </div>

                           <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                              <div>
                                 <div className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] mb-1.5">Mulai dari</div>
                                 <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
                                    {formatCurrency(lowestPrice)}
                                    <span className="text-[13px] text-slate-400 font-bold ml-2 uppercase">/bln</span>
                                 </div>
                              </div>
                                 <div className="flex items-center gap-3 group/btn">
                                    {mode === 'public' && (
                                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover/btn:text-blue-600 transition-colors opacity-0 group-hover/btn:opacity-100 transform translate-x-2 group-hover/btn:translate-x-0 transition-all duration-300">
                                          Lihat Detail
                                       </span>
                                    )}
                                    <div className="w-12 h-12 rounded-full bg-slate-900 dark:bg-white flex items-center justify-center text-white dark:text-slate-900 shadow-xl group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                                       <ArrowRight size={20} />
                                    </div>
                                 </div>
                           </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })
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
                    <button
                      key={v.id}
                      onClick={() => {
                        onSelectPlan?.({
                          ...v,
                          moduleName: selectedGroup.module,
                          moduleIcon: selectedGroup.icon
                        });
                        setSelectedGroup(null);
                      }}
                      className="group p-6 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 hover:border-blue-600 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-900/50 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
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
                    </button>
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
    </div>
  );
};
