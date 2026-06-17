const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  const tenantId = '17c66f12-715b-405f-b48e-485393fce5b4';
  const rplUnitId = '8901d8d7-3f82-4810-8007-5eaa7aea4e40';
  
  // Vanesa's actual data scope as resolved by determineDataScope
  const vanesaScope = {
    tenantId: tenantId,
    unitIds: [rplUnitId],
    tenantWide: false
  };

  console.log('--- Verification Scope ---');
  console.log(JSON.stringify(vanesaScope, null, 2));

  // 1. Get all locations in tenant
  const allLocations = await prisma.sarprasLocation.findMany({ where: { tenant_id: tenantId } });
  console.log('\nAll Locations in Tenant:', allLocations.length);
  allLocations.forEach((l: any) => console.log(`- ${l.nama} (Unit: ${l.unit_id || 'NULL'})`));

  // 2. Get assets as Vanesa
  // Mocking the getAssets logic from the service
  const allowedLocations = await prisma.sarprasLocation.findMany({
    where: { tenant_id: tenantId, unit_id: { in: vanesaScope.unitIds || [] } },
    select: { id: true }
  });
  const allowedIds = allowedLocations.map((l: any) => l.id);
  console.log('\nAllowed Location IDs for Vanesa:', allowedIds);

  const vanesaAssets = await prisma.sarprasAsset.findMany({
    where: { tenant_id: tenantId, location_id: { in: allowedIds } }
  });

  console.log('\nAssets visible to Vanesa:', vanesaAssets.length);
  vanesaAssets.forEach((a: any) => console.log(`- ${a.nama} (Location ID: ${a.location_id})`));

  // 3. Validation
  const labRpl = allLocations.find((l: any) => l.nama === 'Laboratorium RPL');
  if (!labRpl) {
      console.error('ERROR: Laboratorium RPL not found');
      return;
  }
  
  const hasOnlyRplAssets = vanesaAssets.every((a: any) => a.location_id === labRpl.id);
  console.log('\nResult: ' + (hasOnlyRplAssets ? 'SUCCESS: Scoping works!' : 'FAILED: Scoping leak detected!'));
}

verify()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
