import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Package, FileText, Send, X, RefreshCw, ClipboardList } from 'lucide-react';
import { Button, Input, Label, Textarea, SearchableSelect, ModalFooter, Loader } from '../ui';
import { sarprasApi } from '../../api/sarpras.api';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { SmartStudentPicker, type Student } from '../common/SmartStudentPicker';
import { useSarprasAsetOptions } from '../../hooks/useSarprasAsetOptions';

interface LoanRequestFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface Asset {
  id: string;
  nama: string;
  kode?: string;
  jumlah: number;
}

const LoanRequestForm: React.FC<LoanRequestFormProps> = React.memo(({ onSuccess, onCancel }) => {
  const { subscription, user } = useAuthStore();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    asset_id: '',
    tanggal_kembali_plan: '',
    catatan: ''
  });

  const [selectedBorrower, setSelectedBorrower] = useState<Student | null>(null);

  const isAdminOrStaff = useMemo(() => {
    const roleName = user?.role?.name || '';
    const hasManageCapability = user?.capabilities?.includes('sarpras.loans.manage') || false;
    return ['SUPERADMIN', 'ADMIN', 'SARPRAS', 'TOOLMAN', 'KABENG'].includes(roleName) || hasManageCapability;
  }, [user]);

  // Gating Logic
  const isLocked = subscription?.plan?.name === 'CORE_PLATFORM' || subscription?.Plan?.name === 'CORE_PLATFORM';

  // Fetch loanable assets via custom hook
  const { options: assetOptions, isLoading: loadingAssets } = useSarprasAsetOptions({ isLoanable: true });

  const mutation = useMutation({
    mutationFn: (data: { asset_id: string; peminjam_id?: string; tanggal_kembali_plan?: Date; catatan?: string }) => sarprasApi.requestLoan(data),
    onSuccess: (res: { message?: string }) => {
      toast.success(res.message || 'Permohonan peminjaman berhasil dikirim');
      queryClient.invalidateQueries({ queryKey: ['sarpras-loans'] });
      queryClient.invalidateQueries({ queryKey: ['sarpras-stats'] });
      onSuccess?.();
    },
    onError: (err: unknown) => {
      let errMsg = 'Gagal mengirim permohonan';
      if (err && typeof err === 'object' && 'response' in err) {
        const resErr = err as { response?: { data?: { message?: string } } };
        if (resErr.response?.data?.message) {
          errMsg = resErr.response.data.message;
        }
      } else if (err instanceof Error) {
        errMsg = err.message;
      }
      toast.error(errMsg);
    }
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.asset_id) {
      toast.error('Pilih aset yang ingin dipinjam');
      return;
    }
    if (isAdminOrStaff && !selectedBorrower) {
      toast.error('Pilih peminjam terlebih dahulu');
      return;
    }
    if (isAdminOrStaff && selectedBorrower && !selectedBorrower.user_id) {
      toast.error('Peminjam terpilih tidak memiliki akun pengguna yang aktif di sistem.');
      return;
    }
    mutation.mutate({
      asset_id: formData.asset_id,
      peminjam_id: isAdminOrStaff ? (selectedBorrower?.user_id || undefined) : undefined,
      tanggal_kembali_plan: formData.tanggal_kembali_plan ? new Date(formData.tanggal_kembali_plan) : undefined,
      catatan: formData.catatan || undefined
    });
  }, [formData, mutation, isAdminOrStaff, selectedBorrower]);

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
              <ClipboardList size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">Detail Peminjaman</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Pengajuan Pinjam Barang</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2 group">
              <Label htmlFor="loan-asset-id" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                Aset yang Dipinjam <span className="text-rose-500">*</span>
              </Label>
              <SearchableSelect
                id="loan-asset-id"
                options={assetOptions}
                value={formData.asset_id}
                onValueChange={v => setFormData({ ...formData, asset_id: v })}
                placeholder="Cari aset yang tersedia..."
                isLoading={loadingAssets}
                triggerClassName="h-10 text-[13px] font-bold bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
              />
            </div>

            {isAdminOrStaff && (
              <div className="space-y-2 group">
                <Label htmlFor="loan-borrower-id" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                  Peminjam (Guru / Siswa) <span className="text-rose-500">*</span>
                </Label>
                <div className="bg-white dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <SmartStudentPicker
                    id="loan-borrower-id"
                    mode="universal"
                    scope="global"
                    onSelect={(item) => setSelectedBorrower(item)}
                    placeholder="Scan RFID atau ketik nama/NIS/NIP..."
                  />
                </div>
                {selectedBorrower && (
                  <p className="text-xs text-emerald-600 font-bold mt-1">
                    Terpilih: {selectedBorrower.nama_siswa || selectedBorrower.nama_guru || selectedBorrower.full_name} ({selectedBorrower.nis || selectedBorrower.nip || 'Staff'})
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2 group">
              <Label htmlFor="loan-return-date" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                Rencana Pengembalian
              </Label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  id="loan-return-date"
                  type="date"
                  className="pl-10 h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
                  value={formData.tanggal_kembali_plan}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setFormData({ ...formData, tanggal_kembali_plan: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2 group">
              <Label htmlFor="loan-catatan" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                Catatan / Keperluan
              </Label>
              <Textarea
                id="loan-catatan"
                placeholder="Entry keperluan peminjaman..."
                rows={3}
                value={formData.catatan}
                onChange={e => setFormData({ ...formData, catatan: e.target.value })}
                className="text-[13px] font-medium tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
              />
            </div>
          </div>
        </div>

        <ModalFooter className="mt-4 pt-6 border-t border-slate-100 dark:border-slate-800 gap-3">
          <Button
            type="button"
            variant="toolbarOutline"
            size="toolbar"
            onClick={onCancel}
            disabled={mutation.isPending}
          >
            <X className="w-3.5 h-3.5 mr-2" />
            Batalkan
          </Button>
          <Button
            type="submit"
            variant="toolbarPrimary"
            size="toolbar"
            disabled={mutation.isPending || !formData.asset_id}
            className="px-8"
          >
            {mutation.isPending ? (
              <RefreshCw size={14} className="mr-2 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5 mr-2" />
            )}
            Kirim Permohonan
          </Button>
        </ModalFooter>
      </form>
    </div>
  );
});

export default LoanRequestForm;
