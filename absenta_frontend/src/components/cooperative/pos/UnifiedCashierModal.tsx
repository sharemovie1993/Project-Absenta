import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/axiosInstance';
import toast from 'react-hot-toast';
import { X, Zap, Scan, RefreshCw, UserCheck, Search, ChevronRight, AlertCircle } from 'lucide-react';
import type { Student } from '../../common/SmartStudentPicker';
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

  // State pencarian anggota koperasi native (pola yang sama dengan POS dan RAT)
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingMembers, setIsSearchingMembers] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-focus input saat modal dibuka dan belum ada anggota terpilih
  useEffect(() => {
    if (isOpen && !selectedStudent) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, selectedStudent]);

  // Fetch anggota koperasi dari /cooperative/toko/members (pola POS & RAT)
  const fetchCoopMembers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearchingMembers(true);
    try {
      const res = await api.get(`/cooperative/toko/members?search=${encodeURIComponent(query.trim())}`);
      const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setSearchResults(list);
    } catch (err) {
      console.error('Failed to search cooperative members:', err);
      setSearchResults([]);
    } finally {
      setIsSearchingMembers(false);
    }
  }, []);

  const handleSearchChange = (val: string) => {
    setMemberSearchQuery(val);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (val.trim().length >= 1) {
      debounceTimerRef.current = setTimeout(() => {
        fetchCoopMembers(val.trim());
      }, 200);
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectMemberRecord = useCallback((member: any) => {
    setSelectedMemberId(member.id);
    setSelectedMemberNo(member.memberNo);
    setSelectedStudent({
      id: member.id,
      nama_siswa: member.name || member.Siswa?.nama_siswa || member.User?.full_name || 'Anggota',
      nama_guru: member.Guru?.nama_guru || '',
      nis: member.nis || member.Siswa?.nis || member.Guru?.nip || member.memberNo,
    });
    toast.success(`Anggota dipilih: ${member.name}`);
  }, []);

  // Form Submit (Enter dari keyboard atau RFID scanner hardware)
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = memberSearchQuery.trim();
    if (!clean) return;

    if (searchResults.length === 1) {
      handleSelectMemberRecord(searchResults[0]);
      return;
    }

    setIsSearchingMembers(true);
    try {
      const res = await api.get(`/cooperative/toko/members?search=${encodeURIComponent(clean)}`);
      const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setSearchResults(list);
      if (list.length === 1) {
        handleSelectMemberRecord(list[0]);
      } else if (list.length === 0) {
        toast.error(`Anggota dengan kata kunci "${clean}" tidak ditemukan.`);
      }
    } catch {
      toast.error('Gagal mencari anggota.');
    } finally {
      setIsSearchingMembers(false);
    }
  };

  const handleResetMember = useCallback(() => {
    setSelectedStudent(null);
    setSelectedMemberId('');
    setSelectedMemberNo('');
    setMemberSearchQuery('');
    setSearchResults([]);
    setTimeout(() => searchInputRef.current?.focus(), 150);
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
        <div className={`p-6 ${!selectedStudent ? 'overflow-visible min-h-[420px]' : 'overflow-y-auto space-y-4'}`}>
          {!selectedStudent ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-start gap-3">
                <Scan className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed">
                  <span className="font-extrabold">Pencarian Anggota Koperasi:</span>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Ketik nama anggota, nomor anggota, NIS/NIP, atau langsung tempelkan kartu RFID anggota pada scanner (pola sama dengan Kasir &amp; Presensi RAT).
                  </p>
                </div>
              </div>

              {/* Form Input Omni-Search */}
              <form onSubmit={handleSearchSubmit} className="relative z-20">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Search size={16} />
                  </div>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={memberSearchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Ketik Nama, No. Anggota, NIS/NIP, atau Scan Kartu..."
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                    autoComplete="off"
                  />
                  {memberSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setMemberSearchQuery('');
                        setSearchResults([]);
                        searchInputRef.current?.focus();
                      }}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </form>

              {/* Search Results / Status List */}
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {isSearchingMembers ? (
                  <div className="py-8 text-center space-y-2">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-slate-400 font-medium">Mencari di data anggota koperasi...</p>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block px-1">
                      Hasil Ditemukan ({searchResults.length} Anggota)
                    </span>
                    {searchResults.map((m: any) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelectMemberRecord(m)}
                        className="w-full p-3 bg-white dark:bg-slate-800/60 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/30 border border-slate-200/80 dark:border-slate-700/60 hover:border-indigo-300 dark:hover:border-indigo-700 rounded-xl flex items-center justify-between gap-3 text-left transition-all duration-150 group shadow-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-black text-sm uppercase shrink-0 border border-indigo-100 dark:border-indigo-800/50">
                            {m.name?.charAt(0) || 'A'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                              {m.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.2 rounded">
                                No. {m.memberNo}
                              </span>
                              {m.nis && (
                                <span className="text-[10px] text-slate-400 font-medium">
                                  NIS: {m.nis}
                                </span>
                              )}
                              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                                {m.type || 'ANGGOTA'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {m.sukarelaBalance !== undefined && (
                            <div className="text-right hidden sm:block">
                              <span className="text-[9px] text-slate-400 block font-semibold uppercase">Saldo Sukarela</span>
                              <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                                Rp {Number(m.sukarelaBalance || 0).toLocaleString('id-ID')}
                              </span>
                            </div>
                          )}
                          <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 group-hover:bg-indigo-600 text-slate-400 group-hover:text-white flex items-center justify-center transition-colors">
                            <ChevronRight size={15} />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : memberSearchQuery.trim().length >= 2 ? (
                  <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/20 space-y-2">
                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto opacity-80" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Anggota koperasi tidak ditemukan dengan kata kunci &quot;{memberSearchQuery}&quot;
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      Pastikan yang dicari sudah terdaftar sebagai anggota koperasi. Untuk anggota baru, daftarkan terlebih dahulu di menu <strong>Anggota Koperasi</strong> atau tombol pendaftaran kasir.
                    </p>
                  </div>
                ) : (
                  <div className="py-6 text-center text-slate-400 space-y-1">
                    <p className="text-xs font-semibold">
                      Ketik minimal 1 karakter untuk memuat daftar anggota koperasi.
                    </p>
                    <p className="text-[11px] text-slate-400 italic">
                      💡 Mendukung pencarian instan nama, nomor anggota, NIS/NIP, dan scan kartu RFID.
                    </p>
                  </div>
                )}
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
