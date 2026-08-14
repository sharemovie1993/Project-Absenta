import React, { useEffect } from 'react';
import { CheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import type { AudioDevice } from './types';

export interface MeetingVideoPopoverProps {
  videoInputDevices: AudioDevice[];
  selectedVideoInput: string;
  handleSelectCamera: (deviceId: string) => void;
  refreshDevices: () => void;
  handleReconnectCamera: () => void;
}

export const MeetingVideoPopover: React.FC<MeetingVideoPopoverProps> = ({
  videoInputDevices,
  selectedVideoInput,
  handleSelectCamera,
  refreshDevices,
  handleReconnectCamera
}) => {
  // Auto-refresh camera list when popover opens
  useEffect(() => { refreshDevices(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="absolute bottom-16 left-0 w-72 max-w-[calc(100vw-2rem)] bg-[#222222] border border-slate-700 rounded-xl shadow-2xl p-2.5 text-xs text-slate-200 z-[100] animate-in fade-in slide-in-from-bottom-2 duration-150">
      <div className="pb-2 border-b border-slate-700 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
        <span>PILIH KAMERA (WEBCAM)</span>
        <button
          type="button"
          onClick={refreshDevices}
          className="hover:text-white p-0.5 text-slate-400"
          title="Muat Ulang Perangkat"
        >
          <ArrowPathIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="py-2 space-y-0.5 max-h-36 overflow-y-auto">
        {videoInputDevices.length > 0 ? (
          videoInputDevices.map((dev, idx) => {
            const isSelected = selectedVideoInput === dev.deviceId;
            return (
              <button
                key={dev.deviceId || idx}
                type="button"
                onClick={() => handleSelectCamera(dev.deviceId)}
                className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between hover:bg-[#333333] transition-colors cursor-pointer ${
                  isSelected ? 'text-emerald-400 font-bold bg-[#2a2a2a]' : ''
                }`}
              >
                <span className="truncate max-w-[200px]">{dev.label || `Kamera ${idx + 1}`}</span>
                {isSelected && <CheckIcon className="w-3.5 h-3.5 shrink-0" />}
              </button>
            );
          })
        ) : (
          <div className="px-2 py-1 text-[11px] text-slate-400 italic">
            Tidak ada perangkat webcam terdeteksi.
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-slate-700">
        <button
          type="button"
          onClick={handleReconnectCamera}
          className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-[#333333] text-slate-300 transition-colors cursor-pointer"
        >
          🔄 Sambungkan Ulang Kamera
        </button>
      </div>
    </div>
  );
};
