const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Test credentials (berdasarkan seed.ts)
const testCredentials = {
  superadmin: {
    email: 'superadmin@system.com',
  password: 'superadmin123',
    tenant_id: null
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

let tokens = {};
let createdJurusanId = null;

// Helper function to login and get token
async function login(role) {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, testCredentials[role]);
    
    // Berdasarkan debug, token ada di response.data.data.token
    tokens[role] = response.data.data.token;
    console.log(`✅ Login ${role} berhasil`);
    return tokens[role];
  } catch (error) {
    console.log(`❌ Login ${role} gagal:`, error.response?.data?.message || error.message);
    return null;
  }
}

// Helper function to make authenticated request
async function makeRequest(method, endpoint, data = null, token = null, tenantId = null) {
  try {
    const headers = {};
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    if (tenantId) {
      headers['X-Tenant-ID'] = tenantId;
    }
    
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message,
      status: error.response?.status
    };
  }
}

// Test functions
async function testGetAllJurusan(role) {
  console.log(`\n📋 Testing GET /academic/jurusan as ${role.toUpperCase()}`);
  
  try {
    const result = await makeRequest('GET', '/academic/jurusan', null, tokens[role], testCredentials[role].tenant_id);
    
    if (result.success) {
      console.log(`✅ ${role} dapat mengakses daftar jurusan`);
      console.log(`   Total jurusan: ${result.data.data ? result.data.data.length : result.data.length}`);
      
      // Store first jurusan ID for later tests
      if (result.data.data && result.data.data.length > 0) {
        global.testJurusanId = result.data.data[0].id;
        console.log(`   Stored test ID: ${global.testJurusanId}`);
      }
    } else {
      console.log(`❌ ${role} gagal mengakses daftar jurusan: ${result.error}`);
    }
  } catch (error) {
    console.log(`❌ Error testing GET all jurusan for ${role}:`, error.message);
  }
}

async function testCreateJurusan(role) {
  console.log(`\n➕ Testing POST /academic/jurusan as ${role.toUpperCase()}`);
  
  const newJurusan = {
    nama: `Jurusan Test ${role}`,
    kode: `TEST${role.toUpperCase()}`
  };
  
  try {
    const result = await makeRequest('POST', '/academic/jurusan', newJurusan, tokens[role], testCredentials[role].tenant_id);
    
    if (result.success) {
      console.log(`✅ ${role} berhasil membuat jurusan`);
      console.log(`   Jurusan created: ${result.data.data.nama}`);
      
      // Store created jurusan ID for later tests
      if (role === 'admin' || role === 'superadmin') {
        global.createdJurusanId = result.data.data.id;
        console.log(`   Stored ID for testing: ${global.createdJurusanId}`);
      }
    } else {
      if (role === 'guru' || role === 'siswa') {
        console.log(`✅ ${role} tidak dapat membuat jurusan (expected): ${result.error}`);
      } else {
        console.log(`❌ ${role} gagal membuat jurusan: ${result.error}`);
      }
    }
  } catch (error) {
    console.log(`❌ Error testing CREATE jurusan for ${role}:`, error.message);
  }
}

async function testGetJurusanById(role) {
  console.log(`\n🔍 Testing GET /academic/jurusan/:id as ${role.toUpperCase()}`);
  
  if (!global.testJurusanId) {
    console.log(`⚠️  Tidak ada jurusan ID untuk testing GET by ID`);
    return;
  }
  
  try {
    const result = await makeRequest('GET', `/academic/jurusan/${global.testJurusanId}`, null, tokens[role], testCredentials[role].tenant_id);
    
    if (result.success) {
      console.log(`✅ ${role} dapat mengakses detail jurusan`);
      console.log(`   Data: ${result.data.data.nama} (${result.data.data.kode})`);
    } else {
      console.log(`❌ ${role} gagal mengakses detail jurusan: ${result.error}`);
    }
  } catch (error) {
    console.log(`❌ Error testing GET jurusan by ID for ${role}:`, error.message);
  }
}

async function testUpdateJurusan(role) {
  console.log(`\n✏️ Testing PUT /academic/jurusan/:id as ${role.toUpperCase()}`);
  
  if (!global.createdJurusanId) {
    console.log(`⚠️  Tidak ada jurusan ID untuk testing UPDATE`);
    return;
  }
  
  const updateData = {
    nama: `Updated Jurusan ${role}`,
    kode: `UPD${role.toUpperCase()}`
  };
  
  try {
    const result = await makeRequest('PUT', `/academic/jurusan/${global.createdJurusanId}`, updateData, tokens[role], testCredentials[role].tenant_id);
    
    if (result.success) {
      console.log(`✅ ${role} berhasil mengupdate jurusan`);
      console.log(`   Updated: ${result.data.data.nama} (${result.data.data.kode})`);
    } else {
      if (role === 'guru' || role === 'siswa') {
        console.log(`✅ ${role} tidak dapat mengupdate jurusan (expected): ${result.error}`);
      } else {
        console.log(`❌ ${role} gagal mengupdate jurusan: ${result.error}`);
      }
    }
  } catch (error) {
    console.log(`❌ Error testing UPDATE jurusan for ${role}:`, error.message);
  }
}

async function testDeleteJurusan(role) {
  console.log(`\n🗑️ Testing DELETE /academic/jurusan/:id as ${role.toUpperCase()}`);
  
  if (!global.createdJurusanId) {
    console.log(`⚠️  Tidak ada jurusan ID untuk testing DELETE`);
    return;
  }
  
  try {
    const result = await makeRequest('DELETE', `/academic/jurusan/${global.createdJurusanId}`, null, tokens[role], testCredentials[role].tenant_id);
    
    if (result.success) {
      console.log(`✅ ${role} berhasil menghapus jurusan`);
      console.log(`   Jurusan deleted successfully`);
      
      // Only clear the ID if admin or superadmin successfully deleted it
      if (role === 'admin' || role === 'superadmin') {
        global.createdJurusanId = null;
      }
    } else {
      if (role === 'guru' || role === 'siswa') {
        console.log(`✅ ${role} tidak dapat menghapus jurusan (expected): ${result.error}`);
      } else {
        console.log(`❌ ${role} gagal menghapus jurusan: ${result.error}`);
      }
    }
  } catch (error) {
    console.log(`❌ Error testing DELETE jurusan for ${role}:`, error.message);
  }
}

// Test pagination and search
async function testPaginationAndSearch() {
  console.log('\n📄 Testing pagination and search...');
  
  try {
    // Test pagination
    console.log('🔍 Testing pagination...');
    const paginationResult = await makeRequest('GET', '/academic/jurusan?page=1&limit=5', null, tokens.admin, testCredentials.admin.tenant_id);
    
    if (paginationResult.success) {
      console.log('✅ Pagination test berhasil');
      if (paginationResult.data.pagination) {
        console.log(`   Page: ${paginationResult.data.pagination.page}`);
        console.log(`   Limit: ${paginationResult.data.pagination.limit}`);
        console.log(`   Total: ${paginationResult.data.pagination.total}`);
      } else {
        console.log(`   Data count: ${paginationResult.data.data ? paginationResult.data.data.length : paginationResult.data.length}`);
      }
    } else {
      console.log('❌ Pagination test gagal:', paginationResult.error);
    }
    
    // Test search
    console.log('\n🔍 Testing search...');
    const searchResult = await makeRequest('GET', '/academic/jurusan?search=Teknik', null, tokens.admin, testCredentials.admin.tenant_id);
    
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
    // Buat jurusan di tenant 1 menggunakan admin yang sudah login
    if (tokens.admin) {
      const createResponse = await makeRequest('POST', '/academic/jurusan', {
        nama: 'Jurusan Tenant 1',
        kode: 'JT1'
      }, tokens.admin, testCredentials.admin.tenant_id);
      
      if (createResponse.success) {
        console.log('✅ Created jurusan in Tenant 1');
        
        // Test 1: Coba akses dengan tenant_id yang sama (harus berhasil)
        const sameTenanResponse = await makeRequest('GET', '/academic/jurusan', null, tokens.admin, testCredentials.admin.tenant_id);
        
        if (sameTenanResponse.success) {
          console.log('✅ Same tenant access: Success');
          console.log(`   Found ${sameTenanResponse.data.data ? sameTenanResponse.data.data.length : 0} jurusan`);
        } else {
          console.log('❌ Same tenant access failed:', sameTenanResponse.error);
        }
        
        // Test 2: Coba akses dengan tenant_id yang berbeda (harus gagal atau kosong)
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
async function runTests() {
  console.log('🚀 Memulai testing endpoint Jurusan...\n');
  
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
    console.log(`\nTesting role: ${role}, token exists: ${!!tokens[role]}`);
    if (tokens[role]) {
      await testGetAllJurusan(role);
    } else {
      console.log(`❌ No token for ${role}`);
    }
  }
  
  // Test CREATE operations (should only work for SUPERADMIN and ADMIN)
  for (const role of ['superadmin', 'admin', 'guru', 'siswa']) {
    if (tokens[role]) {
      await testCreateJurusan(role);
    }
  }
  
  // Test READ by ID for all roles
  for (const role of ['superadmin', 'admin', 'guru', 'siswa']) {
    if (tokens[role]) {
      await testGetJurusanById(role);
    }
  }
  
  // Test UPDATE operations (should only work for SUPERADMIN and ADMIN)
  for (const role of ['superadmin', 'admin', 'guru', 'siswa']) {
    if (tokens[role]) {
      await testUpdateJurusan(role);
    }
  }
  
  // Test DELETE operations (should only work for SUPERADMIN and ADMIN)
  for (const role of ['superadmin', 'admin', 'guru', 'siswa']) {
    if (tokens[role]) {
      await testDeleteJurusan(role);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🔍 TESTING ADVANCED FEATURES');
  console.log('='.repeat(60));
  
  // Test pagination and search
  if (tokens.admin) {
    await testPaginationAndSearch();
  }
  
  // Test tenant isolation
  await testTenantIsolation();
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Testing selesai!');
  console.log('='.repeat(60));
}

// Run the tests
runTests().catch(console.error);
