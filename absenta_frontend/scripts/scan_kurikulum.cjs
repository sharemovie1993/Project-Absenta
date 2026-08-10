/**
 * scan_kurikulum.cjs — Scan semua file modul Kurikulum untuk auth patterns
 */
const fs = require('fs');
const path = require('path');

const SRC = 'd:/BarayaProject/Project Absenta/absenta_frontend/src';

const SCAN_DIRS = [
  'pages/kurikulum',
  'components/kurikulum',
  'components/piket',
  'components/dashboard/panels',
  'components/dashboard/widgets',
  'components/dashboard/shared/kbm',
];

function walkFiles(dir) {
  let result = [];
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) result = result.concat(walkFiles(full));
    else if (full.endsWith('.tsx') || full.endsWith('.ts')) result.push(full);
  }
  return result;
}

const results = [];

for (const dir of SCAN_DIRS) {
  const files = walkFiles(path.join(SRC, dir));
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const canCount      = (content.match(/\bcan\(/g) || []).length;
    const useCapsCount  = (content.match(/useCapabilities/g) || []).length;
    const useAuthCount  = (content.match(/\buseAuth\b/g) || []).length;
    const hardcoded     = (content.match(/user\?\.role|user\.role/g) || []).length;
    const capsIncludes  = (content.match(/caps\.includes/g) || []).length;
    const isAdminInline = (content.match(/isAdmin\s*=/g) || []).length;

    const needsWork = canCount > 0 || hardcoded > 0 || capsIncludes > 0 || (useAuthCount > 0 && useCapsCount === 0);

    if (needsWork) {
      const rel  = file.replace(SRC + '/', '').replace(SRC + '\\', '');
      const sizeKb = Math.round(fs.statSync(file).size / 1024);
      results.push({ rel, sizeKb, canCount, useCapsCount, useAuthCount, hardcoded, capsIncludes, isAdminInline });
    }
  }
}

// Sort by most work needed (canCount + hardcoded)
results.sort((a, b) => (b.canCount + b.hardcoded * 5 + b.capsIncludes * 3) - (a.canCount + a.hardcoded * 5 + a.capsIncludes * 3));

console.log('File | KB | can() | useCaps | useAuth | hardcoded | caps.includes');
console.log('-----|----|----|----|----|----|----|');
for (const r of results) {
  const status = r.useCapsCount > 0 && r.canCount === 0 ? '✅' : r.hardcoded > 0 ? '🔴' : '🟡';
  console.log(status + ' ' + r.rel + ' | ' + r.sizeKb + 'kb | can:' + r.canCount + ' | useCaps:' + r.useCapsCount + ' | useAuth:' + r.useAuthCount + ' | hardcoded:' + r.hardcoded + ' | caps.inc:' + r.capsIncludes);
}
console.log('\nTotal files perlu perhatian:', results.length);
