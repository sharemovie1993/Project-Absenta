import React, { useState } from 'react';
import { JournalEntry } from '../types';
import { 
  ScrollText, PlusCircle, Printer, Download, Tag, Calendar, 
  Clock, User, BookOpen, CheckCircle, FileCheck, Search, Filter
} from 'lucide-react';

interface WaliKelasRekapPanelProps {
  journalEntries: JournalEntry[];
  onOpenAddJournalModal: () => void;
  onOpenExportModal: () => void;
}

export const WaliKelasRekapPanel: React.FC<WaliKelasRekapPanelProps> = ({
  journalEntries,
  onOpenAddJournalModal,
  onOpenExportModal
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
    <div className="space-y-6">
      {/* Top Banner & Quick Export Controls */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-indigo-600" />
            Jurnal & Catatan Pengembangan Rombel
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Dokumentasi digital rapat orang tua, mediasi kasus, agenda jam walas, dan ekspor rekapitulasi rapor.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onOpenExportModal}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer active:scale-95"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            Cetak / Export Rekap Rapor
          </button>

          <button
            onClick={onOpenAddJournalModal}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            + Tambah Jurnal Walas
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari kata kunci jurnal atau tag..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 text-xs rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-medium no-scrollbar">
          {['Semua', 'Pembinaan Kelas', 'Rapat Ortu', 'Kasus Teratasi', 'Koordinasi BK', 'Agenda Jam Walas'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap cursor-pointer transition-all ${
                categoryFilter === cat
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Journal Entries Timeline */}
      <div className="space-y-4 relative before:absolute before:inset-0 before:left-6 before:w-0.5 before:bg-slate-200/80 before:hidden md:before:block">
        {filteredEntries.map((entry) => (
          <div
            key={entry.id}
            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all relative md:ml-12"
          >
            {/* Timeline Marker Icon on Desktop */}
            <div className="hidden md:flex absolute -left-12 top-5 w-7 h-7 rounded-full bg-indigo-600 text-white items-center justify-center font-bold text-xs shadow-md border-2 border-white">
              <BookOpen className="w-3.5 h-3.5" />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-900">
                  {entry.category}
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {entry.date} • {entry.time}
                </span>
              </div>

              <span className="text-xs text-slate-500 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Penulis: <strong className="text-slate-800">{entry.author}</strong>
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-2">{entry.title}</h3>
            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/60 p-3 rounded-xl border border-slate-100 mb-3">
              {entry.content}
            </p>

            {/* Tags & Attached Students */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                {entry.tags.map((tag, idx) => (
                  <span key={idx} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[11px]">
                    #{tag}
                  </span>
                ))}
              </div>

              {entry.attachedStudents && entry.attachedStudents.length > 0 && (
                <span className="text-indigo-600 font-semibold text-[11px]">
                  Siswa Terkait: {entry.attachedStudents.join(', ')}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
