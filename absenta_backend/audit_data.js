const axios = require('axios');

async function testBackendData() {
  const baseURL = 'http://localhost:3001/api';
  
  console.log('--- STARTING BACKEND DATA AUDIT ---');
  
  try {
    // 1. Login
    console.log('Step 1: Logging in...');
    const loginRes = await axios.post(`${baseURL}/auth/login`, {
      email: 'neple@gmail.com',
      password: 'admin1234'
    });
    
    const token = loginRes.data.data.token;
    console.log('Login Success! Token acquired.');

    // 2. Fetch Tree Data
    console.log('\nStep 2: Fetching Organizational Tree...');
    const treeRes = await axios.get(`${baseURL}/academic/struktur-organisasi/tree`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // 3. Analyze Group 2 (Kaprog, etc)
    const data = treeRes.data.data;
    const kaprogNodes = data['KAPROG'] || [];
    
    console.log(`\nFound ${kaprogNodes.length} KAPROG nodes.`);
    
    kaprogNodes.forEach((node, index) => {
      console.log(`\n[Node ${index + 1}: ${node.nama}]`);
      console.log(`- Scope: ${node.scope}`);
      console.log(`- Unit ID: ${node.unit_id || 'NULL'}`);
      
      const members = node.members || [];
      console.log(`- Members (${members.length}):`);
      
      members.forEach((m, mIndex) => {
        console.log(`  [Member ${mIndex + 1}: ${m.name}]`);
        console.log(`    * unit_id: ${m.unit_id}`);
        console.log(`    * unit_kode: ${m.unit_kode} <--- INI YANG KITA CARI`);
      });
    });

    console.log('\n--- AUDIT COMPLETE ---');
  } catch (error) {
    console.error('\nERROR DURING AUDIT:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
}

testBackendData();
