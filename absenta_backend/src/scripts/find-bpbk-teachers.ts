import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';

async function findBpbkAndKeyTeachers() {
  console.log('🔍 [MENCARI GURU BP/BK & PEMEGANG JABATAN DENGAN JADWAL TERLENGKAP]...\n');

  // 1. Cek Mapel yang terkait BK / BP
  const bkMapels = await prisma.mapel.findMany({
    where: {
      tenant_id: DEMO_ID,
      OR: [
        { nama_mapel: { contains: 'BK', mode: 'insensitive' } },
        { nama_mapel: { contains: 'Bimbingan', mode: 'insensitive' } },
        { nama_mapel: { contains: 'Konseling', mode: 'insensitive' } },
      ]
    }
  });
  console.log('Mapel BK:', bkMapels);

  // 2. Cek GuruMapel untuk Mapel BK
  if (bkMapels.length > 0) {
    const gmBk = await prisma.guruMapel.findMany({
      where: {
        tenant_id: DEMO_ID,
        mapel_id: { in: bkMapels.map(m => m.id) }
      },
      include: { Guru: { include: { User: true } }, Mapel: true }
    });
    console.log('Guru Pengajar BK:', gmBk.map(g => ({
      guru: g.Guru?.nama_guru,
      user_id: g.Guru?.user_id,
      email: g.Guru?.User?.email,
      mapel: g.Mapel?.nama_mapel
    })));
  }

  // 3. Cek data guru yang memiliki jabatan BPBK di Struktur Organisasi
  const bkPos = await prisma.organizationalPosition.findFirst({
    where: { tenant_id: DEMO_ID, code: 'BPBK' }
  });
  if (bkPos) {
    const assigns = await prisma.organizationalAssignment.findMany({
      where: { tenant_id: DEMO_ID, position_id: bkPos.id }
    });
    for (const a of assigns) {
      const u = await prisma.user.findUnique({ where: { id: a.user_id } });
      const g = await prisma.guru.findFirst({ where: { user_id: a.user_id } });
      console.log(`Penugasan BPBK: ${u?.full_name} (${u?.email}) -> Guru ID: ${g?.id}`);
    }
  }

  // 4. Cek Akun Pimpinan (Kepsek, Kurikulum, Kesiswaan, Sarpras, Hubin, TU, Walikelas) dan jadwal mereka
  const rolesToCheck = [
    { label: 'Kepsek', email: 'kepsek@absenta.id' },
    { label: 'Kurikulum', email: 'kurikulum@absenta.id' },
    { label: 'Kesiswaan', email: 'kesiswaan@absenta.id' },
    { label: 'Hubin', email: 'hubin@absenta.id' },
    { label: 'Sarpras', email: 'sarpras@absenta.id' },
    { label: 'TU', email: 'tu@absenta.id' },
    { label: 'Wali Kelas', email: 'walikelas@absenta.id' },
    { label: 'Kaprog', email: 'kaprog@absenta.id' },
    { label: 'BPBK', email: 'bpbk@absenta.id' },
  ];

  console.log('\n================ CEK JADWAL AKUN PIMPINAN SAAT INI ================');
  for (const item of rolesToCheck) {
    const u = await prisma.user.findFirst({
      where: { tenant_id: DEMO_ID, email: item.email }
    });
    let jCount = 0;
    let g = null;
    if (u) {
      g = await prisma.guru.findFirst({ where: { tenant_id: DEMO_ID, user_id: u.id } });
      if (g) {
        jCount = await prisma.jadwalKBM.count({
          where: { tenant_id: DEMO_ID, guru_id: g.id }
        });
      }
    }
    console.log(`${item.label.padEnd(15)} | ${item.email.padEnd(25)} | User: ${u?.full_name?.padEnd(35) || '-'} | Guru: ${g ? g.nama_guru : 'TIDAK'} | Jadwal: ${jCount}`);
  }
}

findBpbkAndKeyTeachers().catch(console.error).finally(() => prisma.$disconnect());
