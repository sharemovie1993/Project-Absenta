import React, { useMemo } from 'react';
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
  Package,
  Building2,
  BookOpen,
  Briefcase,
  Wallet,
  MessageSquare
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

// Fallback jika API sedang loading / offline
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
  const isMasterPackage = matrixData?.context?.is_master_package ?? (currentPlanName.toUpperCase().includes('PAKET LENGKAP') || currentPlanName.toUpperCase().includes('ALL-IN-ONE'));
  const columns = matrixData?.columns || FALLBACK_MODULE_COLUMNS;
  const tiers = matrixData?.tiers || [];

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      size="4xl" 
      title={
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Layers size={20} />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-black text-slate-900 dark:text-white leading-tight">
              Matriks &amp; Komparasi Varian Paket
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
              Evaluasi hak akses modul aplikasi yang dihitung secara dinamis oleh backend server.
            </p>
          </div>
        </div>
      }
    >
      <div className="p-6 pt-2 space-y-6 text-left">
        {/* ACTIVE STATUS BANNER */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-blue-500/10 to-transparent border border-indigo-200 dark:border-indigo-900/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
              <Crown size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Status Langganan Anda Saat Ini
              </span>
              <div className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                <span>{currentPlanName}</span>
                <Badge variant="primary" className="bg-indigo-600 text-white text-[10px] px-2 py-0.2">
                  Varian {currentVariant}
                </Badge>
                {isMasterPackage ? (
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                    Bundling All-in-One (Semua Modul Aktif)
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                    Modul Satuan (Hanya Modul Terkait yang Aktif)
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
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-xs"
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

        {/* COMPARISON TABLE */}
        {!isLoading && tiers.length > 0 && (
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="p-3.5 pl-4 w-36">Varian Tier</th>
                    <th className="p-3.5 w-32">Kapasitas</th>
                    {columns.map((col, idx) => (
                      <th key={col.id || idx} className="p-3 text-center min-w-[95px]" title={col.shortDesc}>
                        <span className="block leading-tight">{col.name}</span>
                        <span className="text-[9px] font-normal text-slate-400 lowercase hidden sm:block mt-0.5">
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
                            ? 'bg-indigo-50/70 dark:bg-indigo-950/30 font-semibold text-slate-900 dark:text-white relative' 
                            : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
                        }`}
                      >
                        {/* TIER NAME */}
                        <td className="p-3.5 pl-4">
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
                                Paket Aktif Anda
                              </span>
                            )}
                          </div>
                        </td>

                        {/* CAPACITY */}
                        <td className="p-3.5">
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
                            <td key={col.id} className="p-3 text-center">
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
        )}

        {/* FOOTER & LEGEND */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="p-0.5 rounded bg-emerald-500 text-white">
                <Check size={10} strokeWidth={3} />
              </span>
              <span>Aktif pada Paket Ini</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="p-0.5 rounded bg-cyan-500 text-white">
                <Check size={10} strokeWidth={2.5} />
              </span>
              <span>Aktif via Lisensi Lain</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="p-0.5 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
                <Check size={10} strokeWidth={2} />
              </span>
              <span>Tercakup di Paket Lengkap</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <X size={12} className="text-slate-400" />
              <span>Tidak Termasuk</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-xl px-4 text-xs font-semibold"
          >
            Tutup
          </Button>
        </div>
      </div>
    </Modal>
  );
};
