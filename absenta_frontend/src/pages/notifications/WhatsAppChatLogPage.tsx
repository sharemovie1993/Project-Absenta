import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { OperationalPageLayout } from '@/components/layout/OperationalPageLayout';
import {
  Search,
  User,
  RefreshCw,
  Bot,
  BookOpen,
  GraduationCap,
  HeartHandshake,
  ChevronUp,
  MessageSquare,
  Check,
  CheckCheck,
  ArrowLeft,
} from 'lucide-react';
import {
  getWaChatLogContacts,
  getWaChatLogDetail,
  type WaChatContact,
  type WaChatMessage,
} from '@/api/whatsapp.api';
import { toast } from 'sonner';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function formatRole(role: string | null) {
  switch (role) {
    case 'G': return { label: 'Guru',       color: 'bg-blue-500/20 text-blue-400',    icon: <BookOpen    className="w-2.5 h-2.5" /> };
    case 'S': return { label: 'Siswa',      color: 'bg-emerald-500/20 text-emerald-400', icon: <GraduationCap className="w-2.5 h-2.5" /> };
    case 'O': return { label: 'Ortu',       color: 'bg-amber-500/20 text-amber-400',  icon: <HeartHandshake className="w-2.5 h-2.5" /> };
    default:  return { label: 'Tamu',       color: 'bg-slate-500/20 text-slate-400',  icon: <User         className="w-2.5 h-2.5" /> };
  }
}

function formatContactTime(iso: string): string {
  try {
    const d = parseISO(iso);
    if (isToday(d))     return format(d, 'HH:mm');
    if (isYesterday(d)) return 'Kemarin';
    return format(d, 'd/M/yy');
  } catch { return ''; }
}

function formatMsgTime(iso: string): string {
  try { return format(parseISO(iso), 'HH:mm'); } catch { return ''; }
}

function formatDateGroup(iso: string): string {
  try {
    const d = parseISO(iso);
    if (isToday(d))     return 'Hari Ini';
    if (isYesterday(d)) return 'Kemarin';
    return format(d, 'EEEE, d MMMM yyyy', { locale: idLocale });
  } catch { return ''; }
}

const AVATAR_GRADIENTS = [
  'from-violet-600 to-indigo-500',
  'from-emerald-600 to-teal-500',
  'from-rose-600 to-pink-500',
  'from-amber-600 to-orange-500',
  'from-cyan-600 to-sky-500',
  'from-fuchsia-600 to-purple-500',
];

function phoneToGradient(phone: string): string {
  let h = 0;
  for (let i = 0; i < phone.length; i++) h = phone.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_GRADIENTS[Math.abs(h) % AVATAR_GRADIENTS.length];
}

function getInitial(nama: string | null, phone: string) {
  return (nama ? nama[0] : phone.slice(-1)).toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// AVATAR
// ─────────────────────────────────────────────────────────────────────────────
const Avatar: React.FC<{ phone: string; nama: string | null; size?: 'sm' | 'md' | 'lg' }> = ({
  phone, nama, size = 'md'
}) => {
  const cls = size === 'sm' ? 'w-9 h-9 text-sm' : size === 'lg' ? 'w-14 h-14 text-xl' : 'w-11 h-11 text-base';
  return (
    <div className={`${cls} rounded-full bg-gradient-to-br ${phoneToGradient(phone)} flex items-center justify-center font-bold text-white shrink-0 shadow-md select-none`}>
      {getInitial(nama, phone)}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTACT LIST ITEM  (WhatsApp Web style)
// ─────────────────────────────────────────────────────────────────────────────
const ContactItem: React.FC<{
  contact: WaChatContact;
  isActive: boolean;
  onClick: () => void;
}> = ({ contact, isActive, onClick }) => {
  const roleInfo = formatRole(contact.role);
  const lastMsgPreview = contact.last_message.length > 38
    ? contact.last_message.slice(0, 38) + '…'
    : contact.last_message;

  return (
    <button
      id={`wa-contact-${contact.phone.replace(/\W/g, '')}`}
      onClick={onClick}
      className={`
        w-full text-left px-3 py-3 flex items-center gap-3 transition-colors duration-100
        border-b border-[#2a2f32]/60 hover:bg-[#2a2f32] cursor-pointer
        ${isActive ? 'bg-[#2a2f32]' : ''}
      `}
    >
      <Avatar phone={contact.phone} nama={contact.nama} />

      <div className="flex-1 min-w-0">
        {/* Row 1: Nama + Waktu */}
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <span className="font-medium text-[15px] text-[#e9edef] truncate leading-snug">
            {contact.nama ?? contact.phone}
          </span>
          <span className="text-[11px] text-[#8696a0] shrink-0 leading-none">
            {formatContactTime(contact.last_at)}
          </span>
        </div>

        {/* Row 2: Preview pesan + Role badge */}
        <div className="flex items-center gap-1.5">
          {/* Direction tick */}
          {contact.last_direction === 'OUT'
            ? <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] shrink-0" />
            : <Check className="w-3.5 h-3.5 text-[#8696a0] shrink-0" />
          }
          <span className="text-[13px] text-[#8696a0] truncate flex-1 leading-snug">
            {lastMsgPreview}
          </span>
          <span className={`shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide ${roleInfo.color}`}>
            {roleInfo.icon}
            {roleInfo.label}
          </span>
        </div>
      </div>
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CHAT BUBBLE  (WhatsApp Web style)
// ─────────────────────────────────────────────────────────────────────────────
const ChatBubble: React.FC<{ msg: WaChatMessage }> = ({ msg }) => {
  const isOut = msg.direction === 'OUT';

  return (
    <div className={`flex ${isOut ? 'justify-end' : 'justify-start'} mb-1 px-4`}>
      <div className={`
        relative max-w-[65%] md:max-w-[55%] rounded-lg px-3 pt-2 pb-1 shadow-md
        ${isOut
          ? 'bg-[#005c4b] rounded-tr-none'
          : 'bg-[#202c33] rounded-tl-none'
        }
      `}>
        {/* Tail */}
        {isOut
          ? <span className="absolute -right-[7px] top-0 w-0 h-0 border-t-[8px] border-t-[#005c4b] border-l-[8px] border-l-transparent" />
          : <span className="absolute -left-[7px] top-0 w-0 h-0 border-t-[8px] border-t-[#202c33] border-r-[8px] border-r-transparent" />
        }

        {/* Bot label on OUT messages */}
        {isOut && (
          <div className="flex items-center gap-1 mb-1">
            <Bot className="w-3 h-3 text-[#53bdeb]" />
            <span className="text-[10px] text-[#53bdeb] font-semibold">Chatbot Absenta</span>
          </div>
        )}

        {/* Message text — preserve whatsapp formatting: *bold*, newlines */}
        <p className="text-[14.2px] text-[#e9edef] leading-[1.5] whitespace-pre-wrap break-words">
          {msg.message}
        </p>

        {/* Timestamp row */}
        <div className={`flex items-center gap-1 mt-0.5 justify-end`}>
          <span className="text-[11px] text-[#8696a0] leading-none">
            {formatMsgTime(msg.created_at)}
          </span>
          {isOut
            ? <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
            : <Check className="w-3.5 h-3.5 text-[#8696a0]" />
          }
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DATE DIVIDER
// ─────────────────────────────────────────────────────────────────────────────
const DateDivider: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex justify-center my-3 px-4">
    <span className="bg-[#182229] text-[#8696a0] text-[12px] px-3 py-1 rounded-full shadow-sm border border-[#2a2f32]/60">
      {label}
    </span>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────────────────
const EmptyChat: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center gap-4 text-[#8696a0] select-none"
    style={{ background: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.02\'%3E%3Cpolygon points=\'20 10 10 0 0 10 10 20\'/%3E%3C/g%3E%3C/svg%3E")' }}
  >
    <div className="w-20 h-20 rounded-full bg-[#005c4b]/20 border border-[#005c4b]/30 flex items-center justify-center">
      <MessageSquare className="w-9 h-9 text-[#005c4b]/60" />
    </div>
    <div className="text-center">
      <p className="text-[#e9edef] font-semibold text-lg mb-1">Riwayat Chat Chatbot WA</p>
      <p className="text-[13px] text-[#8696a0]">Pilih percakapan untuk melihat riwayat chat</p>
      <p className="text-[11px] text-[#8696a0]/60 mt-1">Log disimpan maksimal 3 bulan</p>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
const WhatsAppChatLogPage: React.FC = () => {
  const [contacts, setContacts]           = useState<WaChatContact[]>([]);
  const [totalContacts, setTotalContacts] = useState(0);
  const [contactPage, setContactPage]     = useState(1);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [search, setSearch]               = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [selected, setSelected]           = useState<WaChatContact | null>(null);
  const [messages, setMessages]           = useState<WaChatMessage[]>([]);
  const [totalMsgs, setTotalMsgs]         = useState(0);
  const [msgPage, setMsgPage]             = useState(1);
  const [loadingMsgs, setLoadingMsgs]     = useState(false);
  const [loadingMore, setLoadingMore]     = useState(false);

  // mobile panel control
  const [mobilePanel, setMobilePanel]     = useState<'contacts' | 'chat'>('contacts');

  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Debounce search ─────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setContactPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // ── Fetch contacts ──────────────────────────────────────────────────────
  const fetchContacts = useCallback(async (page = 1, append = false) => {
    setLoadingContacts(true);
    try {
      const res = await getWaChatLogContacts({ search: debouncedSearch, page, limit: 30 });
      if (res.success) {
        setContacts(prev => append ? [...prev, ...res.data] : res.data);
        setTotalContacts(res.total);
      }
    } catch { toast.error('Gagal memuat daftar kontak'); }
    finally { setLoadingContacts(false); }
  }, [debouncedSearch]);

  useEffect(() => { fetchContacts(1, false); }, [fetchContacts]);

  // ── Fetch messages ──────────────────────────────────────────────────────
  const fetchMessages = useCallback(async (phone: string, page = 1, prepend = false) => {
    if (page === 1) setLoadingMsgs(true);
    else setLoadingMore(true);
    try {
      const res = await getWaChatLogDetail(phone, { page, limit: 50 });
      if (res.success) {
        setMessages(prev => prepend ? [...res.data, ...prev] : res.data);
        setTotalMsgs(res.total);
      }
    } catch { toast.error('Gagal memuat percakapan'); }
    finally { setLoadingMsgs(false); setLoadingMore(false); }
  }, []);

  const handleSelectContact = (c: WaChatContact) => {
    setSelected(c);
    setMessages([]);
    setMsgPage(1);
    setTotalMsgs(0);
    fetchMessages(c.phone, 1, false);
    setMobilePanel('chat');
  };

  // auto-scroll on first load
  useEffect(() => {
    if (!loadingMsgs && messages.length > 0 && msgPage === 1) {
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    }
  }, [loadingMsgs, messages, msgPage]);

  // ── Group messages by date ──────────────────────────────────────────────
  const grouped = useMemo(() => {
    const groups: { date: string; msgs: WaChatMessage[] }[] = [];
    for (const m of messages) {
      const label = formatDateGroup(m.created_at);
      const last  = groups[groups.length - 1];
      if (!last || last.date !== label) groups.push({ date: label, msgs: [m] });
      else last.msgs.push(m);
    }
    return groups;
  }, [messages]);

  const hasMore = messages.length < totalMsgs;
  const roleInfo = selected ? formatRole(selected.role) : null;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <OperationalPageLayout
      title="Riwayat Chat Chatbot WA"
      shortTitle="WA Chat Log"
      subtitle="Monitor percakapan chatbot per user"
      backPath="/settings/whatsapp"
      backLabel="Kembali ke WhatsApp Settings"
    >
      {/*
        WhatsApp Web-style shell:
        Full height, dark #111b21 background, split left/right
      */}
      <div
        className="flex overflow-hidden rounded-xl border border-[#2a2f32] shadow-2xl"
        style={{ height: 'calc(100vh - 130px)', background: '#111b21' }}
      >

        {/* ────────────────────────────────────────────────
            LEFT PANEL: Contact list
        ──────────────────────────────────────────────── */}
        <aside
          className={`
            flex flex-col border-r border-[#2a2f32]
            w-full md:w-[350px] lg:w-[380px] shrink-0
            ${mobilePanel === 'chat' ? 'hidden md:flex' : 'flex'}
          `}
          style={{ background: '#111b21' }}
        >
          {/* Sidebar Header */}
          <div className="px-4 py-3 flex items-center justify-between border-b border-[#2a2f32]"
            style={{ background: '#202c33' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-teal-500 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[#e9edef] font-semibold text-[15px] leading-none">Chatbot WA</p>
                <p className="text-[#8696a0] text-[12px] mt-0.5">
                  {totalContacts > 0 ? `${totalContacts} percakapan` : 'Memuat...'}
                </p>
              </div>
            </div>
            <button
              id="wa-chatlog-refresh"
              onClick={() => fetchContacts(1, false)}
              disabled={loadingContacts}
              className="p-2 rounded-full hover:bg-white/10 text-[#aebac1] transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loadingContacts ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Search bar */}
          <div className="px-3 py-2" style={{ background: '#111b21' }}>
            <div className="relative flex items-center">
              <Search className="w-4 h-4 absolute left-3 text-[#8696a0]" />
              <input
                id="wa-chatlog-search"
                type="text"
                placeholder="Cari nama atau nomor..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg text-[14px] text-[#e9edef] placeholder-[#8696a0] outline-none border-none"
                style={{ background: '#2a2f32' }}
              />
            </div>
          </div>

          {/* Contact list */}
          <div className="flex-1 overflow-y-auto wa-scrollbar">
            {loadingContacts && contacts.length === 0 ? (
              <div className="flex items-center justify-center h-32 gap-2 text-[#8696a0]">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-sm">Memuat...</span>
              </div>
            ) : contacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-[#8696a0] px-6 text-center">
                <MessageSquare className="w-10 h-10 opacity-20" />
                <p className="text-sm">Belum ada percakapan</p>
                <p className="text-xs opacity-60">Log chatbot WA akan muncul di sini</p>
              </div>
            ) : (
              <>
                {contacts.map(c => (
                  <ContactItem
                    key={c.phone}
                    contact={c}
                    isActive={selected?.phone === c.phone}
                    onClick={() => handleSelectContact(c)}
                  />
                ))}
                {contacts.length < totalContacts && (
                  <button
                    onClick={() => { const n = contactPage + 1; setContactPage(n); fetchContacts(n, true); }}
                    disabled={loadingContacts}
                    className="w-full py-3 text-[12px] text-[#8696a0] hover:text-[#53bdeb] hover:bg-[#2a2f32] transition-colors"
                  >
                    {loadingContacts ? 'Memuat...' : `Tampilkan lebih banyak (${totalContacts - contacts.length} lagi)`}
                  </button>
                )}
              </>
            )}
          </div>
        </aside>

        {/* ────────────────────────────────────────────────
            RIGHT PANEL: Chat view
        ──────────────────────────────────────────────── */}
        <main
          className={`
            flex-1 flex flex-col min-w-0
            ${mobilePanel === 'contacts' ? 'hidden md:flex' : 'flex'}
          `}
          style={{
            background: '#0b141a',
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.015'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        >
          {!selected ? (
            <EmptyChat />
          ) : (
            <>
              {/* Chat header */}
              <div
                className="flex items-center gap-3 px-4 py-2.5 border-b border-[#2a2f32] shrink-0"
                style={{ background: '#202c33' }}
              >
                {/* Mobile back button */}
                <button
                  className="md:hidden p-1.5 hover:bg-white/10 rounded-full text-[#aebac1] transition-colors"
                  onClick={() => { setMobilePanel('contacts'); setSelected(null); }}
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <Avatar phone={selected.phone} nama={selected.nama} />

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[15px] text-[#e9edef] leading-none truncate">
                    {selected.nama ?? selected.phone}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {roleInfo && (
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${roleInfo.color}`}>
                        {roleInfo.icon} {roleInfo.label}
                      </span>
                    )}
                    <span className="text-[12px] text-[#8696a0]">
                      {selected.phone} · {selected.total_in}↑ {selected.total_out}↓
                    </span>
                  </div>
                </div>

                <button
                  id="wa-chatlog-detail-refresh"
                  onClick={() => { setMessages([]); setMsgPage(1); fetchMessages(selected.phone, 1, false); }}
                  disabled={loadingMsgs}
                  className="p-2 rounded-full hover:bg-white/10 text-[#aebac1] transition-colors"
                  title="Refresh chat"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingMsgs ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Messages scroll area */}
              <div className="flex-1 overflow-y-auto py-2 wa-scrollbar">
                {loadingMsgs ? (
                  <div className="flex items-center justify-center h-full gap-2 text-[#8696a0]">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-[13px]">Memuat percakapan...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-[#8696a0]">
                    <MessageSquare className="w-7 h-7 opacity-20" />
                    <p className="text-[13px]">Belum ada pesan</p>
                  </div>
                ) : (
                  <>
                    {/* Load older messages */}
                    {hasMore && (
                      <div className="flex justify-center py-2">
                        <button
                          id="wa-chatlog-load-more"
                          onClick={() => { const n = msgPage + 1; setMsgPage(n); fetchMessages(selected.phone, n, true); }}
                          disabled={loadingMore}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] text-[#8696a0] hover:text-[#e9edef] transition-colors border border-[#2a2f32] hover:bg-[#2a2f32]"
                        >
                          {loadingMore
                            ? <RefreshCw className="w-3 h-3 animate-spin" />
                            : <ChevronUp className="w-3 h-3" />
                          }
                          {loadingMore ? 'Memuat...' : `Pesan lebih lama (${totalMsgs - messages.length})`}
                        </button>
                      </div>
                    )}

                    {grouped.map(group => (
                      <React.Fragment key={group.date}>
                        <DateDivider label={group.date} />
                        {group.msgs.map(msg => <ChatBubble key={msg.id} msg={msg} />)}
                      </React.Fragment>
                    ))}
                    <div ref={chatEndRef} className="h-2" />
                  </>
                )}
              </div>

              {/* Read-only footer bar */}
              <div
                className="flex items-center gap-3 px-4 py-3 border-t border-[#2a2f32] shrink-0"
                style={{ background: '#202c33' }}
              >
                <div className="flex-1 px-4 py-2 rounded-full text-[13px] text-[#8696a0] select-none"
                  style={{ background: '#2a2f32' }}>
                  <span className="flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-[#53bdeb]" />
                    Hanya baca — ini adalah log percakapan chatbot
                  </span>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Custom scrollbar style */}
      <style>{`
        .wa-scrollbar::-webkit-scrollbar { width: 6px; }
        .wa-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .wa-scrollbar::-webkit-scrollbar-thumb { background: #374045; border-radius: 3px; }
        .wa-scrollbar::-webkit-scrollbar-thumb:hover { background: #4a5568; }
      `}</style>
    </OperationalPageLayout>
  );
};

export default WhatsAppChatLogPage;
