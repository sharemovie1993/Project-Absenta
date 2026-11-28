import React from 'react';
import { SlidersHorizontal, RotateCcw, X, Building2, UserCheck, Calendar } from 'lucide-react';
import { Button, DigitalSignatureField } from '@/components/ui';

export interface EditableSignerState {
  roleTitle: string;
  personName: string;
  nip: string;
  signatureImage?: string | null;
}

export interface CbtMatrixPengawasSignersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  titimangsaCity: string;
  setTitimangsaCity: (v: string) => void;
  titimangsaDate: string;
  setTitimangsaDate: (v: string) => void;
  panitiaSigner: EditableSignerState;
  setPanitiaSigner: React.Dispatch<React.SetStateAction<EditableSignerState>>;
  kepsekSigner: EditableSignerState;
  setKepsekSigner: React.Dispatch<React.SetStateAction<EditableSignerState>>;
  onResetStruktur: () => void;
}

export const CbtMatrixPengawasSignersDrawer: React.FC<CbtMatrixPengawasSignersDrawerProps> = React.memo(({
  isOpen,
  onClose,
  titimangsaCity,
  setTitimangsaCity,
  titimangsaDate,
  setTitimangsaDate,
  panitiaSigner,
  setPanitiaSigner,
  kepsekSigner,
  setKepsekSigner,
  onResetStruktur,
}) => {
  if (!isOpen) return null;

  return (
    <div className="w-full lg:w-[320px] max-h-[82vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xl space-y-4 shrink-0 print:hidden animate-in fade-in">
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800">
        <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
          <SlidersHorizontal size={14} className="text-indigo-600 dark:text-indigo-400" />
          Pengaturan Penandatangan &amp; Titimangsa
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md cursor-pointer transition-colors"
          title="Tutup Panel"
        >
          <X size={15} />
        </button>
      </div>

      {/* TITIMANGSA DOKUMEN */}
      <div className="space-y-2.5 text-xs">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          <Calendar size={12} />
          <span>Titimangsa Dokumen</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1 text-[11px]">
              Kota / Tempat
            </label>
            <input
              type="text"
              value={titimangsaCity}
              onChange={(e) => setTitimangsaCity(e.target.value)}
              placeholder="Purwakarta"
              className="w-full p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1 text-[11px]">
              Tanggal
            </label>
            <input
              type="text"
              value={titimangsaDate}
              onChange={(e) => setTitimangsaDate(e.target.value)}
              placeholder="30 November 2026"
              className="w-full p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* 1. KETUA PANITIA PELAKSANA CBT */}
      <div className="space-y-2 text-xs pt-2 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          <UserCheck size={12} />
          <span>Ketua Panitia Pelaksana CBT</span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2">
          <div>
            <label className="font-medium text-slate-500 dark:text-slate-400 block mb-0.5 text-[10.5px]">
              Label Jabatan
            </label>
            <input
              type="text"
              value={panitiaSigner.roleTitle}
              onChange={(e) => setPanitiaSigner((p) => ({ ...p, roleTitle: e.target.value }))}
              placeholder="Ketua Panitia Pelaksana CBT,"
              className="w-full p-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </div>
          <div>
            <label className="font-medium text-slate-500 dark:text-slate-400 block mb-0.5 text-[10.5px]">
              Nama Pejabat
            </label>
            <input
              type="text"
              value={panitiaSigner.personName}
              onChange={(e) => setPanitiaSigner((p) => ({ ...p, personName: e.target.value }))}
              placeholder="Nama Ketua Panitia / Waka Kurikulum"
              className="w-full p-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
            />
          </div>
          <div>
            <label className="font-medium text-slate-500 dark:text-slate-400 block mb-0.5 text-[10.5px]">
              NIP (opsional)
            </label>
            <input
              type="text"
              value={panitiaSigner.nip}
              onChange={(e) => setPanitiaSigner((p) => ({ ...p, nip: e.target.value }))}
              placeholder="NIP. 19..."
              className="w-full p-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </div>
          <DigitalSignatureField
            label="TTD Digital Ketua Panitia"
            penName={panitiaSigner.personName}
            value={panitiaSigner.signatureImage}
            onChange={(sig) => setPanitiaSigner((p) => ({ ...p, signatureImage: sig }))}
          />
        </div>
      </div>

      {/* 2. KEPALA SEKOLAH */}
      <div className="space-y-2 text-xs pt-2 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          <Building2 size={12} />
          <span>Pengesah (Kepala Sekolah)</span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2">
          <div>
            <label className="font-medium text-slate-500 dark:text-slate-400 block mb-0.5 text-[10.5px]">
              Label Pengesahan
            </label>
            <input
              type="text"
              value={kepsekSigner.roleTitle}
              onChange={(e) => setKepsekSigner((p) => ({ ...p, roleTitle: e.target.value }))}
              placeholder="Mengetahui,\nKepala Sekolah"
              className="w-full p-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </div>
          <div>
            <label className="font-medium text-slate-500 dark:text-slate-400 block mb-0.5 text-[10.5px]">
              Nama Kepala Sekolah
            </label>
            <input
              type="text"
              value={kepsekSigner.personName}
              onChange={(e) => setKepsekSigner((p) => ({ ...p, personName: e.target.value }))}
              placeholder="Nama Kepala Sekolah"
              className="w-full p-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
            />
          </div>
          <div>
            <label className="font-medium text-slate-500 dark:text-slate-400 block mb-0.5 text-[10.5px]">
              NIP Kepala Sekolah
            </label>
            <input
              type="text"
              value={kepsekSigner.nip}
              onChange={(e) => setKepsekSigner((p) => ({ ...p, nip: e.target.value }))}
              placeholder="NIP. 19..."
              className="w-full p-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </div>
          <DigitalSignatureField
            label="TTD Digital Kepala Sekolah"
            penName={kepsekSigner.personName}
            value={kepsekSigner.signatureImage}
            onChange={(sig) => setKepsekSigner((p) => ({ ...p, signatureImage: sig }))}
          />
        </div>
      </div>

      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onResetStruktur}
        className="w-full text-xs font-bold rounded-xl gap-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
      >
        <RotateCcw size={13} />
        Reset Struktur Otomatis
      </Button>
    </div>
  );
});

CbtMatrixPengawasSignersDrawer.displayName = 'CbtMatrixPengawasSignersDrawer';
