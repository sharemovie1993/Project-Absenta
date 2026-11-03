import { prisma } from '../utils/prisma';
import { CbtBankSoalService } from '../modules/cbt/services/cbt-bank-soal.service';
import { CbtJadwalService } from '../modules/cbt/services/cbt-jadwal.service';
import { CbtTestEngineService } from '../modules/cbt/services/cbt-test-engine.service';
import { getRedisConnection } from '../infra/redis/redisClient';

async function runCbtCrudTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING COMPREHENSIVE CBT BACKEND CRUD & ENGINE TESTS');
  console.log('====================================================\n');

  // 1. Ambil Fixture Entities dari Database
  const guruSample = await prisma.guru.findFirst({
    where: {
      Tenant: { status: 'ACTIVE' },
    },
    select: { tenant_id: true, Tenant: { select: { id: true, name: true } } },
  });

  if (!guruSample || !guruSample.Tenant) throw new Error('Tenant aktif tidak ditemukan untuk test');
  const tenant = guruSample.Tenant;
  const tenantId = tenant.id;

  const guru = await prisma.guru.findFirst({ where: { tenant_id: tenantId }, select: { id: true } });
  const mapel = await prisma.mapel.findFirst({ where: { tenant_id: tenantId }, select: { id: true } });
  const siswa = await prisma.siswa.findFirst({ where: { tenant_id: tenantId }, select: { id: true, kelas_id: true } });
  const tp = await prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId }, select: { id: true } });
  const sem = await prisma.semester.findFirst({ where: { tenant_id: tenantId }, select: { id: true } });

  if (!guru || !mapel || !siswa || !tp || !sem) {
    throw new Error('Data relasi sekolah (guru/mapel/siswa/tp/sem) tidak lengkap untuk testing');
  }

  console.log(`[SETUP] Tenant: ${tenant.name} (${tenantId})`);
  console.log(`[SETUP] Guru ID: ${guru.id}, Mapel ID: ${mapel.id}, Siswa ID: ${siswa.id}\n`);

  let testBankSoalId = '';
  let testJadwalId = '';
  let testSoalId = '';

  try {
    // ----------------------------------------------------
    // TEST 1: CREATE BANK SOAL
    // ----------------------------------------------------
    console.log('▶ TEST 1: CbtBankSoalService.create()');
    const bankPayload = {
      guru_id: guru.id,
      mapel_id: mapel.id,
      kode_bank: `TEST-CBT-${Date.now()}`,
      judul: 'Ujian Akhir Semester CBT Simulasi 3000 User',
      tingkat: 'X',
      jurusan: null,
      alokasi_menit: 90,
      acak_soal: true,
      acak_opsi: true,
    };
    const createdBank = await CbtBankSoalService.create(tenantId, bankPayload);
    testBankSoalId = createdBank.id;

    if (!createdBank.id || createdBank.status !== 'DRAFT') {
      throw new Error('Gagal: CbtBankSoalService.create() mengembalikan data tidak valid');
    }
    console.log(`  ✅ SUCCESS: Bank Soal dibuat [ID: ${createdBank.id}, Kode: ${createdBank.kode_bank}]`);

    // ----------------------------------------------------
    // TEST 2: READ & QUERY BANK SOAL
    // ----------------------------------------------------
    console.log('\n▶ TEST 2: CbtBankSoalService.getById() & list()');
    const fetchedBank = await CbtBankSoalService.getById(tenantId, testBankSoalId);
    if (fetchedBank.judul !== bankPayload.judul || !fetchedBank.Mapel) {
      throw new Error('Gagal: CbtBankSoalService.getById() data tidak sesuai relasi');
    }

    const listBank = await CbtBankSoalService.list(tenantId, { search: bankPayload.kode_bank });
    if (listBank.items.length === 0) {
      throw new Error('Gagal: CbtBankSoalService.list() tidak menemukan bank soal');
    }
    console.log(`  ✅ SUCCESS: getById() & list() valid (Total items: ${listBank.pagination.totalItems})`);

    // ----------------------------------------------------
    // TEST 3: UPDATE BANK SOAL
    // ----------------------------------------------------
    console.log('\n▶ TEST 3: CbtBankSoalService.update()');
    const updatedBank = await CbtBankSoalService.update(tenantId, testBankSoalId, {
      judul: 'Ujian Akhir Semester CBT Simulasi (Updated)',
      alokasi_menit: 120,
    });
    if (updatedBank.alokasi_menit !== 120) {
      throw new Error('Gagal: CbtBankSoalService.update() tidak mengubah alokasi_menit');
    }
    console.log(`  ✅ SUCCESS: Bank Soal terupdate (alokasi_menit: ${updatedBank.alokasi_menit})`);

    // ----------------------------------------------------
    // TEST 4: CREATE SOAL PG (With Stimulus & Option Images)
    // ----------------------------------------------------
    console.log('\n▶ TEST 4: CbtBankSoalService.createQuestion() [PG 5 Opsi & Gambar]');
    const question1 = await CbtBankSoalService.createQuestion(tenantId, testBankSoalId, {
      nomor_urut: 1,
      jenis_soal: 'PG',
      konten_pertanyaan: 'Perhatikan gambar rangkaian listrik berikut! Komponen apakah yang ditunjukkan huruf X?',
      gambar_stimulus_url: 'https://storage.absenta.id/cbt/stimulus-01.png',
      bobot: 1.0,
      opsi_jawaban_json: [
        { kode: 'A', teks: 'Resistor 100 Ohm', gambar_url: null },
        { kode: 'B', teks: 'Kapasitor Elektrolit', gambar_url: 'https://storage.absenta.id/cbt/opsi-b.png' },
        { kode: 'C', teks: 'Dioda Penyearah', gambar_url: null },
        { kode: 'D', teks: 'Transistor NPN', gambar_url: null },
        { kode: 'E', teks: 'Induktor Inti Udara', gambar_url: null },
      ],
      kunci_jawaban: 'B',
      pembahasan: 'Komponen X berbentuk silinder polaritas adalah kapasitor elektrolit (Elco).',
    });
    testSoalId = question1.id;

    // Verifikasi counter jumlah_soal terupdate di Bank Soal
    const bankAfterQ1 = await CbtBankSoalService.getById(tenantId, testBankSoalId);
    if (bankAfterQ1.jumlah_soal !== 1) {
      throw new Error(`Gagal: Counter jumlah_soal diharapkan 1, tetapi didapat ${bankAfterQ1.jumlah_soal}`);
    }
    console.log(`  ✅ SUCCESS: Butir Soal 1 dibuat [Kunci: ${question1.kunci_jawaban}, Jumlah Soal Bank: ${bankAfterQ1.jumlah_soal}]`);

    // ----------------------------------------------------
    // TEST 5: BULK IMPORT SOAL PG
    // ----------------------------------------------------
    console.log('\n▶ TEST 5: CbtBankSoalService.bulkImportQuestions()');
    const bulkPayload = [
      {
        nomor_urut: 2,
        jenis_soal: 'PG',
        konten_pertanyaan: 'Berapakah hasil dari \\(2^3 \\times 4\\)?',
        bobot: 1.0,
        opsi_jawaban_json: [
          { kode: 'A', teks: '16' },
          { kode: 'B', teks: '24' },
          { kode: 'C', teks: '32' },
          { kode: 'D', teks: '64' },
          { kode: 'E', teks: '128' },
        ],
        kunci_jawaban: 'C', // 8 * 4 = 32
      },
      {
        nomor_urut: 3,
        jenis_soal: 'PG',
        konten_pertanyaan: 'Ibukota negara Indonesia yang baru di Kalimantan Timur adalah...',
        bobot: 1.0,
        opsi_jawaban_json: [
          { kode: 'A', teks: 'Balikpapan' },
          { kode: 'B', teks: 'Nusantara (IKN)' },
          { kode: 'C', teks: 'Samarinda' },
          { kode: 'D', teks: 'Bontang' },
          { kode: 'E', teks: 'Penajam' },
        ],
        kunci_jawaban: 'B',
      },
    ];

    const bulkResult = await CbtBankSoalService.bulkImportQuestions(tenantId, testBankSoalId, bulkPayload);
    if (bulkResult.importedCount !== 2 || bulkResult.totalSoal !== 3) {
      throw new Error(`Gagal: Bulk import salah hitung (Imported: ${bulkResult.importedCount}, Total: ${bulkResult.totalSoal})`);
    }
    console.log(`  ✅ SUCCESS: Bulk import 2 butir soal berhasil (Total bank soal sekarang: ${bulkResult.totalSoal})`);

    // ----------------------------------------------------
    // TEST 6: CREATE & REGENERATE TOKEN JADWAL UJIAN
    // ----------------------------------------------------
    console.log('\n▶ TEST 6: CbtJadwalService.create() & regenerateToken()');
    const jadwalPayload = {
      bank_soal_id: testBankSoalId,
      tahun_pelajaran_id: tp.id,
      semester_id: sem.id,
      nama_sesi: 'UAS Semester Ganjil Sesi Pagi',
      tanggal_mulai: new Date().toISOString(),
      tanggal_selesai: new Date(Date.now() + 86400000).toISOString(),
      durasi_menit: 90,
      toleransi_terlambat_menit: 15,
      target_kelas_ids: [siswa.kelas_id || 'all'],
    };

    const createdJadwal = await CbtJadwalService.create(tenantId, jadwalPayload);
    testJadwalId = createdJadwal.id;
    const initialToken = createdJadwal.token_ujian;

    if (!createdJadwal.token_ujian || createdJadwal.token_ujian.length !== 6) {
      throw new Error(`Gagal: Token ujian harus 6 karakter, didapat: ${createdJadwal.token_ujian}`);
    }

    const { token_ujian: regeneratedToken } = await CbtJadwalService.regenerateToken(tenantId, testJadwalId);
    if (!regeneratedToken || regeneratedToken === initialToken) {
      throw new Error('Gagal: Regenerate token tidak menghasilkan token baru yang berbeda');
    }
    console.log(`  ✅ SUCCESS: Jadwal Ujian dibuat [Token Awal: ${initialToken} ➔ Token Baru: ${regeneratedToken}]`);

    // ----------------------------------------------------
    // TEST 7: ACTIVATE JADWAL & REDIS CACHING PRE-HEAT
    // ----------------------------------------------------
    console.log('\n▶ TEST 7: CbtJadwalService.activateJadwal() [Redis Pre-heating Check]');
    await CbtJadwalService.activateJadwal(tenantId, testJadwalId);

    const redis = getRedisConnection();
    if (redis) {
      const bundleInRedis = await redis.get(`cbt:${tenantId}:bundle:${testJadwalId}`);
      if (!bundleInRedis) {
        console.warn('  ⚠️ Redis bundle key belum terisi atau Redis tidak aktif, melanjutkan fallback DB...');
      } else {
        const parsedBundle = JSON.parse(bundleInRedis);
        if (parsedBundle.soal.length !== 3) {
          throw new Error(`Gagal: Bundle soal di Redis harus berisi 3 butir soal, didapat: ${parsedBundle.soal.length}`);
        }
        console.log(`  ✅ SUCCESS: Redis Pre-heat aktif! Bundle 3 butir soal ter-cache di O(1) in-memory.`);
      }
    } else {
      console.log('  ℹ️ Redis standalone client offline, sistem berjalan dengan auto-fallback DB.');
    }

    // ----------------------------------------------------
    // TEST 8: STUDENT EXAM ENGINE LIFECYCLE
    // ----------------------------------------------------
    console.log('\n▶ TEST 8: CbtTestEngineService.verifyToken() & startSession()');
    // Siswa memverifikasi token
    const verifyRes = await CbtTestEngineService.verifyToken(tenantId, regeneratedToken, siswa.id);
    if (!verifyRes.valid || verifyRes.jadwal_id !== testJadwalId) {
      throw new Error('Gagal: verifyToken tidak mengembalikan jadwal yang sesuai');
    }
    console.log(`  ✅ Token valid: Sesi "${verifyRes.nama_sesi}", Mapel "${verifyRes.mapel}"`);

    // Siswa mulai sesi ujian
    const sessionRes = await CbtTestEngineService.startOrResumeSession(
      tenantId,
      testJadwalId,
      siswa.id,
      regeneratedToken,
      { browser: 'Chrome 128', os: 'Windows 11' }
    );

    if (sessionRes.soal.length !== 3 || sessionRes.sisa_waktu_detik <= 0) {
      throw new Error('Gagal: startOrResumeSession tidak mengembalikan bundle soal atau sisa waktu');
    }
    console.log(`  ✅ Sesi dimulai: ${sessionRes.soal.length} soal diterima, sisa waktu: ${sessionRes.sisa_waktu_detik} detik`);

    // Siswa autosave batch jawaban (Simulasi autosave debounced)
    console.log('\n▶ TEST 9: CbtTestEngineService.syncAnswersBatch() [Redis In-Memory Buffer]');
    const studentAnswers = [
      { soal_id: testSoalId, jawaban_siswa: 'B', is_ragu: false, timestamp: Date.now() }, // Benar (Kunci B)
      { soal_id: sessionRes.soal[1].id, jawaban_siswa: 'C', is_ragu: false, timestamp: Date.now() }, // Benar (Kunci C)
      { soal_id: sessionRes.soal[2].id, jawaban_siswa: 'A', is_ragu: false, timestamp: Date.now() }, // Salah (Jawab A, Kunci B)
    ];

    const syncRes = await CbtTestEngineService.syncAnswersBatch(tenantId, testJadwalId, siswa.id, {
      jawaban: studentAnswers,
      sisa_waktu_detik: 5200,
    });
    if (!syncRes.success || syncRes.synced_items !== 3) {
      throw new Error('Gagal: syncAnswersBatch gagal menyimpan ke buffer');
    }
    console.log(`  ✅ Autosave tersinkronisasi: ${syncRes.synced_items} jawaban disimpan`);

    // Simulasi deteksi anti-curang (tab switch)
    console.log('\n▶ TEST 10: CbtTestEngineService.recordViolation() [Anti-Cheat System]');
    const violationRes = await CbtTestEngineService.recordViolation(tenantId, testJadwalId, siswa.id, {
      tipe_pelanggaran: 'TAB_SWITCH',
      detail: 'Siswa berpindah window ke browser lain',
    });
    if (!violationRes.success || violationRes.violation_count !== 1) {
      throw new Error('Gagal: recordViolation tidak mencatat log pelanggaran');
    }
    console.log(`  ✅ Anti-cheat log aktif: Pelanggaran ${violationRes.violation_count} tercatat`);

    // Siswa submit final (Kumpulkan Lembar Ujian)
    console.log('\n▶ TEST 11: CbtTestEngineService.submitFinal() [Automated Grading]');
    const submitRes = await CbtTestEngineService.submitFinal(tenantId, testJadwalId, siswa.id, {
      jawaban_final: studentAnswers,
    });
    if (!submitRes.success || submitRes.status !== 'FINISHED') {
      throw new Error('Gagal: respon submitFinal tidak valid');
    }

    // 2 Benar dari 3 Soal = (2/3)*100 = 66.67
    const pesertaFinal = await prisma.cbtPesertaUjian.findFirst({
      where: { tenant_id: tenantId, jadwal_ujian_id: testJadwalId, siswa_id: siswa.id },
    });

    if (!pesertaFinal || pesertaFinal.status !== 'FINISHED') {
      throw new Error('Gagal: status peserta ujian setelah submit harus FINISHED');
    }

    if (pesertaFinal.jumlah_benar !== 2 || pesertaFinal.jumlah_salah !== 1) {
      throw new Error(`Gagal: Grading salah. Diharapkan Benar: 2, Salah: 1. Didapat: Benar: ${pesertaFinal.jumlah_benar}, Salah: ${pesertaFinal.jumlah_salah}`);
    }

    console.log(`  ✅ Submit Final Berhasil: Status ${pesertaFinal.status}`);
    console.log(`  📊 Hasil Grading Otomatis: Benar = ${pesertaFinal.jumlah_benar}, Salah = ${pesertaFinal.jumlah_salah}, Nilai Akhir = ${pesertaFinal.nilai_akhir}`);

    // ----------------------------------------------------
    // TEST 12: DELETE RESTRICTION & CASCADE CLEANUP
    // ----------------------------------------------------
    console.log('\n▶ TEST 12: Integritas Hapus Bank Soal saat Jadwal Aktif');
    let deletePrevented = false;
    try {
      await CbtBankSoalService.delete(tenantId, testBankSoalId);
    } catch {
      deletePrevented = true;
    }
    if (!deletePrevented) {
      throw new Error('Gagal: Bank Soal seharusnya TIDAK boleh dihapus saat jadwal ujian masih aktif');
    }
    console.log('  ✅ Pencegahan integritas relasi berjalan: Bank Soal dilindungi dari penghapusan');

  } finally {
    // Cleanup data testing agar database kembali bersih
    console.log('\n🧹 CLEANING UP TEST DATA...');
    if (testJadwalId) {
      await prisma.cbtPesertaUjian.deleteMany({ where: { jadwal_ujian_id: testJadwalId } }).catch(() => null);
      await prisma.cbtJadwalUjian.delete({ where: { id: testJadwalId } }).catch(() => null);
    }
    if (testBankSoalId) {
      await prisma.cbtSoal.deleteMany({ where: { bank_soal_id: testBankSoalId } }).catch(() => null);
      await prisma.cbtBankSoal.delete({ where: { id: testBankSoalId } }).catch(() => null);
    }
    console.log('  ✅ Database test cleanup selesai.');
  }

  console.log('\n====================================================');
  console.log('🎉 SEMUA 12 TEST CBT BACKEND CRUD & ENGINE SUKSES PASS!');
  console.log('====================================================');
}

runCbtCrudTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ TEST RUNNER GAGAL:', err);
    process.exit(1);
  });
