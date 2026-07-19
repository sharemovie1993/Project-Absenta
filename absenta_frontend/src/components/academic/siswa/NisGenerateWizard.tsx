import React, { useState, useEffect, useCallback } from 'react';
import { GripVertical, ArrowUp, ArrowDown, Sparkles, RefreshCw, CheckCircle2, AlertTriangle, Users, ChevronRight } from 'lucide-react';
import { Modal, Button, ModalFooter } from '../../ui';
import { getNisWizardPreview, generateNisMassal, type NisWizardKelas } from '../../../api/academic/siswa.api';
import toast from 'react-hot-toast';

interface NisGenerateWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type WizardStep = 'loading' | 'arrange' | 'confirm' | 'result';

interface WizardResult {
  generated: number;
  skipped: number;
  errors: { siswaId: string; nama: string; reason: string }[];
}

export const NisGenerateWizard: React.FC<NisGenerateWizardProps> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState<WizardStep>('loading');
  const [kelasList, setKelasList] = useState<NisWizardKelas[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<WizardResult | null>(null);
  const [yearPrefix, setYearPrefix] = useState('');

  // Load data when wizard opens
  useEffect(() => {
    if (!isOpen) return;
    setStep('loading');
    setResult(null);

    getNisWizardPreview().then(res => {
      if (res.success && res.data) {
        setKelasList(res.data);
        // Detect year prefix from current year
        const now = new Date();
        const y1 = String(now.getFullYear()).slice(-2);
        const y2 = String(now.getFullYear() + 1).slice(-2);
        setYearPrefix(`${y1}${y2}1`);
        setStep('arrange');
      } else {
        toast.error('Gagal memuat data kelas');
        onClose();
      }
    }).catch(() => {
      toast.error('Gagal memuat data kelas');
      onClose();
    });
  }, [isOpen]);

  // Move kelas up in the list
  const moveUp = useCallback((index: number) => {
    if (index === 0) return;
    setKelasList(prev => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }, []);

  // Move kelas down in the list
  const moveDown = useCallback((index: number) => {
    setKelasList(prev => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }, []);

  // Execute generation
  const handleExecute = async () => {
    setIsExecuting(true);
    try {
      const orderedKelasIds = kelasList.map(k => k.kelasId);
      const res = await generateNisMassal(orderedKelasIds);
      if (res.success && res.data) {
        setResult(res.data);
        setStep('result');
        if (res.data.generated > 0) onSuccess();
      } else {
        toast.error(res.message || 'Gagal generate NIS');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Gagal generate NIS');
    } finally {
      setIsExecuting(false);
    }
  };

  const totalSiswa = kelasList.reduce((sum, k) => sum + k.jumlahSiswa, 0);

  // Group by jurusan for display
  const groupedByJurusan = kelasList.reduce<Record<string, { jurusan: string; items: (NisWizardKelas & { originalIndex: number })[] }>>((acc, kelas, idx) => {
    const key = kelas.jurusanId ?? 'no-jurusan';
    if (!acc[key]) acc[key] = { jurusan: kelas.namaJurusan, items: [] };
    acc[key].items.push({ ...kelas, originalIndex: idx });
    return acc;
  }, {});

  const renderStepIndicator = () => (
    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
      {(['arrange', 'confirm', 'result'] as const).map((s, i) => {
        const labels = ['1. Susun Urutan', '2. Konfirmasi', '3. Selesai'];
        const isDone = (step === 'confirm' && i === 0) || (step === 'result' && i < 2);
        const isCurrent = step === s;
        return (
          <React.Fragment key={s}>
            {i > 0 && <ChevronRight size={10} className="text-slate-300 dark:text-slate-600" />}
            <span className={`px-2 py-0.5 rounded-full transition-colors ${
              isDone ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' :
              isCurrent ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400' :
              'text-slate-400'
            }`}>{labels[i]}</span>
          </React.Fragment>
        );
      })}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isExecuting && onClose()}
      size="lg"
      title={
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-50 dark:bg-violet-950/40 rounded-xl text-violet-600 dark:text-violet-400">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">
                Wizard Generate NIS Massal
              </h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Susun urutan kelas sebelum NIS digenerate
              </p>
            </div>
          </div>
          {step !== 'loading' && renderStepIndicator()}
        </div>
      }
    >
      <div className="min-h-[320px]">
        {/* STEP: LOADING */}
        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400">
            <RefreshCw size={28} className="animate-spin text-violet-500" />
            <p className="text-xs font-bold">Memuat data kelas...</p>
          </div>
        )}

        {/* STEP: ARRANGE */}
        {step === 'arrange' && (
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                  Urutkan kelas sesuai keinginan. NIS akan digenerate mengikuti urutan dari atas ke bawah.
                  Gunakan tombol ↑↓ untuk mengatur posisi kelas.
                </p>
              </div>
            </div>

            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {kelasList.map((kelas, index) => {
                const previewNisStart = `${yearPrefix}${String(
                  kelasList.slice(0, index).reduce((sum, k) => sum + k.jumlahSiswa, 0) + 1
                ).padStart(5, '0')}`;

                return (
                  <div
                    key={kelas.kelasId}
                    className="flex items-center gap-2 p-2.5 bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50 rounded-xl hover:border-violet-200 dark:hover:border-violet-800/40 transition-colors group"
                  >
                    {/* Rank Number */}
                    <span className="w-5 text-[10px] font-black text-slate-400 text-center shrink-0">{index + 1}</span>

                    {/* Grip icon */}
                    <GripVertical size={14} className="text-slate-300 dark:text-slate-600 shrink-0" />

                    {/* Kelas Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-700 dark:text-slate-200 truncate">{kelas.namaKelas}</span>
                        <span className="px-1.5 py-0.5 text-[9px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full uppercase shrink-0">
                          {kelas.namaJurusan}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Users size={9} className="text-slate-400" />
                        <span className="text-[9px] text-slate-400">{kelas.jumlahSiswa} siswa</span>
                        <span className="text-[9px] text-violet-500 dark:text-violet-400 font-bold ml-1">
                          → NIS mulai {previewNisStart}
                        </span>
                      </div>
                    </div>

                    {/* Move buttons */}
                    <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                      >
                        <ArrowUp size={12} className="text-slate-500" />
                      </button>
                      <button
                        onClick={() => moveDown(index)}
                        disabled={index === kelasList.length - 1}
                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                      >
                        <ArrowDown size={12} className="text-slate-500" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[10px] text-slate-400 font-bold">
                Total: <span className="text-slate-700 dark:text-slate-300">{totalSiswa} siswa</span> dari{' '}
                <span className="text-slate-700 dark:text-slate-300">{kelasList.length} kelas</span>
              </p>
            </div>
          </div>
        )}

        {/* STEP: CONFIRM */}
        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="p-4 bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-900/40 rounded-xl space-y-1">
              <p className="text-xs font-black text-violet-700 dark:text-violet-300 uppercase tracking-tight">Ringkasan Generate NIS</p>
              <p className="text-[11px] text-violet-600 dark:text-violet-400">
                Sistem akan men-generate <strong>{totalSiswa} NIS resmi</strong> untuk{' '}
                <strong>{kelasList.length} kelas</strong> dengan urutan berikut:
              </p>
            </div>

            <div className="space-y-1 max-h-64 overflow-y-auto">
              {kelasList.map((kelas, index) => {
                const startSeq = kelasList.slice(0, index).reduce((sum, k) => sum + k.jumlahSiswa, 0) + 1;
                const endSeq = startSeq + kelas.jumlahSiswa - 1;
                return (
                  <div key={kelas.kelasId} className="flex items-center gap-2.5 px-3 py-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                    <span className="text-[10px] font-black text-slate-400 w-5 text-center">{index + 1}</span>
                    <div className="flex-1">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{kelas.namaKelas}</span>
                      <span className="ml-2 text-[10px] text-slate-400">({kelas.namaJurusan})</span>
                    </div>
                    <span className="text-[10px] font-black text-violet-600 dark:text-violet-400">
                      {yearPrefix}{String(startSeq).padStart(5, '0')} – {yearPrefix}{String(endSeq).padStart(5, '0')}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="text-[10px] text-slate-500 dark:text-slate-400 italic text-center">
              ⚠️ Proses ini tidak dapat dibatalkan setelah dijalankan.
            </p>
          </div>
        )}

        {/* STEP: RESULT */}
        {step === 'result' && result && (
          <div className="flex flex-col items-center justify-center gap-4 py-6">
            <div className={`p-4 rounded-2xl ${result.generated > 0 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-amber-50 dark:bg-amber-950/30'}`}>
              <CheckCircle2 size={40} className={result.generated > 0 ? 'text-emerald-500' : 'text-amber-500'} />
            </div>
            <div className="text-center space-y-1">
              <p className="text-lg font-black text-slate-800 dark:text-white">
                {result.generated > 0 ? 'Generate Berhasil!' : 'Tidak Ada Yang Diproses'}
              </p>
              <p className="text-sm text-slate-500">
                <span className="text-emerald-600 font-bold">{result.generated} NIS berhasil</span>
                {result.skipped > 0 && <span className="text-amber-600 font-bold">, {result.skipped} dilewati</span>}
              </p>
            </div>
            {result.errors.length > 0 && (
              <div className="w-full p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl max-h-32 overflow-y-auto">
                {result.errors.slice(0, 5).map((e, i) => (
                  <p key={i} className="text-[10px] text-red-600 dark:text-red-400">{e.nama}: {e.reason}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <ModalFooter className="pt-4 border-t border-slate-100 dark:border-slate-800">
        {step === 'arrange' && (
          <>
            <Button variant="outline" onClick={onClose} className="rounded-xl text-[10px] font-bold uppercase tracking-widest">
              Batal
            </Button>
            <Button
              onClick={() => setStep('confirm')}
              disabled={kelasList.length === 0}
              className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5"
            >
              Lanjut ke Konfirmasi <ChevronRight size={12} />
            </Button>
          </>
        )}
        {step === 'confirm' && (
          <>
            <Button variant="outline" onClick={() => setStep('arrange')} className="rounded-xl text-[10px] font-bold uppercase tracking-widest">
              ← Kembali
            </Button>
            <Button
              onClick={handleExecute}
              disabled={isExecuting}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
            >
              {isExecuting ? (
                <><RefreshCw size={12} className="animate-spin" /> Generating...</>
              ) : (
                <><Sparkles size={12} /> Jalankan Generate NIS</>
              )}
            </Button>
          </>
        )}
        {step === 'result' && (
          <Button onClick={onClose} className="rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest">
            Tutup
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
};
