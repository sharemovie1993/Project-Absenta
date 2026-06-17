import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import bcrypt from 'bcryptjs';
import { prisma } from '../../../utils/prisma';
import { authRoutes } from '../routes/auth.routes';

describe('Auth - Login', () => {
  let tenantId: string;
  let roleId: string;
  let userId: string;

  beforeAll(async () => {
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Test Tenant',
        domain: 'test-tenant',
        status: 'ACTIVE' as any,
      },
    });
    tenantId = tenant.id;

    const role = await prisma.role.create({
      data: {
        tenant_id: tenantId,
        name: 'ADMIN' as any,
        description: 'Admin',
        is_system: true,
      },
    });
    roleId = role.id;

    const hashed = await bcrypt.hash('P@ssw0rd123', 10);
    const user = await prisma.user.create({
      data: {
        tenant_id: tenantId,
        role_id: roleId,
        email: 'admin@test.local',
        password: hashed,
        full_name: 'Admin Test',
        status: 'ACTIVE' as any,
        email_verified: true,
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    try {
      await prisma.user.delete({ where: { id: userId } });
    } catch {}
    try {
      await prisma.role.delete({ where: { id: roleId } });
    } catch {}
    try {
      await prisma.tenant.delete({ where: { id: tenantId } });
    } catch {}
  });

  test('POST /api/auth/login returns JWT and refreshToken', async () => {
    const app = Fastify({ logger: false });
    await app.register(fastifyJwt, { secret: 'test-secret' });
    await app.register(authRoutes, { prefix: '/api/auth' });
    await app.ready();

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: {
        host: '127.0.0.1',
      },
      payload: {
        email: 'admin@test.local',
        password: 'P@ssw0rd123',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data?.token).toBeTruthy();
    expect(body.data?.refreshToken).toBeTruthy();

    const decoded: any = app.jwt.verify(body.data.token);
    expect(decoded.tenantId).toBe(tenantId);
    expect(decoded.roleName).toBe('ADMIN');

    await app.close();
  });
});
