import React, { useState } from 'react';
import { User, Pencil, Eye, ChevronDown, ChevronRight, Diamond, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

/**
 * ProfileSidebar — Kartu profil di sisi kiri ala MyASN.
 * Menampilkan foto, nama, ID, organisasi, dan tombol aksi.
 */
export interface ProfileSidebarNavGroup {
  label: string;
  items: Array<{
    label: string;
    icon?: LucideIcon;
    active?: boolean;
    onClick?: () => void;
    children?: any[]; // For sub-menus
    premiumInfo?: {
      isPremium: boolean;
      moduleName: string;
      state: 'LOCKED' | 'TRIAL' | 'ACTIVE' | 'EXPIRED';
    };
  }>;
}

interface ProfileSidebarProps {
  name: string;
  identifier?: string;
  organization?: string;
  subtitle?: string;
  avatarUrl?: string;
  /** Navigasi yang dikelompokkan (Smart Menu) */
  navGroups?: ProfileSidebarNavGroup[];
  /** Fallback untuk navigasi tunggal (legacy) */
  navItems?: Array<{
    label: string;
    icon?: LucideIcon;
    active?: boolean;
    onClick?: () => void;
    children?: any[];
    premiumInfo?: {
      isPremium: boolean;
      moduleName: string;
      state: 'LOCKED' | 'TRIAL' | 'ACTIVE' | 'EXPIRED';
    };
  }>;
}

export const ProfileSidebar: React.FC<ProfileSidebarProps> = ({
  name,
  identifier,
  organization,
  subtitle,
  avatarUrl,
  navGroups = [],
  navItems = [],
}) => {
  const navigate = useNavigate();
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggleItem = (label: string) => {
    setOpenItems(prev => ({ ...prev, [label]: !prev[label] }));
  };

  // Handle both grouped and flat legacy items
  const activeGroups = navGroups.length > 0 
    ? navGroups 
    : (navItems.length > 0 ? [{ label: '', items: navItems }] : []);

  const startsWithEmoji = (text: string) => {
    return /^\p{Emoji}/u.test(text.trim());
  };

  return (
    <div className="space-y-3">
      {/* Kartu Profil */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-[0_2px_20px_-5px_rgba(0,0,0,0.08)] p-4 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full blur-2xl -mr-8 -mt-8" />
        
        {/* Avatar */}
        <div className="w-[72px] h-[72px] rounded-full mx-auto mb-3 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center overflow-hidden border-2 border-white dark:border-slate-600 shadow-sm relative z-10">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <User className="w-8 h-8 text-blue-400 dark:text-slate-400" />
          )}
        </div>

        {/* Info */}
        <div className="relative z-10">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight truncate px-2">{name}</h3>
          {identifier && (
            <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-0.5 tracking-tight">{identifier}</p>
          )}
          {organization && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 leading-tight line-clamp-2 px-4">{organization}</p>
          )}
          {subtitle && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium">{subtitle}</p>
          )}
        </div>

        {/* Tombol Aksi Profil */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 relative z-10">
          <button 
            onClick={() => navigate('/dashboard?tab=profil')}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-slate-700 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 transition-all active:scale-95"
          >
            <Eye size={12} /> Lihat
          </button>
          <button 
            onClick={() => navigate('/dashboard?tab=profil&edit=true')}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-slate-700 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 transition-all active:scale-95"
          >
            <Pencil size={12} /> Edit
          </button>
        </div>
      </div>

      {/* Navigasi Menu (Smart Groups) */}
      <div className="space-y-4 pb-6">
        {activeGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1.5">
            {group.label && (
              <h4 className="px-3 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-1">
                {group.label}
              </h4>
            )}
            <nav className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-[0_2px_20px_-5px_rgba(0,0,0,0.08)] overflow-hidden divide-y divide-gray-50 dark:divide-slate-800/10">
              {group.items.map((item, idx) => {
                const hasChildren = item.children && item.children.length > 0;
                const isOpen = openItems[item.label];
                
                return (
                  <div key={idx}>
                    <button
                      onClick={() => hasChildren ? toggleItem(item.label) : item.onClick?.()}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium transition-all group ${
                        item.active
                          ? 'bg-blue-50/50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      {!startsWithEmoji(item.label) && (
                        <div className={`p-1 rounded-md transition-colors ${item.active ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-400 group-hover:text-blue-500'}`}>
                          {item.icon && <item.icon size={12} />}
                        </div>
                      )}
                      <span className="truncate flex-1 text-left">{item.label}</span>
                      
                      {/* Premium Indicator Badge */}
                      {item.premiumInfo?.isPremium && (
                        <div 
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-bold tracking-tight transition-all ${
                            item.premiumInfo.state === 'LOCKED'
                              ? 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-400'
                              : item.premiumInfo.state === 'TRIAL'
                              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400'
                              : item.premiumInfo.state === 'EXPIRED'
                              ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/50 text-red-600 dark:text-red-400'
                              : 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/50 text-amber-600 dark:text-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.2)]'
                          }`}
                          title={`Modul Premium: ${item.premiumInfo.moduleName}`}
                        >
                          {item.premiumInfo.state === 'LOCKED' ? (
                            <>
                              <Lock size={8} />
                              <span>LOCKED</span>
                            </>
                          ) : (
                            <>
                              <Diamond 
                                size={8} 
                                className={`fill-current ${item.premiumInfo.state === 'ACTIVE' ? 'animate-pulse' : ''}`} 
                              />
                              <span className="uppercase">{item.premiumInfo.state}</span>
                            </>
                          )}
                        </div>
                      )}
                      
                      {hasChildren ? (
                        isOpen ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />
                      ) : (
                        item.active && <div className="w-1 h-3 bg-blue-600 rounded-full" />
                      )}
                    </button>

                    {/* Sub-menu (Children) */}
                    {hasChildren && isOpen && (
                      <div className="bg-gray-50/50 dark:bg-slate-900/30 py-1 border-t border-gray-50 dark:border-slate-700/50">
                        {item.children?.map((child: any, cIdx: number) => (
                          <button
                            key={cIdx}
                            onClick={() => navigate(child.path || '#')}
                            className="w-full flex items-center gap-3 pl-10 pr-3 py-2 text-[11px] font-medium text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-slate-600 group-hover:bg-blue-500" />
                            {child.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
        ))}
      </div>
    </div>
  );
};
