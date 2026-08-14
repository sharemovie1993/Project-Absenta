import React, { useState, useMemo } from 'react';
import { 
  XMarkIcon, 
  ChatBubbleLeftRightIcon, 
  DocumentTextIcon, 
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { 
  InternalThreadCategory, 
  InternalThreadPriority, 
  InternalThreadType,
  EligibleContactItem 
} from '@/api/internal-communication.api';

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: EligibleContactItem[];
  isLoadingContacts: boolean;
  onSubmit: (payload: {
    type: InternalThreadType;
    title?: string;
    category?: InternalThreadCategory;
    priority?: InternalThreadPriority;
    targetUserIds: string[];
    initialMessage?: string;
    isConfidential?: boolean;
  }) => void;
  isSubmitting: boolean;
}

export const NewConversationModal: React.FC<NewConversationModalProps> = ({
  isOpen,
  onClose,
  contacts,
  isLoadingContacts,
  onSubmit,
  isSubmitting
}) => {
  const [activeTab, setActiveTab] = useState<'DIRECT' | 'DISPOSISI'>('DIRECT');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<InternalThreadCategory>('UMUM');
  const [priority, setPriority] = useState<InternalThreadPriority>('NORMAL');
  const [initialMessage, setInitialMessage] = useState('');
  const [isConfidential, setIsConfidential] = useState(false);

  // Filter contacts by search query
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const q = searchQuery.toLowerCase();
    return contacts.filter(
      c => c.name.toLowerCase().includes(q) || c.role_label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q)
    );
  }, [contacts, searchQuery]);

  // Group contacts by category
  const groupedContacts = useMemo(() => {
    const map = new Map<string, EligibleContactItem[]>();
    filteredContacts.forEach(c => {
      const g = c.group || 'Lainnya';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(c);
    });
    return Array.from(map.entries());
  }, [filteredContacts]);

  if (!isOpen) return null;

  const toggleUserSelection = (userId: string) => {
    if (activeTab === 'DIRECT') {
      setSelectedUserIds([userId]);
    } else {
      setSelectedUserIds(prev => 
        prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
      );
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) return;

    onSubmit({
      type: activeTab === 'DIRECT' ? 'DIRECT' : 'DISPOSISI',
      title: activeTab === 'DISPOSISI' ? title : undefined,
      category,
      priority,
      targetUserIds: selectedUserIds,
      initialMessage: initialMessage.trim() || undefined,
      isConfidential
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
              Mulai Percakapan Baru
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pilih kontak sah di lingkungan sekolah Anda
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Direct Chat vs Disposisi / Tugas */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 pt-3 gap-4 bg-white dark:bg-slate-900">
          <button
            type="button"
            onClick={() => {
              setActiveTab('DIRECT');
              setSelectedUserIds([]);
            }}
            className={`flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'DIRECT'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <ChatBubbleLeftRightIcon className="w-4 h-4" />
            <span>Chat Langsung (1-on-1)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('DISPOSISI');
              setSelectedUserIds([]);
            }}
            className={`flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'DISPOSISI'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <DocumentTextIcon className="w-4 h-4" />
            <span>Disposisi / Laporan Tugas</span>
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Opsi Tambahan untuk Disposisi */}
          {activeTab === 'DISPOSISI' && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Judul Topik / Tugas <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Laporan Siswa Sakit di Piket / Permohonan Proyektor"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Kategori
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as InternalThreadCategory)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                  >
                    <option value="UMUM">Umum</option>
                    <option value="PIKET">Piket Harian</option>
                    <option value="WALIKELAS">Wali Kelas</option>
                    <option value="KURIKULUM">Kurikulum</option>
                    <option value="KESISWAAN">Kesiswaan</option>
                    <option value="BK">Bimbingan Konseling (BK)</option>
                    <option value="SARPRAS">Sarana Prasarana</option>
                    <option value="KEDISIPLINAN">Kedisiplinan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Tingkat Prioritas
                  </label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as InternalThreadPriority)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                  >
                    <option value="LOW">Rendah (Low)</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">Penting (High)</option>
                    <option value="URGENT">Mendesak (Urgent)</option>
                  </select>
                </div>
              </div>

              {/* Mode Kerahasiaan BK */}
              {category === 'BK' && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="confidential"
                    checked={isConfidential}
                    onChange={e => setIsConfidential(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 dark:border-slate-600 focus:ring-blue-500"
                  />
                  <label htmlFor="confidential" className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <ShieldCheckIcon className="w-4 h-4 text-indigo-500" />
                    <span>Tandai sebagai <strong>Konseling Rahasia (Confidential)</strong></span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Pencarian Kontak */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              {activeTab === 'DIRECT' ? 'Pilih Kontak Tujuan' : 'Pilih Peserta / Penerima Disposisi'}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="relative mb-3">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama guru, wali kelas, mapel, atau staf..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            {/* List Kontak Terfilter */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {isLoadingContacts ? (
                <div className="p-4 text-center text-xs text-slate-400">Memuat direktori kontak...</div>
              ) : groupedContacts.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">Tidak ada kontak yang sesuai</div>
              ) : (
                groupedContacts.map(([grp, items]) => (
                  <div key={grp} className="p-2">
                    <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase px-2 py-1">
                      {grp}
                    </div>
                    {items.map(c => {
                      const isSelected = selectedUserIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleUserSelection(c.id)}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-950/40 border border-blue-500/30'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {c.name}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {c.role_label}
                            </p>
                          </div>
                          {isSelected ? (
                            <CheckCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pesan Pembuka */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Pesan Awal (Opsional)
            </label>
            <textarea
              rows={3}
              placeholder="Tulis pesan pengantar atau instruksi awal..."
              value={initialMessage}
              onChange={e => setInitialMessage(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden resize-none"
            />
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={selectedUserIds.length === 0 || isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-all flex items-center gap-1.5"
            >
              {isSubmitting ? 'Memproses...' : activeTab === 'DIRECT' ? 'Mulai Obrolan' : 'Terbitkan Disposisi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
