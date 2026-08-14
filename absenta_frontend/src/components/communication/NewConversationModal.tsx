import React, { useState, useMemo } from 'react';
import { 
  XMarkIcon, 
  ChatBubbleLeftRightIcon, 
  DocumentTextIcon, 
  CheckCircleIcon,
  ShieldCheckIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { 
  InternalThreadCategory, 
  InternalThreadPriority, 
  InternalThreadType,
  EligibleContactItem 
} from '@/api/internal-communication.api';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/SearchableSelect';

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
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedMultipleUserIds, setSelectedMultipleUserIds] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<InternalThreadCategory>('UMUM');
  const [priority, setPriority] = useState<InternalThreadPriority>('NORMAL');
  const [initialMessage, setInitialMessage] = useState('');
  const [isConfidential, setIsConfidential] = useState(false);

  // Transform contacts to SearchableSelectOption
  const contactOptions: SearchableSelectOption[] = useMemo(() => {
    return contacts.map(c => ({
      value: c.id,
      label: `${c.name} • ${c.role_label || c.role}${c.sub_label ? ` (${c.sub_label})` : ''}`,
      raw: c
    }));
  }, [contacts]);

  // Selected contact details
  const selectedContact = useMemo(() => {
    if (!selectedUserId) return null;
    return contacts.find(c => c.id === selectedUserId) || null;
  }, [contacts, selectedUserId]);

  if (!isOpen) return null;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const targetIds = activeTab === 'DIRECT' 
      ? (selectedUserId ? [selectedUserId] : [])
      : selectedMultipleUserIds.length > 0 ? selectedMultipleUserIds : (selectedUserId ? [selectedUserId] : []);

    if (targetIds.length === 0) return;

    onSubmit({
      type: activeTab === 'DIRECT' ? 'DIRECT' : 'DISPOSISI',
      title: activeTab === 'DISPOSISI' ? title : undefined,
      category,
      priority,
      targetUserIds: targetIds,
      initialMessage: initialMessage.trim() || undefined,
      isConfidential: activeTab === 'DISPOSISI' && category === 'BK' ? isConfidential : false
    });
  };

  const isFormValid = activeTab === 'DIRECT' 
    ? Boolean(selectedUserId)
    : Boolean(title.trim() && (selectedUserId || selectedMultipleUserIds.length > 0));

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
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
              setSelectedUserId('');
              setSelectedMultipleUserIds([]);
            }}
            className={`flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
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
              setSelectedUserId('');
              setSelectedMultipleUserIds([]);
            }}
            className={`flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
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
                  placeholder="Contoh: Laporan Siswa Sakit di Piket / Koordinasi Modul Ajar"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden shadow-2xs"
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
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden shadow-2xs"
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
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden shadow-2xs"
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
                    className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 dark:border-slate-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="confidential" className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer">
                    <ShieldCheckIcon className="w-4 h-4 text-indigo-500" />
                    <span>Tandai sebagai <strong>Konseling Rahasia (Confidential)</strong></span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Pemilihan Kontak Menggunakan Komponen Standar SearchableSelect */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              {activeTab === 'DIRECT' ? 'Pilih Kontak Tujuan' : 'Pilih Penerima Disposisi'}
              <span className="text-red-500 ml-1">*</span>
            </label>

            <SearchableSelect
              id="comm-contact-select"
              value={selectedUserId}
              onValueChange={(val) => {
                setSelectedUserId(val);
                if (activeTab === 'DISPOSISI' && val && !selectedMultipleUserIds.includes(val)) {
                  setSelectedMultipleUserIds(prev => [...prev, val]);
                }
              }}
              options={contactOptions}
              placeholder="Ketik untuk mencari nama guru, wali kelas, mapel, atau staf..."
              searchPlaceholder="Cari berdasarkan nama atau peran..."
              emptyMessage={isLoadingContacts ? "Sedang memuat kontak..." : "Tidak ada kontak yang cocok"}
              isLoading={isLoadingContacts}
              clearable={true}
              triggerClassName="h-11 text-xs font-medium bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl"
            />

            {/* Info Card Kontak Terpilih */}
            {selectedContact && (
              <div className="mt-2.5 p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-150 shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                    {selectedContact.name ? selectedContact.name.slice(0, 2).toUpperCase() : <UserIcon className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {selectedContact.name}
                    </p>
                    <p className="text-[11px] text-blue-700 dark:text-blue-300 truncate">
                      {selectedContact.role_label || selectedContact.role}
                      {selectedContact.sub_label && ` • ${selectedContact.sub_label}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                    Terpilih
                  </span>
                  <CheckCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            )}
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
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden resize-none shadow-2xs"
            />
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? 'Memproses...' : activeTab === 'DIRECT' ? 'Mulai Obrolan' : 'Terbitkan Disposisi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
