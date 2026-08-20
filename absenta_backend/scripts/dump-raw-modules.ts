import * as fs from 'fs';
import * as path from 'path';
import mammoth from 'mammoth';

const externalDir = path.resolve(__dirname, '../../sumber eksternal');
const outDir = path.resolve(__dirname, '../../sumber eksternal/extracted_text');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function dumpAll() {
  const files = fs.readdirSync(externalDir).filter(f => f.endsWith('.docx')).sort();

  for (const file of files) {
    const fullPath = path.join(externalDir, file);
    const rawResult = await mammoth.extractRawText({ path: fullPath });
    const text = rawResult.value;
    const outFileName = file.replace('.docx', '.txt');
    fs.writeFileSync(path.join(outDir, outFileName), text, 'utf-8');
    console.log(`Wrote: ${outFileName} (${text.length} chars)`);
  }
}

dumpAll().catch(console.error);
