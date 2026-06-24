import fs from 'fs';
import path from 'path';
import { STRUKTUR_CAPABILITIES } from '../../src/config/position-capabilities';

/**
 * Capability Domain Classifier Script
 * Aligned with docs/07 Layer Service Access/24 Instruksi Implementasi – Capability Domain Classification (PLATFORM vs TENANT).md
 */

const BASE_DIR = path.join(__dirname, '../../');
const SRC_DIR = path.join(BASE_DIR, 'src');
const DOCS_DIR = path.join(BASE_DIR, 'docs');

const CATALOG_FILE = path.join(DOCS_DIR, 'action_catalog.md');
const GENERATED_TS = path.join(SRC_DIR, 'config/capability-domains.generated.ts');
const OUTPUT_JSON = path.join(BASE_DIR, 'capability_domain_map.json');
const REPORT_MD = path.join(BASE_DIR, 'CAPABILITY_DOMAIN_CLASSIFICATION_REPORT.md');

// Classification Rules
const RULES = {
  PLATFORM: [
    'superadmin.',
    'core.tenants.',
    'platform.',
    'system.',
    'billing.plans.',
    'billing.revenue.',
    'billing.monitoring.',
    'billing.manage.',
    'billing.view.',
    'billing.reports.',
    'core.system.'
  ],
  TENANT: [
    'academic.',
    'attendance.',
    'cooperative.',
    'documents.',
    'reports.',
    'sarpras.',
    'hubin.',
    'tu.',
    'affairs.',
    'curriculum.',
    'kesiswaan.',
    'kurikulum.',
    'cadangan.',
    'payment.',
    'bk.'
  ],
  SHARED: [
    'dashboard.',
    'notify.',
    'core.auth.',
    'core.users.',
    'core.menu.',
    'billing.my.subscription.',
    'billing.my.invoice.',
    'core.sekolah.',
    'consent.',
    'billing.subscriptions.',
    'billing.invoices.',
    'billing.payments.',
    'billing.billings.',
    'core.system.config.view',
    'core.system.config.update',
    'core.tenants.view.list',
    'core.tenants.view.detail',
    'cooperative.announcements.view.list',
    'academic.years.view.list',
    'attendance.student.view.stats'
  ]
};

// 1. Get Organizational Capabilities
const organizationalCaps = new Set<string>();
Object.values(STRUKTUR_CAPABILITIES).forEach(caps => {
  caps.forEach(cap => organizationalCaps.add(cap));
});

const ORGANIZATIONAL_ALLOWLIST_NON_ORG_DOMAIN = new Set<string>([
  'attendance.recap.view.daily',
  'attendance.recap.view.monthly',
  'attendance.reports.view',
  'attendance.sessions.create',
  'academic.students.view.list',
  'academic.teaching.rekap',
  'attendance.officers.manage',
  'academic.teaching.view',
  'academic.years.view.list',
  'bk.cases.view.list',
  'bk.cases.view.detail',
  'academic.semesters.view.list',
  'hubin.pkl.view.list',
  'hubin.view.pkl',
  'attendance.student.view.stats',
  'hubin.absensi.recap',
  'attendance.piket.manage',
  'attendance.piket.view',
  'reports.attendance.view',
  'sarpras.inventory.manage',
  'sarpras.loans.manage',
  'sarpras.categories.manage',
  'sarpras.locations.manage',
  'sarpras.repairs.manage',
  'sarpras.inventory.view.list',
  'sarpras.view_inventory',
  'sarpras.loans.view.list',
  'sarpras.repairs.view.list',
  'hubin.partners.manage',
  'hubin.mou.view.list',
  'tu.finance.manage',
  'tu.letters.manage',
  'tu.staff.view.list',
  'academic.structure.manage',
  'dashboard.view.kepsek',
  'dashboard.view.kurikulum',
  'dashboard.view.kesiswaan',
  'dashboard.view.walikelas',
  'dashboard.view.hubin',
  'dashboard.view.sarpras',
  'dashboard.view.tu',
  'dashboard.view.petugas',
  'dashboard.view.gerbang',
  'academic.teachers.view.list',
  'academic.teachers.view.detail',
  'academic.students.view.detail',
  'academic.activities.view.grouped',
  'academic.activities.view.list',
  'attendance.schedules.view.list',
  'hubin.absensi.view.history',
  'academic.structures.view.list',
  'academic.structures.view.tree',
  'academic.students.view.history',
  'affairs.violation.types.view.list',
  'affairs.violations.view.list',
  'dashboard.view.teacher.attendance',
  'dashboard.view.guru',
  'attendance.sessions.view.detail',
  'attendance.sessions.view.list',
  'affairs.violations.view.detail',
  'dashboard.view.overview',
  'academic.subjects.view.list',
  'attendance.sessions.update.journal',
  'core.tenants.view.detail',
  'cooperative.dashboard.view.overview',
  'cooperative.savings.view.history',
  'cooperative.points.view',
  'cooperative.store.view.catalog',
  'cooperative.announcements.view.list',
  'cooperative.savings.view.detail',
  'cooperative.loans.apply',
  'cooperative.loans.view.list',
  'cooperative.loans.view.detail',
]);

const organizationalCapsStrict = new Set<string>(
  Array.from(organizationalCaps).filter((cap) => !ORGANIZATIONAL_ALLOWLIST_NON_ORG_DOMAIN.has(cap))
);

// 2. Parse Action Catalog
function parseCatalog(): string[] {
  if (!fs.existsSync(CATALOG_FILE)) return [];
  const content = fs.readFileSync(CATALOG_FILE, 'utf-8');
  return content.split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('- '))
    .map(line => line.replace('- ', '').trim())
    .filter(cap => cap.includes('.'));
}

async function classify() {
  console.log('🔍 Starting Capability Domain Classification...');
  
  const catalog = parseCatalog();
  const domainMap: Record<string, string> = {};
  const conflicts: string[] = [];
  const unclassified: string[] = [];

  catalog.forEach(cap => {
    let assignedDomain: string | null = null;

    // Rule D: Organizational (Priority check or just classification?)
    // The instruction says "Capability tidak boleh berada di lebih dari satu domain."
    // And "Organizational capability tidak boleh berada di PLATFORM."
    
    const isOrganizational = organizationalCapsStrict.has(cap);
    
    // Check RULES
    let ruleDomain: string | null = null;
    for (const [domain, prefixes] of Object.entries(RULES)) {
      if (prefixes.some(prefix => cap.startsWith(prefix))) {
        if (ruleDomain) {
          conflicts.push(`${cap} (Multiple Rule Domains: ${ruleDomain}, ${domain})`);
        }
        ruleDomain = domain;
      }
    }

    if (isOrganizational) {
      if (ruleDomain === 'PLATFORM') {
        conflicts.push(`${cap} (Organizational in PLATFORM domain)`);
      }
      assignedDomain = 'ORGANIZATIONAL';
    } else {
      assignedDomain = ruleDomain;
    }

    if (!assignedDomain) {
      unclassified.push(cap);
      domainMap[cap] = 'UNCLASSIFIED';
    } else {
      domainMap[cap] = assignedDomain;
    }
  });

  // Generate Files
  
  // 1. TS Generated
  const tsContent = `/**
 * GENERATED FILE - DO NOT EDIT DIRECTLY
 * Generated by scripts/audit/capability-domain-classifier.ts
 */

export const CAPABILITY_DOMAIN_MAP: Record<string, string> = ${JSON.stringify(domainMap, null, 2)};
`;
  fs.writeFileSync(GENERATED_TS, tsContent);
  console.log(`✅ Generated: ${GENERATED_TS}`);

  // 2. JSON Map
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(domainMap, null, 2));
  console.log(`✅ Generated: ${OUTPUT_JSON}`);

  // 3. Report MD
  const stats = {
    PLATFORM: 0,
    TENANT: 0,
    SHARED: 0,
    ORGANIZATIONAL: 0,
    UNCLASSIFIED: 0
  };

  Object.values(domainMap).forEach(d => {
    if (d in stats) stats[d as keyof typeof stats]++;
  });

  const reportContent = `# Capability Domain Classification Report
Generated on: ${new Date().toISOString()}

## Summary Statistics
Total Catalog: ${catalog.length}

- PLATFORM: ${stats.PLATFORM}
- TENANT: ${stats.TENANT}
- SHARED: ${stats.SHARED}
- ORGANIZATIONAL: ${stats.ORGANIZATIONAL}
- UNCLASSIFIED: ${stats.UNCLASSIFIED}

## Validation Results
- Conflicts: ${conflicts.length}
${conflicts.length > 0 ? conflicts.map(c => `- ${c}`).join('\n') : '*None*'}

## Unclassified Capabilities
${unclassified.length > 0 ? unclassified.map(c => `- ${c}`).join('\n') : '*None*'}

---
*End of Report*
`;
  fs.writeFileSync(REPORT_MD, reportContent);
  console.log(`✅ Generated: ${REPORT_MD}`);

  console.log('\n--- Classification Summary ---');
  console.log(`Total: ${catalog.length}`);
  console.log(`PLATFORM: ${stats.PLATFORM}`);
  console.log(`TENANT: ${stats.TENANT}`);
  console.log(`SHARED: ${stats.SHARED}`);
  console.log(`ORGANIZATIONAL: ${stats.ORGANIZATIONAL}`);
  console.log(`UNCLASSIFIED: ${stats.UNCLASSIFIED}`);
}

classify().catch(err => {
  console.error('Classification failed:', err);
  process.exit(1);
});
