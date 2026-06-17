import { PrismaClient } from '@prisma/client';
import { tenantEntitlementService } from '../../modules/billing/services/tenant-entitlement.service';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 [DIAGNOSIS] Uji coba resolusi feature untuk tenant "system"...');
  try {
    const features = await tenantEntitlementService.resolveTenantFeatures('system');
    console.log('✅ Sukses menyelesaikan resolusi features:', features);
  } catch (err: any) {
    console.error('❌ ERROR SAAT RESOLVE FEATURES:', err.message);
    console.error(err.stack);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
