import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Alert, Button } from '@/components/ui';

interface RegistrationSyncResultProps {
  syncResult: { created: number; skipped: number; total: number } | null;
  syncError: string | null;
  onClear: () => void;
}

export const RegistrationSyncResult: React.FC<RegistrationSyncResultProps> = React.memo(({
  syncResult,
  syncError,
  onClear
}) => {
  if (!syncResult && !syncError) return null;

  return (
    <div className="px-6 py-4 animate-in slide-in-from-top-4 duration-500">
      <Alert variant={syncError ? 'destructive' : 'default'} className={`rounded-xl border-2 border-dashed ${syncError ? 'bg-rose-50/50 border-rose-100' : 'bg-emerald-50/50 border-emerald-100'} p-5`}>
        <div className="flex items-center gap-5">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${syncError ? 'bg-white text-rose-600' : 'bg-white text-emerald-600'}`}>
            {syncError ? <XCircle size={24} /> : <CheckCircle2 size={24} />}
          </div>
          <div className="flex-1">
            <h5 className={`text-xs font-black uppercase tracking-[0.15em] mb-1 ${syncError ? 'text-rose-700' : 'text-emerald-700'}`}>
              {syncError ? 'Operasi Gagal' : 'Aktivasi Berhasil Diselesaikan'}
            </h5>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-normal">
              {syncError || `Berhasil mendaftarkan ${syncResult?.created} siswa baru. Data akademik kini sinkron dengan Biodata Induk.`}
            </p>
          </div>
          <Button size="icon" variant="ghost" onClick={onClear} className="hover:bg-white/50 rounded-full">
            <XCircle size={18} className="opacity-40" />
          </Button>
        </div>
      </Alert>
    </div>
  );
});
