import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { 
  CheckCircle2, 
  ShieldAlert, 
  Users, 
  CheckSquare, 
  Square, 
  QrCode,
  Volume2,
  Sparkles,
  FileText,
  Clock,
  Zap,
  Check
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Label } from '../../ui/Label';
import { kesiswaanApi, type Pelanggaran } from '../../../api/kesiswaan.api';
import { Loader } from '../../ui/Loader';
import { Badge } from '../../ui/Badge';

const Modal = lazy(() => import('../../ui/Modal').then(m => ({ default: m.Modal })));
const SmartStudentPicker = lazy(() => import('../../common/SmartStudentPicker').then(m => ({ default: m.SmartStudentPicker })));

interface TindakMasalPelanggaranModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Audio Beep helper for instant RFID feedback
const playSuccessBeep = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // Ignore audio error
  }
};

export const TindakMasalPelanggaranModal: React.FC<TindakMasalPelanggaranModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lateList, setLateList] = useState<Pelanggaran[]>([]);
  const [completedList, setCompletedList] = useState<string[]>([]);
  
  const [tindakanNotes, setTindakanNotes] = useState('Tindakan Pembinaan Lapangan Gerbang Selesai');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const processingTapRef = useRef<Set<string>>(new Set());

  // Fetch only late students needing discipline today
  const fetchLateViolations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await kesiswaanApi.getPelanggaran({ limit: 150 });
      const rawList: Pelanggaran[] = res?.data?.list || res?.data || (Array.isArray(res) ? res : []);
      
      // Filter ONLY tardiness cases needing discipline (BARU, PERLU_PEMBINAAN, PROSES)
      const tardyOnly = rawList.filter(item => 
        item.jenis_pelanggaran.toLowerCase().includes('terlambat') &&
        (item.status === 'BARU' || item.status === 'PERLU_PEMBINAAN' || item.status === 'PROSES')
      );

      setLateList(tardyOnly);
      setSelectedIds(tardyOnly.map(item => item.id));
    } catch {
      toast.error('Gagal mengambil daftar siswa terlambat');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchLateViolations();
    }
  }, [isOpen, fetchLateViolations]);

  // RFID Tap / Student Picker Handler for 1-by-1 Verification
  const handleVerifyStudentTap = useCallback(async (siswaObj: any) => {
    if (!siswaObj?.id) return;
    const siswaId = siswaObj.id;

    // Deduplicate rapid double calls (within 1.5s)
    if (processingTapRef.current.has(siswaId)) {
      return;
    }
    processingTapRef.current.add(siswaId);
    setTimeout(() => {
      processingTapRef.current.delete(siswaId);
    }, 1500);

    // Find tardiness record for this student
    const matchedRecord = lateList.find(item => 
      item.siswa_id === siswaId || 
      item.Siswa?.nis === siswaObj.nis ||
      item.Siswa?.nama_siswa === siswaObj.nama_siswa
    );

    if (!matchedRecord) {
      toast.error(`Siswa ${siswaObj.nama_siswa || ''} tidak ditemukan di daftar siswa terlambat yang memerlukan pembinaan.`);
      return;
    }

    if (completedList.includes(matchedRecord.id)) {
      toast(`${siswaObj.nama_siswa || 'Siswa'} sudah dikonfirmasi selesai pembinaan`, { icon: 'ℹ️' });
      return;
    }

    try {
      const updatedKeterangan = matchedRecord.keterangan 
        ? `${matchedRecord.keterangan} | [TINDAKAN]: ${tindakanNotes} (Verified via Tap RFID)`
        : `[TINDAKAN]: ${tindakanNotes} (Verified via Tap RFID)`;

      await kesiswaanApi.updatePelanggaran(matchedRecord.id, {
        status: 'SELESAI',
        keterangan: updatedKeterangan
      });

      playSuccessBeep();
      toast.success(`✅ ${matchedRecord.Siswa?.nama_siswa || 'Siswa'} - Pembinaan Selesai!`, { duration: 4000 });
      setCompletedList(prev => [...prev, matchedRecord.id]);

      // Refresh background queries
      queryClient.invalidateQueries({ queryKey: ['kesiswaan-monitoring-violations'] });
      queryClient.invalidateQueries({ queryKey: ['kesiswaan-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['kesiswaan-pelanggaran'] });
    } catch {
      toast.error(`Gagal meng-update status pembinaan ${siswaObj.nama_siswa || ''}`);
    }
  }, [lateList, completedList, tindakanNotes, queryClient]);

  // Bulk Resolve All Checked Students
  const handleSubmitBulkAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) {
      toast.error('Pilih minimal 1 siswa terlambat');
      return;
    }

    setSubmitting(true);
    try {
      const updatePromises = selectedIds.map(id => {
        const item = lateList.find(p => p.id === id);
        const updatedKeterangan = item?.keterangan 
          ? `${item?.keterangan} | [TINDAKAN]: ${tindakanNotes}` 
          : `[TINDAKAN]: ${tindakanNotes}`;

        return kesiswaanApi.updatePelanggaran(id, {
          status: 'SELESAI',
          keterangan: updatedKeterangan
        });
      });

      await Promise.all(updatePromises);
      playSuccessBeep();
      toast.success(`⚡ Berhasil mengonfirmasi pembinaan masal untuk ${selectedIds.length} siswa terlambat!`);

      queryClient.invalidateQueries({ queryKey: ['kesiswaan-monitoring-violations'] });
      queryClient.invalidateQueries({ queryKey: ['kesiswaan-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['kesiswaan-pelanggaran'] });
      queryClient.invalidateQueries({ queryKey: ['kesiswaan-pelanggaran-list'] });
      queryClient.invalidateQueries({ queryKey: ['kesiswaan-monitoring-stats'] });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memproses penindakan masal';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const remainingCount = lateList.length - completedList.length;

  return (
    <Suspense fallback={null}>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="⚡ Penindakan & Verifikasi Tap Kartu Siswa Terlambat"
        size="6xl"
      >
        <div className="py-1">
          {/* Header Progress Counter */}
          <div className="p-3.5 sm:p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between shadow-md mb-4">
            <div>
              <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest block">Antrean Siswa Terlambat Gerbang</span>
              <h3 className="text-lg sm:text-xl font-black tracking-tight mt-0.5">
                {completedList.length} <span className="text-slate-400 text-xs sm:text-sm font-bold">/ {lateList.length} Siswa Selesai Pembinaan</span>
              </h3>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sisa Pembinaan</span>
              <span className="text-base sm:text-lg font-black text-amber-400">{remainingCount} Siswa</span>
            </div>
          </div>

          {/* 2-Column Responsive Layout (1 column on mobile, 2 columns on desktop) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column: Scanner & Mass Form Actions */}
            <div className="lg:col-span-7 space-y-4">
              {/* RFID Tap Scanner Reader Field */}
              <div className="p-3.5 sm:p-4 bg-rose-50/30 dark:bg-rose-950/20 rounded-2xl border-2 border-dashed border-rose-200 dark:border-rose-900/40 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs font-black uppercase text-rose-700 dark:text-rose-400 tracking-wider flex items-center gap-1.5 truncate">
                    <QrCode size={16} className="animate-pulse text-rose-500 shrink-0" />
                    <span>Mode Tap RFID / Scan QR (Satu Per Satu)</span>
                  </Label>
                  <span className="text-[9px] font-black bg-rose-100 dark:bg-rose-950 text-rose-600 px-2 py-0.5 rounded-full uppercase shrink-0 hidden sm:inline">
                    Continuous Reader
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium hidden sm:block">
                  Tempelkan kartu RFID siswa yang sudah selesai pembinaan ke reader / kamera. Status pembinaan akan langsung terverifikasi BEEP! 🔊
                </p>

                <Suspense fallback={<Loader />}>
                  <SmartStudentPicker
                    onSelect={(siswa) => handleVerifyStudentTap(siswa)}
                  />
                </Suspense>
              </div>

              {/* Form Actions Notes & Mass Action */}
              <form onSubmit={handleSubmitBulkAll} className="space-y-3 pt-1">
                <Input
                  label="Catatan Form Tindakan Pembinaan"
                  value={tindakanNotes}
                  onChange={(e) => setTindakanNotes(e.target.value)}
                  placeholder="Bentuk tindakan pembinaan lapangan..."
                  required
                />
                
                <Button
                  type="submit"
                  disabled={submitting || lateList.length === 0}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl h-10 text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <CheckCircle2 size={16} />
                  <span>Verifikasi Massal Semua ({selectedIds.length} Siswa)</span>
                </Button>
              </form>
            </div>

            {/* Right Column: Interactive Queue List */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-3 bg-slate-50/50 dark:bg-slate-900/50 p-3.5 sm:p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="space-y-2 min-h-0 flex-1">
                <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400 tracking-wider px-1">
                  <span>Daftar Siswa ({lateList.length})</span>
                  <span>Tap/Klik untuk Manual</span>
                </div>

                {loading ? (
                  <div className="py-12 flex justify-center"><Loader /></div>
                ) : lateList.length === 0 ? (
                  <div className="py-12 text-center text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/50">
                    🎉 Seluruh siswa terlambat sudah selesai pembinaan!
                  </div>
                ) : (
                  <div className="max-h-[300px] lg:max-h-[360px] overflow-y-auto space-y-1.5 pr-1">
                    {lateList.map((item) => {
                      const isDone = completedList.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleVerifyStudentTap(item.Siswa || { id: item.siswa_id })}
                          className={`p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            isDone
                              ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-400 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                              isDone ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}>
                              {isDone ? <Check size={13} /> : '!'}
                            </div>
                            <div className="min-w-0">
                              <h4 className={`font-black text-xs uppercase truncate ${isDone ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                                {item.Siswa?.nama_siswa || 'Siswa'}
                              </h4>
                              <p className="text-[10px] text-slate-400 font-medium truncate">
                                {item.Siswa?.Kelas?.nama_kelas || '-'} • NIS: {item.Siswa?.nis || '-'}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0 pl-2">
                            {isDone ? (
                              <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                Selesai
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md uppercase">
                                Tap/Klik
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Close Button Footer */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="rounded-xl px-5 h-9 text-xs font-bold"
                >
                  Tutup Papan Penindakan
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </Suspense>
  );
};
