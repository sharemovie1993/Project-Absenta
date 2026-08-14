import React from 'react';
import { 
  InternalMessageItem, 
  InternalMessageAttachment 
} from '@/api/internal-communication.api';
import { 
  CheckIcon, 
  PaperClipIcon, 
  SpeakerWaveIcon, 
  ArrowTopRightOnSquareIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface MessageBubbleProps {
  message: InternalMessageItem;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  // 1. System Event Message (Perubahan Status Disposisi dll)
  if (message.is_system_event) {
    return (
      <div className="flex justify-center my-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs rounded-full border border-slate-200/60 dark:border-slate-700/60 shadow-2xs">
          <InformationCircleIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
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

  return (
    <div className={`flex w-full my-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`relative max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-2xs transition-all ${
          isMe
            ? 'bg-blue-600 text-white rounded-tr-xs'
            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-tl-xs'
        }`}
      >
        {/* Header Pengirim (Jika bukan saya di grup/disposisi) */}
        {!isMe && message.sender_name && (
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
              {message.sender_name}
            </span>
            {message.sender_role && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700/70 text-slate-600 dark:text-slate-400 font-medium">
                {message.sender_role}
              </span>
            )}
          </div>
        )}

        {/* Isi Pesan Teks */}
        {message.content && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words selection:bg-blue-300 dark:selection:bg-blue-700">
            {message.content}
          </p>
        )}

        {/* Lampiran (Attachments: Voice Note, File, Gambar) */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {message.attachments.map((att: InternalMessageAttachment, idx: number) => {
              if (att.type === 'AUDIO_VOICE_NOTE') {
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-2.5 p-2 rounded-xl text-xs ${
                      isMe ? 'bg-blue-700/60 text-white' : 'bg-slate-100 dark:bg-slate-700/60 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="p-1.5 rounded-full bg-blue-500 text-white">
                      <SpeakerWaveIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">Pesan Suara (Voice Note)</p>
                      <audio controls className="w-full h-7 mt-1 scale-90 origin-left" src={att.url} />
                    </div>
                  </div>
                );
              }

              return (
                <a
                  key={idx}
                  href={att.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`flex items-center gap-2 p-2 rounded-xl text-xs hover:opacity-90 transition-opacity ${
                    isMe ? 'bg-blue-700/60 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <PaperClipIcon className="w-4 h-4 shrink-0 text-slate-400" />
                  <span className="flex-1 truncate font-medium">{att.name || 'Unduh Lampiran'}</span>
                  <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5 shrink-0 opacity-70" />
                </a>
              );
            })}
          </div>
        )}

        {/* Timestamp & Status Icon */}
        <div
          className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
            isMe ? 'text-blue-200' : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          <span>{timeFormatted}</span>
          {isMe && (
            <CheckIcon className="w-3 h-3 stroke-[2.5]" />
          )}
        </div>
      </div>
    </div>
  );
};
