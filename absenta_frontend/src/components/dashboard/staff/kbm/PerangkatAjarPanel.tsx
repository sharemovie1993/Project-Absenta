import React, { useState } from 'react';
import { 
  BookOpen, Plus, ExternalLink, FileText, Download, 
  Search, CheckCircle2, Sparkles, Folder 
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ModulAjarItem {
  id: string;
  judul: string;
  mapel: string;
  fase: string;
  tingkat: string;
  bab: string;
  alokasiJp: number;
  tautanDrive?: string;
  status: 'DRAF' | 'AKTIF' | 'DISETUJUI';
}

const MOCK_MODUL_AJAR: ModulAjarItem[] = [
  {
    id: 'm-1',
    judul: 'Modul Ajar 1: Persamaan Dasar Akuntansi (PDA)',
    mapel: 'Akuntansi Dasar',
    fase: 'Fase E',
    tingkat: 'Kelas X',
    bab: 'Bab 1: Konsep Akuntansi',
    alokasiJp: 12,
    tautanDrive: 'https://drive.google.com',
    status: 'DISETUJUI',
  },
  {
    id: 'm-2',
    judul: 'Modul Ajar 2: Siklus Akuntansi Perusahaan Jasa',
    mapel: 'Praktikum Akuntansi Perusahaan Jasa',
    fase: 'Fase F',
    tingkat: 'Kelas XI',
    bab: 'Bab 2: Jurnal Penyesuaian & Neraca Lajur',
    alokasiJp: 18,
    tautanDrive: 'https://drive.google.com',
    status: 'DISETUJUI',
  },
  {
    id: 'm-3',
    judul: 'Modul Ajar 3: Setup Perusahaan Dagang Accurate & MYOB',
    mapel: 'Komputer Akuntansi',
    fase: 'Fase F',
    tingkat: 'Kelas XII',
    bab: 'Bab 3: Komputer Akuntansi Terapan',
    alokasiJp: 24,
    tautanDrive: 'https://drive.google.com',
    status: 'AKTIF',
  },
];

export const PerangkatAjarPanel: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredModul = MOCK_MODUL_AJAR.filter(m => 
    m.judul.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.mapel.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    toast('Form upload / tautan Modul Ajar baru siap dihubungkan!', { icon: '📁' });
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen size={16} className="text-blue-600 dark:text-blue-400" />
            <span>Bank Perangkat Ajar & Modul Ajar</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Penyimpanan Modul Ajar, ATP, RPP, dan Bahan Pembelajaran (Kurikulum Merdeka)
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95 shrink-0"
        >
          <Plus size={14} />
          <span>+ Tautkan Modul Ajar</span>
        </button>
      </div>

      {/* Grid of Modul Ajar Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredModul.map((modul) => (
          <div
            key={modul.id}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3.5"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-extrabold text-[10px]">
                  {modul.tingkat} • {modul.fase}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                  {modul.status}
                </span>
              </div>

              <h4 className="text-xs font-extrabold text-slate-900 dark:text-white leading-snug line-clamp-2">
                {modul.judul}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {modul.mapel} • {modul.bab}
              </p>
            </div>

            <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-[11px] font-semibold text-slate-400">
                {modul.alokasiJp} JP Pertemuan
              </span>

              {modul.tautanDrive && (
                <a
                  href={modul.tautanDrive}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] flex items-center gap-1 transition-all"
                >
                  <ExternalLink size={12} />
                  <span>Buka Dokumen</span>
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
