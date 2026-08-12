import { PrismaClient } from '../node_modules/.prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("=== INSPEKSI RETRIEVAL API DATA KELAS X AKL 1 ===");

  const kelas = await prisma.kelas.findFirst({
    where: { nama_kelas: { contains: 'X AKL 1', mode: 'insensitive' } }
  });
  if (!kelas) throw new Error("Kelas tidak ada");

  // 1. Fetch Students
  const siswas = await prisma.siswa.findMany({
    where: { kelas_id: kelas.id },
    select: {
      id: true,
      nis: true,
      nisn: true,
      nama_siswa: true,
      foto: true,
      nama_ayah: true,
      nama_ibu: true,
      no_hp_ortu: true
    }
  });
  console.log(`✓ Total Siswa: ${siswas.length}`);

  const targetNisns = ['0109275978', '0115190115', '0106442141', '0114956858', '0127212982'];
  const targetSiswa = await prisma.siswa.findMany({
    where: { nisn: { in: targetNisns } }
  });

  console.log(`✓ Total Target Siswa: ${targetSiswa.length}`);
  for (const s of targetSiswa) {
    const gateCount = await prisma.absenGerbangSiswa.count({
      where: { siswa_id: s.id }
    });
    console.log(`  NISN: ${s.nisn} | Nama: ${s.nama_siswa} | KelasID: ${s.kelas_id} | Absen Gerbang: ${gateCount}`);
  }

  // Fetch Pelanggaran
  const violations = await prisma.pelanggaranSiswa.findMany({
    where: { siswa_id: { in: siswas.map(s => s.id) } },
    include: { Siswa: true }
  });
  console.log(`✓ Total Pelanggaran: ${violations.length}`);

  // Fetch Prestasi
  const achievements = await prisma.prestasiSiswa.findMany({
    where: { siswa_id: { in: siswas.map(s => s.id) } },
    include: { Siswa: true }
  });
  console.log(`✓ Total Prestasi: ${achievements.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
