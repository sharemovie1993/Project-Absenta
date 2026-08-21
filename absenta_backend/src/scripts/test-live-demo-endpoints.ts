import axios from 'axios';

async function testLiveDemo() {
  const baseURL = 'http://127.0.0.1:3003/api';
  console.log('🧪 [LIVE TEST] Menguji Login dan Pemanggilan Endpoint Demo di Server...');

  try {
    // 1. Test Login sebagai Kepala Sekolah Demo
    const loginRes = await axios.post(
      `${baseURL}/auth/login`,
      {
        email: 'kepsek@absenta.id',
        password: 'password123'
      },
      {
        headers: {
          Host: 'demo.absenta.id',
          'X-Tenant-Domain': 'demo.absenta.id'
        }
      }
    );

    console.log('✅ Login Response Status:', loginRes.status);
    console.log('   User Name:', loginRes.data.data?.user?.full_name);
    console.log('   User Tenant ID:', loginRes.data.data?.user?.tenant_id);
    console.log('   User Role:', loginRes.data.data?.user?.role?.name);

    const token = loginRes.data.data?.token;
    if (!token) {
      console.error('❌ Tidak menerima token JWT!');
      return;
    }

    const authHeaders = {
      Authorization: `Bearer ${token}`,
      Host: 'demo.absenta.id',
      'X-Tenant-Domain': 'demo.absenta.id'
    };

    // 2. Daftar Endpoint yang Akan Diuji
    const endpoints = [
      { name: 'Profile Me', url: '/auth/me' },
      { name: 'Struktur Organisasi (Tree)', url: '/academic/struktur-organisasi/tree' },
      { name: 'Struktur Organisasi (List)', url: '/academic/struktur-organisasi' },
      { name: 'Master Guru', url: '/academic/guru?page=1&limit=10' },
      { name: 'Master Siswa', url: '/academic/siswa?page=1&limit=10' },
      { name: 'Master Kelas', url: '/academic/kelas' },
      { name: 'Master Jurusan', url: '/academic/jurusan' },
      { name: 'Tahun Pelajaran', url: '/academic/tahun-pelajaran' },
      { name: 'Jenis Kegiatan / Eskul', url: '/academic/jenis-kegiatan' },
      { name: 'Dashboard Overview', url: '/academic/dashboard/overview' },
    ];

    for (const ep of endpoints) {
      try {
        const res = await axios.get(`${baseURL}${ep.url}`, { headers: authHeaders });
        const dataCount = Array.isArray(res.data?.data) 
          ? `${res.data.data.length} items` 
          : typeof res.data?.data === 'object' && res.data?.data !== null
          ? `${Object.keys(res.data.data).length} keys`
          : 'OK';
        console.log(`✅ [${res.status}] ${ep.name.padEnd(30)} -> ${dataCount}`);
      } catch (err: any) {
        console.error(`❌ [${err.response?.status || 'ERR'}] ${ep.name.padEnd(30)} -> ${err.response?.data?.message || err.message}`);
      }
    }

  } catch (err: any) {
    console.error('❌ Gagal Login Demo:', err.response?.data || err.message);
  }
}

testLiveDemo().catch(console.error);
