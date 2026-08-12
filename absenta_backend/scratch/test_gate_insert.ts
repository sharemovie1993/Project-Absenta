import { PrismaClient } from '../node_modules/.prisma/client';

const prisma = new PrismaClient();

async function main() {
  const siswa = await prisma.siswa.findFirst({
    where: { nisn: '0109275978', nama_siswa: { contains: 'ACEP', mode: 'insensitive' } }
  });
  if (!siswa) throw new Error("Siswa Acep tidak ada");

  console.log("Testing insert AbsenGerbangSiswa for Acep:", siswa.id, siswa.tenant_id);

  try {
    const res = await prisma.absenGerbangSiswa.create({
      data: {
        tenant_id: siswa.tenant_id,
        siswa_id: siswa.id,
        tanggal: new Date('2026-08-03'),
        waktu_masuk: new Date('2026-08-03T06:50:00+07:00'),
        status: 'HADIR',
        keterlambatan_menit: 0,
        metode_absen: 'CARD_TAP'
      }
    });
    console.log("✓ SUCCESS insert AbsenGerbangSiswa:", res.id);
  } catch (e: any) {
    console.error("❌ ERROR insert AbsenGerbangSiswa:", e.message);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
