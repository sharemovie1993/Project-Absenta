/**
 * deep_audit_caps.cjs
 * Audit mendalam: identifikasi SEMUA capability di Frontend, bandingkan dengan Backend
 * dan kategorikan: VALID tapi belum di types.ts / SALAH PENULISAN / TIDAK ADA SAMA SEKALI
 */
const fs = require('fs');
const path = require('path');

const backendRoot = path.resolve('../../absenta_backend');
const frontendSrc = path.resolve('src');

// ── Baca SEMUA capability dari Backend ──────────────────────────────────────
function extractBackendCaps() {
  const caps = new Set();
  const sources = [
    'src/config/position-capabilities.ts',
    'docs/action_catalog.md',
  ];
  for (const src of sources) {
    const fullPath = path.join(backendRoot, src);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, 'utf-8');
    const re = /['"`]([a-z][a-z0-9_.]{3,})['"`]/g;
    let m;
    while ((m = re.exec(content)) !== null) {
      if (m[1].includes('.')) caps.add(m[1]);
    }
  }
  return caps;
}

// ── Baca semua can() calls di Frontend ─────────────────────────────────────
function walkFiles(dir) {
  let result = [];
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) result = result.concat(walkFiles(full));
    else if (full.endsWith('.ts') || full.endsWith('.tsx')) result.push(full);
  }
  return result;
}

function extractFrontendCaps() {
  const usedCaps = new Map();
  const re = /\bcan\(\s*['"]([a-z][a-z0-9_.]+)['"]\s*\)/g;
  for (const file of walkFiles(frontendSrc)) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      let m;
      while ((m = re.exec(line)) !== null) {
        const cap = m[1];
        const ref = `${path.relative(frontendSrc, file)}:L${idx + 1}`;
        if (!usedCaps.has(cap)) usedCaps.set(cap, []);
        usedCaps.get(cap).push(ref);
      }
    });
  }
  return usedCaps;
}

const officialCaps = extractBackendCaps();
const usedCaps = extractFrontendCaps();

// ── Kategorisasi ─────────────────────────────────────────────────────────
const results = { valid: [], invalid: [] };
for (const [cap, refs] of usedCaps.entries()) {
  if (officialCaps.has(cap)) results.valid.push({ cap, refs });
  else results.invalid.push({ cap, refs });
}

console.log('═══════════════════════════════════════════════════════════');
console.log('  🔍 ABSENTA — Deep Capability Audit');
console.log('═══════════════════════════════════════════════════════════');
console.log(`Backend capability terdaftar : ${officialCaps.size}`);
console.log(`Frontend can() calls unik    : ${usedCaps.size}`);
console.log(`✅ VALID (ada di backend)     : ${results.valid.length}`);
console.log(`❌ TIDAK VALID / TIDAK ADA   : ${results.invalid.length}`);
console.log('');

console.log('=== TIDAK VALID (dipakai Frontend tapi TIDAK ADA di Backend) ===');
for (const { cap, refs } of results.invalid) {
  // Coba cari yang mirip di backend
  const similar = [...officialCaps].filter(c =>
    c.startsWith(cap.split('.')[0]) &&
    (c.includes(cap.split('.').slice(-1)[0]) || cap.includes(c.split('.').slice(-1)[0]))
  ).slice(0, 3);
  console.log(`\n❌ "${cap}"`);
  for (const ref of refs.slice(0, 2)) console.log(`   ↳ ${ref}`);
  if (refs.length > 2) console.log(`   ↳ ...+${refs.length - 2} lainnya`);
  if (similar.length) console.log(`   💡 Mungkin: ${similar.join(', ')}`);
}

// Tulis JSON lengkap untuk dipakai script perbaikan
const output = {
  backendCaps: [...officialCaps].sort(),
  validFrontendCaps: results.valid.map(x => x.cap).sort(),
  invalidFrontendCaps: results.invalid.map(({ cap, refs }) => ({ cap, refs }))
};
fs.writeFileSync('scripts/cap_audit_result.json', JSON.stringify(output, null, 2));
console.log('\n✅ Hasil lengkap disimpan di: scripts/cap_audit_result.json');
