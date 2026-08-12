import { PrismaClient } from '../node_modules/.prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("=== INSPEKSI DATA X AKL 1 ===");

  // 1. Find User Wali Kelas & Guru BK
  const walasUser = await prisma.user.findFirst({
    where: { email: { contains: 'tati', mode: 'insensitive' } },
    include: { Guru: true }
  });
  console.log("Wali Kelas User:", walasUser?.email, "Guru ID:", walasUser?.Guru?.id, "Tenant ID:", walasUser?.tenant_id);

  const bkUser = await prisma.user.findFirst({
    where: { email: { contains: 'ajeng', mode: 'insensitive' } },
    include: { Guru: true }
  });
  console.log("Guru BK User:", bkUser?.email, "Guru ID:", bkUser?.Guru?.id);

  // 2. Find Class X AKL 1
  const kelas = await prisma.kelas.findFirst({
    where: { nama_kelas: { contains: 'X AKL 1', mode: 'insensitive' } }
  });
  console.log("Kelas X AKL 1:", kelas?.id, kelas?.nama_kelas, "Tenant ID:", kelas?.tenant_id);

  // 3. Find Students by NISN
  const nisns = ['0109275978', '0115190115', '0106442141', '0114956858', '0127212982'];
  const targetStudents = await prisma.siswa.findMany({
    where: { nisn: { in: nisns } },
    include: { Kelas: true }
  });

  console.log("\n=== TARGET STUDENTS BY NISN ===");
  for (const s of targetStudents) {
    console.log(`NISN: ${s.nisn} | NIS: ${s.nis} | Nama: ${s.nama_siswa} | Kelas: ${s.Kelas?.nama_kelas} (id: ${s.kelas_id})`);
  }

  // 4. Find all students in class X AKL 1
  if (kelas) {
    const allStudentsInKelas = await prisma.siswa.findMany({
      where: { kelas_id: kelas.id },
      take: 15
    });
    console.log(`\nTotal Siswa di Kelas ${kelas.nama_kelas}: ${allStudentsInKelas.length}`);
    allStudentsInKelas.forEach((s, idx) => {
      console.log(`  ${idx + 1}. NISN: ${s.nisn} | Nama: ${s.nama_siswa}`);
    });

    // 5. Check Jadwal KBM for X AKL 1
    const jadwals = await prisma.jadwalKBM.findMany({
      where: { kelas_id: kelas.id },
      include: { mapel: true, guru: true }
    });
    console.log(`\nJadwal KBM X AKL 1 Count: ${jadwals.length}`);
    jadwals.forEach(j => {
      console.log(`  Hari: ${j.hari} | Jam: ${j.jam_ke} (${j.jam_mulai}-${j.jam_selesai}) | Mapel: ${j.mapel?.nama_mapel} | Guru: ${j.guru?.nama_guru}`);
    });
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
