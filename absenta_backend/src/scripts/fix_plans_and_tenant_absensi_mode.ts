import { prisma } from '../utils/prisma';
import { resolvePlanAbsensiMode, getEffectiveAbsensiMode } from '../utils/attendanceModeHelper';

async function main() {
  console.log('--- 1. Memeriksa & Mengoreksi absensi_mode pada semua tabel Plan lokal ---');
  const allPlans = await prisma.plan.findMany();
  let updatedPlanCount = 0;

  for (const plan of allPlans) {
    const correctMode = resolvePlanAbsensiMode(plan);
    if (plan.absensi_mode !== correctMode) {
      await prisma.plan.update({
        where: { id: plan.id },
        data: { absensi_mode: correctMode }
      });
      console.log(`✅ Plan [${plan.id}] "${plan.name}" dikoreksi: ${plan.absensi_mode} -> ${correctMode}`);
      updatedPlanCount++;
    }
  }
  console.log(`Selesai mengoreksi Plan: ${updatedPlanCount} plan diperbarui dari total ${allPlans.length} plan.`);

  console.log('\n--- 2. Memeriksa & Mengoreksi absensi_mode pada SEMUA Tenant ---');
  const allTenants = await prisma.tenant.findMany();
  for (const tenant of allTenants) {
    const effectiveMode = await getEffectiveAbsensiMode(tenant.id);
    if (tenant.absensi_mode !== effectiveMode) {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { absensi_mode: effectiveMode }
      });
      console.log(`✅ Tenant [${tenant.name}] (${tenant.subdomain}): ${tenant.absensi_mode} -> ${effectiveMode}`);
    } else {
      console.log(`ℹ️ Tenant [${tenant.name}] (${tenant.subdomain}) sudah sesuai: ${effectiveMode}`);
    }
  }
}

main()
  .catch(err => {
    console.error('Error saat migrasi:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
