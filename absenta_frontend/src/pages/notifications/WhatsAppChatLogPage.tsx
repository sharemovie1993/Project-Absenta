import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  Users,
  Megaphone,
  Copy,
  Check,
  CheckCheck,
  ShieldCheck,
  Info,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

import {
  getWaChatLogContacts,
  getWaChatLogDetail,
  getWaParticipatingGroups,
  type WaChatContact,
  type WaChatMessage,
  type WaGroupInfo,
} from '@/api/whatsapp.api';
import { toast } from 'sonner';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

import { TarikGuruJPModal } from '@/components/kurikulum/jadwal-builder/TarikGuruJPModal';
import { useUnifiedScheduleData } from '@/hooks/attendance/useUnifiedScheduleData';
import { useKelasOptions, useGuruOptions } from '@/components/common';

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
  return (
    <div
      onClick={onClick}
      className={`
        flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors border-b border-[#2a2f32]/60 select-none
        ${isActive ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]'}
      `}
    >
      <Avatar phone={contact.phone} nama={contact.nama} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="font-medium text-[15px] text-[#e9edef] truncate leading-none">
            {contact.nama ?? contact.phone}
          </span>
          <span className="text-[11px] text-[#8696a0] shrink-0">
            {formatContactTime(contact.last_at)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] text-[#8696a0] truncate leading-tight flex items-center gap-1">
            {contact.last_direction === 'OUT' && (
              <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] shrink-0" />
            )}
            <span>{contact.last_message}</span>
          </p>

          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${roleInfo.color}`}>
            {roleInfo.icon} {roleInfo.label}
          </span>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// GROUP LIST ITEM
// ─────────────────────────────────────────────────────────────────────────────
const GroupItem: React.FC<{
  group: WaGroupInfo;
  isActive: boolean;
  onClick: () => void;
}> = ({ group, isActive, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`
        flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors border-b border-[#2a2f32]/60 select-none
        ${isActive ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]'}
      `}
    >
      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white shrink-0 shadow-md text-base">
        {group.subject ? group.subject[0].toUpperCase() : 'G'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="font-medium text-[15px] text-[#e9edef] truncate leading-none">
            {group.subject}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12px] text-[#8696a0] truncate leading-tight flex items-center gap-1">
            <Users className="w-3 h-3 text-[#53bdeb] shrink-0" />
            <span>{group.participantsCount} Anggota</span>
          </p>
          {group.announce && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
              <Megaphone className="w-2.5 h-2.5" /> Announcement
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CHAT BUBBLE
// ─────────────────────────────────────────────────────────────────────────────
const ChatBubble: React.FC<{ msg: WaChatMessage }> = ({ msg }) => {
  const isOut = msg.direction === 'OUT';
  return (
    <div className={`flex flex-col my-1 px-4 ${isOut ? 'items-end' : 'items-start'}`}>
      <div
        className="max-w-[72%] rounded-lg px-3 py-2 text-[14px] leading-relaxed shadow-sm relative group"
        style={{
          background: isOut ? '#005c4b' : '#202c33',
          color: '#e9edef',
          borderRadius: isOut ? '8px 0px 8px 8px' : '0px 8px 8px 8px',
        }}
      >
        <p className="whitespace-pre-wrap break-words">{msg.message}</p>
        <div className="flex items-center justify-end gap-1 mt-1 -mr-1 text-[11px] text-[#8696a0]">
          <span>{formatMsgTime(msg.created_at)}</span>
          {isOut && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DATE DIVIDER
// ─────────────────────────────────────────────────────────────────────────────
const DateDivider: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex justify-center my-3">
    <span
      className="px-3 py-1 rounded-lg text-[11px] text-[#8696a0] font-medium shadow-sm"
      style={{ background: '#182229' }}
    >
      {label}
    </span>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY CHAT VIEW
// ─────────────────────────────────────────────────────────────────────────────
const EmptyChat: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8" style={{ background: '#222e35' }}>
    <div className="w-20 h-20 rounded-full bg-[#111b21] border border-[#2a2f32] flex items-center justify-center">
      <Bot className="w-10 h-10 text-[#53bdeb]" />
    </div>
    <div>
      <h3 className="text-xl font-medium text-[#e9edef] mb-1">WhatsApp Chatbot Absenta</h3>
      <p className="text-sm text-[#8696a0] max-w-sm">
        Pilih salah satu percakapan di panel sebelah kiri untuk melihat riwayat pesan chatbot secara real-time.
      </p>
    </div>
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs text-[#8696a0] bg-[#111b21] border border-[#2a2f32] mt-2">
      <ShieldCheck className="w-3.5 h-3.5 text-[#00a884]" />
      Pesan dilindungi oleh enkripsi otomatis WhatsApp
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const WhatsAppChatLogPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const urlPhone = useMemo(() => searchParams.get('phone') || '', [searchParams]);
  const urlSearch = useMemo(() => searchParams.get('search') || searchParams.get('nama') || '', [searchParams]);
  const initialTerm = urlSearch || urlPhone;

  const [viewMode, setViewMode] = useState<'chats' | 'groups'>('chats');
  const [tarikGuruModalOpen, setTarikGuruModalOpen] = useState(false);

  const { allJadwal: unifiedAllJadwal } = useUnifiedScheduleData({});
  const { rawList: kelasRawList } = useKelasOptions();
  const { rawList: guruRawList } = useGuruOptions({ jenisPtk: 'PENDIDIK' });

  // Chats state
  const [contacts, setContacts] = useState<WaChatContact[]>([]);
  const [totalContacts, setTotalContacts] = useState(0);
  const [selected, setSelected] = useState<WaChatContact | null>(null);
  const [messages, setMessages] = useState<WaChatMessage[]>([]);
  const [totalMsgs, setTotalMsgs] = useState(0);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState(initialTerm);
  const [debouncedSearch, setDebouncedSearch] = useState(initialTerm);
  const [contactPage, setContactPage] = useState(1);
  const [msgPage, setMsgPage] = useState(1);
  const [mobilePanel, setMobilePanel] = useState<'contacts' | 'chat'>('contacts');

  // Sync state if searchParams change dynamically
  useEffect(() => {
    if (initialTerm) {
      setSearch(initialTerm);
      setDebouncedSearch(initialTerm);
    }
  }, [initialTerm]);

  // Groups state
  const [groups, setGroups] = useState<WaGroupInfo[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<WaGroupInfo | null>(null);
  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null);

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

        // Auto-select target contact if navigated via shortcut
        if (res.data.length > 0) {
          let matched: WaChatContact | undefined;
          if (urlPhone) {
            const cleanPhone = urlPhone.replace(/\D/g, '');
            matched = res.data.find(c => {
              const cClean = c.phone.replace(/\D/g, '');
              return cClean.endsWith(cleanPhone) || cleanPhone.endsWith(cClean);
            });
          }
          if (!matched && urlSearch) {
            const sLower = urlSearch.toLowerCase();
            matched = res.data.find(c => c.nama?.toLowerCase().includes(sLower));
          }
          // Fallback to first search result if navigated via url filter
          if (!matched && (urlPhone || urlSearch)) {
            matched = res.data[0];
          }

          if (matched) {
            setSelected(matched);
            setMobilePanel('chat');
          }
        }
      }
    } catch { toast.error('Gagal memuat daftar kontak'); }
    finally { setLoadingContacts(false); }
  }, [debouncedSearch, urlPhone, urlSearch]);

  // ── Fetch groups ────────────────────────────────────────────────────────
  const fetchGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const res = await getWaParticipatingGroups();
      if (res.success && Array.isArray(res.data)) {
        setGroups(res.data);
      }
    } catch {
      console.warn('Gagal memuat grup WA');
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  useEffect(() => { fetchContacts(1, false); }, [fetchContacts]);
  useEffect(() => { fetchGroups(); }, [fetchGroups]);

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
    setSelectedGroup(null);
    setMessages([]);
    setMsgPage(1);
    setTotalMsgs(0);
    fetchMessages(c.phone, 1, false);
    setMobilePanel('chat');
  };

  const handleSelectGroup = (g: WaGroupInfo) => {
    setSelectedGroup(g);
    setSelected(null);
    setMobilePanel('chat');
  };

  const handleCopyGroupId = (groupId: string) => {
    navigator.clipboard.writeText(groupId);
    setCopiedGroupId(groupId);
    toast.success('ID Grup berhasil disalin!');
    setTimeout(() => setCopiedGroupId(null), 2000);
  };

  // auto-scroll on first load
  useEffect(() => {
    if (!loadingMsgs && messages.length > 0 && msgPage === 1) {
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    }
  }, [loadingMsgs, messages, msgPage]);

  // ── Filtered groups ─────────────────────────────────────────────────────
  const filteredGroups = useMemo(() => {
    if (!debouncedSearch.trim()) return groups;
    const term = debouncedSearch.toLowerCase();
    return groups.filter(g => g.subject.toLowerCase().includes(term) || g.id.toLowerCase().includes(term));
  }, [groups, debouncedSearch]);

  // ── Group messages by date ──────────────────────────────────────────────
  const grouped = useMemo(() => {
    const groupsList: { date: string; msgs: WaChatMessage[] }[] = [];
    for (const m of messages) {
      const label = formatDateGroup(m.created_at);
      const last  = groupsList[groupsList.length - 1];
      if (!last || last.date !== label) groupsList.push({ date: label, msgs: [m] });
      else last.msgs.push(m);
    }
    return groupsList;
  }, [messages]);

  const hasMore = messages.length < totalMsgs;
  const roleInfo = selected ? formatRole(selected.role) : null;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  const navigate = useNavigate();

  return (
    <OperationalPageLayout
      title="Riwayat & Grup WhatsApp"
      shortTitle="WA Log & Groups"
      subtitle="Monitor percakapan chatbot & daftar grup WA tertaut"
      backPath="/settings/whatsapp"
      backLabel="Kembali ke WhatsApp Settings"
      headerActions={
        <button
          onClick={() => navigate('/notifications/wa-onboarding')}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-950/40 transition border border-emerald-500/40"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Monitoring & Sapa WA</span>
        </button>
      }
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
            LEFT PANEL: Contact / Group list
        ──────────────────────────────────────────────── */}
        <aside
          className={`
            flex flex-col border-r border-[#2a2f32]
            w-full md:w-[350px] lg:w-[380px] shrink-0
            ${mobilePanel === 'chat' ? 'hidden md:flex' : 'flex'}
          `}
          style={{ background: '#111b21' }}
        >
          {/* Sidebar Header & Tab Switcher */}
          <div className="px-4 py-3 flex flex-col gap-2 border-b border-[#2a2f32]"
            style={{ background: '#202c33' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-600 to-teal-500 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-[#e9edef] font-semibold text-[15px] leading-none">WhatsApp Center</p>
                  <p className="text-[#8696a0] text-[11px] mt-0.5">
                    {viewMode === 'chats' ? `${totalContacts} percakapan` : `${groups.length} grup tertaut`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTarikGuruModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#00a884] hover:bg-[#008f70] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                  title="Tarik Daftar Guru Pada JP Tertentu untuk Broadcast WhatsApp"
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  <span>📢 Tarik Guru JP</span>
                </button>
                <button
                  id="wa-chatlog-refresh"
                  onClick={() => viewMode === 'chats' ? fetchContacts(1, false) : fetchGroups()}
                  disabled={loadingContacts || loadingGroups}
                  className="p-2 rounded-full hover:bg-white/10 text-[#aebac1] transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${(loadingContacts || loadingGroups) ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* View Mode Toggle: Chats vs Groups */}
            <div className="flex bg-[#111b21] p-1 rounded-lg border border-[#2a2f32] mt-1">
              <button
                type="button"
                onClick={() => { setViewMode('chats'); setSelectedGroup(null); }}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  viewMode === 'chats'
                    ? 'bg-[#00a884] text-white shadow-sm'
                    : 'text-[#8696a0] hover:text-[#e9edef]'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Percakapan ({totalContacts})</span>
              </button>
              <button
                type="button"
                onClick={() => { setViewMode('groups'); setSelected(null); }}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  viewMode === 'groups'
                    ? 'bg-[#00a884] text-white shadow-sm'
                    : 'text-[#8696a0] hover:text-[#e9edef]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Grup WA ({groups.length})</span>
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="px-3 py-2" style={{ background: '#111b21' }}>
            <div className="relative flex items-center">
              <Search className="w-4 h-4 absolute left-3 text-[#8696a0]" />
              <input
                id="wa-chatlog-search"
                type="text"
                placeholder={viewMode === 'chats' ? 'Cari nama atau nomor...' : 'Cari nama grup atau ID...'}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg text-[14px] text-[#e9edef] placeholder-[#8696a0] outline-none border-none"
                style={{ background: '#2a2f32' }}
              />
            </div>
          </div>

          {/* List View: Contacts or Groups */}
          <div className="flex-1 overflow-y-auto wa-scrollbar">
            {viewMode === 'chats' ? (
              loadingContacts && contacts.length === 0 ? (
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
              )
            ) : (
              loadingGroups && groups.length === 0 ? (
                <div className="flex items-center justify-center h-32 gap-2 text-[#8696a0]">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Mendeteksi grup WA...</span>
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3 text-[#8696a0] px-6 text-center">
                  <Users className="w-10 h-10 opacity-20" />
                  <p className="text-sm">Tidak ada grup WhatsApp</p>
                  <p className="text-xs opacity-60">Pastikan nomor WA sekolah terhubung dan sudah masuk ke grup WA</p>
                </div>
              ) : (
                filteredGroups.map(g => (
                  <GroupItem
                    key={g.id}
                    group={g}
                    isActive={selectedGroup?.id === g.id}
                    onClick={() => handleSelectGroup(g)}
                  />
                ))
              )
            )}
          </div>
        </aside>

        {/* ────────────────────────────────────────────────
            RIGHT PANEL: Chat or Group Details
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
          {selectedGroup ? (
            /* ── GROUP DETAILS VIEW ── */
            <div className="flex-1 flex flex-col h-full bg-[#111b21]/90">
              {/* Group Header */}
              <div
                className="flex items-center gap-3 px-4 py-3 border-b border-[#2a2f32] shrink-0"
                style={{ background: '#202c33' }}
              >
                <button
                  className="md:hidden p-1.5 hover:bg-white/10 rounded-full text-[#aebac1] transition-colors"
                  onClick={() => { setMobilePanel('contacts'); setSelectedGroup(null); }}
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white text-lg shrink-0">
                  {selectedGroup.subject ? selectedGroup.subject[0].toUpperCase() : 'G'}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base text-[#e9edef] leading-none truncate">
                    {selectedGroup.subject}
                  </h3>
                  <p className="text-xs text-[#8696a0] mt-1 flex items-center gap-2">
                    <span>{selectedGroup.participantsCount} Anggota</span>
                    <span>·</span>
                    <span className="font-mono text-[11px] truncate max-w-[200px]">{selectedGroup.id}</span>
                  </p>
                </div>
              </div>

              {/* Group Information Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 wa-scrollbar">
                {/* Information Card */}
                <div className="bg-[#202c33] border border-[#2a2f32] rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#e9edef]">Detail Grup WhatsApp</h4>
                      <p className="text-xs text-[#8696a0]">Informasi keanggotaan dan preferensi grup</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="bg-[#111b21] p-3 rounded-xl border border-[#2a2f32]">
                      <p className="text-[11px] text-[#8696a0]">Nama Grup</p>
                      <p className="text-sm font-bold text-[#e9edef] mt-0.5">{selectedGroup.subject}</p>
                    </div>

                    <div className="bg-[#111b21] p-3 rounded-xl border border-[#2a2f32]">
                      <p className="text-[11px] text-[#8696a0]">Total Anggota</p>
                      <p className="text-sm font-bold text-[#e9edef] mt-0.5">{selectedGroup.participantsCount} Nomor HP</p>
                    </div>

                    <div className="bg-[#111b21] p-3 rounded-xl border border-[#2a2f32]">
                      <p className="text-[11px] text-[#8696a0]">Mode Akses Chat</p>
                      <p className="text-xs font-bold text-[#e9edef] mt-0.5 flex items-center gap-1.5">
                        {selectedGroup.announce ? (
                          <>
                            <Megaphone className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-amber-300">Pengumuman (Admin Only)</span>
                          </>
                        ) : (
                          <>
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-300">Semua Anggota Bisa Chat</span>
                          </>
                        )}
                      </p>
                    </div>

                    <div className="bg-[#111b21] p-3 rounded-xl border border-[#2a2f32]">
                      <p className="text-[11px] text-[#8696a0]">Tipe Komunitas</p>
                      <p className="text-xs font-bold text-[#e9edef] mt-0.5">
                        {selectedGroup.isCommunity ? 'Grup Komunitas' : 'Grup Reguler'}
                      </p>
                    </div>
                  </div>

                  {/* Copy JID Section */}
                  <div className="bg-[#111b21] p-3.5 rounded-xl border border-[#2a2f32] flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] text-[#8696a0]">ID WhatsApp Group (JID)</p>
                      <p className="text-xs font-mono text-blue-400 font-semibold truncate mt-0.5">
                        {selectedGroup.id}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyGroupId(selectedGroup.id)}
                      className="px-3 py-1.5 rounded-lg bg-[#2a2f32] hover:bg-[#374045] text-xs text-[#e9edef] font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
                    >
                      {copiedGroupId === selectedGroup.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin ID</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Bot Protection Note */}
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 space-y-2 text-xs text-emerald-300">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <ShieldCheck className="w-4 h-4" /> Proteksi Chatbot Otomatis (Aman dari Spam)
                  </div>
                  <p className="leading-relaxed text-[#8696a0]">
                    Pesan yang diposting di dalam grup ini <strong>secara otomatis diabaikan (100% Ignore)</strong> oleh Chatbot Absenta. Bot tidak akan pernah memberikan balasan otomatis di dalam grup WA ini sehingga nomor sekolah aman dan tidak mengganggu percakapan grup.
                  </p>
                </div>
              </div>
            </div>
          ) : !selected ? (
            <EmptyChat />
          ) : (
            /* ── CHAT LOG VIEW ── */
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

      <TarikGuruJPModal
        isOpen={tarikGuruModalOpen}
        onClose={() => setTarikGuruModalOpen(false)}
        allJadwal={unifiedAllJadwal}
        classes={kelasRawList || []}
        gurus={guruRawList || []}
      />
    </OperationalPageLayout>
  );
};

export default WhatsAppChatLogPage;
