const fs = require('fs');

const posCapPath = 'd:/BarayaProject/Project Absenta/absenta_backend/src/config/position-capabilities.ts';
const catalogPath = 'd:/BarayaProject/Project Absenta/absenta_backend/docs/action_catalog.md';

const caps = new Set();

function extractFromContent(content) {
  const re = /'([a-z][a-z0-9.]{4,})'/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const val = m[1];
    if (val.includes('.') && val.split('.').length >= 2) {
      caps.add(val);
    }
  }
  // Also extract from backtick code in markdown
  const re2 = /`([a-z][a-z0-9.]{4,})`/g;
  while ((m = re2.exec(content)) !== null) {
    const val = m[1];
    if (val.includes('.') && val.split('.').length >= 2) {
      caps.add(val);
    }
  }
}

if (fs.existsSync(posCapPath)) extractFromContent(fs.readFileSync(posCapPath, 'utf-8'));
if (fs.existsSync(catalogPath)) extractFromContent(fs.readFileSync(catalogPath, 'utf-8'));

const sorted = [...caps].sort();
console.log('Total caps from backend:', sorted.length);
fs.writeFileSync('scripts/backend_caps_groundtruth.json', JSON.stringify(sorted, null, 2));
console.log('Saved to scripts/backend_caps_groundtruth.json');
sorted.forEach(c => console.log(c));
