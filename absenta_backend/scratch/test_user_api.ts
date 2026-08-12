import { PrismaClient } from '../node_modules/.prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("=== SIMULASI API RESPON WALI KELAS TATI ===");

  const user = await prisma.user.findFirst({
    where: { email: { contains: 'tati', mode: 'insensitive' } },
    include: { Guru: true }
  });
  if (!user) throw new Error("User Tati tidak ada");

  console.log("User:", user.email, "Tenant:", user.tenant_id, "GuruID:", user.Guru?.id);

  // Find Kelas for Tati
  const walasAssignment = await prisma.kelas.findFirst({
    where: { nama_kelas: { contains: 'X AKL 1', mode: 'insensitive' }, tenant_id: user.tenant_id }
  });

  console.log("Kelas Assignment:", walasAssignment?.nama_kelas, "ID:", walasAssignment?.id);

  // 1. Pelanggaran in Kelas
  const violations = await prisma.pelanggaranSiswa.findMany({
    where: {
      tenant_id: user.tenant_id,
      kelas_id: walasAssignment?.id
    },
    include: { Siswa: true }
  });
  console.log(`✓ Pelanggaran Count di kelas ${walasAssignment?.nama_kelas}: ${violations.length}`);
  violations.forEach(v => console.log(`   - ${v.Siswa?.nama_siswa}: ${v.jenis_pelanggaran} (${v.poin} poin)`));

  // 2. Prestasi in Kelas
  const achievements = await prisma.prestasiSiswa.findMany({
    where: {
      tenant_id: user.tenant_id,
      kelas_id: walasAssignment?.id
    },
    include: { Siswa: true }
  });
  console.log(`✓ Prestasi Count di kelas ${walasAssignment?.nama_kelas}: ${achievements.length}`);
  achievements.forEach(a => console.log(`   - ${a.Siswa?.nama_siswa}: ${a.nama_prestasi} (${a.poin} poin)`));

  // 3. Siswa in Kelas
  const students = await prisma.siswa.findMany({
    where: {
      tenant_id: user.tenant_id,
      kelas_id: walasAssignment?.id
    }
  });
  console.log(`✓ Total Siswa di kelas ${walasAssignment?.nama_kelas}: ${students.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
