import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Check, 
  X, 
  Crown, 
  Layers, 
  Users, 
  ShieldCheck, 
  ArrowRight, 
  Loader2,
  Table as TableIcon,
  LayoutGrid,
  ChevronRight,
  Info
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { getMySubscriptionMatrix, type PackageMatrixData } from '@/api/mySubscription.api';

interface PackageComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceId?: string | null;
  activePlanName?: string;
  activePlanVariant?: 'Micro' | 'Small' | 'Medium' | 'Large' | 'Enterprise';
  onUpgrade?: () => void;
}

const FALLBACK_MODULE_COLUMNS = [
  { id: 'ABSENSI', name: 'Absensi Multi-Sesi', shortDesc: 'Presensi RFID/QR/GPS' },
  { id: 'ACADEMIC', name: 'Akademik & Kurikulum', shortDesc: 'Jadwal, Rapor & Nilai' },
  { id: 'KESISWAAN', name: 'Kesiswaan & BP/BK', shortDesc: 'Poin & Konseling Siswa' },
  { id: 'SARPRAS', name: 'Sarpras & Aset', shortDesc: 'Inventaris & Peminjaman' },
  { id: 'HUBIN', name: 'Hubin & PKL', shortDesc: 'Kemitraan DUDI & Magang' },
  { id: 'KOPERASI', name: 'Koperasi Digital', shortDesc: 'POS Kasir & Tabungan' },
  { id: 'WHATSAPP', name: 'WhatsApp Gateway', shortDesc: 'Blast Notifikasi Wali' },
  { id: 'EASY_TUNNEL', name: 'Easy Tunnel VPN', shortDesc: 'Akses Server Tanpa IP Publik' }
];

export const PackageComparisonModal: React.FC<PackageComparisonModalProps> = ({
  isOpen,
  onClose,
  serviceId,
  activePlanName = 'Paket Layanan',
  activePlanVariant = 'Enterprise',
  onUpgrade
}) => {
  const [mobileTab, setMobileTab] = useState<'Micro' | 'Small' | 'Medium' | 'Large' | 'Enterprise'>(activePlanVariant);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const { data: matrixResponse, isLoading } = useQuery({
    queryKey: ['my-subscription-matrix', serviceId],
    queryFn: async () => {
      const res = await getMySubscriptionMatrix(serviceId || undefined);
      return res.data;
    },
    enabled: isOpen,
    staleTime: 60 * 1000
  });

  const matrixData = matrixResponse as PackageMatrixData | undefined;

  const currentVariant = matrixData?.context?.variant || activePlanVariant;
  const currentPlanName = matrixData?.context?.plan_name || activePlanName;
  const isMasterPackage = matrixData?.context?.is_master_package ?? (
    currentPlanName.toUpperCase().includes('PAKET LENGKAP') || 
    currentPlanName.toUpperCase().includes('ALL-IN-ONE')
  );
  const columns = matrixData?.columns || FALLBACK_MODULE_COLUMNS;
  const tiers = matrixData?.tiers || [];

  // Sinkronkan tab mobile awal ke varian aktif tenant jika data termuat
  React.useEffect(() => {
    if (matrixData?.context?.variant) {
      setMobileTab(matrixData.context.variant);
    }
  }, [matrixData?.context?.variant]);

  const selectedMobileRow = useMemo(() => {
    return tiers.find(t => t.tier.toLowerCase() === mobileTab.toLowerCase()) || tiers[0];
  }, [tiers, mobileTab]);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      size="6xl"
      className="w-full max-w-[95vw] md:max-w-5xl lg:max-w-6xl mx-auto"
      title={
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
            <Layers size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight truncate">
              Matriks &amp; Komparasi Varian Paket
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5 line-clamp-1">
              Evaluasi hak akses modul aplikasi yang dihitung secara dinamis dari backend lisensi.
            </p>
          </div>
        </div>
      }
    >
      <div className="p-3 sm:p-6 pt-1 sm:pt-2 space-y-4 sm:space-y-6 text-left">
        {/* ACTIVE STATUS BANNER */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-blue-500/10 to-transparent border border-indigo-200 dark:border-indigo-900/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs shrink-0 mt-0.5 sm:mt-0">
              <Crown size={18} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Status Langganan Anda Saat Ini
              </span>
              <div className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap mt-0.5">
                <span className="truncate">{currentPlanName}</span>
                <Badge variant="primary" className="bg-indigo-600 text-white text-[10px] px-2 py-0.2 shrink-0">
                  Varian {currentVariant}
                </Badge>
                {isMasterPackage ? (
                  <span className="text-[9.5px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800 shrink-0">
                    All-in-One Bundle (Semua Modul)
                  </span>
                ) : (
                  <span className="text-[9.5px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 shrink-0">
                    Modul Satuan Terlisensi
                  </span>
                )}
                {matrixData?.context?.end_date && (
                  <span className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400">
                    • Aktif s/d {new Date(matrixData.context.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {currentVariant !== 'Enterprise' && onUpgrade && (
            <Button
              type="button"
              variant="toolbarPrimary"
              size="sm"
              onClick={() => {
                onClose();
                onUpgrade();
              }}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-xs shrink-0 h-9"
            >
              <span>Upgrade ke Enterprise</span>
              <ArrowRight size={13} />
            </Button>
          )}
        </div>

        {/* LOADING STATE */}
        {isLoading && (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 size={24} className="animate-spin text-indigo-600" />
            <span className="text-xs font-semibold">Menghitung matriks lisensi tenant dari server...</span>
          </div>
        )}

        {/* CONTROLS: MOBILE VIEW SWITCHER */}
        {!isLoading && tiers.length > 0 && (
          <div className="flex sm:hidden items-center justify-between gap-2 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                viewMode === 'table' 
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <TableIcon size={13} />
              <span>Tabel Matriks</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                viewMode === 'cards' 
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutGrid size={13} />
              <span>Detail Kartu</span>
            </button>
          </div>
        )}

        {/* MOBILE CARD VIEW (< SM) */}
        {!isLoading && tiers.length > 0 && viewMode === 'cards' && (
          <div className="block sm:hidden space-y-3">
            {/* TIER TABS SELECTOR */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {tiers.map((t) => {
                const isSelected = t.tier.toLowerCase() === mobileTab.toLowerCase();
                const isTenantActive = t.is_current_tier;

                return (
                  <button
                    key={t.tier}
                    type="button"
                    onClick={() => setMobileTab(t.tier)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap border transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : isTenantActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span>{t.tier}</span>
                    {isTenantActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* SELECTED TIER CARD */}
            {selectedMobileRow && (
              <div className={`p-4 rounded-2xl border transition-all ${
                selectedMobileRow.is_current_tier 
                  ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-800 shadow-xs' 
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-black text-slate-900 dark:text-white">
                        Varian {selectedMobileRow.tier}
                      </h4>
                      {selectedMobileRow.badge && (
                        <span className="px-1.5 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded text-[8px] font-black uppercase">
                          {selectedMobileRow.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {selectedMobileRow.description}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Kapasitas</span>
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                      {selectedMobileRow.capacity}
                    </span>
                  </div>
                </div>

                {selectedMobileRow.is_current_tier && (
                  <div className="my-2.5 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    <ShieldCheck size={14} className="shrink-0" />
                    <span>Paket Aktif Anda Saat Ini</span>
                  </div>
                )}

                {/* MODULE CHECKLIST FOR MOBILE */}
                <div className="space-y-2 mt-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Cakupan Akses Modul:
                  </span>
                  <div className="grid grid-cols-1 gap-1.5">
                    {columns.map((col) => {
                      const modStatus = selectedMobileRow.modules[col.id];
                      const statusCode = modStatus?.status_code || 'NOT_INCLUDED';
                      const isActive = statusCode === 'ACTIVE' || statusCode === 'CROSS_ACTIVE';

                      return (
                        <div 
                          key={col.id}
                          className={`p-2 rounded-xl flex items-center justify-between text-xs border ${
                            isActive
                              ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 font-semibold'
                              : statusCode === 'AVAILABLE_IN_BUNDLE'
                              ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                              : 'bg-transparent border-dashed border-slate-200 dark:border-slate-800 text-slate-400'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {statusCode === 'ACTIVE' ? (
                              <span className="p-1 rounded-md bg-emerald-500 text-white shrink-0">
                                <Check size={11} strokeWidth={3} />
                              </span>
                            ) : statusCode === 'CROSS_ACTIVE' ? (
                              <span className="p-1 rounded-md bg-cyan-500 text-white shrink-0">
                                <Check size={11} strokeWidth={2.5} />
                              </span>
                            ) : statusCode === 'AVAILABLE_IN_BUNDLE' ? (
                              <span className="p-1 rounded-md bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 shrink-0">
                                <Check size={11} strokeWidth={2} />
                              </span>
                            ) : (
                              <span className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-400 shrink-0">
                                <X size={11} strokeWidth={2} />
                              </span>
                            )}
                            <div className="min-w-0">
                              <span className="font-bold block truncate">{col.name}</span>
                              <span className="text-[10px] text-slate-400 font-normal block truncate">{col.shortDesc}</span>
                            </div>
                          </div>

                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                            statusCode === 'ACTIVE'
                              ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-900/40'
                              : statusCode === 'CROSS_ACTIVE'
                              ? 'text-cyan-700 dark:text-cyan-300 bg-cyan-100/60 dark:bg-cyan-900/40'
                              : statusCode === 'AVAILABLE_IN_BUNDLE'
                              ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950'
                              : 'text-slate-400'
                          }`}>
                            {statusCode === 'ACTIVE' ? 'Aktif' : statusCode === 'CROSS_ACTIVE' ? 'Lisensi Lain' : statusCode === 'AVAILABLE_IN_BUNDLE' ? 'Tersedia' : 'Tidak Ada'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* FULL MATRIX TABLE (DESKTOP OR MOBILE TABLE VIEW) */}
        {!isLoading && tiers.length > 0 && (viewMode === 'table' || typeof window !== 'undefined') && (
          <div className={`${viewMode === 'cards' ? 'hidden sm:block' : 'block'} space-y-1.5`}>
            {/* MOBILE SWIPE HINT */}
            <div className="flex sm:hidden items-center justify-between text-[11px] text-slate-400 px-1 font-semibold">
              <span>Geser tabel untuk melihat semua modul</span>
              <span className="text-indigo-500 animate-pulse">Geser ↔</span>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs bg-white dark:bg-slate-900">
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
                <table className="w-full text-left border-collapse min-w-[850px] lg:min-w-[960px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-850/90 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {/* STICKY FIRST COLUMN FOR RESPONSIVENESS */}
                      <th className="sticky left-0 bg-slate-50 dark:bg-slate-850 z-20 p-3.5 pl-4 w-40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] border-r border-slate-200/60 dark:border-slate-800">
                        Varian Tier
                      </th>
                      <th className="p-3.5 w-32 border-r border-slate-100 dark:border-slate-800">
                        Kapasitas
                      </th>
                      {columns.map((col, idx) => (
                        <th key={col.id || idx} className="p-3 text-center min-w-[105px] border-r border-slate-100 dark:border-slate-800 last:border-r-0" title={col.shortDesc}>
                          <span className="block leading-tight font-extrabold text-slate-800 dark:text-slate-200">{col.name}</span>
                          <span className="text-[9.5px] font-medium text-slate-400 lowercase hidden md:block mt-0.5">
                            {col.shortDesc}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300">
                    {tiers.map((row) => {
                      const isCurrentTier = row.is_current_tier;

                      return (
                        <tr 
                          key={row.tier}
                          className={`transition-colors ${
                            isCurrentTier 
                              ? 'bg-indigo-50/70 dark:bg-indigo-950/30 font-semibold text-slate-900 dark:text-white' 
                              : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                          }`}
                        >
                          {/* STICKY TIER NAME COLUMN */}
                          <td className={`sticky left-0 z-10 p-3.5 pl-4 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] border-r border-slate-200/60 dark:border-slate-800 ${
                            isCurrentTier ? 'bg-indigo-50 dark:bg-slate-850' : 'bg-white dark:bg-slate-900'
                          }`}>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`font-black text-sm ${isCurrentTier ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}`}>
                                {row.tier}
                              </span>
                              {row.badge && (
                                <span className="px-1.5 py-0.2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded text-[8px] font-black uppercase">
                                  {row.badge}
                                </span>
                              )}
                              {isCurrentTier && (
                                <span className="w-full text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1 mt-0.5">
                                  <ShieldCheck size={11} />
                                  Paket Aktif
                                </span>
                              )}
                            </div>
                          </td>

                          {/* CAPACITY */}
                          <td className="p-3.5 border-r border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-1 text-[11px] font-bold">
                              <Users size={12} className={isCurrentTier ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
                              <span>{row.capacity}</span>
                            </div>
                          </td>

                          {/* MODULE STATUS CELLS */}
                          {columns.map((col) => {
                            const modStatus = row.modules[col.id];
                            const statusCode = modStatus?.status_code || 'NOT_INCLUDED';

                            return (
                              <td key={col.id} className="p-3 text-center border-r border-slate-100 dark:border-slate-800 last:border-r-0">
                                {statusCode === 'ACTIVE' ? (
                                  <div className="inline-flex items-center justify-center" title={modStatus?.tooltip || "Aktif pada langganan Anda"}>
                                    <span className="p-1 rounded-lg bg-emerald-500 text-white shadow-xs">
                                      <Check size={13} strokeWidth={3} />
                                    </span>
                                  </div>
                                ) : statusCode === 'CROSS_ACTIVE' ? (
                                  <div className="inline-flex items-center justify-center" title={modStatus?.tooltip || "Aktif via lisensi terpisah Anda"}>
                                    <span className="p-1 rounded-lg bg-cyan-500 text-white shadow-xs">
                                      <Check size={13} strokeWidth={2.5} />
                                    </span>
                                  </div>
                                ) : statusCode === 'AVAILABLE_IN_BUNDLE' ? (
                                  <div className="inline-flex items-center justify-center" title={modStatus?.tooltip || "Tersedia jika berlangganan Paket Lengkap"}>
                                    <span className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-500 dark:text-indigo-400">
                                      <Check size={13} strokeWidth={2} />
                                    </span>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center justify-center text-slate-300 dark:text-slate-600" title="Tidak termasuk">
                                    <X size={13} strokeWidth={2} />
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* FOOTER & LEGEND */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="p-0.5 rounded bg-emerald-500 text-white">
                <Check size={9} strokeWidth={3} />
              </span>
              <span>Aktif di Paket Ini</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="p-0.5 rounded bg-cyan-500 text-white">
                <Check size={9} strokeWidth={2.5} />
              </span>
              <span>Aktif via Lisensi Lain</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="p-0.5 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
                <Check size={9} strokeWidth={2} />
              </span>
              <span>Tersedia di Paket Lengkap</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <X size={11} className="text-slate-400" />
              <span>Tidak Termasuk</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="w-full sm:w-auto rounded-xl px-5 text-xs font-semibold h-9"
          >
            Tutup
          </Button>
        </div>
      </div>
    </Modal>
  );
};
