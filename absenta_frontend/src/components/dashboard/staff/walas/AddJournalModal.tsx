import React, { useState } from 'react';
import { X, ScrollText, Plus } from 'lucide-react';

interface AddJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddJournal: (data: {
    category: 'Rapat Ortu' | 'Kasus Teratasi' | 'Pembinaan Kelas' | 'Catatan Khusus' | 'Agenda Jam Walas' | 'Koordinasi BK';
    title: string;
    content: string;
    tags: string[];
  }) => void;
}

export const AddJournalModal: React.FC<AddJournalModalProps> = ({
  isOpen,
  onClose,
  onAddJournal
}) => {
  if (!isOpen) return null;

  const [category, setCategory] = useState<'Rapat Ortu' | 'Kasus Teratasi' | 'Pembinaan Kelas' | 'Catatan Khusus' | 'Agenda Jam Walas' | 'Koordinasi BK'>('Pembinaan Kelas');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('Jam Walas, Evaluasi');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);

    onAddJournal({
      category,
      title,
      content,
      tags
    });

    onClose();
    setTitle('');
    setContent('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 relative overflow-hidden">
        <div className="bg-indigo-950 text-white p-5 rounded-t-3xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-sm text-white">+ Tambah Catatan Jurnal Walas</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Kategori Agenda / Jurnal:</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
            >
              <option value="Pembinaan Kelas">Pembinaan Kelas</option>
              <option value="Agenda Jam Walas">Agenda Jam Walas</option>
              <option value="Rapat Ortu">Rapat Ortu (Paguyuban)</option>
              <option value="Kasus Teratasi">Kasus Teratasi (Mediasi)</option>
              <option value="Koordinasi BK">Koordinasi BK</option>
              <option value="Catatan Khusus">Catatan Khusus</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Judul Jurnal:</label>
            <input
              type="text"
              placeholder="Contoh: Evaluasi Kesiapan Ujian & Pembagian Kartu Peserta"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Isi Ringkasan Jurnal Walas:</label>
            <textarea
              rows={4}
              placeholder="Dokumentasikan poin-poin penting hasil pertemuan, kesepakatan, atau tindakan Wali Kelas..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tag (Pisahkan Komma):</label>
            <input
              type="text"
              placeholder="Jam Walas, Ujian, Paguyuban"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              Simpan Jurnal Walas
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
