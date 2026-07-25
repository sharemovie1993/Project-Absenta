const fs = require('fs');
const path = require('path');

function searchDir(dir, pattern) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath, pattern);
    } else if (file.endsWith('.ts') || file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.toLowerCase().includes('jadwal') || content.toLowerCase().includes('schedule')) {
        if (content.includes('router.get') || content.includes('.get(')) {
          console.log('Match found in:', fullPath);
          const lines = content.split('\n');
          lines.forEach((l, i) => {
            if ((l.includes('router.get') || l.includes('.get(')) && (l.includes('jadwal') || l.includes('schedule'))) {
              console.log(`  L${i+1}:`, l.trim());
            }
          });
        }
      }
    }
  }
}

searchDir('d:/BarayaProject/Project Absenta/absenta_backend/src', 'jadwal');
