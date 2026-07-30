import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal, Button, Badge } from '../../ui';
import { 
  QrCode, 
  CreditCard, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  User, 
  GraduationCap, 
  Sparkles, 
  ArrowRight,
  Zap,
  RefreshCw
} from 'lucide-react';
import { getSiswaList, updateSiswa } from '../../../api/academic/siswa.api';
import { getGuruList, updateGuru } from '../../../api/academic/guru.api';
import type { Siswa, Guru } from '../../../types/academic';
import toast from 'react-hot-toast';

interface ExpressRfidPairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultMode?: 'SISWA' | 'GURU';
}

type Mode = 'SISWA' | 'GURU';

// Synthesize high-frequency audio beep using Web Audio API (Zero external assets needed)
const playBeep = (type: 'success' | 'error') => {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12); // E6 note
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime); // A3 note
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch {
    // Audio Context not allowed or muted
  }
};

export const ExpressRfidPairingModal: React.FC<ExpressRfidPairingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultMode
}) => {
  const [mode, setMode] = useState<Mode>(defaultMode || 'SISWA');
  const [searchQuery, setSearchQuery] = useState('');
  const [targetPerson, setTargetPerson] = useState<Siswa | Guru | null>(null);
  const [rfidInput, setRfidInput] = useState('');
  const [step, setStep] = useState<'SCAN_TARGET' | 'TAP_RFID'>('SCAN_TARGET');
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastPairedInfo, setLastPairedInfo] = useState<{ name: string; identifier: string; rfid: string } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const rfidInputRef = useRef<HTMLInputElement>(null);

  // Auto focus input based on current step
  useEffect(() => {
    if (!isOpen) return;
    if (step === 'SCAN_TARGET') {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else if (step === 'TAP_RFID') {
      setTimeout(() => rfidInputRef.current?.focus(), 100);
    }
  }, [isOpen, step, mode]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (defaultMode) {
        setMode(defaultMode);
      }
      setStep('SCAN_TARGET');
      setSearchQuery('');
      setTargetPerson(null);
      setRfidInput('');
      setLastPairedInfo(null);
    }
  }, [isOpen, defaultMode]);

  // Handle Target Search (Scan QR / Manual Type)
  const handleSearchTarget = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setIsSearching(true);
    try {
      if (mode === 'SISWA') {
        const res = await getSiswaList(1, 10, trimmed);
        if (res.success && res.data.length > 0) {
          // Exact match priority by NISN or NIS
          const exact = res.data.find(s => s.nisn === trimmed || s.nis === trimmed) || res.data[0];
          setTargetPerson(exact);
          setStep('TAP_RFID');
          setRfidInput('');
          playBeep('success');
        } else {
          toast.error(`Siswa dengan NISN/NIS/Nama "${trimmed}" tidak ditemukan.`);
          playBeep('error');
        }
      } else {
        const res = await getGuruList(1, 10, trimmed);
        if (res.success && res.data.length > 0) {
          const exact = res.data.find(g => g.nip === trimmed) || res.data[0];
          setTargetPerson(exact);
          setStep('TAP_RFID');
          setRfidInput('');
          playBeep('success');
        } else {
          toast.error(`Guru dengan NIP/Nama "${trimmed}" tidak ditemukan.`);
          playBeep('error');
        }
      }
    } catch {
      toast.error('Gagal mencari data target.');
      playBeep('error');
    } finally {
      setIsSearching(false);
    }
  }, [mode]);

  // Target Keydown (Scanner sends Enter after reading QR Code)
  const handleTargetKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchTarget(searchQuery);
    }
  };

  // Handle Pairing RFID Card
  const handleExecutePairing = async (rfidTag: string) => {
    const cleanRfid = rfidTag.trim();
    if (!cleanRfid || !targetPerson) return;
    setIsSaving(true);
    try {
      if (mode === 'SISWA') {
        const res = await updateSiswa(targetPerson.id, { no_rfid: cleanRfid, rfid_tag: cleanRfid } as any);
        if (res.success) {
          const personName = (targetPerson as Siswa).nama_siswa;
          const identifier = (targetPerson as Siswa).nisn || (targetPerson as Siswa).nis || '-';
          setLastPairedInfo({ name: personName, identifier, rfid: cleanRfid });
          toast.success(`🎉 RFID [${cleanRfid}] berhasil dipairing ke ${personName}!`);
          playBeep('success');
          onSuccess?.();
          
          // Continuous Loop Reset: Reset to Step 1 for next card
          setStep('SCAN_TARGET');
          setSearchQuery('');
          setTargetPerson(null);
          setRfidInput('');
        } else {
          toast.error(res.message || 'Gagal menyimpan RFID.');
          playBeep('error');
        }
      } else {
        const res = await updateGuru(targetPerson.id, { no_rfid: cleanRfid, rfid_tag: cleanRfid } as any);
        if (res.success) {
          const personName = (targetPerson as Guru).nama_guru;
          const identifier = (targetPerson as Guru).nip || '-';
          setLastPairedInfo({ name: personName, identifier, rfid: cleanRfid });
          toast.success(`🎉 RFID [${cleanRfid}] berhasil dipairing ke Guru ${personName}!`);
          playBeep('success');
          onSuccess?.();
          
          // Continuous Loop Reset
          setStep('SCAN_TARGET');
          setSearchQuery('');
          setTargetPerson(null);
          setRfidInput('');
        } else {
          toast.error(res.message || 'Gagal menyimpan RFID.');
          playBeep('error');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat pairing RFID.';
      toast.error(msg);
      playBeep('error');
    } finally {
      setIsSaving(false);
    }
  };

  // RFID Keydown (RFID Reader sends Enter after card tap)
  const handleRfidKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleExecutePairing(rfidInput);
    }
  };

  const handleResetCurrentStep = () => {
    setStep('SCAN_TARGET');
    setSearchQuery('');
    setTargetPerson(null);
    setRfidInput('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'GURU' ? "Fast-Track Express RFID Pairing Pegawai / Guru" : "Fast-Track Express RFID Pairing Siswa"}
      size="3xl"
    >
      <div className="p-6 space-y-6">
        {/* Top Header Mode Switch */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
              <Zap size={18} className="animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                {mode === 'GURU' ? 'Mode Penempelan Kartu RFID Pegawai / Guru Massal' : 'Mode Penempelan Kartu RFID Siswa Massal'}
              </h4>
              <p className="text-[10px] text-slate-400 font-bold">
                Cukup tembak QR Kartu Cetak -&gt; Tap Mesin RFID -&gt; Auto-Save Loop
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-black uppercase tracking-wider shadow-xs">
            {mode === 'GURU' ? (
              <>
                <User size={14} className="text-indigo-600 dark:text-indigo-400" />
                <span>Target: Guru & Staf</span>
              </>
            ) : (
              <>
                <GraduationCap size={14} className="text-indigo-600 dark:text-indigo-400" />
                <span>Target: Siswa</span>
              </>
            )}
          </div>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`p-3.5 rounded-2xl border transition-all flex items-center gap-3 ${
            step === 'SCAN_TARGET' 
              ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 ring-2 ring-indigo-500/20'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-60'
          }`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
              step === 'SCAN_TARGET' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
            }`}>
              1
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Langkah Pertama</p>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                <QrCode size={13} className="text-indigo-500" /> Tembak QR / Cari {mode === 'SISWA' ? 'Siswa' : 'Guru'}
              </p>
            </div>
          </div>

          <div className={`p-3.5 rounded-2xl border transition-all flex items-center gap-3 ${
            step === 'TAP_RFID' 
              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-60'
          }`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
              step === 'TAP_RFID' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
            }`}>
              2
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Langkah Kedua</p>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                <CreditCard size={13} className="text-emerald-500" /> Tap Kartu RFID di Mesin
              </p>
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="space-y-4 bg-slate-50/50 dark:bg-slate-950/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
          {step === 'SCAN_TARGET' ? (
            <div className="space-y-2">
              <label htmlFor="express-search-input" className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Langkah 1: Tembak QR Code atau Ketik {mode === 'SISWA' ? 'NISN / NIS / Nama' : 'NIP / Nama'}
              </label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  id="express-search-input"
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleTargetKeyDown}
                  placeholder={mode === 'SISWA' ? "Arahkan scanner ke QR NISN / NIS siswa atau ketik nama..." : "Arahkan scanner ke QR NIP guru atau ketik nama..."}
                  disabled={isSearching}
                  className="w-full h-12 pl-10 pr-24 text-sm font-semibold rounded-xl border border-indigo-300 dark:border-indigo-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleSearchTarget(searchQuery)}
                  disabled={isSearching || !searchQuery.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 text-xs font-bold rounded-lg"
                >
                  {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Cari (Enter)'}
                </Button>
              </div>
              <p className="text-[10px] text-slate-400 italic font-semibold">
                * Scanner Barcode USB akan mengirimkan sinyal `Enter` secara otomatis setelah menembak QR.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Target Person Preview Card */}
              {targetPerson && (
                <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-indigo-200 dark:border-indigo-900/60 shadow-xs flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-sm">
                      {mode === 'SISWA' ? <GraduationCap size={20} /> : <User size={20} />}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 leading-tight">
                        {mode === 'SISWA' ? (targetPerson as Siswa).nama_siswa : (targetPerson as Guru).nama_guru}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {mode === 'SISWA' 
                          ? `NISN: ${(targetPerson as Siswa).nisn || '-'} • Kelas: ${(targetPerson as Siswa).Kelas?.nama_kelas || '-'}`
                          : `NIP: ${(targetPerson as Guru).nip || '-'} • ${(targetPerson as Guru).status_kepegawaian || 'Guru'}`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={targetPerson.no_rfid ? 'warning' : 'secondary'} className="text-[10px]">
                      {targetPerson.no_rfid ? `RFID Lama: ${targetPerson.no_rfid}` : 'Belum Ada RFID'}
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleResetCurrentStep}
                      className="text-xs h-7 px-2 text-slate-400 hover:text-slate-600"
                    >
                      Ganti Personel
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <label htmlFor="express-rfid-input" className="block text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CreditCard size={14} /> Langkah 2: Tempelkan (Tap) Kartu RFID ke Mesin Reader Now!
                </label>
                <div className="relative">
                  <input
                    id="express-rfid-input"
                    ref={rfidInputRef}
                    type="text"
                    value={rfidInput}
                    onChange={(e) => setRfidInput(e.target.value)}
                    onKeyDown={handleRfidKeyDown}
                    placeholder="Menunggu sinyal mesin RFID..."
                    disabled={isSaving}
                    className="w-full h-12 px-4 text-base font-mono font-bold rounded-xl border-2 border-emerald-500 dark:border-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/20 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 shadow-sm"
                  />
                  <Button
                    type="button"
                    variant="success"
                    size="sm"
                    onClick={() => handleExecutePairing(rfidInput)}
                    disabled={isSaving || !rfidInput.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 text-xs font-bold rounded-lg"
                  >
                    {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Simpan RFID (Enter)'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Last Paired Toast Banner */}
        {lastPairedInfo && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>
                Terakhir Di-Pairing: <strong>{lastPairedInfo.name}</strong> ({lastPairedInfo.identifier}) &rarr; <span className="font-mono font-bold bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded-md">{lastPairedInfo.rfid}</span>
              </span>
            </div>
            <Sparkles size={14} className="text-emerald-500 animate-pulse shrink-0" />
          </div>
        )}

        {/* Continuous Loop Instructions */}
        <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-indigo-700 dark:text-indigo-300 flex items-start gap-2.5">
          <ArrowRight size={14} className="shrink-0 mt-0.5" />
          <div>
            <strong>Mode Tanpa Sentuh Mouse (Continuous Batch Pairing):</strong>
            <p className="text-[10px] text-indigo-600/80 dark:text-indigo-400 mt-0.5 leading-relaxed">
              Setelah tombol Tap RFID berhasil disimpan, fokus layar akan **otomatis kembali ke Langkah 1**. Operator dapat terus-menerus menembak QR kartu cetak lalu menempelkannya ke mesin RFID secara nonstop.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Selesai & Tutup
          </Button>
        </div>
      </div>
    </Modal>
  );
};
