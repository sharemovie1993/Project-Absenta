import React from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { SectionCard, Button, Badge } from '@/components/ui';

interface RegistrationSyncCardProps {
  needsSync: boolean;
  unregisteredCount: number;
  onSync: () => void;
  syncLoading: boolean;
}

export const RegistrationSyncCard: React.FC<RegistrationSyncCardProps> = React.memo(({
  needsSync,
  unregisteredCount,
  onSync,
  syncLoading
}) => {
  if (!needsSync || syncLoading) return null;

  return (
    <div className="p-4 bg-amber-50/20 dark:bg-amber-900/5 border-b border-amber-100 dark:border-amber-900/20">
      <SectionCard
        fullWidth
        className="p-6 border-2 border-amber-100 dark:border-amber-900/30 shadow-xl shadow-amber-500/5 bg-white/80 dark:bg-slate-900/80"
        noPadding
      >
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 w-full">
          <div className="w-16 h-16 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 shrink-0 shadow-md border-2 border-white dark:border-slate-900">
            <Sparkles size={32} className="animate-pulse" />
          </div>
          
          <div className="flex-1 text-center md:text-left space-y-1">
            <div className="flex flex-col md:flex-row md:items-center gap-2">
               <h3 className="text-lg font-black text-slate-900 dark:text-white italic tracking-tight">Sinkronisasi Diperlukan!</h3>
               <Badge className="w-fit mx-auto md:mx-0 bg-amber-500 text-white font-black text-[9px] px-2 rounded-full border-none">WAJIB AKTIVASI</Badge>
            </div>
            <p className="text-[13px] font-medium text-slate-500 max-w-2xl">
              Terdapat <span className="text-amber-600 font-black">{unregisteredCount} siswa</span> yang belum terdaftar. Lakukan aktivasi massal sekarang.
            </p>
          </div>

          <Button
            onClick={onSync}
            className="h-12 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.1em] text-[11px] gap-3 shadow-lg shadow-blue-500/20 hover:scale-102 active:scale-98 transition-all group"
          >
            <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-700" />
            Mulai Aktivasi Massal
          </Button>
        </div>
      </SectionCard>
    </div>
  );
});
