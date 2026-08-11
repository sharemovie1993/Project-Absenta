import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function findRegisterRoutes(dir: string) {
  const files = readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.git' || file === 'dist') continue;
    const fullPath = join(dir, file);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      findRegisterRoutes(fullPath);
    } else if (/\.(ts|js)$/.test(file)) {
      const content = readFileSync(fullPath, 'utf8');
      if (content.includes('registerRoutes')) {
        console.log('Found registerRoutes in:', fullPath);
      }
    }
  }
}

findRegisterRoutes('d:/BarayaProject/Project Absenta/absenta_backend/src');
