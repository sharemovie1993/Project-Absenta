import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  BookOpen, 
  MessageSquare, 
  Tag, 
  Hash, 
  Check, 
  X,
  AlertCircle
} from 'lucide-react';
import { 
  supportTicketApi, 
  type SupportKnowledgeBase, 
  type SupportQuickReply 
} from '../../api/support-ticket.api';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import Modal, { ModalFooter } from '../ui/Modal';
import useConfirm from '../../hooks/useConfirm';

export default function SupportSettingsPanel() {
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<'FAQ' | 'QUICK_REPLIES'>('FAQ');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data States
  const [faqs, setFaqs] = useState<SupportKnowledgeBase[]>([]);
  const [quickReplies, setQuickReplies] = useState<SupportQuickReply[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal Control States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form States (FAQ)
  const [faqTitle, setFaqTitle] = useState('');
  const [faqContent, setFaqContent] = useState('');
  const [faqTagsText, setFaqTagsText] = useState('');

  // Form States (Quick Reply)
  const [qrShortcut, setQrShortcut] = useState('');
  const [qrTitle, setQrTitle] = useState('');
  const [qrContent, setQrContent] = useState('');
  const [qrCategory, setQrCategory] = useState('');

  // Fetch data
  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'FAQ') {
        const res = await supportTicketApi.getKnowledgeBase(searchQuery);
        if (res.success && res.data) {
          setFaqs(res.data);
        }
      } else {
        const res = await supportTicketApi.getQuickReplies();
        if (res.success && res.data) {
          setQuickReplies(res.data);
        }
      }
    } catch (err: any) {
      toast.error('Gagal memuat basis data bantuan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, searchQuery]);

  // Open modal for Creation
  const handleOpenCreate = () => {
    setModalMode('CREATE');
    setEditingId(null);
    
    // Clear Form
    setFaqTitle('');
    setFaqContent('');
    setFaqTagsText('');
    
    setQrShortcut('');
    setQrTitle('');
    setQrContent('');
    setQrCategory('TECHNICAL');

    setIsModalOpen(true);
  };

  // Open modal for Editing
  const handleOpenEdit = (item: any) => {
    setModalMode('EDIT');
    setEditingId(item.id);

    if (activeTab === 'FAQ') {
      const faq = item as SupportKnowledgeBase;
      setFaqTitle(faq.title);
      setFaqContent(faq.content);
      setFaqTagsText(faq.tags.join(', '));
    } else {
      const qr = item as SupportQuickReply;
      setQrShortcut(qr.shortcut);
      setQrTitle(qr.title);
      setQrContent(qr.content);
      setQrCategory(qr.category);
    }

    setIsModalOpen(true);
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (activeTab === 'FAQ') {
        if (!faqTitle.trim() || !faqContent.trim()) {
          toast.error('Judul dan Konten FAQ wajib diisi.');
          return;
        }

        const tags = faqTagsText
          .split(',')
          .map(t => t.trim())
          .filter(t => t.length > 0);

        if (modalMode === 'CREATE') {
          const res = await supportTicketApi.createKnowledgeBase({ title: faqTitle, content: faqContent, tags });
          if (res.success) {
            toast.success('FAQ baru berhasil ditambahkan!');
            setIsModalOpen(false);
            loadData();
          }
        } else if (modalMode === 'EDIT' && editingId) {
          const res = await supportTicketApi.updateKnowledgeBase(editingId, { title: faqTitle, content: faqContent, tags });
          if (res.success) {
            toast.success('FAQ berhasil diperbarui!');
            setIsModalOpen(false);
            loadData();
          }
        }
      } else {
        if (!qrShortcut.trim() || !qrTitle.trim() || !qrContent.trim() || !qrCategory.trim()) {
          toast.error('Semua kolom balasan cepat wajib diisi.');
          return;
        }

        const shortcutClean = qrShortcut.startsWith('/') ? qrShortcut.trim() : `/${qrShortcut.trim()}`;

        if (modalMode === 'CREATE') {
          const res = await supportTicketApi.createQuickReply({
            shortcut: shortcutClean,
            title: qrTitle,
            content: qrContent,
            category: qrCategory
          });
          if (res.success) {
            toast.success('Balasan cepat baru berhasil ditambahkan!');
            setIsModalOpen(false);
            loadData();
          }
        } else if (modalMode === 'EDIT' && editingId) {
          const res = await supportTicketApi.updateQuickReply(editingId, {
            shortcut: shortcutClean,
            title: qrTitle,
            content: qrContent,
            category: qrCategory
          });
          if (res.success) {
            toast.success('Balasan cepat berhasil diperbarui!');
            setIsModalOpen(false);
            loadData();
          }
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan perubahan.');
    }
  };

  // Handle Deletion with ConfirmDialog
  const handleDelete = async (id: string, name: string) => {
    const isConfirmed = await confirm({
      title: `Hapus ${activeTab === 'FAQ' ? 'FAQ' : 'Balasan Cepat'}`,
      description: `Apakah Anda yakin ingin menghapus "${name}" secara permanen dari basis support? Tindakan ini tidak dapat dibatalkan.`,
      style: 'danger'
    });

    if (!isConfirmed) return;

    try {
      if (activeTab === 'FAQ') {
        const res = await supportTicketApi.deleteKnowledgeBase(id);
        if (res.success) {
          toast.success('FAQ berhasil dihapus secara permanen.');
          loadData();
        }
      } else {
        const res = await supportTicketApi.deleteQuickReply(id);
        if (res.success) {
          toast.success('Balasan cepat berhasil dihapus secara permanen.');
          loadData();
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus item.');
    }
  };

  // Filter Quick Replies locally for search query
  const filteredQuickReplies = quickReplies.filter(
    (q) =>
      q.shortcut.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* 🚀 Header & Creation Trigger */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Toggle Selector Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60 max-w-sm">
          <button
            onClick={() => {
              setActiveTab('FAQ');
              setSearchQuery('');
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer ${
              activeTab === 'FAQ'
                ? 'bg-white dark:bg-slate-705 text-indigo-650 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-750 dark:text-slate-400'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            📚 Basis Panduan FAQ
          </button>
          <button
            onClick={() => {
              setActiveTab('QUICK_REPLIES');
              setSearchQuery('');
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer ${
              activeTab === 'QUICK_REPLIES'
                ? 'bg-white dark:bg-slate-705 text-indigo-650 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-750 dark:text-slate-400'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            💬 Balasan Cepat
          </button>
        </div>

        {/* Search Bar & Action Button */}
        <div className="flex items-center gap-2.5">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder={`Cari ${activeTab === 'FAQ' ? 'FAQ/Tag...' : 'Pintasan/Isi...'}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs font-semibold text-slate-700 dark:text-slate-250 transition-all duration-200"
            />
          </div>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-600/25 active:scale-95 transition-all duration-150 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {activeTab === 'FAQ' ? 'Tambah FAQ' : 'Tambah Pintasan'}
          </button>
        </div>

      </div>

      {/* 📚 FAQ LIST RENDER */}
      {activeTab === 'FAQ' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading && faqs.length === 0 ? (
            <div className="col-span-2 text-center py-20 text-xs text-slate-500 font-bold">
              Memuat panduan...
            </div>
          ) : faqs.length === 0 ? (
            <div className="col-span-2 text-center py-20 bg-slate-50 dark:bg-slate-800/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-500 font-bold">
              Belum ada panduan FAQ troubleshooting yang terdaftar.
            </div>
          ) : (
            faqs.map((faq) => (
              <div 
                key={faq.id} 
                className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white line-clamp-1">
                      {faq.title}
                    </h4>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleOpenEdit(faq)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                        title="Edit FAQ"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(faq.id, faq.title)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                        title="Hapus FAQ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3 whitespace-pre-wrap">
                    {faq.content}
                  </p>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                  {faq.tags.map((tag, idx) => (
                    <span 
                      key={idx} 
                      className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-100/30"
                    >
                      <Tag className="w-2.5 h-2.5" />
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 💬 QUICK REPLIES LIST RENDER */}
      {activeTab === 'QUICK_REPLIES' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {loading && quickReplies.length === 0 ? (
            <div className="col-span-3 text-center py-20 text-xs text-slate-500 font-bold">
              Memuat balasan cepat...
            </div>
          ) : filteredQuickReplies.length === 0 ? (
            <div className="col-span-3 text-center py-20 bg-slate-50 dark:bg-slate-800/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-500 font-bold">
              Belum ada pintasan balasan cepat yang terdaftar.
            </div>
          ) : (
            filteredQuickReplies.map((qr) => (
              <div 
                key={qr.id} 
                className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-xl p-4.5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-amber-50 dark:bg-amber-950/50 text-[10px] font-black text-amber-600 dark:text-amber-400 border border-amber-100/40 rounded-lg">
                      <Hash className="w-2.5 h-2.5" />
                      {qr.shortcut}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => handleOpenEdit(qr)}
                        className="p-1 text-slate-400 hover:text-indigo-650 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
                        title="Edit Pintasan"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(qr.id, qr.shortcut)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
                        title="Hapus Pintasan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h5 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                    {qr.title}
                  </h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal line-clamp-3 bg-slate-50 dark:bg-slate-850 p-2.5 rounded-xl border border-slate-100 dark:border-slate-750 font-medium italic">
                    "{qr.content}"
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between text-[9px] font-bold text-slate-400">
                  <span>Kategori: {qr.category}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 📝 CRUD MODAL EDITOR */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={`${modalMode === 'CREATE' ? 'Tambah' : 'Edit'} ${activeTab === 'FAQ' ? 'FAQ Panduan' : 'Balasan Cepat'}`}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          
          {activeTab === 'FAQ' ? (
            /* FAQ FORM GRID */
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-650 dark:text-slate-300">Judul Artikel FAQ</label>
                <input
                  type="text"
                  value={faqTitle}
                  onChange={(e) => setFaqTitle(e.target.value)}
                  placeholder="Contoh: Mengatasi RFID Reader Offline"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:focus:bg-slate-950 focus:bg-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-650 dark:text-slate-300">Tags / Kata Kunci (Pisahkan dengan koma)</label>
                <input
                  type="text"
                  value={faqTagsText}
                  onChange={(e) => setFaqTagsText(e.target.value)}
                  placeholder="Contoh: rfid, hardware, offline, sensor"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:focus:bg-slate-950 focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-650 dark:text-slate-300">Konten Panduan Solusi Lengkap</label>
                <textarea
                  value={faqContent}
                  onChange={(e) => setFaqContent(e.target.value)}
                  placeholder="Tulis kronologi troubleshooting dan langkah-langkah solusinya secara terstruktur..."
                  className="w-full min-h-[160px] p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:focus:bg-slate-950 focus:bg-white resize-none"
                  required
                />
              </div>
            </div>
          ) : (
            /* QUICK REPLY FORM GRID */
            <div className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-650 dark:text-slate-300">Shortcut Pintasan (Mulai dengan /)</label>
                  <input
                    type="text"
                    value={qrShortcut}
                    onChange={(e) => setQrShortcut(e.target.value)}
                    placeholder="Contoh: /rfid-mati"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:focus:bg-slate-950 focus:bg-white font-mono text-amber-600"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-650 dark:text-slate-300">Kategori Masalah</label>
                  <select
                    value={qrCategory}
                    onChange={(e) => setQrCategory(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold focus:outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500/20 dark:focus:bg-slate-950 focus:bg-white"
                  >
                    <option value="TECHNICAL">Kendala Bug/Sistem</option>
                    <option value="BILLING">Tagihan & Keuangan</option>
                    <option value="DEVICE_HARDWARE">Mesin Sensor RFID</option>
                    <option value="FEATURE_REQUEST">Request Fitur Baru</option>
                    <option value="OTHER">Lainnya</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-650 dark:text-slate-300">Judul Pintasan</label>
                <input
                  type="text"
                  value={qrTitle}
                  onChange={(e) => setQrTitle(e.target.value)}
                  placeholder="Contoh: Troubleshoot Sambungan Sensor RFID"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:focus:bg-slate-950 focus:bg-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-650 dark:text-slate-300">Isi Balasan Otomatis</label>
                <textarea
                  value={qrContent}
                  onChange={(e) => setQrContent(e.target.value)}
                  placeholder="Masukkan kalimat balasan otomatis yang akan menggantikan pintasan saat dipanggil..."
                  className="w-full min-h-[120px] p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:focus:bg-slate-950 focus:bg-white resize-none"
                  required
                />
              </div>

            </div>
          )}

          <ModalFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} type="button">
              Batal
            </Button>
            <Button variant="primary" className="bg-indigo-650 hover:bg-indigo-500 text-white font-extrabold" type="submit">
              {modalMode === 'CREATE' ? 'Simpan' : 'Perbarui'}
            </Button>
          </ModalFooter>

        </form>
      </Modal>

    </div>
  );
}
