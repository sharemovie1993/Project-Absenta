const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src');
const FILES = [
  path.join(SRC_DIR, 'pages/correspondence/Dashboard.tsx'),
  path.join(SRC_DIR, 'pages/correspondence/SuratKeluarPage.tsx'),
  path.join(SRC_DIR, 'pages/correspondence/SuratMasukPage.tsx'),
  path.join(SRC_DIR, 'pages/public/SuratKeluarPublicViewPage.tsx'),
  path.join(SRC_DIR, 'pages/public/SuratKeluarQuickApprovePage.tsx'),
  path.join(SRC_DIR, 'api/correspondence.api.ts')
];

let totalFiles = 0;
const results = [];

FILES.forEach(fullPath => {
  if (!fs.existsSync(fullPath)) return;
  totalFiles++;
  const stat = fs.statSync(fullPath);
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
});

console.log('\n=== SCAN MODUL PERSURATAN / CORRESPONDENCE ===\n');

results.forEach(r => {
  const icon = (r.hardcodedRoleCount > 0 || r.capsIncludesCount > 0) ? '🔴' : r.useAuthCount > 0 ? '🟠' : '🟡';
  console.log(`${icon} ${r.filePath}`);
  console.log(`   KB:${r.sizeKb} | can:${r.canCalls.length} | useCaps:${r.useCapsCount} | useAuth:${r.useAuthCount} | hardcoded:${r.hardcodedRoleCount} | caps.inc:${r.capsIncludesCount}`);
  if (r.canCalls.length > 0) {
    console.log(`   can() calls: ${JSON.stringify(r.canCalls, null, 2)}`);
  }
});

console.log(`\nTotal file Persuratan / Correspondence: ${totalFiles}\n`);
