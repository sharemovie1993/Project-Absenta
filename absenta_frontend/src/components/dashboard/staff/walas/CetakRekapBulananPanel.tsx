import React, { useState } from 'react';
import { Download, Printer, Calendar, FileSpreadsheet, CheckCircle2, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

interface CetakRekapBulananPanelProps {
  kelasNama?: string;
  totalSiswa?: number;
}

const MOCK_REKAP_ROWS = [
  { no: 1, nisn: '0071234567', nama: 'AMIRA SANIA', h: 22, s: 0, i: 0, a: 0, persen: '100%' },
  { no: 2, nisn: '0071234568', nama: 'BAGAS PRATAMA', h: 21, s: 1, i: 0, a: 0, persen: '95.5%' },
  { no: 3, nisn: '0071234569', nama: 'CINDY CLAUDIA', h: 22, s: 0, i: 0, a: 0, persen: '100%' },
  { no: 4, nisn: '0071234570', nama: 'DEDI KURNIAWAN', h: 20, s: 0, i: 2, a: 0, persen: '90.9%' },
  { no: 5, nisn: '0071234571', nama: 'EKA PUTRI', h: 22, s: 0, i: 0, a: 0, persen: '100%' },
];

export const CetakRekapBulananPanel: React.FC<CetakRekapBulananPanelProps> = ({
  kelasNama = 'Kelas Binaan',
  totalSiswa = 36,
}) => {
  const [selectedBulan, setSelectedBulan] = useState('08');
  const [selectedTahun, setSelectedTahun] = useState('2026');
  const [format, setFormat] = useState<'pdf' | 'excel'>('pdf');

  const handleCetak = () => {
    toast.success(`Menyiapkan dokumen rekap bulanan ${kelasNama} (${format.toUpperCase()})...`);
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Printer size={16} className="text-blue-600 dark:text-blue-400" />
              <span>Cetak Rekapitulasi Presensi Bulanan ({kelasNama})</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Format standar dinas (F4/A4) lengkap dengan lembar tanda tangan Wali Kelas & Kepala Sekolah
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCetak}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95"
            >
              <Printer size={14} />
              <span>Cetak / Download PDF</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Bulan:</label>
            <select
              value={selectedBulan}
              onChange={e => setSelectedBulan(e.target.value)}
              className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              <option value="07">Juli 2026</option>
              <option value="08">Agustus 2026</option>
              <option value="09">September 2026</option>
              <option value="10">Oktober 2026</option>
              <option value="11">November 2026</option>
              <option value="12">Desember 2026</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Kertas:</label>
            <select
              defaultValue="F4"
              className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              <option value="F4">Folio / F4 (Landscape)</option>
              <option value="A4">A4 (Landscape)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Preview Table */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="text-center pb-3 border-b border-slate-100 dark:border-slate-800">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
            REKAPITULASI PRESENSI SISWA BULAN AGUSTUS 2026
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Kelas: {kelasNama} • Total Siswa: {totalSiswa} Orang
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-y border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-extrabold text-[11px]">
                <th className="py-2.5 px-3 w-10 text-center">No</th>
                <th className="py-2.5 px-3">NISN</th>
                <th className="py-2.5 px-3">Nama Siswa</th>
                <th className="py-2.5 px-2 text-center text-emerald-600">Hadir</th>
                <th className="py-2.5 px-2 text-center text-amber-600">Sakit</th>
                <th className="py-2.5 px-2 text-center text-blue-600">Izin</th>
                <th className="py-2.5 px-2 text-center text-rose-600">Alpa</th>
                <th className="py-2.5 px-3 text-right">Persentase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {MOCK_REKAP_ROWS.map((r) => (
                <tr key={r.no} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 text-center font-bold text-slate-400">{r.no}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-500">{r.nisn}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-100">{r.nama}</td>
                  <td className="py-2.5 px-2 text-center font-extrabold text-emerald-600">{r.h}</td>
                  <td className="py-2.5 px-2 text-center font-semibold text-amber-600">{r.s}</td>
                  <td className="py-2.5 px-2 text-center font-semibold text-blue-600">{r.i}</td>
                  <td className="py-2.5 px-2 text-center font-semibold text-rose-600">{r.a}</td>
                  <td className="py-2.5 px-3 text-right font-extrabold text-slate-700 dark:text-slate-300">{r.persen}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
