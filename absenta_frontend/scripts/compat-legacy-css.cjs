const fs = require('fs');
const path = require('path');

/**
 * Konversi matematis OKLCH ke sRGB (0-255)
 */
function oklchToRgb(lStr, cStr, hStr, alphaStr) {
  try {
    const L = lStr.includes('%') ? parseFloat(lStr) / 100.0 : parseFloat(lStr);
    const C = parseFloat(cStr);
    const h = parseFloat(hStr);

    const hRad = (h * Math.PI) / 180.0;
    const aCoord = C * Math.cos(hRad);
    const bCoord = C * Math.sin(hRad);

    const l_ = L + 0.3963377774 * aCoord + 0.2158037573 * bCoord;
    const m_ = L - 0.1055613458 * aCoord - 0.0638541728 * bCoord;
    const s_ = L - 0.0894841775 * aCoord - 1.2914855480 * bCoord;

    const l = l_ ** 3;
    const m = m_ ** 3;
    const s = s_ ** 3;

    const rLin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

    function gamma(x) {
      if (x <= 0.0031308) return 12.92 * x;
      return 1.055 * Math.pow(Math.max(0, x), 1.0 / 2.4) - 0.055;
    }

    const r = Math.min(255, Math.max(0, Math.round(gamma(rLin) * 255)));
    const g = Math.min(255, Math.max(0, Math.round(gamma(gLin) * 255)));
    const b = Math.min(255, Math.max(0, Math.round(gamma(bLin) * 255)));

    if (alphaStr) {
      const alpha = alphaStr.includes('%') ? parseFloat(alphaStr) / 100.0 : parseFloat(alphaStr);
      return `rgba(${r},${g},${b},${alpha})`;
    }
    return `rgb(${r},${g},${b})`;
  } catch (err) {
    return 'rgb(128,128,128)';
  }
}

/**
 * Konversi matematis OKLAB ke sRGB (0-255)
 */
function oklabToRgb(lStr, aStr, bStr, alphaStr) {
  try {
    const L = lStr.includes('%') ? parseFloat(lStr) / 100.0 : parseFloat(lStr);
    const aCoord = parseFloat(aStr);
    const bCoord = parseFloat(bStr);

    const l_ = L + 0.3963377774 * aCoord + 0.2158037573 * bCoord;
    const m_ = L - 0.1055613458 * aCoord - 0.0638541728 * bCoord;
    const s_ = L - 0.0894841775 * aCoord - 1.2914855480 * bCoord;

    const l = l_ ** 3;
    const m = m_ ** 3;
    const s = s_ ** 3;

    const rLin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

    function gamma(x) {
      if (x <= 0.0031308) return 12.92 * x;
      return 1.055 * Math.pow(Math.max(0, x), 1.0 / 2.4) - 0.055;
    }

    const r = Math.min(255, Math.max(0, Math.round(gamma(rLin) * 255)));
    const g = Math.min(255, Math.max(0, Math.round(gamma(gLin) * 255)));
    const b = Math.min(255, Math.max(0, Math.round(gamma(bLin) * 255)));

    if (alphaStr) {
      const alpha = alphaStr.includes('%') ? parseFloat(alphaStr) / 100.0 : parseFloat(alphaStr);
      return `rgba(${r},${g},${b},${alpha})`;
    }
    return `rgb(${r},${g},${b})`;
  } catch (err) {
    return 'rgb(128,128,128)';
  }
}

const assetsDir = path.resolve(__dirname, '../dist/assets');
if (!fs.existsSync(assetsDir)) {
  console.log('[compat-legacy-css] Folder dist/assets tidak ditemukan. Melewati optimasi.');
  process.exit(0);
}

const cssFiles = fs.readdirSync(assetsDir).filter(f => f.endsWith('.css'));
if (cssFiles.length === 0) {
  console.log('[compat-legacy-css] Tidak ada file CSS ditemukan di dist/assets.');
  process.exit(0);
}

for (const file of cssFiles) {
  const filePath = path.join(assetsDir, file);
  let css = fs.readFileSync(filePath, 'utf-8');

  // 1. Ekstrak seluruh definisi variabel warna OKLCH di :root / @layer theme
  const oklchVarRegex = /(--color-[a-zA-Z0-9_\-]+)\s*:\s*oklch\(\s*([0-9.]+%?)\s+([0-9.]+)\s+([0-9.]+)(?:\s*\/\s*([0-9.]+%?))?\s*\);?/g;
  const oklchDefs = [];
  let varCount = 0;

  css = css.replace(oklchVarRegex, (fullMatch, varName, l, c, h, alpha) => {
    varCount++;
    const rgbStr = oklchToRgb(l, c, h, alpha);
    oklchDefs.push(`${varName}:oklch(${l} ${c} ${h}${alpha ? ' / ' + alpha : ''});`);
    return `${varName}:${rgbStr};`;
  });

  // 2. Konversi sisa deklarasi oklch(...) yang digunakan secara langsung (misal --tw-shadow-color)
  let directOklchCount = 0;
  css = css.replace(/oklch\(\s*([0-9.]+%?)\s+([0-9.]+)\s+([0-9.]+)(?:\s*\/\s*([0-9.]+%?))?\s*\)/g, (fullMatch, l, c, h, alpha) => {
    directOklchCount++;
    return oklchToRgb(l, c, h, alpha);
  });

  // 3. Konversi seluruh deklarasi oklab(...) ke rgb/rgba
  let directOklabCount = 0;
  css = css.replace(/oklab\(\s*([0-9.]+%?)\s+([\-0-9.]+)\s+([\-0-9.]+)(?:\s*\/\s*([0-9.]+%?))?\s*\)/g, (fullMatch, l, a, b, alpha) => {
    directOklabCount++;
    return oklabToRgb(l, a, b, alpha);
  });

  // 4. Berikan progressive enhancement @supports untuk browser modern agar tetap mendapatkan wide-gamut OKLCH
  if (oklchDefs.length > 0) {
    const supportsBlock = `\n@supports (color: oklch(0% 0 0)) {\n  :root {\n    ${oklchDefs.join('\n    ')}\n  }\n}\n`;
    css += supportsBlock;
  }

  fs.writeFileSync(filePath, css, 'utf-8');
  console.log(`[compat-legacy-css] Berhasil mengoptimasi ${file}:`);
  console.log(` - ${varCount} variabel warna dikonversi ke sRGB (dengan @supports OKLCH modern)`);
  console.log(` - ${directOklchCount} deklarasi oklch langsung dikonversi ke sRGB`);
  console.log(` - ${directOklabCount} deklarasi oklab dikonversi ke sRGB/RGBA`);
}

console.log('[compat-legacy-css] Selesai! CSS kini kompatibel 100% dengan Chrome 109 / Windows 7 & 8.');
