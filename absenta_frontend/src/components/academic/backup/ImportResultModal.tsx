import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Database, 
  ShieldCheck, 
  RefreshCw,
  Sparkles,
  AlertTriangle,
  Search,
  CheckCircle,
  XCircle,
  FileCheck
} from 'lucide-react';
import { Button, Badge } from '../../ui';

interface ModelRestoreSummary {
  target: number;
  restored: number;
  skipped: number;
  gap: number;
}

interface AuditPayload {
  totalTarget?: number;
  totalRestored?: number;
  totalSkipped?: number;
  totalGap?: number;
  matchRate?: number;
  details?: Record<string, ModelRestoreSummary | number>;
  [key: string]: any;
}

interface ImportResultModalProps {
  isOpen: boolean;
  result: AuditPayload | null;
  onClose: () => void;
}

function getItemMetrics(details: Record<string, any> | undefined, ...possibleKeys: string[]): { target: number; restored: number; gap: number } {
  if (!details) return { target: 0, restored: 0, gap: 0 };

  const keys = Object.keys(details);
  for (const k of possibleKeys) {
    let entry = details[k];
    if (entry === undefined) {
      const matchedKey = keys.find(dk => dk.toLowerCase() === k.toLowerCase());
      if (matchedKey) entry = details[matchedKey];
    }

    if (entry !== undefined && entry !== null) {
      if (typeof entry === 'object' && entry.target !== undefined) {
        return {
          target: Number(entry.target) || 0,
          restored: Number(entry.restored) || 0,
          gap: Number(entry.gap) || 0,
        };
      } else {
        const val = Number(entry) || 0;
        return { target: val, restored: val, gap: 0 };
      }
    }
  }

  return { target: 0, restored: 0, gap: 0 };
}

export const ImportResultModal: React.FC<ImportResultModalProps> = React.memo(({
  isOpen,
  result,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen || !result) return null;

  // Extract core audit metrics
  const details = result.details || (typeof result === 'object' ? result : {});
  const detailKeys = Object.keys(details);

  let grandTarget = result.totalTarget ?? 0;
  let grandRestored = result.totalRestored ?? 0;
  let grandGap = result.totalGap ?? 0;

  const modelRows: { name: string; target: number; restored: number; skipped: number; gap: number }[] = [];

  for (const k of detailKeys) {
    const item = details[k];
    if (typeof item === 'object' && item !== null && 'target' in item) {
      const summary = item as ModelRestoreSummary;
      modelRows.push({
        name: k,
        target: summary.target || 0,
        restored: summary.restored || 0,
        skipped: summary.skipped || 0,
        gap: summary.gap || 0,
      });
    } else {
      const val = Number(item) || 0;
      modelRows.push({
        name: k,
        target: val,
        restored: val,
        skipped: 0,
        gap: 0,
      });
    }
  }

  if (grandTarget === 0) {
    grandTarget = modelRows.reduce((acc, curr) => acc + curr.target, 0);
  }
  if (grandRestored === 0) {
    grandRestored = modelRows.reduce((acc, curr) => acc + curr.restored, 0);
  }
  if (grandGap === 0 && grandTarget > grandRestored) {
    grandGap = grandTarget - grandRestored;
  }

  const matchRate = result.matchRate ?? (grandTarget > 0 ? Math.round((grandRestored / grandTarget) * 100) : 100);

  const filteredRows = modelRows.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const masterItems = [
    { label: 'Sekolah', ...getItemMetrics(details, 'Sekolah', 'sekolah') },
    { label: 'Tahun Pelajaran', ...getItemMetrics(details, 'TahunPelajaran', 'tahunPelajaran') },
    { label: 'Semester', ...getItemMetrics(details, 'Semester', 'semester') },
    { label: 'Jurusan', ...getItemMetrics(details, 'Jurusan', 'jurusan') },
    { label: 'Mapel', ...getItemMetrics(details, 'Mapel', 'mapel') },
    { label: 'Kelas', ...getItemMetrics(details, 'Kelas', 'kelas') },
  ];

  const userItems = [
    { label: 'Guru', ...getItemMetrics(details, 'Guru', 'guru') },
    { label: 'Siswa', ...getItemMetrics(details, 'Siswa', 'siswa') },
    { label: 'Orang Tua', ...getItemMetrics(details, 'OrangTua', 'orangTua') },
    { label: 'Akun User', ...getItemMetrics(details, 'User', 'user') },
  ];

  const kbmItems = [
    { label: 'Jadwal KBM', ...getItemMetrics(details, 'JadwalKBM', 'jadwalKBM') },
    { label: 'Absen Siswa', ...getItemMetrics(details, 'AbsenSiswa', 'absenSiswa') },
    { label: 'Absen Guru', ...getItemMetrics(details, 'AbsenGuru', 'absenGuru') },
    { label: 'Presensi Gerbang', ...getItemMetrics(details, 'AbsenGerbangSiswa', 'absenGerbangSiswa') },
  ];

  const moduleItems = [
    { label: 'Surat Digital', ...getItemMetrics(details, 'SuratMasuk', 'suratMasuk') },
    { label: 'Pelanggaran & Prestasi', ...getItemMetrics(details, 'PelanggaranSiswa', 'pelanggaranSiswa') },
    { label: 'BK & Konseling', ...getItemMetrics(details, 'KonselingSiswa', 'konselingSiswa') },
    { label: 'Sarpras & Coop', ...getItemMetrics(details, 'SarprasAsset', 'sarprasAsset') },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-950 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 scale-in-center">
        
        {/* Header Audit Banner */}
        <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800/80 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shrink-0 ${
              grandGap === 0 
                ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
                : 'bg-amber-500 text-white shadow-amber-500/20'
            }`}>
              {grandGap === 0 ? <CheckCircle2 size={28} /> : <AlertTriangle size={28} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  {grandGap === 0 ? 'Pemulihan Data Presisi Sempurna!' : 'Pemulihan Data Selesai (Ada Gap)'}
                </h3>
                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                  grandGap === 0 
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                }`}>
                  {matchRate}% Match
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Laporan Audit Integritas: Pembandingan Record Berkas Cadangan vs Database Real
              </p>
            </div>
          </div>

          <Button 
            onClick={onClose} 
            className="h-11 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-xs shadow-md active:scale-95 transition-all cursor-pointer self-end sm:self-auto"
          >
            SELESAI & TUTUP
          </Button>
        </div>

        {/* Audit Stats Metric Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-6 md:p-8 bg-slate-50/80 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80">
          <div className="p-3.5 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-0.5 shadow-2xs">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <FileCheck size={12} className="text-blue-500" /> Target File
            </span>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {grandTarget.toLocaleString()}
            </p>
          </div>

          <div className="p-3.5 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-0.5 shadow-2xs">
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1">
              <CheckCircle size={12} /> Disinkronkan
            </span>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              {grandRestored.toLocaleString()}
            </p>
          </div>

          <div className="p-3.5 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-0.5 shadow-2xs">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <ShieldCheck size={12} className="text-violet-500" /> Match Rate
            </span>
            <p className="text-2xl font-black text-violet-600 dark:text-violet-400 tracking-tight">
              {matchRate}%
            </p>
          </div>

          <div className={`p-3.5 bg-white dark:bg-slate-950 rounded-2xl border space-y-0.5 shadow-2xs ${
            grandGap === 0 ? 'border-slate-200/80 dark:border-slate-800' : 'border-amber-300 dark:border-amber-800'
          }`}>
            <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${
              grandGap === 0 ? 'text-slate-400' : 'text-amber-500'
            }`}>
              <AlertTriangle size={12} /> Gap / Variance
            </span>
            <p className={`text-2xl font-black tracking-tight ${
              grandGap === 0 ? 'text-slate-900 dark:text-slate-100' : 'text-amber-600 dark:text-amber-400'
            }`}>
              {grandGap.toLocaleString()} Record
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 custom-scrollbar bg-white dark:bg-slate-950">
          
          {/* Executive Category Comparison */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Ringkasan Komparasi Per Kategori Domain
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Master */}
              <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800 text-blue-600 dark:text-blue-400">
                  <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <Database size={13} /> Kelembagaan
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Target / Real</span>
                </div>
                <div className="space-y-1.5">
                  {masterItems.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-medium truncate">{item.label}</span>
                      <div className="flex items-center gap-1 font-mono text-[11px]">
                        <span className="text-slate-400">{item.target}</span>
                        <span className="text-slate-300">/</span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400">{item.restored}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pengguna */}
              <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800 text-emerald-600 dark:text-emerald-400">
                  <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck size={13} /> Pengguna
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Target / Real</span>
                </div>
                <div className="space-y-1.5">
                  {userItems.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-medium truncate">{item.label}</span>
                      <div className="flex items-center gap-1 font-mono text-[11px]">
                        <span className="text-slate-400">{item.target}</span>
                        <span className="text-slate-300">/</span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400">{item.restored}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Presensi & KBM */}
              <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800 text-violet-600 dark:text-violet-400">
                  <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <RefreshCw size={13} /> Presensi & KBM
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Target / Real</span>
                </div>
                <div className="space-y-1.5">
                  {kbmItems.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-medium truncate">{item.label}</span>
                      <div className="flex items-center gap-1 font-mono text-[11px]">
                        <span className="text-slate-400">{item.target}</span>
                        <span className="text-slate-300">/</span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400">{item.restored}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modul Terintegrasi */}
              <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800 text-amber-600 dark:text-amber-400">
                  <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <Sparkles size={13} /> Modul Domain
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Target / Real</span>
                </div>
                <div className="space-y-1.5">
                  {moduleItems.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-medium truncate">{item.label}</span>
                      <div className="flex items-center gap-1 font-mono text-[11px]">
                        <span className="text-slate-400">{item.target}</span>
                        <span className="text-slate-300">/</span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400">{item.restored}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Full Audit Table Breakdown */}
          {modelRows.length > 0 && (
            <div className="p-5 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-500" />
                    Tabel Matriks Audit Integritas ({modelRows.length} Modul)
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    Verifikasi lengkap setiap tabel model Prisma: Target File vs Hasil Restored vs Gap
                  </p>
                </div>

                <div className="relative w-full sm:w-60">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama tabel/modul..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto custom-scrollbar border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-black uppercase text-[9px] tracking-wider sticky top-0 backdrop-blur-xs">
                    <tr>
                      <th className="py-2.5 px-4">Nama Modul / Tabel</th>
                      <th className="py-2.5 px-4 text-center">Target File</th>
                      <th className="py-2.5 px-4 text-center">Berhasil Restored</th>
                      <th className="py-2.5 px-4 text-center">Gap</th>
                      <th className="py-2.5 px-4 text-right">Status Audit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-slate-400 italic">
                          Tidak ada modul yang cocok dengan pencarian "{searchTerm}"
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors">
                          <td className="py-2 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                            {r.name}
                          </td>
                          <td className="py-2 px-4 text-center font-mono text-slate-500">
                            {r.target}
                          </td>
                          <td className="py-2 px-4 text-center font-mono font-black text-emerald-600 dark:text-emerald-400">
                            {r.restored}
                          </td>
                          <td className="py-2 px-4 text-center font-mono">
                            {r.gap > 0 ? (
                              <span className="font-black text-amber-600 dark:text-amber-400">{r.gap}</span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                          <td className="py-2 px-4 text-right">
                            {r.gap === 0 ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle size={10} /> 100% Match
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                                <XCircle size={10} /> Gap {r.gap}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-500" />
            Metode Restorasi: Prisma Idempotent Upsert Guard
          </div>
          <Button 
            onClick={onClose} 
            className="h-11 px-8 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase tracking-wider text-xs shadow-lg hover:shadow-slate-500/20 active:scale-95 transition-all cursor-pointer"
          >
            SELESAI & TUTUP
          </Button>
        </div>

      </div>
    </div>
  );
});

ImportResultModal.displayName = 'ImportResultModal';
