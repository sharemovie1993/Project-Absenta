import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const PROD_ID = '8535b49c-d3fc-4598-922a-7774b49ee7c5';
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';

async function syncDemoKoperasi() {
  console.log('🚀 [SINKRONISASI PENGURUS KOPERASI REAL DARI PRODUKSI KE DEMO]...');

  // 1. Ambil penugasan koperasi di Produksi
  const prodAssignments = await prisma.organizationalAssignment.findMany({
    where: {
      tenant_id: PROD_ID,
      Position: {
        code: { in: ['KETUA_KOPERASI', 'BENDAHARA_KOPERASI', 'SEKRETARIS_KOPERASI', 'MANAJER_TOKO_KOPERASI', 'PENGAWAS_KOPERASI'] }
      },
      is_active: true
    },
    include: {
      Position: true,
      User: {
        include: {
          Guru: true
        }
      }
    }
  });

  console.log(`\n📋 Ditemukan ${prodAssignments.length} Assignment Koperasi di Produksi:`);
  for (const pa of prodAssignments) {
    console.log(`- [${pa.Position.code}] ${pa.Position.name} => ${pa.User.full_name} (NIP Guru: ${pa.User.Guru?.nip || 'Non-Guru'})`);
  }

  // 2. Ambil Posisi Organisasi di Demo
  const demoPositions = await prisma.organizationalPosition.findMany({
    where: {
      tenant_id: DEMO_ID,
      code: { in: ['KETUA_KOPERASI', 'BENDAHARA_KOPERASI', 'SEKRETARIS_KOPERASI', 'MANAJER_TOKO_KOPERASI', 'PENGAWAS_KOPERASI'] }
    }
  });

  const demoPosMap: Record<string, string> = {};
  demoPositions.forEach(p => {
    demoPosMap[p.code] = p.id;
  });

  // 3. Cari Role GURU di Demo
  const guruRole = await prisma.role.findFirst({
    where: {
      tenant_id: DEMO_ID,
      name: 'GURU'
    }
  });

  if (!guruRole) {
    throw new Error('Role GURU tidak ditemukan di tenant Demo');
  }

  const hashedPassword = await bcrypt.hash('password123', 10);

  // 4. Mapping Akun Demo Koperasi ke Guru Real di Demo
  const roleMapping = [
    {
      code: 'KETUA_KOPERASI',
      email: 'koperasi.ketua@absenta.id',
      simulatedName: 'Indra Demo',
      prodName: 'INDRA MOHAMAD GOZALI, S.Pd.',
      nipMatch: '198504202022211000'
    },
    {
      code: 'BENDAHARA_KOPERASI',
      email: 'koperasi.bendahara@absenta.id',
      simulatedName: 'Dani Demo',
      prodName: 'DANI SETIAWAN, S.E.',
      nipMatch: '198003072023211000'
    },
    {
      code: 'SEKRETARIS_KOPERASI',
      email: 'koperasi.sekretaris@absenta.id',
      simulatedName: 'Sarip Demo',
      prodName: 'Sarip Hidayat, S.Pd.I',
      nipMatch: '198210262025211000'
    },
    {
      code: 'MANAJER_TOKO_KOPERASI',
      email: 'koperasi.kasir@absenta.id',
      simulatedName: 'Tati Demo',
      prodName: 'TATI KARYATI, S.Pd.',
      nipMatch: '198509102022212000'
    },
    {
      code: 'PENGAWAS_KOPERASI',
      email: 'koperasi.pengawas@absenta.id',
      simulatedName: 'Siswoko Demo',
      prodName: 'SISWOKO, S.T.',
      nipMatch: '197509092022211000'
    }
  ];

  // Hapus akun dummy lama koperasi di Demo yang emailnya koperasi.*@absenta.id tapi tidak punya relasi Guru aktif
  const oldDummyUsers = await prisma.user.findMany({
    where: {
      tenant_id: DEMO_ID,
      email: { in: ['koperasi.ketua@absenta.id', 'koperasi.bendahara@absenta.id', 'koperasi.sekretaris@absenta.id', 'koperasi.kasir@absenta.id', 'koperasi.manajer@absenta.id', 'koperasi.pengawas@absenta.id'] }
    }
  });

  for (const du of oldDummyUsers) {
    // Cek apakah punya guru
    const hasGuru = await prisma.guru.findFirst({ where: { user_id: du.id } });
    if (!hasGuru) {
      await prisma.organizationalAssignment.deleteMany({ where: { user_id: du.id } });
      await prisma.user.delete({ where: { id: du.id } });
      console.log(`🗑️ Akun dummy lama dihapus: ${du.email} (${du.full_name})`);
    } else {
      // Ubah emailnya sementara jika bentrok
      await prisma.user.update({
        where: { id: du.id },
        data: { email: `old.${du.id.slice(0, 6)}.${du.email}` }
      });
    }
  }

  for (const m of roleMapping) {
    // Cari Guru di Demo berdasarkan nama
    const searchPart = m.simulatedName.split(' ')[0].toLowerCase();
    const demoGuru = await prisma.guru.findFirst({
      where: {
        tenant_id: DEMO_ID,
        nama_guru: { contains: searchPart, mode: 'insensitive' }
      }
    });

    console.log(`\n⚙️ Memproses [${m.code}] => ${m.simulatedName} (Guru ID: ${demoGuru?.id || 'tidak ada'})`);

    if (demoGuru && demoGuru.user_id) {
      // Update user yang sudah terikat langsung ke Guru ini
      const updatedUser = await prisma.user.update({
        where: { id: demoGuru.user_id },
        data: {
          email: m.email,
          password: hashedPassword,
          role_id: guruRole.id,
          status: 'ACTIVE'
        }
      });
      console.log(`  ✔ User Guru Real [${demoGuru.nama_guru}] diupdate -> Email: ${updatedUser.email} (ID: ${updatedUser.id})`);

      // Berikan OrganizationalAssignment di Demo
      const posId = demoPosMap[m.code];
      if (posId) {
        // Hapus penugasan lama untuk posisi ini di Demo
        await prisma.organizationalAssignment.deleteMany({
          where: {
            tenant_id: DEMO_ID,
            position_id: posId
          }
        });

        // Buat penugasan baru
        await prisma.organizationalAssignment.create({
          data: {
            id: randomUUID(),
            tenant_id: DEMO_ID,
            user_id: updatedUser.id,
            position_id: posId,
            is_active: true
          }
        });
        console.log(`  ✔ Penugasan Fungsional [${m.code}] berhasil diberikan ke ${updatedUser.full_name}`);
      }
    } else {
      console.warn(`  ⚠️ Guru untuk [${m.simulatedName}] tidak ditemukan di Demo`);
    }
  }

  console.log('\n🎉 SINKRONISASI PENGURUS KOPERASI SELESAI DENGAN SUKSES!');
}

syncDemoKoperasi()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
