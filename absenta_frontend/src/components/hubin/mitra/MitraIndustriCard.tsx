import React from 'react';
import type { MitraIndustri } from '@/api/hubin.api';
import { 
  Building2, 
  MapPin, 
  Phone, 
  FileText, 
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
import type { JurusanItem } from './types';
import { getWhatsAppUrl, renderJurusanBadges } from './mitraUtils';

export interface MitraIndustriCardProps {
  row: MitraIndustri;
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

export const MitraIndustriCard: React.FC<MitraIndustriCardProps> = ({
  row,
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
}) => {
  const phone = row.kontak || row.pic_telepon;
  const waUrl = getWhatsAppUrl(phone);

  return (
    <div
      key={row.id}
      className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-base shrink-0 border border-indigo-100 dark:border-indigo-900/40 overflow-hidden">
            {row.logo_url ? (
              <img
                src={resolveProfilePhotoUrl(row.logo_url) || ''}
                alt={row.nama}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <Building2 size={20} />
            )}
          </div>
          <div className="space-y-0.5 min-w-0">
            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-tight truncate">
              {row.nama}
            </h4>
            <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
              <Building2 size={11} />
              {row.bidang || 'Tanpa Bidang'}
            </p>
            {renderJurusanBadges(row.kompetensi_keahlian, jurusanList)}
          </div>
        </div>
        {row.latitude && row.longitude ? (
          <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/50">
            <Navigation size={10} /> Geofenced
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200/50">
            ⚠️ Belum Pin
          </span>
        )}
      </div>

      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
        {row.alamat && (
          <div className="flex items-start gap-1 text-slate-600 dark:text-slate-400 text-[11px]">
            <MapPin size={13} className="mt-0.5 text-slate-400 shrink-0" />
            <span className="line-clamp-2">{row.alamat}</span>
          </div>
        )}
        
        {/* Kontak & WhatsApp */}
        {(row.kontak || row.pic_telepon) && (
          <div className="flex items-center justify-between text-[11px] pt-1">
            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
              <Phone size={12} className="text-slate-400 shrink-0" />
              <span>{row.kontak || row.pic_telepon}</span>
              {row.pic_nama && <span className="text-[10px] text-slate-400">({row.pic_nama})</span>}
            </div>
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 transition-colors"
              >
                <MessageCircle size={10} className="text-emerald-600" /> WhatsApp
              </a>
            )}
          </div>
        )}

        {/* Kuota & Keterisian with Mobile Quick Edit */}
        <div className="flex flex-col gap-1.5 pt-1.5 border-t border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400">Kuota Siswa PKL:</span>
            {editingQuotaId === row.id ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setTempQuotaValue(prev => Math.max(0, prev - 1))}
                  className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center justify-center"
                >
                  -
                </button>
                <input
                  type="number"
                  min="0"
                  max="999"
                  value={tempQuotaValue}
                  onChange={(e) => setTempQuotaValue(Number(e.target.value) || 0)}
                  className="w-10 h-6 text-center text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-0"
                />
                <button
                  type="button"
                  onClick={() => setTempQuotaValue(prev => prev + 1)}
                  className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center justify-center"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => onSaveQuickQuota(row.id)}
                  disabled={isPendingQuota}
                  className="p-1 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg ml-0.5"
                  title="Simpan"
                >
                  <Check size={13} className={isPendingQuota ? 'animate-spin' : ''} />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingQuotaId(null)}
                  className="p-1 text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg"
                  title="Batal"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                  {row._count?.SiswaPkl || 0} / {row.kuota_pkl || 0} Siswa
                </span>
                {isHubin && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingQuotaId(row.id);
                      setTempQuotaValue(row.kuota_pkl || 0);
                    }}
                    className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full hover:bg-indigo-100 border border-indigo-200/60"
                    title="Quick Edit Kuota"
                  >
                    Ubah
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center justify-end">
            {(() => {
              const terisi = row._count?.SiswaPkl || 0;
              const kuota = row.kuota_pkl || 0;
              const sisa = Math.max(0, kuota - terisi);
              if (kuota === 0) {
                return <span className="text-[9px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">Belum Diset</span>;
              }
              if (terisi > kuota) {
                return <span className="text-[9px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 px-2 py-0.5 rounded-full">Over ({terisi}/{kuota})</span>;
              }
              if (terisi >= kuota) {
                return <span className="text-[9px] font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 px-2 py-0.5 rounded-full">Penuh ({kuota})</span>;
              }
              return <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 px-2 py-0.5 rounded-full">Sisa {sisa} Slot</span>;
            })()}
          </div>
        </div>

        {/* Status MoU & Dokumen */}
        <div className="flex flex-col gap-1.5 pt-1.5 border-t border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400">Status MoU:</span>
            <div className="flex items-center gap-1.5">
              {row.mou_nomor ? (
                (() => {
                  const now = new Date();
                  const endDate = row.mou_tanggal_berakhir ? new Date(row.mou_tanggal_berakhir) : null;
                  const diffDays = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
                  const isExpiring = diffDays !== null && diffDays > 0 && diffDays <= 30;
                  const isExpired = row.mou_status === 'EXPIRED' || (diffDays !== null && diffDays <= 0);

                  return (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                      isExpired
                        ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900'
                        : isExpiring
                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        isExpired ? 'bg-rose-500' : isExpiring ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                      }`} />
                      {isExpired ? 'Expired' : isExpiring ? `Sisa ${diffDays} Hari` : 'MoU Aktif'}
                    </span>
                  );
                })()
              ) : (
                <span className="text-[10px] text-slate-400 italic">Belum Ada MoU</span>
              )}
              {row.mou_url && (
                <a
                  href={row.mou_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full hover:bg-emerald-100"
                >
                  <FileText size={10} /> Dokumen <ExternalLink size={8} />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-1 pt-2 border-t border-slate-100 dark:border-slate-800">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-[11px] font-bold"
          onClick={() => onSelectDetail(row)}
        >
          <Eye size={13} className="mr-1" /> Detail
        </Button>

        {isHubin && (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-[11px] font-bold"
              onClick={() => onEdit(row)}
            >
              <Edit size={13} className="mr-1" /> Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-[11px] font-bold"
              onClick={() => onSelectMoU(row)}
            >
              <History size={13} className="mr-1" /> MoU
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20"
              onClick={() => onDelete(row)}
              title="Hapus"
            >
              <Trash2 size={13} />
            </Button>
          </>
        )}

        {isPembimbing && !isHubin && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20 flex items-center gap-1 text-[11px] font-bold rounded-lg border border-amber-200/50"
            onClick={() => onEdit(row)}
          >
            <Phone size={12} />
            Update Kontak
          </Button>
        )}
      </div>
    </div>
  );
};

export default MitraIndustriCard;
