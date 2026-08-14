import React, { useState, useRef, useEffect } from 'react';
import { 
  PaperAirplaneIcon, 
  PaperClipIcon, 
  MicrophoneIcon, 
  BoltIcon, 
  CheckBadgeIcon,
  ShieldCheckIcon,
  StopIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { 
  InternalThreadItem, 
  InternalMessageItem, 
  InternalThreadStatus 
} from '@/api/internal-communication.api';
import { MessageBubble } from './MessageBubble';
import { QuickTemplatesModal } from './QuickTemplatesModal';

interface ChatConversationPanelProps {
  thread: InternalThreadItem;
  messages: InternalMessageItem[];
  isLoadingMessages: boolean;
  onSendMessage: (payload: { content: string; attachments?: any[] }) => void;
  isSendingMessage: boolean;
  onUpdateStatus?: (status: InternalThreadStatus) => void;
  isUpdatingStatus?: boolean;
}

export const ChatConversationPanel: React.FC<ChatConversationPanelProps> = ({
  thread,
  messages,
  isLoadingMessages,
  onSendMessage,
  isSendingMessage,
  onUpdateStatus,
  isUpdatingStatus
}) => {
  const [inputText, setInputText] = useState('');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

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

  // 🎙️ Voice Note Recording Logic
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
      alert('Izin mikrofon diperlukan untuk merekam voice note.');
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
      mediaRecorderRef.current.stop();
      audioChunksRef.current = [];
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  // Badge warna prioritas
  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'URGENT':
        return 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200';
      case 'HIGH':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200';
      case 'LOW':
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200';
      default:
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200';
    }
  };

  const isResolved = thread.status === 'RESOLVED' || thread.status === 'CLOSED';

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950">
      {/* ── TOP HEADER CHAT ────────────────────────────────────────────── */}
      <div className="px-5 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
            {thread.title.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {thread.title}
              </h2>
              {thread.is_confidential && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300">
                  <ShieldCheckIcon className="w-3 h-3" />
                  Rahasia (BK)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              <span className={`px-2 py-0.2 rounded-md text-[10px] font-semibold border ${getPriorityBadge(thread.priority)}`}>
                {thread.priority}
              </span>
              <span>•</span>
              <span className="truncate">{thread.category}</span>
              {thread.participants && (
                <>
                  <span>•</span>
                  <span>{thread.participants.length} Peserta</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Button: Selesaikan Disposisi / Status */}
        {onUpdateStatus && thread.type === 'DISPOSISI' && (
          <div>
            {isResolved ? (
              <button
                onClick={() => onUpdateStatus('ACTIVE')}
                disabled={isUpdatingStatus}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 transition-colors"
              >
                Buka Kembali
              </button>
            ) : (
              <button
                onClick={() => onUpdateStatus('RESOLVED')}
                disabled={isUpdatingStatus}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all"
              >
                <CheckBadgeIcon className="w-4 h-4" />
                <span>Tandai Selesai</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── BANNER STATUS JIKA RESOLVED ─────────────────────────────────── */}
      {isResolved && (
        <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200/60 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-center gap-2">
          <CheckBadgeIcon className="w-4 h-4" />
          <span>Topik ini telah ditandai <strong>SELESAI</strong>. Kirim pesan baru untuk mengaktifkan kembali.</span>
        </div>
      )}

      {/* ── LIST PESAN (MESSAGE SCROLL AREA) ────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2">
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-full text-xs text-slate-400">
            Memuat riwayat pesan...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 py-10">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
              <BoltIcon className="w-6 h-6" />
            </div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Belum ada pesan</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Kirim pesan pertama atau gunakan template instan di bawah</p>
          </div>
        ) : (
          messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── INPUT BAR BAWAH ────────────────────────────────────────────── */}
      <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800">
        {/* State Sedang Rekam Suara (Voice Note) */}
        {isRecording ? (
          <div className="flex items-center justify-between bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-2xl px-4 py-2.5 animate-pulse">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <div className="w-3 h-3 rounded-full bg-red-600 animate-ping" />
              <span className="text-xs font-bold font-mono">
                Merekam Suara: {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelRecording}
                className="px-3 py-1 text-xs text-slate-600 hover:text-slate-800 dark:text-slate-400"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={stopRecording}
                className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white text-xs font-semibold rounded-lg shadow-xs hover:bg-red-700"
              >
                <StopIcon className="w-4 h-4" />
                <span>Kirim VN</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            {/* Tombol Template Cepat */}
            <button
              type="button"
              onClick={() => setIsTemplateModalOpen(true)}
              title="Gunakan Template Pesan Instan"
              className="p-2.5 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-xl transition-colors shrink-0"
            >
              <BoltIcon className="w-5 h-5" />
            </button>

            {/* Tombol Voice Note */}
            <button
              type="button"
              onClick={startRecording}
              title="Rekam Voice Note (Pesan Suara)"
              className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl transition-colors shrink-0"
            >
              <MicrophoneIcon className="w-5 h-5" />
            </button>

            {/* Input Textarea */}
            <div className="flex-1 min-w-0 bg-slate-100 dark:bg-slate-800 rounded-2xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white dark:focus-within:bg-slate-900 transition-all border border-transparent focus-within:border-blue-500">
              <textarea
                rows={1}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tulis pesan... (Tekan Enter untuk kirim, Shift+Enter baris baru)"
                className="w-full bg-transparent text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden resize-none max-h-24 leading-relaxed py-1"
              />
            </div>

            {/* Tombol Kirim */}
            <button
              type="button"
              onClick={handleSend}
              disabled={!inputText.trim() || isSendingMessage}
              className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl shadow-xs transition-all shrink-0 flex items-center justify-center"
            >
              <PaperAirplaneIcon className="w-5 h-5 -rotate-45" />
            </button>
          </div>
        )}
      </div>

      {/* Modal Quick Templates */}
      <QuickTemplatesModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSelectTemplate={(text) => {
          setInputText(prev => prev ? `${prev} ${text}` : text);
        }}
      />
    </div>
  );
};
