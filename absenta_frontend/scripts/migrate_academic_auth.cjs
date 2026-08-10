const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src');

function fixFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf-8');
  if (!content.includes('useAuth')) return;

  // Replace import
  content = content.replace(/import\s+\{\s*useAuth\s*\}\s+from\s+['"][^'"]+['"];?/g, (match) => {
    const depth = filePath.split(path.sep).length - SRC_DIR.split(path.sep).length;
    const relPath = '../'.repeat(depth) + 'store/authStore';
    return `import { useAuthStore } from '${relPath}';`;
  });

  // Replace hook calls
  content = content.replace(/useAuth\(\)/g, 'useAuthStore()');

  fs.writeFileSync(filePath, content);
  console.log('Migrated: ' + filePath.replace(SRC_DIR, 'src'));
}

const ACADEMIC_DIRS = [
  path.join(SRC_DIR, 'pages/academic'),
  path.join(SRC_DIR, 'components/academic')
];

function scanAndFix(dir) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) scanAndFix(full);
    else if (f.endsWith('.tsx') || f.endsWith('.ts')) fixFile(full);
  }
}

ACADEMIC_DIRS.forEach(d => scanAndFix(d));
