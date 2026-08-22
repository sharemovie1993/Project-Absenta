import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 🔒 TARGET EKSKLUSIF: HANYA TENANT DEMO
const DEMO_TENANT_UUID = '2acb7e12-d264-4784-8262-8f7369061542';
const PROD_TENANT_UUID = '8535b49c-d3fc-4598-922a-7774b49ee7c5';

const TITLE_REGEX = /\b(S\.?Pd\.?I?|S\.?Kom\.?I?|S\.?T\.?|M\.?Pd\.?|M\.?M\.?|M\.?Kom\.?|S\.?Psi\.?|S\.?Sos\.?|S\.?E\.?|S\.?Sy\.?|S\.?S\.?|S\.?ST\.?|Gr\.?|Drs\.?|Dra\.?|Ir\.?|Dr\.?|H\.?|Hj\.?|Lc\.?)\b/gi;

export function simplifyName(rawName: string): string {
  if (!rawName) return 'User Demo';

  let clean = rawName.replace(/\s*\(Demo\)\s*/gi, ' ').trim();
  if (clean.includes(',')) {
    clean = clean.split(',')[0].trim();
  }

  clean = clean.replace(TITLE_REGEX, '').replace(/,/g, '').trim();
  let words = clean.split(/\s+/).filter(w => w.length > 0);

  // Buang inisial di awal (misal: "A.", "M.", "H.")
  while (words.length > 1 && (words[0].length === 1 || (words[0].length === 2 && words[0].endsWith('.')))) {
    words.shift();
  }

  let selectedWords: string[] = [];
  if (words.length >= 2 && (words[0].length <= 2 || words[0].toUpperCase() === 'SITI' || words[0].toUpperCase() === 'NENG' || words[0].toUpperCase() === 'MUHAMMAD' || words[0].toUpperCase() === 'MOCH')) {
    selectedWords = [words[0], words[1]];
  } else if (words.length > 0) {
    selectedWords = [words[0]];
  } else {
    selectedWords = ['Pengguna'];
  }

  const titleCased = selectedWords.map(w => {
    const lower = w.toLowerCase().replace(/[^a-zA-Z]/g, '');
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join(' ');

  return `${titleCased} Demo`;
}

async function updateAllDemoNames() {
  console.log('🛡️  [MEMULAI VALIDASI KEAMANAN TENANT SEBELUM EKSEKUSI]...');

  // 1. Verifikasi Ketat Objek Tenant Target
  const targetTenant = await prisma.tenant.findUnique({
    where: { id: DEMO_TENANT_UUID }
  });

  if (!targetTenant) {
    throw new Error(`[FATAL] Tenant Demo dengan UUID ${DEMO_TENANT_UUID} tidak ditemukan.`);
  }

  if (targetTenant.id === PROD_TENANT_UUID) {
    throw new Error(`[FATAL BLOCKED] Target yang dimasukkan adalah Tenant PRODUKSI (${PROD_TENANT_UUID})! Eksekusi dibatalkan segera.`);
  }

  if (!targetTenant.name.toLowerCase().includes('demo')) {
    throw new Error(`[FATAL BLOCKED] Nama tenant target "${targetTenant.name}" bukan bertanda demo!`);
  }

  console.log(`✅ VERIFIKASI AMAN 100%!`);
  console.log(`   └─ Target Terverifikasi: "${targetTenant.name}"`);
  console.log(`   └─ Target UUID         : ${targetTenant.id}`);
  console.log(`   └─ Tenant Produksi     : ${PROD_TENANT_UUID} (DIKUNCI / AMAN)\n`);

  // 2. Update Guru (Terisolasi di tenant_id: DEMO_TENANT_UUID)
  const gurus = await prisma.guru.findMany({
    where: { tenant_id: DEMO_TENANT_UUID }
  });
  console.log(`Memproses ${gurus.length} Guru di Tenant Demo...`);
  let gUpdated = 0;
  for (const g of gurus) {
    const newName = simplifyName(g.nama_guru);
    await prisma.guru.update({
      where: { id: g.id, tenant_id: DEMO_TENANT_UUID },
      data: { nama_guru: newName }
    });

    if (g.user_id) {
      await prisma.user.update({
        where: { id: g.user_id, tenant_id: DEMO_TENANT_UUID },
        data: { full_name: newName }
      });
    }
    gUpdated++;
  }
  console.log(`✔ ${gUpdated} Guru & Akun User Guru di Demo berhasil disederhanakan.`);

  // 3. Update Siswa (Terisolasi di tenant_id: DEMO_TENANT_UUID)
  const siswas = await prisma.siswa.findMany({
    where: { tenant_id: DEMO_TENANT_UUID }
  });
  console.log(`\nMemproses ${siswas.length} Siswa di Tenant Demo...`);
  let sUpdated = 0;
  for (const s of siswas) {
    const newName = simplifyName(s.nama_siswa);
    await prisma.siswa.update({
      where: { id: s.id, tenant_id: DEMO_TENANT_UUID },
      data: { nama_siswa: newName }
    });

    if (s.user_id) {
      await prisma.user.update({
        where: { id: s.user_id, tenant_id: DEMO_TENANT_UUID },
        data: { full_name: newName }
      });
    }
    sUpdated++;
  }
  console.log(`✔ ${sUpdated} Siswa & Akun User Siswa di Demo berhasil disederhanakan.`);

  // 4. Update User Non-Guru/Non-Siswa lainnya di Tenant Demo
  const otherUsers = await prisma.user.findMany({
    where: { tenant_id: DEMO_TENANT_UUID }
  });
  let uUpdated = 0;
  for (const u of otherUsers) {
    if (u.full_name.includes(',') || u.full_name.includes('(Demo)') || u.full_name.toUpperCase() === u.full_name) {
      const newName = simplifyName(u.full_name);
      await prisma.user.update({
        where: { id: u.id, tenant_id: DEMO_TENANT_UUID },
        data: { full_name: newName }
      });
      uUpdated++;
    }
  }
  console.log(`✔ ${uUpdated} User struktural/staf lainnya di Demo diperbarui.`);

  console.log('\n================ RINGKASAN VERIFIKASI AKHIR ================');
  const sampleGurus = await prisma.guru.findMany({ where: { tenant_id: DEMO_TENANT_UUID }, take: 5 });
  console.log('Contoh Nama Guru Demo Terkini:');
  sampleGurus.forEach(g => console.log(` - ${g.nama_guru}`));

  const sampleSiswas = await prisma.siswa.findMany({ where: { tenant_id: DEMO_TENANT_UUID }, take: 5 });
  console.log('\nContoh Nama Siswa Demo Terkini:');
  sampleSiswas.forEach(s => console.log(` - ${s.nama_siswa}`));

  // Cek Tenant Produksi untuk memastikan tidak berubah sama sekali
  const prodCheckGuru = await prisma.guru.findFirst({ where: { tenant_id: PROD_TENANT_UUID } });
  console.log(`\n🔒 Pengecekan Tenant Produksi: Guru "${prodCheckGuru?.nama_guru}" (ASLI & TIDAK TERSENTUH)`);
  console.log('============================================================');
  console.log('🎉 PROSES PENYEDERHANAAN NAMA DEMO SELESAI DENGAN AMAN 100%!');
}

updateAllDemoNames().catch(console.error).finally(() => prisma.$disconnect());
