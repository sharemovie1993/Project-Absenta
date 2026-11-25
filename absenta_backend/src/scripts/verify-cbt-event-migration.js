/**
 * Regression & Parity Verification Script for CBT Event Migration (Config JSON -> Relational CbtEvent)
 * Usage on server (from absenta_backend root):
 *   node src/scripts/verify-cbt-event-migration.js --snapshot
 *   node src/scripts/verify-cbt-event-migration.js --verify
 */
const fs = require('fs');
const assert = require('assert');
const { PrismaClient } = require('@prisma/client');

const SNAPSHOT_PATH = '/tmp/cbt_events_before.json';

function normalizeEvent(e) {
  if (!e) return null;
  return {
    id: e.id,
    tahun_pelajaran_id: e.tahun_pelajaran_id,
    nama_event: e.nama_event,
    kode_event: e.kode_event,
    semester: e.semester,
    target_tingkat: Array.isArray(e.target_tingkat) ? e.target_tingkat : [],
    tipe_pelaksanaan: e.tipe_pelaksanaan ?? 'MASSAL',
    keterangan: e.keterangan ?? null,
    days_config: e.days_config ?? null,
    room_mappings: e.room_mappings ?? null,
    matrix_draft: e.matrix_draft ?? null,
    pengawas_candidates: e.pengawas_candidates ?? null,
    lock_teacher_scheduling: Boolean(e.lock_teacher_scheduling),
    token_refresh_interval: Number(e.token_refresh_interval ?? 0),
    strict_browser_guard: Boolean(e.strict_browser_guard),
    enable_proctor: e.enable_proctor !== undefined ? Boolean(e.enable_proctor) : true,
    is_active: Boolean(e.is_active),
  };
}

function normalizeSummary(res) {
  return {
    total_events: res.total_events,
    active_event: normalizeEvent(res.active_event),
    summary: (res.summary || []).map((tp) => ({
      tahun_pelajaran_id: tp.tahun_pelajaran_id,
      tahun_ajaran: tp.tahun_ajaran,
      is_active_tp: tp.is_active_tp,
      events: (tp.events || []).map(normalizeEvent).sort((a, b) => a.id.localeCompare(b.id)),
    })),
  };
}

async function collectAll(prisma, CbtSettingsService) {
  const tenants = await prisma.tenant.findMany({
    select: { id: true, subdomain: true },
    orderBy: { subdomain: 'asc' },
  });
  const out = {};
  for (const t of tenants) {
    const summary = await CbtSettingsService.getEventsSummary(t.id);
    const active = await CbtSettingsService.getActiveEvent(t.id);
    out[t.subdomain || t.id] = {
      tenant_id: t.id,
      summary: normalizeSummary(summary),
      active_event: normalizeEvent(active),
    };
  }
  return out;
}

async function main() {
  const mode = process.argv[2];
  if (mode !== '--snapshot' && mode !== '--verify') {
    console.error('Usage: node src/scripts/verify-cbt-event-migration.js [--snapshot | --verify]');
    process.exit(1);
  }

  // Register tsconfig-paths for dist if present, or resolve relative dist path
  const path = require('path');
  const distServicePath = path.resolve(__dirname, '../../dist/modules/cbt/services/cbt-settings.service.js');
  // Patch @/ alias for direct node execution against dist/
  const Module = require('module');
  const origResolve = Module._resolveFilename;
  const distRoot = path.resolve(__dirname, '../../dist');
  Module._resolveFilename = function (request, parent, isMain, options) {
    if (request.startsWith('@/')) {
      request = path.join(distRoot, request.slice(2));
    }
    return origResolve.call(this, request, parent, isMain, options);
  };

  const { CbtSettingsService } = require(distServicePath);
  const prisma = new PrismaClient();

  try {
    const data = await collectAll(prisma, CbtSettingsService);

    if (mode === '--snapshot') {
      fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(data, null, 2), 'utf8');
      for (const [sub, val] of Object.entries(data)) {
        console.log(`[SNAPSHOT] ${sub}: total_events=${val.summary.total_events}, active=${val.active_event?.id || 'NONE'}`);
      }
      console.log(`Saved BEFORE snapshot to ${SNAPSHOT_PATH}`);
    } else {
      if (!fs.existsSync(SNAPSHOT_PATH)) {
        throw new Error(`Snapshot not found at ${SNAPSHOT_PATH}. Run --snapshot first!`);
      }
      const before = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
      const keys = Object.keys(before);
      let mismatches = 0;

      for (const sub of keys) {
        if (!data[sub]) {
          console.error(`[FAIL] Missing tenant in AFTER output: ${sub}`);
          mismatches++;
          continue;
        }
        try {
          assert.deepStrictEqual(data[sub], before[sub]);
          console.log(`[PASS] ${sub}: 100% identical (events=${data[sub].summary.total_events}, active=${data[sub].active_event?.id || 'NONE'})`);
        } catch (err) {
          console.error(`[FAIL] ${sub} mismatch:`, err.message);
          mismatches++;
        }
      }

      if (mismatches > 0) {
        console.error(`❌ Regression check FAILED with ${mismatches} tenant mismatch(es).`);
        process.exit(1);
      }
      console.log('✅ Regression check PASSED: 100% BEFORE/AFTER parity across all tenants!');
    }
  } finally {
    await prisma.$disconnect();
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
