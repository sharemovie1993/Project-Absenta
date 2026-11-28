import React, { useState, useMemo } from 'react';
import { Modal, Button } from '@/components/ui';
import {
  Trash2,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  Layers,
  GraduationCap,
  Users,
  Search,
  BookOpen,
} from 'lucide-react';
import type { CbtJadwalUjian } from '@/types/cbt.types';
import type { KelasRoomMapping } from './cbtOrchestratorHelper';
import { cn } from '@/lib/utils';

export interface CbtResetPublishedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isResetting: boolean;
  schedules: CbtJadwalUjian[];
  eventName?: string;
  roomMappings?: KelasRoomMapping[];
}

export const CbtResetPublishedModal: React.FC<CbtResetPublishedModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isResetting,
  schedules = [],
  eventName = 'Ujian CBT',
  roomMappings = [],
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Buat lookup nama kelas & ruangan dari roomMappings
  const kelasMap = useMemo(() => {
    const map = new Map<string, { nama_kelas: string; roomCode: string; tingkat: number }>();
    roomMappings.forEach((rm) => {
      map.set(rm.kelas_id, {
        nama_kelas: rm.nama_kelas,
        roomCode: rm.slot_ruang, // Perbaikan: gunakan slot_ruang bukan roomCode (field tidak ada di KelasRoomMapping)
        tingkat: rm.tingkat,
      });
    });
    return map;
  }, [roomMappings]);

  // Statistik Dampak
  const stats = useMemo(() => {
    const totalSchedules = schedules.length;
    const uniqueMapels = new Set<string>();
    const uniqueClasses = new Set<string>();
    const uniqueBanks = new Map<string, { judul: string; guru: string; jumlahSoal: number; tingkat: string }>();

    schedules.forEach((s) => {
      const mapelName = s.BankSoal?.Mapel?.nama_mapel || s.display_mapel || 'Mata Pelajaran';
      uniqueMapels.add(mapelName);

      if (Array.isArray(s.target_kelas_ids)) {
        s.target_kelas_ids.forEach((kId) => {
          const kInfo = kelasMap.get(kId);
          uniqueClasses.add(kInfo ? kInfo.nama_kelas : kId);
        });
      }

      if (s.bank_soal_id && s.BankSoal) {
        if (!uniqueBanks.has(s.bank_soal_id)) {
          uniqueBanks.set(s.bank_soal_id, {
            judul: s.BankSoal.judul || s.BankSoal.kode_bank,
            guru: s.BankSoal.Guru?.nama_guru || 'Guru Pengampu',
            jumlahSoal: s.BankSoal.jumlah_soal || 0,
            tingkat: s.BankSoal.tingkat || '-',
          });
        }
      }
    });

    return {
      totalSchedules,
      totalMapels: uniqueMapels.size,
      totalClasses: uniqueClasses.size,
      totalBanks: uniqueBanks.size,
      banksList: Array.from(uniqueBanks.values()),
    };
  }, [schedules, kelasMap]);

  // Filter daftar jadwal untuk preview
  const filteredSchedules = useMemo(() => {
    if (!searchQuery.trim()) return schedules;
    const q = searchQuery.toLowerCase();
    return schedules.filter((s) => {
      const mapel = (s.BankSoal?.Mapel?.nama_mapel || s.display_mapel || '').toLowerCase();
      const sesi = (s.nama_sesi || '').toLowerCase();
      const bankJudul = (s.BankSoal?.judul || '').toLowerCase();
      const guru = (s.BankSoal?.Guru?.nama_guru || '').toLowerCase();
      const room = ((s.setting_keamanan as any)?.ruang_ujian || (s.setting_keamanan as any)?.room_code || '').toLowerCase();
      return (
        mapel.includes(q) ||
        sesi.includes(q) ||
        bankJudul.includes(q) ||
        guru.includes(q) ||
        room.includes(q)
      );
    });
  }, [schedules, searchQuery]);

  // Format tanggal ke Bahasa Indonesia
  const formatScheduleDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatScheduleTime = (startStr?: string, endStr?: string) => {
    if (!startStr) return '-';
    try {
      const start = new Date(startStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const end = endStr
        ? new Date(endStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        : '';
      return end ? `${start} - ${end}` : start;
    } catch {
      return startStr;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isResetting) onClose();
      }}
      size="2xl"
      title={
        <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
          <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
              Pratinjau Dampak & Konfirmasi Kosongkan Sesi Terbit
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Event: <span className="font-semibold text-slate-700 dark:text-slate-300">{eventName}</span>
            </p>
          </div>
        </div>
      }
    >
      <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
        {/* 1. Jaminan Keamanan Bank Soal Guru (Highlight Hijau/Emerald) */}
        <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck size={18} />
          </div>
          <div className="space-y-1 text-xs">
            <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">
              Perlindungan Penuh: Seluruh Wadah Bank Soal Guru Tetap Utuh & Terlindungi
            </h4>
            <p className="text-emerald-800/90 dark:text-emerald-300/90 leading-relaxed">
              Aksi ini <strong>HANYA menghapus jadwal sesi terbit</strong> (slot waktu, penugasan peserta, dan ruangan) agar panitia dapat menyusun atau menerbitkan ulang jadwal dari nol secara bersih.{' '}
              <span className="font-bold underline decoration-emerald-500">
                Wadah Bank Soal dan butir soal milik guru pengampu (baik yang sudah terisi maupun yang masih 0 soal) TIDAK AKAN DIHAPUS.
              </span>
            </p>
          </div>
        </div>

        {/* 2. Kartu Metrik Dampak Ringkasan */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40">
            <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 mb-1">
              <Calendar size={13} />
              <span className="text-[11px] font-bold uppercase tracking-wider">Sesi Terbit</span>
            </div>
            <p className="text-xl font-black text-rose-700 dark:text-rose-300 font-mono">
              {stats.totalSchedules} <span className="text-xs font-semibold text-rose-500">Sesi</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Akan dikosongkan</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 mb-1">
              <Layers size={13} />
              <span className="text-[11px] font-bold uppercase tracking-wider">Mata Pelajaran</span>
            </div>
            <p className="text-xl font-black text-slate-800 dark:text-slate-100 font-mono">
              {stats.totalMapels} <span className="text-xs font-semibold text-slate-500">Mapel</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Tercakup dalam jadwal</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 mb-1">
              <GraduationCap size={13} />
              <span className="text-[11px] font-bold uppercase tracking-wider">Rombel Kelas</span>
            </div>
            <p className="text-xl font-black text-slate-800 dark:text-slate-100 font-mono">
              {stats.totalClasses} <span className="text-xs font-semibold text-slate-500">Kelas</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Penugasan ruang dilepas</p>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 mb-1">
              <ShieldCheck size={13} />
              <span className="text-[11px] font-bold uppercase tracking-wider">Bank Soal Guru</span>
            </div>
            <p className="text-xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
              {stats.totalBanks} <span className="text-xs font-semibold text-emerald-600">Bank</span>
            </p>
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">✓ 100% Tetap Aman</p>
          </div>
        </div>

        {/* 3. Daftar Rincian Sesi yang Akan Dikosongkan */}
        <div className="space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Calendar size={14} className="text-slate-500" />
              <span>Rincian Sesi Jadwal yang Akan Dihapus ({filteredSchedules.length} Sesi):</span>
            </h4>
            <div className="relative w-full sm:w-64">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari mapel, sesi, ruang..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-7 pl-8 pr-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700/80 overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
            <div className="max-h-64 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSchedules.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Tidak ada sesi jadwal yang cocok dengan kata kunci pencarian.
                </div>
              ) : (
                filteredSchedules.map((s, idx) => {
                  const mapelName = s.BankSoal?.Mapel?.nama_mapel || s.display_mapel || 'Mata Pelajaran';
                  const roomCode = (s.setting_keamanan as any)?.ruang_ujian || (s.setting_keamanan as any)?.room_code || 'Semua Ruang';
                  const guruName = s.BankSoal?.Guru?.nama_guru || 'Guru Pengampu';
                  const jumlahSoal = s.BankSoal?.jumlah_soal || 0;
                  const kelasNames = Array.isArray(s.target_kelas_ids)
                    ? s.target_kelas_ids
                        .map((id) => kelasMap.get(id)?.nama_kelas || id)
                        .slice(0, 3)
                        .join(', ') + (s.target_kelas_ids.length > 3 ? ` +${s.target_kelas_ids.length - 3} lainnya` : '')
                    : '-';

                  return (
                    <div
                      key={s.id || idx}
                      className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors text-xs"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-white truncate">
                            {mapelName}
                          </span>
                          {s.BankSoal?.tingkat && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              Kelas {s.BankSoal.tingkat}
                            </span>
                          )}
                          <span className="text-[11px] font-semibold text-slate-500">
                            • {s.nama_sesi || 'Sesi Ujian'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                          <span>
                            📅 {formatScheduleDate(s.tanggal_mulai)} ({formatScheduleTime(s.tanggal_mulai, s.tanggal_selesai)})
                          </span>
                          <span>•</span>
                          <span>🏫 Ruang: <strong>{roomCode}</strong></span>
                          <span>•</span>
                          <span>👥 {kelasNames}</span>
                        </div>
                      </div>

                      {/* Info Bank Soal Terhubung & Jaminan Keamanan */}
                      <div className="shrink-0 flex sm:flex-col sm:items-end items-center justify-between gap-1 border-t sm:border-t-0 pt-1.5 sm:pt-0 border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                          <BookOpen size={11} className="text-slate-400" />
                          <span className="truncate max-w-[160px]" title={guruName}>
                            {guruName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-full text-[10px] font-bold',
                              jumlahSoal > 0
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            )}
                          >
                            {jumlahSoal > 0 ? `${jumlahSoal} Soal` : '0 Soal (Draft Wadah)'}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                            <ShieldCheck size={11} /> Aman
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* 4. Konfirmasi Final */}
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
          <AlertTriangle size={15} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            Apakah Anda yakin ingin mengosongkan <strong>{stats.totalSchedules} sesi jadwal terbit</strong> ini?
            Setelah dikosongkan, Anda dapat menyusun matriks kembali dan menerbitkan jadwal baru kapan saja.
          </div>
        </div>
      </div>

      {/* Footer Aksi */}
      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isResetting}
          onClick={onClose}
          className="text-xs h-8 px-3.5 font-semibold cursor-pointer"
        >
          Batalkan Aksi
        </Button>
        <Button
          type="button"
          variant="danger"
          size="sm"
          disabled={isResetting || schedules.length === 0}
          onClick={onConfirm}
          className="text-xs h-8 px-4 font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-2xs cursor-pointer flex items-center gap-1.5"
        >
          <Trash2 size={13} />
          <span>{isResetting ? 'Mengosongkan Sesi Terbit...' : `Ya, Kosongkan ${stats.totalSchedules} Sesi Terbit`}</span>
        </Button>
      </div>
    </Modal>
  );
};
