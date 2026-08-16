import React, { useState, useEffect } from 'react';
import { X, ScrollText, Calendar, Tag, FileText, CheckCircle2 } from 'lucide-react';

interface AddJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddJournal: (data: {
    category: 'Rapat Ortu' | 'Kasus Teratasi' | 'Pembinaan Kelas' | 'Catatan Khusus' | 'Agenda Jam Walas' | 'Koordinasi BK';
    title: string;
    content: string;
    tags: string[];
    date?: string;
  }) => void;
}

export const AddJournalModal: React.FC<AddJournalModalProps> = ({
  isOpen,
  onClose,
  onAddJournal
}) => {
  const [category, setCategory] = useState<'Rapat Ortu' | 'Kasus Teratasi' | 'Pembinaan Kelas' | 'Catatan Khusus' | 'Agenda Jam Walas' | 'Koordinasi BK'>('Pembinaan Kelas');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('Jam Walas, Evaluasi');
  const [journalDate, setJournalDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    onAddJournal({
      category,
      title: title.trim(),
      content: content.trim(),
      tags,
      date: journalDate
    });

    onClose();
    setTitle('');
    setContent('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl w-full max-w-full sm:max-w-xl md:max-w-2xl max-h-[92vh] sm:max-h-[88vh] shadow-2xl border border-slate-200 dark:border-slate-800 relative flex flex-col overflow-hidden my-auto">
        {/* Header - Responsive padding & sticky */}
        <div className="bg-indigo-950 text-white px-4 sm:px-6 py-3.5 sm:py-4.5 rounded-t-2xl sm:rounded-t-3xl flex items-center justify-between shrink-0 border-b border-indigo-900/50">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 bg-indigo-900/80 rounded-xl shrink-0 text-indigo-300">
              <ScrollText className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base text-white truncate">
                Catat Jurnal & Agenda Walas
              </h3>
              <p className="text-[11px] sm:text-xs text-indigo-300 truncate hidden xs:block">
                Dokumentasi kegiatan pembinaan & rekam jejak kelas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="p-1.5 sm:p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Grid 2 Kolom di Tablet & Desktop: Kategori & Tanggal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Kategori Agenda / Jurnal <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full text-xs sm:text-sm p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer"
              >
                <option value="Pembinaan Kelas">🏫 Pembinaan Kelas</option>
                <option value="Agenda Jam Walas">⏰ Agenda Jam Walas</option>
                <option value="Rapat Ortu">👨‍👩‍👧 Rapat Ortu (Paguyuban)</option>
                <option value="Kasus Teratasi">🤝 Kasus Teratasi (Mediasi)</option>
                <option value="Koordinasi BK">🩺 Koordinasi BK</option>
                <option value="Catatan Khusus">📝 Catatan Khusus</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Tanggal Pelaksanaan <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={journalDate}
                  onChange={(e) => setJournalDate(e.target.value)}
                  className="w-full text-xs sm:text-sm p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  required
                />
              </div>
            </div>
          </div>

          {/* Judul Jurnal */}
          <div>
            <label className="block text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Judul Jurnal / Topik Pertemuan <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: Evaluasi Kesiapan Ujian & Pembagian Kartu Peserta"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs sm:text-sm p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              required
            />
          </div>

          {/* Isi Ringkasan Jurnal Walas */}
          <div>
            <label className="block text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Isi Ringkasan & Hasil Pembinaan <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              placeholder="Dokumentasikan poin-poin penting hasil pertemuan, notulensi kesepakatan, atau tindakan pembinaan yang dilakukan Wali Kelas..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-y min-h-[100px] sm:min-h-[120px]"
              required
            />
          </div>

          {/* Tag & Label */}
          <div>
            <label className="block text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Tag / Label Kata Kunci:
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Contoh: Jam Walas, Ujian, Paguyuban, Evaluasi (Pisahkan dengan koma)"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full text-xs sm:text-sm p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1">
              Gunakan tanda koma (,) untuk memisahkan beberapa tag agar mudah difilter.
            </p>
          </div>

          {/* Action Buttons - Stacked on mobile, side-by-side on tablet/desktop */}
          <div className="pt-3 sm:pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer text-center"
            >
              Batal
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-indigo-600/20 transition active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simpan Jurnal Walas</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
