import React from 'react';
import type { Participant } from '../types';
import { VideoTile } from '../VideoTile';

interface MeetingSpeakerViewProps {
  isVisible: boolean;
  participants: Participant[];
  user: any;
  isAudioMuted: boolean;
  isVideoDisabled: boolean;
  activeSpeakerId: string;
  setActiveSpeakerId: (id: string) => void;
  localStreamRef: React.MutableRefObject<MediaStream | null>;
  remoteStreams: Record<string, MediaStream>;
  isHandRaised: boolean;
}

export const MeetingSpeakerView: React.FC<MeetingSpeakerViewProps> = ({
  isVisible,
  participants,
  user,
  isAudioMuted,
  isVideoDisabled,
  activeSpeakerId,
  setActiveSpeakerId,
  localStreamRef,
  remoteStreams,
  isHandRaised,
}) => {
  if (!isVisible) return null;

  const spotlightParticipant =
    participants.find((p) => p.id === activeSpeakerId) ||
    participants[0] || {
      id: 'local',
      name: user?.full_name || 'Saya',
      role: 'HOST',
      isHost: true,
      isAudioMuted,
      isVideoOff: isVideoDisabled,
      isHandRaised,
      avatarColor: 'bg-[#0E71EB]'
    };
  const spotlightStream =
    activeSpeakerId === 'local' ? localStreamRef.current : remoteStreams[activeSpeakerId];

  return (
    <div className="flex-1 flex flex-col gap-3 overflow-hidden">
      {/* Top Filmstrip (All participants with live video tiles) */}
      <div className="h-28 flex gap-2 overflow-x-auto pb-1 shrink-0">
        {participants.map((p) => {
          const pStream = p.id === 'local' ? localStreamRef.current : remoteStreams[p.id];
          const isSelected = activeSpeakerId === p.id;
          return (
            <div
              key={p.id}
              onClick={() => setActiveSpeakerId(p.id)}
              className={`w-40 h-full rounded-xl overflow-hidden border-2 shrink-0 relative cursor-pointer transition-all ${
                isSelected ? 'border-[#2DA771] ring-2 ring-[#2DA771]/40' : 'border-[#333] hover:border-slate-500'
              }`}
            >
              <VideoTile
                participant={p}
                isLocal={p.id === 'local'}
                stream={pStream}
                isActiveSpeaker={isSelected}
                isCompact={true}
                className="w-full h-full relative"
              />
            </div>
          );
        })}
      </div>

      {/* Main Spotlight Video */}
      <div className="flex-1 bg-[#1a1a1a] rounded-2xl border border-[#333] flex items-center justify-center relative overflow-hidden shadow-2xl">
        <VideoTile
          participant={spotlightParticipant}
          isLocal={activeSpeakerId === 'local'}
          stream={spotlightStream}
          isActiveSpeaker={true}
          className="w-full h-full relative flex items-center justify-center"
        />
      </div>
    </div>
  );
};
