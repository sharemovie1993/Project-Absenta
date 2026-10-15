import React, { useState, useRef, useEffect, useCallback } from 'react';
import Card from '../../ui/Card';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import api from '../../../lib/axiosInstance';
import toast from 'react-hot-toast';
import {
  Scan,
  Search,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  CreditCard,
  User,
  Clock,
  Sparkles,
  RefreshCw,
  X,
  Zap,
} from 'lucide-react';

export interface RatAttendanceTerminalProps {
  meetingId: string;
  meetingStatus: string;
  quorumStats?: {
    actualAttendance: number;
    quorumTarget: number;
    percentage: number;
    isQuorumReached: boolean;
  } | null;
  onAttendanceRecorded?: () => void;
}

interface MemberSearchResult {
  id: string;
  memberNo: string;
  type: string;
  status: string;
  displayName?: string;
  identityCode?: string;
  isMember?: boolean;
  User?: { full_name?: string; email?: string } | null;
  Siswa?: {
    nama_siswa: string;
    nis: string;
    nisn: string;
    no_rfid: string | null;
  } | null;
  Guru?: {
    nama_guru: string;
    nip: string;
    no_rfid: string | null;
  } | null;
  isAttended: boolean;
  attendanceDetail?: {
    attendedAt: string;
    method: string;
  } | null;
}

interface LastScanRecord {
  status: 'SUCCESS' | 'ALREADY_ATTENDED' | 'ERROR';
  name: string;
  memberNo: string;
  type: string;
  timestamp: string;
  method: string;
  message: string;
}

export const RatAttendanceTerminal: React.FC<RatAttendanceTerminalProps> = ({
  meetingId,
  meetingStatus,
  quorumStats,
  onAttendanceRecorded,
}) => {
  const [mode, setMode] = useState<'RFID' | 'MANUAL'>('RFID');
  const [rfidInput, setRfidInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MemberSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastScan, setLastScan] = useState<LastScanRecord | null>(null);

  const rfidInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isRegistrationAllowed =
    meetingStatus === 'REGISTRATION_OPEN' ||
    meetingStatus === 'QUORUM_REACHED' ||
    meetingStatus === 'IN_SESSION';

  // Sound Feedback via Web Audio API
  const playAudioFeedback = useCallback(
    (type: 'success' | 'warning' | 'error') => {
      if (!soundEnabled) return;
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'success') {
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.1);
          gain.gain.setValueAtTime(0.25, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.3);
        } else if (type === 'warning') {
          osc.frequency.setValueAtTime(440, ctx.currentTime);
          osc.frequency.setValueAtTime(330, ctx.currentTime + 0.12);
          gain.gain.setValueAtTime(0.25, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.35);
        } else {
          osc.frequency.setValueAtTime(220, ctx.currentTime);
          gain.gain.setValueAtTime(0.25, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.25);
        }
      } catch {
        // Ignored if browser blocks audio context without prior interaction
      }
    },
    [soundEnabled]
  );

  // Auto-focus RFID input field when in RFID mode
  useEffect(() => {
    if (mode === 'RFID' && isRegistrationAllowed) {
      const focusTimer = setTimeout(() => {
        rfidInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(focusTimer);
    }
  }, [mode, isRegistrationAllowed]);

  // Execute check-in API call
  const executeAttendance = async (params: {
    memberId?: string;
    rfid?: string;
    identifier?: string;
    method?: string;
  }) => {
    if (!isRegistrationAllowed) {
      toast('Presensi sidang belum dibuka oleh pimpinan atau telah selesai.', {
        icon: '⚠️',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post(`/cooperative/rat/${meetingId}/attendance`, params);
      const data = res.data;

      const member = data.member;
      const memberName =
        member?.displayName ||
        member?.Siswa?.nama_siswa ||
        member?.Guru?.nama_guru ||
        member?.User?.full_name ||
        'Anggota Terdaftar';

      const memberNo = member?.memberNo || params.rfid || params.identifier || '-';
      const memberType = member?.type || 'ANGGOTA';

      if (data.alreadyAttended) {
        playAudioFeedback('warning');
        setLastScan({
          status: 'ALREADY_ATTENDED',
          name: memberName,
          memberNo,
          type: memberType,
          timestamp: new Date().toLocaleTimeString('id-ID'),
          method: params.rfid ? 'RFID Scanner' : 'Ketik Manual',
          message: 'Anggota sudah terpresensi sebelumnya. Kuorum tidak bertambah.',
        });
        toast(`Sudah Hadir: ${memberName} (${memberNo})`, { icon: 'ℹ️' });
      } else {
        playAudioFeedback('success');
        setLastScan({
          status: 'SUCCESS',
          name: memberName,
          memberNo,
          type: memberType,
          timestamp: new Date().toLocaleTimeString('id-ID'),
          method: params.rfid ? 'RFID Scanner' : 'Ketik Manual',
          message: 'Kehadiran berhasil diverifikasi ke kuorum resmi sidang!',
        });
        toast.success(`Berhasil Hadir: ${memberName} (${memberNo})`);
      }

      onAttendanceRecorded?.();

      // Refresh search results if manual mode
      if (mode === 'MANUAL' && searchQuery.trim()) {
        fetchMembers(searchQuery.trim());
      }
    } catch (err: unknown) {
      playAudioFeedback('error');
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      const errMsg =
        errorObj.response?.data?.message ||
        errorObj.message ||
        'Gagal mencatat presensi anggota.';

      setLastScan({
        status: 'ERROR',
        name: 'Gagal / Tidak Ditemukan',
        memberNo: params.rfid || params.identifier || '-',
        type: '-',
        timestamp: new Date().toLocaleTimeString('id-ID'),
        method: params.rfid ? 'RFID Scanner' : 'Ketik Manual',
        message: errMsg,
      });
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
      setRfidInput('');
      if (mode === 'RFID') {
        rfidInputRef.current?.focus();
      }
    }
  };

  // RFID Submit handler (HID scanner sends Enter key on completion)
  const handleRfidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRfid = rfidInput.trim();
    if (!cleanRfid) return;

    executeAttendance({
      rfid: cleanRfid,
      method: 'RFID_SCAN',
    });
  };

  // Manual member search debouncer
  const fetchMembers = async (q: string) => {
    setIsSearching(true);
    try {
      const res = await api.get(
        `/cooperative/rat/${meetingId}/attendance/search-members`,
        { params: { q } }
      );
      setSearchResults(res.data.data || []);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!val.trim()) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      fetchMembers(val.trim());
    }, 250);
  };

  const getMemberDisplayName = (m: MemberSearchResult) => {
    return (
      m.displayName ||
      m.Siswa?.nama_siswa ||
      m.Guru?.nama_guru ||
      m.User?.full_name ||
      'Tanpa Nama'
    );
  };

  const getMemberIdentityCode = (m: MemberSearchResult) => {
    if (m.identityCode) return m.identityCode;
    if (m.Siswa?.nis) return `NIS: ${m.Siswa.nis}`;
    if (m.Guru?.nip) return `NIP: ${m.Guru.nip}`;
    return m.User?.email || '-';
  };

  return (
    <Card
      title={
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl text-indigo-600 dark:text-indigo-400">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  Terminal Presensi Meja Registrasi RAT
                </span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Verifikasi kehadiran fisik anggota di lokasi rapat via Tap Scanner RFID atau cari nama manual
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Audio Toggle */}
            <Button
              type="button"
              size="toolbar"
              variant={soundEnabled ? 'toolbarPrimary' : 'toolbarOutline'}
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Suara scanner aktif' : 'Suara scanner bisu'}
              className="text-xs"
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                  Audio ON
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  Audio Mute
                </>
              )}
            </Button>

            {/* Quorum Counter Pill */}
            {quorumStats && (
              <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300">
                Tercatat:{' '}
                <span className="text-indigo-600 dark:text-indigo-400">
                  {quorumStats.actualAttendance}
                </span>{' '}
                /{' '}
                <span>{quorumStats.quorumTarget}</span>
              </div>
            )}
          </div>
        </div>
      }
      className="border-indigo-200 dark:border-indigo-900/50 shadow-sm"
    >
      <div className="space-y-4">
        {/* Registration Availability Warning */}
        {!isRegistrationAllowed && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-3 text-xs text-amber-800 dark:text-amber-300">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
            <div>
              <span className="font-bold">Sesi Registrasi Belum Aktif:</span> Presensi terminal hanya dapat memproses kartu saat status sidang berada pada tahap <strong>REGISTRATION_OPEN</strong> atau <strong>IN_SESSION</strong>.
            </div>
          </div>
        )}

        {/* Mode Switcher Buttons */}
        <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setMode('RFID')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              mode === 'RFID'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Mode 1: Tap Kartu RFID (Scanner USB)</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('MANUAL')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              mode === 'MANUAL'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Mode 2: Ketik Manual / Cari Anggota</span>
          </button>
        </div>

        {/* MODE 1: RFID TAP SCANNER */}
        {mode === 'RFID' && (
          <div className="p-4 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 dark:from-indigo-950/20 dark:via-slate-900 dark:to-slate-900 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-800/60">
            <form onSubmit={handleRfidSubmit} className="space-y-3">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
                  <Zap className="w-7 h-7 animate-pulse" />
                </div>
                <div className="flex-1 w-full">
                  <label
                    htmlFor="rfid-tap-input"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Siap Membaca Kartu RFID Peserta:
                  </label>
                  <div className="relative">
                    <Input
                      id="rfid-tap-input"
                      ref={rfidInputRef}
                      type="text"
                      disabled={!isRegistrationAllowed || isSubmitting}
                      value={rfidInput}
                      onChange={(e) => setRfidInput(e.target.value)}
                      placeholder="Tempelkan kartu RFID ke scanner USB atau ketik UID kartu..."
                      className="w-full font-mono text-sm pl-3 pr-24 tracking-wider uppercase"
                      autoComplete="off"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <Button
                        type="submit"
                        size="toolbar"
                        variant="toolbarPrimary"
                        disabled={!rfidInput.trim() || !isRegistrationAllowed}
                        isLoading={isSubmitting}
                      >
                        Submit
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pl-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                Scanner USB otomatis mengirim tombol <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px] font-mono">Enter</kbd> sehingga kartu langsung terverifikasi tanpa perlu klik mouse.
              </p>
            </form>
          </div>
        )}

        {/* MODE 2: MANUAL SEARCH */}
        {mode === 'MANUAL' && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                aria-label="Cari Anggota Koperasi"
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Cari Nomor Anggota (ANG-...), Nama Lengkap, NIS, atau NIP..."
                className="w-full pl-9 pr-8 text-sm"
                autoComplete="off"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  aria-label="Bersihkan pencarian"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Results Dropdown / Table */}
            {isSearching ? (
              <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
                Mencari anggota koperasi aktif...
              </div>
            ) : searchResults.length > 0 ? (
              <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {searchResults.map((m) => {
                  const name = getMemberDisplayName(m);
                  const identity = getMemberIdentityCode(m);
                  return (
                    <div
                      key={m.id}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-xs shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                              {name}
                            </span>
                            {m.isMember === false ? (
                              <Badge variant="warning">Non-Anggota Koperasi</Badge>
                            ) : (
                              <Badge variant="outline">{m.type}</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            {m.isMember !== false && (
                              <>
                                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                                  {m.memberNo}
                                </span>
                                <span>•</span>
                              </>
                            )}
                            <span>{identity}</span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {m.isMember === false ? (
                          <div
                            className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 text-[11px] font-semibold px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg"
                            title="Hanya anggota koperasi aktif yang memiliki hak kuorum dan suara RAT"
                          >
                            <span>Belum Menjadi Anggota</span>
                          </div>
                        ) : m.isAttended ? (
                          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-semibold px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Sudah Hadir</span>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            size="toolbar"
                            variant="toolbarPrimary"
                            disabled={!isRegistrationAllowed || isSubmitting}
                            onClick={() =>
                              executeAttendance({
                                memberId: m.id,
                                method: 'MANUAL_OPERATOR',
                              })
                            }
                          >
                            Presensikan
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : searchQuery.trim().length >= 2 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                Tidak ada anggota aktif yang cocok dengan &quot;{searchQuery}&quot;.
              </div>
            ) : null}
          </div>
        )}

        {/* LAST SCANNED MEMBER FEEDBACK BANNER */}
        {lastScan && (
          <div
            className={`p-3.5 rounded-xl border transition-all animate-fadeIn ${
              lastScan.status === 'SUCCESS'
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : lastScan.status === 'ALREADY_ATTENDED'
                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    lastScan.status === 'SUCCESS'
                      ? 'bg-emerald-600 text-white'
                      : lastScan.status === 'ALREADY_ATTENDED'
                      ? 'bg-amber-600 text-white'
                      : 'bg-rose-600 text-white'
                  }`}
                >
                  {lastScan.status === 'SUCCESS' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : lastScan.status === 'ALREADY_ATTENDED' ? (
                    <Clock className="w-5 h-5" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm">{lastScan.name}</span>
                    <Badge
                      variant={
                        lastScan.status === 'SUCCESS'
                          ? 'success'
                          : lastScan.status === 'ALREADY_ATTENDED'
                          ? 'warning'
                          : 'danger'
                      }
                    >
                      {lastScan.memberNo}
                    </Badge>
                  </div>
                  <p className="text-xs mt-0.5 opacity-90">{lastScan.message}</p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] font-mono opacity-75 block">
                  {lastScan.timestamp}
                </span>
                <span className="text-[10px] font-semibold opacity-80 uppercase">
                  {lastScan.method}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
export default RatAttendanceTerminal;
