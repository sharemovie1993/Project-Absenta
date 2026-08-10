import React, { useState } from 'react';
import { Modal, ModalFooter, Button } from '../ui';
import { Phone, CheckCircle2, AlertTriangle, RefreshCw, Smartphone, ShieldCheck, Info } from 'lucide-react';
import toast from 'react-hot-toast';

interface WaNormalizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'siswa' | 'guru';
  onRunNormalization: () => Promise<{
    success: boolean;
    message: string;
    data?: { total: number; updated: number; unchanged: number; invalid: number };
  }>;
  onSuccessRefresh?: () => void;
}

export const WaNormalizationModal: React.FC<WaNormalizationModalProps> = ({
  isOpen,
  onClose,
  targetType,
  onRunNormalization,
  onSuccessRefresh,
}) => {
  const [loading, setLoading] = useState(false);
  const [resultData, setResultData] = useState<{
    total: number;
    updated: number;
    unchanged: number;
    invalid: number;
  } | null>(null);

  const titleText = targetType === 'siswa' ? 'Normalisasi No WA Siswa & Ortu' : 'Normalisasi No WA Guru';

  const handleExecute = async () => {
    try {
      setLoading(true);
      setResultData(null);
      const res = await onRunNormalization();
      if (res.success && res.data) {
        setResultData(res.data);
        toast.success(res.message || 'Normalisasi No WA berhasil dijalankan!');
        onSuccessRefresh?.();
      } else {
        toast.error(res.message || 'Gagal menjalankan normalisasi nomor WhatsApp');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Terjadi kesalahan saat normalisasi nomor WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setResultData(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={titleText} size="lg">
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-200 dark:border-emerald-900/30 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">
                Pembersihan & Format Standar WhatsApp
              </h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                {targetType === 'siswa'
                  ? 'Format seluruh nomor HP siswa & orang tua akan disesuaikan ke format standar (08xxx).'
                  : 'Format seluruh nomor HP guru akan disesuaikan ke format standar (08xxx).'}
              </p>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-emerald-100 dark:border-emerald-900/20 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Menghapus karakter non-angka seperti spasi, strip (`-`), titik, dan simbol tambahan.</span>
            </div>
            <div className="flex items-start gap-2">
              <Smartphone className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Mengubah awalan kode negara (`+62`, `62`, `8`) menjadi format standar `08xxxxxxxxxx`.</span>
            </div>
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Secara otomatis memperbarui cache akademik & user untuk menjaga sinkronisasi data presensi & chatbot.</span>
            </div>
          </div>
        </div>

        {resultData && (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              📊 Ringkasan Hasil Normalisasi
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Diproses</span>
                <span className="text-lg font-black text-slate-800 dark:text-slate-100">{resultData.total}</span>
              </div>
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-xl text-center">
                <span className="block text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Diperbarui</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{resultData.updated}</span>
              </div>
              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 rounded-xl text-center">
                <span className="block text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Sudah Rapi</span>
                <span className="text-lg font-black text-blue-600 dark:text-blue-400">{resultData.unchanged}</span>
              </div>
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl text-center">
                <span className="block text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Tidak Valid</span>
                <span className="text-lg font-black text-amber-600 dark:text-amber-400">{resultData.invalid}</span>
              </div>
            </div>
          </div>
        )}

        <ModalFooter className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {resultData ? 'Selesai' : 'Batal'}
          </Button>
          {!resultData && (
            <Button
              variant="primary"
              onClick={handleExecute}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Memproses Normalisasi...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Jalankan Normalisasi Massal
                </>
              )}
            </Button>
          )}
        </ModalFooter>
      </div>
    </Modal>
  );
};
