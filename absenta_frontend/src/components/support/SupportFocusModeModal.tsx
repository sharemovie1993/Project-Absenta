import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  FileText, 
  MessageSquare, 
  Send, 
  RefreshCw, 
  Activity, 
  CreditCard, 
  Shield, 
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { 
  type SupportTicket, 
  type SupportTicketMessage, 
  type SupportQuickReply,
  type SupportTicketStatus,
  type SupportTicketPriority,
  type SupportTicketCategory,
  getCategoryLabel
} from '../../api/support-ticket.api';
import SupportStatusBadge from './SupportStatusBadge';
import SupportPriorityBadge from './SupportPriorityBadge';
import SupportChatBubble from './SupportChatBubble';
import SupportScrollToBottomButton from './SupportScrollToBottomButton';

export interface SupportFocusModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTicket: SupportTicket | null;
  messages: SupportTicketMessage[];
  newMessageIds: Set<string>;
  currentAgent: any;
  liveUnreadCount: number;
  setLiveUnreadCount: (c: number) => void;
  isScrollAtBottom: boolean;
  setIsScrollAtBottom: (b: boolean) => void;
  activeUnreadCount: number;
  replyMessage: string;
  setReplyMessage: (msg: string) => void;
  isInternalNote: boolean;
  setIsInternalNote: (b: boolean) => void;
  isSubmittingMessage: boolean;
  handleReplyMessage: (e: React.FormEvent) => void;
  quickReplies: SupportQuickReply[];
  isQuickRepliesOpen: boolean;
  setIsQuickRepliesOpen: (b: boolean) => void;
  isActionLoading: boolean;
  handleClaimTicket: () => void;
  handleUpdateStatus: (status: SupportTicketStatus) => void;
  handleUpdatePriority: (priority: SupportTicketPriority) => void;
  handleAssistLogin: (id: string, name: string) => void;
}

export default function SupportFocusModeModal({
  isOpen,
  onClose,
  selectedTicket,
  messages,
  newMessageIds,
  currentAgent,
  liveUnreadCount,
  setLiveUnreadCount,
  isScrollAtBottom,
  setIsScrollAtBottom,
  activeUnreadCount,
  replyMessage,
  setReplyMessage,
  isInternalNote,
  setIsInternalNote,
  isSubmittingMessage,
  handleReplyMessage,
  quickReplies,
  isQuickRepliesOpen,
  setIsQuickRepliesOpen,
  isActionLoading,
  handleClaimTicket,
  handleUpdateStatus,
  handleUpdatePriority,
  handleAssistLogin
}: SupportFocusModeModalProps) {
  const focusChatContainerRef = useRef<HTMLDivElement>(null);
  const focusChatEndRef = useRef<HTMLDivElement>(null);
  const unreadMessageRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic saat modal dibuka or ada pesan baru
  useEffect(() => {
    if (isOpen && selectedTicket) {
      setTimeout(() => {
        if (activeUnreadCount > 0 && unreadMessageRef.current) {
          unreadMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          focusChatEndRef.current?.scrollIntoView({ behavior: 'auto' });
        }
      }, 100);
    }
  }, [isOpen, selectedTicket, messages.length, activeUnreadCount]);

  if (!isOpen || !selectedTicket) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 md:p-6"
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 250 }}
          className="bg-white dark:bg-slate-900 w-full max-w-6xl h-[85vh] rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col relative"
        >
          {/* Header Modal Focus Mode */}
          <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="space-y-1 flex-1 pr-4">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black tracking-widest text-indigo-400 uppercase bg-indigo-950 px-2 py-0.5 rounded border border-indigo-900">
                  {selectedTicket.ticket_number}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-xs text-slate-300 font-extrabold">
                  {getCategoryLabel(selectedTicket.category)}
                </span>
              </div>
              <h2 className="text-sm font-black line-clamp-1">{selectedTicket.title}</h2>
            </div>
            
            <div className="flex items-center space-x-3">
              <SupportStatusBadge status={selectedTicket.status} />
              <SupportPriorityBadge priority={selectedTicket.priority} />
              <div className="border-l border-slate-800 h-6 mx-1" />
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all active:scale-95 shadow-md border border-slate-700/50"
                title="Tutup / Kembalikan Ukuran (X)"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Content Area Modal (Split View 70% Chat, 30% Diagnostic) */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* 💬 AREA CHAT UTAMA (KIRI - 70%) */}
            <div className="flex-grow flex flex-col bg-slate-50/30 dark:bg-slate-950/10 min-w-0">
              
              {/* Masalah Awal */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 flex items-start space-x-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 rounded-xl mt-0.5">
                  <FileText size={16} />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between text-[9px] font-bold text-slate-400">
                    <span>DESKRIPSI ADUAN AWAL</span>
                    <span>{new Date(selectedTicket.created_at).toLocaleString('id-ID')}</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-semibold whitespace-pre-wrap">
                    {selectedTicket.description}
                  </p>
                </div>
              </div>

              {/* Wrapper Relatif untuk Obrolan & Tombol Melayang dalam Mode Fokus */}
              <div className="relative flex-1 flex flex-col min-h-0">
                {/* Area Obrolan Chat Thread */}
                <div 
                  ref={focusChatContainerRef}
                  onScroll={(e) => {
                    const target = e.currentTarget;
                    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 120;
                    setIsScrollAtBottom(isAtBottom);
                    if (isAtBottom) {
                      setLiveUnreadCount(0);
                    }
                  }}
                  className="flex-1 p-6 overflow-y-auto space-y-4 shadow-inner"
                  style={{
                    backgroundColor: '#efeae2',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='%23e5ddd5' fill-opacity='0.4'%3E%3Cpath fill-rule='evenodd' d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm1-61c3.148 0 5.7-2.552 5.7-5.7 0-3.148-2.552-5.7-5.7-5.7-3.148 0-5.7 2.552-5.7 5.7 0 3.148 2.552 5.7 5.7 5.7zm43-3c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM25 61c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm21 21c3.148 0 5.7-2.552 5.7-5.7 0-3.148-2.552-5.7-5.7-5.7-3.148 0-5.7 2.552-5.7 5.7 0 3.148 2.552 5.7 5.7 5.7zm-19-8c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm43-15c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3z'/%3E%3C/g%3E%3C/svg%3E")`
                  }}
                >
                  {messages.map((msg, index) => {
                    const isFirstUnread = activeUnreadCount > 0 && index === messages.length - activeUnreadCount;
                    return (
                      <React.Fragment key={msg.id}>
                        {isFirstUnread && (
                          <div ref={unreadMessageRef} className="flex items-center justify-center my-6 select-none">
                            <div className="flex-1 border-t-2 border-red-300/60"></div>
                            <span className="mx-4 px-4 py-1.5 bg-red-55 text-red-600 text-[10px] font-black rounded-full uppercase tracking-widest border border-red-200 shadow-md animate-pulse flex items-center space-x-1">
                              <span className="h-2 w-2 rounded-full bg-red-650 inline-block animate-ping"></span>
                              <span> PENGGUNA BELUM MEMBACA</span>
                            </span>
                            <div className="flex-1 border-t-2 border-red-300/60"></div>
                          </div>
                        )}
                        <SupportChatBubble 
                          key={msg.id} 
                          message={msg} 
                          isNew={newMessageIds.has(msg.id)} 
                          isOutgoing={msg.sender_type === 'SUPPORT'} 
                        />
                      </React.Fragment>
                    );
                  })}
                  <div ref={focusChatEndRef} />
                </div>
  
                {/* Tombol Panah Bawah Melayang ala WhatsApp di Mode Fokus */}
                <SupportScrollToBottomButton
                  show={!isScrollAtBottom}
                  unreadCount={liveUnreadCount}
                  onClick={() => {
                    focusChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                    setLiveUnreadCount(0);
                    setIsScrollAtBottom(true);
                  }}
                />
              </div>

              {/* Form Balasan */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                {selectedTicket.status === 'CLOSED' ? (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-slate-500 text-xs font-bold flex items-center justify-center space-x-1">
                    <AlertCircle size={16} />
                    <span>Tiket telah CLOSED. Status penanganan selesai.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Tab Pilihan Solusi Publik vs Catatan Internal Staf */}
                    {selectedTicket.assigned_to_id === currentAgent?.id && (
                      <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                        <button
                          type="button"
                          onClick={() => setIsInternalNote(false)}
                          className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all duration-200 ${
                            !isInternalNote 
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40' 
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          💬 Solusi Publik
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsInternalNote(true)}
                          className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all duration-200 ${
                            isInternalNote 
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-450 border border-amber-200/60 dark:border-amber-900/40' 
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          🔒 Catatan Internal Staf
                        </button>
                      </div>
                    )}

                    <form onSubmit={handleReplyMessage} className="flex items-center space-x-2.5">
                      <div className="flex-1 flex items-center bg-slate-100 dark:bg-slate-800 rounded-full px-5 py-2 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-[#00a884]/20 focus-within:bg-white dark:focus-within:bg-slate-900 transition-all duration-200 relative">
                        {/* Tombol Balasan Cepat (Templat Balasan) */}
                        {selectedTicket.assigned_to_id === currentAgent?.id && (
                          <div className="relative mr-2 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => setIsQuickRepliesOpen(!isQuickRepliesOpen)}
                              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 active:scale-95 border border-amber-200/60 dark:border-amber-900/40 text-amber-700 dark:text-amber-400 text-[10px] font-black transition-all duration-150"
                              title="Templat Balasan Cepat"
                            >
                              <MessageSquare size={10} className="fill-current text-amber-500" />
                              <span>Templat Balasan</span>
                            </button>

                            {/* Popover Quick Replies */}
                            <AnimatePresence>
                              {isQuickRepliesOpen && (
                                <motion.div
                                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                  className="absolute bottom-10 left-0 z-50 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 p-2.5 flex flex-col space-y-1.5 text-left max-h-60 overflow-y-auto text-slate-800 dark:text-white scrollbar-thin"
                                >
                                  <div className="text-[9px] font-black text-slate-400 px-2 pb-1 border-b border-slate-100 dark:border-slate-700 tracking-wider">
                                    BALASAN CEPAT (FAQ)
                                  </div>
                                  {quickReplies.length === 0 ? (
                                    <div className="text-[10px] text-slate-400 p-2 text-center font-bold">
                                      Tidak ada template solusi.
                                    </div>
                                  ) : (
                                    quickReplies.map((q) => (
                                      <button
                                        key={q.id}
                                        type="button"
                                        onClick={() => {
                                          setReplyMessage(q.content);
                                          setIsQuickRepliesOpen(false);
                                        }}
                                        className="w-full text-left p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 active:bg-slate-100 dark:active:bg-slate-650 text-[11px] transition-all duration-150"
                                      >
                                        <div className="font-extrabold text-slate-800 dark:text-slate-100 line-clamp-1">{q.title}</div>
                                        <div className="text-slate-400 dark:text-slate-500 line-clamp-1 mt-0.5 text-[9px] font-mono">{q.shortcut}</div>
                                      </button>
                                    ))
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}

                        <input
                          type="text"
                          value={replyMessage}
                          onChange={e => setReplyMessage(e.target.value)}
                          placeholder={
                            selectedTicket.assigned_to_id === currentAgent?.id 
                              ? isInternalNote 
                                ? "Ketik catatan internal rahasia staf (Focus Mode)..." 
                                : "Ketik solusi solusi Anda (Focus Mode)..." 
                              : "Mohon KLAIM tiket terlebih dahulu untuk membalas..."
                          }
                          className="flex-1 bg-transparent text-xs font-semibold focus:outline-none py-1.5 text-slate-800 dark:text-white"
                          disabled={isSubmittingMessage || selectedTicket.assigned_to_id !== currentAgent?.id}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isSubmittingMessage || !replyMessage.trim() || selectedTicket.assigned_to_id !== currentAgent?.id}
                        className={`p-3.5 rounded-full text-white hover:scale-105 active:scale-95 disabled:bg-slate-100 dark:disabled:bg-slate-805 disabled:text-slate-400 disabled:scale-100 transition-all duration-200 shadow-md flex items-center justify-center flex-shrink-0 ${
                          isInternalNote 
                            ? 'bg-amber-500 hover:bg-amber-600' 
                            : 'bg-[#00a884] hover:bg-[#008f72]'
                        }`}
                      >
                        {isSubmittingMessage ? (
                          <RefreshCw size={18} className="animate-spin" />
                        ) : (
                          <Send size={18} className="transform rotate-0 translate-x-[0.5px]" />
                        )}
                      </button>
                    </form>
                  </div>
                )}
              </div>

            </div>

            {/* 🛠box LIVE TENANT DIAGNOSTIC (KANAN - 30%) */}
            <div className="w-[320px] bg-slate-900 text-white border-l border-slate-850 p-6 overflow-y-auto space-y-6 hidden md:flex flex-col justify-between flex-shrink-0 scrollbar-thin">
              
              {/* Diagnostik Section */}
              <div className="space-y-6">
                
                <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
                  <Activity size={18} className="text-emerald-400 animate-pulse" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400">Diagnostic Focus Panel</h3>
                </div>

                {selectedTicket.Tenant ? (
                  <div className="space-y-4 text-xs">
                    {/* Nama Sekolah */}
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-bold text-slate-400">Nama Sekolah / Tenant</span>
                      <h4 className="font-extrabold text-slate-100 text-sm line-clamp-1">{selectedTicket.Tenant.name}</h4>
                      <span className="text-[9px] text-indigo-300 font-mono block bg-indigo-950/40 p-1.5 rounded border border-indigo-900/30 overflow-x-auto truncate">
                        ID: {selectedTicket.Tenant.id}
                      </span>
                    </div>

                    {/* Status Operasional */}
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-bold text-slate-400">Status Operasional</span>
                      <div className="flex items-center space-x-2 pt-0.5">
                        {selectedTicket.Tenant.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            ACTIVE / NORMAL
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            SUSPENDED
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Subscription Info */}
                    <div className="space-y-1 bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                      <div className="flex items-center space-x-1.5 pb-1.5 border-b border-slate-800 text-[10px] font-bold text-slate-400">
                        <CreditCard size={12} className="text-indigo-400" />
                        <span>PAKET LANGGANAN</span>
                      </div>
                      <div className="pt-1.5 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-black text-indigo-300">
                            {selectedTicket.Tenant.subscription_package || 'PREMIUM PRO'}
                          </span>
                          <span className="text-[9px] bg-indigo-950 text-indigo-400 px-1.5 rounded">Active</span>
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-slate-400">
                          <span>Tagihan Bulanan</span>
                          <span className="font-black text-slate-300">
                            {selectedTicket.Tenant.monthly_fee 
                              ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(selectedTicket.Tenant.monthly_fee)
                              : 'Rp 450,000'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* SLA controls inside focus */}
                    <div className="space-y-3 bg-slate-850/40 p-3 rounded-xl border border-slate-800">
                      <div className="flex items-center space-x-1.5 pb-1.5 border-b border-slate-800 text-[10px] font-bold text-slate-400">
                        <Shield size={12} className="text-indigo-400" />
                        <span>SLA & CONTROL TIKET</span>
                      </div>
                      <div className="space-y-2 pt-1">
                        {/* Claim Button */}
                        {!selectedTicket.assigned_to_id ? (
                          <button
                            onClick={handleClaimTicket}
                            disabled={isActionLoading}
                            className="w-full flex items-center justify-center space-x-1.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black transition-all"
                          >
                            <Shield size={12} />
                            <span>Klaim Tiket Ini</span>
                          </button>
                        ) : selectedTicket.assigned_to_id === currentAgent?.id ? (
                          <div className="text-center text-[9px] text-emerald-400 font-extrabold bg-emerald-500/10 px-2 py-1.5 rounded-lg border border-emerald-500/20">
                            Ditangani oleh Anda
                          </div>
                        ) : (
                          <div className="text-center text-[9px] text-slate-400 font-bold bg-slate-800 px-2 py-1.5 rounded-lg">
                            Agent: {selectedTicket.Assignee?.full_name}
                          </div>
                        )}

                        {/* Status */}
                        <div className="flex items-center justify-between text-[10px] pt-1">
                          <span className="text-slate-400">STATUS:</span>
                          <select
                            value={selectedTicket.status}
                            onChange={e => handleUpdateStatus(e.target.value as SupportTicketStatus)}
                            disabled={isActionLoading}
                            className="bg-slate-800 text-white border border-slate-700 rounded p-1 text-[9px] font-bold focus:outline-none"
                          >
                            <option value="OPEN">OPEN</option>
                            <option value="IN_PROGRESS">HANDLING</option>
                            <option value="PENDING_CUSTOMER">SLA WAITING</option>
                            <option value="RESOLVED">RESOLVED</option>
                            <option value="CLOSED">CLOSED</option>
                          </select>
                        </div>

                        {/* Urgensi */}
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-400">URGENSI:</span>
                          <select
                            value={selectedTicket.priority}
                            onChange={e => handleUpdatePriority(e.target.value as SupportTicketPriority)}
                            disabled={isActionLoading}
                            className="bg-slate-800 text-white border border-slate-700 rounded p-1 text-[9px] font-bold focus:outline-none"
                          >
                            <option value="LOW">LOW</option>
                            <option value="MEDIUM">MEDIUM</option>
                            <option value="HIGH">HIGH</option>
                            <option value="URGENT">URGENT</option>
                          </select>
                        </div>
                      </div>
                    </div>

                  </div>
                ) : (
                  <span className="text-[10px] text-slate-500">Data tenant tidak valid.</span>
                )}

              </div>

              {/* Impersonate Button */}
              {selectedTicket.Tenant && (
                <div className="space-y-2">
                  <button
                    onClick={() => handleAssistLogin(selectedTicket.Tenant!.id, selectedTicket.Tenant!.name)}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-black text-[10px] text-white transition-all duration-200"
                  >
                    <ExternalLink size={12} />
                    <span>Impersonate Tenant</span>
                  </button>
                </div>
              )}

            </div>

          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
