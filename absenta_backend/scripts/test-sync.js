
const axios = require('axios');

const BASE_URL = 'http://10.10.10.250:3001/api';
const TENANT_DOMAIN = 'neple'; // Berdasarkan domain neple
const GURU_EMAIL = 'ai@gmail.com';
const GURU_PASS = 'admin1234';
const KURI_EMAIL = 'trisna@gmail.com';
const KURI_PASS = 'admin1234';

async function testSync() {
    try {
        console.log('--- MENGUJI SINKRONISASI DATA HULU KE HILIR (TENANT: SMK N 1 PLERED) ---');

        const commonHeaders = {
            'Host': `${TENANT_DOMAIN}.localhost`,
            'Origin': `http://${TENANT_DOMAIN}.localhost:5173`
        };

        // 1. Login Guru
        console.log('\n[1] Login sebagai Guru (ai@gmail.com)...');
        const guruLogin = await axios.post(`${BASE_URL}/auth/login`, {
            email: GURU_EMAIL,
            password: GURU_PASS
        }, { headers: commonHeaders });
        
        const guruToken = guruLogin.data.data.token;
        const guruHeaders = { ...commonHeaders, Authorization: `Bearer ${guruToken}` };

        // 2. Ambil Timeline Guru
        console.log('[2] Mengambil Timeline Guru (Jadwal/My)...');
        const today = new Date().toISOString().split('T')[0];
        const guruTimeline = await axios.get(`${BASE_URL}/attendance/jadwal-template/my?tanggal=${today}`, { headers: guruHeaders });
        
        const sessions = guruTimeline.data.data;
        console.log(`    Ditemukan ${sessions.length} sesi untuk Guru.`);
        
        sessions.forEach((s, i) => {
            console.log(`    Sesi ${i+1}: ${s.kegiatan} | Status: ${s.attendance_status} | Finished: ${s.is_finished} | Live: ${s.is_live}`);
        });

        // 3. Login Kurikulum
        console.log('\n[3] Login sebagai Kurikulum (trisna@gmail.com)...');
        const kuriLogin = await axios.post(`${BASE_URL}/auth/login`, {
            email: KURI_EMAIL,
            password: KURI_PASS
        }, { headers: commonHeaders });
        const kuriToken = kuriLogin.data.data.token;
        const kuriHeaders = { ...commonHeaders, Authorization: `Bearer ${kuriToken}` };

        // 4. Ambil Monitoring Global
        console.log('[4] Mengambil Monitoring Global Kurikulum...');
        const globalMonitoring = await axios.get(`${BASE_URL}/dashboard/kurikulum/monitoring-global?tanggal=${today}`, { headers: kuriHeaders });
        const stats = globalMonitoring.data.data.sessionStats;

        console.log(`    Hasil Analitik Global Kurikulum:`, stats);

    } catch (error) {
        console.error('ERROR saat pengujian:', error.response?.data || error.message);
    }
}

testSync();
