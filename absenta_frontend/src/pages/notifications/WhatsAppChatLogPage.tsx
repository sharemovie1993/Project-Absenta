import { z } from 'zod';
import { SectionCard } from '../../components/ui/SectionCard';
import { formatDate } from '@/utils/date.utils';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

const chatFilterSchema = z.object({
  search: z.string().optional()
});
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
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
// Subcomponents extracted to WhatsAppChatLogSubcomponents
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
    <AcademicPageLayout
      hardeningModuleKey="notifications_whatsapp_chatlog"
      title="Riwayat & Grup WhatsApp"
      description="Monitor percakapan chatbot & daftar grup WA tertaut"
      instruction={{
        title: "Panduan Chat Log WhatsApp",
        description: "Monitoring status pengiriman pesan notifikasi otomatis sekolah.",
        items: [
          { text: "Gunakan filter status untuk melacak pesan yang tertunda atau gagal terkirim." },
          { text: "Klik baris pesan untuk meninjau log detail dan payload transmisi." }
        ]
      }}
    >
      <SectionCard fullWidth className="flex flex-col w-full min-w-0 max-w-full border-none shadow-none bg-transparent p-0">
        <div
        className="flex overflow-hidden rounded-xl border border-[] shadow-2xl"
        
      >

        {/* ────────────────────────────────────────────────
            LEFT PANEL: Contact / Group list
        ──────────────────────────────────────────────── */}
        <aside
          className={`
            flex flex-col border-r border-[]
            w-full md:w-[350px] lg:w-[380px] shrink-0
            ${mobilePanel === 'chat' ? 'hidden md:flex' : 'flex'}
          `}
          
        >
          {/* Sidebar Header & Tab Switcher */}
          <div className="px-4 py-3 flex flex-col gap-2 border-b border-[]"
            >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-600 to-teal-500 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-[] font-semibold text-[15px] leading-none">WhatsApp Center</p>
                  <p className="text-[] text-[11px] mt-0.5">
                    {viewMode === 'chats' ? `${totalContacts} percakapan` : `${groups.length} grup tertaut`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTarikGuruModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-[] hover:bg-[] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                  title="Tarik Daftar Guru Pada JP Tertentu untuk Broadcast WhatsApp"
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  <span>📢 Tarik Guru JP</span>
                </button>
                <button
                  id="wa-chatlog-refresh"
                  onClick={() => viewMode === 'chats' ? fetchContacts(1, false) : fetchGroups()}
                  disabled={loadingContacts || loadingGroups}
                  className="p-2 rounded-full hover:bg-white/10 text-[] transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${(loadingContacts || loadingGroups) ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* View Mode Toggle: Chats vs Groups */}
            <div className="flex bg-[] p-1 rounded-lg border border-[] mt-1">
              <button
                type="button"
                onClick={() => { setViewMode('chats'); setSelectedGroup(null); }}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  viewMode === 'chats'
                    ? 'bg-[] text-white shadow-sm'
                    : 'text-[] hover:text-[]'
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
                    ? 'bg-[] text-white shadow-sm'
                    : 'text-[] hover:text-[]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Grup WA ({groups.length})</span>
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="px-3 py-2" >
            <div className="relative flex items-center">
              <Search className="w-4 h-4 absolute left-3 text-[]" />
              <input aria-label="Input pencarian pesan WhatsApp" 
                id="wa-chatlog-search"
                type="text"
                placeholder={viewMode === 'chats' ? 'Cari nama atau nomor...' : 'Cari nama grup atau ID...'}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg text-[14px] text-[] placeholder-[] outline-none border-none"
                
              />
            </div>
          </div>

          {/* List View: Contacts or Groups */}
          <div className="flex-1 overflow-y-auto wa-scrollbar">
            {viewMode === 'chats' ? (
              loadingContacts && contacts.length === 0 ? (
                <div className="flex items-center justify-center h-32 gap-2 text-[]">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Memuat...</span>
                </div>
              ) : contacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3 text-[] px-6 text-center">
                  <MessageSquare className="w-10 h-10 opacity-20" />
                  <p className="text-sm">Belum ada percakapan</p>
                  <p className="text-xs opacity-60">Log chatbot WA akan muncul di sini</p>
                </div>
              ) : (
                <>
                  {contacts?.map(c => (
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
                      className="w-full py-3 text-[12px] text-[] hover:text-[] hover:bg-[] transition-colors"
                    >
                      {loadingContacts ? 'Memuat...' : `Tampilkan lebih banyak (${totalContacts - contacts.length} lagi)`}
                    </button>
                  )}
                </>
              )
            ) : (
              loadingGroups && groups.length === 0 ? (
                <div className="flex items-center justify-center h-32 gap-2 text-[]">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Mendeteksi grup WA...</span>
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3 text-[] px-6 text-center">
                  <Users className="w-10 h-10 opacity-20" />
                  <p className="text-sm">Tidak ada grup WhatsApp</p>
                  <p className="text-xs opacity-60">Pastikan nomor WA sekolah terhubung dan sudah masuk ke grup WA</p>
                </div>
              ) : (
                filteredGroups?.map(g => (
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
          
        >
          {selectedGroup ? (
            /* ── GROUP DETAILS VIEW ── */
            <div className="flex-1 flex flex-col h-full bg-[]/90">
              {/* Group Header */}
              <div
                className="flex items-center gap-3 px-4 py-3 border-b border-[] shrink-0"
                
              >
                <button
                  className="md:hidden p-1.5 hover:bg-white/10 rounded-full text-[] transition-colors"
                  onClick={() => { setMobilePanel('contacts'); setSelectedGroup(null); }}
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white text-lg shrink-0">
                  {selectedGroup.subject ? selectedGroup.subject[0].toUpperCase() : 'G'}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base text-[] leading-none truncate">
                    {selectedGroup.subject}
                  </h3>
                  <p className="text-xs text-[] mt-1 flex items-center gap-2">
                    <span>{selectedGroup.participantsCount} Anggota</span>
                    <span>·</span>
                    <span className="font-mono text-[11px] truncate max-w-[200px]">{selectedGroup.id}</span>
                  </p>
                </div>
              </div>

              {/* Group Information Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 wa-scrollbar">
                {/* Information Card */}
                <div className="bg-[] border border-[] rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[]">Detail Grup WhatsApp</h4>
                      <p className="text-xs text-[]">Informasi keanggotaan dan preferensi grup</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="bg-[] p-3 rounded-xl border border-[]">
                      <p className="text-[11px] text-[]">Nama Grup</p>
                      <p className="text-sm font-bold text-[] mt-0.5">{selectedGroup.subject}</p>
                    </div>

                    <div className="bg-[] p-3 rounded-xl border border-[]">
                      <p className="text-[11px] text-[]">Total Anggota</p>
                      <p className="text-sm font-bold text-[] mt-0.5">{selectedGroup.participantsCount} Nomor HP</p>
                    </div>

                    <div className="bg-[] p-3 rounded-xl border border-[]">
                      <p className="text-[11px] text-[]">Mode Akses Chat</p>
                      <p className="text-xs font-bold text-[] mt-0.5 flex items-center gap-1.5">
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

                    <div className="bg-[] p-3 rounded-xl border border-[]">
                      <p className="text-[11px] text-[]">Tipe Komunitas</p>
                      <p className="text-xs font-bold text-[] mt-0.5">
                        {selectedGroup.isCommunity ? 'Grup Komunitas' : 'Grup Reguler'}
                      </p>
                    </div>
                  </div>

                  {/* Copy JID Section */}
                  <div className="bg-[] p-3.5 rounded-xl border border-[] flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] text-[]">ID WhatsApp Group (JID)</p>
                      <p className="text-xs font-mono text-blue-400 font-semibold truncate mt-0.5">
                        {selectedGroup.id}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyGroupId(selectedGroup.id)}
                      className="px-3 py-1.5 rounded-lg bg-[] hover:bg-[] text-xs text-[] font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
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
                  <p className="leading-relaxed text-[]">
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
                className="flex items-center gap-3 px-4 py-2.5 border-b border-[] shrink-0"
                
              >
                {/* Mobile back button */}
                <button
                  className="md:hidden p-1.5 hover:bg-white/10 rounded-full text-[] transition-colors"
                  onClick={() => { setMobilePanel('contacts'); setSelected(null); }}
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <Avatar phone={selected.phone} nama={selected.nama} />

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[15px] text-[] leading-none truncate">
                    {selected.nama ?? selected.phone}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {roleInfo && (
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${roleInfo.color}`}>
                        {roleInfo.icon} {roleInfo.label}
                      </span>
                    )}
                    <span className="text-[12px] text-[]">
                      {selected.phone} · {selected.total_in}↑ {selected.total_out}↓
                    </span>
                  </div>
                </div>

                <button
                  id="wa-chatlog-detail-refresh"
                  onClick={() => { setMessages([]); setMsgPage(1); fetchMessages(selected.phone, 1, false); }}
                  disabled={loadingMsgs}
                  className="p-2 rounded-full hover:bg-white/10 text-[] transition-colors"
                  title="Refresh chat"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingMsgs ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Messages scroll area */}
              <div className="flex-1 overflow-y-auto py-2 wa-scrollbar">
                {loadingMsgs ? (
                  <div className="flex items-center justify-center h-full gap-2 text-[]">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-[13px]">Memuat percakapan...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-[]">
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
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] text-[] hover:text-[] transition-colors border border-[] hover:bg-[]"
                        >
                          {loadingMore
                            ? <RefreshCw className="w-3 h-3 animate-spin" />
                            : <ChevronUp className="w-3 h-3" />
                          }
                          {loadingMore ? 'Memuat...' : `Pesan lebih lama (${totalMsgs - messages.length})`}
                        </button>
                      </div>
                    )}

                    {grouped?.map(group => (
                      <React.Fragment key={group.date}>
                        <DateDivider label={group.date} />
                        {group.msgs?.map(msg => <ChatBubble key={msg.id} msg={msg} />)}
                      </React.Fragment>
                    ))}
                    <div ref={chatEndRef} className="h-2" />
                  </>
                )}
              </div>

              {/* Read-only footer bar */}
              <div
                className="flex items-center gap-3 px-4 py-3 border-t border-[] shrink-0"
                
              >
                <div className="flex-1 px-4 py-2 rounded-full text-[13px] text-[] select-none"
                  >
                  <span className="flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-[]" />
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
        .wa-scrollbar::-webkit-scrollbar-thumb { background: ; border-radius: 3px; }
        .wa-scrollbar::-webkit-scrollbar-thumb:hover { background: ; }
      `}</style>

      <TarikGuruJPModal
        isOpen={tarikGuruModalOpen}
        onClose={() => setTarikGuruModalOpen(false)}
        allJadwal={unifiedAllJadwal}
        classes={kelasRawList || []}
        gurus={guruRawList || []}
      />
    
      </SectionCard>
</AcademicPageLayout>
  );
};

export default WhatsAppChatLogPage;
