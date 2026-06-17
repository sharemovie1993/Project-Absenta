import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function upsertCoreFeatureForPath(path: string, forceParent: boolean = false) {
  const menu = await prisma.menu.findFirst({ where: { path } });
  if (!menu) {
    console.log(`[SKIP] Menu not found for path: ${path}`);
    return;
  }

  const rf = menu.required_features as unknown;
  const toArray = (v: unknown): string[] => {
    if (Array.isArray(v)) return v.map(String);
    if (typeof v === 'string' && v.trim().length > 0) return [v.trim()];
    return [];
  };

  const current = toArray(rf).map(s => s.toUpperCase());
  const hasAbsensi = current.includes('ABSENSI');
  const hasCore = current.includes('CORE');

  // Parent: enforce CORE even if different or empty
  // Child: only change if ABSENSI present
  const shouldUpdate =
    forceParent ? !hasCore || hasAbsensi || current.length === 0 : hasAbsensi;

  if (!shouldUpdate) {
    console.log(`[OK] No change needed for: ${menu.name} (${path}) [${current.join(',') || 'NULL'}]`);
    return;
  }

  await prisma.menu.update({
    where: { id: menu.id },
    data: { required_features: ['CORE'] as any },
  });

  console.log(`[UPDATE] ${menu.name} (${path}) -> required_features=['CORE']`);
}

async function main() {
  console.log('=== MIGRATION: Set academic menus to CORE feature ===');

  // Parent menus: force to CORE
  const parentPaths = ['/menu/data-master', '/menu/akademik'];
  for (const p of parentPaths) {
    await upsertCoreFeatureForPath(p, true);
  }

  // Academic children: switch ABSENSI -> CORE when present
  const childPaths = [
    '/academic/jurusan',
    '/academic/kelas',
    '/academic/mapel',
    '/academic/guru',
    '/academic/siswa',
    '/academic/tahun-pelajaran',
    '/academic/semester',
    '/academic/guru-mapel',
    '/academic/wali-kelas',
  ];
  for (const p of childPaths) {
    await upsertCoreFeatureForPath(p, false);
  }

  console.log('=== DONE ===');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
