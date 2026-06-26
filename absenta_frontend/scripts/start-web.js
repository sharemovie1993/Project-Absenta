const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Set process title
process.title = 'absenta-web';

const frontendPort = process.env.PORT || '5175';
const distPath = path.join(__dirname, '..', 'dist');

// 1. Check if dist folder exists
if (!fs.existsSync(distPath)) {
  console.error('\x1b[31m[Frontend] ERROR: Folder "dist" tidak ditemukan!\x1b[0m');
  console.error('\x1b[33m[Frontend] Silakan jalankan "npm run build" terlebih dahulu di mesin baru.\x1b[0m');
  process.exit(1);
}

console.log(`[Frontend] Starting web server on port ${frontendPort}...`);

// 2. Use npx to run serve - more robust across different machines/installations
const child = spawn('npx', ['serve', '-s', 'dist', '-l', frontendPort], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  shell: true, // Required for npx on Windows
  windowsHide: true
});

// Signal PM2 that the frontend is ready after a short delay
// Ideally, we would check if the port is actually open
setTimeout(() => {
  if (process.send) {
    process.send('ready');
  }
}, 3000);

child.on('exit', (code) => {
  process.exit(code);
});

