import React, { useEffect } from 'react';
import { CheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import type { AudioDevice } from './types';

export interface MeetingAudioPopoverProps {
  audioInputDevices: AudioDevice[];
  audioOutputDevices: AudioDevice[];
  selectedAudioInput: string;
  selectedAudioOutput: string;
  audioLevel: number;
  handleSelectMicrophone: (deviceId: string) => void;
  handleSelectSpeaker: (deviceId: string) => void;
  refreshDevices: () => void;
  playAudioTestChime: () => void;
}

export const MeetingAudioPopover: React.FC<MeetingAudioPopoverProps> = ({
  audioInputDevices,
  audioOutputDevices,
  selectedAudioInput,
  selectedAudioOutput,
  audioLevel,
  handleSelectMicrophone,
  handleSelectSpeaker,
  refreshDevices,
  playAudioTestChime
}) => {
  // Auto-refresh device list when popover first opens
  useEffect(() => { refreshDevices(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="absolute bottom-16 left-0 w-80 max-w-[calc(100vw-2rem)] bg-[#222222] border border-slate-700 rounded-xl shadow-2xl p-2.5 text-xs text-slate-200 z-[100] animate-in fade-in slide-in-from-bottom-2 duration-150">
      {/* Section 1: Microphone Selection */}
      <div className="pb-2 border-b border-slate-700 space-y-1">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
          <span>PILIH MIKROFON (INPUT)</span>
          <button
            type="button"
            onClick={refreshDevices}
            className="hover:text-white p-0.5 text-slate-400"
            title="Muat Ulang Perangkat"
          >
            <ArrowPathIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-0.5 max-h-36 overflow-y-auto">
          {audioInputDevices.map((dev, idx) => {
            const isSelected =
              selectedAudioInput === dev.deviceId ||
              (selectedAudioInput === 'default' && dev.deviceId === 'default') ||
              (selectedAudioInput === '' && idx === 0);
            return (
              <button
                key={dev.deviceId || idx}
                type="button"
                onClick={() => handleSelectMicrophone(dev.deviceId)}
                className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between hover:bg-[#333333] transition-colors cursor-pointer ${
                  isSelected ? 'text-emerald-400 font-bold bg-[#2a2a2a]' : ''
                }`}
              >
                <span className="truncate max-w-[210px]">{dev.label || `Mikrofon ${idx + 1}`}</span>
                {isSelected && <CheckIcon className="w-3.5 h-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 2: Speaker Selection */}
      <div className="py-2 space-y-1">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
          PILIH SPEAKER (OUTPUT)
        </div>
        <div className="space-y-0.5 max-h-32 overflow-y-auto">
          {audioOutputDevices.length > 0 ? (
            audioOutputDevices.map((dev, idx) => {
              const isSelected =
                selectedAudioOutput === dev.deviceId ||
                (selectedAudioOutput === 'default' && dev.deviceId === 'default') ||
                (selectedAudioOutput === '' && idx === 0);
              return (
                <button
                  key={dev.deviceId || idx}
                  type="button"
                  onClick={() => handleSelectSpeaker(dev.deviceId)}
                  className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between hover:bg-[#333333] transition-colors cursor-pointer ${
                    isSelected ? 'text-emerald-400 font-bold bg-[#2a2a2a]' : ''
                  }`}
                >
                  <span className="truncate max-w-[210px]">{dev.label || `Speaker Sistem ${idx + 1}`}</span>
                  {isSelected && <CheckIcon className="w-3.5 h-3.5 shrink-0 text-emerald-400" />}
                </button>
              );
            })
          ) : (
            <button
              type="button"
              onClick={() => handleSelectSpeaker('default')}
              className="w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between hover:bg-[#333333] text-emerald-400 font-bold bg-[#2a2a2a] cursor-pointer"
            >
              <span className="truncate max-w-[210px]">🔊 Speaker Utama (Default Sistem)</span>
              <CheckIcon className="w-3.5 h-3.5 shrink-0" />
            </button>
          )}
        </div>
      </div>

      {/* Section 3: Live Mic Level & Audio Test */}
      <div className="pt-2 border-t border-slate-700 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Level Suara Mikrofon:</span>
          <div className="w-32 h-2 bg-[#1a1a1a] rounded-full overflow-hidden border border-slate-700">
            <div
              style={{ width: `${Math.min(100, audioLevel)}%` }}
              className="h-full bg-emerald-500 transition-all duration-75"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={playAudioTestChime}
          className="w-full py-1.5 bg-[#2d2d2d] hover:bg-[#383838] text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <span>🔊 Uji Speaker & Mikrofon</span>
        </button>
      </div>
    </div>
  );
};
