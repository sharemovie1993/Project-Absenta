import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { loadActiveSystemConfig } from '@/services/systemConfig';

/**
 * AuthLayout - Minimal wrapper for authentication pages.
 * Since redesigned pages (Login, ForgotPassword) handle their own full-screen layout,
 * this layout provider is now a simple passthrough that handles branding logic.
 */
export default function AuthLayout() {
  useEffect(() => {
    // Ensure system branding is applied even on auth pages
    loadActiveSystemConfig().catch(() => {});
  }, []);

  return <Outlet />;
}
