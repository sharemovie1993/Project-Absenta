import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export interface MeetingSecuritySidebarProps {
  onClose: () => void;
}

export const MeetingSecuritySidebar: React.FC<MeetingSecuritySidebarProps> = ({ onClose }) => {
  return (
    <aside className="w-full sm:w-80 absolute inset-0 sm:static sm:inset-auto bg-[#242424] border-l border-[#333] flex flex-col shrink-0 animate-in slide-in-from-right duration-150 z-40 sm:z-20 shadow-2xl">
      {/* Sidebar Header */}
      <div className="px-4 py-3 border-b border-[#333] flex items-center justify-between">
        <span className="text-xs font-bold text-white uppercase tracking-wider">
          Keamanan & Izin Rapat
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 cursor-pointer"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Security Options */}
      <div className="p-4 space-y-4 text-xs">
        <div className="space-y-2">
          <p className="font-bold text-slate-200">Izin Peserta:</p>
          <label className="flex items-center gap-2 cursor-pointer text-slate-300">
            <input type="checkbox" defaultChecked className="rounded accent-[#0E71EB]" />
            <span>Bagikan Layar (Share Screen)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-slate-300">
            <input type="checkbox" defaultChecked className="rounded accent-[#0E71EB]" />
            <span>Kirim Pesan Chat</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-slate-300">
            <input type="checkbox" defaultChecked className="rounded accent-[#0E71EB]" />
            <span>Aktifkan Suara Sendiri</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-slate-300">
            <input type="checkbox" defaultChecked className="rounded accent-[#0E71EB]" />
            <span>Mulai Video / Kamera</span>
          </label>
        </div>

        <div className="pt-3 border-t border-[#333] space-y-2">
          <p className="font-bold text-slate-200">Kontrol Ruang Rapat:</p>
          <label className="flex items-center gap-2 cursor-pointer text-slate-300">
            <input type="checkbox" className="rounded accent-[#0E71EB]" />
            <span>Kunci Ruang Rapat (Lock Meeting)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-slate-300">
            <input type="checkbox" defaultChecked className="rounded accent-[#0E71EB]" />
            <span>Aktifkan Ruang Tunggu (Waiting Room)</span>
          </label>
        </div>
      </div>
    </aside>
  );
};
