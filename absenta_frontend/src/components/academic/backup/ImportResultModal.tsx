import React from 'react';
import { 
  CheckCircle2, 
  Database, 
  ShieldCheck, 
  RefreshCw,
  Sparkles,
  Layers,
  Check
} from 'lucide-react';
import { Button, Badge } from '../../ui';

interface ImportResultModalProps {
  isOpen: boolean;
  result: any;
  onClose: () => void;
}

function getItemValue(result: Record<string, any>, ...possibleKeys: string[]): number {
  if (!result) return 0;
  for (const k of possibleKeys) {
    if (result[k] !== undefined && result[k] !== null) {
      return Number(result[k]) || 0;
    }
  }
  const keys = Object.keys(result);
  for (const k of possibleKeys) {
    const matchedKey = keys.find(dk => dk.toLowerCase() === k.toLowerCase());
    if (matchedKey && result[matchedKey] !== undefined && result[matchedKey] !== null) {
      return Number(result[matchedKey]) || 0;
    }
  }
  return 0;
}

export const ImportResultModal: React.FC<ImportResultModalProps> = React.memo(({
  isOpen,
  result,
  onClose
}) => {
  if (!isOpen || !result) return null;

  // Calculate grand total and active models
  const allKeys = Object.keys(result);
  let grandTotal = 0;
  let activeModelCount = 0;
  const activeModelsList: { name: string; count: number }[] = [];

  for (const k of allKeys) {
    const val = Number(result[k]);
    if (!isNaN(val) && val > 0) {
      grandTotal += val;
      activeModelCount++;
      activeModelsList.push({ name: k, count: val });
    }
  }

  const masterItems = [
    { label: 'Sekolah', val: getItemValue(result, 'Sekolah', 'sekolah') },
    { label: 'Tahun Pelajaran', val: getItemValue(result, 'TahunPelajaran', 'tahunPelajaran') },
    { label: 'Semester', val: getItemValue(result, 'Semester', 'semester') },
    { label: 'Jurusan', val: getItemValue(result, 'Jurusan', 'jurusan') },
    { label: 'Mapel', val: getItemValue(result, 'Mapel', 'mapel') },
    { label: 'Kelas', val: getItemValue(result, 'Kelas', 'kelas') },
  ];

  const userItems = [
    { label: 'Guru', val: getItemValue(result, 'Guru', 'guru') },
    { label: 'Siswa', val: getItemValue(result, 'Siswa', 'siswa') },
    { label: 'Orang Tua', val: getItemValue(result, 'OrangTua', 'orangTua') },
    { label: 'Akun User', val: getItemValue(result, 'User', 'user') },
  ];

  const kbmItems = [
    { label: 'Jadwal KBM', val: getItemValue(result, 'JadwalKBM', 'jadwalKBM') },
    { label: 'Absen Siswa', val: getItemValue(result, 'AbsenSiswa', 'absenSiswa') },
    { label: 'Absen Guru', val: getItemValue(result, 'AbsenGuru', 'absenGuru') },
    { label: 'Presensi Gerbang', val: getItemValue(result, 'AbsenGerbangSiswa', 'absenGerbangSiswa') + getItemValue(result, 'AbsenGerbangGuru', 'absenGerbangGuru') },
  ];

  const moduleItems = [
    { label: 'Surat Digital', val: getItemValue(result, 'SuratMasuk', 'suratMasuk') + getItemValue(result, 'SuratKeluar', 'suratKeluar') + getItemValue(result, 'TemplateSurat') },
    { label: 'Pelanggaran & Prestasi', val: getItemValue(result, 'PelanggaranSiswa', 'pelanggaranSiswa') + getItemValue(result, 'PrestasiSiswa', 'prestasiSiswa') },
    { label: 'BK & Konseling', val: getItemValue(result, 'KonselingSiswa', 'konselingSiswa') + getItemValue(result, 'KasusBK', 'kasusBK') },
    { label: 'Sarpras & Koperasi', val: getItemValue(result, 'SarprasAsset', 'sarprasAsset') + getItemValue(result, 'Member', 'member') + getItemValue(result, 'Sale', 'sale') },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-950 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 scale-in-center">
        
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800/80 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
              <CheckCircle2 size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  Pemulihan Data Selesai!
                </h3>
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Sukses
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Laporan Hasil Pemulihan & Sinkronisasi Database Tenant
              </p>
            </div>
          </div>

          <div className="hidden sm:flex flex-col items-end">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              {grandTotal > 0 ? grandTotal : (result.total || '0')}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Record Disinkronkan
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 custom-scrollbar bg-white dark:bg-slate-950">
          
          {/* Summary Grid 4 Categories */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Kelembagaan */}
            <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5 pb-2 border-b border-slate-200/60 dark:border-slate-800 text-blue-600 dark:text-blue-400">
                <Database size={14} />
                <h4 className="text-[10px] font-black uppercase tracking-wider">Kelembagaan</h4>
              </div>
              <div className="space-y-1.5">
                {masterItems.map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-medium truncate">{item.label}</span>
                    <span className="font-black text-slate-900 dark:text-slate-100">{item.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pengguna */}
            <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5 pb-2 border-b border-slate-200/60 dark:border-slate-800 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck size={14} />
                <h4 className="text-[10px] font-black uppercase tracking-wider">Pengguna</h4>
              </div>
              <div className="space-y-1.5">
                {userItems.map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-medium truncate">{item.label}</span>
                    <span className="font-black text-slate-900 dark:text-slate-100">{item.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Presensi & KBM */}
            <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5 pb-2 border-b border-slate-200/60 dark:border-slate-800 text-violet-600 dark:text-violet-400">
                <RefreshCw size={14} />
                <h4 className="text-[10px] font-black uppercase tracking-wider">Presensi & KBM</h4>
              </div>
              <div className="space-y-1.5">
                {kbmItems.map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-medium truncate">{item.label}</span>
                    <span className="font-black text-slate-900 dark:text-slate-100">{item.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Modul Terintegrasi */}
            <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5 pb-2 border-b border-slate-200/60 dark:border-slate-800 text-amber-600 dark:text-amber-400">
                <Sparkles size={14} />
                <h4 className="text-[10px] font-black uppercase tracking-wider">Modul Domain</h4>
              </div>
              <div className="space-y-1.5">
                {moduleItems.map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-medium truncate">{item.label}</span>
                    <span className="font-black text-slate-900 dark:text-slate-100">{item.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dynamic Active Models List */}
          {activeModelsList.length > 0 && (
            <div className="p-5 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-500" />
                  Rincian Modul Aktif Terproses ({activeModelCount} Modul)
                </h4>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Status: Idempotent Synced
                </span>
              </div>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar pt-1">
                {activeModelsList.map((m, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs shadow-2xs">
                    <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span className="font-bold text-slate-700 dark:text-slate-300">{m.name}:</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400">{m.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
          <Button 
            onClick={onClose} 
            className="h-12 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-xs shadow-lg shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
          >
            SELESAI & TUTUP
          </Button>
        </div>

      </div>
    </div>
  );
});

ImportResultModal.displayName = 'ImportResultModal';
