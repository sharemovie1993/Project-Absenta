import { prisma } from '../utils/prisma';
import { wilayahController } from '../modules/wilayah/controllers/wilayah.controller';

async function testKabupatenFilter() {
  console.log('====================================================');
  console.log('🔍 TEST: getKabupaten untuk berbagai nilai provinsi_nama');
  console.log('====================================================');

  const mockReply = (label: string) => {
    return {
      status(_code: number) { return this; },
      send(data: any) {
        console.log(`\n--- [${label}] ---`);
        console.log('Total returned:', data?.data?.length || 0);
        if (data?.data && data.data.length > 0) {
          console.log('First 3 items:', data.data.slice(0, 3));
        } else {
          console.log('Returned EMPTY array! Payload:', JSON.stringify(data));
        }
        return data;
      }
    };
  };

  await wilayahController.getKabupaten({ query: { provinsi_nama: 'JAWA_BARAT' } }, mockReply('provinsi_nama = "JAWA_BARAT"'));
  await wilayahController.getKabupaten({ query: { provinsi_nama: 'Jawa Barat' } }, mockReply('provinsi_nama = "Jawa Barat"'));
  await wilayahController.getKabupaten({ query: { provinsi_nama: 'JAWA BARAT' } }, mockReply('provinsi_nama = "JAWA BARAT"'));
  await wilayahController.getKabupaten({ query: { provinsi_nama: 'DKI_JAKARTA' } }, mockReply('provinsi_nama = "DKI_JAKARTA"'));

  await prisma.$disconnect();
}

testKabupatenFilter().catch(err => {
  console.error('Error:', err);
  prisma.$disconnect();
  process.exit(1);
});
