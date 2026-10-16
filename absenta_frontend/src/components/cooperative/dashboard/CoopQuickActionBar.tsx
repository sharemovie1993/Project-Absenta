import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Wallet, 
  Coins, 
  ShoppingCart, 
  Landmark, 
  Users, 
  Gavel, 
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CoopQuickActionBarProps {
  pendingLoansCount?: number;
  pendingMembersCount?: number;
}

export const CoopQuickActionBar: React.FC<CoopQuickActionBarProps> = React.memo(({
  pendingLoansCount = 0,
  pendingMembersCount = 0,
}) => {
  const actions = [
    {
      id: 'savings',
      title: 'Simpanan',
      to: '/cooperative/savings',
      icon: Wallet,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgHover: 'hover:border-emerald-300 dark:hover:border-emerald-700/60 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20',
      iconBg: 'bg-emerald-100 dark:bg-emerald-950/60',
    },
    {
      id: 'loans',
      title: 'Pinjaman',
      to: '/cooperative/loans',
      icon: Coins,
      color: 'text-amber-600 dark:text-amber-400',
      bgHover: 'hover:border-amber-300 dark:hover:border-amber-700/60 hover:bg-amber-50/50 dark:hover:bg-amber-950/20',
      iconBg: 'bg-amber-100 dark:bg-amber-950/60',
      badge: pendingLoansCount > 0 ? `${pendingLoansCount} Menunggu` : undefined,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      id: 'pos',
      title: 'Kasir POS',
      to: '/cooperative/pos',
      icon: ShoppingCart,
      color: 'text-blue-600 dark:text-blue-400',
      bgHover: 'hover:border-blue-300 dark:hover:border-blue-700/60 hover:bg-blue-50/50 dark:hover:bg-blue-950/20',
      iconBg: 'bg-blue-100 dark:bg-blue-950/60',
    },
    {
      id: 'cash-bank',
      title: 'Kas & Bank',
      to: '/cooperative/cash-bank',
      icon: Landmark,
      color: 'text-violet-600 dark:text-violet-400',
      bgHover: 'hover:border-violet-300 dark:hover:border-violet-700/60 hover:bg-violet-50/50 dark:hover:bg-violet-950/20',
      iconBg: 'bg-violet-100 dark:bg-violet-950/60',
    },
    {
      id: 'members',
      title: 'Anggota',
      to: '/cooperative/members',
      icon: Users,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgHover: 'hover:border-indigo-300 dark:hover:border-indigo-700/60 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20',
      iconBg: 'bg-indigo-100 dark:bg-indigo-950/60',
      badge: pendingMembersCount > 0 ? `${pendingMembersCount} Pendaftar` : undefined,
      badgeColor: 'bg-indigo-600 text-white',
    },
    {
      id: 'rat',
      title: 'Sidang RAT',
      to: '/cooperative/rat',
      icon: Gavel,
      color: 'text-rose-600 dark:text-rose-400',
      bgHover: 'hover:border-rose-300 dark:hover:border-rose-700/60 hover:bg-rose-50/50 dark:hover:bg-rose-950/20',
      iconBg: 'bg-rose-100 dark:bg-rose-950/60',
    },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3 w-full min-w-0">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Aksi Cepat
        </h3>
        <span className="text-[11px] font-medium text-slate-400 hidden sm:inline-block">
          Pintasan operasional harian
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <Link
              key={act.id}
              to={act.to}
              className={cn(
                "group relative flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 transition-all duration-200 min-h-[52px] hover:shadow-xs",
                act.bgHover
              )}
            >
              <div className={cn("p-2 rounded-xl shrink-0 transition-transform group-hover:scale-110", act.iconBg, act.color)}>
                <Icon size={17} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                  {act.title}
                </p>
                {act.badge && (
                  <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-full inline-block mt-0.5", act.badgeColor)}>
                    {act.badge}
                  </span>
                )}
              </div>

              <ChevronRight size={13} className="text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hidden sm:block" />
            </Link>
          );
        })}
      </div>
    </div>
  );
});

CoopQuickActionBar.displayName = 'CoopQuickActionBar';
