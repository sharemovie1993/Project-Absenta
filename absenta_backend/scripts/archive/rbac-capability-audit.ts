import fs from 'fs';
import path from 'path';

const BASE_DIR = path.join(__dirname, '../../');
const SRC_DIR = path.join(BASE_DIR, 'src');
const PRISMA_DIR = path.join(BASE_DIR, 'prisma');
const DOCS_DIR = path.join(BASE_DIR, 'docs');

const SCAN_DIRS = [
  path.join(SRC_DIR, 'modules'),
  path.join(SRC_DIR, 'controllers'),
  path.join(SRC_DIR, 'services'),
  path.join(SRC_DIR, 'routes'),
  path.join(SRC_DIR, 'middlewares'),
];

const CATALOG_FILE = path.join(DOCS_DIR, 'action_catalog_canonical_futureproof.md');
const SEED_FILE = path.join(PRISMA_DIR, 'seed.ts');
const SEED_POLICIES_FILE = path.join(PRISMA_DIR, 'seed_policies.ts');
const CAPABILITIES_CONFIG_FILE = path.join(SRC_DIR, 'config/capabilities.ts');

const OUTPUT_MD = path.join(BASE_DIR, 'RBAC_CAPABILITY_AUDIT_REPORT.md');
const SUGGESTION_MD = path.join(BASE_DIR, 'RBAC_BASELINE_SUGGESTION.md');
const OUTPUT_JSON = path.join(BASE_DIR, 'rbac_audit_result.json');

function walkDir(dir: string, callback: (filePath: string) => void) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath, callback);
    } else {
      callback(filePath);
    }
  }
}

function scanEndpointCapabilities(): string[] {
  const capabilities = new Set<string>();
  const regex = /requireCapability\(['"`]([^'"`]+)['"`]\)/g;

  for (const dir of SCAN_DIRS) {
    walkDir(dir, (filePath) => {
      if (filePath.endsWith('.ts') || filePath.endsWith('.js')) {
        const content = fs.readFileSync(filePath, 'utf-8');
        let match;
        while ((match = regex.exec(content)) !== null) {
          capabilities.add(match[1]);
        }
      }
    });
  }
  return Array.from(capabilities).sort();
}

function scanMenuCapabilities(): string[] {
  const capabilities = new Set<string>();
  if (!fs.existsSync(SEED_FILE)) return [];

  const content = fs.readFileSync(SEED_FILE, 'utf-8');
  const regex = /required_capability:\s*['"`]([^'"`]+)['"`]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (match[1] !== 'null') {
      capabilities.add(match[1]);
    }
  }
  return Array.from(capabilities).sort();
}

function scanRoleBaselineCapabilities(): string[] {
  const capabilities = new Set<string>();
  if (!fs.existsSync(SEED_POLICIES_FILE)) return [];

  const content = fs.readFileSync(SEED_POLICIES_FILE, 'utf-8');
  const startIdx = content.indexOf('const ROLE_CAPABILITIES');
  if (startIdx === -1) return [];

  const endIdx = content.indexOf('};', startIdx);
  const roleSection = content.substring(startIdx, endIdx + 2);

  const regex = /['"`]([a-zA-Z0-9._-]+)['"`]/g;
  let match;
  while ((match = regex.exec(roleSection)) !== null) {
    if (match[1].includes('.')) {
      capabilities.add(match[1]);
    }
  }
  return Array.from(capabilities).sort();
}

function scanOrganizationalCapabilities(): string[] {
  const capabilities = new Set<string>();
  if (!fs.existsSync(CAPABILITIES_CONFIG_FILE)) return [];

  const content = fs.readFileSync(CAPABILITIES_CONFIG_FILE, 'utf-8');
  const startIdx = content.indexOf('export const STRUKTUR_CAPABILITIES');
  if (startIdx === -1) return [];

  const endIdx = content.lastIndexOf('};');
  const section = content.substring(startIdx, endIdx + 2);

  const regex = /['"`]([a-zA-Z0-9._-]+)['"`]/g;
  let match;
  while ((match = regex.exec(section)) !== null) {
    if (match[1].includes('.')) {
      capabilities.add(match[1]);
    }
  }
  return Array.from(capabilities).sort();
}

function parseCatalogCapabilities(): string[] {
  if (!fs.existsSync(CATALOG_FILE)) return [];

  const content = fs.readFileSync(CATALOG_FILE, 'utf-8');
  const lines = content.split('\n');
  const capabilities: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ')) {
      const cap = trimmed.replace('- ', '').trim();
      if (cap && cap.includes('.')) {
        capabilities.push(cap);
      }
    }
  }
  return capabilities.sort();
}

async function runAudit() {
  console.log('🔍 Starting RBAC Capability Audit...');

  const endpointCapabilities = scanEndpointCapabilities();
  const menuCapabilities = scanMenuCapabilities();
  const roleBaselineCapabilities = scanRoleBaselineCapabilities();
  const organizationalCapabilities = scanOrganizationalCapabilities();
  const catalogCapabilities = parseCatalogCapabilities();

  const allUsedCapabilities = Array.from(
    new Set([...endpointCapabilities, ...menuCapabilities, ...roleBaselineCapabilities, ...organizationalCapabilities])
  ).sort();

  const missingFromCatalog = allUsedCapabilities.filter((c) => !catalogCapabilities.includes(c));
  const unusedCatalogCapabilities = catalogCapabilities.filter((c) => !allUsedCapabilities.includes(c));
  const missingRoleBaseline = endpointCapabilities.filter((c) => !roleBaselineCapabilities.includes(c));
  const menuOrphanCapabilities = menuCapabilities.filter((c) => !endpointCapabilities.includes(c));

  const results = {
    catalogCapabilities,
    endpointCapabilities,
    menuCapabilities,
    roleBaselineCapabilities,
    organizationalCapabilities,
    missingFromCatalog,
    missingRoleBaseline,
    unusedCatalogCapabilities,
    menuOrphanCapabilities,
  };

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(results, null, 2));
  console.log(`✅ Result JSON generated: ${OUTPUT_JSON}`);

  const reportContent = `# RBAC Capability Audit Report
Generated on: ${new Date().toISOString()}

## Summary Statistics
- Total Capabilities in Action Catalog: ${catalogCapabilities.length}
- Total Capabilities Used in Endpoints: ${endpointCapabilities.length}
- Total Capabilities Used in Menu: ${menuCapabilities.length}
- Total Capabilities in Role Baseline: ${roleBaselineCapabilities.length}
- Total Capabilities in Organizational Structure: ${organizationalCapabilities.length}
- Total Unique Used Capabilities: ${allUsedCapabilities.length}

## A. Missing From Catalog
${missingFromCatalog.length > 0 ? missingFromCatalog.map((c) => `- ${c}`).join('\n') : '*None*'}

## B. Unused Catalog Capabilities
${unusedCatalogCapabilities.length > 0 ? unusedCatalogCapabilities.map((c) => `- ${c}`).join('\n') : '*None*'}

## C. Missing Role Baseline
${missingRoleBaseline.length > 0 ? missingRoleBaseline.map((c) => `- ${c}`).join('\n') : '*None*'}

## D. Menu Orphan Capabilities
${menuOrphanCapabilities.length > 0 ? menuOrphanCapabilities.map((c) => `- ${c}`).join('\n') : '*None*'}

---
*End of Report*
`;
  fs.writeFileSync(OUTPUT_MD, reportContent);
  console.log(`✅ Audit Report MD generated: ${OUTPUT_MD}`);

  const suggestionContent = `# RBAC Baseline Suggestion
This document suggests a canonical baseline for roles based on actual endpoint usage.

## ADMIN (Suggested Complete)

\`\`\`
${endpointCapabilities.join('\n')}
\`\`\`

## Missing from Current Baseline

\`\`\`
${missingRoleBaseline.join('\n')}
\`\`\`
`;
  fs.writeFileSync(SUGGESTION_MD, suggestionContent);
  console.log(`✅ Baseline Suggestion MD generated: ${SUGGESTION_MD}`);

  console.log('\n--- Audit Results Summary ---');
  console.log(`Catalog: ${catalogCapabilities.length}`);
  console.log(`Missing from Catalog: ${missingFromCatalog.length}`);
  console.log(`Missing from Baseline: ${missingRoleBaseline.length}`);
  console.log(`Unused in Catalog: ${unusedCatalogCapabilities.length}`);
  console.log(`Menu Orphans: ${menuOrphanCapabilities.length}`);
}

runAudit().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});

