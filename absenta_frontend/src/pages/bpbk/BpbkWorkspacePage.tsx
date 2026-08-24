import React, { useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCapabilities } from '../../hooks/useCapabilities';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { Card } from '../../components/ui/Card';
import { formatDate } from '../../utils/layoutUtils';

const Loader = lazy(() => import('../../components/ui/Loader').then(m => ({ default: m.Loader })));

export const BpbkWorkspacePage: React.FC = React.memo(() => {
  const { can, canAny } = useCapabilities();
  const navigate = useNavigate();

  const handleRedirect = useCallback((path: string) => {
    navigate(path, { replace: true });
  }, [navigate]);

  const routes = useMemo(() => [
    {
      path: '/bpbk/dashboard',
      check: () => can('bpbk.dashboard.view') || true
    }
  ], [can]);

  useEffect(() => {
    const matchedRoute = routes.find(r => r.check());
    if (matchedRoute) {
      handleRedirect(matchedRoute.path);
    } else {
      handleRedirect('/dashboard');
    }
  }, [routes, handleRedirect]);

  const breadcrumbs = useMemo(() => [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'BPBK Workspace' }
  ], []);

  return (
    <PremiumFeatureGate
      moduleName="BPBK"
      featureName="Workspace BPBK"
      description="Akses ruang kerja Bimbingan Konseling (BP/BK) terintegrasi."
    >
      <AcademicPageLayout
        title="Mengalihkan ke Workspace BP/BK..."
        description="Mengarahkan ke dashboard Bimbingan Konseling..."
        breadcrumbs={breadcrumbs}
        hardeningModuleKey="bpbk_workspace"
        instruction={{
          title: "Panduan Pengalihan",
          items: [{ text: "Sistem sedang mengarahkan halaman..." }]
        }}
      >
        <Card className="border-none shadow-none bg-transparent">
          <div className="p-12 flex justify-center items-center h-64 bg-transparent">
            <Suspense fallback={null}>
              <Loader size="lg" />
            </Suspense>
          </div>
        </Card>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});

export default BpbkWorkspacePage;
