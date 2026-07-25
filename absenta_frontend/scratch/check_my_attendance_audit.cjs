const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, '../src/pages/attendance/MyAttendancePage.tsx');
const rawContent = fs.readFileSync(filepath, 'utf8');
const content = rawContent.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');

// 1. Color check
const hasInlineStyleColor = /style\s*=\s*\{\{\s*[^}]*(color|background|bg|border|fill|stroke)\s*:\s*['"`](?:#|rgb|rgba|hsl|hsla)/i.test(content);
const hasArbitraryColor = /\[#([0-9a-fA-F]{3,8})\]/g.test(content);

const validWeights = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
const tailwindColorRegex = /(?:bg|text|border|ring|from|to|via)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(\d+)\b/g;

let hasInvalidTailwindColors = false;
let colorMatches = [];
let colorMatch;
while ((colorMatch = tailwindColorRegex.exec(content)) !== null) {
  const weight = colorMatch[1];
  if (!validWeights.includes(weight)) {
    hasInvalidTailwindColors = true;
    colorMatches.push(colorMatch[0]);
  }
}

console.log('--- COLOR AUDIT RESULTS ---');
console.log('hasInlineStyleColor:', hasInlineStyleColor);
console.log('hasArbitraryColor:', hasArbitraryColor);
console.log('hasInvalidTailwindColors:', hasInvalidTailwindColors, colorMatches);

// 2. Mock / Config check
const hasMockData = /\b(const|let|var)\s+\w*(mock|dummy|sample|temp(?!late)|test(?!ing))\w*\s*=/i.test(content);
const hasStaticApiUrl = /https?:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|api\b)/i.test(content);

console.log('\n--- CONFIG AUDIT RESULTS ---');
console.log('hasMockData:', hasMockData);
console.log('hasStaticApiUrl:', hasStaticApiUrl);

// If mock data is found, print matching lines
if (hasMockData) {
  console.log('\nMatching mock data lines:');
  const lines = content.split('\n');
  const mockRe = /\b(const|let|var)\s+\w*(mock|dummy|sample|temp(?!late)|test(?!ing))\w*\s*=/i;
  lines.forEach((line, idx) => {
    if (mockRe.test(line)) {
      console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
  });
}

// If static API URL is found, print matching lines
if (hasStaticApiUrl) {
  console.log('\nMatching static API URL lines:');
  const lines = content.split('\n');
  const apiRe = /https?:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|api\b)/i;
  lines.forEach((line, idx) => {
    if (apiRe.test(line)) {
      console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
  });
}
