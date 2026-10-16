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
      const searchTerm = memberNo || student.nis || student.nip || student.nama_siswa || student.nama_guru || '';
      
      let membersList: any[] = [];
      try {
        const tokoRes = await api.get(`/cooperative/toko/members?search=${encodeURIComponent(searchTerm)}`);
        membersList = Array.isArray(tokoRes.data) ? tokoRes.data : (tokoRes.data?.data || []);
      } catch {
        const memberRes = await api.get('/cooperative/members', { params: { search: searchTerm } });
        membersList = Array.isArray(memberRes.data) ? memberRes.data : (memberRes.data?.data || []);
      }

      const matched = membersList.find((m: any) => 
        (student.id && (m.siswaId === student.id || m.guruId === student.id || m.userId === student.id || m.id === student.id)) ||
        (memberNo && m.memberNo === memberNo) ||
        (student.nis && (m.memberNo === student.nis || m.Siswa?.nis === student.nis)) ||
        (student.nama_siswa && m.name?.toLowerCase().includes(student.nama_siswa.toLowerCase())) ||
        (student.nama_guru && m.name?.toLowerCase().includes(student.nama_guru.toLowerCase()))
      ) || (membersList.length === 1 ? membersList[0] : null);

      if (!matched) {
        toast.error(`"${student.nama_siswa || student.nama_guru || 'User'}" belum terdaftar sebagai anggota koperasi.`);
        return;
      }

      setSelectedMemberId(matched.id);
      setSelectedMemberNo(matched.memberNo);
      setSelectedStudent({
        id: matched.id,
        nama_siswa: matched.name || student.nama_siswa || matched.Siswa?.nama_siswa,
        nama_guru: student.nama_guru || matched.Guru?.nama_guru,
        nis: student.nis || matched.memberNo,
      });
      toast.success(`Anggota dipilih: ${matched.name || student.nama_siswa}`);
    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat data anggota koperasi.');
    }
  }, []);

  const handleResetMember = useCallback(() => {
    setSelectedStudent(null);
    setSelectedMemberId('');
    setSelectedMemberNo('');
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className={`relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-200 ${
        !selectedStudent ? 'min-h-[480px] overflow-visible' : 'max-h-[92vh] overflow-hidden'
      }`}>
        
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Zap size={20} className="text-amber-500 fill-amber-500" />
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
        <div className={`p-6 ${!selectedStudent ? 'overflow-visible min-h-[400px]' : 'overflow-y-auto space-y-4'}`}>
          {!selectedStudent ? (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-start gap-3">
                <Scan className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed">
                  <span className="font-extrabold">Pindai Kartu Anggota atau Cari Nama:</span>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Tempelkan kartu RFID anggota pada scanner, sorot QR code kartu, atau ketik nama/NIS di bawah untuk langsung membuka tagihan simpanan & pinjamannya.
                  </p>
                </div>
              </div>

              <div className="space-y-2 relative z-30">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Cari Siswa / Guru Anggota Koperasi
                </label>
                <SmartStudentPicker
                  scope="global"
                  mode="universal"
                  placeholder="Pindai RFID / QR, atau ketik nama/NIS anggota..."
                  onSelect={handleSelectStudent}
                  autoFocus
                />
              </div>

              <div className="pt-8 text-center text-slate-400 text-xs">
                <p className="text-[11px] text-slate-400 italic">
                  💡 Tips: Anggota yang memiliki kartu RFID dapat langsung di-tap tanpa perlu mengklik input.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Status Loading */}
              {(loadingSavings || loadingLoans) ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-500 font-bold">Memuat rincian simpanan & pinjaman anggota...</p>
                </div>
              ) : (
                <UnifiedPaymentPanel
                  student={selectedStudent}
                  savings={memberSavings}
                  memberLoans={memberLoans}
                  loadingLoans={loadingLoans}
                  onCancel={onClose}
                  onResetMember={handleResetMember}
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
