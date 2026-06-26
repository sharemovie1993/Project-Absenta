import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Loader } from '../../components/ui/Loader';

export const HubinWorkspacePage: React.FC = () => {
  const { can, canAny } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (can('dashboard.view.hubin')) {
      navigate('/hubin/dashboard', { replace: true });
    } else if (canAny(['hubin.partners.manage', 'hubin.mou.view.list'])) {
      navigate('/hubin/mitra', { replace: true });
    } else if (canAny(['hubin.pkl.manage', 'hubin.pkl.view.list'])) {
      navigate('/hubin/penempatan', { replace: true });
    } else if (canAny(['hubin.self.pkl', 'hubin.absensi.view.history', 'hubin.pkl.view.list'])) {
      navigate('/hubin/absensi', { replace: true });
    } else if (canAny(['hubin.pkl.view.list', 'hubin.logbook.manage'])) {
      navigate('/hubin/monitoring', { replace: true });
    } else if (canAny(['hubin.self.bkk', 'hubin.bkk.manage', 'hubin.lamaran.manage', 'hubin.partners.manage', 'hubin.pkl.view.list'])) {
      navigate('/hubin/bkk', { replace: true });
    } else if (canAny(['hubin.self.tracer', 'hubin.tracer.view', 'hubin.partners.manage'])) {
      navigate('/hubin/tracer', { replace: true });
    } else if (can('hubin.tefa.manage')) {
      navigate('/hubin/tefa', { replace: true });
    } else {
      navigate('/dashboard', { replace: true });
    }
  }, [can, canAny, navigate]);

  return (
    <div className="p-12 flex justify-center items-center h-64">
      <Loader size="lg" />
    </div>
  );
};

export default HubinWorkspacePage;

