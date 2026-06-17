import fs from 'fs';
import path from 'path';

const BASE_DIR = path.join(__dirname, '../../');
const SRC_DIR = path.join(BASE_DIR, 'src');
const PRISMA_DIR = path.join(BASE_DIR, 'prisma');

const ALIAS_MAP_FILE = path.join(BASE_DIR, 'capability_alias_map.json');
const SEED_FILE = path.join(PRISMA_DIR, 'seed.ts');
const SEED_POLICIES_FILE = path.join(PRISMA_DIR, 'seed_policies.ts');
const CAPABILITIES_CONFIG_FILE = path.join(SRC_DIR, 'config/capabilities.ts');
const CATALOG_FILE = path.join(BASE_DIR, 'docs/action_catalog_canonical_futureproof.md');

const SCAN_DIRS = [
  path.join(SRC_DIR, 'modules'),
  path.join(SRC_DIR, 'controllers'),
  path.join(SRC_DIR, 'services'),
  path.join(SRC_DIR, 'routes'),
  path.join(SRC_DIR, 'middleware'),
  path.join(SRC_DIR, 'middlewares'),
];

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

async function runRefactor() {
  console.log('🚀 Starting Capability Naming Refactor...');

  if (!fs.existsSync(ALIAS_MAP_FILE)) {
    console.error('❌ Alias map file not found!');
    process.exit(1);
  }

  const aliasMap = JSON.parse(fs.readFileSync(ALIAS_MAP_FILE, 'utf-8'));
  const changedFiles: string[] = [];

  for (const dir of SCAN_DIRS) {
    walkDir(dir, (filePath) => {
      if (filePath.endsWith('.ts') || filePath.endsWith('.js')) {
        let content = fs.readFileSync(filePath, 'utf-8');
        const originalContent = content;

        for (const [oldCap, newCap] of Object.entries(aliasMap)) {
          const regex = new RegExp(`requireCapability\\(['"\`]${(oldCap as string).replace(/\./g, '\\.')}['"\`]\\)`, 'g');
          content = content.replace(regex, `requireCapability("${newCap}")`);
        }

        if (content !== originalContent) {
          fs.writeFileSync(filePath, content);
          changedFiles.push(filePath);
          console.log(`✅ Refactored: ${path.relative(BASE_DIR, filePath)}`);
        }
      }
    });
  }

  if (fs.existsSync(SEED_FILE)) {
    let content = fs.readFileSync(SEED_FILE, 'utf-8');
    const originalContent = content;

    for (const [oldCap, newCap] of Object.entries(aliasMap)) {
      const regex = new RegExp(`required_capability:\\s*['"\`]${(oldCap as string).replace(/\./g, '\\.')}['"\`]`, 'g');
      content = content.replace(regex, `required_capability: "${newCap}"`);
    }

    if (content !== originalContent) {
      fs.writeFileSync(SEED_FILE, content);
      changedFiles.push(SEED_FILE);
      console.log(`✅ Refactored: ${path.relative(BASE_DIR, SEED_FILE)}`);
    }
  }

  if (fs.existsSync(SEED_POLICIES_FILE)) {
    let content = fs.readFileSync(SEED_POLICIES_FILE, 'utf-8');
    const originalContent = content;

    for (const [oldCap, newCap] of Object.entries(aliasMap)) {
      const regex = new RegExp(`['"\`]${(oldCap as string).replace(/\./g, '\\.')}['"\`]`, 'g');
      content = content.replace(regex, `"${newCap}"`);
    }

    if (content !== originalContent) {
      fs.writeFileSync(SEED_POLICIES_FILE, content);
      changedFiles.push(SEED_POLICIES_FILE);
      console.log(`✅ Refactored: ${path.relative(BASE_DIR, SEED_POLICIES_FILE)}`);
    }
  }

  if (fs.existsSync(CAPABILITIES_CONFIG_FILE)) {
    let content = fs.readFileSync(CAPABILITIES_CONFIG_FILE, 'utf-8');
    const originalContent = content;

    for (const [oldCap, newCap] of Object.entries(aliasMap)) {
      const regex = new RegExp(`['"\`]${(oldCap as string).replace(/\./g, '\\.')}['"\`]`, 'g');
      content = content.replace(regex, `"${newCap}"`);
    }

    if (content !== originalContent) {
      fs.writeFileSync(CAPABILITIES_CONFIG_FILE, content);
      changedFiles.push(CAPABILITIES_CONFIG_FILE);
      console.log(`✅ Refactored: ${path.relative(BASE_DIR, CAPABILITIES_CONFIG_FILE)}`);
    }
  }

  if (fs.existsSync(CATALOG_FILE)) {
    let content = fs.readFileSync(CATALOG_FILE, 'utf-8');
    const originalContent = content;

    for (const [oldCap, newCap] of Object.entries(aliasMap)) {
      const regex = new RegExp(`^- ${(oldCap as string).replace(/\./g, '\\.')}$`, 'gm');
      content = content.replace(regex, `- ${newCap}`);
    }

    if (content !== originalContent) {
      fs.writeFileSync(CATALOG_FILE, content);
      changedFiles.push(CATALOG_FILE);
      console.log(`✅ Refactored: ${path.relative(BASE_DIR, CATALOG_FILE)}`);
    }
  }

  console.log('\n--- Refactor Summary ---');
  console.log(`Total Files Changed: ${changedFiles.length}`);
  console.log(`Total Refactors Applied: ${Object.keys(aliasMap).length}`);
}

runRefactor().catch((err) => {
  console.error('Refactor failed:', err);
  process.exit(1);
});

