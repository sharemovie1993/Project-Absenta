const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const DIST_DIR = path.join(__dirname, '..', 'dist');

function getAllJsFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllJsFiles(fullPath, arrayOfFiles);
    } else if (file.endsWith('.js')) {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

function obfuscateBuild() {
  console.log('🛡️  Memulai Pengacakan & Enkripsi HKI Absenta Backend...');
  const startTime = Date.now();

  if (!fs.existsSync(DIST_DIR)) {
    console.error('❌ Folder dist/ tidak ditemukan. Jalankan tsc terlebih dahulu.');
    process.exit(1);
  }

  const jsFiles = getAllJsFiles(DIST_DIR);
  console.log(`📦 Mengacak & Memproteksi ${jsFiles.length} file JavaScript di dist/...`);

  let count = 0;
  jsFiles.forEach((filePath) => {
    try {
      const code = fs.readFileSync(filePath, 'utf8');
      
      // Fast & High Security AST Obfuscation Preset (Scrambles names, strings, keys & AST into hexadecimal)
      const obfuscatedResult = JavaScriptObfuscator.obfuscate(code, {
        compact: true,
        simplify: true,
        identifierNamesGenerator: 'hexadecimal',
        stringArray: true,
        stringArrayCallsTransform: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: 0.75,
        splitStrings: true,
        splitStringsChunkLength: 12,
        transformObjectKeys: true
      });

      fs.writeFileSync(filePath, obfuscatedResult.getObfuscatedCode(), 'utf8');
      count++;
    } catch (err) {
      console.warn(`⚠️ Warning: Gagal mengacak file ${path.basename(filePath)}: ${err.message}`);
    }
  });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`🟢 [PROTEKSI HKI SUKSES] Berhasil memproteksi ${count} file biner dalam ${durationSec} detik!`);
}

obfuscateBuild();
