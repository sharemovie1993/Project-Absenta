import React, { memo, useRef, useState, useEffect } from 'react';
import {
  Search,
  BookOpen,
  Printer,
  Loader2,
  Building2,
  ChevronDown,
  X,
  GraduationCap,
  BarChart3,
} from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { SearchableSelect, SearchableSelectOption } from '../../ui/SearchableSelect';
import { AcademicFilterToolbar } from '../../common/academic-filter';
import { TabSwitcher, TabOption } from '../../ui/TabSwitcher';

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
  isLoadingTp?: boolean;
  isLoadingSem?: boolean;
  tabOptions?: TabOption[];
  onRoleTabChange?: (tab: string) => void;
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
  onOpenMonitoringModal?: () => void;
  modeCetakRapor?: 'CP_ONLY' | 'SUMATIF_AND_CP' | 'SUMATIF_ONLY';
  activeRoleTab?: 'wali_kelas' | 'supervisi';
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
  tpOptions = [],
  semesterOptions = [],
  isLoadingTp = false,
  isLoadingSem = false,
  tabOptions = [],
  onRoleTabChange,
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
  onNavigateInputNilai,
  onOpenMonitoringModal,
  modeCetakRapor = 'CP_ONLY',
  activeRoleTab = 'wali_kelas',
}) => {

  return (
    <Card className="p-3.5 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 rounded-2xl w-full max-w-full min-w-0 space-y-3.5">
      {/* Baris 1: Konteks Akademik (TP & Semester) di kiri, Tab Persona & Pintasan Input Nilai di kanan */}
      {(onTahunPelajaranChange || tabOptions.length > 1 || onNavigateInputNilai) && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="w-full md:w-auto">
            {onTahunPelajaranChange && onSemesterChange && (
              <AcademicFilterToolbar
                enableTp={true}
                enableSemester={true}
                values={{
                  tahunPelajaranId: selectedTahunPelajaran || '',
                  semesterId: selectedSemester || '',
                  tingkat: '',
                  kelasId: '',
                  bulan: '',
                  tanggal: '',
                  guruId: '',
                  siswaId: '',
                  searchQuery: '',
                }}
                setTahunPelajaranId={onTahunPelajaranChange}
                setSemesterId={onSemesterChange}
                setTingkat={() => {}}
                setKelasId={() => {}}
                setBulan={() => {}}
                setTanggal={() => {}}
                setGuruId={() => {}}
                setSiswaId={() => {}}
                setSearchQuery={() => {}}
                tpOptions={tpOptions || []}
                semesterOptions={semesterOptions || []}
                tingkatOptions={[]}
                kelasOptions={[]}
                guruOptions={[]}
                siswaOptions={[]}
                isLoadingTp={isLoadingTp}
                isLoadingSem={isLoadingSem}
                variant="compact"
              />
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 w-full md:w-auto">
            {tabOptions.length > 1 && onRoleTabChange && (
              <TabSwitcher
                options={tabOptions}
                activeTab={activeRoleTab}
                onChange={onRoleTabChange}
              />
            )}

            {/* Quick Nav: Lembar Input Nilai (Berada di atas disamping TabSwitcher) */}
            {onNavigateInputNilai && (
              <Button
                variant="outline"
                onClick={onNavigateInputNilai}
                className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold text-xs h-[38px] px-2.5 sm:px-3.5 flex items-center gap-1.5 cursor-pointer shrink-0"
                title="Beralih ke Lembar Penginputan Nilai e-Rapor"
              >
                <BookOpen className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>Input Nilai</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Baris 2: Kontrol Utama Terpadu (Pilih Kelas, Cari Siswa, & Tombol Aksi) */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 w-full">
        {/* Sisi Kiri: Rombel Selector & Pencarian Siswa */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 flex-1 min-w-0">
          {/* Pilih Kelas Rombel / Identitas Kelas Binaan */}
          {activeRoleTab === 'wali_kelas' ? (
            <div className="w-full sm:w-64 md:w-72 shrink-0">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                <GraduationCap size={13} className="text-indigo-500" />
                <span>Kelas Binaan:</span>
              </span>
              <div className="flex items-center justify-between px-3.5 h-[38px] rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-900 dark:text-indigo-200 shadow-2xs">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="truncate">{currentKelasNama || 'Kelas Binaan'}</span>
                </div>
                <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-indigo-200/60 dark:border-indigo-800/60 shrink-0">
                  Wali Kelas
                </span>
              </div>
            </div>
          ) : (
            <div className="w-full sm:w-64 md:w-72 shrink-0">
              <label
                htmlFor="select-kelas"
                className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1"
              >
                <GraduationCap size={13} className="text-indigo-500" />
                <span>Pilih Kelas:</span>
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
          )}

          {/* Cari Siswa */}
          <div className="w-full sm:flex-1 min-w-[200px] max-w-md">
            <label
              htmlFor="search-siswa"
              className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1"
            >
              <Search size={12} className="text-slate-400" />
              <span>Cari Siswa:</span>
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                id="search-siswa"
                type="text"
                placeholder="Ketik nama / NIS..."
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

        {/* Sisi Kanan: Rincian Mapel */}
        {onOpenMonitoringModal && (
          <div className="shrink-0 self-start sm:self-end">
            <Button
              variant="outline"
              onClick={onOpenMonitoringModal}
              className="border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-indigo-50/60 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl font-bold text-xs h-[38px] px-3.5 flex items-center gap-1.5 cursor-pointer"
              title="Lihat Rincian Status Pengisian Nilai Mapel Rombel Ini"
            >
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              <span>Rincian Mapel</span>
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
});

CetakRaporHeaderCard.displayName = 'CetakRaporHeaderCard';
