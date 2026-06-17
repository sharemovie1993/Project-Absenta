import { PrismaClient } from '@prisma/client';

/**
 * Migrasi fitur Plan dari field string `features` ke tabel `PlanFeature`
 * dan menyimpan representasi array fitur ke `features_json`.
 * 
 * Jalankan: npx ts-node scripts/migrate-plan-features.ts
 */
const prisma = new PrismaClient();

function parseFeatures(raw?: string | null): string[] {
  if (!raw) return [];
  // Split by comma or newline, trim, dedupe, remove empty
  const parts = raw
    .split(/[,\n]/)
    .map(s => s.trim())
    .filter(Boolean);
  return Array.from(new Set(parts));
}

async function migrate() {
  const plans = await prisma.plan.findMany({});
  let totalFeaturesCreated = 0;

  for (const plan of plans) {
    const list = plan.features_json
      ? (Array.isArray(plan.features_json) ? (plan.features_json as any[]).map(String) : [])
      : parseFeatures(plan.features);

    if (list.length === 0) continue;

    // Upsert features into PlanFeature and update features_json
    for (const item of list) {
      await prisma.planFeature.upsert({
        where: {
          // Composite unique not defined; emulate by id on content hashing or insert-only
          // For simplicity, create a record and rely on key index.
          // Use random id; duplicates will be avoided by checking existing first.
          id: `${plan.id}-${Buffer.from(item).toString('hex').slice(0, 16)}`,
        },
        update: {},
        create: {
          id: `${plan.id}-${Buffer.from(item).toString('hex').slice(0, 16)}`,
          plan_id: plan.id,
          key: item,
          value: null,
        },
      }).catch(async () => {
        // Fallback: if upsert fails due to id collision rule changes, ensure exists
        const exists = await prisma.planFeature.findFirst({
          where: { plan_id: plan.id, key: item },
        });
        if (!exists) {
          await prisma.planFeature.create({
            data: { plan_id: plan.id, key: item, value: null },
          });
        }
      });
      totalFeaturesCreated++;
    }

    await prisma.plan.update({
      where: { id: plan.id },
      data: { features_json: list as any },
    });
  }

  console.log(`✅ Migrasi selesai. Total fitur dibuat/diupsert: ${totalFeaturesCreated}`);
}

migrate()
  .catch((e) => {
    console.error('❌ Migrasi gagal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

