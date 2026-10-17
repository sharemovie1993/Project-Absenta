import React, { useMemo, useCallback, useEffect, lazy, Suspense } from 'react';
import { SectionCard } from '../../components/ui/SectionCard';
import { Spinner } from '../../components/ui/Spinner';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { WorkspaceAppLauncherCard } from '../../components/common/WorkspaceAppLauncherCard';
import { useSocket } from '../../hooks/useSocket';
import { useQueryClient } from '@tanstack/react-query';
import { useCapabilities } from '../../hooks/useCapabilities';
import { ChartOfAccountsSection } from '../../components/cooperative/accounting/ChartOfAccountsSection';

export const ChartOfAccountsPage: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const { isKoperasiFinance, isKoperasiHead, isAdmin, isSuperAdmin } = useCapabilities();
  const canManage = isKoperasiFinance || isKoperasiHead || isAdmin || isSuperAdmin;

  // Realtime synchronization untuk Akuntansi (Pilar 3 & Pilar 5)
  const { subscribe, unsubscribe, isConnected } = useSocket();

  const handleRealtimeUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['coop-accounts'] });
    queryClient.invalidateQueries({ queryKey: ['cooperative-balance-sheet'] });
  }, [queryClient]);

  useEffect(() => {
    if (!isConnected) return;

    subscribe('coop_accounting_update', handleRealtimeUpdate);

    return () => {
      unsubscribe('coop_accounting_update', handleRealtimeUpdate);
    };
  }, [isConnected, handleRealtimeUpdate, subscribe, unsubscribe]);

  const breadcrumbs = useMemo(() => [
    { label: 'Koperasi', path: '/cooperative/dashboard' },
    { label: 'Bagan Akun (COA)', path: '/cooperative/chart-of-accounts' }
  ], []);

  const instruction = useMemo(() => ({
    title: 'Panduan Bagan Akun (Chart of Accounts)',
    description: 'Bagan Akun berjenjang memungkinkan koperasi mengelola struktur rekening pembukuan secara mandiri, rapi, dan modular layaknya sistem akuntansi Accurate.',
    items: [
      { text: 'Akun Induk (Header): Berfungsi sebagai wadah/kategori pengelompokan rekening. Saldo otomatis dijumlahkan dari seluruh sub-akun di bawahnya (rollup).' },
      { text: 'Akun Detail (Posting): Rekening operasional yang dapat dipilih saat menjurnal kasir POS, simpanan, pinjaman, BKK/BKM, dan mutasi kas.' },
      { text: '5 Klasifikasi Standar: 1-Aktiva (Aset/Kas/Bank), 2-Kewajiban (Hutang/Simpanan), 3-Ekuitas (Modal), 4-Pendapatan (Jasa/Toko), 5-Beban (Biaya Operasional).' },
      { text: 'Akun Sistem Bawaan: Dilindungi dari penghapusan demi menjaga integritas transaksi otomasi modul koperasi sekolah.' }
    ]
  }), []);

  return (
    <PremiumFeatureGate 
      moduleName="KOPERASI" 
      featureName="Bagan Akun Koperasi"
    >
      <InfraErrorBoundary>
        <AcademicPageLayout
          title="Bagan Akun (Chart of Accounts)"
          subtitle="Kelola rekening pembukuan bertingkat standar akuntansi koperasi sekolah"
          breadcrumbs={breadcrumbs}
          instruction={instruction}
          activeSidebarItem="/cooperative/chart-of-accounts"
        >
          <div className="space-y-6">
            <ChartOfAccountsSection canManage={canManage} />
            <WorkspaceAppLauncherCard />
          </div>
        </AcademicPageLayout>
      </InfraErrorBoundary>
    </PremiumFeatureGate>
  );
});

ChartOfAccountsPage.displayName = 'ChartOfAccountsPage';
export default ChartOfAccountsPage;
