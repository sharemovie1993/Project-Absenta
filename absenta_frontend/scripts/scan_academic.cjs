const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src');
const ACADEMIC_DIRS = [
  path.join(SRC_DIR, 'pages/academic'),
  path.join(SRC_DIR, 'components/academic')
];

let totalFiles = 0;
const results = [];

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      totalFiles++;
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      const canMatches = content.match(/can\(['"]([^'"]+)['"]\)/g) || [];
      const capsIncludesMatches = content.match(/caps\.includes\(['"]([^'"]+)['"]\)/g) || [];
      const hardcodedRoleMatches = content.match(/user(?:\?\.)?role(?:\?\.)?name\s*===?\s*['"][^'"]+['"]/g) || [];
      const useAuthMatches = content.match(/useAuth\(\)/g) || [];
      const useCapsMatches = content.match(/useCapabilities\(\)/g) || [];

      results.push({
        filePath: fullPath,
        sizeKb: Math.round(stat.size / 1024),
        canCalls: canMatches,
        capsIncludesCount: capsIncludesMatches.length,
        hardcodedRoleCount: hardcodedRoleMatches.length,
        useAuthCount: useAuthMatches.length,
        useCapsCount: useCapsMatches.length,
        hasIssues: capsIncludesMatches.length > 0 || hardcodedRoleMatches.length > 0 || useAuthMatches.length > 0
      });
    }
  }
}

ACADEMIC_DIRS.forEach(d => scanDir(d));

console.log('\n=== SCAN MODUL ACADEMIC ===\n');

results.forEach(r => {
  const icon = (r.hardcodedRoleCount > 0 || r.capsIncludesCount > 0) ? '🔴' : r.useAuthCount > 0 ? '🟠' : '🟡';
  if (r.hasIssues || r.canCalls.length > 0) {
    console.log(`${icon} ${r.filePath.replace('d:\\BarayaProject\\Project Absenta\\absenta_frontend\\src\\', '')}`);
    console.log(`   KB:${r.sizeKb} | can:${r.canCalls.length} | useCaps:${r.useCapsCount} | useAuth:${r.useAuthCount} | hardcoded:${r.hardcodedRoleCount} | caps.inc:${r.capsIncludesCount}`);
    if (r.canCalls.length > 0) {
      console.log(`   can() calls: ${JSON.stringify(r.canCalls, null, 2)}`);
    }
  }
});

console.log(`\nTotal file Academic: ${totalFiles}\n`);
