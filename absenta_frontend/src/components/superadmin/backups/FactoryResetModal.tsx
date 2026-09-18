import React, { useState } from 'react';
import { 
  AlertOctagon, 
  AlertTriangle, 
  ShieldAlert, 
  Loader2, 
  Trash2, 
  RotateCcw,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { Modal, Button, Input, Label } from '@/components/ui';
import toast from 'react-hot-toast';
import { backupApi } from '@/api/superadmin-backups.api';

interface FactoryResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const FactoryResetModal: React.FC<FactoryResetModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const REQUIRED_KEYWORD = 'RESET PABRIK ABSENTA';
  const isMatch = confirmationInput.trim() === REQUIRED_KEYWORD;

  const handleReset = async () => {
    if (!isMatch) {
      toast.error(`Ketik tepat "${REQUIRED_KEYWORD}" untuk mengonfirmasi tindakan.`);
      return;
    }

    setIsResetting(true);
    const toastId = toast.loading('Sedang melakukan auto-backup, membersihkan sekolah, dan menyiapkan baseline...');

    try {
      const res = await backupApi.factoryResetToFreshBaseline(confirmationInput.trim());
      if (res.success) {
        toast.success(res.message || 'Sistem berhasil direset ke kondisi pabrik!', { id: toastId, duration: 6000 });
        setConfirmationInput('');
        onSuccess();
        onClose();
      } else {
        toast.error(res.message || 'Gagal mereset sistem ke kondisi pabrik', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal mereset sistem', { id: toastId });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isResetting && onClose()}
      title="Reset ke Fresh Deploy (Kondisi Pabrik)"
      className="max-w-lg w-full"
      contentClassName="p-4 sm:p-6 w-full max-w-full min-w-0"
    >
      <div className="space-y-4 text-xs">
        {/* Banner Peringatan Kritis */}
        <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-start gap-3 text-rose-900 dark:text-rose-200">
          <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1.5 leading-relaxed">
            <span className="font-bold text-sm text-rose-700 dark:text-rose-400 block">
              PERHATIAN: Tindakan Destruktif & Permanen
            </span>
            <p className="text-[11px] text-rose-800 dark:text-rose-300">
              Proses ini akan <strong>menghapus seluruh data sekolah</strong> (guru, siswa, absensi, spp, transaksi, dan dokumen) yang ada di luar tenant <code className="font-mono font-bold bg-rose-100 dark:bg-rose-900/60 px-1 py-0.5 rounded">system</code>.
            </p>
          </div>
        </div>

        {/* Garansi Keamanan & Hasil Akhir */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/70 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Jaminan Proteksi & Kondisi Pasca-Reset:
          </span>
          <ul className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
            <li className="flex items-center gap-2">
              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
              <span><strong>Auto-Safety Backup</strong>: Sistem otomatis membuat arsip cadangan sekolah ke MinIO/R2 sebelum data dibersihkan.</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
              <span><strong>Master Presets Siap</strong>: Kurikulum Merdeka, Sarpras, Jurusan, Mapel, dan Kebijakan RBAC tetap utuh dan tersemai bersih.</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
              <span><strong>Akun Superadmin Aktif</strong>: Akses masuk <code className="font-mono bg-slate-200 dark:bg-slate-800 px-1 rounded">superadmin@system.com</code> (pass: <code className="font-mono bg-slate-200 dark:bg-slate-800 px-1 rounded">superadmin123</code>).</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
              <span><strong>Golden Snapshot Otomatis</strong>: Tercipta arsip baseline di tabel backup yang siap dipulihkan kapan pun.</span>
            </li>
          </ul>
        </div>

        {/* Form Verifikasi Kata Kunci */}
        <div className="space-y-2 pt-1">
          <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Ketik teks konfirmasi berikut untuk membuka proteksi:
          </Label>
          <div className="p-2 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-center font-mono font-black text-rose-600 dark:text-rose-400 text-xs tracking-wider select-all border border-dashed border-rose-300 dark:border-rose-900">
            {REQUIRED_KEYWORD}
          </div>
          <Input
            value={confirmationInput}
            onChange={(e) => setConfirmationInput(e.target.value)}
            placeholder={`Ketik "${REQUIRED_KEYWORD}"`}
            className={`font-mono text-xs ${
              isMatch 
                ? 'border-emerald-500 ring-1 ring-emerald-500/20' 
                : confirmationInput.length > 0 
                  ? 'border-rose-400' 
                  : ''
            }`}
            disabled={isResetting}
          />
        </div>

        {/* Tombol Aksi */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isResetting}
            className="h-9 text-xs cursor-pointer"
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleReset}
            disabled={!isMatch || isResetting}
            className="h-9 text-xs font-bold gap-1.5 bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
          >
            {isResetting ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
            {isResetting ? 'Mereset Sistem ke Kondisi Pabrik...' : 'Eksekusi Reset Pabrik'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
