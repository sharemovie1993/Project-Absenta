import React, { memo, useRef, useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Search,
  BookOpen,
  Printer,
  Loader2,
  Building2,
  ChevronDown,
  X,
  GraduationCap,
} from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { SearchableSelect, SearchableSelectOption } from '../../ui/SearchableSelect';

export interface CetakRaporHeaderCardProps {
  selectedKelas: string;
  onSelectKelas: (kelasId: string) => void;
  kelasOptions: SearchableSelectOption[];
  isLoadingClasses: boolean;
  selectedTahunPelajaran?: string;
  selectedSemester?: string;
  onTahunPelajaranChange?: (tpId: string) => void;
  onSemesterChange?: (semId: string) => void;
  tpOptions?: SearchableSelectOption[];
  semesterOptions?: SearchableSelectOption[];
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  hasLegerData: boolean;
  isLoadingLeger?: boolean;
  totalStudents?: number;
  isBatchPrinting: boolean;
  onBatchPrintRapor: () => void;
  onPrintLeger: () => void;
  onExportLeger: () => void;
  isJenjangSmk: boolean;
  onBatchPrintRaporPkl: () => void;
  isBatchPklPrinting: boolean;
  isPureWaliKelas: boolean;
  currentKelasNama?: string;
  kurikulumStrukturListLength?: number;
  kurikulumTotalJp?: number;
  onNavigateInputNilai?: () => void;
}

export const CetakRaporHeaderCard: React.FC<CetakRaporHeaderCardProps> = memo(({
  selectedKelas,
  onSelectKelas,
  kelasOptions,
  isLoadingClasses,
  searchQuery,
  onSearchQueryChange,
  hasLegerData,
  isLoadingLeger = false,
  totalStudents,
  isBatchPrinting,
  onBatchPrintRapor,
  onPrintLeger,
  onExportLeger,
  isJenjangSmk,
  onBatchPrintRaporPkl,
  isBatchPklPrinting,
  isPureWaliKelas,
  currentKelasNama,
  kurikulumStrukturListLength = 0,
  kurikulumTotalJp = 0,
}) => {
  const [isBatchMenuOpen, setIsBatchMenuOpen] = useState(false);
  const batchMenuRef = useRef<HTMLDivElement>(null);

  // Close batch menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (batchMenuRef.current && !batchMenuRef.current.contains(event.target as Node)) {
        setIsBatchMenuOpen(false);
      }
    };
    if (isBatchMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isBatchMenuOpen]);

  return (
    <Card className="p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 rounded-2xl w-full max-w-full min-w-0 space-y-3.5">
      {/* Baris 1: Kontrol Utama Terpadu (Pilih Kelas, Cari Siswa, & Tombol Aksi) */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 w-full">
        {/* Sisi Kiri: Rombel Selector & Pencarian Siswa Sejajar Sempurna */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 flex-1 min-w-0">
          {/* Pilih Kelas Rombel */}
          <div className="w-full sm:w-72 md:w-80 shrink-0">
            <label
              htmlFor="select-kelas"
              className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1"
            >
              <GraduationCap size={13} className="text-indigo-500" />
              <span>Pilih Kelas Rombel:</span>
            </label>
            <SearchableSelect
              id="select-kelas"
              value={selectedKelas}
              onValueChange={onSelectKelas}
              options={kelasOptions}
              placeholder={isLoadingClasses ? 'Memuat rombel...' : '-- Pilih Kelas --'}
              searchPlaceholder="Cari kelas..."
              isLoading={isLoadingClasses}
            />
          </div>

          {/* Cari Siswa */}
          <div className="w-full sm:w-64 md:w-72 flex-1 max-w-md">
            <label
              htmlFor="search-siswa"
              className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1"
            >
              <span className="flex items-center gap-1.5">
                <Search size={12} className="text-slate-400" />
                <span>Cari Siswa:</span>
              </span>
              {totalStudents !== undefined && (
                <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 lowercase">
                  ({totalStudents} siswa)
                </span>
              )}
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                id="search-siswa"
                type="text"
                placeholder="Ketik nama siswa atau NIS..."
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-medium pl-9 pr-7 py-2 h-[38px] text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchQueryChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                  title="Hapus pencarian"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sisi Kanan: Aksi Cetak Sekaligus & Dokumen Ekspor Selalu Tampil Sejajar */}
        <div className="flex items-center gap-2 shrink-0 self-start lg:self-end flex-wrap">
          {/* Tombol Utama: Cetak Sekaligus 1 File PDF */}
          <Button
            onClick={onBatchPrintRapor}
            disabled={isBatchPrinting || !hasLegerData || isLoadingLeger}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs transition-all h-[38px] px-4 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            title={
              !selectedKelas
                ? 'Pilih kelas terlebih dahulu'
                : !hasLegerData
                ? 'Memuat data leger siswa...'
                : 'Cetak seluruh rapor siswa sekelas dalam 1 file PDF gabungan'
            }
          >
            {isBatchPrinting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Printer className="w-4 h-4" />
            )}
            <span className="text-xs">CETAK SEKALIGUS (1 FILE PDF)</span>
          </Button>

          {/* Dropdown Aksi Sekunder: Leger & Dokumen Lainnya */}
          <div className="relative inline-block text-left" ref={batchMenuRef}>
            <Button
              variant="outline"
              onClick={() => setIsBatchMenuOpen((prev) => !prev)}
              disabled={!hasLegerData || isLoadingLeger}
              className="border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-xl font-bold text-xs h-[38px] px-3.5 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              title="Opsi cetak buku leger nilai, rapor PKL, dan ekspor excel sekelas"
            >
              <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Buku Leger &amp; Ekspor</span>
              <ChevronDown className={`w-3.5 h-3.5 text-amber-600 dark:text-amber-400 transition-transform ${isBatchMenuOpen ? 'rotate-180' : ''}`} />
            </Button>

            {isBatchMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 py-1 divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in-95 duration-100">
                <div className="p-1 space-y-0.5">
                  {/* CETAK BUKU LEGER KELAS (LANDSCAPE) */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsBatchMenuOpen(false);
                      onPrintLeger();
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <BookOpen size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-amber-700 dark:group-hover:text-amber-300">
                        Buku Leger (Landscape)
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        Matriks nilai &amp; peringkat resmi (PDF)
                      </div>
                    </div>
                  </button>

                  {/* EKSPOR LEGER EXCEL */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsBatchMenuOpen(false);
                      onExportLeger();
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <FileSpreadsheet size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                        Ekspor Leger ke Excel
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        Download spreadsheet .xlsx nilai sekelas
                      </div>
                    </div>
                  </button>
                </div>

                {isJenjangSmk && (
                  <div className="p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsBatchMenuOpen(false);
                        onBatchPrintRaporPkl();
                      }}
                      disabled={isBatchPklPrinting}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-teal-950/40 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer group disabled:opacity-50"
                    >
                      <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        {isBatchPklPrinting ? <Loader2 size={14} className="animate-spin" /> : <Building2 size={14} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-teal-700 dark:group-hover:text-teal-300">
                          Rapor PKL Sekelas
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          Kompilasi 2 halaman PKL per siswa (PDF)
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Baris 2: Status Bar Elegan & Ringkas */}
      <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {isPureWaliKelas ? (
            <Badge variant="outline" className="text-[10px] font-bold border-indigo-200 text-indigo-700 dark:border-indigo-800 dark:text-indigo-300 bg-indigo-50/60 dark:bg-indigo-950/40">
              Mode Wali Kelas • {currentKelasNama || 'Kelas Binaan'}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] font-bold border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300 bg-amber-50/60 dark:bg-amber-950/40">
              Mode Supervisi Kurikulum &amp; Manajemen
            </Badge>
          )}

          {kurikulumStrukturListLength > 0 && (
            <Badge variant="outline" className="text-[10px] font-semibold border-emerald-200 text-emerald-600 dark:border-emerald-800 dark:text-emerald-400 whitespace-nowrap bg-emerald-50/40 dark:bg-emerald-950/20">
              Kurikulum: {kurikulumStrukturListLength} Mapel ({kurikulumTotalJp} JP)
            </Badge>
          )}
        </div>

        <div className="text-[11px] font-medium text-slate-400">
          Siap pratinjau rapor PDF, cetak buku leger, dan monitoring keterisian nilai
        </div>
      </div>
    </Card>
  );
});

CetakRaporHeaderCard.displayName = 'CetakRaporHeaderCard';
