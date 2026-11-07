import React from 'react';
import { 
  Building2, 
  MessageCircle 
} from 'lucide-react';
import { formatDate } from '@/utils/layoutUtils';
import { SiswaIdentityCell } from '@/components/common/SiswaIdentityCell';
import { PklStatusBadge } from '@/components/hubin/PklStatusBadge';
import { PenempatanRowActionMenu } from '@/components/hubin/PenempatanRowActionMenu';
import type { SiswaPkl, MitraData } from '@/pages/hubin/types/penempatan.types';

export interface PenempatanMobileCardProps {
  row: SiswaPkl;
  rawMitra: MitraData[];
  canManage: boolean;
  hasKolektif: (mitraId: string) => boolean;
  onNilai: (row: SiswaPkl) => void;
  onKunjungan: (row: SiswaPkl) => void;
  onReviewJurnal: (row: SiswaPkl) => void;
  onCetakTugas: (row: SiswaPkl) => void;
  onCetakKolektif: (mitraId: string) => void;
  onPrintMonitoring: (row: SiswaPkl) => void;
  onHapus: (row: SiswaPkl) => void;
  onEdit: (row: SiswaPkl) => void;
  onMutasi?: (row: SiswaPkl) => void;
  onFilterSiswaHistory?: (namaSiswa: string) => void;
  onEditMitraKontak: (mitraId: string) => void;
  selectable?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  hidePembimbing?: boolean;
  isPembimbingMode?: boolean;
  onOpenDetail?: (row: SiswaPkl) => void;
}

const toTitleCase = (str?: string) => {
  if (!str) return '';
  return str.toLowerCase().replace(/(?:^|\s|-)\S/g, (c) => c.toUpperCase());
};

export const PenempatanMobileCard: React.FC<PenempatanMobileCardProps> = React.memo(({
  row,
  rawMitra,
  canManage,
  hasKolektif,
  onNilai,
  onKunjungan,
  onReviewJurnal,
  onCetakTugas,
  onCetakKolektif,
  onPrintMonitoring,
  onHapus,
  onEdit,
  onMutasi,
  onFilterSiswaHistory,
  onEditMitraKontak,
  selectable,
  isSelected,
  onToggleSelect,
  hidePembimbing = false,
  isPembimbingMode = false,
  onOpenDetail,
}) => {
  const fullMitra = rawMitra?.find((m: MitraData) => m.id === row.mitra_id);
  const siswaPhone = row.Siswa?.no_hp || '';
  const mitraPhone = row.Mitra?.kontak || fullMitra?.kontak || '';

  const formatWhatsAppLink = (phone: string, text: string) => {
    if (!phone) return '';
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = '62' + cleaned.slice(1);
    else if (cleaned.startsWith('8')) cleaned = '62' + cleaned;
    return `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
  };

  const siswaMsg = `Halo ${row.Siswa?.nama_siswa || 'Siswa'}, saya pembimbing PKL Anda dari sekolah. Bagaimana perkembangan praktik Anda hari ini?`;
  const mitraMsg = `Halo Bapak/Ibu dari ${row.Mitra?.nama || 'Mitra'}, saya pembimbing PKL dari sekolah untuk siswa ${row.Siswa?.nama_siswa || 'Siswa'}. Bagaimana progres magang siswa kami di sana?`;

  const siswaWaLink = formatWhatsAppLink(siswaPhone, siswaMsg);
  const mitraWaLink = formatWhatsAppLink(mitraPhone, mitraMsg);

  const kunjunganList = Array.isArray(row.kunjungan_json) ? row.kunjungan_json : [];
  const visitCount = kunjunganList.length;
  const targetVisits = 3;
  const percentage = Math.min(100, Math.round((visitCount / targetVisits) * 100));

  return (
    <div
      key={row.id}
      className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2.5 w-full max-w-full min-w-0"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {selectable && (
            <input
              type="checkbox"
              checked={isSelected || false}
              onChange={() => onToggleSelect?.(row.id)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 shrink-0 cursor-pointer"
            />
          )}
          <SiswaIdentityCell
            foto={row.Siswa?.foto}
            nama={toTitleCase(row.Siswa?.nama_siswa)}
            nis={row.Siswa?.nis}
            kelas={row.Siswa?.Kelas?.nama_kelas}
            size="sm"
            nameClassName="font-bold text-xs tracking-tight !whitespace-normal !overflow-visible break-words leading-snug"
            showMeta={true}
          />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <PklStatusBadge status={row.status} />
          <PenempatanRowActionMenu
            row={row}
            canManage={canManage}
            hasKolektif={hasKolektif}
            onNilai={onNilai}
            onKunjungan={onKunjungan}
            onReviewJurnal={onReviewJurnal}
            onCetakTugas={onCetakTugas}
            onCetakKolektif={onCetakKolektif}
            onPrintMonitoring={onPrintMonitoring}
            onHapus={onHapus}
            onEdit={onEdit}
            onMutasi={onMutasi}
            onFilterSiswaHistory={onFilterSiswaHistory}
            onEditMitraKontak={onEditMitraKontak}
            onOpenDetail={onOpenDetail}
            isPembimbingMode={isPembimbingMode}
            siswaPhone={siswaPhone}
            mitraPhone={mitraPhone}
          />
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5 text-xs">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-1.5 font-bold text-slate-800 dark:text-slate-200 min-w-0 flex-1">
            <Building2 size={13} className="text-indigo-500 shrink-0 mt-0.5" />
            {row.mitra_id ? (
              <button
                type="button"
                onClick={() => onEditMitraKontak(row.mitra_id)}
                className="break-words text-left hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline cursor-pointer font-bold text-xs text-slate-800 dark:text-slate-200"
                title="Klik untuk melihat / perbarui kontak & PIC DUDI"
              >
                {toTitleCase(row.Mitra?.nama)}
              </button>
            ) : (
              <span className="break-words font-bold text-xs text-slate-800 dark:text-slate-200">
                {toTitleCase(row.Mitra?.nama)}
              </span>
            )}
          </div>
          {!hidePembimbing && (
            <span className="text-[10px] font-semibold text-slate-500 shrink-0 ml-1">
              Pmb: {row.Pembimbing?.nama_guru ? row.Pembimbing.nama_guru.split(' ')[0] : 'Belum ada'}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
          <span>
            Periode: {formatDate(row.tanggal_mulai, { day: '2-digit', month: 'short' })} - {row.tanggal_selesai ? formatDate(row.tanggal_selesai, { day: '2-digit', month: 'short', year: 'numeric' }) : 'Selesai'}
          </span>
          <span className="font-bold text-slate-600 dark:text-slate-400">
            {visitCount}/{targetVisits} Visit ({percentage}%)
          </span>
        </div>

        {/* Contact WA Links (Hanya tampil jika ada nomor telepon) */}
        {(siswaPhone || mitraPhone) && (
          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-[10px] font-medium text-slate-400">WA:</span>
            {siswaPhone && (
              <a
                href={siswaWaLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md"
              >
                <MessageCircle size={10} /> Siswa
              </a>
            )}
            {mitraPhone && (
              <a
                href={mitraWaLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md"
              >
                <Building2 size={10} /> HRD
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
