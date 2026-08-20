import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function emptyPresets() {
  console.log('🗑️ Mengosongkan tabel BahanAjarPreset di database...');
  
  // Unlink any preset_ref_id on perangkatAjar to avoid FK constraint issues if any
  await prisma.perangkatAjar.updateMany({
    where: { preset_ref_id: { not: null } },
    data: { preset_ref_id: null }
  });

  const deleteResult = await prisma.bahanAjarPreset.deleteMany({});
  console.log(`✅ Berhasil menghapus ${deleteResult.count} template bahan ajar dari database.`);
  console.log('Tabel BahanAjarPreset sekarang KOSONG (0 baris).');
}

emptyPresets()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error('❌ Error:', err);
    prisma.$disconnect();
    process.exit(1);
  });
