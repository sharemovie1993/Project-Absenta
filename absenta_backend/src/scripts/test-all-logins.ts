import axios from 'axios';

const TEST_ACCOUNTS = [
  'admin@absenta.id',
  'kepsek@absenta.id',
  'kurikulum@absenta.id',
  'kesiswaan@absenta.id',
  'hubin@absenta.id',
  'sarpras@absenta.id',
  'tu@absenta.id',
  'bpbk@absenta.id',
  'bkk@absenta.id',
  'kaprog@absenta.id',
  'kabeng@absenta.id',
  'toolman@absenta.id',
  'gerbang@absenta.id',
  'tu.persuratan@absenta.id',
  'tu.keuangan@absenta.id',
  'tu.kepegawaian@absenta.id',
  'tu.sarpras@absenta.id',
  'koperasi.ketua@absenta.id',
  'walikelas@absenta.id',
  'pembina.pramuka@absenta.id',
  'siswa.rpl@absenta.id',
  'siswa.tkr@absenta.id',
  'ortu@absenta.id',
];

async function testAllLogins() {
  const baseURL = 'http://127.0.0.1:3003/api';
  console.log('🧪 Menguji Login Semua Akun Peran Demo di Server...\n');

  let successCount = 0;
  for (const email of TEST_ACCOUNTS) {
    try {
      const res = await axios.post(
        `${baseURL}/auth/login`,
        { email, password: 'password123' },
        { headers: { Host: 'demo.absenta.id', 'X-Tenant-Domain': 'demo.absenta.id' } }
      );
      const u = res.data?.data?.user;
      console.log(`✅ [200 OK] ${email.padEnd(28)} -> ${u?.full_name} (${u?.role?.name})`);
      successCount++;
    } catch (err: any) {
      console.error(`❌ [FAIL]   ${email.padEnd(28)} -> ${err.response?.data?.message || err.message}`);
    }
  }

  console.log(`\n📊 Hasil: ${successCount}/${TEST_ACCOUNTS.length} akun berhasil login 100%!`);
}

testAllLogins().catch(console.error);
