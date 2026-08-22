import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';

async function fixDemoRolesAndPositions() {
  console.log('🚀 [MEMPERBAIKI ROLE DASAR & POSISI JABATAN SESUAI PO-LP DI DEMO]...\n');

  // Ambil semua role di tenant Demo
  const roles = await prisma.role.findMany({ where: { tenant_id: DEMO_ID } });
  const roleMap: Record<string, string> = {};
  roles.forEach(r => { roleMap[r.name.toUpperCase()] = r.id; });

  console.log('Role yang tersedia di Demo:', Object.keys(roleMap));

  // Ambil semua position di tenant Demo
  const positions = await prisma.organizationalPosition.findMany({ where: { tenant_id: DEMO_ID } });
  const posMap: Record<string, string> = {};
  positions.forEach(p => { posMap[p.code.toUpperCase()] = p.id; });

  const roleGuruId = roleMap['GURU'];
  const roleAdminId = roleMap['ADMIN'];

  // 1. Matriks Penugasan Presisi Akun Demo
  const accountSetup = [
    {
      email: 'admin@absenta.id',
      roleId: roleAdminId,
      posCode: null,
      desc: 'Administrator Utama Sekolah (Akses Penuh IT)'
    },
    {
      email: 'kurikulum@absenta.id',
      roleId: roleGuruId,
      posCode: 'KURIKULUM',
      desc: 'Waka Kurikulum (Akses Eksklusif Kurikulum, Jadwal & KBM)'
    },
    {
      email: 'kesiswaan@absenta.id',
      roleId: roleGuruId,
      posCode: 'KESISWAAN',
      desc: 'Waka Kesiswaan (Akses Eksklusif Pelanggaran, Eskul & Tata Tertib)'
    },
    {
      email: 'hubin@absenta.id',
      roleId: roleGuruId,
      posCode: 'HUBIN',
      desc: 'Waka Hubin (Akses Eksklusif PKL, BKK, TEFA & Mitra Industri)'
    },
    {
      email: 'sarpras@absenta.id',
      roleId: roleGuruId,
      posCode: 'SARPRAS',
      desc: 'Waka Sarpras (Akses Eksklusif Inventaris Aset & Sarpras)'
    },
    {
      email: 'bpbk@absenta.id',
      roleId: roleGuruId,
      posCode: 'BPBK',
      desc: 'Koordinator BP/BK (Akses Eksklusif Konseling & Kasus Siswa)'
    },
    {
      email: 'walikelas@absenta.id',
      roleId: roleGuruId,
      posCode: 'WALIKELAS',
      desc: 'Wali Kelas (Akses Siswa Binaan & Rapor Kelas)'
    },
    {
      email: 'kaprog@absenta.id',
      roleId: roleGuruId,
      posCode: 'KAPROG',
      desc: 'Ketua Program Keahlian (Akses Jurusan & PKL Jurusan)'
    },
    {
      email: 'toolman@absenta.id',
      roleId: roleGuruId,
      posCode: 'TOOLMAN',
      desc: 'Toolman (Akses Peminjaman & Servis Alat Bengkel)'
    },
    {
      email: 'gerbang@absenta.id',
      roleId: roleGuruId,
      posCode: 'GERBANG',
      desc: 'Petugas Gerbang (Akses Scan Masuk/Pulang)'
    },
    {
      email: 'guru.matematika@absenta.id',
      roleId: roleGuruId,
      posCode: null,
      desc: 'Guru Mata Pelajaran Matematika'
    },
    {
      email: 'guru.produktif@absenta.id',
      roleId: roleGuruId,
      posCode: null,
      desc: 'Guru Mata Pelajaran Produktif Kejuruan'
    },
    {
      email: 'kepsek@absenta.id',
      roleId: roleGuruId,
      posCode: 'KEPALA_SEKOLAH',
      desc: 'Kepala Sekolah (Akses Eksekutif & Supervisi)'
    },
    {
      email: 'tu@absenta.id',
      roleId: roleMap['TATA_USAHA'] || roleGuruId,
      posCode: 'TU_KEPALA',
      desc: 'Kepala Tata Usaha'
    }
  ];

  for (const item of accountSetup) {
    const user = await prisma.user.findFirst({
      where: { tenant_id: DEMO_ID, email: item.email }
    });

    if (!user) {
      console.warn(`⚠️ User '${item.email}' tidak ditemukan di Demo.`);
      continue;
    }

    // 1. Update Role dasar User
    await prisma.user.update({
      where: { id: user.id },
      data: {
        role_id: item.roleId
      }
    });
    console.log(`✔ [ROLE UPDATED] ${item.email.padEnd(26)} -> Role: ${item.roleId === roleAdminId ? 'ADMIN' : 'GURU/STAFF'}`);

    // 2. Pasangkan Jabatan Fungsional Struktural
    if (item.posCode) {
      const posId = posMap[item.posCode];
      if (posId) {
        // Cek apakah sudah ada assignment jabatan ini
        const existing = await prisma.organizationalAssignment.findFirst({
          where: { tenant_id: DEMO_ID, user_id: user.id, position_id: posId }
        });

        if (!existing) {
          await prisma.organizationalAssignment.create({
            data: {
              id: randomUUID(),
              tenant_id: DEMO_ID,
              user_id: user.id,
              position_id: posId,
              is_active: true
            }
          });
          console.log(`   🏛️  Jabatan [${item.posCode}] disematkan ke user.`);
        }
      } else {
        console.warn(`   ⚠️ Posisi kode '${item.posCode}' tidak ditemukan di database!`);
      }
    }
  }

  console.log('\n================ HASIL VERIFIKASI AKHIR SETELAH PERBAIKAN ================');
  const finalUsers = await prisma.user.findMany({
    where: {
      tenant_id: DEMO_ID,
      email: { in: accountSetup.map(a => a.email) }
    },
    include: { Role: true }
  });

  for (const u of finalUsers) {
    const assigns = await prisma.organizationalAssignment.findMany({
      where: { tenant_id: DEMO_ID, user_id: u.id },
      include: { Position: true }
    });
    const posCodes = assigns.map(a => a.Position?.code).join(', ');
    console.log(`📌 User: ${u.email.padEnd(28)} | Role: ${u.Role?.name.padEnd(10)} | Jabatan: [${posCodes || '-'}]`);
  }

  console.log('========================================================================');
  console.log('🎉 WAKA KURIKULUM & PERAN LAINNYA KINI MEMILIKI WEWENANG TERISOLASI & TIDAK LAGI OVERLAP DENGAN ADMIN!');
}

fixDemoRolesAndPositions().catch(console.error).finally(() => prisma.$disconnect());
