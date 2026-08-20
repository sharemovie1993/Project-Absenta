import * as fs from 'fs';
import * as path from 'path';
import mammoth from 'mammoth';

const externalDir = path.resolve(__dirname, '../../sumber eksternal');

async function dumpModuleDetails() {
  const files = fs.readdirSync(externalDir).filter(f => f.endsWith('.docx')).sort();

  for (const file of files) {
    const fullPath = path.join(externalDir, file);
    const result = await mammoth.convertToHtml({ path: fullPath });
    const html = result.value;

    console.log(`\n================================================================`);
    console.log(`FILE: ${file}`);
    console.log(`HTML LENGTH: ${html.length}`);

    // Check headings (h1, h2, h3, strong, p, table)
    const rawResult = await mammoth.extractRawText({ path: fullPath });
    const text = rawResult.value;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    console.log(`TOTAL PARAGRAPHS/LINES: ${lines.length}`);
    console.log(`--- SAMPLE HEADINGS / STRONG SECTIONS ---`);
    const headings = lines.filter(l => /^[A-Z0-9\.\-\s]{3,40}$/i.test(l) || /Pertemuan|BAB|Tujuan|Kegiatan|Asesmen|Lampiran|LKPD|Bahan/i.test(l));
    console.log(headings.slice(0, 25).join('\n'));
  }
}

dumpModuleDetails().catch(console.error);
