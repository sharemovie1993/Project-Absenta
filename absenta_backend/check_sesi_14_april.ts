import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const targetDate = '2026-04-14';
  console.log(`🔍 Checking SesiAbsensi for date: ${targetDate}...`);

  // 1. Check active tenants in MULTI_SESI
  const tenants = await prisma.tenant.findMany({
    where: { absensi_mode: 'MULTI_SESI', status: 'ACTIVE' },
    select: { id: true, name: true }
  });

  console.log(`Active MULTI_SESI tenants found: ${tenants.length}`);

  for (const tenant of tenants) {
    console.log(`\n--- Tenant: ${tenant.name} (${tenant.id}) ---`);

    // Check year and semester
    const year = await prisma.tahunPelajaran.findFirst({
      where: { tenant_id: tenant.id, is_active: true }
    });
    const semester = await prisma.semester.findFirst({
      where: { tenant_id: tenant.id, is_active: true }
    });

    console.log(`Year Active: ${year ? year.tahun : 'NO'}`);
    console.log(`Semester Active: ${semester ? semester.nama_semester : 'NO'}`);

    // Check if templates exist for today (TUESDAY / SELASA)
    const templates = await prisma.jadwalTemplate.findMany({
      where: { 
        tenant_id: tenant.id,
        hari: 'SELASA'
      }
    });
    console.log(`Templates for SELASA: ${templates.length}`);

    // Check sessions created
    const sessions = await prisma.sesiAbsensi.findMany({
      where: {
        tenant_id: tenant.id,
        tanggal: {
          gte: new Date(`${targetDate}T00:00:00Z`),
          lte: new Date(`${targetDate}T23:59:59Z`)
        }
      },
      include: {
        Kelas: true,
        Mapel: true
      }
    });

    console.log(`Sessions found on ${targetDate}: ${sessions.length}`);
    
    if (sessions.length > 0) {
      sessions.forEach(s => {
        console.log(` - [${s.sumber_sesi}] ${s.jenis_kegiatan} | Kelas: ${s.Kelas?.nama_kelas} | Mapel: ${s.Mapel?.nama_mapel || 'N/A'} | Start: ${s.waktu_mulai.toISOString()}`);
      });
    } else {
        console.log(`⚠️ No sessions found for this tenant on ${targetDate}.`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
