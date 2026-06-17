const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnose() {
  try {
    const tenantId = '2516520d-4466-4410-a218-06eab518bfd9';
    
    // Cari SesiGerbang hari ini (WIB: Apr 16 = UTC Apr 15 17:00)
    const nowWib = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const dayStr = nowWib.toISOString().split('T')[0];
    const startOfDay = new Date(`${dayStr}T00:00:00.000+07:00`);
    const endOfDay = new Date(`${dayStr}T23:59:59.999+07:00`);

    console.log(`\n=== DIAGNOSA ABSENSI GERBANG ===`);
    console.log(`Tanggal Lokal (WIB): ${dayStr}`);
    console.log(`Range DB: ${startOfDay.toISOString()} s/d ${endOfDay.toISOString()}`);

    const sesiGerbang = await prisma.sesiGerbang.findFirst({
      where: { tenant_id: tenantId, tanggal: { gte: startOfDay, lte: endOfDay } }
    });

    if (!sesiGerbang) {
      console.log('\n⚠️  TIDAK ADA SesiGerbang untuk hari ini! Ini mungkin akar masalah.');
      return;
    }
    console.log(`\n✅ SesiGerbang ditemukan: ${sesiGerbang.id}`);
    console.log(`   Tanggal: ${sesiGerbang.tanggal.toISOString()}`);

    // Cek AbsenGerbangSiswa hari ini
    const taps = await prisma.absenGerbangSiswa.findMany({
      where: {
        sesi_gerbang_id: sesiGerbang.id,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        siswa_id: true,
        status: true,
        arah: true,
        waktu_tap: true,
        Siswa: { select: { nama_siswa: true, nis: true } }
      },
      orderBy: { waktu_tap: 'desc' }
    });

    console.log(`\n📊 Total tap hari ini: ${taps.length}`);
    console.log('\nDaftar siswa yang sudah terekam (10 terakhir):');
    taps.slice(0, 10).forEach(t => {
      const nama = t.Siswa?.nama_siswa || t.siswa_id;
      const nis = t.Siswa?.nis || '-';
      const waktu = new Date(t.waktu_tap.getTime() + 7*60*60*1000).toISOString().slice(11,19);
      console.log(`  - [${waktu} WIB] ${nama} (NIS: ${nis}) | Status: ${t.status} | Arah: ${t.arah}`);
    });

    // Cek apakah ada siswa dengan status HADIR yang mungkin false positive
    const hadir = taps.filter(t => t.status === 'HADIR');
    const nonHadir = taps.filter(t => t.status !== 'HADIR');
    console.log(`\n  HADIR: ${hadir.length} | Non-HADIR (ALPA/IZIN/SAKIT): ${nonHadir.length}`);

  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
