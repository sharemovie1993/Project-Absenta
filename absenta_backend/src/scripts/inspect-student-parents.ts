import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const REAL_PROD_ID = '8535b49c-d3fc-4598-922a-7774b49ee7c5';
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';

async function inspectStudentParentAndAddress() {
  console.log('🔍 [INSPEKSI DATA ORANG TUA & ALAMAT SISWA KELAS X: PROD VS DEMO]...\n');

  // 1. Cek Siswa di Produksi yang memiliki data orang tua / alamat
  const prodStudents = await prisma.siswa.findMany({
    where: { tenant_id: REAL_PROD_ID },
    include: {
      Kelas: true,
    }
  });

  const prodWithParents = prodStudents.filter(s => 
    s.nama_ayah || s.nama_ibu || s.no_hp_ortu || s.alamat || s.nama_wali
  );

  console.log(`📌 PRODUKSI: Total Siswa = ${prodStudents.length}`);
  console.log(`   └─ Siswa dengan Data Ortu / Alamat Terisi: ${prodWithParents.length}\n`);

  // Contoh 5 data di Produksi
  console.log('=== CONTOH 5 DATA SISWA DI PRODUKSI ===');
  prodWithParents.slice(0, 5).forEach(s => {
    console.log(`- [${s.nis || '-'}] ${s.nama_siswa.padEnd(30)} | Kelas: ${s.Kelas?.nama_kelas || '-'} | Ortu: Ayah(${s.nama_ayah || '-'}), Ibu(${s.nama_ibu || '-'}), HP(${s.no_hp_ortu || '-'}) | Alamat: ${s.alamat || '-'}`);
  });

  // 2. Cek Siswa di Demo
  const demoStudents = await prisma.siswa.findMany({
    where: { tenant_id: DEMO_ID },
    include: {
      Kelas: true,
    }
  });

  const demoWithParents = demoStudents.filter(s => 
    s.nama_ayah || s.nama_ibu || s.no_hp_ortu || s.alamat || s.nama_wali
  );

  console.log(`\n📌 DEMO: Total Siswa = ${demoStudents.length}`);
  console.log(`   └─ Siswa dengan Data Ortu / Alamat Terisi: ${demoWithParents.length}\n`);

  // Contoh 5 data di Demo
  console.log('=== CONTOH 5 DATA SISWA DI DEMO ===');
  demoWithParents.slice(0, 5).forEach(s => {
    console.log(`- [${s.nis || '-'}] ${s.nama_siswa.padEnd(30)} | Kelas: ${s.Kelas?.nama_kelas || '-'} | Ortu: Ayah(${s.nama_ayah || '-'}), Ibu(${s.nama_ibu || '-'}), HP(${s.no_hp_ortu || '-'}) | Alamat: ${s.alamat || '-'}`);
  });
}

inspectStudentParentAndAddress().catch(console.error).finally(() => prisma.$disconnect());
