const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDelete() {
  const tenantId = '44497b2b-a4f2-42c5-805b-105db58a6415'; // SMKN 1 PLERED
  const positionId = '7517505c-061d-4eee-a143-07c6f406b3dc'; // KESISWAAN
  
  // Cari Agus Waluyo dulu
  const user = await prisma.user.findFirst({
    where: { full_name: { contains: 'Agus Waluyo', mode: 'insensitive' } }
  });

  if (!user) {
    console.log('User Agus Waluyo tidak ditemukan!');
    return;
  }

  console.log(`Mencoba menghapus penugasan Agus Waluyo (User ID: ${user.id}) dari jabatan Kesiswaan...`);

  // Simulasi LOGIKA removeGuru di backend
  const result = await prisma.organizationalAssignment.updateMany({
    where: {
      tenant_id: tenantId,
      position_id: positionId,
      user_id: user.id,
      is_active: true
    },
    data: {
      is_active: false,
      end_date: new Date(),
      updated_at: new Date()
    }
  });

  console.log('--- HASIL UJI HAPUS ---');
  console.log(`Jumlah baris terpengaruh: ${result.count}`);
  
  if (result.count > 0) {
    console.log('✅ BERHASIL: Penugasan berhasil dinonaktifkan di database.');
  } else {
    console.log('❌ GAGAL: Tidak ada penugasan aktif yang ditemukan untuk kriteria tersebut.');
  }
}

testDelete().catch(console.error).finally(() => prisma.$disconnect());
