/**
 * Jest Test Setup
 * 
 * Global setup for all tests including database configuration,
 * mocks, and test utilities
 * 
 * @author AI Assistant
 * @date 2025-01-27
 * @version 1.0.0
 */

const dotenv = require('dotenv');

dotenv.config({ override: true });
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
process.env.NODE_ENV = 'test';

const { prisma } = require('../src/utils/prisma');

// Increase timeout for database operations
jest.setTimeout(30000);

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Global test utilities
global.testUtils = {
  /**
   * Clean up all test data from database
   */
  async cleanDatabase() {
    // Disabled per user request to preserve test data
    // const tablenames = await prisma.$queryRaw`
    //   SELECT tablename FROM pg_tables WHERE schemaname='public'
    // `;
    
    // const tables = tablenames
    //   .map(({ tablename }) => tablename)
    //   .filter(name => name !== '_prisma_migrations')
    //   .map(name => `"public"."${name}"`)
    //   .join(', ');

    // try {
    //   await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
    // } catch (error) {
    //   console.log({ error });
    // }
  },

  /**
   * Create test tenant with specified mode
   */
  async createTestTenant(mode = 'SIMPLE', suffix = '') {
    return await prisma.tenant.create({
      data: {
        nama: `Test School ${mode}${suffix}`,
        kode: `TEST_${mode}${suffix}`,
        alamat: 'Test Address',
        telepon: '081234567890',
        email: `test${suffix}@${mode.toLowerCase()}.school`,
        absensi_mode: mode,
        status: 'AKTIF'
      }
    });
  },

  /**
   * Create test class
   */
  async createTestKelas(tenantId, suffix = '') {
    return await prisma.kelas.create({
      data: {
        nama: `Test Class${suffix}`,
        tingkat: '10',
        tenant_id: tenantId,
        status: 'AKTIF'
      }
    });
  },

  /**
   * Create test student
   */
  async createTestSiswa(tenantId, kelasId, suffix = '') {
    return await prisma.siswa.create({
      data: {
        nama: `Test Student${suffix}`,
        nis: `TEST${suffix}001`,
        rfid: `RFID${suffix}001`,
        tenant_id: tenantId,
        kelas_id: kelasId,
        status: 'AKTIF'
      }
    });
  },

  /**
   * Create test teacher
   */
  async createTestGuru(tenantId, suffix = '') {
    return await prisma.guru.create({
      data: {
        nama: `Test Teacher${suffix}`,
        nip: `TEACHER${suffix}001`,
        rfid: `RFID_TEACHER${suffix}001`,
        tenant_id: tenantId,
        status: 'AKTIF'
      }
    });
  },

  /**
   * Create test gerbang session
   */
  async createTestSesiGerbang(tenantId) {
    return await prisma.sesiGerbang.create({
      data: {
        tenant_id: tenantId,
        tanggal: new Date(),
        jam_buka: '06:00:00',
        jam_tutup: '18:00:00',
        status: 'AKTIF'
      }
    });
  },

  /**
   * Create test attendance session
   */
  async createTestSesiAbsensi(tenantId, kelasId, guruId) {
    return await prisma.sesiAbsensi.create({
      data: {
        tenant_id: tenantId,
        kelas_id: kelasId,
        guru_id: guruId,
        tanggal: new Date(),
        jam_mulai: '08:00:00',
        jam_selesai: '10:00:00',
        mata_pelajaran: 'Test Subject',
        status: 'AKTIF'
      }
    });
  },

  /**
   * Wait for specified milliseconds
   */
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Generate random string
   */
  randomString(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * Get today's date in YYYY-MM-DD format
   */
  getTodayString() {
    return new Date().toISOString().split('T')[0];
  },

  /**
   * Get current year and month
   */
  getCurrentYearMonth() {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1
    };
  }
};

// Mock authentication middleware
jest.mock('../src/middlewares/auth', () => ({
  authMiddleware: (req, _res, next) => {
    const headers = (req && req.headers) || {};
    const skipTenantHeader = headers['x-skip-tenant'];
    const skipTenant = typeof skipTenantHeader !== 'undefined' && (
      skipTenantHeader === 'true' || skipTenantHeader === '1' || skipTenantHeader === true
    );

    const tenantIdHeader = headers['x-tenant-id'];
    const tenantId = skipTenant ? null : (tenantIdHeader || 'test-tenant-id');

    req.user = {
      id: 'test-user-id',
      email: 'test@example.com',
      role: skipTenant ? 'superadmin' : 'admin',
      roleName: skipTenant ? 'SUPERADMIN' : 'ADMIN',
      tenantId,
      tenant_id: tenantId
    };

    if (typeof next === 'function') {
      return next();
    }
  }
}));

// Mock tenant middleware
jest.mock('../src/middlewares/tenant', () => ({
  tenantMiddleware: (req, res, next) => {
    const headers = (req && req.headers) || {};
    const skipTenantHeader = headers['x-skip-tenant'];
    const skipTenant = typeof skipTenantHeader !== 'undefined' && (
      skipTenantHeader === 'true' || skipTenantHeader === '1' || skipTenantHeader === true
    );

    if (skipTenant) {
      req.tenantId = null;
      req.skipTenant = true;
      req.tenant = null;
      if (typeof next === 'function') {
        return next();
      }
      return;
    }

    const tenantIdHeader = headers['x-tenant-id'];
    const tenantId = tenantIdHeader || req.user?.tenantId || req.user?.tenant_id || 'test-tenant-id';
    req.tenantId = tenantId;
    req.tenant = {
      id: tenantId,
      absensi_mode: 'MULTI_SESI'
    };

    if (typeof next === 'function') {
      return next();
    }
  }
}));

// Setup and teardown hooks
beforeAll(async () => {
  // Connect to test database
  await prisma.$connect();
});

afterAll(async () => {
  // Disconnect from database
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean database before each test
  await global.testUtils.cleanDatabase();
});

afterEach(async () => {
  // Clean up after each test
  await global.testUtils.cleanDatabase();
});
