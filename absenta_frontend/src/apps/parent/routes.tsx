import { type RouteObject } from 'react-router-dom';
import ParentLayout from './layouts/ParentLayout';
import ParentTokenGate from './pages/ParentTokenGate';
import ParentDashboard from './pages/ParentDashboard';
import ParentHistory from './pages/ParentHistory';
import ParentMonthlyRecap from './pages/ParentMonthlyRecap';
import ParentTracking from './pages/ParentTracking';
import ParentNotificationDetail from './pages/ParentNotificationDetail';
import ParentRootRedirect from './components/ParentRootRedirect';

export const parentRoutes: RouteObject[] = [
  {
    path: '/',
    element: <ParentLayout />,
    children: [
      { path: 'access', element: <ParentTokenGate /> },
      { path: 'dashboard', element: <ParentDashboard /> },
      { path: 'history', element: <ParentHistory /> },
      { path: 'rekap-bulanan', element: <ParentMonthlyRecap /> },
      { path: 'tracking-harian', element: <ParentTracking /> },
      { path: 'notification/:id', element: <ParentNotificationDetail /> },
      { path: '', element: <ParentRootRedirect /> },
    ],
  },
];
