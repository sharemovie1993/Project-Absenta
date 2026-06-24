import React from 'react';
import { Clock, ShieldAlert } from 'lucide-react';
import type { StudentMetrics } from './types';

interface LoanRestrictionsAlertsProps {
  isStudent: boolean;
  studentMetrics: StudentMetrics | null;
}

export const LoanRestrictionsAlerts = React.memo<LoanRestrictionsAlertsProps>(({
  isStudent,
  studentMetrics,
}) => {
  if (!isStudent || !studentMetrics) return null;

  return (
    <>
      {studentMetrics.hasActiveLoan && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl animate-in fade-in slide-in-from-top-1 duration-300">
          <div className="shrink-0 mt-0.5">
            <ShieldAlert size={18} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider">
              Pengajuan Pinjaman Baru Tidak Tersedia
            </p>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
              Anda masih memiliki <strong>pinjaman aktif yang sedang berjalan</strong>. Sesuai dengan ketentuan operasional koperasi simpan pinjam (KSP), 
              anggota hanya diperkenankan memiliki satu fasilitas kredit berjalan dalam satu waktu. 
              Pengajuan baru dapat dilakukan setelah seluruh cicilan pinjaman aktif Anda dinyatakan <strong>Lunas</strong>.
            </p>
          </div>
        </div>
      )}
      {studentMetrics.hasPendingLoan && !studentMetrics.hasActiveLoan && (
        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-2xl animate-in fade-in slide-in-from-top-1 duration-300">
          <div className="shrink-0 mt-0.5">
            <Clock size={18} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-blue-800 dark:text-blue-300 uppercase tracking-wider">
              Pengajuan Sebelumnya Sedang Diproses
            </p>
            <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-1 leading-relaxed">
              Anda memiliki <strong>pengajuan pinjaman yang sedang menunggu keputusan pengurus</strong> koperasi (Status: PENDING). 
              Harap bersabar, pengurus akan segera meninjau dan memberikan keputusan. Pengajuan baru hanya dapat dilakukan 
              setelah pengajuan sebelumnya diputuskan (disetujui atau ditolak).
            </p>
          </div>
        </div>
      )}
    </>
  );
});

LoanRestrictionsAlerts.displayName = 'LoanRestrictionsAlerts';
