const fs = require('fs');
const path = require('path');

// Folder halaman yang akan diaudit
const targetDirs = [
  path.join(__dirname, '../src/pages/academic'),
  path.join(__dirname, '../src/pages/kesiswaan')
];

console.log('\x1b[36m%s\x1b[0m', '🛡️  MULAI PEMINDAIAN STATIS STANDAR ARSITEKTUR LAYOUT & HARDENING 🛡️');
console.log('\x1b[90m%s\x1b[0m', 'Direktori Target: src/pages/academic & src/pages/kesiswaan\n');

let totalFiles = 0;
let fullyCompliant = 0;
let partialCompliant = 0;
let nonCompliant = 0;

// Fungsi rekursif memindai direktori mencari file .tsx
function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      walkDir(filepath, callback);
    } else if (file.endsWith('.tsx')) {
      callback(filepath);
    }
  });
}

const reports = [];

targetDirs.forEach(dir => {
  walkDir(dir, (filepath) => {
    const relativePath = path.relative(path.join(__dirname, '..'), filepath);
    const filename = path.basename(filepath);
    const content = fs.readFileSync(filepath, 'utf8');

    // Kriteria 1: Memakai AcademicPageLayout
    const usesLayout = content.includes('AcademicPageLayout');
    
    // Kriteria 2: Menyematkan kunci hardening kepatuhan
    const hasHardeningKey = content.includes('hardeningModuleKey=') || content.includes('hardeningModuleKey =');
    
    // Kriteria 3: Mengimpor UI Shared Components
    const usesUiComponents = content.includes('components/ui') || content.includes('@/components/ui');

    let status = 'COMPLIANT';
    const issues = [];

    if (!usesLayout) {
      status = 'NON_COMPLIANT';
      issues.push('❌ Belum menggunakan AcademicPageLayout (Layout tidak terstandar!)');
    }
    
    if (usesLayout && !hasHardeningKey) {
      status = 'PARTIAL';
      issues.push('⚠️  Menggunakan AcademicPageLayout tetapi BELUM menanam hardeningModuleKey (Kepatuhan Kosong)');
    }

    if (!usesUiComponents) {
      issues.push('💡 Tidak mengimpor shared UI components (kemungkinan memakai elemen HTML mentah)');
    }

    totalFiles++;
    if (status === 'COMPLIANT') {
      fullyCompliant++;
    } else if (status === 'PARTIAL') {
      partialCompliant++;
    } else {
      nonCompliant++;
    }

    reports.push({
      relativePath,
      filename,
      status,
      issues
    });
  });
});

// Urutkan laporan: NON_COMPLIANT paling atas, kemudian PARTIAL, lalu COMPLIANT
reports.sort((a, b) => {
  const score = { NON_COMPLIANT: 3, PARTIAL: 2, COMPLIANT: 1 };
  return score[b.status] - score[a.status];
});

// Render console report dengan warna-warna premium ANSI
reports.forEach(report => {
  if (report.status === 'COMPLIANT') {
    console.log('\x1b[32m%s\x1b[0m', `✅ TERSTANDARISASI | ${report.relativePath}`);
  } else if (report.status === 'PARTIAL') {
    console.log('\x1b[33m%s\x1b[0m', `⚠️  SEBAGIAN       | ${report.relativePath}`);
    report.issues.forEach(issue => console.log(`   └─ ${issue}`));
  } else {
    console.log('\x1b[31m%s\x1b[0m', `❌ BELUM STANDAR  | ${report.relativePath}`);
    report.issues.forEach(issue => console.log(`   └─ \x1b[31m${issue}\x1b[0m`));
  }
});

console.log('\n\x1b[36m%s\x1b[0m', '================ RINGKASAN HASIL AUDIT STATIS ================');
console.log(`Total Halaman yang Diaudit : ${totalFiles} file`);
console.log(`\x1b[32mSempurna Terstandarisasi   : ${fullyCompliant} file\x1b[0m`);
console.log(`\x1b[33mSebagian Terstandarisasi   : ${partialCompliant} file\x1b[0m`);
console.log(`\x1b[31mBelum Terstandarisasi      : ${nonCompliant} file\x1b[0m`);
console.log('\x1b[36m%s\x1b[0m', '=============================================================');
