import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '../../ui';

export const PRESET_REJECTION_REASONS = [
  {
    id: 'capacity',
    title: 'Kapasitas Pembayaran Melebihi Batas',
    desc: 'Rasio cicilan bulanan melebihi batas kemampuan atau potongan gaji (take-home pay).'
  },
  {
    id: 'savings',
    title: 'Saldo Simpanan Tidak Mencukupi',
    desc: 'Total simpanan belum memenuhi rasio minimal jaminan kredit sesuai AD/ART koperasi.'
  },
  {
    id: 'tenure',
    title: 'Masa Keanggotaan Belum Memenuhi Syarat',
    desc: 'Masa aktif keanggotaan pemohon belum mencapai batas waktu minimal pengajuan kredit.'
  },
  {
    id: 'docs',
    title: 'Dokumen / Berkas Persyaratan Tidak Lengkap',
    desc: 'Surat permohonan, slip penghasilan, atau dokumen pendukung lain belum lengkap.'
  },
  {
    id: 'history',
    title: 'Riwayat Kolektibilitas Kurang Lancar',
    desc: 'Masih memiliki kewajiban cicilan lain atau riwayat pelunasan sebelumnya kurang lancar.'
  },
  {
    id: 'other',
    title: 'Lainnya (Ketik Alasan Khusus)',
    desc: 'Alasan khusus yang ditentukan oleh komite kredit pengurus koperasi.'
  }
];

interface RejectLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isLoading?: boolean;
  memberName?: string;
  loanAmount?: string | number;
}

export const RejectLoanModal: React.FC<RejectLoanModalProps> = React.memo(({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  memberName,
  loanAmount,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>(PRESET_REJECTION_REASONS[0].title);
  const [customNote, setCustomNote] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const isOther = selectedPreset === 'Lainnya (Ketik Alasan Khusus)';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isOther && !customNote.trim()) {
      setErrorMsg('Harap ketikkan alasan penolakan secara spesifik.');
      return;
    }

    let finalReason = selectedPreset;
    if (isOther) {
      finalReason = customNote.trim();
    } else if (customNote.trim()) {
      finalReason = `${selectedPreset} — ${customNote.trim()}`;
    }

    setErrorMsg('');
    onConfirm(finalReason);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-955/80 backdrop-blur-sm animate-in fade-in duration-200"
      aria-labelledby="reject-loan-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-rose-600 to-rose-700 text-white shrink-0 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-inner">
              <AlertTriangle size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <h3 id="reject-loan-title" className="text-sm sm:text-base font-black tracking-tight text-white">
                Tolak Pengajuan Pinjaman
              </h3>
              <p className="text-[11px] text-rose-100 mt-0.5">
                Sertakan alasan penolakan resmi untuk transparansi anggota &amp; arsip audit
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
            {/* Applicant brief info */}
            {(memberName || loanAmount) && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Pemohon</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-100">{memberName || 'Anggota'}</span>
                </div>
                {loanAmount && (
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Nominal Pinjaman</span>
                    <span className="font-black text-rose-600 dark:text-rose-400">
                      Rp {Number(loanAmount).toLocaleString('id-ID')}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Presets List */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                Pilih Alasan Penolakan Standar
              </label>
              <div className="space-y-2">
                {PRESET_REJECTION_REASONS.map((preset) => {
                  const isSelected = selectedPreset === preset.title;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => {
                        setSelectedPreset(preset.title);
                        setErrorMsg('');
                      }}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                        isSelected 
                          ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 shadow-xs' 
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                        isSelected 
                          ? 'border-rose-600 bg-rose-600 text-white' 
                          : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className={`font-bold block ${isSelected ? 'text-rose-900 dark:text-rose-200' : 'text-slate-700 dark:text-slate-300'}`}>
                          {preset.title}
                        </span>
                        <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-0.5 leading-tight">
                          {preset.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Additional / Custom Notes */}
            <div className="space-y-1.5 pt-1">
              <label htmlFor="rejection-custom-notes" className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                {isOther ? 'Ketikkan Alasan Penolakan Khusus (Wajib)' : 'Catatan Tambahan untuk Anggota (Opsional)'}
              </label>
              <textarea
                id="rejection-custom-notes"
                value={customNote}
                onChange={(e) => {
                  setCustomNote(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                rows={2}
                placeholder={isOther ? 'Contoh: Belum memenuhi masa kerja minimal 1 tahun di sekolah...' : 'Contoh: Silakan ajukan kembali setelah menambah simpanan sukarela minimal Rp 500.000...'}
                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-rose-500 resize-none font-medium"
              />
              {errorMsg && (
                <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                  {errorMsg}
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-955/20 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 justify-end shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isLoading}
              className="w-full sm:w-auto rounded-xl text-xs font-bold text-slate-500 py-2"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              size="sm"
              className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs py-2 shadow-md shadow-rose-600/10"
            >
              {isLoading ? 'Memproses...' : 'Tolak Pengajuan Ini'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
});

RejectLoanModal.displayName = 'RejectLoanModal';
