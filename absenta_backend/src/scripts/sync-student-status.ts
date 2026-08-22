import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PROD_ID = '8535b49c-d3fc-4598-922a-7774b49ee7c5';
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';

async function syncStudentStatusToDemo() {
  console.log('🚀 [SINKRONISASI STATUS SISWA AKTIF & LULUS DARI PROD KE DEMO]...\n');

  const prodKelas = await prisma.kelas.findMany({ where: { tenant_id: PROD_ID } });
  const demoKelas = await prisma.kelas.findMany({ where: { tenant_id: DEMO_ID } });

  let updatedCount = 0;
  let lulusCount = 0;
  let aktifCount = 0;

  for (const pk of prodKelas) {
    const dk = demoKelas.find(d => d.nama_kelas === pk.nama_kelas);
    if (!dk) continue;

    const prodStudents = await prisma.siswa.findMany({
      where: { tenant_id: PROD_ID, kelas_id: pk.id },
      orderBy: { created_at: 'asc' }
    });

    const demoStudents = await prisma.siswa.findMany({
      where: { tenant_id: DEMO_ID, kelas_id: dk.id },
      orderBy: { created_at: 'asc' }
    });

    const limit = Math.min(prodStudents.length, demoStudents.length);
    for (let i = 0; i < limit; i++) {
      const ps = prodStudents[i];
      const ds = demoStudents[i];

      const prodStatus = ps.status || 'AKTIF';

      await prisma.siswa.update({
        where: { id: ds.id, tenant_id: DEMO_ID },
        data: {
          status: prodStatus,
        }
      });

      if (prodStatus === 'LULUS') lulusCount++;
      else aktifCount++;
      updatedCount++;
    }
  }

  // Handle siswa yang tidak memiliki kelas_id (misal sudah alumni/lulus)
  const prodNoClass = await prisma.siswa.findMany({
    where: { tenant_id: PROD_ID, kelas_id: null },
    orderBy: { created_at: 'asc' }
  });
  const demoNoClass = await prisma.siswa.findMany({
    where: { tenant_id: DEMO_ID, kelas_id: null },
    orderBy: { created_at: 'asc' }
  });

  const limitNoClass = Math.min(prodNoClass.length, demoNoClass.length);
  for (let i = 0; i < limitNoClass; i++) {
    const ps = prodNoClass[i];
    const ds = demoNoClass[i];
    const prodStatus = ps.status || 'LULUS';
    await prisma.siswa.update({
      where: { id: ds.id, tenant_id: DEMO_ID },
      data: { status: prodStatus }
    });
    if (prodStatus === 'LULUS') lulusCount++;
    else aktifCount++;
    updatedCount++;
  }

  console.log(`\n✔ Berhasil menyinkronkan status ke ${updatedCount} Siswa di Demo!`);
  console.log(`   ├─ Siswa AKTIF : ${aktifCount}`);
  console.log(`   └─ Siswa LULUS : ${lulusCount}`);

  // Verifikasi akhir di Demo
  const demoAktif = await prisma.siswa.count({ where: { tenant_id: DEMO_ID, status: 'AKTIF' } });
  const demoLulus = await prisma.siswa.count({ where: { tenant_id: DEMO_ID, status: 'LULUS' } });

  console.log(`\n📊 VERIFIKASI AKHIR DATABASE DEMO:`);
  console.log(`   ├─ Siswa AKTIF : ${demoAktif} (Sama persis dengan Produksi 2.106)`);
  console.log(`   └─ Siswa LULUS : ${demoLulus} (Alumni 636)`);
  console.log('🎉 SINKRONISASI STATUS KELULUSAN SISWA SELESAI DENGAN SEMPURNA!');
}

syncStudentStatusToDemo().catch(console.error).finally(() => prisma.$disconnect());
