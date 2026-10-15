import React from 'react';
import { Button } from '../../ui';
import { Vote, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import type { CoopVotingSessionItem } from '../../../pages/cooperative/RatMeetingPage';

interface RatLiveVotingBannerProps {
  session: CoopVotingSessionItem | null;
  canVote: boolean;
  onCastVote: (session: CoopVotingSessionItem) => void;
  onViewVotingTab?: () => void;
}

export const RatLiveVotingBanner: React.FC<RatLiveVotingBannerProps> = React.memo(({
  session,
  canVote,
  onCastVote,
  onViewVotingTab,
}) => {
  if (!session || session.status !== 'ACTIVE') return null;

  return (
    <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-800 text-white shadow-xl shadow-indigo-600/25 border border-indigo-400/30 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-start sm:items-center gap-3.5 min-w-0">
        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center shrink-0 shadow-inner">
          <Vote className="w-6 h-6 animate-pulse text-indigo-100" />
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              Sesi e-Voting Sedang Berlangsung
            </span>
            <span className="text-xs text-indigo-200 font-medium">
              {session.options?.length || 0} Opsi Pilihan · Asas One Member One Vote
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-black tracking-tight text-white truncate leading-snug">
            {session.title}
          </h3>
          {session.description && (
            <p className="text-xs text-indigo-200/90 truncate max-w-2xl font-normal">
              {session.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
        {canVote && (
          <Button
            type="button"
            size="sm"
            onClick={() => onCastVote(session)}
            className="bg-white text-indigo-900 hover:bg-indigo-50 font-black shadow-md border-0 gap-1.5 text-xs py-2 px-4"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            Buka Surat Suara Digital
          </Button>
        )}
        {onViewVotingTab && (
          <Button
            type="button"
            size="sm"
            variant="toolbarOutline"
            onClick={onViewVotingTab}
            className="text-white border-white/40 hover:bg-white/10 text-xs py-2"
          >
            Tabulasi Sesi
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
});

RatLiveVotingBanner.displayName = 'RatLiveVotingBanner';
