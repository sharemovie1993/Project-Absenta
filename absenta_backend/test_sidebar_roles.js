const axios = require('axios');

async function testSidebarForRole(identifier, password, label) {
  try {
    console.log(`\n=== TESTING LOGIN & SIDEBAR FOR ${label} (${identifier}) ===`);
    const loginRes = await axios.post('http://10.10.10.250:3004/api/auth/login', {
      email: identifier,
      identifier: identifier,
      password: password
    });

    const token = loginRes.data?.data?.token;
    const tenantId = loginRes.data?.data?.user?.tenant_id;
    const roleName = loginRes.data?.data?.user?.role?.name;
    const caps = loginRes.data?.data?.user?.capabilities || [];

    console.log(`Role Name: ${roleName}`);
    console.log(`Capabilities Count: ${caps.length}`);

    const sidebarRes = await axios.get('http://10.10.10.250:3004/api/menu/sidebar', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId
      }
    });

    console.log(`Sidebar Response Status: ${sidebarRes.status}`);
    console.log('RAW SIDEBAR DATA:', JSON.stringify(sidebarRes.data, null, 2).substring(0, 800));
  } catch (err) {
    console.error(`ERROR FOR ${label}:`, err.response?.status, err.response?.data || err.message);
  }
}

async function runAll() {
  await testSidebarForRole('2526100001', '11223344', 'SISWA');
  await testSidebarForRole('ajeng@gmail.com', 'admin1234', 'PEJABAT BPBK / GURU');
}

runAll();
