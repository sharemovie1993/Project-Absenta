import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';
export const DEMO_PARENT_MAGIC_TOKEN = 'absenta-demo-parent-magic-token-2026';

export async function setupDemoParentMagicToken() {
  console.log('🚀 [SETUP MAGIC TOKEN ORANG TUA SISWA DI TENANT DEMO]...\n');

  // 1. Ambil 1 Siswa Aktif di Demo (utamakan yang punya kelas aktif)
  const targetStudent = await prisma.siswa.findFirst({
    where: {
      tenant_id: DEMO_ID,
      status: 'AKTIF',
      kelas_id: { not: null }
    },
    include: { Kelas: true }
  });

  if (!targetStudent) {
    throw new Error('Tidak ditemukan siswa aktif di Tenant Demo.');
  }

  console.log(`📌 Siswa Terpilih: [${targetStudent.nis}] ${targetStudent.nama_siswa} (Kelas: ${targetStudent.Kelas?.nama_kelas})`);

  // 2. Buat atau perbarui record OrangTua
  let parent = await prisma.orangTua.findFirst({
    where: {
      tenant_id: DEMO_ID,
      no_hp: '081234567890'
    }
  });

  if (!parent) {
    parent = await prisma.orangTua.create({
      data: {
        id: randomUUID(),
        tenant_id: DEMO_ID,
        nama: 'Bapak Hartono Demo',
        no_hp: '081234567890',
        hubungan: 'AYAH'
      }
    });
    console.log(`✔ Dibuat record OrangTua: ${parent.nama} (ID: ${parent.id})`);
  } else {
    console.log(`✔ Record OrangTua sudah ada: ${parent.nama}`);
  }

  // 3. Tautkan ke Siswa di OrangTuaSiswa
  const existingRelation = await prisma.orangTuaSiswa.findFirst({
    where: {
      orang_tua_id: parent.id,
      siswa_id: targetStudent.id
    }
  });

  if (!existingRelation) {
    await prisma.orangTuaSiswa.create({
      data: {
        id: randomUUID(),
        orang_tua_id: parent.id,
        siswa_id: targetStudent.id
      }
    });
    console.log(`✔ Berhasil menautkan Orang Tua ke Siswa: ${targetStudent.nama_siswa}`);
  } else {
    console.log(`✔ Tautan OrangTuaSiswa sudah aktif.`);
  }

  // 4. Buat / Perbarui ParentAccessToken dengan Magic Token
  await prisma.parentAccessToken.deleteMany({
    where: { orang_tua_id: parent.id }
  });

  const expiredAt = new Date();
  expiredAt.setFullYear(expiredAt.getFullYear() + 5); // 5 tahun

  const tokenRecord = await prisma.parentAccessToken.create({
    data: {
      id: randomUUID(),
      orang_tua_id: parent.id,
      token: DEMO_PARENT_MAGIC_TOKEN,
      expired_at: expiredAt,
      is_active: true
    }
  });

  console.log(`\n🎉 MAGIC TOKEN ORANG TUA BERHASIL DIBUAT!`);
  console.log(`   ├─ Token    : ${tokenRecord.token}`);
  console.log(`   ├─ Orang Tua: ${parent.nama}`);
  console.log(`   ├─ Siswa    : ${targetStudent.nama_siswa} (${targetStudent.Kelas?.nama_kelas})`);
  console.log(`   └─ URL Demo : /parent-app?token=${tokenRecord.token}\n`);
}

if (require.main === module) {
  setupDemoParentMagicToken().catch(console.error).finally(() => prisma.$disconnect());
}
