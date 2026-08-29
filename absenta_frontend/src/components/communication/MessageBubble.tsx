import React, { useState, useRef, useEffect } from 'react';
import { 
  InternalMessageItem, 
  InternalAttachment 
} from '@/api/internal-communication.api';
import { 
  PaperClipIcon, 
  ArrowDownTrayIcon,
  PlayIcon,
  PauseIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface MessageBubbleProps {
  message: InternalMessageItem;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 1. System Event Message (Perubahan Status Disposisi dll)
  if (message.is_system_event) {
    return (
      <div className="flex justify-center my-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/90 dark:bg-[#182229]/90 text-[#54656f] dark:text-[#8696a0] text-[11px] font-medium rounded-lg shadow-2xs border border-slate-200/50 dark:border-slate-800">
          <InformationCircleIcon className="w-3.5 h-3.5 text-[#00a884] shrink-0" />
          <span>{message.content}</span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1">
            {format(new Date(message.created_at), 'HH:mm')}
          </span>
        </div>
      </div>
    );
  }

  const isMe = message.is_me;
  const timeFormatted = format(new Date(message.created_at), 'HH:mm', { locale: idLocale });

  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleCycleSpeed = () => {
    if (!audioRef.current) return;
    const nextRate = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    audioRef.current.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  return (
    <div className={`flex w-full my-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`relative max-w-[85%] sm:max-w-[65%] rounded-lg px-3 py-1.5 shadow-2xs transition-all ${
          isMe
            ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] rounded-tr-none'
            : 'bg-[#ffffff] dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] rounded-tl-none border border-slate-200/40 dark:border-slate-700/40'
        }`}
      >
        {/* Header Pengirim (Jika pesan masuk di disposisi / grup) */}
        {!isMe && message.sender_name && (
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[12px] font-bold text-[#008069] dark:text-[#00a884] truncate">
              {message.sender_name}
            </span>
            {message.sender_role && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 font-medium">
                {typeof message.sender_role === 'object' ? (message.sender_role as any)?.name : message.sender_role}
              </span>
            )}
          </div>
        )}

        {/* Isi Pesan Teks */}
        {message.content && !message.content.startsWith('🎙️ Pesan Suara') && (
          <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>
        )}

        {/* Lampiran Pesan (Voice Note, Dokumen, Gambar) */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-1 space-y-1.5">
            {message.attachments.map((att: InternalAttachment, idx: number) => {
              // 🎙️ WhatsApp Voice Note Player
              if (att.type === 'AUDIO_VOICE_NOTE') {
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 p-2 rounded-lg ${
                      isMe 
                        ? 'bg-[#c5f3be] dark:bg-[#025142]' 
                        : 'bg-[#f0f2f5] dark:bg-[#111b21]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={togglePlayAudio}
                      className="w-9 h-9 rounded-full bg-[#00a884] hover:bg-[#008f6f] text-white flex items-center justify-center shrink-0 shadow-xs transition-transform active:scale-95 cursor-pointer"
                    >
                      {isPlaying ? (
                        <PauseIcon className="w-4 h-4" />
                      ) : (
                        <PlayIcon className="w-4 h-4 ml-0.5" />
                      )}
                    </button>

                    <div className="flex-1 min-w-[140px]">
                      {/* Fake Audio Waveform Bar */}
                      <div className="flex items-center gap-0.5 h-6 mb-1">
                        {[40, 65, 30, 85, 100, 45, 70, 90, 55, 35, 80, 95, 60, 40, 75, 50, 85, 30, 65, 45].map((h, barIdx) => {
                          const isPlayed = (barIdx / 20) <= (audioProgress / 100);
                          return (
                            <span
                              key={barIdx}
                              style={{ height: `${h}%` }}
                              className={`w-1 rounded-full transition-colors ${
                                isPlayed 
                                  ? 'bg-[#00a884]' 
                                  : isMe ? 'bg-emerald-700/30 dark:bg-emerald-300/30' : 'bg-slate-300 dark:bg-slate-600'
                              }`}
                            />
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-[#667781] dark:text-[#8696a0]">
                        <span>{att.duration ? `${att.duration}s` : '0:12'}</span>
                        <button
                          type="button"
                          onClick={handleCycleSpeed}
                          className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-bold hover:bg-black/10 transition-colors"
                        >
                          {playbackRate}x
                        </button>
                      </div>
                    </div>

                    <audio
                      ref={audioRef}
                      src={att.url}
                      onTimeUpdate={() => {
                        if (audioRef.current && audioRef.current.duration) {
                          setAudioProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
                        }
                      }}
                      onEnded={() => {
                        setIsPlaying(false);
                        setAudioProgress(0);
                      }}
                      className="hidden"
                    />
                  </div>
                );
              }

              // 📄 Dokumen / File Lampiran
              return (
                <a
                  key={idx}
                  href={att.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`flex items-center gap-2.5 p-2 rounded-lg text-xs transition-opacity hover:opacity-90 ${
                    isMe 
                      ? 'bg-[#c5f3be] dark:bg-[#025142] text-[#111b21] dark:text-white' 
                      : 'bg-[#f0f2f5] dark:bg-[#111b21] text-[#111b21] dark:text-white'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-emerald-600/15 text-[#00a884] shrink-0">
                    <PaperClipIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-xs truncate">{att.name || 'Dokumen Lampiran'}</p>
                    <p className="text-[10px] text-[#667781] dark:text-[#8696a0]">
                      {att.size ? `${(att.size / 1024).toFixed(1)} KB` : 'PDF / Dokumen'}
                    </p>
                  </div>
                  <ArrowDownTrayIcon className="w-4 h-4 text-[#00a884] shrink-0" />
                </a>
              );
            })}
          </div>
        )}

        {/* WhatsApp Timestamp & Blue Double Checkmarks */}
        <div
          className={`flex items-center justify-end gap-1 mt-0.5 float-right ml-2 text-[10px] leading-none ${
            isMe ? 'text-[#667781] dark:text-[#8696a0]' : 'text-[#667781] dark:text-[#8696a0]'
          }`}
        >
          <span>{timeFormatted}</span>
          {isMe && (
            <span title="Terkirim & Dibaca" className="text-[#53bdeb]">
              {/* WhatsApp Double Check SVG */}
              <svg viewBox="0 0 16 11" width="14" height="10" fill="currentColor">
                <path d="M11.07 1.25a.75.75 0 0 0-1.06 0L5.35 5.91l-1.87-1.87a.75.75 0 0 0-1.06 1.06l2.4 2.4a.75.75 0 0 0 1.06 0l5.19-5.19a.75.75 0 0 0 0-1.06zm3.86 0a.75.75 0 0 0-1.06 0l-5.19 5.19a.75.75 0 1 0 1.06 1.06l5.19-5.19a.75.75 0 0 0 0-1.06z" />
              </svg>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
