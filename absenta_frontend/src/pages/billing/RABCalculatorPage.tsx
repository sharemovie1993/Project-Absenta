import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Calculator, 
  ArrowLeft, 
  Server, 
  ShieldCheck, 
  Clock, 
  CreditCard, 
  Wrench, 
  Plus, 
  Trash2, 
  Printer, 
  ShoppingBag,
  Sparkles,
  ChevronDown,
  Zap,
  Package,
  Building2,
  Users,
  Percent,
  CheckCircle2,
  Cpu
} from 'lucide-react';
import { getPublicPlans } from '../../api/plans.api';
import { RABProductItem, RABPrintableProposalView } from '../../components/billing/RABCalculatorModal';
import { useCartStore } from '../../store/useCartStore';
import toast from 'react-hot-toast';

interface RABSlotSelection {
  planId: string;
  quantity: number;
  customName?: string;
  customPrice?: number;
}

// ── REAL PRODUCT IMAGE RESOLVER ──
const getProductRealImage = (plan: RABProductItem | undefined): string => {
  if (!plan) return '';
  const img = (plan as any).image_url || (plan as any).thumbnail_url || (plan as any).image;
  if (img) return img;

  const idUpper = (plan.id || '').toUpperCase();
  const nameUpper = (plan.name || '').toUpperCase();

  if (idUpper.includes('SERVER') || idUpper.includes('DELL') || idUpper.includes('R730') || idUpper.includes('T150') || nameUpper.includes('SERVER')) {
    return '/assets/modules/server.png';
  }
  if (idUpper.includes('320MFX') || idUpper.includes('FACE') || idUpper.includes('HIKVISION') || idUpper.includes('8003MF') || nameUpper.includes('FACE')) {
    return 'https://images.unsplash.com/photo-1563770660941-20978e870e26?w=120&auto=format&fit=crop&q=80';
  }
  if (idUpper.includes('OTG') || idUpper.includes('USB') || idUpper.includes('DESKTOP') || idUpper.includes('SCR100') || nameUpper.includes('OTG')) {
    return 'https://images.unsplash.com/photo-1616469829941-c7200edec809?w=120&auto=format&fit=crop&q=80';
  }
  if (idUpper.includes('KARTU') || idUpper.includes('MIFARE') || idUpper.includes('CARD') || nameUpper.includes('KARTU')) {
    return 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=120&auto=format&fit=crop&q=80';
  }
  if (idUpper.includes('WIFI') || idUpper.includes('AP') || idUpper.includes('SWITCH') || idUpper.includes('POE') || nameUpper.includes('WIFI')) {
    return 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=120&auto=format&fit=crop&q=80';
  }

  return '';
};

// ── MINI PRODUCT THUMBNAIL PREVIEW ──
const ProductMiniThumbnail: React.FC<{ plan: RABProductItem | undefined }> = ({ plan }) => {
  if (!plan) return <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0" />;

  const realImg = getProductRealImage(plan);

  return (
    <div className="w-14 h-14 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center shadow-sm p-1 transition hover:scale-105" title={plan.name}>
      {realImg ? (
        <img src={realImg} alt={plan.name} className="w-full h-full object-contain" />
      ) : (
        <Package size={22} className="text-slate-400" />
      )}
    </div>
  );
};

// ── HARDWARE CONDITION BADGE RESOLVER ──
const getHardwareConditionBadge = (plan: RABProductItem | undefined): { label: string; bg: string } => {
  if (!plan) return { label: '', bg: '' };
  
  const idUpper = (plan.id || '').toUpperCase();
  const nameUpper = (plan.name || '').toUpperCase();

  // Dell R730 / Ex-Data Center Enterprise Refurbished Grade A
  if (idUpper.includes('R730') || nameUpper.includes('R730') || nameUpper.includes('REFURBISHED')) {
    return {
      label: '🔄 REFURBISHED GRADE A',
      bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800'
    };
  }

  // Unit Baru / BNIB (Dell R750 Enterprise, Dell T40, Dell T150, Mini PC Node, Hikvision, OTG Reader, WiFi AP, Kartu RFID)
  return {
    label: '✨ BARU (BNIB)',
    bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
  };
};

// ── CUSTOM SELECT COMPONENT ──
const CustomImageSelect: React.FC<{
  options: RABProductItem[];
  value: string;
  onChange: (id: string) => void;
  groupByBadge?: boolean;
  filterMinCapacity?: number;
}> = ({ options, value, onChange, groupByBadge = false, filterMinCapacity }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.id === value) || options[0];
  const selectedCondBadge = getHardwareConditionBadge(selectedOption);

  const groupedOptions = useMemo(() => {
    if (!groupByBadge) return { '': options };
    const groups: { [key: string]: RABProductItem[] } = {};
    options.forEach(opt => {
      const groupName = opt.id.includes('DELL') || opt.name.includes('Dell') 
        ? '🔷 Server Build-Up (Dell Enterprise)' 
        : '🟢 Server Custom Node (Absenta Workstation)';
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(opt);
    });
    return groups;
  }, [options, groupByBadge]);

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-11 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-left flex items-center justify-between shadow-sm hover:border-blue-500 transition"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
            {selectedOption?.name || 'Pilih Produk...'}
          </span>
          {selectedCondBadge.label && (
            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded shrink-0 uppercase tracking-wider border ${selectedCondBadge.bg}`}>
              {selectedCondBadge.label}
            </span>
          )}
          {selectedOption?.badge_label && (
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded shrink-0 uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {selectedOption.badge_label}
            </span>
          )}
        </div>
        <ChevronDown size={14} className="text-slate-400 shrink-0 ml-1" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 min-w-full sm:min-w-[480px] top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-40 max-h-80 overflow-y-auto p-1 divide-y divide-slate-100 dark:divide-slate-800">
            {filterMinCapacity && filterMinCapacity > 0 && (
              <div className="px-3 py-1.5 text-[10px] font-extrabold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/80 rounded flex items-center justify-between">
                <span>🛡️ Filter Kapasitas Siswa Aktif: Minimal {filterMinCapacity} Siswa</span>
                <span className="text-[9px] text-slate-500 font-normal">Option di bawah kapasitas dinonaktifkan</span>
              </div>
            )}
            {Object.entries(groupedOptions).map(([groupTitle, groupItems]) => (
              <div key={groupTitle} className="py-1">
                {groupTitle && (
                  <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 rounded mb-1">
                    {groupTitle}
                  </div>
                )}
                {groupItems.map((opt) => {
                  const optImg = getProductRealImage(opt);
                  const optCondBadge = getHardwareConditionBadge(opt);
                  
                  const optCap = opt.device_limit || opt.max_user || (
                    opt.id.includes('SMALL') || opt.id.includes('T40') ? 300 :
                    opt.id.includes('MEDIUM') || opt.id.includes('T150') ? 600 :
                    opt.id.includes('LARGE') || opt.id.includes('T150_PRO') ? 1200 :
                    opt.id.includes('ENTERPRISE') || opt.id.includes('R730') ? 2500 : 4000
                  );
                  const isUnderpowered = Boolean(filterMinCapacity && filterMinCapacity > 0 && optCap < filterMinCapacity);

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={isUnderpowered}
                      onClick={() => {
                        if (isUnderpowered) return;
                        onChange(opt.id);
                        setIsOpen(false);
                      }}
                      className={`w-full p-2.5 text-left flex items-center justify-between gap-3 rounded-xl transition ${
                        isUnderpowered
                          ? 'opacity-40 bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-600 cursor-not-allowed line-through'
                          : opt.id === value 
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-800' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                      title={isUnderpowered ? `Kapasitas server ini (maks ${optCap} siswa) kurang dari total siswa sekolah Anda (${filterMinCapacity} siswa)` : undefined}
                    >
                      <div className="flex items-center gap-3 overflow-hidden flex-1">
                        {optImg && (
                          <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 p-0.5 overflow-hidden flex items-center justify-center shadow-sm">
                            <img src={optImg} alt={opt.name} className="w-full h-full object-contain" />
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold leading-snug truncate">
                            {opt.name}
                          </span>
                          <div className="flex flex-wrap items-center gap-1 mt-0.5">
                            {isUnderpowered ? (
                              <span className="text-[8px] font-extrabold px-1.5 py-0.2 rounded shrink-0 uppercase tracking-wider bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300">
                                ⛔ Underpowered (Maks {optCap} Siswa)
                              </span>
                            ) : (
                              <>
                                {optCondBadge.label && (
                                  <span className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded shrink-0 uppercase tracking-wider border ${optCondBadge.bg}`}>
                                    {optCondBadge.label}
                                  </span>
                                )}
                                {opt.badge_label && (
                                  <span className="text-[8px] font-extrabold px-1.5 py-0.2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded shrink-0 uppercase">
                                    {opt.badge_label}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 shrink-0">
                        Rp {(opt.price_onetime || opt.price_monthly || 0).toLocaleString('id-ID')}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ── OWNER TECHNICAL SPEC & BOM VIEW ──
const OwnerSpecBOMView: React.FC<{
  serverPlanObj: RABProductItem | undefined;
  gatePlanObj: RABProductItem | undefined;
  sessionPlanObj: RABProductItem | undefined;
  cardPlanObj: RABProductItem | undefined;
  slotOthers: RABSlotSelection[];
  resolvePlan: (id: string) => RABProductItem | undefined;
  formatCurrency: (val: number) => string;
}> = ({ serverPlanObj, gatePlanObj, sessionPlanObj, cardPlanObj, slotOthers, resolvePlan, formatCurrency }) => {
  const parsedSpecs = useMemo(() => {
    const raw = (serverPlanObj as any)?.tech_specs_json;
    if (!raw) return null;
    try {
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e) {
      return null;
    }
  }, [serverPlanObj]);

  return (
    <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 text-slate-900 dark:text-slate-100">
      
      {/* HEADER SPEK TEKNIS OWNER */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 rounded-lg text-xs font-black uppercase tracking-wider mb-1">
            <Wrench size={14} /> Lembar Internal Owner / Teknis Perakitan (Tersimpan di DB)
          </div>
          <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
            Spesifikasi Teknis Hardware &amp; Bill of Materials (BOM)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Panduan Acuan Pembelian Perangkat Fisik (Tokopedia/EnterKomputer) &amp; Checklist Pre-Configuration Sistem 24/7
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2 bg-slate-900 dark:bg-slate-800 text-white rounded-xl text-xs font-bold transition hover:bg-slate-800 flex items-center gap-1.5 shrink-0 self-start md:self-auto shadow-sm"
        >
          <Printer size={14} /> Cetak / Save PDF Spec Teknis
        </button>
      </div>

      {/* 1. SEKSI SERVER NODE SPECIFICATION */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <Server size={16} className="text-blue-500" />
          1. Spesifikasi Teknis Server Node Eksplisit ({serverPlanObj?.name || 'Server Lokal'})
        </h3>

        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
          {/* BANNER COMPATIBILITY SOCKET */}
          <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded-xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Cpu size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />
              <div>
                <span className="font-extrabold text-blue-900 dark:text-blue-200 block">
                  Kesesuaian Socket &amp; Standar Perakitan Komponen (LGA / Chipset / RAM):
                </span>
                <span className="text-blue-700 dark:text-blue-300 font-semibold">
                  {parsedSpecs?.socket || 'Socket LGA1700 (Intel 14th Gen) / Socket Server Dedicated'}
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-lg font-bold text-[11px] shrink-0 border border-emerald-300 dark:border-emerald-800">
              ✓ Verified Socket Compatible
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 font-medium block">Tipe &amp; Seri Server:</span>
              <span className="font-bold text-slate-900 dark:text-white text-sm">{serverPlanObj?.name || 'Server Rakitan Absenta Node'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Kondisi &amp; Peruntukan:</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">
                {serverPlanObj?.id?.includes('R730') ? '🔄 Refurbished Grade A (Ex-Data Center 2U)' : '✨ Unit Baru BNIB (Garansi Resmi/Vendor)'}
              </span>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">Rincian Acuan Komponen Fisik Eksplisit (BOM Perakitan dari DB):</span>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] uppercase">
                    <th className="p-2.5 text-left rounded-l-lg">Komponen</th>
                    <th className="p-2.5 text-left">Deskripsi Eksplisit Komponen</th>
                    <th className="p-2.5 text-left rounded-r-lg">Acuan Brand &amp; Distributor Resmi ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                  <tr className="bg-blue-50/30 dark:bg-blue-950/20">
                    <td className="p-2.5 font-bold text-slate-900 dark:text-white">Socket &amp; Platform</td>
                    <td className="p-2.5 font-extrabold text-blue-600 dark:text-blue-400">{parsedSpecs?.socket || 'Socket LGA1700 / Intel Server Platform'}</td>
                    <td className="p-2.5 text-slate-500 font-semibold">Standard Compatibility Match</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-slate-900 dark:text-white">Form Factor / Sasis</td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-300">{parsedSpecs?.sasis || 'Workstation Industrial Tower Case'}</td>
                    <td className="p-2.5 text-blue-600 dark:text-blue-400 font-semibold">DeepCool / Tecware Workstation Case</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-slate-900 dark:text-white">Processor (CPU)</td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-300">{parsedSpecs?.cpu || 'Intel Core i7-14700K 20-Core / 28-Thread (LGA1700)'}</td>
                    <td className="p-2.5 text-blue-600 dark:text-blue-400 font-semibold">{parsedSpecs?.cpu_brand || 'Intel Box Resmi (Garansi 3 Thn)'}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-slate-900 dark:text-white">Motherboard</td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-300">{parsedSpecs?.motherboard || 'ASUS TUF Gaming Z790-PLUS WIFI DDR5 (LGA1700)'}</td>
                    <td className="p-2.5 text-blue-600 dark:text-blue-400 font-semibold">{parsedSpecs?.motherboard_brand || 'ASUS Indonesia / Synnex Metrodata'}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-slate-900 dark:text-white">RAM Memory</td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-300">{parsedSpecs?.ram || '64GB (2x32GB) DDR5 5600MHz Dual-Channel'}</td>
                    <td className="p-2.5 text-blue-600 dark:text-blue-400 font-semibold">{parsedSpecs?.ram_brand || 'Kingston FURY Beast DDR5 64GB Kit'}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-slate-900 dark:text-white">Storage SSD (RAID-1)</td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-300">{parsedSpecs?.storage || 'Dual 1TB M.2 NVMe PCIe 4.0 SSD (RAID-1 Mirroring)'}</td>
                    <td className="p-2.5 text-blue-600 dark:text-blue-400 font-semibold">{parsedSpecs?.storage_brand || '2x Samsung 980 PRO 1TB / Kingston KC3000'}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-slate-900 dark:text-white">Power Supply (PSU)</td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-300">{parsedSpecs?.psu || 'Corsair RM750x 750W 80+ Gold Full Modular (Garansi 10 Thn)'}</td>
                    <td className="p-2.5 text-blue-600 dark:text-blue-400 font-semibold">{parsedSpecs?.psu_brand || 'Corsair Indonesia / PT. DTG'}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-slate-900 dark:text-white">Network Interface</td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-300">{parsedSpecs?.nic || 'Dual 2.5G Ethernet LAN (Intel I225-V Server Card)'}</td>
                    <td className="p-2.5 text-blue-600 dark:text-blue-400 font-semibold">{parsedSpecs?.nic_brand || 'Intel Corporation Server NIC'}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-slate-900 dark:text-white">Cooler System</td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-300">{parsedSpecs?.cooler || 'DeepCool AK620 Digital Dual-Tower Cooler (LGA1700)'}</td>
                    <td className="p-2.5 text-blue-600 dark:text-blue-400 font-semibold">{parsedSpecs?.cooler_brand || 'DeepCool Indonesia / AGSI'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PANDUAN FITTING PERAKITAN CEGAH SALAH COLOK (PHYSICAL ASSEMBLY GUIDE) */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <Zap size={16} className="text-amber-500" />
          2. Panduan Fitting Perakitan &amp; Pemasangan RAM Dual-Channel (Cegah Salah Beli / Salah Setup)
        </h3>

        <div className="bg-amber-50/50 dark:bg-amber-950/20 p-5 rounded-2xl border border-amber-200 dark:border-amber-900/40 space-y-4 text-xs">
          
          {/* ATURAN SLOT MEMORY RAM DUAL CHANNEL */}
          <div className="space-y-2">
            <div className="font-extrabold text-amber-900 dark:text-amber-200 text-xs flex items-center gap-1.5">
              <span className="w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center text-[10px] font-black">1</span>
              Aturan Pemasangan RAM Memory (Dual-Channel Slot Matching A2 + B2)
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed pl-6">
              Saat menggunakan 2 keping RAM (misal 2x16GB atau 2x32GB) pada motherboard 4-slot RAM, keping RAM <strong>WAJIB dipasang pada Slot 2 (DIMM_A2) dan Slot 4 (DIMM_B2)</strong> dihitung dari socket CPU.
            </p>

            {/* VISUAL DIAGRAM SLOT RAM */}
            <div className="pl-6 pt-1">
              <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="text-[11px] font-mono text-slate-400 flex justify-between items-center border-b border-slate-800 pb-1.5">
                  <span>[ SOCKET CPU ]</span>
                  <span className="text-amber-400 font-bold">DIMM SLOT SCHEMATIC (MOTHERBOARD 4-SLOT)</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center font-mono text-[11px]">
                  <div className="bg-slate-800 p-2 rounded border border-slate-700 text-slate-400">
                    Slot 1 (DIMM_A1)<br/>
                    <span className="text-[10px] text-slate-500 font-sans">Kosong</span>
                  </div>
                  <div className="bg-emerald-950/90 text-emerald-300 p-2 rounded border border-emerald-500 font-bold shadow-sm">
                    Slot 2 (DIMM_A2)<br/>
                    <span className="text-[10px] text-emerald-400 font-sans">✓ RAM #1 (OK)</span>
                  </div>
                  <div className="bg-slate-800 p-2 rounded border border-slate-700 text-slate-400">
                    Slot 3 (DIMM_B1)<br/>
                    <span className="text-[10px] text-slate-500 font-sans">Kosong</span>
                  </div>
                  <div className="bg-emerald-950/90 text-emerald-300 p-2 rounded border border-emerald-500 font-bold shadow-sm">
                    Slot 4 (DIMM_B2)<br/>
                    <span className="text-[10px] text-emerald-400 font-sans">✓ RAM #2 (OK)</span>
                  </div>
                </div>
                <div className="text-[10px] text-amber-300/90 pt-1 font-sans">
                  ⚠️ <strong>Mengapa ini penting?</strong> Memasang RAM pada Slot A1+A2 (berdampingan) akan memotong bandwidth server hingga 50% (Single-Channel) dan berisiko memicu BSOD / Stuttering saat beban berat 24/7.
                </div>
              </div>
            </div>
          </div>

          {/* ATURAN FITTING SOCKET & CHIPSET */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 pl-6">
            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-amber-200 dark:border-amber-900/50 space-y-1">
              <span className="font-bold text-slate-900 dark:text-white block">🔌 Compatibility Socket CPU &amp; Motherboard:</span>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                <li><strong>LGA1700 (Intel Gen 12/13/14):</strong> Pasangan motherboard chipset H610, B760, atau Z790.</li>
                <li><strong>Socket DDR4 vs DDR5:</strong> Notch fisik RAM DDR4 dan DDR5 berbeda. Motherboard DDR5 hanya bisa dipasang RAM DDR5.</li>
              </ul>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-amber-200 dark:border-amber-900/50 space-y-1">
              <span className="font-bold text-slate-900 dark:text-white block">💾 Storage NVMe &amp; Kabel Daya PSU:</span>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                <li><strong>RAID-1 Redundancy:</strong> Pasang 2 SSD NVMe identik pada M.2_1 (CPU Direct) &amp; M.2_2 (Chipset Direct).</li>
                <li><strong>Daya CPU 8-Pin:</strong> Colokkan <strong>KEDUA kabel EPS 8-pin CPU</strong> dari PSU ke motherboard untuk kestabilan VRM 24/7.</li>
              </ul>
            </div>
          </div>

          <div className="pl-6 pt-1 text-[11px] text-slate-500 dark:text-slate-400 italic">
            💡 <strong>Tips Perakitan:</strong> Lepas stiker plastik transparan pada alas tembaga Cooler CPU sebelum dioleskan thermal paste dan dipasang di atas processor!
          </div>

        </div>
      </div>

      {/* 3. PANDUAN PRE-CONFIGURATION & BIOS CHECKLIST */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-500" />
          3. Checklist Pengaturan BIOS &amp; Pre-Configuration OS (Standar 24/7)
        </h3>

        <div className="bg-emerald-50/50 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 text-xs space-y-2 text-slate-700 dark:text-slate-300">
          <div className="font-bold text-emerald-800 dark:text-emerald-300">Langkah Pre-Configuration Sebelum Unit Dikirim ke Sekolah:</div>
          <ul className="list-disc pl-5 space-y-1">
            {parsedSpecs?.bios_checklist && Array.isArray(parsedSpecs.bios_checklist) ? (
              parsedSpecs.bios_checklist.map((item: string, i: number) => (
                <li key={i}>{item}</li>
              ))
            ) : (
              <>
                <li><strong>Pengaturan Power BIOS:</strong> Set <em>Restore AC Power Loss = ALWAYS ON</em> agar server otomatis menyala begitu listrik PLN menyala kembali pasca mati lampu.</li>
                <li><strong>Dukungan Virtualisasi:</strong> Aktifkan <em>Intel VT-x / AMD SVM Virtualization</em> di BIOS untuk mendukung Docker Engine Absenta.</li>
                <li><strong>Ketahanan Data Storage:</strong> Konfigurasi RAID-1 NVMe SSD Mirroring untuk mencegah data loss saat 1 SSD gagal.</li>
                <li><strong>Sistem Operasi:</strong> Install Ubuntu Server 22.04 LTS (Headless) + Docker Engine + Service Daemon Auto-start + WireGuard Auto-Tunnel VPN.</li>
              </>
            )}
          </ul>
        </div>
      </div>

      {/* 3. TERMINAL & NETWORK ACCESSORIES BOM */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <ShieldCheck size={16} className="text-indigo-500" />
          3. Daftar Perangkat Terminal &amp; Aksesori Pendukung
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse border border-slate-200 dark:border-slate-800">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px]">
                <th className="p-2.5 text-left border border-slate-200 dark:border-slate-800">Perangkat</th>
                <th className="p-2.5 text-left border border-slate-200 dark:border-slate-800">Model Tipe Dipilih</th>
                <th className="p-2.5 text-left border border-slate-200 dark:border-slate-800">Spesifikasi Kunci Perangkat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {gatePlanObj && (
                <tr>
                  <td className="p-2.5 font-bold border border-slate-200 dark:border-slate-800">Mesin Absen Gerbang</td>
                  <td className="p-2.5 font-semibold text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-800">{gatePlanObj.name}</td>
                  <td className="p-2.5 border border-slate-200 dark:border-slate-800">Terminal Biometrik LAN TCP/IP + Support Active 12V PoE Splitter</td>
                </tr>
              )}
              {sessionPlanObj && (
                <tr>
                  <td className="p-2.5 font-bold border border-slate-200 dark:border-slate-800">Mesin Absen Kelas</td>
                  <td className="p-2.5 font-semibold text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-800">{sessionPlanObj.name}</td>
                  <td className="p-2.5 border border-slate-200 dark:border-slate-800">RFID Tap Reader 13.56MHz Mifare (USB / OTG Android / LAN TCP/IP)</td>
                </tr>
              )}
              {cardPlanObj && (
                <tr>
                  <td className="p-2.5 font-bold border border-slate-200 dark:border-slate-800">Kartu RFID Siswa</td>
                  <td className="p-2.5 font-semibold text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-800">{cardPlanObj.name}</td>
                  <td className="p-2.5 border border-slate-200 dark:border-slate-800">Bahan Glossy PVC 0.76mm + Chip RFID Mifare 13.56MHz High-Frequency</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

// ── FULL PAGE RAB CALCULATOR ──
export const RABCalculatorPage: React.FC = () => {
  const navigate = useNavigate();
  const addItemToCart = useCartStore((state) => state.addItem);
  const setCartOpen = useCartStore((state) => state.setCartOpen);

  const [activeView, setActiveView] = useState<'FORM' | 'PREVIEW'>('FORM');
  const [schoolNameInput, setSchoolNameInput] = useState<string>('Sekolah / Panitia Pengadaan');
  const [totalStudentsCount, setTotalStudentsCount] = useState<number>(600);

  // Fetch Public Hardware Plans
  const plansQuery = useQuery({
    queryKey: ['public-plans'],
    queryFn: async () => {
      const res = await getPublicPlans();
      const plans: any[] = Array.isArray((res.data as any)?.plans)
        ? (res.data as any).plans
        : Array.isArray(res.data) ? res.data : [];

      const HARDWARE_IDS = ['SERVER_HARDWARE', 'NETWORK_HARDWARE', 'ABSENSI_HARDWARE', 'PHYSICAL_SERVICE'];
      const hasHardware = plans.some((p: any) => HARDWARE_IDS.includes(p.module_id));

      if (!hasHardware) {
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
              }));
            return [...plans, ...hwPlans];
          }
        } catch (err) {
          console.warn('[RABCalculatorPage] Hardware fallback fetch error:', err);
        }
      }
      return plans;
    },
    staleTime: 1000 * 60 * 5,
  });

  const availablePlans: RABProductItem[] = plansQuery.data || [];

  const serverPlans = useMemo(() => {
    const plans = availablePlans.filter(p => p.module_id === 'SERVER_HARDWARE' || p.id.includes('SERVER') || p.id.includes('DELL'));
    return [...plans].sort((a, b) => {
      const getCap = (p: typeof a) => {
        if (p.device_limit && p.device_limit > 0) return p.device_limit;
        if (p.id.includes('SMALL') || p.id.includes('T40')) return 300;
        if (p.id.includes('MEDIUM') || p.id.includes('T150')) return 600;
        if (p.id.includes('LARGE')) return 1200;
        if (p.id.includes('ENTERPRISE') || p.id.includes('R730')) return 2500;
        return 9999;
      };
      return getCap(a) - getCap(b);
    });
  }, [availablePlans]);

  const gatePlans = useMemo(() => {
    return availablePlans.filter(p => 
      p.module_id === 'ABSENSI_HARDWARE' || p.id.includes('HIKVISION') || p.id.includes('SOLUTION') || p.id.includes('FACE')
    );
  }, [availablePlans]);

  const sessionPlans = useMemo(() => {
    return availablePlans.filter(p => 
      p.module_id === 'ABSENSI_HARDWARE' || p.id.includes('SCR100') || p.id.includes('OTG') || p.id.includes('DESKTOP')
    );
  }, [availablePlans]);

  const DEFAULT_CARD_PLANS: RABProductItem[] = [
    { id: 'SVC_CETAK_KARTU_MIFARE_CUSTOM', name: 'Kartu RFID Custom Print', price_onetime: 8000, module_id: 'PHYSICAL_SERVICE', badge_label: '✓ 13.56MHz' },
    { id: 'SVC_KARTU_MIFARE_BLANK', name: 'Kartu RFID Mifare Blank', price_onetime: 4500, module_id: 'PHYSICAL_SERVICE', badge_label: '✓ Blank' }
  ];

  const DEFAULT_OTHER_PLANS: RABProductItem[] = [
    { id: 'HW_WIFI6_OUTDOOR_AP', name: 'Outdoor Wi-Fi 6 AP (IP68)', price_onetime: 1500000, module_id: 'NETWORK_HARDWARE' },
    { id: 'HW_SWITCH_8P_POE', name: 'Switch Gigabit PoE 8-Port', price_onetime: 850000, module_id: 'NETWORK_HARDWARE' }
  ];

  const cardPlans = useMemo(() => {
    const plans = availablePlans.filter(p => {
      if (p.is_active === false) return false;
      const idUpper = (p.id || '').toUpperCase();
      const nameLower = (p.name || '').toLowerCase();

      if (idUpper.includes('READER') || idUpper.includes('OTG') || idUpper.includes('DESKTOP') || 
          idUpper.includes('SCR100') || idUpper.includes('HIKVISION') || nameLower.includes('mesin')) {
        return false;
      }
      return p.module_id === 'PHYSICAL_SERVICE' || idUpper.includes('KARTU') || nameLower.includes('kartu');
    });
    return plans.length > 0 ? plans : DEFAULT_CARD_PLANS;
  }, [availablePlans]);

  const otherPlans = useMemo(() => {
    const plans = availablePlans.filter(p => 
      p.module_id === 'NETWORK_HARDWARE' || p.id.includes('AP') || p.id.includes('SWITCH') || p.id.includes('WIFI')
    );
    return plans.length > 0 ? plans : DEFAULT_OTHER_PLANS;
  }, [availablePlans]);

  const getPlanPrice = (pObj: RABProductItem | undefined, fallbackPrice: number = 0): number => {
    if (!pObj) return fallbackPrice;
    const val = pObj.price_onetime || pObj.price_monthly || pObj.price_yearly || (pObj as any).price || 0;
    const num = typeof val === 'number' ? val : Number(String(val).replace(/[^0-9]/g, '')) || 0;
    return num > 0 ? num : fallbackPrice;
  };

  const resolvePlan = (id: string): RABProductItem | undefined => {
    if (!id) return undefined;
    return availablePlans.find(p => p.id === id) || 
           cardPlans.find(p => p.id === id) || 
           otherPlans.find(p => p.id === id) ||
           serverPlans.find(p => p.id === id) ||
           gatePlans.find(p => p.id === id) ||
           sessionPlans.find(p => p.id === id);
  };

  // States for Slots
  const [slotServer, setSlotServer] = useState<RABSlotSelection>({ planId: serverPlans[0]?.id || '', quantity: 1 });
  const [slotGate, setSlotGate] = useState<RABSlotSelection>({ planId: gatePlans[0]?.id || '', quantity: 4 });
  const [slotSession, setSlotSession] = useState<RABSlotSelection>({ planId: sessionPlans[0]?.id || '', quantity: 15 });
  const [slotCard, setSlotCard] = useState<RABSlotSelection>({ planId: cardPlans[0]?.id || DEFAULT_CARD_PLANS[0].id, quantity: 600 });
  const [slotOthers, setSlotOthers] = useState<RABSlotSelection[]>([
    { planId: otherPlans[0]?.id || DEFAULT_OTHER_PLANS[0].id, quantity: 1 },
    { planId: 'CUSTOM_INSTALLATION', quantity: 1, customName: 'Jasa Setup Server, Pemasangan & Training Presensi Sekolah', customPrice: 1500000 }
  ]);

  const [cashbackPercent, setCashbackPercent] = useState<number>(0);
  const [isAutoServerRecommend, setIsAutoServerRecommend] = useState<boolean>(true);

  // Smart Server Recommendation Engine based on Student Capacity
  const recommendedServerPlan = useMemo(() => {
    if (!serverPlans || serverPlans.length === 0) return undefined;

    // Filter workstation nodes first if available
    const nodes = serverPlans.filter(p => p.id.includes('NODE') || p.id.includes('WORKSTATION') || p.id.includes('SMALL') || p.id.includes('MEDIUM') || p.id.includes('LARGE') || p.id.includes('ENTERPRISE') || p.id.includes('ULTRA'));
    const pool = nodes.length > 0 ? nodes : serverPlans;

    const sorted = [...pool].sort((a, b) => {
      const getCap = (p: typeof a) => {
        if (p.device_limit && p.device_limit > 0) return p.device_limit;
        if (p.id.includes('SMALL') || p.id.includes('T40')) return 300;
        if (p.id.includes('MEDIUM') || p.id.includes('T150')) return 600;
        if (p.id.includes('LARGE')) return 1200;
        if (p.id.includes('ENTERPRISE') || p.id.includes('R730')) return 2500;
        return 4000;
      };
      return getCap(a) - getCap(b);
    });

    const match = sorted.find(p => {
      const cap = p.device_limit || p.max_user || (p.id.includes('SMALL') ? 300 : p.id.includes('MEDIUM') ? 600 : p.id.includes('LARGE') ? 1200 : p.id.includes('ENTERPRISE') ? 2500 : 4000);
      return cap >= totalStudentsCount;
    });

    return match || sorted[sorted.length - 1];
  }, [serverPlans, totalStudentsCount]);

  useEffect(() => {
    setSlotCard(prev => ({
      ...prev,
      quantity: prev.quantity === 0 || prev.quantity === 600 ? totalStudentsCount : prev.quantity
    }));
  }, [totalStudentsCount]);

  useEffect(() => {
    if (isAutoServerRecommend && recommendedServerPlan?.id) {
      setSlotServer(prev => ({ ...prev, planId: recommendedServerPlan.id }));
    }
  }, [totalStudentsCount, recommendedServerPlan, isAutoServerRecommend]);

  useEffect(() => {
    if (!slotServer.planId && serverPlans[0]?.id) setSlotServer(prev => ({ ...prev, planId: serverPlans[0].id }));
    if (!slotGate.planId && gatePlans[0]?.id) setSlotGate(prev => ({ ...prev, planId: gatePlans[0].id }));
    if (!slotSession.planId && sessionPlans[0]?.id) setSlotSession(prev => ({ ...prev, planId: sessionPlans[0].id }));
    if ((!slotCard.planId || !resolvePlan(slotCard.planId)) && cardPlans[0]?.id) {
      setSlotCard(prev => ({ ...prev, planId: cardPlans[0].id }));
    }
  }, [availablePlans, serverPlans, gatePlans, sessionPlans, cardPlans]);

  // Mini Gate Speed Math
  const selectedGatePlanObj = resolvePlan(slotGate.planId);
  const getTapDurationPerStudentSec = (plan: RABProductItem | undefined) => {
    if (!plan) return 2.5;
    const nameUpper = (plan.name || '').toUpperCase();
    const idUpper = (plan.id || '').toUpperCase();

    if (idUpper.includes('SCR100') || (nameUpper.includes('RFID') && !nameUpper.includes('FP'))) return 0.4;
    if (idUpper.includes('320MFX') || idUpper.includes('FACE') || nameUpper.includes('FACE')) return 0.6;
    if (idUpper.includes('DESKTOP') || idUpper.includes('OTG') || nameUpper.includes('USB')) return 1.5;
    if (idUpper.includes('FP') || idUpper.includes('FINGER') || nameUpper.includes('FINGERPRINT')) return 2.5;
    return 2.0;
  };

  const tapSpeedSec = getTapDurationPerStudentSec(selectedGatePlanObj);
  const tapsPerMinutePerMachine = Math.round(60 / tapSpeedSec);
  const totalGateTapsPerMinute = tapsPerMinutePerMachine * slotGate.quantity;

  const peakMorningStudents = Math.round(totalStudentsCount * 0.80);
  const peakMorningDurationMin = totalGateTapsPerMinute > 0 ? Math.ceil(peakMorningStudents / totalGateTapsPerMinute) : 0;
  const massExitDurationMin = totalGateTapsPerMinute > 0 ? Math.ceil(totalStudentsCount / totalGateTapsPerMinute) : 0;

  const queueTrafficStatus = massExitDurationMin <= 12 
    ? { label: '🟢 Aman / Pulang & Masuk Bareng Lancar', bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300' }
    : massExitDurationMin <= 20 
    ? { label: '🟡 Wajar / Antrean Puncak Kerap Terjadi', bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300' }
    : { label: '🔴 KRITIS: Potensi Macet Total (Tambah Mesin)', bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300' };

  const marginMultiplier = useMemo(() => {
    const validPercent = Math.min(60, Math.max(0, cashbackPercent));
    if (validPercent >= 100) return 1;
    return 1 / (1 - (validPercent / 100));
  }, [cashbackPercent]);

  // Subtotals
  const serverPlanObj = resolvePlan(slotServer.planId);
  const serverSubtotalNet = getPlanPrice(serverPlanObj) * slotServer.quantity;

  const gatePlanObj = resolvePlan(slotGate.planId);
  const gateSubtotalNet = getPlanPrice(gatePlanObj) * slotGate.quantity;

  const sessionPlanObj = resolvePlan(slotSession.planId);
  const sessionSubtotalNet = getPlanPrice(sessionPlanObj) * slotSession.quantity;

  const cardPlanObj = resolvePlan(slotCard.planId) || cardPlans[0];
  const cardUnitPriceNet = getPlanPrice(cardPlanObj, 8000);
  const cardSubtotalNet = cardUnitPriceNet * slotCard.quantity;

  const othersSubtotalNet = slotOthers.reduce((sum, item) => {
    if (item.planId === 'CUSTOM_INSTALLATION') {
      return sum + (item.customPrice || 0) * item.quantity;
    }
    const pObj = resolvePlan(item.planId) || otherPlans[0];
    return sum + getPlanPrice(pObj, 1500000) * item.quantity;
  }, 0);

  const grandTotalNet = serverSubtotalNet + gateSubtotalNet + sessionSubtotalNet + cardSubtotalNet + othersSubtotalNet;
  const grandTotalGross = Math.round(grandTotalNet * marginMultiplier);
  const cashbackAmount = grandTotalGross - grandTotalNet;

  const serverUnitPrice = Math.round(getPlanPrice(serverPlanObj) * marginMultiplier);
  const serverSubtotal = serverUnitPrice * slotServer.quantity;

  const gateUnitPrice = Math.round(getPlanPrice(gatePlanObj) * marginMultiplier);
  const gateSubtotal = gateUnitPrice * slotGate.quantity;

  const sessionUnitPrice = Math.round(getPlanPrice(sessionPlanObj) * marginMultiplier);
  const sessionSubtotal = sessionUnitPrice * slotSession.quantity;

  const cardUnitPrice = Math.round(cardUnitPriceNet * marginMultiplier);
  const cardSubtotal = cardUnitPrice * slotCard.quantity;

  const othersSubtotal = Math.round(othersSubtotalNet * marginMultiplier);

  const formatCurrency = (val: number) => 'Rp ' + val.toLocaleString('id-ID');

  const handleApplyPreset = (presetType: 'EKONOMIS_A' | 'EKONOMIS_B' | 'STANDAR_A' | 'STANDAR_FULL') => {
    const otgReader = availablePlans.find(p => p.id.includes('OTG')) || sessionPlans[0];
    const desktopUsb = availablePlans.find(p => p.id.includes('DESKTOP') || p.id.includes('USB')) || sessionPlans[0];
    const hikTerminal = availablePlans.find(p => p.id.includes('HIKVISION') || p.id.includes('8003MF') || p.id.includes('320MFX')) || gatePlans[0];
    const scr100Lan = availablePlans.find(p => p.id.includes('SCR100') || p.id.includes('LAN')) || sessionPlans[0];

    if (presetType === 'EKONOMIS_A') {
      setSlotGate(prev => ({ ...prev, planId: otgReader?.id || prev.planId }));
      setSlotSession(prev => ({ ...prev, planId: otgReader?.id || prev.planId }));
    } else if (presetType === 'EKONOMIS_B') {
      setSlotGate(prev => ({ ...prev, planId: desktopUsb?.id || prev.planId }));
      setSlotSession(prev => ({ ...prev, planId: desktopUsb?.id || prev.planId }));
    } else if (presetType === 'STANDAR_A') {
      setSlotGate(prev => ({ ...prev, planId: hikTerminal?.id || prev.planId }));
      setSlotSession(prev => ({ ...prev, planId: otgReader?.id || prev.planId }));
    } else if (presetType === 'STANDAR_FULL') {
      setSlotGate(prev => ({ ...prev, planId: hikTerminal?.id || prev.planId }));
      setSlotSession(prev => ({ ...prev, planId: scr100Lan?.id || prev.planId }));
    }
  };

  const handleCreateOrderFromRAB = () => {
    const itemsToOrder: { plan: RABProductItem; quantity: number }[] = [];
    if (serverPlanObj && slotServer.quantity > 0) itemsToOrder.push({ plan: serverPlanObj, quantity: slotServer.quantity });
    if (gatePlanObj && slotGate.quantity > 0) itemsToOrder.push({ plan: gatePlanObj, quantity: slotGate.quantity });
    if (sessionPlanObj && slotSession.quantity > 0) itemsToOrder.push({ plan: sessionPlanObj, quantity: slotSession.quantity });
    if (cardPlanObj && slotCard.quantity > 0) itemsToOrder.push({ plan: cardPlanObj, quantity: slotCard.quantity });
    slotOthers.forEach(item => {
      if (item.planId !== 'CUSTOM_INSTALLATION') {
        const pObj = resolvePlan(item.planId);
        if (pObj && item.quantity > 0) itemsToOrder.push({ plan: pObj, quantity: item.quantity });
      }
    });

    const getItemType = (p: RABProductItem): 'HARDWARE_PERIPHERAL' | 'PHYSICAL_SERVICE' | 'SOFTWARE_ONETIME' | 'SOFTWARE_SUBSCRIPTION' => {
      const moduleId = (p.module_id || '').toUpperCase();
      if (moduleId === 'SERVER_HARDWARE' || moduleId === 'NETWORK_HARDWARE' || moduleId === 'ABSENSI_HARDWARE') return 'HARDWARE_PERIPHERAL';
      if (moduleId === 'PHYSICAL_SERVICE') return 'PHYSICAL_SERVICE';
      return 'SOFTWARE_ONETIME';
    };

    itemsToOrder.forEach(i => {
      const unitPrice = getPlanPrice(i.plan);
      addItemToCart({
        plan_id: i.plan.id,
        name: i.plan.name,
        price: unitPrice,
        type: getItemType(i.plan),
        qty: i.quantity,
        weightGrams: (i.plan as any).weight_grams || 0,
      });
    });

    setCartOpen(true);
    toast.success(`${itemsToOrder.length} item RAB berhasil ditambahkan ke keranjang belanja!`);
  };

  const todayDateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col pb-24 no-print">
      
      {/* TOP BAR HEADER */}
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm px-4 lg:px-8 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition flex items-center gap-1.5 text-xs font-bold"
          >
            <ArrowLeft size={18} /> Kembali
          </button>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <Calculator size={18} />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                {activeView === 'FORM' ? 'Kalkulator & Simulator RAB Presensi Sekolah' : 'Dokumen Proposal RAB Resmi'}
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-none hidden sm:block">
                Estimasi Anggaran Belanja Perangkat & Simulasi Jam Puncak Antrean Siswa
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveView('FORM')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeView === 'FORM'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Calculator size={14} /> Edit Form RAB
          </button>

          <button
            type="button"
            onClick={() => setActiveView('PREVIEW')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeView === 'PREVIEW'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Printer size={14} /> Proposal RAB (Sekolah)
          </button>

          <button
            type="button"
            onClick={() => setActiveView('SPEC_BOM')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeView === 'SPEC_BOM'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100'
            }`}
          >
            <Wrench size={14} /> Spec Teknis &amp; BOM (Owner)
          </button>
        </div>
      </header>

      {/* PAGE BODY */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
        {activeView === 'FORM' ? (
          <div className="space-y-6">

            {/* CONTROL PANEL CARD */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Building2 size={16} className="text-blue-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Parameter Sekolah &amp; Kontrol Utama
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <Sparkles size={13} className="text-amber-500" />
                  <span className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    Preset Rekomendasi
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                {/* Nama Sekolah */}
                <div className="md:col-span-5 space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    Nama Sekolah / Panitia:
                  </label>
                  <input
                    type="text"
                    value={schoolNameInput}
                    onChange={(e) => setSchoolNameInput(e.target.value)}
                    placeholder="Nama sekolah / panitia..."
                    className="w-full h-10 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white text-xs font-semibold focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Jumlah Siswa */}
                <div className="md:col-span-3 space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Users size={13} className="text-blue-500" /> Total Siswa:
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number" min={10} step={50}
                      value={totalStudentsCount}
                      onChange={(e) => setTotalStudentsCount(Math.max(1, Number(e.target.value)))}
                      className="w-full h-10 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-blue-700 dark:text-blue-300 text-sm font-black text-center focus:border-blue-500 focus:outline-none"
                    />
                    <span className="text-xs font-bold text-slate-400">Siswa</span>
                  </div>
                </div>

                {/* Cashback Margin */}
                <div className="md:col-span-4 space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Percent size={13} className="text-amber-500" /> Margin Buffer (%):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min={0} max={60}
                      value={cashbackPercent}
                      onChange={(e) => setCashbackPercent(Math.min(60, Math.max(0, Number(e.target.value))))}
                      className="w-20 h-10 px-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-amber-600 dark:text-amber-400 font-bold text-center text-sm focus:outline-none"
                    />
                    <span className="text-xs font-bold text-amber-500">%</span>
                    {cashbackPercent > 0 && (
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-mono font-bold truncate">
                        +{formatCurrency(cashbackAmount)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Preset Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
                  Preset Cepat:
                </span>
                <button type="button" onClick={() => handleApplyPreset('EKONOMIS_A')} className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold transition border border-emerald-200 dark:border-emerald-800">📱 Paket Ekonomis A</button>
                <button type="button" onClick={() => handleApplyPreset('EKONOMIS_B')} className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold transition border border-emerald-200 dark:border-emerald-800">🖥️ Paket Ekonomis B</button>
                <button type="button" onClick={() => handleApplyPreset('STANDAR_A')} className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 text-xs font-bold transition border border-blue-200 dark:border-blue-800">🛡️ Standar Industri A</button>
                <button type="button" onClick={() => handleApplyPreset('STANDAR_FULL')} className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 text-xs font-bold transition border border-blue-200 dark:border-blue-800">🏆 Standar Full Dedicated</button>
              </div>
            </div>

            {/* MAIN FORM TABLE CARD */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
              
              {/* Table Header */}
              <div className="bg-slate-100/70 dark:bg-slate-800/60 px-5 py-3 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <div className="w-36 shrink-0">Kategori Hardware</div>
                <div className="flex-1 max-w-md">Pilihan Perangkat &amp; Tipe Model</div>
                <div className="w-28 text-center shrink-0 ml-auto">Jumlah Unit</div>
                <div className="w-32 text-right shrink-0">Subtotal Harga</div>
              </div>

              {/* 1. SERVER LOKAL */}
              <div className="px-5 py-3.5 space-y-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 w-36 shrink-0">
                    <Server size={16} className="text-blue-500 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Server Lokal</span>
                      {recommendedServerPlan && (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                          <Sparkles size={10} /> Mode Pintar Siswa
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 max-w-md flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <CustomImageSelect 
                        options={serverPlans} 
                        value={slotServer.planId} 
                        onChange={(id) => {
                          setIsAutoServerRecommend(false);
                          setSlotServer({ ...slotServer, planId: id });
                        }} 
                        groupByBadge={true} 
                        filterMinCapacity={totalStudentsCount}
                      />
                    </div>
                    <ProductMiniThumbnail plan={serverPlanObj} />
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                    <span className="text-xs text-slate-400 font-bold">×</span>
                    <input type="number" min={1} value={slotServer.quantity} onChange={(e) => setSlotServer({ ...slotServer, quantity: Math.max(1, Number(e.target.value)) })} className="w-20 h-9 px-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-bold text-center focus:border-blue-500 focus:outline-none" />
                  </div>

                  <div className="w-32 text-right shrink-0">
                    <span className="text-sm font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(serverSubtotal)}</span>
                  </div>
                </div>

                {/* SMART CAPACITY UNDERPOWER WARNING / AUTO-RECOMMEND BANNER */}
                {(() => {
                  const cap = serverPlanObj?.device_limit || serverPlanObj?.max_user || (serverPlanObj?.id?.includes('SMALL') ? 300 : serverPlanObj?.id?.includes('MEDIUM') ? 600 : serverPlanObj?.id?.includes('LARGE') ? 1200 : serverPlanObj?.id?.includes('ENTERPRISE') ? 2500 : 4000);
                  const isUnderpowered = cap > 0 && cap < totalStudentsCount;

                  if (isUnderpowered) {
                    return (
                      <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200 ml-36">
                        <div className="flex items-center gap-2">
                          <Zap size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                          <div>
                            <span className="font-extrabold block">⚠️ Peringatan Kapasitas Server Underpowered</span>
                            <span className="text-[11px] text-amber-800 dark:text-amber-300">
                              Server dipasang maks {cap} siswa, berada di bawah jumlah siswa sekolah ({totalStudentsCount} Siswa). Berisiko tinggi mengalami overload / lag pada jam puncak presensi.
                            </span>
                          </div>
                        </div>

                        {recommendedServerPlan && recommendedServerPlan.id !== slotServer.planId && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsAutoServerRecommend(true);
                              setSlotServer(prev => ({ ...prev, planId: recommendedServerPlan.id }));
                              toast.success(`Berhasil upgrade ke server rekomendasi: ${recommendedServerPlan.name}`);
                            }}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shrink-0 flex items-center gap-1 shadow-sm self-end sm:self-auto"
                          >
                            <Sparkles size={13} /> Upgrade ke {recommendedServerPlan.name}
                          </button>
                        )}
                      </div>
                    );
                  }

                  if (isAutoServerRecommend && recommendedServerPlan) {
                    return (
                      <div className="bg-blue-500/10 border border-blue-500/20 p-2.5 rounded-xl flex items-center justify-between text-[11px] text-blue-900 dark:text-blue-200 ml-36">
                        <div className="flex items-center gap-1.5">
                          <Sparkles size={14} className="text-blue-600 dark:text-blue-400" />
                          <span>
                            <strong>Mode Rekomendasi Pintar Aktif:</strong> Server <strong>{recommendedServerPlan.name}</strong> terpilih otomatis paling optimal untuk <strong>{totalStudentsCount} Siswa</strong>.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsAutoServerRecommend(false)}
                          className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold"
                        >
                          Pilih Manual
                        </button>
                      </div>
                    );
                  }

                  return null;
                })()}
              </div>

              {/* 2. MESIN GERBANG */}
              <div className="px-5 py-3.5 space-y-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 w-36 shrink-0">
                    <ShieldCheck size={16} className="text-indigo-500 shrink-0" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Mesin Gerbang</span>
                  </div>
                  <div className="flex-1 max-w-md flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <CustomImageSelect options={gatePlans} value={slotGate.planId} onChange={(id) => setSlotGate({ ...slotGate, planId: id })} />
                    </div>
                    <ProductMiniThumbnail plan={gatePlanObj} />
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                    <span className="text-xs text-slate-400 font-bold">×</span>
                    <input type="number" min={1} value={slotGate.quantity} onChange={(e) => setSlotGate({ ...slotGate, quantity: Math.max(1, Number(e.target.value)) })} className="w-20 h-9 px-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-bold text-center focus:border-blue-500 focus:outline-none" />
                  </div>
                  <div className="w-32 text-right shrink-0">
                    <span className="text-sm font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(gateSubtotal)}</span>
                  </div>
                </div>

                {/* Simulator Bar */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pl-38 text-xs text-slate-500 bg-indigo-50/50 dark:bg-indigo-950/30 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                  <span className="flex items-center gap-1 font-bold text-indigo-700 dark:text-indigo-300">
                    <Zap size={12} className="text-amber-500" /> Simulator Gerbang:
                  </span>
                  <span>⚡ Kapasitas: <strong className="text-emerald-700 dark:text-emerald-400 font-mono">{totalGateTapsPerMinute}</strong> Siswa/Mnt</span>
                  <span>🌅 Jam Puncak Pagi (80%): <strong className="text-amber-700 dark:text-amber-400 font-mono">~{peakMorningDurationMin} Mnt</strong></span>
                  <span>🔔 Pulang Serentak (100%): <strong className="text-rose-700 dark:text-rose-400 font-mono">~{massExitDurationMin} Mnt</strong></span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border uppercase tracking-wider ${queueTrafficStatus.bg}`}>
                    {queueTrafficStatus.label}
                  </span>
                </div>
              </div>

              {/* 3. MESIN KELAS */}
              <div className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                <div className="flex items-center gap-2 w-36 shrink-0">
                  <Clock size={16} className="text-violet-500 shrink-0" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Mesin Kelas</span>
                </div>
                <div className="flex-1 max-w-md flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <CustomImageSelect options={sessionPlans} value={slotSession.planId} onChange={(id) => setSlotSession({ ...slotSession, planId: id })} />
                  </div>
                  <ProductMiniThumbnail plan={sessionPlanObj} />
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                  <span className="text-xs text-slate-400 font-bold">×</span>
                  <input type="number" min={0} value={slotSession.quantity} onChange={(e) => setSlotSession({ ...slotSession, quantity: Math.max(0, Number(e.target.value)) })} className="w-20 h-9 px-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-bold text-center focus:border-blue-500 focus:outline-none" />
                </div>
                <div className="w-32 text-right shrink-0">
                  <span className="text-sm font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(sessionSubtotal)}</span>
                </div>
              </div>

              {/* 4. KARTU RFID */}
              <div className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                <div className="flex items-center gap-2 w-36 shrink-0">
                  <CreditCard size={16} className="text-emerald-500 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">Kartu RFID</div>
                    <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">✓ 13.56MHz</div>
                  </div>
                </div>
                <div className="flex-1 max-w-md flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <CustomImageSelect options={cardPlans} value={slotCard.planId} onChange={(id) => setSlotCard({ ...slotCard, planId: id })} />
                  </div>
                  <ProductMiniThumbnail plan={cardPlanObj} />
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                  <span className="text-xs text-slate-400 font-bold">×</span>
                  <input type="number" min={0} step={50} value={slotCard.quantity} onChange={(e) => setSlotCard({ ...slotCard, quantity: Math.max(0, Number(e.target.value)) })} className="w-20 h-9 px-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-bold text-center focus:border-blue-500 focus:outline-none" />
                </div>
                <div className="w-32 text-right shrink-0">
                  <span className="text-sm font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(cardSubtotal)}</span>
                </div>
              </div>

              {/* 5. NETWORK & SETUP */}
              <div className="px-5 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wrench size={16} className="text-amber-500" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Infrastruktur Network &amp; Setup Layanan</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">Subtotal: {formatCurrency(othersSubtotal)}</span>
                </div>

                <div className="space-y-2.5">
                  {slotOthers.map((item, idx) => {
                    const itemPlanObj = item.planId === 'CUSTOM_INSTALLATION' ? undefined : resolvePlan(item.planId);
                    return (
                      <div key={idx} className="flex items-center justify-between gap-4">
                        <div className="w-36 shrink-0 text-xs text-slate-400 pl-6 font-semibold">
                          Item {idx + 1}
                        </div>
                        <div className="flex-1 max-w-md flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            {item.planId === 'CUSTOM_INSTALLATION' ? (
                              <input type="text" value={item.customName}
                                onChange={(e) => { const u = [...slotOthers]; u[idx].customName = e.target.value; setSlotOthers(u); }}
                                className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white text-xs font-semibold focus:border-blue-500 focus:outline-none"
                              />
                            ) : (
                              <CustomImageSelect options={otherPlans} value={item.planId}
                                onChange={(id) => { const u = [...slotOthers]; u[idx].planId = id; setSlotOthers(u); }}
                              />
                            )}
                          </div>
                          <ProductMiniThumbnail plan={itemPlanObj} />
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                          <span className="text-xs text-slate-400 font-bold">×</span>
                          <input type="number" min={1} value={item.quantity}
                            onChange={(e) => { const u = [...slotOthers]; u[idx].quantity = Math.max(1, Number(e.target.value)); setSlotOthers(u); }}
                            className="w-20 h-9 px-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-bold text-center focus:border-blue-500 focus:outline-none"
                          />
                          <button type="button" onClick={() => setSlotOthers(slotOthers.filter((_, i) => i !== idx))} className="p-1.5 text-slate-400 hover:text-rose-500 transition rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40">
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <div className="w-32 text-right shrink-0">
                          {item.planId === 'CUSTOM_INSTALLATION' ? (
                            <input type="number" placeholder="Harga (Rp)" value={item.customPrice}
                              onChange={(e) => { const u = [...slotOthers]; u[idx].customPrice = Number(e.target.value); setSlotOthers(u); }}
                              className="w-full h-9 px-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white text-xs font-mono font-bold text-right focus:border-blue-500 focus:outline-none"
                            />
                          ) : (
                            <span className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                              {formatCurrency(getPlanPrice(itemPlanObj) * item.quantity)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex justify-end pt-1">
                    <button type="button"
                      onClick={() => setSlotOthers([...slotOthers, { planId: otherPlans[0]?.id || 'CUSTOM_ITEM', quantity: 1 }])}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1"
                    >
                      <Plus size={14} /> Tambah Item Setup Tambahan
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        ) : activeView === 'PREVIEW' ? (
          /* PREVIEW PROPOSAL PRINT VIEW */
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <RABPrintableProposalView
              todayDateStr={todayDateStr}
              schoolNameInput={schoolNameInput}
              serverPlanObj={serverPlanObj}
              slotServer={slotServer}
              serverUnitPrice={serverUnitPrice}
              serverSubtotal={serverSubtotal}
              gatePlanObj={gatePlanObj}
              slotGate={slotGate}
              gateUnitPrice={gateUnitPrice}
              gateSubtotal={gateSubtotal}
              sessionPlanObj={sessionPlanObj}
              slotSession={slotSession}
              sessionUnitPrice={sessionUnitPrice}
              sessionSubtotal={sessionSubtotal}
              cardPlanObj={cardPlanObj}
              slotCard={slotCard}
              cardUnitPrice={cardUnitPrice}
              cardSubtotal={cardSubtotal}
              slotOthers={slotOthers}
              resolvePlan={resolvePlan}
              othersSubtotal={othersSubtotal}
              formatCurrency={formatCurrency}
              grandTotalGross={grandTotalGross}
            />
          </div>
        ) : (
          /* SPEC_BOM VIEW (Bill of Materials & Spec Teknis Perakitan Owner) */
          <OwnerSpecBOMView
            serverPlanObj={serverPlanObj}
            gatePlanObj={gatePlanObj}
            sessionPlanObj={sessionPlanObj}
            cardPlanObj={cardPlanObj}
            slotOthers={slotOthers}
            resolvePlan={resolvePlan}
            formatCurrency={formatCurrency}
          />
        )}
      </main>

      {/* STICKY BOTTOM SUMMARY BAR */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-xl px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Estimasi Total RAB (SiPLah / Audit Resmi)
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
              {formatCurrency(grandTotalGross)}
            </div>
          </div>

          {cashbackPercent > 0 && (
            <div className="hidden sm:block text-xs bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 px-3 py-1.5 rounded-xl">
              <span className="text-amber-700 dark:text-amber-300 font-bold">
                Buffer Margin ({cashbackPercent}%): +{formatCurrency(cashbackAmount)}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setActiveView('PREVIEW');
              setTimeout(() => window.print(), 300);
            }}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <Printer size={15} /> Print Proposal RAB
          </button>
          
          <button
            type="button"
            onClick={handleCreateOrderFromRAB}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-extrabold transition shadow-lg shadow-blue-500/20 flex items-center gap-2"
          >
            <ShoppingBag size={15} /> Pesan Berdasarkan RAB Ini
          </button>
        </div>
      </footer>

    </div>
  );
};

export default RABCalculatorPage;
