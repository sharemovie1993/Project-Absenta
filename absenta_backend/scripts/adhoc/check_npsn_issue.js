
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAndFixNpsn() {
  const npsn = '20229659';
  console.log(`Checking NPSN: ${npsn}`);
  
  try {
    const deleted = await prisma.masterSekolah.deleteMany({
      where: { npsn }
    });
    console.log('Deleted corrupted entries count:', deleted.count);
  } catch (e) {
    console.log('Delete error:', e.message);
  }
  
  await prisma.$disconnect();
}

checkAndFixNpsn();
