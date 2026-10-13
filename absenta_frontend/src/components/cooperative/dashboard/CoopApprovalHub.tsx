import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, UserPlus, CheckCircle2, ArrowRight } from 'lucide-react';
import { formatDate } from '@/utils/date.utils';
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
  const membersList = pendingMembers?.list || [];
  const membersCount = pendingMembers?.count || 0;
  const loansCount = pendingLoans.length;

  // Jika tidak ada pinjaman pending dan tidak ada anggota pending, sembunyikan atau tampilkan banner netral ringkas
  if (loansCount === 0 && membersCount === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* ── SUB-PANEL 1: Persetujuan Pinjaman Mendesak ── */}
        {loansCount > 0 ? (
          <div className="bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-amber-200/60 dark:border-amber-800/40">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                  <ShieldAlert size={16} className="text-amber-600" />
                  <span>Persetujuan Pinjaman ({loansCount} Menunggu)</span>
                </div>
                <Link
                  to="/cooperative/loans"
                  className="text-[11px] font-bold text-amber-800 dark:text-amber-300 hover:underline flex items-center gap-1"
                >
                  Buka Pinjaman &rarr;
                </Link>
              </div>

              <div className="space-y-2 pt-3">
                {pendingLoans?.slice(0, 3)?.map((loan) => (
                  <div key={loan.id} className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-amber-100 dark:border-slate-800 flex items-center justify-between shadow-2xs">
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{loan.memberName}</p>
                      <p className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400">
                        Rp {Number(loan.amount).toLocaleString('id-ID')} ({loan.duration} Bulan)
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Diajukan: {formatDate(loan.createdAt)}
                      </p>
                    </div>
                    <Link
                      to={`/cooperative/loans?detail=${loan.id}`}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0"
                    >
                      Tinjau
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-white">Semua Pinjaman Terverifikasi</p>
                <p className="text-[10px] text-slate-400">Tidak ada pengajuan pinjaman yang menunggu persetujuan pengurus.</p>
              </div>
            </div>
            <Link to="/cooperative/loans" className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
              Lihat Pinjaman &rarr;
            </Link>
          </div>
        )}

        {/* ── SUB-PANEL 2: Antrean Verifikasi Calon Anggota Baru ── */}
        {membersCount > 0 ? (
          <div className="bg-indigo-50/80 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/40 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-indigo-200/60 dark:border-indigo-800/40">
                <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300 font-bold text-xs">
                  <UserPlus size={16} className="text-indigo-600" />
                  <span>Verifikasi Anggota Baru ({membersCount} Pendaftar)</span>
                </div>
                <Link
                  to="/cooperative/members"
                  className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300 hover:underline flex items-center gap-1"
                >
                  Buka Anggota &rarr;
                </Link>
              </div>

              <div className="space-y-2 pt-3">
                {membersList?.slice(0, 3)?.map((mem) => (
                  <div key={mem.id} className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-indigo-100 dark:border-slate-800 flex items-center justify-between shadow-2xs">
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{mem.name}</p>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        ID: <span className="font-mono text-indigo-600 font-bold">{mem.identifier}</span>
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Mendaftar: {formatDate(mem.createdAt)}
                      </p>
                    </div>
                    <Link
                      to="/cooperative/members"
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0"
                    >
                      Verifikasi
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-white">Keanggotaan Terkini Lunas Verifikasi</p>
                <p className="text-[10px] text-slate-400">Tidak ada pendaftar baru yang menunggu persetujuan status keanggotaan.</p>
              </div>
            </div>
            <Link to="/cooperative/members" className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
              Data Anggota &rarr;
            </Link>
          </div>
        )}

      </div>
    </div>
  );
});

CoopApprovalHub.displayName = 'CoopApprovalHub';
