import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function searchInDir(dir: string, pattern: RegExp, results: string[] = []) {
  try {
    const files = readdirSync(dir);
    for (const file of files) {
      if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'build') continue;
      const fullPath = join(dir, file);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        searchInDir(fullPath, pattern, results);
      } else if (/\.(ts|tsx|js|json)$/.test(file)) {
        const content = readFileSync(fullPath, 'utf8');
        if (pattern.test(content)) {
          results.push(fullPath);
        }
      }
    }
  } catch (e) {}
  return results;
}

const backendMatches = searchInDir('d:/BarayaProject/Project Absenta/absenta_backend/src', /wilayah|provinsi|kemendagri/i);
const frontendMatches = searchInDir('d:/BarayaProject/Project Absenta/absenta_frontend/src', /wilayah|provinsi|api\.binderbyte|emsifa|bps/i);

console.log('Backend Matches:', backendMatches);
console.log('Frontend Matches:', frontendMatches);
