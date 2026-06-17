import axios from 'axios';

const BASE_URL = 'http://localhost:3001/api';

async function testStats() {
  try {
    console.log('--- 1. Login as Kurikulum ---');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'trisna@gmail.com',
      password: 'admin1234'
    });

    const token = loginRes.data.data.token;
    const headers = { 'Authorization': `Bearer ${token}` };
    const today = '2026-05-22';

    console.log(`\n--- 2. Fetch Daily Teacher Stats for ${today} ---`);
    try {
      const teacherRes = await axios.get(`${BASE_URL}/dashboard/statistik/guru/${today}`, { headers });
      console.log('Teacher Stats Status:', teacherRes.status);
      console.log('Teacher Stats Data:', JSON.stringify(teacherRes.data, null, 2));
    } catch (e: any) {
      console.error('Teacher Stats Error:', e.response?.data || e.message);
    }

    console.log(`\n--- 3. Fetch Daily Class Stats for ${today} ---`);
    try {
      const classRes = await axios.get(`${BASE_URL}/dashboard/statistik/kelas/${today}`, { headers });
      console.log('Class Stats Status:', classRes.status);
      console.log('Class Stats Data:', JSON.stringify(classRes.data, null, 2));
    } catch (e: any) {
      console.error('Class Stats Error:', e.response?.data || e.message);
    }

  } catch (error: any) {
    console.error('Global Error:', error.response?.data || error.message);
  }
}

testStats();
