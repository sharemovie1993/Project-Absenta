/**
 * scan_bpbk.cjs — Scan semua file modul BPBK untuk auth patterns
 */
const fs = require('fs');
const path = require('path');

const SRC = 'd:/BarayaProject/Project Absenta/absenta_frontend/src';

const SCAN_DIRS = [
  'pages/bpbk',
  'components/bpbk',
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
  const fullDir = path.join(SRC, dir);
  const files = walkFiles(fullDir);
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const canCount      = (content.match(/\bcan\(/g) || []).length;
    const useCapsCount  = (content.match(/useCapabilities/g) || []).length;
    const useAuthCount  = (content.match(/\buseAuth\b/g) || []).length;
    const hardcoded     = (content.match(/user\?\.role|user\.role/g) || []).length;
    const capsIncludes  = (content.match(/caps\.includes/g) || []).length;
    const canMatches    = content.match(/\bcan\('([^']+)'\)/g) || [];

    const needsWork = canCount > 0 || hardcoded > 0 || capsIncludes > 0 || (useAuthCount > 0 && useCapsCount === 0);

    const rel    = file.replace(SRC + '/', '').replace(SRC + '\\', '').replace(/\\/g, '/');
    const sizeKb = Math.round(fs.statSync(file).size / 1024);
    const score  = canCount + hardcoded * 5 + capsIncludes * 3 + (useAuthCount > 0 && useCapsCount === 0 ? 2 : 0);
    results.push({ rel, sizeKb, canCount, useCapsCount, useAuthCount, hardcoded, capsIncludes, score, canMatches, needsWork });
  }
}

results.sort((a, b) => b.score - a.score);

console.log('\n=== SCAN MODUL BPBK ===\n');
for (const r of results) {
  const flag = r.hardcoded > 0 ? '🔴' : (r.useCapsCount === 0 && r.useAuthCount > 0) ? '🟠' : r.canCount > 0 ? '🟡' : '⚪';
  console.log(flag + ' ' + r.rel);
  console.log('   KB:' + r.sizeKb + ' | can:' + r.canCount + ' | useCaps:' + r.useCapsCount + ' | useAuth:' + r.useAuthCount + ' | hardcoded:' + r.hardcoded + ' | caps.inc:' + r.capsIncludes);
  if (r.canMatches.length > 0) {
    console.log('   can() calls:', r.canMatches);
  }
}
console.log('\nTotal file BPBK:', results.length);
