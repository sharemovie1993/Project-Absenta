import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenantDomain = 'smkn1cimahi';
  const tenant = await prisma.tenant.findUnique({ where: { subdomain: tenantDomain } });
  if (!tenant) throw new Error('Tenant not found');

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Find Raka
  const raka = await prisma.siswa.findFirst({ where: { tenant_id: tenant.id, nis: '20250001' } });
  if (!raka) throw new Error('Student Raka not found');

  // Find active Tapel & Semester
  const tapel = await prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenant.id, is_active: true } });
  const semester = await prisma.semester.findFirst({ where: { tenant_id: tenant.id, is_active: true } });

  if (!tapel || !semester) throw new Error('Active Tapel or Semester not found');

  // Find or Create Session
  let session = await prisma.sesiAbsensi.findFirst({
    where: {
      tenant_id: tenant.id,
      tanggal: todayStart,
      status: 'BERLANGSUNG'
    }
  });

  if (!session) {
    // Correct lookup for Guru via User email
    const guruUser = await prisma.user.findFirst({ 
      where: { 
        tenant_id: tenant.id, 
        email: 'guru@gmail.com' 
      },
      include: { Guru: true }
    });
    
    const guru = guruUser?.Guru;
    const kelas = await prisma.kelas.findFirst({ where: { id: raka.kelas_id } });

    if (!guru || !kelas) throw new Error(`Missing core data for session. Guru: ${!!guru}, Kelas: ${!!kelas}`);

    const start = new Date(todayStart);
    start.setHours(7, 0, 0, 0);
    const end = new Date(todayStart);
    end.setHours(12, 0, 0, 0);

    session = await prisma.sesiAbsensi.create({
      data: {
        tenant_id: tenant.id,
        kelas_id: kelas.id,
        guru_id: guru.id,
        tahun_pelajaran_id: tapel.id,
        semester_id: semester.id,
        tanggal: todayStart,
        waktu_mulai: start,
        waktu_selesai: end,
        status: 'BERLANGSUNG',
        jenis_kegiatan: 'KBM-SIMULASI',
        sumber_sesi: 'MANUAL'
      }
    });
  }

  // CLEANUP attendance for Raka in this session
  await prisma.absenSiswa.deleteMany({
    where: {
      sesi_id: session.id,
      siswa_id: raka.id
    }
  });

  console.log(`SESSION_ID: ${session.id}`);
  console.log(`SISWA_ID: ${raka.id}`);
  console.log(`RFID: ${raka.no_rfid}`);
  console.log('--- READY ---');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
