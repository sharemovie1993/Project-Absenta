import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Checking for SISWA with Petugas role...");

  // Find a SISWA who has an active structure in 'attendance' scope
  const siswa = await prisma.siswa.findFirst({
    where: {
      User: {
        Role: {
          name: 'SISWA'
        }
      },
      SiswaStrukturOrganisasi: {
        some: {
          is_active: true,
          StrukturOrganisasi: {
            scope: 'attendance'
          }
        }
      }
    },
    include: {
      User: {
        include: {
          Role: true
        }
      },
      SiswaStrukturOrganisasi: {
        where: {
          is_active: true
        },
        include: {
          StrukturOrganisasi: true
        }
      }
    }
  });

  if (!siswa) {
    console.log("❌ No SISWA found with active Petugas structure.");
    // Try to find ANY siswa to see if data exists
    const anySiswa = await prisma.siswa.findFirst({
        include: { User: { include: { Role: true } } }
    });
    if (anySiswa) {
        console.log(`ℹ️ Found random SISWA: ${anySiswa.nama_siswa} (${anySiswa.User?.email}). Checking their structures...`);
        const structures = await prisma.siswaStrukturOrganisasi.findMany({
            where: { siswa_id: anySiswa.id },
            include: { StrukturOrganisasi: true }
        });
        console.log(`   Structures count: ${structures.length}`);
        structures.forEach(s => console.log(`   - ${s.StrukturOrganisasi.nama} (Active: ${s.is_active}, Scope: ${s.StrukturOrganisasi.scope})`));
    }
    return;
  }

  console.log(`✅ Found Petugas SISWA: ${siswa.nama_siswa}`);
  console.log(`   Email: ${siswa.User?.email}`);
  console.log(`   Role: ${siswa.User?.Role.name}`);
  
  siswa.SiswaStrukturOrganisasi.forEach(sso => {
      console.log(`   - Position: ${sso.StrukturOrganisasi.nama}`);
      console.log(`     Scope: ${sso.StrukturOrganisasi.scope}`);
      console.log(`     Active: ${sso.is_active}`);
  });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
