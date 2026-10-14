import React from 'react';
import { SectionCard, Badge, Button } from '../../ui';
import { Vote, Plus } from 'lucide-react';
import type { CoopVotingSessionItem } from '../../../pages/cooperative/RatMeetingPage';

interface RatVotingSectionProps {
  votingSessions: CoopVotingSessionItem[];
  canManage: boolean;
  canVote: boolean;
  onOpenCreateSession: () => void;
  onSelectVoteSession: (session: CoopVotingSessionItem) => void;
  onUpdateSessionStatus: (sessionId: string, status: 'ACTIVE' | 'CLOSED' | 'TALLIED') => void;
  isUpdatingStatus: boolean;
}

export const RatVotingSection: React.FC<RatVotingSectionProps> = React.memo(({
  votingSessions,
  canManage,
  canVote,
  onOpenCreateSession,
  onSelectVoteSession,
  onUpdateSessionStatus,
  isUpdatingStatus
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-800/80 p-4 rounded-2xl border border-indigo-100 dark:border-slate-800">
        <div>
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
            Pemungutan Suara Sidang (One Member One Vote)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Kerahasiaan pilihan dijamin penuh dan pemilih hanya memiliki hak 1 surat suara per sesi.
          </p>
        </div>

        {canManage && (
          <Button
            type="button"
            size="toolbar"
            variant="toolbarPrimary"
            onClick={onOpenCreateSession}
            className="gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Buka Sesi Voting Baru
          </Button>
        )}
      </div>

      {(votingSessions || []).length > 0 ? (
        <div className="space-y-4">
          {(votingSessions || []).map((session) => (
            <SectionCard key={session.id} className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-base text-slate-800 dark:text-slate-100">
                      {session.title}
                    </h4>
                    <Badge variant={session.status === 'ACTIVE' ? 'success' : session.status === 'TALLIED' ? 'primary' : 'default'}>
                      {session.status === 'ACTIVE' ? 'SEDANG BERLANGSUNG' : session.status === 'TALLIED' ? 'HASIL RESMI SAH' : 'DITUTUP'}
                    </Badge>
                  </div>
                  {session.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {session.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {canVote && session.status === 'ACTIVE' && (
                    <Button
                      type="button"
                      size="toolbar"
                      variant="toolbarPrimary"
                      onClick={() => onSelectVoteSession(session)}
                      className="gap-1.5"
                    >
                      <Vote className="w-4 h-4" />
                      Buka Surat Suara Digital
                    </Button>
                  )}

                  {canManage && session.status === 'ACTIVE' && (
                    <Button
                      type="button"
                      size="toolbar"
                      variant="toolbarOutline"
                      onClick={() => onUpdateSessionStatus(session.id, 'CLOSED')}
                      disabled={isUpdatingStatus}
                    >
                      Tutup Pemungutan
                    </Button>
                  )}

                  {canManage && (session.status === 'CLOSED' || session.status === 'ACTIVE') && (
                    <Button
                      type="button"
                      size="toolbar"
                      variant="toolbarOutline"
                      onClick={() => onUpdateSessionStatus(session.id, 'TALLIED')}
                      disabled={isUpdatingStatus}
                    >
                      Hitung & Sahkan Hasil
                    </Button>
                  )}
                </div>
              </div>

              {/* Vote tally visualization */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Perolehan Suara Sah ({session.ballotsCount || (session.options || []).reduce((acc, curr) => acc + (curr.voteCount || 0), 0)} Total Suara Masuk):
                </p>

                <div className="space-y-2">
                  {(session.options || []).map((opt) => {
                    const totalVotes = session.ballotsCount || (session.options || []).reduce((acc, curr) => acc + (curr.voteCount || 0), 0);
                    const pct = totalVotes > 0 ? Math.round(((opt.voteCount || 0) / totalVotes) * 100) : 0;
                    return (
                      <div key={opt.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="text-slate-700 dark:text-slate-200">{opt.title}</span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {opt.voteCount || 0} Suara ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </SectionCard>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-slate-400 text-sm bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800">
          Belum ada sesi pemungutan suara yang diagendakan.
        </div>
      )}
    </div>
  );
});

RatVotingSection.displayName = 'RatVotingSection';
