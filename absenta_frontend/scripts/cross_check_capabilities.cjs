/**
 * cross_check_capabilities.js
 * Script audit: membandingkan capability yang dipakai di Frontend
 * dengan yang terdaftar di Backend (action_catalog + position-capabilities).
 * Jalankan: node scripts/cross_check_capabilities.js
 */
const fs = require('fs');
const path = require('path');

// ── 1. Kumpulkan semua capability RESMI dari Backend ──────────────────────────
// Gunakan ground truth JSON yang sudah di-extract via extract_backend_ground_truth.cjs
const groundTruthPath = path.resolve('scripts/backend_caps_groundtruth.json');
const officialCaps = new Set();

if (fs.existsSync(groundTruthPath)) {
  const list = JSON.parse(fs.readFileSync(groundTruthPath, 'utf-8'));
  list.forEach(c => officialCaps.add(c));
} else {
  // Fallback: baca langsung dari backend jika JSON belum ada
  const backendSources = ['src/config/position-capabilities.ts', 'docs/action_catalog.md'];
  const backendRoot = path.resolve('../../absenta_backend');
  for (const src of backendSources) {
    const fullPath = path.join(backendRoot, src);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, 'utf-8');
    const re = /'([a-z][a-z0-9.]{4,})'/g;
    let m;
    while ((m = re.exec(content)) !== null) {
      if (m[1].includes('.')) officialCaps.add(m[1]);
    }
  }
}

// ── 2. Kumpulkan semua capability yang DIPAKAI di Frontend ───────────────────
function walkFiles(dir, exts = ['.ts', '.tsx']) {
  let result = [];
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      result = result.concat(walkFiles(full, exts));
    } else if (exts.some(e => full.endsWith(e))) {
      result.push(full);
    }
  }
  return result;
}

const frontendSrc = path.resolve('src');
const files = walkFiles(frontendSrc);
const usedCaps = new Map(); // capability -> [file:line, ...]

const canCallRegex = /\bcan\(\s*['"]([a-z][a-z0-9_.]+)['"]\s*\)/g;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    let match;
    while ((match = canCallRegex.exec(line)) !== null) {
      const cap = match[1];
      const ref = `${path.relative(frontendSrc, file)}:L${idx + 1}`;
      if (!usedCaps.has(cap)) usedCaps.set(cap, []);
      usedCaps.get(cap).push(ref);
    }
  });
}

// ── 3. Deteksi TIDAK TERDAFTAR di Backend ────────────────────────────────────
const invalid = [];
for (const [cap, refs] of usedCaps.entries()) {
  if (!officialCaps.has(cap)) {
    invalid.push({ cap, refs });
  }
}

// ── 4. Laporan ────────────────────────────────────────────────────────────────
console.log('═══════════════════════════════════════════════════════════');
console.log('  🛡️  ABSENTA — Cross-Check Capability Frontend vs Backend');
console.log('═══════════════════════════════════════════════════════════\n');
console.log(`✅ Capability resmi di Backend  : ${officialCaps.size}`);
console.log(`🔍 Capability dipakai Frontend : ${usedCaps.size}`);
console.log(`❌ Capability TIDAK TERDAFTAR  : ${invalid.length}\n`);

if (invalid.length === 0) {
  console.log('🎉 SEMUA CAPABILITY VALID! Tidak ada penyimpangan.\n');
} else {
  console.log('⚠️  DAFTAR CAPABILITY YANG BERMASALAH:');
  for (const { cap, refs } of invalid) {
    console.log(`\n  ❌ "${cap}"`);
    for (const ref of refs.slice(0, 3)) {
      console.log(`     └─ ${ref}`);
    }
    if (refs.length > 3) console.log(`     └─ ...dan ${refs.length - 3} lokasi lainnya`);
  }
  console.log('');
  process.exit(1); // Non-zero exit agar CI/CD gagal otomatis
}
