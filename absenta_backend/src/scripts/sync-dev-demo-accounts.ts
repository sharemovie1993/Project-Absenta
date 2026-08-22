import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const DEV_DEMO_TENANT_ID = '939edafa-aef1-4eaf-8fe4-e5b6e0e8645b';

async function syncDevDemoAccounts() {
  console.log('🔄 [SINKRONISASI PASSWORD & AKUN DEMO DI DB DEV 10.10.10.250]...\n');
  const hashedPassword = await bcrypt.hash('Demo123!', 10);

  const demoEmails = [
    'admin@absenta.id',
    'kepsek@absenta.id',
    'kurikulum@absenta.id',
    'kesiswaan@absenta.id',
    'sarpras@absenta.id',
    'hubin@absenta.id',
    'bpbk@absenta.id',
    'tu@absenta.id',
    'tu.kepegawaian@absenta.id',
    'tu.persuratan@absenta.id',
    'tu.keuangan@absenta.id',
    'tu.sarpras@absenta.id',
    'koperasi.ketua@absenta.id',
    'koperasi.bendahara@absenta.id',
    'koperasi.sekretaris@absenta.id',
    'koperasi.kasir@absenta.id',
    'koperasi.pengawas@absenta.id',
  ];

  // Update password seluruh akun demo yang ada ke Demo123!
  const updated = await prisma.user.updateMany({
    where: {
      tenant_id: DEV_DEMO_TENANT_ID,
      email: { in: demoEmails }
    },
    data: {
      password: hashedPassword
    }
  });
  console.log(`✅ Berhasil menyinkronkan password ${updated.count} akun demo di DB Dev (Password: Demo123!).`);

  // Pastikan role TU dan Kepsek di DB dev juga konsisten (GURU dengan penugasan fungsional)
  const roleGuru = await prisma.role.findFirst({
    where: { tenant_id: DEV_DEMO_TENANT_ID, name: 'GURU' }
  });

  if (roleGuru) {
    await prisma.user.updateMany({
      where: {
        tenant_id: DEV_DEMO_TENANT_ID,
        email: { in: ['tu@absenta.id', 'tu.persuratan@absenta.id', 'tu.keuangan@absenta.id', 'tu.kepegawaian@absenta.id', 'tu.sarpras@absenta.id', 'kepsek@absenta.id'] }
      },
      data: { role_id: roleGuru.id }
    });
    console.log('✅ Role akun TU dan Kepsek di DB dev diselaraskan ke GURU + Penugasan Fungsional.');
  }

  // Buat / Update akun guru.matematika@absenta.id & siswa.1@absenta.id jika belum ada
  const guruMat = await prisma.user.findFirst({
    where: { tenant_id: DEV_DEMO_TENANT_ID, email: 'guru.matematika@absenta.id' }
  });

  if (!guruMat && roleGuru) {
    await prisma.user.create({
      data: {
        tenant_id: DEV_DEMO_TENANT_ID,
        email: 'guru.matematika@absenta.id',
        full_name: 'Budi Santoso, S.Pd. (Guru Model)',
        password: hashedPassword,
        role_id: roleGuru.id
      }
    });
    console.log('✅ Akun guru.matematika@absenta.id berhasil dibuat di DB dev.');
  }

  const roleSiswa = await prisma.role.findFirst({
    where: { tenant_id: DEV_DEMO_TENANT_ID, name: 'SISWA' }
  });

  const siswa1 = await prisma.user.findFirst({
    where: { tenant_id: DEV_DEMO_TENANT_ID, email: 'siswa.1@absenta.id' }
  });

  if (!siswa1 && roleSiswa) {
    await prisma.user.create({
      data: {
        tenant_id: DEV_DEMO_TENANT_ID,
        email: 'siswa.1@absenta.id',
        full_name: 'Aditya Pratama (Siswa Demo)',
        password: hashedPassword,
        role_id: roleSiswa.id
      }
    });
    console.log('✅ Akun siswa.1@absenta.id berhasil dibuat di DB dev.');
  }

  console.log('\n🚀 [SINKRONISASI SELESAI] Database dev 10.10.10.250 siap 100% untuk 1-Click Demo Login!');
}

syncDevDemoAccounts()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
