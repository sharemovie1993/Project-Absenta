import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';

async function findBpbkCandidates() {
  console.log('🔍 [CANDIDATE GURU BP/BK DI SMKN 1 PLERED]...\n');

  const gurus = await prisma.guru.findMany({
    where: { tenant_id: DEMO_ID },
    include: {
      User: true,
      GuruMapel: { include: { Mapel: true } }
    }
  });

  for (const g of gurus) {
    const mapelNames = g.GuruMapel.map(gm => gm.Mapel.nama_mapel).join(', ');
    const jCount = await prisma.jadwalKBM.count({ where: { tenant_id: DEMO_ID, guru_id: g.id } });
    
    // Cari yang gelarnya S.Psi / S.Pd.I atau mapelnya terkait BK / Bimbingan / atau guru yang aktif
    if (
      g.nama_guru.toLowerCase().includes('psi') ||
      g.nama_guru.toLowerCase().includes('ajeng') ||
      g.nama_guru.toLowerCase().includes('konseling') ||
      mapelNames.toLowerCase().includes('bk') ||
      mapelNames.toLowerCase().includes('bimbingan')
    ) {
      console.log(`⭐ Guru: ${g.nama_guru.padEnd(35)} | User: ${g.User?.email || '-'} | Mapel: ${mapelNames || '(none)'} | Jadwal: ${jCount}`);
    }
  }
}

findBpbkCandidates().catch(console.error).finally(() => prisma.$disconnect());
