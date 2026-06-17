import fs from 'fs';
import path from 'path';
import { CAPABILITY_DOMAIN_MAP } from '../../src/config/capability-domains.generated';
import { STRUKTUR_CAPABILITIES } from '../../src/config/position-capabilities';
 
const BASE_DIR = path.join(__dirname, '../../');
const SRC_DIR = path.join(BASE_DIR, 'src');
const DOCS_DIR = path.join(BASE_DIR, 'docs');
 
const ACTION_CATALOG_FILE = path.join(DOCS_DIR, 'action_catalog.md');
const OUTPUT_REPORT = path.join(BASE_DIR, 'RBAC_BASELINE_RECONSTRUCTION_REPORT.md');
 
const SCAN_DIRS = [
  path.join(SRC_DIR, 'modules'),
  path.join(SRC_DIR, 'controllers'),
  path.join(SRC_DIR, 'services'),
  path.join(SRC_DIR, 'routes'),
  path.join(SRC_DIR, 'middleware'),
  path.join(SRC_DIR, 'middlewares'),
];
 
function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean))).sort();
}
 
function walkDir(dir: string, callback: (filePath: string) => void) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file === '__tests__') continue;
      walkDir(filePath, callback);
    } else {
      callback(filePath);
    }
  }
}
 
function parseActionCatalogIds(): string[] {
  if (!fs.existsSync(ACTION_CATALOG_FILE)) {
    throw new Error(`Action Catalog not found: ${ACTION_CATALOG_FILE}`);
  }
  const content = fs.readFileSync(ACTION_CATALOG_FILE, 'utf-8');
  return unique(
    content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('- '))
      .map((line) => line.replace(/^- /, '').trim())
      .filter((id) => id.includes('.'))
  );
}
 
function scanEndpointCapabilities(): string[] {
  const caps = new Set<string>();
  const regexCode = /requireCapability\(['"`]([^'"`]+)['"`]\)/g;
 
  for (const dir of SCAN_DIRS) {
    walkDir(dir, (filePath) => {
      if (!filePath.endsWith('.ts') && !filePath.endsWith('.js')) return;
      if (filePath.endsWith('.test.ts') || filePath.endsWith('.spec.ts')) return;
 
      const content = fs.readFileSync(filePath, 'utf-8');
      let match: RegExpExecArray | null;
      while ((match = regexCode.exec(content)) !== null) {
        const cap = String(match[1]).trim();
        if (!cap) continue;
        caps.add(cap);
      }
    });
  }
 
  return unique(Array.from(caps));
}
 
function domainOf(capability: string): string {
  const d = (CAPABILITY_DOMAIN_MAP as any)[capability] as string | undefined;
  if (!d) {
    throw new Error(`Domain not found for capability: ${capability}`);
  }
  return d;
}
 
function buildBaselines(catalogIds: string[]) {
  const guru = unique([
    'core.auth.logout',
    'core.sekolah.view.profile',
    'dashboard.view.overview',
    'academic.teaching.view',
    'academic.teaching.rekap',
    'attendance.sessions.create',
    'attendance.sessions.view.list',
    'attendance.sessions.view.detail',
    'attendance.recap.view.daily',
    'attendance.recap.view.monthly',
    'billing.my.subscription.view',
    'documents.upload',
    'documents.view.list',
    'notify.view.my',
    'notify.update.preferences',
  ]);
 
  const siswa = unique([
    'core.auth.logout',
    'core.sekolah.view.profile',
    'dashboard.view.overview',
    'attendance.recap.view.daily',
    'attendance.recap.view.monthly',
    'billing.my.subscription.view',
    'documents.view.list',
    'notify.view.my',
    'notify.update.preferences',
  ]);
 
  const adminDenylist = new Set<string>([
    'notify.view.my',
    'notify.update.preferences',
    'academic.teaching.view',
    'academic.teaching.rekap',
  ]);
 
  const superadmin = unique(
    catalogIds.filter((id) => {
      const d = domainOf(id);
      return d === 'PLATFORM' || d === 'SHARED';
    })
  );
 
  const admin = unique(
    catalogIds.filter((id) => {
      const d = domainOf(id);
      if (d === 'PLATFORM') return false;
      if (d === 'ORGANIZATIONAL') return false;
      if (d !== 'TENANT' && d !== 'SHARED') return false;
      return !adminDenylist.has(id);
    })
  );
 
  const ensureNoOrganizationalInBaseline = (role: string, baseline: string[]) => {
    const violating = baseline.filter((id) => domainOf(id) === 'ORGANIZATIONAL');
    if (violating.length > 0) {
      throw new Error(`Organizational capability found in baseline role ${role}: ${violating.join(', ')}`);
    }
  };
 
  ensureNoOrganizationalInBaseline('SUPERADMIN', superadmin);
  ensureNoOrganizationalInBaseline('ADMIN', admin);
  ensureNoOrganizationalInBaseline('GURU', guru);
  ensureNoOrganizationalInBaseline('SISWA', siswa);
 
  const ensureNoPlatformInTenantRoles = (role: string, baseline: string[]) => {
    const violating = baseline.filter((id) => domainOf(id) === 'PLATFORM');
    if (violating.length > 0) {
      throw new Error(`Platform capability found in tenant role ${role}: ${violating.join(', ')}`);
    }
  };
 
  ensureNoPlatformInTenantRoles('ADMIN', admin);
  ensureNoPlatformInTenantRoles('GURU', guru);
  ensureNoPlatformInTenantRoles('SISWA', siswa);
 
  const missingFromCatalog: Record<string, string[]> = {};
  const catalogSet = new Set(catalogIds);
  for (const [role, baseline] of Object.entries({ SUPERADMIN: superadmin, ADMIN: admin, GURU: guru, SISWA: siswa })) {
    const missing = baseline.filter((id) => !catalogSet.has(id));
    if (missing.length > 0) missingFromCatalog[role] = missing;
  }
  if (Object.keys(missingFromCatalog).length > 0) {
    throw new Error(`Baseline contains capability not in Action Catalog: ${JSON.stringify(missingFromCatalog)}`);
  }
 
  return { SUPERADMIN: superadmin, ADMIN: admin, GURU: guru, SISWA: siswa };
}
 
function collectOrganizationalCapabilities(): string[] {
  const caps = new Set<string>();
  Object.values(STRUKTUR_CAPABILITIES).forEach((list) => {
    list.forEach((cap) => caps.add(cap));
  });
  return unique(Array.from(caps));
}
 
function validateCoverage(endpointCaps: string[], coverageCaps: string[], catalogIds: string[]) {
  const coverage = new Set(coverageCaps);
  const catalogSet = new Set(catalogIds);
 
  const unknownEndpointCaps = endpointCaps.filter((cap) => !catalogSet.has(cap));
  if (unknownEndpointCaps.length > 0) {
    throw new Error(`Endpoint menggunakan capability yang tidak ada di Action Catalog: ${unknownEndpointCaps.join(', ')}`);
  }
 
  const missing = endpointCaps.filter((cap) => !coverage.has(cap));
  if (missing.length > 0) {
    throw new Error(`Endpoint capability tidak tercakup oleh baseline role + organizational capability: ${missing.join(', ')}`);
  }
}
 
async function run() {
  const catalogIds = parseActionCatalogIds();
  const endpointCaps = scanEndpointCapabilities();
  const baselines = buildBaselines(catalogIds);
  const organizationalCaps = collectOrganizationalCapabilities();
 
  const coverageCaps = unique([
    ...baselines.SUPERADMIN,
    ...baselines.ADMIN,
    ...baselines.GURU,
    ...baselines.SISWA,
    ...organizationalCaps,
  ]);
 
  validateCoverage(endpointCaps, coverageCaps, catalogIds);
 
  const report = `# RBAC Baseline Reconstruction Report
Generated on: ${new Date().toISOString()}
 
## Catalog Summary
- Total capability catalog: ${catalogIds.length}
 
## Baseline Size
- SUPERADMIN: ${baselines.SUPERADMIN.length}
- ADMIN: ${baselines.ADMIN.length}
- GURU: ${baselines.GURU.length}
- SISWA: ${baselines.SISWA.length}
 
## Coverage Validation
- Endpoint capability scanned: ${endpointCaps.length}
- Coverage set (roles + organizational): ${coverageCaps.length}
- Status: PASS
 
---
*End of Report*
`;
 
  fs.writeFileSync(OUTPUT_REPORT, report);
  console.log(`✅ Generated: ${OUTPUT_REPORT}`);
  console.log(`SUPERADMIN: ${baselines.SUPERADMIN.length}`);
  console.log(`ADMIN: ${baselines.ADMIN.length}`);
  console.log(`GURU: ${baselines.GURU.length}`);
  console.log(`SISWA: ${baselines.SISWA.length}`);
}
 
run().catch((err) => {
  console.error('RBAC baseline generator failed:', err);
  process.exit(1);
});
 
