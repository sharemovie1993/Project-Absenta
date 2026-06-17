/**
 * Script Testing untuk Modul Tenant Detail
 * Menguji semua endpoint yang telah dibuat untuk modul tenant-detail
 */

const axios = require('axios');

// Konfigurasi base URL
const BASE_URL = 'http://localhost:3000';
const SUPERADMIN_BASE_URL = `${BASE_URL}/superadmin/tenants`;

// Token superadmin (perlu diisi dengan token yang valid)
let authToken = '';

// ID tenant untuk testing (akan diambil dari endpoint tenants)
let testTenantId = '';

/**
 * Fungsi untuk login sebagai superadmin dan mendapatkan token
 */
async function loginAsSuperadmin() {
  try {
    console.log('🔐 Login sebagai superadmin...');
    
    const response = await axios.post(`${BASE_URL}/auth/login`, {
        email: 'superadmin@system.com', // Kredensial superadmin yang benar
        password: 'superadmin123' // Password superadmin yang benar
      });

    if (response.data.success) {
      authToken = response.data.data.token;
      console.log('✅ Login berhasil, token diperoleh');
      return true;
    } else {
      console.log('❌ Login gagal:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Error saat login:', error.response?.data?.message || error.message);
    return false;
  }
}

/**
 * Fungsi untuk mendapatkan daftar tenant dan mengambil ID tenant pertama
 */
async function getTenantId() {
  try {
    console.log('📋 Mengambil daftar tenant...');
    
    const response = await axios.get(`${BASE_URL}/tenants`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.data.success && response.data.data.length > 0) {
      testTenantId = response.data.data[0].id;
      console.log(`✅ Tenant ID untuk testing: ${testTenantId}`);
      return true;
    } else {
      console.log('❌ Tidak ada tenant yang ditemukan');
      return false;
    }
  } catch (error) {
    console.log('❌ Error saat mengambil tenant:', error.response?.data?.message || error.message);
    return false;
  }
}

/**
 * Test endpoint: GET /superadmin/tenants/:tenantId
 */
async function testGetTenantDetail() {
  try {
    console.log('\n📊 Testing GET /superadmin/tenants/:tenantId...');
    
    const response = await axios.get(`${SUPERADMIN_BASE_URL}/${testTenantId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.data.success) {
      console.log('✅ GET tenant detail berhasil');
      console.log('📄 Data tenant:', JSON.stringify(response.data.data, null, 2));
    } else {
      console.log('❌ GET tenant detail gagal:', response.data.message);
    }
  } catch (error) {
    console.log('❌ Error GET tenant detail:', error.response?.data?.message || error.message);
  }
}

/**
 * Test endpoint: GET /superadmin/tenants/:tenantId/metrics
 */
async function testGetTenantMetrics() {
  try {
    console.log('\n📈 Testing GET /superadmin/tenants/:tenantId/metrics...');
    
    const response = await axios.get(`${SUPERADMIN_BASE_URL}/${testTenantId}/metrics`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.data.success) {
      console.log('✅ GET tenant metrics berhasil');
      console.log('📊 Metrics:', JSON.stringify(response.data.data, null, 2));
    } else {
      console.log('❌ GET tenant metrics gagal:', response.data.message);
    }
  } catch (error) {
    console.log('❌ Error GET tenant metrics:', error.response?.data?.message || error.message);
  }
}

/**
 * Test endpoint: GET /superadmin/tenants/:tenantId/activities
 */
async function testGetRecentActivities() {
  try {
    console.log('\n📋 Testing GET /superadmin/tenants/:tenantId/activities...');
    
    const response = await axios.get(`${SUPERADMIN_BASE_URL}/${testTenantId}/activities`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      params: {
        page: 1,
        limit: 10
      }
    });

    if (response.data.success) {
      console.log('✅ GET recent activities berhasil');
      console.log('📝 Activities:', JSON.stringify(response.data.data, null, 2));
    } else {
      console.log('❌ GET recent activities gagal:', response.data.message);
    }
  } catch (error) {
    console.log('❌ Error GET recent activities:', error.response?.data?.message || error.message);
  }
}

/**
 * Test endpoint: GET /superadmin/tenants/:tenantId/user-statistics
 */
async function testGetUserStatistics() {
  try {
    console.log('\n👥 Testing GET /superadmin/tenants/:tenantId/user-statistics...');
    
    const response = await axios.get(`${SUPERADMIN_BASE_URL}/${testTenantId}/user-statistics`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.data.success) {
      console.log('✅ GET user statistics berhasil');
      console.log('📊 User Statistics:', JSON.stringify(response.data.data, null, 2));
    } else {
      console.log('❌ GET user statistics gagal:', response.data.message);
    }
  } catch (error) {
    console.log('❌ Error GET user statistics:', error.response?.data?.message || error.message);
  }
}

/**
 * Test endpoint: GET /superadmin/tenants/:tenantId/users
 */
async function testGetTenantUsers() {
  try {
    console.log('\n👤 Testing GET /superadmin/tenants/:tenantId/users...');
    
    const response = await axios.get(`${SUPERADMIN_BASE_URL}/${testTenantId}/users`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      params: {
        page: 1,
        limit: 10,
        search: ''
      }
    });

    if (response.data.success) {
      console.log('✅ GET tenant users berhasil');
      console.log('👥 Users:', JSON.stringify(response.data.data, null, 2));
      return response.data.data.users;
    } else {
      console.log('❌ GET tenant users gagal:', response.data.message);
      return [];
    }
  } catch (error) {
    console.log('❌ Error GET tenant users:', error.response?.data?.message || error.message);
    return [];
  }
}

/**
 * Test endpoint: POST /superadmin/tenants/:tenantId/users
 */
async function testCreateTenantUser() {
  try {
    console.log('\n➕ Testing POST /superadmin/tenants/:tenantId/users...');
    
    const userData = {
      name: 'Test User',
      email: `testuser${Date.now()}@example.com`,
      password: 'testpassword123',
      role: 'ADMIN'
    };

    const response = await axios.post(`${SUPERADMIN_BASE_URL}/${testTenantId}/users`, userData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      console.log('✅ POST create user berhasil');
      console.log('👤 New User:', JSON.stringify(response.data.data, null, 2));
      return response.data.data.id;
    } else {
      console.log('❌ POST create user gagal:', response.data.message);
      return null;
    }
  } catch (error) {
    console.log('❌ Error POST create user:', error.response?.data?.message || error.message);
    return null;
  }
}

/**
 * Test endpoint: PUT /superadmin/tenants/:tenantId/users/:userId
 */
async function testUpdateTenantUser(userId) {
  try {
    console.log('\n✏️ Testing PUT /superadmin/tenants/:tenantId/users/:userId...');
    
    const updateData = {
      name: 'Updated Test User',
      email: `updateduser${Date.now()}@example.com`
    };

    const response = await axios.put(`${SUPERADMIN_BASE_URL}/${testTenantId}/users/${userId}`, updateData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      console.log('✅ PUT update user berhasil');
      console.log('👤 Updated User:', JSON.stringify(response.data.data, null, 2));
    } else {
      console.log('❌ PUT update user gagal:', response.data.message);
    }
  } catch (error) {
    console.log('❌ Error PUT update user:', error.response?.data?.message || error.message);
  }
}

/**
 * Test endpoint: DELETE /superadmin/tenants/:tenantId/users/:userId
 */
async function testDeleteTenantUser(userId) {
  try {
    console.log('\n🗑️ Testing DELETE /superadmin/tenants/:tenantId/users/:userId...');
    
    const response = await axios.delete(`${SUPERADMIN_BASE_URL}/${testTenantId}/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.data.success) {
      console.log('✅ DELETE user berhasil');
      console.log('📝 Message:', response.data.message);
    } else {
      console.log('❌ DELETE user gagal:', response.data.message);
    }
  } catch (error) {
    console.log('❌ Error DELETE user:', error.response?.data?.message || error.message);
  }
}

/**
 * Fungsi utama untuk menjalankan semua test
 */
async function runAllTests() {
  console.log('🚀 Memulai testing endpoint Tenant Detail Module...\n');

  // 1. Login sebagai superadmin
  const loginSuccess = await loginAsSuperadmin();
  if (!loginSuccess) {
    console.log('❌ Testing dihentikan karena login gagal');
    return;
  }

  // 2. Dapatkan tenant ID untuk testing
  const tenantSuccess = await getTenantId();
  if (!tenantSuccess) {
    console.log('❌ Testing dihentikan karena tidak ada tenant');
    return;
  }

  // 3. Test semua endpoint detail tenant
  await testGetTenantDetail();
  await testGetTenantMetrics();
  await testGetRecentActivities();
  await testGetUserStatistics();

  // 4. Test endpoint manajemen user
  const users = await testGetTenantUsers();
  
  // 5. Test create user
  const newUserId = await testCreateTenantUser();
  
  if (newUserId) {
    // 6. Test update user
    await testUpdateTenantUser(newUserId);
    
    // 7. Test delete user
    await testDeleteTenantUser(newUserId);
  }

  console.log('\n🎉 Testing selesai!');
}

// Jalankan testing jika file ini dieksekusi langsung
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  runAllTests,
  loginAsSuperadmin,
  testGetTenantDetail,
  testGetTenantMetrics,
  testGetRecentActivities,
  testGetUserStatistics,
  testGetTenantUsers,
  testCreateTenantUser,
  testUpdateTenantUser,
  testDeleteTenantUser
};
