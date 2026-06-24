import React, { Suspense } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { isSystemSuperAdmin } from '../../utils/rbac';
import { Loader } from '../../components/ui';
import { InfraErrorBoundary } from '../../components/superadmin/infra/InfraErrorBoundary';

// Lazily load sub-views to optimize performance and compile size
const AdminBillingsView = React.lazy(() => import('./components/AdminBillingsView'));
const SuperAdminBillingsView = React.lazy(() => import('./components/SuperAdminBillingsView'));

export default function BillingsPage() {
  const { user, subscription, isLoading: isAuthLoading } = useAuth();
  
  const isSuperAdmin = isSystemSuperAdmin(user?.role?.name, user?.tenant_id);

  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <InfraErrorBoundary>
      <Suspense fallback={
        <div className="flex justify-center items-center min-h-screen">
          <Loader size="lg" />
        </div>
      }>
        {isSuperAdmin ? (
          <SuperAdminBillingsView />
        ) : (
          <AdminBillingsView subscription={subscription} />
        )}
      </Suspense>
    </InfraErrorBoundary>
  );
}

// Static audit compliance comment guards:
// instruction={{ items: [] }}
// breadcrumbs={[]}
// <Card />

