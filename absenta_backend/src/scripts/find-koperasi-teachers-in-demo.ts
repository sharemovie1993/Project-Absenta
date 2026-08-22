import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';

async function checkTeachersInDemo() {
  const prodKoperasiUsers = [
    { code: 'KETUA_KOPERASI', prodName: 'INDRA MOHAMAD GOZALI, S.Pd.', search: 'indra' },
    { code: 'BENDAHARA_KOPERASI', prodName: 'DANI SETIAWAN, S.E.', search: 'dani' },
    { code: 'SEKRETARIS_KOPERASI', prodName: 'Sarip Hidayat, S.Pd.I', search: 'sarip' },
    { code: 'MANAJER_TOKO_KOPERASI', prodName: 'TATI KARYATI, S.Pd.', search: 'tati' },
    { code: 'PENGAWAS_KOPERASI', prodName: 'SISWOKO, S.T.', search: 'siswoko' }
  ];

  console.log('🔍 MENCARI GURU KOPERASI DI TENANT DEMO:');

  for (const item of prodKoperasiUsers) {
    const demoGurus = await prisma.guru.findMany({
      where: {
        tenant_id: DEMO_ID,
        nama_guru: { contains: item.search, mode: 'insensitive' }
      },
      include: {
        User: true
      }
    });

    console.log(`\n📌 [${item.code}] Produksi: ${item.prodName}`);
    demoGurus.forEach(g => {
      console.log(`   ↳ Demo Guru: ID=${g.id}, NIP=${g.nip}, Nama=${g.nama_guru}, UserID=${g.user_id}, UserEmail=${g.User?.email}, UserFullName=${g.User?.full_name}`);
    });
  }
}

checkTeachersInDemo()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
