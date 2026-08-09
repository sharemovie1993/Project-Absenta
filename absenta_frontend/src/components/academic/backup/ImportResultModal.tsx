import React from 'react';
import { 
  CheckCircle2, 
  Database, 
  ShieldCheck, 
  RefreshCw 
} from 'lucide-react';
import { Button, Badge } from '../../ui';

interface ImportResultModalProps {
  isOpen: boolean;
  result: any;
  onClose: () => void;
}

export const ImportResultModal: React.FC<ImportResultModalProps> = React.memo(({
  isOpen,
  result,
  onClose
}) => {
  if (!isOpen || !result) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 scale-in-center">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-200/50 dark:border-emerald-800/50">
              <CheckCircle2 size={28} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Impor Selesai</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Laporan Pemulihan Data Akademik</p>
            </div>
          </div>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Master Data Section */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Database size={12} className="text-blue-500" /> Master Data
              </h4>
              <div className="space-y-2">
                {[
                  { label: 'Sekolah', val: result.sekolah },
                  { label: 'Tahun Pelajaran', val: result.tahunPelajaran },
                  { label: 'Semester', val: result.semester },
                  { label: 'Jurusan', val: result.jurusan },
                  { label: 'Mapel', val: result.mapel },
                  { label: 'Jenis Kegiatan', val: result.jenisKegiatan },
                  { label: 'Struktur Org', val: result.strukturOrganisasi },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-sm group p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                    <span className="text-slate-600 dark:text-slate-400 font-medium group-hover:text-slate-900 dark:group-hover:text-slate-200">{item.label}</span>
                    <Badge variant="secondary" className="font-bold min-w-[32px] justify-center bg-slate-100 dark:bg-slate-800">{item.val}</Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Users Section */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck size={12} className="text-emerald-500" /> Pengguna & Akademik
              </h4>
              <div className="space-y-2">
                {[
                  { label: 'Guru', val: result.guru },
                  { label: 'Siswa', val: result.siswa },
                  { label: 'Kelas', val: result.kelas },
                  { label: 'Wali Kelas', val: result.waliKelas },
                  { label: 'Guru Mapel', val: result.guruMapel },
                  { label: 'Kelas Mapel', val: result.kelasMapel },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-sm group p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                    <span className="text-slate-600 dark:text-slate-400 font-medium group-hover:text-slate-900 dark:group-hover:text-slate-200">{item.label}</span>
                    <Badge variant="secondary" className="font-bold min-w-[32px] justify-center bg-slate-100 dark:bg-slate-800">{item.val}</Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Operational Section */}
            <div className="space-y-4 md:col-span-2 pt-6 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <RefreshCw size={12} className="text-orange-500" /> Operasional & Riwayat
              </h4>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                {[
                  { label: 'Jadwal KBM', val: result.jadwalKBM },
                  { label: 'Pelanggaran', val: result.pelanggaran },
                  { label: 'Supervisi', val: result.supervisi },
                  { label: 'Riwayat Akademik', val: result.siswaAkademik },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-sm group p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                    <span className="text-slate-600 dark:text-slate-400 font-medium group-hover:text-slate-900 dark:group-hover:text-slate-200">{item.label}</span>
                    <Badge variant="secondary" className="font-bold min-w-[32px] justify-center bg-slate-100 dark:bg-slate-800">{item.val}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
          <Button 
            onClick={onClose} 
            className="h-12 px-10 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase tracking-widest text-[10px] shadow-xl hover:shadow-slate-500/20 active:scale-95 transition-all"
          >
            Selesai & Tutup
          </Button>
        </div>
      </div>
    </div>
  );
});
