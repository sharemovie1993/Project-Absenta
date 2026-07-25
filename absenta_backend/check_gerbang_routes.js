const fs = require('fs');
const path = require('path');

function searchFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) searchFiles(full);
    else if (full.endsWith('.ts')) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes('gerbang') || content.includes('tap')) {
        console.log('File:', full);
      }
    }
  }
}

searchFiles('d:/BarayaProject/Project Absenta/absenta_backend/src/modules/attendance');
