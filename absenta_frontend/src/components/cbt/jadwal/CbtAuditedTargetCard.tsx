import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Eye,
  Plus,
  MessageSquare,
  Users,
  Clock,
  Edit2,
  FileQuestion,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CbtBankSoal } from '@/types/cbt.types';
import { formatTingkatRomawi } from '../bank-soal/cbtAsesmenHelper';
import type { AuditedTargetItem } from './cbtMgmpHelper';

interface CbtAuditedTargetCardProps {
  target: AuditedTargetItem;
  onPeriksaButir: (bank: CbtBankSoal) => void;
  onEditBank: (bank: CbtBankSoal) => void;
  onInputSoal: (bank: CbtBankSoal) => void;
  onCreateForTarget: (target: AuditedTargetItem) => void;
  onNudgeWhatsApp: (target: AuditedTargetItem) => void;
}

export const CbtAuditedTargetCard: React.FC<CbtAuditedTargetCardProps> = ({
  target,
  onPeriksaButir,
  onEditBank,
  onInputSoal,
  onCreateForTarget,
  onNudgeWhatsApp,
}) => {
  const isReady = target.status === 'READY';
  const isUncreated = target.status === 'UNCREATED';
  const isCovered = Boolean(target.isCoveredByMaster);
  const mapelName = target.nama_mapel;

  const guruNames =
    target.assignedTeachers.length > 0
      ? target.assignedTeachers.map((t) => t.nama_guru).join(', ')
      : target.creatorName || 'Guru Pengampu';

  return (
    <div
      className={cn(
        'p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 relative shadow-2xs',
        isReady
          ? isCovered
            ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/20 dark:bg-indigo-950/20'
            : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-violet-300'
          : isUncreated
          ? 'border-rose-300 bg-rose-50/40 dark:bg-rose-950/20 dark:border-rose-800'
          : 'border-amber-200 bg-amber-50/30 dark:bg-amber-950/20 dark:border-amber-800'
      )}
    >
      <div>
        {/* Header Kartu: Tingkat & Status Badge */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Tingkat {formatTingkatRomawi(target.tingkat)} (Kelas {target.tingkat})
          </span>

          {isReady ? (
            <div className="flex items-center gap-1">
              {isCovered ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                  <Users size={11} />
                  <span>Ter-cover MGMP</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  <CheckCircle2 size={11} />
                  <span>Siap ({target.soalCount} Soal)</span>
                </span>
              )}
              {target.isShared && !isCovered && (
                <span
                  className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                  title="Master Soal dibagikan ke rekan guru paralel MGMP"
                >
                  <Users size={10} />
                  <span>MGMP</span>
                </span>
              )}
            </div>
          ) : isUncreated ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
              <AlertCircle size={11} />
              <span>Belum Buat Naskah</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              <FileQuestion size={11} />
              <span>Wadah Kosong (0 Soal)</span>
            </span>
          )}
        </div>

        {/* Judul Mata Pelajaran & Nama Guru */}
        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-snug line-clamp-1">
          {mapelName}
        </h4>
        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
          <Users size={12} className="shrink-0 text-slate-400" />
          <span className="truncate">Pengampu: {guruNames}</span>
        </div>

        {/* Informasi MGMP Coverage jika relevan */}
        {isCovered && target.masterAuthorName && (
          <div className="text-[11px] text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/40 px-2 py-1 rounded-lg mt-1.5 border border-indigo-100 dark:border-indigo-900/40">
            <span>Menggunakan Master milik: <strong>{target.masterAuthorName}</strong> ({target.soalCount} Soal)</span>
          </div>
        )}
        {target.coveredCoTeachers && target.coveredCoTeachers.length > 0 && !isCovered && (
          <div className="text-[10px] text-violet-600 dark:text-violet-400 bg-violet-50/80 dark:bg-violet-950/40 px-2 py-0.5 rounded-md mt-1.5">
            <span>👥 Mencakup: {target.coveredCoTeachers.join(', ')}</span>
          </div>
        )}
      </div>

      {/* Footer Kartu: Detail Durasi & Action Button */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        <div className="text-[11px] text-slate-400 flex items-center gap-2">
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {target.bankSoal?.alokasi_menit ? `${target.bankSoal.alokasi_menit} Menit` : '90 Menit'}
          </span>
          <span className="truncate max-w-[100px] text-slate-400">
            {target.bankSoal ? `Kode: ${target.bankSoal.kode_bank}` : 'Belum Ada Bank'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {!isReady ? (
            <>
              <button
                type="button"
                onClick={() => onNudgeWhatsApp(target)}
                className="py-1 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                title="Kirim pesan pengingat resmi ke WhatsApp Guru Pengampu"
              >
                <MessageSquare size={13} />
                <span>Colek Guru (WA)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (target.bankSoal) {
                    onInputSoal(target.bankSoal);
                  } else {
                    onCreateForTarget(target);
                  }
                }}
                className="py-1 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                title={target.bankSoal ? 'Input naskah butir soal' : 'Buatkan bank soal baru atas nama guru'}
              >
                <Plus size={13} />
                <span>{target.bankSoal ? 'Input Soal' : '+ Buatkan'}</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  if (target.bankSoal) {
                    onPeriksaButir(target.bankSoal);
                  }
                }}
                className="py-1 px-2.5 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 dark:bg-violet-950/30 dark:border-violet-800 dark:text-violet-300 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Periksa dan audit butir soal & kunci jawaban"
              >
                <Eye size={13} />
                <span>Periksa Butir ({target.soalCount})</span>
              </button>

              {target.bankSoal && (
                <button
                  type="button"
                  onClick={() => onEditBank(target.bankSoal!)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  title="Edit pengaturan bank soal"
                >
                  <Edit2 size={13} />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
