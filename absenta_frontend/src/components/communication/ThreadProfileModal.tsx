import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { internalCommunicationApi } from '@/api/internal-communication.api';
import { resolveProfilePhotoUrl } from '@/lib/utils';
import {
  XMarkIcon,
  UserGroupIcon,
  AcademicCapIcon,
  PhoneIcon,
  EnvelopeIcon,
  IdentificationIcon,
  MagnifyingGlassIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

interface ChatAvatarProps {
  src?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isBroadcast?: boolean;
  isGroup?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<ChatAvatarProps['size']>, string> = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-xs',
  lg: 'w-11 h-11 text-sm',
  xl: 'w-16 h-16 text-lg',
};

export function ChatAvatar({
  src,
  name,
  size = 'md',
  isBroadcast = false,
  isGroup = false,
  className = '',
}: ChatAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const resolvedUrl = useMemo(() => (src ? resolveProfilePhotoUrl(src) : null), [src]);
  const initials = (name || 'CH')
    .replace(/^(Grp\.|📢)\s*/i, '')
    .trim()
    .slice(0, 2)
    .toUpperCase();

  if (resolvedUrl && !imgError) {
    return (
      <img
        src={resolvedUrl}
        alt={name || 'Avatar'}
        onError={() => setImgError(true)}
        className={`${SIZE_CLASSES[size]} rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700 bg-slate-100 ${className}`}
      />
    );
  }

  const bgClass = isBroadcast
    ? 'bg-rose-500 text-white'
    : isGroup
    ? 'bg-[#00a884] text-white'
    : 'bg-slate-600 text-white';

  return (
    <div
      className={`${SIZE_CLASSES[size]} rounded-full flex items-center justify-center font-extrabold shrink-0 select-none ${bgClass} ${className}`}
    >
      {isBroadcast ? '📢' : initials || 'CH'}
    </div>
  );
}

interface ThreadProfileModalProps {
  threadId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ThreadProfileModal({ threadId, isOpen, onClose }: ThreadProfileModalProps) {
  const [memberSearch, setMemberSearch] = useState('');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['internal-communication', 'profile', threadId],
    queryFn: () => internalCommunicationApi.getThreadProfile(threadId),
    enabled: isOpen && Boolean(threadId),
    staleTime: 1000 * 30,
  });

  const filteredMembers = useMemo(() => {
    const list = profile?.members || [];
    const q = memberSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.role_label || '').toLowerCase().includes(q) ||
        (m.kelas || '').toLowerCase().includes(q) ||
        (m.nisn || '').toLowerCase().includes(q) ||
        (m.nip || '').toLowerCase().includes(q)
    );
  }, [profile?.members, memberSearch]);

  if (!isOpen) return null;

  const isGroup = profile?.type === 'GROUP';
  const target = profile?.targetUser;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[86vh] bg-white dark:bg-[#111b21] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar */}
        <div className="px-4 py-3 bg-gradient-to-r from-[#075e54] to-[#008069] dark:from-[#202c33] dark:to-[#111b21] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4" />
            <h3 className="text-xs font-extrabold tracking-wide uppercase">
              {isGroup ? 'Info & Anggota Grup' : 'Profil Kontak'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading || !profile ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#00a884] border-t-transparent" />
              Memuat profil...
            </div>
          ) : (
            <>
              {/* Identity Hero */}
              <div className="flex flex-col items-center text-center space-y-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <ChatAvatar
                  src={target?.avatar}
                  name={isGroup ? profile.title : target?.name || profile.title}
                  size="xl"
                  isBroadcast={profile.isBroadcast}
                  isGroup={isGroup}
                />
                <div>
                  <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                    {isGroup ? profile.title : target?.name || profile.title}
                  </h4>
                  <div className="flex items-center justify-center gap-1.5 mt-1 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                      {isGroup
                        ? profile.groupScope === 'KELAS'
                          ? 'Grup Kelas'
                          : profile.groupScope === 'JABATAN'
                          ? 'Grup Jabatan'
                          : 'Grup Diskusi'
                        : target?.role_label || target?.role || 'Pengguna'}
                    </span>
                    {isGroup && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {profile.memberCount} Anggota
                      </span>
                    )}
                    {profile.kelasInfo?.tahun_pelajaran && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                        TP {profile.kelasInfo.tahun_pelajaran}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Info Kelas (Untuk Grup Kelas) */}
              {profile.kelasInfo && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#202c33] border border-slate-200/70 dark:border-slate-700/60 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                    <AcademicCapIcon className="w-4 h-4 text-[#00a884]" />
                    <span>Informasi Kelas</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Kelas</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">
                        {profile.kelasInfo.nama_kelas}
                      </span>
                    </div>
                    {profile.kelasInfo.jurusan && (
                      <div>
                        <span className="text-[10px] text-slate-400 block">Kompetensi Keahlian</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">
                          {profile.kelasInfo.jurusan}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Card Wali Kelas (Untuk Grup Kelas maupun Direct Chat Siswa) */}
              {profile.waliKelas && (
                <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200/80 dark:border-emerald-800/60 space-y-2">
                  <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                    Wali Kelas
                  </span>
                  <div className="flex items-center gap-3">
                    <ChatAvatar
                      src={profile.waliKelas.avatar}
                      name={profile.waliKelas.name}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate">
                        {profile.waliKelas.name}
                      </p>
                      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate">
                        {profile.waliKelas.nip ? `NIP. ${profile.waliKelas.nip}` : profile.waliKelas.jabatan || 'Wali Kelas'}
                      </p>
                    </div>
                    {profile.waliKelas.no_hp && (
                      <span className="text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-300 shrink-0">
                        {profile.waliKelas.no_hp}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Detail Biodata Direct Chat (Siswa / Guru / Staf) */}
              {!isGroup && target && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#202c33] border border-slate-200/70 dark:border-slate-700/60 space-y-2.5 text-xs">
                  {target.kelas && (
                    <div className="flex items-center gap-2.5">
                      <AcademicCapIcon className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 block">Kelas</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">{target.kelas}</span>
                      </div>
                    </div>
                  )}
                  {(target.nis || target.nisn) && (
                    <div className="flex items-center gap-2.5">
                      <IdentificationIcon className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 block">NIS / NISN</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">
                          {[target.nis, target.nisn].filter(Boolean).join(' / ')}
                        </span>
                      </div>
                    </div>
                  )}
                  {target.nip && (
                    <div className="flex items-center gap-2.5">
                      <IdentificationIcon className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 block">NIP</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">{target.nip}</span>
                      </div>
                    </div>
                  )}
                  {target.no_hp && (
                    <div className="flex items-center gap-2.5">
                      <PhoneIcon className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 block">Nomor HP / WA</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">{target.no_hp}</span>
                      </div>
                    </div>
                  )}
                  {target.email && (
                    <div className="flex items-center gap-2.5">
                      <EnvelopeIcon className="w-4 h-4 text-slate-400 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 block">Email</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100 truncate block">
                          {target.email}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Daftar Anggota Grup */}
              {(isGroup || profile.members.length > 2) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                      <UserGroupIcon className="w-4 h-4 text-[#00a884]" />
                      <span>Anggota Grup ({profile.memberCount})</span>
                    </div>
                  </div>

                  {profile.members.length > 6 && (
                    <div className="relative">
                      <MagnifyingGlassIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        placeholder="Cari nama anggota atau kelas..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-[#202c33] border border-slate-200/70 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-hidden focus:ring-1 focus:ring-[#00a884]"
                      />
                    </div>
                  )}

                  <div className="divide-y divide-slate-100 dark:divide-slate-800/70 rounded-xl border border-slate-200/70 dark:border-slate-800 overflow-hidden max-h-[250px] overflow-y-auto">
                    {filteredMembers.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        Tidak ada anggota yang cocok
                      </div>
                    ) : (
                      filteredMembers.map((m) => (
                        <div
                          key={m.user_id}
                          className="px-3 py-2 flex items-center gap-2.5 bg-white dark:bg-[#111b21] hover:bg-slate-50 dark:hover:bg-[#202c33]/60"
                        >
                          <ChatAvatar src={m.avatar} name={m.name} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                              {m.name}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {m.role_label}
                              {m.kelas ? ` • ${m.kelas}` : m.nip ? ` • NIP ${m.nip}` : ''}
                            </p>
                          </div>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                              m.role === 'SISWA'
                                ? 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300'
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            }`}
                          >
                            {m.role}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
