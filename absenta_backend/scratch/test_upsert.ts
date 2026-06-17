import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
  const tenantId = '666270fa-404f-45a7-96ef-b924976a166a'; // Existing tenant from logs
  const data = {
    tenant_id: tenantId,
    nama: 'Test Asset',
    brand: 'Test',
    kondisi: 'BAIK',
    jumlah: 1,
    is_loanable: true
  };
  const kode = 'TEST-UPSERT-' + Date.now();

  try {
    console.log('Testing create...');
    await prisma.sarprasAsset.create({
      data: { ...data, kode }
    });
    console.log('Create success');

    console.log('Testing upsert...');
    await prisma.sarprasAsset.upsert({
      where: { kode },
      update: { ...data, deskripsi: 'Updated' },
      create: { ...data, kode, deskripsi: 'Created' }
    });
    console.log('Upsert success');
  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
