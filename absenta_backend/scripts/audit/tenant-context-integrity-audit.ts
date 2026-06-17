import fs from 'fs';
import path from 'path';
import { CAPABILITY_DOMAIN_MAP } from '../../src/config/capability-domains.generated';

const BASE_DIR = path.join(__dirname, '../../');
const SRC_DIR = path.join(BASE_DIR, 'src');
const OUTPUT_MD = path.join(BASE_DIR, 'TENANT_CONTEXT_INTEGRITY_AUDIT.md');

const SCAN_DIRS = [
  path.join(SRC_DIR, 'modules'),
  path.join(SRC_DIR, 'controllers'),
  path.join(SRC_DIR, 'services'),
  path.join(SRC_DIR, 'routes'),
  path.join(SRC_DIR, 'middleware'),
  path.join(SRC_DIR, 'middlewares'),
];

type Finding = {
  file: string;
  classification: 'SAFE' | 'TENANT_CONTEXT_VIOLATION' | 'REVIEW_REQUIRED';
  reasons: string[];
  platformCaps: string[];
};

function normalizeRel(p: string): string {
  return path.relative(BASE_DIR, p).split(path.sep).join('/');
}

function walkDir(dir: string, cb: (filePath: string) => void) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist' || entry === '.git' || entry === '__tests__') continue;
      walkDir(full, cb);
    } else {
      cb(full);
    }
  }
}

function domainOf(capability: string): string {
  const d = (CAPABILITY_DOMAIN_MAP as any)[capability] as string | undefined;
  return d || 'UNKNOWN';
}

function extractCapabilitiesUsed(content: string): string[] {
  const caps = new Set<string>();
  const re = /requireCapability\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const cap = String(m[1]).trim();
    if (cap) caps.add(cap);
  }
  return Array.from(caps);
}

function classifyFile(filePath: string, content: string): Finding | null {
  const rel = normalizeRel(filePath);

  if (!rel.endsWith('.ts') && !rel.endsWith('.js')) return null;
  if (rel.endsWith('.spec.ts') || rel.endsWith('.test.ts')) return null;

  const usesMiddlewareTenant = /\b(request|req)\.tenantId\b/.test(content);

  const violations: string[] = [];
  const forbiddenPatterns: Array<{ re: RegExp; reason: string }> = [
    { re: /\b(request|req)\.params\.(tenantId|tenant_id)\b/g, reason: 'tenant dari params' },
    { re: /\b(request|req)\.query\.(tenantId|tenant_id)\b/g, reason: 'tenant dari query' },
    { re: /\b(request|req)\.body\.(tenantId|tenant_id)\b/g, reason: 'tenant dari body' },
    { re: /\bconst\s+\{\s*tenantId\s*\}\s*=\s*(request|req)\.params\b/g, reason: 'tenantId destructure dari params' },
    { re: /\bconst\s+\{\s*tenant_id\s*\}\s*=\s*(request|req)\.body\b/g, reason: 'tenant_id destructure dari body' },
    { re: /\btenantId\s*=\s*(request|req)\.params\.(tenantId|tenant_id)\b/g, reason: 'assign tenantId dari params' },
    { re: /\btenantId\s*=\s*(request|req)\.query\.(tenantId|tenant_id)\b/g, reason: 'assign tenantId dari query' },
    { re: /\btenantId\s*=\s*(request|req)\.body\.(tenantId|tenant_id)\b/g, reason: 'assign tenantId dari body' },
    { re: /\btenant_id\s*=\s*(request|req)\.params\.(tenantId|tenant_id)\b/g, reason: 'assign tenant_id dari params' },
    { re: /\btenant_id\s*=\s*(request|req)\.query\.(tenantId|tenant_id)\b/g, reason: 'assign tenant_id dari query' },
    { re: /\btenant_id\s*=\s*(request|req)\.body\.(tenantId|tenant_id)\b/g, reason: 'assign tenant_id dari body' },
    { re: /\bconst\s+params\s*=\s*(request|req)\.params\b[\s\S]*?\bparams\??\.(tenantId|tenant_id)\b/g, reason: 'tenant dari params (via params variable)' },
    { re: /\bconst\s+body\s*=\s*(request|req)\.body\b[\s\S]*?\bbody\??\.(tenantId|tenant_id)\b/g, reason: 'tenant dari body (via body variable)' },
    { re: /\bconst\s+query\s*=\s*(request|req)\.query\b[\s\S]*?\bquery\??\.(tenantId|tenant_id)\b/g, reason: 'tenant dari query (via query variable)' },
  ];

  for (const p of forbiddenPatterns) {
    if (p.re.test(content)) violations.push(p.reason);
  }

  const caps = extractCapabilitiesUsed(content);
  const platformCaps = caps.filter((c) => domainOf(c) === 'PLATFORM');
  const isPlatformFile =
    platformCaps.length > 0 ||
    rel.includes('/modules/superadmin/') ||
    rel.includes('/superadmin/') ||
    content.includes('/api/superadmin/');

  if (violations.length === 0) {
    return {
      file: rel,
      classification: 'SAFE',
      reasons: usesMiddlewareTenant ? ['tenant dari middleware (request.tenantId)'] : ['tidak ada pola tenant dari request input'],
      platformCaps,
    };
  }

  return {
    file: rel,
    classification: isPlatformFile ? 'REVIEW_REQUIRED' : 'TENANT_CONTEXT_VIOLATION',
    reasons: violations,
    platformCaps,
  };
}

function run() {
  const findings: Finding[] = [];
  for (const dir of SCAN_DIRS) {
    walkDir(dir, (filePath) => {
      const rel = normalizeRel(filePath);
      if (!rel.endsWith('.ts') && !rel.endsWith('.js')) return;
      const content = fs.readFileSync(filePath, 'utf-8');
      const f = classifyFile(filePath, content);
      if (!f) return;
      findings.push(f);
    });
  }

  const total = findings.length;
  const safe = findings.filter((f) => f.classification === 'SAFE');
  const viol = findings.filter((f) => f.classification === 'TENANT_CONTEXT_VIOLATION');
  const review = findings.filter((f) => f.classification === 'REVIEW_REQUIRED');

  const lines: string[] = [];
  lines.push('# TENANT CONTEXT INTEGRITY AUDIT');
  lines.push(`Generated on: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Summary');
  lines.push(`Total endpoints scanned: ${total}`);
  lines.push('');
  lines.push(`SAFE: ${safe.length}`);
  lines.push(`TENANT_CONTEXT_VIOLATION: ${viol.length}`);
  lines.push(`REVIEW_REQUIRED: ${review.length}`);
  lines.push('');
  lines.push('## TENANT_CONTEXT_VIOLATION');
  if (viol.length === 0) {
    lines.push('- None');
  } else {
    for (const f of viol.sort((a, b) => a.file.localeCompare(b.file))) {
      lines.push(`- ${f.file} | ${Array.from(new Set(f.reasons)).join(', ')}`);
    }
  }
  lines.push('');
  lines.push('## REVIEW_REQUIRED');
  if (review.length === 0) {
    lines.push('- None');
  } else {
    for (const f of review.sort((a, b) => a.file.localeCompare(b.file))) {
      const caps = f.platformCaps.length > 0 ? ` | platform_caps: ${f.platformCaps.join(', ')}` : '';
      lines.push(`- ${f.file} | ${Array.from(new Set(f.reasons)).join(', ')}${caps}`);
    }
  }
  lines.push('');

  fs.writeFileSync(OUTPUT_MD, lines.join('\n'));
  console.log(`✅ Generated: ${OUTPUT_MD}`);

  if (viol.length > 0) {
    process.exitCode = 1;
  }
}

run();
