import { prisma } from '../utils/prisma';
import { guruService } from '../modules/academic/guru/services/guru.service';
import { organizationalAuthorizationEngine } from '../modules/auth/services/organizational-authorization.engine';
import bcrypt from 'bcrypt';

async function testGuruProfile() {
  console.log('----------------------------------------------------');
  console.log('🔍 TEST SCRIPT: Verifikasi Data Profil & Jabatan Guru');
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
  console.log(`   - User ID  : ${user.id}`);
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
    { key: 'pangkat_golongan', label: 'Pangkat / Golongan' },
    { key: 'tmt_guru', label: 'TMT Guru' },
    { key: 'jenis_ptk', label: 'Jenis PTK' },
    { key: 'max_jp', label: 'Kapasitas JP Mengajar' },
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
  console.log('🏛️ DETAIL DAFTAR JABATAN & POSISI STRUKTURAL PENGGUNA:');
  console.log('----------------------------------------------------');

  // Query langsung tabel OrganizationalAssignment
  const directAssignments = await prisma.organizationalAssignment.findMany({
    where: { user_id: user.id, tenant_id: user.tenant_id },
    include: {
      Position: true,
      Kelas: true,
      Unit: true,
    },
  });

  console.log(`📌 Jumlah Organizational Assignment Terdaftar: ${directAssignments.length}`);
  directAssignments.forEach((assign, idx) => {
    console.log(`\n  --- Jabatan #${idx + 1} ---`);
    console.log(`   - ID Position  : ${assign.position_id}`);
    console.log(`   - Kode Posisi  : ${assign.Position?.code}`);
    console.log(`   - Nama Posisi  : ${assign.Position?.name}`);
    console.log(`   - Scope Type   : ${assign.Position?.scope_type}`);
    console.log(`   - Status Aktif : ${assign.is_active ? '✅ AKTIFF' : '❌ NON-AKTIF'}`);
    console.log(`   - Rombel Kelas : ${assign.Kelas ? `${assign.Kelas.nama_kelas} (ID: ${assign.Kelas.id})` : 'Bukan Wali Kelas (None)'}`);
    console.log(`   - Unit/Jurusan : ${assign.Unit ? `${assign.Unit.nama} (ID: ${assign.Unit.id})` : 'None'}`);
  });

  // Resolve via organizationalAuthorizationEngine
  const orgCtx: any = await organizationalAuthorizationEngine.resolveOrganizationalContext(user.id);
  console.log('\n----------------------------------------------------');
  console.log('⚡ RESOLUSI JABATAN VIA ORGANIZATIONAL AUTHORIZATION ENGINE:');
  console.log('----------------------------------------------------');
  console.log(`   - Resolved Position Codes : ${JSON.stringify(orgCtx.positions?.map((p: any) => p.code))}`);
  console.log(`   - Full Organizational Context : ${JSON.stringify(orgCtx, null, 2)}`);

  console.log('\n----------------------------------------------------');
  console.log(`📊 RINGKASAN HASIL TEST:`);
  console.log(`   - Total Field Diperiksa : ${requiredFields.length}`);
  console.log(`   - Field Terisi (Populated): ${populatedCount}`);
  console.log(`   - Field Kosong/Null       : ${missingCount}`);
  console.log('----------------------------------------------------');

  if (guruMe) {
    console.log('\n🎉 KESIMPULAN: Data Profil & Jabatan Pengguna Berhasil Diperiksa Secara Lengkap!');
  }

  await prisma.$disconnect();
}

testGuruProfile().catch((err) => {
  console.error('❌ Error executing test script:', err);
  prisma.$disconnect();
  process.exit(1);
});
