import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { isSystemSuperAdmin } from '../../utils/rbac';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  requiredRoles?: ('SUPERADMIN' | 'ADMIN' | 'GURU' | 'SISWA')[];
  requiredRole?: 'SUPERADMIN' | 'ADMIN' | 'GURU' | 'SISWA';
  requiredCapability?: string | string[];
}

function hasCapability(
  user: {
    capabilities?: string[];
    role?: { name?: string; permissions?: string | null } | { name?: string; permissions?: unknown } | null;
    permissions?: unknown;
    tenant_id?: string;
  } | null | undefined,
  capability: string
) {
  if (!user) return false;
  if (isSystemSuperAdmin(user.role as any, (user as any).tenant_id)) return true;
  if (user.role?.name === 'ADMIN') return true;
  if (user.capabilities && user.capabilities.includes(capability)) return true;

  const raw = (user as any).permissions ?? (user.role as any)?.permissions ?? null;
  if (!raw) return false;

  let list: string[] = [];
  try {
    const parsed: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) list = parsed.map((x) => String(x));
  } catch {
    list = String(raw)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (list.length === 0) return false;
  return list.includes(capability);
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRoles,
  requiredRole,
  requiredCapability
}) => {
  const { isAuthenticated, user, isLoading, subscription } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // If authenticated but user data is missing (e.g. network error during loadUser)
  if (isAuthenticated && !user && !isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center flex-col gap-4">
           <h2 className="text-xl font-semibold text-red-600">Connection Error</h2>
           <p className="text-gray-600">Unable to load user profile. Please check your connection.</p>
           <button 
             onClick={() => window.location.reload()}
             className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
           >
             Retry
           </button>
        </div>
      );
  }

  if (
    subscription?.status === 'PENDING_PAYMENT' && 
    user?.role?.name !== 'SUPERADMIN' && 
    !location.pathname.startsWith('/billing')
  ) {
    return <Navigate to="/billing" replace />;
  }

  if (
    subscription?.status === 'SUSPENDED' &&
    user?.role?.name !== 'SUPERADMIN' &&
    !location.pathname.startsWith('/billing') &&
    !location.pathname.startsWith('/suspended')
  ) {
    return <Navigate to="/suspended" replace />;
  }

  if (
    subscription?.status === 'CANCELLED' &&
    user?.role?.name !== 'SUPERADMIN' &&
    !location.pathname.startsWith('/billing') &&
    !location.pathname.startsWith('/cancelled')
  ) {
    return <Navigate to="/cancelled" replace />;
  }

  const rolesToCheck = requiredRoles || (requiredRole ? [requiredRole] : []);

  if (rolesToCheck.length > 0 && user?.role?.name) {
    const hasRoleAccess = rolesToCheck.some((role) => {
      if (role === 'SUPERADMIN') {
        return (
          user.role.name === 'SUPERADMIN' &&
          isSystemSuperAdmin(user.role.name, user?.tenant_id)
        );
      }
      return user.role.name === role;
    });

    if (!hasRoleAccess) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              Access Denied
            </h1>
            <p className="text-gray-600">
              You don't have permission to access this page.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Required roles: {rolesToCheck.join(', ')}, Your role: {user?.role?.name}
            </p>
          </div>
        </div>
      );
    }
  }

  if (requiredCapability) {
    const requiredList = Array.isArray(requiredCapability) ? requiredCapability : [requiredCapability];
    const hasCapabilityAccess = requiredList.some((cap) => hasCapability(user as any, cap));

    if (!hasCapabilityAccess) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              Access Denied
            </h1>
            <p className="text-gray-600">
              You don't have permission to access this page.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Required capability: {requiredList.join(', ')}
            </p>
          </div>
        </div>
      );
    }
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
