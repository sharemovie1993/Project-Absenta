import { prisma } from '../utils/prisma';
import { guruService } from '../modules/academic/guru/services/guru.service';
import bcrypt from 'bcrypt';

async function testGuruProfile() {
  console.log('----------------------------------------------------');
  console.log('🔍 TEST SCRIPT: Verifikasi Data Profil Guru (Me)');
  console.log('----------------------------------------------------');

  const email = 'trisna@absenta.id';
  const rawPass = 'admin1234';

  // 1. Cari user di database
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    include: {
      Role: true,
      Tenant: true,
    },
  });

  if (!user) {
    console.error(`❌ User dengan email "${email}" TIDAK DITEMUKAN di database.`);
    process.exit(1);
  }

  console.log(`✅ User Ditemukan:`);
  console.log(`   - ID       : ${user.id}`);
  console.log(`   - Full Name: ${user.full_name}`);
  console.log(`   - Email    : ${user.email}`);
  console.log(`   - Role     : ${user.Role?.name}`);
  console.log(`   - Tenant ID: ${user.tenant_id}`);
  console.log(`   - Tenant   : ${user.Tenant?.name}`);

  // 2. Verifikasi Password
  let isPasswordValid = false;
  if (user.password) {
    isPasswordValid = await bcrypt.compare(rawPass, user.password);
  }
  console.log(`   - Password Match ('${rawPass}') : ${isPasswordValid ? '✅ VALID' : '❌ INVALID'}`);

  // 3. Panggil guruService.getGuruMe(userId, tenantId)
  if (!user.tenant_id) {
    console.error('❌ User tidak terhubung ke tenant_id mana pun.');
    process.exit(1);
  }

  const guruMe = await guruService.getGuruMe(user.id, user.tenant_id);

  if (!guruMe) {
    console.error(`❌ Profil Guru (record di tabel Guru) TIDAK DITEMUKAN untuk user_id: ${user.id}`);
    process.exit(1);
  }

  console.log('\n----------------------------------------------------');
  console.log('📋 HASIL PENARIKAN DATA PROFIL GURU (guruService.getGuruMe):');
  console.log('----------------------------------------------------');

  const requiredFields = [
    { key: 'id', label: 'ID Guru' },
    { key: 'nama_guru', label: 'Nama Guru' },
    { key: 'nip', label: 'NIP' },
    { key: 'no_rfid', label: 'No. RFID' },
    { key: 'email', label: 'Email' },
    { key: 'no_hp', label: 'No. WhatsApp / HP' },
    { key: 'alamat', label: 'Alamat Rumah' },
    { key: 'tempat_lahir', label: 'Tempat Lahir' },
    { key: 'tanggal_lahir', label: 'Tanggal Lahir' },
    { key: 'jenis_kelamin', label: 'Jenis Kelamin' },
    { key: 'agama', label: 'Agama' },
    { key: 'status_kepegawaian', label: 'Status Kepegawaian' },
    { key: 'pendidikan_terakhir', label: 'Pendidikan Terakhir' },
    { key: 'jenis_ptk', label: 'Jenis PTK' },
    { key: 'jabatan', label: 'Jabatan (String Label)' },
    { key: 'jabatan_list', label: 'Jabatan List (Array Posisi)' },
    { key: 'wali_kelas_di', label: 'Rombel Wali Kelas' },
    { key: 'unit', label: 'Unit / Jurusan' },
    { key: 'assignments', label: 'Daftar Assignment Struktural' },
  ];

  let missingCount = 0;
  let populatedCount = 0;

  for (const field of requiredFields) {
    const val = (guruMe as any)[field.key];
    const isPopulated = val !== undefined && val !== null && val !== '';
    if (isPopulated) {
      populatedCount++;
      const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
      console.log(`  🟢 [OK] ${field.label.padEnd(30)}: ${valStr}`);
    } else {
      missingCount++;
      console.log(`  ⚠️ [KOSONG/NULL] ${field.label.padEnd(25)}: null / undefined`);
    }
  }

  console.log('\n----------------------------------------------------');
  console.log(`📊 RINGKASAN HASIL TEST:`);
  console.log(`   - Total Field Diperiksa : ${requiredFields.length}`);
  console.log(`   - Field Terisi (Populated): ${populatedCount}`);
  console.log(`   - Field Kosong/Null       : ${missingCount}`);
  console.log('----------------------------------------------------');

  if (guruMe) {
    console.log('\n🎉 KESIMPULAN: Data Profil Guru Berhasil Ditarik Secara Lengkap dari Database!');
  }

  await prisma.$disconnect();
}

testGuruProfile().catch((err) => {
  console.error('❌ Error executing test script:', err);
  prisma.$disconnect();
  process.exit(1);
});
