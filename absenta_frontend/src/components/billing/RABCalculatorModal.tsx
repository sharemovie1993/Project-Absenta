import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  X, 
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
  Package
} from 'lucide-react';
import { RABProductItem } from './UnifiedCatalog';

export interface RABCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  availablePlans: RABProductItem[];
  onApplyOrder?: (items: { plan: RABProductItem; quantity: number }[]) => void;
}

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

  // 1. Server Hardware -> Local server.png
  if (idUpper.includes('SERVER') || idUpper.includes('DELL') || idUpper.includes('R730') || idUpper.includes('T150') || nameUpper.includes('SERVER')) {
    return '/assets/modules/server.png';
  }

  // 2. Mesin Gerbang / Face Recognition Terminal
  if (idUpper.includes('320MFX') || idUpper.includes('FACE') || idUpper.includes('HIKVISION') || idUpper.includes('8003MF') || nameUpper.includes('FACE')) {
    return 'https://images.unsplash.com/photo-1563770660941-20978e870e26?w=120&auto=format&fit=crop&q=80';
  }

  // 3. Mesin Kelas / OTG Reader / USB Reader / SCR100
  if (idUpper.includes('OTG') || idUpper.includes('USB') || idUpper.includes('DESKTOP') || idUpper.includes('SCR100') || nameUpper.includes('OTG')) {
    return 'https://images.unsplash.com/photo-1616469829941-c7200edec809?w=120&auto=format&fit=crop&q=80';
  }

  // 4. Kartu RFID Custom Print / Mifare Blank
  if (idUpper.includes('KARTU') || idUpper.includes('MIFARE') || idUpper.includes('CARD') || nameUpper.includes('KARTU')) {
    return 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=120&auto=format&fit=crop&q=80';
  }

  // 5. Network Hardware / Wi-Fi 6 AP / Switch PoE
  if (idUpper.includes('WIFI') || idUpper.includes('AP') || idUpper.includes('SWITCH') || idUpper.includes('POE') || nameUpper.includes('WIFI')) {
    return 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=120&auto=format&fit=crop&q=80';
  }

  return '';
};

// ── MINI PRODUCT THUMBNAIL PREVIEW ──
const ProductMiniThumbnail: React.FC<{ plan: RABProductItem | undefined }> = ({ plan }) => {
  if (!plan) return <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0" />;

  const realImg = getProductRealImage(plan);

  return (
    <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center shadow-sm p-0.5" title={plan.name}>
      {realImg ? (
        <img src={realImg} alt={plan.name} className="w-full h-full object-contain" />
      ) : (
        <Package size={15} className="text-slate-400" />
      )}
    </div>
  );
};

// ── HARDWARE CONDITION BADGE RESOLVER ──
const getHardwareConditionBadge = (plan: RABProductItem | undefined): { label: string; bg: string } => {
  if (!plan) return { label: '', bg: '' };
  
  const idUpper = (plan.id || '').toUpperCase();
  const nameUpper = (plan.name || '').toUpperCase();

  if (idUpper.includes('R730') || nameUpper.includes('R730') || nameUpper.includes('REFURBISHED')) {
    return {
      label: '🔄 REFURBISHED GRADE A',
      bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800'
    };
  }

  return {
    label: '✨ BARU (BNIB)',
    bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
  };
};

// ── CUSTOM SLIM IMAGE SELECTOR FOR HARDWARE SLOTS ──
const CustomImageSelect: React.FC<{
  options: RABProductItem[];
  value: string;
  onChange: (id: string) => void;
  groupByBadge?: boolean;
}> = ({ options, value, onChange, groupByBadge = false }) => {
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
        className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-left flex items-center justify-between shadow-sm hover:border-blue-500 transition"
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
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded shrink-0 uppercase">
              {selectedOption.badge_label}
            </span>
          )}
        </div>
        <ChevronDown size={14} className="text-slate-400 shrink-0 ml-1" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 min-w-full sm:min-w-[460px] top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-40 max-h-80 overflow-y-auto p-1 divide-y divide-slate-100 dark:divide-slate-800">
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
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        onChange(opt.id);
                        setIsOpen(false);
                      }}
                      className={`w-full p-2.5 text-left flex items-center justify-between gap-3 rounded-xl transition ${
                        opt.id === value 
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden flex-1">
                        {optImg && (
                          <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 p-0.5 overflow-hidden flex items-center justify-center shadow-sm">
                            <img src={optImg} alt={opt.name} className="w-full h-full object-contain" />
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-slate-900 dark:text-white leading-snug truncate">
                            {opt.name}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
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

// ── SUB-COMPONENT: OFFICIAL PRINTABLE PROPOSAL RAB VIEW ──
export const RABPrintableProposalView: React.FC<{
  todayDateStr: string;
  schoolNameInput: string;
  serverPlanObj: RABProductItem | undefined;
  slotServer: RABSlotSelection;
  serverUnitPrice: number;
  serverSubtotal: number;
  gatePlanObj: RABProductItem | undefined;
  slotGate: RABSlotSelection;
  gateUnitPrice: number;
  gateSubtotal: number;
  sessionPlanObj: RABProductItem | undefined;
  slotSession: RABSlotSelection;
  sessionUnitPrice: number;
  sessionSubtotal: number;
  slotCard: RABSlotSelection;
  cardUnitPrice: number;
  cardSubtotal: number;
  slotOthers: RABSlotSelection[];
  resolvePlan: (id: string) => RABProductItem | undefined;
  marginMultiplier?: number;
  formatCurrency: (val: number) => string;
  grandTotalGross: number;
}> = ({
  todayDateStr,
  schoolNameInput,
  serverPlanObj,
  slotServer,
  serverUnitPrice,
  serverSubtotal,
  gatePlanObj,
  slotGate,
  gateUnitPrice,
  gateSubtotal,
  sessionPlanObj,
  slotSession,
  sessionUnitPrice,
  sessionSubtotal,
  slotCard,
  cardUnitPrice,
  cardSubtotal,
  slotOthers,
  resolvePlan,
  marginMultiplier,
  formatCurrency,
  grandTotalGross
}) => {
  return (
    <div className="p-8 md:p-12 overflow-y-auto flex-1 bg-white text-slate-900" id="printable-rab-document">
      {/* KOP SURAT PROPOSAL */}
      <div className="border-b-2 border-slate-900 pb-6 mb-6 flex justify-between items-start">
        <div>
          <div className="text-2xl font-black tracking-tighter text-blue-700 uppercase flex items-center gap-2">
            <ShieldCheck size={28} className="text-blue-600" /> ABSENTA DIGITAL SYSTEM
          </div>
          <div className="text-xs text-slate-500 font-bold tracking-widest uppercase mt-1">
            PT. Absenta Teknologi Indonesia — Digital School Infrastructure
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Jl. Raya Utama No. 87, Jakarta / Bandung — Email: partner@absenta.id — Web: https://absenta.id
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs font-mono font-bold text-slate-400">DOKUMEN PROPOSAL RESMI</div>
          <div className="text-sm font-mono font-black text-slate-900 mt-1">
            NO: RAB-ABS/{new Date().getFullYear()}/07/{Math.floor(1000 + Math.random() * 9000)}
          </div>
          <div className="text-xs text-slate-500 font-medium mt-1">Tanggal: {todayDateStr}</div>
        </div>
      </div>

      {/* TITLE & TARGET */}
      <div className="text-center my-6">
        <h1 className="text-xl font-black uppercase text-slate-900 tracking-tight">
          PROPOSAL RENCANA ANGGARAN BIAYA (RAB)
        </h1>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-1">
          PENGADAAN SISTEM ABSENSI DIGITAL & INFRASTRUKTUR SEKOLAH
        </h2>
        <div className="mt-3 inline-block bg-slate-100 px-4 py-1.5 rounded-full text-xs font-bold text-slate-800">
          Ditujukan Kepada: <span className="text-blue-700 font-black">{schoolNameInput}</span>
        </div>
      </div>

      {/* ITEM TABLE (OFFICIAL GROSS PRICES) */}
      <table className="w-full text-xs border-collapse border border-slate-300 my-6">
        <thead>
          <tr className="bg-slate-900 text-white uppercase text-[10px] font-black tracking-wider">
            <th className="border border-slate-900 p-2.5 text-center w-10">No</th>
            <th className="border border-slate-900 p-2.5 text-left">Komponen / Perangkat Hardware & Layanan</th>
            <th className="border border-slate-900 p-2.5 text-center w-16">Vol (Qty)</th>
            <th className="border border-slate-900 p-2.5 text-center w-20">Satuan</th>
            <th className="border border-slate-900 p-2.5 text-right w-32">Harga Satuan (Rp)</th>
            <th className="border border-slate-900 p-2.5 text-right w-36">Total Subtotal (Rp)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
          {serverPlanObj && slotServer.quantity > 0 && (
            <tr>
              <td className="border border-slate-300 p-2.5 text-center font-mono">1</td>
              <td className="border border-slate-300 p-2.5">
                <div className="font-bold text-slate-900">{serverPlanObj.name}</div>
                <div className="text-[10px] text-slate-500">Slot 1: Server Lokal Sekolah (Pre-configured Engine & WireGuard VPN)</div>
              </td>
              <td className="border border-slate-300 p-2.5 text-center font-bold">{slotServer.quantity}</td>
              <td className="border border-slate-300 p-2.5 text-center">Unit</td>
              <td className="border border-slate-300 p-2.5 text-right font-mono">{formatCurrency(serverUnitPrice)}</td>
              <td className="border border-slate-300 p-2.5 text-right font-mono font-bold">{formatCurrency(serverSubtotal)}</td>
            </tr>
          )}

          {gatePlanObj && slotGate.quantity > 0 && (
            <tr>
              <td className="border border-slate-300 p-2.5 text-center font-mono">2</td>
              <td className="border border-slate-300 p-2.5">
                <div className="font-bold text-slate-900">{gatePlanObj.name}</div>
                <div className="text-[10px] text-slate-500">Slot 2: Mesin Presensi Gerbang Utama (High-Throughput Sync)</div>
              </td>
              <td className="border border-slate-300 p-2.5 text-center font-bold">{slotGate.quantity}</td>
              <td className="border border-slate-300 p-2.5 text-center">Unit</td>
              <td className="border border-slate-300 p-2.5 text-right font-mono">{formatCurrency(gateUnitPrice)}</td>
              <td className="border border-slate-300 p-2.5 text-right font-mono font-bold">{formatCurrency(gateSubtotal)}</td>
            </tr>
          )}

          {sessionPlanObj && slotSession.quantity > 0 && (
            <tr>
              <td className="border border-slate-300 p-2.5 text-center font-mono">3</td>
              <td className="border border-slate-300 p-2.5">
                <div className="font-bold text-slate-900">{sessionPlanObj.name}</div>
                <div className="text-[10px] text-slate-500">Slot 3: Mesin Presensi Sesi / Pintu Ruang Kelas</div>
              </td>
              <td className="border border-slate-300 p-2.5 text-center font-bold">{slotSession.quantity}</td>
              <td className="border border-slate-300 p-2.5 text-center">Unit</td>
              <td className="border border-slate-300 p-2.5 text-right font-mono">{formatCurrency(sessionUnitPrice)}</td>
              <td className="border border-slate-300 p-2.5 text-right font-mono font-bold">{formatCurrency(sessionSubtotal)}</td>
            </tr>
          )}

          {slotCard.quantity > 0 && (
            <tr>
              <td className="border border-slate-300 p-2.5 text-center font-mono">4</td>
              <td className="border border-slate-300 p-2.5">
                <div className="font-bold text-slate-900">Cetak Kartu Pelajar PVC RFID Custom Design Sekolah</div>
                <div className="text-[10px] text-slate-500">Slot 4: Kartu PVC RFID Mifare 13.56MHz Full Color Logo & Data Siswa</div>
              </td>
              <td className="border border-slate-300 p-2.5 text-center font-bold">{slotCard.quantity}</td>
              <td className="border border-slate-300 p-2.5 text-center">Pcs</td>
              <td className="border border-slate-300 p-2.5 text-right font-mono">{formatCurrency(cardUnitPrice)}</td>
              <td className="border border-slate-300 p-2.5 text-right font-mono font-bold">{formatCurrency(cardSubtotal)}</td>
            </tr>
          )}

          {slotOthers.map((item, idx) => {
            let name = 'Jasa Setup & Infrastructure';
            let unitPrice = 0;
            let sub = 0;
            if (item.planId === 'CUSTOM_INSTALLATION') {
              name = item.customName || 'Jasa Setup Server, Pemasangan & Training Presensi Sekolah';
              unitPrice = Math.round((item.customPrice || 0) * marginMultiplier);
              sub = unitPrice * item.quantity;
            } else {
              const pObj = resolvePlan(item.planId);
              name = pObj?.name || 'Perangkat Jaringan Network';
              unitPrice = Math.round((pObj?.price_onetime || 0) * marginMultiplier);
              sub = unitPrice * item.quantity;
            }

            return (
              <tr key={idx}>
                <td className="border border-slate-300 p-2.5 text-center font-mono">{5 + idx}</td>
                <td className="border border-slate-300 p-2.5">
                  <div className="font-bold text-slate-900">{name}</div>
                  <div className="text-[10px] text-slate-500">Slot 5: Biaya Tambahan / Infrastruktur Network & Layanan</div>
                </td>
                <td className="border border-slate-300 p-2.5 text-center font-bold">{item.quantity}</td>
                <td className="border border-slate-300 p-2.5 text-center">Paket</td>
                <td className="border border-slate-300 p-2.5 text-right font-mono">{formatCurrency(unitPrice)}</td>
                <td className="border border-slate-300 p-2.5 text-right font-mono font-bold">{formatCurrency(sub)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-slate-100 text-slate-900 font-black">
            <td colSpan={5} className="border border-slate-300 p-3 text-right uppercase tracking-wider text-xs">
              TOTAL ESTIMASI ANGGARAN (RAB RESMI):
            </td>
            <td className="border border-slate-300 p-3 text-right font-mono text-sm text-blue-800">
              {formatCurrency(grandTotalGross)}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* TERBILANG & TERMASUK CATATAN */}
      <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl my-4 text-xs space-y-1">
        <div className="font-bold text-slate-700">Catatan & Garansi Pengadaan:</div>
        <ul className="list-disc pl-4 text-slate-600 space-y-0.5 text-[11px]">
          <li>Harga di atas sudah termasuk Aplikasi Absenta Core Platform & Pre-configured Server Node.</li>
          <li>Sudah termasuk Garansi Hardware 1 Tahun & Bantuan Teknis Pendampingan Sistem.</li>
          <li>Waktu pelaksanaan instalasi & pengujian sistem: 3 s/d 7 Hari Kerja sejak Surat Order diterbitkan.</li>
        </ul>
      </div>

      {/* SIGNATURE BLOCK */}
      <div className="grid grid-cols-2 gap-8 my-10 text-xs font-sans text-slate-900 pt-6">
        <div className="text-center space-y-16">
          <div>
            <div className="font-bold">Disetujui Oleh,</div>
            <div className="text-slate-500 text-[11px]">Kepala Sekolah / Panitia Pengadaan</div>
          </div>
          <div className="border-b border-slate-900 w-48 mx-auto font-bold uppercase pt-4">
            ( .................................................... )
          </div>
          <div className="text-[10px] text-slate-400 font-mono">NIP: ............................................</div>
        </div>

        <div className="text-center space-y-16">
          <div>
            <div className="font-bold">Diajukan Oleh,</div>
            <div className="text-slate-500 text-[11px]">Tim Konsultan Absenta Digital System</div>
          </div>
          <div className="border-b border-slate-900 w-48 mx-auto font-bold uppercase pt-4">
            ( PT. Absenta Teknologi Indonesia )
          </div>
          <div className="text-[10px] text-slate-400 font-mono">Stempel & Tanda Tangan Resmi</div>
        </div>
      </div>
    </div>
  );
};

// ── MAIN MODAL COMPONENT ──
export const RABCalculatorModal: React.FC<RABCalculatorModalProps> = ({
  isOpen,
  onClose,
  availablePlans = [],
  onApplyOrder
}) => {
  const [activeView, setActiveView] = useState<'FORM' | 'PREVIEW'>('FORM');
  const [schoolNameInput, setSchoolNameInput] = useState<string>('Sekolah / Panitia Pengadaan');
  const [totalStudentsCount, setTotalStudentsCount] = useState<number>(600);

  // Categorize catalog items
  const serverPlans = useMemo(() => {
    const plans = availablePlans.filter(p => p.module_id === 'SERVER_HARDWARE' || p.id.includes('SERVER') || p.id.includes('DELL'));
    return [...plans].sort((a, b) => {
      const getCap = (p: typeof a) => {
        if (p.device_limit && p.device_limit > 0) return p.device_limit;
        if (p.id.includes('SMALL') || p.id.includes('T40')) return 300;
        if (p.id.includes('MEDIUM') || p.id.includes('T150') && !p.id.includes('PRO')) return 600;
        if (p.id.includes('LARGE') || p.id.includes('T150_PRO')) return 1200;
        if (p.id.includes('ENTERPRISE') || p.id.includes('R730')) return 2500;
        if (p.id.includes('ULTRA') || p.id.includes('R750')) return 4000;
        return 9999;
      };
      const capA = getCap(a);
      const capB = getCap(b);
      if (capA !== capB) return capA - capB;
      return (a.price_onetime || 0) - (b.price_onetime || 0);
    });
  }, [availablePlans]);

  const gatePlans = useMemo(() => {
    return availablePlans.filter(p => 
      p.module_id === 'ABSENSI_HARDWARE' || 
      p.id.includes('HIKVISION') || 
      p.id.includes('SOLUTION') || 
      p.id.includes('ZKTECO') ||
      p.id.includes('FP') ||
      p.id.includes('FACE')
    );
  }, [availablePlans]);

  const sessionPlans = useMemo(() => {
    return availablePlans.filter(p => 
      p.module_id === 'ABSENSI_HARDWARE' || 
      p.id.includes('SCR100') || 
      p.id.includes('OTG') || 
      p.id.includes('DESKTOP') ||
      p.id.includes('RFID')
    );
  }, [availablePlans]);

  const DEFAULT_CARD_PLANS: RABProductItem[] = [
    {
      id: 'SVC_CETAK_KARTU_MIFARE_CUSTOM',
      name: 'Kartu RFID Custom Print',
      price_onetime: 8000,
      module_id: 'PHYSICAL_SERVICE',
      badge_label: '✓ 13.56MHz'
    },
    {
      id: 'SVC_KARTU_MIFARE_BLANK',
      name: 'Kartu RFID Mifare Blank',
      price_onetime: 4500,
      module_id: 'PHYSICAL_SERVICE',
      badge_label: '✓ Blank'
    }
  ];

  const DEFAULT_OTHER_PLANS: RABProductItem[] = [
    {
      id: 'HW_WIFI6_OUTDOOR_AP',
      name: 'Outdoor Wi-Fi 6 AP (IP68)',
      price_onetime: 1500000,
      module_id: 'NETWORK_HARDWARE'
    },
    {
      id: 'HW_SWITCH_8P_POE',
      name: 'Switch Gigabit PoE 8-Port',
      price_onetime: 850000,
      module_id: 'NETWORK_HARDWARE'
    }
  ];

  const cardPlans = useMemo(() => {
    const plans = availablePlans.filter(p => {
      if (p.is_active === false) return false;
      const idUpper = (p.id || '').toUpperCase();
      const nameLower = (p.name || '').toLowerCase();

      // Exclude hardware machines / readers / terminals
      if (idUpper.includes('READER') || idUpper.includes('OTG') || idUpper.includes('DESKTOP') || 
          idUpper.includes('SCR100') || idUpper.includes('HIKVISION') || idUpper.includes('ZKTECO') || idUpper.includes('HARDWARE') ||
          nameLower.includes('reader') || nameLower.includes('mesin') || nameLower.includes('terminal')) {
        return false;
      }

      return p.module_id === 'PHYSICAL_SERVICE' ||
             idUpper.includes('KARTU') || 
             idUpper.includes('MIFARE') ||
             nameLower.includes('kartu') ||
             nameLower.includes('cetak');
    });
    return plans.length > 0 ? plans : DEFAULT_CARD_PLANS;
  }, [availablePlans]);

  const otherPlans = useMemo(() => {
    const plans = availablePlans.filter(p => 
      p.module_id === 'NETWORK_HARDWARE' || 
      p.id.includes('AP') || 
      p.id.includes('SWITCH') || 
      p.id.includes('POE') ||
      p.id.includes('WIFI') ||
      (p.name && (p.name.toLowerCase().includes('wifi') || p.name.toLowerCase().includes('switch') || p.name.toLowerCase().includes('network')))
    );
    return plans.length > 0 ? plans : DEFAULT_OTHER_PLANS;
  }, [availablePlans]);

  // Helper to extract plan price robustly
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

  // States for 5 Slots
  const [slotServer, setSlotServer] = useState<RABSlotSelection>({
    planId: serverPlans[0]?.id || '',
    quantity: 1
  });

  const [slotGate, setSlotGate] = useState<RABSlotSelection>({
    planId: gatePlans[0]?.id || '',
    quantity: 4
  });

  const [slotSession, setSlotSession] = useState<RABSlotSelection>({
    planId: sessionPlans.find(p => p.id.includes('OTG'))?.id || sessionPlans[0]?.id || '',
    quantity: 15
  });

  const [slotCard, setSlotCard] = useState<RABSlotSelection>({
    planId: cardPlans[0]?.id || DEFAULT_CARD_PLANS[0].id,
    quantity: 600
  });

  const [slotOthers, setSlotOthers] = useState<RABSlotSelection[]>([
    {
      planId: otherPlans[0]?.id || DEFAULT_OTHER_PLANS[0].id,
      quantity: 1
    },
    {
      planId: 'CUSTOM_INSTALLATION',
      quantity: 1,
      customName: 'Jasa Setup Server, Pemasangan & Training Presensi Sekolah',
      customPrice: 1500000
    }
  ]);

  // Keep card quantity updated with student count by default if user hasn't explicitly customized it to 0
  React.useEffect(() => {
    setSlotCard(prev => ({
      ...prev,
      quantity: prev.quantity === 0 || prev.quantity === 600 ? totalStudentsCount : prev.quantity
    }));
  }, [totalStudentsCount]);

  // Ensure slots have valid planId when catalog loads
  React.useEffect(() => {
    if (!slotServer.planId && serverPlans[0]?.id) setSlotServer(prev => ({ ...prev, planId: serverPlans[0].id }));
    if (!slotGate.planId && gatePlans[0]?.id) setSlotGate(prev => ({ ...prev, planId: gatePlans[0].id }));
    if (!slotSession.planId && sessionPlans[0]?.id) setSlotSession(prev => ({ ...prev, planId: sessionPlans[0].id }));
    if ((!slotCard.planId || !resolvePlan(slotCard.planId)) && cardPlans[0]?.id) {
      setSlotCard(prev => ({ ...prev, planId: cardPlans[0].id }));
    }
    setSlotOthers(prev => prev.map(item => {
      if (item.planId === 'CUSTOM_INSTALLATION') return item;
      if (!item.planId || !resolvePlan(item.planId)) {
        return { ...item, planId: otherPlans[0]?.id || DEFAULT_OTHER_PLANS[0].id };
      }
      return item;
    }));
  }, [availablePlans, cardPlans, otherPlans]);

  // Mini Gate Speed Calculator Math (Worst-Case Peak Simulation)
  const selectedGatePlanObj = resolvePlan(slotGate.planId);

  const getTapDurationPerStudentSec = (plan: RABProductItem | undefined) => {
    if (!plan) return 2.5;

    const nameUpper = (plan.name || '').toUpperCase();
    const idUpper = (plan.id || '').toUpperCase();

    // 1. RFID Dedicated Reader (SCR100, etc) -> Sangat Cepat (0.4 Detik)
    if (idUpper.includes('SCR100') || (nameUpper.includes('RFID') && !nameUpper.includes('FINGER') && !nameUpper.includes('FP') && !nameUpper.includes('FACE'))) {
      return 0.4;
    }

    // 2. Face Recognition (DS-K1T320MFX, Face) -> Cepat (0.6 Detik)
    if (idUpper.includes('320MFX') || idUpper.includes('FACE') || nameUpper.includes('FACE')) {
      return 0.6;
    }

    // 3. Desktop USB / Mini OTG Reader -> Sedang (1.5 Detik)
    if (idUpper.includes('DESKTOP') || idUpper.includes('OTG') || nameUpper.includes('OTG') || nameUpper.includes('USB')) {
      return 1.5;
    }

    // 4. Sidik Jari (Fingerprint) -> Lambat (2.5 Detik - butuh presisi posisi jari & sering retry jika jari basah/kotor)
    if (idUpper.includes('FP') || idUpper.includes('FINGER') || nameUpper.includes('FINGERPRINT') || nameUpper.includes('SOLUTION') || nameUpper.includes('8003MF') || nameUpper.includes('K40')) {
      return 2.5;
    }

    return 2.0;
  };

  const tapSpeedSec = getTapDurationPerStudentSec(selectedGatePlanObj);
  const tapsPerMinutePerMachine = Math.round(60 / tapSpeedSec);
  const totalGateTapsPerMinute = tapsPerMinutePerMachine * slotGate.quantity;

  // Worst Case 1: Jam Puncak Pagi (80% Siswa menumpuk sekaligus di 15 menit puncak)
  const peakMorningStudents = Math.round(totalStudentsCount * 0.80);
  const peakMorningDurationMin = totalGateTapsPerMinute > 0 
    ? Math.ceil(peakMorningStudents / totalGateTapsPerMinute) 
    : 0;

  // Worst Case 2: Jam Pulang Serentak (100% Siswa keluar kelas bersamaan saat bel berbunyi)
  const massExitDurationMin = totalGateTapsPerMinute > 0 
    ? Math.ceil(totalStudentsCount / totalGateTapsPerMinute) 
    : 0;

  const queueTrafficStatus = massExitDurationMin <= 12 
    ? { label: '🟢 Aman / Pulang & Masuk Bareng Lancar', bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300' }
    : massExitDurationMin <= 20 
    ? { label: '🟡 Wajar / Antrean Puncak Kerap Terjadi', bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300' }
    : { label: '🔴 KRITIS: Potensi Macet Total (Tambah Mesin)', bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300' };

  // Cashback Margin Buffer State
  const [cashbackPercent, setCashbackPercent] = useState<number>(0);

  const marginMultiplier = useMemo(() => {
    const validPercent = Math.min(60, Math.max(0, cashbackPercent));
    if (validPercent >= 100) return 1;
    return 1 / (1 - (validPercent / 100));
  }, [cashbackPercent]);

  if (!isOpen) return null;

  // Subtotals (NET BASE)
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

  // Subtotals (GROSS FOR DISPLAY)
  const serverUnitPrice = Math.round(getPlanPrice(serverPlanObj) * marginMultiplier);
  const serverSubtotal = serverUnitPrice * slotServer.quantity;

  const gateUnitPrice = Math.round(getPlanPrice(gatePlanObj) * marginMultiplier);
  const gateSubtotal = gateUnitPrice * slotGate.quantity;

  const sessionUnitPrice = Math.round(getPlanPrice(sessionPlanObj) * marginMultiplier);
  const sessionSubtotal = sessionUnitPrice * slotSession.quantity;

  const cardUnitPrice = Math.round(cardUnitPriceNet * marginMultiplier);
  const cardSubtotal = cardUnitPrice * slotCard.quantity;

  const othersSubtotal = Math.round(othersSubtotalNet * marginMultiplier);

  const formatCurrency = (val: number) => {
    return 'Rp ' + val.toLocaleString('id-ID');
  };

  const handleApplyPreset = (presetType: 'EKONOMIS_A' | 'EKONOMIS_B' | 'STANDAR_A' | 'STANDAR_FULL') => {
    const otgReader = availablePlans.find(p => p.id.includes('OTG')) || sessionPlans[0];
    const desktopUsb = availablePlans.find(p => p.id.includes('DESKTOP') || p.id.includes('USB')) || sessionPlans[0];
    const hikTerminal = availablePlans.find(p => p.id.includes('HIKVISION') || p.id.includes('8003MF') || p.id.includes('320MFX')) || gatePlans[0];
    const scr100Lan = availablePlans.find(p => p.id.includes('SCR100') || p.id.includes('LAN')) || sessionPlans[0];

    if (presetType === 'EKONOMIS_A') {
      // Ekonomis A: Mesin Gerbang & Kelas Pakai Mini OTG RFID Reader
      setSlotGate(prev => ({ ...prev, planId: otgReader?.id || prev.planId }));
      setSlotSession(prev => ({ ...prev, planId: otgReader?.id || prev.planId }));
    } else if (presetType === 'EKONOMIS_B') {
      // Ekonomis B: Mesin Gerbang & Kelas Pakai Desktop USB RFID Reader
      setSlotGate(prev => ({ ...prev, planId: desktopUsb?.id || prev.planId }));
      setSlotSession(prev => ({ ...prev, planId: desktopUsb?.id || prev.planId }));
    } else if (presetType === 'STANDAR_A') {
      // Standar Industri A: Mesin Gerbang Terminal Dedicated + Mesin Kelas OTG
      setSlotGate(prev => ({ ...prev, planId: hikTerminal?.id || prev.planId }));
      setSlotSession(prev => ({ ...prev, planId: otgReader?.id || prev.planId }));
    } else if (presetType === 'STANDAR_FULL') {
      // Standar Full Industri: Mesin Gerbang Terminal Dedicated + Mesin Kelas Dedicated LAN
      setSlotGate(prev => ({ ...prev, planId: hikTerminal?.id || prev.planId }));
      setSlotSession(prev => ({ ...prev, planId: scr100Lan?.id || prev.planId }));
    }
  };

  const handlePrintRAB = () => {
    setActiveView('PREVIEW');
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const handleCreateOrderFromRAB = () => {
    if (!onApplyOrder) return;
    const itemsToOrder: { plan: RABProductItem; quantity: number }[] = [];

    if (serverPlanObj && slotServer.quantity > 0) {
      itemsToOrder.push({ plan: serverPlanObj, quantity: slotServer.quantity });
    }
    if (gatePlanObj && slotGate.quantity > 0) {
      itemsToOrder.push({ plan: gatePlanObj, quantity: slotGate.quantity });
    }
    if (sessionPlanObj && slotSession.quantity > 0) {
      itemsToOrder.push({ plan: sessionPlanObj, quantity: slotSession.quantity });
    }
    if (cardPlanObj && slotCard.quantity > 0) {
      itemsToOrder.push({ plan: cardPlanObj, quantity: slotCard.quantity });
    }
    slotOthers.forEach(item => {
      if (item.planId !== 'CUSTOM_INSTALLATION') {
        const otherPlanObj = resolvePlan(item.planId);
        if (otherPlanObj && item.quantity > 0) {
          itemsToOrder.push({ plan: otherPlanObj, quantity: item.quantity });
        }
      }
    });

    onApplyOrder(itemsToOrder);
    onClose();
  };

  const todayDateStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 text-left font-sans print:p-0 print:bg-white print:static print:inset-auto overflow-hidden">
        {/* CSS FOR PRINT ONLY */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-rab-document, #printable-rab-document * {
              visibility: visible;
            }
            #printable-rab-document {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0;
              padding: 1.5cm;
              background: white !important;
              color: black !important;
              box-shadow: none !important;
              border: none !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-2xl sm:rounded-2xl md:rounded-3xl w-full sm:max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl shadow-2xl overflow-hidden flex flex-col h-[92dvh] sm:h-auto sm:max-h-[92vh] md:max-h-[90vh] my-0 sm:my-auto transition-all duration-300 print:max-h-none print:rounded-none print:shadow-none print:border-none">
          
          {/* HEADER */}
          <div className="py-3 px-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 text-white flex justify-between items-center shrink-0 relative overflow-hidden no-print">
            <div className="flex items-center gap-2.5 relative z-10">
              <div className="w-8 h-8 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center text-white shadow-sm shrink-0">
                <Calculator size={18} />
              </div>
              <h2 className="text-sm md:text-base font-black tracking-tight text-white">
                {activeView === 'FORM' ? 'Kalkulator RAB Presensi Sekolah' : 'Dokumen Proposal RAB Resmi'}
              </h2>
            </div>

            <div className="flex items-center gap-2 relative z-10">
              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition border border-white/20"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* BODY */}
          {activeView === 'FORM' ? (
            <div className="overflow-y-auto flex-1 bg-white dark:bg-slate-900 no-print overscroll-contain divide-y divide-slate-100 dark:divide-slate-800">

              {/* ── INFO BAR: Sekolah · Siswa · Margin · Preset ── */}
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 w-32 shrink-0">
                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider whitespace-nowrap">Sekolah</label>
                  </div>
                  <div className="flex-1 max-w-md">
                    <input
                      type="text"
                      value={schoolNameInput}
                      onChange={(e) => setSchoolNameInput(e.target.value)}
                      placeholder="Nama sekolah / panitia..."
                      className="w-full h-7 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-white text-xs font-semibold focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-auto">
                    <div className="flex items-center gap-1.5">
                      <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider whitespace-nowrap">Siswa</label>
                      <input
                        type="number" min={10} step={50}
                        value={totalStudentsCount}
                        onChange={(e) => setTotalStudentsCount(Math.max(1, Number(e.target.value)))}
                        className="w-16 h-7 px-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-blue-700 dark:text-blue-300 text-xs font-black text-center focus:border-blue-500 focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-400">Org</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider whitespace-nowrap">Margin</label>
                      <input
                        type="number" min={0} max={60}
                        value={cashbackPercent}
                        onChange={(e) => setCashbackPercent(Math.min(60, Math.max(0, Number(e.target.value))))}
                        className="w-12 h-7 px-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-amber-600 dark:text-amber-400 font-bold text-center text-xs focus:outline-none"
                      />
                      <span className="text-[10px] font-bold text-amber-500">%</span>
                      {cashbackPercent > 0 && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-bold">
                          +{formatCurrency(cashbackAmount)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Preset Buttons integrated into Control Panel */}
                <div className="flex items-center gap-3 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex items-center gap-1.5 w-32 shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 whitespace-nowrap">
                      <Sparkles size={10} className="text-amber-500" /> Preset:
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 flex-1 max-w-md">
                    <button type="button" onClick={() => handleApplyPreset('EKONOMIS_A')} className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 transition whitespace-nowrap border border-emerald-200 dark:border-emerald-800">📱 Ekonomis A</button>
                    <button type="button" onClick={() => handleApplyPreset('EKONOMIS_B')} className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 transition whitespace-nowrap border border-emerald-200 dark:border-emerald-800">🖥️ Ekonomis B</button>
                    <button type="button" onClick={() => handleApplyPreset('STANDAR_A')} className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 transition whitespace-nowrap border border-blue-200 dark:border-blue-800">🛡️ Standar A</button>
                    <button type="button" onClick={() => handleApplyPreset('STANDAR_FULL')} className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 transition whitespace-nowrap border border-blue-200 dark:border-blue-800">🏆 Standar Full</button>
                  </div>
                </div>
              </div>

              {/* ── SERVER LOKAL ── */}
              <div className="flex items-center justify-between gap-3 px-4 py-2">
                <div className="flex items-center gap-1.5 w-32 shrink-0">
                  <Server size={13} className="text-blue-500 shrink-0" />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Server Lokal</span>
                </div>
                <div className="flex-1 max-w-md flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <CustomImageSelect options={serverPlans} value={slotServer.planId} onChange={(id) => setSlotServer({ ...slotServer, planId: id })} groupByBadge={true} />
                  </div>
                  <ProductMiniThumbnail plan={serverPlanObj} />
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-auto">
                  <span className="text-[10px] text-slate-400 font-medium">×</span>
                  <input type="number" min={1} value={slotServer.quantity} onChange={(e) => setSlotServer({ ...slotServer, quantity: Math.max(1, Number(e.target.value)) })} className="w-20 h-7 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-white text-xs font-bold text-center focus:border-blue-500 focus:outline-none" />
                </div>
                <div className="w-28 text-right shrink-0">
                  <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200">{formatCurrency(serverSubtotal)}</span>
                </div>
              </div>

              {/* ── MESIN GERBANG (dengan Estimasi terintegrasi di dalamnya) ── */}
              <div className="px-4 py-2 space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 w-32 shrink-0">
                    <ShieldCheck size={13} className="text-indigo-500 shrink-0" />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Mesin Gerbang</span>
                  </div>
                  <div className="flex-1 max-w-md flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <CustomImageSelect options={gatePlans} value={slotGate.planId} onChange={(id) => setSlotGate({ ...slotGate, planId: id })} />
                    </div>
                    <ProductMiniThumbnail plan={gatePlanObj} />
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-auto">
                    <span className="text-[10px] text-slate-400 font-medium">×</span>
                    <input type="number" min={1} value={slotGate.quantity} onChange={(e) => setSlotGate({ ...slotGate, quantity: Math.max(1, Number(e.target.value)) })} className="w-20 h-7 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-white text-xs font-bold text-center focus:border-blue-500 focus:outline-none" />
                  </div>
                  <div className="w-28 text-right shrink-0">
                    <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200">{formatCurrency(gateSubtotal)}</span>
                  </div>
                </div>

                {/* Sub-text Estimasi Gerbang */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-35 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1 font-medium text-slate-400">
                    <Zap size={10} className="text-amber-500" /> Estimasi:
                  </span>
                  <span>⚡ <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{totalGateTapsPerMinute}</strong> Siswa/Mnt</span>
                  <span>🌅 Pagi: <strong className="text-amber-600 dark:text-amber-400 font-mono">~{peakMorningDurationMin} Mnt</strong></span>
                  <span>🔔 Pulang: <strong className="text-rose-600 dark:text-rose-400 font-mono">~{massExitDurationMin} Mnt</strong></span>
                  <span className={`px-1.5 py-0.2 rounded text-[8px] font-extrabold border uppercase tracking-wider ${queueTrafficStatus.bg}`}>
                    {queueTrafficStatus.label}
                  </span>
                </div>
              </div>

              {/* ── MESIN KELAS ── */}
              <div className="flex items-center justify-between gap-3 px-4 py-2">
                <div className="flex items-center gap-1.5 w-32 shrink-0">
                  <Clock size={13} className="text-violet-500 shrink-0" />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Mesin Kelas</span>
                </div>
                <div className="flex-1 max-w-md flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <CustomImageSelect options={sessionPlans} value={slotSession.planId} onChange={(id) => setSlotSession({ ...slotSession, planId: id })} />
                  </div>
                  <ProductMiniThumbnail plan={sessionPlanObj} />
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-auto">
                  <span className="text-[10px] text-slate-400 font-medium">×</span>
                  <input type="number" min={0} value={slotSession.quantity} onChange={(e) => setSlotSession({ ...slotSession, quantity: Math.max(0, Number(e.target.value)) })} className="w-20 h-7 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-white text-xs font-bold text-center focus:border-blue-500 focus:outline-none" />
                </div>
                <div className="w-28 text-right shrink-0">
                  <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200">{formatCurrency(sessionSubtotal)}</span>
                </div>
              </div>

              {/* ── KARTU RFID ── */}
              <div className="flex items-center justify-between gap-3 px-4 py-2">
                <div className="flex items-center gap-1.5 w-32 shrink-0">
                  <CreditCard size={13} className="text-emerald-500 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-tight">Kartu RFID</div>
                    <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">✓ 13.56MHz</div>
                  </div>
                </div>
                <div className="flex-1 max-w-md flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <CustomImageSelect options={cardPlans} value={slotCard.planId} onChange={(id) => setSlotCard({ ...slotCard, planId: id })} />
                  </div>
                  <ProductMiniThumbnail plan={cardPlanObj} />
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-auto">
                  <span className="text-[10px] text-slate-400 font-medium">×</span>
                  <input type="number" min={0} step={50} value={slotCard.quantity} onChange={(e) => setSlotCard({ ...slotCard, quantity: Math.max(0, Number(e.target.value)) })} className="w-20 h-7 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-white text-xs font-bold text-center focus:border-blue-500 focus:outline-none" />
                </div>
                <div className="w-28 text-right shrink-0">
                  <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200">{formatCurrency(cardSubtotal)}</span>
                </div>
              </div>

              {/* ── NETWORK & SETUP ── */}
              <div className="px-4 py-2 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Wrench size={13} className="text-amber-500" />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Network &amp; Setup</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">Subtotal: {formatCurrency(othersSubtotal)}</span>
                </div>
                <div className="space-y-1.5">
                  {slotOthers.map((item, idx) => {
                    const itemPlanObj = item.planId === 'CUSTOM_INSTALLATION' 
                      ? undefined 
                      : resolvePlan(item.planId);

                    return (
                      <div key={idx} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5 w-32 shrink-0">
                          <span className="text-[10px] text-slate-400 pl-4">Item {idx + 1}</span>
                        </div>
                        <div className="flex-1 max-w-md flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            {item.planId === 'CUSTOM_INSTALLATION' ? (
                              <input type="text" value={item.customName}
                                onChange={(e) => { const u = [...slotOthers]; u[idx].customName = e.target.value; setSlotOthers(u); }}
                                className="w-full h-7 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-white text-xs font-semibold focus:border-blue-500 focus:outline-none"
                              />
                            ) : (
                              <CustomImageSelect options={otherPlans} value={item.planId}
                                onChange={(id) => { const u = [...slotOthers]; u[idx].planId = id; setSlotOthers(u); }}
                              />
                            )}
                          </div>
                          <ProductMiniThumbnail plan={itemPlanObj} />
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-auto">
                          <span className="text-[10px] text-slate-400 font-medium">×</span>
                          <input type="number" min={1} value={item.quantity}
                            onChange={(e) => { const u = [...slotOthers]; u[idx].quantity = Math.max(1, Number(e.target.value)); setSlotOthers(u); }}
                            className="w-20 h-7 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-white text-xs font-bold text-center focus:border-blue-500 focus:outline-none"
                          />
                          <button type="button" onClick={() => setSlotOthers(slotOthers.filter((_, i) => i !== idx))} className="p-1 text-slate-300 hover:text-rose-500 transition">
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <div className="w-28 text-right shrink-0">
                          {item.planId === 'CUSTOM_INSTALLATION' ? (
                            <input type="number" placeholder="Harga (Rp)" value={item.customPrice}
                              onChange={(e) => { const u = [...slotOthers]; u[idx].customPrice = Number(e.target.value); setSlotOthers(u); }}
                              className="w-full h-7 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-white text-xs font-mono font-bold text-right focus:border-blue-500 focus:outline-none"
                            />
                          ) : (
                            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200">
                              {formatCurrency(getPlanPrice(itemPlanObj) * item.quantity)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex justify-end pt-0.5">
                    <button type="button"
                      onClick={() => setSlotOthers([...slotOthers, { planId: otherPlans[0]?.id || 'CUSTOM_ITEM', quantity: 1 }])}
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1"
                    >
                      <Plus size={12} /> Tambah Item Setup
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
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
              slotCard={slotCard}
              cardUnitPrice={cardUnitPrice}
              cardSubtotal={cardSubtotal}
              slotOthers={slotOthers}
              resolvePlan={resolvePlan}
              marginMultiplier={marginMultiplier}
              formatCurrency={formatCurrency}
              grandTotalGross={grandTotalGross}
            />
          )}

          {/* FOOTER */}
          <div className="p-3 sm:p-4 sm:px-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 shrink-0 shadow-inner no-print">
            {/* Total Summary */}
            <div className="flex-1 min-w-0">
              <div className="text-[9px] text-slate-400 font-black uppercase tracking-[0.15em] mb-0.5">
                Estimasi Total RAB (SIPLaH / Audit):
              </div>
              <div className="text-lg sm:text-xl md:text-2xl font-black text-blue-600 dark:text-blue-400 font-mono tracking-tight flex flex-wrap items-baseline gap-2">
                {formatCurrency(grandTotalGross)}
                {cashbackPercent > 0 && (
                  <span className="text-[11px] font-bold text-amber-500 font-sans">
                    ({cashbackPercent}% Margin Buffer)
                  </span>
                )}
              </div>
              {cashbackPercent > 0 && (
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-slate-500 font-medium">
                  <span>Nett Vendor: <strong className="text-slate-700 dark:text-slate-300 font-mono">{formatCurrency(grandTotalNet)}</strong></span>
                  <span className="hidden sm:inline">•</span>
                  <span>Fee Cashback: <strong className="text-amber-600 dark:text-amber-400 font-mono">{formatCurrency(cashbackAmount)}</strong></span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handlePrintRAB}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-black text-[10px] sm:text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 shadow-sm transition whitespace-nowrap"
              >
                <Printer size={14} />
                <span className="hidden sm:inline">Cetak / Print Proposal RAB</span>
                <span className="sm:hidden">Cetak RAB</span>
              </button>
              {onApplyOrder && (
                <button
                  type="button"
                  onClick={handleCreateOrderFromRAB}
                  className="flex-1 sm:flex-none px-3 sm:px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-black text-[10px] sm:text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 hover:scale-[1.02] transition whitespace-nowrap"
                >
                  <ShoppingBag size={14} />
                  <span className="hidden sm:inline">Pesan Berdasarkan RAB Ini</span>
                  <span className="sm:hidden">Pesan RAB</span>
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
};
