import React from 'react';
import { Loader2 } from 'lucide-react';
import type { Kelas } from '../../types/academic';

interface CetakFormAcademicProps {
  selectedPrintType: 'attendance' | 'journal' | 'roster' | 'sk_load';
  setSelectedPrintType: (val: 'attendance' | 'journal' | 'roster' | 'sk_load') => void;
  selectedClassId: string;
  setSelectedClassId: (val: string) => void;
  selectedMonth: number;
  setSelectedMonth: (val: number) => void;
  selectedYear: number;
  setSelectedYear: (val: number) => void;
  includeSchoolLogo: boolean;
  setIncludeSchoolLogo: (val: boolean) => void;
  classes: Kelas[];
  loadingClasses: boolean;
  uniqueTingkatList: number[];
}

export const CetakFormAcademic: React.FC<CetakFormAcademicProps> = React.memo(({
  selectedPrintType,
  setSelectedPrintType,
  selectedClassId,
  setSelectedClassId,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  includeSchoolLogo,
  setIncludeSchoolLogo,
  classes,
  loadingClasses,
  uniqueTingkatList
}) => {
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  return (
    <div className="space-y-4 py-2">
      {/* Document Type Dropdown */}
      <div className="space-y-1">
        <label className="text-xs font-black uppercase text-slate-400 block">Jenis Dokumen Fisik</label>
        <select
          value={selectedPrintType}
          onChange={(e) => setSelectedPrintType(e.target.value as any)}
          className="w-full text-xs font-semibold px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="attendance">1. DAFTAR HADIR HARIAN SISWA</option>
          <option value="journal">2. Buku Jurnal KBM Kelas (Kosong)</option>
          <option value="roster">3. Daftar Kelas & Lembar Nilai</option>
          <option value="sk_load">4. Lampiran SK Beban Mengajar</option>
        </select>
      </div>

      {/* Class Selector (Conditional) */}
      {['attendance', 'journal', 'roster'].includes(selectedPrintType) && (
        <div className="space-y-1">
          <label className="text-xs font-black uppercase text-slate-400 block">Pilih Kelas</label>
          {loadingClasses ? (
            <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 py-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Memuat kelas...
            </div>
          ) : (
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-600 dark:text-blue-400 font-bold"
            >
              {uniqueTingkatList.map(t => (
                <option key={`all_tingkat_${t}`} value={`all_tingkat_${t}`}>
                  🖨️ CETAK TINGKAT {t} (MASAL)
                </option>
              ))}
              <option value="all">🖨️ CETAK SEMUA KELAS (SELURUH SEKOLAH)</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.nama_kelas} (Tingkat {c.tingkat})</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Month Selector (Conditional) */}
      {selectedPrintType === 'attendance' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-black uppercase text-slate-400 block">Bulan</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full text-xs font-semibold px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {monthNames.map((name, index) => (
                <option key={index} value={index + 1}>{name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black uppercase text-slate-400 block">Tahun</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full text-xs font-semibold px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Checkbox to Toggle Right Logo (Sekolah) */}
      <div className="flex items-center gap-2 pt-2">
        <input
          type="checkbox"
          id="toggle-school-logo"
          checked={includeSchoolLogo}
          onChange={(e) => setIncludeSchoolLogo(e.target.checked)}
          className="w-4 h-4 rounded text-blue-600 border-slate-300 dark:border-slate-800 focus:ring-blue-500 bg-white dark:bg-slate-900"
        />
        <label htmlFor="toggle-school-logo" className="text-xs font-bold text-slate-700 dark:text-slate-300 select-none cursor-pointer">
          Sertakan Logo Sekolah (Kanan)
        </label>
      </div>
    </div>
  );
});
