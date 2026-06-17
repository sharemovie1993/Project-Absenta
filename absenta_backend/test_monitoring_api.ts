import axios from 'axios';

const BASE_URL = 'http://localhost:3001/api';

async function testMonitoring() {
  try {
    console.log('--- 1. Login as Kurikulum ---');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'trisna@gmail.com',
      password: 'admin1234'
    });

    if (!loginRes.data.success) {
      console.error('Login failed:', loginRes.data.message);
      return;
    }

    const token = loginRes.data.data.token;
    console.log('Login success. Token obtained.');

    const headers = {
      'Authorization': `Bearer ${token}`
    };

    console.log('\n--- 2. Fetch Monitoring Global Stats ---');
    const today = new Date().toISOString().split('T')[0];
    const monitoringRes = await axios.get(`${BASE_URL}/dashboard/kurikulum/monitoring-global`, {
      headers,
      params: { tanggal: today }
    });

    console.log('Response Status:', monitoringRes.status);
    console.log('Response Data:', JSON.stringify(monitoringRes.data, null, 2));

    if (monitoringRes.data.success) {
      const stats = monitoringRes.data.data;
      console.log('\n--- Column/Field Analysis ---');
      console.log('Health Score:', stats.healthScore);
      console.log('Active Classes:', stats.activeClasses);
      console.log('Total Classes:', stats.totalClasses);
      console.log('Teacher Present:', stats.teacherPresent);
      console.log('Total Teachers:', stats.totalTeachers);
      console.log('Supervision Count:', stats.supervisionCount);
      console.log('Session Stats Object:', stats.sessionStats ? 'PRESENT' : 'MISSING');
      
      if (stats.sessionStats) {
        console.log('Detailed Session Stats:', JSON.stringify(stats.sessionStats, null, 2));
      }
    }

    console.log('\n--- 3. Fetch Session List (Raw) ---');
    const sessionRes = await axios.get(`${BASE_URL}/attendance/sesi-absensi`, {
      headers,
      params: { tanggal: today, summary: true }
    });

    console.log('Session Count:', sessionRes.data.data?.length || 0);
    if (sessionRes.data.data?.length > 0) {
      console.log('Sample Session Data (First Item):', JSON.stringify(sessionRes.data.data[0], null, 2));
    } else {
      console.log('No sessions found for today in database.');
    }

  } catch (error: any) {
    if (error.response) {
      console.error('Error Response Data:', error.response.data);
      console.error('Error Status:', error.response.status);
    } else {
      console.error('Error Message:', error.message);
      console.error('Stack:', error.stack);
    }
  }
}

testMonitoring();
