import React from 'react';
import { 
  History, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  User, 
  ArrowUpRight,
  Sparkles,
  Key,
  Copy,
  Check
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '../../utils/layoutUtils';
import { formatCurrency } from '@/lib/billingUtils';
import type { SubscriptionItem } from './ServiceCenterPage';

interface SubscriptionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceTitle: string;
  currentSubscription?: SubscriptionItem | null;
  historyItems: SubscriptionItem[];
}

export const SubscriptionHistoryModal: React.FC<SubscriptionHistoryModalProps> = ({
  isOpen,
  onClose,
  serviceTitle,
  currentSubscription,
  historyItems = []
}) => {
  // Gabungkan langganan saat ini dan riwayat terdahulu dalam 1 urutan timeline
  const allCycles = React.useMemo(() => {
    const list: { item: SubscriptionItem; isCurrent: boolean }[] = [];
    if (currentSubscription) {
      list.push({ item: currentSubscription, isCurrent: true });
    }
    historyItems.forEach(h => {
      // Pastikan bukan id yang sama persis dengan current
      if (h.id !== currentSubscription?.id) {
        list.push({ item: h, isCurrent: false });
      }
    });

    return list.sort((a, b) => 
      new Date(b.item.end_date || 0).getTime() - new Date(a.item.end_date || 0).getTime()
    );
  }, [currentSubscription, historyItems]);

  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  const handleCopyKey = React.useCallback((key: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    toast.success('Kode lisensi disalin ke clipboard!');
    setTimeout(() => setCopiedKey(null), 2500);
  }, []);

  // Ambil primary license key jika ada
  const primaryLicenseKey = currentSubscription?.license_key || allCycles.find(c => c.item.license_key)?.item.license_key;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      className="w-full max-w-[95vw] sm:max-w-xl mx-auto"
      title={
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <History size={18} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
              Riwayat Siklus Langganan
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Jejak transaksi &amp; perpanjangan untuk <span className="font-bold text-slate-700 dark:text-slate-300">{serviceTitle}</span>
            </p>
          </div>
        </div>
      }
    >
      <div className="p-4 sm:p-5 pt-1 space-y-4 text-left">
        {/* Ringkasan Siklus & Kode Lisensi */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-indigo-600" />
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Total {allCycles.length} Siklus Transaksi Terdata
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Konsisten 1 Entitas Layanan
            </span>
          </div>

          {primaryLicenseKey && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center gap-1.5 min-w-0">
                <Key size={13} className="text-amber-500 shrink-0" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kunci Lisensi Produk:</span>
                <span className="font-mono text-xs font-black text-indigo-700 dark:text-indigo-300 truncate" title={primaryLicenseKey}>
                  {primaryLicenseKey}
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => handleCopyKey(primaryLicenseKey, e)}
                className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 transition-colors shrink-0 flex items-center gap-1 text-[10px] font-bold"
                title="Salin kunci lisensi"
              >
                {copiedKey === primaryLicenseKey ? (
                  <>
                    <Check size={11} className="text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy size={11} />
                    <span>Salin Kunci</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Linimasa Timeline */}
        <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
          {allCycles.map(({ item, isCurrent }, idx) => {
            const planName = item.Plan?.name || item.plan_snapshot?.name || item.plan_name || 'Layanan Absenta';
            const price = item.Plan?.price_monthly || item.plan_snapshot?.price_monthly || 0;
            const maxUser = item.Plan?.max_user;
            const endYear = new Date(item.end_date).getFullYear();
            const isPermanent = endYear >= 2090;
            const itemKey = item.license_key || primaryLicenseKey;

            return (
              <div key={item.id || idx} className="relative flex items-start gap-3 pl-1">
                {/* Bullet Icon */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ${
                  isCurrent 
                    ? 'bg-emerald-500 text-white ring-4 ring-emerald-50 dark:ring-emerald-950' 
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {isCurrent ? <CheckCircle2 size={13} strokeWidth={2.5} /> : <Clock size={11} />}
                </div>

                {/* Card Konten Siklus */}
                <div className={`flex-1 p-3.5 rounded-xl border transition-all ${
                  isCurrent 
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 shadow-xs' 
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {planName}
                        </span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500 text-white text-[9px] font-black uppercase">
                            Aktif Saat Ini
                          </span>
                        )}
                        {!isCurrent && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[9px] font-bold">
                            Siklus Lampau
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <p className="text-[10px] text-slate-400 font-mono">
                          ID: {item.id ? `${item.id.substring(0, 10)}...` : '-'}
                        </p>
                        {itemKey && (
                          <span className="inline-flex items-center gap-1 text-[9.5px] font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-200/60 dark:border-amber-800/60">
                            <Key size={10} className="shrink-0" />
                            {itemKey}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                        {price > 0 ? formatCurrency(price) : 'Gratis'}
                      </span>
                    </div>
                  </div>

                  {/* Periode & Kapasitas */}
                  <div className="grid grid-cols-2 gap-2 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <Calendar size={12} className="text-slate-400 shrink-0" />
                      <span>
                        {isPermanent ? (
                          <strong className="text-emerald-600 dark:text-emerald-400">Permanen</strong>
                        ) : (
                          `${formatDate(item.start_date)} - ${formatDate(item.end_date)}`
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 text-slate-600 dark:text-slate-300">
                      <User size={12} className="text-slate-400 shrink-0" />
                      <span>{maxUser ? `${maxUser.toLocaleString('id-ID')} Pengguna` : 'Unlimited'}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
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
