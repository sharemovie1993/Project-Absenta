const { spawn } = require('child_process');
const path = require('path');

// Set process title for Task Manager (limited on Windows but helpful for tools)
process.title = 'absenta-web';

const frontendPort = process.env.PORT || '5175';
const servePath = path.join(__dirname, '..', 'node_modules', 'serve', 'build', 'main.js');

console.log(`[Frontend] Starting web server on port ${frontendPort} with title 'absenta-web'...`);

const child = spawn('node', [servePath, '-s', 'dist', '-l', frontendPort], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  windowsHide: true // Total silence
});

child.on('exit', (code) => {
  process.exit(code);
});
