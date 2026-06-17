const axios = require('axios');

async function run() {
  const email = 'gina@gmail.com';
  const password = 'admin1234';
  const baseUrl = 'http://localhost:3001/api';

  console.log(`\n=== 🔐 Step 1: Login to Absenta API for ${email} ===`);
  try {
    const loginRes = await axios.post(`${baseUrl}/auth/login`, {
      email,
      password
    });
    
    if (!loginRes.data || !loginRes.data.success) {
      console.log('Login failed:', loginRes.data);
      return;
    }

    const { token, tenant_sub, user } = loginRes.data.data;
    console.log('Login Success!');
    console.log('Token (truncated):', token.substring(0, 30) + '...');
    console.log('Tenant Sub:', tenant_sub);
    console.log('User Role:', user.role.name);
    console.log('User Positions:', user.position_codes);
    console.log('User Full Name:', user.full_name);

    const headers = {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Sub': tenant_sub,
      'X-Skip-403-Redirect': 'true'
    };

    console.log(`\n=== 🗂️ Step 2: Get Menu Sidebar for ${email} ===`);
    const menuRes = await axios.get(`${baseUrl}/menu/sidebar`, { headers });
    
    const sidebar = menuRes.data.sidebar || [];
    console.log(`Sidebar menu returned by backend (${sidebar.length} root items):`);
    
    const printTree = (nodes, depth = 0) => {
      nodes.forEach(n => {
        console.log(`${'  '.repeat(depth)}- ${n.name} (locked: ${n.locked}, feature_state: ${n.feature_state}, path: ${n.path})`);
        if (n.children && n.children.length > 0) {
          printTree(n.children, depth + 1);
        }
      });
    };
    printTree(sidebar);

    console.log(`\n=== 💳 Step 3: Get me/subscription for ${email} ===`);
    try {
      const subRes1 = await axios.get(`${baseUrl}/me/subscription`, { headers });
      console.log('me/subscription Response data:');
      console.log(JSON.stringify(subRes1.data, null, 2));
    } catch (err) {
      console.log('Error me/subscription:', err.response ? err.response.data : err.message);
    }

    console.log(`\n=== 💳 Step 4: Get billing/my-subscription for ${email} ===`);
    try {
      const subRes2 = await axios.get(`${baseUrl}/billing/my-subscription`, { headers });
      console.log('billing/my-subscription Response data:');
      console.log(JSON.stringify(subRes2.data, null, 2));
    } catch (err) {
      console.log('Error billing/my-subscription:', err.response ? err.response.data : err.message);
    }

  } catch (error) {
    console.error('Error during API test:', error.response ? error.response.data : error.message);
  }
}

run();

