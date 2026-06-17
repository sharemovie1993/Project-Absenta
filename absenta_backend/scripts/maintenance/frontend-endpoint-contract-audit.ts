declare const require: any;
declare const __dirname: string;
declare const process: any;

const fs = require('fs');
const path = require('path');

const BASE_DIR = path.join(__dirname, '../../');
const OUTPUT_USAGE_MAP = path.join(BASE_DIR, 'FRONTEND_ENDPOINT_USAGE_MAP.md');
const OUTPUT_AUDIT = path.join(BASE_DIR, 'FRONTEND_ENDPOINT_CONTRACT_AUDIT.md');

const FRONTEND_SRC_CANDIDATES = [
  path.join(BASE_DIR, '../../frontend/absenta_frontend/src'),
  path.join(BASE_DIR, '../frontend/absenta_frontend/src'),
];

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type Classification = 'TENANT_SAFE' | 'PLATFORM_ONLY' | 'REVIEW_REQUIRED';

type Usage = {
  method: HttpMethod;
  endpoint: string;
  files: Set<string>;
  classification: Classification;
  leakFiles: Set<string>;
};

type ApiFunctionUsage = {
  apiFileRel: string;
  functionName: string;
  endpoints: Array<{ method: HttpMethod; endpoint: string }>;
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

function ensureApiPrefix(url: string): string {
  const u = String(url || '').trim();
  if (!u.startsWith('/')) return u;
  if (u.startsWith('/api/')) return u;
  if (u.startsWith('/invoice/') || u.startsWith('/payment') || u.startsWith('/webhooks/')) return u;
  return `/api${u}`;
}

function templateToRoute(template: string): string {
  return template.replace(/\$\{([^}]+)\}/g, (_m, exprRaw) => {
    const expr = String(exprRaw || '').trim();
    const lastToken = expr.split('.').filter(Boolean).slice(-1)[0] || 'param';
    const safe = lastToken.replace(/[^a-zA-Z0-9_]/g, '') || 'param';
    return `:${safe}`;
  });
}

function normalizeEndpoint(urlRaw: string): string {
  const u = templateToRoute(String(urlRaw || '').trim());
  const noQuery = u.split('?')[0];
  const withApi = ensureApiPrefix(noQuery);
  return withApi.replace(/\/+$/, '') || withApi;
}

function classifyEndpoint(endpoint: string): Classification {
  const p = endpoint;

  if (p === '/api/billing/subscriptions/active') return 'PLATFORM_ONLY';
  if (p === '/api/notifications/status') return 'PLATFORM_ONLY';
  if (/^\/api\/(superadmin|admin|platform)\b/i.test(p)) return 'PLATFORM_ONLY';
  if (/^\/api\/tenants\b/i.test(p)) return 'PLATFORM_ONLY';

  if (p === '/api/billing/plans/public') return 'TENANT_SAFE';
  if (p === '/api/system/config') return 'TENANT_SAFE';
  if (p === '/api/auth/me') return 'TENANT_SAFE';
  if (p === '/api/me/tenant') return 'TENANT_SAFE';
  if (p === '/api/me/subscription') return 'TENANT_SAFE';

  if (/^\/api\/notifications\b/i.test(p)) return 'REVIEW_REQUIRED';
  if (/^\/api\/attendance\/notify\b/i.test(p)) return 'REVIEW_REQUIRED';

  return 'TENANT_SAFE';
}

function isTenantAppFile(rel: string): boolean {
  const r = rel.split('\\').join('/');
  if (!r.startsWith('..')) {
    if (!r.includes('/frontend/absenta_frontend/src/')) return true;
  }

  const normalized = r.split('/frontend/absenta_frontend/src/').slice(-1)[0] || r;

  if (normalized === 'App.tsx') return true;
  if (normalized.startsWith('store/')) return true;
  if (normalized.startsWith('layouts/')) return true;
  if (normalized.startsWith('pages/dashboard/')) return true;
  if (normalized === 'pages/billing/MySubscriptionPage.tsx') return true;
  if (normalized.startsWith('hooks/') && normalized !== 'hooks/useNotifications.ts') return true;

  return false;
}

function addUsage(map: Map<string, Usage>, method: HttpMethod, endpoint: string, file: string) {
  const key = `${method} ${endpoint}`;
  const existing = map.get(key);
  const classification = classifyEndpoint(endpoint);
  const isLeak = classification === 'PLATFORM_ONLY' && isTenantAppFile(file);

  if (existing) {
    existing.files.add(file);
    if (isLeak) existing.leakFiles.add(file);
    return;
  }

  map.set(key, {
    method,
    endpoint,
    files: new Set([file]),
    classification,
    leakFiles: isLeak ? new Set([file]) : new Set<string>(),
  });
}

function extractRequestWithFallbackFromBlock(block: string, rel: string, usageMap: Map<string, Usage>) {
  const literalRe =
    /requestWithFallback(?:<[^>]*>)?\(\s*['"`](get|post|put|patch|delete)['"`]\s*,\s*['"`]([^'"`]+)['"`]/g;
  let m: RegExpExecArray | null;
  while ((m = literalRe.exec(block)) !== null) {
    const method = String(m[1]).toUpperCase() as HttpMethod;
    const endpoint = normalizeEndpoint(String(m[2]));
    addUsage(usageMap, method, endpoint, rel);
  }

  const templateRe =
    /requestWithFallback(?:<[^>]*>)?\(\s*['"`](get|post|put|patch|delete)['"`]\s*,\s*`([^`]+)`/g;
  while ((m = templateRe.exec(block)) !== null) {
    const method = String(m[1]).toUpperCase() as HttpMethod;
    const endpoint = normalizeEndpoint(String(m[2]));
    addUsage(usageMap, method, endpoint, rel);
  }
}

function extractAxiosFetchUsages(content: string, rel: string, usageMap: Map<string, Usage>) {
  const axiosRe = /\baxios\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/g;
  let m: RegExpExecArray | null;
  while ((m = axiosRe.exec(content)) !== null) {
    const method = String(m[1]).toUpperCase() as HttpMethod;
    const endpoint = normalizeEndpoint(String(m[2]));
    addUsage(usageMap, method, endpoint, rel);
  }

  const fetchRe = /\bfetch\(\s*['"`]([^'"`]+)['"`]\s*(?:,\s*\{[\s\S]*?\bmethod:\s*['"`]([A-Z]+)['"`][\s\S]*?\})?/g;
  while ((m = fetchRe.exec(content)) !== null) {
    const endpoint = normalizeEndpoint(String(m[1]));
    const method = (m[2] ? String(m[2]).toUpperCase() : 'GET') as HttpMethod;
    addUsage(usageMap, method, endpoint, rel);
  }
}

function extractApiFunctionUsages(apiFilePath: string): ApiFunctionUsage[] {
  const rel = normalizeRel(apiFilePath);
  const content = fs.readFileSync(apiFilePath, 'utf-8');

  const matches: Array<{ name: string; start: number; end: number }> = [];
  const re = /export\s+async\s+function\s+([A-Za-z0-9_]+)\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    matches.push({ name: String(m[1]), start: m.index, end: content.length });
  }
  for (let i = 0; i < matches.length; i += 1) {
    matches[i].end = i + 1 < matches.length ? matches[i + 1].start : content.length;
  }

  const out: ApiFunctionUsage[] = [];
  for (const fn of matches) {
    const block = content.slice(fn.start, fn.end);
    const endpoints: Array<{ method: HttpMethod; endpoint: string }> = [];

    const literalRe =
      /requestWithFallback(?:<[^>]*>)?\(\s*['"`](get|post|put|patch|delete)['"`]\s*,\s*['"`]([^'"`]+)['"`]/g;
    let mm: RegExpExecArray | null;
    while ((mm = literalRe.exec(block)) !== null) {
      const method = String(mm[1]).toUpperCase() as HttpMethod;
      const endpoint = normalizeEndpoint(String(mm[2]));
      endpoints.push({ method, endpoint });
    }

    const templateRe =
      /requestWithFallback(?:<[^>]*>)?\(\s*['"`](get|post|put|patch|delete)['"`]\s*,\s*`([^`]+)`/g;
    while ((mm = templateRe.exec(block)) !== null) {
      const method = String(mm[1]).toUpperCase() as HttpMethod;
      const endpoint = normalizeEndpoint(String(mm[2]));
      endpoints.push({ method, endpoint });
    }

    if (endpoints.length > 0) {
      out.push({ apiFileRel: rel, functionName: fn.name, endpoints });
    }
  }

  return out;
}

function resolveImportToFile(currentFilePath: string, importPath: string): string | null {
  if (!importPath.startsWith('.')) return null;
  const base = path.resolve(path.dirname(currentFilePath), importPath);
  const candidates = [
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function extractImportedApiFunctions(content: string): Array<{ importPath: string; names: string[] }> {
  const results: Array<{ importPath: string; names: string[] }> = [];
  const re = /import\s+\{([^}]+)\}\s+from\s+['"`]([^'"`]+)['"`]\s*;?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const rawNames = String(m[1] || '');
    const importPath = String(m[2] || '');
    const names = rawNames
      .split(',')
      .map((s) => s.trim())
      .map((s) => s.split(/\s+as\s+/i)[0].trim())
      .filter(Boolean);
    if (names.length === 0) continue;
    results.push({ importPath, names });
  }
  return results;
}

function writeUsageMap(usages: Usage[]) {
  const lines: string[] = [];
  lines.push('# FRONTEND_ENDPOINT_USAGE_MAP');
  lines.push(`Generated on: ${new Date().toISOString()}`);
  lines.push('');
  for (const u of usages) {
    lines.push(`- ${u.method} ${u.endpoint}`);
  }
  lines.push('');
  fs.writeFileSync(OUTPUT_USAGE_MAP, lines.join('\n'));
}

function writeAudit(usages: Usage[]) {
  const counts = {
    TENANT_SAFE: 0,
    PLATFORM_ONLY: 0,
    REVIEW_REQUIRED: 0,
  } satisfies Record<Classification, number>;

  const leaks: Array<{ key: string; files: string[] }> = [];
  for (const u of usages) {
    counts[u.classification] += 1;
    if (u.leakFiles.size > 0) {
      leaks.push({
        key: `${u.method} ${u.endpoint}`,
        files: Array.from(u.leakFiles).sort(),
      });
    }
  }

  const platformOnly = usages.filter((u) => u.classification === 'PLATFORM_ONLY');
  const reviewReq = usages.filter((u) => u.classification === 'REVIEW_REQUIRED');

  const lines: string[] = [];
  lines.push('# FRONTEND_ENDPOINT_CONTRACT_AUDIT (Tenant Application)');
  lines.push(`Generated on: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Summary');
  lines.push(`- Total endpoints used by frontend: ${usages.length}`);
  lines.push(`- TENANT_SAFE: ${counts.TENANT_SAFE}`);
  lines.push(`- PLATFORM_ONLY: ${counts.PLATFORM_ONLY}`);
  lines.push(`- REVIEW_REQUIRED: ${counts.REVIEW_REQUIRED}`);
  lines.push(`- FRONTEND_PLATFORM_LEAK: ${leaks.length}`);
  lines.push('');

  lines.push('## PLATFORM_ONLY Endpoints');
  if (platformOnly.length === 0) {
    lines.push('- None');
  } else {
    for (const u of platformOnly) {
      const files = Array.from(u.files).sort();
      lines.push(`- ${u.method} ${u.endpoint}`);
      for (const f of files) lines.push(`  - ${f}`);
    }
  }
  lines.push('');

  lines.push('## REVIEW_REQUIRED Endpoints');
  if (reviewReq.length === 0) {
    lines.push('- None');
  } else {
    for (const u of reviewReq) {
      const files = Array.from(u.files).sort();
      lines.push(`- ${u.method} ${u.endpoint}`);
      for (const f of files) lines.push(`  - ${f}`);
    }
  }
  lines.push('');

  lines.push('## FRONTEND_PLATFORM_LEAK Findings');
  if (leaks.length === 0) {
    lines.push('- None');
  } else {
    for (const leak of leaks) {
      lines.push(`- ${leak.key}`);
      for (const f of leak.files) lines.push(`  - ${f}`);
    }
  }
  lines.push('');

  fs.writeFileSync(OUTPUT_AUDIT, lines.join('\n'));
}

function run() {
  const srcDir = FRONTEND_SRC_CANDIDATES.find((p) => fs.existsSync(p));
  if (!srcDir) {
    throw new Error(`Frontend src folder not found. Tried: ${FRONTEND_SRC_CANDIDATES.join(', ')}`);
  }

  const usageMap = new Map<string, Usage>();
  const apiFunctionEndpointMap = new Map<string, Array<{ method: HttpMethod; endpoint: string }>>();

  walkDir(srcDir, (filePath) => {
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx') && !filePath.endsWith('.js') && !filePath.endsWith('.jsx')) return;
    const rel = normalizeRel(filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    if (rel.includes('/frontend/absenta_frontend/src/api/')) {
      for (const fn of extractApiFunctionUsages(filePath)) {
        const k = `${fn.apiFileRel}::${fn.functionName}`;
        apiFunctionEndpointMap.set(k, fn.endpoints);
        for (const e of fn.endpoints) {
          addUsage(usageMap, e.method, e.endpoint, fn.apiFileRel);
        }
      }
      extractAxiosFetchUsages(content, rel, usageMap);
      return;
    }

    extractAxiosFetchUsages(content, rel, usageMap);
    extractRequestWithFallbackFromBlock(content, rel, usageMap);

    const imports = extractImportedApiFunctions(content);
    for (const imp of imports) {
      const resolved = resolveImportToFile(filePath, imp.importPath);
      if (!resolved) continue;
      const apiRel = normalizeRel(resolved);
      if (!apiRel.includes('/frontend/absenta_frontend/src/api/')) continue;

      for (const name of imp.names) {
        const k = `${apiRel}::${name}`;
        const eps = apiFunctionEndpointMap.get(k);
        if (!eps || eps.length === 0) continue;
        for (const e of eps) {
          addUsage(usageMap, e.method, e.endpoint, rel);
        }
      }
    }
  });

  const usages = Array.from(usageMap.values()).sort((a, b) => {
    const ak = `${a.method} ${a.endpoint}`;
    const bk = `${b.method} ${b.endpoint}`;
    return ak.localeCompare(bk);
  });

  writeUsageMap(usages);
  writeAudit(usages);

  console.log(`✅ Generated: ${OUTPUT_USAGE_MAP}`);
  console.log(`✅ Generated: ${OUTPUT_AUDIT}`);

  const leakCount = usages.reduce((sum, u) => sum + (u.leakFiles.size > 0 ? 1 : 0), 0);
  if (leakCount > 0) {
    process.exitCode = 1;
  }
}

run();
