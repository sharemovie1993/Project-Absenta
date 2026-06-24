import React, { useState, useEffect } from 'react';
import { Button, Input } from '../../ui';
import { Modal } from '../ui/Modal';
import type { Member } from './types';
import { KeyRound } from 'lucide-react';

interface MemberPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  onSubmit: (pin: string) => Promise<void>;
  loading: boolean;
}

export const MemberPinModal: React.FC<MemberPinModalProps> = React.memo(({
  isOpen,
  onClose,
  member,
  onSubmit,
  loading
}) => {
  const [pin, setPin] = useState('');
  const [errorText, setErrorText] = useState('');

  // Reset PIN input when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setErrorText('');
    }
  }, [isOpen]);

  if (!member) return null;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(pin)) {
      setErrorText('PIN harus berupa 6 digit angka.');
      return;
    }
    setErrorText('');
    await onSubmit(pin);
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, ''); // Numeric only
    if (val.length <= 6) {
      setPin(val);
      if (val.length === 6) {
        setErrorText('');
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ganti PIN Transaksi"
      size="sm"
    >
      <form onSubmit={handleFormSubmit} className="space-y-4">
        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-xl flex items-start gap-3">
          <KeyRound className="text-amber-500 shrink-0 mt-0.5" size={16} />
          <div className="text-xs text-amber-800 dark:text-amber-300">
            <p className="font-bold mb-0.5">Ubah PIN Keamanan</p>
            <p>Masukkan 6 digit PIN transaksi baru untuk anggota: <strong className="font-black text-slate-800 dark:text-slate-100">{member.name}</strong>.</p>
          </div>
        </div>

        <Input
          label="PIN Baru (6-Digit)"
          id="member-new-pin"
          name="pin"
          type="password"
          maxLength={6}
          inputMode="numeric"
          pattern="[0-9]{6}"
          placeholder="Ketik 6 digit angka..."
          value={pin}
          onChange={handlePinChange}
          errorText={errorText}
          autoFocus
          required
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-9 text-xs rounded-xl"
            disabled={loading}
          >
            Batal
          </Button>
          <Button
            type="submit"
            isLoading={loading}
            className="h-9 text-xs rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/10"
          >
            Simpan PIN Baru
          </Button>
        </div>
      </form>
    </Modal>
  );
});
