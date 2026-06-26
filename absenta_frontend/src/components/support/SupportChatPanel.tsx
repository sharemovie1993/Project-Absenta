import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  CheckCircle, 
  AlertCircle, 
  MessageSquare, 
  FileText, 
  RefreshCw,
  User,
  Shield,
  Maximize2
} from 'lucide-react';
import { 
  type SupportTicket, 
  type SupportTicketMessage, 
  type SupportTicketStatus,
  type SupportTicketPriority,
  type SupportQuickReply,
  getCategoryLabel
} from '../../api/support-ticket.api';
import { type User as AuthUser } from '../../store/authStore';
import SupportStatusBadge from './SupportStatusBadge';
import SupportPriorityBadge from './SupportPriorityBadge';
import SupportChatBubble from './SupportChatBubble';
import SupportScrollToBottomButton from './SupportScrollToBottomButton';

export interface SupportChatPanelProps {
  selectedTicket: SupportTicket;
  messages: SupportTicketMessage[];
  newMessageIds: Set<string>;
  currentAgent: AuthUser | null;
  liveUnreadCount: number;
  setLiveUnreadCount: (count: number) => void;
  isScrollAtBottom: boolean;
  setIsScrollAtBottom: (atBottom: boolean) => void;
  activeUnreadCount: number;
  replyMessage: string;
  setReplyMessage: (msg: string) => void;
  isInternalNote: boolean;
  setIsInternalNote: (internal: boolean) => void;
  isSubmittingMessage: boolean;
  handleReplyMessage: (e: React.FormEvent) => void;
  quickReplies: SupportQuickReply[];
  isQuickRepliesOpen: boolean;
  setIsQuickRepliesOpen: (open: boolean) => void;
  isActionLoading: boolean;
  handleClaimTicket: () => void;
  handleUpdateStatus: (status: SupportTicketStatus) => void;
  handleUpdatePriority: (priority: SupportTicketPriority) => void;
  setIsFocusMode: (focus: boolean) => void;
  chatContainerRef: React.RefObject<HTMLDivElement | null>;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  unreadMessageRef: React.RefObject<HTMLDivElement | null>;
}

export default function SupportChatPanel({
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
  setIsFocusMode,
  chatContainerRef,
  chatEndRef,
  unreadMessageRef
}: SupportChatPanelProps) {
  return (
    <div className="lg:col-span-5 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden flex flex-col min-h-[500px]">
      {/* Header Obrolan CS */}
      <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
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
          <h2 className="text-xs font-black line-clamp-1">{selectedTicket.title}</h2>
        </div>
        <div className="flex items-center space-x-2">
          <SupportStatusBadge status={selectedTicket.status} />
          <button
            onClick={() => setIsFocusMode(true)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all active:scale-95 shadow-md border border-slate-700/50"
            title="Fokus / Perlebar Chat (Focus Mode)"
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </div>

      {/* Box Deskripsi Keluhan Awal */}
      <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-start space-x-3">
        <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl mt-0.5">
          <FileText size={16} />
        </div>
        <div className="space-y-1 flex-1">
          <div className="flex items-center justify-between text-[9px] font-bold text-slate-400">
            <span>DESKRIPSI ADUAN AWAL</span>
            <span>{new Date(selectedTicket.created_at).toLocaleString('id-ID')}</span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed font-semibold whitespace-pre-wrap">
            {selectedTicket.description}
          </p>
        </div>
      </div>

      {/* Wrapper Relatif untuk Obrolan & Tombol Melayang */}
      <div className="relative flex-1 flex flex-col min-h-0">
        {/* Area Obrolan Chat Thread */}
        <div 
          ref={chatContainerRef}
          onScroll={(e) => {
            const target = e.currentTarget;
            const atBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 120;
            setIsScrollAtBottom(atBottom);
            if (atBottom) {
              setLiveUnreadCount(0);
            }
          }}
          className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[300px] min-h-[220px] shadow-inner"
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
                    <span className="mx-4 px-4 py-1.5 bg-red-50 text-red-650 text-[10px] font-black rounded-full uppercase tracking-widest border border-red-200 shadow-md animate-pulse flex items-center space-x-1">
                      <span className="h-2 w-2 rounded-full bg-red-650 inline-block animate-ping"></span>
                      <span>🔴 Pesan Belum Dibaca</span>
                    </span>
                    <div className="flex-1 border-t-2 border-red-300/60"></div>
                  </div>
                )}
                <SupportChatBubble 
                  message={msg} 
                  isNew={newMessageIds.has(msg.id)} 
                  isOutgoing={msg.sender_type === 'SUPPORT'} 
                />
              </React.Fragment>
            );
          })}
          <div ref={chatEndRef} />
        </div>
 
        {/* Tombol Scroll ke Bawah Melayang */}
        <SupportScrollToBottomButton
          show={!isScrollAtBottom}
          unreadCount={liveUnreadCount}
          onClick={() => {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            setLiveUnreadCount(0);
            setIsScrollAtBottom(true);
          }}
        />
      </div>

      {/* Kontrol CS (Claim, Update Status, Reply) */}
      <div className="p-4 border-t border-slate-100 bg-white space-y-3">
        
        {/* 1. Claim button & Status Controllers */}
        <div className="flex flex-wrap gap-2 items-center justify-between">
          
          {/* Claim Button */}
          {!selectedTicket.assigned_to_id ? (
            <button
              onClick={handleClaimTicket}
              disabled={isActionLoading}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-md hover:shadow-indigo-600/35 hover:scale-105 active:scale-95 transition-all duration-200"
            >
              <Shield size={14} />
              <span>Klaim Tiket Ini</span>
            </button>
          ) : selectedTicket.assigned_to_id === currentAgent?.id ? (
            <div className="flex items-center space-x-1 text-[10px] text-emerald-600 font-extrabold bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200">
              <Shield size={12} />
              <span>Tiket ditangani Anda</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 text-[10px] text-slate-500 font-bold bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
              <User size={12} />
              <span>Ditangani: {selectedTicket.Assignee?.full_name}</span>
            </div>
          )}

          {/* Manual SLA Update Dropdowns */}
          <div className="flex items-center space-x-2">
            {/* Status Dropdown */}
            <div className="flex items-center space-x-1">
              <span className="text-[9px] font-bold text-slate-400">STATUS:</span>
              <select
                value={selectedTicket.status}
                onChange={e => handleUpdateStatus(e.target.value as SupportTicketStatus)}
                disabled={isActionLoading}
                className="p-1 text-[10px] font-extrabold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              >
                <option value="OPEN">OPEN</option>
                <option value="IN_PROGRESS">HANDLING</option>
                <option value="PENDING_CUSTOMER">SLA WAITING</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>

            {/* Priority Dropdown */}
            <div className="flex items-center space-x-1">
              <span className="text-[9px] font-bold text-slate-400">URGENSI:</span>
              <select
                value={selectedTicket.priority}
                onChange={e => handleUpdatePriority(e.target.value as SupportTicketPriority)}
                disabled={isActionLoading}
                className="p-1 text-[10px] font-extrabold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>
            </div>
          </div>

        </div>

        {/* 2. Form Reply Chat */}
        {selectedTicket.status === 'CLOSED' ? (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-500 text-xs font-bold flex items-center justify-center space-x-1">
            <AlertCircle size={16} />
            <span>Tiket telah CLOSED. Status penanganan selesai.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Tab Pilihan Solusi Publik vs Catatan Internal Staf */}
            {selectedTicket.assigned_to_id === currentAgent?.id && (
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => setIsInternalNote(false)}
                  className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all duration-200 ${
                    !isInternalNote 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  💬 Solusi Publik
                </button>
                <button
                  type="button"
                  onClick={() => setIsInternalNote(true)}
                  className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all duration-200 ${
                    isInternalNote 
                      ? 'bg-amber-50 text-amber-700 border border-amber-200/60' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  🔒 Catatan Internal Staf
                </button>
              </div>
            )}

            <form onSubmit={handleReplyMessage} className="flex items-center space-x-2 pt-0.5">
              <div className="flex-1 flex items-center bg-slate-100 rounded-full px-4 py-1.5 border border-slate-200/80 focus-within:ring-2 focus-within:ring-[#00a884]/20 focus-within:bg-white transition-all duration-200 relative">
                {/* Tombol Balasan Cepat (Templat Balasan) */}
                {selectedTicket.assigned_to_id === currentAgent?.id && (
                  <div className="relative mr-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsQuickRepliesOpen(!isQuickRepliesOpen)}
                      className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100/80 active:scale-95 border border-amber-200/60 text-amber-700 text-[10px] font-black transition-all duration-150"
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
                          className="absolute bottom-10 left-0 z-50 w-64 bg-white rounded-xl shadow-xl border border-slate-100 p-2.5 flex flex-col space-y-1.5 text-left max-h-60 overflow-y-auto"
                        >
                          <div className="text-[9px] font-black text-slate-400 px-2 pb-1 border-b border-slate-100 tracking-wider">
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
                                className="w-full text-left p-2 rounded-xl hover:bg-slate-50 active:bg-slate-100 text-[11px] transition-all duration-150"
                              >
                                <div className="font-extrabold text-slate-800 line-clamp-1">{q.title}</div>
                                <div className="text-slate-400 line-clamp-1 mt-0.5 text-[9px] font-mono">{q.shortcut}</div>
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
                        ? "Ketik catatan internal rahasia staf..." 
                        : "Ketik solusi solusi Anda..." 
                      : "Mohon KLAIM tiket terlebih dahulu untuk membalas..."
                  }
                  className="flex-1 bg-transparent text-xs font-semibold focus:outline-none py-1.5 text-slate-800"
                  disabled={isSubmittingMessage || selectedTicket.assigned_to_id !== currentAgent?.id}
                />
              </div>
              <button
                type="submit"
                disabled={isSubmittingMessage || !replyMessage.trim() || selectedTicket.assigned_to_id !== currentAgent?.id}
                className={`p-3.5 rounded-full text-white hover:scale-105 active:scale-95 disabled:bg-slate-100 disabled:text-slate-400 disabled:scale-100 transition-all duration-200 shadow-md flex items-center justify-center flex-shrink-0 ${
                  isInternalNote 
                    ? 'bg-amber-500 hover:bg-amber-600' 
                    : 'bg-[#00a884] hover:bg-[#008f72]'
                }`}
              >
                {isSubmittingMessage ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Send size={16} className="transform rotate-0 translate-x-[0.5px]" />
                )}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
