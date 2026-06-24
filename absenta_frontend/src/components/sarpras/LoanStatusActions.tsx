import React, { useState, useCallback, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Play, RotateCcw, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Label } from '../ui/Label';
import { Textarea } from '../ui/Textarea';
import { SearchableSelect } from '../ui/SearchableSelect';
import { sarprasApi } from '../../api/sarpras.api';
import { useToast } from '../../hooks/useToast';

interface LoanStatusActionsProps {
  loan: {
    id: string;
    status: string;
  };
}

interface ReturnDataPayload {
  condition_on_return: string;
  return_catatan: string;
}

const CONDITION_OPTIONS = [
  { value: 'BAIK', label: 'Baik (Normal)' },
  { value: 'RUSAK', label: 'Rusak' },
  { value: 'HILANG', label: 'Hilang' },
];

const LoanStatusActions: React.FC<LoanStatusActionsProps> = ({ loan }) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnData, setReturnData] = useState<ReturnDataPayload>({
    condition_on_return: 'BAIK',
    return_catatan: ''
  });

  const mutation = useMutation({
    mutationFn: ({ status, data }: { status: string; data?: ReturnDataPayload }) =>
      sarprasApi.updateLoanStatus(loan.id, { status, ...data }),
    onSuccess: (res: { message?: string }) => {
      showToast(res.message || 'Status berhasil diperbarui', 'success');
      queryClient.invalidateQueries({ queryKey: ['sarpras-loans'] });
      queryClient.invalidateQueries({ queryKey: ['sarpras-stats'] });
      setReturnModalOpen(false);
    },
    onError: (err: unknown) => {
      let errMsg = 'Gagal memperbarui status';
      if (err && typeof err === 'object' && 'response' in err) {
        const resErr = err as { response?: { data?: { message?: string } } };
        if (resErr.response?.data?.message) {
          errMsg = resErr.response.data.message;
        }
      } else if (err instanceof Error) {
        errMsg = err.message;
      }
      showToast(errMsg, 'error');
    }
  });

  const handleAction = useCallback((status: string) => {
    if (status === 'RETURNED') {
      setReturnModalOpen(true);
      return;
    }
    mutation.mutate({ status });
  }, [mutation]);

  const handleReturn = useCallback(() => {
    mutation.mutate({
      status: 'RETURNED',
      data: returnData
    });
  }, [mutation, returnData]);

  const renderedActions = useMemo(() => {
    const btnBase = 'text-xs font-medium rounded-lg px-3 py-1.5 transition-all duration-200';

    switch (loan.status) {
      case 'PENDING':
        return (
          <div className="flex gap-1.5">
            <Button
              size="sm"
              className={`${btnBase} bg-emerald-500 hover:bg-emerald-600 text-white border-none`}
              onClick={() => handleAction('APPROVED')}
              disabled={mutation.isPending}
            >
              <Check size={14} className="mr-1" /> Setujui
            </Button>
            <Button
              size="sm"
              className={`${btnBase} bg-red-500 hover:bg-red-600 text-white border-none`}
              onClick={() => handleAction('REJECTED')}
              disabled={mutation.isPending}
            >
              <X size={14} className="mr-1" /> Tolak
            </Button>
          </div>
        );

      case 'APPROVED':
        return (
          <Button
            size="sm"
            className={`${btnBase} bg-blue-500 hover:bg-blue-600 text-white border-none`}
            onClick={() => handleAction('ACTIVE')}
            disabled={mutation.isPending}
          >
            <Play size={14} className="mr-1" /> Aktifkan
          </Button>
        );

      case 'ACTIVE':
        return (
          <Button
            size="sm"
            className={`${btnBase} bg-slate-600 hover:bg-slate-700 text-white border-none`}
            onClick={() => handleAction('RETURNED')}
            disabled={mutation.isPending}
          >
            <RotateCcw size={14} className="mr-1" /> Kembalikan
          </Button>
        );

      default:
        return null;
    }
  }, [loan.status, mutation.isPending, handleAction]);

  return (
    <>
      {mutation.isPending ? (
        <Loader2 size={16} className="animate-spin text-slate-400" />
      ) : (
        renderedActions
      )}

      {/* Return Confirmation Modal */}
      <Modal
        isOpen={returnModalOpen}
        onClose={() => setReturnModalOpen(false)}
        title="Konfirmasi Pengembalian"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-700 dark:text-amber-400 text-sm">
            <AlertTriangle size={16} />
            <span>Pastikan kondisi barang sudah diperiksa sebelum menerima pengembalian.</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="return-condition">Kondisi Barang Saat Dikembalikan</Label>
            <SearchableSelect
              id="return-condition"
              options={CONDITION_OPTIONS}
              value={returnData.condition_on_return}
              onValueChange={v => setReturnData({ ...returnData, condition_on_return: v })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="return-notes">Catatan Pengembalian</Label>
            <Textarea
              id="return-notes"
              placeholder="Contoh: Barang dalam kondisi baik, tidak ada kerusakan..."
              rows={3}
              value={returnData.return_catatan}
              onChange={e => setReturnData({ ...returnData, return_catatan: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="outline" onClick={() => setReturnModalOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleReturn}
              disabled={mutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {mutation.isPending ? <Loader2 size={16} className="mr-2 animate-spin" /> : <RotateCcw size={16} className="mr-2" />}
              Konfirmasi Pengembalian
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default LoanStatusActions;
