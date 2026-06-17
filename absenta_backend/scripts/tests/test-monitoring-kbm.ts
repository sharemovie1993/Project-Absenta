import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const TEST_EMAIL = process.env.TEST_EMAIL || 'kepsek@smkn1.sch.id';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'password123';

async function testMonitoringEndpoint() {
  console.log('--- Testing KBM Monitoring Endpoint ---');
  console.log(`URL: ${API_BASE_URL}`);
  
  try {
    // 1. Login
    console.log('Logging in...');
    const loginRes = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    if (!loginRes.data.success) {
      throw new Error(`Login failed: ${loginRes.data.message}`);
    }

    const token = loginRes.data.data.token;
    const tenantId = loginRes.data.data.user.tenant_id;
    console.log('Login successful.');

    const headers = {
      Authorization: `Bearer ${token}`,
      'X-Tenant-ID': tenantId
    };

    // 2. Test Sesi Absensi with Summary
    const today = new Date().toISOString().split('T')[0];
    console.log(`Fetching sessions for date: ${today} with summary=true...`);
    
    const sessionsRes = await axios.get(`${API_BASE_URL}/attendance/sesi-absensi`, {
      headers,
      params: {
        tanggal: today,
        summary: 'true'
      }
    });

    if (!sessionsRes.data.success) {
      throw new Error(`Fetch sessions failed: ${sessionsRes.data.message}`);
    }

    const sessions = sessionsRes.data.data;
    console.log(`Found ${sessions.length} sessions.`);

    if (sessions.length > 0) {
      const firstSession = sessions[0];
      console.log('\n--- Sample Session Data ---');
      console.log(`ID: ${firstSession.id}`);
      console.log(`Mapel: ${firstSession.Mapel?.nama_mapel}`);
      console.log(`Guru: ${firstSession.Guru?.nama_guru}`);
      console.log(`Kelas: ${firstSession.Kelas?.nama_kelas}`);
      console.log(`Jurusan: ${firstSession.Kelas?.Jurusan?.nama || 'N/A'}`);
      
      console.log('\n--- Monitoring Summary ---');
      console.log(`Hadir: ${firstSession._summary?.hadir}`);
      console.log(`Total Siswa: ${firstSession._summary?.total}`);
      console.log(`Teacher Status: ${firstSession._summary?.teacherStatus}`);
      
      // Validation checks
      if (firstSession._summary?.total === undefined) console.error('MISSING: _summary.total');
      if (firstSession._summary?.teacherStatus === undefined) console.error('MISSING: _summary.teacherStatus');
      if (!firstSession.Kelas?.Jurusan) console.error('MISSING: Kelas.Jurusan relation');
    } else {
      console.log('No sessions found for today. Try seeding some data or checking the date.');
    }

    console.log('\nTest completed successfully.');

  } catch (error: any) {
    console.error('Test failed!');
    if (error.response) {
      console.error('Response Error:', error.response.data);
    } else {
      console.error('Error Message:', error.message);
    }
    process.exit(1);
  }
}

testMonitoringEndpoint();