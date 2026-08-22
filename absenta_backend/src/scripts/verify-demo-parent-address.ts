import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';

async function verifyDemoParentAddress() {
  const samples = await prisma.siswa.findMany({
    where: {
      tenant_id: DEMO_ID,
      nama_ayah: { not: null }
    },
    include: { Kelas: true },
    take: 5
  });

  console.log('=== CONTOH SISWA KELAS X DENGAN DATA ORTU & ALAMAT LENGKAP DI DEMO ===');
  samples.forEach(s => {
    console.log(`📌 [${s.nis || '-'}] ${s.nama_siswa.padEnd(20)} | Kelas: ${s.Kelas?.nama_kelas || '-'}`);
    console.log(`   ├─ 👨 Ayah   : ${s.nama_ayah || '-'} (Pekerjaan: ${s.pekerjaan_ayah || '-'}, HP: ${s.no_hp_ayah || '-'})`);
    console.log(`   ├─ 👩 Ibu    : ${s.nama_ibu || '-'} (Pekerjaan: ${s.pekerjaan_ibu || '-'}, HP: ${s.no_hp_ibu || '-'})`);
    console.log(`   └─ 🏠 Alamat : ${s.alamat || '-'} (RT/RW: ${s.rt || '-'}/${s.rw || '-'}, Kel: ${s.kelurahan || '-'}, Kec: ${s.kecamatan || '-'})\n`);
  });
}

verifyDemoParentAddress().catch(console.error).finally(() => prisma.$disconnect());
