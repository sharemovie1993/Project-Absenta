import fs from 'fs';
import path from 'path';

const BASE_DIR = path.join(__dirname, '../../');
const DOCS_DIR = path.join(BASE_DIR, 'docs');
const SCRIPTS_DIR = path.join(BASE_DIR, 'scripts');
const SRC_DIR = path.join(BASE_DIR, 'src');
const PRISMA_DIR = path.join(BASE_DIR, 'prisma');

const OUTPUT_REPORT = path.join(BASE_DIR, 'REPOSITORY_ARTIFACT_CLEANUP_REPORT.md');

const RUNTIME_FILES = new Set<string>([
  'docs/action_catalog.md',
  'src/config/position-capabilities.ts',
  'src/config/capability-domains.generated.ts',
  'prisma/seed_policies.ts',
  'scripts/audit/rbac-baseline-generator.ts',
  'scripts/audit/capability-domain-classifier.ts',
]);

const SAFE_DELETE_BASENAMES = new Set<string>([
  'CAPABILITY_NAMING_CLEANUP_SUGGESTION.md',
  'ACTION_CATALOG_CLEANUP_REPORT.md',
  'RBAC_CAPABILITY_AUDIT_REPORT.md',
  'RBAC_BASELINE_SUGGESTION.md',
  'RBAC_BASELINE_RECONSTRUCTION_REPORT.md',
  'action_catalog_cleaned.md',
  'capability_alias_map.json',
  'action_catalog_removed_capabilities.json',
  'capability_domain_map.json',
  'rbac_audit_result.json',
  'CAPABILITY_DOMAIN_CLASSIFICATION_REPORT.md',
]);

const KEEP_AUDIT_SCRIPTS = new Set<string>([
  'scripts/audit/rbac-baseline-generator.ts',
  'scripts/audit/capability-domain-classifier.ts',
]);

type ArtifactCategory = 'audit-report' | 'temporary-mapping' | 'legacy-reference' | 'experimental-script';
type ArtifactStatus = 'SAFE_TO_DELETE' | 'REVIEW_REQUIRED';

function normalizeRel(p: string): string {
  return path.relative(BASE_DIR, p).split(path.sep).join('/');
}

function listFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (current: string) => {
    if (!fs.existsSync(current)) return;
    const entries = fs.readdirSync(current);
    for (const name of entries) {
      const full = path.join(current, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        if (name === 'node_modules' || name === 'dist' || name === '.git') continue;
        walk(full);
      } else {
        out.push(full);
      }
    }
  };
  walk(dir);
  return out;
}

function classifyCategory(rel: string, base: string): ArtifactCategory | null {
  if (base.endsWith('_REPORT.md') || base.endsWith('_SUGGESTION.md') || base.includes('CLEANUP_REPORT')) return 'audit-report';
  if (base.endsWith('_map.json') || base.endsWith('_result.json') || base.includes('removed_capabilities') || base.includes('alias_map')) return 'temporary-mapping';
  if (base.includes('cleaned') || base.includes('legacy') || base.includes('mapping')) return 'legacy-reference';
  if (rel.startsWith('scripts/audit/') && (rel.endsWith('.ts') || rel.endsWith('.js'))) return 'experimental-script';
  return null;
}

function classifyStatus(rel: string, base: string): ArtifactStatus | null {
  if (RUNTIME_FILES.has(rel)) return null;
  if (SAFE_DELETE_BASENAMES.has(base)) return 'SAFE_TO_DELETE';
  if (rel.startsWith('scripts/audit/') && (rel.endsWith('.ts') || rel.endsWith('.js')) && !KEEP_AUDIT_SCRIPTS.has(rel)) {
    return 'REVIEW_REQUIRED';
  }
  if (base.startsWith('file_laporan_') && base.endsWith('.md')) return 'REVIEW_REQUIRED';
  return null;
}

function run() {
  const rootFiles = fs
    .readdirSync(BASE_DIR)
    .map((name) => path.join(BASE_DIR, name))
    .filter((p) => fs.existsSync(p) && fs.statSync(p).isFile());

  const docsFiles = listFiles(DOCS_DIR);
  const scriptsFiles = listFiles(SCRIPTS_DIR);
  const srcFiles = listFiles(SRC_DIR);
  const prismaFiles = listFiles(PRISMA_DIR);

  const allFiles = [...rootFiles, ...docsFiles, ...scriptsFiles, ...srcFiles, ...prismaFiles];
  const runtimeUsed = Array.from(RUNTIME_FILES)
    .filter((r) => fs.existsSync(path.join(BASE_DIR, r.split('/').join(path.sep))))
    .sort();

  const artifacts: Array<{ path: string; category: ArtifactCategory; status: ArtifactStatus }> = [];
  for (const filePath of allFiles) {
    const rel = normalizeRel(filePath);
    const base = path.basename(filePath);
    const status = classifyStatus(rel, base);
    if (!status) continue;
    const category = classifyCategory(rel, base);
    if (!category) continue;
    artifacts.push({ path: rel, category, status });
  }

  const safeToDelete = artifacts.filter((a) => a.status === 'SAFE_TO_DELETE').sort((a, b) => a.path.localeCompare(b.path));
  const reviewRequired = artifacts.filter((a) => a.status === 'REVIEW_REQUIRED').sort((a, b) => a.path.localeCompare(b.path));

  const reportLines: string[] = [];
  reportLines.push('# Repository Artifact Cleanup Report');
  reportLines.push(`Generated on: ${new Date().toISOString()}`);
  reportLines.push('');
  reportLines.push('## Summary');
  reportLines.push(`- Total files scanned: ${allFiles.length}`);
  reportLines.push(`- Runtime used files (tracked list): ${runtimeUsed.length}`);
  reportLines.push(`- Artifacts SAFE_TO_DELETE: ${safeToDelete.length}`);
  reportLines.push(`- Artifacts REVIEW_REQUIRED: ${reviewRequired.length}`);
  reportLines.push('');
  reportLines.push('## Runtime Used Files');
  for (const p of runtimeUsed) reportLines.push(`- ${p}`);
  reportLines.push('');
  reportLines.push('## Artifacts SAFE_TO_DELETE');
  if (safeToDelete.length === 0) reportLines.push('- None');
  for (const a of safeToDelete) reportLines.push(`- ${a.path} (${a.category})`);
  reportLines.push('');
  reportLines.push('## Artifacts REVIEW_REQUIRED');
  if (reviewRequired.length === 0) reportLines.push('- None');
  for (const a of reviewRequired) reportLines.push(`- ${a.path} (${a.category})`);
  reportLines.push('');

  fs.writeFileSync(OUTPUT_REPORT, reportLines.join('\n'));
  console.log(`✅ Generated: ${OUTPUT_REPORT}`);
}

run();
