import React, { useState } from 'react';
import { Calendar, CheckCircle2, AlertTriangle, Clock, FileText, Plus } from 'lucide-react';

interface PresensiGuruRecord {
  tanggal: string;
  hari: string;
  jamMasuk: string;
  jamPulang: string;
  status: 'HADIR' | 'TERLAMBAT' | 'DINAS_LUAR' | 'IZIN' | 'SAKIT';
  keterangan: string;
}

const MOCK_PRESENSI_GURU: PresensiGuruRecord[] = [
  { tanggal: '18/08/2026', hari: 'Selasa', jamMasuk: '06:45 WIB', jamPulang: '--:-- WIB', status: 'HADIR', keterangan: 'Tap Gerbang Utama' },
  { tanggal: '17/08/2026', hari: 'Senin', jamMasuk: '06:40 WIB', jamPulang: '14:30 WIB', status: 'HADIR', keterangan: 'Upacara HUT RI ke-81' },
  { tanggal: '15/08/2026', hari: 'Sabtu', jamMasuk: '07:15 WIB', jamPulang: '13:00 WIB', status: 'TERLAMBAT', keterangan: 'Terlambat 15 Menit (Hujan Lebat)' },
  { tanggal: '14/08/2026', hari: 'Jumat', jamMasuk: '06:50 WIB', jamPulang: '11:45 WIB', status: 'HADIR', keterangan: 'Tap Gerbang Utama' },
  { tanggal: '13/08/2026', hari: 'Kamis', jamMasuk: '--:--', jamPulang: '--:--', status: 'DINAS_LUAR', keterangan: 'Workshop Implementasi Kurikulum Merdeka di LPMP' },
];

interface RiwayatPresensiGuruPanelProps {
  onOpenAjukanIzin?: () => void;
}

export const RiwayatPresensiGuruPanel: React.FC<RiwayatPresensiGuruPanelProps> = ({
  onOpenAjukanIzin,
}) => {
  return (
    <div className="space-y-4">
      {/* Header Summary */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar size={16} className="text-blue-600 dark:text-blue-400" />
            <span>Riwayat Presensi & Histori Izin Guru</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Catatan log kehadiran gerbang harian dan status pengajuan izin dinas bulan berjalan
          </p>
        </div>

        {onOpenAjukanIzin && (
          <button
            type="button"
            onClick={onOpenAjukanIzin}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95 shrink-0"
          >
            <Plus size={14} />
            <span>Ajukan Izin / Cuti</span>
          </button>
        )}
      </div>

      {/* Table Log */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-y border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-extrabold text-[11px]">
                <th className="py-2.5 px-3">Tanggal</th>
                <th className="py-2.5 px-3">Hari</th>
                <th className="py-2.5 px-3">Jam Masuk</th>
                <th className="py-2.5 px-3">Jam Pulang</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Keterangan / Lokasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {MOCK_PRESENSI_GURU.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">{row.tanggal}</td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{row.hari}</td>
                  <td className="py-2.5 px-3 font-mono text-emerald-600 font-semibold">{row.jamMasuk}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-500">{row.jamPulang}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                      row.status === 'HADIR' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600' :
                      row.status === 'TERLAMBAT' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600' :
                      'bg-blue-50 dark:bg-blue-950/40 text-blue-600'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{row.keterangan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
