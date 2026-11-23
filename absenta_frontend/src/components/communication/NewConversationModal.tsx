import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { 
  XMarkIcon, 
  ChatBubbleLeftRightIcon, 
  DocumentTextIcon, 
  ShieldCheckIcon,
  UserIcon,
  XCircleIcon,
  MegaphoneIcon
} from '@heroicons/react/24/outline';
import { 
  internalCommunicationApi,
  communicationKeys,
  BroadcastAudienceType,
  InternalThreadCategory, 
  InternalThreadPriority, 
  InternalThreadType,
  EligibleContactItem 
} from '@/api/internal-communication.api';
import { SmartStudentPicker, type Student } from '@/components/common/SmartStudentPicker';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/SearchableSelect';
import { resolveProfilePhotoUrl } from '@/lib/utils';

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (threadId: string) => void;
  initialTab?: 'DIRECT' | 'DISPOSISI' | 'BROADCAST';
  contacts?: EligibleContactItem[];
  isLoadingContacts?: boolean;
  onSubmit?: (payload: {
    type: InternalThreadType;
    title?: string;
    category?: InternalThreadCategory;
    priority?: InternalThreadPriority;
    targetUserIds: string[];
    initialMessage?: string;
    isConfidential?: boolean;
  }) => void;
  isSubmitting?: boolean;
}

export const NewConversationModal: React.FC<NewConversationModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  initialTab = 'DIRECT',
  contacts: contactsProp,
  isLoadingContacts: isLoadingContactsProp,
  onSubmit,
  isSubmitting: isSubmittingProp
}) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'DIRECT' | 'DISPOSISI' | 'BROADCAST'>(initialTab);
  const [targetAudience, setTargetAudience] = useState<BroadcastAudienceType>('ALL_USERS');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const [selectedMultipleUserIds, setSelectedMultipleUserIds] = useState<string[]>([]);
  const [pickerType, setPickerType] = useState<'SMART' | 'SELECT'>('SMART');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<InternalThreadCategory>('UMUM');
  const [priority, setPriority] = useState<InternalThreadPriority>('NORMAL');
  const [initialMessage, setInitialMessage] = useState('');
  const [isConfidential, setIsConfidential] = useState(false);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Self-fetch contacts if not provided by parent
  const contactsQuery = useQuery({
    queryKey: communicationKeys.contacts(),
    queryFn: () => internalCommunicationApi.getContacts(),
    enabled: isOpen && !contactsProp && activeTab !== 'BROADCAST',
    staleTime: 60 * 1000,
  });

  const contacts = contactsProp || contactsQuery.data || [];
  const isLoadingContacts = isLoadingContactsProp ?? contactsQuery.isLoading;

  const createThreadMutation = useMutation({
    mutationFn: (payload: Parameters<typeof internalCommunicationApi.createThread>[0]) =>
      internalCommunicationApi.createThread(payload),
    onSuccess: (thread) => {
      toast.success('Percakapan berhasil dibuat');
      queryClient.invalidateQueries({ queryKey: communicationKeys.allThreads });
      if (thread?.id && onCreated) {
        onCreated(thread.id);
      } else {
        onClose();
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal membuat percakapan');
    },
  });

  const broadcastMutation = useMutation({
    mutationFn: () =>
      internalCommunicationApi.createBroadcast({
        title: title.trim(),
        content: initialMessage.trim(),
        targetAudience,
        category,
        priority: priority === 'NORMAL' ? 'HIGH' : priority,
      }),
    onSuccess: (res) => {
      toast.success(
        `Broadcast berhasil dikirim ke ${res?.recipientCount || 'seluruh'} penerima (${res?.audienceLabel || 'Sekolah'})!`
      );
      queryClient.invalidateQueries({ queryKey: communicationKeys.allThreads });
      if (res?.id && onCreated) {
        onCreated(res.id);
      } else {
        onClose();
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal mengirim pesan broadcast');
    },
  });

  const isSubmitting =
    isSubmittingProp || createThreadMutation.isPending || broadcastMutation.isPending;

  // Transform contacts to SearchableSelectOption
  const contactOptions: SearchableSelectOption[] = useMemo(() => {
    return contacts.map(c => {
      const roleStr = c.role_label || (typeof c.role === 'object' ? (c.role as any)?.name : c.role) || '';
      return {
        value: c.id,
        label: `${c.name}${roleStr ? ` • ${roleStr}` : ''}${c.sub_label ? ` (${c.sub_label})` : ''}`,
        raw: c
      };
    });
  }, [contacts]);

  // Selected contact details from contacts directory
  const selectedContact = useMemo(() => {
    if (selectedEntity) return selectedEntity;
    if (!selectedUserId) return null;
    return contacts.find(c => c.id === selectedUserId) || null;
  }, [contacts, selectedUserId, selectedEntity]);

  if (!isOpen) return null;

  const handleSmartSelect = (student: Student) => {
    const targetUserId = student.user_id || (student as any).userId || student.id;
    if (targetUserId) {
      setSelectedUserId(targetUserId);
      setSelectedEntity({
        id: targetUserId,
        name: student.nama_guru || student.nama_siswa || student.full_name || 'Pengguna',
        role_label: student.nama_guru ? (student.nip ? `Guru (NIP: ${student.nip})` : 'Guru') : (student.Kelas?.nama_kelas ? `Siswa (${student.Kelas.nama_kelas})` : 'Siswa/GTK'),
        avatar: student.foto_profile_url
      });
      if (activeTab === 'DISPOSISI' && !selectedMultipleUserIds.includes(targetUserId)) {
        setSelectedMultipleUserIds(prev => [...prev, targetUserId]);
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === 'BROADCAST') {
      if (!title.trim() || !initialMessage.trim()) return;
      broadcastMutation.mutate();
      return;
    }

    const targetIds = activeTab === 'DIRECT' 
      ? (selectedUserId ? [selectedUserId] : [])
      : selectedMultipleUserIds.length > 0 ? selectedMultipleUserIds : (selectedUserId ? [selectedUserId] : []);

    if (targetIds.length === 0) return;

    const payload = {
      type: (activeTab === 'DIRECT' ? 'DIRECT' : 'DISPOSISI') as InternalThreadType,
      title: activeTab === 'DISPOSISI' ? title : undefined,
      category,
      priority,
      targetUserIds: targetIds,
      initialMessage: initialMessage.trim() || undefined,
      isConfidential: activeTab === 'DISPOSISI' && category === 'BK' ? isConfidential : false
    };

    if (onSubmit) {
      onSubmit(payload);
    } else {
      createThreadMutation.mutate(payload);
    }
  };

  const isFormValid =
    activeTab === 'BROADCAST'
      ? Boolean(title.trim() && initialMessage.trim())
      : activeTab === 'DIRECT'
      ? Boolean(selectedUserId)
      : Boolean(title.trim() && (selectedUserId || selectedMultipleUserIds.length > 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              {activeTab === 'BROADCAST' ? '📢 Siaran / Broadcast Pesan Massal' : 'Mulai Percakapan Baru'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {activeTab === 'BROADCAST'
                ? 'Kirim pesan siaran ke seluruh pengguna; pesan akan langsung muncul di Messenger pojok kanan bawah layar mereka'
                : 'Pilih kontak tujuan di lingkungan sekolah Anda (Guru, Wali Kelas, Siswa, BK)'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Direct Chat vs Disposisi vs Broadcast Massal */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 pt-3 gap-4 bg-white dark:bg-slate-900 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => {
              setActiveTab('DIRECT');
              setSelectedUserId('');
              setSelectedEntity(null);
              setSelectedMultipleUserIds([]);
            }}
            className={`flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
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
              setSelectedEntity(null);
              setSelectedMultipleUserIds([]);
            }}
            className={`flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'DISPOSISI'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <DocumentTextIcon className="w-4 h-4" />
            <span>Disposisi / Laporan Tugas</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('BROADCAST');
            }}
            className={`flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'BROADCAST'
                ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <MegaphoneIcon className="w-4 h-4" />
            <span>📢 Broadcast Massal</span>
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Opsi untuk Broadcast Massal */}
          {activeTab === 'BROADCAST' && (
            <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  Target Penerima Siaran (Broadcast Audience) <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    {
                      id: 'ALL_USERS' as BroadcastAudienceType,
                      label: '👥 Seluruh Pengguna Sekolah',
                      desc: 'Semua Guru, Staf, & Siswa Aktif',
                    },
                    {
                      id: 'ONLINE_USERS' as BroadcastAudienceType,
                      label: '🟢 Pengguna yang Sedang Online',
                      desc: 'Hanya akun yang sedang login saat ini',
                    },
                    {
                      id: 'ALL_GURU_STAFF' as BroadcastAudienceType,
                      label: '🏫 Seluruh Guru & Staf (GTK)',
                      desc: 'Guru, Wali Kelas, TU, & Manajemen',
                    },
                    {
                      id: 'ALL_SISWA' as BroadcastAudienceType,
                      label: '🎓 Seluruh Siswa Aktif',
                      desc: 'Semua akun siswa di sekolah',
                    },
                  ].map((item) => {
                    const selected = targetAudience === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setTargetAudience(item.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          selected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                        }`}
                      >
                        <div className="text-xs font-extrabold">{item.label}</div>
                        <div className={`text-[10.5px] mt-0.5 ${selected ? 'text-emerald-100' : 'text-slate-400'}`}>
                          {item.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Judul Pengumuman / Siaran <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Persiapan Ujian CBT Senin / Pemberitahuan Rapat Dinas"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Kategori Siaran
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as InternalThreadCategory)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden shadow-2xs"
                  >
                    <option value="UMUM">Pengumuman Umum</option>
                    <option value="KURIKULUM">Kurikulum & Ujian CBT</option>
                    <option value="KESISWAAN">Kesiswaan</option>
                    <option value="PIKET">Piket Harian</option>
                    <option value="SARPRAS">Sarana & Infrastruktur</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Prioritas Notifikasi
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as InternalThreadPriority)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden shadow-2xs"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">Penting (Auto Pop-up Messenger)</option>
                    <option value="URGENT">Darurat / Mendesak</option>
                  </select>
                </div>
              </div>
            </div>
          )}

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

          {/* Pemilihan Kontak Menggunakan SmartStudentPicker (Hanya untuk DIRECT & DISPOSISI) */}
          {activeTab !== 'BROADCAST' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span>{activeTab === 'DIRECT' ? 'Pilih Kontak Tujuan' : 'Pilih Penerima Disposisi'}</span>
                  <span className="text-red-500">*</span>
                </label>

                {/* Switcher Mode Pencarian */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setPickerType('SMART')}
                    className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                      pickerType === 'SMART'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    ⚡ Smart Picker
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickerType('SELECT')}
                    className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                      pickerType === 'SELECT'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    📋 List Kontak
                  </button>
                </div>
              </div>

              {pickerType === 'SMART' ? (
                <div className="relative">
                  <SmartStudentPicker
                    mode="universal"
                    allowCamera={true}
                    placeholder="Ketik nama guru, NIP, siswa, wali kelas, atau scan kartu..."
                    onSelect={handleSmartSelect}
                    className="w-full"
                  />
                </div>
              ) : (
                <SearchableSelect
                  id="comm-contact-select"
                  value={selectedUserId}
                  onValueChange={(val) => {
                    setSelectedUserId(val);
                    setSelectedEntity(null);
                    if (activeTab === 'DISPOSISI' && val && !selectedMultipleUserIds.includes(val)) {
                      setSelectedMultipleUserIds(prev => [...prev, val]);
                    }
                  }}
                  options={contactOptions}
                  placeholder="Pilih nama guru, wali kelas, mapel, atau staf..."
                  searchPlaceholder="Cari berdasarkan nama atau peran..."
                  emptyMessage={isLoadingContacts ? "Sedang memuat kontak..." : "Tidak ada kontak yang cocok"}
                  isLoading={isLoadingContacts}
                  clearable={true}
                  triggerClassName="h-11 text-xs font-medium bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl"
                />
              )}

              {/* Info Card Kontak Terpilih */}
              {selectedContact && (
                <div className="mt-2.5 p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-150 shadow-2xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-extrabold shrink-0 shadow-xs border-2 border-white dark:border-slate-800 overflow-hidden">
                      {selectedContact.avatar ? (
                        <img src={resolveProfilePhotoUrl(selectedContact.avatar)} alt={selectedContact.name} className="w-full h-full object-cover" />
                      ) : selectedContact.name ? (
                        selectedContact.name.slice(0, 2).toUpperCase()
                      ) : (
                        <UserIcon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                        {selectedContact.name}
                      </p>
                      <p className="text-[11px] font-medium text-blue-700 dark:text-blue-300 truncate">
                        {selectedContact.role_label || (typeof selectedContact.role === 'object' ? (selectedContact.role as any)?.name : selectedContact.role) || ''}
                        {selectedContact.sub_label && ` • ${selectedContact.sub_label}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                      Terpilih
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUserId('');
                        setSelectedEntity(null);
                        setSelectedMultipleUserIds([]);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                      title="Hapus Pemilihan"
                    >
                      <XCircleIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pesan Pembuka / Isi Broadcast */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {activeTab === 'BROADCAST' ? (
                <>
                  Isi Pesan Broadcast / Pengumuman <span className="text-red-500">*</span>
                </>
              ) : (
                'Pesan Awal (Opsional)'
              )}
            </label>
            <textarea
              rows={activeTab === 'BROADCAST' ? 4 : 3}
              required={activeTab === 'BROADCAST'}
              placeholder={
                activeTab === 'BROADCAST'
                  ? 'Tulis isi pesan siaran yang akan dikirimkan ke Messenger seluruh pengguna...'
                  : 'Tulis pesan pengantar atau instruksi awal...'
              }
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
              className={`px-5 py-2 text-xs font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'BROADCAST'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isSubmitting
                ? 'Memproses...'
                : activeTab === 'BROADCAST'
                ? '📢 Kirim Siaran Broadcast'
                : activeTab === 'DIRECT'
                ? 'Mulai Obrolan'
                : 'Terbitkan Disposisi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
