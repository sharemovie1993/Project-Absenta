import React, { useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SectionCard } from '../../components/ui/SectionCard';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { ExpenseVoucherSection } from '../../components/cooperative/accounting';
import { useSocket } from '../../hooks/useSocket';
import { useQueryClient } from '@tanstack/react-query';

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

  // Realtime synchronization untuk Kas & Bank
  const { subscribe, unsubscribe, isConnected } = useSocket();

  useEffect(() => {
    if (!isConnected) return;

    const handleRealtimeUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['cooperative-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['cooperative-deposits'] });
      queryClient.invalidateQueries({ queryKey: ['cooperative-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['cooperative-bank-accounts'] });
    };

    subscribe('coop_accounting_update', handleRealtimeUpdate);
    subscribe('coop_pos_update', handleRealtimeUpdate);

    return () => {
      unsubscribe('coop_accounting_update', handleRealtimeUpdate);
      unsubscribe('coop_pos_update', handleRealtimeUpdate);
    };
  }, [isConnected, queryClient, subscribe, unsubscribe]);

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
        instruction={instruction}
      >
        <InfraErrorBoundary>
          <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
            <div className="w-full min-w-0 max-w-full">
              <ExpenseVoucherSection 
                initialSubTab={initialSubTab}
                autoOpenCreateModal={autoOpenModal}
              />
            </div>
          </SectionCard>
        </InfraErrorBoundary>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});

CashBankPage.displayName = 'CashBankPage';
export default CashBankPage;
