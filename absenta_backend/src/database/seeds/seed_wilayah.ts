import { prisma } from '../../utils/prisma';
import axios from 'axios';

interface EmsifaProvinsi {
  id: string;
  name: string;
}

interface EmsifaRegency {
  id: string;
  province_id: string;
  name: string;
}

interface EmsifaDistrict {
  id: string;
  regency_id: string;
  name: string;
}

export async function seedWilayahIndonesia() {
  console.log('🌐 Starting Indonesia Territory Seed (Provinces, Regencies & Districts) from Official Kemendagri API...');

  try {
    // 1. Fetch Provinces
    const provRes = await axios.get<EmsifaProvinsi[]>('https://emsifa.github.io/api-wilayah-indonesia/api/provinces.json', { timeout: 10000 });
    const provinces = provRes.data || [];

    console.log(`📍 Fetched ${provinces.length} Provinces. Upserting to Database...`);

    for (const p of provinces) {
      await prisma.refWilayah.upsert({
        where: { kode: p.id },
        update: {
          nama: p.name,
          tingkat: 1,
        },
        create: {
          kode: p.id,
          nama: p.name,
          tingkat: 1,
        },
      });
    }

    console.log('✅ Provinces seeded successfully!');

    // 2. Fetch Regencies/Cities for all provinces
    console.log('📍 Fetching Regencies/Cities (Kabupaten/Kota)...');
    let regencyCount = 0;

    for (const p of provinces) {
      try {
        const regRes = await axios.get<EmsifaRegency[]>(`https://emsifa.github.io/api-wilayah-indonesia/api/regencies/${p.id}.json`, { timeout: 8000 });
        const regencies = regRes.data || [];

        for (const r of regencies) {
          await prisma.refWilayah.upsert({
            where: { kode: r.id },
            update: {
              nama: r.name,
              tingkat: 2,
              parent_kode: p.id,
            },
            create: {
              kode: r.id,
              nama: r.name,
              tingkat: 2,
              parent_kode: p.id,
            },
          });
          regencyCount++;
        }
      } catch (err) {
        console.warn(`Failed fetching regencies for province ${p.name} (${p.id}):`, err);
      }
    }

    console.log(`✅ ${regencyCount} Regencies/Cities seeded successfully into PostgreSQL database!`);

    // 3. Fetch Districts / Kecamatan (Tingkat 3)
    console.log('📍 Fetching Districts (Kecamatan)...');
    let districtCount = 0;

    const allRegencies = await prisma.refWilayah.findMany({
      where: { tingkat: 2 },
      select: { kode: true, nama: true },
    });

    for (const r of allRegencies) {
      try {
        const distRes = await axios.get<EmsifaDistrict[]>(`https://emsifa.github.io/api-wilayah-indonesia/api/districts/${r.kode}.json`, { timeout: 8000 });
        const districts = distRes.data || [];

        for (const d of districts) {
          await prisma.refWilayah.upsert({
            where: { kode: d.id },
            update: {
              nama: d.name,
              tingkat: 3,
              parent_kode: r.kode,
            },
            create: {
              kode: d.id,
              nama: d.name,
              tingkat: 3,
              parent_kode: r.kode,
            },
          });
          districtCount++;
        }
      } catch (err) {
        console.warn(`Failed fetching districts for regency ${r.nama} (${r.kode}):`, err);
      }
    }

    console.log(`✅ ${districtCount} Districts/Kecamatan seeded successfully into PostgreSQL database!`);

  } catch (error) {
    console.error('❌ Error seeding Wilayah Indonesia:', error);
  }
}

if (require.main === module) {
  seedWilayahIndonesia()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
