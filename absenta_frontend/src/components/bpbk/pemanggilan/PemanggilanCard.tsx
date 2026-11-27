import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/utils/layoutUtils';
import {
  Edit2,
  Trash2,
  Send,
  CheckCircle2,
  FileText,
  History,
  MessageSquare,
  RotateCcw,
  Clock,
  MapPin,
} from 'lucide-react';
import type { PemanggilanOrangTua } from '@/api/bpbk.api';

interface PemanggilanCardProps {
  item: PemanggilanOrangTua;
  isSending?: boolean;
  onViewDetail: (item: PemanggilanOrangTua) => void;
  onEdit: (item: PemanggilanOrangTua) => void;
  onDelete: (id: string) => void;
  onSend?: (item: PemanggilanOrangTua, isResend?: boolean) => void;
  onRecordOutcome?: (item: PemanggilanOrangTua) => void;
  onReSummon?: (item: PemanggilanOrangTua) => void;
}

export const PemanggilanCard: React.FC<PemanggilanCardProps> = React.memo(({
  item,
  isSending = false,
  onViewDetail,
  onEdit,
  onDelete,
  onSend,
  onRecordOutcome,
  onReSummon,
}) => {
  const waktu = (item as any).waktu_pertemuan as string | undefined;
  const tempat = (item as any).tempat_pertemuan as string | undefined;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs hover:border-indigo-500/30 transition-all space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4
            onClick={() => onViewDetail(item)}
            className="font-bold text-sm text-slate-900 dark:text-white truncate cursor-pointer hover:text-indigo-600"
          >
            {item.Siswa?.nama_siswa || 'Siswa'}
          </h4>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            {item.Siswa?.Kelas?.nama_kelas || '-'} • {formatDate(item.tanggal_pemanggilan, { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
        <Badge
          variant={item.status === 'HADIR' ? 'success' : item.status === 'TIDAK_HADIR' ? 'error' : 'warning'}
          className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-md shrink-0"
        >
          {item.status}
        </Badge>
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
        {item.alasan}
      </p>

      {(waktu || tempat) && (
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-slate-500">
          {waktu && (
            <span className="inline-flex items-center gap-1">
              <Clock size={11} className="text-slate-400" />
              {waktu}
            </span>
          )}
          {tempat && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={11} className="text-slate-400" />
              {tempat}
            </span>
          )}
        </div>
      )}

      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {item.status === 'BARU' && onSend && (
            <Button
              variant="ghost"
              size="sm"
              disabled={isSending}
              onClick={() => onSend(item, false)}
              className="h-8 px-2.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg"
            >
              <Send size={12} className="mr-1" /> {isSending ? 'Mengirim...' : 'Kirim'}
            </Button>
          )}

          {item.status === 'DIKIRIM' && onRecordOutcome && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRecordOutcome(item)}
              className="h-8 px-2.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg"
            >
              <CheckCircle2 size={12} className="mr-1" /> Catat Hasil
            </Button>
          )}

          {(item.status === 'HADIR' || item.status === 'TIDAK_HADIR') && onRecordOutcome && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRecordOutcome(item)}
              className="h-8 px-2.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg"
            >
              <FileText size={12} className="mr-1" /> Berita Acara
            </Button>
          )}

          {item.status === 'TIDAK_HADIR' && onReSummon && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReSummon(item)}
              className="h-8 px-2.5 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg"
            >
              <RotateCcw size={12} className="mr-1" /> Panggil Ulang
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1">
          {item.status === 'DIKIRIM' && onSend && (
            <Button
              variant="ghost"
              size="icon"
              disabled={isSending}
              onClick={() => onSend(item, true)}
              className="w-8 h-8 text-amber-600"
              title="Kirim Ulang WA"
            >
              <MessageSquare size={14} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onViewDetail(item)}
            className="w-8 h-8 text-slate-600"
            title="Riwayat Siswa"
          >
            <History size={14} />
          </Button>
          {item.status === 'BARU' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(item)}
              className="w-8 h-8 text-indigo-600"
              title="Edit"
            >
              <Edit2 size={14} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(item.id)}
            className="w-8 h-8 text-rose-500"
            title="Hapus"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
});
