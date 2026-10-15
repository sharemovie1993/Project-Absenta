import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../../ui/Modal';
import { Button, Textarea } from '../../ui';
import toast from 'react-hot-toast';
import api from '../../../lib/axiosInstance';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateRatCaches } from '../../../lib/coopQueryKeys';

export interface EditRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  initialRules?: string | null;
  onSuccess?: () => void;
}

export const EditRulesModal: React.FC<EditRulesModalProps> = React.memo(({
  isOpen,
  onClose,
  meetingId,
  initialRules,
  onSuccess
}) => {
  const queryClient = useQueryClient();
  const [rules, setRules] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setRules(initialRules || '');
    setError('');
  }, [initialRules, isOpen]);

  const updateMutation = useMutation({
    mutationFn: async (payload: { description: string }) => {
      const res = await api.put(`/cooperative/rat/${meetingId}/rules`, payload);
      return res.data;
    },
    onSuccess: () => {
      invalidateRatCaches(queryClient, meetingId);
      toast.success('Ketentuan khusus tata tertib sidang berhasil disimpan!');
      onClose();
      onSuccess?.();
    },
    onError: (err: unknown) => {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal menyimpan tata tertib';
      toast.error(errorMsg);
    }
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!rules || rules.trim().length < 5) {
      setError('Catatan khusus tata tertib minimal 5 karakter');
      return;
    }
    setError('');
    updateMutation.mutate({ description: rules.trim() });
  }, [rules, updateMutation]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ubah Klausul & Catatan Khusus Tata Tertib Sidang"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Klausul Khusus / Ketentuan Tambahan Sidang
          </label>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
            Tambahkan aturan spesifik pelaksanaan RAT tahun ini, seperti batas waktu tanggapan tiap unit kerja, tata tertib kehadiran, atau mekanisme pemilihan presidium.
          </p>
          <Textarea
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            placeholder="Contoh: Setiap fraksi/unit kerja diberikan alokasi waktu maksimal 5 menit untuk menyampaikan pandangan umum terhadap LPJ..."
            rows={6}
            disabled={updateMutation.isPending}
            className="w-full text-sm"
          />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={updateMutation.isPending}
          >
            Batal
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Menyimpan...' : 'Simpan Tata Tertib'}
          </Button>
        </div>
      </form>
    </Modal>
  );
});

EditRulesModal.displayName = 'EditRulesModal';
