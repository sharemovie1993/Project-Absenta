import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';

async function checkAndFixTuRoles() {
  console.log('🔍 [MEMERIKSA AKUN-AKUN TU DI TENANT DEMO]...');

  const tuEmails = [
    'tu@absenta.id',
    'tu.persuratan@absenta.id',
    'tu.keuangan@absenta.id',
    'tu.kepegawaian@absenta.id',
    'tu.sarpras@absenta.id'
  ];

  // 1. Ambil Role GURU / STAF di Demo
  const guruRole = await prisma.role.findFirst({
    where: { tenant_id: DEMO_ID, name: 'GURU' }
  });

  console.log(`Role GURU di Demo: ID=${guruRole?.id}`);

  // 2. Ambil Semua Posisi TU di Demo
  const tuPositions = await prisma.organizationalPosition.findMany({
    where: {
      tenant_id: DEMO_ID,
      code: { in: ['TU_KEPALA', 'TU_PERSURATAN', 'TU_KEUANGAN', 'TU_KEPEGAWAIAN', 'TU_SARPRAS'] }
    }
  });

  const posMap: Record<string, string> = {};
  tuPositions.forEach(p => { posMap[p.code] = p.id; });
  console.log('Posisi TU di Demo:', posMap);

  // 3. Cek User dan Assignment
  for (const email of tuEmails) {
    const u = await prisma.user.findFirst({
      where: { tenant_id: DEMO_ID, email },
      include: {
        Role: true,
        organizationalAssignments: {
          include: { Position: true }
        },
        Guru: true
      }
    });

    if (!u) {
      console.log(`❌ User ${email} tidak ditemukan`);
      continue;
    }

    console.log(`\n📌 User: ${u.full_name} (${u.email})`);
    console.log(`   Role Saat Ini: ${u.Role?.name}`);
    console.log(`   Penugasan Jabatan: ${u.organizationalAssignments?.map((a: any) => a.Position?.code).join(', ') || 'TIDAK ADA'}`);

    // Pastikan role_id BUKAN ADMIN (Ubah ke GURU/STAF)
    if (u.Role?.name === 'ADMIN' && guruRole) {
      await prisma.user.update({
        where: { id: u.id },
        data: { role_id: guruRole.id }
      });
      console.log(`   ✔ Role diubah dari ADMIN -> GURU/STAF`);
    }

    // Jika user terikat Guru, pastikan jenis_ptk adalah TENAGA_KEPENDIDIKAN
    if (u.Guru) {
      await prisma.guru.update({
        where: { id: u.Guru.id },
        data: {
          jenis_ptk: 'TENAGA_KEPENDIDIKAN',
          jabatan: 'Tenaga Kependidikan / Tata Usaha'
        }
      });
      console.log(`   ✔ Data Guru [${u.Guru.nama_guru}] diset jenis_ptk = TENAGA_KEPENDIDIKAN`);
    }

    // Bersihkan penugasan yang salah (selain jabatan TU yang bersangkutan)
    let targetCode = '';
    if (email === 'tu@absenta.id') targetCode = 'TU_KEPALA';
    else if (email === 'tu.persuratan@absenta.id') targetCode = 'TU_PERSURATAN';
    else if (email === 'tu.keuangan@absenta.id') targetCode = 'TU_KEUANGAN';
    else if (email === 'tu.kepegawaian@absenta.id') targetCode = 'TU_KEPEGAWAIAN';
    else if (email === 'tu.sarpras@absenta.id') targetCode = 'TU_SARPRAS';

    // Hapus semua assignment yang BUKAN targetCode
    await prisma.organizationalAssignment.deleteMany({
      where: {
        tenant_id: DEMO_ID,
        user_id: u.id,
        Position: { code: { not: targetCode } }
      }
    });

    // Pastikan assignment targetCode ada
    if (targetCode && posMap[targetCode]) {
      const existing = await prisma.organizationalAssignment.findFirst({
        where: {
          tenant_id: DEMO_ID,
          user_id: u.id,
          position_id: posMap[targetCode]
        }
      });

      if (!existing) {
        await prisma.organizationalAssignment.create({
          data: {
            id: randomUUID(),
            tenant_id: DEMO_ID,
            user_id: u.id,
            position_id: posMap[targetCode],
            is_active: true
          }
        });
        console.log(`   ✔ Penugasan tunggal [${targetCode}] dibuat`);
      } else {
        console.log(`   ✔ Penugasan [${targetCode}] sudah aktif`);
      }
    }
  }

  console.log('\n🎉 PEMERIKSAAN & PERBAIKAN AKUN TU SELESAI!');
}

checkAndFixTuRoles()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
