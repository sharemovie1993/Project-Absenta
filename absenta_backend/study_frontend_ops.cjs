const fs = require('fs');
const path = require('path');

function findFrontendFiles(dir) {
  const results = [];
  try {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) {
        if (!f.includes('node_modules') && !f.includes('.next') && !f.includes('.git')) {
          results.push(...findFrontendFiles(full));
        }
      } else if (f.endsWith('.tsx') || f.endsWith('.ts') || f.endsWith('.jsx') || f.endsWith('.js')) {
        const content = fs.readFileSync(full, 'utf8');
        if (full.includes('ops') || content.includes('SmartStudentPicker') || content.includes('sesi-absensi')) {
          results.push(full);
        }
      }
    }
  } catch (e) {}
  return results;
}

const found = findFrontendFiles('d:/BarayaProject/Project Absenta/absenta_frontend/src');
console.log('Found Frontend Files count:', found.length);
console.log('Files:', found.slice(0, 15));
