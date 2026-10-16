import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/axiosInstance';
import toast from 'react-hot-toast';
import { X, Zap, Scan, RefreshCw, UserCheck } from 'lucide-react';
import { SmartStudentPicker, type Student } from '../../common/SmartStudentPicker';
import { UnifiedPaymentPanel, type MemberLoanItem } from '../savings/UnifiedPaymentPanel';
import type { Saving } from '../savings/types';
import type { CoopMember } from './usePOSState';
import { COOP_QUERY_KEYS } from '../../../lib/coopQueryKeys';

interface UnifiedCashierModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeMember?: CoopMember | null;
}

export const UnifiedCashierModal: React.FC<UnifiedCashierModalProps> = React.memo(({
  isOpen,
  onClose,
  activeMember = null
}) => {
  const queryClient = useQueryClient();
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [selectedMemberNo, setSelectedMemberNo] = useState<string>('');

  // Sinkronisasi saat activeMember dipassing dari halaman POS
  useEffect(() => {
    if (isOpen && activeMember) {
      setSelectedMemberId(activeMember.id);
      setSelectedMemberNo(activeMember.memberNo);
      setSelectedStudent({
        id: activeMember.id,
        nama_siswa: activeMember.name || activeMember.Siswa?.nama_siswa || '',
        nama_guru: activeMember.Guru?.nama_guru || '',
        nis: activeMember.memberNo,
      });
    } else if (isOpen && !activeMember && !selectedStudent) {
      setSelectedMemberId('');
      setSelectedMemberNo('');
      setSelectedStudent(null);
    }
  }, [isOpen, activeMember]);

  // Query simpanan anggota
  const {
    data: memberSavings = [],
    isLoading: loadingSavings,
    refetch: refetchSavings
  } = useQuery<Saving[]>({
    queryKey: ['coop_savings_member', selectedMemberId],
    queryFn: async () => {
      if (!selectedMemberId) return [];
      const res = await api.get(`/cooperative/savings?memberId=${selectedMemberId}`);
      return res.data || [];
    },
    enabled: !!selectedMemberId && isOpen,
    staleTime: 30000
  });

  // Query pinjaman anggota
  const {
    data: memberLoans = [],
    isLoading: loadingLoans,
    refetch: refetchLoans
  } = useQuery<MemberLoanItem[]>({
    queryKey: ['coop_loans_member', selectedMemberId],
    queryFn: async () => {
      if (!selectedMemberId) return [];
      const res = await api.get(`/cooperative/loans/manage?memberId=${selectedMemberId}`);
      return res.data || [];
    },
    enabled: !!selectedMemberId && isOpen,
    staleTime: 30000
  });

  // Mutasi pembayaran terpadu
  const unifiedTxMutation = useMutation({
    mutationFn: async (payload: {
      memberId: string;
      savingsTransactions: Array<{ savingId: string; type: 'DEPOSIT' | 'WITHDRAWAL'; amount: number; description?: string }>;
      loanInstallments: Array<{ installmentId: string; installmentNo?: number }>;
      notes?: string;
    }) => {
      const res = await api.post('/cooperative/savings/unified-payment', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COOP_QUERY_KEYS.SAVINGS] });
      queryClient.invalidateQueries({ queryKey: [COOP_QUERY_KEYS.LOANS] });
      queryClient.invalidateQueries({ queryKey: ['coop_savings_member', selectedMemberId] });
      queryClient.invalidateQueries({ queryKey: ['coop_loans_member', selectedMemberId] });
      refetchSavings();
      refetchLoans();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Gagal memproses transaksi terpadu.';
      toast.error(msg);
    }
  });

  const handleProcessUnifiedPayment = useCallback(async (payload: any) => {
    return await unifiedTxMutation.mutateAsync(payload);
  }, [unifiedTxMutation]);

  // Handler saat kasir scan / pilih siswa dari SmartStudentPicker
  const handleSelectStudent = useCallback(async (student: Student, memberNo?: string) => {
    try {
      // Cari data member berdasarkan student.id atau memberNo
      const res = await api.get('/cooperative/members', {
        params: {
          search: memberNo || student.nis || student.nip || student.nama_siswa || student.nama_guru
        }
      });
      const membersList = res.data?.data || res.data || [];
      const matched = membersList.find((m: any) => 
        (student.id && (m.siswaId === student.id || m.guruId === student.id || m.userId === student.id)) ||
        (memberNo && m.memberNo === memberNo)
      ) || membersList[0];

      if (!matched) {
        toast.error('Anggota koperasi tidak ditemukan untuk data ini.');
        return;
      }

      setSelectedMemberId(matched.id);
      setSelectedMemberNo(matched.memberNo);
      setSelectedStudent(student);
      toast.success(`Anggota dipilih: ${student.nama_siswa || student.nama_guru || matched.name}`);
    } catch {
      toast.error('Gagal mengambil data anggota koperasi.');
    }
  }, []);

  const handleResetMember = useCallback(() => {
    setSelectedStudent(null);
    setSelectedMemberId('');
    setSelectedMemberNo('');
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Zap size={18} className="text-amber-500 fill-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                Loket Kasir Terpadu
              </h3>
              <p className="text-[11px] font-medium text-slate-400">
                Penerimaan Iuran Simpanan & Pelunasan Cicilan Pinjaman
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {!selectedStudent ? (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-3">
                <Scan className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-900 dark:text-indigo-300">
                  <span className="font-bold">Pindai Kartu Anggota atau Cari Nama:</span>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Tempelkan kartu RFID anggota pada scanner, sorot QR code, atau cari nama anggota untuk langsung memuat tagihan iuran dan cicilannya.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Cari Siswa / Guru Anggota Koperasi
                </label>
                <SmartStudentPicker
                  scope="global"
                  mode="universal"
                  placeholder="Pindai RFID / QR, atau ketik nama/NIS..."
                  onSelect={handleSelectStudent}
                  autoFocus
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Profile Card Anggota Terpilih */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-sm uppercase">
                    {selectedStudent.nama_siswa?.charAt(0) || selectedStudent.nama_guru?.charAt(0) || 'A'}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                      {selectedStudent.nama_siswa || selectedStudent.nama_guru}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold text-slate-400">
                        NIS/NIP: {selectedStudent.nis || selectedStudent.nip || '-'}
                      </span>
                      {selectedMemberNo && (
                        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.2 rounded">
                          No. {selectedMemberNo}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleResetMember}
                  className="px-2.5 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-colors flex items-center gap-1 border border-indigo-200 dark:border-indigo-800/60"
                  title="Ganti Anggota"
                >
                  <RefreshCw size={12} />
                  <span>Ganti Anggota</span>
                </button>
              </div>

              {/* Status Loading */}
              {(loadingSavings || loadingLoans) ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-400 font-semibold">Memuat tagihan simpanan & pinjaman anggota...</p>
                </div>
              ) : (
                <UnifiedPaymentPanel
                  student={selectedStudent}
                  savings={memberSavings}
                  memberLoans={memberLoans}
                  loadingLoans={loadingLoans}
                  onCancel={onClose}
                  onProcessUnifiedPayment={handleProcessUnifiedPayment}
                  isProcessing={unifiedTxMutation.isPending}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

UnifiedCashierModal.displayName = 'UnifiedCashierModal';
