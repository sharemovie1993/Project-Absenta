const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'src/pages');

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      walkDir(filepath, callback);
    } else if (file.endsWith('.tsx')) {
      callback(filepath);
    }
  });
}

const found = [];
walkDir(targetDir, (filepath) => {
  const filename = path.basename(filepath);
  const isCooperativePage = filepath.replace(/\\/g, '/').includes('/pages/cooperative/') && !filename.includes('Detail');
  const isPageRouterEntry = filename.endsWith('Page.tsx') || filename === 'Login.tsx' || filename === 'TestLogin.tsx' || isCooperativePage;
  
  if (filename.includes('Product')) {
    found.push({
      filepath,
      isCooperativePage,
      isPageRouterEntry
    });
  }
});

console.log(JSON.stringify(found, null, 2));
