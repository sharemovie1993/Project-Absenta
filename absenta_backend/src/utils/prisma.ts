import { PrismaClient } from '@prisma/client';
import { appLogger } from './app-logger';

declare global {
  var __prisma: PrismaClient | undefined;
}

const applyPrismaPoolDefaults = () => {
  try {
    const raw = String(process.env.DATABASE_URL || '').trim();
    if (!raw) return;
    if (!(raw.startsWith('postgres://') || raw.startsWith('postgresql://'))) return;
    const u = new URL(raw);
    if (!u.searchParams.has('connection_limit')) u.searchParams.set('connection_limit', '20');
    if (!u.searchParams.has('pool_timeout')) u.searchParams.set('pool_timeout', '20');
    process.env.DATABASE_URL = u.toString();
  } catch {}
};

applyPrismaPoolDefaults();

const slowQueryMsRaw = Number.parseInt(String(process.env.PRISMA_SLOW_QUERY_MS ?? ''), 10);
const slowQueryMs = Number.isFinite(slowQueryMsRaw) && slowQueryMsRaw > 0 ? slowQueryMsRaw : null;

const prismaOptions: any = slowQueryMs
  ? { log: [{ emit: 'event', level: 'query' }, { emit: 'stdout', level: 'warn' }, { emit: 'stdout', level: 'error' }] }
  : { log: ['info', 'warn', 'error'] };

const prisma = globalThis.__prisma || new PrismaClient(prismaOptions);

if (slowQueryMs) {
  (prisma as any).$on('query' as any, (e: any) => {
    if (typeof e?.duration === 'number' && e.duration >= slowQueryMs) {
      appLogger.warn(
        { duration_ms: e.duration, target: e.target, params: e.params },
        'prisma.slow_query'
      );
    }
  });
}

if (process.env['NODE_ENV'] === 'development') {
  globalThis.__prisma = prisma;
}

export { prisma };

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
