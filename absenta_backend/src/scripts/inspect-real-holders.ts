import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';

async function inspectRealAssignments() {
  console.log('🔍 [INSPEKSI PEMEGANG JABATAN RIIL & JADWAL DI TENANT DEMO]...\n');

  // Ambil semua OrganizationalAssignment di tenant demo
  const assigns = await prisma.organizationalAssignment.findMany({
    where: { tenant_id: DEMO_ID },
    include: {
      User: true,
      Position: true,
    }
  });

  console.log(`Total penugasan jabatan struktural di Demo: ${assigns.length}\n`);

  for (const a of assigns) {
    const user = a.User;
    const pos = a.Position;
    if (!user || !pos) continue;

    // Cek apakah user ini terhubung ke Guru
    const guru = await prisma.guru.findFirst({
      where: { tenant_id: DEMO_ID, user_id: user.id }
    });

    let jadwalCount = 0;
    if (guru) {
      jadwalCount = await prisma.jadwalKBM.count({
        where: { tenant_id: DEMO_ID, guru_id: guru.id }
      });
    }

    console.log(`📌 Jabatan: [${pos.code}] ${pos.name}`);
    console.log(`   └─ User   : ${user.full_name} (${user.email})`);
    console.log(`   └─ Guru ID: ${guru ? guru.id : '(bukan guru)'}`);
    console.log(`   └─ Jadwal : ${jadwalCount} jadwal KBM\n`);
  }

  // Cek contoh 5 guru yang memiliki jadwal KBM terbanyak
  const gurus = await prisma.guru.findMany({
    where: { tenant_id: DEMO_ID },
    include: { User: true }
  });

  console.log('================ 5 GURU DENGAN JADWAL TERBANYAK ================');
  const guruWithJadwal = [];
  for (const g of gurus) {
    const count = await prisma.jadwalKBM.count({
      where: { tenant_id: DEMO_ID, guru_id: g.id }
    });
    if (count > 0) {
      guruWithJadwal.push({
        name: g.nama_guru,
        email: g.User?.email || '(no email)',
        count
      });
    }
  }

  guruWithJadwal.sort((a, b) => b.count - a.count);
  guruWithJadwal.slice(0, 10).forEach((item, idx) => {
    console.log(`${idx + 1}. ${item.name.padEnd(35)} | ${item.email.padEnd(30)} | ${item.count} Jadwal`);
  });
}

inspectRealAssignments().catch(console.error).finally(() => prisma.$disconnect());
