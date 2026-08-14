import React from 'react';
import {
  MicrophoneIcon,
  VideoCameraIcon,
  ChevronUpIcon,
  ShieldCheckIcon,
  UsersIcon,
  ChatBubbleLeftRightIcon,
  ArrowUpTrayIcon,
  PencilSquareIcon,
  HandRaisedIcon,
  FaceSmileIcon,
  PhoneXMarkIcon
} from '@heroicons/react/24/outline';
import type { AudioDevice } from './types';
import { MeetingAudioPopover } from './MeetingAudioPopover';
import { MeetingVideoPopover } from './MeetingVideoPopover';

export interface MeetingToolbarProps {
  isAudioMuted: boolean;
  isVideoDisabled: boolean;
  handleToggleAudio: () => void;
  handleToggleVideo: () => void;
  showAudioMenu: boolean;
  setShowAudioMenu: React.Dispatch<React.SetStateAction<boolean>>;
  showVideoMenu: boolean;
  setShowVideoMenu: React.Dispatch<React.SetStateAction<boolean>>;
  showReactionMenu: boolean;
  setShowReactionMenu: React.Dispatch<React.SetStateAction<boolean>>;
  activeSidebar: 'PARTICIPANTS' | 'CHAT' | 'SECURITY' | null;
  setActiveSidebar: React.Dispatch<React.SetStateAction<'PARTICIPANTS' | 'CHAT' | 'SECURITY' | null>>;
  participantsCount: number;
  chatCount: number;
  isScreenSharing: boolean;
  setIsScreenSharing: React.Dispatch<React.SetStateAction<boolean>>;
  viewMode: 'GALLERY' | 'SPEAKER' | 'WHITEBOARD';
  setViewMode: (mode: 'GALLERY' | 'SPEAKER' | 'WHITEBOARD') => void;
  isHandRaised: boolean;
  handleToggleHand: () => void;
  sendReaction: (emoji: string) => void;
  handleLeave: () => void | Promise<void>;
  // Device selector props
  audioInputDevices: AudioDevice[];
  audioOutputDevices: AudioDevice[];
  videoInputDevices: AudioDevice[];
  selectedAudioInput: string;
  selectedAudioOutput: string;
  selectedVideoInput: string;
  audioLevel: number;
  handleSelectMicrophone: (deviceId: string) => void;
  handleSelectSpeaker: (deviceId: string) => void;
  handleSelectCamera: (deviceId: string) => void;
  refreshDevices: () => void;
  playAudioTestChime: () => void;
  handleReconnectCamera: () => void;
}

export const MeetingToolbar: React.FC<MeetingToolbarProps> = ({
  isAudioMuted,
  isVideoDisabled,
  handleToggleAudio,
  handleToggleVideo,
  showAudioMenu,
  setShowAudioMenu,
  showVideoMenu,
  setShowVideoMenu,
  showReactionMenu,
  setShowReactionMenu,
  activeSidebar,
  setActiveSidebar,
  participantsCount,
  chatCount,
  isScreenSharing,
  setIsScreenSharing,
  viewMode,
  setViewMode,
  isHandRaised,
  handleToggleHand,
  sendReaction,
  handleLeave,
  audioInputDevices,
  audioOutputDevices,
  videoInputDevices,
  selectedAudioInput,
  selectedAudioOutput,
  selectedVideoInput,
  audioLevel,
  handleSelectMicrophone,
  handleSelectSpeaker,
  handleSelectCamera,
  refreshDevices,
  playAudioTestChime,
  handleReconnectCamera
}) => {
  return (
    <footer className="min-h-[4rem] bg-[#1a1a1a] border-t border-[#333333] px-2 sm:px-6 pt-1 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex items-center justify-between z-30 shrink-0 select-none overflow-visible relative touch-manipulation">
      {/* Click-away overlay when any popover is open */}
      {(showAudioMenu || showVideoMenu || showReactionMenu) && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={() => {
            setShowAudioMenu(false);
            setShowVideoMenu(false);
            setShowReactionMenu(false);
          }}
        />
      )}

      {/* Left: Audio & Video Controls with Zoom Chevrons */}
      <div className="flex items-center gap-0.5 sm:gap-2 shrink-0 z-50">
        {/* Mute / Unmute Mic */}
        <div className="flex items-center relative">
          <button
            type="button"
            onClick={handleToggleAudio}
            className="flex flex-col items-center justify-center w-11 sm:w-14 h-12 rounded-l-lg hover:bg-[#2b2b2b] text-slate-200 hover:text-white transition-colors cursor-pointer"
          >
            <div className="relative">
              <MicrophoneIcon className={`w-5 h-5 ${isAudioMuted ? 'text-rose-500' : 'text-[#2DA771]'}`} />
              {isAudioMuted && <span className="absolute inset-0 border-t-2 border-rose-500 rotate-45 top-2.5" />}
            </div>
            <span className="text-[9px] sm:text-[10px] font-medium mt-0.5">{isAudioMuted ? 'Unmute' : 'Mute'}</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowAudioMenu((v) => !v);
              setShowVideoMenu(false);
            }}
            className={`w-6 sm:w-6 h-12 flex items-center justify-center rounded-r-lg hover:bg-[#2b2b2b] text-slate-400 hover:text-white cursor-pointer active:scale-95 transition-all ${
              showAudioMenu ? 'bg-[#2b2b2b] text-emerald-400' : ''
            }`}
            title="Pengaturan Mikrofon & Speaker"
          >
            <ChevronUpIcon className={`w-3.5 h-3.5 transition-transform ${showAudioMenu ? 'rotate-180 text-emerald-400' : ''}`} />
          </button>

          {showAudioMenu && (
            <div className="relative z-50" onClick={(e) => e.stopPropagation()}>
              <MeetingAudioPopover
                audioInputDevices={audioInputDevices}
                audioOutputDevices={audioOutputDevices}
                selectedAudioInput={selectedAudioInput}
                selectedAudioOutput={selectedAudioOutput}
                audioLevel={audioLevel}
                handleSelectMicrophone={handleSelectMicrophone}
                handleSelectSpeaker={handleSelectSpeaker}
                refreshDevices={refreshDevices}
                playAudioTestChime={playAudioTestChime}
              />
            </div>
          )}
        </div>

        {/* Start / Stop Video */}
        <div className="flex items-center relative">
          <button
            type="button"
            onClick={handleToggleVideo}
            className="flex flex-col items-center justify-center w-11 sm:w-14 h-12 rounded-l-lg hover:bg-[#2b2b2b] text-slate-200 hover:text-white transition-colors cursor-pointer"
          >
            <div className="relative">
              <VideoCameraIcon className={`w-5 h-5 ${isVideoDisabled ? 'text-rose-500' : 'text-[#2DA771]'}`} />
              {isVideoDisabled && <span className="absolute inset-0 border-t-2 border-rose-500 rotate-45 top-2.5" />}
            </div>
            <span className="text-[9px] sm:text-[10px] font-medium mt-0.5">{isVideoDisabled ? 'Start' : 'Stop'}</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowVideoMenu((v) => !v);
              setShowAudioMenu(false);
            }}
            className={`w-6 sm:w-6 h-12 flex items-center justify-center rounded-r-lg hover:bg-[#2b2b2b] text-slate-400 hover:text-white cursor-pointer active:scale-95 transition-all ${
              showVideoMenu ? 'bg-[#2b2b2b] text-emerald-400' : ''
            }`}
            title="Pengaturan Kamera & Video"
          >
            <ChevronUpIcon className={`w-3.5 h-3.5 transition-transform ${showVideoMenu ? 'rotate-180 text-emerald-400' : ''}`} />
          </button>

          {showVideoMenu && (
            <div className="relative z-50" onClick={(e) => e.stopPropagation()}>
              <MeetingVideoPopover
                videoInputDevices={videoInputDevices}
                selectedVideoInput={selectedVideoInput}
                handleSelectCamera={handleSelectCamera}
                refreshDevices={refreshDevices}
                handleReconnectCamera={handleReconnectCamera}
              />
            </div>
          )}
        </div>
      </div>

      {/* Center: Main Action Hub */}
      <div className="flex items-center gap-0.5 sm:gap-2 shrink-0">
        {/* Security (Desktop only) */}
        <button
          type="button"
          onClick={() => setActiveSidebar((prev) => (prev === 'SECURITY' ? null : 'SECURITY'))}
          className={`hidden md:flex flex-col items-center justify-center w-14 sm:w-16 h-12 rounded-lg transition-colors cursor-pointer ${
            activeSidebar === 'SECURITY' ? 'bg-[#2b2b2b] text-white' : 'hover:bg-[#2b2b2b] text-slate-300'
          }`}
        >
          <ShieldCheckIcon className="w-5 h-5 text-[#2DA771]" />
          <span className="text-[10px] font-medium mt-0.5">Security</span>
        </button>

        {/* Participants */}
        <button
          type="button"
          onClick={() => setActiveSidebar((prev) => (prev === 'PARTICIPANTS' ? null : 'PARTICIPANTS'))}
          className={`flex flex-col items-center justify-center w-12 sm:w-16 h-12 rounded-lg transition-colors cursor-pointer relative ${
            activeSidebar === 'PARTICIPANTS' ? 'bg-[#2b2b2b] text-white' : 'hover:bg-[#2b2b2b] text-slate-300'
          }`}
        >
          <UsersIcon className="w-5 h-5" />
          <span className="text-[9px] sm:text-[10px] font-medium mt-0.5">Peserta</span>
          <span className="absolute top-1 right-1 sm:right-2 text-[9px] bg-slate-700 px-1 rounded-full font-bold">
            {participantsCount}
          </span>
        </button>

        {/* Chat */}
        <button
          type="button"
          onClick={() => setActiveSidebar((prev) => (prev === 'CHAT' ? null : 'CHAT'))}
          className={`flex flex-col items-center justify-center w-12 sm:w-16 h-12 rounded-lg transition-colors cursor-pointer relative ${
            activeSidebar === 'CHAT' ? 'bg-[#2b2b2b] text-white' : 'hover:bg-[#2b2b2b] text-slate-300'
          }`}
        >
          <ChatBubbleLeftRightIcon className="w-5 h-5" />
          <span className="text-[9px] sm:text-[10px] font-medium mt-0.5">Chat</span>
          {chatCount > 0 && (
            <span className="absolute top-1 right-1 sm:right-2 text-[9px] bg-[#0E71EB] text-white px-1.5 rounded-full font-bold">
              {chatCount}
            </span>
          )}
        </button>

        {/* Share Screen (Tablet & Desktop) */}
        <button
          type="button"
          onClick={() => setIsScreenSharing((v) => !v)}
          className="hidden sm:flex flex-col items-center justify-center w-16 sm:w-20 h-12 rounded-lg hover:bg-[#2b2b2b] text-[#2DA771] hover:text-[#38c98c] transition-colors cursor-pointer"
        >
          <ArrowUpTrayIcon className="w-5 h-5 stroke-[2.5]" />
          <span className="text-[10px] font-bold mt-0.5">
            {isScreenSharing ? 'Stop Share' : 'Share'}
          </span>
        </button>

        {/* Whiteboard (Tablet & Desktop) */}
        <button
          type="button"
          onClick={() => setViewMode(viewMode === 'WHITEBOARD' ? 'GALLERY' : 'WHITEBOARD')}
          className={`hidden lg:flex flex-col items-center justify-center w-14 sm:w-16 h-12 rounded-lg transition-colors cursor-pointer ${
            viewMode === 'WHITEBOARD' ? 'bg-[#2b2b2b] text-white' : 'hover:bg-[#2b2b2b] text-slate-300'
          }`}
        >
          <PencilSquareIcon className="w-5 h-5 text-amber-400" />
          <span className="text-[10px] font-medium mt-0.5">Papan Tulis</span>
        </button>

        {/* Raise Hand */}
        <button
          type="button"
          onClick={handleToggleHand}
          className={`flex flex-col items-center justify-center w-12 sm:w-16 h-12 rounded-lg transition-colors cursor-pointer ${
            isHandRaised ? 'bg-amber-500/20 text-amber-300' : 'hover:bg-[#2b2b2b] text-slate-300'
          }`}
        >
          <HandRaisedIcon className={`w-5 h-5 ${isHandRaised ? 'text-amber-400 fill-amber-400' : ''}`} />
          <span className="text-[9px] sm:text-[10px] font-medium mt-0.5">{isHandRaised ? 'Turun' : 'Angkat'}</span>
        </button>

        {/* Reactions Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowReactionMenu((v) => !v)}
            className="flex flex-col items-center justify-center w-12 sm:w-14 h-12 rounded-lg hover:bg-[#2b2b2b] text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <FaceSmileIcon className="w-5 h-5" />
            <span className="text-[9px] sm:text-[10px] font-medium mt-0.5">Emot</span>
          </button>

          {showReactionMenu && (
            <div className="absolute bottom-16 right-0 bg-[#222] border border-[#444] rounded-2xl p-2 shadow-2xl flex gap-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              {['👍', '❤️', '👏', '🎉', '😂', '😮'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => sendReaction(emoji)}
                  className="text-2xl p-1.5 hover:bg-[#333] rounded-xl hover:scale-125 transition-all cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: End / Leave Meeting */}
      <div className="flex items-center shrink-0 ml-1">
        <button
          type="button"
          onClick={handleLeave}
          className="px-2.5 sm:px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-[11px] sm:text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-rose-600/30 cursor-pointer"
        >
          <PhoneXMarkIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Keluar Rapat</span>
          <span className="sm:hidden">Keluar</span>
        </button>
      </div>
    </footer>
  );
};
