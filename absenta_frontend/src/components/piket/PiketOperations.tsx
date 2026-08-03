import React, { useState, useRef, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SimpleFormField } from '../ui/SimpleFormField';
import { SmartStudentPicker, type Student } from '../common/SmartStudentPicker';
import { Scan, Printer, RefreshCw, Search, Info } from 'lucide-react';
import { piketApi } from '../../api/piket.api';
import type { IzinKeluarSiswa } from '../../api/piket.api';

import { usePiketGateStore } from '../../hooks/usePiketGateStore';
import {
  QUICK_REASONS_IZIN_KELUAR,
  QUICK_REASONS_PULANG_AWAL,
  QUICK_REASONS_JURUSAN,
  getPiketPersonaConfig,
  getPermitFullLifecycleStatus,
  type PiketPersonaMode
} from '../../utils/piketStatusHelper';

// Sub-components modular
import { PiketFormModal } from './PiketFormModal';
import { PiketUtamaPanel } from './PiketUtamaPanel';
import { PiketJurusanPanel } from './PiketJurusanPanel';

export interface PiketOperationsProps {
  dailyPermits: IzinKeluarSiswa[];
  fetchPermits: () => Promise<any>;
  tenantInfo: any;
  user: any;
  setPrintedPermit: (permit: (IzinKeluarSiswa & { qrCodeUrl?: string }) | null) => void;
  printPaperSize: string;
  setPrintPaperSize: (size: string) => void;
  personaMode?: PiketPersonaMode;
  namaJurusan?: string;
}

export const PiketOperations: React.FC<PiketOperationsProps> = React.memo(({
  dailyPermits,
  fetchPermits,
  user,
  setPrintedPermit,
  printPaperSize,
  setPrintPaperSize,
  personaMode = 'UTAMA',
  namaJurusan
}) => {
  const queryClient = useQueryClient();
  const scannerInputRef = useRef<any>(null);

  const personaConfig = useMemo(() => getPiketPersonaConfig(personaMode, namaJurusan), [personaMode, namaJurusan]);
  const accentColor = personaMode === 'JURUSAN' ? 'emerald' : 'indigo';

  // ─── MODAL & PRINT CONFIG STATE ─────────────────────────────────────────
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [tipeIzin, setTipeIzin] = useState(personaMode === 'JURUSAN' ? 'IZIN_JURUSAN' : 'IZIN_KELUAR');
  const [alasan, setAlasan] = useState(personaMode === 'JURUSAN' ? QUICK_REASONS_JURUSAN[0] : QUICK_REASONS_IZIN_KELUAR[0]);
  const [savingPermit, setSavingPermit] = useState(false);
  const [enablePrint, setEnablePrint] = useState<boolean>(personaMode === 'UTAMA');

  // ─── SCAN & RE-PRINT STATE (UTAMA) ────────────────────────────────────────
  const [reprintScanCode, setReprintScanCode] = useState('');
  const [reprintPermit, setReprintPermit] = useState<IzinKeluarSiswa | null>(null);
  const [reprintResult, setReprintResult] = useState<'idle' | 'found' | 'notfound'>('idle');
  const reprintInputRef = useRef<HTMLInputElement>(null);

  // ─── GATE STORE ───────────────────────────────────────────────────────────
  const { exitedGateIds } = usePiketGateStore();

  // Siswa berstatus pending / rujukan dari jurusan yang akan menghadap ke piket utama (Step 1)
  const pendingJurusanPermits = useMemo(() => {
    return (dailyPermits || []).filter(p => {
      const life = getPermitFullLifecycleStatus(p, exitedGateIds);
      return life.stepIndex === 1;
    });
  }, [dailyPermits, exitedGateIds]);

  // Siswa berstatus terverifikasi / tercetak di piket utama (Step 2, 3, 4)
  const issuedPermits = useMemo(() => {
    return (dailyPermits || []).filter(p => {
      const life = getPermitFullLifecycleStatus(p, exitedGateIds);
      return life.stepIndex >= 2;
    });
  }, [dailyPermits, exitedGateIds]);

  // Filtering live list pantauan untuk persona JURUSAN berdasarkan kelas jurusan aktif
  const jurusanFilteredPermits = useMemo(() => {
    const list = dailyPermits || [];
    if (personaMode !== 'JURUSAN' || !namaJurusan) return list;

    const targetJurusan = namaJurusan.trim().toLowerCase();
    return list.filter(item => {
      const namaKelas = String(item.SiswaAkademik?.kelas?.nama_kelas || '').toLowerCase();
      const namaJur = String(
        (item.SiswaAkademik?.kelas as any)?.jurusan?.nama_jurusan ||
        (item.SiswaAkademik?.kelas as any)?.jurusan?.kode_jurusan ||
        (item.SiswaAkademik?.kelas as any)?.jurusan?.singkatan || ''
      ).toLowerCase();
      const tipeIzinStr = String(item.tipe_izin || '');

      return (
        namaKelas.includes(targetJurusan) ||
        namaJur.includes(targetJurusan) ||
        tipeIzinStr === 'IZIN_JURUSAN'
      );
    });
  }, [dailyPermits, personaMode, namaJurusan]);

  // ─── FORM LOGIC ───────────────────────────────────────────────────────────
  const quickReasons = useMemo(() => {
    if (tipeIzin === 'PULANG_AWAL') return QUICK_REASONS_PULANG_AWAL;
    if (personaMode === 'JURUSAN' || tipeIzin === 'IZIN_JURUSAN') return QUICK_REASONS_JURUSAN;
    return QUICK_REASONS_IZIN_KELUAR;
  }, [tipeIzin, personaMode]);

  const handleTipeIzinChange = useCallback((newTipe: string) => {
    setTipeIzin(newTipe);
    if (newTipe === 'PULANG_AWAL') {
      setAlasan(QUICK_REASONS_PULANG_AWAL[0]);
    } else if (newTipe === 'IZIN_JURUSAN' || personaMode === 'JURUSAN') {
      setAlasan(QUICK_REASONS_JURUSAN[0]);
    } else {
      setAlasan(QUICK_REASONS_IZIN_KELUAR[0]);
    }
  }, [personaMode]);

  const openFormModal = useCallback((siswa?: any) => {
    if (siswa) setSelectedStudent(siswa);
    setTipeIzin(personaMode === 'JURUSAN' ? 'IZIN_JURUSAN' : 'IZIN_KELUAR');
    setAlasan(personaMode === 'JURUSAN' ? QUICK_REASONS_JURUSAN[0] : QUICK_REASONS_IZIN_KELUAR[0]);
    setIsFormModalOpen(true);
  }, [personaMode]);

  const closeFormModal = useCallback(() => {
    setIsFormModalOpen(false);
    setSelectedStudent(null);
    setTimeout(() => scannerInputRef.current?.focus(), 300);
  }, []);

  const handleCreatePermit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    if (!alasan.trim()) { toast.error('Alasan izin keluar harus diisi'); return; }

    setSavingPermit(true);
    try {
      const targetStatus = personaMode === 'JURUSAN' ? 'PENDING' : 'DISETUJUI';
      const res = await piketApi.createPermit({
        siswa_akademik_id: selectedStudent.id,
        guru_piket_id: user?.guru_profile?.id || undefined,
        alasan: alasan.trim(),
        tipe_izin: tipeIzin,
        status: targetStatus,
        jam_keluar: new Date().toISOString()
      });

      if (res.success) {
        if (enablePrint && personaMode !== 'JURUSAN') {
          toast.success(`Izin berhasil diterbitkan & dicetak untuk ${selectedStudent.nama_siswa}`);
          try {
            const qrDataUrl = await QRCode.toDataURL(res.data.id, { margin: 1, width: 150 });
            setPrintedPermit({ ...res.data, qrCodeUrl: qrDataUrl });
          } catch {
            setPrintedPermit(res.data);
          }
          setTimeout(() => { window.print(); setPrintedPermit(null); }, 300);
        } else {
          toast.success(
            personaMode === 'JURUSAN'
              ? `Rujukan izin berhasil dikirim ke Meja Piket Utama untuk ${selectedStudent.nama_siswa}`
              : `Izin berhasil disimpan tanpa cetak untuk ${selectedStudent.nama_siswa}`
          );
        }

        queryClient.invalidateQueries({ queryKey: ['piket-harian-list'] });
        queryClient.invalidateQueries({ queryKey: ['piket-harian'] });
        queryClient.invalidateQueries({ queryKey: ['piket-range'] });
        queryClient.invalidateQueries({ queryKey: ['attendance-sessions'] });
        queryClient.invalidateQueries({ queryKey: ['kesiswaan-stats'] });
        await fetchPermits();
        closeFormModal();
      }
    } catch (err: unknown) {
      const errorObj = err as any;
      toast.error(errorObj.response?.data?.message || errorObj.message || 'Gagal menyimpan izin keluar');
    } finally {
      setSavingPermit(false);
    }
  }, [selectedStudent, alasan, personaMode, tipeIzin, user, enablePrint, setPrintedPermit, queryClient, fetchPermits, closeFormModal]);

  // ─── RE-PRINT LOGIC (UTAMA) ───────────────────────────────────────────────
  const handleReprintScan = useCallback(() => {
    if (!reprintScanCode.trim()) return;
    const code = reprintScanCode.trim().toLowerCase();

    const match = (dailyPermits || []).find(p =>
      p.id.toLowerCase() === code ||
      String(p.SiswaAkademik?.siswa?.nis || '').toLowerCase() === code ||
      String(p.SiswaAkademik?.siswa?.no_rfid || '').toLowerCase() === code
    );

    if (match) {
      setReprintPermit(match);
      setReprintResult('found');
      toast.success(`Izin ditemukan: ${match.SiswaAkademik?.siswa?.nama_siswa}`);
    } else {
      setReprintPermit(null);
      setReprintResult('notfound');
      toast.error('Data izin tidak ditemukan untuk kode/NIS tersebut.');
    }
  }, [reprintScanCode, dailyPermits]);

  const handleReprintExecute = useCallback(async (permitToPrint: IzinKeluarSiswa) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(permitToPrint.id, { margin: 1, width: 150 });
      setPrintedPermit({ ...permitToPrint, qrCodeUrl: qrDataUrl });
    } catch {
      setPrintedPermit(permitToPrint);
    }
    toast.success(`Mencetak ulang slip izin untuk ${permitToPrint.SiswaAkademik?.siswa?.nama_siswa || 'Siswa'}`);
    setTimeout(() => {
      window.print();
      setPrintedPermit(null);
    }, 300);
  }, [setPrintedPermit]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* ─── KOLOM KIRI: SCANNER & FORM TRIGGER ──────────────────────────────── */}
      <div className="lg:col-span-5 space-y-6">
        <Card className="p-6 border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/60 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
              <Scan size={14} className={personaMode === 'JURUSAN' ? 'text-emerald-500' : 'text-indigo-500'} />
              {personaMode === 'JURUSAN' ? 'Input Izin Jurusan' : 'Input Izin Utama'}
            </h3>
            <span
              title={
                personaMode === 'JURUSAN'
                  ? 'Scan RFID/QR atau cari siswa untuk rujukan izin jurusan'
                  : 'Scan RFID/QR atau cari siswa untuk izin keluar/pulang awal'
              }
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-help"
            >
              <Info size={14} />
            </span>
          </div>

          <SmartStudentPicker
            inputRef={scannerInputRef}
            onSelect={(s) => {
              if (s) openFormModal(s);
            }}
            onSelectStudent={(s) => {
              if (s) openFormModal(s);
            }}
            placeholder="Scan RFID / QR / Ketik Nama Siswa..."
          />

          {/* Opsi Ukuran Kertas (Khusus Utama) */}
          {personaMode === 'UTAMA' && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
              <SimpleFormField label="Ukuran Kertas Slip" htmlFor="paper-size-select">
                <select
                  id="paper-size-select"
                  value={printPaperSize}
                  onChange={(e) => setPrintPaperSize(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 focus:border-indigo-500 outline-none"
                >
                  <option value="58mm">Thermal Mini (58mm)</option>
                  <option value="80mm">Thermal Standard (80mm)</option>
                  <option value="a6">Stiker / Slip Kecil (A6)</option>
                  <option value="a5">Slip Administrasi (A5)</option>
                  <option value="a4">Surat Resmi Kesiswaan (A4)</option>
                </select>
              </SimpleFormField>
            </div>
          )}
        </Card>

        {/* UTAMA: Scan & Re-print dari Jurusan */}
        {personaMode === 'UTAMA' && (
          <Card className="p-5 border-none shadow-lg bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <h3 className="text-xs font-black uppercase tracking-widest text-indigo-300 flex items-center gap-2 mb-2">
              <RefreshCw size={13} className="text-indigo-400" /> Cetak Ulang Slip Jurusan
            </h3>
            <p className="text-[10px] text-white/50 mb-4 leading-relaxed">
              Scan QR/RFID/NIS siswa yang sudah punya izin dari Pos Jurusan untuk cetak ulang slip.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={13} />
                <input
                  ref={reprintInputRef}
                  type="text"
                  value={reprintScanCode}
                  onChange={e => setReprintScanCode(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleReprintScan(); } }}
                  placeholder="Scan QR / RFID / Ketik NIS…"
                  aria-label="Scan QR atau Ketik NIS untuk Cetak Ulang"
                  className="w-full h-10 pl-9 pr-3 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-indigo-400"
                  autoComplete="off"
                />
              </div>
              <Button
                type="button"
                onClick={handleReprintScan}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-10 px-4 rounded-xl text-xs flex items-center gap-1.5 shrink-0"
              >
                <Search size={13} /> Cari
              </Button>
            </div>

            {/* Result scan reprint */}
            {reprintResult === 'found' && reprintPermit && (
              <div className="mt-3 p-3 bg-emerald-500/20 border border-emerald-400/30 rounded-xl flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-black text-xs text-emerald-300 truncate">
                    {reprintPermit.SiswaAkademik?.siswa?.nama_siswa}
                  </div>
                  <div className="text-[10px] text-white/70">
                    {reprintPermit.SiswaAkademik?.kelas?.nama_kelas} • {reprintPermit.tipe_izin}
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => handleReprintExecute(reprintPermit)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0"
                >
                  <Printer size={12} /> Cetak
                </Button>
              </div>
            )}
            {reprintResult === 'notfound' && (
              <p className="mt-2 text-[10px] text-rose-300 font-bold">
                ⚠️ Data izin tidak ditemukan untuk kode "{reprintScanCode}".
              </p>
            )}
          </Card>
        )}
      </div>

      {/* ─── KOLOM KANAN: PANEL PERSONA ADAPTIF (UTAMA vs JURUSAN) ────────────── */}
      <div className="lg:col-span-7 h-full">
        {personaMode === 'JURUSAN' ? (
          <PiketJurusanPanel
            jurusanFilteredPermits={jurusanFilteredPermits}
            exitedGateIds={exitedGateIds}
            namaJurusan={namaJurusan}
            onRefresh={fetchPermits}
          />
        ) : (
          <PiketUtamaPanel
            pendingJurusanPermits={pendingJurusanPermits}
            issuedPermits={issuedPermits}
            dailyPermits={dailyPermits}
            exitedGateIds={exitedGateIds}
            onOpenFormModalWithStudent={openFormModal}
            onReprintExecute={handleReprintExecute}
          />
        )}
      </div>

      {/* ─── FORM MODAL SUB-COMPONENT ────────────────────────────────────────── */}
      <PiketFormModal
        isOpen={isFormModalOpen}
        onClose={closeFormModal}
        selectedStudent={selectedStudent}
        onSelectStudent={setSelectedStudent}
        tipeIzin={tipeIzin}
        onTipeIzinChange={handleTipeIzinChange}
        alasan={alasan}
        onAlasanChange={setAlasan}
        quickReasons={quickReasons}
        onSubmit={handleCreatePermit}
        savingPermit={savingPermit}
        enablePrint={enablePrint}
        onEnablePrintChange={setEnablePrint}
        personaMode={personaMode}
        accentColor={accentColor}
      />
    </div>
  );
});
