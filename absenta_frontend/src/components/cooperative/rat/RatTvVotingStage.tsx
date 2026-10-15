import React from 'react';
import Badge from '../../ui/Badge';
import { Vote, QrCode, ShieldCheck, Users, BarChart3, CheckCircle2 } from 'lucide-react';

interface VotingOption {
  id: string;
  label?: string;
  title?: string;
  description?: string | null;
  voteCount?: number;
}

interface VotingSessionData {
  id: string;
  title: string;
  category?: string;
  status: 'PENDING' | 'ACTIVE' | 'CLOSED' | 'TALLIED';
  options: VotingOption[];
  ballotsCount?: number;
}

interface RatTvVotingStageProps {
  session: VotingSessionData | null;
  totalPresentMembers?: number;
}

export const RatTvVotingStage: React.FC<RatTvVotingStageProps> = React.memo(({
  session,
  totalPresentMembers = 0,
}) => {
  if (!session) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 rounded-3xl bg-indigo-50 dark:bg-slate-800/80 border border-indigo-200 dark:border-slate-700 flex items-center justify-center text-indigo-500 mb-4 shadow-inner">
          <Vote className="w-10 h-10 animate-pulse" />
        </div>
        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">
          Belum Ada Sesi Pemungutan Suara Aktif
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mt-1">
          Layar akan otomatis menampilkan bilik suara panggung dan grafik live saat Presidium Sidang membuka sesi e-Voting.
        </p>
      </div>
    );
  }

  const options = session.options || [];
  const totalVotes = session.ballotsCount || options.reduce((sum, opt) => sum + (opt.voteCount || 0), 0);
  const participationPct = totalPresentMembers > 0 
    ? Math.min(100, Math.round((totalVotes / totalPresentMembers) * 100)) 
    : 0;

  return (
    <div className="flex-1 flex flex-col p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full overflow-y-auto">
      {/* HEADER STAGE BANNER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              <Vote className="w-3.5 h-3.5" />
              <span>PAPAN PEMUNGUTAN SUARA DIGITAL (E-VOTING)</span>
            </span>
            <Badge variant={session.status === 'ACTIVE' ? 'success' : 'primary'} className="text-xs px-2.5 py-0.5">
              {session.status === 'ACTIVE' ? '🔴 SEDANG BERLANGSUNG' : 'HASIL SAH TERCATAT'}
            </Badge>
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            {session.title}
          </h2>
        </div>

        {/* STATS TICKER */}
        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Suara Masuk</span>
            <div className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400 leading-none">
              {totalVotes} <span className="text-xs text-slate-500 font-normal">/ {totalPresentMembers} Hadir</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-md shadow-indigo-600/30">
            {participationPct}%
          </div>
        </div>
      </div>

      {/* MAIN TWO-COLUMN STAGE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
        {/* LEFT COLUMN: QR CODE SCAN & SECURITY ASSURANCE (4 cols) */}
        <div className="lg:col-span-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 text-center flex flex-col items-center">
          <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border-2 border-dashed border-indigo-300 dark:border-indigo-800 flex flex-col items-center justify-center w-full max-w-[220px]">
            <QrCode className="w-32 h-32 text-indigo-600 dark:text-indigo-400" />
            <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-widest mt-2">
              Scan Bilik Suara
            </span>
          </div>

          <div className="space-y-1">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
              Buka Surat Suara dari Smartphone
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Peserta sidang di aula dapat langsung masuk ke tab e-Voting atau scan kode QR ini untuk mencoblos.
            </p>
          </div>

          <div className="w-full pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-left">
            <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Asas LUBER & JURDIL Terjamin</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pl-6">
              Pilihan anggota dienkripsi kriptografis (HMAC-SHA256). Pengurus tidak dapat melihat pilihan pribadi masing-masing pemilih.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE TALLY PROGRESS BARS (8 cols) */}
        <div className="lg:col-span-8 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-800 dark:text-slate-200">
              <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Hasil Rekapitulasi Suara Sah Secara Langsung</span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Live Real-Time Sync
            </span>
          </div>

          <div className="space-y-4 pt-1">
            {options.map((opt, idx) => {
              const label = opt.label || opt.title || `Opsi ${idx + 1}`;
              const count = opt.voteCount || 0;
              const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;

              return (
                <div
                  key={opt.id || idx}
                  className="p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate block">
                          {label}
                        </span>
                        {opt.description && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 truncate block">
                            {opt.description}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                        {count} <span className="text-xs text-slate-500 font-normal">Suara</span>
                      </span>
                      <span className="block font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {pct}%
                      </span>
                    </div>
                  </div>

                  {/* Animated Progress Bar */}
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-3.5 rounded-full overflow-hidden p-0.5">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});

RatTvVotingStage.displayName = 'RatTvVotingStage';
export default RatTvVotingStage;
