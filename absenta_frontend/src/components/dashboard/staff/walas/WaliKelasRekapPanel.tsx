import React, { useState } from 'react';
import { JournalEntry } from './types';
import { 
  ScrollText, PlusCircle, Printer, Download, Tag, Calendar, 
  Clock, User, BookOpen, CheckCircle, FileCheck, Search, Filter
} from 'lucide-react';

interface WaliKelasRekapPanelProps {
  journalEntries: JournalEntry[];
  onOpenAddJournalModal: () => void;
  onOpenExportModal: () => void;
  isApiConnected?: boolean;
}

export const WaliKelasRekapPanel: React.FC<WaliKelasRekapPanelProps> = ({
  journalEntries,
  onOpenAddJournalModal,
  onOpenExportModal,
  isApiConnected = false
}) => {
  const [categoryFilter, setCategoryFilter] = useState<string>('Semua');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEntries = journalEntries.filter(entry => {
    const matchesSearch = entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;
    if (categoryFilter === 'Semua') return true;
    return entry.category === categoryFilter;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Banner & Quick Export Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>Jurnal & Catatan Pembinaan Kelas</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Dokumentasi digital agenda jam walas, rapat paguyuban, mediasi kasus, dan rekapitulasi pembinaan.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto shrink-0">
          <button
            type="button"
            onClick={onOpenExportModal}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer active:scale-95 text-center"
          >
            <Printer className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Cetak / Export Rekap Rapor</span>
          </button>

          <button
            type="button"
            onClick={onOpenAddJournalModal}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer active:scale-95 text-center"
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span>+ Tambah Jurnal Walas</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="relative w-full lg:w-72 shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari kata kunci jurnal atau tag..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs sm:text-sm rounded-xl pl-9 pr-3 py-2 sm:py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-medium no-scrollbar touch-pan-x py-0.5 min-w-0">
          {['Semua', 'Pembinaan Kelas', 'Agenda Jam Walas', 'Rapat Ortu', 'Kasus Teratasi', 'Koordinasi BK'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 sm:py-2 rounded-xl whitespace-nowrap cursor-pointer transition-all shrink-0 text-xs ${
                categoryFilter === cat
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Journal Entries Timeline */}
      <div className="space-y-4 relative before:absolute before:inset-0 before:left-6 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800 before:hidden md:before:block">
        {filteredEntries.length === 0 ? (
          <div className="p-6 sm:p-10 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl md:ml-12">
            <div className="mb-3">
              {!isApiConnected ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  Belum Terhubung ke API
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  API Terhubung • 0 Catatan Jurnal
                </span>
              )}
            </div>
            <ScrollText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800 dark:text-white">Belum Ada Catatan Jurnal Wali Kelas</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              {!isApiConnected
                ? 'Sistem belum terhubung ke server backend API.'
                : 'Dokumentasikan agenda jam walas dan rapat orang tua dengan menekan tombol "+ Tambah Jurnal Walas".'}
            </p>
          </div>
        ) : (
          filteredEntries.map((entry) => (
          <div
            key={entry.id}
            className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all relative md:ml-12"
          >
            {/* Timeline Marker Icon on Desktop */}
            <div className="hidden md:flex absolute -left-12 top-5 w-7 h-7 rounded-full bg-indigo-600 text-white items-center justify-center font-bold text-xs shadow-md border-2 border-white dark:border-slate-900">
              <BookOpen className="w-3.5 h-3.5" />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                  {entry.category}
                </span>
                <span className="text-[11px] sm:text-xs text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  {entry.date} • {entry.time}
                </span>
              </div>

              <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Penulis: <strong className="text-slate-800 dark:text-slate-200">{entry.author}</strong></span>
              </span>
            </div>

            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-2 leading-snug">
              {entry.title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50/80 dark:bg-slate-800/50 p-3 sm:p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 mb-3 whitespace-pre-line">
              {entry.content}
            </p>

            {/* Tags & Attached Students */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                {entry.tags && entry.tags.map((tag, idx) => (
                  <span key={idx} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] border border-slate-200/60 dark:border-slate-700">
                    #{tag}
                  </span>
                ))}
              </div>

              {entry.attachedStudents && entry.attachedStudents.length > 0 && (
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-[11px] sm:text-xs">
                  Siswa Terkait: {entry.attachedStudents.join(', ')}
                </span>
              )}
            </div>
          </div>
        )))}
      </div>
    </div>
  );
};
