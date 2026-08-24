import React from 'react';
import { BookOpen, GraduationCap, HeartHandshake, CheckCheck, Bot, ShieldCheck } from 'lucide-react';
import type { WaChatMessage } from '@/api/whatsapp.api';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

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
        flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors border-b border-[]/60 select-none
        ${isActive ? 'bg-[]' : 'hover:bg-[]'}
      `}
    >
      <Avatar phone={contact.phone} nama={contact.nama} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="font-medium text-[15px] text-[] truncate leading-none">
            {contact.nama ?? contact.phone}
          </span>
          <span className="text-[11px] text-[] shrink-0">
            {formatContactTime(contact.last_at)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] text-[] truncate leading-tight flex items-center gap-1">
            {contact.last_direction === 'OUT' && (
              <CheckCheck className="w-3.5 h-3.5 text-[] shrink-0" />
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
        flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors border-b border-[]/60 select-none
        ${isActive ? 'bg-[]' : 'hover:bg-[]'}
      `}
    >
      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white shrink-0 shadow-md text-base">
        {group.subject ? group.subject[0].toUpperCase() : 'G'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="font-medium text-[15px] text-[] truncate leading-none">
            {group.subject}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12px] text-[] truncate leading-tight flex items-center gap-1">
            <Users className="w-3 h-3 text-[] shrink-0" />
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
        
      >
        <p className="whitespace-pre-wrap break-words">{msg.message}</p>
        <div className="flex items-center justify-end gap-1 mt-1 -mr-1 text-[11px] text-[]">
          <span>{formatMsgTime(msg.created_at)}</span>
          {isOut && <CheckCheck className="w-3.5 h-3.5 text-[]" />}
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
      className="px-3 py-1 rounded-lg text-[11px] text-[] font-medium shadow-sm"
      
    >
      {label}
    </span>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY CHAT VIEW
// ─────────────────────────────────────────────────────────────────────────────
const EmptyChat: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8" >
    <div className="w-20 h-20 rounded-full bg-[] border border-[] flex items-center justify-center">
      <Bot className="w-10 h-10 text-[]" />
    </div>
    <div>
      <h3 className="text-xl font-medium text-[] mb-1">WhatsApp Chatbot Absenta</h3>
      <p className="text-sm text-[] max-w-sm">
        Pilih salah satu percakapan di panel sebelah kiri untuk melihat riwayat pesan chatbot secara real-time.
      </p>
    </div>
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs text-[] bg-[] border border-[] mt-2">
      <ShieldCheck className="w-3.5 h-3.5 text-[]" />
      Pesan dilindungi oleh enkripsi otomatis WhatsApp
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────

