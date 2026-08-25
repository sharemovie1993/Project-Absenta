// @ts-nocheck
import Fastify from 'fastify';
import jwt from 'jsonwebtoken';
import { prisma } from '@/utils/prisma';
import { registerPlugins, registerMiddlewares } from '@/infra/bootstrap';
import { registerRoutes } from '@/infra/router';

export const TEST_TENANT_ID = '8535b49c-d3fc-4598-922a-7774b49ee7c5'; // SMKN 1 PLERED
export const OTHER_TENANT_ID = '2acb7e12-d264-4784-8262-8f7369061542'; // Portal Demo

let appInstance: any = null;

export async function getTestApp(): Promise<any> {
  if (appInstance) return appInstance;

  const app = Fastify({
    logger: false,
    disableRequestLogging: true,
  });

  app.decorate('prisma', prisma);

  try {
    const { registerTelemetryHook } = require('@/middlewares/accessSourceMiddleware');
    registerTelemetryHook(app);
  } catch {}

  await registerPlugins(app);
  await registerMiddlewares(app, () => {});
  await registerRoutes(app, prisma);

  await app.ready();
  appInstance = app;
  return app;
}

const ROLE_CAPABILITIES: Record<string, string[]> = {
  ADMIN: [
    '*',
    'core.users.view.list', 'core.users.manage',
    'academic.programs.view', 'academic.programs.manage',
    'academic.structures.view.list', 'academic.structure.manage',
    'academic.years.view.list', 'academic.teaching.view',
    'academic.manage.academic', 'academic.schedules.manage',
    'academic.subjects.view.list', 'academic.students.view.list',
    'attendance.devices.manage', 'attendance.sessions.view', 'attendance.sessions.manage',
    'affairs.violation.types.view.list', 'affairs.violation.types.manage',
    'affairs.achievements.view.list', 'affairs.achievements.manage',
    'bk.cases.view.list', 'bk.cases.manage',
    'sarpras.inventory.view.list', 'sarpras.categories.manage', 'sarpras.locations.manage',
    'hubin.partners.manage', 'hubin.guidance.manage', 'hubin.pkl.view.list', 'hubin.mou.view.list', 'hubin.pkl.manage',
    'cooperative.dashboard.view.overview', 'cooperative.store.products.view.list', 'cooperative.suppliers.manage', 'cooperative.savings.manage',
    'system.wilayah.manage', 'billing.modules.view'
  ],
  KURIKULUM: [
    'academic.programs.view', 'academic.programs.manage',
    'academic.structures.view.list', 'academic.structure.manage',
    'academic.years.view.list', 'academic.manage.academic',
    'academic.schedules.manage', 'academic.teaching.view',
    'academic.subjects.view.list', 'academic.students.view.list'
  ],
  KESISWAAN: [
    'affairs.violation.types.view.list', 'affairs.violation.types.manage',
    'affairs.achievements.view.list', 'affairs.achievements.manage',
    'bk.cases.view.list', 'bk.cases.manage',
    'attendance.sessions.view', 'attendance.sessions.manage'
  ],
  GURU: [
    'academic.teaching.view', 'academic.schedules.manage',
    'academic.subjects.view.list', 'academic.students.view.list',
    'attendance.sessions.view', 'attendance.sessions.manage'
  ],
  SISWA: [
    'attendance.self.view', 'academic.self.view'
  ]
};

export function createTestToken(roleName: string = 'ADMIN', customClaims: Record<string, any> = {}): string {
  const secret = process.env.JWT_SECRET || 'absenta-secret-key';
  const caps = customClaims.capabilities || ROLE_CAPABILITIES[roleName] || [];
  
  const payload = {
    id: customClaims.userId || 'test-user-id-admin',
    userId: customClaims.userId || 'test-user-id-admin',
    email: customClaims.email || 'smkn1pld@absenta.id',
    name: customClaims.name || 'Admin SMKN 1 Plered',
    role: roleName,
    roleName: roleName,
    tenant_id: customClaims.tenantId || TEST_TENANT_ID,
    tenantId: customClaims.tenantId || TEST_TENANT_ID,
    tenantName: 'SMKN 1 PLERED - PURWAKARTA',
    capabilities: caps,
    permissions: caps,
    ...customClaims
  };

  return jwt.sign(payload, secret, { expiresIn: '1d' });
}

export interface RequestOptions {
  body?: any;
  query?: Record<string, string>;
  token?: string;
  headers?: Record<string, string>;
}

export async function testRequest(
  app: any,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  options: RequestOptions = {}
) {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'host': 'smkn1pld.absenta.id',
    'x-tenant-id': TEST_TENANT_ID,
    ...(options.headers || {})
  };

  if (options.token) {
    headers['authorization'] = `Bearer ${options.token}`;
  }

  const response = await app.inject({
    method,
    url,
    headers,
    payload: options.body,
    query: options.query
  });

  let json: any = null;
  try {
    json = JSON.parse(response.body);
  } catch {
    json = response.body;
  }

  return {
    statusCode: response.statusCode,
    headers: response.headers,
    body: response.body,
    json
  };
}
