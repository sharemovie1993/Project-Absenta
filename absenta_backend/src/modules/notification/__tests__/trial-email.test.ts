import Fastify from 'fastify'
import { notificationModule } from '../../notification'
import { authMiddleware } from '../../../middlewares/auth'
import { tenantMiddleware } from '../../../middlewares/tenant'

jest.mock('nodemailer', () => {
  return {
    __esModule: true,
    default: {},
    createTransport: () => ({
      verify: async () => true,
      sendMail: async () => ({ messageId: 'test-message-id' })
    })
  }
})

jest.mock('@prisma/client', () => {
  const actual = jest.requireActual('@prisma/client')
  class PrismaClientMock {
    notificationLog = {
      create: async (_args: any) => ({ id: 'log1' }),
      findFirst: async (_args: any) => null,
      findMany: async (_args: any) => [],
      count: async (_args: any) => 0,
      groupBy: async (_args: any) => []
    }
    systemConfig = {
      findFirst: async (_args: any) => null
    }
  }
  return { ...actual, PrismaClient: PrismaClientMock }
})

describe('Trial Email Sequence Endpoints', () => {
  const JWT_SECRET = 'your-super-secret-jwt-key-change-this-in-production'
  let fastify: any
  let token: string

  beforeAll(async () => {
    fastify = Fastify({ logger: false })
    await fastify.register(require('@fastify/jwt'), { secret: JWT_SECRET })

    // Hooks similar to /api plugin
    fastify.addHook('preHandler', async (request: any, reply: any) => {
      return authMiddleware(request, reply)
    })
    fastify.addHook('preHandler', async (request: any, reply: any) => {
      return tenantMiddleware(request, reply)
    })

    await notificationModule(fastify, (fastify as any).prisma)

    token = fastify.jwt.sign({ id: 'u1', roleName: 'SUPERADMIN', tenantId: null })
    await fastify.ready()
  })

  afterAll(async () => {
    await fastify.close()
  })

  const authHeaders = () => ({
    authorization: `Bearer ${token}`,
    'x-skip-tenant': 'true'
  })

  test('POST /notifications/trial-email/welcome', async () => {
    const res = await fastify.inject({
      method: 'POST',
      url: '/notifications/trial-email/welcome',
      headers: authHeaders(),
      payload: { email: 'admin@example.com', tenantName: 'Sekolah A', setupLink: 'https://app.example.com/setup' }
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.success).toBeTruthy()
  })

  test('POST /notifications/trial-email/feature', async () => {
    const res = await fastify.inject({
      method: 'POST',
      url: '/notifications/trial-email/feature',
      headers: authHeaders(),
      payload: { email: 'admin@example.com', tenantName: 'Sekolah A', ctaUrl: 'https://app.example.com/features' }
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.success).toBeTruthy()
  })

  test('POST /notifications/trial-email/case-study', async () => {
    const res = await fastify.inject({
      method: 'POST',
      url: '/notifications/trial-email/case-study',
      headers: authHeaders(),
      payload: { email: 'admin@example.com', tenantName: 'Sekolah A', ctaUrl: 'https://app.example.com/case' }
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.success).toBeTruthy()
  })

  test('POST /notifications/trial-email/upgrade-reminder', async () => {
    const res = await fastify.inject({
      method: 'POST',
      url: '/notifications/trial-email/upgrade-reminder',
      headers: authHeaders(),
      payload: { email: 'admin@example.com', tenantName: 'Sekolah A', daysLeft: 7, ctaUrl: 'https://app.example.com/upgrade' }
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.success).toBeTruthy()
  })

  test('GET /notifications/logs returns empty for superadmin global', async () => {
    const res = await fastify.inject({
      method: 'GET',
      url: '/notifications/logs?page=1&limit=10&type=EMAIL',
      headers: authHeaders()
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.success).toBeTruthy()
    expect(Array.isArray(body.data.logs)).toBeTruthy()
  })

  test('GET /notifications/stats returns empty for superadmin global', async () => {
    const res = await fastify.inject({
      method: 'GET',
      url: '/notifications/stats',
      headers: authHeaders()
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.success).toBeTruthy()
    expect(body.data).toBeDefined()
  })
})
