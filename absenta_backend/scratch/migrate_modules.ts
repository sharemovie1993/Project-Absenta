import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting module migration and seeding...');

  // 1. Upsert Modules
  const modules = [
    {
      id: 'ABSENSI',
      name: 'Absensi & Kehadiran',
      description: 'Solusi monitoring kehadiran siswa dan guru secara real-time.',
      icon: 'Building2',
      order: 1,
    },
    {
      id: 'KOPERASI',
      name: 'Koperasi & Kantin',
      description: 'Digitalisasi transaksi koperasi dan kantin sekolah.',
      icon: 'Wallet',
      order: 2,
    },
    {
      id: 'RAPOR',
      name: 'Digital e-Rapor',
      description: 'Manajemen penilaian dan pelaporan hasil belajar siswa.',
      icon: 'FileText',
      order: 3,
    },
    {
      id: 'INVENTORY',
      name: 'Sarpras & Inventory',
      description: 'Monitoring aset dan sarana prasarana sekolah.',
      icon: 'Package',
      order: 4,
    },
  ];

  for (const m of modules) {
    await prisma.module.upsert({
      where: { id: m.id },
      update: m,
      create: m,
    });
    console.log(`✅ Module ${m.id} configured.`);
  }

  // 2. Map existing plans to modules
  console.log('🔄 Mapping existing plans to modules...');
  const allPlans = await prisma.plan.findMany();
  
  for (const plan of allPlans) {
    let moduleId = null;
    const sCode = plan.service_code.toUpperCase();
    
    if (sCode.includes('ABSENSI')) moduleId = 'ABSENSI';
    else if (sCode.includes('KOPERASI') || sCode.includes('KANTIN')) moduleId = 'KOPERASI';
    else if (sCode.includes('RAPOR')) moduleId = 'RAPOR';
    else if (sCode.includes('INVENTORY') || sCode.includes('SARPRAS')) moduleId = 'INVENTORY';

    if (moduleId) {
      await prisma.plan.update({
        where: { id: plan.id },
        data: { module_id: moduleId }
      });
    }
  }

  // 3. Create Dummy Plans for e-Rapor and Inventory
  console.log('🎁 Creating dummy plans for new modules...');
  
  const dummyPlans = [
    {
      code: 'RAPOR_BASIC_MONTHLY',
      service_code: 'RAPOR',
      module_id: 'RAPOR',
      name: 'e-Rapor Basic - Monthly',
      price_monthly: 150000,
      description: 'Manajemen rapor standar untuk sekolah menengah.',
      features_json: ['RAPOR', 'AKADEMIK'],
    },
    {
      code: 'INVENTORY_PRO_MONTHLY',
      service_code: 'INVENTORY',
      module_id: 'INVENTORY',
      name: 'Inventory Pro - Monthly',
      price_monthly: 200000,
      description: 'Manajemen aset lengkap dengan pelacakan barcode.',
      features_json: ['INVENTORY', 'SARPRAS'],
    }
  ];

  for (const dp of dummyPlans) {
    await prisma.plan.upsert({
      where: { code: dp.code },
      update: dp,
      create: dp as any
    });
  }

  console.log('✨ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
