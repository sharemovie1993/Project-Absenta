import React from 'react';
import { X, Printer, Package, Calendar, DollarSign, MapPin, User, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui';
import { formatDate } from '@/utils/date.utils';
import type { CoopAssetItem } from './types';

interface AssetDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: CoopAssetItem | null;
  onEdit?: (asset: CoopAssetItem) => void;
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = React.memo(({
  isOpen,
  onClose,
  asset,
  onEdit,
}) => {
  if (!isOpen || !asset) return null;

  const handlePrint = () => {
    window.print();
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'EQUIPMENT': return 'Peralatan Kasir / Elektronik';
      case 'DISPLAY_FURNITURE': return 'Rak Gondola / Etalase';
      case 'COOLING_APPLIANCE': return 'Mesin Pendingin / Showcase';
      case 'BUILDING_FACILITY': return 'Bangunan / Kantin';
      case 'VEHICLE': return 'Kendaraan Operasional';
      default: return 'Lainnya';
    }
  };

  const getConditionBadge = (cond: string) => {
    switch (cond) {
      case 'GOOD':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">Baik / Normal</span>;
      case 'FAIR':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">Cukup (Aus Wajar)</span>;
      case 'DAMAGED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">Rusak</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">Afkir</span>;
    }
  };

  const getStatusBadge = (stat: string) => {
    switch (stat) {
      case 'IN_USE':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-200">Sedang Digunakan</span>;
      case 'IN_REPAIR':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">Dalam Perbaikan</span>;
      case 'IDLE':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">Cadangan / Disimpan</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600">Dihapuskan</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Package size={20} className="text-indigo-600" />
            <h3 className="text-base font-black text-slate-800 dark:text-white">
              Detail Kartu Inventaris Aset
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Label Card Visual (Barcode Style) */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block">KOPERASI SEKOLAH</span>
              <h4 className="text-sm font-black text-slate-800 dark:text-white">{asset.name}</h4>
              <p className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">{asset.code}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-mono">LOKASI</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{asset.location}</span>
            </div>
          </div>

          {/* Rincian Spesifikasi */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold">
                <Calendar size={12} /> Tanggal Pembelian
              </span>
              <p className="font-bold text-slate-800 dark:text-slate-200">
                {formatDate(asset.purchaseDate)}
              </p>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold">
                <DollarSign size={12} /> Harga Perolehan
              </span>
              <p className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                Rp {Math.round(asset.purchasePrice).toLocaleString('id-ID')}
              </p>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold">
                <ShieldCheck size={12} /> Kondisi Fisik
              </span>
              <div>{getConditionBadge(asset.condition)}</div>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold">
                <Package size={12} /> Status Penggunaan
              </span>
              <div>{getStatusBadge(asset.status)}</div>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold">
                <MapPin size={12} /> Kategori Aset
              </span>
              <p className="font-bold text-slate-700 dark:text-slate-300">
                {getCategoryLabel(asset.category)}
              </p>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold">
                <User size={12} /> Penanggung Jawab
              </span>
              <p className="font-bold text-slate-700 dark:text-slate-300">
                {asset.picName || 'Pengurus Koperasi'}
              </p>
            </div>
          </div>

          {/* Nomor Seri & Catatan */}
          {(asset.serialNumber || asset.notes) && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1.5 border border-slate-100 dark:border-slate-800 text-xs">
              {asset.serialNumber && (
                <p className="text-slate-600 dark:text-slate-400">
                  <strong className="text-slate-800 dark:text-slate-200">No. Seri Pabrik:</strong> {asset.serialNumber}
                </p>
              )}
              {asset.notes && (
                <p className="text-slate-600 dark:text-slate-400">
                  <strong className="text-slate-800 dark:text-slate-200">Catatan:</strong> {asset.notes}
                </p>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5"
          >
            <Printer size={14} />
            <span>Cetak Kartu Aset</span>
          </Button>

          <div className="flex items-center gap-2">
            {onEdit && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onEdit(asset);
                }}
              >
                Ubah Data
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Tutup
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
});

AssetDetailModal.displayName = 'AssetDetailModal';
