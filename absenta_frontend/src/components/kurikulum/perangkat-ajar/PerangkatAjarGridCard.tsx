import React from 'react';
import { Check, Clock, Trash2, XCircle, Edit3 } from 'lucide-react';
import { Card, Button, Badge } from '../../ui';

export interface Subject {
  id: string;
  nama_mapel: string;
  kode_mapel?: string;
}

export interface Teacher {
  id: string;
  nama_guru: string;
  nip?: string;
  user_id?: string;
}

export interface PerangkatAjar {
  id: string;
  judul: string;
  jenis: string;
  status: string;
  file_url: string;
  catatan_reviewer?: string;
  Guru?: Teacher;
  Mapel?: Subject;
  TahunPelajaran?: { id: string; tahun: string };
  Semester?: { id: string; nama_semester: string };
  Reviewer?: { full_name: string };
}

interface PerangkatAjarGridCardProps {
  item: PerangkatAjar;
  jenisLabels: Record<string, string>;
  isKurikulumOrAdmin: boolean;
  currentGuruId?: string;
  onOpenPdf?: ((item: PerangkatAjar) => void) | undefined;
  onReview: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (item: PerangkatAjar) => void;
}

export const PerangkatAjarGridCard: React.FC<PerangkatAjarGridCardProps> = ({
  item,
  jenisLabels,
  isKurikulumOrAdmin,
  currentGuruId,
  onReview,
  onDelete,
  onEdit
}) => {
  const isOwner = Boolean(currentGuruId && item.Guru?.id === currentGuruId);
  const canUserDelete = isKurikulumOrAdmin || isOwner;

  return (
    <Card className="p-5 border border-slate-100 dark:border-slate-800/80 shadow-sm relative overflow-hidden flex flex-col justify-between group hover:shadow-md transition-shadow dark:bg-slate-900/60 bg-slate-50/50 dark:bg-slate-900/30">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Badge className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-200/50 dark:border-slate-700/50">
            {jenisLabels[item.jenis] || item.jenis}
          </Badge>
          {item.status === 'APPROVED' && (
            <Badge className="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border-none font-black flex items-center">
              <Check size={12} className="mr-1" /> APPROVED
            </Badge>
          )}
          {item.status === 'REJECTED' && (
            <Badge className="bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 border-none font-black flex items-center">
              <XCircle size={12} className="mr-1" /> REJECTED
            </Badge>
          )}
          {item.status === 'PENDING' && (
            <Badge className="bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 border-none font-black flex items-center">
              <Clock size={12} className="mr-1" /> PENDING
            </Badge>
          )}
        </div>

        <div>
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
            {item.judul}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 font-semibold">
            Guru: {item.Guru?.nama_guru || '-'} | NIP. {item.Guru?.nip || '-'}
          </p>
          <p className="text-[11px] text-slate-400 font-semibold">
            Mapel: {item.Mapel?.nama_mapel || '-'} ({item.Mapel?.kode_mapel || '-'})
          </p>
        </div>

        {item.catatan_reviewer && (
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl text-[11px] text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800/80 italic">
            "{item.catatan_reviewer}"
            <p className="text-[9px] text-slate-400 mt-1 font-semibold not-italic">
              — Verifikator: {item.Reviewer?.full_name || 'Admin'}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 gap-2">
        {onEdit && (
          <Button
            type="button"
            onClick={() => onEdit(item)}
            variant="outline"
            size="sm"
            className="text-xs font-bold text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-950/20 flex items-center gap-1 shadow-sm"
          >
            <Edit3 size={13} />
            <span>BUKA EDITOR</span>
          </Button>
        )}

        {isKurikulumOrAdmin && (
          <Button
            type="button"
            onClick={() => onReview(item.id)}
            variant="outline"
            size="sm"
            className="text-xs font-bold border-slate-200 dark:border-slate-800"
          >
            VERIFIKASI
          </Button>
        )}

        {canUserDelete && (
          <Button
            type="button"
            onClick={() => onDelete(item.id)}
            variant="ghost"
            size="sm"
            className="text-xs font-bold text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 p-2"
            aria-label="Hapus perangkat ajar"
          >
            <Trash2 size={14} />
          </Button>
        )}
      </div>
    </Card>
  );
};
