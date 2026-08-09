const path = require('path');
const fs = require('fs');

// Ensure root directory is cwd
const ROOT_DIR = path.join(__dirname, '..');
process.chdir(ROOT_DIR);

const ENV_PATH = path.join(ROOT_DIR, '.env');
const FRONTEND_DIST = path.join(ROOT_DIR, '..', 'absenta_frontend', 'dist');
const BACKEND_DIST = path.join(ROOT_DIR, 'dist');

console.log('====================================================');
console.log('🚀 ABSENTA ENTERPRISE WINDOWS DESKTOP ENGINE (v1.0)');
console.log('   Google Engineering Standard & HKI Protected');
console.log('====================================================');

// Check if .env exists, if not create default initial environment
if (!fs.existsSync(ENV_PATH)) {
  console.log('⚙️  [FIRST-RUN DETECTED] Creating initial environment configuration...');
  const initialEnv = `PORT=5000
HOST=0.0.0.0
NODE_ENV=production
DATABASE_URL="file:./prisma/dev.db"
LICENSE_KEY="DEMO-UNCONFIGURED-KEY"
SCHOOL_NAME="Absenta School Engine"
SETUP_COMPLETED=false
`;
  fs.writeFileSync(ENV_PATH, initialEnv, 'utf8');
}

// Require dotenv to load configuration
require('dotenv').config();

// Verify dist/ exists, if not fallback
if (!fs.existsSync(BACKEND_DIST)) {
  console.error('❌ Folder dist/ backend tidak ditemukan. Pastikan build telah dijalankan.');
  process.exit(1);
}

// Start Main Application Engine from obfuscated dist/main.js
try {
  console.log('🛡️  Memuat Engine Backend Terenkripsi HKI...');
  require(path.join(BACKEND_DIST, 'main.js'));
  console.log('🟢 [DESKTOP ENGINE ACTIVE] Absenta Engine berhasil dinyalakan!');
} catch (err) {
  console.error('❌ Gagal menyalakan Absenta Desktop Engine:', err);
  process.exit(1);
}
