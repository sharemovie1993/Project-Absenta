import { prisma } from '../utils/prisma';
import axios from 'axios';

interface EmsifaItem {
  id: string;
  name: string;
}

const CDN_URLS = {
  provinces: [
    'https://cdn.jsdelivr.net/gh/emsifa/api-wilayah-indonesia@master/api/provinces.json',
    'https://raw.githubusercontent.com/emsifa/api-wilayah-indonesia/master/api/provinces.json',
    'https://emsifa.github.io/api-wilayah-indonesia/api/provinces.json',
  ],
  regencies: (provKode: string) => [
    `https://cdn.jsdelivr.net/gh/emsifa/api-wilayah-indonesia@master/api/regencies/${provKode}.json`,
    `https://raw.githubusercontent.com/emsifa/api-wilayah-indonesia/master/api/regencies/${provKode}.json`,
    `https://emsifa.github.io/api-wilayah-indonesia/api/regencies/${provKode}.json`,
  ],
  districts: (kabKode: string) => [
    `https://cdn.jsdelivr.net/gh/emsifa/api-wilayah-indonesia@master/api/districts/${kabKode}.json`,
    `https://raw.githubusercontent.com/emsifa/api-wilayah-indonesia/master/api/districts/${kabKode}.json`,
    `https://emsifa.github.io/api-wilayah-indonesia/api/districts/${kabKode}.json`,
  ],
  villages: (kecKode: string) => [
    `https://cdn.jsdelivr.net/gh/emsifa/api-wilayah-indonesia@master/api/villages/${kecKode}.json`,
    `https://raw.githubusercontent.com/emsifa/api-wilayah-indonesia/master/api/villages/${kecKode}.json`,
    `https://emsifa.github.io/api-wilayah-indonesia/api/villages/${kecKode}.json`,
  ],
};

async function fetchCdn(urls: string[], timeoutMs = 5000): Promise<EmsifaItem[]> {
  for (const url of urls) {
    try {
      const res = await axios.get<EmsifaItem[]>(url, { timeout: timeoutMs });
      if (Array.isArray(res.data) && res.data.length > 0) return res.data;
    } catch {
      // Continue to next CDN
    }
  }
  return [];
}

export async function runFullWilayahSeeder() {
  console.log('====================================================');
  console.log('🚀 MEMULAI PROSES SEEDER FULL WILAYAH INDONESIA (~91.600 RECORD)');
  console.log('====================================================');
  const startTime = Date.now();

  // 1. PROVINSI (38 Record)
  console.log('\n📍 1/4 Memproses Data Provinsi...');
  const provs = await fetchCdn(CDN_URLS.provinces);
  console.log(` -> Terambil ${provs.length} Provinsi.`);
  
  for (const p of provs) {
    await prisma.refWilayah.upsert({
      where: { kode: p.id },
      update: { nama: p.name, tingkat: 1 },
      create: { kode: p.id, nama: p.name, tingkat: 1 },
    });
  }

  // 2. KABUPATEN / KOTA (514 Record)
  console.log('\n📍 2/4 Memproses Data Kabupaten/Kota se-Indonesia...');
  let totalKab = 0;
  for (const p of provs) {
    const regencies = await fetchCdn(CDN_URLS.regencies(p.id));
    for (const r of regencies) {
      await prisma.refWilayah.upsert({
        where: { kode: r.id },
        update: { nama: r.name, tingkat: 2, parent_kode: p.id },
        create: { kode: r.id, nama: r.name, tingkat: 2, parent_kode: p.id },
      });
      totalKab++;
    }
  }
  console.log(` -> Berhasil mengimpor ${totalKab} Kabupaten/Kota.`);

  // 3. KECAMATAN (~7.288 Record)
  console.log('\n📍 3/4 Memproses Data Kecamatan se-Indonesia...');
  const allKabInDb = await prisma.refWilayah.findMany({
    where: { tingkat: 2 },
    select: { kode: true },
  });

  let totalKec = 0;
  // Process in parallel chunks of 10 regencies
  const CHUNK_SIZE = 10;
  for (let i = 0; i < allKabInDb.length; i += CHUNK_SIZE) {
    const chunk = allKabInDb.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      chunk.map(async (kab) => {
        const districts = await fetchCdn(CDN_URLS.districts(kab.kode));
        for (const d of districts) {
          await prisma.refWilayah.upsert({
            where: { kode: d.id },
            update: { nama: d.name, tingkat: 3, parent_kode: kab.kode },
            create: { kode: d.id, nama: d.name, tingkat: 3, parent_kode: kab.kode },
          });
          totalKec++;
        }
      })
    );
    if ((i + CHUNK_SIZE) % 50 === 0 || i + CHUNK_SIZE >= allKabInDb.length) {
      console.log(` -> Progress Kecamatan: ${Math.min(i + CHUNK_SIZE, allKabInDb.length)}/${allKabInDb.length} Kab/Kota diproses...`);
    }
  }
  console.log(` -> Berhasil mengimpor ${totalKec} Kecamatan.`);

  // 4. KELURAHAN / DESA (~83.763 Record)
  console.log('\n📍 4/4 Memproses Data Kelurahan/Desa se-Indonesia...');
  const allKecInDb = await prisma.refWilayah.findMany({
    where: { tingkat: 3 },
    select: { kode: true },
  });

  let totalKel = 0;
  const KEC_CHUNK_SIZE = 15;
  for (let i = 0; i < allKecInDb.length; i += KEC_CHUNK_SIZE) {
    const chunk = allKecInDb.slice(i, i + KEC_CHUNK_SIZE);
    await Promise.all(
      chunk.map(async (kec) => {
        const villages = await fetchCdn(CDN_URLS.villages(kec.kode));
        for (const v of villages) {
          await prisma.refWilayah.upsert({
            where: { kode: v.id },
            update: { nama: v.name, tingkat: 4, parent_kode: kec.kode },
            create: { kode: v.id, nama: v.name, tingkat: 4, parent_kode: kec.kode },
          });
          totalKel++;
        }
      })
    );
    if ((i + KEC_CHUNK_SIZE) % 500 === 0 || i + KEC_CHUNK_SIZE >= allKecInDb.length) {
      console.log(` -> Progress Kelurahan/Desa: ${Math.min(i + KEC_CHUNK_SIZE, allKecInDb.length)}/${allKecInDb.length} Kecamatan diproses...`);
    }
  }

  const durationSec = Math.round((Date.now() - startTime) / 1000);
  console.log('\n====================================================');
  console.log(`✅ SEEDER FULL WILAYAH INDONESIA SELESAI DENGAN SUKSES!`);
  console.log(`📊 TOTAL RECORD DALAM DATABASE:`);
  console.log(`   - Provinsi         : ${provs.length} Record`);
  console.log(`   - Kabupaten/Kota   : ${totalKab} Record`);
  console.log(`   - Kecamatan        : ${totalKec} Record`);
  console.log(`   - Kelurahan/Desa   : ${totalKel} Record`);
  console.log(`   - TOTAL RECORD     : ${provs.length + totalKab + totalKec + totalKel} Record`);
  console.log(`⏱️ WAKTU EKSEKUSI       : ${durationSec} Detik`);
  console.log('====================================================');
}

if (require.main === module) {
  runFullWilayahSeeder()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Seeder Error:', err);
      process.exit(1);
    });
}
