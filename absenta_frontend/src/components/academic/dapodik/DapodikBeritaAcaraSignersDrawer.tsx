import React from 'react';
import { SlidersHorizontal, RotateCcw, X, Calendar, Building2, UserCheck } from 'lucide-react';
import { Button, DigitalSignatureField } from '@/components/ui';

export interface DapodikEditableSignerState {
  roleTitle: string;
  personName: string;
  nip: string;
  signatureImage: string | null;
}

export interface DapodikBeritaAcaraSignersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  templateMode: 'lppd_usia' | 'rekon_absenta';
  documentNumber: string;
  setDocumentNumber: (v: string) => void;
  referenceDate: string;
  setReferenceDate: (v: string) => void;
  cabangDinasWilayah: string;
  setCabangDinasWilayah: (v: string) => void;
  kabupatenKota: string;
  setKabupatenKota: (v: string) => void;
  titimangsaCity: string;
  setTitimangsaCity: (v: string) => void;
  titimangsaDate: string;
  setTitimangsaDate: (v: string) => void;
  showGenderAndGradeBreakdown: boolean;
  setShowGenderAndGradeBreakdown: (v: boolean) => void;
  includeKepsekTier: boolean;
  setIncludeKepsekTier: (v: boolean) => void;
  operatorSigner: DapodikEditableSignerState;
  setOperatorSigner: React.Dispatch<React.SetStateAction<DapodikEditableSignerState>>;
  verifikatorSigner: DapodikEditableSignerState;
  setVerifikatorSigner: React.Dispatch<React.SetStateAction<DapodikEditableSignerState>>;
  kepsekSigner: DapodikEditableSignerState;
  setKepsekSigner: React.Dispatch<React.SetStateAction<DapodikEditableSignerState>>;
  onResetStruktur: () => void;
}

export const DapodikBeritaAcaraSignersDrawer: React.FC<DapodikBeritaAcaraSignersDrawerProps> = React.memo(({
  isOpen,
  onClose,
  templateMode,
  documentNumber,
  setDocumentNumber,
  referenceDate,
  setReferenceDate,
  cabangDinasWilayah,
  setCabangDinasWilayah,
  kabupatenKota,
  setKabupatenKota,
  titimangsaCity,
  setTitimangsaCity,
  titimangsaDate,
  setTitimangsaDate,
  showGenderAndGradeBreakdown,
  setShowGenderAndGradeBreakdown,
  includeKepsekTier,
  setIncludeKepsekTier,
  operatorSigner,
  setOperatorSigner,
  verifikatorSigner,
  setVerifikatorSigner,
  kepsekSigner,
  setKepsekSigner,
  onResetStruktur,
}) => {
  if (!isOpen) return null;

  return (
    <div className="w-full lg:w-[340px] max-h-[82vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xl space-y-4 shrink-0 print:hidden">
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800">
        <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
          <SlidersHorizontal size={14} className="text-indigo-600" />
          Pengaturan Dokumen &amp; TTD Universal
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
          title="Tutup Panel"
        >
          <X size={15} />
        </button>
      </div>

      {/* PARAMETER VERVAL & DOKUMEN */}
      <div className="space-y-2.5 text-xs">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          <Building2 size={12} />
          <span>Data Naskah &amp; Titimangsa</span>
        </div>

        <div>
          <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-0.5">Nomor Dokumen</label>
          <input
            type="text"
            value={documentNumber}
            onChange={(e) => setDocumentNumber(e.target.value)}
            className="w-full p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
          />
        </div>

        {templateMode === 'lppd_usia' && (
          <>
            <div>
              <label className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1 mb-0.5">
                <Calendar size={11} /> Tanggal Cut-Off Perhitungan Usia
              </label>
              <input
                type="date"
                value={referenceDate}
                onChange={(e) => setReferenceDate(e.target.value)}
                className="w-full p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-0.5">Cabang Dinas</label>
                <input
                  type="text"
                  value={cabangDinasWilayah}
                  onChange={(e) => setCabangDinasWilayah(e.target.value)}
                  placeholder="Wilayah IV"
                  className="w-full p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-0.5">Kabupaten / Kota</label>
                <input
                  type="text"
                  value={kabupatenKota}
                  onChange={(e) => setKabupatenKota(e.target.value)}
                  placeholder="Purwakarta"
                  className="w-full p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showGenderAndGradeBreakdown}
                onChange={(e) => setShowGenderAndGradeBreakdown(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600"
              />
              <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                Tampilkan Rincian L/P &amp; Sebaran Per Tingkat
              </span>
            </label>
          </>
        )}

        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-0.5">Kota Titimangsa</label>
            <input
              type="text"
              value={titimangsaCity}
              onChange={(e) => setTitimangsaCity(e.target.value)}
              className="w-full p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-0.5">Tanggal Titimangsa</label>
            <input
              type="text"
              value={titimangsaDate}
              onChange={(e) => setTitimangsaDate(e.target.value)}
              className="w-full p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
          </div>
        </div>
      </div>

      {/* PENANDATANGAN & UNIVERSAL DIGITAL SIGNATURE */}
      <div className="space-y-3 text-xs pt-2 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            <UserCheck size={12} />
            Penandatangan &amp; TTD Digital
          </span>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeKepsekTier}
              onChange={(e) => setIncludeKepsekTier(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600"
            />
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">2-Tier Kepsek</span>
          </label>
        </div>

        {/* 1. Operator Dapodik */}
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2">
          <div className="font-bold text-[11px] text-slate-800 dark:text-slate-200">
            1. Operator Dapodik (Yang Menyerahkan Data)
          </div>
          <input
            type="text"
            value={operatorSigner.personName}
            onChange={(e) => setOperatorSigner((p) => ({ ...p, personName: e.target.value }))}
            placeholder="Nama Operator Dapodik"
            className="w-full p-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          />
          <input
            type="text"
            value={operatorSigner.nip}
            onChange={(e) => setOperatorSigner((p) => ({ ...p, nip: e.target.value }))}
            placeholder="NIP / NUPTK (opsional)"
            className="w-full p-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          />
          <DigitalSignatureField
            label="TTD Digital Operator Dapodik"
            penName={operatorSigner.personName}
            value={operatorSigner.signatureImage}
            onChange={(sig) => setOperatorSigner((p) => ({ ...p, signatureImage: sig }))}
          />
        </div>

        {/* 2. Verifikator Data */}
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2">
          <div className="font-bold text-[11px] text-slate-800 dark:text-slate-200">
            2. Verifikator Data (KCD / Pengawas / TU)
          </div>
          <input
            type="text"
            value={verifikatorSigner.roleTitle}
            onChange={(e) => setVerifikatorSigner((p) => ({ ...p, roleTitle: e.target.value }))}
            placeholder="Jabatan Verifikator"
            className="w-full p-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          />
          <input
            type="text"
            value={verifikatorSigner.personName}
            onChange={(e) => setVerifikatorSigner((p) => ({ ...p, personName: e.target.value }))}
            placeholder="Nama Verifikator (kosongkan jika TTD basah di KCD)"
            className="w-full p-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          />
          <input
            type="text"
            value={verifikatorSigner.nip}
            onChange={(e) => setVerifikatorSigner((p) => ({ ...p, nip: e.target.value }))}
            placeholder="NIP (opsional)"
            className="w-full p-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          />
          <DigitalSignatureField
            label="TTD Digital Verifikator"
            penName={verifikatorSigner.personName}
            value={verifikatorSigner.signatureImage}
            onChange={(sig) => setVerifikatorSigner((p) => ({ ...p, signatureImage: sig }))}
          />
        </div>

        {/* 3. Kepala Sekolah (Opsional 2-Tier) */}
        {includeKepsekTier && (
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2">
            <div className="font-bold text-[11px] text-slate-800 dark:text-slate-200">
              3. Pengesah 2-Tier (Kepala Sekolah)
            </div>
            <input
              type="text"
              value={kepsekSigner.personName}
              onChange={(e) => setKepsekSigner((p) => ({ ...p, personName: e.target.value }))}
              placeholder="Nama Kepala Sekolah"
              className="w-full p-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
            <input
              type="text"
              value={kepsekSigner.nip}
              onChange={(e) => setKepsekSigner((p) => ({ ...p, nip: e.target.value }))}
              placeholder="NIP Kepala Sekolah"
              className="w-full p-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
            <DigitalSignatureField
              label="TTD Digital Kepala Sekolah"
              penName={kepsekSigner.personName}
              value={kepsekSigner.signatureImage}
              onChange={(sig) => setKepsekSigner((p) => ({ ...p, signatureImage: sig }))}
            />
          </div>
        )}

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onResetStruktur}
          className="w-full text-xs font-bold rounded-xl gap-1.5 text-slate-600 dark:text-slate-300"
        >
          <RotateCcw size={13} />
          Reset Struktur Otomatis
        </Button>
      </div>
    </div>
  );
});

DapodikBeritaAcaraSignersDrawer.displayName = 'DapodikBeritaAcaraSignersDrawer';
