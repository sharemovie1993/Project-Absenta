import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  PaperAirplaneIcon, 
  PaperClipIcon, 
  MicrophoneIcon, 
  CheckBadgeIcon,
  ShieldCheckIcon,
  StopIcon,
  FaceSmileIcon,
  DocumentTextIcon,
  PhotoIcon,
  EllipsisVerticalIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  VideoCameraIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { 
  InternalThreadItem, 
  InternalMessageItem, 
  InternalThreadStatus 
} from '@/api/internal-communication.api';
import { MessageBubble } from './MessageBubble';
import { QuickTemplatesModal } from './QuickTemplatesModal';
import { format, isToday, isYesterday } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface ChatConversationPanelProps {
  thread: InternalThreadItem;
  messages: InternalMessageItem[];
  isLoadingMessages: boolean;
  onSendMessage: (payload: { content: string; attachments?: any[] }) => void;
  isSendingMessage: boolean;
  onUpdateStatus?: (status: InternalThreadStatus) => void;
  isUpdatingStatus?: boolean;
  onStartCall?: (type: 'AUDIO' | 'VIDEO') => void;
}

export const ChatConversationPanel: React.FC<ChatConversationPanelProps> = ({
  thread,
  messages,
  isLoadingMessages,
  onSendMessage,
  isSendingMessage,
  onUpdateStatus,
  isUpdatingStatus,
  onStartCall
}) => {
  const [inputText, setInputText] = useState('');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto scroll ke bawah saat pesan baru tiba
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle pengiriman pesan teks
  const handleSend = () => {
    if (!inputText.trim() || isSendingMessage) return;
    onSendMessage({ content: inputText.trim() });
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 🎙️ Voice Note Recording Logic (WhatsApp style)
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          onSendMessage({
            content: '🎙️ Pesan Suara (Voice Note)',
            attachments: [
              {
                type: 'AUDIO_VOICE_NOTE',
                url: base64Audio,
                name: `VN-${Date.now()}.webm`,
                duration: recordingSeconds
              }
            ]
          });
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Tidak dapat mengakses mikrofon.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  // Upload file lampiran
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      onSendMessage({
        content: `📄 Mengirim berkas: ${file.name}`,
        attachments: [
          {
            type: file.type.startsWith('image/') ? 'IMAGE' : 'DOCUMENT',
            url: reader.result as string,
            name: file.name,
            size: file.size
          }
        ]
      });
      setIsAttachMenuOpen(false);
    };
  };

  // Group messages by Date (WhatsApp date pills)
  const groupedMessages = useMemo(() => {
    const groups: { dateLabel: string; items: InternalMessageItem[] }[] = [];
    messages.forEach((msg) => {
      const d = new Date(msg.created_at);
      let label = format(d, 'd MMMM yyyy', { locale: idLocale });
      if (isToday(d)) label = 'HARI INI';
      else if (isYesterday(d)) label = 'KEMARIN';

      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.dateLabel === label) {
        lastGroup.items.push(msg);
      } else {
        groups.push({ dateLabel: label, items: [msg] });
      }
    });
    return groups;
  }, [messages]);

  // Lawan bicara
  const otherUser = thread.participants?.find(p => p.user_id !== thread.created_by) || thread.participants?.[0];
  const interlocutorName = thread.title || otherUser?.name || 'Kontak Sekolah';
  const interlocutorRole = otherUser?.role_label || otherUser?.role || 'GTK';

  return (
    <div className="flex flex-col h-full bg-[#efeae2] dark:bg-[#0b141a] relative select-none">
      {/* ── WHATSAPP CHAT HEADER ─────────────────────────────────────────── */}
      <header className="px-4 py-2.5 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-[#e9edef] dark:border-[#2a3942] flex items-center justify-between shrink-0 z-10 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar Profile */}
          <div className="relative w-10 h-10 rounded-full bg-[#00a884] text-white flex items-center justify-center text-sm font-extrabold shrink-0 overflow-hidden shadow-2xs">
            {otherUser?.avatar ? (
              <img src={otherUser.avatar} alt={interlocutorName} className="w-full h-full object-cover" />
            ) : (
              interlocutorName.slice(0, 2).toUpperCase()
            )}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#25d366] border-2 border-white dark:border-[#202c33] rounded-full" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-[14.5px] font-bold text-[#111b21] dark:text-[#e9edef] truncate">
                {interlocutorName}
              </h2>
              {thread.is_confidential && (
                <ShieldCheckIcon className="w-4 h-4 text-indigo-500 shrink-0" title="Kerahasiaan BK Aktif" />
              )}
            </div>
            <p className="text-[11.5px] text-[#667781] dark:text-[#8696a0] truncate">
              {interlocutorRole} • <span className="text-[#00a884] font-medium">online</span>
            </p>
          </div>
        </div>

        {/* WhatsApp Header Action Icons */}
        <div className="flex items-center gap-1 sm:gap-3 text-[#54656f] dark:text-[#aebac1]">
          {/* Quick Action Disposisi */}
          {thread.type === 'DISPOSISI' && onUpdateStatus && (
            <button
              onClick={() => onUpdateStatus(thread.status === 'RESOLVED' ? 'ACTIVE' : 'RESOLVED')}
              disabled={isUpdatingStatus}
              className={`hidden sm:flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                thread.status === 'RESOLVED'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-50'
              }`}
            >
              <CheckBadgeIcon className="w-4 h-4 text-[#00a884]" />
              <span>{thread.status === 'RESOLVED' ? 'Tugas Selesai' : 'Tandai Selesai'}</span>
            </button>
          )}

          <button 
            type="button" 
            onClick={() => onStartCall && onStartCall('AUDIO')}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer text-[#54656f] dark:text-[#aebac1] hover:text-[#00a884]" 
            title="Panggilan Suara (Voice Call)"
          >
            <PhoneIcon className="w-5 h-5" />
          </button>
          <button 
            type="button" 
            onClick={() => onStartCall && onStartCall('VIDEO')}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer text-[#54656f] dark:text-[#aebac1] hover:text-[#00a884]" 
            title="Panggilan Video (Video Call)"
          >
            <VideoCameraIcon className="w-5 h-5" />
          </button>
          <button 
            type="button" 
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer" 
            title="Cari Pesan"
          >
            <MagnifyingGlassIcon className="w-5 h-5" />
          </button>
          <button 
            type="button" 
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer" 
            title="Menu Lainnya"
          >
            <EllipsisVerticalIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ── WHATSAPP CHAT WALLPAPER & MESSAGES CONTAINER ─────────────────── */}
      <div 
        className="flex-1 overflow-y-auto px-4 sm:px-12 py-3 space-y-1 relative"
        style={{
          backgroundImage: `radial-gradient(#00a88410 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }}
      >
        {/* End-to-End Encryption Notice Banner */}
        <div className="flex justify-center my-2">
          <div className="bg-[#ffeecd] dark:bg-[#182229] text-[#54656f] dark:text-[#ffd279] text-[10.5px] px-3 py-1 rounded-lg text-center max-w-md shadow-2xs border border-amber-200/50 dark:border-slate-800">
            🔒 Pesan dan panggilan dalam ruang lingkup sekolah ini diamankan secara internal dengan isolasi multi-tenant.
          </div>
        </div>

        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#00a884] border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-[#667781] dark:text-[#8696a0]">
            <p className="text-xs">Belum ada pesan dalam percakapan ini.</p>
            <p className="text-[11px] mt-0.5">Kirim pesan pertama atau gunakan template cepat di bawah.</p>
          </div>
        ) : (
          groupedMessages.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {/* WhatsApp Date Chip */}
              <div className="flex justify-center my-3">
                <span className="px-3 py-1 bg-white/90 dark:bg-[#182229]/90 text-[#54656f] dark:text-[#8696a0] text-[11px] font-semibold rounded-lg shadow-2xs border border-slate-200/40 dark:border-slate-800 uppercase tracking-wider">
                  {group.dateLabel}
                </span>
              </div>

              {group.items.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── WHATSAPP BOTTOM INPUT BAR ────────────────────────────────────── */}
      <footer className="px-3 py-2 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-[#e9edef] dark:border-[#2a3942] flex items-center gap-2 shrink-0 z-10">
        {/* Voice Recording Active Bar */}
        {isRecording ? (
          <div className="flex-1 flex items-center justify-between px-4 py-2 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 animate-pulse">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span>Merekam Suara: {recordingSeconds}s</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelRecording}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={stopRecording}
                className="px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold flex items-center gap-1"
              >
                <StopIcon className="w-4 h-4" />
                <span>Kirim VN</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Emoji & Quick Templates Button */}
            <div className="flex items-center gap-1 text-[#54656f] dark:text-[#8696a0]">
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(true)}
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="Template Pesan Cepat"
              >
                <FaceSmileIcon className="w-6 h-6" />
              </button>

              {/* Attach Button & Popup Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsAttachMenuOpen(v => !v)}
                  className={`p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer ${
                    isAttachMenuOpen ? 'bg-black/10 dark:bg-white/10 rotate-45' : ''
                  }`}
                  title="Lampirkan Dokumen / Media"
                >
                  <PaperClipIcon className="w-5 h-5 transition-transform" />
                </button>

                {isAttachMenuOpen && (
                  <div className="absolute bottom-12 left-0 w-44 bg-white dark:bg-[#233138] rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 flex items-center gap-2.5 cursor-pointer"
                    >
                      <DocumentTextIcon className="w-4 h-4 text-[#5f66cd]" />
                      <span>Dokumen</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 flex items-center gap-2.5 cursor-pointer"
                    >
                      <PhotoIcon className="w-4 h-4 text-[#007bfc]" />
                      <span>Foto & Video</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsTemplateModalOpen(true);
                        setIsAttachMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 flex items-center gap-2.5 cursor-pointer"
                    >
                      <FaceSmileIcon className="w-4 h-4 text-[#02a698]" />
                      <span>Template Pesan</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* WhatsApp Rounded Input Field */}
            <div className="flex-1 relative">
              <textarea
                rows={1}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ketik pesan..."
                className="w-full px-4 py-2 text-[13.5px] rounded-xl bg-white dark:bg-[#2a3942] text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0] outline-hidden resize-none max-h-24 shadow-2xs"
              />
            </div>

            {/* Dynamic Send / Mic Action Button */}
            {inputText.trim() ? (
              <button
                type="button"
                onClick={handleSend}
                disabled={isSendingMessage}
                className="w-10 h-10 rounded-full bg-[#00a884] hover:bg-[#008f6f] text-white flex items-center justify-center shadow-xs transition-transform active:scale-95 cursor-pointer shrink-0"
                title="Kirim Pesan"
              >
                <PaperAirplaneIcon className="w-5 h-5 ml-0.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className="w-10 h-10 rounded-full bg-[#00a884] hover:bg-[#008f6f] text-white flex items-center justify-center shadow-xs transition-transform active:scale-95 cursor-pointer shrink-0"
                title="Rekam Pesan Suara (Voice Note)"
              >
                <MicrophoneIcon className="w-5 h-5" />
              </button>
            )}
          </>
        )}
      </footer>

      {/* ── MODAL TEMPLATE PESAN CEPAT ───────────────────────────────────── */}
      <QuickTemplatesModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSelectTemplate={(text) => {
          setInputText(text);
          setIsTemplateModalOpen(false);
        }}
      />
    </div>
  );
};
