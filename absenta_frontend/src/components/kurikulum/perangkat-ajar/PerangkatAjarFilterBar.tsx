import React from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  Upload,
  BookOpen,
  Sparkles,
  Edit3,
  LayoutGrid,
  List,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PerangkatAjarFilterBarProps {
  setIsLibraryModalOpen: (v: boolean) => void;
  handleCreateNewStudio: () => void;
  handleOpenUploadModal: () => void;
  setAiForm: React.Dispatch<React.SetStateAction<any>>;
  setIsAIModalOpen: (v: boolean) => void;
  setIsWizardModalOpen: (v: boolean) => void;
  viewMode: 'grid' | 'table';
  setViewMode: (v: 'grid' | 'table') => void;
  search: string;
  setSearch: (v: string) => void;
  filterJenis: string;
  setFilterJenis: (v: string) => void;
  filterJenisOptions: { label: string; value: string }[];
  selectedMapel: string;
  setSelectedMapel: (v: string) => void;
  mapelOptions: { label: string; value: string }[];
  selectedTahun: string;
  setSelectedTahun: (v: string) => void;
  tahunOptions: { label: string; value: string }[];
  selectedSemester: string;
  setSelectedSemester: (v: string) => void;
  semesterOptions: { label: string; value: string }[];
  selectedGuru: string;
  setSelectedGuru: (v: string) => void;
  teacherOptions: { label: string; value: string }[];
  isKurikulumOrAdmin: boolean;
}

export const PerangkatAjarFilterBar: React.FC<PerangkatAjarFilterBarProps> = React.memo(({
  setIsLibraryModalOpen,
  handleCreateNewStudio,
  handleOpenUploadModal,
  setAiForm,
  setIsAIModalOpen,
  setIsWizardModalOpen,
  viewMode,
  setViewMode,
  search,
  setSearch,
  filterJenis,
  setFilterJenis,
  filterJenisOptions,
  selectedMapel,
  setSelectedMapel,
  mapelOptions,
  selectedTahun,
  setSelectedTahun,
  tahunOptions,
  selectedSemester,
  setSelectedSemester,
  semesterOptions,
  selectedGuru,
  setSelectedGuru,
  teacherOptions,
  isKurikulumOrAdmin,
}) => {
  return (
    <div className="p-4 space-y-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30">
      {/* Baris 1: Pencarian Cepat & Tombol Aksi */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Input Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari judul perangkat, topik, atau nama guru..."
            className="pl-9 h-10 text-xs rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsLibraryModalOpen(true)}
            className="rounded-xl text-xs font-bold gap-1.5 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Katalog Nasional</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsWizardModalOpen(true)}
            className="rounded-xl text-xs font-bold gap-1.5 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/40"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Wizard</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCreateNewStudio}
            className="rounded-xl text-xs font-bold gap-1.5 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Editor Word</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleOpenUploadModal}
            className="rounded-xl text-xs font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Unggah</span>
          </Button>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              )}
              title="Tampilan Grid Kartu"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={cn(
                'p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              )}
              title="Tampilan Tabel"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Baris 2: Filter Selects */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <SearchableSelect
          value={selectedTahun}
          onValueChange={setSelectedTahun}
          options={[{ label: 'Semua Tahun TP', value: '' }, ...tahunOptions]}
          placeholder="Filter Tahun"
          triggerClassName="h-9 text-xs rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
        />

        <SearchableSelect
          value={selectedSemester}
          onValueChange={setSelectedSemester}
          options={[{ label: 'Semua Semester', value: '' }, ...semesterOptions]}
          placeholder="Filter Semester"
          triggerClassName="h-9 text-xs rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
        />

        <SearchableSelect
          value={filterJenis}
          onValueChange={setFilterJenis}
          options={filterJenisOptions}
          placeholder="Filter Jenis Berkas"
          triggerClassName="h-9 text-xs rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
        />

        <SearchableSelect
          value={selectedMapel}
          onValueChange={setSelectedMapel}
          options={[{ label: 'Semua Mata Pelajaran', value: '' }, ...mapelOptions]}
          placeholder="Filter Mapel"
          triggerClassName="h-9 text-xs rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
        />

        {isKurikulumOrAdmin && (
          <SearchableSelect
            value={selectedGuru}
            onValueChange={setSelectedGuru}
            options={[{ label: 'Semua Guru', value: '' }, ...teacherOptions]}
            placeholder="Filter Guru"
            triggerClassName="h-9 text-xs rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
          />
        )}
      </div>
    </div>
  );
});

PerangkatAjarFilterBar.displayName = 'PerangkatAjarFilterBar';
