import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const REAL_PROD_ID = '8535b49c-d3fc-4598-922a-7774b49ee7c5';
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';

async function inspectKaprogToolmanReal() {
  console.log('🔍 [INSPEKSI PENUGASAN JABATAN DI PRODUKSI SMKN 1 PLERED]...\n');

  // Ambil semua OrganizationalAssignment di tenant produksi SMKN 1 Plered
  const prodAssigns = await prisma.organizationalAssignment.findMany({
    where: { tenant_id: REAL_PROD_ID },
    include: {
      Position: true,
      User: true,
    }
  });

  console.log(`Total penugasan di Prod: ${prodAssigns.length}\n`);

  for (const a of prodAssigns) {
    const posCode = a.Position?.code || '';
    const posName = a.Position?.name || '';
    const userName = a.User?.full_name || '';
    const userEmail = a.User?.email || '';

    // Cari tahu apakah jabatan ini terkait Kaprog, Toolman, Kabeng, Unit/Jurusan
    console.log(`📌 [${posCode.padEnd(15)}] ${posName.padEnd(30)} -> ${userName.padEnd(35)} (${userEmail}) [Unit: ${a.unit_id || '-'}, Kelas: ${a.kelas_id || '-'}]`);
  }

  // Cek juga penugasan yang sama di Demo
  const demoAssigns = await prisma.organizationalAssignment.findMany({
    where: { tenant_id: DEMO_ID },
    include: {
      Position: true,
      User: true,
    }
  });

  console.log(`\n================ PENUGASAN DI DEMO (${demoAssigns.length}) ================`);
  for (const a of demoAssigns) {
    const posCode = a.Position?.code || '';
    if (posCode.includes('KAPROG') || posCode.includes('TOOLMAN') || posCode.includes('BENGKEL') || posCode.includes('LAB') || posCode.includes('KABENG')) {
      console.log(`📌 [${posCode.padEnd(15)}] ${a.Position?.name.padEnd(30)} -> ${a.User?.full_name.padEnd(35)} (${a.User?.email}) [Unit: ${a.unit_id || '-'}]`);
    }
  }
}

inspectKaprogToolmanReal().catch(console.error).finally(() => prisma.$disconnect());
