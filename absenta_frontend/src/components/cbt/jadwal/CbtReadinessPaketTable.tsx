import React from 'react';
import { BookOpen, CheckCircle2, AlertCircle, Plus, Eye } from 'lucide-react';
import type { CbtBankSoal } from '@/types/cbt.types';
import { formatTingkatRomawi } from '../bank-soal/cbtAsesmenHelper';
import { MapelPaketTeoriItem } from './cbtMgmpHelper';
import { useIsMobile } from '@/hooks/useIsMobile';

interface CbtReadinessPaketTableProps {
  items: MapelPaketTeoriItem[];
  onPeriksaButir: (bank: CbtBankSoal) => void;
  onCreateForMapel: (paket: MapelPaketTeoriItem) => void;
}

export const CbtReadinessPaketTable: React.FC<CbtReadinessPaketTableProps> = ({
  items,
  onPeriksaButir,
  onCreateForMapel,
}) => {
  const isMobile = useIsMobile(768);

  if (items.length === 0) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-400">
        Tidak ada data paket mata pelajaran pada filter ini.
      </div>
    );
  }

  // ── Mode Mobile: High-Density Card Deck (Pilar 30 Anti-Overlapping) ──
  if (isMobile) {
    return (
      <div className="space-y-2.5 w-full max-w-full min-w-0" role="region" aria-label="Daftar Teori Paket Mapel Seluler">
        {items.map((paket, idx) => (
          <div
            key={paket.id}
            className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs space-y-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-mono font-bold text-slate-400">#{idx + 1}</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    Tingkat {formatTingkatRomawi(paket.tingkat)}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 mt-1 leading-snug">
                  {paket.nama_mapel}
                </h4>
              </div>

              <div className="shrink-0">
                {paket.isReady ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 size={12} />
                    <span>{paket.soalCount} Soal</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-800">
                    <AlertCircle size={12} />
                    <span>Belum Ada</span>
                  </span>
                )}
              </div>
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Pengampu: </span>
              <span>{paket.assignedTeachers.map((t) => t.nama_guru).join(', ') || '-'}</span>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
              {paket.bankSoal ? (
                <button
                  type="button"
                  onClick={() => onPeriksaButir(paket.bankSoal!)}
                  aria-label={`Periksa soal ${paket.nama_mapel}`}
                  className="w-full sm:w-auto min-h-[40px] px-3.5 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Eye size={13} />
                  <span>Periksa Butir Soal</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onCreateForMapel(paket)}
                  aria-label={`Buatkan bank soal ${paket.nama_mapel}`}
                  className="w-full sm:w-auto min-h-[40px] px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus size={13} />
                  <span>+ Buatkan Soal</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Mode Desktop: Tabular Grid Berkelanjutan ──
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs w-full max-w-full min-w-0">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs" role="table" aria-label="Tabel Teori Paket Mapel CBT">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 font-bold">
              <th scope="col" className="py-2.5 px-3 w-10 text-center">No</th>
              <th scope="col" className="py-2.5 px-3">Mata Pelajaran Ujian</th>
              <th scope="col" className="py-2.5 px-3 w-28 text-center">Tingkat</th>
              <th scope="col" className="py-2.5 px-3">Guru Pengampu Terdaftar</th>
              <th scope="col" className="py-2.5 px-3 w-40 text-center">Status Paket Ujian</th>
              <th scope="col" className="py-2.5 px-3 w-32 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {items.map((paket, idx) => (
              <tr key={paket.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                <td className="py-2.5 px-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-100">
                  {paket.nama_mapel}
                </td>
                <td className="py-2.5 px-3 text-center">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    Tingkat {formatTingkatRomawi(paket.tingkat)}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                  {paket.assignedTeachers.map((t) => t.nama_guru).join(', ') || '-'}
                </td>
                <td className="py-2.5 px-3 text-center">
                  {paket.isReady ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 size={12} />
                      <span>Tersedia ({paket.soalCount} Soal)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                      <AlertCircle size={12} />
                      <span>Belum Ada Paket</span>
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-right">
                  {paket.bankSoal ? (
                    <button
                      type="button"
                      onClick={() => onPeriksaButir(paket.bankSoal!)}
                      aria-label={`Periksa soal ${paket.nama_mapel}`}
                      className="py-1 px-2.5 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 text-[11px] font-bold cursor-pointer"
                    >
                      Periksa
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onCreateForMapel(paket)}
                      aria-label={`Buatkan bank soal ${paket.nama_mapel}`}
                      className="py-1 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 text-[11px] font-bold cursor-pointer"
                    >
                      + Buatkan
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
