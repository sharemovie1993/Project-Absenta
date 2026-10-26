import React, { useState } from 'react';
import { 
  Activity, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  UserX,
  Phone,
  Filter
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import type { SatpamStats } from '../types';

interface SatpamTrafficTabProps {
  stats: SatpamStats;
  notPresentStudents?: Array<{ id: string; nama: string; nisn: string; kelas: string; walas?: string }>;
}

const MOCK_NOT_PRESENT = [
  { id: 'np-1', nama: 'Daffa Rizky Saputra', nisn: '0058291828', kelas: 'XI RPL 1', walas: 'Bpk. Ahmad Fauzi' },
  { id: 'np-2', nama: 'Fajar Nugraha', nisn: '0058291830', kelas: 'XI RPL 2', walas: 'Ibu Siti Rahma' },
  { id: 'np-3', nama: 'Gita Gutawa', nisn: '0058291831', kelas: 'XI AKL 1', walas: 'Bpk. Joko Susanto' },
  { id: 'np-4', nama: 'Hendra Setiawan', nisn: '0058291832', kelas: 'XII TKJ 1', walas: 'Bpk. Bambang P' },
  { id: 'np-5', nama: 'Indah Permatasari', nisn: '0058291833', kelas: 'XII TKJ 2', walas: 'Ibu Ratna Dewi' },
  { id: 'np-6', nama: 'Joko Widodo', nisn: '0058291834', kelas: 'X DKV 1', walas: 'Bpk. Hendra S' },
];

export const SatpamTrafficTab: React.FC<SatpamTrafficTabProps> = ({
  stats,
  notPresentStudents = MOCK_NOT_PRESENT,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKelas, setSelectedKelas] = useState<string>('ALL');

  const filtered = notPresentStudents.filter((s) => {
    const matchesSearch =
      s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nisn.includes(searchQuery) ||
      s.kelas.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesKelas = selectedKelas === 'ALL' || s.kelas === selectedKelas;
    return matchesSearch && matchesKelas;
  });

  const uniqueClasses = Array.from(new Set(notPresentStudents.map((s) => s.kelas)));

  return (
    <div className="space-y-4">
      {/* ── BENTO TRAFFIC METRICS ───────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-3xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-900/40">
          <p className="text-[10.5px] font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wider">
            Total Tap Masuk
          </p>
          <h3 className="text-2xl font-black text-teal-800 dark:text-teal-100 mt-1">
            {stats.totalMasuk}
          </h3>
          <p className="text-[10px] text-teal-600 dark:text-teal-400 mt-0.5">
            {stats.tepatWaktu} tepat waktu
          </p>
        </div>

        <div className="p-4 rounded-3xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40">
          <p className="text-[10.5px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider">
            Siswa Terlambat
          </p>
          <h3 className="text-2xl font-black text-rose-800 dark:text-rose-100 mt-1">
            {stats.terlambat}
          </h3>
          <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5">
            Lewat pukul 07:00 WIB
          </p>
        </div>

        <div className="p-4 rounded-3xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40">
          <p className="text-[10.5px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
            Tamu di Sekolah
          </p>
          <h3 className="text-2xl font-black text-amber-800 dark:text-amber-100 mt-1">
            {stats.tamuDiSekolah}
          </h3>
          <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
            Belum checkout gerbang
          </p>
        </div>

        <div className="p-4 rounded-3xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-900/40">
          <p className="text-[10.5px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
            Siswa Belum Tap
          </p>
          <h3 className="text-2xl font-black text-indigo-800 dark:text-indigo-100 mt-1">
            {stats.belumHadir}
          </h3>
          <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5">
            Belum melewati pos gerbang
          </p>
        </div>
      </div>

      {/* ── NOT PRESENT STUDENTS LIST ───────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <UserX size={16} className="text-indigo-600 dark:text-indigo-400" />
              Daftar Siswa Belum Tap-In Gerbang Hari Ini
            </h4>
            <p className="text-[11px] text-slate-400">
              Data terintegrasi untuk verifikasi satpam pos depan
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari siswa / NISN..."
                aria-label="Cari siswa belum tap"
                className="pl-8 h-8 text-xs rounded-xl bg-slate-50 dark:bg-slate-950"
              />
            </div>

            <select
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              aria-label="Filter rombel kelas"
              className="h-8 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-medium focus:outline-none"
            >
              <option value="ALL">Semua Kelas</option>
              {uniqueClasses.map((cls) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.length === 0 ? (
            <div className="col-span-full py-8 text-center text-slate-400">
              <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-1" />
              <p className="text-xs">Seluruh siswa sudah melewati pos gerbang!</p>
            </div>
          ) : (
            filtered.map((s) => (
              <div
                key={s.id}
                className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 flex items-center justify-between gap-2.5"
              >
                <div className="min-w-0">
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {s.nama}
                  </h5>
                  <p className="text-[10.5px] text-slate-500 font-medium truncate">
                    {s.kelas} • <span className="font-mono">{s.nisn}</span>
                  </p>
                  {s.walas && (
                    <p className="text-[9.5px] text-slate-400 truncate">
                      Walas: {s.walas}
                    </p>
                  )}
                </div>

                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-900 shrink-0">
                  Belum Tap
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
