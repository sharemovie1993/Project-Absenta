import fs from 'fs';
import path from 'path';

const baseDir = 'c:/Users/SERVER-DELL/Documents/Project Absenta/absenta_frontend/src/pages';
const targetDirs = ['attendance', 'cooperative', 'sarpras', 'hubin'];

function checkFiles(dir: string) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      checkFiles(fullPath);
    } else if (item.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (!content.includes('PremiumFeatureGate')) {
        console.log(`Missing PremiumFeatureGate: ${fullPath}`);
      }
    }
  }
}

for (const target of targetDirs) {
  const dirPath = path.join(baseDir, target);
  if (fs.existsSync(dirPath)) {
    console.log(`Checking ${target}...`);
    checkFiles(dirPath);
  }
}
