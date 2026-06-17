
const { SekolahService } = require('@/modules/sekolah/services/sekolah.service');
const { prisma } = require('@/utils/prisma');

async function verifyAutoFix() {
  const service = new SekolahService();
  const npsn = '20229659';
  
  console.log(`\n--- Step 1: Performing lookup for NPSN ${npsn} ---`);
  const result = await service.lookupMasterByNpsn(npsn);
  
  console.log('Result Source:', result?.source);
  console.log('School Name:', result?.data?.nama);
  console.log('Address:', result?.data?.alamat);
  
  if (result?.data?.nama === 'SMKN 1 PLERED' || result?.data?.nama?.includes('PLERED')) {
    console.log('✅ SUCCESS: Data is correct (SMKN 1 PLERED)');
  } else {
    console.log('❌ FAILED: Data is still incorrect or mismatch');
  }

  // Check if saved to DB
  const dbRecord = await prisma.masterSekolah.findUnique({ where: { npsn } });
  console.log('Saved to DB:', dbRecord ? 'YES' : 'NO');
  console.log('DB Name:', dbRecord?.nama);

  await prisma.$disconnect();
}

// Since I am running this via ts-node or similar, I'll need to handle the import path if I run with node.
// Actually, I'll run it using ts-node to handle the @ aliases.
verifyAutoFix().catch(console.error);
