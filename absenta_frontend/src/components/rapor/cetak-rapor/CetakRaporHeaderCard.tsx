import React, { memo, useRef, useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Search,
  BookOpen,
  Printer,
  Loader2,
  Building2,
  ChevronDown,
} from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { SearchableSelect, SearchableSelectOption } from '../../ui/SearchableSelect';
import { AcademicContextBar } from '../../common/AcademicContextBar';

export interface CetakRaporHeaderCardProps {
  selectedKelas: string;
  onSelectKelas: (kelasId: string) => void;
  kelasOptions: SearchableSelectOption[];
  isLoadingClasses: boolean;
  selectedTahunPelajaran: string;
  selectedSemester: string;
  onTahunPelajaranChange: (tpId: string) => void;
  onSemesterChange: (semId: string) => void;
  tpOptions: SearchableSelectOption[];
  semesterOptions: SearchableSelectOption[];
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  hasLegerData: boolean;
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
}

export const CetakRaporHeaderCard: React.FC<CetakRaporHeaderCardProps> = memo(({
  selectedKelas,
  onSelectKelas,
  kelasOptions,
  isLoadingClasses,
  selectedTahunPelajaran,
  selectedSemester,
  onTahunPelajaranChange,
  onSemesterChange,
  tpOptions,
  semesterOptions,
  searchQuery,
  onSearchQueryChange,
  hasLegerData,
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
    <Card className="p-4 sm:p-5 border-none shadow-xs dark:bg-slate-900/40 w-full max-w-full min-w-0">
      <div className="flex flex-wrap gap-3 sm:gap-4 items-end justify-between w-full max-w-full min-w-0">
        <div className="flex flex-wrap gap-3 items-end w-full max-w-full min-w-0 sm:w-auto">
          {/* Kelas */}
          <div className="space-y-1 w-full max-w-full min-w-0 sm:w-auto">
            <label htmlFor="select-kelas" className="text-[10px] font-bold text-slate-500 uppercase block">
              Pilih Kelas
            </label>
            <SearchableSelect
              id="select-kelas"
              value={selectedKelas}
              onValueChange={onSelectKelas}
              options={kelasOptions}
              placeholder={isLoadingClasses ? 'Memuat kelas...' : 'Pilih Kelas'}
              searchPlaceholder="Cari kelas..."
              isLoading={isLoadingClasses}
              className="w-full max-w-full min-w-0 sm:min-w-[200px]"
            />
          </div>

          {/* Tahun Pelajaran + Semester Selector */}
          <AcademicContextBar
            id="cetak-rapor"
            tahunPelajaranId={selectedTahunPelajaran}
            semesterId={selectedSemester}
            onTahunPelajaranChange={onTahunPelajaranChange}
            onSemesterChange={onSemesterChange}
            tpOptions={tpOptions}
            semesterOptions={semesterOptions}
            variant="filter"
          />

          {/* Search siswa */}
          {selectedKelas && (
            <div className="space-y-1 w-full max-w-full min-w-0 sm:w-auto">
              <label htmlFor="search-siswa" className="text-[10px] font-bold text-slate-500 uppercase block">
                Cari Siswa
              </label>
              <div className="relative w-full max-w-full min-w-0">
                <input
                  id="search-siswa"
                  type="text"
                  placeholder="Nama / NIS..."
                  value={searchQuery}
                  onChange={(e) => onSearchQueryChange(e.target.value)}
                  className="w-full max-w-full min-w-0 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold pl-8 pr-4 py-2.5 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-500"
                />
                <Search size={14} className="absolute left-2.5 top-3 text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}
        </div>

        {/* Action Group: Cetak Massal & Ekspor Leger */}
        {selectedKelas && hasLegerData && (
          <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
            {/* Tombol Utama: Cetak Sekaligus 1 File PDF */}
            <Button
              onClick={onBatchPrintRapor}
              disabled={isBatchPrinting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-100 dark:shadow-none whitespace-nowrap flex-shrink-0"
              title="Cetak seluruh rapor siswa sekelas dalam 1 file PDF gabungan"
            >
              {isBatchPrinting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin flex-shrink-0" />
              ) : (
                <Printer className="w-4 h-4 mr-2 flex-shrink-0" />
              )}
              <span className="hidden sm:inline">CETAK SEKALIGUS (1 FILE PDF)</span>
              <span className="sm:hidden">CETAK 1 FILE</span>
            </Button>

            {/* Dropdown Aksi Sekunder: Leger & Dokumen Lainnya */}
            <div className="relative inline-block text-left" ref={batchMenuRef}>
              <Button
                variant="outline"
                onClick={() => setIsBatchMenuOpen((prev) => !prev)}
                className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold whitespace-nowrap flex-shrink-0 flex items-center gap-1.5"
                title="Opsi cetak buku leger, rapor PKL, dan ekspor excel"
              >
                <BookOpen className="w-4 h-4 text-slate-500" />
                <span>Dokumen &amp; Ekspor</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isBatchMenuOpen ? 'rotate-180' : ''}`} />
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
        )}
      </div>

      {/* Contextual Badges: Mode & Kurikulum */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {isPureWaliKelas ? (
          <Badge variant="outline" className="text-[10px] font-bold border-indigo-200 text-indigo-700 dark:border-indigo-800 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/30">
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
    </Card>
  );
});

CetakRaporHeaderCard.displayName = 'CetakRaporHeaderCard';
