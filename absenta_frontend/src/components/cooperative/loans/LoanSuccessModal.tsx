import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  CheckCircle2, 
  Printer, 
  FileText, 
  Receipt, 
  ExternalLink, 
  X, 
  User, 
  Calendar, 
  DollarSign, 
  Percent, 
  Clock, 
  Check
} from 'lucide-react';
import { Button, Badge } from '../../ui';
import { PrintLoanAgreement } from './PrintLoanAgreement';
import { PrintLoanReceipt } from './PrintLoanReceipt';
import { PrintLoanCard } from './PrintLoanCard';
import type { LoanDetailData, CooperativeSettings } from './types';

interface LoanSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: any | null;
  coopSettings?: CooperativeSettings | null;
  onViewDetail?: (loanId: string) => void;
}

export const LoanSuccessModal: React.FC<LoanSuccessModalProps> = React.memo(({
  isOpen,
  onClose,
  loan,
  coopSettings,
  onViewDetail,
}) => {
  const [printTarget, setPrintTarget] = useState<'AGREEMENT' | 'RECEIPT' | 'CARD' | null>(null);

  // Trigger browser print dialog when printTarget is set
  useEffect(() => {
    if (printTarget) {
      const handleAfterPrint = () => {
        setPrintTarget(null);
      };
      window.addEventListener('afterprint', handleAfterPrint);
      const timer = setTimeout(() => {
        window.print();
      }, 150);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('afterprint', handleAfterPrint);
      };
    }
  }, [printTarget]);

  if (!isOpen || !loan) return null;

  // Unwrap loan data safely in case it is wrapped in an API response envelope
  const rawLoan = loan?.data?.id ? loan.data : (loan?.id ? loan : (loan?.data || loan));
  const isApproved = rawLoan.status === 'APPROVED';
  const amountNumber = parseFloat(rawLoan.amount) || 0;
  const durationMonths = Number(rawLoan.duration) || 12;
  const interestRateVal = parseFloat(rawLoan.interestRate) || 0;
  
  // Calculate flat monthly installment
  const totalInterest = Math.round(amountNumber * (interestRateVal / 100) * durationMonths);
  const totalRepayment = amountNumber + totalInterest;
  const monthlyInstallment = durationMonths > 0 
    ? (rawLoan.installments?.[0]?.amount ? Math.round(parseFloat(rawLoan.installments[0].amount)) : Math.round(totalRepayment / durationMonths))
    : 0;

  // Format prepared loan object for print templates
  const loanDataForPrint: LoanDetailData = {
    id: rawLoan.id,
    memberId: rawLoan.memberId,
    amount: String(rawLoan.amount),
    interestRate: String(rawLoan.interestRate),
    duration: durationMonths,
    status: rawLoan.status,
    createdAt: rawLoan.createdAt || new Date().toISOString(),
    member: {
      name: rawLoan.member?.name || rawLoan.member?.User?.full_name || rawLoan.member?.Siswa?.nama_siswa || rawLoan.member?.Guru?.nama_guru || 'Anggota Koperasi',
      memberNo: rawLoan.member?.memberNo || '-',
      userId: rawLoan.member?.userId || '',
    },
    installments: Array.isArray(rawLoan.installments) && rawLoan.installments.length > 0 
      ? rawLoan.installments 
      : Array.from({ length: durationMonths }).map((_, idx) => {
          const due = new Date();
          due.setMonth(due.getMonth() + idx + 1);
          return {
            id: `temp-${idx}`,
            amount: String(monthlyInstallment),
            dueDate: due.toISOString(),
            paidDate: null,
            status: 'UNPAID' as const
          };
        })
  };

  return createPortal(
    <>
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-955/80 backdrop-blur-sm animate-in fade-in duration-300 print:hidden"
        aria-labelledby="loan-success-title"
        role="dialog"
        aria-modal="true"
      >
        <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
          {/* Header Banner */}
          <div className={`p-6 border-b text-white shrink-0 ${isApproved ? 'bg-gradient-to-r from-emerald-600 to-teal-700 border-emerald-500/30' : 'bg-gradient-to-r from-indigo-600 to-violet-700 border-indigo-500/30'}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-inner">
                  {isApproved ? <CheckCircle2 size={24} className="stroke-[2.5]" /> : <Clock size={24} className="stroke-[2.5]" />}
                </div>
                <div>
                  <h3 id="loan-success-title" className="text-base font-black tracking-tight text-white">
                    {isApproved ? 'Pinjaman Berhasil Diterbitkan' : 'Pengajuan Pinjaman Tercatat'}
                  </h3>
                  <p className="text-xs text-white/80 mt-0.5">
                    {isApproved 
                      ? 'Status pinjaman AKTIF. Jurnal kas telah dibukukan otomatis.' 
                      : 'Menunggu peninjauan & persetujuan komite pengurus.'}
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
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            {/* Member & Loan Summary Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <User size={16} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Peminjam</span>
                    <span className="text-sm font-black text-slate-800 dark:text-slate-100 truncate block">
                      {loan.member?.name || 'Anggota'}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">No. Anggota</span>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 font-mono">
                    {loan.member?.memberNo || '-'}
                  </span>
                </div>
              </div>

              {/* Loan Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold block flex items-center gap-1">
                    <DollarSign size={11} className="text-emerald-500" /> Plafon Pinjaman
                  </span>
                  <span className="text-sm font-black text-slate-800 dark:text-slate-100 mt-0.5 block">
                    Rp {amountNumber.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold block flex items-center gap-1">
                    <Calendar size={11} className="text-indigo-500" /> Tenor & Bunga
                  </span>
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 mt-0.5 block">
                    {durationMonths} Bulan • {interestRateVal}% / bln
                  </span>
                </div>

                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold block flex items-center gap-1">
                    <Percent size={11} className="text-amber-500" /> Angsuran per Bulan
                  </span>
                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-0.5 block">
                    Rp {monthlyInstallment.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold block">Status Berkas</span>
                  <div className="mt-1">
                    <Badge 
                      variant={isApproved ? 'success' : 'warning'}
                      className="font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider"
                    >
                      {isApproved ? 'Aktif (Disetujui)' : 'Menunggu (Pending)'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Print Quick Actions (Front-Office SOP Koperasi) */}
            {isApproved ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Cetak Berkas Operasional (Kasir & Akad)
                  </h4>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                    <Check size={12} /> Siap Dicetak
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Cetak Akad Pinjaman */}
                  <button
                    type="button"
                    onClick={() => setPrintTarget('AGREEMENT')}
                    className="flex flex-col items-center justify-center p-3 text-center rounded-2xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-1.5 shadow-sm group-hover:scale-110 transition-transform">
                      <FileText size={16} />
                    </div>
                    <span className="text-[11px] font-bold block leading-tight">Surat Akad (SPK)</span>
                    <span className="text-[9px] text-indigo-500/80 mt-0.5">Tanda tangan anggota</span>
                  </button>

                  {/* Cetak Kuitansi Pencairan */}
                  <button
                    type="button"
                    onClick={() => setPrintTarget('RECEIPT')}
                    className="flex flex-col items-center justify-center p-3 text-center rounded-2xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-1.5 shadow-sm group-hover:scale-110 transition-transform">
                      <Receipt size={16} />
                    </div>
                    <span className="text-[11px] font-bold block leading-tight">Kuitansi Kasir</span>
                    <span className="text-[9px] text-emerald-500/80 mt-0.5">Bukti serah kas</span>
                  </button>

                  {/* Cetak Kartu Kendali */}
                  <button
                    type="button"
                    onClick={() => setPrintTarget('CARD')}
                    className="flex flex-col items-center justify-center p-3 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-slate-700 dark:bg-slate-600 text-white flex items-center justify-center mb-1.5 shadow-sm group-hover:scale-110 transition-transform">
                      <Printer size={16} />
                    </div>
                    <span className="text-[11px] font-bold block leading-tight">Kartu Kendali</span>
                    <span className="text-[9px] text-slate-400 mt-0.5">Kartu cicilan fisik</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200/80 dark:border-amber-800/80 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                Pengajuan telah masuk ke antrean verifikasi. Dokumen akad dan kuitansi pencairan dapat dicetak setelah pengajuan disetujui oleh pengurus koperasi.
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-955/20 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end shrink-0">
            {onViewDetail && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onViewDetail(loan.id);
                }}
                className="w-full sm:w-auto rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 py-2 inline-flex items-center justify-center gap-1.5"
              >
                <ExternalLink size={13} />
                Buka Berkas Lengkap
              </Button>
            )}
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={onClose}
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-xl text-xs py-2 shadow-sm"
            >
              Selesai & Tutup
            </Button>
          </div>
        </div>
      </div>

      {/* Media Print Portal & CSS Hardening */}
      {printTarget && createPortal(
        <>
          {printTarget === 'AGREEMENT' && (
            <PrintLoanAgreement 
              loan={loanDataForPrint} 
              coopSettings={coopSettings} 
            />
          )}
          {printTarget === 'RECEIPT' && (
            <PrintLoanReceipt 
              loan={loanDataForPrint} 
              coopSettings={coopSettings} 
            />
          )}
          {printTarget === 'CARD' && (
            <PrintLoanCard 
              loan={loanDataForPrint} 
              remainingBalance={totalRepayment} 
              coopSettings={coopSettings} 
            />
          )}
        </>,
        document.body
      )}

      {/* Print CSS Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          #root {
            display: none !important;
          }
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #print-loan-card, #print-loan-agreement, #print-loan-receipt {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
          }
        }
      `}} />
    </>,
    document.body
  );
});

LoanSuccessModal.displayName = 'LoanSuccessModal';
