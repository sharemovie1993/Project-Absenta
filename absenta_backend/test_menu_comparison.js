const axios = require('axios');

async function run() {
  const email = 'gina@gmail.com';
  const password = 'admin1234';
  const baseUrl = 'http://localhost:3001/api';

  console.log(`\n=== 🔐 Step 1: Login to Absenta API for ${email} ===`);
  let token, tenant_sub, user;
  try {
    const loginRes = await axios.post(`${baseUrl}/auth/login`, { email, password });
    if (!loginRes.data || !loginRes.data.success) {
      console.log('Login failed:', loginRes.data);
      return;
    }
    ({ token, tenant_sub, user } = loginRes.data.data);
    console.log('Login Success!');
    console.log('User Role:', user.role.name);
    console.log('User Positions:', user.position_codes);
  } catch (error) {
    console.error('Login Error:', error.response ? error.response.data : error.message);
    return;
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Sub': tenant_sub,
    'X-Skip-403-Redirect': 'true'
  };

  // 1. Get Sidebar Menu
  console.log(`\n=== 🗂️ Step 2: Get Menu Sidebar (Common for Web and Mobile) ===`);
  let sidebar = [];
  try {
    const menuRes = await axios.get(`${baseUrl}/menu/sidebar`, { headers });
    sidebar = menuRes.data.sidebar || [];
    console.log(`Retrieved ${sidebar.length} root menu items from /menu/sidebar.`);
  } catch (error) {
    console.error('Sidebar Error:', error.response ? error.response.data : error.message);
    return;
  }

  // 2. Fetch Billing Status using Web Endpoint
  console.log(`\n=== 💳 Step 3: Get Subscription for Web Platform (GET /me/subscription) ===`);
  let webFeatures = [];
  try {
    const subRes = await axios.get(`${baseUrl}/me/subscription`, { headers });
    webFeatures = subRes.data?.data?.features || [];
    console.log('Web Subscription Features:', webFeatures);
  } catch (error) {
    console.error('Web Subscription Error:', error.response ? error.response.data : error.message);
  }

  // 3. Fetch Billing Status using Mobile Endpoint (Current/Before Fix)
  console.log(`\n=== 💳 Step 4: Get Subscription for Mobile Platform (GET /billing/subscription/status - BEFORE FIX) ===`);
  let mobileFeaturesBefore = null;
  try {
    const subRes = await axios.get(`${baseUrl}/billing/subscription/status`, { headers });
    mobileFeaturesBefore = subRes.data?.data?.features || [];
    console.log('Mobile Subscription Features (Before):', mobileFeaturesBefore);
  } catch (error) {
    console.log(`Mobile Subscription Error (Expected 404): ${error.response ? error.response.status : error.message}`);
    console.log('=> Result: 404 causes Android app to fall back to OFFLINE/MOCK mode (All features unlocked).');
  }

  // --- COMPARE WEB vs MOBILE MENU ---
  console.log(`\n=============================================================`);
  console.log(`📊 MENU COMPARISON AND GATING STATUS FOR ${email.toUpperCase()}`);
  console.log(`=============================================================`);

  const printComparisonRow = (name, parentName = '') => {
    const moduleName = parentName || name;
    
    // Web gating logic:
    // Sidebar menu returned has 'locked' field, OR we check if features list contains the module.
    // Let's check if the node is locked in sidebar response.
    const sidebarNode = findNodeByName(sidebar, name);
    const isLockedInSidebar = sidebarNode ? sidebarNode.locked : false;
    
    // Web Status
    const webStatus = isLockedInSidebar ? '🔒 LOCKED (Premium Locked)' : '✅ UNLOCKED';
    
    // Mobile Status Before Fix:
    // If endpoint fails (404), features list is empty/null, app defaults to unlocked (fallback safety).
    const mobileStatusBefore = '✅ UNLOCKED (Fallback Safety Mode)';
    
    // Mobile Status After Fix:
    // Gating check: if features list contains the module, it's unlocked, otherwise locked.
    const moduleKey = moduleName.toUpperCase();
    const isGatedInAndroid = ['KOPERASI', 'ABSENSI', 'SARPRAS', 'HUBIN'].includes(moduleKey);
    const isLockedMobileAfter = isGatedInAndroid && webFeatures.length > 0 && !webFeatures.includes(moduleKey);
    const mobileStatusAfter = isLockedMobileAfter ? '🔒 LOCKED (Premium Locked)' : '✅ UNLOCKED';

    console.log(`Module/Tab: ${name}`);
    console.log(`  - Web App:       ${webStatus}`);
    console.log(`  - Mobile (Before): ${mobileStatusBefore}`);
    console.log(`  - Mobile (After):  ${mobileStatusAfter}`);
    console.log('');
  };

  const findNodeByName = (nodes, name) => {
    for (const n of nodes) {
      if (n.name.trim().toUpperCase() === name.trim().toUpperCase()) return n;
      if (n.children) {
        const found = findNodeByName(n.children, name);
        if (found) return found;
      }
    }
    return null;
  };

  printComparisonRow('AKADEMIK');
  printComparisonRow('ABSENSI');
  printComparisonRow('HUBIN');
  printComparisonRow('KOPERASI');
}

run();
