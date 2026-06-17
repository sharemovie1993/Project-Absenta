import { PrismaClient } from '@prisma/client';

import { runRevenueForecastCycle } from '../../src/jobs/revenueForecast.job';
import { runUpgradeIntelligenceCycle } from '../../src/jobs/upgradeIntelligence.job';
import { runTenantRiskCycle } from '../../src/jobs/tenantRisk.job';
import { runRevenueAggregationCycle } from '../../src/jobs/revenueAggregation.job';

type BenchmarkResult = {
  name: string;
  duration_ms: number;
  query_count: number;
  peak_rss_mb: number;
  peak_heap_used_mb: number;
  started_at: string;
  finished_at: string;
};

function toMb(bytes: number): number {
  return Math.round((bytes / (1024 * 1024)) * 100) / 100;
}

async function runWithStats(name: string, prisma: PrismaClient, fn: () => Promise<void>): Promise<BenchmarkResult> {
  let queryCount = 0;
  const onQuery = () => {
    queryCount += 1;
  };
  (prisma as any).$on('query', onQuery as any);

  let peakRss = 0;
  let peakHeapUsed = 0;
  const sample = () => {
    const mem = process.memoryUsage();
    peakRss = Math.max(peakRss, mem.rss);
    peakHeapUsed = Math.max(peakHeapUsed, mem.heapUsed);
  };

  sample();
  const startedAtIso = new Date().toISOString();
  const startedAt = Date.now();
  const interval = setInterval(sample, 50);

  try {
    await fn();
  } finally {
    clearInterval(interval);
    sample();
  }

  const finishedAtIso = new Date().toISOString();
  const durationMs = Date.now() - startedAt;

  return {
    name,
    duration_ms: durationMs,
    query_count: queryCount,
    peak_rss_mb: toMb(peakRss),
    peak_heap_used_mb: toMb(peakHeapUsed),
    started_at: startedAtIso,
    finished_at: finishedAtIso,
  };
}

async function main(): Promise<void> {
  const prisma = new PrismaClient({ log: [{ emit: 'event', level: 'query' }] });
  try {
    await prisma.$connect();

    const results: BenchmarkResult[] = [];
    results.push(await runWithStats('RevenueAggregationSnapshot', prisma, async () => runRevenueAggregationCycle()));
    results.push(await runWithStats('MonthlyForecastJob', prisma, async () => runRevenueForecastCycle()));
    results.push(await runWithStats('UpgradeIntelligenceSnapshot', prisma, async () => runUpgradeIntelligenceCycle()));
    results.push(await runWithStats('RiskEngineSnapshot', prisma, async () => runTenantRiskCycle()));

    process.stdout.write(JSON.stringify({ results }, null, 2) + '\n');
  } finally {
    await prisma.$disconnect();
  }
}

void main();
