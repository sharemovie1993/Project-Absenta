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
import { formatLocalTimeFromISO } from '../../../utils/attendance/time';
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
    <div className="space-y-4">
      {/* ── DESKTOP VIEW: TABEL AGENDA RESMI (Tampil di Tablet/PC md:) ── */}
      <div className="hidden md:block rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
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
                
                const dateFormatted = (sesi as any).tanggal_formatted || (sesi.tanggal ? format(new Date(sesi.tanggal), 'dd MMM yyyy', { locale: id }) : '-');
                const dayFormatted = (sesi as any).hari || (sesi.tanggal ? format(new Date(sesi.tanggal), 'EEEE', { locale: id }) : '');
                const jamMulai = sesi.jam_mulai || '--:--';
                const jamSelesai = sesi.jam_selesai || '--:--';

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
                      <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200">
                        <Clock size={12} className="text-blue-500 shrink-0" />
                        <span>{jamMulai} - {jamSelesai} WIB</span>
                      </div>
                      {sesi.slot_kbm ? (
                        <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold pl-4 mt-0.5">
                          Jam Ke-{sesi.slot_kbm}
                        </div>
                      ) : sesi.jam_label ? (
                        <div className="text-[10px] text-slate-400 font-medium pl-4 mt-0.5">
                          {sesi.jam_label}
                        </div>
                      ) : null}
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

      {/* ── MOBILE VIEW: COMPACT AGENDA FEED CARDS (Tampil di Layar HP < md) ── */}
      <div className="block md:hidden space-y-3">
        {sessions.map((sesi, idx) => {
          const progres = sesi.ProgresMateri;
          const hasJournal = Boolean(progres && (progres.judul_materi || progres.deskripsi));
          const isLive = sesi.status === 'BERLANGSUNG' || sesi.isLive;
          
          const dateFormatted = (sesi as any).tanggal_formatted || (sesi.tanggal ? format(new Date(sesi.tanggal), 'dd MMM yyyy', { locale: id }) : '-');
          const dayFormatted = (sesi as any).hari || (sesi.tanggal ? format(new Date(sesi.tanggal), 'EEEE', { locale: id }) : '');
          const jamMulai = sesi.jam_mulai || '--:--';
          const jamSelesai = sesi.jam_selesai || '--:--';

          const sum = sesi.summary || {};
          const totalHadir = sum.HADIR || 0;
          const totalSiswa = sum.TOTAL || sum.total || (totalHadir + (sum.SAKIT || 0) + (sum.IZIN || 0) + (sum.ALPA || 0));

          return (
            <div
              key={sesi.id}
              className={cn(
                "rounded-2xl border transition-all shadow-xs overflow-hidden bg-white dark:bg-slate-900",
                isLive
                  ? "border-emerald-300 dark:border-emerald-800 ring-2 ring-emerald-500/20"
                  : hasJournal
                  ? "border-slate-200/80 dark:border-slate-800"
                  : "border-amber-300/80 dark:border-amber-900/60 bg-amber-50/10 dark:bg-amber-950/5"
              )}
            >
              {/* Card Header: Tanggal, Waktu & Jam Pelajaran */}
              <div className="px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">
                    {dayFormatted ? `${dayFormatted}, ` : ''}{dateFormatted}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  <Clock size={11} className="text-blue-500" />
                  <span>{jamMulai} - {jamSelesai}</span>
                  {sesi.slot_kbm && (
                    <span className="px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-sans">
                      Jam Ke-{sesi.slot_kbm}
                    </span>
                  )}
                </div>
              </div>

              {/* Card Body: Kelas, Mapel, Presensi & Materi */}
              <div className="p-3.5 space-y-2.5">
                {/* Rombel, Mapel & Guru */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-black text-xs border border-blue-200/60 dark:border-blue-800/60">
                        {sesi.Kelas?.nama_kelas || 'Kelas'}
                      </span>
                      <h4 className="font-black text-slate-900 dark:text-white text-xs">
                        {sesi.Mapel?.nama_mapel || sesi.jenis_kegiatan || '-'}
                      </h4>
                    </div>
                    {isManager && sesi.Guru?.nama_guru && (
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        👨‍🏫 {sesi.Guru.nama_guru}
                      </p>
                    )}
                  </div>

                  {/* Presensi Quick Pill */}
                  <button
                    type="button"
                    onClick={() => onViewDetail(sesi)}
                    className="shrink-0 px-2 py-1 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-right cursor-pointer hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center gap-1 text-[11px] font-extrabold text-slate-700 dark:text-slate-200">
                      <Users size={11} className="text-slate-400" />
                      <span>{totalHadir}/{totalSiswa}</span>
                    </div>
                    <div className="text-[9px] font-mono text-slate-400">
                      {((sum.SAKIT || 0) > 0 || (sum.IZIN || 0) > 0 || (sum.ALPA || 0) > 0) ? (
                        <span>
                          {sum.SAKIT ? `S:${sum.SAKIT} ` : ''}
                          {sum.IZIN ? `I:${sum.IZIN} ` : ''}
                          {sum.ALPA ? <strong className="text-rose-500">A:{sum.ALPA}</strong> : ''}
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">100% Hadir</span>
                      )}
                    </div>
                  </button>
                </div>

                {/* Materi Pokok & Capaian Section */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  {hasJournal ? (
                    <div className="space-y-1 bg-slate-50/60 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-extrabold text-xs text-slate-900 dark:text-white line-clamp-1">
                          📖 {progres?.judul_materi}
                        </span>
                        {typeof progres?.pencapaian_persen === 'number' && progres.pencapaian_persen > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-black text-[10px]">
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
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 italic line-clamp-1 pt-0.5">
                          ⚠️ {progres.kendala}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 text-xs font-bold">
                        <AlertCircle size={14} className="text-amber-500 shrink-0" />
                        <span>Materi KBM Belum Diisi</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Footer */}
                <div className="pt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {hasJournal ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={12} /> Jurnal Terisi
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                        <AlertCircle size={12} /> Belum Diisi
                      </span>
                    )}
                  </div>

                  <div>
                    {hasJournal ? (
                      <button
                        type="button"
                        onClick={() => onOpenJournal(sesi.id, progres)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        {isManager ? <Eye size={12} /> : <Edit3 size={12} />}
                        <span>{isManager ? 'Lihat Jurnal' : 'Koreksi'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onOpenJournal(sesi.id, null)}
                        disabled={isManager}
                        className={cn(
                          "px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-xs",
                          isManager
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                            : "bg-amber-500 hover:bg-amber-600 active:scale-98 text-white shadow-amber-500/20"
                        )}
                      >
                        <Edit3 size={12} />
                        <span>+ Isi Jurnal KBM</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
