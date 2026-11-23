import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShoppingBag, RefreshCw, X, ShieldCheck } from 'lucide-react';
import api from '@/lib/axiosInstance';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { CoopMemberSection } from './CoopMemberSection';
import { printCoopReceipt, fetchCoopSettings, type CoopSettingsData } from '@/utils/cooperative/coopDocUtils';
import type { Sale, Announcement, CoopUserInfo } from '@/components/cooperative/types';
import type { MemberInfo, MemberDashboardSummary } from './types';

const ReceiptModal = lazy(() => import('@/pages/cooperative/components/ReceiptModal').then(m => ({ default: m.ReceiptModal })));

export interface UniversalCoopMemberViewProps {
  hideLayout?: boolean;
  isModal?: boolean;
  onClose?: () => void;
  className?: string;
}

export const UniversalCoopMemberView: React.FC<UniversalCoopMemberViewProps> = React.memo(({
  hideLayout = false,
  isModal = false,
  onClose,
  className,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // 1. Data Query: Member Profile /me
  const { data: memberInfo = null, isLoading: loadingMemberInfo } = useQuery<MemberInfo | null>({
    queryKey: ['cooperative-member-me', user?.id],
    queryFn: async () => {
      try {
        const res = await api.get('/cooperative/members/me');
        return res?.data?.data || null;
      } catch {
        return null;
      }
    },
    staleTime: 60000,
  });

  // 2. Data Query: Dedicated Member Summary
  const { data: memberSummaryRes, isLoading: loadingSummary } = useQuery<{ success: boolean; data: MemberDashboardSummary }>({
    queryKey: ['cooperative-dashboard', 'summary-member', user?.id],
    queryFn: async () => {
      try {
        const res = await api.get('/cooperative/dashboard/summary-member');
        return res.data;
      } catch {
        return { success: false, data: null as any };
      }
    },
    staleTime: 45000,
  });
  const memberSummary = memberSummaryRes?.data || null;

  // 3. Status Evaluator
  const memberStatus = useMemo<'loading' | 'member' | 'non-member'>(() => {
    if (loadingMemberInfo || loadingSummary) return 'loading';
    if (memberSummary?.isMember) return 'member';
    return memberInfo && memberInfo.status === 'ACTIVE' ? 'member' : 'non-member';
  }, [loadingMemberInfo, loadingSummary, memberInfo, memberSummary]);

  // 4. Tabungan Personal
  const { data: mySavingsSum = 0 } = useQuery<number>({
    queryKey: ['cooperative-my-savings', memberInfo?.memberNo || user?.id],
    queryFn: async () => {
      try {
        const savingsRes = await api.get('/cooperative/savings');
        return (savingsRes.data || []).reduce((sum: number, s: { amount?: number | string }) => sum + Number(s.amount || 0), 0);
      } catch {
        return 0;
      }
    },
    enabled: memberStatus === 'member',
    staleTime: 45000,
  });

  // 5. SHU Personal
  const { data: myShuSum = 0 } = useQuery<number>({
    queryKey: ['cooperative-my-shu', memberInfo?.memberNo || user?.id],
    queryFn: async () => {
      try {
        const shuRes = await api.get('/cooperative/shu/my-history');
        if (shuRes.data?.success) {
          return (shuRes.data.data || []).reduce((sum: number, h: { totalShu?: number | string }) => sum + Number(h.totalShu || 0), 0);
        }
        return 0;
      } catch {
        return 0;
      }
    },
    enabled: memberStatus === 'member',
    staleTime: 60000,
  });

  // 6. Riwayat Belanja Kasir Toko
  const { data: salesHistory = [], isLoading: salesLoading } = useQuery<Sale[]>({
    queryKey: ['cooperative-sales-history', user?.id],
    queryFn: async () => {
      try {
        const res = await api.get('/cooperative/toko/history');
        return Array.isArray(res.data) ? res.data : [];
      } catch {
        return [];
      }
    },
    enabled: memberStatus === 'member',
    staleTime: 45000,
  });

  // 7. Pengumuman Koperasi
  const { data: announcements = [] } = useQuery<Announcement[]>({
    queryKey: ['cooperative-announcements'],
    queryFn: async () => {
      try {
        const annRes = await api.get('/cooperative/announcements');
        const annList = annRes.data?.data;
        return Array.isArray(annList) ? annList : [];
      } catch {
        return [];
      }
    },
    staleTime: 60000,
  });

  // 8. Pengaturan Koperasi (Kop & Logo Struk)
  const { data: coopSettings = null } = useQuery<CoopSettingsData | null>({
    queryKey: ['cooperative-settings'],
    queryFn: fetchCoopSettings,
    staleTime: 120000,
  });

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['cooperative-member-me'] }),
        queryClient.invalidateQueries({ queryKey: ['cooperative-dashboard', 'summary-member'] }),
        queryClient.invalidateQueries({ queryKey: ['cooperative-my-savings'] }),
        queryClient.invalidateQueries({ queryKey: ['cooperative-my-shu'] }),
        queryClient.invalidateQueries({ queryKey: ['cooperative-sales-history'] }),
        queryClient.invalidateQueries({ queryKey: ['cooperative-announcements'] }),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  const printReceipt = useCallback((sale: Sale) => {
    if (!sale || !coopSettings) return;
    const rawName = memberInfo?.User?.full_name || memberInfo?.name || user?.full_name || 'Tamu';
    const rawMemberNo = memberInfo?.memberNo || '';
    printCoopReceipt(sale, coopSettings, rawName, rawMemberNo, 'Mandiri');
  }, [coopSettings, memberInfo, user]);

  const effectiveSavingsSum = mySavingsSum || (memberSummary?.mySavings?.total ?? 0);
  const effectiveShuSum = myShuSum || (memberSummary?.myShuEstimate?.estimatedAmount ?? 0);
  const effectiveMemberInfo = memberInfo || memberSummary?.memberInfo || null;

  return (
    <div className={cn("w-full min-w-0 max-w-full space-y-5 animate-in fade-in duration-200", className)}>
      {/* ── Header Toolbar (Hanya jika tidak di-hide atau jika di dalam Modal) ── */}
      {!hideLayout && (
        <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShoppingBag size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5 truncate">
                <span>Portal Buku Anggota Koperasi</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-extrabold shrink-0">
                  Self-Service
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Cek buku tabungan, riwayat belanja kasir, status pinjaman, dan dividen SHU mandiri.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8 px-2.5 rounded-xl text-xs font-bold"
              title="Perbarui Data Koperasi"
            >
              <RefreshCw size={13} className={cn("text-slate-500", isRefreshing && "animate-spin")} />
              <span className="hidden sm:inline">Segarkan</span>
            </Button>
            {isModal && onClose && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="Tutup"
              >
                <X size={16} />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── Core Member Section ── */}
      {memberStatus === 'loading' ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <RefreshCw className="animate-spin text-emerald-500 mx-auto" size={24} />
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Menghubungkan ke Buku Anggota Koperasi...
          </p>
        </div>
      ) : (
        <CoopMemberSection
          memberStatus={memberStatus}
          memberInfo={effectiveMemberInfo}
          user={user as CoopUserInfo | null}
          mySavingsSum={effectiveSavingsSum}
          myShuSum={effectiveShuSum}
          announcements={announcements}
          salesHistory={salesHistory}
          salesLoading={salesLoading}
          printReceipt={printReceipt}
          memberSummary={memberSummary}
        />
      )}

      {/* ── Modal Visual Receipt ── */}
      {showReceiptModal && selectedSale && (
        <Suspense fallback={null}>
          <ReceiptModal
            isOpen={showReceiptModal}
            onClose={() => {
              setShowReceiptModal(false);
              setSelectedSale(null);
            }}
            selectedSale={selectedSale}
            coopSettings={coopSettings}
            memberInfo={memberInfo}
            user={user as CoopUserInfo | null}
            printReceipt={printReceipt}
          />
        </Suspense>
      )}
    </div>
  );
});

UniversalCoopMemberView.displayName = 'UniversalCoopMemberView';
