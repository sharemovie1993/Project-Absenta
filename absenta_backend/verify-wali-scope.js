const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { organizationalAuthorizationEngine } = require('./dist/modules/auth/services/organizational-authorization.engine');

async function main() {
  const user = await prisma.user.findFirst({ where: { email: 'sofyan@gmail.com' } });
  if (!user) return console.log('User not found');
  console.log('=== USER ===');
  console.log('ID:', user.id, '| Tenant:', user.tenant_id);

  // Simulate organizationalScopeMiddleware
  const scope = await organizationalAuthorizationEngine.resolveDataScope(user.id);
  console.log('\n=== RESOLVED SCOPE (organizationalScope) ===');
  console.log('kelas_ids:', scope.kelas_ids);
  console.log('unit_ids:', scope.unit_ids);
  console.log('tenant_wide:', scope.tenant_wide);
  console.log('positions:', scope.positions.map(p => p.code));

  // Simulate determineDataScope → request.dataScope
  const kelasIds = Array.isArray(scope.kelas_ids) ? scope.kelas_ids.map(x => String(x)) : undefined;
  const tenantWide = scope.tenant_wide === true;
  
  // isWaliKelas check
  const isWaliKelas = scope.kelas_ids.length > 0 && 
    scope.positions.some(p => ['WALI', 'WALIKELAS', 'HOMEROOM'].some(k => p.code.toUpperCase().includes(k)));
  
  console.log('\n=== REQUEST.DATASOPE ===');
  console.log('kelasIds:', kelasIds);
  console.log('tenantWide:', tenantWide);
  console.log('isWaliKelas:', isWaliKelas);

  // Now simulate getAcademicStats with this scope
  const tenantId = user.tenant_id;
  const whereClause = { tenant_id: tenantId };
  const siswaWhere = { tenant_id: tenantId };
  const kelasWhere = { tenant_id: tenantId };

  // THE KEY CHECK: does current code use the right field?
  // Current code checks: dataScope === 'isolate' && orgCtx?.kelas_ids
  // But actual field is: request.dataScope.kelasIds (not kelas_ids)
  console.log('\n=== SIMULATION: getAcademicStats with scoped data ===');
  
  if (kelasIds && kelasIds.length > 0 && !tenantWide) {
    siswaWhere.kelas_id = { in: kelasIds };
    kelasWhere.id = { in: kelasIds };
    console.log('Applying kelas filter:', kelasIds);
  } else {
    console.log('NO kelas filter applied. tenant_wide:', tenantWide, 'kelasIds:', kelasIds);
  }
  
  const totalSiswa = await prisma.siswa.count({ where: { ...siswaWhere, status: 'AKTIF' } });
  const totalKelas = await prisma.kelas.count({ where: kelasWhere });
  
  console.log('\n=== RESULT ===');
  console.log('Total Siswa (scoped):', totalSiswa);
  console.log('Total Kelas (scoped):', totalKelas);
  console.log('Expected: ~46 siswa in X TJKT 1');
}

main().catch(console.error).finally(() => prisma.$disconnect());
