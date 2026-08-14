import React from 'react';
import type { Participant } from '../types';
import { VideoTile } from '../VideoTile';

interface MeetingGalleryViewProps {
  isVisible: boolean;
  participants: Participant[];
  user: any;
  isAudioMuted: boolean;
  isVideoDisabled: boolean;
  audioLevel: number;
  activeSpeakerId: string;
  setActiveSpeakerId: (id: string) => void;
  localVideoRef: React.MutableRefObject<HTMLVideoElement | null>;
  localStreamRef: React.MutableRefObject<MediaStream | null>;
  remoteStreams: Record<string, MediaStream>;
  isHandRaised: boolean;
}

export const MeetingGalleryView: React.FC<MeetingGalleryViewProps> = ({
  isVisible,
  participants,
  user,
  isAudioMuted,
  isVideoDisabled,
  audioLevel,
  activeSpeakerId,
  setActiveSpeakerId,
  localVideoRef,
  localStreamRef,
  remoteStreams,
  isHandRaised,
}) => {
  if (!isVisible) return null;

  return (
    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-center justify-center p-2">
      {/* Local Participant Card */}
      <div
        className={`relative w-full h-full min-h-[220px] max-h-[420px] bg-[#222222] rounded-2xl overflow-hidden border-2 transition-all flex items-center justify-center shadow-xl ${
          !isAudioMuted && audioLevel > 12
            ? 'border-[#2DA771] ring-4 ring-[#2DA771]/30 shadow-[#2DA771]/20'
            : activeSpeakerId === 'local'
            ? 'border-[#2DA771]'
            : 'border-[#333333]'
        }`}
      >
        <video
          ref={(el) => {
            localVideoRef.current = el;
            if (el && localStreamRef.current) {
              if (el.srcObject !== localStreamRef.current) {
                el.srcObject = localStreamRef.current;
              }
              el.muted = true;
              el.play().catch(() => {});
            }
          }}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${isVideoDisabled ? 'hidden' : ''}`}
        />
        {isVideoDisabled && (
          <div className="relative flex flex-col items-center">
            {!isAudioMuted && audioLevel > 12 && (
              <span className="absolute -inset-3 rounded-full bg-[#2DA771]/30 animate-ping" />
            )}
            <div className="w-20 h-20 rounded-full bg-[#0E71EB] text-white flex items-center justify-center text-2xl font-bold shadow-2xl z-10">
              {user?.full_name ? user.full_name.slice(0, 2).toUpperCase() : 'ME'}
            </div>
          </div>
        )}

        {/* Name Tag & Real-time Audio Equalizer Badges */}
        <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/70 backdrop-blur-md rounded-lg text-xs font-semibold flex items-center gap-2 z-20">
          <span>{user?.full_name || 'Saya'} (Host, Me)</span>

          {isAudioMuted ? (
            <span className="text-rose-500 font-bold">🔇</span>
          ) : (
            <div className="flex items-center gap-0.5 h-3" title={`Level Suara: ${audioLevel}%`}>
              <span
                style={{ height: `${Math.max(25, audioLevel * 0.9)}%` }}
                className="w-0.5 bg-[#2DA771] rounded-full transition-all duration-75"
              />
              <span
                style={{ height: `${Math.max(40, audioLevel * 1.1)}%` }}
                className="w-0.5 bg-[#2DA771] rounded-full transition-all duration-75"
              />
              <span
                style={{ height: `${Math.max(20, audioLevel * 0.8)}%` }}
                className="w-0.5 bg-[#2DA771] rounded-full transition-all duration-75"
              />
            </div>
          )}

          {isHandRaised && <span className="animate-bounce">✋</span>}
        </div>
      </div>

      {/* Remote Participants with WebRTC Live Video Stream */}
      {participants
        .filter((p) => p.id !== 'local')
        .map((p) => (
          <VideoTile
            key={p.id}
            participant={p}
            isLocal={false}
            stream={remoteStreams[p.id]}
            isActiveSpeaker={activeSpeakerId === p.id}
            onClick={() => setActiveSpeakerId(p.id)}
          />
        ))}
    </div>
  );
};
