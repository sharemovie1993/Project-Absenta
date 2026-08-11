import { prisma } from '../../utils/prisma';
import { STATIC_PROVINSI, STATIC_KABUPATEN } from '../../modules/wilayah/data/wilayah-static.data';
import axios from 'axios';

interface EmsifaItem {
  id: string;
  name: string;
}

const API_URLS = {
  provinces: [
    'https://cdn.jsdelivr.net/gh/emsifa/api-wilayah-indonesia@master/api/provinces.json',
    'https://emsifa.github.io/api-wilayah-indonesia/api/provinces.json',
    'https://raw.githubusercontent.com/emsifa/api-wilayah-indonesia/master/api/provinces.json',
  ],
  regencies: (provKode: string) => [
    `https://cdn.jsdelivr.net/gh/emsifa/api-wilayah-indonesia@master/api/regencies/${provKode}.json`,
    `https://emsifa.github.io/api-wilayah-indonesia/api/regencies/${provKode}.json`,
    `https://raw.githubusercontent.com/emsifa/api-wilayah-indonesia/master/api/regencies/${provKode}.json`,
  ],
  districts: (kabKode: string) => [
    `https://cdn.jsdelivr.net/gh/emsifa/api-wilayah-indonesia@master/api/districts/${kabKode}.json`,
    `https://emsifa.github.io/api-wilayah-indonesia/api/districts/${kabKode}.json`,
    `https://raw.githubusercontent.com/emsifa/api-wilayah-indonesia/master/api/districts/${kabKode}.json`,
  ],
};

async function fetchWithCdnFallback(urls: string[], timeout: number = 4000): Promise<EmsifaItem[]> {
  for (const url of urls) {
    try {
      const res = await axios.get<EmsifaItem[]>(url, { timeout });
      if (Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    } catch {
      // try next cdn
    }
  }
  return [];
}

export async function seedWilayahIndonesia() {
  console.log('🌐 Starting Indonesia Territory Seed (Provinces, Regencies & Districts)...');

  try {
    // 1. Seed Static Provinces first (Zero Network Dependency)
    console.log(`📍 Upserting ${STATIC_PROVINSI.length} Bundled Provinces...`);
    for (const p of STATIC_PROVINSI) {
      await prisma.refWilayah.upsert({
        where: { kode: p.kode },
        update: { nama: p.nama, tingkat: 1 },
        create: { kode: p.kode, nama: p.nama, tingkat: 1 },
      });
    }

    // 2. Fetch Live Provinces for comprehensive data
    const provinces = await fetchWithCdnFallback(API_URLS.provinces);
    if (provinces.length > 0) {
      for (const p of provinces) {
        await prisma.refWilayah.upsert({
          where: { kode: p.id },
          update: { nama: p.name, tingkat: 1 },
          create: { kode: p.id, nama: p.name, tingkat: 1 },
        });
      }
    }

    console.log('✅ Provinces seeded successfully!');

    // 3. Seed Static Regencies first
    console.log(`📍 Upserting ${STATIC_KABUPATEN.length} Bundled Regencies/Cities...`);
    for (const r of STATIC_KABUPATEN) {
      await prisma.refWilayah.upsert({
        where: { kode: r.kode },
        update: { nama: r.nama, tingkat: 2, parent_kode: r.parent_kode },
        create: { kode: r.kode, nama: r.nama, tingkat: 2, parent_kode: r.parent_kode },
      });
    }

    // 4. Fetch Live Regencies from Multi-CDN
    const allProvsInDb = await prisma.refWilayah.findMany({ where: { tingkat: 1 }, select: { kode: true } });
    let liveRegencyCount = 0;

    for (const p of allProvsInDb) {
      const regencies = await fetchWithCdnFallback(API_URLS.regencies(p.kode));
      for (const r of regencies) {
        await prisma.refWilayah.upsert({
          where: { kode: r.id },
          update: { nama: r.name, tingkat: 2, parent_kode: p.kode },
          create: { kode: r.id, nama: r.name, tingkat: 2, parent_kode: p.kode },
        });
        liveRegencyCount++;
      }
    }

    console.log(`✅ Regencies/Cities seeded successfully (${STATIC_KABUPATEN.length} static + ${liveRegencyCount} live)!`);

    // 5. Fetch Live Districts
    const allRegsInDb = await prisma.refWilayah.findMany({ where: { tingkat: 2 }, select: { kode: true } });
    let districtCount = 0;

    for (const r of allRegsInDb) {
      const districts = await fetchWithCdnFallback(API_URLS.districts(r.kode));
      for (const d of districts) {
        await prisma.refWilayah.upsert({
          where: { kode: d.id },
          update: { nama: d.name, tingkat: 3, parent_kode: r.kode },
          create: { kode: d.id, nama: d.name, tingkat: 3, parent_kode: r.kode },
        });
        districtCount++;
      }
    }

    console.log(`✅ ${districtCount} Districts/Kecamatan seeded successfully!`);

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
