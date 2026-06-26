const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const binDir = path.join(__dirname, 'bin');
if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir);
}

const nodePath = execSync('where node').toString().split('\r\n')[0].trim();
const targets = ['absenta-api.exe', 'absenta-web.exe', 'absenta-redis.exe'];

targets.forEach(target => {
  const dest = path.join(binDir, target);
  try {
    fs.copyFileSync(nodePath, dest);
    console.log(`[Setup] Created custom interpreter: ${target}`);
  } catch (err) {
    console.error(`[Setup] Failed to create ${target}:`, err.message);
  }
});
