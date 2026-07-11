import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParentAuthStore } from '../../../store/parentAuthStore';
import {
  getParentChatSessions,
  getParentChatMessages,
  sendParentChatMessage
} from '../../../api/parent.api';
import {
  MessageCircle,
  Send,
  ArrowLeft,
  User,
  GraduationCap,
  Inbox
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

function formatTime(isoStr: string) {
  return new Date(isoStr).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatDate(isoStr: string) {
  return new Date(isoStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function ParentChat() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: parentData, getSelectedStudent } = useParentAuthStore();
  const student = getSelectedStudent();

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSessionId]);

  // Fetch sessions list
  const { data: sessions, isLoading: loadingSessions } = useQuery({
    queryKey: ['parent-chat-sessions'],
    queryFn: getParentChatSessions,
    staleTime: 10_000
  });

  // Fetch messages for active session
  const { data: messages, isLoading: loadingMessages } = useQuery({
    queryKey: ['parent-chat-messages', activeSessionId],
    queryFn: () => getParentChatMessages(activeSessionId!),
    enabled: !!activeSessionId,
    refetchInterval: 5000 // polling setiap 5 detik
  });

  // Scroll to bottom on new message
  useEffect(() => {
    if (messages) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages]);

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: (msg: string) => sendParentChatMessage(activeSessionId!, msg),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent-chat-messages', activeSessionId] });
      queryClient.invalidateQueries({ queryKey: ['parent-chat-sessions'] });
      setMessageInput('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Gagal mengirim pesan');
    }
  });

  const handleSend = () => {
    const trimmed = messageInput.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const activeSession = sessions?.find((s: any) => s.id === activeSessionId);

  // --- CHAT ROOM VIEW ---
  if (activeSessionId) {
    return (
      <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 max-w-md mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 py-3 flex items-center gap-3 shadow-sm">
          <button
            onClick={() => setActiveSessionId(null)}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ArrowLeft size={18} className="text-slate-600 dark:text-slate-400" />
          </button>
          <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <GraduationCap size={17} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-black text-slate-800 dark:text-white leading-tight">
              {activeSession?.Guru?.nama_guru ?? 'Wali Kelas'}
            </p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Wali Kelas {student?.nama_siswa ?? ''}</p>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3">
          {loadingMessages ? (
            <div className="text-center text-xs text-slate-400 italic py-12">Memuat riwayat obrolan...</div>
          ) : messages?.length === 0 ? (
            <div className="text-center text-xs text-slate-400 italic py-12">
              Belum ada pesan. Mulai obrolan dengan Wali Kelas sekarang!
            </div>
          ) : (
            messages?.map((msg: any, index: number) => {
              const isParent = msg.sender_type === 'PARENT';
              const showDate = index === 0 || formatDate(msg.created_at) !== formatDate(messages[index - 1].created_at);
              return (
                <React.Fragment key={msg.id}>
                  {showDate && (
                    <div className="flex items-center justify-center my-4">
                      <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full uppercase tracking-wider">
                        {formatDate(msg.created_at)}
                      </span>
                    </div>
                  )}
                  <div className={`flex items-end gap-2 ${isParent ? 'justify-end' : 'justify-start'}`}>
                    {!isParent && (
                      <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                        <GraduationCap size={12} className="text-indigo-500" />
                      </div>
                    )}
                    <div
                      className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                        isParent
                          ? 'bg-indigo-600 text-white rounded-br-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-bl-sm'
                      }`}
                    >
                      {msg.message}
                      <span className={`block text-right text-[9px] font-semibold mt-1 ${isParent ? 'text-indigo-200' : 'text-slate-400'}`}>
                        {formatTime(msg.created_at)}
                        {isParent && msg.is_read && <span className="ml-1">✓✓</span>}
                      </span>
                    </div>
                    {isParent && (
                      <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                        <User size={12} className="text-slate-500" />
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-4 py-3">
          <div className="flex items-end gap-2">
            <textarea
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ketik pesan Anda di sini..."
              rows={1}
              className="flex-1 resize-none text-xs font-medium bg-slate-100 dark:bg-slate-800 border-none outline-none rounded-2xl px-4 py-3 text-slate-800 dark:text-slate-200 placeholder-slate-400 max-h-32"
              style={{ lineHeight: 1.5 }}
            />
            <button
              onClick={handleSend}
              disabled={!messageInput.trim() || sendMutation.isPending}
              className="w-10 h-10 flex items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md disabled:opacity-40 hover:bg-indigo-700 active:scale-95 transition"
            >
              <Send size={16} />
            </button>
          </div>
          <p className="text-center text-[9px] text-slate-400 mt-2 font-semibold">Tekan Enter untuk mengirim, Shift+Enter untuk baris baru</p>
        </div>
      </div>
    );
  }

  // --- SESSION LIST VIEW ---
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 p-4">
      {/* Mobile Top Bar */}
      <div className="flex items-center justify-between mb-6">
        <Button
          onClick={() => navigate('/parent-app/dashboard')}
          variant="ghost"
          className="text-xs font-bold text-slate-500"
        >
          ← KEMBALI
        </Button>
        <h1 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-wider">Pesan Wali Kelas</h1>
        <div className="w-14" />
      </div>

      <div className="max-w-md mx-auto space-y-4">
        {loadingSessions ? (
          <div className="text-center py-20 text-slate-400 text-xs italic">Memuat daftar obrolan...</div>
        ) : !sessions || sessions.length === 0 ? (
          <Card className="p-10 text-center flex flex-col items-center justify-center space-y-3">
            <Inbox size={48} className="text-slate-300" />
            <h4 className="font-bold text-slate-700 dark:text-slate-300">Belum Ada Obrolan</h4>
            <p className="text-xs text-slate-400">
              Hubungi pihak sekolah untuk membuka saluran obrolan dengan Wali Kelas anak Anda.
            </p>
          </Card>
        ) : (
          sessions.map((session: any) => {
            const lastMsg = session.Messages?.[0];
            return (
              <button
                key={session.id}
                onClick={() => setActiveSessionId(session.id)}
                className="w-full text-left"
              >
                <Card className="p-4 border-none shadow-sm dark:bg-slate-900/40 hover:shadow-md hover:scale-[1.01] transition-all cursor-pointer flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                    <GraduationCap size={22} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-800 dark:text-white leading-tight">
                      {session.Guru?.nama_guru ?? 'Wali Kelas'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-semibold">Wali Kelas</p>
                    {lastMsg && (
                      <p className="text-xs text-slate-500 dark:text-slate-450 mt-1 truncate font-medium">
                        {lastMsg.sender_type === 'PARENT' ? 'Anda: ' : ''}
                        {lastMsg.message}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {lastMsg && (
                      <span className="text-[9px] font-semibold text-slate-400">
                        {formatTime(lastMsg.created_at)}
                      </span>
                    )}
                    <MessageCircle size={14} className="text-indigo-400" />
                  </div>
                </Card>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
