import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type { ChatMessage, Participant } from './types';

export interface MeetingChatSidebarProps {
  meetingChat: ChatMessage[];
  chatInput: string;
  setChatInput: (val: string) => void;
  handleSendMeetingChat: (e: React.FormEvent) => void;
  handleDownloadNotulen: () => void;
  onClose: () => void;
  participants: Participant[];
  currentUser: any;
}

export const MeetingChatSidebar: React.FC<MeetingChatSidebarProps> = ({
  meetingChat,
  chatInput,
  setChatInput,
  handleSendMeetingChat,
  handleDownloadNotulen,
  onClose,
  participants,
  currentUser
}) => {
  const userChatCount = meetingChat.filter((c) => c.role !== 'Sistem').length;

  return (
    <aside className="w-full sm:w-80 absolute inset-0 sm:static sm:inset-auto bg-[#0b141a] border-l border-[#2a3942] flex flex-col shrink-0 animate-in slide-in-from-right duration-150 z-40 sm:z-20 shadow-2xl">
      {/* WhatsApp Sidebar Header */}
      <div className="px-4 py-2.5 bg-[#202c33] border-b border-[#2a3942] flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-full bg-[#00a884] text-[#111b21] flex items-center justify-center text-xs font-black shrink-0 shadow-sm">
            💬
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-[#e9edef] uppercase tracking-wider block truncate">
              Chat Rapat ({userChatCount})
            </span>
            <p className="text-[10px] text-[#00a884] font-medium leading-none mt-0.5">Online • WebRTC Terenkripsi</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {userChatCount > 0 && (
            <button
              type="button"
              onClick={handleDownloadNotulen}
              className="text-[10px] bg-[#005c4b] hover:bg-[#007a63] text-emerald-200 px-2 py-1 rounded-lg font-bold border border-[#02735e] flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
              title="Unduh Notulen & Riwayat Chat Rapat"
            >
              <span>📥 Notulen</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-[#8696a0] hover:text-[#e9edef] p-1 cursor-pointer transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* WhatsApp Messages Scroll Area */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs flex flex-col custom-scrollbar">
        {/* WhatsApp Encryption Notice Pill */}
        <div className="flex justify-center my-1">
          <div className="bg-[#182229] border border-[#ffd279]/20 text-[#ffd279] px-3 py-1.5 rounded-lg text-[10px] text-center max-w-[90%] shadow-xs leading-relaxed flex items-center gap-1.5">
            <span>🔒</span>
            <span>Pesan terenkripsi end-to-end multi-tenant WebRTC. Tersimpan di database sekolah.</span>
          </div>
        </div>

        {meetingChat.map((c, idx) => {
          const isMe = c.senderId === 'local' || c.senderId === currentUser?.id || c.sender === (currentUser?.full_name || 'Saya');
          const isSystem = c.role === 'Sistem' || c.sender === 'Sistem Absenta';

          if (isSystem) {
            return (
              <div key={idx} className="flex justify-center my-1">
                <div className="bg-[#182229] text-[#8696a0] border border-slate-700/40 px-3 py-1 rounded-lg text-[10px] text-center max-w-[85%] shadow-xs">
                  <span className="font-semibold text-sky-400">ℹ️ {c.sender}:</span> {c.text}
                </div>
              </div>
            );
          }

          const senderDisplayName = isMe
            ? (currentUser?.full_name || 'Saya')
            : (c.sender && c.sender !== 'Peserta' ? c.sender : (participants.find((p) => p.id === c.senderId)?.name || c.sender || 'Peserta Rapat'));

          return (
            <div
              key={idx}
              className={`flex flex-col max-w-[85%] shadow-sm ${
                isMe
                  ? 'self-end bg-[#005c4b] border border-[#02735e]/30 rounded-2xl rounded-tr-xs'
                  : 'self-start bg-[#202c33] border border-[#2a3942]/40 rounded-2xl rounded-tl-xs'
              } p-2 px-3 transition-all`}
            >
              {/* Header: Sender Name & Role */}
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className={`font-bold text-[11px] truncate max-w-[150px] ${
                    isMe ? 'text-[#25d366]' : 'text-[#53bdeb]'
                  }`}
                >
                  {senderDisplayName}
                </span>
                {c.role && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
                      isMe ? 'bg-[#004d3e] text-[#aebac1]' : 'bg-[#111b21] text-[#8696a0]'
                    }`}
                  >
                    {c.role}
                  </span>
                )}
                {isMe && <span className="text-[9px] text-emerald-200/70 font-normal">(Anda)</span>}
              </div>

              {/* Message Content */}
              <p className="text-[#e9edef] text-[12px] leading-relaxed break-words font-normal">
                {c.text}
              </p>

              {/* Footer: Time & Double Tick */}
              <div className="flex items-center justify-end gap-1 mt-0.5 self-end">
                <span className="text-[#8696a0] text-[9px]">{c.time}</span>
                {isMe && (
                  <span className="text-[#53bdeb] text-[10px] font-bold tracking-tighter" title="Terkirim & Tersimpan di Database">
                    ✓✓
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* WhatsApp Input Bar */}
      <form
        onSubmit={handleSendMeetingChat}
        className="p-2.5 bg-[#202c33] border-t border-[#2a3942] flex items-center gap-2"
      >
        <div className="flex-1 relative flex items-center">
          <input
            type="text"
            placeholder="Ketik pesan..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            className="w-full pl-3.5 pr-8 py-2 text-xs rounded-xl bg-[#2a3942] text-[#e9edef] placeholder-[#8696a0] border-0 outline-hidden focus:ring-1 focus:ring-[#00a884] transition-all"
          />
          <span className="absolute right-2.5 text-slate-400 text-xs">💬</span>
        </div>
        <button
          type="submit"
          disabled={!chatInput.trim()}
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-md ${
            chatInput.trim()
              ? 'bg-[#00a884] hover:bg-[#06cf9c] text-[#111b21] scale-100'
              : 'bg-[#2a3942] text-slate-500 cursor-not-allowed scale-95'
          }`}
          title="Kirim Pesan"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current ml-0.5">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </form>
    </aside>
  );
};
