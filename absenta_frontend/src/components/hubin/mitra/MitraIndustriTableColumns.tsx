import React from 'react';
import type { MitraIndustri } from '@/api/hubin.api';
import type { Column } from '@/components/ui/Table';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Edit, 
  Trash2, 
  ExternalLink, 
  Navigation, 
  History, 
  Eye, 
  Check, 
  X, 
  MessageCircle 
} from 'lucide-react';
import { Button } from '@/components/ui';
import { resolveProfilePhotoUrl } from '@/lib/utils';
import { JurusanItem, getWhatsAppUrl, renderJurusanBadges } from './types';

export interface CreateMitraColumnsParams {
  isHubin: boolean;
  isPembimbing: boolean;
  jurusanList: JurusanItem[];
  editingQuotaId: string | null;
  tempQuotaValue: number;
  setEditingQuotaId: (id: string | null) => void;
  setTempQuotaValue: (val: number | ((prev: number) => number)) => void;
  onSaveQuickQuota: (id: string) => void;
  isPendingQuota: boolean;
  onSelectDetail: (mitra: MitraIndustri) => void;
  onEdit: (mitra: MitraIndustri) => void;
  onSelectMoU: (mitra: MitraIndustri) => void;
  onDelete: (mitra: MitraIndustri) => void;
}

export function createMitraColumns({
  isHubin,
  isPembimbing,
  jurusanList,
  editingQuotaId,
  tempQuotaValue,
  setEditingQuotaId,
  setTempQuotaValue,
  onSaveQuickQuota,
  isPendingQuota,
  onSelectDetail,
  onEdit,
  onSelectMoU,
  onDelete,
}: CreateMitraColumnsParams): Column[] {
  const cols: Column[] = [
    {
      key: 'nama',
      label: 'Mitra & Jurusan',
      sortable: true,
      render: (nama: string, row: MitraIndustri) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
            {row.logo_url ? (
              <img
                src={resolveProfilePhotoUrl(row.logo_url) || ''}
                alt={nama}
                className="w-full h-full object-contain p-1"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                  const parent = (e.currentTarget as HTMLElement).parentElement;
                  if (parent) {
                    parent.innerHTML = `<span class="text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase">${(nama || 'MI').substring(0, 2)}</span>`;
                  }
                }}
              />
            ) : (
              <div className="w-full h-full bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase">
                {(nama || 'MI').substring(0, 2)}
              </div>
            )}
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{nama}</p>
            <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
              <Building2 size={12} />
              {row.bidang || 'Tanpa Bidang'}
            </div>
            {renderJurusanBadges(row.kompetensi_keahlian, jurusanList)}
          </div>
        </div>
      )
    },
    {
      key: 'alamat',
      label: 'Alamat & GPS',
      render: (alamat: string, row: MitraIndustri) => (
        <div className="space-y-1.5 max-w-xs">
          <div className="flex items-start gap-1 text-sm text-slate-600 dark:text-slate-400">
            <MapPin size={15} className="mt-0.5 text-slate-400 shrink-0" />
            <span className="line-clamp-2">{alamat || '-'}</span>
          </div>
          {row.latitude && row.longitude ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-900/40">
              <Navigation size={10} /> Geofenced ({row.radius || 100}m)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-900/40">
              ⚠️ Belum Pin GPS
            </span>
          )}
        </div>
      )
    },
    {
      key: 'kontak',
      label: 'Kontak & PIC',
      render: (_: unknown, row: MitraIndustri) => {
        const phone = row.kontak || row.pic_telepon;
        const waUrl = getWhatsAppUrl(phone);

        return (
          <div className="space-y-1 text-xs">
            {row.pic_nama && (
              <div className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                {row.pic_nama}
                {row.pic_jabatan && <span className="text-[10px] font-normal text-slate-400 block truncate">{row.pic_jabatan}</span>}
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                <Phone size={12} className="text-slate-400 shrink-0" />
                {phone || '-'}
              </span>
              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40 transition-colors"
                  title="Chat via WhatsApp"
                >
                  <MessageCircle size={11} className="text-emerald-600" />
                  WA
                </a>
              )}
            </div>
          </div>
        );
      }
    },
    {
      key: 'kuota_pkl',
      label: 'Kuota PKL',
      render: (_: unknown, row: MitraIndustri) => {
        const terisi = row._count?.SiswaPkl || 0;
        const kuota = row.kuota_pkl || 0;
        const sisa = Math.max(0, kuota - terisi);
        const isOver = terisi > kuota && kuota > 0;
        const isFull = terisi >= kuota && kuota > 0;
        const isUnset = kuota === 0;

        if (editingQuotaId === row.id) {
          return (
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setTempQuotaValue(prev => Math.max(0, prev - 1))}
                className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center justify-center hover:bg-slate-50 shadow-xs"
                title="Kurang 1"
              >
                -
              </button>
              <input
                type="number"
                min="0"
                max="999"
                value={tempQuotaValue}
                onChange={(e) => setTempQuotaValue(Number(e.target.value) || 0)}
                className="w-12 h-6 text-center text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-0 focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setTempQuotaValue(prev => prev + 1)}
                className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center justify-center hover:bg-slate-50 shadow-xs"
                title="Tambah 1"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => onSaveQuickQuota(row.id)}
                disabled={isPendingQuota}
                className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg ml-0.5"
                title="Simpan Kuota (Enter)"
              >
                <Check size={14} className={isPendingQuota ? 'animate-spin' : ''} />
              </button>
              <button
                type="button"
                onClick={() => setEditingQuotaId(null)}
                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                title="Batal (Esc)"
              >
                <X size={14} />
              </button>
            </div>
          );
        }

        return (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black text-slate-900 dark:text-white">{terisi}</span>
              <span className="text-xs text-slate-400">/</span>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{kuota} Siswa</span>
              {isHubin && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingQuotaId(row.id);
                    setTempQuotaValue(row.kuota_pkl || 0);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all ml-0.5"
                  title="Quick Edit Kuota"
                >
                  <Edit size={12} />
                </button>
              )}
            </div>
            <div>
              {isUnset ? (
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  Belum Diset
                </span>
              ) : isOver ? (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 px-2 py-0.5 rounded-full">
                  Over ({terisi}/{kuota})
                </span>
              ) : isFull ? (
                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 px-2 py-0.5 rounded-full">
                  Penuh ({kuota})
                </span>
              ) : (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                  Sisa {sisa} Slot
                </span>
              )}
            </div>
          </div>
        );
      }
    },
    {
      key: 'mou_status',
      label: 'Status & Dokumen MoU',
      render: (_: unknown, row: MitraIndustri) => {
        const endDate = row.mou_tanggal_berakhir ? new Date(row.mou_tanggal_berakhir) : null;
        const now = new Date();
        const diffDays = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
        const isExpiring = diffDays !== null && diffDays > 0 && diffDays <= 30;
        const isExpired = row.mou_status === 'EXPIRED' || (diffDays !== null && diffDays <= 0);

        return (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              {row.mou_nomor ? (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isExpired
                    ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900'
                    : isExpiring
                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900'
                }`}>
                  {isExpired ? 'Expired' : isExpiring ? `Sisa ${diffDays} Hari` : 'MoU Aktif'}
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 italic">Belum Ada MoU</span>
              )}
              {row.mou_url && (
                <a
                  href={row.mou_url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 rounded text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                  title="Buka Berkas MoU"
                >
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
            {row.mou_nomor && (
              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-[170px]" title={row.mou_nomor}>
                {row.mou_nomor}
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_: unknown, row: MitraIndustri) => (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
            onClick={() => onSelectDetail(row)}
            title="Lihat Detail Profil"
          >
            <Eye size={16} />
          </Button>

          {isHubin && (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                onClick={() => onEdit(row)}
                title="Edit Profil & MoU Mitra"
              >
                <Edit size={16} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                onClick={() => onSelectMoU(row)}
                title="Riwayat & Perpanjangan Dokumen MoU"
              >
                <History size={16} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                onClick={() => onDelete(row)}
                title="Hapus"
              >
                <Trash2 size={16} />
              </Button>
            </>
          )}

          {isPembimbing && !isHubin && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20 flex items-center gap-1 text-[11px] font-bold rounded-lg border border-amber-200/50 dark:border-amber-900/40"
              onClick={() => onEdit(row)}
              title="Perbarui Kontak Perusahaan"
            >
              <Phone size={12} />
              Update Kontak
            </Button>
          )}
        </div>
      )
    }
  ];

  return cols;
}
