import React from 'react';
import { X, Award, Search } from 'lucide-react';
import { Button } from '../ui/Button';
import type { NonMemberCandidate } from '../../../pages/cooperative/POS';

interface QuickRegisterModalProps {
  showQuickRegisterModal: boolean;
  setShowQuickRegisterModal: (show: boolean) => void;
  registerType: 'STUDENT' | 'TEACHER';
  setRegisterType: (type: 'STUDENT' | 'TEACHER') => void;
  setSelectedNonMember: (member: NonMemberCandidate | null) => void;
  setNonMembers: (members: NonMemberCandidate[]) => void;
  setNonMemberSearch: (search: string) => void;
  nonMemberSearch: string;
  loadingNonMembers: boolean;
  nonMembers: NonMemberCandidate[];
  selectedNonMember: NonMemberCandidate | null;
  nextMemberNumber: string;
  registerPin: string;
  setRegisterPin: (pin: string) => void;
  fetchNextMemberNumber: () => void;
  handleRegisterSubmit: () => void;
  registering: boolean;
}

export const QuickRegisterModal = React.memo<QuickRegisterModalProps>(({
  showQuickRegisterModal,
  setShowQuickRegisterModal,
  registerType,
  setRegisterType,
  setSelectedNonMember,
  setNonMembers,
  setNonMemberSearch,
  nonMemberSearch,
  loadingNonMembers,
  nonMembers,
  selectedNonMember,
  nextMemberNumber,
  registerPin,
  setRegisterPin,
  fetchNextMemberNumber,
  handleRegisterSubmit,
  registering,
}) => {
  if (!showQuickRegisterModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-4 shrink-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Award className="text-blue-500 animate-bounce" size={20} /> Daftar Anggota Cepat
          </h3>
          <button
            onClick={() => setShowQuickRegisterModal(false)}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-505"
            aria-label="Tutup"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* Tipe Anggota Toggle */}
          <div>
            <span className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Tipe Anggota</span>
            <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setRegisterType('STUDENT');
                  setSelectedNonMember(null);
                  setNonMembers([]);
                  setNonMemberSearch('');
                }}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  registerType === 'STUDENT'
                    ? 'bg-white dark:bg-slate-900 shadow text-blue-600 font-bold border border-slate-105 dark:border-slate-800'
                    : 'text-slate-505'
                }`}
              >
                Siswa
              </button>
              <button
                type="button"
                onClick={() => {
                  setRegisterType('TEACHER');
                  setSelectedNonMember(null);
                  setNonMembers([]);
                  setNonMemberSearch('');
                }}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  registerType === 'TEACHER'
                    ? 'bg-white dark:bg-slate-900 shadow text-blue-600 font-bold border border-slate-105 dark:border-slate-800'
                    : 'text-slate-505'
                }`}
              >
                Guru / Staf
              </button>
            </div>
          </div>

          {/* Cari Non Anggota */}
          <div className="space-y-2 relative">
            <label htmlFor="searchCandidate" className="block text-xs font-black text-slate-400 uppercase tracking-wider">Cari Calon Anggota</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-455" size={16} />
              <input
                id="searchCandidate"
                type="text"
                placeholder={registerType === 'STUDENT' ? 'Ketik nama siswa...' : 'Ketik nama guru/staf...'}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-805 dark:text-slate-105"
                value={nonMemberSearch}
                onChange={(e) => {
                  setNonMemberSearch(e.target.value);
                }}
                aria-label="Cari Calon Anggota"
              />
            </div>
            {loadingNonMembers && (
              <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg p-3 text-center text-xs text-slate-500 z-[60]">
                Mencari...
              </div>
            )}
            {!loadingNonMembers && (nonMembers || []).length > 0 && (
              <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg max-h-48 overflow-y-auto z-[60] divide-y divide-slate-100 dark:divide-slate-800">
                {nonMembers?.map((nm) => (
                  <div
                    key={nm.id}
                    onClick={() => {
                      setSelectedNonMember(nm);
                      setNonMembers([]);
                      setNonMemberSearch(nm.name);
                      fetchNextMemberNumber();
                    }}
                    className="p-2.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer text-slate-750 dark:text-slate-200 transition-colors"
                  >
                    <div className="font-semibold">{nm.name}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      No. Identitas: {nm.identityNo} | {nm.className || '-'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedNonMember && (
            <div className="p-3 bg-blue-50/50 dark:bg-slate-950/20 border border-blue-105 dark:border-slate-800/85 rounded-xl space-y-2 text-xs text-slate-800 dark:text-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-400">Nama terpilih:</span>
                <span className="font-semibold text-blue-900 dark:text-blue-300">{selectedNonMember.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">No. Identitas:</span>
                <span className="text-slate-700 dark:text-slate-400">{selectedNonMember.identityNo}</span>
              </div>
              {selectedNonMember.className && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Kelas / Unit:</span>
                  <span className="text-slate-700 dark:text-slate-400">{selectedNonMember.className}</span>
                </div>
              )}
            </div>
          )}

          {/* Nomor Anggota (Auto-generated) */}
          <div>
            <label htmlFor="nextMemberNumberInput" className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Nomor Anggota Koperasi</label>
            <input
              id="nextMemberNumberInput"
              type="text"
              readOnly
              placeholder="Akan dibuat otomatis..."
              className="w-full px-3 py-2 border border-slate-202 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-500 cursor-not-allowed font-mono text-sm font-bold"
              value={nextMemberNumber}
            />
          </div>

          {/* PIN Transaksi */}
          <div>
            <label htmlFor="registerPinInput" className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1">PIN Transaksi (6 Digit)</label>
            <input
              id="registerPinInput"
              type="password"
              maxLength={6}
              placeholder="PIN Default 123456"
              className="w-full px-3 py-2 border border-slate-350 dark:border-slate-750 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-805 dark:text-slate-105 text-center font-bold text-lg tracking-[0.4em]"
              value={registerPin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                if (val.length <= 6) setRegisterPin(val);
              }}
              aria-label="PIN Transaksi Pendaftaran"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5 shrink-0">
          <Button className="w-1/2" variant="secondary" onClick={() => setShowQuickRegisterModal(false)} disabled={registering}>
            Batal
          </Button>
          <Button
            className="w-1/2 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleRegisterSubmit}
            isLoading={registering}
            disabled={!selectedNonMember || !nextMemberNumber || registerPin.length !== 6 || registering}
          >
            Daftarkan
          </Button>
        </div>
      </div>
    </div>
  );
});

QuickRegisterModal.displayName = 'QuickRegisterModal';
