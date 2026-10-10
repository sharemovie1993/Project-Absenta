import React from 'react';
import { 
  Check, 
  X, 
  Sparkles, 
  Crown, 
  Layers, 
  Users, 
  ShieldCheck,
  Zap,
  ArrowRight
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface PackageComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePlanName?: string;
  activePlanVariant?: 'Micro' | 'Small' | 'Medium' | 'Large' | 'Enterprise';
  onUpgrade?: () => void;
}

interface TierFeature {
  name: string;
  shortDesc: string;
}

const MODULE_COLUMNS: TierFeature[] = [
  { name: 'Absensi Multi-Sesi', shortDesc: 'Presensi RFID/QR/GPS' },
  { name: 'Akademik & Kurikulum', shortDesc: 'Jadwal, Rapor & Nilai' },
  { name: 'Kesiswaan & BP/BK', shortDesc: 'Poin Pelanggaran & Konseling' },
  { name: 'Sarpras & Aset', shortDesc: 'Inventaris & Peminjaman' },
  { name: 'Hubin & PKL', shortDesc: 'Kemitraan DUDI & Jurnal' },
  { name: 'Koperasi Digital', shortDesc: 'POS Kasir & Tabungan' },
  { name: 'WhatsApp Gateway', shortDesc: 'Blast Notifikasi Wali' },
  { name: 'Easy Tunnel VPN', shortDesc: 'Akses Server Tanpa IP Publik' }
];

interface TierRow {
  tier: 'Micro' | 'Small' | 'Medium' | 'Large' | 'Enterprise';
  capacity: string;
  badge?: string;
  description: string;
  modules: boolean[]; // Sesuai index MODULE_COLUMNS
}

const TIERS_DATA: TierRow[] = [
  {
    tier: 'Micro',
    capacity: '100 Pengguna',
    description: 'Cocok untuk rintisan atau pilot project',
    modules: [true, true, true, false, false, false, false, false]
  },
  {
    tier: 'Small',
    capacity: '300 Pengguna',
    description: 'Cocok untuk sekolah jenjang kecil - menengah',
    modules: [true, true, true, true, false, false, false, false]
  },
  {
    tier: 'Medium',
    capacity: '600 Pengguna',
    description: 'Solusi lengkap dengan notifikasi WhatsApp',
    modules: [true, true, true, true, true, false, true, false]
  },
  {
    tier: 'Large',
    capacity: '1.200 Pengguna',
    description: 'Institusi besar dengan integrasi jaringan mandiri',
    modules: [true, true, true, true, true, true, true, true]
  },
  {
    tier: 'Enterprise',
    capacity: 'Unlimited Pengguna',
    badge: 'ALL-IN-ONE',
    description: 'Fitur tanpa batas dan prioritas performa penuh',
    modules: [true, true, true, true, true, true, true, true]
  }
];

export const PackageComparisonModal: React.FC<PackageComparisonModalProps> = ({
  isOpen,
  onClose,
  activePlanName = 'Paket Lengkap',
  activePlanVariant = 'Enterprise',
  onUpgrade
}) => {
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
              Perbandingan cakupan modul aplikasi berdasarkan tingkatan tier lisensi.
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
                <span>{activePlanName}</span>
                <Badge variant="primary" className="bg-indigo-600 text-white text-[10px] px-2 py-0.2">
                  Varian {activePlanVariant}
                </Badge>
              </div>
            </div>
          </div>

          {activePlanVariant !== 'Enterprise' && onUpgrade && (
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

        {/* COMPARISON TABLE */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="p-3.5 pl-4 w-36">Varian Tier</th>
                  <th className="p-3.5 w-32">Kapasitas</th>
                  {MODULE_COLUMNS.map((col, idx) => (
                    <th key={idx} className="p-3 text-center min-w-[90px]" title={col.shortDesc}>
                      <span className="block">{col.name}</span>
                      <span className="text-[9px] font-normal text-slate-400 lowercase hidden sm:block">
                        {col.shortDesc}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300">
                {TIERS_DATA.map((row) => {
                  const isCurrentTier = row.tier.toLowerCase() === activePlanVariant.toLowerCase();

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

                      {/* MODULE CHECKMARKS */}
                      {row.modules.map((isIncluded, mIdx) => (
                        <td key={mIdx} className="p-3 text-center">
                          {isIncluded ? (
                            <div className="inline-flex items-center justify-center">
                              {isCurrentTier ? (
                                <span className="p-1 rounded-lg bg-emerald-500 text-white shadow-xs" title="Tercakup &amp; Aktif pada paket Anda">
                                  <Check size={13} strokeWidth={3} />
                                </span>
                              ) : (
                                <span className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400" title="Tercakup pada varian ini">
                                  <Check size={13} strokeWidth={2.5} />
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="inline-flex items-center justify-center text-slate-300 dark:text-slate-600">
                              <X size={13} strokeWidth={2} />
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* FOOTER & LEGEND */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="p-0.5 rounded bg-emerald-500 text-white">
                <Check size={10} strokeWidth={3} />
              </span>
              <span>Aktif pada Paket Anda</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="p-0.5 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
                <Check size={10} strokeWidth={2.5} />
              </span>
              <span>Tercakup pada Varian</span>
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
