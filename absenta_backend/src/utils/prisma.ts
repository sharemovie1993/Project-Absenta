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

// Enforce trial limit of 10 records for unpaid modules
prisma.$use(async (params, next) => {
  const targetModels: Record<string, { module: string; tenantField: string; checkDeleted?: boolean }> = {
    // Absensi
    SesiAbsensi: { module: 'ABSENSI', tenantField: 'tenant_id' },
    SesiGerbang: { module: 'ABSENSI', tenantField: 'tenant_id' },
    AttendanceDevice: { module: 'ABSENSI', tenantField: 'tenant_id' },

    // Koperasi
    Member: { module: 'KOPERASI', tenantField: 'tenantId' },
    Product: { module: 'KOPERASI', tenantField: 'tenantId' },
    Sale: { module: 'KOPERASI', tenantField: 'tenantId' },
    CoopStockIn: { module: 'KOPERASI', tenantField: 'tenantId' },
    CoopStockOpname: { module: 'KOPERASI', tenantField: 'tenantId' },

    // Hubin
    MitraIndustri: { module: 'HUBIN', tenantField: 'tenant_id' },
    SiswaPkl: { module: 'HUBIN', tenantField: 'tenant_id' },
    AbsensiPkl: { module: 'HUBIN', tenantField: 'tenant_id' },
    HubinMoUHistory: { module: 'HUBIN', tenantField: 'tenant_id', checkDeleted: true },
    HubinLowongan: { module: 'HUBIN', tenantField: 'tenant_id', checkDeleted: true },
    HubinLamaran: { module: 'HUBIN', tenantField: 'tenant_id', checkDeleted: true },
    HubinTracerStudy: { module: 'HUBIN', tenantField: 'tenant_id', checkDeleted: true },
    HubinTefaOrder: { module: 'HUBIN', tenantField: 'tenant_id', checkDeleted: true },

    // Sarpras
    SarprasAsset: { module: 'SARPRAS', tenantField: 'tenant_id', checkDeleted: true },
    SarprasLoan: { module: 'SARPRAS', tenantField: 'tenant_id' },
    SarprasAssetRepair: { module: 'SARPRAS', tenantField: 'tenant_id' }
  };

  if ((params.action === 'create' || params.action === 'createMany') && params.model && targetModels[params.model]) {
    const config = targetModels[params.model];
    const data = params.args?.data;
    const firstItem = Array.isArray(data) ? data[0] : data;
    const tenantField = config.tenantField;
    const tenantId = firstItem ? (firstItem[tenantField] || firstItem.tenant_id || firstItem.tenantId) : null;

    if (tenantId && tenantId !== 'system') {
      // 1. Resolve subscription features directly
      const now = new Date();
      const subscriptions = await prisma.subscription.findMany({
        where: {
          tenant_id: tenantId,
          status: { in: ['ACTIVE', 'TRIAL', 'UPGRADE_PENDING'] as any },
          end_date: { gt: now },
        },
        include: { Plan: true },
      });

      const activeFeatures = new Set<string>(['CORE']);
      for (const sub of subscriptions) {
        if (sub.Plan?.module_id) activeFeatures.add(sub.Plan.module_id.toUpperCase());
        if (Array.isArray(sub.Plan?.features_json)) {
          sub.Plan.features_json.forEach((f: any) => {
            if (typeof f === 'string') activeFeatures.add(f.toUpperCase());
          });
        }
      }

      // 2. If feature is not subscribed, enforce max 10 records limit
      if (!activeFeatures.has(config.module)) {
        const modelName = params.model;
        const dbName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
        const count = await (prisma as any)[dbName].count({
          where: {
            [tenantField]: tenantId,
            ...(config.checkDeleted ? { deleted_at: null } : {})
          }
        });

        const newRecordsCount = Array.isArray(data) ? data.length : 1;

        if (count + newRecordsCount > 10) {
          const err: any = new Error(`Batas maksimal 10 data untuk versi uji coba gratis modul ${config.module} telah tercapai. Silakan aktifkan modul ini di menu Paket & Langganan.`);
          err.statusCode = 400;
          err.code = 'FREE_TRIAL_LIMIT_EXCEEDED';
          throw err;
        }
      }
    }
  }

  return next(params);
});

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
