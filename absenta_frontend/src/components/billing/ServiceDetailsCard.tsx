import React from 'react';
import { Sparkles, User, Settings, LayoutGrid, ExternalLink, Clock } from 'lucide-react';
import { Card, Button, Badge } from '../ui';
import { formatCurrency } from '../../lib/billingUtils';
import { formatDate } from '../../utils/layoutUtils';
import type { Plan } from '../../types/billing';
import toast from 'react-hot-toast';

interface ServiceDetailsCardProps {
  selectedService: {
    id: string;
    status: string;
    start_date?: string;
    end_date?: string;
    auto_renew?: boolean;
    plan_id?: string;
    plan_name?: string;
    Plan?: {
      name: string;
      price_monthly?: number;
      max_user?: number;
      features_json?: string[];
    };
    plan_snapshot?: {
      price_monthly?: number;
      features_json?: string[];
    };
  };
  onExtend: (planId: string) => void;
  onChangePlan: (plan: Plan) => void;
  onOpenAutoRenew: () => void;
}

export const ServiceDetailsCard: React.FC<ServiceDetailsCardProps> = React.memo(({
  selectedService,
  onExtend,
  onChangePlan,
  onOpenAutoRenew
}) => {
  return (
    <Card className="p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-sm relative overflow-hidden">
      <div className="space-y-8 relative z-10">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="text-blue-600 border-blue-100 dark:border-blue-900/30 text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded-md">
                Layanan Aktif
              </Badge>
              {selectedService.status === 'TRIAL' && (
                <Badge variant="warning" className="text-[9px] font-bold uppercase px-2 py-1 flex gap-1 items-center">
                  <Clock size={10} /> Mode Trial
                </Badge>
              )}
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {selectedService.Plan?.name || selectedService.plan_name}
            </h2>
            <div className="flex items-center gap-3 mt-3 text-slate-500">
              <div className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-bold uppercase">
                {selectedService.status || 'ACTIVE'}
              </div>
              <span className="text-[10px] font-medium opacity-60">ID: {selectedService.id.substring(0, 8)}...</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800 text-[12.8px]">
            <div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Terdaftar</div>
              <div className="font-bold text-slate-900 dark:text-white">{formatDate(selectedService.start_date)}</div>
            </div>
            <div className="border-l border-slate-200 dark:border-slate-700 pl-4">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Masa Aktif</div>
              <div className="font-bold text-blue-600">{formatDate(selectedService.end_date)}</div>
            </div>
            <div className="border-l border-slate-200 dark:border-slate-700 pl-4">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Perpanjangan</div>
              <div className={`font-bold flex items-center gap-1.5 ${selectedService.auto_renew ? 'text-emerald-600' : 'text-amber-600'}`}>
                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${selectedService.auto_renew ? 'bg-emerald-500' : 'bg-amber-500'}`}></div> 
                {selectedService.auto_renew ? 'Otomatis' : 'Manual'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="p-6 bg-slate-900 dark:bg-black rounded-lg text-white flex flex-col justify-between border border-white/5 relative group overflow-hidden">
            <div className="relative z-10">
              <div className="text-[10px] font-bold opacity-60 uppercase mb-2 tracking-wider flex items-center gap-2">
                <Badge variant="secondary" className="bg-transparent border-none p-0 text-amber-500">
                  <Sparkles size={12} className="text-amber-500 fill-amber-500 mr-1 inline animate-none" />
                </Badge> Paket Berlangganan
              </div>
              <div className="text-2xl font-bold">
                {formatCurrency(selectedService.Plan?.price_monthly || selectedService.plan_snapshot?.price_monthly || 0)}
              </div>
              <div className="text-[9px] opacity-40 mt-1 mb-4 uppercase font-bold">Investasi per Bulan</div>
              <div className="bg-white/5 hover:bg-white/10 transition-colors rounded-lg p-3 border border-white/5 backdrop-blur-sm mt-4">
                <div className="text-[8px] opacity-60 uppercase font-black tracking-widest mb-1.5">Kapasitas Maksimal</div>
                <div className="font-bold text-sm flex items-center gap-2">
                  <User size={14} className="text-blue-400" />
                  {selectedService.Plan?.max_user ? `${(selectedService.Plan.max_user).toLocaleString('id-ID')} Pengguna/Aset` : 'Tidak Dibatasi (Unlimited)'}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6 relative z-10">
              <Button 
                type="button"
                aria-label="Perpanjang Masa Aktif Layanan"
                onClick={() => selectedService.plan_id && onExtend(selectedService.plan_id)} 
                className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md text-xs h-10 shadow-lg shadow-blue-600/20"
              >
                Perpanjang Masa Aktif
              </Button>
              <Button 
                type="button"
                aria-label="Ganti Paket Layanan"
                variant="outline"
                onClick={() => onChangePlan((selectedService.Plan || selectedService.plan_snapshot || {}) as Plan)} 
                className="flex-1 bg-white/5 hover:bg-white/10 text-white border-white/20 font-bold rounded-md text-[10px] h-10 px-2 transition-colors"
                title="Upgrade atau Downgrade Paket"
              >
                Ganti Paket
              </Button>
              <Button 
                type="button"
                aria-label="Buka Pengaturan Tagihan"
                variant="outline"
                onClick={onOpenAutoRenew} 
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold rounded-md text-[10px] h-10 px-3 transition-colors flex items-center gap-2"
                title="Pengaturan Tagihan"
              >
                <Settings size={14} /> Pengaturan
              </Button>
            </div>
          </div>
          <div className="p-6 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-200/50 dark:border-slate-800 flex flex-col">
            <div className="text-[10px] font-bold text-slate-400 uppercase mb-4 tracking-wider flex items-center gap-2">
              <LayoutGrid size={14} /> Cakupan Fitur Utama
            </div>
            <div className="space-y-3 flex-1">
              {(selectedService.Plan?.features_json || selectedService.plan_snapshot?.features_json || [])
                ?.filter(f => !f.toUpperCase().includes('CORE'))
                ?.slice(0, 5)?.map((f, i) => (
                <div key={i} className="flex items-center gap-3 text-[12.8px] font-medium text-slate-600 dark:text-slate-300">
                  <Badge variant="secondary" className="bg-transparent border-none p-0 text-blue-500">✔</Badge>
                  <span className="truncate">{f}</span>
                </div>
              ))}
            </div>
            <Button 
              type="button"
              aria-label="Buka Modul Layanan"
              onClick={() => toast.success('Mengalihkan ke modul...')}
              className="mt-6 w-full bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-md text-xs h-10 border-none transition-colors"
            >
              <ExternalLink size={14} className="mr-2" /> Buka Modul
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
});
