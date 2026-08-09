import React, { useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCapabilities } from '../../hooks/useCapabilities';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { Card } from '../../components/ui/Card';

// Lazy load Loader for performance optimization (Pillar 11 & 20)
const Loader = lazy(() => import('../../components/ui/Loader').then(m => ({ default: m.Loader })));

interface RedirectRoute {
  path: string;
  check: () => boolean;
}

export const HubinWorkspacePage: React.FC = React.memo(() => {
  const { can, canAny } = useCapabilities();
  const navigate = useNavigate();

  // Callback to execute routing (Pillar 3 & useCallback requirement)
  const handleRedirect = useCallback((path: string) => {
    navigate(path, { replace: true });
  }, [navigate]);

  // Use memo to optimize permission decision routing matrix (Pillar 3 & 20)
  const routes = useMemo<RedirectRoute[]>(() => [
    {
      path: '/hubin/dashboard',
      check: () => can('dashboard.view.hubin')
    },
    {
      path: '/hubin/mitra',
      check: () => canAny(['hubin.partners.manage', 'hubin.mou.view.list'])
    },
    {
      path: '/hubin/penempatan',
      check: () => canAny(['hubin.pkl.manage', 'hubin.pkl.view.list'])
    },
    {
      path: '/hubin/absensi',
      check: () => canAny(['hubin.pkl.view.list', 'hubin.absensi.view.history', 'hubin.pkl.view.list'])
    },
    {
      path: '/hubin/monitoring',
      check: () => canAny(['hubin.pkl.view.list', 'hubin.logbook.manage'])
    },
    {
      path: '/hubin/bkk',
      check: () => canAny(['hubin.self.bkk', 'hubin.bkk.manage', 'hubin.lamaran.manage', 'hubin.partners.manage', 'hubin.pkl.view.list'])
    },
    {
      path: '/hubin/tracer',
      check: () => canAny(['hubin.self.tracer', 'hubin.tracer.view', 'hubin.partners.manage'])
    },
    {
      path: '/hubin/tefa',
      check: () => can('hubin.tefa.manage')
    }
  ], [can, canAny]);

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
    { label: 'Hubin Workspace' }
  ], []);

  return (
    <PremiumFeatureGate
      moduleName="HUBIN"
      featureName="Hubin Workspace Router"
      description="Menentukan sub-modul Hubin terbaik untuk pengguna berdasarkan izin hak akses."
    >
      <AcademicPageLayout
        title="Redirecting to Hubin Workspace..."
        description="Mengarahkan ke workspace Hubin Anda yang sesuai..."
        breadcrumbs={breadcrumbs}
        hardeningModuleKey="hubin_workspace"
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

export default HubinWorkspacePage;
