import fs from 'fs';
import path from 'path';

const MODULES_DIR = path.join(__dirname, '../../src/modules');

interface RouteAuditResult {
  file: string;
  method: string;
  urlPath: string;
  line: number;
  hasCapability: boolean;
  hasDataScope: boolean;
  capabilityName?: string;
}

function getAllRouteFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllRouteFiles(fullPath, arrayOfFiles);
    } else if (file.endsWith('.routes.ts') || file.endsWith('routes.ts')) {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

function auditRoutes() {
  console.log('🔍 Starting Exhaustive Backend Route Data Scope Audit...\n');

  const routeFiles = getAllRouteFiles(MODULES_DIR);
  const results: RouteAuditResult[] = [];

  let totalRoutesCount = 0;
  let hasDataScopeCount = 0;
  let hasCapabilityCount = 0;

  routeFiles.forEach((filePath) => {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const relPath = path.relative(path.join(__dirname, '../../'), filePath);

    lines.forEach((lineText, idx) => {
      const routeRegex = /(?:fastify|app|router)\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g;
      let match;
      while ((match = routeRegex.exec(lineText)) !== null) {
        totalRoutesCount++;
        const method = match[1].toUpperCase();
        const urlPath = match[2];

        const contextLines = lines.slice(Math.max(0, idx - 2), Math.min(lines.length, idx + 8)).join('\n');

        const hasDataScope = contextLines.includes('determineDataScope') || contextLines.includes('dataScope');
        const capMatch = /requireCapability\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/.exec(contextLines);
        const hasCapability = !!capMatch || contextLines.includes('requireCapability') || contextLines.includes('requireRole') || contextLines.includes('requireAuth');

        if (hasDataScope) hasDataScopeCount++;
        if (hasCapability) hasCapabilityCount++;

        results.push({
          file: relPath,
          method,
          urlPath,
          line: idx + 1,
          hasCapability,
          hasDataScope,
          capabilityName: capMatch ? capMatch[1] : undefined
        });
      }
    });
  });

  console.log(`--------------------------------------------------`);
  console.log(`📊 Total Route Files Audited: ${routeFiles.length}`);
  console.log(`📊 Total API Routes Found: ${totalRoutesCount}`);
  console.log(`✅ Routes with Capability Guard: ${hasCapabilityCount}`);
  console.log(`🛡️ Routes with determineDataScope Middleware: ${hasDataScopeCount}`);
  console.log(`--------------------------------------------------\n`);

  const missingScopeRoutes = results.filter(r => !r.hasDataScope);
  console.log(`⚠️ Routes missing explicit determineDataScope(): ${missingScopeRoutes.length}`);

  const outputPath = path.join(__dirname, '../../route_data_scope_audit.json');
  fs.writeFileSync(outputPath, JSON.stringify({ summary: { totalRouteFiles: routeFiles.length, totalRoutes: totalRoutesCount, hasCapabilityCount, hasDataScopeCount, missingDataScopeCount: missingScopeRoutes.length }, routes: results }, null, 2));
  console.log(`📁 Audit JSON report saved to: ${outputPath}`);
}

auditRoutes();
