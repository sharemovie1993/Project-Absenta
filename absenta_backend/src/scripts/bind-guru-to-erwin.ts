import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';

async function bindGuruToErwin() {
  console.log('🚀 [MENGHUBUNGKAN AKUN GURU MATA PELAJARAN KE ERWIN DEMO (42 JADWAL KBM)]...\n');

  // 1. Cari Guru Erwin dengan 42 Jadwal KBM di Demo
  const erwinGuru = await prisma.guru.findFirst({
    where: {
      tenant_id: DEMO_ID,
      nama_guru: { contains: 'Erwin', mode: 'insensitive' },
      JadwalKBM: { some: {} }
    },
    include: {
      JadwalKBM: true,
      User: true
    }
  });

  if (!erwinGuru) {
    throw new Error('Guru Erwin dengan jadwal KBM tidak ditemukan di Demo.');
  }

  console.log(`📌 Target Guru: ${erwinGuru.nama_guru} (ID: ${erwinGuru.id})`);
  console.log(`   ├─ Jadwal Mengajar: ${erwinGuru.JadwalKBM.length} Jadwal KBM`);
  console.log(`   ├─ Current User ID: ${erwinGuru.user_id}`);
  console.log(`   └─ Current Email  : ${erwinGuru.User?.email}`);

  // 2. Format Hash Password
  const defaultHash = await bcrypt.hash('password123', 10);

  // Jika akun guru@absenta.id sudah ada sebelumnya pada user lain, ubah emailnya
  const oldGuruUser = await prisma.user.findFirst({
    where: {
      tenant_id: DEMO_ID,
      email: 'guru@absenta.id',
      id: { not: erwinGuru.user_id }
    }
  });

  if (oldGuruUser) {
    await prisma.user.update({
      where: { id: oldGuruUser.id },
      data: { email: `guru.archived.${Date.now()}@demo.absenta.id` }
    });
  }

  // Update user milik Erwin menjadi guru@absenta.id
  await prisma.user.update({
    where: { id: erwinGuru.user_id },
    data: {
      email: 'guru@absenta.id',
      full_name: 'Erwin Demo',
      password: defaultHash,
      status: 'ACTIVE'
    }
  });

  console.log(`✔ Email user Guru Erwin (${erwinGuru.nama_guru}) telah diubah menjadi 'guru@absenta.id'.`);

  // 3. Verifikasi Akhir
  const verifiedGuru = await prisma.guru.findUnique({
    where: { id: erwinGuru.id },
    include: { User: true, JadwalKBM: true }
  });

  console.log('\n================ VERIFIKASI AKHIR GURU DEMO ================');
  console.log(`📌 Nama Guru      : ${verifiedGuru?.nama_guru}`);
  console.log(`📌 User Email     : ${verifiedGuru?.User.email}`);
  console.log(`📌 User Full Name : ${verifiedGuru?.User.full_name}`);
  console.log(`📌 Total Jadwal   : ${verifiedGuru?.JadwalKBM.length} Jadwal Mengajar KBM`);
  console.log('============================================================');
  console.log('🎉 AKUN GURU MATA PELAJARAN (guru@absenta.id) KINI 100% TERHUBUNG KE ERWIN!');
}

bindGuruToErwin().catch(console.error).finally(() => prisma.$disconnect());
