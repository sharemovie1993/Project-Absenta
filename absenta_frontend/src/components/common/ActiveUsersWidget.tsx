import React, { useState, useRef, useEffect } from 'react';
import { Users, Wifi, Search, X, Shield, GraduationCap, School, HeartHandshake } from 'lucide-react';
import { usePresence } from '../../hooks/usePresence';

interface ActiveUsersWidgetProps {
  className?: string;
  variant?: 'navbar' | 'card';
}

export const ActiveUsersWidget: React.FC<ActiveUsersWidgetProps> = ({
  className = '',
  variant = 'navbar'
}) => {
  const { summary, activeCount, isLoading, refresh } = usePresence();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredUsers = (summary?.users || []).filter(u => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const nameStr = String(u.name || '').toLowerCase();
    const roleStr = String(u.role || (u as any).roleName || '').toLowerCase();
    return nameStr.includes(q) || roleStr.includes(q);
  });

  const getRoleIcon = (role: string) => {
    const r = role.toUpperCase();
    if (r.includes('ADMIN') || r.includes('SUPERADMIN')) {
      return <Shield size={12} className="text-amber-500" />;
    }
    if (r.includes('GURU')) {
      return <School size={12} className="text-indigo-500" />;
    }
    if (r.includes('SISWA')) {
      return <GraduationCap size={12} className="text-emerald-500" />;
    }
    return <HeartHandshake size={12} className="text-pink-500" />;
  };

  const getRoleBadgeColor = (role: string) => {
    const r = role.toUpperCase();
    if (r.includes('ADMIN') || r.includes('SUPERADMIN')) {
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    }
    if (r.includes('GURU')) {
      return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
    }
    if (r.includes('SISWA')) {
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    }
    return 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20';
  };

  if (variant === 'card') {
    return (
      <div className={`p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-white space-y-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-slate-300">Live Active Users</span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            {activeCount} Online
          </span>
        </div>

        {/* Breakdown bar */}
        {summary && summary.roleCounts && (
          <div className="flex flex-wrap gap-2 pt-1 text-center">
            {Object.entries(summary.roleCounts)
              .filter(([role]) => {
                const r = String(role || '').trim().toLowerCase();
                return r && r !== 'undefined' && r !== 'null';
              })
              .map(([role, cnt]) => (
                <div key={role} className="flex-1 min-w-[70px] p-2 rounded-xl bg-slate-800/60 border border-slate-700/50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{role}</p>
                  <p className="text-sm font-extrabold text-white mt-0.5">{cnt}</p>
                </div>
              ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) refresh();
        }}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border
          bg-emerald-50/80 hover:bg-emerald-100/90 text-emerald-700 border-emerald-200/80
          dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/60 cursor-pointer shadow-xs active:scale-95"
        title="Klik untuk melihat user yang sedang login aktif"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <Users size={13} className="text-emerald-600 dark:text-emerald-400" />
        <span className="text-[11px] font-extrabold tracking-tight">
          {activeCount} <span className="hidden sm:inline font-semibold opacity-85">Aktif</span>
        </span>
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-[150] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">User Aktif Realtime</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {activeCount} user terhubung ({summary?.totalConnections || activeCount} koneksi)
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          {/* Role Summary Badges */}
          {summary?.roleCounts && Object.keys(summary.roleCounts).length > 0 && (
            <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5 flex-wrap bg-slate-50/30 dark:bg-slate-900/40">
              {Object.entries(summary.roleCounts)
                .filter(([role]) => {
                  const r = String(role || '').trim().toLowerCase();
                  return r && r !== 'undefined' && r !== 'null';
                })
                .map(([role, count]) => (
                  <span
                    key={role}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 ${getRoleBadgeColor(role)}`}
                  >
                    {getRoleIcon(role)}
                    <span>{role}:</span>
                    <span className="font-extrabold">{count}</span>
                  </span>
                ))}
            </div>
          )}

          {/* Search bar */}
          <div className="p-2.5 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari nama atau role..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 border-none focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* User List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1">
            {isLoading && !summary ? (
              <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
                Memuat data sesi aktif...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                {search ? 'Tidak ada user yang cocok' : 'Belum ada user yang terhubung'}
              </div>
            ) : (
              filteredUsers.map(user => (
                <div key={user.userId} className="p-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-black shrink-0">
                      {user.name ? user.name.slice(0, 2).toUpperCase() : 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {user.name}
                      </p>
                      <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
                        <span className="flex items-center gap-1">
                          {getRoleIcon(user.role)}
                          <span className="font-semibold uppercase">{user.role}</span>
                        </span>
                        {user.tabsCount > 1 && (
                          <span>• {user.tabsCount} tab</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-[9px] font-medium text-slate-400 shrink-0">
                    {user.connectedAt ? new Date(user.connectedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 font-medium">
              Realtime via WebSocket Engine • Auto-refresh
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
