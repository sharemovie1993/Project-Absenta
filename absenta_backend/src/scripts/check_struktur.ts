import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const TARGET_TENANT_ID = 'b4b316ce-c4cf-4519-a7a1-c0d3284d8745';

async function run() {
  console.log("=== MIGRASI DATA STRUKTUR KURIKULUM PROD ===");
  
  // 1. Ambil list semua jurusan milik tenant ini
  const jurusans = await prisma.jurusan.findMany({
    where: { tenant_id: TARGET_TENANT_ID }
  });
  
  console.log(`Ditemukan ${jurusans.length} Jurusan.`);
  
  // 2. Ambil list semua record Struktur Kurikulum tingkat 11 & 12 yang jurusan_id-nya masih NULL
  const records = await (prisma as any).strukturKurikulum.findMany({
    where: {
      tenant_id: TARGET_TENANT_ID,
      jurusan_id: null,
      tingkat: { in: [11, 12] }
    },
    include: {
      Mapel: true
    }
  });
  
  console.log(`Ditemukan ${records.length} record global (null) di Kelas 11 & 12.`);
  
  let updatedCount = 0;
  for (const r of records) {
    const kode = (r.Mapel?.kode_mapel || '').toUpperCase();
    const nama = (r.Mapel?.nama_mapel || '').toLowerCase();
    
    // Cari apakah mapel ini mengandung kode/nama jurusan spesifik
    // Misal: PKK-AKL-B4B3 atau KK-AKL
    const matchedJurusan = jurusans.find(j => {
      const kodeJurusan = j.kode.toUpperCase();
      return kode.includes(`-${kodeJurusan}`) || kode.includes(`KK-${kodeJurusan}`) || nama.includes(j.nama.toLowerCase());
    });
    
    if (matchedJurusan) {
      // Update record StrukturKurikulum ini agar memiliki jurusan_id yang sesuai
      await (prisma as any).strukturKurikulum.update({
        where: { id: r.id },
        data: { jurusan_id: matchedJurusan.id }
      });
      console.log(`- BERHASIL Memindahkan Mapel [${r.Mapel?.nama_mapel}] ke Jurusan: [${matchedJurusan.nama}] (ID: ${matchedJurusan.id})`);
      updatedCount++;
    }
  }
  
  console.log(`\nMigrasi Selesai! Berhasil merapikan ${updatedCount} mapel ke jurusan masing-masing.`);
}

run().catch(console.error);
