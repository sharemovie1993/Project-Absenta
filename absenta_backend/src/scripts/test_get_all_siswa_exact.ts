import 'dotenv/config'; // Crucial: load env vars first!
import { prisma } from '../utils/prisma';
import { getAllSiswaQuery } from '../modules/academic/siswa/services/queries/get-all-siswa.query';
import { organizationalAuthorizationEngine } from '../modules/auth/services/organizational-authorization.engine';
import { authorizationService } from '../modules/auth/services/authorization.service';
import { RoleName } from '../constants/enums';

async function main() {
  const userId = 'd33f7686-a1a6-4e65-b4ef-d77e180dc454';
  const tenantId = 'c2998880-ef62-43b7-8c85-2cc855a84d26';

  console.log('Resolving User info...');
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { Role: true }
  });

  if (!user) {
    throw new Error('User not found in database!');
  }
  console.log(`User: ${user.email}, Role: ${user.Role?.name}`);

  console.log('Resolving Data Scope...');
  const scope = await organizationalAuthorizationEngine.resolveDataScope(userId);
  console.log('Resolved Data Scope:', JSON.stringify(scope, null, 2));

  console.log('Resolving Capabilities...');
  const caps = await authorizationService.resolveUserCapabilities(userId, { user: { ...user, roleName: user.Role?.name } });
  const capSet = new Set(caps);

  const isGlobalAdmin = user.Role?.name === RoleName.ADMIN || user.Role?.name === RoleName.SUPERADMIN;
  const hasTenantWideCap = capSet.has('organization.scope.tenant_wide');
  
  let isTenantWide = isGlobalAdmin || hasTenantWideCap || scope.tenant_wide;

  const orgScope = {
    tenantId: tenantId,
    positions: scope.positions,
    kelas_ids: scope.kelas_ids,
    unit_ids: scope.unit_ids,
    tenant_wide: isTenantWide,
    is_elevated_context: isTenantWide,
    is_unit_restricted: capSet.has('organization.scope.unit_restricted') && !isTenantWide,
    is_teaching_restricted: capSet.has('organization.scope.teaching_restricted') && !isTenantWide,
    is_wali_kelas: capSet.has('organization.scope.unit_restricted') && scope.kelas_ids.length > 0,
  };

  console.log('Running getAllSiswaQuery with scope:', JSON.stringify(orgScope, null, 2));

  const result = await getAllSiswaQuery(
    { tenantId, org: orgScope },
    {
      page: 1,
      limit: 10,
      status: 'AKTIF'
    }
  );

  console.log('Success! Total:', result.pagination.total);
}

main().catch(err => {
  console.error('ERROR EXECUTING QUERY:');
  console.error(err);
});
