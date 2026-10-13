import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, UserPlus, ArrowRight } from 'lucide-react';
import type { PendingMembersData } from './types';

interface PendingLoanItem {
  id: string;
  amount: number;
  duration: number;
  createdAt: string;
  memberName: string;
}

interface CoopApprovalHubProps {
  pendingLoans?: PendingLoanItem[];
  pendingMembers?: PendingMembersData;
}

export const CoopApprovalHub: React.FC<CoopApprovalHubProps> = React.memo(({
  pendingLoans = [],
  pendingMembers,
}) => {
  const membersCount = pendingMembers?.count || 0;
  const loansCount = pendingLoans.length;

  // Jika tidak ada antrean aksi yang tertunda, jangan tampilkan apapun untuk menjaga layar tetap bersih
  if (loansCount === 0 && membersCount === 0) {
    return null;
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {loansCount > 0 && (
        <div className="flex-1 flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl text-amber-900 dark:text-amber-200 text-xs shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldAlert size={16} className="text-amber-600 shrink-0" />
            <span className="truncate">
              <strong>{loansCount} Pengajuan Pinjaman</strong> menunggu persetujuan pengurus
            </span>
          </div>
          <Link
            to="/cooperative/loans"
            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[11px] font-bold shrink-0 transition-colors inline-flex items-center gap-1"
          >
            <span>Tinjau</span>
            <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {membersCount > 0 && (
        <div className="flex-1 flex items-center justify-between gap-3 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl text-indigo-900 dark:text-indigo-200 text-xs shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <UserPlus size={16} className="text-indigo-600 shrink-0" />
            <span className="truncate">
              <strong>{membersCount} Pendaftar Baru</strong> menunggu verifikasi keanggotaan
            </span>
          </div>
          <Link
            to="/cooperative/members"
            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-bold shrink-0 transition-colors inline-flex items-center gap-1"
          >
            <span>Verifikasi</span>
            <ArrowRight size={12} />
          </Link>
        </div>
      )}
    </div>
  );
});

CoopApprovalHub.displayName = 'CoopApprovalHub';
