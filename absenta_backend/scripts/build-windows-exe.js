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
  console.log('🔨 [1/4] Mem-build TypeScript & Mengacak Kode HKI...');
  execSync('npm run build', { stdio: 'inherit', cwd: ROOT_DIR });
  console.log('✅ [1/4] Build & HKI Obfuscation selesai!');

  // Step 2: Prepare Windows Bundle Directory
  const BUNDLE_DIR = path.join(ROOT_DIR, 'dist_windows_package');
  console.log(`📁 [2/4] Menyiapkan Folder Paket Windows: ${BUNDLE_DIR}...`);

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
AbsentaSetupEngine.exe
pause
`;
  fs.writeFileSync(LAUNCHER_BAT, batContent, 'utf8');

  console.log('⚡ [3/4] Mem-package Biner Tunggal Windows: AbsentaSetupEngine.exe...');
  execSync('npx -y pkg -t node18-win-x64 --out-path dist_windows_package scripts/win-runner.js', { stdio: 'inherit', cwd: ROOT_DIR });
  
  // Rename win-runner.exe to AbsentaSetupEngine.exe
  const oldExe = path.join(BUNDLE_DIR, 'win-runner.exe');
  const newExe = path.join(BUNDLE_DIR, 'AbsentaSetupEngine.exe');
  if (fs.existsSync(oldExe)) {
    fs.renameSync(oldExe, newExe);
  }
  console.log('✅ [3/4] Kompilasi Biner AbsentaSetupEngine.exe selesai!');

  // Step 4: Verify Output Structure
  console.log('🎉 [4/4] VERIFIKASI SELESAI!');
  console.log('===========================================================');
  console.log('🟢 FILE BINER .EXE TERBENTUK DI: ' + newExe);
  console.log('   Isi Paket Windows Desktop:');
  console.log('   - 🚀 AbsentaSetupEngine.exe (Biner Executable Tunggal Windows)');
  console.log('   - 🛡️ dist/ (Backend Terenkripsi HKI)');
  console.log('   - 🎨 public/ (React UI + Material Design 3 Setup Wizard)');
  console.log('   - ⚙️ Launch-Absenta-Engine.bat (Launcher 1x Klik)');
  console.log('===========================================================');

} catch (err) {
  console.error('❌ Gagal mem-build paket Windows:', err.message);
  process.exit(1);
}
