const fs = require('fs');
const path = require('path');

// ─── 13 PILAR STANDARISASI BACKEND MULTI-TENANT GOOGLE ─────────────────────
// P1: Tenant Context Injection Guard
// P2: Tenant Data Isolation Guard
// P3: Role & Permission RBAC Guard
// P4: Input Validation & Schema Guard
// P5: Database Transaction Atomicity (trx)
// P6: Structured Error & Anti-Leak Envelope
// P7: Async Job & Queue Isolation
// P8: Fair-Use Rate Limiting & Anti-Brute Force
// P9: Logging & Audit Trail Compliance
// P10: Dynamic Tenant Timezone Resolution Guard (WIB/WITA/WIT)
// P11: Anti God-File & Modular Architecture Guard
// P12: End-to-End Payload & Contract Symmetry Guard (Request/Response Envelope)
// P13: Centralized Database Singleton & Anti-Connection-Leak Guard (Prisma Utils Hub)
// ────────────────────────────────────────────────────────────────────────────

const ROOT_DIR = path.resolve(__dirname, '..');
const MODULES_DIR = path.join(ROOT_DIR, 'src', 'modules');
const REPORT_FILE = path.join(ROOT_DIR, 'src', 'config', 'backendAuditReport.json');

// Line limit standards
const ROUTE_LINE_LIMIT = 350;
const CONTROLLER_LINE_LIMIT = 500;
const SERVICE_LINE_LIMIT = 800;

// Helper recursive find files
function findRouteFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules' && file !== 'dist') {
        results = results.concat(findRouteFiles(filePath));
      }
    } else if (file.endsWith('.routes.ts') || file.endsWith('.route.ts') || file.endsWith('routes.ts')) {
      results.push(filePath);
    }
  });
  return results;
}

// Find imported controllers and services for a given route file
function resolveModuleContext(routeFilePath) {
  const routeContent = fs.readFileSync(routeFilePath, 'utf8');
  const routeDir = path.dirname(routeFilePath);
  const moduleDir = path.resolve(routeDir, '..');

  let combinedContent = routeContent;
  const importedFiles = [{ path: routeFilePath, lines: routeContent.split('\n').length, type: 'route' }];

  // Look for relative imports of controllers, services, guards, and schemas
  const importMatches = routeContent.matchAll(/from\s+['"](\.[^'"]+)['"]/g);
  for (const match of importMatches) {
    const importRelPath = match[1];
    let resolvedPath = path.resolve(routeDir, importRelPath);
    if (!resolvedPath.endsWith('.ts')) {
      if (fs.existsSync(resolvedPath + '.ts')) resolvedPath += '.ts';
      else if (fs.existsSync(path.join(resolvedPath, 'index.ts'))) resolvedPath = path.join(resolvedPath, 'index.ts');
    }
    if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
      if (!importedFiles.some(f => f.path === resolvedPath)) {
        const fileContent = fs.readFileSync(resolvedPath, 'utf8');
        const fileType = resolvedPath.includes('controller') ? 'controller' : (resolvedPath.includes('service') ? 'service' : 'other');
        importedFiles.push({ path: resolvedPath, lines: fileContent.split('\n').length, type: fileType });
        combinedContent += '\n' + fileContent;
      }
    }
  }

  // Also read services in the same module if available
  const servicesDir = path.join(moduleDir, 'services');
  if (fs.existsSync(servicesDir)) {
    const sFiles = fs.readdirSync(servicesDir);
    sFiles.forEach(sf => {
      const sfPath = path.join(servicesDir, sf);
      if (fs.statSync(sfPath).isFile() && sf.endsWith('.ts')) {
        if (!importedFiles.some(f => f.path === sfPath)) {
          const fileContent = fs.readFileSync(sfPath, 'utf8');
          importedFiles.push({ path: sfPath, lines: fileContent.split('\n').length, type: 'service' });
          combinedContent += '\n' + fileContent;
        }
      }
    });
  }

  return { routeContent, combinedContent, importedFiles };
}

// Audit an individual module route
function auditRoute(routeFilePath) {
  const relPath = path.relative(ROOT_DIR, routeFilePath);
  const { routeContent, combinedContent, importedFiles } = resolveModuleContext(routeFilePath);
  const issues = [];

  // P1: Tenant Context Injection Guard
  const hasTenantExtraction = /tenantId|tenant_id|request\.tenantId|request\.dataScope|verifyTenant|tenantMiddleware/i.test(combinedContent);
  const hasPublicExemption = /isPublic|exemptPublic|login|register|webhook|health|public/i.test(relPath) || /auth\.routes/i.test(relPath);
  const passTenantContext = hasTenantExtraction || hasPublicExemption;
  if (!passTenantContext) {
    issues.push('❌ [P1 Tenant Context] Route tidak mengekstrak atau memvalidasi tenant_id dari request context / JWT.');
  }

  // P2: Tenant Data Isolation Guard
  const hasDbQueries = /prisma\.\w+\.(find|create|update|delete|count|upsert)/.test(combinedContent);
  const hasTenantFiltering = /tenant_id\s*:\s*tenantId|tenant_id\s*:\s*request\.tenantId|where\s*:\s*\{[^}]*?tenant_id/s.test(combinedContent);
  const passTenantIsolation = !hasDbQueries || hasTenantFiltering || hasPublicExemption;
  if (!passTenantIsolation) {
    issues.push('❌ [P2 Tenant Isolation] Terdeteksi query database Prisma tanpa klausa filter tenant_id eksplisit.');
  }

  // P3: Role & Permission RBAC Guard
  const hasRbacMiddleware = /requireCapability|requirePermission|requireRole|requireSuperAdmin|SesiGuard|verifyAdmin|isAdmin|can\(/i.test(combinedContent);
  const passRbac = hasRbacMiddleware || hasPublicExemption;
  if (!passRbac) {
    issues.push('⚠️ [P3 RBAC Guard] Route belum diproteksi oleh middleware permission/capability (requireCapability).');
  }

  // P4: Input Validation & Schema Guard
  const hasZodOrSchema = /z\.object|\.parse\(|\.safeParse\(|create\w+Schema|update\w+Schema|schema\s*:\s*\{/i.test(combinedContent);
  const hasMutations = /fastify\.(post|put|patch|delete)/i.test(routeContent);
  const passSchemaValidation = !hasMutations || hasZodOrSchema;
  if (!passSchemaValidation) {
    issues.push('⚠️ [P4 Schema Guard] Endpoint mutasi (POST/PUT/PATCH) belum memiliki validasi skema DTO/Zod eksplisit.');
  }

  // P5: Database Transaction Atomicity (trx)
  const hasMultiTableMutations = (combinedContent.match(/prisma\.\w+\.(create|update|delete|upsert)/g) || []).length > 2;
  const hasTransaction = /\$transaction|trx\./i.test(combinedContent);
  const passTransaction = !hasMultiTableMutations || hasTransaction;
  if (!passTransaction) {
    issues.push('⚠️ [P5 Transaction ACID] Mutasi multi-tabel belum dibungkus dalam blok prisma.$transaction.');
  }

  // P6: Structured Error & Anti-Leak Envelope
  const hasStandardEnvelope = /\{\s*success\s*:\s*(true|false)/.test(combinedContent);
  const hasTryCatch = /try\s*\{[\s\S]*?catch\s*\(/s.test(combinedContent);
  const passErrorEnvelope = hasStandardEnvelope && hasTryCatch;
  if (!passErrorEnvelope) {
    issues.push('⚠️ [P6 Error Envelope] Controller belum membungkus response dalam format standar { success, message }.');
  }

  // P7: Async Job & Queue Isolation
  const hasHeavyOps = /sendWhatsapp|generatePdf|exportExcel|bulkNotification|autoSession/i.test(combinedContent);
  const hasQueueOrJob = /queue|job|emitDomainEvent|bullmq|event-bus/i.test(combinedContent);
  const passAsyncJob = !hasHeavyOps || hasQueueOrJob;
  if (!passAsyncJob) {
    issues.push('⚠️ [P7 Queue Isolation] Operasi berat terdeteksi berjalan langsung di alur HTTP tanpa antrean BullMQ/event-bus.');
  }

  // P8: Fair-Use Rate Limiting & Anti-Brute Force
  const hasRateLimit = /rateLimit|rate-limit|throttle|attendanceMode|requireMultiSesiMode/i.test(combinedContent);
  const passRateLimit = hasRateLimit || !hasPublicExemption;

  // P9: Logging & Audit Trail Compliance
  const hasLogging = /appLogger|logger\.(info|warn|error)|console\.(log|error)|auditLog/i.test(combinedContent);
  const passLogging = hasLogging;
  if (!passLogging) {
    issues.push('⚠️ [P9 Audit Trail] Controller/service belum mencatat log audit (appLogger/pino).');
  }

  // P10: Dynamic Tenant Timezone Resolution Guard
  const hasTimezoneResolution = /getTenantTimezone|timezone|getTimezone|getTenantOffsetString|PLATFORM_TIMEZONE/i.test(combinedContent);
  const needsTimezone = /tanggal|waktu|date|time|schedule|jam_|created_at|updated_at/i.test(combinedContent);
  const passTimezone = hasTimezoneResolution || !needsTimezone;
  if (!passTimezone) {
    issues.push('⚠️ [P10 Timezone Resolution] Terdeteksi manipulasi tanggal/waktu tanpa mengadopsi resolusi zona waktu tenant (getTenantTimezone).');
  }

  // P11: Anti God-File & Modular Architecture Guard
  const godFiles = importedFiles.filter(f => {
    if (f.type === 'route' && f.lines > ROUTE_LINE_LIMIT) return true;
    if (f.type === 'controller' && f.lines > CONTROLLER_LINE_LIMIT) return true;
    if (f.type === 'service' && f.lines > SERVICE_LINE_LIMIT) return true;
    if (f.lines > 1000) return true;
    return false;
  });
  const passGodFile = godFiles.length === 0;
  if (!passGodFile) {
    const detail = godFiles.map(g => `${path.basename(g.path)} (${g.lines} baris)`).join(', ');
    issues.push(`⚠️ [P11 Anti God-File] Terdeteksi berkas melebihi batas modularitas: ${detail}.`);
  }

  // P12: End-to-End Payload & Contract Symmetry Guard
  const hasRawReturnWithoutEnvelope = /return\s+(?!reply|\{[\s\S]*?success)[a-zA-Z0-9_]+\s*;/g.test(combinedContent) && !combinedContent.includes('reply.send') && !combinedContent.includes('reply.status');
  const hasStatusSemantics = /reply\.status\(\s*(200|201|400|401|403|404|409|500)\s*\)/.test(combinedContent) || /status\s*:\s*(200|201|400|401|403|404|409|500)/.test(combinedContent);
  const hasListEndpoint = /fastify\.get\(/i.test(routeContent);
  const hasPaginationOrArray = !hasListEndpoint || /pagination|totalItems|totalPages|count|items|data/i.test(combinedContent);
  
  const passPayloadContractSymmetry = !hasRawReturnWithoutEnvelope && hasStatusSemantics && hasPaginationOrArray;
  if (!passPayloadContractSymmetry) {
    issues.push('⚠️ [P12 Payload Symmetry] Kontrak respon belum simetris: pastikan menggunakan status code semantik & amplop { success, message, data, pagination }.');
  }

  // P13: Centralized Database Singleton & Anti-Connection-Leak Guard (Prisma Utils Hub)
  const hasNewPrismaClient = importedFiles.some(f => !f.path.includes('utils\\prisma.ts') && !f.path.includes('utils/prisma.ts') && /new\s+PrismaClient\s*\(/i.test(fs.readFileSync(f.path, 'utf8')));
  const passPrismaSingleton = !hasNewPrismaClient;
  if (!passPrismaSingleton) {
    issues.push('❌ [P13 Prisma Singleton Guard] Terdeteksi instansiasi liar new PrismaClient()! Wajib menggunakan jalur tunggal: import { prisma } from "@/utils/prisma".');
  }

  // Calculate Score
  const pillars = {
    tenantContext: passTenantContext,
    tenantIsolation: passTenantIsolation,
    rbacGuard: passRbac,
    schemaValidation: passSchemaValidation,
    transactionAtomicity: passTransaction,
    errorEnvelope: passErrorEnvelope,
    asyncJobIsolation: passAsyncJob,
    rateLimiting: passRateLimit,
    loggingAuditTrail: passLogging,
    timezoneResolution: passTimezone,
    godFileGuard: passGodFile,
    payloadContractSymmetry: passPayloadContractSymmetry,
    prismaSingletonGuard: passPrismaSingleton,
  };

  const totalPassed = Object.values(pillars).filter(Boolean).length;
  const score = Math.round((totalPassed / 13) * 100);

  let status = '✅ TERSTANDARISASI';
  if (score < 70 || !passTenantContext || !passTenantIsolation || !passPrismaSingleton) {
    status = '❌ BELUM STANDAR';
  } else if (score < 100 || issues.length > 0) {
    status = '⚠️ SEBAGIAN';
  }

  return {
    file: relPath,
    score,
    status,
    pillars,
    issues,
    importedFilesCount: importedFiles.length,
    godFilesCount: godFiles.length
  };
}

// ─── MAIN EXECUTION ─────────────────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);
  const moduleFilterIdx = args.findIndex(a => a === '--module' || a === '-m');
  const moduleFilter = moduleFilterIdx !== -1 ? args[moduleFilterIdx + 1] : null;

  console.log('🛡️  MEMULAI AUDIT STATIS BACKEND MULTI-TENANT 13 PILAR GOOGLE & PRISMA SINGLETON...\n');

  const allRouteFiles = findRouteFiles(MODULES_DIR);
  let filteredRoutes = allRouteFiles;

  if (moduleFilter) {
    filteredRoutes = allRouteFiles.filter(f => f.toLowerCase().includes(moduleFilter.toLowerCase()));
    console.log(`🔍 Memfilter audit khusus untuk modul: "${moduleFilter}" (${filteredRoutes.length} route file ditemukan)\n`);
  }

  const results = [];
  let fullyStandardized = 0;
  let partiallyStandardized = 0;
  let notStandardized = 0;

  filteredRoutes.forEach(routeFile => {
    const res = auditRoute(routeFile);
    results.push(res);

    if (res.status === '✅ TERSTANDARISASI') fullyStandardized++;
    else if (res.status === '⚠️ SEBAGIAN') partiallyStandardized++;
    else notStandardized++;

    console.log(`${res.status.padEnd(17)} | ${res.file} (Skor: ${res.score}%)`);
    res.issues.forEach(iss => {
      console.log(`   └─ ${iss}`);
    });
  });

  console.log('\n================ RINGKASAN HASIL AUDIT BACKEND (13 PILAR) ================');
  console.log(`Total Route/Modul Diaudit : ${filteredRoutes.length} berkas`);
  console.log(`Sempurna Terstandarisasi  : ${fullyStandardized} berkas`);
  console.log(`Sebagian Terstandarisasi  : ${partiallyStandardized} berkas`);
  console.log(`Belum Terstandarisasi     : ${notStandardized} berkas`);
  console.log('===========================================================================\n');

  // Save JSON report if full audit
  if (!moduleFilter) {
    try {
      const configDir = path.dirname(REPORT_FILE);
      if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(REPORT_FILE, JSON.stringify(results, null, 2), 'utf8');
      console.log(`📄 Laporan audit tersimpan di: ${path.relative(ROOT_DIR, REPORT_FILE)}\n`);
    } catch (err) {
      console.error('Gagal menyimpan laporan JSON:', err.message);
    }
  }
}

main();
