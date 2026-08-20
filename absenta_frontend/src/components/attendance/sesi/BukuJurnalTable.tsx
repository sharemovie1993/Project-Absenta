import React from 'react';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { 
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  Eye, 
  Clock, 
  Users, 
  Sparkles,
  FileText
} from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface SesiAjarItem {
  id: string;
  tanggal: string;
  waktu_mulai: string;
  waktu_selesai: string;
  jam_mulai?: string;
  jam_selesai?: string;
  jam_label?: string;
  slot_kbm?: number;
  total_jp?: number;
  jenis_kegiatan: string;
  status?: 'BERLANGSUNG' | 'SELESAI' | 'MENDATANG' | string;
  isLive?: boolean;
  Guru?: { nama_guru: string };
  Kelas?: { nama_kelas: string };
  Mapel?: { nama_mapel: string; kode_mapel?: string };
  ProgresMateri?: { 
    id?: string;
    judul_materi: string; 
    deskripsi?: string; 
    pencapaian_persen: number; 
    kendala?: string;
    kegiatan?: string;
  } | null;
  summary?: { 
    HADIR?: number; 
    TOTAL?: number; 
    SAKIT?: number; 
    IZIN?: number; 
    ALPA?: number; 
    TERLAMBAT?: number;
    total?: number;
  };
}

interface BukuJurnalTableProps {
  sessions: SesiAjarItem[];
  isLoading?: boolean;
  onOpenJournal: (sesiId: string, initialData?: any) => void;
  onViewDetail: (sesi: SesiAjarItem) => void;
  isManager?: boolean;
}

export const BukuJurnalTable: React.FC<BukuJurnalTableProps> = ({
  sessions,
  isLoading = false,
  onOpenJournal,
  onViewDetail,
  isManager = false,
}) => {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-bold text-slate-500">Memuat Buku Agenda Jurnal...</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-12 text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-500 flex items-center justify-center mx-auto">
          <BookOpen size={28} />
        </div>
        <div>
          <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Belum Ada Catatan Jurnal
          </h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Tidak ada data sesi mengajar yang sesuai dengan filter periode atau kelas yang dipilih.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50/90 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-3.5 text-center w-12">No</th>
              <th className="py-3 px-3.5 min-w-[130px]">Hari & Tanggal</th>
              <th className="py-3 px-3 min-w-[120px]">Waktu / Jam</th>
              {isManager && <th className="py-3 px-3.5 min-w-[140px]">Guru Pengajar</th>}
              <th className="py-3 px-3.5 min-w-[140px]">Kelas & Mapel</th>
              <th className="py-3 px-4 min-w-[260px]">Materi Pokok & Capaian Pembelajaran</th>
              <th className="py-3 px-3.5 min-w-[130px]">Presensi Siswa</th>
              <th className="py-3 px-3.5 text-center w-28">Status & Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {sessions.map((sesi, idx) => {
              const progres = sesi.ProgresMateri;
              const hasJournal = Boolean(progres && (progres.judul_materi || progres.deskripsi));
              const isLive = sesi.status === 'BERLANGSUNG' || sesi.isLive;
              
              let dateFormatted = '-';
              let dayFormatted = '';
              try {
                if (sesi.tanggal) {
                  const d = new Date(sesi.tanggal);
                  dateFormatted = format(d, 'dd MMM yyyy', { locale: id });
                  dayFormatted = format(d, 'EEEE', { locale: id });
                }
              } catch (_) {}

              const jamMulai = sesi.jam_mulai || (sesi.waktu_mulai ? String(sesi.waktu_mulai).substring(11, 16) : '--:--');
              const jamSelesai = sesi.jam_selesai || (sesi.waktu_selesai ? String(sesi.waktu_selesai).substring(11, 16) : '--:--');
              const slotLabel = sesi.jam_label || (sesi.slot_kbm ? `Slot ${sesi.slot_kbm}` : `${jamMulai} - ${jamSelesai}`);

              const sum = sesi.summary || {};
              const totalHadir = sum.HADIR || 0;
              const totalSiswa = sum.TOTAL || sum.total || (totalHadir + (sum.SAKIT || 0) + (sum.IZIN || 0) + (sum.ALPA || 0));

              return (
                <tr 
                  key={sesi.id}
                  className={cn(
                    "hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors",
                    isLive ? "bg-emerald-50/30 dark:bg-emerald-950/20" : hasJournal ? "" : "bg-amber-50/20 dark:bg-amber-950/10"
                  )}
                >
                  {/* 1. NO */}
                  <td className="py-3 px-3.5 text-center font-bold text-slate-400 font-mono text-[11px]">
                    {idx + 1}
                  </td>

                  {/* 2. HARI & TANGGAL */}
                  <td className="py-3 px-3.5 font-medium">
                    <div className="font-bold text-slate-800 dark:text-slate-100">
                      {dateFormatted}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      {dayFormatted}
                    </div>
                  </td>

                  {/* 3. WAKTU / JAM */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      <Clock size={11} className="text-slate-400 shrink-0" />
                      <span>{slotLabel}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono pl-4">
                      {jamMulai} - {jamSelesai} WIB
                    </div>
                  </td>

                  {/* MANAGER ONLY: GURU */}
                  {isManager && (
                    <td className="py-3 px-3.5">
                      <span className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                        {sesi.Guru?.nama_guru || '-'}
                      </span>
                    </td>
                  )}

                  {/* 4. KELAS & MAPEL */}
                  <td className="py-3 px-3.5">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-black text-[11px] border border-blue-200/60 dark:border-blue-800/60 mb-0.5">
                      {sesi.Kelas?.nama_kelas || 'Kelas'}
                    </span>
                    <div className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                      {sesi.Mapel?.nama_mapel || sesi.jenis_kegiatan || '-'}
                    </div>
                  </td>

                  {/* 5. MATERI POKOK & CP */}
                  <td className="py-3 px-4">
                    {hasJournal ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-slate-900 dark:text-white">
                            {progres?.judul_materi}
                          </span>
                          {typeof progres?.pencapaian_persen === 'number' && progres.pencapaian_persen > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-black text-[9px]">
                              {progres.pencapaian_persen}%
                            </span>
                          )}
                        </div>
                        {progres?.deskripsi && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {progres.deskripsi}
                          </p>
                        )}
                        {progres?.kendala && (
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 italic line-clamp-1">
                            Catatan: {progres.kendala}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-[11px]">
                        <AlertCircle size={13} className="shrink-0" />
                        <span>Materi KBM Belum Diisi</span>
                      </div>
                    )}
                  </td>

                  {/* 6. PRESENSI SISWA */}
                  <td className="py-3 px-3.5">
                    <button
                      type="button"
                      onClick={() => onViewDetail(sesi)}
                      className="text-left group cursor-pointer"
                      title="Klik untuk melihat daftar hadir siswa"
                    >
                      <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 transition-colors">
                        <Users size={11} className="text-slate-400" />
                        <span>Hadir: <strong className="text-emerald-600 dark:text-emerald-400">{totalHadir}</strong> / {totalSiswa}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono mt-0.5">
                        {((sum.SAKIT || 0) > 0) && <span className="text-amber-500">S:{sum.SAKIT} </span>}
                        {((sum.IZIN || 0) > 0) && <span className="text-blue-500">I:{sum.IZIN} </span>}
                        {((sum.ALPA || 0) > 0) && <span className="text-rose-500 font-bold">A:{sum.ALPA}</span>}
                        {(!sum.SAKIT && !sum.IZIN && !sum.ALPA && totalHadir === totalSiswa && totalSiswa > 0) && (
                          <span className="text-emerald-500 font-bold">Nihil Absen</span>
                        )}
                      </div>
                    </button>
                  </td>

                  {/* 7. STATUS & AKSI */}
                  <td className="py-3 px-3.5 text-center">
                    {hasJournal ? (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onOpenJournal(sesi.id, progres)}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-600 dark:text-blue-400 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors border border-blue-200/60 dark:border-blue-800/60"
                          title={isManager ? "Lihat Jurnal" : "Koreksi Jurnal"}
                        >
                          {isManager ? <Eye size={11} /> : <Edit3 size={11} />}
                          <span>{isManager ? 'Lihat' : 'Edit'}</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onOpenJournal(sesi.id, null)}
                        disabled={isManager}
                        className={cn(
                          "px-2.5 py-1 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-all shadow-xs",
                          isManager 
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                            : "bg-amber-500 hover:bg-amber-600 text-white"
                        )}
                        title="Isi jurnal untuk sesi ini"
                      >
                        <Edit3 size={11} />
                        <span>+ Isi Jurnal</span>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
