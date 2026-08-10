const fs = require('fs');
const path = require('path');
const os = require('os');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const JavaScriptObfuscator = require('javascript-obfuscator');

const DIST_DIR = path.join(__dirname, '..', 'dist');

if (!isMainThread) {
  // Worker Thread Logic
  const obfuscateOptions = {
    compact: true,
    simplify: true,
    identifierNamesGenerator: 'hexadecimal',
    stringArray: true,
    stringArrayCallsTransform: true,
    stringArrayThreshold: 0.5,
    transformObjectKeys: true
  };

  const files = workerData.files || [];
  let count = 0;
  for (const filePath of files) {
    try {
      const code = fs.readFileSync(filePath, 'utf8');
      const obfuscatedResult = JavaScriptObfuscator.obfuscate(code, obfuscateOptions);
      fs.writeFileSync(filePath, obfuscatedResult.getObfuscatedCode(), 'utf8');
      count++;
    } catch (err) {
      console.warn(`⚠️ Warning: Gagal mengacak file ${path.basename(filePath)}: ${err.message}`);
    }
  }
  parentPort.postMessage({ successCount: count });
  process.exit(0);
}

// Main Thread Logic
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

async function obfuscateBuild() {
  if (process.env.NO_OBFUSCATE === 'true' || process.env.SKIP_OBFUSCATE === 'true') {
    console.log('⏩ [PROTEKSI HKI] Melewati pengacakan kode (SKIP_OBFUSCATE=true)');
    return;
  }

  console.log('🛡️  Memulai Pengacakan & Enkripsi HKI Absenta Backend (Parallel Worker Mode)...');
  const startTime = Date.now();

  if (!fs.existsSync(DIST_DIR)) {
    console.error('❌ Folder dist/ tidak ditemukan. Jalankan tsc terlebih dahulu.');
    process.exit(1);
  }

  const jsFiles = getAllJsFiles(DIST_DIR);
  console.log(`📦 Mengacak & Memproteksi ${jsFiles.length} file JavaScript di dist/...`);

  const numCores = Math.max(1, os.cpus().length);
  console.log(`⚡ Menggunakan ${numCores} CPU Worker Cores paralel...`);

  // Chunk files per worker
  const chunks = Array.from({ length: numCores }, () => []);
  jsFiles.forEach((file, index) => {
    chunks[index % numCores].push(file);
  });

  const workerPromises = chunks.map((chunkFiles) => {
    return new Promise((resolve) => {
      if (chunkFiles.length === 0) return resolve(0);
      const worker = new Worker(__filename, {
        workerData: { files: chunkFiles }
      });
      worker.on('message', (msg) => resolve(msg?.successCount || 0));
      worker.on('error', (err) => {
        console.error('Worker error:', err);
        resolve(0);
      });
      worker.on('exit', () => resolve(0));
    });
  });

  const results = await Promise.all(workerPromises);
  const totalCount = results.reduce((acc, c) => acc + c, 0);

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`🟢 [PROTEKSI HKI SUKSES] Berhasil memproteksi ${totalCount} file biner dalam ${durationSec} detik!`);
}

obfuscateBuild();
