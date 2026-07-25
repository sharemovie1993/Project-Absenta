import { prisma } from '../utils/prisma';

async function main() {
  console.log('🔍 Checking TahunPelajaran & PerangkatAjar...');
  
  const years = await prisma.tahunPelajaran.findMany({
    include: { Semester: true }
  });
  console.log('Tahun Pelajaran List:', JSON.stringify(years, null, 2));

  const totalPerangkat = await prisma.perangkatAjar.count();
  console.log('Total PerangkatAjar rows in DB:', totalPerangkat);

  const libraryCount = await prisma.globalPerangkatAjarLibrary.count();
  console.log('Total GlobalPerangkatAjarLibrary rows in DB:', libraryCount);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
