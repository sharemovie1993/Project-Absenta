import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const SMK_PRESET_MAPEL_JP = [
  {
    nama_mapel: 'Bahasa Indonesia',
    kode_mapel: 'BIND',
    tingkat: 10,
    jp_per_minggu: 4,
    category: 'UMUM',
    aliases: ['Bahasa Indonesia', 'B. Indonesia', 'BIND']
  },
  {
    nama_mapel: 'Projek Ilmu Pengetahuan Alam dan Sosial (IPAS)',
    kode_mapel: 'IPAS',
    tingkat: 10,
    jp_per_minggu: 6,
    category: 'UMUM',
    aliases: ['IPAS', 'Projek IPAS', 'Projek Ilmu Pengetahuan Alam dan Sosial (IPAS)', 'Ilmu Pengetahuan Alam dan Sosial']
  },
  {
    nama_mapel: 'Informatika',
    kode_mapel: 'INF',
    tingkat: 10,
    jp_per_minggu: 4,
    category: 'UMUM',
    aliases: ['Informatika', 'INF', 'Teknologi Informasi']
  },
  {
    nama_mapel: 'Bahasa Inggris',
    kode_mapel: 'BING',
    tingkat: 10,
    jp_per_minggu: 4,
    category: 'UMUM',
    aliases: ['Bahasa Inggris', 'B. Inggris', 'BING']
  },
  {
    nama_mapel: 'Dasar-dasar Program Keahlian',
    kode_mapel: 'DDPK',
    tingkat: 10,
    jp_per_minggu: 12,
    category: 'KEJURUAN',
    aliases: ['Dasar-dasar Program Keahlian', 'DDPK', 'DASAR-KEJURUAN', 'Dasar Kejuruan']
  }
];

export async function seedGlobalPresetMapelSMK() {
  console.log('================================================================');
  console.log('🌱 SEEDING GLOBAL PRESET MAPEL & JP STANDAR (SMK TINGKAT X / 10)');
  console.log('================================================================\n');

  // 1. Seed ke GlobalMapelPreset & GlobalKurikulumStandard
  for (const preset of SMK_PRESET_MAPEL_JP) {
    // A. GlobalMapelPreset
    await prisma.globalMapelPreset.upsert({
      where: {
        jenjang_category_kode_mapel: {
          jenjang: 'SMK',
          category: preset.category,
          kode_mapel: preset.kode_mapel
        }
      },
      update: {
        nama_mapel: preset.nama_mapel
      },
      create: {
        jenjang: 'SMK',
        category: preset.category,
        nama_mapel: preset.nama_mapel,
        kode_mapel: preset.kode_mapel
      }
    });

    // B. GlobalKurikulumStandard
    await prisma.globalKurikulumStandard.upsert({
      where: {
        jenjang_kode_mapel_tingkat: {
          jenjang: 'SMK',
          kode_mapel: preset.kode_mapel,
          tingkat: preset.tingkat
        }
      },
      update: {
        nama_mapel: preset.nama_mapel,
        jp_per_minggu: preset.jp_per_minggu,
        category: preset.category
      },
      create: {
        jenjang: 'SMK',
        category: preset.category,
        nama_mapel: preset.nama_mapel,
        kode_mapel: preset.kode_mapel,
        tingkat: preset.tingkat,
        jp_per_minggu: preset.jp_per_minggu
      }
    });

    console.log(`✅ [Global Preset] ${preset.nama_mapel} (${preset.kode_mapel}) -> Tingkat ${preset.tingkat}: ${preset.jp_per_minggu} JP`);
  }

  // 2. Sync / Apply ke seluruh Tenant Jenjang SMK
  console.log('\n🔄 Mensinkronisasikan Preset ke seluruh Tenant SMK di Database...');

  const smkTenants = await prisma.tenant.findMany({
    where: {
      OR: [
        { name: { contains: 'SMK', mode: 'insensitive' } },
        { id: 'c2998880-ef62-43b7-8c85-2cc855a84d26' } // SMKN 1 Plered
      ]
    }
  });

  console.log(`Ditemukan ${smkTenants.length} tenant SMK untuk disinkronkan.`);

  for (const tenant of smkTenants) {
    console.log(`\n🏫 Processing Tenant: ${tenant.name} (${tenant.id})`);

    // Dapatkan Tahun Pelajaran Aktif untuk Tenant
    let activeYear = await prisma.tahunPelajaran.findFirst({
      where: { tenant_id: tenant.id, is_active: true }
    });
    if (!activeYear) {
      activeYear = await prisma.tahunPelajaran.findFirst({
        where: { tenant_id: tenant.id }
      });
    }

    if (!activeYear) {
      console.log(`⚠️ Skip tenant ${tenant.name}: Tidak memiliki TahunPelajaran.`);
      continue;
    }

    for (const item of SMK_PRESET_MAPEL_JP) {
      // 1. Cari atau buat Mapel di tenant
      let mapel = await prisma.mapel.findFirst({
        where: {
          tenant_id: tenant.id,
          OR: [
            { kode_mapel: item.kode_mapel },
            ...item.aliases.map(alias => ({ nama_mapel: { contains: alias, mode: 'insensitive' as const } }))
          ]
        }
      });

      if (!mapel) {
        const uniqueKode = `${item.kode_mapel}-${tenant.id.substring(0, 4)}`.toUpperCase();
        mapel = await prisma.mapel.create({
          data: {
            tenant_id: tenant.id,
            nama_mapel: item.nama_mapel,
            kode_mapel: uniqueKode,
            tingkat: item.tingkat
          }
        });
        console.log(`   ➕ [New Mapel Created] ${mapel.nama_mapel} (${mapel.kode_mapel})`);
      } else {
        console.log(`   ✓ [Mapel Found] ${mapel.nama_mapel} (ID: ${mapel.id})`);
      }

      // 2. Upsert StrukturKurikulum untuk Tingkat 10 dengan JP_PER_MINGGU baru
      const existingStruktur = await prisma.strukturKurikulum.findFirst({
        where: {
          tenant_id: tenant.id,
          mapel_id: mapel.id,
          tingkat: item.tingkat,
          tahun_pelajaran_id: activeYear.id
        }
      });

      if (existingStruktur) {
        await prisma.strukturKurikulum.update({
          where: { id: existingStruktur.id },
          data: { jp_per_minggu: item.jp_per_minggu, kelompok: 'Nasional' }
        });
        console.log(`   ⚙️ [Struktur Updated] ${mapel.nama_mapel} Tingkat ${item.tingkat} -> ${item.jp_per_minggu} JP (Sebelumnya: ${existingStruktur.jp_per_minggu} JP)`);
      } else {
        await prisma.strukturKurikulum.create({
          data: {
            tenant_id: tenant.id,
            mapel_id: mapel.id,
            tahun_pelajaran_id: activeYear.id,
            tingkat: item.tingkat,
            jp_per_minggu: item.jp_per_minggu,
            kelompok: 'Nasional'
          }
        });
        console.log(`   ➕ [Struktur Created] ${mapel.nama_mapel} Tingkat ${item.tingkat} -> ${item.jp_per_minggu} JP`);
      }
    }
  }

  console.log('\n================================================================');
  console.log('🎉 SEEDING & SYNCHRONIZATION GLOBAL PRESET MAPEL SMK SELESAI!');
  console.log('================================================================');
}

// Runnable script jika dipanggil langsung
if (require.main === module) {
  seedGlobalPresetMapelSMK()
    .catch((err) => {
      console.error('❌ FATAL SEED ERROR:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
