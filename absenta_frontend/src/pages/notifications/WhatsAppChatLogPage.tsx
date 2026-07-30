import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { Input, Badge, Loader } from '@/components/ui';
import {
  MessageSquare,
  Search,
  User,
  Users,
  ArrowLeft,
  RefreshCw,
  Bot,
  BookOpen,
  GraduationCap,
  HeartHandshake,
  ChevronUp,
} from 'lucide-react';
import {
  getWaChatLogContacts,
  getWaChatLogDetail,
  WaChatContact,
  WaChatMessage,
} from '@/api/whatsapp.api';
import { toast } from 'sonner';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatRole(role: string | null): { label: string; color: string; icon: React.ReactNode } {
  switch (role) {
    case 'G':
      return { label: 'Guru', color: 'bg-blue-500/20 text-blue-400 border border-blue-500/30', icon: <BookOpen className="w-3 h-3" /> };
    case 'S':
      return { label: 'Siswa', color: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30', icon: <GraduationCap className="w-3 h-3" /> };
    case 'O':
      return { label: 'Ortu', color: 'bg-orange-500/20 text-orange-400 border border-orange-500/30', icon: <HeartHandshake className="w-3 h-3" /> };
    default:
      return { label: 'Tamu', color: 'bg-slate-500/20 text-slate-400 border border-slate-500/30', icon: <User className="w-3 h-3" /> };
  }
}

function formatTime(iso: string): string {
  try {
    const date = parseISO(iso);
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return 'Kemarin';
    return format(date, 'd MMM', { locale: idLocale });
  } catch {
    return '';
  }
}

function formatTimeFull(iso: string): string {
  try {
    return format(parseISO(iso), 'HH:mm, d MMM yyyy', { locale: idLocale });
  } catch {
    return '';
  }
}

function formatDateGroup(iso: string): string {
  try {
    const date = parseISO(iso);
    if (isToday(date)) return 'Hari Ini';
    if (isYesterday(date)) return 'Kemarin';
    return format(date, 'EEEE, d MMMM yyyy', { locale: idLocale });
  } catch {
    return '';
  }
}

function getInitial(nama: string | null, phone: string): string {
  if (nama) return nama.charAt(0).toUpperCase();
  return phone.charAt(phone.length - 1);
}

function truncateMsg(msg: string, max = 45): string {
  return msg.length > max ? msg.slice(0, max) + '…' : msg;
}

// ── Avatar ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'from-blue-600 to-blue-400',
  'from-emerald-600 to-emerald-400',
  'from-violet-600 to-violet-400',
  'from-orange-600 to-orange-400',
  'from-rose-600 to-rose-400',
  'from-cyan-600 to-cyan-400',
];

function avatarColor(phone: string): string {
  let hash = 0;
  for (let i = 0; i < phone.length; i++) hash = phone.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ── Contact List Item ─────────────────────────────────────────────────────────

interface ContactItemProps {
  contact: WaChatContact;
  isActive: boolean;
  onClick: () => void;
}

const ContactItem: React.FC<ContactItemProps> = ({ contact, isActive, onClick }) => {
  const roleInfo = formatRole(contact.role);
  const color = avatarColor(contact.phone);
  const initial = getInitial(contact.nama, contact.phone);

  return (
    <button
      id={`wa-contact-${contact.phone}`}
      onClick={onClick}
      className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all duration-150 border-b border-white/5 hover:bg-white/5 ${
        isActive ? 'bg-emerald-500/10 border-l-2 border-l-emerald-500' : ''
      }`}
    >
      {/* Avatar */}
      <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${color} flex items-center justify-center shrink-0 font-bold text-white text-base shadow-md`}>
        {initial}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="font-semibold text-sm text-white truncate">
            {contact.nama ?? contact.phone}
          </span>
          <span className="text-[11px] text-slate-400 shrink-0">{formatTime(contact.last_at)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${roleInfo.color}`}>
            {roleInfo.icon} {roleInfo.label}
          </span>
          <span className="text-[12px] text-slate-400 truncate">
            {contact.last_direction === 'IN' ? '' : '🤖 '}
            {truncateMsg(contact.last_message)}
          </span>
        </div>
      </div>
    </button>
  );
};

// ── Chat Bubble ───────────────────────────────────────────────────────────────

const ChatBubble: React.FC<{ msg: WaChatMessage }> = ({ msg }) => {
  const isOut = msg.direction === 'OUT';

  return (
    <div className={`flex ${isOut ? 'justify-end' : 'justify-start'} mb-1`}>
      {!isOut && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-600 to-slate-500 flex items-center justify-center shrink-0 mr-2 mt-1">
          <User className="w-3.5 h-3.5 text-slate-200" />
        </div>
      )}
      <div className={`max-w-[72%] group`}>
        <div
          className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-md ${
            isOut
              ? 'bg-gradient-to-br from-emerald-600 to-emerald-500 text-white rounded-br-sm'
              : 'bg-slate-700/80 text-slate-100 rounded-bl-sm border border-white/10'
          }`}
        >
          {msg.message}
        </div>
        <div className={`text-[10px] text-slate-500 mt-0.5 px-1 ${isOut ? 'text-right' : 'text-left'}`}>
          {formatTimeFull(msg.created_at)}
        </div>
      </div>
      {isOut && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-700 to-emerald-500 flex items-center justify-center shrink-0 ml-2 mt-1">
          <Bot className="w-3.5 h-3.5 text-white" />
        </div>
      )}
    </div>
  );
};

// ── Date Divider ──────────────────────────────────────────────────────────────

const DateDivider: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center gap-3 my-4 px-2">
    <div className="flex-1 h-px bg-white/10" />
    <span className="text-[11px] text-slate-400 bg-slate-800/80 px-3 py-1 rounded-full border border-white/10">
      {label}
    </span>
    <div className="flex-1 h-px bg-white/10" />
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────

const WhatsAppChatLogPage: React.FC = () => {
  const [contacts, setContacts] = useState<WaChatContact[]>([]);
  const [totalContacts, setTotalContacts] = useState(0);
  const [contactPage, setContactPage] = useState(1);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [selectedContact, setSelectedContact] = useState<WaChatContact | null>(null);
  const [messages, setMessages] = useState<WaChatMessage[]>([]);
  const [totalMessages, setTotalMessages] = useState(0);
  const [msgPage, setMsgPage] = useState(1);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setContactPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch contacts
  const fetchContacts = useCallback(async (page = 1, append = false) => {
    setContactsLoading(true);
    try {
      const res = await getWaChatLogContacts({ search: debouncedSearch, page, limit: 30 });
      if (res.success) {
        setContacts(prev => append ? [...prev, ...res.data] : res.data);
        setTotalContacts(res.total);
      }
    } catch {
      toast.error('Gagal memuat daftar kontak');
    } finally {
      setContactsLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => { fetchContacts(1, false); }, [fetchContacts]);

  // Fetch messages for selected contact
  const fetchMessages = useCallback(async (phone: string, page = 1, prepend = false) => {
    if (page === 1) setMessagesLoading(true);
    else setLoadingMore(true);
    try {
      const res = await getWaChatLogDetail(phone, { page, limit: 50 });
      if (res.success) {
        setMessages(prev => prepend ? [...res.data, ...prev] : res.data);
        setTotalMessages(res.total);
      }
    } catch {
      toast.error('Gagal memuat riwayat percakapan');
    } finally {
      setMessagesLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const handleSelectContact = (contact: WaChatContact) => {
    setSelectedContact(contact);
    setMessages([]);
    setMsgPage(1);
    setTotalMessages(0);
    fetchMessages(contact.phone, 1, false);
  };

  // Auto-scroll to bottom on first load
  useEffect(() => {
    if (!messagesLoading && messages.length > 0 && msgPage === 1) {
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messagesLoading, messages, msgPage]);

  // Load more messages (scroll up)
  const handleLoadMoreMessages = () => {
    if (!selectedContact || loadingMore) return;
    const nextPage = msgPage + 1;
    setMsgPage(nextPage);
    fetchMessages(selectedContact.phone, nextPage, true);
  };

  // Load more contacts
  const handleLoadMoreContacts = () => {
    if (contactsLoading || contacts.length >= totalContacts) return;
    const next = contactPage + 1;
    setContactPage(next);
    fetchContacts(next, true);
  };

  // Group messages by date for dividers
  const groupedMessages = React.useMemo(() => {
    const groups: { date: string; msgs: WaChatMessage[] }[] = [];
    for (const msg of messages) {
      const label = formatDateGroup(msg.created_at);
      const last = groups[groups.length - 1];
      if (!last || last.date !== label) groups.push({ date: label, msgs: [msg] });
      else last.msgs.push(msg);
    }
    return groups;
  }, [messages]);

  const roleInfo = selectedContact ? formatRole(selectedContact.role) : null;
  const hasMoreMessages = messages.length < totalMessages;

  return (
    <AcademicPageLayout
      title="Riwayat Chat Chatbot WA"
      subtitle="Monitor percakapan pengguna dengan chatbot WhatsApp"
      icon={<MessageSquare className="w-5 h-5" />}
    >
      <div className="flex h-[calc(100vh-200px)] min-h-[500px] bg-slate-900/50 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">

        {/* ── Sidebar Kontak ── */}
        <div className={`flex flex-col border-r border-white/10 bg-slate-900/70 ${selectedContact ? 'hidden md:flex w-80' : 'flex w-full md:w-80'}`}>
          {/* Header sidebar */}
          <div className="px-4 py-4 border-b border-white/10 bg-slate-800/60">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-white text-sm">Percakapan</span>
                {totalContacts > 0 && (
                  <span className="bg-emerald-500/20 text-emerald-400 text-[11px] px-2 py-0.5 rounded-full border border-emerald-500/30">
                    {totalContacts}
                  </span>
                )}
              </div>
              <button
                id="wa-chatlog-refresh"
                onClick={() => fetchContacts(1, false)}
                disabled={contactsLoading}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${contactsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="wa-chatlog-search"
                type="text"
                placeholder="Cari nama atau nomor..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-700/60 border border-white/10 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
              />
            </div>
          </div>

          {/* Contact list */}
          <div className="flex-1 overflow-y-auto">
            {contactsLoading && contacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                <Loader className="w-6 h-6 animate-spin" />
                <span className="text-sm">Memuat kontak...</span>
              </div>
            ) : contacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 px-6 text-center">
                <MessageSquare className="w-10 h-10 opacity-30" />
                <p className="text-sm">Belum ada percakapan</p>
                <p className="text-xs opacity-60">Log percakapan chatbot WA akan muncul di sini</p>
              </div>
            ) : (
              <>
                {contacts.map(contact => (
                  <ContactItem
                    key={contact.phone}
                    contact={contact}
                    isActive={selectedContact?.phone === contact.phone}
                    onClick={() => handleSelectContact(contact)}
                  />
                ))}
                {contacts.length < totalContacts && (
                  <button
                    onClick={handleLoadMoreContacts}
                    disabled={contactsLoading}
                    className="w-full py-3 text-xs text-slate-400 hover:text-emerald-400 hover:bg-white/5 transition-colors"
                  >
                    {contactsLoading ? 'Memuat...' : `Muat lebih banyak (${totalContacts - contacts.length} lagi)`}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Panel Chat ── */}
        <div className={`flex-1 flex flex-col ${!selectedContact ? 'hidden md:flex' : 'flex'}`}>
          {!selectedContact ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <MessageSquare className="w-9 h-9 text-emerald-400/60" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-slate-300 mb-1">Pilih percakapan</p>
                <p className="text-sm text-slate-500">Pilih kontak di sebelah kiri untuk melihat riwayat chat</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="px-4 py-3.5 border-b border-white/10 bg-slate-800/60 flex items-center gap-3">
                <button
                  className="md:hidden p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                  onClick={() => setSelectedContact(null)}
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColor(selectedContact.phone)} flex items-center justify-center font-bold text-white shrink-0`}>
                  {getInitial(selectedContact.nama, selectedContact.phone)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-sm truncate">
                      {selectedContact.nama ?? selectedContact.phone}
                    </span>
                    {roleInfo && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${roleInfo.color}`}>
                        {roleInfo.icon} {roleInfo.label}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">
                    {selectedContact.phone} · {selectedContact.total_in} pesan masuk, {selectedContact.total_out} balasan bot
                  </div>
                </div>

                <button
                  id="wa-chatlog-detail-refresh"
                  onClick={() => fetchMessages(selectedContact.phone, 1, false)}
                  disabled={messagesLoading}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${messagesLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Messages */}
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5 bg-slate-900/40" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, rgba(16,185,129,0.03) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(59,130,246,0.03) 0%, transparent 50%)" }}>
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full gap-2 text-slate-400">
                    <Loader className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Memuat percakapan...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                    <MessageSquare className="w-8 h-8 opacity-30" />
                    <p className="text-sm">Belum ada pesan</p>
                  </div>
                ) : (
                  <>
                    {/* Load more button (top) */}
                    {hasMoreMessages && (
                      <div className="flex justify-center mb-2">
                        <button
                          id="wa-chatlog-load-more"
                          onClick={handleLoadMoreMessages}
                          disabled={loadingMore}
                          className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-700/60 hover:bg-slate-700 border border-white/10 rounded-full text-xs text-slate-300 hover:text-white transition-all"
                        >
                          {loadingMore ? (
                            <Loader className="w-3 h-3 animate-spin" />
                          ) : (
                            <ChevronUp className="w-3 h-3" />
                          )}
                          {loadingMore ? 'Memuat...' : `Muat pesan lama (${totalMessages - messages.length} lagi)`}
                        </button>
                      </div>
                    )}

                    {groupedMessages.map(group => (
                      <div key={group.date}>
                        <DateDivider label={group.date} />
                        {group.msgs.map(msg => (
                          <ChatBubble key={msg.id} msg={msg} />
                        ))}
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </>
                )}
              </div>

              {/* Info footer */}
              <div className="px-4 py-2 border-t border-white/10 bg-slate-800/40 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Bot className="w-3 h-3 text-emerald-400" />
                  Chatbot Absenta — hanya baca, log disimpan maks. 3 bulan
                </span>
                <span className="text-[11px] text-slate-500">
                  Total: {totalMessages} pesan
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </AcademicPageLayout>
  );
};

export default WhatsAppChatLogPage;
