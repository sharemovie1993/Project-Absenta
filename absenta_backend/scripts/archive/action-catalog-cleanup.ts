import fs from 'fs';
import path from 'path';

const BASE_DIR = path.join(__dirname, '../../');
const SRC_DIR = path.join(BASE_DIR, 'src');
const PRISMA_DIR = path.join(BASE_DIR, 'prisma');
const DOCS_DIR = path.join(BASE_DIR, 'docs');

const CATALOG_FILE = path.join(DOCS_DIR, 'action_catalog_canonical_futureproof.md');
const SEED_FILE = path.join(PRISMA_DIR, 'seed.ts');
const SEED_POLICIES_FILE = path.join(PRISMA_DIR, 'seed_policies.ts');
const CAPABILITIES_CONFIG_FILE = path.join(SRC_DIR, 'config/capabilities.ts');

const SCAN_DIRS = [
  path.join(SRC_DIR, 'modules'),
  path.join(SRC_DIR, 'controllers'),
  path.join(SRC_DIR, 'services'),
  path.join(SRC_DIR, 'routes'),
  path.join(SRC_DIR, 'middlewares'),
];

const REPORT_MD = path.join(BASE_DIR, 'ACTION_CATALOG_CLEANUP_REPORT.md');
const CLEANED_CATALOG_MD = path.join(BASE_DIR, 'action_catalog_cleaned.md');
const REMOVED_JSON = path.join(BASE_DIR, 'action_catalog_removed_capabilities.json');

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

function getUsedCapabilities() {
  const endpointCaps = new Set<string>();
  const menuCaps = new Set<string>();
  const roleCaps = new Set<string>();
  const organizationalCaps = new Set<string>();

  const regexCode = /requireCapability\(['"`]([^'"`]+)['"`]\)/g;
  for (const dir of SCAN_DIRS) {
    walkDir(dir, (filePath) => {
      if (filePath.endsWith('.ts') || filePath.endsWith('.js')) {
        const content = fs.readFileSync(filePath, 'utf-8');
        let match;
        while ((match = regexCode.exec(content)) !== null) {
          endpointCaps.add(match[1]);
        }
      }
    });
  }

  if (fs.existsSync(SEED_FILE)) {
    const content = fs.readFileSync(SEED_FILE, 'utf-8');
    const regexMenu = /required_capability:\s*['"`]([^'"`]+)['"`]/g;
    let match;
    while ((match = regexMenu.exec(content)) !== null) {
      if (match[1] !== 'null') menuCaps.add(match[1]);
    }
  }

  if (fs.existsSync(SEED_POLICIES_FILE)) {
    const content = fs.readFileSync(SEED_POLICIES_FILE, 'utf-8');
    const regexPolicies = /['"`]([a-zA-Z0-9._-]+)['"`]/g;
    let match;
    while ((match = regexPolicies.exec(content)) !== null) {
      if (match[1].includes('.')) roleCaps.add(match[1]);
    }
  }

  if (fs.existsSync(CAPABILITIES_CONFIG_FILE)) {
    const content = fs.readFileSync(CAPABILITIES_CONFIG_FILE, 'utf-8');
    const regexOrg = /['"`]([a-zA-Z0-9._-]+)['"`]/g;
    let match;
    while ((match = regexOrg.exec(content)) !== null) {
      if (match[1].includes('.')) organizationalCaps.add(match[1]);
    }
  }

  return {
    endpointCaps: Array.from(endpointCaps),
    menuCaps: Array.from(menuCaps),
    roleCaps: Array.from(roleCaps),
    organizationalCaps: Array.from(organizationalCaps),
    allUsed: Array.from(new Set([...endpointCaps, ...menuCaps, ...roleCaps, ...organizationalCaps])),
  };
}

function parseCatalog() {
  if (!fs.existsSync(CATALOG_FILE)) return [];
  const content = fs.readFileSync(CATALOG_FILE, 'utf-8');
  const lines = content.split('\n');
  const capabilities: { id: string; group: string; line: string }[] = [];
  let currentGroup = 'General';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('## ')) {
      currentGroup = trimmed.replace('## ', '');
    }
    if (trimmed.startsWith('- ')) {
      const id = trimmed.replace('- ', '').trim();
      if (id.includes('.')) {
        capabilities.push({ id, group: currentGroup, line });
      }
    }
  }
  return capabilities;
}

async function runCleanup() {
  console.log('🔍 Starting Action Catalog Cleanup...');

  const usage = getUsedCapabilities();
  const catalog = parseCatalog();
  const catalogIds = catalog.map((c) => c.id);

  const unusedCapabilities = catalog.filter((c) => !usage.allUsed.includes(c.id));
  const missingFromCatalog = usage.allUsed.filter((id) => !catalogIds.includes(id));

  const removedData = {
    removed: unusedCapabilities.map((c) => c.id),
  };
  fs.writeFileSync(REMOVED_JSON, JSON.stringify(removedData, null, 2));
  console.log(`✅ Generated: ${REMOVED_JSON}`);

  const cleanedCatalogContent: string[] = [];
  const content = fs.readFileSync(CATALOG_FILE, 'utf-8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('- ')) {
      const id = trimmed.replace('- ', '').trim();
      if (usage.allUsed.includes(id)) {
        cleanedCatalogContent.push(line);
      }
    } else {
      cleanedCatalogContent.push(line);
    }
  }

  const finalCleaned = cleanedCatalogContent.join('\n');

  fs.writeFileSync(CLEANED_CATALOG_MD, finalCleaned);
  console.log(`✅ Generated: ${CLEANED_CATALOG_MD}`);

  const reportContent = `# Action Catalog Cleanup Report
Generated on: ${new Date().toISOString()}

## Summary Statistics
- Total Capabilities in Catalog: ${catalog.length}
- Total Capabilities Used in App: ${usage.allUsed.length}
- Total Capabilities Removed: ${unusedCapabilities.length}
- Total Capabilities Missing from Catalog: ${missingFromCatalog.length}

## Used Breakdown
- Endpoints: ${usage.endpointCaps.length}
- Menu: ${usage.menuCaps.length}
- Role Baseline: ${usage.roleCaps.length}
- Organizational: ${usage.organizationalCaps.length}

## Unused Capabilities (Removed)
${unusedCapabilities.length > 0 ? unusedCapabilities.map((c) => `- \`${c.id}\` (${c.group})`).join('\n') : '*None*'}

## Missing From Catalog (Errors)
These capabilities are used in the app but NOT present in the catalog.
${missingFromCatalog.length > 0 ? missingFromCatalog.map((id) => `- \`${id}\``).join('\n') : '*None*'}

---
*End of Report*
`;
  fs.writeFileSync(REPORT_MD, reportContent);
  console.log(`✅ Generated: ${REPORT_MD}`);

  if (missingFromCatalog.length > 0) {
    console.error(`❌ Validation Failed: ${missingFromCatalog.length} capabilities used in app are missing from catalog.`);
  }

  console.log('\n--- Cleanup Summary ---');
  console.log(`Catalog: ${catalog.length}`);
  console.log(`Used: ${usage.allUsed.length}`);
  console.log(`Removed: ${unusedCapabilities.length}`);
  console.log(`Missing: ${missingFromCatalog.length}`);
}

runCleanup().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});

