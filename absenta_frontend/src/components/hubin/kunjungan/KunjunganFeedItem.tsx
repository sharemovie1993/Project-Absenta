import React from 'react';
import {
  Calendar,
  Building2,
  MapPin,
  Camera,
  ExternalLink,
  Printer,
  Pencil,
  Trash2,
  User,
} from 'lucide-react';
import { Badge, Button } from '@/components/ui';
import { resolveAttachmentUrl, getDriveThumbnailUrl } from '@/utils/hubinUtils';
import type { KunjunganItemDetail } from './types';

interface KunjunganFeedItemProps {
  item: KunjunganItemDetail;
  readOnly?: boolean;
  onEdit?: (item: KunjunganItemDetail) => void;
  onDelete?: (item: KunjunganItemDetail) => void;
  onPrint?: (item: KunjunganItemDetail) => void;
}

export const KunjunganFeedItem: React.FC<KunjunganFeedItemProps> = React.memo(({
  item,
  readOnly = false,
  onEdit,
  onDelete,
  onPrint,
}) => {
  const formattedDate = React.useMemo(() => {
    try {
      const d = new Date(item.tanggal);
      return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return item.tanggal;
    }
  }, [item.tanggal]);

  const hasGps = item.latitude !== undefined && item.longitude !== undefined && item.latitude !== 0;
  const mapsUrl = hasGps
    ? `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`
    : null;

  const photoPreview = item.foto_url ? resolveAttachmentUrl(item.foto_url) : null;
  const thumbnail = photoPreview ? getDriveThumbnailUrl(photoPreview) || photoPreview : null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5 transition-all hover:border-indigo-300 dark:hover:border-indigo-800">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <Building2 size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
              {item.nama_mitra}
            </span>
            <Badge variant="outline" className="text-[10px] font-bold">
              {formattedDate}
            </Badge>
            {hasGps && mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                title="Buka titik koordinat di Google Maps"
              >
                <MapPin size={12} />
                <span>Geotag GPS</span>
              </a>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Siswa: {item.nama_siswa}
            </span>
            <span>•</span>
            <span>{item.kelas}</span>
            {item.pembimbing_nama && (
              <>
                <span>•</span>
                <span className="text-slate-400">Pembimbing: {item.pembimbing_nama}</span>
              </>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onPrint && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onPrint(item)}
              className="text-xs font-bold rounded-xl h-8 gap-1.5 text-slate-600 dark:text-slate-300"
              title="Cetak Lembar Monitoring Kunjungan"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Cetak Lembar</span>
            </Button>
          )}
          {!readOnly && onEdit && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onEdit(item)}
              className="text-xs font-bold rounded-xl h-8 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
              title="Edit Catatan Kunjungan"
            >
              <Pencil size={14} />
            </Button>
          )}
          {!readOnly && onDelete && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onDelete(item)}
              className="text-xs font-bold rounded-xl h-8 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              title="Hapus Catatan Kunjungan"
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      </div>

      {/* Observasi & Catatan DU/DI */}
      <div className="space-y-2 text-xs sm:text-sm">
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
          <span className="font-bold block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
            Hasil Observasi &amp; Catatan Guru Pembimbing
          </span>
          {item.catatan || 'Belum ada catatan observasi tertulis.'}
        </div>

        {item.catatan_dudi && (
          <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-800/40 text-xs text-teal-900 dark:text-teal-200">
            <span className="font-bold block text-[10px] uppercase tracking-wider mb-0.5 text-teal-700 dark:text-teal-300">
              Umpan Balik / Catatan Mentor Industri (DU/DI):
            </span>
            {item.catatan_dudi}
          </div>
        )}
      </div>

      {/* Foto Dokumentasi */}
      {photoPreview && (
        <div className="pt-1 flex items-center gap-3">
          <a
            href={photoPreview}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex items-center gap-2 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:border-indigo-400 transition-colors"
          >
            <img
              src={thumbnail || photoPreview}
              alt="Bukti Kunjungan"
              className="w-14 h-14 object-cover rounded-lg border border-slate-200/80 dark:border-slate-700"
            />
            <div className="text-left pr-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center gap-1">
                <Camera size={13} /> Foto Bukti Kunjungan
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5 flex items-center gap-0.5">
                Buka Resolusi Penuh <ExternalLink size={10} />
              </span>
            </div>
          </a>
        </div>
      )}
    </div>
  );
});

KunjunganFeedItem.displayName = 'KunjunganFeedItem';
