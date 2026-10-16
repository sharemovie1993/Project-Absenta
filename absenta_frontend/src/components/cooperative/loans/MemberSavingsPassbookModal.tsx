import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Printer, Wallet } from 'lucide-react';
import api from '../../../lib/axiosInstance';
import { Button } from '../../ui';
import { Modal } from '../../ui/Modal';
import { MemberSavingsLedger } from '../members/MemberSavingsLedger';
import type { Member } from '../members/types';
import { exportAllSavingsPdf, exportSingleSavingPdf } from '../savings/savingsExportUtils';
import type { Saving } from '../savings/types';
import toast from 'react-hot-toast';

interface MemberSavingsPassbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string | null;
  memberName?: string;
  memberNo?: string;
}

export const MemberSavingsPassbookModal: React.FC<MemberSavingsPassbookModalProps> = React.memo(({
  isOpen,
  onClose,
  memberId,
  memberName,
  memberNo,
}) => {
  // Query full member record including savings and transactions
  const memberQuery = useQuery({
    queryKey: ['koperasi-member-detail', memberId],
    queryFn: async () => {
      const res = await api.get(`/cooperative/members/${memberId}`);
      return res.data as Member;
    },
    enabled: isOpen && !!memberId,
    staleTime: 60 * 1000,
  });

  const member = memberQuery.data || null;
  const loading = memberQuery.isLoading;

  const displayName = member?.name || memberName || 'Anggota Koperasi';
  const displayMemberNo = member?.memberNo || memberNo || '-';

  const savingsList = useMemo(() => {
    return (member?.savings || []) as unknown as Saving[];
  }, [member?.savings]);

  const totalBalance = useMemo(() => {
    return savingsList.reduce((sum, s) => sum + (parseFloat(String(s.amount)) || 0), 0);
  }, [savingsList]);

  const handlePrintPassbook = async () => {
    if (savingsList.length === 0) {
      toast.error('Tidak ada rekening tabungan aktif untuk dicetak.');
      return;
    }
    try {
      if (savingsList.length === 1) {
        await exportSingleSavingPdf(savingsList[0]);
      } else {
        await exportAllSavingsPdf(savingsList[0], savingsList);
      }
      toast.success('Buku tabungan berhasil digenerate.');
    } catch (err) {
      console.error(err);
      toast.error('Gagal mencetak buku tabungan.');
    }
  };

  if (!isOpen || !memberId) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <BookOpen className="text-indigo-600 dark:text-indigo-400" size={18} />
          <span>Buku Tabungan &amp; Mutasi Simpanan</span>
        </div>
      }
      size="2xl"
    >
      <div className="space-y-4 p-1">
        {/* Member Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-black flex items-center justify-center shrink-0">
              <Wallet size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase truncate">
                {displayName}
              </h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                No. Anggota: {displayMemberNo}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right shrink-0">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
              Total Saldo Tabungan
            </span>
            <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
              Rp {Math.round(totalBalance).toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        {/* Financial Category Breakdown */}
        {savingsList.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {savingsList.map((s, idx) => (
              <div key={idx} className="p-2.5 rounded-xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                  {s.category?.name || s.type || 'Simpanan'}
                </span>
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                  Rp {Math.round(parseFloat(String(s.amount)) || 0).toLocaleString('id-ID')}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Existing Ready-made Component: MemberSavingsLedger */}
        <div className="pt-2">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 font-bold animate-pulse">
              Memuat mutasi buku tabungan...
            </div>
          ) : (
            <MemberSavingsLedger savings={member?.savings} />
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-slate-600 dark:text-slate-300 font-bold rounded-xl text-xs h-9"
          >
            Tutup
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrintPassbook}
            disabled={savingsList.length === 0}
            className="text-indigo-600 hover:bg-indigo-50 border-indigo-200 dark:text-indigo-400 dark:hover:bg-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 h-9"
          >
            <Printer size={13} />
            <span>Cetak Rekap Buku Tabungan</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
});

MemberSavingsPassbookModal.displayName = 'MemberSavingsPassbookModal';
