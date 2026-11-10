const fs = require('fs');
const path = require('path');

const distIndexPath = path.resolve(__dirname, '../dist/index.html');

if (!fs.existsSync(distIndexPath)) {
  console.warn('⚠️ [optimize-dist-html] dist/index.html not found, skipping optimization.');
  process.exit(0);
}

let html = fs.readFileSync(distIndexPath, 'utf-8');

// 1. Transform render-blocking CSS link to non-blocking async with preload
const cssRegex = /<link rel="stylesheet" crossorigin href="(\/assets\/[^"]+\.css)">/g;
if (cssRegex.test(html)) {
  html = html.replace(
    cssRegex,
    '<link rel="preload" as="style" href="$1">\n    <link rel="stylesheet" href="$1" media="print" onload="this.media=\'all\'">\n    <noscript><link rel="stylesheet" href="$1"></noscript>'
  );
  console.log('✅ [optimize-dist-html] Render-blocking CSS transformed to non-blocking async with preload.');
} else {
  console.log('ℹ️ [optimize-dist-html] No matching blocking CSS links found.');
}

// 2. Smart modulepreload optimization:
// Preload ONLY chunks that index.js statically imports (to prevent waterfall delays),
// while stripping out lazy-loaded chunks (charts, excel, subpages, modals).
const entryScriptMatch = html.match(/<script type="module" crossorigin src="\/assets\/(index-[^"]+\.js)"><\/script>/);
let criticalChunks = new Set();

if (entryScriptMatch) {
  const entryFileName = entryScriptMatch[1];
  const entryFilePath = path.resolve(__dirname, '../dist/assets', entryFileName);
  if (fs.existsSync(entryFilePath)) {
    const entryContent = fs.readFileSync(entryFilePath, 'utf-8');
    const staticImports = [...entryContent.matchAll(/from\s*["']\.\/([^"']+\.js)["']/g)].map(m => m[1]);
    criticalChunks = new Set(staticImports);
    criticalChunks.add(entryFileName);
    console.log(`ℹ️ [optimize-dist-html] Critical entry dependencies to preload (${criticalChunks.size}):`, [...criticalChunks]);
  }
}

const preloadCountBefore = (html.match(/<link rel="modulepreload"/g) || []).length;
html = html.replace(/\s*<link rel="modulepreload" crossorigin href="\/assets\/([^"]+\.js)">/g, (match, file) => {
  // If we found critical chunks, only keep those that index.js actually statically needs
  if (criticalChunks.size > 0) {
    if (criticalChunks.has(file)) {
      return match;
    }
    return '';
  }
  // Fallback if entry script analysis wasn't available
  if (file.startsWith('index') || file.startsWith('vendor-react')) {
    return match;
  }
  return '';
});
const preloadCountAfter = (html.match(/<link rel="modulepreload"/g) || []).length;
console.log(`✅ [optimize-dist-html] Smart modulepreload filtered (${preloadCountBefore} -> ${preloadCountAfter}).`);

fs.writeFileSync(distIndexPath, html, 'utf-8');
console.log('🚀 [optimize-dist-html] dist/index.html optimization complete!');
