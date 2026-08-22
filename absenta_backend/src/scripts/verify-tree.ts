import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';

async function verifyTree() {
  console.log('🔍 [VERIFIKASI TREE STRUKTUR ORGANISASI DI TENANT DEMO]...\n');

  const jurusans = await prisma.jurusan.findMany({ where: { tenant_id: DEMO_ID } });
  const kaprogPos = await prisma.organizationalPosition.findFirst({ where: { tenant_id: DEMO_ID, code: 'KAPROG' } });
  const toolmanPos = await prisma.organizationalPosition.findFirst({ where: { tenant_id: DEMO_ID, code: 'TOOLMAN' } });
  const kabengPos = await prisma.organizationalPosition.findFirst({ where: { tenant_id: DEMO_ID, code: 'KABENG' } });

  console.log(`=== STATUS PER JURUSAN (${jurusans.length} KONSENTRASI KEAHLIAN) ===`);
  for (const j of jurusans) {
    const kaprogAssign = await prisma.organizationalAssignment.findFirst({
      where: { tenant_id: DEMO_ID, position_id: kaprogPos?.id, unit_id: j.id, is_active: true },
      include: { User: true }
    });
    const toolmanAssign = await prisma.organizationalAssignment.findFirst({
      where: { tenant_id: DEMO_ID, position_id: toolmanPos?.id, unit_id: j.id, is_active: true },
      include: { User: true }
    });
    const kabengAssign = await prisma.organizationalAssignment.findFirst({
      where: { tenant_id: DEMO_ID, position_id: kabengPos?.id, unit_id: j.id, is_active: true },
      include: { User: true }
    });

    console.log(`📌 [${j.kode || j.singkatan}] ${j.nama}`);
    console.log(`   ├─ 🎓 Kaprog : ${kaprogAssign?.User?.full_name || '❌ BELUM DI-SET'}`);
    console.log(`   ├─ 🛠️ Toolman: ${toolmanAssign?.User?.full_name || '❌ BELUM DI-SET'}`);
    console.log(`   └─ 🏭 Kabeng : ${kabengAssign?.User?.full_name || '❌ BELUM DI-SET'}\n`);
  }
}

verifyTree().catch(console.error).finally(() => prisma.$disconnect());
