const path = require('path');
const fs = require('fs');
const innosetupCompiler = require('innosetup-compiler');

const ROOT_DIR = path.join(__dirname, '..');
const issPath = path.join(ROOT_DIR, 'scripts', 'absenta-wizard-installer.iss');

console.log('===========================================================');
console.log('🚀 COMPILING NATIVE WINDOWS GUI INSTALLER WIZARD (.EXE)');
console.log('   Google Enterprise Standard & Inno Setup Native GUI');
console.log('===========================================================');

innosetupCompiler(issPath, { gui: false, verbose: true }, (err) => {
  if (err) {
    console.error('❌ Gagal mem-build Installer Wizard:', err.message);
    process.exit(1);
  }
  
  const setupExePath = path.join(ROOT_DIR, 'scripts', 'Output', 'Setup-Absenta-v1.0.exe');
  console.log('🎉 [SUKSES COMPILATION] NATIVE WINDOWS GUI INSTALLER READY!');
  console.log('===========================================================');
  console.log('🟢 FILE INSTALLER WIZARD TERBENTUK DI: ' + setupExePath);
  console.log('   Fitur GUI Installer:');
  console.log('   - 🖥️  Classic Windows Setup Wizard (Next -> Next -> Finish)');
  console.log('   - 📝 Form Input GUI untuk .env (Nama Sekolah, License Key, Port)');
  console.log('   - 🛡️ Double Layer HKI Obfuscation (Backend 824 File Terenkripsi)');
  console.log('   - 🚀 Auto Desktop Icon & Start Menu Shortcut');
  console.log('===========================================================');
});
