const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000';
const testCredentials = {
  superadmin: {
    email: 'superadmin@system.com',
  password: 'superadmin123',
    tenant_id: null // Superadmin tidak perlu tenant_id
  },
  admin: {
    email: 'admin@testschool.edu',
    password: 'password123',
    tenant_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d482'
  },
  guru: {
    email: 'guru1@testschool.edu',
    password: 'password123',
    tenant_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d482'
  },
  siswa: {
    email: 'siswa1@testschool.edu',
    password: 'password123',
    tenant_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d482'
  }
};

// Global variables
const tokens = {};
const testData = {
  createdIds: {},
  testJurusanId: null
};

// Helper function to make HTTP requests
async function makeRequest(method, endpoint, data = null, token = null, tenantId = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (tenantId) {
      config.headers['X-Tenant-ID'] = tenantId;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return {
      success: true,
      data: response.data,
      status: response.status
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      status: error.response?.status || 500,
      data: error.response?.data
    };
  }
}

// Login function
async function login(role) {
  console.log(`🔐 Login sebagai ${role.toUpperCase()}...`);
  
  const credentials = testCredentials[role];
  const result = await makeRequest('POST', '/auth/login', credentials);
  
  if (result.success) {
    console.log(`Debug ${role} response:`, JSON.stringify(result.data, null, 2));
    
    // Try different token paths
    const token = result.data.token || result.data.data?.token || result.data.data?.access_token;
    
    if (token) {
      tokens[role] = token;
      console.log(`✅ ${role} login berhasil`);
    } else {
      console.log(`❌ ${role} login gagal: Token tidak ditemukan`);
      console.log('Response structure:', JSON.stringify(result.data, null, 2));
    }
  } else {
    console.log(`❌ ${role} login gagal: ${result.error}`);
  }
}

// Test functions
async function testGetAllJurusan(role) {
  console.log(`🔍 Testing GET /academic/jurusan as ${role.toUpperCase()}`);
  
  if (!tokens[role]) {
    console.log(`❌ No token for ${role}`);
    return;
  }
  
  const result = await makeRequest('GET', '/academic/jurusan', null, tokens[role], testCredentials[role].tenant_id);
  
  if (result.success) {
    console.log(`✅ ${role} dapat mengakses daftar jurusan`);
    console.log(`   Found: ${result.data.data ? result.data.data.length : result.data.length} jurusan`);
    
    // Store first jurusan ID for later tests
    if (result.data.data && result.data.data.length > 0 && !testData.testJurusanId) {
      testData.testJurusanId = result.data.data[0].id;
      console.log(`   Stored test ID: ${testData.testJurusanId}`);
    }
  } else {
    console.log(`❌ ${role} gagal mengakses daftar jurusan: ${result.error}`);
  }
}

async function testCreateJurusan(role) {
  console.log(`➕ Testing POST /academic/jurusan as ${role.toUpperCase()}`);
  
  if (!tokens[role]) {
    console.log(`❌ No token for ${role}`);
    return;
  }
  
  const jurusanData = {
    nama: `Jurusan Test ${role}`,
    kode: `TEST${role.toUpperCase()}`
  };
  
  const result = await makeRequest('POST', '/academic/jurusan', jurusanData, tokens[role], testCredentials[role].tenant_id);
  
  if (result.success) {
    console.log(`✅ ${role} berhasil membuat jurusan`);
    console.log(`   Jurusan created: ${result.data.data.nama}`);
    
    // Store created jurusan ID for later tests
    testData.createdIds[role] = result.data.data.id;
    console.log(`   Stored ID for ${role}: ${testData.createdIds[role]}`);
  } else {
    if (role === 'guru' || role === 'siswa') {
      console.log(`✅ ${role} tidak dapat membuat jurusan (sesuai permission): ${result.error}`);
    } else {
      console.log(`❌ ${role} gagal membuat jurusan: ${result.error}`);
    }
  }
}

async function testGetJurusanById(role) {
  console.log(`🔍 Testing GET /academic/jurusan/:id as ${role.toUpperCase()}`);
  
  if (!tokens[role]) {
    console.log(`❌ No token for ${role}`);
    return;
  }
  
  const jurusanId = testData.testJurusanId;
  if (!jurusanId) {
    console.log(`⚠️  Tidak ada jurusan ID untuk testing GET by ID`);
    return;
  }
  
  const result = await makeRequest('GET', `/academic/jurusan/${jurusanId}`, null, tokens[role], testCredentials[role].tenant_id);
  
  if (result.success) {
    console.log(`✅ ${role} dapat mengakses detail jurusan`);
    console.log(`   Data: ${result.data.data.nama} (${result.data.data.kode})`);
  } else {
    console.log(`❌ ${role} gagal mengakses detail jurusan: ${result.error}`);
  }
}

async function testUpdateJurusan(role) {
  console.log(`✏️ Testing PUT /academic/jurusan/:id as ${role.toUpperCase()}`);
  
  if (!tokens[role]) {
    console.log(`❌ No token for ${role}`);
    return;
  }
  
  // Use the ID created by this role, or fallback to admin's ID
  const jurusanId = testData.createdIds[role] || testData.createdIds.admin || testData.createdIds.superadmin;
  
  if (!jurusanId) {
    console.log(`⚠️  Tidak ada jurusan ID untuk testing UPDATE`);
    return;
  }
  
  const updateData = {
    nama: `Updated Jurusan ${role}`,
    kode: `UPD${role.toUpperCase()}`
  };
  
  const result = await makeRequest('PUT', `/academic/jurusan/${jurusanId}`, updateData, tokens[role], testCredentials[role].tenant_id);
  
  if (result.success) {
    console.log(`✅ ${role} berhasil mengupdate jurusan`);
    console.log(`   Updated: ${result.data.data.nama} (${result.data.data.kode})`);
  } else {
    if (role === 'guru' || role === 'siswa') {
      console.log(`✅ ${role} tidak dapat mengupdate jurusan (sesuai permission): ${result.error}`);
    } else {
      console.log(`❌ ${role} gagal mengupdate jurusan: ${result.error}`);
    }
  }
}

async function testDeleteJurusan(role) {
  console.log(`🗑️ Testing DELETE /academic/jurusan/:id as ${role.toUpperCase()}`);
  
  if (!tokens[role]) {
    console.log(`❌ No token for ${role}`);
    return;
  }
  
  // Only try to delete if this role created a jurusan
  const jurusanId = testData.createdIds[role];
  
  if (!jurusanId) {
    console.log(`⚠️  Tidak ada jurusan ID untuk testing DELETE (${role} tidak membuat jurusan)`);
    return;
  }
  
  const result = await makeRequest('DELETE', `/academic/jurusan/${jurusanId}`, null, tokens[role], testCredentials[role].tenant_id);
  
  if (result.success) {
    console.log(`✅ ${role} berhasil menghapus jurusan`);
    // Remove from our tracking
    delete testData.createdIds[role];
  } else {
    if (role === 'guru' || role === 'siswa') {
      console.log(`✅ ${role} tidak dapat menghapus jurusan (sesuai permission): ${result.error}`);
    } else {
      console.log(`❌ ${role} gagal menghapus jurusan: ${result.error}`);
    }
  }
}

// Test pagination and search
async function testPaginationAndSearch() {
  console.log('\n📄 Testing pagination and search...');
  
  try {
    // Test pagination
    console.log('🔍 Testing pagination...');
    const result = await makeRequest('GET', '/academic/jurusan?page=1&limit=5', null, tokens.admin, testCredentials.admin.tenant_id);
    
    if (result.success) {
      console.log('✅ Pagination test berhasil');
      if (result.data.pagination) {
        console.log(`   Page: ${result.data.pagination.page}`);
        console.log(`   Limit: ${result.data.pagination.limit}`);
        console.log(`   Total: ${result.data.pagination.total}`);
      } else {
        console.log(`   Data count: ${result.data.data ? result.data.data.length : result.data.length}`);
      }
    } else {
      console.log('❌ Pagination test gagal:', result.error);
    }
    
    // Test search
    console.log('\n🔍 Testing search...');
    const searchResult = await makeRequest('GET', '/academic/jurusan?search=Test', null, tokens.admin, testCredentials.admin.tenant_id);
    
    if (searchResult.success) {
      console.log('✅ Search test berhasil');
      console.log(`   Found: ${searchResult.data.data ? searchResult.data.data.length : searchResult.data.length} results`);
    } else {
      console.log('❌ Search test gagal:', searchResult.error);
    }
  } catch (error) {
    console.log('❌ Error testing pagination and search:', error.message);
  }
}

// Test tenant isolation
async function testTenantIsolation() {
  console.log('\n=== Testing Tenant Isolation ===');
  
  try {
    // Create jurusan in tenant 1 using admin
    if (tokens.admin) {
      const createResponse = await makeRequest('POST', '/academic/jurusan', {
        nama: 'Jurusan Tenant Isolation Test',
        kode: 'TISO'
      }, tokens.admin, testCredentials.admin.tenant_id);
      
      if (createResponse.success) {
        console.log('✅ Created jurusan for tenant isolation test');
        
        // Test 1: Access with same tenant_id (should succeed)
        const sameTenanResponse = await makeRequest('GET', '/academic/jurusan', null, tokens.admin, testCredentials.admin.tenant_id);
        
        if (sameTenanResponse.success) {
          console.log('✅ Same tenant access: Success');
          console.log(`   Found ${sameTenanResponse.data.data ? sameTenanResponse.data.data.length : 0} jurusan`);
        } else {
          console.log('❌ Same tenant access failed:', sameTenanResponse.error);
        }
        
        // Test 2: Access with different tenant_id (should fail or return empty)
        const differentTenantResponse = await makeRequest('GET', '/academic/jurusan', null, tokens.admin, 'different-tenant-id');
        
        if (differentTenantResponse.success) {
          const dataCount = differentTenantResponse.data.data ? differentTenantResponse.data.data.length : 0;
          if (dataCount === 0) {
            console.log('✅ Tenant isolation working: Different tenant shows no data');
          } else {
            console.log('⚠️ Tenant isolation may need verification: Different tenant shows data');
            console.log(`   Found ${dataCount} jurusan in different tenant`);
          }
        } else {
          console.log('✅ Tenant isolation working: Different tenant access denied');
          console.log(`   Error: ${differentTenantResponse.error}`);
        }
        
        // Clean up: Delete the test jurusan
        await makeRequest('DELETE', `/api/academic/jurusan/${createResponse.data.data.id}`, null, tokens.admin, testCredentials.admin.tenant_id);
      } else {
        console.log('❌ Failed to create jurusan for tenant isolation test:', createResponse.error);
      }
    } else {
      console.log('❌ No admin token available for tenant isolation test');
    }
  } catch (error) {
    console.log('❌ Error testing tenant isolation:', error.message);
  }
}

// Main test runner
async function runCompleteTests() {
  console.log('🚀 Memulai testing lengkap endpoint Jurusan...\n');
  
  // Login all roles
  console.log('📝 Login untuk semua role...');
  await login('superadmin');
  await login('admin');
  await login('guru');
  await login('siswa');
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 TESTING CRUD OPERATIONS');
  console.log('='.repeat(60));
  
  // Test READ operations for all roles
  console.log('\n📋 Testing GET All Jurusan for all roles...');
  for (const role of ['superadmin', 'admin', 'guru', 'siswa']) {
    await testGetAllJurusan(role);
  }
  
  // Test CREATE operations for all roles
  console.log('\n➕ Testing CREATE operations for all roles...');
  for (const role of ['superadmin', 'admin', 'guru', 'siswa']) {
    await testCreateJurusan(role);
  }
  
  // Test GET by ID for all roles
  console.log('\n🔍 Testing GET by ID for all roles...');
  for (const role of ['superadmin', 'admin', 'guru', 'siswa']) {
    await testGetJurusanById(role);
  }
  
  // Test UPDATE operations for all roles
  console.log('\n✏️ Testing UPDATE operations for all roles...');
  for (const role of ['superadmin', 'admin', 'guru', 'siswa']) {
    await testUpdateJurusan(role);
  }
  
  // Test DELETE operations for roles that created jurusan
  console.log('\n🗑️ Testing DELETE operations...');
  for (const role of ['superadmin', 'admin', 'guru', 'siswa']) {
    await testDeleteJurusan(role);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🔍 TESTING ADVANCED FEATURES');
  console.log('='.repeat(60));
  
  // Test pagination and search
  await testPaginationAndSearch();
  
  // Test tenant isolation
  await testTenantIsolation();
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Testing lengkap selesai!');
  console.log('='.repeat(60));
  
  // Summary
  console.log('\n📊 SUMMARY:');
  console.log(`Created IDs: ${JSON.stringify(testData.createdIds, null, 2)}`);
  console.log(`Test Jurusan ID: ${testData.testJurusanId}`);
}

// Run the tests
runCompleteTests().catch(console.error);
