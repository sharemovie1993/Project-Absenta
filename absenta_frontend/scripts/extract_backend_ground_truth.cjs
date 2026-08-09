const fs = require('fs');

const posCapPath = 'd:/BarayaProject/Project Absenta/absenta_backend/src/config/position-capabilities.ts';
const catalogPath = 'd:/BarayaProject/Project Absenta/absenta_backend/docs/action_catalog.md';

const caps = new Set();

function extractFromContent(content) {
  // Tangkap string dalam kutip tunggal/ganda
  const re1 = /'([a-z][a-z0-9.]{4,})'/g;
  let m;
  while ((m = re1.exec(content)) !== null) {
    const val = m[1];
    if (val.includes('.') && val.split('.').length >= 2) caps.add(val);
  }
  // Tangkap dotted strings yang muncul sebagai kata mandiri (untuk action_catalog.md)
  const re2 = /\b([a-z][a-z0-9]+(?:\.[a-z][a-z0-9_]+){1,})\b/g;
  while ((m = re2.exec(content)) !== null) {
    const val = m[1];
    // Filter noise: harus mengandung minimal 1 titik dan bukan nama file/path
    if (val.includes('.') && val.split('.').length >= 2
        && !val.endsWith('.ts') && !val.endsWith('.js')
        && !val.endsWith('.md') && !val.endsWith('.json')
        && !val.startsWith('http') && val !== 'capabilities.ts'
        && val !== 'seed.ts') {
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
