import { PrismaClient } from '@prisma/client';
import { waliKelasService } from '../modules/kurikulum/wali-kelas/services/wali-kelas.service';

const prisma = new PrismaClient();

async function runTest() {
  console.log('=== TEST JURNAL WALI KELAS BACKEND SERVICE ===');

  try {
    const kelas = await prisma.kelas.findFirst();

    if (!kelas) {
      console.error('❌ Data Kelas tidak ditemukan sama sekali');
      process.exit(1);
    }
    console.log(`✅ Kelas ID: ${kelas.id}, Tenant ID: ${kelas.tenant_id}, Nama: ${kelas.nama_kelas}`);

    const tenantId = kelas.tenant_id;

    const guru = await prisma.guru.findFirst({
      where: { tenant_id: tenantId },
    });

    const userId = guru?.user_id || 'system-user-test';

    const mockUser = { id: userId, role: 'STAFF' };

    // 2. Test Create Jurnal
    console.log('\n--- 1. Testing Create Jurnal ---');
    const newJurnal = await waliKelasService.createJurnal(tenantId, mockUser, {
      kelas_id: kelas.id,
      tanggal: new Date().toISOString(),
      jam: '08:00',
      kategori: 'PENTING',
      judul: '[TEST SCRIPT] Pembinaan Ketertiban Kelas',
      isi: 'Menghimbau seluruh siswa untuk menjaga kebersihan dan kerapian kelas.',
      tags: ['Ketertiban', 'Kebersihan'],
      attached_students: [],
    });

    console.log('✅ Jurnal berhasil dibuat:', {
      id: newJurnal.id,
      judul: newJurnal.judul,
      kategori: newJurnal.kategori,
      guru: newJurnal.Guru?.nama_guru,
      kelas: newJurnal.Kelas?.nama_kelas,
    });

    // 3. Test Get Jurnal List
    console.log('\n--- 2. Testing Get Jurnal List ---');
    const jurnalList = await waliKelasService.getJurnal(tenantId, mockUser, {
      kelas_id: kelas.id,
      page: 1,
      limit: 10,
    });

    console.log(`✅ Total Jurnal Ditemukan: ${jurnalList.pagination.total}`);
    console.log(`✅ Sample Judul Pertama: ${jurnalList.data[0]?.judul}`);

    // 4. Test Delete Jurnal (Clean Up)
    console.log('\n--- 3. Testing Delete Jurnal ---');
    await waliKelasService.deleteJurnal(tenantId, newJurnal.id);
    console.log(`✅ Jurnal ID ${newJurnal.id} berhasil dihapus (Clean-up sukses)`);

    console.log('\n🎉 ALL JURNAL WALI KELAS TESTS PASSED SUCCESSFULLY!');
  } catch (err: any) {
    console.error('❌ TEST FAILED WITH ERROR:', err.message || err);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
