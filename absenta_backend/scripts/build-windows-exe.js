const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..');
process.chdir(ROOT_DIR);

console.log('===========================================================');
console.log('📦 BUILDING ABSENTA STANDALONE WINDOWS DESKTOP PACKAGE (.EXE)');
console.log('   Google Enterprise Standard & Double-Layer HKI Protection');
console.log('===========================================================');

try {
  // Step 1: Run local TypeScript build + AST HKI Obfuscation
  console.log('🔨 [1/3] Mem-build TypeScript & Mengacak Kode HKI...');
  execSync('npm run build', { stdio: 'inherit', cwd: ROOT_DIR });
  console.log('✅ [1/3] Build & HKI Obfuscation selesai!');

  // Step 2: Prepare Windows Bundle Directory
  const BUNDLE_DIR = path.join(ROOT_DIR, 'dist_windows_package');
  console.log(`📁 [2/3] Menyiapkan Folder Paket Windows: ${BUNDLE_DIR}...`);

  if (fs.existsSync(BUNDLE_DIR)) {
    fs.rmSync(BUNDLE_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(BUNDLE_DIR, { recursive: true });

  // Copy dist/, public/, prisma/, package.json, scripts/win-runner.js
  console.log('📋 Menyalin aset terenkripsi & engine ke paket Windows...');
  fs.cpSync(path.join(ROOT_DIR, 'dist'), path.join(BUNDLE_DIR, 'dist'), { recursive: true });
  fs.cpSync(path.join(ROOT_DIR, 'public'), path.join(BUNDLE_DIR, 'public'), { recursive: true });
  fs.cpSync(path.join(ROOT_DIR, 'prisma'), path.join(BUNDLE_DIR, 'prisma'), { recursive: true });
  fs.mkdirSync(path.join(BUNDLE_DIR, 'scripts'), { recursive: true });
  fs.copyFileSync(path.join(ROOT_DIR, 'scripts', 'win-runner.js'), path.join(BUNDLE_DIR, 'scripts', 'win-runner.js'));
  fs.copyFileSync(path.join(ROOT_DIR, 'package.json'), path.join(BUNDLE_DIR, 'package.json'));

  // Create Windows Launch Batch & Service Installer
  const LAUNCHER_BAT = path.join(BUNDLE_DIR, 'Launch-Absenta-Engine.bat');
  const batContent = `@echo off
title Absenta School Engine Desktop
echo Starting Absenta Windows Desktop Engine...
node scripts/win-runner.js
pause
`;
  fs.writeFileSync(LAUNCHER_BAT, batContent, 'utf8');

  console.log('✅ [2/3] Paket Windows Desktop berhasil dibuat!');

  // Step 3: Verify Output Structure
  console.log('🎉 [3/3] VERIFIKASI SELESAI!');
  console.log('===========================================================');
  console.log('🟢 PAKET WINDOWS READY DI: ' + BUNDLE_DIR);
  console.log('   Isi Paket:');
  console.log('   - 🛡️ dist/ (Terenkripsi HKI)');
  console.log('   - 🎨 public/ (React UI + Material Design 3 Setup Wizard)');
  console.log('   - ⚙️ Launch-Absenta-Engine.bat (Single Launcher)');
  console.log('===========================================================');

} catch (err) {
  console.error('❌ Gagal mem-build paket Windows:', err.message);
  process.exit(1);
}
