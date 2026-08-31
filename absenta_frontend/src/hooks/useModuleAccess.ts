import { useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import { useCapabilities } from './useCapabilities';

const MODULE_ALIASES: Record<string, string[]> = {
  KOPERASI: ['KOPERASI', 'COOPERATIVE', 'COOP'],
  COOPERATIVE: ['KOPERASI', 'COOPERATIVE', 'COOP'],
  COOP: ['KOPERASI', 'COOPERATIVE', 'COOP'],
  ABSENSI: ['ABSENSI', 'ATTENDANCE', 'ATTENDANCE_OPS'],
  ATTENDANCE: ['ABSENSI', 'ATTENDANCE', 'ATTENDANCE_OPS'],
  ATTENDANCE_OPS: ['ABSENSI', 'ATTENDANCE', 'ATTENDANCE_OPS'],
  HUBIN: ['HUBIN', 'BKK', 'PRAKERIN'],
  SARPRAS: ['SARPRAS', 'ASSET'],
  RAPOR: ['RAPOR', 'REPORTING', 'NILAI'],
  REPORTING: ['RAPOR', 'REPORTING', 'NILAI'],
};

/**
 * 🛡️ useModuleAccess Hook
 * Evaluates whether current user / tenant has access to the requested module,
 * supporting module aliases, superadmin overrides, and multiple feature source structures.
 */
export function useModuleAccess(targetModuleName: string = 'KOPERASI') {
  const { user, subscription } = useAuthStore();
  const { isAdmin } = useCapabilities();

  const isAllowed = useMemo(() => {
    if (isAdmin) return true;

    const normalizedTarget = targetModuleName.toUpperCase();
    const allowedNames = MODULE_ALIASES[normalizedTarget] || [normalizedTarget];

    const rawFeatures =
      user?.features ||
      (subscription as any)?.features ||
      subscription?.Plan?.features_json ||
      subscription?.plan?.features_json ||
      [];

    const featuresUpper = Array.isArray(rawFeatures)
      ? rawFeatures.map(f => String(f).toUpperCase())
      : [];

    return featuresUpper.some(f => allowedNames.includes(f));
  }, [isAdmin, targetModuleName, user?.features, subscription]);

  return {
    isAllowed,
    isLocked: !isAllowed,
  };
}

export default useModuleAccess;
