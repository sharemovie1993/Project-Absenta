const fs = require('fs');
const path = require('path');

const srcDir = 'c:\\Users\\SERVER-DELL\\Documents\\Project Absenta\\absenta_frontend\\src';

function searchDir(dir, query) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath, query);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.toLowerCase().includes(query.toLowerCase())) {
        console.log(`Found "${query}" in ${fullPath}`);
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.toLowerCase().includes(query.toLowerCase())) {
            console.log(`  L${idx + 1}: ${line.trim()}`);
          }
        });
      }
    }
  }
}

searchDir(srcDir, 'bottom-nav');
searchDir(srcDir, 'bottomnav');
searchDir(srcDir, 'MobileNavigation');
searchDir(srcDir, 'MobileLayout');
