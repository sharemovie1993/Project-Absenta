import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type { Participant } from './types';

export interface MeetingParticipantsSidebarProps {
  participants: Participant[];
  handleMuteAll: () => void;
  handleCopyLink: () => void;
  onClose: () => void;
}

export const MeetingParticipantsSidebar: React.FC<MeetingParticipantsSidebarProps> = ({
  participants,
  handleMuteAll,
  handleCopyLink,
  onClose
}) => {
  return (
    <aside className="w-full sm:w-80 absolute inset-0 sm:static sm:inset-auto bg-[#242424] border-l border-[#333] flex flex-col shrink-0 animate-in slide-in-from-right duration-150 z-40 sm:z-20 shadow-2xl">
      {/* Sidebar Header */}
      <div className="px-4 py-3 border-b border-[#333] flex items-center justify-between">
        <span className="text-xs font-bold text-white uppercase tracking-wider">
          Peserta ({participants.length})
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 cursor-pointer"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Participants List */}
      <div className="flex-1 flex flex-col justify-between overflow-hidden">
        <div className="flex-1 p-3 overflow-y-auto divide-y divide-[#333]">
          {participants.map((p) => (
            <div key={p.id} className="py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-full ${p.avatarColor} text-white flex items-center justify-center text-xs font-bold shrink-0`}
                >
                  {p.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-100 truncate">{p.name}</p>
                  <p className="text-[10px] text-slate-400">{p.isHost ? 'Host' : 'Peserta'}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-slate-400">
                {p.isAudioMuted ? (
                  <span className="text-rose-500 text-xs">🔇</span>
                ) : (
                  <span className="text-[#2DA771] text-xs">🎙️</span>
                )}
                {p.isVideoOff ? (
                  <span className="text-rose-500 text-xs">📹🚫</span>
                ) : (
                  <span className="text-[#2DA771] text-xs">📹</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Host Mute All Footer */}
        <div className="p-3 bg-[#1f1f1f] border-t border-[#333] flex items-center gap-2">
          <button
            type="button"
            onClick={handleMuteAll}
            className="flex-1 py-2 bg-[#333] hover:bg-[#444] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Mute All
          </button>
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex-1 py-2 bg-[#0E71EB] hover:bg-[#0060d6] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Undang
          </button>
        </div>
      </div>
    </aside>
  );
};
