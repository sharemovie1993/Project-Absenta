import React from 'react';
import { Eye, Edit, Trash2 } from 'lucide-react';
import { Button } from '../../ui';
import { formatDate } from '../../../utils/date.utils';
import type { CoopAssetItem } from './types';

interface CoopAssetMobileDeckProps {
  assets: CoopAssetItem[];
  isLoading: boolean;
  onDetail: (asset: CoopAssetItem) => void;
  onEdit: (asset: CoopAssetItem) => void;
  onDelete: (id: string, name: string) => void;
}

const categoryLabels: Record<string, string> = {
  EQUIPMENT: 'Peralatan Kasir',
  DISPLAY_FURNITURE: 'Rak / Etalase',
  COOLING_APPLIANCE: 'Mesin Pendingin',
  BUILDING_FACILITY: 'Bangunan / Kantin',
  VEHICLE: 'Kendaraan',
  OTHER: 'Lainnya',
};

export const CoopAssetMobileDeck: React.FC<CoopAssetMobileDeckProps> = React.memo(({
  assets,
  isLoading,
  onDetail,
  onEdit,
  onDelete,
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 space-y-2">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500">Memuat data inventaris aset...</p>
      </div>
    );
  }

  if (!assets || assets.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
        Belum ada data inventaris aset tetap koperasi yang tercatat.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {assets?.map((asset) => {
        const renderConditionBadge = () => {
          if (asset.condition === 'GOOD') {
            return (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                Baik
              </span>
            );
          }
          if (asset.condition === 'FAIR') {
            return (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
                Cukup
              </span>
            );
          }
          if (asset.condition === 'DAMAGED') {
            return (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                Rusak
              </span>
            );
          }
          return (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
              Afkir
            </span>
          );
        };

        return (
          <div
            key={asset.id}
            className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2.5 transition-all"
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-900/60 shrink-0">
                  {asset.code}
                </span>
                <span className="text-[11px] text-slate-500 truncate">
                  {categoryLabels[asset.category] || asset.category}
                </span>
              </div>
              <div className="shrink-0">
                {renderConditionBadge()}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block break-words">
                {asset.name}
              </span>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                <span>Lokasi: <strong className="text-slate-700 dark:text-slate-300 font-medium">{asset.location || '-'}</strong></span>
                {asset.purchaseDate && (
                  <span>Beli: <strong className="text-slate-700 dark:text-slate-300 font-medium">{formatDate(asset.purchaseDate)}</strong></span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
              <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                Rp {Math.round(Number(asset.purchasePrice || 0)).toLocaleString('id-ID')}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="min-w-[44px] min-h-[44px] p-2.5 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-400 active:scale-95 transition-transform"
                  onClick={() => onDetail(asset)}
                  aria-label={`Detail aset ${asset.name}`}
                  title="Lihat Detail & Barcode Aset"
                >
                  <Eye size={16} />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="min-w-[44px] min-h-[44px] p-2.5 flex items-center justify-center rounded-xl text-indigo-600 dark:text-indigo-400 active:scale-95 transition-transform"
                  onClick={() => onEdit(asset)}
                  aria-label={`Ubah aset ${asset.name}`}
                  title="Ubah Data Aset"
                >
                  <Edit size={16} />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="min-w-[44px] min-h-[44px] p-2.5 flex items-center justify-center rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 active:scale-95 transition-transform"
                  onClick={() => onDelete(asset.id, asset.name)}
                  aria-label={`Hapus aset ${asset.name}`}
                  title="Hapus Aset"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

CoopAssetMobileDeck.displayName = 'CoopAssetMobileDeck';
