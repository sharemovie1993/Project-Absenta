import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { 
  CheckCircle2, 
  Clock, 
  User, 
  Users, 
  QrCode, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  AlertCircle,
  Radio
} from 'lucide-react';
import { getPresensiTerpaduSesi } from '../../../api/attendanceGerbang.api';
import { Modal, Badge, Button } from '../../ui';
import { ModuleSopTrigger } from '../../common/ModuleSopTrigger';
import { SmartStudentPicker, type Student } from '../../common/SmartStudentPicker';
import { SesiAttendanceList, type SesiAttendanceRecord, type SesiDetail } from './SesiAttendanceList';
import { cn } from '../../../lib/utils';

interface SesiScanningModalProps {
  isOpen: boolean;
  onClose: () => void;
  scannerInputRef: React.RefObject<HTMLInputElement>;
  scannerInput: string;
  setScannerInput: (val: string) => void;
  scanLoading: boolean;
  onSubmitScan: (overrideId?: string, isGuruFromUniversal?: boolean) => void;
  inputModalSesiId: string;
  sessionAttendanceRecords: SesiAttendanceRecord[];
  currentSession?: SesiDetail;
  kelasLabel: string;
}

interface LastTappedFeedback {
  id: string;
  nama: string;
  nis?: string;
  kelas?: string;
  status: string;
  waktuTap: string;
  isGuru?: boolean;
}

const SesiScanningModalComponent: React.FC<SesiScanningModalProps> = ({
  isOpen,
  onClose,
  scannerInputRef,
  scannerInput,
  setScannerInput,
  scanLoading,
  onSubmitScan,
  inputModalSesiId,
  sessionAttendanceRecords,
  currentSession,
  kelasLabel,
}) => {
  const [showFullList, setShowFullList] = useState<boolean>(false);
  const [lastTapped, setLastTapped] = useState<LastTappedFeedback | null>(null);

  // Reaktif dengan React Query — Kabel Tunggal Presensi Terpadu Detail
  const { data: presensiRes } = useQuery({
    queryKey: ['sesi-detail-attendance', inputModalSesiId],
    queryFn: () => getPresensiTerpaduSesi(inputModalSesiId),
    enabled: isOpen && !!inputModalSesiId,
    refetchInterval: 5000, // 5 detik auto refresh selama modal scan terbuka
  });

  const records: SesiAttendanceRecord[] = useMemo(() => {
    const raw = presensiRes?.data || presensiRes;
    const fetchedList = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);
    return fetchedList.length > 0 ? fetchedList : (sessionAttendanceRecords || []);
  }, [presensiRes, sessionAttendanceRecords]);

  // Hitung ringkasan cepat
  const stats = useMemo(() => {
    let hadir = 0;
    let terlambat = 0;
    let izinSakit = 0;
    let belumTap = 0;

    records.forEach((r) => {
      const s = String(r.status || '').toUpperCase();
      if (s === 'HADIR' || s === 'TEPAT_WAKTU') hadir++;
      else if (s === 'TERLAMBAT') terlambat++;
      else if (s === 'IZIN' || s === 'SAKIT' || s === 'DISPEN') izinSakit++;
      else belumTap++;
    });

    return {
      total: records.length,
      hadir,
      terlambat,
      izinSakit,
      belumTap,
    };
  }, [records]);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (scannerInputRef.current) {
          scannerInputRef.current.focus();
          scannerInputRef.current.select();
        }
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setLastTapped(null);
    }
  }, [isOpen, scannerInputRef]);

  const sessionLabel = currentSession?.mapel_nama || (currentSession as any)?.jenis_kegiatan_nama || (currentSession as any)?.jenis_kegiatan || 'Sesi KBM';
  const kelasInfo = (currentSession as any)?.kelas_nama || (currentSession as any)?.Kelas?.nama_kelas || kelasLabel || '';

  const handleStudentSelect = (item: Student) => {
    const isGuru = (item as unknown as { _type?: string })._type === 'guru';
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';

    setLastTapped({
      id: item.id,
      nama: item.nama || (item as any).nama_siswa || (item as any).nama_guru || 'Siswa',
      nis: item.nis || (item as any).nip || '',
      kelas: item.kelas || kelasInfo,
      status: 'HADIR',
      waktuTap: timeStr,
      isGuru,
    });

    onSubmitScan(item.id, isGuru);
  };

  const modalTitle = (
    <div className="flex items-center gap-2 whitespace-nowrap overflow-hidden">
      <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
        <QrCode size={16} />
      </div>
      <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white shrink-0">
        Terminal Scan RFID • <span className="text-blue-600 dark:text-blue-400">{sessionLabel}</span> {kelasInfo ? `(${kelasInfo})` : ''}
      </span>
      <ModuleSopTrigger moduleKey="kbm_absensi" buttonLabel="SOP" />
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      size="3xl"
      className="max-h-[96vh] w-[96vw] max-w-3xl mx-auto"
      contentClassName="max-h-[90vh] p-4 sm:p-6"
    >
      <div className="space-y-4">
        {/* ── 1. SCANNER INPUT (AUTO-FOCUS RFID / BARCODE) ── */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Radio size={14} className="text-emerald-500 animate-pulse" />
              Scanner Aktif & Siap Menerima Tap Kartu RFID / Barcode
            </span>
            {scanLoading && (
              <span className="text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Merekam presensi...
              </span>
            )}
          </div>

          <SmartStudentPicker
            id="session-scanner-input"
            ref={scannerInputRef}
            value={scannerInput}
            onChange={setScannerInput}
            placeholder="Tempelkan kartu RFID, scan barcode, atau ketik NIS / Nama..."
            disabled={scanLoading}
            mode="universal"
            onSelect={handleStudentSelect}
            scope="global"
          />
        </div>

        {/* ── 2. HERO FEEDBACK CARD (SISWA TERAKHIR DI-TAP) ── */}
        <div className="pt-1">
          <AnimatePresence mode="wait">
            {lastTapped ? (
              <motion.div
                key={lastTapped.id + lastTapped.waktuTap}
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/5 border-2 border-emerald-500/40 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-xl font-black shrink-0 shadow-md shadow-emerald-500/20">
                    <CheckCircle2 size={26} />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider">
                        TAP BERHASIL
                      </span>
                      {lastTapped.nis && (
                        <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                          NIS: {lastTapped.nis}
                        </span>
                      )}
                      {lastTapped.kelas && (
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          • {lastTapped.kelas}
                        </span>
                      )}
                    </div>
                    <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                      {lastTapped.nama}
                    </h4>
                  </div>
                </div>

                <div className="flex sm:flex-col items-end justify-between sm:justify-center shrink-0 border-t sm:border-t-0 sm:border-l border-emerald-500/20 pt-2 sm:pt-0 sm:pl-4">
                  <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Waktu Tap
                  </span>
                  <span className="text-xs sm:text-sm font-mono font-black text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                    <Clock size={13} />
                    {lastTapped.waktuTap}
                  </span>
                </div>
              </motion.div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-center space-y-1.5">
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 flex items-center justify-center mx-auto">
                  <Radio size={16} />
                </div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Belum ada siswa yang melakukan tap pada sesi ini
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Silakan tempelkan kartu RFID siswa pada scanner untuk mencatat presensi secara otomatis.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* ── 3. QUICK STATS SUMMARY & TOGGLE DAFTAR LENGKAP ── */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-mono font-extrabold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              Total: <strong>{stats.total}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-mono font-black border border-emerald-300 dark:border-emerald-700">
              Hadir: {stats.hadir}
            </span>
            {stats.terlambat > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-xs font-mono font-black border border-amber-300 dark:border-amber-700">
                Telat: {stats.terlambat}
              </span>
            )}
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-xs font-mono font-bold border border-slate-200 dark:border-slate-700">
              Belum Tap: <strong>{stats.belumTap}</strong>
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowFullList(!showFullList)}
            className="h-8 px-3 rounded-xl text-xs font-bold border-slate-300 dark:border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-100"
          >
            {showFullList ? (
              <>
                <ChevronUp size={14} />
                <span>Sembunyikan Daftar Siswa</span>
              </>
            ) : (
              <>
                <ChevronDown size={14} />
                <span>Lihat Daftar Siswa ({stats.total})</span>
              </>
            )}
          </Button>
        </div>

        {/* ── 4. COLLAPSIBLE STUDENT LIST ── */}
        <AnimatePresence>
          {showFullList && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-2 overflow-hidden border-t border-slate-100 dark:border-slate-800"
            >
              <div className="max-h-[40vh] sm:max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                <SesiAttendanceList 
                  records={records} 
                  sesi={currentSession}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
};

SesiScanningModalComponent.displayName = 'SesiScanningModal';
export const SesiScanningModal = React.memo(SesiScanningModalComponent);
