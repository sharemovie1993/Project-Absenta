const fs = require('fs');
const path = require('path');

const mode = process.argv[2]; // 'disable' or 'enable'
const assetsDir = path.resolve(__dirname, '../dist/assets');
const cssFiles = fs.readdirSync(assetsDir).filter(f => f.startsWith('index-') && f.endsWith('.css') && !f.includes('.fixed') && !f.includes('.broken'));

if (cssFiles.length === 0) {
  console.log('No index-*.css found');
  process.exit(1);
}

const file = path.join(assetsDir, cssFiles[0]);
console.log('Operating on:', file);

if (mode === 'disable') {
  // Simpan backup fixed jika belum ada
  const fixedBackup = file + '.fixed';
  if (!fs.existsSync(fixedBackup)) {
    fs.copyFileSync(file, fixedBackup);
  }

  let css = fs.readFileSync(file, 'utf-8');
  const supportsStart = css.lastIndexOf('@supports (color: oklch(0% 0 0))');
  if (supportsStart !== -1) {
    const supportsBlock = css.substring(supportsStart);
    const varMatches = supportsBlock.match(/--color-[a-zA-Z0-9_\-]+:oklch\([^)]+\);/g) || [];
    console.log(`Menonaktifkan fallback... Mengembalikan ${varMatches.length} variabel ke OKLCH murni.`);

    css = css.substring(0, supportsStart);
    for (const vm of varMatches) {
      const varName = vm.split(':')[0];
      const regex = new RegExp(varName + ':rgb\\([^)]+\\);', 'g');
      css = css.replace(regex, vm);
    }
    fs.writeFileSync(file, css, 'utf-8');
    console.log('✅ STATUS: Legacy Fallback DINONAKTIFKAN (OKLCH murni aktif).');
  } else {
    console.log('Supports block tidak ditemukan, mungkin sudah dinonaktifkan.');
  }
} else if (mode === 'enable') {
  const fixedBackup = file + '.fixed';
  if (fs.existsSync(fixedBackup)) {
    fs.copyFileSync(fixedBackup, file);
    console.log('✅ STATUS: Legacy Fallback DIAKTIFKAN KEMBALI (sRGB fallback aktif).');
  } else {
    // Jalankan compat-legacy-css.cjs
    require('./compat-legacy-css.cjs');
    console.log('✅ STATUS: Legacy Fallback DIAKTIFKAN KEMBALI via compat-legacy-css.');
  }
} else {
  console.log('Usage: node toggle-legacy.cjs [disable|enable]');
}
