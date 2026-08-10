const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../src');
const TARGET_STORE = path.resolve(SRC, 'store/authStore');

function fixAllAuthStoreImports(dir) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      fixAllAuthStoreImports(full);
    } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
      let content = fs.readFileSync(full, 'utf-8');
      if (content.includes('store/authStore')) {
        const fileDir = path.dirname(full);
        let correctRel = path.relative(fileDir, TARGET_STORE).replace(/\\/g, '/');
        if (!correctRel.startsWith('.')) correctRel = './' + correctRel;
        
        const newContent = content.replace(/from\s+['"][^'"]*store\/authStore['"]/g, `from '${correctRel}'`);
        if (newContent !== content) {
          fs.writeFileSync(full, newContent);
          console.log(`Fixed: ${full.replace(SRC, 'src')} => ${correctRel}`);
        }
      }
    }
  }
}

fixAllAuthStoreImports(path.join(SRC, 'pages/academic'));
fixAllAuthStoreImports(path.join(SRC, 'components/academic'));
