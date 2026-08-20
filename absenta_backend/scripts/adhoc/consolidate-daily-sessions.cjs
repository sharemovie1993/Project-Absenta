const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runConsolidation() {
  console.log('===========================================================');
  console.log('🔄 MEMULAI KONSOLIDASI SESI KBM HARIAN (SINGLE SESSION)');
  console.log('===========================================================');

  const startOfDay = new Date();
  startOfDay.setHours(0,0,0,0);
  const endOfDay = new Date();
  endOfDay.setHours(23,59,59,999);

  // Ambil semua sesi KBM hari ini
  const allSessionsToday = await prisma.sesiAbsensi.findMany({
    where: {
      tanggal: { gte: startOfDay, lte: endOfDay },
      jenis_kegiatan: 'KBM'
    },
    include: {
      Kelas: true,
      Mapel: true,
      Guru: true,
      AbsenGuru: true,
      AbsenSiswa: true
    },
    orderBy: { waktu_mulai: 'asc' }
  });

  console.log(`Ditemukan ${allSessionsToday.length} total record sesi KBM hari ini.`);

  // Group by tenant_id + kelas_id + mapel_id + guru_id
  const groupMap = new Map();
  for (const s of allSessionsToday) {
    const key = `${s.tenant_id}_${s.kelas_id}_${s.mapel_id || 'none'}_${s.guru_id || 'none'}`;
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key).push(s);
  }

  let consolidatedCount = 0;

  for (const [key, sessions] of groupMap.entries()) {
    if (sessions.length <= 1) continue;

    console.log(`\n🔍 Terdeteksi ${sessions.length} sesi terfragmentasi untuk grup [${key}]:`);
    const primary = sessions[0]; // Sesi paling pagi
    const latest = sessions[sessions.length - 1]; // Sesi paling sore

    console.log(`  -> Mengonsolidasi ke Primary ID [${primary.id}] (Waktu: ${primary.waktu_mulai?.toISOString()} - ${latest.waktu_selesai?.toISOString()})`);

    // 1. Update primary session waktu_selesai ke waktu sesi terakhir
    await prisma.sesiAbsensi.update({
      where: { id: primary.id },
      data: {
        waktu_selesai: latest.waktu_selesai,
        updated_at: new Date()
      }
    });

    // 2. Pindahkan AbsenSiswa atau AbsenGuru dari sesi sekunder ke primary jika ada
    for (let i = 1; i < sessions.length; i++) {
      const secondary = sessions[i];
      
      // Pindahkan AbsenSiswa
      if (secondary.AbsenSiswa && secondary.AbsenSiswa.length > 0) {
        for (const as of secondary.AbsenSiswa) {
          const existingInPrimary = await prisma.absenSiswa.findFirst({
            where: { sesi_id: primary.id, siswa_id: as.siswa_id }
          });
          if (!existingInPrimary) {
            await prisma.absenSiswa.update({
              where: { id: as.id },
              data: { sesi_id: primary.id }
            });
          } else {
            await prisma.absenSiswa.delete({ where: { id: as.id } });
          }
        }
      }

      // Hapus secondary AbsenGuru & SesiAbsensi jika belum ada foto atau duplikat
      await prisma.absenGuru.deleteMany({ where: { sesi_id: secondary.id } });
      await prisma.sesiAbsensi.delete({ where: { id: secondary.id } });
      console.log(`  -> Menghapus sesi sekunder redundan [${secondary.id}]`);
    }

    consolidatedCount++;
  }

  console.log(`\n✅ Konsolidasi selesai! ${consolidatedCount} kelompok sesi berhasil disatukan.`);
}

runConsolidation().catch(console.error).finally(() => prisma.$disconnect());
