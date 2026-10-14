import React, { useMemo, useCallback, useEffect, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SectionCard } from '../../components/ui/SectionCard';
import { Spinner } from '../../components/ui/Spinner';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { WorkspaceAppLauncherCard } from '../../components/common/WorkspaceAppLauncherCard';
import { useSocket } from '../../hooks/useSocket';
import { useQueryClient } from '@tanstack/react-query';

// Lazy Loaded Expense & Banking Section (Pilar 11 Hardening)
const ExpenseVoucherSection = lazy(() => 
  import('../../components/cooperative/accounting').then(m => ({ default: m.ExpenseVoucherSection }))
);

export const CashBankPage: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const actionParam = searchParams.get('action') || searchParams.get('subTab');

  const initialSubTab: 'EXPENSE' | 'DEPOSIT' | 'TRANSFER' = useMemo(() => {
    if (actionParam === 'deposit' || actionParam === 'bkm' || actionParam === 'masuk') return 'DEPOSIT';
    if (actionParam === 'transfer' || actionParam === 'mutasi' || actionParam === 'pindah') return 'TRANSFER';
    return 'EXPENSE';
  }, [actionParam]);

  const autoOpenModal = useMemo(() => {
    return !!actionParam;
  }, [actionParam]);

  // Realtime synchronization untuk Kas & Bank (Pilar 3 & Pilar 5 Memoized Handler & Cleanup)
  const { subscribe, unsubscribe, isConnected } = useSocket();

  const handleRealtimeUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['cooperative-expenses'] });
    queryClient.invalidateQueries({ queryKey: ['cooperative-deposits'] });
    queryClient.invalidateQueries({ queryKey: ['cooperative-transfers'] });
    queryClient.invalidateQueries({ queryKey: ['cooperative-bank-accounts'] });
  }, [queryClient]);

  useEffect(() => {
    if (!isConnected) return;

    subscribe('coop_accounting_update', handleRealtimeUpdate);
    subscribe('coop_pos_update', handleRealtimeUpdate);

    return () => {
      unsubscribe('coop_accounting_update', handleRealtimeUpdate);
      unsubscribe('coop_pos_update', handleRealtimeUpdate);
    };
  }, [isConnected, handleRealtimeUpdate, subscribe, unsubscribe]);

  const breadcrumbs = useMemo(() => [
    { label: 'Koperasi', path: '/cooperative/dashboard' },
    { label: 'Kas & Bank', path: '/cooperative/cash-bank' }
  ], []);

  const instruction = useMemo(() => ({
    title: 'Panduan Kas & Bank Koperasi',
    description: 'Halaman ini digunakan untuk mencatat dan memonitor seluruh mutasi kas tunai dan rekening bank koperasi secara real-time.',
    items: [
      { text: 'Tab Kas Keluar (BKK) digunakan untuk mencatat pembayaran beban operasional (listrik, internet, ATK, konsumsi, dan biaya lainnya).' },
      { text: 'Tab Kas Masuk (BKM) digunakan untuk mencatat penerimaan kas di luar kasir POS (sewa tempat, jasa giro bank, sumbangan, dll).' },
      { text: 'Tab Mutasi / Pindah Kas Bank digunakan untuk pemindahan dana antar rekening (setor kas tunai ke bank atau penarikan tunai dari bank).' },
      { text: 'Semua transaksi otomatis terjurnal ke Buku Besar, Laba Rugi, dan Laporan Arus Kas secara instan tanpa perlu perhitungan manual.' }
    ]
  }), []);

  return (
    <PremiumFeatureGate 
      moduleName="KOPERASI" 
      featureName="Kas & Bank"
    >
      <AcademicPageLayout
        title="Kas & Bank"
        description="Pencatatan kas masuk (BKM), kas keluar (BKK), dan transfer dana operasional koperasi"
        hardeningModuleKey="coop_cash_bank"
        breadcrumbs={breadcrumbs}
        topSlot={<WorkspaceAppLauncherCard workspaceId="COOPERATIVE_WORKSPACE" />}
        instruction={instruction}
      >
        <InfraErrorBoundary>
          <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
            <div className="w-full min-w-0 max-w-full">
              <Suspense 
                fallback={
                  <div className="flex flex-col items-center justify-center p-12 space-y-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <Spinner size="lg" />
                    <p className="text-xs text-slate-500 font-medium">Memuat data kas & perbankan koperasi...</p>
                  </div>
                }
              >
                <ExpenseVoucherSection 
                  initialSubTab={initialSubTab}
                  autoOpenCreateModal={autoOpenModal}
                />
              </Suspense>
            </div>
          </SectionCard>
        </InfraErrorBoundary>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});

CashBankPage.displayName = 'CashBankPage';
export default CashBankPage;
