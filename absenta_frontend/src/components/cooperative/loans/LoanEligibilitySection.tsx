import React from 'react';
import { Link } from 'react-router-dom';
import { Award, CheckCircle } from 'lucide-react';
import { Button, SectionCard } from '../../ui';
import type { LoanDetailData } from './types';

interface LoanEligibilitySectionProps {
  loan: LoanDetailData;
  canApprove: boolean;
  canReject: boolean;
  onChangeStatus: (status: 'APPROVED' | 'REJECTED') => void;
}

export const LoanEligibilitySection: React.FC<LoanEligibilitySectionProps> = React.memo(({
  loan,
  canApprove,
  canReject,
  onChangeStatus,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 print:hidden w-full max-w-full min-w-0">
      {/* Collateral / Savings Guarantee & DTI Analysis */}
      <SectionCard className="lg:col-span-2 p-4 sm:p-6 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl space-y-4 shadow-xs w-full max-w-full min-w-0">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <Award size={16} className="text-indigo-600 shrink-0" /> 
            <span>Analisis Kelayakan &amp; Simpanan Anggota</span>
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Penilaian jaminan saldo simpanan internal koperasi untuk meminimalkan risiko kredit
          </p>
        </div>
        
        {/* Subgrid with Responsive sm: and md: breakpoints (Pilar 30) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full max-w-full min-w-0">
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100/50 dark:border-slate-800/30 min-w-0">
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total Simpanan</p>
            <h4 className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 mt-1 truncate">
              Rp {Math.round(loan.member.totalSavings || 0).toLocaleString('id-ID')}
            </h4>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100/50 dark:border-slate-800/30 min-w-0">
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Rasio Simpanan vs Pinjaman</p>
            {(() => {
              const amountVal = parseFloat(loan.amount);
              const savingsVal = loan.member.totalSavings || 0;
              const ratio = savingsVal > 0 ? Math.round((savingsVal / amountVal) * 100) : 0;
              let badgeColor = 'text-rose-600 bg-rose-50 dark:bg-rose-950/20';
              if (ratio >= 100) badgeColor = 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20';
              else if (ratio >= 50) badgeColor = 'text-amber-600 bg-amber-50 dark:bg-amber-950/20';

              return (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100">{ratio}%</span>
                  <span className={`px-2 py-0.5 text-[8px] font-bold rounded-full ${badgeColor}`}>
                    {ratio >= 100 ? 'Aman' : ratio >= 50 ? 'Sedang' : 'Tinggi'}
                  </span>
                </div>
              );
            })()}
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100/50 dark:border-slate-800/30 min-w-0">
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Riwayat Pinjaman Lain</p>
            <div className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 mt-1 truncate">
              {loan.member.loanHistory?.length || 0} Kali
            </div>
          </div>
        </div>

        {/* Savings Breakdown */}
        {loan.member.savingsBreakdown && loan.member.savingsBreakdown.length > 0 && (
          <div className="pt-2 w-full max-w-full min-w-0">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Rincian Saldo Simpanan</p>
            <div className="flex flex-wrap gap-2">
              {loan.member.savingsBreakdown?.map((s, idx) => (
                <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                  {s.categoryName}: Rp {Math.round(s.amount).toLocaleString('id-ID')}
                </span>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      {/* Approval Action Panel */}
      <SectionCard className="p-4 sm:p-6 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl flex flex-col justify-between shadow-xs w-full max-w-full min-w-0">
        <div className="space-y-3">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <CheckCircle size={16} className="text-emerald-600 shrink-0" /> 
            <span>Keputusan Pengurus</span>
          </h3>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            {loan.status === 'PENDING' 
              ? 'Harap tinjau kemampuan bayar anggota berdasarkan data kelayakan di samping sebelum menyetujui pengajuan ini.' 
              : `Pengajuan ini telah diputuskan dengan status final: ${loan.status}.`}
          </p>
        </div>

        {loan.status === 'PENDING' ? (
          <div className="space-y-3 mt-6 w-full max-w-full min-w-0">
            {canApprove && (
              <Button
                variant="success"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs flex justify-center items-center gap-1.5 shadow-xs"
                onClick={() => onChangeStatus('APPROVED')}
              >
                Setujui Pengajuan
              </Button>
            )}
            {canReject && (
              <Button
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-xs flex justify-center items-center gap-1.5 shadow-xs"
                onClick={() => onChangeStatus('REJECTED')}
              >
                Tolak Pengajuan
              </Button>
            )}
          </div>
        ) : (
          <div className="mt-6 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status Keputusan</p>
            <p className="text-xs font-black text-slate-800 dark:text-slate-100 mt-1 uppercase">
              {loan.status === 'APPROVED' ? 'DISETUJUI' : loan.status === 'REJECTED' ? 'DITOLAK' : 'LUNAS'}
            </p>
          </div>
        )}

        {/* Quick Navigation Links */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 w-full max-w-full min-w-0">
          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Navigasi Terkait</p>
          <div className="flex gap-2">
            <Link to={`/cooperative/savings?search=${loan.member.name}`} className="flex-1 min-w-0">
              <Button variant="outline" size="xs" className="w-full text-[10px] font-bold py-1.5 rounded-lg border-indigo-200 text-indigo-600 hover:bg-indigo-50 truncate">
                Buku Tabungan
              </Button>
            </Link>
            <Link to={`/cooperative/members?id=${loan.memberId}`} className="flex-1 min-w-0">
              <Button variant="outline" size="xs" className="w-full text-[10px] font-bold py-1.5 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50 truncate">
                Profil Anggota
              </Button>
            </Link>
          </div>
        </div>
      </SectionCard>
    </div>
  );
});

LoanEligibilitySection.displayName = 'LoanEligibilitySection';
