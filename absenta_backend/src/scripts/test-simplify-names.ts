import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';

// Daftar gelar yang perlu dibuang
const TITLE_REGEX = /\b(S\.?Pd\.?I?|S\.?Kom\.?I?|S\.?T\.?|M\.?Pd\.?|M\.?M\.?|M\.?Kom\.?|S\.?Psi\.?|S\.?Sos\.?|S\.?E\.?|S\.?Sy\.?|S\.?S\.?|S\.?ST\.?|Gr\.?|Drs\.?|Dra\.?|Ir\.?|Dr\.?|H\.?|Hj\.?|Lc\.?)\b/gi;

export function simplifyName(rawName: string): string {
  if (!rawName) return 'User Demo';

  // 1. Buang suffix (Demo), kurung, gelar setelah koma
  let clean = rawName.replace(/\s*\(Demo\)\s*/gi, ' ').trim();
  if (clean.includes(',')) {
    clean = clean.split(',')[0].trim();
  }

  // 2. Buang gelar yang mungkin masih menempel tanpa koma
  clean = clean.replace(TITLE_REGEX, '').replace(/,/g, '').trim();

  // 3. Split kata-kata
  let words = clean.split(/\s+/).filter(w => w.length > 0);

  // Buang inisial 1 huruf di awal (misal: "A. HIMAL" -> "HIMAL", "M. FIRMAN" -> "FIRMAN")
  while (words.length > 1 && (words[0].length === 1 || (words[0].length === 2 && words[0].endsWith('.')))) {
    words.shift();
  }

  // Ambil maksimal 2 kata (jika kata pertama terlalu pendek <= 2 huruf seperti "Ai", "Ce", ambil 2 kata)
  let selectedWords: string[] = [];
  if (words.length >= 2 && (words[0].length <= 2 || words[0].toUpperCase() === 'SITI' || words[0].toUpperCase() === 'NENG' || words[0].toUpperCase() === 'MUHAMMAD' || words[0].toUpperCase() === 'MOCH')) {
    selectedWords = [words[0], words[1]];
  } else if (words.length > 0) {
    selectedWords = [words[0]];
  } else {
    selectedWords = ['Pengguna'];
  }

  // Format Title Case
  const titleCased = selectedWords.map(w => {
    const lower = w.toLowerCase().replace(/[^a-zA-Z]/g, '');
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join(' ');

  return `${titleCased} Demo`;
}

async function testSimulate() {
  console.log('🧪 [SIMULASI PENYEDERHANAAN NAMA GURU & SISWA DI TENANT DEMO]...\n');

  const gurus = await prisma.guru.findMany({ where: { tenant_id: DEMO_ID }, take: 15 });
  console.log('=== CONTOH TRANSFORMASI NAMA GURU ===');
  gurus.forEach(g => {
    console.log(`${g.nama_guru.padEnd(45)} ➔ ${simplifyName(g.nama_guru)}`);
  });

  const siswas = await prisma.siswa.findMany({ where: { tenant_id: DEMO_ID }, take: 15 });
  console.log('\n=== CONTOH TRANSFORMASI NAMA SISWA ===');
  siswas.forEach(s => {
    console.log(`${s.nama_siswa.padEnd(45)} ➔ ${simplifyName(s.nama_siswa)}`);
  });
}

testSimulate().catch(console.error).finally(() => prisma.$disconnect());
