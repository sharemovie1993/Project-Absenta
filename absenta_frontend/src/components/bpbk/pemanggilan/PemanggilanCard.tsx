import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/utils/layoutUtils';
import { Eye, Printer, Edit2, Trash2 } from 'lucide-react';
import type { PemanggilanOrangTua } from '@/api/bpbk.api';

interface PemanggilanCardProps {
  item: PemanggilanOrangTua;
  onViewDetail: (item: PemanggilanOrangTua) => void;
  onEdit: (item: PemanggilanOrangTua) => void;
  onDelete: (id: string) => void;
  onPrint: (item: PemanggilanOrangTua) => void;
}

export const PemanggilanCard: React.FC<PemanggilanCardProps> = React.memo(({
  item,
  onViewDetail,
  onEdit,
  onDelete,
  onPrint,
}) => {
  const isFinal = item.status === 'HADIR';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm hover:border-indigo-500/30 transition-all space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
            {item.Siswa?.nama_siswa || 'Siswa'}
          </h4>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            {item.Siswa?.Kelas?.nama_kelas || '-'}
          </span>
        </div>
        <Badge
          variant={item.status === 'HADIR' ? 'success' : item.status === 'TIDAK_HADIR' ? 'error' : 'warning'}
          className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-md"
        >
          {item.status}
        </Badge>
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
        {item.alasan}
      </p>

      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <span>Tgl Panggilan: <strong className="text-slate-700 dark:text-slate-200">{formatDate(item.tanggal_pemanggilan, { day: '2-digit', month: 'short', year: 'numeric' })}</strong></span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onViewDetail(item)}
            className="w-7 h-7 text-indigo-600"
            title="Lihat Detail"
          >
            <Eye size={13} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onPrint(item)}
            className="w-7 h-7 text-blue-600"
            title="Cetak Surat Panggilan"
          >
            <Printer size={13} />
          </Button>
          {!isFinal && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(item)}
              className="w-7 h-7 text-emerald-600"
              title="Input Hasil Pertemuan"
            >
              <Edit2 size={13} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(item.id)}
            className="w-7 h-7 text-rose-500"
            title="Hapus"
          >
            <Trash2 size={13} />
          </Button>
        </div>
      </div>
    </div>
  );
});
