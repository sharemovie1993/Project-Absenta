import { PrismaClient } from '../node_modules/.prisma/client';

const prisma = new PrismaClient();

async function main() {
  const siswa = await prisma.siswa.findFirst({
    where: { nisn: '0109275978', nama_siswa: { contains: 'ACEP', mode: 'insensitive' } }
  });
  if (!siswa) throw new Error("Siswa Acep tidak ada");

  console.log("Testing insert AbsenSiswa for Acep...");

  try {
    const tp = await prisma.tahunPelajaran.findFirst({ where: { tenant_id: siswa.tenant_id } });
    const sem = await prisma.semester.findFirst({ where: { tenant_id: siswa.tenant_id } });

    // 1. Create a SesiAbsensi
    const sesi = await prisma.sesiAbsensi.create({
      data: {
        tenant_id: siswa.tenant_id,
        kelas_id: siswa.kelas_id!,
        tahun_pelajaran_id: tp!.id,
        semester_id: sem!.id,
        tanggal: new Date('2026-08-03'),
        waktu_mulai: new Date('2026-08-03T07:15:00+07:00'),
        waktu_selesai: new Date('2026-08-03T08:25:00+07:00'),
        status: 'SELESAI'
      }
    });
    console.log("✓ SesiAbsensi created:", sesi.id);

    const siswaAkademik = await prisma.siswaAkademik.findFirst({
      where: { siswa_id: siswa.id }
    });

    // 2. Create AbsenSiswa
    const absen = await prisma.absenSiswa.create({
      data: {
        tenant_id: siswa.tenant_id,
        siswa_id: siswa.id,
        siswa_akademik_id: siswaAkademik!.id,
        sesi_id: sesi.id,
        status: 'HADIR'
      }
    });
    console.log("✓ AbsenSiswa created:", absen.id);
  } catch (e: any) {
    console.error("❌ ERROR insert Sesi / AbsenSiswa:", e.message);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
