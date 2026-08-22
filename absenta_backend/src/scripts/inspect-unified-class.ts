import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';

async function inspectClassesAndSchedules() {
  console.log('🔍 [INSPEKSI KELAS, WALI KELAS, SISWA, & JADWAL KBM ERWIN DI DEMO]...\n');

  // Ambil data Guru Erwin
  const erwin = await prisma.guru.findFirst({
    where: {
      tenant_id: DEMO_ID,
      nama_guru: { contains: 'Erwin', mode: 'insensitive' },
      JadwalKBM: { some: {} }
    },
    include: {
      JadwalKBM: {
        include: { Kelas: true, Mapel: true }
      }
    }
  });

  if (!erwin) {
    console.error('Guru Erwin tidak ditemukan!');
    return;
  }

  console.log(`📌 Guru Mapel: ${erwin.nama_guru} (ID: ${erwin.id})`);
  console.log(`   Total Jadwal KBM: ${erwin.JadwalKBM.length}`);

  // Kelas-kelas yang diajar oleh Erwin:
  const taughtClassesMap = new Map<string, { kelasId: string; namaKelas: string; mapels: string[]; count: number }>();
  for (const j of erwin.JadwalKBM) {
    if (!j.Kelas) continue;
    const existing = taughtClassesMap.get(j.Kelas.id) || {
      kelasId: j.Kelas.id,
      namaKelas: j.Kelas.nama_kelas,
      mapels: [],
      count: 0
    };
    if (j.Mapel && !existing.mapels.includes(j.Mapel.nama_mapel)) {
      existing.mapels.push(j.Mapel.nama_mapel);
    }
    existing.count++;
    taughtClassesMap.set(j.Kelas.id, existing);
  }

  console.log('\n=== KELAS YANG DIAJAR OLEH ERWIN ===');
  for (const [kId, info] of taughtClassesMap) {
    // Cek Wali Kelas dari kelas ini
    const assignment = await prisma.organizationalAssignment.findFirst({
      where: {
        tenant_id: DEMO_ID,
        unit_id: kId,
        Position: { code: 'WALIKELAS' }
      },
      include: { User: true }
    });

    // Cek jumlah siswa aktif
    const studentCount = await prisma.siswa.count({
      where: { tenant_id: DEMO_ID, kelas_id: kId, status: 'AKTIF' }
    });

    console.log(`📌 Kelas: ${info.namaKelas.padEnd(15)} | Siswa Aktif: ${studentCount} | Mapel Diajar: [${info.mapels.join(', ')}]`);
    console.log(`   └─ Wali Kelas Terdaftar: ${assignment?.User?.full_name || 'BELUM DI-SET'} (${assignment?.User?.email || '-'})\n`);
  }
}

inspectClassesAndSchedules().catch(console.error).finally(() => prisma.$disconnect());
