import React from 'react';
import { PowerOff } from 'lucide-react';
import { Button } from '../../ui';
import { Modal } from '../ui/Modal';
import type { Member } from './types';

interface MemberTerminateModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  onSubmit: () => void;
  loading: boolean;
}

export const MemberTerminateModal: React.FC<MemberTerminateModalProps> = ({
  isOpen,
  onClose,
  member,
  onSubmit,
  loading
}) => {
  if (!member) return null;

  const pokokAmount = (member.savings || [])?.find(s => s.type === 'POKOK')?.amount || 0;
  const wajibAmount = (member.savings || [])?.find(s => s.type === 'WAJIB')?.amount || 0;
  const sukarelaAmount = (member.savings || [])?.find(s => s.type === 'SUKARELA')?.amount || 0;
  const totalPayout = pokokAmount + wajibAmount + sukarelaAmount;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Konfirmasi Pemberhentian Anggota"
      size="md"
    >
      <div className="space-y-4">
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs space-y-2 text-amber-800 dark:text-amber-300">
          <p className="font-bold flex items-center gap-2">
            <PowerOff size={16} />
            PERINGATAN: Tindakan ini tidak dapat dibatalkan!
          </p>
          <p>
            Memberhentikan anggota akan menonaktifkan status keanggotaan dan melikuidasi seluruh saldo simpanan secara otomatis ke kas tabungan anggota.
          </p>
        </div>

        <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 space-y-3">
          <h6 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            Kalkulasi Pengembalian Saldo (Payout)
          </h6>
          
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Simpanan Pokok:</span>
              <span className="font-bold">Rp {pokokAmount.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Simpanan Wajib:</span>
              <span className="font-bold">Rp {wajibAmount.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Simpanan Sukarela:</span>
              <span className="font-bold">Rp {sukarelaAmount.toLocaleString('id-ID')}</span>
            </div>
            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2 flex justify-between font-black text-sm text-indigo-600 dark:text-indigo-400">
              <span>Total Payout Terbayar:</span>
              <span>Rp {totalPayout.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-9 text-xs rounded-xl"
          >
            Batal
          </Button>
          <Button
            type="button"
            isLoading={loading}
            onClick={onSubmit}
            className="h-9 text-xs rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/15"
          >
            Minta Pemberhentian
          </Button>
        </div>
      </div>
    </Modal>
  );
};
