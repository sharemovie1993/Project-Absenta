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
      if (content.toLowerCase().includes(pattern.toLowerCase())) {
        console.log('Match in:', fullPath);
      }
    }
  }
}

console.log('=== SEARCHING FOR MENU / SIDEBAR ROUTES IN BACKEND ===');
searchDir('d:/BarayaProject/Project Absenta/absenta_backend/src', 'menu');
