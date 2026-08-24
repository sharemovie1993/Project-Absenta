import React, { Suspense, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { isSystemSuperAdmin } from '@/utils/rbac';
import { Card, Loader } from '@/components/ui';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';

// Lazily load sub-views to optimize performance and compile size
const AdminBillingsView = React.lazy(() => import('./components/AdminBillingsView'));
const SuperAdminBillingsView = React.lazy(() => import('./components/SuperAdminBillingsView'));

const instructionData = {
  title: 'Panduan Billing & Tagihan',
  description: 'Pantau status langganan, riwayat invoice, dan mutasi pembayaran sekolah.',
  items: [
    { text: 'Tinjau status paket langganan aktif dan masa kedaluwarsa sistem.' },
    { text: 'Unduh invoice resmi atau lakukan konfirmasi perpanjangan layanan.' },
  ],
};

function BillingsPageContent() {
  const { user, subscription, isLoading: isAuthLoading } = useAuth();
  
  const isSuperAdmin = useMemo(() => 
    isSystemSuperAdmin(user?.role?.name, user?.tenant_id),
    [user?.role?.name, user?.tenant_id]
  );

  if (isAuthLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader size="lg" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Menyiapkan Informasi Tagihan...</p>
      </div>
    );
  }

  return (
    <AcademicPageLayout
      title="Manajemen Billing & Invoice"
      description={isSuperAdmin ? "Pusat kontrol pendapatan global dan pemantauan billing tenant." : "Kelola metode pembayaran, tinjau riwayat transaksi, dan unduh invoice sekolah Anda."}
      instruction={instructionData}
      hardeningModuleKey="billings_page"
    >
      <Card className="p-2 sm:p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm w-full min-w-0">
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
            <Loader size="lg" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Memuat Panel Billing...</p>
          </div>
        }>
          {isSuperAdmin ? (
            <SuperAdminBillingsView />
          ) : (
            <AdminBillingsView subscription={subscription} />
          )}
        </Suspense>
      </Card>
    </AcademicPageLayout>
  );
}

export default function BillingsPage() {
  return (
    <ErrorBoundary>
      <BillingsPageContent />
    </ErrorBoundary>
  );
}

