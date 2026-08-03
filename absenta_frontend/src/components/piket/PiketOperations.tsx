import React, { useState, useRef, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { SmartStudentPicker, type Student } from '../common/SmartStudentPicker';
import { SimpleFormField } from '../ui/SimpleFormField';
import { Scan, Clock, Printer, ShieldCheck, RefreshCw, CheckCircle2, Search } from 'lucide-react';
import { piketApi } from '../../api/piket.api';
import type { IzinKeluarSiswa } from '../../api/piket.api';
import type { JadwalPiketGuru } from '../../api/piketGuru.api';
import { usePiketGuruOptions } from '../../hooks/usePiketGuruOptions';
import { usePiketGateStore } from '../../hooks/usePiketGateStore';
import {
  QUICK_REASONS_IZIN_KELUAR,
  QUICK_REASONS_PULANG_AWAL,
  QUICK_REASONS_JURUSAN,
  getPiketPersonaConfig,
  getTipeIzinBadgeConfig,
  type PiketPersonaMode,
  calculatePiketAnalytics
} from '../../utils/piketStatusHelper';
import QRCode from 'qrcode';

interface PiketOperationsProps {
  dailyPermits: IzinKeluarSiswa[];
  fetchPermits: () => Promise<void>;
  tenantInfo: any;
  user: any;
  setPrintedPermit: React.Dispatch<React.SetStateAction<(IzinKeluarSiswa & { qrCodeUrl?: string }) | null>>;
  printPaperSize: string;
  setPrintPaperSize: React.Dispatch<React.SetStateAction<string>>;
  personaMode?: PiketPersonaMode;
  namaJurusan?: string;
}

export const PiketOperations: React.FC<PiketOperationsProps> = React.memo(({
  dailyPermits,
  fetchPermits,
  tenantInfo,
  user,
  setPrintedPermit,
  printPaperSize,
  setPrintPaperSize,
  personaMode = 'UTAMA',
  namaJurusan
}) => {
  const queryClient = useQueryClient();

  const scannerInputRef = useRef<any>(null);

  const personaConfig = useMemo(() => {
    return getPiketPersonaConfig(personaMode, namaJurusan);
  }, [personaMode, namaJurusan]);

  // Form states
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [tipeIzin, setTipeIzin] = useState(
    personaMode === 'JURUSAN' ? 'IZIN_JURUSAN' : 'IZIN_KELUAR'
  );
  const [alasan, setAlasan] = useState(
    personaMode === 'JURUSAN' ? QUICK_REASONS_JURUSAN[0] : QUICK_REASONS_IZIN_KELUAR[0]
  );
  const [savingPermit, setSavingPermit] = useState(false);

  // Scan & Re-print states (UTAMA persona only)
  const [reprintScanCode, setReprintScanCode] = useState('');
  const [reprintPermit, setReprintPermit] = useState<IzinKeluarSiswa | null>(null);
  const [reprintResult, setReprintResult] = useState<'idle' | 'found' | 'notfound'>('idle');
  const reprintInputRef = useRef<HTMLInputElement>(null);

  // Reactive gate store & canonical analytics calculation
  const { exitedGateIds } = usePiketGateStore();
  const { countSedangDiLuar, countSudahKembali } = useMemo(() => {
    return calculatePiketAnalytics(dailyPermits, exitedGateIds);
  }, [dailyPermits, exitedGateIds]);

  // Guru Piket On Duty state using explicit custom hook (Jadwal Piket Guru)
  const { guruPiketHariIni: guruPiketOnDuty, isLoading: loadingGuruPiket } = usePiketGuruOptions();

  const quickReasons = useMemo(() => {
    if (tipeIzin === 'PULANG_AWAL') return QUICK_REASONS_PULANG_AWAL;
    if (personaMode === 'JURUSAN' || tipeIzin === 'IZIN_JURUSAN') return QUICK_REASONS_JURUSAN;
    return QUICK_REASONS_IZIN_KELUAR;
  }, [tipeIzin, personaMode]);

  const handleTipeIzinChange = (newTipe: string) => {
    setTipeIzin(newTipe);
    if (newTipe === 'PULANG_AWAL') {
      setAlasan(QUICK_REASONS_PULANG_AWAL[0]);
    } else if (newTipe === 'IZIN_JURUSAN' || personaMode === 'JURUSAN') {
      setAlasan(QUICK_REASONS_JURUSAN[0]);
    } else {
      setAlasan(QUICK_REASONS_IZIN_KELUAR[0]);
    }
  };

  // Scan & Re-print handler for UTAMA persona
  const handleReprintScan = useCallback((code?: string) => {
    const query = (code ?? reprintScanCode).trim().toLowerCase();
    if (!query) return;

    const match = (dailyPermits || []).find(
      p =>
        p.id.toLowerCase() === query ||
        String(p.SiswaAkademik?.siswa.nis || '').toLowerCase() === query ||
        String(p.SiswaAkademik?.siswa.no_rfid || '').toLowerCase() === query ||
        String((p.SiswaAkademik?.siswa as Record<string, unknown>)?.id || '').toLowerCase() === query
    );

    if (match) {
      setReprintPermit(match);
      setReprintResult('found');
      toast.success(`Izin ditemukan: ${match.SiswaAkademik?.siswa.nama_siswa}`);
    } else {
      setReprintPermit(null);
      setReprintResult('notfound');
      toast.error(`Tidak ada izin aktif untuk: "${query}"`);
    }
  }, [dailyPermits, reprintScanCode]);

  const handleReprintExecute = useCallback(async (permit: IzinKeluarSiswa) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(permit.id, { margin: 1, width: 150 });
      setPrintedPermit({ ...permit, qrCodeUrl: qrDataUrl });
      setTimeout(() => { window.print(); setPrintedPermit(null); }, 300);
      toast.success(`Mencetak ulang slip ${permit.SiswaAkademik?.siswa.nama_siswa}`);
    } catch {
      setPrintedPermit(permit);
      setTimeout(() => { window.print(); setPrintedPermit(null); }, 300);
    }
  }, [setPrintedPermit]);

  // Active out-students count local memo
  const activeOutStudentsCount = useMemo(() => {
    return (dailyPermits || []).filter(p => p.status === 'DISETUJUI').length;
  }, [dailyPermits]);

  // Submit and Save Permit (Simpan & Cetak)
  const handleCreatePermit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    if (!alasan.trim()) {
      toast.error('Alasan izin keluar harus diisi');
      return;
    }

    setSavingPermit(true);
    try {
      const res = await piketApi.createPermit({
        siswa_akademik_id: selectedStudent.id,
        guru_piket_id: user?.guru_profile?.id || undefined,
        alasan: alasan.trim(),
        tipe_izin: tipeIzin,
        jam_keluar: new Date().toISOString()
      });

      if (res.success) {
        toast.success(`Izin berhasil diterbitkan untuk ${selectedStudent.nama_siswa}`);
        
        // Generate offline QR Code instantly
        try {
          const qrDataUrl = await QRCode.toDataURL(res.data.id, {
            margin: 1,
            width: 150
          });
          setPrintedPermit({
            ...res.data,
            qrCodeUrl: qrDataUrl
          });
        } catch (qrErr) {
          console.error('Failed to generate offline QR code:', qrErr);
          setPrintedPermit(res.data);
        }
        
        // Refresh daily lists
        queryClient.invalidateQueries({ queryKey: ['piket-harian-list'] });
        queryClient.invalidateQueries({ queryKey: ['piket-harian'] });
        queryClient.invalidateQueries({ queryKey: ['piket-range'] });
        queryClient.invalidateQueries({ queryKey: ['attendance-sessions'] });
        queryClient.invalidateQueries({ queryKey: ['kesiswaan-stats'] });
        await fetchPermits();
        
        // Reset scanner states
        setSelectedStudent(null);
        setAlasan('Sakit / Tidak Enak Badan');
        setTipeIzin('IZIN_KELUAR');
        
        // Instantly trigger printing
        setTimeout(() => {
          window.print();
          setPrintedPermit(null);
        }, 300);
      }
    } catch (err: unknown) {
      console.error(err);
      const errorObj = err as any;
      const errMsg = errorObj.response?.data?.message || errorObj.message || 'Gagal menyimpan izin keluar';
      toast.error(errMsg);
    } finally {
      setSavingPermit(false);
      setTimeout(() => scannerInputRef.current?.focus(), 500);
    }
  };

  return (
    <>
      {/* ─── UTAMA: SCAN & RE-PRINT SECTION ─────────────────────────────── */}
      {personaMode === 'UTAMA' && (
        <Card className="mb-6 p-5 border-none shadow-lg bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <h3 className="text-xs font-black uppercase tracking-widest text-indigo-300 flex items-center gap-2 mb-4">
            <RefreshCw size={14} className="text-indigo-400" /> Scan & Cetak Ulang Slip — Dari Pos Jurusan
          </h3>
          <p className="text-[10px] text-white/50 mb-4 leading-relaxed">
            Scan QR Code, RFID, atau ketik NIS siswa yang sudah memiliki izin dari Pos Jurusan untuk mencetak ulang slip resmi.
          </p>
          <div className="flex gap-2">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
              <input
                ref={reprintInputRef}
                type="text"
                value={reprintScanCode}
                onChange={e => setReprintScanCode(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleReprintScan(); } }}
                placeholder="Scan QR / RFID / Ketik NIS…"
                className="w-full h-10 pl-9 pr-3 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-indigo-400"
                autoComplete="off"
              />
            </div>
            <Button
              type="button"
              onClick={() => handleReprintScan()}
              className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest shrink-0"
            >
              Cari
            </Button>
          </div>

          {reprintResult === 'notfound' && (
            <div className="mt-3 p-3 bg-rose-900/30 border border-rose-700/40 rounded-xl text-[10px] text-rose-300 font-bold">
              ❌ Tidak ada izin aktif hari ini untuk kode tersebut.
            </div>
          )}

          {reprintResult === 'found' && reprintPermit && (() => {
            const badgeCfg = getTipeIzinBadgeConfig(reprintPermit.tipe_izin);
            return (
              <div className="mt-3 p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-md ${badgeCfg.badgeClass}`}>
                        {badgeCfg.icon} {badgeCfg.label}
                      </span>
                      <span className={`inline-flex text-[9px] font-black px-2 py-0.5 rounded-md ${
                        reprintPermit.status === 'KEMBALI'
                          ? 'bg-emerald-900/40 text-emerald-300'
                          : 'bg-amber-900/40 text-amber-300'
                      }`}>
                        {reprintPermit.status === 'KEMBALI' ? '✅ Sudah Kembali' : '🟡 Masih di Luar'}
                      </span>
                    </div>
                    <p className="font-black text-white text-sm uppercase tracking-tight">
                      {reprintPermit.SiswaAkademik?.siswa.nama_siswa}
                    </p>
                    <p className="text-[10px] text-white/50">
                      NIS: {reprintPermit.SiswaAkademik?.siswa.nis} &nbsp;|&nbsp;
                      Kelas: {reprintPermit.SiswaAkademik?.kelas?.nama_kelas || '-'}
                    </p>
                    <p className="text-[10px] text-indigo-300 mt-1 italic">"{reprintPermit.alasan}"</p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => handleReprintExecute(reprintPermit)}
                    className="shrink-0 h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5"
                  >
                    <Printer size={13} /> Cetak Ulang
                  </Button>
                </div>
                <button
                  type="button"
                  onClick={() => { setReprintPermit(null); setReprintResult('idle'); setReprintScanCode(''); }}
                  className="text-[9px] text-white/30 hover:text-white/60 font-bold uppercase tracking-widest"
                >
                  ✕ Tutup
                </button>
              </div>
            );
          })()}
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8">
      {/* Scan input side */}
      <div className="lg:col-span-5 space-y-4 sm:space-y-6">
        <Card className={`p-4 sm:p-6 border-none shadow-xl bg-white dark:bg-slate-900 relative rounded-xl overflow-visible border-t-4 ${
          personaMode === 'JURUSAN' ? 'border-emerald-500' : 'border-indigo-600'
        }`}>
          <h3 className="text-md font-black uppercase tracking-wider text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-6">
            <Scan className={personaMode === 'JURUSAN' ? 'text-emerald-600' : 'text-indigo-600'} size={18} />
            {personaMode === 'JURUSAN' ? 'Pencarian Siswa Jurusan' : 'Pencarian Siswa'}
          </h3>
          
          <div className="space-y-4">
            <SimpleFormField label="Pencarian / Input Siswa" required>
              <SmartStudentPicker
                ref={scannerInputRef}
                scope="global"
                filterJurusan={personaMode === 'JURUSAN' ? namaJurusan : undefined}
                personaMode={personaMode}
                placeholder={personaMode === 'JURUSAN' && namaJurusan ? `Pencarian Siswa Jurusan ${namaJurusan} (Scan/Nama/NIS)...` : "Scan RFID / QR / Cari Nama & NIS..."}
                onSelect={(siswa: Student) => {
                  setSelectedStudent(siswa);
                  toast.success(`Siswa ditemukan: ${siswa.nama_siswa}`);
                }}
                autoFocus
              />
            </SimpleFormField>
            <p className="text-[10px] text-gray-400 leading-relaxed italic mt-2">
              * Sistem mendukung input hybrid: tempelkan kartu RFID ke reader, pindai QR Code slip menggunakan kamera web, atau ketik nama/NIS secara langsung.
            </p>
            
            <div className="pt-4 border-t border-gray-100 dark:border-slate-800/80">
              <SimpleFormField label="Preset Ukuran Kertas Slip" htmlFor="paper-size-select">
                <select
                  id="paper-size-select"
                  value={printPaperSize}
                  onChange={(e) => setPrintPaperSize(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-gray-700 dark:text-gray-300 focus:border-indigo-500 outline-none"
                >
                  <option value="58mm">Thermal Mini (58mm)</option>
                  <option value="80mm">Thermal Standard (80mm)</option>
                  <option value="a6">Stiker / Slip Kecil (A6)</option>
                  <option value="a5">Slip Administrasi (A5)</option>
                  <option value="a4">Surat Resmi Kesiswaan (A4)</option>
                </select>
              </SimpleFormField>
            </div>
          </div>
        </Card>

        {/* Live Stats widget */}
        <Card className="p-6 border-none shadow-xl bg-slate-900 text-white rounded-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />
          <h4 className="text-xs font-black uppercase tracking-widest text-white/50 mb-4 flex items-center gap-2">
            <Clock size={14} className="text-indigo-400" /> Rangkuman Izin Hari Ini
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-white/5 p-4 rounded-xl border border-white/10 shadow-none">
              <span className="text-[9px] font-black text-white/40 uppercase tracking-widest block">Sedang di Luar</span>
              <span className="text-3xl font-black text-indigo-400 mt-1 block">{countSedangDiLuar} <span className="text-xs font-medium text-white/50">siswa</span></span>
            </Card>
            <Card className="bg-white/5 p-4 rounded-xl border border-white/10 shadow-none">
              <span className="text-[9px] font-black text-white/40 uppercase tracking-widest block">Siswa Sudah Kembali</span>
              <span className="text-3xl font-black text-emerald-400 mt-1 block">
                {countSudahKembali} <span className="text-xs font-medium text-white/50">siswa</span>
              </span>
            </Card>
          </div>
        </Card>

        {/* Guru Piket On Duty Widget */}
        <Card className="p-5 border-none shadow-md bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-400" /> Guru Piket Bertugas Hari Ini
            </h4>
            <a
              href="/kurikulum/jadwal-piket"
              className="text-[10px] text-indigo-200 hover:text-white underline font-semibold transition"
            >
              Kelola Jadwal
            </a>
          </div>

          {loadingGuruPiket ? (
            <p className="text-xs text-white/50 animate-pulse py-1">Memuat data guru piket...</p>
          ) : guruPiketOnDuty.length === 0 ? (
            <div className="text-xs text-white/60 space-y-1 py-1">
              <p>Belum ada jadwal piket guru yang ditetapkan untuk hari ini.</p>
              <a href="/kurikulum/jadwal-piket" className="text-[11px] text-indigo-300 font-bold hover:underline inline-block mt-1">
                + Set Jadwal Piket di Kurikulum
              </a>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 pt-1">
              {guruPiketOnDuty.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 bg-white/10 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-white/10 text-xs"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center text-[10px]">
                    {item.Guru?.nama_guru?.charAt(0) || 'G'}
                  </div>
                  <div>
                    <span className="font-bold text-white block text-[11px]">{item.Guru?.nama_guru}</span>
                    <span className="text-[9px] text-indigo-200 block">{item.pos_piket || 'Piket Umum'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Form and profile details side */}
      <div className="lg:col-span-7">
        {selectedStudent ? (
          <Card className="p-8 border-none shadow-xl bg-white dark:bg-slate-900 rounded-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/5 rounded-full blur-2xl" />
            
            {/* Student profile details card */}
            <div className="flex flex-col md:flex-row gap-6 pb-6 border-b border-gray-100 dark:border-slate-800">
              <div className="w-20 h-20 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center font-black text-2xl text-indigo-600 border border-indigo-100/50 shrink-0 self-center">
                {selectedStudent.nama_siswa?.charAt(0)}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300 border-none shrink-0">
                    {selectedStudent.status}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] font-bold text-gray-400 border-none px-0">NIS: {selectedStudent.nis}</Badge>
                </div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{selectedStudent.nama_siswa}</h2>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1 text-xs">
                  <div className="flex items-center gap-1 text-gray-500">
                    <span className="font-bold">Kelas:</span>
                    <span className="text-indigo-600 font-black uppercase">{selectedStudent.Kelas?.nama_kelas || '-'}</span>
                  </div>
                  {selectedStudent.no_hp && (
                    <div className="flex items-center gap-1 text-gray-500">
                      <span className="font-bold">Kontak Orang Tua:</span>
                      <span className="text-gray-700 dark:text-gray-300 font-bold">{selectedStudent.nama_ibu || selectedStudent.nama_ayah || 'Orang Tua'} ({selectedStudent.no_hp})</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Checkout permit form */}
            <form onSubmit={handleCreatePermit} className="space-y-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SimpleFormField label="Tipe Izin Keluar" htmlFor="tipe-izin-select" required>
                  <select
                    id="tipe-izin-select"
                    value={tipeIzin}
                    onChange={(e) => handleTipeIzinChange(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white dark:bg-slate-900 dark:border-slate-800 text-sm font-bold text-gray-700 dark:text-gray-300 focus:border-indigo-500 outline-none"
                  >
                    {personaMode === 'JURUSAN' ? (
                      <>
                        <option value="IZIN_JURUSAN">IZIN JURUSAN (KELUAR DARI AREA JURUSAN)</option>
                        <option value="IZIN_KELUAR">IZIN KELUAR SEMENTARA (WAJIB KEMBALI)</option>
                        <option value="PULANG_AWAL">PULANG AWAL (TIDAK KEMBALI)</option>
                      </>
                    ) : (
                      <>
                        <option value="IZIN_KELUAR">IZIN KELUAR SEMENTARA (WAJIB KEMBALI)</option>
                        <option value="IZIN_JURUSAN">IZIN JURUSAN (DARI AREA LAB/BENGKEL)</option>
                        <option value="PULANG_AWAL">PULANG AWAL (TIDAK KEMBALI)</option>
                      </>
                    )}
                  </select>
                </SimpleFormField>
                
                <SimpleFormField label="Alasan Cepat" htmlFor="alasan-cepat-select">
                  <select
                    id="alasan-cepat-select"
                    value={quickReasons.includes(alasan) ? alasan : 'Lainnya (Ketik Manual)'}
                    onChange={(e) => {
                      if (e.target.value !== 'Lainnya (Ketik Manual)') {
                        setAlasan(e.target.value);
                      } else {
                        setAlasan('');
                      }
                    }}
                    className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white dark:bg-slate-900 dark:border-slate-800 text-sm font-bold text-gray-700 dark:text-gray-300 focus:border-indigo-500 outline-none"
                  >
                    {quickReasons.map((r, i) => <option key={i} value={r}>{r}</option>)}
                  </select>
                </SimpleFormField>
              </div>

              <SimpleFormField label="Detail Alasan / Catatan Piket" htmlFor="detail-alasan-textarea" required>
                <Textarea
                  id="detail-alasan-textarea"
                  value={alasan}
                  onChange={(e) => setAlasan(e.target.value)}
                  placeholder="Masukkan alasan lengkap..."
                  className="rounded-xl border border-gray-200/80 focus:border-indigo-500 focus:ring-indigo-100 min-h-[80px]"
                  required
                />
              </SimpleFormField>

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-50 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl h-12 px-6 font-bold"
                  onClick={() => setSelectedStudent(null)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl h-12 px-8 bg-indigo-600 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-600/20 flex items-center gap-2"
                  disabled={savingPermit}
                >
                  {savingPermit ? 'Menyimpan...' : (
                    <>
                      <Printer size={14} /> Simpan & Cetak Slip
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        ) : (
          <Card className="py-24 text-center bg-gray-50/50 dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-gray-100 dark:border-slate-800 flex flex-col items-center justify-center shadow-inner">
            <div className="w-16 h-16 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center mb-4">
              <Scan size={30} className="animate-pulse" />
            </div>
            <p className="text-gray-400 font-black uppercase text-xs tracking-widest">Silakan Pindai Kartu Siswa</p>
            <p className="text-xs text-gray-400 mt-1 max-w-sm px-6">Sorot kartu RFID siswa pada scanner, ketik NIS pada pencarian, atau ketik nama untuk memproses slip izin keluar.</p>
          </Card>
        )}
      </div>
    </div>

    </>
  );
});
