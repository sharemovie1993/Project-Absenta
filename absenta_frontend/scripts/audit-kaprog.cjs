const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, '../src/components/dashboard/roles/KaprogDashboard.tsx');
const parentFile = path.resolve(__dirname, '../src/components/dashboard/roles/UnifiedStaffDashboard.tsx');
const backendFile = path.resolve(__dirname, '../../absenta_backend/src/modules/dashboard/services/sub/dashboard-kaprog-stats.service.ts');

console.log('\x1b[36m%s\x1b[0m', '🛡️  AUDIT HARDENING KHUSUS: DASHBOARD KAPROG (32 PILAR & PERFORMA) 🛡️\n');

if (!fs.existsSync(targetFile)) {
  console.error('File target tidak ditemukan:', targetFile);
  process.exit(1);
}

const rawContent = fs.readFileSync(targetFile, 'utf8');
const cleanContent = rawContent.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
const lines = rawContent.split('\n').length;

console.log(`📁 Target File : ${path.relative(process.cwd(), targetFile)}`);
console.log(`📏 Ukuran File : ${lines} baris (${(rawContent.length / 1024).toFixed(1)} KB)\n`);

const issues = [];
const passes = [];

// 1. Pilar 21B: Pencegahan God File
if (lines > 800) {
  issues.push({
    pilar: 'Pilar 21B (God File Guard)',
    severity: 'KRITIKAL',
    message: `Ukuran file ${lines} baris melebihi ambang batas maksimal (Halaman < 800 baris, Subkomponen < 500 baris). File ini menampung 6 sub-view tab sekaligus dalam satu komponen monolitik, menyebabkan parsing & rendering berat.`
  });
} else {
  passes.push('Pilar 21B (God File Guard): Sesuai standar');
}

// 2. Pilar 2: Keamanan Data & Defensive Programming (.map check)
const contentForMapCheck = cleanContent
  .replace(/\((?:[^)(]|\([^)]*\))*\|\|\s*\[\]\s*\)\.map\s*\(/g, '?.map(')
  .replace(/\((?:[^)(]|\([^)]*\))*\?\?\s*\[\]\s*\)\.map\s*\(/g, '?.map(')
  .replace(/\[[^\]]*\]\.map\s*\(/g, '?.map(');
const unsafeMaps = (contentForMapCheck.match(/(?<!\?)\.map\(/g) || []).length;
if (unsafeMaps > 0) {
  issues.push({
    pilar: 'Pilar 2 (Defensive Programming)',
    severity: 'MEDIUM',
    message: `Ditemukan ${unsafeMaps} pemetaan array .map() tanpa optional chaining (?.map). Berpotensi crash jika data API undefined/null.`
  });
} else {
  passes.push('Pilar 2 (Defensive Programming): Aman (100% ?.map)');
}

// 3. Pilar 3: Optimasi DOM Churn (Memoization)
const hasLists = /List[\s/>]/.test(cleanContent) || /<Table[\s/>]/.test(cleanContent) || /\bmap\(/g.test(cleanContent);
const usesUseMemo = cleanContent.includes('useMemo');
const usesUseCallback = cleanContent.includes('useCallback');
if (hasLists && (!usesUseMemo || !usesUseCallback)) {
  issues.push({
    pilar: 'Pilar 3 (Optimasi DOM Churn)',
    severity: 'TINGGI',
    message: `Komponen memuat banyak iterasi list & filter tabel tetapi tidak mengoptimalkan memoization (useMemo: ${usesUseMemo}, useCallback: ${usesUseCallback}). Menyebabkan re-render berlebihan setiap pergantian state.`
  });
} else {
  passes.push('Pilar 3 (Optimasi DOM Churn): Memoization aktif');
}

// 4. Pilar 4: Keamanan Tipe TypeScript (No Any)
const anyMatches = (cleanContent.match(/:\s*any\b|\bas\s+any\b|<\s*any\s*>/g) || []).length;
if (anyMatches > 0) {
  issues.push({
    pilar: 'Pilar 4 (Keamanan Tipe TS)',
    severity: 'MEDIUM',
    message: `Ditemukan ${anyMatches} penggunaan tipe longgar 'any'.`
  });
} else {
  passes.push('Pilar 4 (Keamanan Tipe TS): Zero any detected');
}

// 5. Pilar 31: Optimasi Data Fetching & Query Overlap
if (fs.existsSync(parentFile)) {
  const parentContent = fs.readFileSync(parentFile, 'utf8');
  // Periksa apakah query di UnifiedStaffDashboard memicu waterfall / fetch ganda
  const queryMatches = parentContent.match(/useQuery\(\{[\s\S]*?queryKey:\s*\[['"]([^'"]+)['"]/g) || [];
  const unshieldedQueries = [];
  
  // Periksa query di parent apakah ada enabled yang mengecek role/tab
  const queryBlocks = parentContent.split(/useQuery\(\{/);
  for (let i = 1; i < queryBlocks.length; i++) {
    const block = queryBlocks[i].substring(0, 400);
    const keyMatch = block.match(/queryKey:\s*\[['"]([^'"]+)['"]/);
    const hasEnabled = block.includes('enabled:');
    if (keyMatch && !hasEnabled) {
      unshieldedQueries.push(keyMatch[1]);
    }
  }

  if (unshieldedQueries.length > 0) {
    issues.push({
      pilar: 'Pilar 31 (Optimasi Data Fetching - Query Flood)',
      severity: 'KRITIKAL (PENYEBAB UTAMA BERAT)',
      message: `Di UnifiedStaffDashboard.tsx, ditemukan ${unshieldedQueries.length} query tanpa guard 'enabled' yang ketat per tab (${unshieldedQueries.slice(0, 5).join(', ')}...). Saat Kaprog Dashboard dibuka, belasan API role lain (Kurikulum, Sarpras, Rapor, dll) tetap ditembak sekaligus ke server!`
    });
  } else {
    passes.push('Pilar 31 (Optimasi Data Fetching): Query terisolasi dengan enabled guard');
  }
}

// 6. Dual-Layer Caching (StaleTime & gcTime)
const hasStaleTime = cleanContent.includes('staleTime');
if (!hasStaleTime) {
  issues.push({
    pilar: 'Phase 4 Hardening (Dual-Layer Caching - Client State)',
    severity: 'TINGGI (PENYEBAB BERAT)',
    message: `useQuery di KaprogDashboard tidak menentukan 'staleTime' dan 'gcTime'. Setiap window fokus atau tab diklik ulang, frontend langsung melakukan refetch 100% data statistik yang berat dari server.`
  });
} else {
  passes.push('Phase 4 Hardening: Caching client-side aktif');
}

// 7. Backend Caching & Query In-Memory (Phase 4 Skill)
if (fs.existsSync(backendFile)) {
  const backendContent = fs.readFileSync(backendFile, 'utf8');
  const hasBackendCache = backendContent.includes('cache') || backendContent.includes('Cache') || backendContent.includes('memory');
  if (!hasBackendCache) {
    issues.push({
      pilar: 'Phase 4 Hardening (Backend Caching Layer)',
      severity: 'TINGGI (PENYEBAB BERAT)',
      message: `dashboard-kaprog-stats.service.ts tidak memiliki cache in-memory / TTL. Setiap hit request menghitung ulang data absen ribuan siswa dan seluruh jadwal KBM secara real-time.`
    });
  } else {
    passes.push('Phase 4 Hardening: Backend cache terdeteksi');
  }
}

let allFrontendContent = cleanContent;
const tabsDir = path.resolve(__dirname, '../src/components/dashboard/roles/kaprog/tabs');
if (fs.existsSync(tabsDir)) {
  fs.readdirSync(tabsDir).forEach(f => {
    if (f.endsWith('.tsx')) {
      allFrontendContent += '\n' + fs.readFileSync(path.join(tabsDir, f), 'utf8');
    }
  });
}

// 8. Pilar 30: Adaptabilitas Multi-Perangkat (Zero-clipping, compact cards)
const hasResponsiveCards = allFrontendContent.includes('compact-premium') || allFrontendContent.includes('mobileCompact');
const hasOverflowXHidden = allFrontendContent.includes('overflow-x-');
if (!hasResponsiveCards) {
  issues.push({
    pilar: 'Pilar 30 (Adaptabilitas Responsif Multi-Perangkat)',
    severity: 'MEDIUM',
    message: `Kartu statistik belum menggunakan opsi compact untuk mobile, berpotensi memakan ruang vertikal layar HP terlalu besar.`
  });
} else {
  passes.push('Pilar 30: Adaptabilitas mobile compact aktif');
}

// Cetak Laporan
console.log('--- ✅ PILAR YANG SUDAH SESUAI STANDAR ---');
passes.forEach(p => console.log(`  ✅ ${p}`));

console.log('\n--- ⚠️ TEMUAN HARDENING & AKAR MASALAH PERFORMA BERAT ---');
issues.forEach((iss, idx) => {
  console.log(`\n[${idx + 1}] ${iss.pilar} — TINGKAT: ${iss.severity}`);
  console.log(`    ${iss.message}`);
});

console.log('\n=======================================================\n');
