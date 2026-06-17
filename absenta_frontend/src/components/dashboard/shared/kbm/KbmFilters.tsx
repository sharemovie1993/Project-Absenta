import React from 'react';
import { Button } from '../../../ui';
import { cn } from '../../../../lib/utils';
import {
  Calendar as CalendarIcon, Search, Filter,
  List, LayoutGrid, Activity, Download
} from 'lucide-react';

interface KbmFiltersProps {
  targetDate: string;
  setTargetDate: (date: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedJurusanId: string;
  setSelectedJurusanId: (id: string) => void;
  selectedKelasId: string;
  setSelectedKelasId: (id: string) => void;
  jurusanOptions: Array<{ value: string; label: string }>;
  kelasOptions: Array<{ value: string; label: string }>;
  viewMode: 'LIST' | 'GRID' | 'TABLE';
  setViewMode: (mode: 'LIST' | 'GRID' | 'TABLE') => void;
  isLoading: boolean;
  refetchSessions: () => void;
  handleExport: () => void;
}

export const KbmFilters = React.memo<KbmFiltersProps>(({
  targetDate,
  setTargetDate,
  searchTerm,
  setSearchTerm,
  selectedJurusanId,
  setSelectedJurusanId,
  selectedKelasId,
  setSelectedKelasId,
  jurusanOptions,
  kelasOptions,
  viewMode,
  setViewMode,
  isLoading,
  refetchSessions,
  handleExport
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-1.5 rounded-md border border-gray-100 dark:border-gray-700 shadow-sm">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 flex-1">
          <div className="relative">
            <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-500" />
            <input 
              type="date"
              className="pl-8 pr-3 py-1.5 bg-gray-50 dark:bg-gray-900/50 border-none shadow-sm rounded-sm text-[10px] font-bold focus:ring-1 focus:ring-indigo-500 w-full md:w-auto"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input 
              type="text"
              placeholder="Cari..."
              className="w-full pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-gray-900/50 border-none shadow-sm rounded-sm text-[10px] focus:ring-1 focus:ring-indigo-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
              <select
                className="w-full pl-7 pr-7 py-1.5 bg-gray-50 dark:bg-gray-900/50 border-none shadow-sm rounded-sm text-[9px] font-black uppercase text-gray-600 dark:text-gray-300 focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer"
                value={selectedJurusanId}
                onChange={(e) => setSelectedJurusanId(e.target.value)}
              >
                <option value="ALL">Jurusan</option>
                {jurusanOptions.map((j) => (
                  <option key={j.value} value={j.value}>{j.label}</option>
                ))}
              </select>
            </div>

            <div className="relative flex-1">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
              <select
                className="w-full pl-7 pr-7 py-1.5 bg-gray-50 dark:bg-gray-900/50 border-none shadow-sm rounded-sm text-[9px] font-black uppercase text-gray-600 dark:text-gray-300 focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer"
                value={selectedKelasId}
                onChange={(e) => setSelectedKelasId(e.target.value)}
              >
                <option value="ALL">Kelas</option>
                {kelasOptions.map((k) => (
                  <option key={k.value} value={k.value}>{k.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-2 border-t md:border-t-0 pt-2 md:pt-0">
          <div className="flex bg-gray-50 dark:bg-gray-900/50 p-0.5 rounded-sm shadow-inner border border-gray-100 dark:border-gray-800 items-center gap-0.5">
            <button 
              onClick={() => setViewMode('LIST')}
              className={cn("p-1 rounded-sm transition-all flex items-center gap-1", viewMode === 'LIST' ? "bg-indigo-600 text-white shadow-sm" : "text-gray-400")}
            >
              <List size={12} />
              {viewMode === 'LIST' && <span className="text-[8px] font-black uppercase">List</span>}
            </button>
            <button 
              onClick={() => setViewMode('GRID')}
              className={cn("p-1 rounded-sm transition-all flex items-center gap-1", viewMode === 'GRID' ? "bg-indigo-600 text-white shadow-sm" : "text-gray-400")}
            >
              <LayoutGrid size={12} />
              {viewMode === 'GRID' && <span className="text-[8px] font-black uppercase">Grid</span>}
            </button>
            <button 
              onClick={() => setViewMode('TABLE')}
              className={cn("p-1 rounded-sm transition-all flex items-center gap-1", viewMode === 'TABLE' ? "bg-indigo-600 text-white shadow-sm" : "text-gray-400")}
            >
              <Activity size={12} className="rotate-90" />
              {viewMode === 'TABLE' && <span className="text-[8px] font-black uppercase">Table</span>}
            </button>
          </div>
          
          <Button variant="ghost" size="sm" onClick={refetchSessions} className="rounded-sm text-gray-400 h-7 w-7 p-0 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800">
            <Activity size={12} className={isLoading ? 'animate-spin' : ''} />
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-sm border-indigo-100 text-indigo-600 hover:bg-indigo-50 font-black text-[8px] uppercase tracking-widest px-3 h-7 shadow-sm"
            onClick={handleExport}
          >
            <Download size={10} className="mr-1.5" />
            Export
          </Button>
        </div>
      </div>
    </div>
  );
});

KbmFilters.displayName = 'KbmFilters';
