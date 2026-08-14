import React, { useEffect, useRef, useState } from 'react';
import type { Participant } from './types';

export interface VideoTileProps {
  participant: Participant;
  isLocal?: boolean;
  stream?: MediaStream | null;
  isActiveSpeaker: boolean;
  onClick?: () => void;
  className?: string;
  isCompact?: boolean;
}

export const VideoTile: React.FC<VideoTileProps> = ({
  participant,
  isLocal = false,
  stream,
  isActiveSpeaker,
  onClick,
  className,
  isCompact = false
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hasVideoTrack, setHasVideoTrack] = useState<boolean>(() => {
    return Boolean(stream && stream.getVideoTracks().length > 0);
  });

  const attachStream = (el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && stream) {
      if (el.srcObject !== stream) {
        el.srcObject = stream;
      }
      el.muted = isLocal;
      const playPromise = el.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('[VideoTile] Autoplay prevented, attempting fallback:', err.name);
          // Fallback: Mute to satisfy browser autoplay policy, then retry
          el.muted = true;
          el.play().catch(() => {});
        });
      }
      const vTracks = stream.getVideoTracks();
      setHasVideoTrack(vTracks.length > 0 && vTracks.some((t) => t.enabled));
    }
  };

  useEffect(() => {
    if (!stream) {
      setHasVideoTrack(false);
      return;
    }

    if (videoRef.current) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      videoRef.current.muted = isLocal;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current.play().catch(() => {});
          }
        });
      }
    }

    const checkTracks = () => {
      const vTracks = stream.getVideoTracks();
      const hasTracks = vTracks.length > 0 && vTracks.some((t) => t.enabled !== false && t.readyState !== 'ended');
      setHasVideoTrack(hasTracks);
    };

    checkTracks();

    // Listen to track state changes
    stream.getVideoTracks().forEach((track) => {
      track.onunmute = () => {
        setHasVideoTrack(true);
        if (videoRef.current) videoRef.current.play().catch(() => {});
      };
      track.onmute = () => {
        // Jangan langsung false jika hanya temporary mute saat renegotiate
        setTimeout(checkTracks, 300);
      };
      track.onended = () => {
        checkTracks();
      };
    });

    stream.onaddtrack = () => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      checkTracks();
    };
    stream.onremovetrack = checkTracks;
  }, [stream, isLocal]);

  return (
    <div
      onClick={onClick}
      className={
        className ||
        `relative w-full h-full min-h-[220px] max-h-[420px] bg-[#222222] rounded-2xl overflow-hidden border-2 transition-all flex items-center justify-center shadow-xl cursor-pointer ${
          isActiveSpeaker ? 'border-[#2DA771]' : 'border-[#333333]'
        }`
      }
    >
      <video
        ref={attachStream}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          hasVideoTrack ? 'opacity-100' : 'opacity-0 absolute'
        }`}
      />
      {!hasVideoTrack && (
        <div
          className={`${
            isCompact ? 'w-10 h-10 text-xs' : 'w-20 h-20 text-2xl'
          } rounded-full ${participant.avatarColor || 'bg-[#742774]'} text-white flex items-center justify-center font-bold shadow-2xl`}
        >
          {participant.name.slice(0, 2).toUpperCase()}
        </div>
      )}

      <div
        className={`absolute bottom-2 left-2 ${
          isCompact ? 'px-1.5 py-0.5 text-[9px]' : 'px-3 py-1 text-xs'
        } bg-black/70 backdrop-blur-md rounded-lg font-semibold flex items-center gap-1.5 z-20`}
      >
        <span className={`truncate ${isCompact ? 'max-w-[90px]' : 'max-w-[200px]'}`}>{participant.name}</span>
        {participant.isAudioMuted ? (
          <span className="text-rose-500 font-bold">🔇</span>
        ) : (
          <span className="text-[#2DA771]">🎙️</span>
        )}
      </div>
    </div>
  );
};
