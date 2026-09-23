import React from 'react';
import { 
  Building2, 
  MapPin, 
  Award, 
  MessageCircle 
} from 'lucide-react';
import { Button } from '@/components/ui';
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
}

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
  onEditMitraKontak
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
      className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 w-full max-w-full min-w-0"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <SiswaIdentityCell
            foto={row.Siswa?.foto}
            nama={row.Siswa?.nama_siswa}
            nis={row.Siswa?.nis}
            kelas={row.Siswa?.Kelas?.nama_kelas}
            size="md"
            nameClassName="font-extrabold text-xs uppercase tracking-tight"
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
            siswaPhone={siswaPhone}
            mitraPhone={mitraPhone}
          />
        </div>
      </div>

      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 min-w-0">
            <Building2 size={13} className="text-indigo-500 shrink-0" />
            {row.mitra_id ? (
              <button
                type="button"
                onClick={() => onEditMitraKontak(row.mitra_id)}
                className="truncate hover:text-indigo-600 dark:hover:text-indigo-400 text-left hover:underline cursor-pointer"
                title="Klik untuk melihat / perbarui kontak & PIC DUDI"
              >
                {row.Mitra?.nama}
              </button>
            ) : (
              <span className="truncate">{row.Mitra?.nama}</span>
            )}
          </div>
          <span className="text-[10px] font-bold text-slate-500 shrink-0">
            Pmb: {row.Pembimbing?.nama_guru || 'Belum ada'}
          </span>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-200/50 dark:border-slate-800 pt-1.5">
          <span>
            Periode: {formatDate(row.tanggal_mulai, { day: '2-digit', month: 'short' })} - {row.tanggal_selesai ? formatDate(row.tanggal_selesai, { day: '2-digit', month: 'short', year: 'numeric' }) : 'Selesai'}
          </span>
          <span className="font-bold">{visitCount}/{targetVisits} Visit ({percentage}%)</span>
        </div>

        {/* Contact WA Links */}
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <span className="text-[10px] font-bold text-slate-400">Kontak WA:</span>
          {siswaPhone && (
            <a
              href={siswaWaLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full"
            >
              <MessageCircle size={10} /> Siswa
            </a>
          )}
          {mitraPhone && (
            <a
              href={mitraWaLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 px-2 py-0.5 rounded-full"
            >
              <Building2 size={10} /> HRD
            </a>
          )}
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-3 text-[11px] font-bold text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/20 rounded-xl"
          onClick={() => onNilai(row)}
        >
          <Award size={13} className="mr-1" /> Nilai PKL
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="h-8 px-3 text-[11px] font-bold text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-950/20 rounded-xl"
          onClick={() => onKunjungan(row)}
        >
          <MapPin size={13} className="mr-1" /> Kunjungan
        </Button>
      </div>
    </div>
  );
});
