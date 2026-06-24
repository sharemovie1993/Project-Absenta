import React, { useState, useEffect } from 'react';
import Modal from '../../ui/Modal';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import type { Saving } from './types';

interface SavingTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  saving: Saving | null;
  transactionType: 'DEPOSIT' | 'WITHDRAWAL';
  onSubmit: (amount: number, description: string) => Promise<void>;
}

export const SavingTransactionModal = React.memo<SavingTransactionModalProps>(({
  isOpen,
  onClose,
  saving,
  transactionType,
  onSubmit,
}) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset inputs when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setAmount(saving?.category?.defaultAmount ? String(saving.category.defaultAmount) : '');
      setDescription('');
      setError(null);
    }
  }, [isOpen, saving]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saving) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 1000) {
      setError('Jumlah nominal setor/tarik minimum adalah Rp 1.000');
      return;
    }

    if (transactionType === 'WITHDRAWAL') {
      const currentBalance = parseFloat(saving.amount) || 0;
      if (parsedAmount > currentBalance) {
        setError(`Saldo tidak mencukupi. Saldo saat ini: Rp ${currentBalance.toLocaleString('id-ID')}`);
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      await onSubmit(parsedAmount, description);
      onClose();
    } catch (err) {
      console.error(err);
      const errLike = err as { response?: { data?: { message?: string } } };
      setError(errLike.response?.data?.message || 'Transaksi gagal diproses. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  if (!saving) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={transactionType === 'DEPOSIT' ? 'Setor Tunai Tabungan' : 'Tarik Tunai Tabungan'}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nama Anggota</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">{saving.member.name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">No. Anggota</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">{saving.member.memberNo}</p>
            </div>
            <div className="mt-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Jenis Simpanan</p>
              <span className="inline-block px-2.5 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-extrabold rounded-full mt-1">
                {saving.category?.name || '-'}
              </span>
            </div>
            <div className="mt-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Saldo Saat Ini</p>
              <p className="text-sm font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">
                Rp {parseFloat(saving.amount).toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <Input
          label="Jumlah Nominal (Rp)"
          type="number"
          id="transaction-amount-input"
          name="transactionAmount"
          required
          min="1000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Contoh: 50000"
        />

        <Input
          label="Keterangan (Opsional)"
          id="transaction-desc-input"
          name="transactionDescription"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Contoh: Setoran Bulan Juni"
        />

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Batal
          </Button>
          <Button
            type="submit"
            isLoading={loading}
            variant={transactionType === 'DEPOSIT' ? 'primary' : 'danger'}
          >
            {transactionType === 'DEPOSIT' ? 'Setor Sekarang' : 'Tarik Sekarang'}
          </Button>
        </div>
      </form>
    </Modal>
  );
});

SavingTransactionModal.displayName = 'SavingTransactionModal';
