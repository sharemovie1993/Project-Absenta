import { organizationalAuthorizationEngine } from '@/modules/auth/services/organizational-authorization.engine';
import { RoleName } from '@/constants/enums';
import { authorizationService } from '@/modules/auth/services/authorization.service';

/**
 * FUTUREPROOF ORGANIZATIONAL SCOPE MIDDLEWARE
 * Menggunakan Capability-Based Scoping alih-alih hardcoded role names.
 * Mendukung Multi-Unit (OU) dan Contextual Elevation.
 */
export const organizationalScopeMiddleware = async (request: any, _reply: any) => {
  const user = request.user;
  const userId = user?.id || user?.userId;
  if (!userId) return;

  // 1. Resolve Data Scope from Engine (Kelas, Unit, etc)
  const scope = await organizationalAuthorizationEngine.resolveDataScope(String(userId));
  
  // 2. Resolve Effective Capabilities (Role + Structural)
  const caps = await authorizationService.resolveUserCapabilities(String(userId), { user });
  const capSet = new Set(caps);

  // 3. Determine Base Scope Levels
  const isGlobalAdmin = user.roleName === RoleName.ADMIN || user.roleName === RoleName.SUPERADMIN;
  
  // SaaS Enterprise: Check capability instead of hardcoded strings
  const hasTenantWideCap = capSet.has('organization.scope.tenant_wide');
  const hasUnitRestrictedCap = capSet.has('organization.scope.unit_restricted');
  const hasTeachingRestrictedCap = capSet.has('organization.scope.teaching_restricted');

  // 4. Contextual Elevation Logic (Piket / Gate / Specific Contexts)
  const piketAuth = await authorizationService.isUserAuthorized(
    String(userId), 
    [
      'attendance.piket.view', 
      'attendance.piket.manage',
      'kesiswaan.piket.view',
      'kesiswaan.piket.manage',
      'attendance.gate.tap.entry',
      'attendance.gate.view.logs',
      'attendance.gate.bypass',
      'attendance.gate.face.enroll',
      'affairs.violations.report' // Allow global reporting context
    ], 
    { user }
  );
  const isPiketOrGate = piketAuth.allowed;

  // Determine if we should elevate to tenant_wide based on request parameters
  const isElevatedContext = isPiketOrGate && (
    request.query?.elevated_context === 'true' || 
    request.query?.tenant_wide === 'true' || 
    request.headers?.['x-elevated-context'] === 'true'
  );

  // 5. Final Decision: prioritizing the widest scope
  let isTenantWide = isGlobalAdmin || hasTenantWideCap || scope.tenant_wide || isElevatedContext;

  // 6. Inject Standardized Organizational Scope Object
  request.organizationalScope = {
    tenantId: user?.tenant_id || user?.tenantId || request.tenantId || (scope as any).tenantId || null,
    positions: scope.positions,
    kelas_ids: scope.kelas_ids,
    unit_ids: scope.unit_ids,
    tenant_wide: isTenantWide,
    
    // Metadata for specialized query logic
    is_elevated_context: isPiketOrGate || isTenantWide,
    is_unit_restricted: hasUnitRestrictedCap && !isTenantWide,
    is_teaching_restricted: hasTeachingRestrictedCap && !isTenantWide,
    
    // Legacy support (will be phased out)
    is_wali_kelas: hasUnitRestrictedCap && scope.kelas_ids.length > 0,
  };
};

/**
 * Middleware khusus untuk endpoint yang memerlukan akses lintas kelas:
 * - Absensi Sesi (guru perlu lihat semua siswa di kelas sesi tersebut)
 * - Piket Gerbang (petugas perlu cari siswa manapun)
 * Menggunakan scope yang sudah ada namun memaksa tenant_wide = true
 */
export const elevatedScopeMiddleware = async (request: any, reply: any) => {
  await organizationalScopeMiddleware(request, reply);
  // Force elevation for this specific middleware
  if (request.organizationalScope) {
    request.organizationalScope.tenant_wide = true;
  }
};
