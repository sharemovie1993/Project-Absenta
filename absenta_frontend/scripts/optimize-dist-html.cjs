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

// 2. Remove non-critical modulepreloads from initial HTML document (keep only entry bundle)
const preloadCountBefore = (html.match(/<link rel="modulepreload"/g) || []).length;
html = html.replace(
  /\s*<link rel="modulepreload" crossorigin href="\/assets\/(?!index|vendor-react)[^"]+\.js">/g,
  ''
);
const preloadCountAfter = (html.match(/<link rel="modulepreload"/g) || []).length;
console.log(`✅ [optimize-dist-html] Cleaned up modulepreloads (${preloadCountBefore} -> ${preloadCountAfter}).`);

fs.writeFileSync(distIndexPath, html, 'utf-8');
console.log('🚀 [optimize-dist-html] dist/index.html optimization complete!');
