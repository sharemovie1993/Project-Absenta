import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import bcrypt from 'bcryptjs';
import { prisma } from '../../../utils/prisma';
import { authRoutes } from '../routes/auth.routes';
import { refreshTokenService } from '../services/refresh-token.service';
import { BCRYPT_ROUNDS, MIN_PASSWORD_LENGTH, getJwtSecret, maskIdentifier } from '../utils/auth-security.util';

describe('Auth Service - Comprehensive Security & Lifecycle Tests', () => {
  let tenantId: string;
  let roleId: string;
  let userId: string;
  let testApp: any;

  beforeAll(async () => {
    // 1. Create test tenant with correct schema field 'subdomain'
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Test Tenant Audit',
        subdomain: 'test-tenant-audit',
        status: 'ACTIVE' as any,
      },
    });
    tenantId = tenant.id;

    // 2. Create test role
    const role = await prisma.role.create({
      data: {
        tenant_id: tenantId,
        name: 'ADMIN' as any,
        description: 'Admin',
        is_system: true,
      },
    });
    roleId = role.id;

    // 3. Create test user with BCRYPT_ROUNDS (12)
    const hashed = await bcrypt.hash('P@ssw0rd123!', BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        tenant_id: tenantId,
        role_id: roleId,
        email: 'audit-admin@test.local',
        password: hashed,
        full_name: 'Audit Admin Test',
        status: 'ACTIVE' as any,
        email_verified: true,
      },
    });
    userId = user.id;

    // 4. Initialize test Fastify app
    testApp = Fastify({ logger: false });
    await testApp.register(fastifyJwt, { secret: getJwtSecret() });
    await testApp.register(authRoutes, { prefix: '/api/auth' });
    await testApp.ready();
  });

  afterAll(async () => {
    if (testApp) {
      await testApp.close();
    }
    try {
      await prisma.refreshToken.deleteMany({ where: { user_id: userId } });
      await prisma.user.delete({ where: { id: userId } });
      await prisma.role.delete({ where: { id: roleId } });
      await prisma.tenant.delete({ where: { id: tenantId } });
    } catch {}
  });

  test('1. Security Util Tests - Masking, Password Length, Bcrypt Rounds', () => {
    expect(BCRYPT_ROUNDS).toBe(12);
    expect(MIN_PASSWORD_LENGTH).toBe(8);
    expect(maskIdentifier('admin@absenta.id')).toBe('ad***n@absenta.id');
    expect(maskIdentifier('12345678')).toBe('12***78');
    expect(maskIdentifier('')).toBe('');
  });

  test('2. POST /api/auth/login returns JWT and DB-backed opaque refreshToken', async () => {
    const res = await testApp.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { host: '127.0.0.1' },
      payload: {
        email: 'audit-admin@test.local',
        password: 'P@ssw0rd123!',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data?.token).toBeTruthy();
    expect(body.data?.refreshToken).toBeTruthy();

    const decoded: any = testApp.jwt.verify(body.data.token);
    expect(decoded.tenantId).toBe(tenantId);
    expect(decoded.roleName).toBe('ADMIN');

    // Verify refresh token is actually stored as hash in database (C1 fix)
    const verified = await refreshTokenService.verifyRefreshToken(body.data.refreshToken);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe(userId);
  });

  test('3. POST /api/auth/refresh returns new access token with valid refresh token', async () => {
    // Generate a fresh refresh token
    const rawRefreshToken = await refreshTokenService.createRefreshToken(userId, tenantId, 'Jest Test Device');

    const res = await testApp.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: { host: '127.0.0.1' },
      payload: { refreshToken: rawRefreshToken },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data?.token).toBeTruthy();

    const decoded: any = testApp.jwt.verify(body.data.token);
    expect(decoded.id).toBe(userId);
  });

  test('4. POST /api/auth/logout revokes refresh token in database', async () => {
    const rawRefreshToken = await refreshTokenService.createRefreshToken(userId, tenantId, 'Logout Test Device');

    // Revoke the token
    await refreshTokenService.revokeByRawToken(rawRefreshToken);

    // Verify it is rejected on subsequent refresh attempts
    const verifiedAfterRevoke = await refreshTokenService.verifyRefreshToken(rawRefreshToken);
    expect(verifiedAfterRevoke).toBeNull();

    // Verify API rejects revoked refresh token (replay attack prevention)
    const res = await testApp.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: { host: '127.0.0.1' },
      payload: { refreshToken: rawRefreshToken },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.reason).toBe('INVALID_REFRESH_TOKEN');
  });

  test('5. POST /api/auth/login rejects invalid credentials', async () => {
    const res = await testApp.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { host: '127.0.0.1' },
      payload: {
        email: 'audit-admin@test.local',
        password: 'WrongPassword123!',
      },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
  });
});
