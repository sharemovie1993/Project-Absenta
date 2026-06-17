import fs from 'fs';
import path from 'path';
import { CAPABILITY_DOMAIN_MAP } from '../../src/config/capability-domains.generated';

const BASE_DIR = path.join(__dirname, '../../');
const SRC_DIR = path.join(BASE_DIR, 'src');
const PRISMA_DIR = path.join(BASE_DIR, 'prisma');
const OUTPUT_MD = path.join(BASE_DIR, 'ENDPOINT_CONTEXT_SEPARATION_AUDIT.md');

const ROUTER_FILE = path.join(SRC_DIR, 'infra/router.ts');
const SEED_FILE = path.join(PRISMA_DIR, 'seed.ts');

type EndpointRow = {
  method: string;
  path: string;
  capability: string;
  domain: string;
  file: string;
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
      if (entry === 'node_modules' || entry === 'dist' || entry === '.git') continue;
      walkDir(full, cb);
    } else {
      cb(full);
    }
  }
}

function parseRouterPrefixes(): Record<string, string> {
  const map: Record<string, string> = {};
  if (!fs.existsSync(ROUTER_FILE)) return map;
  const content = fs.readFileSync(ROUTER_FILE, 'utf-8');
  const re = /await\s+fastify\.register\(\s*([a-zA-Z0-9_$.]+)\s*,\s*\{\s*prefix:\s*['"`]([^'"`]+)['"`]\s*\}\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    map[m[1]] = m[2];
  }

  const wrapperRe =
    /await\s+fastify\.register\(\s*async\s+function[\s\S]*?\{[\s\S]*?\b([a-zA-Z0-9_]+Routes)\s*\([\s\S]*?\)[\s\S]*?\}\s*,\s*\{\s*prefix:\s*['"`]([^'"`]+)['"`]/g;
  while ((m = wrapperRe.exec(content)) !== null) {
    map[m[1]] = m[2];
  }
  return map;
}

function guessPrefixForFile(filePath: string, routerPrefixMap: Record<string, string>): string {
  const content = fs.readFileSync(filePath, 'utf-8');
  const m = content.match(/export\s+async\s+function\s+([a-zA-Z0-9_]+)\s*\(/);
  if (!m) return '';
  const fnName = m[1];
  return routerPrefixMap[fnName] || '';
}

function joinPaths(prefix: string, routePath: string): string {
  const p = String(prefix || '');
  const r = String(routePath || '');
  if (!p) return r.startsWith('/') ? `/api${r}` : `/api/${r}`;
  if (r === '/' || r === '') return `/api${p}`;
  const pp = p.endsWith('/') ? p.slice(0, -1) : p;
  const rr = r.startsWith('/') ? r : `/${r}`;
  return `/api${pp}${rr}`;
}

function domainOf(cap: string): string {
  const d = (CAPABILITY_DOMAIN_MAP as any)[cap] as string | undefined;
  return d || 'UNKNOWN';
}

function extractEndpointsFromRouteFile(filePath: string, prefix: string): EndpointRow[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const rows: EndpointRow[] = [];

  const fastifyVerbRe =
    /fastify\.(get|post|put|delete|patch)\(\s*['"`]([^'"`]+)['"`]\s*,\s*(\{[\s\S]*?\})\s*\)\s*;/g;
  let m: RegExpExecArray | null;
  while ((m = fastifyVerbRe.exec(content)) !== null) {
    const method = m[1].toUpperCase();
    const routePath = m[2];
    const options = m[3] || '';
    const caps: string[] = [];
    const capRe = /requireCapability\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
    let cm: RegExpExecArray | null;
    while ((cm = capRe.exec(options)) !== null) {
      const cap = String(cm[1]).trim();
      if (cap) caps.push(cap);
    }
    for (const cap of caps) {
      rows.push({
        method,
        path: joinPaths(prefix, routePath),
        capability: cap,
        domain: domainOf(cap),
        file: normalizeRel(filePath),
      });
    }
  }

  const fastifyRouteRe =
    /fastify\.route\(\s*(\{[\s\S]*?\})\s*\)\s*;/g;
  while ((m = fastifyRouteRe.exec(content)) !== null) {
    const obj = m[1] || '';
    const methodMatch = obj.match(/method:\s*['"`]([A-Z]+)['"`]/);
    const urlMatch = obj.match(/url:\s*['"`]([^'"`]+)['"`]/);
    if (!methodMatch || !urlMatch) continue;
    const method = methodMatch[1].toUpperCase();
    const routePath = urlMatch[1];
    const caps: string[] = [];
    const capRe = /requireCapability\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
    let cm: RegExpExecArray | null;
    while ((cm = capRe.exec(obj)) !== null) {
      const cap = String(cm[1]).trim();
      if (cap) caps.push(cap);
    }
    for (const cap of caps) {
      rows.push({
        method,
        path: joinPaths(prefix, routePath),
        capability: cap,
        domain: domainOf(cap),
        file: normalizeRel(filePath),
      });
    }
  }

  return rows;
}

function parseTenantMenuCapabilities(): Set<string> {
  const caps = new Set<string>();
  if (!fs.existsSync(SEED_FILE)) return caps;
  const content = fs.readFileSync(SEED_FILE, 'utf-8');
  const start = content.indexOf('const NAV_ITEMS');
  if (start === -1) return caps;
  const end = content.indexOf('];', start);
  if (end === -1) return caps;
  const block = content.slice(start, end + 2);
  const re = /required_capability:\s*['"`]([^'"`]+)['"`]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    const c = String(m[1]).trim();
    if (!c || c === 'null') continue;
    caps.add(c);
  }
  return caps;
}

function classifyLeak(endpoint: EndpointRow, tenantMenuCaps: Set<string>): string | null {
  if (endpoint.domain !== 'PLATFORM') return null;
  if (endpoint.path.startsWith('/api/tenants')) return 'PLATFORM LEAK: Missing tenant endpoint';
  if (tenantMenuCaps.has(endpoint.capability)) return 'PLATFORM LEAK: Frontend misuse';

  return null;
}

function buildReport(rows: EndpointRow[], leaks: Array<{ endpoint: EndpointRow; classification: string }>): string {
  const platformEndpoints = rows
    .filter((r) => r.domain === 'PLATFORM')
    .sort((a, b) => `${a.method} ${a.path}`.localeCompare(`${b.method} ${b.path}`));

  const lines: string[] = [];
  lines.push('# ENDPOINT CONTEXT SEPARATION AUDIT');
  lines.push(`Generated on: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Summary');
  lines.push(`- Total endpoints scanned (requireCapability): ${rows.length}`);
  lines.push(`- PLATFORM domain endpoints: ${platformEndpoints.length}`);
  lines.push(`- PLATFORM LEAK findings: ${leaks.length}`);
  lines.push('');
  lines.push('## PLATFORM Domain Endpoints');
  if (platformEndpoints.length === 0) {
    lines.push('- None');
  } else {
    for (const e of platformEndpoints) {
      lines.push(`- ${e.method} ${e.path} | ${e.capability} | ${e.file}`);
    }
  }
  lines.push('');
  lines.push('## PLATFORM LEAK Findings');
  if (leaks.length === 0) {
    lines.push('- None');
  } else {
    for (const l of leaks) {
      const e = l.endpoint;
      lines.push(`- ${e.method} ${e.path} | ${e.capability} | ${l.classification}`);
    }
  }
  lines.push('');
  lines.push('## Recommended Tenant Replacement Endpoints');
  lines.push('- GET /api/me/tenant (capability: core.sekolah.view.profile)');
  lines.push('- GET /api/sekolah/me (capability: core.sekolah.view.profile)');
  lines.push('');
  return lines.join('\n');
}

function run() {
  const routerPrefixMap = parseRouterPrefixes();
  const tenantMenuCaps = parseTenantMenuCapabilities();

  const routeFiles: string[] = [];
  walkDir(SRC_DIR, (filePath) => {
    const rel = normalizeRel(filePath);
    if (!rel.includes('/routes/')) return;
    if (!rel.endsWith('.ts') && !rel.endsWith('.js')) return;
    routeFiles.push(filePath);
  });

  const allRows: EndpointRow[] = [];
  for (const filePath of routeFiles) {
    const prefix = guessPrefixForFile(filePath, routerPrefixMap);
    if (!prefix) continue;
    const rows = extractEndpointsFromRouteFile(filePath, prefix);
    allRows.push(...rows);
  }

  const leaks: Array<{ endpoint: EndpointRow; classification: string }> = [];
  for (const r of allRows) {
    const c = classifyLeak(r, tenantMenuCaps);
    if (c) leaks.push({ endpoint: r, classification: c });
  }

  const report = buildReport(allRows, leaks);
  fs.writeFileSync(OUTPUT_MD, report);
  console.log(`✅ Generated: ${OUTPUT_MD}`);
}

run();
