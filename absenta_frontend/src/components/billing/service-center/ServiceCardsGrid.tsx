import React from 'react';
import { 
  Sparkles, 
  Layers, 
  Settings, 
  ShieldCheck, 
  History, 
  Key, 
  Copy, 
  Check 
} from 'lucide-react';
import { Card, Button, Badge } from '@/components/ui';
import { formatCurrency, getServiceIcon } from '@/lib/billingUtils';
import { formatDate } from '@/utils/layoutUtils';

export interface ServiceSubscriptionItem {
  id: string;
  status: 'ACTIVE' | 'TRIAL' | 'EXPIRED' | 'CANCELLED' | 'UPGRADE_PENDING';
  start_date: string;
  end_date: string;
  auto_renew: boolean;
  plan_id: string;
  plan_name: string;
  service_code?: string;
  Plan?: {
    name: string;
    service_code?: string;
    price_monthly: number;
    price_yearly: number;
    max_user?: number;
    features_json?: string[];
    Module?: {
      name: string;
      description?: string;
      icon?: string;
    };
  };
  plan_snapshot?: {
    name: string;
    service_code?: string;
    price_monthly: number;
    price_yearly: number;
    features_json?: string[];
  };
  license_key?: string | null;
}

export interface ConsolidatedServiceGroup {
  moduleKey: string;
  latest: ServiceSubscriptionItem;
  history: ServiceSubscriptionItem[];
  mainTitle: string;
  variantName: string;
  isMasterPackage: boolean;
  isPermanent: boolean;
}

interface ServiceCardsGridProps {
  consolidatedServices: ConsolidatedServiceGroup[];
  onExtend: (planId: string) => void;
  onOpenComparison: (title: string, variant: string, svcId?: string) => void;
  onChangePlan: (svc: ServiceSubscriptionItem, group: ConsolidatedServiceGroup) => void;
  onOpenAutoRenew: (serviceId: string) => void;
  onOpenHistory: (title: string, current: ServiceSubscriptionItem, history: ServiceSubscriptionItem[]) => void;
  copiedKey: string | null;
  onCopyKey: (key: string, e?: React.MouseEvent) => void;
}

export const ServiceCardsGrid: React.FC<ServiceCardsGridProps> = ({
  consolidatedServices,
  onExtend,
  onOpenComparison,
  onChangePlan,
  onOpenAutoRenew,
  onOpenHistory,
  copiedKey,
  onCopyKey
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4 w-full max-w-full min-w-0">
      {(consolidatedServices ?? [])?.map((group, sIdx: number) => {
        const svc = group.latest;
        const sCode = String(svc.service_code || svc.plan_snapshot?.service_code || svc.Plan?.service_code || '').toUpperCase();
        const IconComp = getServiceIcon(sCode || svc.Plan?.service_code || svc.plan_snapshot?.service_code);
        const price = svc.Plan?.price_monthly || svc.plan_snapshot?.price_monthly || 0;
        const maxUser = svc.Plan?.max_user;
        const features = svc.Plan?.features_json || svc.plan_snapshot?.features_json || [];
        const daysLeft = Math.ceil((new Date(svc.end_date).getTime() - Date.now()) / (1000 * 3600 * 24));
        const isExpired = !group.isPermanent && daysLeft <= 0;
        const hasHistory = group.history.length > 0;

        return (
          <Card 
            key={svc.id || `group-${sIdx}`}
            className="p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 w-full min-w-0"
          >
            {/* Accent Top Bar */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${group.isMasterPackage ? 'bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400' : group.isPermanent ? 'bg-slate-300 dark:bg-slate-700' : 'bg-blue-600'}`} />

            <div className="space-y-2.5 pt-0.5 w-full min-w-0">
              {/* Card Header: Bebas Truncate */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div className={`w-9 h-9 rounded-xl ${group.isMasterPackage ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-xs' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 border border-blue-100/80 dark:border-blue-800/80'} flex items-center justify-center shrink-0 mt-0.5`}>
                    <IconComp size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug line-clamp-2" title={group.mainTitle}>
                      {group.mainTitle}
                    </h4>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-black bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/70">
                        Varian {group.variantName}
                      </span>
                      {group.isPermanent && (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          Bawaan Platform
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant={['ACTIVE', 'TRIAL', 'UPGRADE_PENDING'].includes(svc.status) ? 'success' : 'warning'} className="text-[7.5px] font-black uppercase px-1.5 py-0.2">
                    {svc.status}
                  </Badge>
                  {group.isMasterPackage && (
                    <span className="text-[7.5px] font-black px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 uppercase">
                      ALL-IN-ONE
                    </span>
                  )}
                </div>
              </div>

              {/* Clean Structured Metrics Box */}
              <div className="p-2.5 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs w-full">
                {/* Row 1: Masa Aktif */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Masa Aktif</span>
                  <div className="text-right">
                    <span className="font-extrabold text-slate-900 dark:text-white text-[11px]">
                      {group.isPermanent ? 'Permanen' : formatDate(svc.end_date)}
                    </span>
                    <span className={`text-[9.5px] font-bold ml-1.5 ${
                      group.isPermanent ? 'text-emerald-600 dark:text-emerald-400' : isExpired ? 'text-rose-500' : daysLeft <= 14 ? 'text-amber-500' : 'text-slate-500'
                    }`}>
                      {group.isPermanent ? '(Seumur Hidup)' : `(${daysLeft} Hari)`}
                    </span>
                  </div>
                </div>

                {/* Row 2: Kapasitas & Biaya */}
                <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">Kuota:</span>
                    <span className="font-bold text-slate-900 dark:text-white truncate">
                      {maxUser ? `${maxUser.toLocaleString('id-ID')} Siswa` : 'Unlimited'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">Biaya:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {price > 0 ? formatCurrency(price) : 'Gratis'}
                    </span>
                  </div>
                </div>

                {/* Row 3: Kode Lisensi Tenant (jika tersedia) */}
                {svc.license_key && (
                  <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
                    <div className="flex items-center gap-1 min-w-0">
                      <Key size={11} className="text-amber-500 shrink-0" />
                      <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">Lisensi:</span>
                      <span className="font-mono text-[10.5px] font-bold text-slate-800 dark:text-slate-200 truncate" title={svc.license_key}>
                        {svc.license_key}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => onCopyKey(svc.license_key!, e)}
                      className="p-1 rounded-md hover:bg-slate-200/70 dark:hover:bg-slate-700/70 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shrink-0 flex items-center gap-1 text-[9.5px] font-semibold"
                      title="Salin kode lisensi ke clipboard"
                    >
                      {copiedKey === svc.license_key ? (
                        <>
                          <Check size={11} className="text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy size={11} />
                          <span>Salin</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Features / Module chips atau info bawaan platform */}
              {Array.isArray(features) && features.length > 0 && group.isMasterPackage ? (
                <div className="flex items-center gap-1 text-[9.5px] flex-wrap pt-0.5 min-h-[22px]">
                  <span className="font-bold text-slate-400">Cakupan:</span>
                  {(features.filter((f: string) => !String(f).toUpperCase().includes('CORE')).slice(0, 3) ?? [])?.map((feat: string, fIdx: number) => (
                    <span key={fIdx} className="font-medium px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded">
                      {String(feat).replace(/_/g, ' ')}
                    </span>
                  ))}
                  {features.filter((f: string) => !String(f).toUpperCase().includes('CORE')).length > 3 && (
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      +{features.filter((f: string) => !String(f).toUpperCase().includes('CORE')).length - 3} modul
                    </span>
                  )}
                </div>
              ) : group.isPermanent ? (
                <div className="flex items-center gap-1.5 text-[9.5px] text-slate-400 dark:text-slate-500 pt-0.5 min-h-[22px]">
                  <ShieldCheck size={12} className="text-emerald-500 shrink-0" />
                  <span>Termasuk dalam lisensi dasar platform institusi.</span>
                </div>
              ) : (
                <div className="min-h-[22px]" />
              )}

              {/* History indicator jika ada riwayat perpanjangan */}
              {hasHistory && (
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => onOpenHistory(group.mainTitle, svc, group.history)}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline transition-colors"
                    title="Lihat riwayat siklus terdahulu"
                  >
                    <History size={11} />
                    <span>Siklus ke-{group.history.length + 1} (Lihat Riwayat)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Action Buttons: Rapi, Lega & Bebas Meluber */}
            <div className="flex items-center gap-1.5 pt-2.5 mt-2.5 border-t border-slate-100 dark:border-slate-800 w-full">
              {!group.isPermanent ? (
                <Button
                  type="button"
                  variant="toolbarPrimary"
                  size="sm"
                  aria-label="Perpanjang Masa Aktif"
                  onClick={() => onExtend(svc.plan_id || svc.id)}
                  className="flex-1 rounded-xl font-bold text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Sparkles size={12} />
                  <span>Perpanjang</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled
                  className="flex-1 rounded-xl font-bold text-xs h-8 bg-slate-50 dark:bg-slate-800/50 text-slate-400 border-slate-200 dark:border-slate-700 cursor-default"
                >
                  <span>Lisensi Aktif</span>
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label="Detail Paket & Komparasi"
                onClick={() => onOpenComparison(group.mainTitle, group.variantName, svc.id)}
                className="rounded-xl font-bold text-xs h-8 px-3 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 shrink-0 flex items-center gap-1.5"
                title="Lihat Detail Paket & Komparasi Varian"
              >
                <Layers size={12} />
                <span>Detail</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label="Ganti Paket"
                onClick={() => onChangePlan(svc, group)}
                className="rounded-xl font-bold text-xs h-8 px-2.5 border-slate-200 dark:border-slate-700 shrink-0 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                title="Ganti atau Upgrade Paket"
              >
                Ganti
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label="Pengaturan Tagihan"
                onClick={() => onOpenAutoRenew(svc.id)}
                className="rounded-xl font-bold text-xs h-8 w-8 p-0 flex items-center justify-center border-slate-200 dark:border-slate-700 shrink-0 text-slate-500 hover:text-slate-800"
                title="Pengaturan Tagihan & Auto-Renew"
              >
                <Settings size={13} />
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
export default ServiceCardsGrid;
