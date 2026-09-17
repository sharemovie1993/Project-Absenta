import React from 'react';
import { 
  User, 
  Building2, 
  Calendar, 
  MessageCircle, 
  Award, 
  MapPin, 
  FileText, 
  Printer, 
  Trash2,
  Edit
} from 'lucide-react';
import { formatDate } from '../../utils/layoutUtils';
import { PklStatusBadge } from './PklStatusBadge';
import { getPklDisplayStatus } from '../../utils/hubinPklLifecycle';
import { Button } from '../ui';
import { HubinJurnalStatus } from '../../constants/HubinConstants';
import type { SiswaPkl, MitraData } from '../../pages/hubin/PenempatanPklPage';
import { PenempatanRowActionMenu } from './PenempatanRowActionMenu';

interface GetColumnsParams {
  rawMitra: MitraData[];
  canManage: boolean;
  hasKolektif: (mitraId: string) => boolean;
  onNilai: (row: SiswaPkl) => void;
  onKunjungan: (row: SiswaPkl) => void;
  onReviewJurnal: (row: SiswaPkl) => void;
  onCetakTugas: (row: SiswaPkl) => void;
  onCetakKolektif: (mitraId: string) => void;
  onPrintMonitoring?: (row: SiswaPkl) => void;
  onHapus: (row: SiswaPkl) => void;
  onEdit?: (row: SiswaPkl) => void;
  onSelesai?: (row: SiswaPkl) => void;
  onMutasi?: (row: SiswaPkl) => void;
  onFilterSiswaHistory?: (namaSiswa: string) => void;
}

export const getPenempatanColumns = ({
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
  onSelesai,
  onMutasi,
  onFilterSiswaHistory,
}: GetColumnsParams) => [
  {
    key: 'siswa',
    label: 'Siswa PKL',
    sortable: true,
    render: (_value: unknown, row: SiswaPkl) => {
      const tpTahun = (row as any).SiswaAkademik?.tahunPelajaran?.tahun || (row as any).Siswa?.TahunPelajaran?.tahun;
      const semNama = (row as any).SiswaAkademik?.semester?.nama_semester;
      return (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
            <User size={18} />
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{row.Siswa?.nama_siswa}</p>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 mt-0.5">
              <span>NIS: {row.Siswa?.nis}</span>
              {row.Siswa?.Kelas?.nama_kelas && (
                <>
                  <span>•</span>
                  <span className="font-medium text-slate-600 dark:text-slate-300">{row.Siswa.Kelas.nama_kelas}</span>
                </>
              )}
              {tpTahun && (
                <>
                  <span>•</span>
                  <span className="text-[10px] font-semibold text-indigo-650 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-100/50 dark:border-indigo-900/30">
                    TP {tpTahun}{semNama ? ` (${semNama})` : ''}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      );
    }
  },
  {
    key: 'mitra',
    label: 'Mitra & Pembimbing',
    render: (_value: unknown, row: SiswaPkl) => (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 text-xs">
          <Building2 size={14} className="text-indigo-500" />
          {row.Mitra?.nama}
        </div>
        <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-50 dark:bg-slate-950/20 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-800 w-fit">
          <span>Pmb: {row.Pembimbing?.nama_guru || 'Belum ditunjuk'}</span>
        </div>
        {row.catatan_pkl && row.catatan_pkl.includes('Mutasi:') && (
          <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900/40 w-fit">
            <span>🏷️ {row.catatan_pkl}</span>
          </div>
        )}
      </div>
    )
  },
  {
    key: 'periode',
    label: 'Periode',
    render: (_value: unknown, row: SiswaPkl) => (
      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs bg-slate-50 dark:bg-slate-950/30 p-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 w-fit">
        <Calendar size={14} className="text-slate-400 shrink-0" />
        <div>
          <p className="font-medium">{formatDate(row.tanggal_mulai, { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">s/d {row.tanggal_selesai ? formatDate(row.tanggal_selesai, { day: '2-digit', month: 'short', year: 'numeric' }) : 'Selesai'}</p>
        </div>
      </div>
    )
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    render: (_value: unknown, row: SiswaPkl) => {
      const display = getPklDisplayStatus(row);
      return <PklStatusBadge status={display.status} />;
    }
  },
  {
    key: 'kunjungan',
    label: 'Progres Monitoring',
    render: (_value: unknown, row: SiswaPkl) => {
      const kunjunganList = Array.isArray(row.kunjungan_json) ? row.kunjungan_json : [];
      const visitCount = kunjunganList.length;
      const targetVisits = 3;
      const percentage = Math.min(100, Math.round((visitCount / targetVisits) * 100));
      
      return (
        <div className="space-y-1.5 w-[110px]">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
            <span>{visitCount}/{targetVisits} Visit</span>
            <span className={percentage === 100 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>{percentage}%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                percentage === 100 ? "bg-emerald-500" : "bg-amber-500"
              }`} 
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      );
    }
  },
  {
    key: 'kontak',
    label: 'Hubungi (WA)',
    render: (_value: unknown, row: SiswaPkl) => {
      const fullMitra = rawMitra.find((m: MitraData) => m.id === row.mitra_id);
      
      const siswaPhone = row.Siswa?.no_hp || '';
      const mitraPhone = row.Mitra?.kontak || fullMitra?.kontak || '';
      
      const formatWhatsAppLink = (phone: string, text: string) => {
        if (!phone) return '';
        let cleaned = phone.replace(/\D/g, '');
        if (cleaned.startsWith('0')) {
          cleaned = '62' + cleaned.slice(1);
        } else if (cleaned.startsWith('8')) {
          cleaned = '62' + cleaned;
        }
        return `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
      };
      
      const siswaMsg = `Halo ${row.Siswa?.nama_siswa || 'Siswa'}, saya pembimbing PKL Anda dari sekolah. Bagaimana perkembangan praktik Anda hari ini?`;
      const mitraMsg = `Halo Bapak/Ibu dari ${row.Mitra?.nama || 'Mitra'}, saya pembimbing PKL dari sekolah untuk siswa ${row.Siswa?.nama_siswa || 'Siswa'}. Bagaimana progres magang siswa kami di sana?`;
      
      const siswaWaLink = formatWhatsAppLink(siswaPhone, siswaMsg);
      const mitraWaLink = formatWhatsAppLink(mitraPhone, mitraMsg);
      
      return (
        <div className="flex gap-1.5">
          {siswaPhone ? (
            <a
              href={siswaWaLink}
              target="_blank"
              rel="noopener noreferrer"
              title={`Hubungi Siswa (${siswaPhone})`}
              className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 transition-colors"
            >
              <MessageCircle size={14} />
              <span className="sr-only">Siswa</span>
            </a>
          ) : (
            <span className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-350 dark:text-slate-700 border border-slate-100 dark:border-slate-800 cursor-not-allowed" title="No HP Siswa tidak tersedia">
              <MessageCircle size={14} />
            </span>
          )}
          
          {mitraPhone ? (
            <a
              href={mitraWaLink}
              target="_blank"
              rel="noopener noreferrer"
              title={`Hubungi HRD/Mitra (${mitraPhone})`}
              className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 transition-colors"
            >
              <Building2 size={14} />
              <span className="sr-only">HRD</span>
            </a>
          ) : (
            <span className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-350 dark:text-slate-700 border border-slate-100 dark:border-slate-800 cursor-not-allowed" title="Kontak Mitra tidak tersedia">
              <Building2 size={14} />
            </span>
          )}
        </div>
      );
    }
  },
  {
    key: 'actions',
    label: 'Aksi',
    render: (_value: unknown, row: SiswaPkl) => {
      const fullMitra = rawMitra.find((m: MitraData) => m.id === row.mitra_id);
      return (
        <div className="flex items-center justify-end">
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
            onSelesai={onSelesai}
            onMutasi={onMutasi}
            onFilterSiswaHistory={onFilterSiswaHistory}
            mitraPhone={row.Mitra?.kontak || fullMitra?.kontak}
          />
        </div>
      );
    }
  }
];
