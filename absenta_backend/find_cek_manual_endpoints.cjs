const fs = require('fs');
const path = require('path');

function searchInBackend(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (!f.includes('node_modules') && !f.includes('.git')) {
        searchInBackend(full);
      }
    } else if (f.endsWith('.ts') || f.endsWith('.js')) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes('notPresent') || content.includes('getNotPresent') || content.includes('markGate') || content.includes('CekManual') || content.includes('cek-manual')) {
        console.log('Match found in:', full);
      }
    }
  }
}

searchInBackend('d:/BarayaProject/Project Absenta/absenta_backend/src');
