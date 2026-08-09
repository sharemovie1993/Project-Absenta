/**
 * STANDARDIZE ROUTE PATTERNS + INJECT determineDataScope()
 * =========================================================
 * Skrip ini melakukan DUA hal sekaligus:
 * 1. Menstandarisasi pola rute API ke pola standar preHandler: [...]
 * 2. Menyuntikkan determineDataScope() ke dalam setiap preHandler
 *
 * TARGET: 62 file route yang belum punya determineDataScope() sama sekali.
 * SKIP:   File yang sudah punya determineDataScope() (termasuk addHook pattern).
 *
 * STRATEGI PARSING:
 * - Gunakan paren-counter berbasis karakter untuk ekstrak setiap route call block
 * - Tidak menggunakan regex multi-line naif yang rentan terhadap false positives
 * - Test setiap transformer secara independen sebelum apply
 */

import * as fs from 'fs';
import * as path from 'path';

const MODULES_DIR = path.join(__dirname, '../../src/modules');
const DATA_SCOPE_FN = 'determineDataScope()';
const IMPORT_LINE = "import { determineDataScope } from '@/middlewares/dataScope';";

// ─────────────────────────────────────────────────────────────────────────────
// Rekursif ambil semua *.routes.ts
// ─────────────────────────────────────────────────────────────────────────────
function getAllRouteFiles(dirPath: string, arr: string[] = []): string[] {
  if (!fs.existsSync(dirPath)) return arr;
  for (const f of fs.readdirSync(dirPath)) {
    const full = path.join(dirPath, f);
    if (fs.statSync(full).isDirectory()) getAllRouteFiles(full, arr);
    else if (f.endsWith('.routes.ts')) arr.push(full);
  }
  return arr;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pastikan import determineDataScope ada di file
// ─────────────────────────────────────────────────────────────────────────────
function ensureImport(content: string): string {
  // Cek apakah import statement sudah ada (bukan hanya penggunaan di kode)
  if (content.includes("import { determineDataScope }") || content.includes("import {determineDataScope}")) return content;

  const lines = content.split('\n');
  let lastImportIdx = -1;

  // Temukan baris terakhir dari import statement yang SELESAI (mengandung 'from')
  // Ini menghindari menyisipkan di tengah multi-line import
  let inMultiLineImport = false;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!inMultiLineImport && /^\s*import\s/.test(l)) {
      if (l.includes('from ')) {
        // Import satu baris yang selesai
        lastImportIdx = i;
      } else {
        // Awal multi-line import (belum ada 'from')
        inMultiLineImport = true;
      }
    } else if (inMultiLineImport) {
      if (l.includes('from ')) {
        // Baris penutup multi-line import
        lastImportIdx = i;
        inMultiLineImport = false;
      }
    }
  }

  if (lastImportIdx >= 0) {
    lines.splice(lastImportIdx + 1, 0, IMPORT_LINE);
  } else {
    lines.unshift(IMPORT_LINE);
  }
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Ekstrak satu "route call block" dimulai dari indeks karakter `startPos`
// Mengembalikan { text, endPos } atau null jika tidak ditemukan
// ─────────────────────────────────────────────────────────────────────────────
interface Block {
  text: string;
  startPos: number;
  endPos: number;
}

function extractBlock(content: string, startPos: number): Block | null {
  // Cari opening paren '(' dari posisi startPos
  const openParen = content.indexOf('(', startPos);
  if (openParen < 0) return null;

  let depth = 0;
  let inStr = false;
  let strChar = '';
  let i = openParen;

  while (i < content.length) {
    const ch = content[i];
    if (inStr) {
      if (ch === strChar && content[i - 1] !== '\\') inStr = false;
    } else if (ch === '"' || ch === "'") {
      inStr = true;
      strChar = ch;
    } else if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      depth--;
      if (depth === 0) {
        // Cakup sampai ';' atau '\n' setelah penutup paren
        let endPos = i + 1;
        while (endPos < content.length && content[endPos] === ';') endPos++;
        return {
          text: content.substring(startPos, endPos),
          startPos,
          endPos,
        };
      }
    }
    i++;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSFORMER UTAMA: Proses satu route block
// ─────────────────────────────────────────────────────────────────────────────
function transformBlock(text: string): string | null {
  // Sudah punya determineDataScope → skip
  if (text.includes('determineDataScope')) return null;

  // Dapatkan indentasi dari baris pertama
  const indentMatch = text.match(/^(\s*)/);
  const indent = indentMatch ? indentMatch[1] : '  ';

  // ─── POLA A: preHandler: [...] → sisipkan determineDataScope() sebelum ']' ───
  if (/preHandler\s*:\s*\[/.test(text)) {
    let result = text;
    // Cari posisi '[' dari preHandler
    const phIdx = text.indexOf('preHandler');
    const bracketOpen = text.indexOf('[', phIdx);
    if (bracketOpen < 0) return null;

    // Cari posisi ']' dengan bracket-counter
    let depth = 0;
    let bracketClose = -1;
    for (let i = bracketOpen; i < text.length; i++) {
      if (text[i] === '[') depth++;
      else if (text[i] === ']') {
        depth--;
        if (depth === 0) { bracketClose = i; break; }
      }
    }
    if (bracketClose < 0) return null;

    const inside = text.substring(bracketOpen + 1, bracketClose);
    const trimmedInside = inside.trimEnd();
    const needsComma = trimmedInside.length > 0 &&
      trimmedInside[trimmedInside.length - 1] !== ',' &&
      trimmedInside[trimmedInside.length - 1] !== '[';
    const sep = needsComma ? ',' : '';

    let newInside: string;
    if (inside.includes('\n')) {
      // multi-line: tambah baris baru
      newInside = `${trimmedInside}${sep}\n${indent}    ${DATA_SCOPE_FN},\n${indent}  `;
    } else {
      // single-line
      newInside = `${trimmedInside}${sep} ${DATA_SCOPE_FN}`;
    }

    result = text.substring(0, bracketOpen + 1) + newInside + text.substring(bracketClose);
    return result;
  }

  // ─── POLA B: preHandler: singleValue (tanpa array) ───
  // Strategi: Cari nilai preHandler dengan paren-depth counter
  if (/preHandler\s*:/.test(text) && !/preHandler\s*:\s*\[/.test(text)) {
    const phIdx = text.indexOf('preHandler');
    const colonIdx = text.indexOf(':', phIdx);
    if (colonIdx < 0) return null;

    // Skip whitespace setelah ':'
    let ci = colonIdx + 1;
    while (ci < text.length && (text[ci] === ' ' || text[ci] === '\t')) ci++;
    const valueStart = ci;

    // Jelajahi dengan paren-depth sampai ketemu ',' atau '}' di depth 0
    let depth = 0;
    while (ci < text.length) {
      const ch = text[ci];
      if (ch === '(') depth++;
      else if (ch === ')') {
        if (depth === 0) break;
        depth--;
      } else if (depth === 0 && (ch === ',' || ch === '}' || ch === '\n')) {
        break;
      }
      ci++;
    }

    const handlerVal = text.substring(valueStart, ci).trim();
    if (!handlerVal) return null;

    const before = text.substring(0, valueStart);
    const after = text.substring(ci);
    return `${before}[${handlerVal}, ${DATA_SCOPE_FN}]${after}`;
  }

  // ─── POLA C: Ada options object { schema/... } tapi TIDAK ada preHandler ───
  // Cari '{' pembuka options dan sisipkan preHandler sebagai prop pertama
  if (/\{\s*\n?\s*(schema|description|tags|body|params|response|querystring)\s*:/.test(text)) {
    // Cari '{' options object setelah path string
    const pathEnd = text.search(/(?:'[^']*'|"[^"]*")\s*,/);
    if (pathEnd < 0) return null;
    const commaAfterPath = text.indexOf(',', pathEnd);
    if (commaAfterPath < 0) return null;
    const braceOpen = text.indexOf('{', commaAfterPath);
    if (braceOpen < 0) return null;

    // Cek apakah brace langsung diikuti oleh schema/description dll (bukan preHandler)
    const afterBrace = text.substring(braceOpen + 1).trimStart();
    if (/^(schema|description|tags|body|params|response|querystring)\s*:/.test(afterBrace)) {
      const insertPos = braceOpen + 1;
      const beforeInsert = text.substring(0, insertPos);
      const afterInsert = text.substring(insertPos).trimStart();
      return `${beforeInsert}\n${indent}    preHandler: [${DATA_SCOPE_FN}],\n${indent}    ${afterInsert}`;
    }
  }

  // ─── POLA D: Shorthand – tidak ada options object ───
  // fastify.METHOD('/path', controller.method);
  // PERHATIAN: Match hanya jika argumen kedua adalah identifier (bukan object literal)
  const shorthandMatch = text.match(
    /^(\s*(?:fastify|app|router)\.(?:get|post|put|patch|delete)\s*\((?:'[^']*'|"[^"]*"|`[^`]*`)\s*),\s*((?:[\w$]+\.)*[\w$]+)\s*\);/m
  );
  if (shorthandMatch) {
    const [full, prefix, controller] = shorthandMatch;
    const replacement = `${prefix}, {\n${indent}    preHandler: [${DATA_SCOPE_FN}]\n${indent}  }, ${controller});`;
    return text.replace(full, replacement);
  }

  // Tidak ada pola yang cocok → return null (dilaporkan sebagai untransformed)
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Proses satu file
// ─────────────────────────────────────────────────────────────────────────────
interface ProcessResult {
  modified: boolean;
  untransformed: Array<{ line: number; text: string }>;
}

function processFile(content: string): { newContent: string; result: ProcessResult } {
  const ROUTE_RE = /(?:fastify|app|router)\.(?:get|post|put|patch|delete)\s*\(/g;
  const untransformed: Array<{ line: number; text: string }> = [];
  const replacements: Array<{ startPos: number; endPos: number; newText: string }> = [];

  let match: RegExpExecArray | null;
  while ((match = ROUTE_RE.exec(content)) !== null) {
    const startPos = match.index;
    const block = extractBlock(content, startPos);
    if (!block) continue;

    // Skip jika sudah punya determineDataScope
    if (block.text.includes('determineDataScope')) continue;

    const transformed = transformBlock(block.text);
    if (transformed === null || transformed === block.text) {
      // Hitung nomor baris
      const lineNo = content.substring(0, startPos).split('\n').length;
      untransformed.push({ line: lineNo, text: block.text.substring(0, 120) });
      continue;
    }

    replacements.push({
      startPos: block.startPos,
      endPos: block.endPos,
      newText: transformed,
    });

    // Advance regex past this block to avoid re-processing
    ROUTE_RE.lastIndex = block.endPos;
  }

  if (replacements.length === 0) {
    return { newContent: content, result: { modified: false, untransformed } };
  }

  // Rekonstruksi konten dengan replacements (dari belakang agar offset tidak bergeser)
  let newContent = content;
  for (const rep of [...replacements].reverse()) {
    newContent = newContent.substring(0, rep.startPos) + rep.newText + newContent.substring(rep.endPos);
  }

  // Tambah import
  newContent = ensureImport(newContent);

  return { newContent, result: { modified: true, untransformed } };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
function run(): void {
  console.log('🚀 Route Standardization + determineDataScope() Injection\n');

  const allFiles = getAllRouteFiles(MODULES_DIR);
  let skipped = 0, modified = 0, unchanged = 0;
  const modifiedFiles: string[] = [];
  const allUntransformed: Array<{ file: string; line: number; preview: string }> = [];

  for (const filePath of allFiles) {
    const original = fs.readFileSync(filePath, 'utf-8');
    const rel = path.relative(path.join(__dirname, '../../'), filePath);

    // Skip file yang sudah punya determineDataScope
    if (original.includes('determineDataScope')) {
      skipped++;
      continue;
    }

    const { newContent, result } = processFile(original);

    // Kumpulkan untransformed blocks
    for (const u of result.untransformed) {
      allUntransformed.push({ file: rel, line: u.line, preview: u.text });
    }

    if (result.modified && newContent !== original) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
      modified++;
      modifiedFiles.push(rel);
      console.log(`✅ Modified: ${rel}`);
    } else {
      unchanged++;
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`📊 Total Route Files          : ${allFiles.length}`);
  console.log(`⏭️  Skipped (already covered)  : ${skipped}`);
  console.log(`✅ Files Modified             : ${modified}`);
  console.log(`➖ Files Unchanged            : ${unchanged}`);
  console.log(`⚠️  Blocks NOT transformed     : ${allUntransformed.length}`);
  console.log('─'.repeat(60));

  const reportPath = path.join(__dirname, '../../route_standardization_report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    summary: { total: allFiles.length, skipped, modified, unchanged, untransformedCount: allUntransformed.length },
    modifiedFiles,
    untransformedBlocks: allUntransformed,
  }, null, 2));

  console.log(`\n📁 Laporan: ${reportPath}`);
  if (allUntransformed.length > 0) {
    console.log(`\n⚠️  ${allUntransformed.length} blok rute tidak dapat ditransformasi otomatis.`);
    console.log('   Lihat untransformedBlocks di laporan JSON untuk detail.');
  }
  console.log('\n🔍 Jalankan: npx tsc --noEmit');
}

run();
