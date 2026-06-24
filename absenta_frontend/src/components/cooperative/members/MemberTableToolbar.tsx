import React from 'react';
import { Button } from '../../ui';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { Search, Upload, FileText, CreditCard, Download, Plus } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';

interface MemberTableToolbarLeftProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  filterType: 'ALL' | 'STUDENT' | 'TEACHER';
  setFilterType: (val: 'ALL' | 'STUDENT' | 'TEACHER') => void;
  filterKelasId: string;
  setFilterKelasId: (val: string) => void;
  setPage: (val: number) => void;
  filterTypeOptions: { label: string; value: string }[];
  filterKelasOptions: { label: string; value: string }[];
}

export const MemberTableToolbarLeft: React.FC<MemberTableToolbarLeftProps> = React.memo(({
  searchQuery,
  setSearchQuery,
  filterType,
  setFilterType,
  filterKelasId,
  setFilterKelasId,
  setPage,
  filterTypeOptions,
  filterKelasOptions,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
      <div className="relative w-64">
        <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
          <Search size={14} />
        </span>
        <input
          type="text"
          id="member-search-input"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          placeholder="Cari nama, nomor anggota..."
          aria-label="Cari nama atau nomor anggota koperasi"
          className="w-full h-9 pl-9 pr-4 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
        />
      </div>

      <SearchableSelect
        id="member-type-select"
        value={filterType}
        onValueChange={(val) => {
          setFilterType(val as 'ALL' | 'STUDENT' | 'TEACHER');
          setFilterKelasId('ALL');
          setPage(1);
        }}
        options={filterTypeOptions}
        placeholder="Semua Tipe"
        triggerClassName="min-w-[140px] text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl"
      />

      {filterType === 'STUDENT' && (
        <div className="animate-in fade-in slide-in-from-left-3 duration-200">
          <SearchableSelect
            id="member-kelas-select"
            value={filterKelasId}
            onValueChange={(val) => {
              setFilterKelasId(val);
              setPage(1);
            }}
            options={filterKelasOptions}
            placeholder="Semua Kelas"
            triggerClassName="min-w-[160px] text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl"
          />
        </div>
      )}
    </div>
  );
});

interface MemberTableToolbarRightProps {
  setIsImportModalOpen: (val: boolean) => void;
  handleExportPdf: () => void;
  handleDownloadBulkCardsPdf: () => void;
  isBulkPrinting: boolean;
  handleExportExcel: () => void;
  setIsBulkAddOpen: (val: boolean) => void;
  setIsModalOpen: (val: boolean) => void;
}

export const MemberTableToolbarRight: React.FC<MemberTableToolbarRightProps> = React.memo(({
  setIsImportModalOpen,
  handleExportPdf,
  handleDownloadBulkCardsPdf,
  isBulkPrinting,
  handleExportExcel,
  setIsBulkAddOpen,
  setIsModalOpen,
}) => {
  const { can } = useAuth();
  const canCreate = can('cooperative.members.create');

  return (
    <div className="flex gap-2.5 w-full md:w-auto justify-end">
      {canCreate && (
        <Button
          variant="outline"
          onClick={() => setIsImportModalOpen(true)}
          className="h-9 text-xs font-bold tracking-tight rounded-xl border-slate-200 text-slate-700 dark:text-slate-350 dark:border-slate-800 hover:bg-slate-50 transition-all duration-200 shadow-sm"
        >
          <Upload size={13} className="mr-2 text-indigo-500" />
          Impor Excel
        </Button>
      )}
      <Button
        variant="outline"
        onClick={handleExportPdf}
        className="h-9 text-xs font-bold tracking-tight rounded-xl border-slate-200 text-slate-700 dark:text-slate-350 dark:border-slate-800 hover:bg-slate-50 transition-all duration-200 shadow-sm"
      >
        <FileText size={13} className="mr-2 text-rose-500" />
        Ekspor PDF
      </Button>
      <Button
        variant="outline"
        onClick={handleDownloadBulkCardsPdf}
        disabled={isBulkPrinting}
        className="h-9 text-xs font-bold tracking-tight rounded-xl border-slate-200 text-slate-700 dark:text-slate-350 dark:border-slate-800 hover:bg-slate-50 transition-all duration-200 shadow-sm"
      >
        {isBulkPrinting ? (
          <span className="w-3.5 h-3.5 mr-2 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        ) : (
          <CreditCard size={13} className="mr-2 text-indigo-500" />
        )}
        Cetak Kartu Massal
      </Button>
      <Button
        variant="outline"
        onClick={handleExportExcel}
        className="h-9 text-xs font-bold tracking-tight rounded-xl border-slate-200 text-slate-700 dark:text-slate-350 dark:border-slate-800 hover:bg-slate-50 transition-all duration-200 shadow-sm"
      >
        <Download size={13} className="mr-2 text-emerald-500" />
        Ekspor Excel
      </Button>
      {canCreate && (
        <>
          <Button
            variant="outline"
            onClick={() => setIsBulkAddOpen(true)}
            className="h-9 text-xs font-bold tracking-tight rounded-xl border-indigo-200 text-indigo-600 dark:text-indigo-400 dark:border-indigo-900 hover:bg-indigo-50/50 transition-all duration-200 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 mr-2" />
            Tambah Massal
          </Button>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="h-9 text-xs font-bold tracking-tight rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/15 transition-all duration-300 transform hover:-translate-y-0.5"
          >
            <Plus className="w-3.5 h-3.5 mr-2" />
            Tambah Anggota
          </Button>
        </>
      )}
    </div>
  );
});
